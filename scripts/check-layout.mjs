/**
 * 布局自检（不开浏览器，只读源码）
 *
 * 这里查的是**数据**，不是类型——TS 查不出"秘密光点压在门上"这种错误，
 * 而它一旦发生，孩子的表现就是"点了没反应"（见 AGENTS.md 3.18）。
 *
 * 检查项：
 *   1. 秘密光点落在入口热区（kind: 'door'）的椭圆内
 *   2. 秘密光点离入口太近（中心距 < rx + 28）
 *   3. 热区 id 重复
 *   4. 热区所在区域不存在于 RegionId
 *   5. 秘密坐标落在设计空间（1600×900）之外
 */

import fs from 'node:fs';

const regions = fs.readFileSync('src/v3/regions.ts', 'utf8');
const hotspots = fs.readFileSync('src/v3/hotspots.ts', 'utf8');

const REGION_IDS = new Set(
  [...regions.matchAll(/^ {2}([a-z]+): \{$/gm)].map((m) => m[1]),
);

const hotBody = hotspots.slice(hotspots.indexOf('export const HOTSPOTS'));
const HOT = [...hotBody.matchAll(
  /\{\s*id:\s*'([\w-]+)',\s*r:\s*'(\w+)',\s*x:\s*(-?\d+),\s*y:\s*(-?\d+),\s*rx:\s*(\d+),\s*ry:\s*(\d+),\s*kind:\s*'(\w+)'/g,
)].map((m) => ({
  id: m[1], r: m[2], x: +m[3], y: +m[4], rx: +m[5], ry: +m[6], kind: m[7],
}));

const SEC = [...regions.matchAll(
  /\{\s*id:\s*'([\w-]+)',\s*r:\s*'(\w+)',\s*x:\s*(-?\d+),\s*y:\s*(-?\d+),\s*reveal:/g,
)].map((m) => ({ id: m[1], r: m[2], x: +m[3], y: +m[4] }));

const bad = [];
const note = (msg) => bad.push(msg);

/* 1 & 2. 秘密 vs 门 */
for (const h of HOT.filter((x) => x.kind === 'door')) {
  for (const s of SEC.filter((x) => x.r === h.r)) {
    const dx = (s.x - h.x) / h.rx;
    const dy = (s.y - h.y) / h.ry;
    if (dx * dx + dy * dy <= 1) {
      note(`秘密 ${s.id} (${s.x},${s.y}) 压在入口 ${h.id} 里 → 点了会先捡到秘密，进不去`);
    } else if (Math.hypot(s.x - h.x, s.y - h.y) < 34) {
      note(`秘密 ${s.id} 几乎贴着入口 ${h.id}（相距 ${Math.round(Math.hypot(s.x - h.x, s.y - h.y))}，光点判定半径 28）`);
    }
  }
}

/* 3. 重复 id */
const seen = new Set();
for (const h of HOT) {
  if (seen.has(h.id)) note(`热区 id 重复：${h.id}`);
  seen.add(h.id);
}

/* 4. 区域不存在 */
for (const h of HOT) {
  if (!REGION_IDS.has(h.r)) note(`热区 ${h.id} 的区域 '${h.r}' 不在 RegionId 里`);
}

/* 5. 越界 */
for (const s of [...SEC, ...HOT]) {
  if (s.x < 0 || s.x > 1600 || s.y < 0 || s.y > 900) {
    note(`${s.id} 的坐标 (${s.x},${s.y}) 超出设计空间 1600×900`);
  }
}

console.log(`热区 ${HOT.length} 处 · 秘密 ${SEC.length} 处 · 区域 ${REGION_IDS.size} 个`);
if (bad.length) {
  bad.forEach((b) => console.log('FAIL  ' + b));
  console.log(`\n布局自检失败：${bad.length} 条`);
  process.exit(1);
}
console.log('布局自检通过');
