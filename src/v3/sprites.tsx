/**
 * 精灵注册表
 *
 * 这里是 V3 能支撑八个区域的关键：不写 55 个组件，而是写
 * 6 种生物骨架（四足 / 鸟 / 鱼 / 虫 / 爬行 / 载具）+ 11 种道具形状，
 * 每个具体类型只是参数表里的一行。
 *
 * 坐标约定：原点在物体底部中心，向上为负 y。
 */

import type { ReactNode } from 'react';
import { C } from '../theme';

export interface DrawCtx {
  /** 变体编号，用于同类型的不同配色 */
  v: number;
  /** 生长阶段 0..3 */
  st: number;
  /** 浇水 / 成熟 / 装满 */
  f: boolean;
  night: boolean;
}

export type AnimKind =
  | 'hop'
  | 'walk'
  | 'flap'
  | 'swim'
  | 'crawl'
  | 'drive'
  | 'float'
  | 'still'
  | 'sway'
  | 'breeze';

export interface SpriteSpec {
  w: number;
  h: number;
  anim: AnimKind;
  draw: (c: DrawCtx) => ReactNode;
}

const OUT = 'rgba(109,90,74,0.42)';
const OW = 1.8;

const stroke = { stroke: OUT, strokeWidth: OW, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
const thin = { stroke: OUT, strokeWidth: 1.3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/* ─────────────────────────── 生物骨架 ─────────────────────────── */

interface QuadParams {
  body: string;
  shade?: string;
  belly?: string;
  ear?: 'long' | 'round' | 'point' | 'small' | 'lop';
  earColor?: string;
  tail?: 'puff' | 'bushy' | 'thin' | 'none';
  horn?: 'antler' | 'short' | 'none';
  /** 鬃毛颜色：有值就画一条从背到头的鬃毛（马、驴） */
  mane?: string;
  /** 长脖子：试过给牛马鹿用，直边多边形在绘本风格里显得像拼块，暂不启用 */
  neck?: boolean;
  patch?: string;
  snout?: string;
  eye?: string;
  scale?: number;
}

/** 四足动物：兔子 / 松鼠 / 刺猬 / 狐狸 / 鹿 / 奶牛 / 绵羊 / 猪 / 马 / 猫 */
/**
 * 野兔（坐姿）。
 *
 * 兔子不用 quad 模板：四足的骨架是"四条柱子撑一个身子"，
 * 而兔子坐着的时候，后腿是**折叠**的一大块，身子几乎贴在腿上。
 * 这一个姿势就决定了"像不像兔子"，比耳朵画多细都重要。
 */
function hare(body: string, shade: string, belly: string, ear: string) {
  return (
    <g>
      {/* 尾巴：白色小球，贴在臀后 */}
      <circle cx={-25} cy={-13} r={5.4} fill={belly} {...stroke} />
      {/* 后腿：折叠的一大块，脚掌朝前贴地 */}
      <path d="M -24 -17 C -29 -11 -29 -3 -23 0 L -6 0 C -4 -5 -6 -11 -11 -15 Z" fill={shade} {...stroke} />
      <path d="M -24 -1.4 L -7 -1.4" stroke={body} strokeWidth={2.4} strokeLinecap="round" opacity={0.55} />
      {/* 身体：梨形——臀最宽最高，肩略低，向前收 */}
      <path d="M -25 -6 C -29 -21 -23 -35 -9 -37 C 3 -39 14 -32 16 -22 C 18 -13 13 -7 5 -6 Z" fill={body} {...stroke} />
      {/* 腹部浅色：只在下沿，不整圈包住 */}
      <path d="M -18 -8 C -8 -4 6 -5 12 -10 C 10 -14 2 -16 -6 -15 C -13 -14 -18 -11 -18 -8 Z" fill={belly} opacity={0.9} />
      {/* 背上的受光面 */}
      <path d="M -16 -30 C -8 -35 2 -34 9 -28" stroke={belly} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.4} />
      {/* 前腿：细，直立 */}
      <path d="M 8 -16 L 13 -16 L 13 0 L 8 0 Z" fill={body} {...stroke} />
      {/* 头：楔形，前额圆、吻部向前收 */}
      <path d="M 4 -35 C 4 -46 13 -51 22 -47 C 29 -44 32 -37 28 -31 C 24 -26 10 -28 4 -32 Z" fill={body} {...stroke} />
      {/* 吻部浅色 */}
      <path d="M 22 -33 C 26 -33 29 -34 30 -37 C 28 -40 24 -40 22 -39 Z" fill={belly} opacity={0.92} />
      {/* 耳朵：一前一后，前倾，内侧粉 */}
      <ellipse cx={13} cy={-55} rx={4.6} ry={15} fill={body} transform="rotate(-13 13 -55)" {...stroke} />
      <ellipse cx={13} cy={-55} rx={2.1} ry={10} fill={ear} opacity={0.9} transform="rotate(-13 13 -55)" />
      <ellipse cx={22} cy={-54} rx={4.2} ry={13.5} fill={body} transform="rotate(10 22 -54)" {...stroke} />
      <ellipse cx={22} cy={-54} rx={1.9} ry={9} fill={ear} opacity={0.85} transform="rotate(10 22 -54)" />
      {/* 眼：侧面的圆 + 一点高光；鼻与胡须 */}
      <circle cx={16} cy={-39} r={2.4} fill="#3a2d22" />
      <circle cx={16.8} cy={-39.8} r={0.8} fill="#ffffff" opacity={0.85} />
      <ellipse cx={29} cy={-37.4} rx={1.7} ry={1.3} fill={C.rabbitNose} />
      <path d="M 29 -36 L 36 -38 M 29 -35 L 36 -33.6" stroke="#8a7256" strokeWidth={0.8} opacity={0.55} strokeLinecap="round" />
    </g>
  );
}

function quad(p: QuadParams) {
  const body = p.body;
  const shade = p.shade ?? body;
  const belly = p.belly ?? '#fffaf2';
  const ear = p.ear ?? 'round';
  const eye = p.eye ?? '#5c4a3d';

  return (
    <g>
      {/* 尾巴 */}
      {p.tail === 'puff' && <circle cx={-23} cy={-19} r={6} fill={belly} {...stroke} />}
      {p.tail === 'bushy' && (
        <path d={`M -26 -30 C -48 -40 -52 -18 -34 -12 C -40 -24 -30 -26 -24 -24 Z`} fill={shade} {...stroke} />
      )}
      {p.tail === 'thin' && (
        <path d="M -26 -30 C -40 -34 -46 -42 -44 -50" stroke={shade} strokeWidth={4} fill="none" strokeLinecap="round" />
      )}
      {/* 远侧的两条腿：压暗，拉开前后关系。都很短——腿一长，兔子就成了小马 */}
      <g fill={shade} opacity={0.8}>
        <path d="M -13 -9 L -8 -9 L -7 0 L -12 0 Z" />
        <path d="M 7 -8 L 11 -8 L 11 0 L 8 0 Z" />
      </g>
      {/*
        身体：背线拱、腹线收、臀部圆。
        原来是一个正椭圆——椭圆从任何角度看都是"一个蛋"，动物的背和腹是不一样的。
        这条路径里臀部最宽（左侧），肩部略抬高（右侧），腹线向内收。
      */}
      <path
        d="M -22 -20 C -22 -30 -14 -36 -4 -36 C 6 -36 15 -32 17 -24 C 18 -15 13 -9 5 -8 C -6 -7 -18 -9 -22 -20 Z"
        fill={body}
        {...stroke}
      />
      {/* 腹侧浅色：只占下半，不整圈包住（包住就成了两色蛋） */}
      <path d="M -17 -13 C -8 -9 3 -9 12 -13 C 11 -17 2 -19 -6 -19 C -13 -19 -17 -16 -17 -13 Z" fill={belly} opacity={0.85} />
      {/* 背上的受光面：一道细高光就够，多了会腻 */}
      <path d="M -14 -31 C -6 -35 2 -34 9 -30" stroke={belly} strokeWidth={3.6} fill="none" strokeLinecap="round" opacity={0.5} />
      {/* 近侧两条腿：后腿粗、前腿细（真动物就是这样） */}
      <g fill={body} {...thin}>
        <path d="M -20 -12 C -23 -6 -22 -2 -19 0 L -13 0 C -12 -4 -12 -8 -13 -12 Z" />
        <path d="M 5 -10 L 10 -10 L 10 0 L 6 0 Z" />
      </g>
      {p.patch && <ellipse cx={-12} cy={-33} rx={7} ry={5} fill={p.patch} opacity={0.55} />}
      {/* 脖子 / 头 */}
      <g transform={p.neck ? 'translate(2 -16)' : undefined}>
        {p.horn === 'antler' && (
          <g fill="none" stroke="#b98b62" strokeWidth={3.2} strokeLinecap="round">
            <path d="M 16 -52 L 14 -68 M 14 -60 L 24 -68 M 14 -64 L 6 -70" />
            <path d="M 28 -52 L 30 -68 M 30 -60 L 38 -66" />
          </g>
        )}
        {p.horn === 'short' && (
          <g fill="#e3d2ad" {...thin}>
            <path d="M 13 -52 C 10 -60 15 -63 17 -56 Z" />
            <path d="M 31 -52 C 34 -60 29 -63 27 -56 Z" />
          </g>
        )}
        {p.neck && (
          <path d="M 2 -30 L 6 -56 L 28 -56 L 28 -26 Z" fill={body} {...stroke} />
        )}
        {p.mane && (
          <path
            d="M -3 -40 C 1 -54 8 -60 19 -60 L 21 -50 C 12 -50 5 -44 1 -36 Z"
            fill={p.mane}
            {...thin}
          />
        )}
        {/*
          头：前额圆、鼻梁下收。
          原来是一个正圆 + 一个小圆（口鼻）——那是"雪人"，不是侧脸。
          改成侧脸骨相以后，眼睛和耳朵的位置就有了依据。
        */}
        <path
          d="M 9 -38 C 10 -47 18 -51 26 -47 C 32 -44 33 -36 28 -32 C 22 -28 12 -30 9 -34 Z"
          fill={body}
          {...stroke}
        />
        <path d="M 23 -31 C 26 -31 29 -33 30 -35 C 28 -38 25 -38 23 -37 Z" fill={p.snout ?? belly} opacity={0.85} />
        <path d="M 13 -44 C 17 -48 22 -49 25 -46" stroke={belly} strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.45} />
        {/* 耳朵 */}
        {ear === 'long' && (
          <>
            <ellipse cx={16} cy={-59} rx={4.4} ry={13} fill={body} transform="rotate(-11 16 -59)" {...stroke} />
            <ellipse cx={16} cy={-59} rx={2} ry={9} fill={p.earColor ?? C.rabbitEar} opacity={0.9} transform="rotate(-11 16 -59)" />
            <ellipse cx={25} cy={-58} rx={4} ry={12} fill={body} transform="rotate(9 25 -58)" {...stroke} />
            <ellipse cx={25} cy={-58} rx={1.8} ry={8.2} fill={p.earColor ?? C.rabbitEar} opacity={0.85} transform="rotate(9 25 -58)" />
          </>
        )}
        {ear === 'lop' && (
          <>
            <ellipse cx={12} cy={-52} rx={5} ry={11} fill={shade} transform="rotate(24 12 -52)" {...stroke} />
            <ellipse cx={32} cy={-52} rx={5} ry={11} fill={shade} transform="rotate(-24 32 -52)" {...stroke} />
          </>
        )}
        {ear === 'round' && (
          <>
            <circle cx={15} cy={-55} r={5.6} fill={shade} {...thin} />
            <circle cx={28} cy={-55} r={5.6} fill={shade} {...thin} />
          </>
        )}
        {ear === 'point' && (
          <>
            <path d="M 12 -52 L 15 -66 L 22 -54 Z" fill={shade} {...thin} />
            <path d="M 32 -54 L 36 -66 L 22 -54 Z" fill={shade} {...thin} />
          </>
        )}
        {ear === 'small' && (
          <>
            <ellipse cx={15} cy={-54} rx={4} ry={3.4} fill={shade} />
            <ellipse cx={28} cy={-54} rx={4} ry={3.4} fill={shade} />
          </>
        )}
        {/* 五官 */}
        <circle cx={18} cy={-39} r={1.9} fill={eye} />
        <circle cx={26} cy={-39} r={1.9} fill={eye} />
        <ellipse cx={23} cy={-33} rx={2} ry={1.6} fill="#c98a94" />
        <ellipse cx={14} cy={-34} rx={3.2} ry={1.9} fill="#f7b6b6" opacity={0.32} />
      </g>
    </g>
  );
}

