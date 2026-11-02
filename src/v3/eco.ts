/**
 * 世界生态
 *
 * 一条原则：**世界自己会走**。所有对象读同一份 `Eco`，由一个时钟推进，
 * 不再各自 setInterval 播随机动画。
 *
 * 六个子系统（都在这一个文件里，因为它们互相喂数据，拆开反而看不清因果）：
 *   1. 水循环    雨 → 土壤湿度 → 水位 / 潮位 → 蒸发
 *   2. 植物     种子→芽→幼苗→成株→开花→结果，速度由湿度/日照/季节/有机质共同决定
 *   3. 授粉     花开 → 蜂蝶来访 → 授粉 → 结果
 *   4. 落叶分解 落叶堆 → 蚯蚓分解 → 土壤有机质 → 植物长得更好
 *   5. 动物行为 栖息地 + 食物 + 活动时间 → 有限状态机
 *   6. 事件     每次状态跃迁都往 eco.log 记一条，供家长面板与测试查看
 *
 * 每个区域不是"另一套规则"，而是同一套规则换一组参数：
 * 海边蒸发快、农场土最肥、海底没有落叶、工地什么也长不出来。
 * 参数在 CLIMATE 里，行为在 HABITAT_BY_REGION 里，加区域只需要加数据。
 *
 * 复杂度控制：一次 tick 只算「当前区域」的动物（上限 26 只），植物与土壤全局算。
 * 任何一步出错都不允许让整个 tick 抛出去——最外层包了 try/catch。
 */

import { DIET } from './recipes';
import { WATER, shoreY } from './regions';
import type { Eco, Entity, Phase, RegionId, SaveV3, Season, Weather } from './types';

/* ─────────────────────────── 常量 ─────────────────────────── */

/** 植物最高阶段：0 土坑 / 1 芽 / 2 幼苗 / 3 成株 / 4 开花 / 5 结果 */
export const STAGE_MAX = 5;

/** 会长的东西 */
export const PLANTS = new Set(['plant', 'flower', 'corn', 'wheat', 'pumpkin', 'tomato', 'fern', 'berry']);

/** 会把落叶变土的东西（有它分解更快） */
const DECOMPOSERS = new Set(['worm', 'mushroom', 'ant', 'crab']);

/** 潮汐周期（模拟秒）：一涨一落约两分半，孩子坐着就能看完一轮 */
const TIDE_PERIOD = 150;

/* ─────────────────────── 世界时钟：昼夜 / 季节 / 天气 ───────────────────────
 *
 * 昼夜不再由人手按出来，而是 clock 自己走：常速下 120 秒一整天，
 * 日出 12 秒 → 白天 48 秒 → 日落 12 秒 → 夜晚 48 秒。
 * 每过 4 个整天季节往下一季；每个新的一天按当季的概率表掷一次天气。
 * st.phase / st.season / st.weather 仍是唯一的状态出口（渲染层照旧读它们），
 * 只是它们现在由时钟驱动，家长面板的按钮变成"把时钟拨过去"。
 */

/** 一整天的长度（常速下的真实秒数）：两分钟一个昼夜 */
export const DAY_SECONDS = 120;

/** 一季几天（季节每 4 个昼夜往下一季） */
export const DAYS_PER_SEASON = 4;

/** 时段表：一天的进度 0..1 落在哪个时段（顺序即时间顺序） */
const PHASE_SPANS: Array<[Phase, number]> = [
  ['dawn', 0.1],
  ['day', 0.5],
  ['sunset', 0.6],
  ['night', 1],
];

/** 时段中点：手动"拨到某时段"时 clock 放这里（离两端都远，不会一下就跳走） */
const PHASE_MID: Record<Phase, number> = { dawn: 0.05, day: 0.3, sunset: 0.55, night: 0.8 };

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

/** clock（一天进度）落在哪个时段 */
export function phaseAt(clock: number): Phase {
  const c = ((clock % 1) + 1) % 1;
  for (const [p, end] of PHASE_SPANS) if (c < end) return p;
  return 'night';
}

/** 手动"拨到某时段"时，clock 应该是多少 */
export const clockAtPhase = (p: Phase): number => PHASE_MID[p];

/** 第 day 天是哪个季节（从世界第 1 天起，4 天一季循环） */
export function seasonAt(day: number): Season {
  const d = Math.max(1, Math.floor(day));
  return SEASON_ORDER[Math.floor((d - 1) / DAYS_PER_SEASON) % 4];
}

/** 一年四季 */
const DAYS_PER_YEAR = DAYS_PER_SEASON * 4;

/** 手动"跳到某季节"时，把 day 对齐到那一季的第一天（同一年内换季，天数不倒退一整年） */
export function dayAtSeason(day: number, target: Season): number {
  const d = Math.max(1, Math.floor(day));
  const year = Math.floor((d - 1) / DAYS_PER_YEAR);
  return year * DAYS_PER_YEAR + SEASON_ORDER.indexOf(target) * DAYS_PER_SEASON + 1;
}

/**
 * 每个季节一天里各种天气的权重。
 * 夏天没有雪：不是概率低，是根本没有这一项。
 * 冬天雪最多、秋天风大、春天爱下雨——都是孩子能感知的现实规律。
 */
const SEASON_WEATHER: Record<Season, Array<[Weather, number]>> = {
  spring: [['clear', 42], ['rain', 30], ['cloudy', 18], ['wind', 10]],
  summer: [['clear', 56], ['rain', 26], ['cloudy', 12], ['wind', 6]],
  autumn: [['clear', 34], ['wind', 28], ['rain', 22], ['cloudy', 16]],
  winter: [['snow', 36], ['clear', 26], ['cloudy', 22], ['wind', 16]],
};

