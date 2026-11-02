/**
 * Little World V3 核心类型
 *
 * 设计要点：
 *  - 一切可交互物都是 Entity（统一搬运 / 统一存档 / 统一组合），
 *    场景里不可动的装饰（山、树、房子）直接画在区域组件里，不进入 Entity。
 *  - Entity 只存"变化的部分"，长什么样由 Sprite 注册表按 t（类型）决定。
 *  - 坐标是 1600×900 的设计空间，x 为底部中心、y 为底部基线。
 */

export type RegionId =
  | 'forest'
  | 'farm'
  | 'seaside'
  | 'town'
  | 'home'
  | 'site'
  | 'underwater'
  | 'sky'
  /* 森林的两个"里层"空间：从森林里点洞口进去，不是地图上的一站 */
  | 'burrow'
  | 'canopy'
  /* 其余区域的里层：谷仓（从农场进去）、沉船（从海底游进去） */
  | 'barn'
  | 'wreck';

/** 天气：晴 / 阴 / 雨 / 雪 / 大风 */
export type Weather = 'clear' | 'cloudy' | 'rain' | 'snow' | 'wind';

/** 时段：日出 / 白天 / 日落 / 夜晚 */
export type Phase = 'dawn' | 'day' | 'sunset' | 'night';

/** 季节（影响植被颜色与落叶/积雪） */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface Entity {
  id: string;
  /** 精灵类型 key（见 sprites/registry） */
  t: string;
  /** 所属区域 */
  r: RegionId;
  x: number;
  y: number;
  /** 缩放，默认 1 */
  s?: number;
  /** 层叠顺序，越大越靠前 */
  z?: number;
  /** 旋转角度 */
  rot?: number;
  /** 生长阶段：植物 0..5（土坑/芽/幼苗/成株/开花/结果），幼虫 0..2 */
  st?: number;
  /** 生长累积（0..1，满 1 进一级）。用浮点而不是直接改 st，才不会一跳一级 */
  age?: number;
  /** 当前行为（动物）：idle / explore / seek / eat / home / sleep */
  act?: string;
  /** 移动目标（动物） */
  tx?: number;
  ty?: number;
  /** 住所（动物）。从图纸生成时就是出生点，被孩子拖动后不再变 */
  hx?: number;
  hy?: number;
  /** 抱着的东西（松鼠抱着松果） */
  car?: string;
  /** 已授粉（花） */
  pol?: boolean;
  /** 下次可以再找吃的的模拟时间（进食冷却） */
  cd?: number;
  /**
   * 惊走的截止模拟时间：这段时间内它只顾着往远处跑，不管饿不饿。
   * 狐狸走近兔子、猫走近小鸡时会写这个值。
   */
  fl?: number;
  /** 浇水 / 装满 / 已使用等布尔标记 */
  f?: boolean;
  /** 变体（颜色 / 造型） */
  v?: number;
  /** 固定物体：可点击但不可拖动 */
  fixed?: boolean;
  /** 成熟后掉落的产物类型 */
  out?: string;
  /** 容器里的东西 */
  in?: string;
  /** 隐藏标记（尚未被发现） */
  hidden?: boolean;
  /**
   * 只在特定天气 / 时段出现。
   * 未渲染的实体不参与命中测试、不参与物理承托，也不该被拖到。
   */
  only?: 'night' | 'day' | 'rain' | 'snow';
}

/** 判断一个实体在当前环境里是否可见 */
export interface Env {
  night: boolean;
  weather: Weather;
  season: Season;
}

export function isVisible(e: Entity, env: Env): boolean {
  if (!e.only) return true;
  switch (e.only) {
    case 'night':
      return env.night;
    case 'day':
      return !env.night;
    case 'rain':
      return env.weather === 'rain';
    case 'snow':
      return env.weather === 'snow';
    default:
      return true;
  }
}

/**
 * 森林的世界状态
 *
 * 这是"世界自己在变"的那一半：所有对象都读同一份，不再各自维护环境。
 * 全部是 0..1 的归一化量，方便写阈值，也方便存档校验。
 */
