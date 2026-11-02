/**
 * 场景背景光栅化
 *
 * 12 个区域的背景（森林的树、草、水纹，海边，小镇……）全是手绘 SVG，
 * 一个森林就有 7000+ 个 <path>，而且背景里挂了大量 infinite CSS 动画
 * （树摇曳、云飘、星星闪、光柱晃），手机 GPU 每一帧都要重新栅格化这些矢量节点，
 * 这是手机卡顿的根源。
 *
 * 做法：把背景**临时**渲染进一个离屏 SVG，用 XMLSerializer 序列化成字符串，
 * 经 <img> 解码后画进一张 canvas 位图，然后**卸载离屏 SVG**。之后画面里只留下
 * 一张 <image> 位图，背景不再有任何 SVG 节点、也不再跑任何动画。可交互的实体
 * （动物、植物、道具）仍然留在 SVG 层，点击、拖动、组合全部照旧。
 *
 * 关键取舍：
 *  - 位图是静态的，原背景里「太阳位置过渡 / 天空渐变过渡 / 云飘动」的连续动画没了。
 *    这里用「双缓冲 + 交叉淡化」补偿：参数一变，旧位图淡出、新位图淡入（0.9 秒），
 *    把原来 1.6 秒的颜色过渡换成两张图之间的平滑溶解，孩子看到的依然是"天慢慢变黑"。
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Eco, Phase, Season, View, Weather } from './types';

/** 场景组件接收的参数，与 Stage 里 <Scene/> 收到的一致 */
export interface SceneRasterProps {
  view: View;
  phase: Phase;
  weather: Weather;
  season: Season;
  night: boolean;
  eco?: Eco;
}

/** 共享 defs：Scene 内部引用了这些 id（softBlur/softGlow 等），序列化时必须一起带着 */
const SHARED_DEFS = (
  <defs>
    <filter id="softBlur" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="14" />
    </filter>
    <filter id="softGlow" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="8" />
    </filter>
    <linearGradient id="trunkGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#c29a6f" />
      <stop offset="100%" stopColor="#9c714c" />
    </linearGradient>
    <linearGradient id="moonBody" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#fdf6dd" />
      <stop offset="100%" stopColor="#f2dda2" />
    </linearGradient>
    <linearGradient id="nightTint" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#101838" />
      <stop offset="100%" stopColor="#2a2f58" />
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.72">
      <stop offset="60%" stopColor="#000000" stopOpacity="0" />
      <stop offset="100%" stopColor="#3a2f22" stopOpacity="0.16" />
    </radialGradient>
  </defs>
);

interface Props {
  view: View;
  phase: Phase;
  weather: Weather;
  season: Season;
  night: boolean;
  eco?: Eco;
  /** 把当前参数渲染成场景 React 元素（由 Stage 传入，避免这里反向 import 12 个场景） */
  renderScene: (p: SceneRasterProps) => React.ReactElement;
}

/**
 * 场景背景位图层（双缓冲交叉淡化）。
 *
 * 输出里只有 <image> 位图，背景 SVG 节点在序列化完成后立即卸载。
 * 参数一变 → 临时挂载离屏 SVG → XMLSerializer 序列化 → 解码成位图 → 卸载 → 交叉淡化。
 */
export function SceneCanvas({ view, phase, weather, season, night, eco, renderScene }: Props) {
  const [display, setDisplay] = useState<string | null>(null);
  const [prev, setPrev] = useState<string | null>(null);
  // 待序列化的离屏容器：null 表示"当前没有待处理的场景"
  const [pending, setPending] = useState<{ node: HTMLDivElement; key: number } | null>(null);
  const seqRef = useRef(0);

  const w = Math.round(view.w);
  const h = Math.round(view.h);

  /**
   * 背景签名，分两档：
   *
   * 「硬签名」= view / phase / weather / season / night——这些是"整档切换"，
   *   一变就要立刻重绘（切昼夜、换季节、换天气）。
   *
   * 「软签名」= 水位 / 潮汐——这些是持续缓慢变化的量。如果放进硬签名，
   *   降雨时水位、涨落潮时潮位会连续跨过多个取整档，触发"光栅化风暴"
   *   （每次序列化一万多节点 + 解码位图，把 reload 拖到十几秒）。
   *   所以软签名单独用时间节流：最多每 2 秒重绘一次，潮汐水线照样动，只是不逐帧。
   */
  const hardKey = `${view.x}:${view.y}:${view.w}:${view.h}:${phase}:${weather}:${season}:${night ? 1 : 0}`;
  const softKey = `${Math.round((eco?.water ?? 0.5) * 4)}:${Math.round((eco?.tide ?? 0.5) * 2)}`;

  // 硬签名一变：立即申请光栅化
  useEffect(() => {
    const seq = ++seqRef.current;
    const node = document.createElement('div');
    node.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden;pointer-events:none;';
    document.body.appendChild(node);
    setPending({ node, key: seq });
    return () => {
      if (node.parentNode) node.parentNode.removeChild(node);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hardKey]);

  // 软签名一变：节流到每 2 秒最多重绘一次（潮汐/水位平滑更新，不风暴）
  const lastSoft = useRef(0);
  useEffect(() => {
    const now = Date.now();
    if (now - lastSoft.current < 2000) return; // 2 秒内不再重绘
    lastSoft.current = now;
    const seq = ++seqRef.current;
    const node = document.createElement('div');
    node.style.cssText = 'position:absolute;left:-99999px;top:0;width:0;height:0;overflow:hidden;pointer-events:none;';
    document.body.appendChild(node);
    setPending({ node, key: seq });
    return () => {
      if (node.parentNode) node.parentNode.removeChild(node);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [softKey]);

  // 序列化：离屏容器里已经由 React 渲染出真实 SVG，直接取它的 outerHTML
  useEffect(() => {
    if (!pending) return;
    const { node, key } = pending;
    const svg = node.querySelector('svg');
    if (!svg) return;
    // 取序列化结果，随即卸载容器（DOM 里不再留这些背景节点）
    const markup = svg.outerHTML;
    const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
    if (node.parentNode) node.parentNode.removeChild(node);
    setPending(null);
    if (key !== seqRef.current) return; // 已经过时
    // 直接引用 data:svg 作 <image> 源：浏览器用 GPU 一次栅格化后当位图贴。
    setDisplay((old) => {
      if (old) setPrev(old);
      return url;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending]);

  // 淡出结束后清理 prev
  useEffect(() => {
    if (!prev) return;
    const t = window.setTimeout(() => setPrev(null), 950);
    return () => clearTimeout(t);
  }, [prev]);

  const scene = pending
    ? createPortal(
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} width={w} height={h}>
          {SHARED_DEFS}
          {renderScene({ view, phase, weather, season, night, eco })}
        </svg>,
        pending.node,
      )
    : null;

  return (
    <g pointerEvents="none">
      {prev && (
        <image href={prev} x={view.x} y={view.y} width={w} height={h} preserveAspectRatio="none" style={{ opacity: 0, transition: 'opacity 0.9s ease' }} />
      )}
      {display && (
        <image href={display} x={view.x} y={view.y} width={w} height={h} preserveAspectRatio="none" style={{ opacity: 1, transition: 'opacity 0.9s ease' }} />
      )}
      {scene}
    </g>
  );
}