/**
 * 掷一天的开始天气。以天数做种子：同一天内怎么算都是同一个结果
 * （存档读回来、测试重跑，天气都稳定），第二天自然换一个。
 */
export function rollWeather(season: Season, day: number): Weather {
  const table = SEASON_WEATHER[season];
  const total = table.reduce((n, [, w]) => n + w, 0);
  const r = (pseudo(`weather-${Math.max(1, Math.floor(day))}`, 77) % 1000) / 1000;
  let acc = 0;
  for (const [w, weight] of table) {
    acc += weight / total;
    if (r < acc) return w;
  }
  return 'clear';
}


/**
 * 各区域的气候。
 *
 * - rainGain：雨水变成土壤湿度的效率。海底不淋雨，靠"水流"维持。
 * - evap：晴天蒸发的快慢。海边晒得最狠，工地次之。
 * - soilBase：不下雨时土壤湿度的平衡点。海底是沙子存不住水。
 * - decomp：落叶分解速度倍率。
 * - litter：会不会在树下积落叶（没树的地方不积）。
 * - organic：有机质的自然基线，海底沙地几乎为零。
 */
export interface Climate {
  rainGain: number;
  evap: number;
  soilBase: number;
  decomp: number;
  litter: boolean;
  litterAt?: [number, number];
  organic: number;
}

const DRY: Climate = { rainGain: 0.02, evap: 0.014, soilBase: 0.2, decomp: 0.5, litter: false, organic: 0.06 };

export const CLIMATE: Record<RegionId, Climate> = {
  forest: { rainGain: 0.055, evap: 0.006, soilBase: 0.42, decomp: 1, litter: true, litterAt: [700, 780], organic: 0.22 },
  farm: { rainGain: 0.07, evap: 0.009, soilBase: 0.52, decomp: 1.3, litter: true, litterAt: [330, 742], organic: 0.36 },
  seaside: { rainGain: 0.03, evap: 0.016, soilBase: 0.16, decomp: 0.45, litter: false, organic: 0.05 },
  town: { rainGain: 0.04, evap: 0.012, soilBase: 0.24, decomp: 0.7, litter: true, litterAt: [520, 704], organic: 0.12 },
  home: { rainGain: 0, evap: 0.004, soilBase: 0.18, decomp: 0.4, litter: false, organic: 0.08 },
  site: { rainGain: 0.045, evap: 0.013, soilBase: 0.2, decomp: 0.3, litter: false, organic: 0.03 },
  underwater: { rainGain: 0, evap: 0.002, soilBase: 0.86, decomp: 0.25, litter: false, organic: 0.08 },
  sky: { rainGain: 0, evap: 0.01, soilBase: 0.1, decomp: 0.2, litter: false, organic: 0.02 },
  burrow: { rainGain: 0.02, evap: 0.002, soilBase: 0.6, decomp: 1.6, litter: true, litterAt: [880, 806], organic: 0.44 },
  canopy: { rainGain: 0.05, evap: 0.008, soilBase: 0.34, decomp: 0.9, litter: true, litterAt: [700, 800], organic: 0.26 },
  barn: { rainGain: 0, evap: 0.003, soilBase: 0.24, decomp: 0.9, litter: true, litterAt: [286, 792], organic: 0.34 },
  wreck: { rainGain: 0, evap: 0.002, soilBase: 0.82, decomp: 0.2, litter: false, organic: 0.06 },
};

type Box = { x0: number; x1: number; y0: number; y1: number };

/**
 * 每个区域里各个物种的活动范围。
 *
 * 动物只在自己这块地里走——既不会满屏乱跑，也不会跑到树上或水里。
 * 孩子把动物拖走之后，它会用落点当新家（见 habitatFor），所以这张表
 * 只负责"出生地附近该在哪片地活动"。
 */
