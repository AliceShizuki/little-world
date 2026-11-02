/**
 * 森林区域验收测试
 *
 * 每一项都在真实浏览器里点 / 拖，然后读存档或读 DOM 验证结果。
 * 不做"代码里有没有这段"的检查——那种检查骗过人一次（植物灰球事件）。
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

fs.mkdirSync('.shots', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1440, height: 810 },
});
const page = await browser.newPage();
const errs = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text());
});
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = async () => {
  await sleep(420);
  return page.evaluate(() => JSON.parse(localStorage.getItem('little-world.v3') || '{}'));
};
const TAG = () => 'mut-' + Math.random().toString(36).slice(2, 8);

/**
 * 各时段的起点（一天的进度 0..1）。
 * 昼夜是时钟推的：只写 phase 下一拍就会被改回去，所以顺手把 clock 拨到该时段开头。
 */
const PHASE_START = { dawn: 0.005, day: 0.105, sunset: 0.505, night: 0.605 };

/**
 * 写存档：写盘与刷新必须在同一次 evaluate 里，并且写一个随机标记到 eco.log，
 * 刷新后核对标记还在——否则应用那一拍自动存档会把写入盖掉（见 AGENTS.md 3.16）。
 */
const patch = async (p, tries = 3) => {
  for (let i = 0; i < tries; i += 1) {
    const tag = TAG();
    await page.evaluate(
      ([pp, t, starts]) => {
        const cur = JSON.parse(localStorage.getItem('little-world.v3') || '{}');
        const next = { ...cur, ...pp };
        next.eco = { ...(next.eco || {}) };
        next.eco.clock = starts[pp.phase || cur.phase || 'day'] ?? 0.105;
        next.eco.log = [...(next.eco.log || []), t];
        localStorage.setItem('little-world.v3', JSON.stringify(next));
        location.reload();
      },
      [p, tag, PHASE_START],
    );
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(1400);
    const got = await page.evaluate(() => JSON.parse(localStorage.getItem('little-world.v3') || '{}'));
    if ((got.eco?.log || []).includes(tag)) return;
  }
};
const toScreen = (x, y) =>
  page.evaluate(
    (dx, dy) => {
      const svg = document.querySelector('.v3-stage');
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = dx;
      pt.y = dy;
      const p = pt.matrixTransform(svg.getScreenCTM());
      return { x: p.x, y: p.y };
    },
    x,
    y,
  );
const hitPoint = (sel) =>
  page.evaluate((s) => {
    const g = document.querySelector(s);
    if (!g) return null;
    const r = g.getBoundingClientRect();
    const cands = [
      [0.5, 0.6], [0.5, 0.4], [0.5, 0.8], [0.35, 0.6], [0.65, 0.6], [0.5, 0.25], [0.5, 0.92],
    ];
    for (const [fx, fy] of cands) {
      const x = r.x + r.width * fx;
      const y = r.y + r.height * fy;
      const el = document.elementFromPoint(x, y);
      if (el && g.contains(el)) return { x, y };
    }
    return null;
  }, sel);
const clickEnt = async (sel) => {
  const id = /data-id="([^"]+)"/.exec(sel)?.[1];
  const ent = id ? await entOf(id) : null;
  const pt = ent ? await toScreen(ent.x, ent.y - 6) : await hitPoint(sel);
  if (!pt) return false;
  await page.mouse.click(pt.x, pt.y);
  await sleep(200);
  return true;
};
/**
 * 点一个入口，直到真的进/出成功。
 *
 * 有没有进去看界面左上角那颗写着区域名的药丸——读存档要等应用那一拍写盘，
 * 偶尔会读到上一拍。选择器必须带 aria-label：里层空间顶栏会多一个「回去」按钮，
 * 它也是 .v3-chip 且排在前面。
 */
const NAME_CHIP = '.v3-chip[aria-label="打开世界地图"] span';
const chipName = () =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : '';
  }, NAME_CHIP);
