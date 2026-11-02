/**
 * V3 存档系统
 *
 * 三条硬规则：
 *  1. 写入永不抛出（隐私模式 / 配额满 时静默降级）。
 *  2. 读取永不抛出，任何字段损坏都逐项回退到默认值。
 *  3. 版本化：v1 存档会被迁移而不是丢弃，孩子种的花要留着。
 */

import { clockAtPhase, defaultEco } from './eco';
import type { Eco, Entity, Phase, RegionId, SaveV3, Season, Weather } from './types';
import { applyLayoutFix } from './layoutFix';
import { AMBIENT, REGIONS, SEED_REV, seedEntities } from './regions';

const KEY = 'little-world.v3';
const V1_KEY = 'little-world.save.v1';
export const SAVE_VERSION = 3;

/** 合法的区域 id：包含森林的地下 / 树上两个里层空间 */
const REGION_IDS = new Set<string>(Object.keys(REGIONS));
const WEATHERS: Weather[] = ['clear', 'cloudy', 'rain', 'snow', 'wind'];
const PHASES: Phase[] = ['dawn', 'day', 'sunset', 'night'];
const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** 读世界状态：每个字段单独校验，坏一个不影响其它 */
function readEco(raw: unknown): Eco {
  const d = defaultEco();
  if (!raw || typeof raw !== 'object') return d;
  const o = raw as Record<string, unknown>;
  const f = (k: string, def: number, lo = 0, hi = 1) =>
    typeof o[k] === 'number' && Number.isFinite(o[k] as number)
      ? Math.min(hi, Math.max(lo, o[k] as number))
      : def;
  return {
    t: f('t', 0, 0, 1e9),
    speed: f('speed', 1, 0, 4),
    soil: f('soil', d.soil),
    water: f('water', d.water),
    tide: f('tide', d.tide),
    organic: f('organic', d.organic),
    wind: f('wind', d.wind),
    rain: f('rain', d.rain),
    stage: f('stage', 2, 1, 2),
    eggT: f('eggT', 0, 0, 1e9),
    clock: f('clock', d.clock, 0, 1),
    day: f('day', 1, 1, 1e9),
    log: Array.isArray(o.log) ? o.log.filter((x): x is string => typeof x === 'string').slice(-12) : [],
  };
}

function emptySave(): SaveV3 {
  return {
    v: SAVE_VERSION,
    weather: 'clear',
    phase: 'day',
    // 与时钟对齐：day 从 1 数起，seasonAt(1) 是春天。
    // 初始季节写 summer 的话，第一拍就会被时钟拉回春天。
    season: 'spring',
    region: 'forest',
    sound: true,
    vol: 0.6,
    ents: [...seedEntities(), ...AMBIENT.map((e) => ({ ...e }))],
    secrets: [],
    bag: [],
    seedRev: SEED_REV,
    // 第一次打开：先只点亮一批，孩子动三下之后森林整个醒过来
    eco: { ...defaultEco(), stage: 1 },
  };
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** 内容版本号：缺失或非法时当作 0（触发一次补注入） */
const isNumLike = (v: unknown): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : 0;

/* ───────────────── 字段级校验 ───────────────── */

const num = (v: unknown, d = 0): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d = false): boolean => (typeof v === 'boolean' ? v : d);

