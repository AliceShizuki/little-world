/**
 * 调色板与视觉常量
 * 统一的粉彩绘本色调，所有组件共用，保证画面不会像来自不同素材库。
 */

export const C = {
  outline: '#6d5a4a',
  outlineSoft: 'rgba(109,90,74,0.55)',

  skyDayTop: '#b6cbd8',
  skyDayMid: '#cfdde3',
  skyDayLow: '#f0e6cd',

  skyNightTop: '#1b2236',
  skyNightMid: '#2b3450',
  skyNightLow: '#4a4a68',

  sunCore: '#f6dc9a',
  sunEdge: '#e8b264',
  sunGlow: '#f7e2ac',

  moonCore: '#fdf3cf',
  moonEdge: '#f2dda2',

  cloud: '#fbf6e8',
  cloudShade: '#e2ded0',
  cloudRain: '#c3cfdd',
  cloudRainShade: '#aab8c9',

  hillFar: '#c3c9a8',
  hillMid: '#adba8f',

  grassFar: '#a3ae7c',
  grass: '#8d9a64',
  grassNear: '#7b8857',
  grassDark: '#66744a',

  waterTop: '#9dc0c6',
  waterBottom: '#79a3ad',
  waterLight: '#dcebea',

  sand: '#dfcaa2',
  sandDark: '#c4ab84',

  trunk: '#6b5340',
  trunkDark: '#473628',

  leaf: '#6b7c4c',
  leafDark: '#4a5834',
  leafLight: '#8a9c62',
  leafNight: '#4e5c42',

  pine: '#5f7050',
  pineDark: '#455439',

  petalPink: '#d99aac',
  petalPinkDark: '#c47f92',
  petalYellow: '#e5c26a',
  petalYellowDark: '#cba449',
  petalPurple: '#b3a3c9',
  petalPurpleDark: '#95879f',
  flowerCenter: '#e0b864',

  houseWall: '#e8d6b0',
  houseWallDark: '#d8c49b',
  houseRoof: '#b97a5c',
  houseRoofDark: '#9a6248',
  houseDoor: '#a07a52',
  houseDoorDark: '#82623f',
  houseWindow: '#b4c9cd',
  houseWindowLight: '#eccf8c',

  rabbitBody: '#b9a488',
  rabbitShade: '#967f63',
  rabbitEar: '#c98f92',
  rabbitBelly: '#ddcfb8',
  rabbitNose: '#b0707a',

  birdBody: '#7a9cb0',
  birdWing: '#5c7d90',
  birdBelly: '#e2e0d2',

  butterflyWing: '#cf9db0',
  butterflyWing2: '#dcc186',

  frogBody: '#8a9c5e',
  frogDark: '#6b7c46',
  frogBelly: '#d5dcc0',

  carrot: '#cf8449',
  carrotDark: '#a85f2c',
  carrotLeaf: '#8cc47a',

  boat: '#eee3c9',
  boatShade: '#d3c3a5',
  boatFlag: '#f28b82',

  star: '#fff4cf',
} as const;

/** 绘制手绘风描边的通用属性 */
export const HAND = {
  stroke: C.outlineSoft,
  strokeWidth: 2.4,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
  vectorEffect: 'non-scaling-stroke' as const,
};

export const FONT =
  "'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif";