/** 点某个实体、期望进到另一个空间（树上 / 地下）。用 DOM 的实际框，点不准就重来 */
const enterById = async (type, want, tries = 3) => {
  for (let i = 0; i < tries; i += 1) {
    const el = await page.$(`.v3-ent[data-t="${type}"]`);
    const b = el ? await el.boundingBox() : null;
    if (!b) {
      await sleep(400);
      continue;
    }
    await page.mouse.click(b.x + b.width / 2, b.y + b.height * 0.6);
    await sleep(950);
    if ((await chipName()) === want) return true;
  }
  return false;
};
const design = (x, y) =>
  page.evaluate(
    (dx, dy) => {
      const svg = document.querySelector('.v3-stage');
      const pt = svg.createSVGPoint();
      pt.x = dx;
      pt.y = dy;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return { x: p.x, y: p.y };
    },
    x,
    y,
  );
const dragId = async (id, tx, ty) => {
  const sel = `.v3-ent[data-id="${id}"]`;
  const ent = await entOf(id);
  if (!ent) return false;
  // 抓在物体底部往上一点——和舞台的命中测试用同一套设计坐标
  const pt = await toScreen(ent.x, ent.y - 6);
  const t = await toScreen(tx, ty + 6);
  await page.mouse.move(pt.x, pt.y);
  await page.mouse.down();
  for (let i = 1; i <= 14; i += 1) {
    await page.mouse.move(pt.x + ((t.x - pt.x) * i) / 14, pt.y + ((t.y - pt.y) * i) / 14);
    await sleep(10);
  }
  await sleep(120);
  await page.mouse.up();
  await sleep(380);
  return true;
};
/**
 * 拖过去以后还要核对落点，没到就再拖一次。
 *
 * 掉在画面边缘的东西（摇树摇下来的树枝常常停在最右边）换算到屏幕后可能已经在
 * 视口之外，鼠标点在旁边就什么也没抓起来——后面"合成"自然也测不到。
 */
const dragTo = async (id, tx, ty, tol = 70, tries = 3) => {
  for (let i = 0; i < tries; i += 1) {
    await dragId(id, tx, ty);
    const now = await entOf(id);
    if (!now) return true; // 被合成掉了，也算到位
    if (Math.hypot(now.x - tx, now.y - ty) < tol) return true;
  }
  return false;
};
const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
const entOf = async (id) => (await save()).ents.find((e) => e.id === id) || null;
const byType = async (t) => {
  const snap = await save();
  return snap.ents.filter((e) => e.t === t && e.r === snap.region);
};

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1800);
await page.evaluate(() => {
  const st = document.createElement('style');
  st.textContent = '.hint,.v3-bag{display:none!important}';
  document.head.appendChild(st);
});

const st0 = await save();
check('森林实体 ≥ 40 件', st0.ents.filter((e) => e.r === 'forest').length >= 40, `${st0.ents.filter((e) => e.r === 'forest').length} 件`);
check('内容版本 seedRev=6（老存档会补注入）', st0.seedRev === 6, `seedRev=${st0.seedRev}`);

/* ── 1. 点水面：涟漪 ── */
const before = await count('.v3-fx-water');
const wpt = await toScreen(700, 820);
await page.mouse.click(wpt.x, wpt.y);
await sleep(160);
const after = await count('.v3-fx-water');
check('点击水面出现涟漪', after > before, `${before} → ${after}`);

/* ── 2. 摇树：落叶 + 掉落果实 ── */
const acornBefore = (await byType('acorn')).length;
const tpt = await toScreen(432, 404);
let leaves = 0;
for (let i = 0; i < 6; i += 1) {
  await page.mouse.click(tpt.x, tpt.y);
  await sleep(150);
  leaves = Math.max(leaves, await count('.v3-fx-leaf'));
}
await sleep(500);
// 松鼠会立刻把橡果搬走，所以看"新掉下来的"更可靠
const dropped = (await save()).ents.filter((e) => e.r === 'forest' && e.id.startsWith('n-') && (e.t === 'acorn' || e.t === 'leaf'));
const acornAfter = (await byType('acorn')).length;
check('摇大树出现落叶', leaves > 0, `落叶特效 ${leaves}`);
check(
  '连续摇树会掉下橡果或叶子',
  acornAfter > acornBefore || dropped.length > 0,
  `橡果 ${acornBefore} → ${acornAfter}，新掉落 ${dropped.length} 件`,
);

