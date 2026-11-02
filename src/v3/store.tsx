/**
 * 世界状态容器
 *
 * 所有"世界会发生什么"都收在这一个地方：组合判定、喂食、种植、生长、
 * 秘密发现、跨区域携带、天气昼夜。渲染层只负责画和发指针事件，
 * 这样同一条规则在八个区域里都成立，不会出现"森林能喂、农场不能"的情况。
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { audio, type SoundName } from '../systems/audioSystem';
import { resolveDrop, sizeOf } from './physics';
import { STAGE_MAX, clockAtPhase, dayAtSeason, isAgent, logEvent, rollWeather, stepEco, waterSoil } from './eco';
import { DIET, DRINKERS, PLANTABLE, findRecipe, stationAt, type Recipe } from './recipes';
import type { Hotspot, HotspotKind } from './hotspots';
import { REGIONS } from './regions';
import { clearSave, freshWorld, loadSave, saveNow, withRevisitTrace } from './save';
import {
  cameraFor,
  isVisible,
  type Entity,
  type Phase,
  type RegionId,
  type RegionMeta,
  type SaveV3,
  type Season,
  type Eco,
  type View,
  type Weather,
} from './types';

/** 短暂特效，不写入存档 */
export interface Fx {
  id: number;
  kind: 'heart' | 'spark' | 'water' | 'note' | 'leaf' | 'pollen';
  x: number;
  y: number;
}

export interface WorldApi {
  s: SaveV3;
  view: View;
  region: RegionId;
  meta: RegionMeta;
  night: boolean;
  ents: Entity[];
  bagEnts: Entity[];
  fx: Fx[];
  /** 点击计数器：同一只动物连续点击会给出不同反应 */
  pulses: Record<string, number>;
  /** 森林的世界状态：模拟时间 / 湿度 / 水位 / 有机质 / 解锁批次 / 事件流 */
  eco: Eco;
  /** 时间倍率 0..4（0 = 暂停） */
  setSpeed: (v: number) => void;
  /** 往事件流里记一条（孩子操作引发的） */
  emit: (name: string) => void;
  found: (id: string) => boolean;
  go: (r: RegionId) => void;
  setWeather: (w: Weather) => void;
  setPhase: (p: Phase) => void;
  setSeason: (se: Season) => void;
  setSound: (on: boolean) => void;
  setVol: (v: number) => void;
  spawn: (t: string, x: number, y: number, extra?: Partial<Entity>) => string;
  patch: (id: string, p: Partial<Entity>) => void;
  remove: (id: string) => void;
  drop: (id: string, x: number, y: number) => void;
  tap: (e: Entity) => void;
  carry: (id: string) => void;
  takeOut: (id: string, x: number, y: number) => void;
  discover: (id: string, reveal: string, x: number, y: number) => void;
  /** 点水面：一圈涟漪 */
  splash: (x: number, y: number) => void;
  /** 点场景里的树 / 灌木 / 泥地（不进 Entity 的装饰） */
  decor: (h: Hotspot) => void;
  reset: () => void;
  sfx: (n: SoundName) => void;
}

const Ctx = createContext<WorldApi | null>(null);

export function useWorld(): WorldApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useWorld 必须在 WorldProvider 内使用');
  return v;
}

/** 生成时就该带上环境门控的类型：白天才会出现在世界里的小家伙 */
const DAY_ONLY = new Set(['butterfly', 'bee']);
const NIGHT_ONLY = new Set(['firefly', 'owl', 'moth']);

/** 不该进篮子的（会飘的东西，篮子装不住） */
const NO_BAG = new Set(['clouditem', 'balloon', 'bubble', 'plane', 'kite']);