interface BirdParams {
  body: string;
  wing?: string;
  belly?: string;
  beak?: string;
  crest?: boolean;
  comb?: boolean;
  big?: boolean;
}

/**
 * 鸟：小鸟 / 母鸡 / 小鸡 / 鸭子 / 海鸥 / 猫头鹰。
 *
 * 原来的画法是"一个椭圆 + 一个圆 + 一个三角"——那是鸟的符号，不是鸟。
 * 这一版按真实的鸟来：胸脯鼓、腹线平、尾根收；尾是三片羽；
 * 翅膀分覆羽和飞羽两层；喙上下两片；头与身体之间留出脖子的过渡。
 */
function bird(p: BirdParams) {
  const wing = p.wing ?? p.body;
  const belly = p.belly ?? '#f4eddc';
  const beak = p.beak ?? '#c08f52';
  return (
    <g>
      {/* 腿：先画，让身体压住上端 */}
      <g stroke="#c39a63" strokeWidth={2.2} fill="none" strokeLinecap="round">
        <path d="M -2 -7 L -3 0" />
        <path d="M -3 0 L -7 1.6 M -3 0 L 1 1.6 M -3 0 L -3 2.4" />
        <path d="M 8 -7 L 8 0" />
        <path d="M 8 0 L 4 1.6 M 8 0 L 12 1.6 M 8 0 L 8 2.4" />
      </g>

      {/* 尾羽：三片，扇形铺在身后，末端收尖 */}
      <g fill={wing} stroke="rgba(109,90,74,0.38)" strokeWidth={1.1} strokeLinejoin="round">
        <path d="M -12 -23 L -31 -32 L -28 -24 L -13 -19 Z" />
        <path d="M -13 -20 L -30 -23 L -28 -16 L -12 -15 Z" />
        <path d="M -12 -17 L -27 -13 L -24 -8 L -10 -13 Z" />
      </g>

      {/* 身体：胸圆、腹平、尾根收 */}
      <path
        d="M -14 -17 C -16 -26 -8 -32 2 -32 C 11 -32 17 -26 18 -17 C 19 -9 12 -5 2 -5 C -7 -5 -12 -9 -14 -17 Z"
        fill={p.body}
        {...stroke}
      />
      {/* 腹部浅色：只铺下半，不整圈包住 */}
      <path d="M -10 -9 C -3 -6 7 -7 14 -12 C 12 -8 6 -5 1 -5 C -5 -5 -9 -7 -10 -9 Z" fill={belly} opacity={0.92} />
      {/* 背上的受光（光从右上来） */}
      <path d="M -4 -30 C 3 -32 11 -29 15 -24" stroke={belly} strokeWidth={3.2} fill="none" strokeLinecap="round" opacity={0.45} />

      {/* 翅膀：一层覆羽 + 三根飞羽 */}
      <g className="v3-wing" style={{ transformOrigin: '-2px -22px' }}>
        <path d="M -7 -27 C 1 -29 9 -25 10 -18 C 3 -14 -5 -16 -9 -22 Z" fill={wing} {...thin} />
        <g stroke={wing} strokeWidth={2.6} strokeLinecap="round" fill="none">
          <path d="M -6 -21 C -12 -19 -16 -17 -19 -16" />
          <path d="M -5 -18 C -11 -15 -14 -13 -17 -11" />
          <path d="M -4 -15 C -9 -12 -12 -10 -14 -8" />
        </g>
      </g>

      {/* 头：与身体叠出脖子，不用一个正圆 */}
      <path
        d="M 5 -30 C 6 -40 15 -45 22 -41 C 28 -38 29 -30 24 -26 C 18 -22 7 -24 5 -27 Z"
        fill={p.body}
        {...stroke}
      />
      {/* 喙：上下两片，中间一道缝 */}
      <path d="M 21 -33 L 30 -30.5 L 21 -27 Z" fill={beak} {...thin} />
      <path d="M 21.5 -30 L 29 -30.5" stroke="rgba(109,90,74,0.45)" strokeWidth={1} strokeLinecap="round" />
      {/* 眼 + 一点高光 */}
      <circle cx={14} cy={-37} r={2.1} fill="#3a2d22" />
      <circle cx={14.7} cy={-37.7} r={0.7} fill="#ffffff" opacity={0.85} />
      {/* 脸颊的浅色：长在脸上，不能落到胸口去（落到胸口就成了"围兜"） */}
      <ellipse cx={19} cy={-33} rx={3.6} ry={2.2} fill={belly} opacity={0.45} />

      {/* 冠羽 / 肉冠：跟着新的头顶走 */}
      {p.crest && (
        <g className="v3-crest">
          <path d="M 12 -44 L 9 -52 L 15 -48 L 16 -56 L 20 -47 L 25 -52 L 23 -43 Z" fill={beak} {...thin} />
        </g>
      )}
      {p.comb && (
        <path d="M 10 -44 C 8 -52 14 -52 14 -47 C 16 -55 22 -53 20 -45 Z" fill="#d96b6b" {...thin} />
      )}
    </g>
  );
}

interface FishParams {
  body: string;
  fin?: string;
  belly?: string;
  long?: boolean;
  shell?: string;
}

/** 鱼 / 海豚 / 海龟 */
function fish(p: FishParams) {
  const fin = p.fin ?? p.body;
  const rx = p.long ? 26 : 18;
  return (
    <g>
      {p.shell ? (
        <>
          {/* 海龟：壳 + 四鳍 */}
          <ellipse cx={-2} cy={-3} rx={22} ry={12} fill={p.shell} {...stroke} />
          <ellipse cx={-2} cy={-6} rx={17} ry={8} fill={p.body} opacity={0.5} />
          <path d="M -20 -2 C -32 6 -34 -10 -24 -12" fill={p.fin ?? p.body} {...thin} />
          <path d="M 16 -2 C 28 6 30 -10 20 -12" fill={p.fin ?? p.body} {...thin} />
          <circle cx={22} cy={-6} r={6} fill={p.body} {...thin} />
          <circle cx={24} cy={-8} r={1.5} fill="#4d3f36" />
        </>
      ) : (
        <>
          <path
            d={`M ${-rx + 4} -4 L ${-rx - 12} -16 L ${-rx - 8} -4 L ${-rx - 12} 8 Z`}
            fill={fin}
            {...thin}
          />
          <ellipse cx={0} cy={-4} rx={rx} ry={11} fill={p.body} {...stroke} />
          <ellipse cx={2} cy={-1} rx={rx * 0.55} ry={6} fill={p.belly ?? '#ffffff'} opacity={0.6} />
          <path d="M -6 -14 L 2 -24 L 8 -12 Z" fill={fin} {...thin} />
          <circle cx={rx * 0.52} cy={-7} r={2} fill="#4d3f36" />
        </>
      )}
    </g>
  );
}

/** 章鱼 / 水母 */
function blob(p: { body: string; tentacle: string; glow?: boolean }) {
  return (
    <g>
      {p.glow && <circle cx={0} cy={-18} r={26} fill={p.body} opacity={0.22} filter="url(#softGlow)" />}
      <ellipse cx={0} cy={-22} rx={15} ry={13} fill={p.body} {...stroke} />
      <g stroke={p.tentacle} strokeWidth={3.2} fill="none" strokeLinecap="round" className="v3-tentacles">
        <path d="M -10 -12 C -12 -4 -6 0 -8 6" />
        <path d="M -3 -11 C -4 -3 1 1 -1 7" />
        <path d="M 4 -11 C 5 -3 1 2 3 7" />
        <path d="M 10 -12 C 12 -4 6 0 8 6" />
      </g>
      <circle cx={-5} cy={-24} r={2.1} fill="#4d3f36" />
      <circle cx={5} cy={-24} r={2.1} fill="#4d3f36" />
    </g>
  );
}

/** 蝴蝶 / 瓢虫 / 萤火虫 */
/**
 * 蝴蝶 / 蛾子。
 *
 * 原来的翅膀是两团"云朵"：没有前后翅之分、没有翅脉，读起来像两片棉花。
 * 真实的蝴蝶是**前翅大、后翅小、翅脉从基部放射、边缘有一圈暗色**——
 * 这几样加起来，远看才有"蝴蝶"的辨识度。
 */
function insect(p: { wing: string; wing2: string; spots?: number; body?: string }) {
  const body = p.body ?? '#6a5646';
  const dark = 'rgba(90,74,58,0.45)';
  const side = (d: number) => (
    <g className={d > 0 ? 'v3-wing-r' : 'v3-wing-l'} style={{ transformOrigin: '0px -15px' }}>
      {/* 前翅：上缘圆、翅尖朝上外 */}
      <path
        d={`M 0 -16 C ${d * 8} -34 ${d * 26} -38 ${d * 31} -26 C ${d * 34} -16 ${d * 20} -10 ${d * 2} -11 Z`}
        fill={p.wing}
        stroke={dark}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      {/* 后翅：小、圆，后缘带一个浅尾突 */}
      <path
        d={`M 0 -13 C ${d * 6} -6 ${d * 20} -4 ${d * 21} 3 C ${d * 21} 9 ${d * 9} 9 ${d * 1} -7 Z`}
        fill={p.wing2}
        stroke={dark}
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      {/* 翅脉：三根，从基部放射出去 */}
      <g stroke={dark} strokeWidth={0.9} fill="none" opacity={0.75}>
        <path d={`M 0 -14 C ${d * 10} -24 ${d * 20} -28 ${d * 29} -26`} />
        <path d={`M 0 -14 C ${d * 9} -20 ${d * 16} -18 ${d * 24} -16`} />
        <path d={`M 0 -13 C ${d * 8} -8 ${d * 14} -4 ${d * 20} 2`} />
      </g>
      {/* 前翅的暗色外缘 */}
      <path d={`M ${d * 31} -26 C ${d * 34} -16 ${d * 20} -10 ${d * 2} -11`} stroke={dark} strokeWidth={2.4} fill="none" opacity={0.45} />
      {/* 翅上的两点白斑 */}
      <circle cx={d * 22} cy={-24} r={2} fill="#f7f2e4" opacity={0.72} />
      <circle cx={d * 26} cy={-18} r={1.5} fill="#f7f2e4" opacity={0.55} />
    </g>
  );
  return (
    <g>
      {side(-1)}
      {side(1)}
      {/* 腹部：有分节 */}
      <ellipse cx={0} cy={-8} rx={2.4} ry={8} fill={body} />
      <g stroke="rgba(255,255,255,0.24)" strokeWidth={0.7}>
        <path d="M -2 -12 L 2 -12 M -2.2 -8 L 2.2 -8 M -2 -4 L 2 -4" />
      </g>
      {/* 胸与头 */}
      <circle cx={0} cy={-17} r={3} fill={body} />
      <circle cx={0} cy={-21} r={2.4} fill={body} />
      <circle cx={-1.6} cy={-21.6} r={0.8} fill="#2f241c" />
      <circle cx={1.6} cy={-21.6} r={0.8} fill="#2f241c" />
      {/* 触角：末端有小球 */}
      <path
        d="M -1 -23 C -4 -28 -7 -30 -9 -30 M 1 -23 C 4 -28 7 -30 9 -30"
        stroke={body}
        strokeWidth={1.2}
        fill="none"
        strokeLinecap="round"
      />
      <circle cx={-9} cy={-30} r={1.2} fill={body} />
      <circle cx={9} cy={-30} r={1.2} fill={body} />
    </g>
  );
}

