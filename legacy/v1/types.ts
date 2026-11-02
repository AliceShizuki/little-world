/**
 * 全局共享类型定义
 */

/** 天气：晴天 / 雨天 */
export type Weather = 'clear' | 'rain';

/** 昼夜：白天 / 夜晚 */
export type TimeOfDay = 'day' | 'night';

/** 屏幕方向下的构图模式 */
export type Composition = 'wide' | 'tall';

/** 单位坐标系中的点（viewBox 坐标） */
export interface Vec {
  x: number;
  y: number;
}

/** 归一化坐标：fx 为 viewBox 宽度比例，fy 为 viewBox 高度比例。用于存档，保证不同屏幕下位置一致 */
export interface NVec {
  fx: number;
  fy: number;
}

/** 植物生长阶段：0 土坑 1 幼芽 2 小苗 3 开花 */
export type PlantStage = 0 | 1 | 2 | 3;

export interface Plant {
  id: string;
  fx: number;
  fy: number;
  stage: PlantStage;
  watered: boolean;
  /** 花朵颜色 */
  color: 'pink' | 'yellow' | 'purple';
}

/** 需要持久化的世界状态 */
export interface WorldState {
  version: number;
  weather: Weather;
  timeOfDay: TimeOfDay;
  doorOpen: boolean;
  windowLit: boolean;
  soundOn: boolean;
  volume: number;
  plants: Plant[];
  clouds: { a: NVec; b: NVec };
  boat: NVec;
  /** 未种下的种子位置，null 表示当前没有可拖动的种子 */
  seed: NVec | null;
  /** 被小兔子吃掉的胡萝卜数量（仅用于重置与统计） */
  treatsEaten: number;
}