const HABITAT_BY_REGION: Partial<Record<RegionId, Record<string, Box>>> = {
  forest: {
    rabbit: { x0: 520, x1: 880, y0: 704, y1: 774 },
    squirrel: { x0: 360, x1: 660, y0: 668, y1: 744 },
    hedgehog: { x0: 1240, x1: 1440, y0: 726, y1: 782 },
    fox: { x0: 1300, x1: 1470, y0: 694, y1: 754 },
    deer: { x0: 170, x1: 400, y0: 690, y1: 758 },
    bird: { x0: 400, x1: 660, y0: 470, y1: 560 },
    butterfly: { x0: 700, x1: 940, y0: 620, y1: 706 },
    bee: { x0: 960, x1: 1240, y0: 580, y1: 700 },
    ladybug: { x0: 820, x1: 940, y0: 726, y1: 772 },
    caterpillar: { x0: 940, x1: 1090, y0: 742, y1: 792 },
    frog: { x0: 960, x1: 1200, y0: 776, y1: 876 },
    tadpole: { x0: 860, x1: 1000, y0: 792, y1: 844 },
    froglet: { x0: 880, x1: 1020, y0: 792, y1: 860 },
    frogspawn: { x0: 880, x1: 960, y0: 800, y1: 836 },
    fish: { x0: 1240, x1: 1440, y0: 790, y1: 840 },
    ant: { x0: 920, x1: 1070, y0: 730, y1: 792 },
  },
  /* 农场：牛马在左边草场，猪羊在中间，鸡鸭在谷仓这一头 */
  farm: {
    cow: { x0: 440, x1: 660, y0: 700, y1: 780 },
    horse: { x0: 220, x1: 420, y0: 700, y1: 776 },
    sheep: { x0: 640, x1: 820, y0: 706, y1: 790 },
    pig: { x0: 840, x1: 980, y0: 716, y1: 792 },
    hen: { x0: 960, x1: 1120, y0: 704, y1: 780 },
    chick: { x0: 1000, x1: 1120, y0: 716, y1: 786 },
    duck: { x0: 340, x1: 520, y0: 714, y1: 792 },
    cat: { x0: 1120, x1: 1320, y0: 690, y1: 760 },
    bee: { x0: 900, x1: 1180, y0: 600, y1: 706 },
    rabbit: { x0: 700, x1: 900, y0: 716, y1: 790 },
    bird: { x0: 300, x1: 520, y0: 470, y1: 600 },
  },
  /* 海边：螃蟹在沙滩上横着走，海鸥贴着海面盘旋 */
  seaside: {
    crab: { x0: 520, x1: 900, y0: 718, y1: 800 },
    gull: { x0: 520, x1: 1200, y0: 380, y1: 520 },
    starfish: { x0: 480, x1: 760, y0: 788, y1: 840 },
    fish: { x0: 1150, x1: 1420, y0: 620, y1: 690 },
    cat: { x0: 260, x1: 480, y0: 712, y1: 790 },
  },
  town: {
    cat: { x0: 1080, x1: 1300, y0: 688, y1: 748 },
    bird: { x0: 600, x1: 900, y0: 460, y1: 580 },
    butterfly: { x0: 560, x1: 800, y0: 646, y1: 706 },
    bee: { x0: 820, x1: 1040, y0: 640, y1: 706 },
    ant: { x0: 960, x1: 1100, y0: 704, y1: 748 },
  },
  home: {
    cat: { x0: 640, x1: 900, y0: 700, y1: 792 },
    ant: { x0: 1080, x1: 1220, y0: 706, y1: 760 },
  },
  site: {
    cat: { x0: 420, x1: 660, y0: 700, y1: 780 },
    ant: { x0: 860, x1: 1020, y0: 704, y1: 768 },
    bird: { x0: 700, x1: 940, y0: 470, y1: 620 },
  },
  underwater: {
    fish: { x0: 560, x1: 780, y0: 660, y1: 740 },
    fishb: { x0: 1080, x1: 1320, y0: 640, y1: 730 },
    dolphin: { x0: 860, x1: 1120, y0: 560, y1: 680 },
    turtle: { x0: 400, x1: 700, y0: 690, y1: 790 },
    octopus: { x0: 760, x1: 960, y0: 740, y1: 812 },
    jellyfish: { x0: 980, x1: 1260, y0: 540, y1: 680 },
    crab: { x0: 520, x1: 760, y0: 780, y1: 856 },
    starfish: { x0: 680, x1: 880, y0: 800, y1: 862 },
  },
  sky: {
    bird: { x0: 520, x1: 900, y0: 480, y1: 760 },
    gull: { x0: 900, x1: 1300, y0: 440, y1: 720 },
  },
  canopy: {
    bird: { x0: 460, x1: 700, y0: 690, y1: 800 },
    squirrel: { x0: 900, x1: 1180, y0: 700, y1: 812 },
    ladybug: { x0: 600, x1: 760, y0: 760, y1: 812 },
    butterfly: { x0: 760, x1: 1040, y0: 700, y1: 790 },
  },
  burrow: {
    ant: { x0: 520, x1: 720, y0: 750, y1: 812 },
    worm: { x0: 760, x1: 900, y0: 760, y1: 824 },
  },
};

/** 兼容旧引用：森林的栖息地表 */
export const HABITAT = HABITAT_BY_REGION.forest as Record<string, Box>;

/** 移动速度（设计单位 / 秒） */
const SPEED: Record<string, number> = {
  rabbit: 34, squirrel: 30, hedgehog: 16, fox: 38, deer: 40, bird: 44,
  butterfly: 30, bee: 42, ladybug: 12, caterpillar: 8, frog: 26,
  tadpole: 16, froglet: 20, fish: 26, ant: 14,
  /* 农场：大牲口走得慢，鸡最急 */
  cow: 15, horse: 34, sheep: 13, pig: 18, hen: 22, chick: 26, duck: 20, cat: 30,
  /* 海边 */
  gull: 52, crab: 20, starfish: 3,
  /* 海底 */
  fishb: 24, dolphin: 46, turtle: 12, octopus: 10, jellyfish: 8,
  /* 地下 */
  worm: 5, snail: 4,
};

/** 活动时间：白天活动 / 夜里活动 / 都行 */
const ACTIVE: Record<string, 'day' | 'night' | 'both'> = {
  bird: 'day', butterfly: 'day', bee: 'day', ladybug: 'day', gull: 'day',
  squirrel: 'day', hen: 'day', chick: 'day', duck: 'day', cow: 'day', sheep: 'day', horse: 'day', pig: 'day',
  rabbit: 'both', hedgehog: 'both', fox: 'both', deer: 'both', cat: 'both',
  frog: 'both', ant: 'both', fish: 'both', tadpole: 'both', froglet: 'both',
  crab: 'both', starfish: 'both', fishb: 'both', dolphin: 'both',
  turtle: 'both', octopus: 'both', worm: 'both', snail: 'both',
  /* 夜行的 */
  owl: 'night', jellyfish: 'night',
};

/** 地上跑的（不能穿水）；水里游的（不能上岸）；会飞的（两边都行） */
const LAND = new Set([
  'rabbit', 'squirrel', 'hedgehog', 'fox', 'deer', 'ladybug', 'caterpillar', 'ant',
  'cow', 'sheep', 'pig', 'hen', 'chick', 'duck', 'horse', 'cat', 'crab',
]);
const SWIM = new Set(['tadpole', 'fish', 'fishb', 'dolphin', 'turtle', 'octopus', 'jellyfish']);
const FLY = new Set(['bird', 'gull', 'butterfly', 'bee', 'firefly', 'owl', 'moth']);