/** 毛毛虫 / 蜗牛 */
function crawler(p: { body: string; shell?: string; spots?: string }) {
  return (
    <g>
      {p.shell && (
        <>
          <ellipse cx={-6} cy={-9} rx={13} ry={12} fill={p.shell} {...stroke} />
          <path d="M -6 -9 C -2 -15 4 -11 0 -7 C -3 -5 -6 -7 -6 -9" stroke="#ffffff" strokeWidth={1.6} fill="none" opacity={0.55} />
        </>
      )}
      {Array.from({ length: 5 }, (_, i) => {
        const x = p.shell ? 4 + i * 7 : -14 + i * 7;
        return <circle key={i} cx={x} cy={-5 - (i % 2) * 1.6} r={5.4 - i * 0.25} fill={p.body} {...thin} />;
      })}
      {p.spots && (
        <>
          <circle cx={-8} cy={-7} r={1.6} fill={p.spots} />
          <circle cx={0} cy={-6} r={1.5} fill={p.spots} />
        </>
      )}
      {p.shell && (
        <>
          <circle cx={6} cy={-10} r={3.4} fill={p.body} {...thin} />
          <circle cx={5} cy={-11} r={1.2} fill="#4d3f36" />
        </>
      )}
      {!p.shell && (
        <>
          <circle cx={-17} cy={-8} r={2} fill="#4d3f36" />
          <circle cx={-11} cy={-8.6} r={1.8} fill="#4d3f36" />
        </>
      )}
    </g>
  );
}

/** 螃蟹 / 海星 */
function crab(p: { body: string }) {
  return (
    <g>
      <ellipse cx={0} cy={-9} rx={15} ry={10} fill={p.body} {...stroke} />
      <path d="M -14 -10 C -22 -18 -28 -14 -25 -8 M 14 -10 C 22 -18 28 -14 25 -8" stroke={p.body} strokeWidth={4} fill="none" strokeLinecap="round" />
      <circle cx={-22} cy={-16} r={4} fill={p.body} {...thin} />
      <circle cx={22} cy={-16} r={4} fill={p.body} {...thin} />
      <path d="M -9 -1 L -13 4 M -3 -1 L -5 4 M 3 -1 L 5 4 M 9 -1 L 13 4" stroke={p.body} strokeWidth={2.4} strokeLinecap="round" />
      <circle cx={-5} cy={-13} r={1.8} fill="#3f3630" />
      <circle cx={5} cy={-13} r={1.8} fill="#3f3630" />
      <path d="M -4 -6 q 4 3 8 0" stroke="#8a5a4a" strokeWidth={1.4} fill="none" strokeLinecap="round" />
    </g>
  );
}