/* ── 3. 点石头：底下有瓢虫 ── */
const rock = (await save()).ents.find((e) => e.t === 'rock' && e.r === 'forest');
const ladyBefore = (await byType('ladybug')).length;
if (rock) await clickEnt(`.v3-ent[data-id="${rock.id}"]`);
await sleep(300);
const ladyAfter = (await byType('ladybug')).length;
check('点石头会翻出瓢虫', ladyAfter > ladyBefore, `${ladyBefore} → ${ladyAfter}`);

/* ── 4. 点花：花粉 ── */
const flower = (await save()).ents.find((e) => e.t === 'flower' && e.r === 'forest');
let pollen = 0;
if (flower) {
  // 花茎细，命中区小；旁边的草叶偶尔会先被命中——换个高度再点两次
  for (let attempt = 0; attempt < 3 && pollen === 0; attempt += 1) {
    await clickEnt(`.v3-ent[data-id="${flower.id}"]`);
    pollen = await count('.v3-fx-pollen');
    if (pollen === 0) await sleep(200);
  }
}
check('点花开出花粉', pollen > 0, `花粉 ${pollen}`);

/* ── 5. 摇树取枝条 → 树枝 + 树枝 → 落叶堆 ── */
// 树枝在画面里收成了一捆（不然太碎），要拿单根得先摇树
const shakeFor = async (sx, sy, type, want = 2, tries = 22) => {
  let found = [];
  for (let i = 0; i < tries && found.length < want; i += 1) {
    const pt = await toScreen(sx, sy);
    await page.mouse.click(pt.x, pt.y);
    await sleep(260);
    found = (await save()).ents.filter((e) => e.t === type && e.r === 'forest' && e.id.startsWith('n-'));
  }
  return found;
};
// 摇树掉什么是随机的，偶尔只掉一根；不够两根就再摇一轮
let twigs = await shakeFor(1440, 500, 'twig', 3);
for (let extra = 0; extra < 2 && twigs.length < 2; extra += 1) {
  twigs = await shakeFor(1440, 500, 'twig', 3);
}
if (twigs.length >= 2) {
  // 两根叠在一起会互相抢命中，先把它们分开摆到画面中间的空地上；
  // 留在摇树那个角落会因为太靠边而点不中
  await dragTo(twigs[0].id, 760, 742);
  await dragTo(twigs[1].id, 880, 742);
  const a = (await save()).ents.find((e) => e.id === twigs[0].id);
  const b = (await save()).ents.find((e) => e.id === twigs[1].id);
  if (a && b) await dragTo(a.id, b.x, b.y - 8, 60);
  const made = (await save()).ents.find((e) => e.t === 'leafpile' && e.r === 'forest' && e.id.startsWith('made-'));
  check('树枝 + 树枝 → 落叶堆', !!made, made ? '' : `未合成，树枝在 ${a ? Math.round(a.x) + ',' + Math.round(a.y) : '?'} / ${b ? Math.round(b.x) + ',' + Math.round(b.y) : '?'}`);
} else {
  check('树枝 + 树枝 → 落叶堆', false, `只摇到 ${twigs.length} 根树枝`);
}

/* ── 6. 树枝 + 火堆 → 篝火 ── */
const pit = (await save()).ents.find((e) => e.id === 'amb-f-firepit');
const twigNow = (await save()).ents.find((e) => e.t === 'twig' && e.r === 'forest');
if (twigNow && pit) {
  await dragTo(twigNow.id, pit.x, pit.y - 6, 60);
  const st = await save();
  const fire = st.ents.find((e) => e.t === 'campfire');
  const tw = st.ents.find((e) => e.id === twigNow.id);
  const near = st.ents
    .filter((e) => e.r === 'forest' && Math.abs(e.x - pit.x) < 70)
    .map((e) => `${e.t}@${Math.round(e.x)},${Math.round(e.y)}`)
    .join(' ');
  check(
    '树枝 + 火堆 → 篝火（只是视觉）',
    !!fire,
    fire ? '' : `树枝${tw ? `落在 ${Math.round(tw.x)},${Math.round(tw.y)}` : '没了'}，火堆在 ${pit.x},${pit.y}；附近 ${near}`,
  );
} else {
  check('树枝 + 火堆 → 篝火（只是视觉）', false, '缺树枝或火堆');
}

