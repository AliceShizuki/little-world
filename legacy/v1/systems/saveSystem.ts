/**
 * 存档系统
 * 负责 localStorage 读写、数据校验与安全回退。
 * 任何损坏的数据都必须安全降级为默认值，绝不能让页面打不开。
 */

import type { NVec, Plant, WorldState } from '../types';

const KEY = 'little-world.save.v1';
export const SAVE_VERSION = 1;

export const DEFAULT_STATE: WorldState = {
  version: SAVE_VERSION,
  weather: 'clear',
  timeOfDay: 'day',
  doorOpen: false,
  windowLit: false,
  soundOn: true,
  volume: 0.6,
  plants: [],
  clouds: { a: { fx: 0.23, fy: 0.14 }, b: { fx: 0.6, fy: 0.07 } },
  boat: { fx: 0.26, fy: 0.72 },
  seed: { fx: 0.44, fy: 0.75 },
  treatsEaten: 0,
};

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';

function readNVec(v: unknown, fallback: NVec): NVec {
  if (!v || typeof v !== 'object') return fallback;
  const o = v as Record<string, unknown>;
  if (!isNum(o.fx) || !isNum(o.fy)) return fallback;
  return {
    fx: Math.min(1.05, Math.max(-0.05, o.fx)),
    fy: Math.min(1.05, Math.max(-0.05, o.fy)),
  };
}

function readPlants(v: unknown): Plant[] {
  if (!Array.isArray(v)) return [];
  const colors: Plant['color'][] = ['pink', 'yellow', 'purple'];
  return v
    .filter((item) => item && typeof item === 'object')
    .slice(0, 8)
    .map((item, i) => {
      const o = item as Record<string, unknown>;
      const stage = isNum(o.stage) ? Math.min(3, Math.max(0, Math.round(o.stage))) : 0;
      return {
        id: typeof o.id === 'string' ? o.id : `plant-${i}`,
        fx: isNum(o.fx) ? Math.min(1, Math.max(0, o.fx)) : 0.4,
        fy: isNum(o.fy) ? Math.min(1, Math.max(0, o.fy)) : 0.5,
        stage: stage as Plant['stage'],
        watered: isBool(o.watered) ? o.watered : stage > 0,
        color: colors.includes(o.color as Plant['color']) ? (o.color as Plant['color']) : 'pink',
      };
    });
}

/** 读取存档（永不抛出异常） */
export function loadState(): WorldState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredCloneSafe(DEFAULT_STATE);
    const data = JSON.parse(raw) as Record<string, unknown>;
    if (!data || typeof data !== 'object') return structuredCloneSafe(DEFAULT_STATE);

    const clouds = (data.clouds ?? {}) as Record<string, unknown>;
    const state: WorldState = {
      version: SAVE_VERSION,
      weather: data.weather === 'rain' ? 'rain' : 'clear',
      timeOfDay: data.timeOfDay === 'night' ? 'night' : 'day',
      doorOpen: isBool(data.doorOpen) ? data.doorOpen : false,
      windowLit: isBool(data.windowLit) ? data.windowLit : false,
      soundOn: isBool(data.soundOn) ? data.soundOn : true,
      volume: isNum(data.volume) ? Math.min(1, Math.max(0, data.volume)) : 0.6,
      plants: readPlants(data.plants),
      clouds: {
        a: readNVec(clouds.a, DEFAULT_STATE.clouds.a),
        b: readNVec(clouds.b, DEFAULT_STATE.clouds.b),
      },
      boat: readNVec(data.boat, DEFAULT_STATE.boat),
      seed: data.seed === null ? null : readNVec(data.seed, DEFAULT_STATE.seed ?? { fx: 0.44, fy: 0.75 }),
      treatsEaten: isNum(data.treatsEaten) ? Math.max(0, Math.round(data.treatsEaten)) : 0,
    };
    return state;
  } catch {
    return structuredCloneSafe(DEFAULT_STATE);
  }
}

/** 写入存档（失败时静默降级，例如隐私模式下 localStorage 不可用） */
export function saveState(state: WorldState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* 忽略：隐私模式 / 容量不足 */
  }
}

export function hasSave(): boolean {
  try {
    return localStorage.getItem(KEY) !== null;
  } catch {
    return false;
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 忽略 */
  }
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
