/**
 * 场景热区
 *
 * 树、灌木、树桩、泥地、礁石、书架这些东西是画在 scene 里的（不进 Entity——
 * 它们不可拖动、也不能被搬走），但孩子必须能点到它们。所以单独一张表：
 * 不可见的椭圆热区，点下去触发对应的反应。
 *
 * 关键约束：热区必须渲染在实体**之前**，否则会挡住实体的点击。
 *
 * 九个区域各有自己的"能点的地方"。反应本身不是逐个写 if，
 * 而是按 kind 查一次表（见 store.decor）：同一个 kind 在不同区域
 * 会掉出不同的东西，因为掉落物写在各自的格子裡。
 */

import type { RegionId } from './types';

export type HotspotKind =
  | 'tree'
  | 'bush'
  | 'stump'
  | 'soil'
  | 'web'
  | 'rock'
  | 'sand'
  | 'hay'
  | 'door'
  | 'metal'
  | 'soft'
  | 'cloud'
  | 'water'
  | 'lamp'
  | 'chime';

export interface Hotspot {
  id: string;
  r: RegionId;
  /** 椭圆中心（设计坐标） */
  x: number;
  y: number;
  rx: number;
  ry: number;
  kind: HotspotKind;
  /** 摇树时可能掉下来的东西 */
  drops?: string[];
  /** 掉落物落地的 y（默认取区域地面） */
  gy?: number;
  /** 点一下有可能会冒出来的东西（p = 概率） */
  spawn?: Array<{ t: string; p: number }>;
  /** 只在特定潮位出现（海边用）：low 退潮露出来，high 涨潮才够得着 */
  tide?: 'low' | 'high';
  /** 点一下就进另一个空间（谷仓、沉船这类里层） */
  to?: RegionId;
  /** 会唱歌的东西：音高序号 0..4（五声音阶，见 audio.playNote） */
  note?: number;
}

/**
 * 会唱歌的一排东西。
 *
 * 五块石头 / 五个玻璃瓶 / 五枚贝壳，从低到高是 do re mi sol la。
 * 存在的理由：孩子在这之前所有的反馈都是"看得见"的，这是唯一一处"听得见"的因果。
 * 第一天乱敲，第二天开始按顺序敲，第三天会敲出自己的一段。
 *
 * 画面由各 scene 按这份数据画（`CHIMES`），热区由下面 `CHIME_HOTSPOTS` 生成，
 * 两边读同一份坐标，不会出现"画在这、点在别处"。
 */
export interface ChimeSet {
  id: string;
  r: RegionId;
  /** 第一块的 x，后面每块 +gap */
  x: number;
  y: number;
  gap: number;
  /** 每块的半径（画面与命中区都按它放大） */
  size: number;
  look: 'stone' | 'bottle' | 'shell';
}

export const CHIMES: ChimeSet[] = [
  // 森林：水潭边一排垫脚石（避开兔子洞 352,754、树桩、泥地与掉在地上的松果）
  // 森林：溪流下游的前景带（水里那一段被蝌蚪、蛙卵、蚁丘轮流占着，点了响不了）
  { id: 'chime-stone', r: 'forest', x: 860, y: 866, gap: 36, size: 16, look: 'stone' },
  // 海边：沙滩上一排被冲上来的贝壳（码头下方的空地）
  { id: 'chime-shell', r: 'seaside', x: 190, y: 752, gap: 42, size: 15, look: 'shell' },
  // 沉船：船舱角落一排旧玻璃瓶
  { id: 'chime-bottle', r: 'wreck', x: 470, y: 806, gap: 40, size: 13, look: 'bottle' },
];

/** 每组的音高个数（五声音阶五个音） */
export const CHIME_NOTES = 5;

/** 某个区域的那排会响的东西（没有就 undefined，scene 里据此决定画不画） */
export const chimeFor = (r: RegionId) => CHIMES.find((c) => c.r === r);