/** 幼虫 → 成虫的链条：每一级 st 0..at-1，走完换成下一种 */
const LARVA: Record<string, { next: string; at: number }> = {
  frogspawn: { next: 'tadpole', at: 3 },
  tadpole: { next: 'froglet', at: 3 },
  froglet: { next: 'frog', at: 3 },
  caterpillar: { next: 'butterfly', at: 3 },
};

/** 遇到四季的生长系数 */
const SEASON_F: Record<string, number> = { spring: 1.3, summer: 1, autumn: 0.72, winter: 0.28 };

/** 每次 tick 最多算多少只动物 */
const MAX_AGENTS = 26;

/** 进食后的冷却（模拟秒），避免一有食物就瞬间吃光 */
const EAT_CD = 26;

/* ─────────────────────────── 小工具 ─────────────────────────── */

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/** 世界里的实体上限：超过之后不再新增（长期运行不至于越滚越大） */
export const ENTITY_CAP = 320;

function emit(eco: Eco, name: string): void {
  eco.log.push(`${name}@${Math.round(eco.t)}`);
  if (eco.log.length > 12) eco.log.splice(0, eco.log.length - 12);
}

/** 判断一个点是不是在溪里（当前区域的固定水域） */
function inWater(region: string, x: number, y: number): boolean {
  const w = WATER[region as keyof typeof WATER];
  return !!w && x >= w.x0 && x <= w.x1 && y >= w.y0 && y <= w.y1;
}

export function defaultEco(): Eco {
  return {
    t: 0, speed: 1, soil: 0.45, water: 0.5, tide: 0.5,
    organic: 0.2, wind: 0.15, rain: 0, stage: 2, eggT: 0,
    clock: 0.3, day: 1, log: [],
  };
}

/** 海边的水线（设计坐标）：平潮 700，涨潮往上抬，退潮往下退 */
export const seaShore = (tide: number): number => shoreY(tide);

/* ─────────────────────────── 主循环 ─────────────────────────── */

/**
 * 推进一次。
 *
 * @param st      当前存档（不会被修改，返回新的或原对象）
 * @param dtReal  真实经过的秒数
 */
export function stepEco(st: SaveV3, dtReal: number): SaveV3 {
  const eco = st.eco;
  if (!eco || eco.speed <= 0) return st;

  // 后台切回来时 dt 可能很大，夹住它，否则「一次跳十级」
  const dt = Math.min(2, Math.max(0, dtReal)) * eco.speed;
  if (dt <= 0) return st;

  try {
    return advance(st, dt);
  } catch {
    // 一次算错不应该让整个世界停摆
    return st;
  }
}