/* ── 7. 蘑菇 + 篮子（蘑菇只在雨天冒出来） ── */
await patch({ weather: 'rain' });
const shroom = (await save()).ents.find((e) => e.t === 'mushroom' && e.r === 'forest' && e.id === 'amb-f-shroom1');
const basket = (await save()).ents.find((e) => e.id === 'amb-f-basket');
if (shroom && basket) {
  // 蘑菇旁边常落着叶子/草籽，拖拽起点偶尔被它们抢走——重试到拿起为止
  let snap = await save();
  let bunched = snap.ents.find((e) => e.t === 'basket' && e.v === 1);
  for (let attempt = 0; attempt < 3 && !bunched; attempt += 1) {
    const moved = await dragId(shroom.id, basket.x, basket.y - 6);
    if (!moved) break;
    snap = await save();
    bunched = snap.ents.find((e) => e.t === 'basket' && e.v === 1);
  }
  const allBasket = snap.ents
    .filter((e) => e.t === 'basket')
    .map((e) => `${e.id}@${Math.round(e.x)},${Math.round(e.y)} v=${e.v ?? '-'}`)
    .join(' ');
  const shroomNow = snap.ents.find((e) => e.id === shroom.id);
  check(
    '蘑菇 + 篮子 → 篮子装满',
    !!bunched,
    bunched ? 'v=1' : `篮子们 ${allBasket}；蘑菇${shroomNow ? `还在 ${Math.round(shroomNow.x)},${Math.round(shroomNow.y)}` : '没了'}`,
  );
} else {
  check('蘑菇 + 篮子 → 篮子装满', false, '缺蘑菇或篮子');
}
await patch({ weather: 'clear' });

/* ── 8. 种子拖到泥地 → 种下 ── */
const seed = (await save()).ents.find((e) => e.t === 'seed' && e.r === 'forest');
if (!seed) console.log('  · 种子不见了，森林现有：', (await save()).ents.filter((e) => e.r === 'forest').map((e) => e.t).join(','));
let planted = null;
if (seed) {
  await dragId(seed.id, 782, 726);
  const after = await save();
  planted = after.ents.find(
    (e) => e.t === 'plant' && Math.abs(e.x - 782) < 40 && Math.abs(e.y - 726) < 60,
  );
}
check('种子拖到泥地会长成土坑', !!planted, planted ? `t=${planted.t} st=${planted.st}` : '没找到');

/* ── 9. 树洞 → 树上；树枝 + 鸟巢 → 更满 ── */
if (!(await page.$('.v3-ent[data-t="treehole"]'))) await patch({ region: 'forest' });
await enterById('treehole', '树上');
let s = await save();
check('点树洞进入树上', s.region === 'canopy', `界面=${await chipName()} region=${s.region}`);
const nest0 = s.ents.find((e) => e.id === 'c-nest');
const twc = s.ents.find((e) => e.id === 'c-twig1');
if (nest0 && twc) {
  await dragId(twc.id, nest0.x, nest0.y - 10);
  const nest1 = (await save()).ents.find((e) => e.id === 'c-nest' || (e.t === 'nest' && (e.st ?? 0) > 0));
  check('树枝放进鸟巢，鸟巢更满', !!nest1 && (nest1.st ?? 0) >= 1, `st=${nest1 && nest1.st}`);
} else {
  check('树枝放进鸟巢，鸟巢更满', false, '缺鸟巢或树枝');
}
await enterById('treehole', '森林');
check('从树上点树洞回到森林', (await save()).region === 'forest', `界面=${await chipName()} region=${(await save()).region}`);

/* ── 10. 兔子洞 → 地下；梯子回森林 ── */
await enterById('burrowdoor', '地下');
s = await save();
const ants = s.ents.filter((e) => e.t === 'ant' && e.r === 'burrow').length;
check('点兔子洞进入地下', s.region === 'burrow', `界面=${await chipName()} region=${s.region}`);
check('地下有蚂蚁与蚯蚓', ants >= 3 && s.ents.some((e) => e.t === 'worm' && e.r === 'burrow'), `${ants} 只蚂蚁`);
await page.screenshot({ path: '.shots/t-burrow.png' });
await enterById('ladder', '森林');
check('从地下点梯子回到森林', (await save()).region === 'forest', `界面=${await chipName()} region=${(await save()).region}`);

