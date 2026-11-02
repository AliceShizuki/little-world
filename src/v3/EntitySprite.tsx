/**
 * 实体渲染
 *
 * 一个 Entity 就是一次 sprite.draw()。这里只做五件事：
 *  1. 把类型翻译成精灵；
 *  2. **位置完全由 store 的模拟时钟决定**（动物会自己走，蝴蝶会自己飞），
 *     这里只负责用 CSS 过渡把每一小步连成连续的移动；
 *  3. 三级视觉权重：主角大而醒目，环境小道具退到背景；
 *  4. 连续点击给出不同的反应（跳 / 摇 / 转圈）；
 *  5. 让材质与落点看起来有重量（影子、拖动放大）。
 *
 * 注意：这里**不再自己跑随机走动**。以前每个组件各自 setTimeout 乱走，
 * 动物之间毫无关系；现在位置是生态系统算出来的，所以「松鼠知道松果在哪」
 * 这种事才有可能成立。
 */

import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { isAgent } from './eco';
import { spriteOf } from './sprites';
import type { Entity } from './types';

/** 命中区外扩量（设计单位）：给 3 岁孩子的手指留余量 */
const TOUCH_PAD = 16;

/** 主角：视觉上要跳出来（大树另算，它画在场景里） */
const HERO = new Set(['rabbit', 'bird', 'butterfly', 'frog', 'bee']);

/** 环境小道具：退到背景去，别抢视线 */
const ENV = new Set([
  'acorn', 'acornpile', 'pinecone', 'pineconepile', 'twig', 'twigbundle', 'leaf', 'leafpile',
  'berry', 'seed', 'mushroom', 'mushroomclump', 'flower', 'ladybug', 'caterpillar', 'ant', 'spider',
]);

/** 不作为整体做"跳/摇/转"反应的大件与入口 */
const NO_REACT = new Set([
  'bridge', 'log', 'nest', 'web', 'root', 'ladder', 'burrowdoor', 'treehole', 'treehollow',
  'anthill', 'firepit', 'sandcastle', 'bed', 'crane', 'excavator', 'stump', 'frogspawn',
]);

/** 会睡觉的（夜里停下来的那种） */
const SLEEPERS = new Set([
  'rabbit', 'squirrel', 'hedgehog', 'fox', 'deer', 'bird', 'bee', 'butterfly', 'ladybug',
  /* 农场的牲口与家禽：夜里也要看得见它们在睡 */
  'cow', 'sheep', 'pig', 'hen', 'chick', 'duck', 'horse', 'cat',
  /* 海边的海鸥 */
  'gull',
]);

/** 伪随机：同一个 id 永远得到同一套节奏，看起来不像批量生成 */
function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) % 9973;
  return h;
}

/** 连续点击的反应种类：跳 / 摇 / 转圈 */
const REACTIONS = 3;

interface Props {
  e: Entity;
  night: boolean;
  dragging: boolean;
  /** 这个实体被点过多少次（来自 store.pulses） */
  pulse: number;
  /** 拖动中的实时位置（设计坐标） */
  live?: { x: number; y: number };
  /** 还没解锁（开场那几秒）：画得淡一点 */
  dim?: boolean;
}

