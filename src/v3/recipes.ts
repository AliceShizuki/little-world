/**
 * 物品组合规则
 *
 * 纯数据表。孩子把 A 拖到 B 上，就查一次表；查不到没有任何惩罚，
 * 物体会安静地留在原地——这比弹一个"不能这样组合"的提示友好得多。
 */

import type { RegionId } from './types';

export interface Recipe {
  a: string;
  b: string;
  out: string;
  /** 产物数量 */
  n?: number;
  /** 产物是否继承 b 的位置 */
  onB?: boolean;
  /** 保留 b（容器类） */
  keepB?: boolean;
  /** 保留 a（工具类） */
  keepA?: boolean;
  /** 产物携带的阶段 */
  st?: number;
  /** 在目标原有阶段上加几级（鸟巢添树枝这种，越加越满） */
  stAdd?: number;
  v?: number;
  /** 组合时播放的音效 */
  sfx?: 'bloom' | 'water' | 'pop' | 'stone' | 'sparkle' | 'eat' | 'plant' | 'leaf' | 'whoosh';
}

/** 台面 / 站点：不渲染成物体，但拖到上面可以发生事情 */
export interface Station {
  key: string;
  r: RegionId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export const STATIONS: Station[] = [
  { key: 'home:oven', r: 'home', x: 1240, y: 640, w: 150, h: 80 },
  { key: 'town:bakery', r: 'town', x: 470, y: 620, w: 160, h: 90 },
  { key: 'farm:soil', r: 'farm', x: 560, y: 686, w: 420, h: 90 },
  { key: 'site:bench', r: 'site', x: 700, y: 676, w: 620, h: 80 },
  { key: 'sky:cloud', r: 'sky', x: 540, y: 690, w: 240, h: 120 },
  /* 森林：那块松软的泥土地，种子拖上去就是种下了 */
  { key: 'forest:dirt', r: 'forest', x: 782, y: 726, w: 130, h: 64 },
  /* 其余区域的"台面"：邮筒、书架、潮池 */
  { key: 'town:post', r: 'town', x: 960, y: 700, w: 62, h: 86 },
  { key: 'home:shelf', r: 'home', x: 960, y: 690, w: 190, h: 116 },
  { key: 'seaside:pool', r: 'seaside', x: 760, y: 772, w: 150, h: 62 },
];

export const RECIPES: Recipe[] = [
  // 烘焙线
  { a: 'flour', b: 'can', out: 'dough', onB: true, keepB: true, sfx: 'water' },
  { a: 'dough', b: 'home:oven', out: 'bread', sfx: 'pop' },
  { a: 'dough', b: 'town:bakery', out: 'bread', sfx: 'pop' },
  { a: 'bread', b: 'knife', out: 'bread', onB: true, keepB: true, v: 1, sfx: 'pop' },

  // 木工线
  { a: 'log', b: 'knife', out: 'plank', n: 2, sfx: 'stone' },
  { a: 'plank', b: 'plank', out: 'bridge', sfx: 'stone' },
  { a: 'wheat', b: 'knife', out: 'flour', sfx: 'leaf' },

  // 建造：两块积木叠起来会变高
  { a: 'block', b: 'block', out: 'block', onB: true, st: 3, sfx: 'stone' },
  { a: 'brick', b: 'brick', out: 'brick', onB: true, st: 3, sfx: 'stone' },

  // 创作线
  { a: 'paint', b: 'canvas', out: 'canvas', onB: true, keepB: true, v: 2, sfx: 'sparkle' },
  { a: 'letter', b: 'letter', out: 'plane', sfx: 'sparkle' },
  { a: 'canvas', b: 'shell', out: 'canvas', onB: true, keepB: true, v: 3, sfx: 'sparkle' },

  // 食物线
  { a: 'apple', b: 'knife', out: 'appleslice', sfx: 'pop' },
  { a: 'tomato', b: 'knife', out: 'appleslice', sfx: 'pop' },
  { a: 'egg', b: 'home:oven', out: 'bread', sfx: 'pop' },

  // 海边
  { a: 'shell', b: 'sandpile', out: 'sandcastle', sfx: 'stone' },
  { a: 'sandpile', b: 'bucket', out: 'sandcastle', onB: true, keepB: true, sfx: 'stone' },
  { a: 'starfish', b: 'sandpile', out: 'sandcastle', onB: true, sfx: 'stone' },

  // 森林线
  { a: 'seed', b: 'forest:dirt', out: 'plant', st: 0, sfx: 'plant' },
  { a: 'flower', b: 'vase', out: 'vase', onB: true, st: 1, sfx: 'bloom' },
  { a: 'twig', b: 'nest', out: 'nest', onB: true, stAdd: 1, sfx: 'leaf' },
  { a: 'mushroom', b: 'basket', out: 'basket', onB: true, v: 1, sfx: 'pop' },
  { a: 'apple', b: 'basket', out: 'basket', onB: true, v: 2, sfx: 'pop' },
  { a: 'twig', b: 'firepit', out: 'campfire', onB: true, sfx: 'leaf' },
  { a: 'twig', b: 'twig', out: 'leafpile', sfx: 'leaf' },
  { a: 'flower', b: 'flower', out: 'flower', onB: true, v: 1, sfx: 'bloom' },
  { a: 'pinecone', b: 'basket', out: 'basket', onB: true, v: 2, sfx: 'pop' },
  { a: 'berry', b: 'basket', out: 'basket', onB: true, v: 1, sfx: 'pop' },

  // 自然线
  { a: 'acorn', b: 'seed', out: 'plant', sfx: 'plant' },
  { a: 'mushroom', b: 'mushroom', out: 'mushroom', onB: true, v: 1, sfx: 'pop' },
  { a: 'apple', b: 'can', out: 'apple', onB: true, keepB: true, v: 1, sfx: 'water' },

  /* ───────── 农场：作物 → 种子 / 食材，形成"种下去再收回来"的闭环 ───────── */
  { a: 'corn', b: 'knife', out: 'corn_cob', sfx: 'leaf' },
  { a: 'corn', b: 'farm:soil', out: 'corn', st: 1, sfx: 'plant' },
  { a: 'wheat', b: 'farm:soil', out: 'wheat', st: 1, sfx: 'plant' },
  { a: 'pumpkin', b: 'farm:soil', out: 'pumpkin', st: 1, sfx: 'plant' },
  { a: 'tomato', b: 'farm:soil', out: 'tomato', st: 1, sfx: 'plant' },
  { a: 'pumpkin', b: 'knife', out: 'appleslice', v: 1, sfx: 'pop' },
  { a: 'hay', b: 'bucket', out: 'hay', onB: true, v: 1, keepB: true, sfx: 'leaf' },
  { a: 'egg', b: 'hay', out: 'egg', onB: true, v: 1, sfx: 'pop' },

  /* ───────── 海边：贝壳、沙、船 ───────── */
  { a: 'starfish', b: 'bucket', out: 'bucket', onB: true, keepB: true, v: 1, sfx: 'water' },
  { a: 'shell', b: 'seaside:pool', out: 'shell', v: 1, sfx: 'water' },
  { a: 'boat', b: 'shell', out: 'boat', onB: true, keepB: true, v: 1, sfx: 'pop' },
  { a: 'sandpile', b: 'seaside:pool', out: 'sandcastle', sfx: 'stone' },

  /* ───────── 小镇：寄信、挂气球 ───────── */
  { a: 'letter', b: 'town:post', out: 'letter', v: 1, sfx: 'pop' },
  { a: 'letter', b: 'balloon', out: 'balloon', onB: true, keepB: true, v: 1, sfx: 'whoosh' },
  { a: 'ball', b: 'bike', out: 'ball', onB: true, v: 1, sfx: 'pop' },

  /* ───────── 小屋：上架、上床 ───────── */
  { a: 'letter', b: 'home:shelf', out: 'letter', v: 1, sfx: 'leaf' },
  { a: 'flower', b: 'home:shelf', out: 'flower', st: 1, sfx: 'bloom' },
  { a: 'toy', b: 'bed', out: 'toy', onB: true, keepB: true, v: 1, sfx: 'pop' },

  /* ───────── 工地：把材料架起来 ───────── */
  { a: 'plank', b: 'block', out: 'plank', onB: true, keepB: true, sfx: 'stone' },
  { a: 'brick', b: 'block', out: 'brick', onB: true, st: 2, sfx: 'stone' },
  { a: 'sandpile', b: 'block', out: 'sandpile', onB: true, keepB: true, sfx: 'stone' },

  /* ───────── 海底：贝壳与珊瑚 ───────── */
  { a: 'shell', b: 'coral', out: 'shell', onB: true, keepB: true, v: 1, sfx: 'pop' },
  { a: 'bubble', b: 'shell', out: 'bubble', v: 1, sfx: 'water' },

  /* ───────── 天空：给风筝挂点东西 ───────── */
  { a: 'kite', b: 'clouditem', out: 'kite', onB: true, keepB: true, v: 1, sfx: 'whoosh' },
  { a: 'balloon', b: 'clouditem', out: 'clouditem', onB: true, keepB: true, v: 1, sfx: 'whoosh' },
];

/** 允许直接种进土里的东西 */
export const PLANTABLE = new Set(['seed', 'berry', 'corn', 'wheat', 'pumpkin', 'tomato', 'carrot']);

/** 会吃东西的动物与它爱吃的 */
export const DIET: Record<string, string[]> = {
  rabbit: ['apple', 'carrot', 'berry', 'appleslice'],
  squirrel: ['pinecone', 'acorn', 'berry'],
  ant: ['apple', 'bread', 'berry', 'mushroom', 'leaf', 'pinecone'],
  hedgehog: ['apple', 'mushroom', 'berry'],
  fox: ['appleslice', 'bread'],
  deer: ['apple', 'berry'],
  cow: ['wheat'],
  sheep: ['wheat'],
  pig: ['apple', 'pumpkin'],
  hen: ['wheat', 'corn_cob'],
  chick: ['wheat'],
  duck: ['wheat', 'bread'],
  horse: ['apple', 'wheat'],
  bird: ['berry', 'acorn'],
  cat: ['bread'],
  crab: ['shell'],
  fish: ['shell'],
  fishb: ['shell'],
  turtle: ['seaweed'],
  octopus: ['shell'],
  dolphin: ['fish'],
};

/** 会被水浇醒 / 长大的东西 */
export const DRINKERS = new Set(['plant', 'flower', 'corn', 'wheat', 'pumpkin', 'tomato', 'fern', 'seed']);

export function findRecipe(a: string, b: string): Recipe | null {
  return RECIPES.find((r) => r.a === a && r.b === b) ?? null;
}

export function stationAt(region: RegionId, x: number, y: number): Station | null {
  return (
    STATIONS.find((s) => s.r === region && x >= s.x - s.w / 2 && x <= s.x + s.w / 2 && y >= s.y - s.h && y <= s.y + s.h) ??
    null
  );
}