function advance(st: SaveV3, dt: number): SaveV3 {
  const eco: Eco = { ...st.eco, log: st.eco.log.slice() };

  /* ── 0. 世界时钟：昼夜 / 季节 / 每日天气（先推它，后面所有判断都读新的） ── */
  // 手动拨过的 phase/season/weather 也从这儿继续：时钟是唯一的驱动者，
  // 家长按钮只是把 clock/day 拨到对应位置，不用另做"手动模式"开关。
  let head: SaveV3 = st;
  {
    eco.clock = eco.clock + dt / DAY_SECONDS;
    const nextPhase = phaseAt(eco.clock);
    // 新的一天：先算好天数，再按"天数 → 季节 → 天气"的顺序更新
    if (eco.clock >= 1) {
      const whole = Math.floor(eco.clock);
      eco.clock -= whole;
      eco.day = Math.max(1, eco.day) + whole;
      const nextSeason = seasonAt(eco.day);
      const nextWeather = rollWeather(nextSeason, eco.day);
      head = { ...head, season: nextSeason, weather: nextWeather };
      emit(eco, `day_${eco.day}`);
      if (nextSeason !== st.season) emit(eco, `season_${nextSeason}`);
    } else if (nextPhase !== st.phase) {
      emit(eco, `phase_${nextPhase}`);
    }
    if (nextPhase !== st.phase) head = { ...head, phase: nextPhase };
  }

  const night = head.phase === 'night';
  const region = head.region;
  const cli = CLIMATE[region] ?? DRY;
  eco.t += dt;

  let changed = false;

  /* ── 1. 天气 → 风 / 雨 ── */
  const targetRain = head.weather === 'rain' ? 1 : head.weather === 'snow' ? 0.12 : 0;
  const targetWind = head.weather === 'wind' ? 1 : 0.18;
  const beforeRain = eco.rain;
  eco.rain = clamp(eco.rain + (targetRain - eco.rain) * Math.min(1, dt * 0.5));
  eco.wind = clamp(eco.wind + (targetWind - eco.wind) * Math.min(1, dt * 0.5));
  if (beforeRain < 0.2 && eco.rain >= 0.2) emit(eco, 'rain_started');

  /* ── 1b. 潮汐：海边独有的节律，跟天气无关 ── */
  const prevTide = eco.tide;
  // 0.5 + 0.42sin(...) 而不是 0.5sin(...)：平潮时水线正好压在沙滩中线附近，
  // 涨也涨得出去、退也退得回来，孩子看到的沙滩变化才是对称的。
  eco.tide = clamp(0.5 + 0.42 * Math.sin((eco.t / TIDE_PERIOD) * Math.PI * 2), 0.06, 0.94);
  if (prevTide < 0.5 && eco.tide >= 0.5) emit(eco, 'tide_in');
  if (prevTide >= 0.5 && eco.tide < 0.5) emit(eco, 'tide_out');
  if (Math.abs(eco.tide - prevTide) > 0.0002) changed = true;

  /* ── 2. 水循环：土壤湿度 / 水位 ── */
  const soilFloor = cli.soilBase;
  if (eco.rain > 0.05) {
    eco.soil = clamp(eco.soil + cli.rainGain * eco.rain * dt);
    if (eco.soil >= 0.6 && head.weather === 'rain') emit(eco, 'soil_wet');
  } else {
    // 晴天蒸发：越干蒸发越慢，不会一路归零
    eco.soil = clamp(eco.soil - cli.evap * dt * (0.4 + eco.soil), soilFloor, 1);
  }
  // 海底与地下没有"溪流"，水位跟着潮汐走的部分只在海边生效
  const waterTarget = region === 'underwater' ? 0.86 : 0.44 + eco.rain * 0.48;
  const prevWater = eco.water;
  eco.water = clamp(eco.water + (waterTarget - eco.water) * Math.min(1, dt * 0.22), 0.3, 1);
  if (Math.abs(eco.water - prevWater) > 0.0005) changed = true;

  // 只为**会被改到的**实体建副本：其余保持同一个引用，
  // 这样 memo 过的渲染层不会因为时钟每 0.7 秒跳一下就整场景重画。
  const ents = head.ents.map((e) => (isMutable(e.t) ? { ...e } : e));

  /* ── 3. 落叶分解 → 土壤有机质 ── */
  const decomposerCount = ents.filter((e) => e.r === region && DECOMPOSERS.has(e.t)).length;
  const decompRate = 0.016 * (0.5 + eco.soil) * (1 + decomposerCount * 0.18) * cli.decomp;
  for (let i = ents.length - 1; i >= 0; i -= 1) {
    const e = ents[i];
    if (e.t !== 'leafpile' && e.t !== 'leaf') continue;
    const amount = Math.max(1, e.st ?? 1);
    e.age = (e.age ?? 0) + decompRate * dt * (e.t === 'leaf' ? 1.6 : 1);
    if (e.age >= 1) {
      e.age = 0;
      eco.organic = clamp(eco.organic + 0.05);
      if (amount <= 1) {
        ents.splice(i, 1);
        emit(eco, 'leaf_decomposing');
        changed = true;
        continue;
      }
      e.st = amount - 1;
      emit(eco, 'leaf_decomposing');
      changed = true;
    }
  }

  /* ── 4. 落叶堆积：有树的地方，风大或秋天，树下会多出一层叶子 ── */
  if (cli.litter && cli.litterAt) {
    const litterId = `litter-${region}`;
    const pile = ents.find((e) => e.id === litterId);
    const litterRate = (head.season === 'autumn' ? 0.05 : 0.012) * (0.35 + eco.wind);
    if (!pile && eco.t > 8) {
      ents.push({
        id: litterId,
        t: 'leafpile',
        r: region,
        x: cli.litterAt[0],
        y: cli.litterAt[1],
        st: 1,
        age: 0,
        s: 1.2,
      });
      emit(eco, 'leaf_fallen');
      changed = true;
    } else if (pile && (pile.st ?? 1) < 3) {
      pile.age = (pile.age ?? 0) + litterRate * dt;
      if (pile.age >= 1) {
        pile.age = 0;
        pile.st = Math.min(3, (pile.st ?? 1) + 1);
        emit(eco, 'leaf_fallen');
        changed = true;
      }
    }
  }

  /* ── 5. 植物生命周期 ── */
  const light = night ? 0.2 : head.phase === 'dawn' || head.phase === 'sunset' ? 0.68 : 1;
  const seasonF = SEASON_F[head.season] ?? 1;
  // 没有土的地方长不动：海底/天空/工地只有"搬过去的花"能勉强维持
  const soilF = region === 'underwater' || region === 'sky' ? 0.15 : region === 'site' ? 0.6 : 1;
  for (const e of ents) {
    if (!PLANTS.has(e.t)) continue;
    const stage = e.st ?? 0;
    if (stage >= STAGE_MAX) continue;
    // 花开着但没授粉：停在这里等蜂蝶，不会自己结果
    if (stage === 4 && !e.pol) continue;

    // 湿度：土壤本身 + 刚浇过水的额外加成
    const moist = clamp(eco.soil + (e.f ? 0.3 : 0));
    // 有机质让土更肥
    const organicF = 1 + eco.organic * 0.9;
    const rate = 0.115 * light * seasonF * moist * organicF * soilF;
    if (rate <= 0.002) continue;

    e.age = (e.age ?? 0) + rate * dt;
    if (e.age < 1) {
      changed = true;
      continue;
    }
    e.age = 0;
    e.st = Math.min(STAGE_MAX, stage + 1);
    changed = true;
    if (e.st === 1) emit(eco, 'seed_germinated');
    if (e.st === 4) emit(eco, 'flower_opened');
    if (e.st === STAGE_MAX) {
      emit(eco, 'fruit_ripe');
      // 结果之后自动补一颗种子到地上（种子传播）——但地上已经有 6 颗就不再撒了
      const seedCount = ents.reduce((n, x) => n + (x.t === 'seed' ? 1 : 0), 0);
      if (seedCount < 6 && ents.length < ENTITY_CAP) {
        ents.push({
          id: `seed-${e.id}-${Math.round(eco.t)}`,
          t: 'seed',
          r: e.r,
          x: e.x + 26,
          y: e.y + 6,
          v: 1,
          s: 1.15,
        });
      }
    }
  }

  /* ── 5b. 幼虫的生命周期：多阶段、可观察、可保存 ── */
  for (const e of ents) {
    const next = LARVA[e.t];
    if (!next) continue;
    e.age = (e.age ?? 0) + 0.085 * dt;
    if (e.age < 1) {
      changed = true;
      continue;
    }
    e.age = 0;
    changed = true;
    const nst = (e.st ?? 0) + 1;
    if (nst >= next.at) {
      e.t = next.next;
      e.st = 0;
      if (next.next === 'butterfly') e.only = 'day';
      emit(eco, next.next === 'frog' ? 'frog_metamorphosis' : 'larva_grew');
    } else {
      e.st = nst;
      emit(eco, 'larva_grew');
    }
  }

  /* ── 6. 授粉：花开着又没授粉，蜂蝶在附近就补上 ── */
  const flowering = ents.filter((e) => e.r === region && PLANTS.has(e.t) && (e.st ?? 0) === 4 && !e.pol);
  if (flowering.length) {
    for (const pollinator of ents) {
      if (pollinator.r !== region) continue;
      if (pollinator.t !== 'bee' && pollinator.t !== 'butterfly') continue;
      const target = flowering.find((f) => Math.hypot(f.x - pollinator.x, f.y - pollinator.y) < 90);
      if (target) {
        target.pol = true;
        emit(eco, 'pollination');
        changed = true;
      }
    }
  }

  /* ── 6b. 农场：鸡下蛋。这是唯一一种"动物会留下东西"的因果 ── */
  if (region === 'farm') {
    // 只看当前区域：谷仓里那两个蛋不算数，否则农场永远"蛋够多了"
    const here = ents.filter((e) => e.r === region);
    const hen = here.find((e) => e.t === 'hen');
    const eggs = here.reduce((n, e) => n + (e.t === 'egg' ? 1 : 0), 0);
    if (eco.t - eco.eggT > 75) {
      if (hen && eggs < 4 && ents.length < ENTITY_CAP) {
        ents.push({
          id: `egg-${Math.round(eco.t)}-${Math.round(Math.random() * 999)}`,
          t: 'egg',
          r: 'farm',
          x: hen.x + 22,
          y: hen.y + 2,
          s: 1.05,
        });
        eco.eggT = eco.t;
        emit(eco, 'egg_laid');
        changed = true;
      } else if (eco.t - eco.eggT > 320) {
        // 蛋已经够多了：过一阵再看，别每 tick 都筛一遍
        eco.eggT = eco.t;
      }
    }
  }

  /* ── 6c. 海底：气泡自己往上飘，飘到水面就破了 ── */
  if (region === 'underwater') {
    for (let i = ents.length - 1; i >= 0; i -= 1) {
      const b = ents[i];
      if (b.t !== 'bubble') continue;
      b.y -= 22 * dt;
      changed = true;
      // 飘到接近水面才破：破得太早，海底就看不见气泡了
      if (b.y < 220) ents.splice(i, 1);
    }
    // 珊瑚脚边偶尔冒一个新的：海不是静止的
    if (
      ents.filter((e) => e.t === 'bubble').length < 3 &&
      ents.length < ENTITY_CAP &&
      Math.random() < dt * 0.12
    ) {
      const from = [462, 1242, 1082][Math.floor(Math.random() * 3)];
      ents.push({
        id: `bub-${Math.round(eco.t)}-${Math.round(Math.random() * 999)}`,
        t: 'bubble',
        r: 'underwater',
        x: from + 18,
        y: 768,
        s: 1,
      });
      changed = true;
    }
  }

  /* ── 7. 动物行为 ── */
  const animals = ents.filter((e) => e.r === region && isAgent(e.t));
  const agents = animals.slice(0, MAX_AGENTS);
  /*
   * 先看"谁怕谁"：这一步只写逃跑目标，具体怎么跑还是交给下面的行为机。
   *
   * 传**全部**动物而不是截断后的那批：这里只比距离，很便宜；
   * 而掐在 26 只上时，实体一多排在后面的狐狸就"看不见"旁边的兔子了
   * ——表现是相遇反应时有时无，且能稳定复现（森林实体超过 26 个之后）。
   */
  if (startle(animals, eco, region)) changed = true;
  for (const e of agents) {
    if (stepAnimal(e, ents, eco, head, night, dt)) changed = true;
  }

  if (!changed && Math.abs(eco.t - st.eco.t) < 0.001) return st;

  return { ...head, ents, eco };
}