/** 每种动物的叫声 */
const VOICE: Record<string, SoundName> = {
  rabbit: 'rabbit',
  squirrel: 'chirp',
  hedgehog: 'chirp',
  fox: 'chirp',
  deer: 'chirp',
  owl: 'chirp',
  bird: 'bird',
  butterfly: 'buzz',
  ladybug: 'buzz',
  firefly: 'sparkle',
  caterpillar: 'pop',
  snail: 'pop',
  cow: 'moo',
  sheep: 'moo',
  pig: 'oink',
  hen: 'cluck',
  chick: 'cluck',
  duck: 'quack',
  horse: 'neigh',
  cat: 'meow',
  gull: 'bird',
  crab: 'pop',
  dolphin: 'chirp',
  octopus: 'water',
  jellyfish: 'sparkle',
  turtle: 'water',
  fish: 'water',
  fishb: 'water',
};

/** 会生长的植物类 */
const GROWERS = new Set(['plant', 'flower', 'corn', 'wheat', 'pumpkin', 'tomato', 'fern', 'berry']);

/** 模拟时钟步长（毫秒，真实时间） */
const TICK_MS = 700;

/**
 * 场景装饰被点一下的反应。
 *
 * 做成表而不是 if 链：加一种可点的东西只需要在 hotspots 里加一行、
 * 在这里挑一个音效，不用再动逻辑。
 */
const HOT_FX: Record<HotspotKind, { sfx: SoundName; fx: Fx['kind'] }> = {
  tree: { sfx: 'leaf', fx: 'leaf' },
  bush: { sfx: 'leaf', fx: 'leaf' },
  stump: { sfx: 'stone', fx: 'spark' },
  soil: { sfx: 'dig', fx: 'spark' },
  web: { sfx: 'sparkle', fx: 'spark' },
  rock: { sfx: 'stone', fx: 'spark' },
  sand: { sfx: 'dig', fx: 'water' },
  hay: { sfx: 'leaf', fx: 'leaf' },
  door: { sfx: 'door', fx: 'spark' },
  metal: { sfx: 'hammer', fx: 'spark' },
  soft: { sfx: 'leaf', fx: 'note' },
  cloud: { sfx: 'cloud', fx: 'spark' },
  water: { sfx: 'water', fx: 'water' },
  lamp: { sfx: 'sparkle', fx: 'spark' },
  // 音高不是固定音效：decor 里按 h.note 调 audio.playNote，这里的 sfx 只是兜底
  chime: { sfx: 'sparkle', fx: 'note' },
};

const NOISE = new Set([
  'rabbit', 'squirrel', 'hedgehog', 'fox', 'deer', 'owl', 'bird', 'butterfly', 'ladybug', 'firefly',
  'caterpillar', 'snail', 'cow', 'sheep', 'pig', 'hen', 'chick', 'duck', 'horse', 'cat', 'gull',
  'crab', 'dolphin', 'octopus', 'jellyfish', 'turtle', 'fish', 'fishb',
]);

let fxSeq = 0;