function readEntity(raw: unknown, i: number): Entity | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.t !== 'string' || !o.t) return null;
  const r = typeof o.r === 'string' && REGION_IDS.has(o.r) ? (o.r as RegionId) : 'forest';
  const e: Entity = {
    id: typeof o.id === 'string' && o.id ? o.id.slice(0, 64) : `fix-${i}`,
    t: o.t.slice(0, 32),
    r,
    x: Math.min(2200, Math.max(-600, num(o.x, 800))),
    y: Math.min(1400, Math.max(-400, num(o.y, 700))),
  };
  if (typeof o.s === 'number') e.s = Math.min(3, Math.max(0.3, o.s));
  if (typeof o.z === 'number') e.z = Math.min(99, Math.max(-99, o.z));
  if (typeof o.rot === 'number') e.rot = Math.min(360, Math.max(-360, o.rot));
  if (typeof o.st === 'number') e.st = Math.min(5, Math.max(0, Math.round(o.st)));
  if (typeof o.age === 'number' && Number.isFinite(o.age)) e.age = Math.min(1, Math.max(0, o.age));
  if (typeof o.act === 'string') e.act = o.act.slice(0, 12);
  if (typeof o.tx === 'number' && Number.isFinite(o.tx)) e.tx = Math.min(2200, Math.max(-600, o.tx));
  if (typeof o.ty === 'number' && Number.isFinite(o.ty)) e.ty = Math.min(1400, Math.max(-400, o.ty));
  if (typeof o.hx === 'number' && Number.isFinite(o.hx)) e.hx = Math.min(2200, Math.max(-600, o.hx));
  if (typeof o.hy === 'number' && Number.isFinite(o.hy)) e.hy = Math.min(1400, Math.max(-400, o.hy));
  if (typeof o.car === 'string') e.car = o.car.slice(0, 32);
  if (typeof o.cd === 'number' && Number.isFinite(o.cd)) e.cd = Math.max(0, o.cd);
  /*
   * fl = 这次逃跑什么时候结束（"被吓到"的时刻 + 4.5 秒）。
   * 一定要存：不存的话刷新一下就"忘了自己在跑"，act 停在 flee 而人却站住不动，
   * 而且没法在存档里看出"刚才这里发生过什么"。
   */
  if (typeof o.fl === 'number' && Number.isFinite(o.fl)) e.fl = Math.max(0, o.fl);
  if (typeof o.pol === 'boolean') e.pol = o.pol;
  if (typeof o.f === 'boolean') e.f = o.f;
  if (typeof o.v === 'number') e.v = Math.round(o.v);
  if (typeof o.fixed === 'boolean') e.fixed = o.fixed;
  if (typeof o.out === 'string') e.out = o.out.slice(0, 32);
  if (typeof o.in === 'string') e.in = o.in.slice(0, 32);
  if (typeof o.hidden === 'boolean') e.hidden = o.hidden;
  if (o.only === 'night' || o.only === 'day' || o.only === 'rain' || o.only === 'snow') e.only = o.only;
  return e;
}

function readEntities(raw: unknown): Entity[] {
  if (!Array.isArray(raw)) return seedEntities();
  const list = raw
    .slice(0, 900)
    .map((x, i) => readEntity(x, i))
    .filter((x): x is Entity => x !== null);
  // 一个都没有说明数据彻底坏了，重建世界总比空白好（含环境专属实体）
  return list.length ? list : [...seedEntities(), ...AMBIENT.map((e) => ({ ...e }))];
}

/**
 * 内容版本 5：把散落的松果 / 树枝 / 落叶收成"一堆"。
 * 只收还停在原位的——孩子挪过的就留着，不能因为改版把他的东西变没。
 */
const SCATTERED: Array<[string, number, number]> = [
  ['amb-f-pine1', 300, 730],
  ['amb-f-pine2', 1052, 722],
  ['amb-f-pine3', 1244, 692],
  ['amb-f-twig1', 832, 700],
  ['amb-f-twig2', 1176, 728],
  ['amb-f-twig3', 470, 766],
  ['amb-f-leaf1', 646, 770],
  ['amb-f-leaf2', 700, 762],
];

function retireScattered(ents: Entity[]): Entity[] {
  return ents.filter((e) => {
    const hit = SCATTERED.find(([id]) => id === e.id);
    if (!hit) return true;
    return !(Math.abs(e.x - hit[1]) < 60 && Math.abs(e.y - hit[2]) < 60);
  });
}

/** v1 → v3：把旧版种下的花搬进森林，保留天气与昼夜 */
function migrateV1(): SaveV3 | null {
  try {
    const raw = localStorage.getItem(V1_KEY);
    if (!raw) return null;
    const old = JSON.parse(raw) as Record<string, unknown>;
    if (!old || typeof old !== 'object') return null;
    const base = emptySave();
    const plants = Array.isArray(old.plants) ? old.plants : [];
    plants.slice(0, 8).forEach((p, i) => {
      if (!p || typeof p !== 'object') return;
      const o = p as Record<string, unknown>;
      base.ents.push({
        id: `migrated-flower-${i}`,
        t: 'flower',
        r: 'forest',
        x: num(o.fx, 0.5) * 1600,
        y: 640 + num(o.fy, 0.7) * 80,
        st: 3,
        v: i % 3,
        fixed: true,
      });
    });
    base.weather = old.weather === 'rain' ? 'rain' : 'clear';
    base.phase = old.timeOfDay === 'night' ? 'night' : 'day';
    // v1 的昼夜也要搬到新时钟上：不对齐的话第一拍就会把夜晚拉成白天
    base.eco.clock = clockAtPhase(base.phase);
    base.sound = bool(old.soundOn, true);
    base.vol = Math.min(1, Math.max(0, num(old.volume, 0.6)));
    return base;
  } catch {
    return null;
  }
}