/* ─────────────────────────── 动物行为 ─────────────────────────── */

const AGENTS = new Set(Object.keys(SPEED));

/** 这个类型在模拟里会不会被改（决定要不要建副本） */
function isMutable(t: string): boolean {
  return AGENTS.has(t) || PLANTS.has(t) || !!LARVA[t] || t === 'leaf' || t === 'leafpile' || t === 'bubble';
}
export const isAgent = (t: string): boolean => AGENTS.has(t);

/** 这只动物现在是不是在睡觉 */
export function isSleeping(e: Entity, night: boolean): boolean {
  if (e.act === 'sleep') return true;
  const a = ACTIVE[e.t];
  if (a === 'day' && night) return true;
  if (a === 'night' && !night) return true;
  return false;
}

/** 水里的小家伙不睡觉：夜里它们照样游，画面才有生气 */
const NO_SLEEP = new Set(['fish', 'fishb', 'tadpole', 'froglet', 'frog', 'ant', 'octopus', 'jellyfish', 'dolphin', 'turtle', 'crab', 'worm']);

/** 这只动物今晚睡不睡：白天活动的必睡，其余的约一半 */
function sleepsAtNight(e: Entity): boolean {
  const a = ACTIVE[e.t];
  if (a === 'day') return true;
  if (a === 'night') return false;
  // 用 id 算一个稳定的小整数：同一只今晚睡不睡是固定的，不会一会儿睡一会儿醒
  let v = 7;
  for (let i = 0; i < e.id.length; i += 1) v = (v * 31 + e.id.charCodeAt(i)) % 9973;
  return v % 100 < 55;
}