/* ── 11. 蛙卵 → 蝌蚪 → 幼蛙 → 青蛙（三段生命周期一次验完） ── */
await patch({ region: 'forest', weather: 'clear' });
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('little-world.v3'));
  s.eco.speed = 1;
  s.ents = s.ents.filter((e) => !e.id.startsWith('test-life'));
  s.ents.push({ id: 'test-life-egg', t: 'frogspawn', r: 'forest', x: 878, y: 812, st: 2, age: 0.94, fixed: true, s: 1.2 });
  s.ents.push({ id: 'test-life-tad', t: 'tadpole', r: 'forest', x: 906, y: 806, st: 2, age: 0.94, fixed: true, s: 1.2 });
  s.ents.push({ id: 'test-life-froglet', t: 'froglet', r: 'forest', x: 934, y: 810, st: 2, age: 0.94, fixed: true, s: 1.2 });
  localStorage.setItem('little-world.v3', JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle0' });
await sleep(2200);
const life = await save();
const at = (id) => life.ents.find((e) => e.id === id);
check('蛙卵孵化成蝌蚪', at('test-life-egg')?.t === 'tadpole', `t=${at('test-life-egg')?.t}`);
check('蝌蚪长出腿变成幼蛙', at('test-life-tad')?.t === 'froglet', `t=${at('test-life-tad')?.t}`);
check('幼蛙尾巴消失变成青蛙', at('test-life-froglet')?.t === 'frog', `t=${at('test-life-froglet')?.t}`);

/* ── 12. 石头拖进水里：留在水里（不再被吸回岸上） ── */
const rock2 = (await save()).ents.filter((e) => e.t === 'rock' && e.r === 'forest').pop();
let inWater = false;
if (rock2) {
  await dragId(rock2.id, 1000, 820);
  const r2 = await entOf(rock2.id);
  inWater = !!r2 && r2.y >= 786 && r2.y <= 856;
  check('石头拖进溪流会留在水里', inWater, r2 ? `y=${Math.round(r2.y)}` : '');
} else {
  check('石头拖进溪流会留在水里', false, '没有石头');
}

/* ── 13. 夜晚：萤火虫出现、蝴蝶退场 ── */
await patch({ region: 'forest', phase: 'night' });
const nightCnt = await page.evaluate(() => ({
  firefly: document.querySelectorAll('.v3-ent[data-t="firefly"]').length,
  butterfly: document.querySelectorAll('.v3-ent[data-t="butterfly"]').length,
}));
check('夜里出现萤火虫、蝴蝶退场', nightCnt.firefly >= 2 && nightCnt.butterfly === 0, `萤 ${nightCnt.firefly} 蝶 ${nightCnt.butterfly}`);
await page.screenshot({ path: '.shots/t-night.png' });

/* ── 14. 雨天：蜗牛与蘑菇出现 ── */
await patch({ region: 'forest', weather: 'rain', phase: 'day' });
const rainCnt = await page.evaluate(() => ({
  snail: document.querySelectorAll('.v3-ent[data-t="snail"]').length,
  rain: document.querySelectorAll('.v3-rain line').length,
}));
check('雨天出现蜗牛与雨丝', rainCnt.snail >= 1 && rainCnt.rain > 20, `蜗 ${rainCnt.snail} 雨 ${rainCnt.rain}`);
await page.screenshot({ path: '.shots/t-rain.png' });

/* ── 15. 刷新后森林内容不丢 ── */
const beforeReload = await save();
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1400);
const afterReload = await save();
check(
  '刷新后森林内容还在（生态系统允许增减）',
  Math.abs(
    afterReload.ents.filter((e) => e.r === 'forest').length - beforeReload.ents.filter((e) => e.r === 'forest').length,
  ) <= 4,
  `${beforeReload.ents.filter((e) => e.r === 'forest').length} → ${afterReload.ents.filter((e) => e.r === 'forest').length}`,
);

/* ── 16. 控制台 ── */
check('无控制台报错', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('\n── 森林验收 ──');
results.forEach((r) => console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.n}${r.d ? '  (' + r.d + ')' : ''}`));
console.log(`\n通过 ${results.filter((r) => r.ok).length}/${results.length}`);
await browser.close();