export function WorldProvider({ size, children }: { size: { w: number; h: number }; children: ReactNode }) {
  // 离开过一阵的话，回来的第一眼会看到世界留下的一点痕迹
  const [s, setS] = useState<SaveV3>(() => withRevisitTrace(loadSave()));
  const [fx, setFx] = useState<Fx[]>([]);
  const [pulses, setPulses] = useState<Record<string, number>>({});

  const meta = REGIONS[s.region];
  const view = useMemo(
    () => cameraFor(Math.max(size.w, 1), Math.max(size.h, 1), meta.focusX, meta.groundY),
    [size.w, size.h, meta.focusX],
  );

  /* ── 持久化（节流，拖动时不频繁写盘） ── */
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveNow(s), 280);
    return () => {
      if (timer.current !== null) clearTimeout(timer.current);
    };
  }, [s]);

  /* ── 声音同步 ── */
  useEffect(() => {
    audio.setEnabled(s.sound);
    audio.setVolume(s.vol);
  }, [s.sound, s.vol]);

  useEffect(() => {
    audio.setRain(s.weather === 'rain');
    audio.setNight(s.phase === 'night');
    audio.setScene(meta.ambience);
  }, [s.weather, s.phase, meta.ambience]);

  /* ── 后台暂停 ── */
  useEffect(() => {
    const onVis = () => document.body.classList.toggle('is-paused', document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const sfx = useCallback((n: SoundName) => {
    audio.unlock();
    audio.play(n);
  }, []);

  /** 每棵树第一次被摇，一定会掉东西——摇了四次什么都没有，孩子会以为坏了 */
  const shaken = useRef<Set<string>>(new Set());

  const pushFx = useCallback((kind: Fx['kind'], x: number, y: number) => {
    const item: Fx = { id: ++fxSeq, kind, x, y };
    setFx((list) => [...list.slice(-14), item]);
    window.setTimeout(() => setFx((list) => list.filter((f) => f.id !== item.id)), 1100);
  }, []);

  const setSpeed = useCallback((v: number) => {
    setS((st) => ({ ...st, eco: { ...st.eco, speed: Math.min(4, Math.max(0, v)) } }));
  }, []);

  const emit = useCallback((name: string) => {
    setS((st) => ({ ...st, eco: logEvent(st.eco, name) }));
  }, []);

  /* ── 开场两批：孩子动过三次之后，远处淡着的东西全部亮起来 ── */
  const touches = useRef(0);
  const awaken = useCallback(() => {
    touches.current += 1;
    if (touches.current < 3) return;
    setS((st) => (st.eco.stage >= 2 ? st : { ...st, eco: { ...st.eco, stage: 2 } }));
  }, []);

  const patch = useCallback((id: string, p: Partial<Entity>) => {
    setS((st) => ({ ...st, ents: st.ents.map((e) => (e.id === id ? { ...e, ...p } : e)) }));
  }, []);

  const remove = useCallback((id: string) => {
    setS((st) => ({ ...st, ents: st.ents.filter((e) => e.id !== id), bag: st.bag.filter((b) => b !== id) }));
  }, []);

  const spawn = useCallback((t: string, x: number, y: number, extra: Partial<Entity> = {}) => {
    const id = `n-${t}-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`;
    // 摇树掉出来的蝴蝶不能留到晚上——生出来时就把门控带上
    const gate: Partial<Entity> = DAY_ONLY.has(t)
      ? { only: 'day' }
      : NIGHT_ONLY.has(t)
        ? { only: 'night' }
        : {};
    setS((st) => {
      /**
       * 同类不要叠在同一个点上。
       * 摇三下树会掉三根树枝，如果三根重在一起，孩子只看得到一个、
       * 也只点得到一个（命中会被最上面那个吃掉）。左右错开一格。
       */
      let nx = x;
      for (let i = 0; i < 6; i += 1) {
        const clash = st.ents.some(
          (e) => e.r === st.region && e.t === t && Math.abs(e.x - nx) < 34 && Math.abs(e.y - y) < 22,
        );
        if (!clash) break;
        nx += 36 * (i % 2 === 0 ? 1 : -1);
      }
      return { ...st, ents: [...st.ents, { id, t, r: st.region, x: nx, y, ...gate, ...extra }] };
    });
    return id;
  }, []);

  const go = useCallback(
    (r: RegionId) => {
      setS((st) => (st.region === r ? st : { ...st, region: r }));
      setFx([]);
      sfx('whoosh');
    },
    [sfx],
  );

  /**
   * 家长面板的三个按钮不再是"设死一个值"，而是把世界时钟拨过去。
   *
   * 时钟是昼夜/季节/天气的唯一驱动者，所以手动改完以后，自动循环会从那里接着走：
   * 拨到夜晚 = 现在是晚上八点，天亮还要等一阵；换季 = 跳到那一季的第一天。
   * 这样"家长手动控制"和"世界自己走"是同一套东西，不会互相打架。
   */
  const setWeather = useCallback(
    (w: Weather) => {
      setS((st) => (st.weather === w ? st : { ...st, weather: w }));
      sfx(w === 'rain' ? 'water' : w === 'snow' ? 'sparkle' : w === 'wind' ? 'whoosh' : 'cloud');
    },
    [sfx],
  );

  const setPhase = useCallback(
    (p: Phase) => {
      setS((st) => ({ ...st, phase: p, eco: { ...st.eco, clock: clockAtPhase(p) } }));
      sfx(p === 'night' ? 'sparkle' : 'sun');
    },
    [sfx],
  );

  const setSeason = useCallback(
    (se: Season) => {
      setS((st) => {
        const day = dayAtSeason(st.eco.day, se);
        // 换季那天的天气要按新季节重新掷：不能让夏天沿用冬天那场雪
        return { ...st, season: se, weather: rollWeather(se, day), eco: { ...st.eco, day } };
      });
      sfx('leaf');
    },
    [sfx],
  );

  const setSound = useCallback(
    (on: boolean) => {
      setS((st) => ({ ...st, sound: on }));
      if (on) {
        audio.unlock();
        audio.setEnabled(true);
        audio.play('pop');
      }
    },
    [],
  );

  const setVol = useCallback((v: number) => {
    setS((st) => ({ ...st, vol: Math.min(1, Math.max(0, v)) }));
  }, []);

  const discover = useCallback(
    (id: string, reveal: string, x: number, y: number) => {
      setS((st) => {
        if (st.secrets.includes(id)) return st;
        return {
          ...st,
          secrets: [...st.secrets, id],
          ents: [
            ...st.ents,
            {
              id: `secret-${id}`,
              t: reveal,
              r: st.region,
              x,
              y,
              s: 0.9,
              z: 5,
              fixed: !NOISE.has(reveal),
            },
          ],
        };
      });
      pushFx('spark', x, y - 20);
      sfx('sparkle');
    },
    [pushFx, sfx],
  );

  /** 把 A 拖到 B 上：先查喂食，再查组合，再查浇水，最后是种植与落点 */
  const drop = useCallback(
    (id: string, x: number, y: number) => {
      awaken();
      setS((st) => {
        const e = st.ents.find((n) => n.id === id);
        if (!e) return st;
        const region = e.r;
        const env = { night: st.phase === 'night', weather: st.weather, season: st.season };
        const others = st.ents.filter(
          (n) => n.r === region && n.id !== id && !st.bag.includes(n.id) && isVisible(n, env),
        );

        // 找落点下的目标物体（取离落点最近、且命中包围盒的）
        let target: Entity | null = null;
        let best = Infinity;
        for (const o of others) {
          const { w, h } = sizeOf(o);
          if (Math.abs(o.x - x) <= w * 0.55 && y >= o.y - h * 1.05 && y <= o.y + 8) {
            let d = Math.abs(o.x - x) + Math.abs(o.y - y) * 0.4;
            /**
             * 能组合 / 能吃的对象优先。
             *
             * 孩子把树枝往火堆上放，可火堆旁边正好落着一片叶子——按纯距离算，
             * 叶子可能更近，于是组合就变成了"把树枝堆在叶子上"。这不合理：
             * 他瞄准的是火堆。给可交互的对象减一档距离，让意图赢过像素。
             *
             * 但只减 18：减太多（试过 40）会让"远处那个能组合的东西"抢走
             * 眼前真正的目标——蘑菇就放不进篮子了。
             */
            if (findRecipe(e.t, o.t) || DIET[o.t]?.includes(e.t)) d -= 18;
            if (d < best) {
              best = d;
              target = o;
            }
          }
        }

        // 1. 喂食
        if (target && DIET[target.t]?.includes(e.t)) {
          audio.play('eat');
          return {
            ...st,
            ents: st.ents
              .filter((n) => n.id !== e.id)
              .map((n) => (n.id === target!.id ? { ...n, f: true } : n)),
          };
        }

        // 2. 物品组合
        if (target) {
          const r = findRecipe(e.t, target.t);
          if (r) return applyRecipe(st, r, e, target);
        }

        // 3. 站点组合（烤箱、面包房、工作台……）
        const station = stationAt(region, x, y);
        if (station) {
          const r = findRecipe(e.t, station.key);
          // 站点没有"目标物体"，所以产物要落在松手的位置（种下的地方）
          if (r) return applyRecipe(st, r, e, null, { x, y });
        }

        // 4. 浇水：土壤湿度立刻涨，植物自己会开始长
        if (target && (e.t === 'can' || e.t === 'bucket') && (DRINKERS.has(target.t) || GROWERS.has(target.t))) {
          audio.play('water');
          return {
            ...st,
            eco: waterSoil(st.eco, 0.22),
            ents: st.ents.map((n) => (n.id === target!.id ? { ...n, f: true } : n)),
          };
        }

        // 5. 种植：把种子放到地上，变成一个小土坑
        const ground = REGIONS[region].groundY;
        if (PLANTABLE.has(e.t) && !target && y > ground - 140) {
          audio.play('plant');
          return {
            ...st,
            eco: logEvent(st.eco, 'seed_planted'),
            ents: st.ents.map((n) =>
              n.id === e.id ? { ...n, t: 'plant', st: 0, f: false, age: 0, x, y: ground } : n,
            ),
          };
        }

        // 6. 普通落点
        //    动物被搬家之后，新位置就是它的家——否则它会立刻走回出生点，
        //    孩子刚摆好的"牛在菜地旁边"会自己散掉。
        const rest = resolveDrop(e, others, region, x, y, st.eco.tide);
        const homed = isAgent(e.t) ? { hx: rest.x, hy: rest.y, tx: undefined, ty: undefined } : {};
        return {
          ...st,
          ents: st.ents.map((n) => (n.id === e.id ? { ...n, x: rest.x, y: rest.y, ...homed } : n)),
        };
      });
    },
    [awaken],
  );

  /**
   * 点击
   *
   * 每个东西都有自己的反应：石头底下藏虫子、花开了会招蝴蝶、
   * 树洞是另一个空间的入口。统一的只有"点一下会有回应"这件事本身。
   */
  const tap = useCallback(
    (e: Entity) => {
      awaken();
      setPulses((p) => ({ ...p, [e.id]: (p[e.id] ?? 0) + 1 }));

      /* ── 入口：地下 / 树上 ── */
      if (e.t === 'burrowdoor') {
        go('burrow');
        return;
      }
      if (e.t === 'treehole') {
        go(e.r === 'canopy' ? 'forest' : 'canopy');
        return;
      }
      /** 梯子：从里层回到外面那一层（地下回森林、谷仓回农场、沉船回海底） */
      if (e.t === 'ladder') {
        go(REGIONS[e.r].parent ?? 'forest');
        return;
      }

      /* ── 树洞里的松鼠探头 ── */
      if (e.t === 'treehollow') {
        patch(e.id, { f: !e.f });
        sfx('chirp');
        return;
      }

      /* ── 会叫的动物 ── */
      if (VOICE[e.t]) {
        sfx(VOICE[e.t]);
        pushFx('heart', e.x, e.y - 40);
        if (e.t === 'frog') pushFx('water', e.x + 26, e.y - 2);
        if (e.t === 'bird' || e.t === 'owl') pushFx('spark', e.x, e.y - 46);
        return;
      }

      /* ── 花：开了花就撒花粉，附近的蝴蝶会飞过来 ── */
      if (e.t === 'flower' && (e.st ?? 0) >= 3) {
        sfx('bloom');
        pushFx('pollen', e.x - 7, e.y - 36);
        pushFx('pollen', e.x + 8, e.y - 30);
        setS((st) => {
          const near = st.ents
            .filter((n) => n.r === e.r && (n.t === 'butterfly' || n.t === 'bee'))
            .sort((a, b) => Math.abs(a.x - e.x) - Math.abs(b.x - e.x))[0];
          if (!near || Math.abs(near.x - e.x) > 560) return st;
          return {
            ...st,
            ents: st.ents.map((n) => (n.id === near.id ? { ...n, x: e.x + 36, y: e.y - 30 } : n)),
          };
        });
        return;
      }

      /* ── 石头：底下常有瓢虫 ── */
      if (e.t === 'rock') {
        sfx('stone');
        if (!e.f) {
          patch(e.id, { f: true });
          spawn('ladybug', e.x + 40, e.y + 4, { fixed: true, s: 1.1 });
        }
        return;
      }

      if (e.t === 'mushroom') {
        sfx('pop');
        pushFx('spark', e.x, e.y - 18);
        return;
      }

      if (e.t === 'log' || e.t === 'stump' || e.t === 'pinecone' || e.t === 'acorn') {
        sfx('stone');
        return;
      }

      if (e.t === 'spider') {
        // 蛛网被碰了一下
        sfx('sparkle');
        pushFx('spark', e.x, e.y - 20);
        return;
      }

      if (e.t === 'campfire') {
        sfx('leaf');
        pushFx('spark', e.x, e.y - 30);
        return;
      }

      if (e.t === 'nest') {
        sfx('chirp');
        return;
      }

      if (e.t === 'basket') {
        sfx('pop');
        return;
      }

      if (e.t === 'twig' || e.t === 'leaf' || e.t === 'leafpile' || e.t === 'berry') {
        sfx('leaf');
        pushFx('leaf', e.x, e.y - 14);
        return;
      }

      if (e.t === 'can' || e.t === 'bucket') {
        sfx('water');
        return;
      }

      if (e.t === 'egg') {
        const n = (e.st ?? 0) + 1;
        if (n >= 3) {
          sfx('cluck');
          setS((st) => ({
            ...st,
            ents: [
              ...st.ents.filter((x) => x.id !== e.id),
              { id: `hatched-${Date.now().toString(36)}`, t: 'chick', r: e.r, x: e.x, y: e.y, fixed: true },
            ],
          }));
          pushFx('spark', e.x, e.y - 30);
        } else {
          patch(e.id, { st: n });
          sfx('pop');
        }
        return;
      }

      if (GROWERS.has(e.t)) {
        const st = e.st ?? 0;
        if (st >= STAGE_MAX) {
          // 熟了：摘下来。植株退回"开过花"，还能再结一次
          const fruit = e.t === 'flower' ? 'seed' : e.t === 'berry' ? 'berry' : e.t === 'tomato' ? 'tomato' : e.t === 'pumpkin' ? 'pumpkin' : 'apple';
          spawn(fruit, e.x + 22, e.y - 4, { s: 1.2 });
          patch(e.id, { st: 4, pol: false, f: false, age: 0 });
          sfx('bloom');
          pushFx('spark', e.x, e.y - 30);
          emit('fruit_picked');
        } else if (!e.f) {
          // 浇水：这一株先喝饱（同时土壤湿度也涨一点）
          patch(e.id, { f: true });
          setS((stt) => ({ ...stt, eco: waterSoil(stt.eco, 0.18) }));
          sfx('water');
          pushFx('water', e.x, e.y - 24);
        } else {
          sfx('leaf');
        }
        return;
      }

      if (e.t === 'ball') {
        sfx('pop');
        setS((st) => ({ ...st, ents: st.ents.map((n) => (n.id === e.id ? { ...n, y: Math.max(120, n.y - 90) } : n)) }));
        return;
      }

      if (e.t === 'balloon' || e.t === 'clouditem' || e.t === 'plane' || e.t === 'bubble') {
        sfx('whoosh');
        setS((st) => ({
          ...st,
          ents: st.ents.map((n) => (n.id === e.id ? { ...n, y: Math.max(110, n.y - 60) } : n)),
        }));
        return;
      }

      sfx('pop');
    },
    [go, patch, pushFx, sfx, spawn, emit, awaken],
  );

  /** 点水面：一圈一圈的涟漪 */
  const splash = useCallback(
    (x: number, y: number) => {
      pushFx('water', x, y);
      pushFx('water', x + 18, y + 7);
      sfx('water');
    },
    [pushFx, sfx],
  );

  /** 场景装饰：树、灌木、树桩、泥地、礁石、书架——它们不是 Entity，但仍然要有反应 */
  const decor = useCallback(
    (h: Hotspot) => {
      const react = HOT_FX[h.kind];
      /**
       * 会唱歌的东西：音高自己发声，不走固定音效。
       * 敲一下要"有音高、有长短"，孩子才会把它当乐器而不是按钮——
       * 所以他敲第二下、第三下，都是在试"这块和那块一样吗"。
       */
      if (h.note !== undefined) {
        audio.playNote(h.note);
        pushFx('note', h.x, h.y - 18);
        pushFx('note', h.x + 6, h.y - 30);
        return;
      }
      sfx(react.sfx);
      const jx = (Math.random() - 0.5) * Math.min(60, h.rx);
      pushFx(react.fx, h.x + jx, h.y - Math.min(24, h.ry * 0.5));

      /* 摇树：第一次一定掉东西——摇了四次什么都没有，孩子会以为坏了 */
      if (h.kind === 'tree') {
        pushFx('leaf', h.x + (Math.random() - 0.5) * 56, h.y + h.ry * 0.4);
        pushFx('leaf', h.x + (Math.random() - 0.5) * 90, h.y + h.ry * 0.8);
        const drops = h.drops ?? [];
        const firstTime = !shaken.current.has(h.id);
        if (firstTime) shaken.current.add(h.id);
        if (drops.length && (firstTime || Math.random() < 0.55)) {
          const t = drops[Math.floor(Math.random() * drops.length)];
          spawn(t, h.x + (Math.random() - 0.5) * 70, h.gy ?? REGIONS[h.r].groundY);
        }
      }

      /* 灌木：扒开常有小虫 */
      if (h.kind === 'bush' && Math.random() < 0.32) {
        spawn(Math.random() < 0.5 ? 'ladybug' : 'butterfly', h.x + 12, h.y - 8, { fixed: true, s: 1.05 });
      }

      /* 泥地 / 土壁：挖开一次，底下有东西（每个坑只出一次） */
      if (h.kind === 'soil') {
        setS((st) => {
          const key = `dig-${h.id}`;
          if (st.secrets.includes(key)) return st;
          return {
            ...st,
            secrets: [...st.secrets, key],
            ents: [
              ...st.ents,
              {
                id: `dug-${h.id}`,
                t: st.region === 'burrow' ? 'worm' : 'rock',
                r: st.region,
                x: h.x,
                y: h.y + 12,
                s: 1.1,
                fixed: true,
              },
            ],
          };
        });
      }

      /* 通用掉落：热区自己声明能冒出什么 */
      const spawns = h.spawn ?? [];
      if (spawns.length) {
        const hit = spawns.find((s) => Math.random() < s.p);
        if (hit) {
          spawn(hit.t, h.x + (Math.random() - 0.5) * 44, h.gy ?? REGIONS[h.r].groundY, { s: 1.1 });
        }
      }

      /* 入口：点了就进另一个空间 */
      if (h.to) go(h.to);
    },
    [go, pushFx, sfx, spawn],
  );

  /** 收进篮子：可以带到别的区域 */
  const carry = useCallback(
    (id: string) => {
      let refused = false;
      setS((st) => {
        const target = st.ents.find((n) => n.id === id);
        // 云、气球这类"会飘的"不进篮子——篮子装的是能带走的东西
        if (!target || NO_BAG.has(target.t) || st.bag.includes(id) || st.bag.length >= 5) {
          refused = true;
          return st;
        }
        return { ...st, bag: [...st.bag, id] };
      });
      sfx(refused ? 'cloud' : 'pop');
    },
    [sfx],
  );

  /** 从篮子里拿出来，放到当前区域 */
  const takeOut = useCallback((id: string, x: number, y: number) => {
    setS((st) => {
      const e = st.ents.find((n) => n.id === id);
      if (!e) return { ...st, bag: st.bag.filter((b) => b !== id) };
      const others = st.ents.filter((n) => n.r === st.region && n.id !== id);
      const rest = resolveDrop(e, others, st.region, x, y, st.eco.tide);
      return {
        ...st,
        bag: st.bag.filter((b) => b !== id),
        ents: st.ents.map((n) => (n.id === id ? { ...n, r: st.region, x: rest.x, y: rest.y } : n)),
      };
    });
  }, []);

  /* ── 唯一的模拟时钟 ──
   *
   * 整个森林只有这一个 setInterval：天气、土壤、水位、植物、幼虫、动物行为
   * 全部由它推进。后台标签页不推进（回来时 dt 会被夹到 2 秒），
   * 暂停就是 eco.speed = 0。
   */
  const lastTick = useRef<number>(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTick.current) / 1000;
      lastTick.current = now;
      if (document.hidden) return;
      setS((st) => stepEco(st, dt));
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  const reset = useCallback(() => {
    clearSave();
    const fresh = freshWorld();
    setS(fresh);
    saveNow(fresh);
    sfx('sparkle');
  }, [sfx]);

  const found = useCallback((id: string) => s.secrets.includes(id), [s.secrets]);

  const ents = useMemo(
    () => s.ents.filter((e) => e.r === s.region && !s.bag.includes(e.id)).sort((a, b) => (a.z ?? 0) - (b.z ?? 0)),
    [s.ents, s.region, s.bag],
  );

  const bagEnts = useMemo(
    () => s.bag.map((id) => s.ents.find((e) => e.id === id)).filter((x): x is Entity => !!x),
    [s.bag, s.ents],
  );

  const value = useMemo<WorldApi>(
    () => ({
      s,
      view,
      region: s.region,
      meta,
      night: s.phase === 'night',
      ents,
      bagEnts,
      fx,
      pulses,
      eco: s.eco,
      setSpeed,
      emit,
      found,
      go,
      setWeather,
      setPhase,
      setSeason,
      setSound,
      setVol,
      spawn,
      patch,
      remove,
      drop,
      tap,
      carry,
      takeOut,
      discover,
      splash,
      decor,
      reset,
      sfx,
    }),
    [
      s, view, meta, ents, bagEnts, fx, pulses, found, go, setWeather, setPhase, setSeason, setSound,
      setVol, spawn, patch, remove, drop, tap, carry, takeOut, discover, splash, decor, reset, sfx,
      setSpeed, emit,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** 纯函数：按规则生成产物 */
function applyRecipe(
  st: SaveV3,
  r: Recipe,
  a: Entity,
  b: Entity | null,
  at?: { x: number; y: number },
): SaveV3 {
  const baseX = b ? b.x : at ? at.x : a.x;
  const baseY = b ? b.y : at ? at.y : a.y;
  // stAdd：在目标原有的阶段上继续加（往鸟巢里塞树枝，越塞越满）
  const stage = r.stAdd !== undefined ? Math.min(3, (b?.st ?? 0) + r.stAdd) : r.st;
  const out: Entity[] = [];
  for (let i = 0; i < (r.n ?? 1); i += 1) {
    out.push({
      id: `made-${r.out}-${Date.now().toString(36)}-${i}-${Math.floor(Math.random() * 999)}`,
      t: r.out,
      r: a.r,
      x: baseX + i * 26,
      y: baseY,
      ...(stage !== undefined ? { st: stage } : {}),
      ...(r.v !== undefined ? { v: r.v } : {}),
    });
  }

  let ents = st.ents;
  if (!r.keepA) ents = ents.filter((e) => e.id !== a.id);
  if (b && !r.keepB) ents = ents.filter((e) => e.id !== b.id);
  // 产物类型与目标相同（例如叠积木）时，直接替换目标，避免无限堆积
  if (b && r.out === b.t && r.onB) ents = ents.filter((e) => e.id !== b.id);

  audio.play(r.sfx ?? 'pop');
  return { ...st, ents: [...ents, ...out] };
}
