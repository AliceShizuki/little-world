/**
 * 舞台
 *
 * 一张 SVG 承载当前区域：背景 → 水面热区 → 装饰热区 → 实体 → 秘密光点 → 天气 → 特效。
 * 指针事件在这里统一处理（拖动 / 轻点 / 判定阈值），
 * 所有坐标都换算到 1600×900 的设计空间，保证任何屏幕下手感一致。
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import { EntitySprite } from './EntitySprite';
import { spriteOf } from './sprites';
import { WeatherLayer } from './WeatherLayer';
import { ForestScene } from './scenes/ForestScene';
import { BurrowScene } from './scenes/BurrowScene';
import { CanopyScene } from './scenes/CanopyScene';
import { BarnScene } from './scenes/BarnScene';
import { WreckScene } from './scenes/WreckScene';
import { FarmScene } from './scenes/FarmScene';
import { SeasideScene } from './scenes/SeasideScene';
import { TownScene } from './scenes/TownScene';
import { HomeScene } from './scenes/HomeScene';
import { SiteScene } from './scenes/SiteScene';
import { UnderwaterScene } from './scenes/UnderwaterScene';
import { SkyScene } from './scenes/SkyScene';
import { HOTSPOTS } from './hotspots';
import { REGION_ORDER, SECRETS, waterAt } from './regions';
import { useWorld } from './store';
import { isVisible, type Eco, type Entity, type RegionId } from './types';

const SCENES: Record<RegionId, (p: {
  view: { x: number; y: number; w: number; h: number };
  phase: 'dawn' | 'day' | 'sunset' | 'night';
  weather: 'clear' | 'cloudy' | 'rain' | 'snow' | 'wind';
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  night: boolean;
  eco?: Eco;
}) => React.ReactElement> = {
  forest: ForestScene,
  burrow: BurrowScene,
  canopy: CanopyScene,
  barn: BarnScene,
  wreck: WreckScene,
  farm: FarmScene,
  seaside: SeasideScene,
  town: TownScene,
  home: HomeScene,
  site: SiteScene,
  underwater: UnderwaterScene,
  sky: SkyScene,
};

/** 轻点与拖动的判定阈值（设计单位） */
const TAP_SLOP = 14;

/**
 * 横划换区域的判定：位移要够远、而且明显是横向的。
 *
 * 110 设计单位在 1440 宽的屏上约 100 像素——孩子点一下不会误触，
 * 想换地方时随便一划又能出去。1.6 倍的长宽比用来把"横划"和"斜着拖"分开：
 * 拖动物体不触发（那时候手里抓着东西），只有空手划动才算数。
 */
/** 空手横划的判定阈值（设计单位） */
const SWIPE_MIN = 110;
const SWIPE_RATIO = 1.6;
/**
 * 入口类实体：点了就该"进去"。
 *
 * 它们长在树干和地面上，正是落叶、松果、树枝最容易落下的地方，
 * 所以命中有单独的一轮优先——否则孩子点树洞会点到一片叶子上。
 */
const PORTALS = new Set(['treehole', 'burrowdoor', 'ladder']);

/**
 * 静物小道具：点一下最多晃一晃，没有被"抓住"的必要。
 *
 * 秘密光点常常就藏在它们堆里（落叶、松果、石头缝），
 * 而光点的命中半径只有 28——实体先吃掉这一下，孩子就永远发现不了那个秘密。
 * 所以命中顺序里给它们让一位：先问秘密，秘密没中再照常处理。
 */
const QUIET_PROPS = new Set([
  'leaf', 'twig', 'twigbundle', 'acornpile', 'pineconepile',
  'berry', 'mushroom', 'mushroomclump', 'fern', 'frogspawn',
]);

/** 命中区外扩量（设计单位）：给 3 岁孩子的手指留余量 */
const TOUCH_PAD = 16;

/** 开场就亮着的这一批：其余的先淡着，孩子动三下之后全部亮起来 */
const FIRST_BATCH = new Set([
  'rabbit', 'bird', 'treehole', 'burrowdoor', 'carrot', 'can', 'flower', 'rock', 'seed',
  'frog', 'frogspawn', 'butterfly', 'acornpile',
]);