export interface Eco {
  /** 模拟时间（秒，从世界诞生起累计） */
  t: number;
  /** 时间倍率：0 暂停，1 常速，2 / 4 快进 */
  speed: number;
  /** 土壤湿度 0..1 */
  soil: number;
  /** 溪流水位 0..1（0.5 是常水位） */
  water: number;
  /**
   * 潮位 0..1（0.5 是平潮）。
   * 只对海边有意义：海滩的水线跟着它上下走，涨潮时沙滩窄、退潮时露出潮池。
   * 与 water 分开是因为溪流和海水不会同时出现在一个区域里，
   * 但一个孩子可能刚看完森林的小溪就去了海边，混用会让他看见"溪水把海推走了"。
   */
  tide: number;
  /** 土壤有机质 0..1（落叶分解出来的） */
  organic: number;
  /** 风力 0..1 */
  wind: number;
  /** 降雨强度 0..1 */
  rain: number;
  /** 解锁批次：1 = 只开了开场的一小批，2 = 全开 */
  stage: number;
  /** 农场上一次下蛋的模拟时间（鸡是这个世界里唯一会"产出"的动物） */
  eggT: number;
  /**
   * 一天里的进度 0..1（0 = 清晨。常速 120 秒走完一整天，倍速按 speed 加快）。
   * 时段（日出/白天/日落/夜晚）完全由它决定——st.phase 只是缓存。
   */
  clock: number;
  /** 第几天（从 1 开始数）。每过 4 个昼夜季节往下一季 */
  day: number;
  /** 最近发生的事件（只留最后 12 条，给家长面板与测试看） */
  log: string[];
}

/** 存档结构（版本化） */
export interface SaveV3 {
  v: 3;
  weather: Weather;
  phase: Phase;
  season: Season;
  region: RegionId;
  sound: boolean;
  vol: number;
  /** 全部区域的实体 */
  ents: Entity[];
  /** 已发现的秘密 id（不展示数量，只用于去重） */
  secrets: string[];
  /** 随身篮子里携带的物品（跨区域，最多 5 件） */
  bag: string[];
  /** 内容版本：比当前低就补注入新增的"只在特定天气出现"的实体 */
  seedRev: number;
  /**
   * 最后一次存档的墙上时间（毫秒）。只用来判断"孩子离开多久了"——
   * 隔一阵再回来，世界会在他离开的地方留一点痕迹。
   */
  lastSeen?: number;
  /** 森林的世界状态（模拟时间 / 湿度 / 水位 / 有机质 / 批次） */
  eco: Eco;
}

/** 相机视野（设计空间中的可见矩形） */
export interface View {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const DESIGN_W = 1600;
export const DESIGN_H = 900;
/** 地平线在设计空间中的高度 */
export const HORIZON = 560;

/**
 * 由屏幕尺寸推导相机。
 *
 * 规则：优先保证"横向看到足够宽"，最小 900 单位（保证手机上物体可点），
 * 最大 1600 单位（桌面端正好看完整场景）。
 * 竖向多出来的空间不做黑边，而是让天空与地面自然延伸——
 * 这正是绘本横开本竖屏摆放时该有的样子。
 */
export function cameraFor(vw: number, vh: number, focusX: number, focusY = HORIZON): View {
  const aspect = vw / Math.max(vh, 1);
  const w = Math.min(DESIGN_W, Math.max(900, vw / 0.46));
  const h = w / aspect;
  // 相机中心：横向跟随区域焦点，纵向让地平线稳定在视野 58% 处
  const cx = Math.min(DESIGN_W - w / 2, Math.max(w / 2, focusX));
  const cy = focusY - h * 0.08;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** 区域元数据 */
export interface RegionMeta {
  id: RegionId;
  name: string;
  /** 一句话的诗意描述，仅家长设置里显示 */
  tagline: string;
  /** 手机端相机中心 x */
  focusX: number;
  /** 环境声 */
  ambience: 'forest' | 'farm' | 'sea' | 'town' | 'site' | 'water' | 'air';
  /** 主色，用于地图节点与切换过渡 */
  accent: string;
  /** 地面基线（实体默认落点） */
  groundY: number;
  /**
   * 上层区域：不是地图上的一站，而是从别的区域"进去"的空间（地下、树上）。
   * 有 parent 的区域，界面会多一个"回到××"的入口，地图里不出现。
   */
  parent?: RegionId;
}
