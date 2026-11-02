import { useCallback, useRef, useState } from 'react';
import type React from 'react';
import type { Vec } from '../types';

/** 把指针的屏幕坐标换算成当前 SVG 的用户坐标 */
export function pointerToSvg(
  e: React.PointerEvent<SVGElement> | PointerEvent,
  svg: SVGSVGElement | null,
): Vec | null {
  if (!svg) return null;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const pt = svg.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

interface UseDragOptions {
  /** 单位坐标系中的当前位置 */
  position: Vec;
  /** 拖动过程中回调（已做边界约束） */
  onMove: (next: Vec) => void;
  /** 轻点（没有明显拖动）时回调 */
  onTap?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** 位置约束 */
  clamp?: (p: Vec) => Vec;
  /** 判定为「轻点」的最大屏幕位移（px），触摸宽容度更高 */
  tapThreshold?: number;
  disabled?: boolean;
}

/**
 * 统一的指针拖动 Hook：鼠标 / 触屏 / 触控笔共用 Pointer Events。
 * 拖动距离小于阈值时视为点击，避免「拖动和点击互相吞掉」。
 */
export function useSvgDrag({
  position,
  onMove,
  onTap,
  onDragStart,
  onDragEnd,
  clamp,
  tapThreshold = 12,
  disabled = false,
}: UseDragOptions) {
  const [dragging, setDragging] = useState(false);
  const session = useRef<{
    pointerId: number;
    startClient: Vec;
    startPos: Vec;
    moved: number;
    active: boolean;
  } | null>(null);
  const latest = useRef({ position, onMove, onTap, clamp });
  latest.current = { position, onMove, onTap, clamp };

  const end = useCallback((e: React.PointerEvent<SVGGElement>) => {
    const s = session.current;
    if (!s || s.pointerId !== e.pointerId) return;
    session.current = null;
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* 忽略：指针可能已经释放 */
    }
    if (!s.active) return;
    if (s.moved < tapThreshold) {
      latest.current.onTap?.();
    } else {
      onDragEnd?.();
    }
  }, [tapThreshold, onDragEnd]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      if (disabled) return;
      if (e.button !== undefined && e.button > 0) return;
      session.current = {
        pointerId: e.pointerId,
        startClient: { x: e.clientX, y: e.clientY },
        startPos: { ...latest.current.position },
        moved: 0,
        active: true,
      };
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        /* 忽略 */
      }
      // 阻止浏览器手势（滚动 / 缩放 / 选中）
      e.preventDefault();
    },
    [disabled],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGGElement>) => {
      const s = session.current;
      if (!s || s.pointerId !== e.pointerId || !s.active) return;
      const dxScreen = e.clientX - s.startClient.x;
      const dyScreen = e.clientY - s.startClient.y;
      s.moved = Math.max(s.moved, Math.hypot(dxScreen, dyScreen));
      if (s.moved < 3) return;
      if (!dragging) {
        setDragging(true);
        onDragStart?.();
      }
      const svg = e.currentTarget.ownerSVGElement;
      const now = pointerToSvg(e, svg);
      const start = pointerToSvg(
        { clientX: s.startClient.x, clientY: s.startClient.y } as PointerEvent,
        svg,
      ) ?? s.startPos;
      if (!now) return;
      const next = { x: s.startPos.x + (now.x - start.x), y: s.startPos.y + (now.y - start.y) };
      latest.current.onMove(latest.current.clamp ? latest.current.clamp(next) : next);
    },
    [dragging, onDragStart],
  );

  const onPointerCancel = useCallback((e: React.PointerEvent<SVGGElement>) => {
    const s = session.current;
    if (!s || s.pointerId !== e.pointerId) return;
    session.current = null;
    setDragging(false);
    onDragEnd?.();
  }, [onDragEnd]);

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: end,
      onPointerCancel,
    },
  };
}