/** 没有天空的区域：夜里的月亮与天气都不该出现 */
const INDOOR = new Set<RegionId>(['home', 'underwater', 'burrow', 'barn', 'wreck']);

/**
 * 开场"先亮一小批"是**森林**的教学节奏：先给几件东西，孩子动三下之后整个森林醒来。
 * 别的区域没有这段引导，所以一律正常亮度——否则先去农场的孩子会看到一个灰掉的世界。
 */
const dimmed = (region: RegionId, stage: number, t: string): boolean =>
  region === 'forest' && stage < 2 && !FIRST_BATCH.has(t);

export function Stage() {
  const w = useWorld();
  const { view, region, meta, s, ents, night, found, drop, tap, discover, carry, splash, decor, pulses, go } = w;
  const eco = s.eco;
  const svgRef = useRef<SVGSVGElement>(null);
  const [live, setLive] = useState<{ id: string; x: number; y: number } | null>(null);
  const dragRef = useRef<{
    id: string;
    ox: number;
    oy: number;
    sx: number;
    sy: number;
    moved: boolean;
    ent: Entity;
  } | null>(null);
  /** 空手横划的起点（设计坐标）：手指抬起时用它判断这是不是一次"换地方" */
  const swipeRef = useRef<{ x: number; y: number } | null>(null);
  /** 连点型秘密已经点了几下（只存在内存里：刷新了就得重新数，本来就是"再试一次"的游戏） */
  const secretTaps = useRef<Map<string, number>>(new Map());
  /** 正在被点、还没点开的那个秘密：抖一下给个回应 */
  const [wig, setWig] = useState<string | null>(null);

  const toDesign = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }, []);

  /* ── 当前环境下应该出现的实体（夜里萤火虫、雨后蜗牛等靠这个出现） ── */
  const shown = useMemo(
    () => ents.filter((e) => isVisible(e, { night, weather: s.weather, season: s.season })),
    [ents, night, s.weather, s.season],
  );

  const secrets = useMemo(
    () =>
      SECRETS.filter((x) => {
        if (x.r !== region || found(x.id)) return false;
        // 潮位不对时它根本还没浮出来：孩子看不到，也就不该点到
        const tide = s.eco?.tide ?? 0.5;
        if (x.tide === 'low' && tide > 0.42) return false;
        if (x.tide === 'high' && tide < 0.58) return false;
        if (!x.only) return true;
        if (x.only === 'night') return night;
        if (x.only === 'rain') return s.weather === 'rain';
        return !night;
      }),
    [region, found, night, s.weather, s.eco?.tide],
  );

  const spots = useMemo(
    () =>
      HOTSPOTS.filter((h) => {
        if (h.r !== region) return false;
        // 潮池只在退潮时露出来，浪线只在涨潮时够得着
        if (h.tide === 'low' && eco.tide > 0.38) return false;
        if (h.tide === 'high' && eco.tide < 0.62) return false;
        return true;
      }),
    [region, eco.tide],
  );
  // 海边的水域随潮汐伸缩：涨潮时沙滩窄，退潮时露出潮池
  const water = useMemo(() => waterAt(region, eco.tide), [region, eco.tide]);

  /**
   * 统一命中测试
   *
   * 不靠 DOM 的"谁画在上面"——命中区是会外扩的，邻居之间必然重叠，
   * 那样排在后面的物体会永远点不到（森林里一次查出 11 个）。
   * 这里改成在设计空间里算：谁的包围盒包含落点，就选**离镜头最近**（y 最大）的那个。
   */
  const pickEntity = useCallback(
    (p: { x: number; y: number }, list: Entity[]): Entity | null => {
      /**
       * 两轮命中：
       *  第一轮用**几乎不外扩**的包围盒——孩子点在物体身上，就一定是它，
       *  不会被邻居那圈"为了方便点击"的余量抢走；
       *  第二轮才用外扩 16 的宽容盒，只在前一轮谁都没命中时才生效。
       */
      const scan = (pad: number, only?: Set<string>): Entity | null => {
        let best: Entity | null = null;
        let bestKey = -Infinity;
        for (const e of list) {
          if (only && !only.has(e.t)) continue;
          const sp = spriteOf(e.t);
          const k = e.s ?? 1;
          const hw = (sp.w * k) / 2 + pad;
          const top = e.y - sp.h * k - pad;
          const bot = e.y + pad * 0.5;
          if (p.x < e.x - hw || p.x > e.x + hw || p.y < top || p.y > bot) continue;
          // 谁的中心离得近就选谁（按各自尺寸归一化），平手时取更靠前的
          const nd = Math.hypot((p.x - e.x) / (sp.w * k * 0.5 + 1), (p.y - (e.y - sp.h * k * 0.5)) / (sp.h * k * 0.5 + 1));
          const key = -nd * 1000 + e.y * 0.01;
          if (key > bestKey) {
            bestKey = key;
            best = e;
          }
        }
        return best;
      };
      /*
       * 入口优先：树洞、兔子洞、梯子这三样"点了就是要进去"。
       *
       * 它们长在树干和地上，正好是落叶、松果最容易落下的地方。
       * 不加这一步，孩子点树洞会点到一片叶子上——点十次有三次进不去（真的发生过）。
       */
      return scan(3, PORTALS) ?? scan(TOUCH_PAD, PORTALS) ?? scan(3) ?? scan(TOUCH_PAD);
    },
    [],
  );

  const onDown = useCallback(
    (ev: React.PointerEvent) => {
      const p = toDesign(ev.clientX, ev.clientY);
      if (!p) return;
      ev.preventDefault();

      /* 1. 实体 */
      const e = pickEntity(p, shown);
      /**
       * 抓起一件东西（点一下就晃、按住可以拖）。
       * 抽出来是因为"秘密 vs 静物"要能先判秘密，再回头走这里。
       */
      const grab = (ent: Entity) => {
        swipeRef.current = null;
        if (ent.fixed) {
          tap(ent);
          return;
        }
        dragRef.current = { id: ent.id, ox: p.x - ent.x, oy: p.y - ent.y, sx: p.x, sy: p.y, moved: false, ent };
        setLive({ id: ent.id, x: ent.x, y: ent.y });
        // 合成出来的 pointer 事件没有真实指针，setPointerCapture 会抛；
        // 抓不到也无所谓，拖动靠的是 dragRef，不依赖捕获
        try {
          svgRef.current?.setPointerCapture?.(ev.pointerId);
        } catch {
          /* 忽略 */
        }
      };

      // 静物小道具先让一步：秘密常常就藏在这些东西堆里
      if (e && !QUIET_PROPS.has(e.t)) {
        grab(e);
        return;
      }

      /**
       * 没抓起任何东西：记下起点，手指抬起时判断是不是一次横划。
       * 秘密 / 装饰 / 水面照样在按下时就有反应（那是孩子要的即时反馈），
       * 横划只是在"空手"时额外多一种换地方的方式，两条路互不影响。
       */
      swipeRef.current = { x: p.x, y: p.y };

      /* 2. 还没被发现的秘密：一个几乎看不见的光点 */
      for (const sec of secrets) {
        if (Math.hypot(p.x - sec.x, p.y - (sec.y - 10)) <= 28) {
          /**
           * 有几处要连点几下才开。前几下只让它抖一下——
           * 有反应但没结果，孩子才会继续点；完全没反应他会以为坏了。
           */
          const need = sec.taps ?? 1;
          if (need > 1) {
            const n = (secretTaps.current.get(sec.id) ?? 0) + 1;
            if (n < need) {
              secretTaps.current.set(sec.id, n);
              setWig(sec.id);
              window.setTimeout(() => setWig((k) => (k === sec.id ? null : k)), 420);
              return;
            }
            secretTaps.current.delete(sec.id);
          }
          discover(sec.id, sec.reveal, sec.x, sec.y);
          return;
        }
      }

      // 秘密没命中：刚才因为它是静物而让位的那件东西，还是照常处理
      if (e) {
        grab(e);
        return;
      }

      /* 3. 场景装饰：树、灌木、树桩、泥地 */
      for (const h of spots) {
        const dx = (p.x - h.x) / h.rx;
        const dy = (p.y - h.y) / h.ry;
        if (dx * dx + dy * dy <= 1) {
          decor(h);
          return;
        }
      }

      /* 4. 水面 */
      if (water && p.x > water.x0 && p.x < water.x1 && p.y > water.y0 && p.y < water.y1) {
        splash(p.x, p.y);
      }
    },
    [toDesign, shown, secrets, spots, water, pickEntity, tap, discover, decor, splash],
  );

  const onMove = useCallback(
    (ev: React.PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const p = toDesign(ev.clientX, ev.clientY);
      if (!p) return;
      if (!d.moved) {
        const dist = Math.hypot(p.x - d.sx, p.y - d.sy);
        if (dist < TAP_SLOP) return;
        d.moved = true;
      }
      setLive({ id: d.id, x: p.x - d.ox, y: p.y - d.oy });
    },
    [toDesign],
  );

  const onUp = useCallback(
    (ev: React.PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      const from = swipeRef.current;
      swipeRef.current = null;

      /* 空手横划 / 轻点边缘 = 去隔壁区域（拖动物体时 d 不为空，走下面的路径） */
      if (!d) {
        const p = toDesign(ev.clientX, ev.clientY);
        // 里层空间（地下/树上/谷仓/沉船）不参与：那儿没有"隔壁"，划走了会让孩子迷路
        if (from && p && !meta.parent) {
          const dx = p.x - from.x;
          const dy = p.y - from.y;
          if (Math.abs(dx) > SWIPE_MIN && Math.abs(dx) > Math.abs(dy) * SWIPE_RATIO) {
            const i = REGION_ORDER.indexOf(region);
            if (i >= 0) {
              // 内容跟着手指走：往左划看右边那个，往右划看左边那个；两头是循环的
              const step = dx < 0 ? 1 : -1;
              go(REGION_ORDER[(i + step + REGION_ORDER.length) % REGION_ORDER.length]);
            }
          }
        }
        return;
      }

      const cur = live;
      setLive(null);
      if (!d.moved) {
        tap(d.ent);
        return;
      }
      if (!cur) return;
      // 拖到右下角的小篮子附近 = 收进篮子，可以带去别的区域
      const inBagZone = cur.x > view.x + view.w - 190 && cur.y > view.y + view.h - 190;
      if (inBagZone) carry(d.id);
      else drop(d.id, cur.x, cur.y);
    },
    [live, drop, tap, carry, view, toDesign, meta, region, go],
  );

  const Scene = SCENES[region];

  return (
    <svg
      ref={svgRef}
      className="v3-stage"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      preserveAspectRatio="xMidYMid slice"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onPointerLeave={onUp}
    >
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

      <g key={region} className="v3-scene-enter">
        <Scene view={view} phase={s.phase} weather={s.weather} season={s.season} night={night} eco={eco} />

        {/* 水面：点一下就是一圈涟漪。放在实体之下，所以拖动物体不受影响 */}
        {water && (
          <rect
            x={water.x0}
            y={water.y0}
            width={water.x1 - water.x0}
            height={water.y1 - water.y0}
            fill="transparent"
            className="v3-water"
            pointerEvents="none"
          />
        )}

        {/* 场景装饰热区：树、灌木、树桩、泥地。必须在实体之前，否则会挡住实体 */}
        {spots.map((h) => (
          <ellipse
            key={h.id}
            cx={h.x}
            cy={h.y}
            rx={h.rx}
            ry={h.ry}
            fill="transparent"
            className="v3-hotspot"
            data-hs={h.kind}
            pointerEvents="none"
          />
        ))}

        {shown.map((e) => (
          <EntitySprite
            key={e.id}
            e={e}
            night={night}
            pulse={pulses[e.id] ?? 0}
            dim={dimmed(region, eco.stage, e.t)}
            dragging={live?.id === e.id}
            live={live?.id === e.id ? live : undefined}
          />
        ))}

        {/* 还没被发现的秘密：一个几乎看不见的小光点，点到就会有东西出来 */}
        {secrets.map((sec) => (
          <g key={sec.id} className={`v3-secret${wig === sec.id ? ' is-wig' : ''}`} pointerEvents="none">
            <circle cx={sec.x} cy={sec.y - 10} r={26} fill="transparent" />
            <circle cx={sec.x} cy={sec.y - 10} r={5} fill="#fff8d8" opacity={0.16} />
          </g>
        ))}

        {/* 夜间压暗，压在实体之上，才显得光是亮的 */}
        <rect
          x={view.x - 100}
          y={view.y - 100}
          width={view.w + 200}
          height={view.h + 200}
          fill="url(#nightTint)"
          pointerEvents="none"
          style={{
            opacity: night ? (region === 'underwater' ? 0.14 : region === 'burrow' ? 0.1 : 0.3) : 0,
            transition: 'opacity 1.8s ease',
          }}
        />

        {night && !INDOOR.has(region) && (
          <g pointerEvents="none" style={{ opacity: 0.9 }}>
            <circle cx={view.x + view.w * 0.78} cy={view.y + view.h * 0.17} r={62} fill="#fff3c4" opacity={0.16} filter="url(#softBlur)" />
            <circle cx={view.x + view.w * 0.78} cy={view.y + view.h * 0.17} r={26} fill="url(#moonBody)" />
            <circle cx={view.x + view.w * 0.78 - 8} cy={view.y + view.h * 0.17 - 6} r={5} fill="#e9d79f" opacity={0.45} />
            <circle cx={view.x + view.w * 0.78 + 7} cy={view.y + view.h * 0.17 + 5} r={4} fill="#e9d79f" opacity={0.4} />
          </g>
        )}

        {/* 室内与水下不该有"房间里的雨"：小屋的天气只从窗户看得到 */}
        {!INDOOR.has(region) && <WeatherLayer view={view} weather={s.weather} />}

        {/* 特效：心 / 星 / 水花 / 落叶 / 花粉 */}
        {w.fx.map((f) => (
          <g
            key={f.id}
            className={`v3-fx v3-fx-${f.kind}`}
            transform={`translate(${f.x} ${f.y})`}
            pointerEvents="none"
          >
            {f.kind === 'heart' && <path d="M 0 6 C -14 -6 -8 -18 0 -10 C 8 -18 14 -6 0 6 Z" fill="#f28b92" />}
            {f.kind === 'spark' && (
              <g fill="#ffe9b8">
                {[0, 1, 2, 3, 4, 5].map((i) => {
                  const a = (Math.PI / 3) * i;
                  return <circle key={i} cx={Math.cos(a) * 18} cy={Math.sin(a) * 18} r={2.6} />;
                })}
              </g>
            )}
            {f.kind === 'water' && (
              <g fill="none" stroke="#e8f6ff" strokeWidth={2}>
                <ellipse rx={14} ry={5} opacity={0.9} />
                <ellipse rx={6} ry={2.2} opacity={0.6} />
              </g>
            )}
            {f.kind === 'note' && <circle r={8} fill="#c9b4e8" opacity={0.8} />}
            {f.kind === 'leaf' && (
              <path d="M -7 0 C -9 -7 0 -11 7 -8 C 9 -2 1 3 -7 0 Z" fill="#c9c96a" stroke="rgba(109,90,74,0.3)" strokeWidth={1.2} />
            )}
            {f.kind === 'pollen' && (
              <g fill="#ffe9a8">
                <circle cx={0} cy={0} r={3} />
                <circle cx={-7} cy={-5} r={2} opacity={0.8} />
                <circle cx={6} cy={-7} r={2.4} opacity={0.8} />
                <circle cx={2} cy={-12} r={1.8} opacity={0.7} />
              </g>
            )}
          </g>
        ))}

        <rect
          x={view.x - 100}
          y={view.y - 100}
          width={view.w + 200}
          height={view.h + 200}
          fill="url(#vignette)"
          pointerEvents="none"
        />
      </g>
    </svg>
  );
}