/** 这只动物现在该在哪片地活动 */
function habitatFor(e: Entity): Box {
  const base = HABITAT_BY_REGION[e.r]?.[e.t];
  const hx = e.hx ?? e.x;
  const hy = e.hy ?? e.y;
  // 还在自己的地盘里 → 用区域表；被孩子搬走了 → 以新家为中心
  if (base && hx >= base.x0 - 150 && hx <= base.x1 + 150 && hy >= base.y0 - 120 && hy <= base.y1 + 120) {
    return base;
  }
  return { x0: hx - 110, x1: hx + 110, y0: hy - 34, y1: hy + 34 };
}

/** 这只动物会不会飞 */
export const canFly = (t: string): boolean => FLY.has(t);

/**
 * 谁吓唬谁：捕食者 → 它一靠近就会跑开的动物。
 *
 * 注意方向：不是"谁怕谁"。写反了会很滑稽——狐狸被兔子吓得撒腿就跑，
 * 这件事真的发生过一次。
 */
const SCARES: Record<string, string[]> = {
  fox: ['rabbit', 'squirrel', 'hedgehog', 'hen', 'chick', 'duck'],
  cat: ['chick', 'hen', 'bird'],
  gull: ['crab', 'starfish'],
  octopus: ['fish', 'fishb'],
  owl: ['mouse'],
  crab: ['starfish'],
};

/** 多近算"靠近"（设计单位） */
const SCARE_RANGE = 130;
/** 逃跑持续多久（模拟秒）与跑多远 */
const FLEE_SECONDS = 4.5;
const FLEE_DIST = 200;
/** 惊过一次之后多久不会再被吓到（免得上蹿下跳） */
const FLEE_CD = 10;

/**
 * 谁被谁吓到了。
 *
 * 只在"当前区域"里算（和动物行为一致）：孩子看不见的地方不需要演。
 */
function startle(agents: Entity[], eco: Eco, region: RegionId): boolean {
  if (agents.length < 2) return false;
  let any = false;
  for (const danger of agents) {
    const scared = SCARES[danger.t];
    if (!scared) continue;

    for (const prey of agents) {
      if (!scared.includes(prey.t)) continue;
      // 正在跑的那只不要被反复重置目标，否则会在原地抖
      if ((prey.cd ?? 0) > eco.t) continue;
      /*
       * 关键是**同时看 act**：fl 现在会存进存档，光看时间的话，
       * 一次逃跑的结束时间会一直留在那儿，把这只动物锁死在"不用再怕"的状态里，
       * 之后再怎么把狐狸拖过来它都不跑（这个 bug 就是 fl 持久化之后冒出来的）。
       */
      if (prey.act === 'flee' && prey.fl !== undefined && eco.t < prey.fl) continue;
      const d = Math.hypot(prey.x - danger.x, prey.y - danger.y);
      if (d >= SCARE_RANGE) continue;

      const dx = prey.x - danger.x;
      const dy = prey.y - danger.y;
      const len = d || 1;
      // 往自己地盘的方向跑：跑出栖息地会撞到别人的地盘，看起来像穿帮
      const area = HABITAT_BY_REGION[region]?.[prey.t] ?? { x0: 150, x1: 1450, y0: 640, y1: 790 };
      prey.tx = clamp(prey.x + (dx / len) * FLEE_DIST, area.x0, area.x1);
      prey.ty = clamp(prey.y + (dy / len) * FLEE_DIST * 0.4, area.y0, area.y1);
      prey.fl = eco.t + FLEE_SECONDS;
      prey.cd = eco.t + FLEE_CD;
      prey.act = 'flee';
      emit(eco, `startled_${prey.t}`);
      any = true;
    }
  }
  return any;
}