function EntitySpriteImpl({ e, night, dragging, pulse, live, dim }: Props) {
  const spec = spriteOf(e.t);
  const seed = useMemo(() => hash(e.id), [e.id]);
  const x = live?.x ?? e.x;
  const y = live?.y ?? e.y;

  const tier = HERO.has(e.t) ? 1.14 : ENV.has(e.t) ? 0.88 : 1;
  const s = (e.s ?? 1) * tier;
  const sleeping = e.act === 'sleep' && SLEEPERS.has(e.t);

  /* ── 连点反应：pulse 变化时播一次，用 key 强制重启动画 ── */
  const [react, setReact] = useState<number | null>(null);
  const lastPulse = useRef(pulse);
  useEffect(() => {
    if (pulse === lastPulse.current) return;
    lastPulse.current = pulse;
    if (NO_REACT.has(e.t)) return;
    setReact((pulse - 1) % REACTIONS);
    const t = window.setTimeout(() => setReact(null), 960);
    return () => clearTimeout(t);
  }, [pulse, e.t]);

  /*
   * 朝向：按移动方向翻转。
   *
   * 精灵都按"朝右"画的，所以往左走时整只镜像过来。判断只看位移——
   * 这是唯一可靠的信号：生态算出来的位置每 0.7 秒更新一次，
   * 被孩子拖着走的时候也一样成立。
   *
   * 只有动物翻：石头、蘑菇、道具没有正面背面，翻了反而穿帮。
   */
  const faced = isAgent(e.t) && !sleeping;
  const [face, setFace] = useState<1 | -1>(() => (seed % 2 === 0 ? 1 : -1));
  const lastX = useRef(x);
  useEffect(() => {
    const dx = x - lastX.current;
    lastX.current = x;
    if (!faced || Math.abs(dx) < 1.2) return;
    const next: 1 | -1 = dx > 0 ? 1 : -1;
    setFace((f) => (f === next ? f : next));
  }, [x, faced]);

  return (
    <g
      transform={`translate(${x} ${y})`}
      className="v3-ent"
      style={{
        // 时钟每 0.7 秒推一小步，用同样长的过渡把它连成连续移动
        transition: dragging ? 'none' : 'transform 720ms cubic-bezier(.33,.9,.4,1), opacity 600ms ease',
        opacity: dim ? 0.32 : 1,
      }}
      data-id={e.id}
      data-t={e.t}
      data-act={e.act ?? undefined}
    >
      {/* 地面投影：拖动时抬起，影子变小变淡 */}
      <ellipse
        cx={0}
        cy={2}
        rx={(spec.w / 2) * s * (dragging ? 0.66 : 0.9)}
        ry={spec.h * 0.07 * s * (dragging ? 0.6 : 1)}
        fill="#4a3a2a"
        opacity={dragging ? 0.1 : dim ? 0.06 : 0.16}
      />

      {/* 反应层：每次点击换 key，CSS 动画从头播 */}
      <g key={`r${pulse}`} className={react === null ? undefined : `v3-react v3-react-${react}`}>
        <g
          transform={`scale(${s} ${s})`}
          className={`v3-anim v3-${spec.anim}${sleeping ? ' v3-sleep' : ''}`}
          style={{
            animationDelay: `${(seed % 17) * 0.17}s`,
            animationDuration: `${2.2 + (seed % 9) * 0.22}s`,
          }}
        >
          {/*
            朝向层：只做水平镜像，0.3 秒过渡。
            原点必须是 (0,0)——就是精灵的落脚点，翻转时脚不动。
            use 百分比原点会以包围盒为基准，翻转的瞬间整只会横移一段。
          */}
          <g
            className="v3-face"
            style={{
              transform: `scaleX(${faced ? face : 1})`,
              transformOrigin: '0px 0px',
              transition: 'transform 300ms cubic-bezier(.4, 0, .2, 1)',
            }}
          >
            <g transform={dragging ? 'scale(1.06)' : undefined} style={{ transition: 'transform 160ms ease' }}>
              {spec.draw({ v: e.v ?? 0, st: e.st ?? 0, f: !!e.f, night })}
              {/* 抱着东西（松鼠抱着松果回家） */}
              {e.car && (
                <g transform={`translate(${spec.w * 0.18} ${-spec.h * 0.92}) scale(0.62)`}>
                  {spriteOf(e.car).draw({ v: 0, st: 0, f: false, night })}
                </g>
              )}
            </g>
          </g>
        </g>
      </g>

      {/* 睡着的小 z：只有会睡觉的动物在夜里才画 */}
      {sleeping && (
        <g
          className="v3-zzz"
          pointerEvents="none"
          transform={`translate(${spec.w * 0.4} ${-spec.h * 1.05}) scale(${s * 0.8})`}
        >
          <path d="M 0 0 L 7 0 L 0 7 L 7 7" stroke="#8fa4c8" strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M 11 -8 L 16 -8 L 11 -3 L 16 -3" stroke="#8fa4c8" strokeWidth={1.4} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
        </g>
      )}

      {/* 命中区：比物体本身宽一圈，孩子不用点得很准 */}
      <rect
        x={-(spec.w / 2) * s - TOUCH_PAD}
        y={-spec.h * s - TOUCH_PAD}
        width={spec.w * s + TOUCH_PAD * 2}
        height={spec.h * s + TOUCH_PAD * 2}
        fill="transparent"
        className="v3-hit"
      />
    </g>
  );
}

/** memo：模拟时钟每跳一次都会产生新的数组，未变化的实体不该跟着重画 */
export const EntitySprite = memo(
  EntitySpriteImpl,
  (a, b) =>
    a.e === b.e &&
    a.night === b.night &&
    a.dragging === b.dragging &&
    a.pulse === b.pulse &&
    a.dim === b.dim &&
    (a.live?.x ?? null) === (b.live?.x ?? null) &&
    (a.live?.y ?? null) === (b.live?.y ?? null),
);