function starfish(p: { body: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const r = i % 2 === 0 ? 17 : 7;
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r - 12).toFixed(1)}`;
  }).join(' ');
  return (
    <g>
      <polygon points={pts} fill={p.body} {...stroke} />
      <circle cx={0} cy={-12} r={3} fill="#ffffff" opacity={0.45} />
    </g>
  );
}

interface VehParams {
  body: string;
  roof?: string;
  glass?: string;
  kind: 'car' | 'truck' | 'bus' | 'rig' | 'bike';
  accent?: string;
}

/** 载具：汽车 / 卡车 / 公交 / 消防车 / 自行车 / 挖掘机 / 吊车 */
function vehicle(p: VehParams) {
  const glass = p.glass ?? '#cfeaf7';
  const roof = p.roof ?? p.body;
  if (p.kind === 'bike') {
    return (
      <g>
        <circle cx={-13} cy={-8} r={8} fill="none" stroke="#5c4a3d" strokeWidth={2.4} />
        <circle cx={13} cy={-8} r={8} fill="none" stroke="#5c4a3d" strokeWidth={2.4} />
        <path d="M -13 -8 L -2 -22 L 10 -22 L 13 -8 M -2 -22 L 4 -8" stroke={p.body} strokeWidth={3} fill="none" strokeLinecap="round" />
        <path d="M -4 -24 L 2 -24" stroke="#5c4a3d" strokeWidth={2.6} strokeLinecap="round" />
      </g>
    );
  }
  const long = p.kind === 'truck' || p.kind === 'bus' || p.kind === 'rig';
  const w = long ? 46 : 30;
  return (
    <g>
      {p.kind === 'rig' && (
        <g>
          <rect x={-6} y={-42} width={5} height={26} rx={2} fill={p.accent ?? '#d9b06a'} {...thin} />
          <path d="M -4 -42 L 22 -42 L 22 -38 L -4 -38 Z" fill={p.accent ?? '#d9b06a'} {...thin} />
          <path d="M -6 -34 L -26 -42" stroke={p.accent ?? '#d9b06a'} strokeWidth={2.4} strokeLinecap="round" />
        </g>
      )}
      <rect x={-w} y={-26} width={w * 2} height={16} rx={5} fill={p.body} {...stroke} />
      {p.kind === 'truck' && <rect x={-w} y={-26} width={w} height={16} rx={4} fill={p.roof ?? p.body} {...thin} />}
      <rect x={-w + 3} y={-38} width={long ? w * 0.9 : w * 1.1} height={14} rx={4} fill={roof} {...thin} />
      <rect x={-w + 5} y={-36} width={long ? w * 0.5 : w * 0.7} height={9} rx={2.5} fill={glass} />
      <rect x={-w + 5 + (long ? w * 0.5 : w * 0.7) + 3} y={-36} width={8} height={9} rx={2} fill={glass} opacity={0.85} />
      <circle cx={-w + 8} cy={-10} r={6.5} fill="#5c4a3d" />
      <circle cx={-w + 8} cy={-10} r={2.4} fill="#d9cbb8" />
      <circle cx={w - 8} cy={-10} r={6.5} fill="#5c4a3d" />
      <circle cx={w - 8} cy={-10} r={2.4} fill="#d9cbb8" />
      {p.accent && p.kind !== 'rig' && <circle cx={w - 2} cy={-22} r={3} fill={p.accent} opacity={0.9} />}
    </g>
  );
}

/** 船 */
function boatArt(p: { body: string; sail: string }) {
  return (
    <g>
      <path d="M -30 -8 L 30 -8 L 22 6 L -22 6 Z" fill={p.body} {...stroke} />
      <path d="M 0 -8 L 0 -46" stroke="#a98a68" strokeWidth={2.6} />
      <path d="M 2 -44 L 24 -12 L 2 -12 Z" fill={p.sail} {...thin} />
      <path d="M -2 -42 L -20 -12 L -2 -12 Z" fill={p.sail} opacity={0.85} {...thin} />
    </g>
  );
}

/* ─────────────────────────── 道具形状 ─────────────────────────── */

type Shape =
  | 'round'
  | 'oval'
  | 'box'
  | 'plank'
  | 'cone'
  | 'plant'
  | 'bottle'
  | 'sheet'
  | 'tool'
  | 'cluster'
  | 'cake'
  | 'flower';

function prop(shape: Shape, main: string, accent: string, st = 0) {
  switch (shape) {
    case 'round':
      return (
        <g>
          <circle cx={0} cy={-13} r={13} fill={main} {...stroke} />
          <ellipse cx={-4} cy={-17} rx={4} ry={3} fill="#ffffff" opacity={0.4} />
        </g>
      );
    case 'oval':
      return (
        <g>
          <ellipse cx={0} cy={-11} rx={12} ry={11} fill={main} {...stroke} />
          <ellipse cx={-3} cy={-15} rx={3.4} ry={2.6} fill="#ffffff" opacity={0.45} />
        </g>
      );
    case 'box':
      return (
        <g>
          <rect x={-12} y={-22} width={24} height={22} rx={3} fill={main} {...stroke} />
          <path d="M -12 -22 L -4 -28 L 20 -28 L 12 -22 Z" fill={accent} {...thin} />
          <path d="M 12 -22 L 20 -28 L 20 -6 L 12 0 Z" fill={accent} opacity={0.72} {...thin} />
        </g>
      );
    case 'plank':
      return (
        <g>
          <rect x={-26} y={-9} width={52} height={10} rx={4} fill={main} {...stroke} />
          <path d="M -18 -7 L -6 -7 M 4 -5 L 18 -5" stroke={accent} strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
          {st > 0 && <rect x={-26} y={-16} width={52} height={9} rx={4} fill={accent} {...thin} transform="rotate(-4 -26 -16)" />}
        </g>
      );
    case 'cone':
      return (
        <g>
          <path d="M -9 -2 C -11 -16 -4 -28 0 -30 C 4 -28 11 -16 9 -2 Z" fill={main} {...stroke} />
          <path d="M -2 -30 C -8 -34 -12 -38 -14 -42 M 2 -30 C 6 -36 10 -40 14 -42 M 0 -31 C 0 -38 1 -42 2 -46" stroke={accent} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'plant':
      // 生长阶段：0 土坑 / 1 幼芽 / 2 成株 / 3 结果
      return (
        <g>
          {st >= 0 && <ellipse cx={0} cy={-2} rx={13} ry={4.4} fill="#a98a68" opacity={0.55} />}
          {st === 0 && <ellipse cx={0} cy={-3} rx={8} ry={3} fill="#8d6f52" />}
          {st >= 1 && <path d="M 0 -3 C -1 -14 -1 -18 0 -22" stroke="#7fb96c" strokeWidth={2.8} fill="none" strokeLinecap="round" />}
          {st >= 1 && (
            <>
              <path d="M 0 -12 C -8 -14 -11 -18 -10 -20 C -5 -20 -1 -16 0 -12 Z" fill="#8cc47a" />
              <path d="M 0 -15 C 8 -17 11 -21 10 -23 C 5 -23 1 -19 0 -15 Z" fill="#a3d68b" />
            </>
          )}
          {st >= 2 && (
            <>
              <path d="M -1 -22 C -2 -34 -2 -40 0 -46" stroke="#6fa961" strokeWidth={3} fill="none" strokeLinecap="round" />
              <path d="M 0 -30 C -12 -32 -16 -38 -14 -42 C -6 -42 -1 -36 0 -30 Z" fill="#7fb96c" />
              <path d="M 0 -36 C 12 -38 16 -44 14 -48 C 6 -48 1 -42 0 -36 Z" fill="#93c07f" />
            </>
          )}
          {/* 开花：顶端散开一圈小花瓣 */}
          {st >= 4 && (
            <g>
              {[
                [-12, -48],
                [0, -54],
                [12, -48],
              ].map(([fx, fy], i) => (
                <g key={i} transform={`translate(${fx} ${fy})`}>
                  {[0, 1, 2, 3, 4].map((k) => {
                    const a = (Math.PI * 2 * k) / 5 - 0.4;
                    return (
                      <ellipse
                        key={k}
                        cx={Math.cos(a) * 3.6}
                        cy={Math.sin(a) * 3.6}
                        rx={2.8}
                        ry={2}
                        fill={accent}
                        transform={`rotate(${(a * 180) / Math.PI} ${Math.cos(a) * 3.6} ${Math.sin(a) * 3.6})`}
                        {...thin}
                      />
                    );
                  })}
                  <circle cx={0} cy={0} r={1.8} fill="#ffd77a" />
                </g>
              ))}
            </g>
          )}
          {/* 结果：垂下来的果实 */}
          {st >= 5 && (
            <g>
              <circle cx={-11} cy={-34} r={5.4} fill={main} {...thin} />
              <circle cx={10} cy={-40} r={5} fill={main} {...thin} />
              <circle cx={1} cy={-46} r={4.6} fill={main} {...thin} />
              <circle cx={-12.4} cy={-35.6} r={1.6} fill="#ffffff" opacity={0.45} />
            </g>
          )}
        </g>
      );
    case 'flower':
      return (
        <g>
          <path d="M 0 -2 C -1 -14 1 -20 0 -26" stroke="#6fa961" strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <path d="M 0 -14 C -8 -16 -11 -20 -10 -22 C -5 -22 -1 -18 0 -14 Z" fill="#8cc47a" />
          {Array.from({ length: 6 }, (_, i) => {
            const a = (Math.PI / 3) * i + (st >= 3 ? 0.1 : 0.5);
            const spread = st >= 3 ? 8.4 : 4.6;
            return (
              <ellipse
                key={i}
                cx={Math.cos(a) * spread}
                cy={-28 + Math.sin(a) * spread}
                rx={5.4}
                ry={3.8}
                fill={main}
                transform={`rotate(${(a * 180) / Math.PI} ${Math.cos(a) * spread} ${-28 + Math.sin(a) * spread})`}
                {...thin}
              />
            );
          })}
          <circle cx={0} cy={-28} r={3.4} fill={accent} />
        </g>
      );
    case 'bottle':
      return (
        <g>
          <path d="M -6 -2 L -6 -16 C -6 -20 -3 -20 -3 -24 L 3 -24 C 3 -20 6 -20 6 -16 L 6 -2 Z" fill={main} {...stroke} />
          <rect x={-3} y={-30} width={6} height={7} rx={2} fill={accent} {...thin} />
          <rect x={-6} y={-14} width={12} height={7} fill="#ffffff" opacity={0.45} />
        </g>
      );
    case 'sheet':
      return (
        <g>
          <path d="M -14 -2 L -10 -26 L 14 -28 L 12 -2 Z" fill={main} {...stroke} />
          <path d="M -9 -8 L 9 -9 M -8 -14 L 8 -15 M -7 -20 L 7 -21" stroke={accent} strokeWidth={1.3} strokeLinecap="round" opacity={0.65} />
        </g>
      );
    case 'tool':
      return (
        <g>
          <path d="M -10 -2 L -8 -12 L 8 -12 L 10 -2 Z" fill={main} {...stroke} />
          <path d="M -12 -12 L 12 -12" stroke={accent} strokeWidth={3} strokeLinecap="round" />
          <path d="M -8 -12 L -6 -22 M 8 -12 L 6 -22" stroke={accent} strokeWidth={1.6} />
        </g>
      );
    case 'cluster':
      return (
        <g>
          {[
            [-8, -8],
            [0, -12],
            [8, -8],
            [-4, -16],
            [4, -17],
            [0, -5],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={5.4} fill={i % 2 ? main : accent} {...thin} />
          ))}
        </g>
      );
    case 'cake':
      return (
        <g>
          <path d="M -14 -2 L -12 -18 L 12 -18 L 14 -2 Z" fill={main} {...stroke} />
          <ellipse cx={0} cy={-18} rx={12} ry={4.4} fill={accent} {...thin} />
          <circle cx={0} cy={-24} r={3.4} fill="#f28b82" {...thin} />
        </g>
      );
    default:
      return <circle cx={0} cy={-10} r={10} fill={main} />;
  }
}

/* ─────────────────────────── 参数表 ─────────────────────────── */

function S(w: number, h: number, anim: AnimKind, draw: (c: DrawCtx) => ReactNode): SpriteSpec {
  return { w, h, anim, draw };
}

const shapeS = (shape: Shape, main: string, accent: string, w = 30, h = 32): SpriteSpec =>
  S(w, h, 'still', (c) => prop(shape, main, accent, c.st));

export const SPRITES: Record<string, SpriteSpec> = {
  /* —— 森林 —— */
  rabbit: S(66, 72, 'hop', () => hare(C.rabbitBody, C.rabbitShade, C.rabbitBelly, C.rabbitEar)),
  squirrel: S(60, 62, 'hop', () =>
    quad({ body: '#a87a4e', shade: '#8a6240', belly: '#ddcaa8', ear: 'point', tail: 'bushy' }),
  ),
  hedgehog: S(62, 52, 'walk', () => (
    <g>
      {Array.from({ length: 7 }, (_, i) => {
        const a = -0.9 + i * 0.3;
        return <path key={i} d={`M ${Math.cos(a) * 20} ${-26 + Math.sin(a) * 16} l -4 -12 l 9 4 Z`} fill="#8a7259" {...thin} />;
      })}
      {quad({ body: '#9a805c', shade: '#806948', belly: '#cfc0a4', ear: 'small', tail: 'none' })}
    </g>
  )),
  fox: S(76, 64, 'walk', () =>
    quad({ body: '#b5794a', shade: '#965f38', belly: '#e6d6bd', ear: 'point', tail: 'bushy', snout: '#e6d6bd' }),
  ),
  deer: S(84, 86, 'walk', () =>
    quad({ body: '#a88b66', shade: '#8d7352', belly: '#ddcfb4', ear: 'point', horn: 'antler', tail: 'thin', patch: '#ddcfb4' }),
  ),
  owl: S(46, 54, 'flap', () =>
    bird({ body: '#8e7a5c', wing: '#73624a', belly: '#d6c9ad', beak: '#b08348', crest: true }),
  ),
  bird: S(46, 46, 'flap', () => bird({ body: '#7396a8', wing: '#5b7c8f', belly: '#dcdccd', beak: '#c08f52' })),
  butterfly: S(44, 42, 'float', (c) =>
    insect({ wing: c.v === 1 ? '#ffd9a0' : '#f5b2d0', wing2: c.v === 1 ? '#f7b3c8' : '#ffd9a0' }),
  ),
  ladybug: S(34, 28, 'crawl', () => (
    <g>
      <ellipse cx={0} cy={-9} rx={11} ry={9} fill="#e8695f" {...stroke} />
      <path d="M 0 -18 L 0 0" stroke="#5c4a3d" strokeWidth={1.2} />
      <circle cx={-5} cy={-11} r={2} fill="#4d3f36" />
      <circle cx={5} cy={-11} r={2} fill="#4d3f36" />
      <circle cx={-4} cy={-5} r={1.6} fill="#4d3f36" />
      <circle cx={4} cy={-5} r={1.6} fill="#4d3f36" />
      <circle cx={0} cy={-19} r={4.4} fill="#4d3f36" />
    </g>
  )),
  caterpillar: S(44, 26, 'crawl', () => crawler({ body: '#96cf7f', spots: '#f2c85c' })),
  snail: S(36, 28, 'crawl', () => crawler({ body: '#e8d3a8', shell: '#caa06a' })),
  firefly: S(26, 26, 'float', () => (
    <g>
      <circle cx={0} cy={-8} r={9} fill="#f7e79a" opacity={0.28} filter="url(#softGlow)" className="v3-glow" />
      <ellipse cx={0} cy={-8} rx={3.4} ry={5} fill="#6d5a4a" />
      <circle cx={0} cy={-14} r={3.9} fill="#f7e79a" className="v3-glow" />
    </g>
  )),
  /**
   * 蘑菇（伞菌）。
   *
   * 原来的画法是一个红圆加白点，像一颗草莓。真实的伞菌要有：
   * 菌盖的穹顶、盖缘的下翻、菌褶、菌环、菌柄下粗上细。
   * 这几样是"蘑菇"这个词的全部信息，少一样就认不出。
   */
  mushroom: S(34, 34, 'still', (c) => (
    <g>
      <ellipse cx={0} cy={0} rx={11} ry={3} fill="rgba(58,72,44,0.14)" />
      {/* 菌柄：下粗上细 */}
      <path
        d="M -3.6 -2 C -4.4 -8 -4.2 -13 -3 -16 L 3 -16 C 4.2 -13 4.4 -8 3.6 -2 Z"
        fill="#eae0c8"
        stroke="#b6a686"
        strokeWidth={1.2}
        strokeLinejoin="round"
      />
      {/* 菌环 */}
      <path d="M -5 -14 C -2 -12.4 2 -12.4 5 -14" stroke="#d2c4a4" strokeWidth={1.8} fill="none" strokeLinecap="round" />
      {/* 菌褶：盖缘下面露出的一排短线 */}
      <g stroke="#c9ab8a" strokeWidth={0.9} opacity={0.55}>
        <path d="M -9 -15.4 L -8 -17 M -5.5 -15 L -5 -17 M -2 -14.8 L -2 -16.6 M 1.5 -14.8 L 1.5 -16.6 M 5 -15 L 4.6 -17 M 8 -15.4 L 7.4 -17" />
      </g>
      {/* 菌盖：穹顶，边缘略微下翻 */}
      <path
        d="M -14 -16 C -14 -26 -7 -32 0 -32 C 7 -32 14 -26 14 -16 C 8 -13 -8 -13 -14 -16 Z"
        fill={c.v === 1 ? '#b8843f' : '#bf6a4e'}
        stroke="#8f5140"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      {/* 盖的暗面（右下） */}
      <path d="M 2 -31 C 9 -29 14 -23 14 -16 C 10 -15 5 -15 1 -16 Z" fill="#9c5a43" opacity={0.55} />
      {/* 高光 */}
      <path d="M -8 -23 C -6 -27 -2 -29 1 -29" stroke="#e8b9a0" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.55} />
      {/* 白点 */}
      <circle cx={-6} cy={-22} r={2.2} fill="#f6ecdc" opacity={0.8} />
      <circle cx={2} cy={-26} r={1.5} fill="#f6ecdc" opacity={0.65} />
    </g>
  )),
  acorn: S(22, 24, 'still', () => (
    <g>
      <path d="M -7 -8 C -7 -18 7 -18 7 -8 Z" fill="#c9945f" {...thin} />
      <path d="M -8 -8 C -8 -13 8 -13 8 -8 Z" fill="#8d6a44" {...thin} />
    </g>
  )),
  log: shapeS('plank', '#b98b62', '#8d6a44', 56, 20),
  /**
   * 石头。
   *
   * 原来是一个灰色圆球——圆是最没有性格的形状，放在草地上像一颗弹珠。
   * 真实的河石是**底边贴地、一面受光、一面压暗、脚下有苔**，
   * 三块颜色加一道裂纹，就够认出"这是一块石头"。
   */
  rock: S(40, 30, 'still', () => (
    <g>
      <ellipse cx={1} cy={0} rx={19} ry={3.6} fill="rgba(58,72,44,0.18)" />
      {/* 主体：扁、左低右高，顶上有一点小起伏 */}
      <path
        d="M -20 0 C -21 -5 -18 -11 -12 -14 C -8 -16 -6 -20 0 -20 C 7 -20 13 -18 16 -14 C 19 -11 20 -5 20 0 Z"
        fill="#a9a69b"
        stroke="#7c796f"
        strokeWidth={1.6}
        strokeLinejoin="round"
      />
      {/* 受光面：右上角，别铺太大——铺满了就成"半个蛋壳" */}
      <path d="M 2 -19.5 C 9 -19 14 -16 16.5 -12 C 13 -10 8 -10.5 5 -12.5 C 2 -14.5 1 -17 2 -19.5 Z" fill="#c4c0b4" />
      {/* 背光面：左下一条窄带 */}
      <path d="M -20 0 C -21 -5 -18 -11 -12 -14 C -13 -9 -14 -4 -14.5 0 Z" fill="#8a877d" opacity={0.9} />
      {/* 裂缝与顶部的凹陷 */}
      <path d="M -6 -17 C -4 -12 -5 -7 -7 -2" stroke="#8a877d" strokeWidth={1.1} fill="none" opacity={0.6} />
      <path d="M 6 -18.5 C 9 -16.5 11 -14 12 -11" stroke="#8a877d" strokeWidth={1} fill="none" opacity={0.45} />
      {/* 青苔：贴着地面的两侧 */}
      <path d="M -16 -1.5 C -12 -4 -6 -4 -3 -1.5 C -8 -0.6 -13 -0.6 -16 -1.5 Z" fill="#7d8f56" opacity={0.55} />
      <path d="M 8 -1.5 C 12 -3.4 17 -2.6 19 -0.6 C 15 -0.2 11 -0.4 8 -1.5 Z" fill="#6b7c4c" opacity={0.4} />
    </g>
  )),
  berry: shapeS('cluster', '#d0607a', '#e88fa2', 30, 24),
  fern: S(40, 42, 'breeze', () => (
    <g>
      {[-2, 0, 2].map((k, i) => (
        <path
          key={i}
          d={`M ${k * 8} -2 C ${k * 10 - 8} -18 ${k * 12 - 6} -30 ${k * 12} -40`}
          stroke="#6fa961"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
      ))}
      <path d="M -7 -24 C -14 -26 -16 -30 -15 -32 C -10 -32 -7 -28 -7 -24 Z" fill="#8cc47a" />
      <path d="M 7 -30 C 14 -32 16 -36 15 -38 C 10 -38 7 -34 7 -30 Z" fill="#93c07f" />
    </g>
  )),
  cat: S(66, 56, 'walk', (c) =>
    quad({ body: c.v === 1 ? '#c9c3bb' : '#e8b06a', shade: c.v === 1 ? '#b2aca4' : '#d2954f', belly: '#fdf6ea', ear: 'point', tail: 'thin' }),
  ),
  seed: S(24, 26, 'still', (c) => (
    <g>
      <ellipse cx={0} cy={-8} rx={7.5} ry={9} fill={c.v === 1 ? '#d9b06a' : '#a8845c'} {...stroke} />
      <path d="M 0 -16 C 4 -22 9 -22 10 -19 C 6 -17 2 -16 0 -16 Z" fill="#8cc47a" />
      <path d="M -2 -15 C -6 -20 -10 -20 -11 -17 C -7 -16 -4 -15 -2 -15 Z" fill="#a3d68b" />
    </g>
  )),
  can: S(34, 34, 'still', () => (
    <g>
      <path d="M -12 -2 L -10 -20 L 10 -20 L 12 -2 Z" fill="#9ec9d8" {...stroke} />
      <path d="M -10 -18 C -18 -22 -22 -28 -24 -34 L -18 -36 C -16 -30 -12 -26 -8 -24" fill="#8fbccb" {...stroke} />
      <path d="M 10 -14 C 18 -16 20 -10 14 -8" stroke="#8fbccb" strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  )),
  bucket: S(30, 30, 'still', (c) => (
    <g>
      <path d="M -11 -2 L -9 -20 L 9 -20 L 11 -2 Z" fill={c.v === 1 ? '#f28b82' : '#8fc7e8'} {...stroke} />
      <path d="M -9 -20 C -6 -26 6 -26 9 -20" stroke="#8d8a84" strokeWidth={1.8} fill="none" />
      <ellipse cx={0} cy={-20} rx={9} ry={2.8} fill="#ffffff" opacity={0.5} />
    </g>
  )),
  /* —— 农场 —— */
  cow: S(96, 74, 'walk', () =>
    quad({
      body: '#fdfaf3',
      shade: '#e8e0d2',
      belly: '#ffffff',
      ear: 'small',
      horn: 'short',
      patch: '#5c4a3d',
      tail: 'thin',
      snout: '#f3c3c9',
    }),
  ),
  sheep: S(86, 70, 'walk', () => (
    <g>
      {[
        [-14, -30],
        [0, -34],
        [14, -29],
        [-4, -22],
        [10, -22],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={11} fill="#f7f3ec" {...thin} />
      ))}
      {quad({ body: '#e6dccd', shade: '#d3c6b2', belly: '#fbf7f0', ear: 'small', tail: 'puff', snout: '#e8c7bd' })}
    </g>
  )),
  pig: S(74, 60, 'walk', () => quad({ body: '#f7bcc2', shade: '#e8a3aa', belly: '#fde3e6', ear: 'lop', tail: 'thin', snout: '#e88f9c' })),
  hen: S(48, 46, 'walk', () => bird({ body: '#f7f2e6', wing: '#e5dccb', belly: '#fffdf8', beak: '#eb9b4f', comb: true })),
  chick: S(30, 30, 'hop', () => bird({ body: '#ffdf8e', wing: '#f5cd6c', belly: '#fff3cb', beak: '#eb9b4f' })),
  duck: S(46, 40, 'walk', () => bird({ body: '#fdf8ee', wing: '#e7ddcb', belly: '#fffdf6', beak: '#f0a24f' })),
  horse: S(100, 96, 'walk', () =>
    quad({
      body: '#b8814f',
      shade: '#9c6a3f',
      belly: '#e8c9a4',
      ear: 'small',
      horn: 'none',
      tail: 'thin',
      mane: '#6d4f38',
      snout: '#e8c9a4',
    }),
  ),
  /* 生长植物：prop() 里已有四个阶段的画法，这里只是把它接到类型上 */
  plant: S(38, 58, 'breeze', (c) => prop('plant', c.v === 1 ? '#e8a44f' : '#e8695f', '#8cc47a', c.st)),
  flower: S(34, 48, 'breeze', (c) => prop('flower', ['#f7b3c8', '#ffd97a', '#c9b4e8'][c.v % 3], '#ffd77a', c.st)),
  corn: S(30, 54, 'breeze', () => (
    <g>
      <path d="M 0 -2 L 0 -40" stroke="#7fb96c" strokeWidth={3.4} strokeLinecap="round" />
      <path d="M -2 -18 C -14 -22 -16 -30 -13 -34 C -7 -32 -3 -24 -2 -18 Z" fill="#8cc47a" />
      <ellipse cx={0} cy={-34} rx={7} ry={14} fill="#f5cd6c" {...thin} />
      <path d="M -4 -42 L -4 -26 M 2 -44 L 2 -24" stroke="#e0b04f" strokeWidth={1.3} />
    </g>
  )),
  pumpkin: S(40, 34, 'still', () => (
    <g>
      <ellipse cx={0} cy={-13} rx={17} ry={13} fill="#ef9a52" {...stroke} />
      <path d="M -6 -24 C -8 -12 -8 -4 -6 0 M 6 -24 C 8 -12 8 -4 6 0 M 0 -25 L 0 0" stroke="#d9813c" strokeWidth={1.5} fill="none" />
      <path d="M 0 -25 C 0 -31 4 -33 6 -30" stroke="#7fb96c" strokeWidth={3} fill="none" strokeLinecap="round" />
    </g>
  )),
  tomato: shapeS('round', '#e8695f', '#7fb96c', 26, 26),
  wheat: S(26, 50, 'breeze', () => (
    <g>
      <path d="M 0 -2 L 0 -40" stroke="#d9b06a" strokeWidth={2.4} strokeLinecap="round" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <ellipse cx={-4} cy={-36 + i * 7} rx={3.4} ry={5} fill="#f0cd86" transform={`rotate(-24 -4 ${-36 + i * 7})`} {...thin} />
          <ellipse cx={4} cy={-38 + i * 7} rx={3.4} ry={5} fill="#f7dca2" transform={`rotate(24 4 ${-38 + i * 7})`} {...thin} />
        </g>
      ))}
    </g>
  )),
  egg: shapeS('oval', '#fdf8ef', '#e8dcc8', 24, 24),
  corn_cob: shapeS('cone', '#f5cd6c', '#7fb96c', 22, 30),
  apple: S(28, 30, 'still', (c) => (
    <g>
      <circle cx={-4} cy={-12} r={11} fill={c.v === 1 ? '#e8b04f' : '#e8695f'} {...stroke} />
      <circle cx={6} cy={-14} r={9.6} fill={c.v === 1 ? '#f0c46a' : '#f2837a'} {...stroke} />
      <path d="M 0 -22 C 2 -28 6 -29 8 -27" stroke="#7fb96c" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      <ellipse cx={7} cy={-27} rx={5} ry={3} fill="#8cc47a" transform="rotate(-18 7 -27)" />
    </g>
  )),
  carrot: S(26, 32, 'still', () => (
    <g>
      <path d="M -8 -2 C -10 -12 -3 -22 0 -24 C 3 -22 10 -12 8 -2 Z" fill="#f3a15f" {...stroke} />
      <path d="M -3 -24 C -6 -30 -8 -34 -9 -38 M 0 -25 C 0 -32 1 -36 2 -40 M 3 -24 C 6 -30 8 -33 10 -36" stroke="#8cc47a" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </g>
  )),
  bridge: S(120, 42, 'still', () => (
    <g>
      <path d="M -58 0 C -58 -34 -20 -42 0 -42 C 20 -42 58 -34 58 0" stroke="#c9a06a" strokeWidth={9} fill="none" strokeLinecap="round" />
      <path d="M -58 -10 L -58 -24 M -30 -30 L -30 -42 M 0 -36 L 0 -48 M 30 -30 L 30 -42 M 58 -10 L 58 -24" stroke="#b98b62" strokeWidth={4} strokeLinecap="round" />
      <path d="M -62 -24 C -40 -44 -16 -50 0 -50 C 16 -50 40 -44 62 -24" stroke="#d9b07a" strokeWidth={4.4} fill="none" strokeLinecap="round" />
    </g>
  )),
  hay: S(56, 42, 'still', () => (
    <g>
      <ellipse cx={0} cy={-14} rx={26} ry={14} fill="#e8c86a" {...stroke} />
      <path d="M -18 -18 L -10 -30 M -6 -12 L 2 -26 M 8 -16 L 16 -28 M -2 -14 L 2 -28" stroke="#d9b44f" strokeWidth={2} strokeLinecap="round" />
    </g>
  )),
  /* —— 海边 —— */
  crab: S(46, 32, 'crawl', () => crab({ body: '#ee8a6b' })),
  starfish: S(38, 34, 'still', () => starfish({ body: '#f2a1a8' })),
  shell: S(28, 24, 'still', () => (
    <g>
      <path d="M -12 0 C -12 -16 12 -16 12 0 Z" fill="#f6d9c4" {...stroke} />
      <path d="M -8 -2 L -2 -13 M -2 -2 L 2 -14 M 4 -2 L 6 -13" stroke="#e0b89f" strokeWidth={1.2} fill="none" />
    </g>
  )),
  gull: S(52, 44, 'flap', () => bird({ body: '#fdfcfa', wing: '#e2e0da', belly: '#ffffff', beak: '#f0b04f' })),
  /* —— 小镇 —— */
  car: S(60, 46, 'drive', (c) => vehicle({ body: c.v === 1 ? '#8fc7e8' : '#f28b82', roof: c.v === 1 ? '#8fc7e8' : '#e8746a', kind: 'car' })),
  bus: S(96, 60, 'drive', () => vehicle({ body: '#f5c86a', roof: '#f5c86a', kind: 'bus', accent: '#6a5646' })),
  truck: S(88, 56, 'drive', () => vehicle({ body: '#a5d28a', roof: '#8fc47a', kind: 'truck' })),
  firetruck: S(92, 58, 'drive', () => vehicle({ body: '#e8695f', roof: '#e8695f', kind: 'truck', accent: '#ffd97a' })),
  bike: S(46, 40, 'drive', () => vehicle({ body: '#7fc4e2', kind: 'bike' })),
  bread: shapeS('oval', '#e8b877', '#d9a35f', 34, 26),
  flour: shapeS('bottle', '#f5ecdc', '#d9c9ae', 26, 34),
  dough: shapeS('oval', '#f7ecd6', '#e8dcc0', 30, 24),
  letter: shapeS('sheet', '#fdf8ef', '#c7b8a2', 26, 32),
  /* —— 小屋 —— */
  bed: S(70, 44, 'still', () => (
    <g>
      <rect x={-32} y={-26} width={64} height={16} rx={5} fill="#f7e6c8" {...stroke} />
      <rect x={-32} y={-30} width={64} height={8} rx={4} fill="#e8c9a8" />
      <rect x={-28} y={-28} width={18} height={12} rx={4} fill="#ffffff" />
      <rect x={-32} y={-10} width={6} height={10} rx={2} fill="#c9a77e" />
      <rect x={26} y={-10} width={6} height={10} rx={2} fill="#c9a77e" />
      <path d="M -32 -26 L 32 -26" stroke="#dcc0a0" strokeWidth={2} />
    </g>
  )),
  chair: S(38, 46, 'still', () => (
    <g>
      <rect x={-14} y={-26} width={28} height={8} rx={3} fill="#d9a86a" {...thin} />
      <rect x={-14} y={-44} width={28} height={18} rx={5} fill="#e0b27a" {...thin} />
      <rect x={-11} y={-18} width={4} height={18} fill="#c9955c" />
      <rect x={7} y={-18} width={4} height={18} fill="#c9955c" />
    </g>
  )),
  lamp: S(30, 52, 'still', () => (
    <g>
      <rect x={-2} y={-22} width={4} height={22} fill="#c9b48a" />
      <path d="M -12 -22 L 12 -22 L 8 -40 L -8 -40 Z" fill="#ffe2a0" {...thin} />
      <ellipse cx={0} cy={-1} rx={9} ry={3} fill="#c9b48a" />
    </g>
  )),
  toy: shapeS('box', '#8fc7e8', '#f5c86a', 28, 30),
  vase: S(32, 58, 'still', (c) => (
    <g>
      {/* 插了花：瓶口伸出一枝，开一朵花 */}
      {c.st > 0 && (
        <g>
          <path d="M 0 -26 C -3 -38 2 -46 0 -52" stroke="#6fa961" strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <path d="M 0 -38 C -8 -40 -11 -44 -10 -46 C -5 -46 -1 -42 0 -38 Z" fill="#8cc47a" />
          {Array.from({ length: 5 }, (_, i) => {
            const a = (Math.PI * 2 * i) / 5 - 0.4;
            return (
              <ellipse
                key={i}
                cx={Math.cos(a) * 5.6}
                cy={-54 + Math.sin(a) * 5.6}
                rx={4.4}
                ry={3.2}
                fill={['#f7b3c8', '#ffd97a', '#c9b4e8'][c.v % 3]}
                transform={`rotate(${(a * 180) / Math.PI} ${Math.cos(a) * 5.6} ${-54 + Math.sin(a) * 5.6})`}
                {...thin}
              />
            );
          })}
          <circle cx={0} cy={-54} r={2.6} fill="#ffd77a" />
        </g>
      )}
      <path d="M -7 -2 L -6 -16 C -6 -21 -3 -21 -3 -26 L 3 -26 C 3 -21 6 -21 6 -16 L 7 -2 Z" fill="#a8cfe0" {...stroke} />
      <rect x={-3} y={-30} width={6} height={5} rx={2} fill="#c9b4e8" {...thin} />
      <rect x={-7} y={-15} width={14} height={7} fill="#ffffff" opacity={0.4} />
    </g>
  )),
  pot: shapeS('tool', '#d9855c', '#b96a44', 28, 26),
  appleslice: S(26, 22, 'still', () => (
    <g>
      <path d="M -11 0 C -11 -14 11 -14 11 0 Z" fill="#fdf2e3" {...thin} />
      <path d="M -11 0 C -11 -14 11 -14 11 0 Z" fill="#e8695f" opacity={0.32} />
      <circle cx={-3} cy={-5} r={1.4} fill="#8d6a44" />
      <circle cx={3} cy={-5} r={1.4} fill="#8d6a44" />
    </g>
  )),
  knife: S(30, 26, 'still', () => (
    <g>
      <path d="M -14 -6 L 10 -10 L 12 -4 L -12 -2 Z" fill="#cfd6dc" {...thin} />
      <rect x={12} y={-11} width={9} height={6} rx={2} fill="#8d6a44" />
    </g>
  )),
  canvas: shapeS('sheet', '#fdf8ef', '#e8dcc0', 34, 40),
  paint: shapeS('bottle', '#f5c86a', '#e8695f', 24, 32),
  ball: shapeS('round', '#f28b82', '#ffd97a', 26, 26),
  balloon: S(30, 52, 'float', (c) => (
    <g>
      <ellipse cx={0} cy={-38} rx={14} ry={17} fill={c.v === 1 ? '#a8cfe0' : '#f5b2d0'} {...stroke} />
      <path d="M 0 -21 L 0 -4" stroke="#b9a891" strokeWidth={1.2} />
      <ellipse cx={-4} cy={-44} rx={4} ry={5} fill="#ffffff" opacity={0.45} />
    </g>
  )),
  plane: S(46, 26, 'float', () => (
    <g>
      <path d="M -20 0 L 20 -10 L 4 2 Z" fill="#fdf8ef" {...thin} />
      <path d="M -20 0 L 4 2 L -6 -6 Z" fill="#e8dcc0" {...thin} />
    </g>
  )),
  /* —— 工地 —— */
  excavator: S(104, 78, 'drive', () => (
    <g>
      <rect x={-18} y={-18} width={44} height={16} rx={8} fill="#f5c86a" {...stroke} />
      <circle cx={-12} cy={-10} r={4} fill="#5c4a3d" />
      <circle cx={-2} cy={-10} r={4} fill="#5c4a3d" />
      <circle cx={12} cy={-10} r={4} fill="#5c4a3d" />
      <rect x={-24} y={-38} width={36} height={22} rx={6} fill="#f5c86a" {...stroke} />
      <rect x={-16} y={-34} width={16} height={12} rx={3} fill="#cfeaf7" />
      <path d="M 12 -38 L 34 -52 L 44 -18 L 34 -16 L 26 -42" fill="#e8b94f" {...thin} />
      <path d="M 34 -16 L 40 0 L 28 2 L 26 -6 Z" fill="#b9b6ae" {...thin} />
    </g>
  )),
  crane: S(100, 112, 'still', () => (
    <g>
      <rect x={-16} y={-22} width={32} height={22} rx={5} fill="#f5c86a" {...stroke} />
      <circle cx={-9} cy={-8} r={4.4} fill="#5c4a3d" />
      <circle cx={9} cy={-8} r={4.4} fill="#5c4a3d" />
      <rect x={-6} y={-96} width={12} height={74} fill="#e8b94f" {...thin} />
      <path d="M -6 -96 L -46 -88 L -46 -82 L -6 -88 Z" fill="#f5c86a" {...thin} />
      <path d="M 6 -96 L 52 -86 L 52 -80 L 6 -88 Z" fill="#f5c86a" {...thin} />
      <path d="M 46 -84 L 46 -44" stroke="#8d8a84" strokeWidth={1.6} />
      <rect x={40} y={-44} width={12} height={8} rx={2} fill="#b9b6ae" {...thin} />
    </g>
  )),
  brick: shapeS('box', '#d98b6a', '#b96a44', 26, 26),
  plank: shapeS('plank', '#d9b06a', '#b98b62', 54, 22),
  block: shapeS('box', '#f5c86a', '#e8b94f', 28, 28),
  sandpile: S(40, 26, 'still', () => (
    <g>
      <path d="M -20 0 C -14 -16 14 -16 20 0 Z" fill="#efdcb6" {...thin} />
      <circle cx={-4} cy={-6} r={1.6} fill="#ddc59b" />
      <circle cx={6} cy={-8} r={1.4} fill="#ddc59b" />
    </g>
  )),
  sandcastle: S(70, 56, 'still', () => (
    <g>
      <path d="M -30 0 L -26 -22 L 26 -22 L 30 0 Z" fill="#efdcb6" {...stroke} />
      <path d="M -12 0 L -10 -34 L 10 -34 L 12 0 Z" fill="#f6e6c8" {...thin} />
      <rect x={-26} y={-28} width={8} height={8} rx={2} fill="#e3cda6" />
      <rect x={18} y={-28} width={8} height={8} rx={2} fill="#e3cda6" />
      <path d="M 0 -34 L 0 -46 M 0 -46 L 12 -42 L 0 -38 Z" stroke="#b98b62" strokeWidth={1.6} fill="#f28b82" />
    </g>
  )),
  /* —— 海底 —— */
  fish: S(38, 26, 'swim', (c) => fish({ body: c.v === 1 ? '#f5c86a' : '#f2a15c', fin: c.v === 1 ? '#e8b04f' : '#e08a4a' })),
  fishb: S(34, 26, 'swim', (c) => fish({ body: c.v === 1 ? '#a8cfe0' : '#f28b82', fin: c.v === 1 ? '#8fc0d6' : '#e0746a', belly: '#fff3e0' })),
  dolphin: S(90, 46, 'swim', () => fish({ body: '#9fc4dd', fin: '#87aecb', belly: '#f0f7fb', long: true })),
  turtle: S(56, 34, 'swim', () => fish({ body: '#a8c9a0', fin: '#8fb489', shell: '#7fa06f' })),
  octopus: S(46, 46, 'float', (c) => blob({ body: c.v === 1 ? '#c9b4e8' : '#f2a1a8', tentacle: c.v === 1 ? '#b199d8' : '#e08a94' })),
  jellyfish: S(40, 54, 'float', () => blob({ body: '#bfe4f2', tentacle: '#a8d4e8', glow: true })),
  coral: S(56, 52, 'still', () => (
    <g>
      {[
        [-14, '#f2a1a8'],
        [0, '#f5c86a'],
        [14, '#c9b4e8'],
      ].map(([dx, col], i) => (
        <path
          key={i}
          d={`M ${dx} 0 C ${dx} -18 ${(dx as number) - 8} -22 ${(dx as number) - 8} -34 M ${dx} -14 C ${(dx as number) + 6} -20 ${(dx as number) + 8} -26 ${(dx as number) + 6} -32`}
          stroke={col as string}
          strokeWidth={6}
          fill="none"
          strokeLinecap="round"
        />
      ))}
    </g>
  )),
  seaweed: S(34, 74, 'sway', () => (
    <g stroke="#6fae8a" strokeWidth={5} fill="none" strokeLinecap="round">
      <path d="M -8 0 C -14 -20 -2 -34 -8 -56" />
      <path d="M 4 0 C 10 -24 -2 -38 4 -64" stroke="#84c39c" />
    </g>
  )),
  bubble: S(20, 20, 'float', () => (
    <g>
      <circle cx={0} cy={-10} r={8} fill="#d9f2fb" opacity={0.55} {...thin} />
      <circle cx={-2.6} cy={-13} r={2.4} fill="#ffffff" opacity={0.85} />
    </g>
  )),
  /* —— 天空 —— */
  boat: S(74, 60, 'float', (c) => boatArt({ body: '#fdf3e0', sail: c.v === 1 ? '#8fc7e8' : '#f28b82' })),
  clouditem: S(80, 44, 'float', () => (
    <g>
      <ellipse cx={-16} cy={-14} rx={18} ry={13} fill="#ffffff" opacity={0.95} />
      <ellipse cx={6} cy={-20} rx={22} ry={16} fill="#ffffff" opacity={0.95} />
      <ellipse cx={22} cy={-12} rx={16} ry={11} fill="#ffffff" opacity={0.95} />
      <ellipse cx={0} cy={-6} rx={28} ry={9} fill="#eef4fa" opacity={0.9} />
    </g>
  )),
  rainbowseeds: shapeS('cluster', '#f5c86a', '#f28b82', 26, 24),
  kite: S(46, 60, 'float', () => (
    <g>
      <path d="M 0 -52 L 22 -26 L 0 0 L -22 -26 Z" fill="#f28b82" {...thin} />
      <path d="M 0 -52 L 0 0 M -22 -26 L 22 -26" stroke="#ffffff" strokeWidth={1.4} opacity={0.7} />
      <path d="M 0 0 C 6 12 -6 16 0 26" stroke="#b9a891" strokeWidth={1.2} fill="none" />
    </g>
  )),

  /* ═════════════ 森林扩展（内容版本 4） ═════════════ */

  /* —— 水生小动物 —— */
  frog: S(48, 38, 'hop', (c) => (
    <g>
      <ellipse cx={-15} cy={-6} rx={10} ry={6.6} fill={c.v === 1 ? '#a8c47f' : '#93bd72'} {...thin} />
      <ellipse cx={15} cy={-6} rx={10} ry={6.6} fill={c.v === 1 ? '#a8c47f' : '#93bd72'} {...thin} />
      <ellipse cx={0} cy={-14} rx={18} ry={13} fill={c.v === 1 ? '#a8c47f' : '#9ccd78'} {...stroke} />
      <ellipse cx={0} cy={-9} rx={11} ry={7} fill="#e8f2cd" opacity={0.85} />
      <circle cx={-8} cy={-26} r={5.6} fill={c.v === 1 ? '#a8c47f' : '#9ccd78'} {...thin} />
      <circle cx={8} cy={-26} r={5.6} fill={c.v === 1 ? '#a8c47f' : '#9ccd78'} {...thin} />
      <circle cx={-8} cy={-27} r={2.4} fill="#3f4a33" />
      <circle cx={8} cy={-27} r={2.4} fill="#3f4a33" />
      <circle cx={-9.2} cy={-28} r={0.8} fill="#ffffff" opacity={0.9} />
      <circle cx={6.8} cy={-28} r={0.8} fill="#ffffff" opacity={0.9} />
      <path d="M -5 -14 q 5 4 10 0" stroke="#5d7a4a" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <ellipse cx={-13} cy={-15} rx={3.2} ry={2} fill="#f2b8bc" opacity={0.45} />
      <ellipse cx={13} cy={-15} rx={3.2} ry={2} fill="#f2b8bc" opacity={0.45} />
    </g>
  )),
  tadpole: S(28, 20, 'swim', (c) => (
    <g>
      <path d="M 4 -8 C 12 -13 20 -9 18 -3 C 14 -6 9 -6 4 -5 Z" fill={c.v === 1 ? '#8aa37c' : '#7d9670'} opacity={0.9} />
      <ellipse cx={-2} cy={-8} rx={8} ry={6.4} fill={c.v === 1 ? '#7f9a72' : '#6f8a63'} {...thin} />
      <circle cx={-5} cy={-10} r={1.7} fill="#2f3b29" />
      <circle cx={-5.4} cy={-10.4} r={0.55} fill="#ffffff" opacity={0.8} />
      <path d="M -8 -5 q 3 2 6 0" stroke="#5b6f50" strokeWidth={1} fill="none" strokeLinecap="round" />
    </g>
  )),

  /* 蛙卵：水里一团透明的卵 */
  frogspawn: S(54, 30, 'still', () => (
    <g>
      <ellipse cx={0} cy={-10} rx={24} ry={12} fill="#dbeef2" opacity={0.55} />
      {[
        [-13, -12],
        [-4, -8],
        [6, -12],
        [14, -7],
        [0, -15],
        [-9, -6],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={4.4} fill="#eaf8fb" opacity={0.85} {...thin} />
          <circle cx={x} cy={y} r={2.1} fill="#6f8a63" opacity={0.9} />
        </g>
      ))}
    </g>
  )),
  /* 幼蛙：尾巴还在，四条腿已经长出来 */
  froglet: S(38, 30, 'hop', (c) => (
    <g>
      <path d="M 12 -8 C 20 -10 24 -6 22 -3 C 18 -6 14 -6 11 -4 Z" fill="#7d9670" opacity={0.85} />
      <ellipse cx={-2} cy={-9} rx={12} ry={8.4} fill={c.v === 1 ? '#a8c47f' : '#9ccd78'} {...stroke} />
      <ellipse cx={-2} cy={-6} rx={7} ry={4.4} fill="#e8f2cd" opacity={0.8} />
      <path d="M -10 -3 L -15 2 M 6 -3 L 11 2" stroke="#7fa864" strokeWidth={2.6} strokeLinecap="round" />
      <circle cx={-7} cy={-16} r={3.6} fill="#9ccd78" {...thin} />
      <circle cx={2} cy={-16} r={3.6} fill="#9ccd78" {...thin} />
      <circle cx={-7} cy={-17} r={1.5} fill="#3f4a33" />
      <circle cx={2} cy={-17} r={1.5} fill="#3f4a33" />
      <path d="M -5 -8 q 4 3 7 0" stroke="#5d7a4a" strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </g>
  )),

  /* —— 成堆的东西：同类合在一起，画面才不碎 —— */
  acornpile: S(46, 30, 'still', (c) => (
    <g>
      {[
        [-13, -12],
        [4, -14],
        [-4, -20],
      ].map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={7.4} ry={8.6} fill={c.v === 1 ? '#d9b06a' : '#a8845c'} {...thin} />
          <path d={`M ${x - 6} ${y - 4} C ${x} ${y - 9} ${x + 6} ${y - 4} ${x + 6} ${y - 3}`} stroke="#8d6238" strokeWidth={2} fill="none" strokeLinecap="round" />
        </g>
      ))}
    </g>
  )),
  pineconepile: S(48, 30, 'still', (c) => (
    <g>
      {[
        [-13, -12, 0.9],
        [4, -13, 0.85],
        [-3, -19, 0.8],
      ].map(([x, y, k], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
          <path d="M 0 -22 C 8 -18 10 -8 0 0 C -10 -8 -8 -18 0 -22 Z" fill={c.v === 1 ? '#c99a6b' : '#b0824f'} {...thin} />
          <path d="M -6 -15 L 6 -15 M -6 -10 L 6 -10" stroke="#8d6238" strokeWidth={1.5} strokeLinecap="round" opacity={0.75} />
        </g>
      ))}
    </g>
  )),
  twigbundle: S(52, 26, 'still', () => (
    <g stroke="#b98b62" fill="none" strokeLinecap="round">
      <path d="M -22 -2 C -8 -7 8 -10 22 -13" strokeWidth={4.2} />
      <path d="M -20 -8 C -6 -12 10 -14 20 -18" strokeWidth={3.2} />
      <path d="M -16 -3 C -2 -9 12 -9 24 -6" strokeWidth={3} />
      <path d="M -14 -6 C -20 -10 -24 -13 -28 -17" strokeWidth={2.4} />
    </g>
  )),
  mushroomclump: S(46, 30, 'still', (c) => (
    <g>
      {[
        [-11, 0, 0.85],
        [6, 0, 1],
        [-2, -4, 0.6],
      ].map(([x, y, k], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${k})`}>
          <path d="M -3 0 L -3 -7 L 3 -7 L 3 0 Z" fill="#fdf2e3" {...thin} />
          <path d="M -13 -7 C -13 -16 13 -16 13 -7 Z" fill={c.v === 1 ? '#e8a45f' : '#e8837a'} {...thin} />
          <circle cx={-4} cy={-11} r={1.6} fill="#fdf2e3" opacity={0.9} />
          <circle cx={4} cy={-12} r={1.2} fill="#fdf2e3" opacity={0.9} />
        </g>
      ))}
    </g>
  )),

  /* —— 昆虫 —— */
  bee: S(30, 26, 'float', () => (
    <g>
      <g className="v3-wing" style={{ transformOrigin: '0px -14px' }}>
        <ellipse cx={-3} cy={-18} rx={6.4} ry={4.2} fill="#eaf6fd" opacity={0.9} transform="rotate(-22 -3 -18)" {...thin} />
        <ellipse cx={3} cy={-18} rx={5.6} ry={3.8} fill="#eaf6fd" opacity={0.85} transform="rotate(18 3 -18)" {...thin} />
      </g>
      <ellipse cx={0} cy={-10} rx={7.2} ry={5.6} fill="#f5c85c" {...thin} />
      <path d="M -3 -15 L -3 -5 M 2 -15 L 2 -5" stroke="#4a3a2a" strokeWidth={2} strokeLinecap="round" />
      <circle cx={6.6} cy={-11} r={1.6} fill="#3f3630" />
      <path d="M -7 -11 L -11 -13 M -7 -9 L -11 -8" stroke="#4a3a2a" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  )),
  ant: S(26, 22, 'crawl', (c) => (
    <g>
      <path d="M -3 -4 L -6 1 M 1 -4 L 3 1 M -8 -4 L -10 1" stroke="#5a4231" strokeWidth={1.5} strokeLinecap="round" />
      <ellipse cx={-7} cy={-6} rx={4.6} ry={3.8} fill="#6b4f3a" {...thin} />
      <circle cx={0} cy={-7} r={3} fill="#7a5b42" />
      <circle cx={6} cy={-9} r={3.4} fill="#6b4f3a" {...thin} />
      <circle cx={7.4} cy={-10} r={0.9} fill="#2f2723" />
      <path d="M 6 -12 C 9 -16 12 -17 14 -17" stroke="#6b4f3a" strokeWidth={1.2} fill="none" strokeLinecap="round" />
      {c.f && (
        <g>
          <circle cx={1} cy={-14} r={4.2} fill="#f2d08a" {...thin} />
          <circle cx={-0.4} cy={-15} r={1.2} fill="#e8b877" />
        </g>
      )}
    </g>
  )),
  spider: S(36, 32, 'still', () => (
    <g>
      <g stroke="#5b4a3f" strokeWidth={1.6} fill="none" strokeLinecap="round">
        <path d="M -4 -13 C -12 -17 -15 -11 -13 -6" />
        <path d="M -4 -11 C -13 -13 -16 -6 -14 -2" />
        <path d="M -3 -9 C -12 -9 -14 -2 -12 1" />
        <path d="M -3 -7 C -10 -5 -11 1 -9 3" />
        <path d="M 4 -13 C 12 -17 15 -11 13 -6" />
        <path d="M 4 -11 C 13 -13 16 -6 14 -2" />
        <path d="M 3 -9 C 12 -9 14 -2 12 1" />
        <path d="M 3 -7 C 10 -5 11 1 9 3" />
      </g>
      <ellipse cx={0} cy={-11} rx={6} ry={6.6} fill="#6b574a" {...thin} />
      <circle cx={0} cy={-19} r={3.8} fill="#7d6858" {...thin} />
      <circle cx={-1.5} cy={-20} r={1.1} fill="#2f2723" />
      <circle cx={1.5} cy={-20} r={1.1} fill="#2f2723" />
    </g>
  )),
  web: S(140, 120, 'still', () => (
    <g stroke="#e8eef2" strokeWidth={1.2} fill="none" opacity={0.75}>
      {[16, 30, 46, 62].map((r, i) => (
        <ellipse key={i} cx={0} cy={-60} rx={r} ry={r * 0.86} />
      ))}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (Math.PI / 4) * i;
        return <path key={i} d={`M 0 -60 L ${Math.cos(a) * 68} ${-60 + Math.sin(a) * 58}`} />;
      })}
    </g>
  )),

  /* —— 森林里的小物件 —— */
  pinecone: S(26, 30, 'still', (c) => (
    <g>
      <path d="M 0 -26 C 9 -22 11 -10 0 -2 C -11 -10 -9 -22 0 -26 Z" fill={c.v === 1 ? '#c99a6b' : '#b0824f'} {...stroke} />
      <path d="M -7 -19 L 7 -19 M -8 -13 L 8 -13 M -6 -7 L 6 -7" stroke="#8d6238" strokeWidth={1.7} strokeLinecap="round" opacity={0.8} />
      <path d="M 0 -26 C -2 -30 2 -31 3 -28" stroke="#8d6238" strokeWidth={1.6} fill="none" strokeLinecap="round" />
    </g>
  )),
  twig: S(46, 20, 'still', () => (
    <g stroke="#b98b62" fill="none" strokeLinecap="round">
      <path d="M -20 -2 C -8 -6 6 -11 19 -15" strokeWidth={4.4} />
      <path d="M 0 -7 C 4 -13 8 -16 13 -18" strokeWidth={2.8} />
      <path d="M -9 -4 C -14 -8 -17 -11 -20 -14" strokeWidth={2.6} />
    </g>
  )),
  leaf: S(28, 18, 'still', (c) => (
    <g>
      <path
        d="M -11 -1 C -14 -10 -1 -17 10 -13 C 13 -5 2 2 -11 -1 Z"
        fill={['#8cc47a', '#e0a35f', '#c9d68a'][c.v % 3]}
        {...thin}
      />
      <path d="M -8 -3 C -2 -6 4 -9 8 -11" stroke="#6fa961" strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </g>
  )),
  leafpile: S(52, 26, 'still', () => (
    <g>
      <ellipse cx={0} cy={-6} rx={22} ry={8} fill="#c9a06a" opacity={0.35} />
      {[
        [-14, -8, '#e0a35f'],
        [-4, -12, '#c9834a'],
        [8, -10, '#e8b95f'],
        [16, -6, '#c9834a'],
        [0, -5, '#d9a35f'],
        [-8, -6, '#e0a35f'],
      ].map(([x, y, col], i) => (
        <path
          key={i}
          d={`M ${x} ${y} C ${(x as number) - 8} ${(y as number) - 6} ${(x as number) + 2} ${(y as number) - 11} ${(x as number) + 9} ${(y as number) - 5} C ${(x as number) + 4} ${(y as number) + 1} ${(x as number) - 4} ${(y as number) + 1} ${x} ${y} Z`}
          fill={col as string}
          {...thin}
        />
      ))}
    </g>
  )),
  basket: S(40, 34, 'still', (c) => (
    <g>
      <path d="M -16 -2 L -12 -21 L 12 -21 L 16 -2 Z" fill="#d9b07a" {...stroke} />
      <path d="M -13 -9 L 13 -9 M -14 -15 L 14 -15" stroke="#b98b62" strokeWidth={1.5} />
      <path d="M -11 -21 C -7 -30 7 -30 11 -21" stroke="#b98b62" strokeWidth={2.6} fill="none" strokeLinecap="round" />
      {c.v === 1 && <circle cx={-3} cy={-24} r={5} fill="#e8837a" {...thin} />}
      {c.v === 2 && <circle cx={-3} cy={-24} r={5} fill="#f2d08a" {...thin} />}
    </g>
  )),
  firepit: S(58, 26, 'still', () => (
    <g>
      {[-20, -8, 5, 18].map((x, i) => (
        <ellipse key={i} cx={x} cy={-6} rx={8.6} ry={6.4} fill={i % 2 ? '#b9b6ae' : '#c9c6bd'} {...thin} />
      ))}
      <ellipse cx={0} cy={-5} rx={13} ry={6} fill="#8d7a62" opacity={0.65} />
      <path d="M -8 -8 L 8 -12 M -8 -12 L 8 -8" stroke="#a8814f" strokeWidth={3.4} strokeLinecap="round" />
    </g>
  )),
  campfire: S(48, 44, 'still', () => (
    <g>
      <path d="M -17 -5 L 17 -11 M -17 -11 L 17 -5" stroke="#a8814f" strokeWidth={5} strokeLinecap="round" />
      <g className="v3-flame">
        <path d="M 0 -8 C -7 -16 -2 -25 0 -32 C 3 -23 7 -16 0 -8 Z" fill="#f5c85c" opacity={0.95} />
        <path d="M 0 -10 C -3.6 -16 -1 -21 0 -26 C 1.4 -20 3.6 -15 0 -10 Z" fill="#f28b52" />
      </g>
      <circle cx={0} cy={-14} r={20} fill="#ffd47a" opacity={0.16} filter="url(#softGlow)" />
    </g>
  )),
  anthill: S(70, 40, 'still', (c) => (
    <g>
      <path d="M -33 0 C -26 -27 -10 -38 0 -38 C 12 -38 27 -27 33 0 Z" fill={c.v === 1 ? '#b08c62' : '#a8845c'} {...stroke} />
      <ellipse cx={0} cy={-17} rx={7.5} ry={5.4} fill="#6b4f3a" />
      <path d="M -21 -16 L -9 -22 M 12 -20 L 23 -15" stroke="#8d6f52" strokeWidth={1.4} strokeLinecap="round" />
      <path d="M -28 -4 C -20 -8 -14 -6 -10 -4" stroke="#8d6f52" strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </g>
  )),
  burrowdoor: S(84, 78, 'still', (c) => (
    <g>
      <path d="M -40 0 C -36 -46 -19 -64 0 -64 C 19 -64 36 -46 40 0 Z" fill={c.v === 1 ? '#a8c68a' : '#9fbf7d'} {...stroke} />
      <ellipse cx={0} cy={-2} rx={40} ry={7} fill="#8fbd7d" opacity={0.5} />
      <ellipse cx={0} cy={-24} rx={17} ry={19} fill="#6b4f3a" {...thin} />
      <ellipse cx={0} cy={-23} rx={12} ry={14} fill="#4a3527" />
      <path d="M 17 -8 L 17 -40" stroke="#b98b62" strokeWidth={3.4} strokeLinecap="round" />
      <path d="M -15 -6 L 15 -6 L 15 -2 L -15 -2 Z" fill="#c9a06a" {...thin} />
      <path d="M -30 -34 C -20 -48 -8 -54 4 -54" stroke="#8cc47a" strokeWidth={3} fill="none" opacity={0.65} strokeLinecap="round" />
    </g>
  )),
  treehole: S(46, 58, 'still', () => (
    <g>
      <ellipse cx={0} cy={-26} rx={21} ry={27} fill="#6d4f38" {...thin} />
      <ellipse cx={0} cy={-24} rx={14} ry={19} fill="#43301f" />
      <path d="M -15 -37 C -7 -46 7 -46 13 -37" stroke="#8a6647" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <path d="M -19 -14 C -22 -22 -21 -30 -18 -34" stroke="#8a6647" strokeWidth={2} fill="none" strokeLinecap="round" />
    </g>
  )),
  treehollow: S(64, 68, 'still', (c) => (
    <g>
      <ellipse cx={0} cy={-32} rx={29} ry={34} fill="#6d4f38" {...thin} />
      <ellipse cx={0} cy={-30} rx={21} ry={27} fill="#3f2d1e" />
      {c.f && (
        <g transform="translate(0 -26)">
          <circle cx={0} cy={0} r={9} fill="#d99a63" {...thin} />
          <path d="M -6 -7 L -4 -14 L 0 -8 Z" fill="#c4854f" {...thin} />
          <path d="M 6 -7 L 4 -14 L 0 -8 Z" fill="#c4854f" {...thin} />
          <circle cx={-3} cy={-1} r={1.5} fill="#3f3630" />
          <circle cx={3} cy={-1} r={1.5} fill="#3f3630" />
          <ellipse cx={0} cy={3} rx={1.8} ry={1.4} fill="#c98a94" />
        </g>
      )}
      <path d="M -22 -50 C -12 -62 12 -62 22 -50" stroke="#8a6647" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    </g>
  )),
  nest: S(100, 46, 'still', (c) => (
    <g>
      <ellipse cx={0} cy={-9} rx={46} ry={16} fill="#b9925f" {...stroke} />
      <ellipse cx={0} cy={-18} rx={40} ry={13} fill="#d9b07a" />
      <ellipse cx={0} cy={-20} rx={30} ry={8} fill="#efd6ae" />
      {Array.from({ length: 9 }, (_, i) => (
        <path
          key={i}
          d={`M ${-40 + i * 10} ${-6 - (i % 3) * 3} C ${-34 + i * 10} ${-16 - (i % 2) * 4} ${-24 + i * 10} ${-14 - (i % 3) * 2} ${-18 + i * 10} ${-6 - (i % 2) * 2}`}
          stroke="#9c714c"
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
          opacity={0.55}
        />
      ))}
      {c.st > 0 &&
        [1, 2, 3].slice(0, c.st).map((n) => (
          <path
            key={n}
            d={`M ${-34 + n * 12} -22 L ${-26 + n * 12} -32 L ${-18 + n * 12} -22`}
            stroke="#b98b62"
            strokeWidth={3}
            fill="none"
            strokeLinecap="round"
          />
        ))}
    </g>
  )),
  root: S(72, 64, 'still', (c) => (
    <g stroke={c.v === 1 ? '#b98b62' : '#a8814f'} fill="none" strokeLinecap="round">
      <path d="M 0 0 C -4 -20 -2 -34 3 -48" strokeWidth={8} />
      <path d="M 0 -18 C -14 -26 -24 -30 -31 -42" strokeWidth={5.4} />
      <path d="M 2 -30 C 14 -38 22 -40 31 -48" strokeWidth={5} />
      <path d="M -2 -8 C -12 -10 -18 -14 -22 -20" strokeWidth={4.4} />
      <path d="M 1 -40 C -6 -46 -10 -50 -12 -56" strokeWidth={3.4} />
    </g>
  )),
  worm: S(48, 24, 'crawl', (c) => (
    <g>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <circle
          key={i}
          cx={-16 + i * 6.4}
          cy={-6 - Math.sin(i * 0.9) * 2.4}
          r={5 - i * 0.28}
          fill={c.v === 1 ? '#e8b8b0' : '#e0a89e'}
          {...thin}
        />
      ))}
      <circle cx={-15} cy={-8} r={1.2} fill="#4d3f36" />
      <path d="M -19 -4 q 3 2 5 0" stroke="#a8796f" strokeWidth={1} fill="none" strokeLinecap="round" />
    </g>
  )),
  ladder: S(34, 94, 'still', () => (
    <g>
      <path d="M -11 0 L -11 -90 M 11 0 L 11 -90" stroke="#c9a06a" strokeWidth={5} strokeLinecap="round" />
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M -11 ${-14 - i * 18} L 11 ${-14 - i * 18}`} stroke="#b98b62" strokeWidth={4} strokeLinecap="round" />
      ))}
    </g>
  )),
};

export function spriteOf(type: string): SpriteSpec {
  return SPRITES[type] ?? shapeS('round', '#b9b6ae', '#e8e6df', 26, 26);
}