function stepAnimal(e: Entity, ents: Entity[], eco: Eco, st: SaveV3, night: boolean, dt: number): boolean {
  // 被 `only` 门控挡住的（夜里不出现的蝴蝶）不参与
  if (e.only === 'day' && night) {
    if (e.act !== 'sleep') {
      e.act = 'sleep';
      return true;
    }
    return false;
  }
  if (e.only === 'night' && !night) {
    if (e.act !== 'rest') {
      e.act = 'rest';
      return true;
    }
    return false;
  }
  // 下雪天昆虫不活动
  if (FLY.has(e.t) && st.weather === 'snow' && e.t !== 'owl') {
    if (e.act !== 'rest') {
      e.act = 'rest';
      return true;
    }
    return false;
  }
  // 下雨才出现的（蜗牛）：不下雨时它在世界数据里，但不该继续走
  if (e.only === 'rain' && st.weather !== 'rain') return false;

  // 住所：出生点。第一次模拟时记下来
  if (e.hx === undefined || e.hy === undefined) {
    e.hx = e.x;
    e.hy = e.y;
  }

  /**
   * 刚被吓到：只顾着往远处跑，不管饿不饿、也不回家。
   * 放在"找吃的"之前——被狐狸追的时候还去捡松果，孩子会觉得这兔子傻。
   */
  if (e.fl !== undefined && eco.t < e.fl && e.tx !== undefined && e.ty !== undefined) {
    e.act = 'flee';
    if (moveTo(e, e.tx, e.ty, (SPEED[e.t] ?? 18) * 1.45, dt)) return true;
    // 跑到了就站住喘气，别在山洞里来回折返
    return false;
  }

  if (isSleeping(e, night)) {
    if (e.act !== 'sleep') {
      e.act = 'sleep';
      return true;
    }
    return false;
  }

  // 夜里：白天活动的全睡，其余的抽一半睡（同一只每次结果一样，不会闪）
  if (night && !NO_SLEEP.has(e.t) && sleepsAtNight(e)) {
    if (e.act !== 'sleep') {
      e.act = 'sleep';
      return true;
    }
    return false;
  }

  const hab = habitatFor(e);
  const speed = SPEED[e.t] ?? 18;
  const diet = DIET[e.t] ?? [];

  /* 抱着东西 → 先回家放下 */
  if (e.car) {
    e.act = 'home';
    if (moveTo(e, e.hx, e.hy, speed * 0.9, dt)) {
      // 到家：把东西放下（存在树洞里）
      const carried = e.car;
      e.car = undefined;
      e.act = 'idle';
      ents.push({
        id: `stored-${e.id}-${Math.round(eco.t)}`,
        t: carried,
        r: e.r,
        x: e.x + 18,
        y: e.y + 2,
        s: 1.15,
        f: true,
        fixed: true,
      });
      emit(eco, 'animal_returned_home');
    }
    return true;
  }

  /* 饿了就找吃的（有冷却，不会一有食物就扑上去） */
  const hungry = eco.t >= (e.cd ?? 0);
  if (hungry && diet.length) {
    const food = nearestFood(e, ents, diet, e.r);
    if (food) {
      e.act = 'seek';
      const d = Math.hypot(food.x - e.x, food.y - e.y);
      if (d > 26) {
        moveTo(e, food.x, food.y, speed, dt);
        return true;
      }
      // 够到了
      const idx = ents.findIndex((n) => n.id === food.id);
      if (idx >= 0) ents.splice(idx, 1);
      e.cd = eco.t + EAT_CD;
      emit(eco, 'animal_found_food');
      if (e.t === 'squirrel' || e.t === 'ant') {
        e.car = food.t; // 松鼠与蚂蚁是「搬走」，不是当场吃掉
        e.act = 'home';
      } else {
        e.act = 'eat';
        e.f = true;
      }
      return true;
    }
  }

  /* 没事做：在自己的地盘里慢慢逛 */
  if (e.tx === undefined || e.ty === undefined || Math.hypot(e.tx - e.x, e.ty - e.y) < 12) {
    const r = pseudo(e.id, Math.round(eco.t * 7));
    e.tx = hab.x0 + (hab.x1 - hab.x0) * ((r % 1000) / 1000);
    e.ty = hab.y0 + (hab.y1 - hab.y0) * (((r >> 10) % 1000) / 1000);
    e.act = 'explore';
    return true;
  }

  e.act = 'explore';
  // 夜里走得慢：不是"瞬间移动到另一头"，而是慢慢挪
  const moved = moveTo(e, e.tx, e.ty, speed * (night ? 0.45 : 1), dt);
  return moved;
}

/** 朝目标走一步；到了返回 true */
function moveTo(e: Entity, tx: number, ty: number, speed: number, dt: number): boolean {
  const dx = tx - e.x;
  const dy = ty - e.y;
  const d = Math.hypot(dx, dy);
  if (d < 3) return true;
  const step = Math.min(d, speed * dt);
  let nx = e.x + (dx / d) * step;
  let ny = e.y + (dy / d) * step;

  if (FLY.has(e.t)) {
    // 会飞的不受水面限制，但也别飞出屏幕
    nx = Math.min(1560, Math.max(40, nx));
    ny = Math.min(860, Math.max(200, ny));
  } else if (LAND.has(e.t)) {
    // 地面动物不下水
    if (!inWater(e.r, e.x, e.y) && inWater(e.r, nx, ny)) ny = e.y;
  } else if (SWIM.has(e.t)) {
    // 水生动物不上岸
    if (!inWater(e.r, nx, ny)) {
      nx = e.x;
      ny = e.y;
    }
  }

  e.x = nx;
  e.y = ny;
  return false;
}

function nearestFood(e: Entity, ents: Entity[], diet: string[], region: string): Entity | null {
  let best: Entity | null = null;
  let bd = 420;
  for (const o of ents) {
    if (o.r !== region || o.id === e.id) continue;
    if (!diet.includes(o.t)) continue;
    const d = Math.hypot(o.x - e.x, o.y - e.y);
    if (d < bd) {
      bd = d;
      best = o;
    }
  }
  return best;
}

/** 稳定伪随机：同一个 id 每次拿到同一串数，画面不会抽搐 */
function pseudo(id: string, salt: number): number {
  let h = salt * 2654435761;
  for (let i = 0; i < id.length; i += 1) h = (h ^ id.charCodeAt(i)) * 16777619;
  return Math.abs(h | 0);
}

/* ─────────────────────── 给 store 用的动作 ─────────────────────── */

/** 往事件流里记一条（孩子操作触发的事件） */
export function logEvent(eco: Eco, name: string): Eco {
  const next: Eco = { ...eco, log: eco.log.slice() };
  emit(next, name);
  return next;
}

/** 浇水：立刻提升土壤湿度（孩子能看见的即时反馈） */
export function waterSoil(eco: Eco, amount = 0.22): Eco {
  return logEvent({ ...eco, soil: clamp(eco.soil + amount) }, 'soil_wet');
}