/** 由 CHIMES 生成的热区：坐标只写一份，画面与命中不会错位 */
const CHIME_HOTSPOTS: Hotspot[] = CHIMES.flatMap((c) =>
  Array.from({ length: CHIME_NOTES }, (_, i) => ({
    id: `hs-${c.id}-${i}`,
    r: c.r,
    x: c.x + i * c.gap,
    y: c.y - c.size * 0.45,
    rx: c.size + 14,
    ry: c.size + 16,
    kind: 'chime' as const,
    note: i,
  })),
);

export const HOTSPOTS: Hotspot[] = [
  /* ───────────────────────── 森林 ───────────────────────── */
  // 五棵树，每一棵摇下来的东西都不一样
  { id: 'hs-oak-big', r: 'forest', x: 470, y: 380, rx: 168, ry: 180, kind: 'tree', drops: ['acorn', 'leaf'] },
  { id: 'hs-oak-small', r: 'forest', x: 232, y: 520, rx: 58, ry: 86, kind: 'tree', drops: ['acorn'] },
  { id: 'hs-pine', r: 'forest', x: 1030, y: 528, rx: 52, ry: 100, kind: 'tree', drops: ['pinecone'] },
  { id: 'hs-willow', r: 'forest', x: 1210, y: 552, rx: 84, ry: 92, kind: 'tree', drops: ['leaf', 'twig'] },
  { id: 'hs-birch', r: 'forest', x: 1440, y: 500, rx: 66, ry: 100, kind: 'tree', drops: ['leaf', 'twig'] },

  { id: 'hs-bush1', r: 'forest', x: 600, y: 690, rx: 42, ry: 30, kind: 'bush' },
  { id: 'hs-bush2', r: 'forest', x: 900, y: 700, rx: 36, ry: 26, kind: 'bush' },
  { id: 'hs-bush3', r: 'forest', x: 1330, y: 696, rx: 40, ry: 28, kind: 'bush' },

  { id: 'hs-stump', r: 'forest', x: 890, y: 694, rx: 30, ry: 24, kind: 'stump' },
  { id: 'hs-soil', r: 'forest', x: 782, y: 730, rx: 62, ry: 26, kind: 'soil' },

  /* ───────────────────────── 农场 ───────────────────────── */
  // 谷仓门：推一下会开一条缝，里面是另一个空间（见 regions 的 barn）
  { id: 'hs-farm-barn', r: 'farm', x: 1240, y: 604, rx: 96, ry: 96, kind: 'door', to: 'barn' },
  // 田垄：扒一扒能翻出土里的蚯蚓，和森林的泥地是同一套反应
  { id: 'hs-farm-field', r: 'farm', x: 700, y: 730, rx: 156, ry: 56, kind: 'soil', spawn: [{ t: 'worm', p: 0.34 }] },
  { id: 'hs-farm-oak', r: 'farm', x: 360, y: 606, rx: 74, ry: 96, kind: 'tree', drops: ['apple', 'leaf'] },
  { id: 'hs-farm-birch', r: 'farm', x: 1080, y: 612, rx: 58, ry: 80, kind: 'tree', drops: ['leaf', 'twig'] },
  { id: 'hs-farm-fence', r: 'farm', x: 520, y: 684, rx: 108, ry: 22, kind: 'metal', spawn: [{ t: 'chick', p: 0.18 }] },
  { id: 'hs-farm-mill', r: 'farm', x: 220, y: 590, rx: 58, ry: 96, kind: 'metal' },
  { id: 'hs-farm-silo', r: 'farm', x: 1402, y: 618, rx: 34, ry: 78, kind: 'metal' },
  // 稻草人：拍一下掉几根草，孩子会以为它在抖
  { id: 'hs-farm-scarecrow', r: 'farm', x: 890, y: 640, rx: 42, ry: 66, kind: 'hay', spawn: [{ t: 'hay', p: 0.45 }, { t: 'apple', p: 0.2 }] },

  /* ───────────────────────── 海边 ───────────────────────── */
  { id: 'hs-sea-rock', r: 'seaside', x: 1242, y: 738, rx: 84, ry: 44, kind: 'rock', spawn: [{ t: 'crab', p: 0.5 }] },
  { id: 'hs-sea-sand1', r: 'seaside', x: 880, y: 782, rx: 96, ry: 42, kind: 'sand', spawn: [{ t: 'shell', p: 0.55 }] },
  { id: 'hs-sea-sand2', r: 'seaside', x: 620, y: 806, rx: 76, ry: 38, kind: 'sand', spawn: [{ t: 'starfish', p: 0.4 }] },
  { id: 'hs-sea-lighthouse', r: 'seaside', x: 1462, y: 690, rx: 48, ry: 96, kind: 'lamp' },
  { id: 'hs-sea-pier', r: 'seaside', x: 350, y: 688, rx: 128, ry: 26, kind: 'metal' },
  // 退潮才露出来的潮池：里面有来不及游回去的小东西
  { id: 'hs-sea-pool', r: 'seaside', x: 760, y: 772, rx: 92, ry: 40, kind: 'water', tide: 'low', spawn: [{ t: 'starfish', p: 0.6 }, { t: 'shell', p: 0.4 }] },
  // 涨潮时海水漫上来的那一线：点一下是浪
  { id: 'hs-sea-surf', r: 'seaside', x: 1040, y: 706, rx: 180, ry: 18, kind: 'water', tide: 'high' },

  /* ───────────────────────── 小镇 ───────────────────────── */
  { id: 'hs-town-tree', r: 'town', x: 520, y: 656, rx: 42, ry: 58, kind: 'tree', drops: ['leaf', 'twig'] },
  { id: 'hs-town-lamp1', r: 'town', x: 220, y: 646, rx: 26, ry: 54, kind: 'lamp' },
  { id: 'hs-town-lamp2', r: 'town', x: 1260, y: 646, rx: 26, ry: 54, kind: 'lamp' },
  { id: 'hs-town-post', r: 'town', x: 960, y: 712, rx: 24, ry: 30, kind: 'metal', spawn: [{ t: 'letter', p: 0.6 }] },
  { id: 'hs-town-hydrant', r: 'town', x: 780, y: 714, rx: 22, ry: 24, kind: 'water' },
  { id: 'hs-town-bakery', r: 'town', x: 300, y: 656, rx: 62, ry: 74, kind: 'door', spawn: [{ t: 'bread', p: 0.3 }] },

  /* ───────────────────────── 小屋 ───────────────────────── */
  { id: 'hs-home-shelf', r: 'home', x: 960, y: 646, rx: 96, ry: 74, kind: 'soft', spawn: [{ t: 'letter', p: 0.5 }] },
  { id: 'hs-home-rug', r: 'home', x: 760, y: 760, rx: 178, ry: 44, kind: 'soft', spawn: [{ t: 'ball', p: 0.25 }] },
  { id: 'hs-home-pot', r: 'home', x: 1120, y: 674, rx: 26, ry: 40, kind: 'soft', spawn: [{ t: 'flower', p: 0.35 }] },
  { id: 'hs-home-window', r: 'home', x: 430, y: 470, rx: 92, ry: 100, kind: 'door' },
  { id: 'hs-home-stove', r: 'home', x: 1240, y: 676, rx: 132, ry: 46, kind: 'metal', spawn: [{ t: 'bread', p: 0.2 }] },

  /* ───────────────────────── 工地 ───────────────────────── */
  { id: 'hs-site-pipe', r: 'site', x: 306, y: 676, rx: 62, ry: 38, kind: 'metal', spawn: [{ t: 'ball', p: 0.3 }] },
  { id: 'hs-site-wall', r: 'site', x: 560, y: 664, rx: 100, ry: 48, kind: 'metal', spawn: [{ t: 'brick', p: 0.5 }] },
  { id: 'hs-site-scaffold', r: 'site', x: 1070, y: 556, rx: 78, ry: 148, kind: 'metal' },
  { id: 'hs-site-dirt', r: 'site', x: 350, y: 676, rx: 116, ry: 44, kind: 'soil', spawn: [{ t: 'rock', p: 0.4 }] },
  { id: 'hs-site-barrow', r: 'site', x: 1180, y: 706, rx: 52, ry: 30, kind: 'metal', spawn: [{ t: 'sandpile', p: 0.25 }] },

  /* ───────────────────────── 海底 ───────────────────────── */
  { id: 'hs-uw-rock', r: 'underwater', x: 330, y: 784, rx: 60, ry: 34, kind: 'rock', spawn: [{ t: 'starfish', p: 0.5 }] },
  { id: 'hs-uw-sand', r: 'underwater', x: 910, y: 830, rx: 130, ry: 44, kind: 'sand', spawn: [{ t: 'shell', p: 0.5 }] },
  { id: 'hs-uw-reef', r: 'underwater', x: 1262, y: 778, rx: 62, ry: 36, kind: 'rock', spawn: [{ t: 'crab', p: 0.4 }] },
  // 洞穴口：游进去是一条沉船（见 regions 的 wreck）
  { id: 'hs-uw-cave', r: 'underwater', x: 1430, y: 766, rx: 64, ry: 44, kind: 'door', to: 'wreck' },

  /* ───────────────────────── 天空 ───────────────────────── */
  { id: 'hs-sky-cloud1', r: 'sky', x: 420, y: 688, rx: 88, ry: 44, kind: 'cloud', spawn: [{ t: 'bubble', p: 0.3 }] },
  { id: 'hs-sky-cloud2', r: 'sky', x: 1180, y: 680, rx: 84, ry: 42, kind: 'cloud', spawn: [{ t: 'bubble', p: 0.3 }] },
  { id: 'hs-sky-sea', r: 'sky', x: 800, y: 792, rx: 280, ry: 36, kind: 'cloud' },

  /* ───────────────────────── 里层空间 ───────────────────────── */
  // 树上：一根横枝可以摇
  { id: 'hs-branch', r: 'canopy', x: 760, y: 300, rx: 170, ry: 120, kind: 'tree', drops: ['leaf'], gy: 790 },
  // 地下：土壁可以挖（松开一捧土会掉东西出来）
  { id: 'hs-wall', r: 'burrow', x: 660, y: 640, rx: 100, ry: 70, kind: 'soil' },

  // 谷仓：草垛、横梁、木板墙
  { id: 'hs-barn-hay', r: 'barn', x: 286, y: 712, rx: 108, ry: 62, kind: 'hay', spawn: [{ t: 'hay', p: 0.3 }, { t: 'egg', p: 0.25 }] },
  { id: 'hs-barn-beam', r: 'barn', x: 700, y: 470, rx: 240, ry: 40, kind: 'metal' },
  { id: 'hs-barn-wall', r: 'barn', x: 560, y: 640, rx: 90, ry: 90, kind: 'soft' },
  { id: 'hs-barn-crate', r: 'barn', x: 700, y: 754, rx: 46, ry: 30, kind: 'metal', spawn: [{ t: 'apple', p: 0.3 }] },

  // 沉船：船肋、沙地、破洞
  { id: 'hs-wreck-rib', r: 'wreck', x: 620, y: 640, rx: 300, ry: 120, kind: 'metal' },
  { id: 'hs-wreck-sand', r: 'wreck', x: 900, y: 826, rx: 150, ry: 46, kind: 'sand', spawn: [{ t: 'shell', p: 0.5 }] },
  { id: 'hs-wreck-crate', r: 'wreck', x: 980, y: 772, rx: 50, ry: 34, kind: 'metal', spawn: [{ t: 'shell', p: 0.3 }] },
  { id: 'hs-wreck-net', r: 'wreck', x: 680, y: 590, rx: 130, ry: 60, kind: 'soft', spawn: [{ t: 'fishb', p: 0.25 }] },

  /* ───────────────────────── 会唱歌的东西 ───────────────────────── */
  // 每排五个音，坐标与画面都来自 CHIMES，不在这里手写
  ...CHIME_HOTSPOTS,
];