/** 读取存档，永不抛出 */
export function loadSave(): SaveV3 {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const migrated = migrateV1();
      if (migrated) {
        saveNow(migrated);
        return migrated;
      }
      return emptySave();
    }
    const d = JSON.parse(raw) as Record<string, unknown>;
    if (!d || typeof d !== 'object') return emptySave();

    const bag = Array.isArray(d.bag)
      ? d.bag.filter((x): x is string => typeof x === 'string').slice(0, 5)
      : [];

    let ents = applyLayoutFix(readEntities(d.ents));
    const storedRev = isNumLike(d.seedRev);
    if (storedRev < 5) ents = retireScattered(ents);
    if (storedRev < SEED_REV) {
      // 内容有更新：把新增的"只在特定天气出现"的实体补进老存档，不用孩子重置世界
      const have = new Set(ents.map((e) => e.id));
      for (const a of AMBIENT) if (!have.has(a.id)) ents.push({ ...a });
    }

    const phase = PHASES.includes(d.phase as Phase) ? (d.phase as Phase) : 'day';
    const eco = readEco(d.eco);
    /**
     * 老存档没有世界时钟（这版才加的）。clock 会落在白天中段的默认位置，
     * 而时钟是昼夜的唯一驱动者——不对齐的话，孩子打开存档的第一拍
     * 就会看到"明明是夜晚，天突然亮了"。
     */
    const ecoRaw = d.eco as Record<string, unknown> | null;
    if (!ecoRaw || typeof ecoRaw.clock !== 'number') eco.clock = clockAtPhase(phase);

    return {
      v: SAVE_VERSION,
      weather: WEATHERS.includes(d.weather as Weather) ? (d.weather as Weather) : 'clear',
      phase,
      season: SEASONS.includes(d.season as Season) ? (d.season as Season) : 'spring',
      region: typeof d.region === 'string' && REGION_IDS.has(d.region) ? (d.region as RegionId) : 'forest',
      sound: bool(d.sound, true),
      vol: Math.min(1, Math.max(0, num(d.vol, 0.6))),
      ents,
      secrets: Array.isArray(d.secrets)
        ? d.secrets.filter((x): x is string => typeof x === 'string').slice(0, 200)
        : [],
      bag,
      seedRev: SEED_REV,
      lastSeen: typeof d.lastSeen === 'number' && Number.isFinite(d.lastSeen) ? (d.lastSeen as number) : undefined,
      eco,
    };
  } catch {
    return emptySave();
  }
}

export function saveNow(s: SaveV3): void {
  try {
    // 顺手记下"最后一次还在玩"的时间：下次打开时用它判断孩子离开了多久
    localStorage.setItem(KEY, JSON.stringify({ ...s, lastSeen: Date.now() }));
  } catch {
    /* 隐私模式 / 配额不足：忽略 */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
}

export function freshWorld(): SaveV3 {
  return clone(emptySave());
}

/** 离开多久算"回来过"：三分钟。比这个短就不打扰，孩子只是在刷新页面 */
const AWAY_MS = 3 * 60 * 1000;

/**
 * 离开一阵再回来，世界会在你离开的地方留一点痕迹。
 *
 * 不是奖励，是"你不在的时候这里也在过日子"——回来看到雪地上多了一根断枝、
 * 沙里多了一只蜗牛，孩子会想"这是谁弄的"。这比任何弹窗都更让人想再回来。
 *
 * 只留一件，而且每次先清掉旧的：攒一堆就成了垃圾。
 */
export function withRevisitTrace(s: SaveV3): SaveV3 {
  const last = s.lastSeen;
  if (!last || Date.now() - last < AWAY_MS) return s;
  const meta = REGIONS[s.region];
  // 里层空间不加：那儿本来就小，塞东西会挤，而且"回来"的第一眼应该在自己熟悉的地方
  if (!meta || meta.parent) return s;

  // 按天气挑一件"留下来的东西"——雪天不会有蜗牛，雨天不会有干叶子
  const t = s.weather === 'rain' ? 'snail' : s.weather === 'snow' ? 'twig' : s.season === 'autumn' ? 'leaf' : 'flower';
  const x = meta.focusX + 40 + Math.round(Math.random() * 80);
  const y = meta.groundY - 6;

  const ents = s.ents.filter((e) => !e.id.startsWith('trace-'));
  ents.push({ id: `trace-${Date.now().toString(36)}`, t, r: s.region, x, y, s: 1.15, fixed: true });
  return { ...s, ents, eco: { ...s.eco, log: [...s.eco.log.slice(-11), 'came_back'] } };
}
