import { useRef, useState } from 'react';
import { useSvgDrag } from './useSvgDrag';
import type { Vec } from '../types';

interface Options {
  position: Vec;
  onCommit: (p: Vec) => void;
  onTap?: () => void;
  clamp?: (p: Vec) => Vec;
  onDragStart?: () => void;
}

/**
 * 拖动对象的通用封装：
 * 拖动过程中只在组件内部更新位置（避免整棵场景树高频重渲染），
 * 松手后再一次性提交到世界状态并写入存档。
 */
export function useDragObject({ position, onCommit, onTap, clamp, onDragStart }: Options) {
  const [local, setLocal] = useState<Vec | null>(null);
  const last = useRef<Vec | null>(null);

  const { dragging, handlers } = useSvgDrag({
    position: local ?? position,
    onMove: (p) => {
      last.current = p;
      setLocal(p);
    },
    onTap,
    onDragStart,
    onDragEnd: () => {
      if (last.current) onCommit(last.current);
      last.current = null;
      setLocal(null);
    },
    clamp,
  });

  return { pos: local ?? position, dragging, handlers };
}
