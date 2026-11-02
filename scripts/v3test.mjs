import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

fs.mkdirSync('.shots', { recursive: true });
const BROWSER = { executablePath: 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: 'new', args: ['--no-sandbox'] };

const browser = await puppeteer.launch({ ...BROWSER, defaultViewport: { width: 1440, height: 810 } });
const page = await browser.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));

const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok, detail }); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const save = async () => {
  await sleep(450);
  return page.evaluate(() => JSON.parse(localStorage.getItem('little-world.v3') || '{}'));
};
const toScreen = (x, y) =>
  page.evaluate((dx, dy) => {
    const svg = document.querySelector('.v3-stage');
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = dx; pt.y = dy;
    const p = pt.matrixTransform(svg.getScreenCTM());
    return { x: p.x, y: p.y };
  }, x, y);
const box = async (sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
}, sel);
const hitPoint = (sel) =>
  page.evaluate((s) => {
    const g = document.querySelector(s);
    if (!g) return null;
    const r = g.getBoundingClientRect();
    const cands = [
      [0.5, 0.55], [0.5, 0.35], [0.5, 0.75], [0.35, 0.55], [0.65, 0.55], [0.5, 0.2], [0.5, 0.9],
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
  const pt = await hitPoint(sel);
  if (!pt) return false;
  await page.mouse.click(pt.x, pt.y);
  return true;
};
/**
 * 各时段的起点（一天的进度 0..1）。
 *
 * 现在昼夜是时钟推的，光写 st.phase 没用——下一拍就会被时钟改回去。
 * 所以改状态时顺手把 clock 拨到该时段的开头：既让 phase 立刻生效，
 * 又给测试留出整整一个时段（常速 48 秒、4 倍速 12 秒）的时间。
 */
const PHASE_START = { dawn: 0.005, day: 0.105, sunset: 0.505, night: 0.605 };

/**
 * 改世界状态并重载。
 *
 * 注意：世界跑起来之后每 0.7 秒就会自己存一次档，写完立刻可能被覆盖。
 * 所以写完要读回来验证，不对就重来一次。
 */
const patch = async (p, tries = 3) => {
  for (let i = 0; i < tries; i += 1) {
    await page.evaluate(
      ([pp, starts]) => {
        const cur = JSON.parse(localStorage.getItem('little-world.v3') || '{}');
        const next = { ...cur, ...pp };
        next.eco = { ...(next.eco || {}) };
        next.eco.clock = starts[pp.phase || cur.phase || 'day'] ?? 0.105;
        localStorage.setItem('little-world.v3', JSON.stringify(next));
      },
      [p, PHASE_START],
    );
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(900);
    const got = await page.evaluate(() => JSON.parse(localStorage.getItem('little-world.v3') || '{}'));
    const ok = Object.entries(p).every(([k, v]) =>
      k === 'eco' ? true : got[k] === v,
    );
    if (ok) {
      await sleep(500);
      return;
    }
  }
};
/** 拖动。from / to 拿不到就返回 false，别把整个套件带崩 */
const drag = async (from, to, steps = 14) => {
  if (!from || !to) return false;
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps);
    await sleep(12);
  }
  await sleep(60);
  await page.mouse.up();
  // 写盘是 280ms 防抖的，只等 320ms 太贴边，会偶尔读到改之前的位置
  await sleep(480);
};

const setSpeed = async (v) => {
  await page.evaluate((vv) => {
    const s = JSON.parse(localStorage.getItem('little-world.v3'));
    s.eco.speed = vv;
    localStorage.setItem('little-world.v3', JSON.stringify(s));
  }, v);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1200);
};

/**
 * 左上角那颗写着区域名的药丸。
 *
 * 判定"现在在哪个区域"要认它：写盘是 280ms 防抖的，刚点完就读存档会读到上一拍，
 * 里层空间还会多出一个「回去」按钮，所以选择器必须带 aria-label。
 */
const REGION_CN = {
  forest: '森林', farm: '农场', seaside: '海边', town: '小镇',
  home: '小屋', site: '工地', underwater: '海底', sky: '天空',
  burrow: '地下', canopy: '树上', barn: '谷仓', wreck: '沉船',
};
const chipName = () =>
  page.evaluate(() => {
    const el = document.querySelector('.v3-chip[aria-label="打开世界地图"] span');
    return el ? el.textContent.trim() : '';
  });

/**
 * 打开地图、点第 idx 个节点，直到真的到了目标区域才返回。
 *
 * 为什么要点完再核对：地图弹出有过渡动画，动画期间点节点会点空。点空一次，
 * 后面整段测试都在错误的区域里跑——表现是失败项随机漂移（今天是兔子，明天是篮子），
 * 看不出真正的毛病在哪。
 */
const goMap = async (idx, expect, tries = 3) => {
  for (let i = 0; i < tries; i += 1) {
    if (!(await page.$('.v3-map'))) {
      await page.click('.v3-chip');
      await sleep(650);
    }
    const nodes = await page.$$('.v3-map-node');
    if (nodes[idx]) {
      await nodes[idx].click();
      await sleep(950);
    }
    if ((await chipName()) === REGION_CN[expect]) return true;
  }
  return false;
};

/** 轮询存档直到条件成立。比固定 sleep 稳——不知道那一拍什么时候写。 */
const waitSave = async (pred, ms = 2600, step = 180) => {
  for (let waited = 0; waited <= ms; waited += step) {
    const st = await save();
    if (pred(st)) return st;
    await sleep(step);
  }
  return save();
};

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1700);
// 交互测试期间把世界暂停：动物会自己走开，按存档坐标点会点空
await setSpeed(0);

/* ── 1. 八个区域都能进 ── */
const names = ['森林', '农场', '海边', '小镇', '小屋', '工地', '海底', '天空'];
const ids = ['forest', 'farm', 'seaside', 'town', 'home', 'site', 'underwater', 'sky'];
for (let i = 0; i < ids.length; i += 1) {
  await goMap(i, ids[i]);
  await waitSave((st) => st.region === ids[i]);
  const s = await save();
  const cnt = await page.evaluate(() => document.querySelectorAll('.v3-ent').length);
  check(`进入${names[i]}（实体 ${cnt} 个）`, s.region === ids[i] && cnt > 4, `region=${s.region}`);
}

/* ── 2. 回到森林做交互测试 ── */
await goMap(0, 'forest');

/* 2a 拖动橡果 */
let ent = await box('.v3-ent[data-t="acorn"]');
const before = (await save()).ents.find((e) => e.t === 'acorn');
const target = { x: ent.x + 150, y: ent.y - 30 };
await drag(ent, target);
let after = (await save()).ents.find((e) => e.id === before.id);
check('拖动橡果：位置改变', after && Math.abs(after.x - before.x) > 40, `x ${Math.round(before.x)} → ${after ? Math.round(after.x) : '?'}`);

/* 2b 组合：橡果拖到种子上 => 长出植物 */
const seedEnt = (await save()).ents.find((e) => e.t === 'seed');
if (seedEnt) {
  const acorn = await box(`.v3-ent[data-id="${after.id}"]`);
  const seedScreen = await toScreen(seedEnt.x, seedEnt.y - 12);
  await drag(acorn, seedScreen);
  const s2 = await save();
  check('组合：橡果 + 种子 → 植物', s2.ents.some((e) => e.t === 'plant'), `plant=${s2.ents.filter((e) => e.t === 'plant').length}`);
}

/* 2c 喂食：橡果拖到松鼠嘴边 */
const sq = await save();
const squirrel = sq.ents.find((e) => e.t === 'squirrel');
const acorn2 = sq.ents.find((e) => e.t === 'acorn');
if (squirrel && acorn2) {
  const a2 = await box(`.v3-ent[data-id="${acorn2.id}"]`);
  const sqScreen = await toScreen(squirrel.x, squirrel.y - 26);
  await drag(a2, sqScreen);
  const s3 = await save();
  const sq2 = s3.ents.find((e) => e.id === squirrel.id);
  const gone = !s3.ents.some((e) => e.id === acorn2.id);
  check(
    '喂食：松鼠吃掉/搬走橡果',
    gone && sq2 && (sq2.f === true || !!sq2.car || sq2.act === 'home'),
    `食物${gone ? '没了' : '还在'}，松鼠 f=${sq2 && sq2.f} car=${sq2 && sq2.car}`,
  );
}

/* 2d 点击兔子有反应（连续点击计数） */
const rabbit = (await save()).ents.find((e) => e.t === 'rabbit');
if (rabbit) {
  const fxBefore = await page.evaluate(() => document.querySelectorAll('.v3-fx').length);
  await clickEnt(`.v3-ent[data-id="${rabbit.id}"]`);
  await sleep(220);
  const fxAfter = await page.evaluate(() => document.querySelectorAll('.v3-fx').length);
  check('点击兔子出现反应特效', fxAfter > fxBefore, `${fxBefore} → ${fxAfter}`);
}

/* 2e 隐藏秘密 */
const secretsBefore = (await save()).secrets.length;
const secHandles = await page.$$('.v3-secret');
for (const h of secHandles) {
  const bb = await h.boundingBox();
  if (!bb) continue;
  await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await sleep(420);
  if ((await save()).secrets.length > secretsBefore) break;
}
const secretsAfter = (await save()).secrets.length;
check('发现隐藏秘密', secretsAfter > secretsBefore, `${secretsBefore} → ${secretsAfter}`);

/* ── 3. 跨区域携带：海边贝壳 → 森林 ── */
// 前面在森林点了秘密、给松鼠喂了东西，去海边之前先把"现在在哪"确认清楚
await goMap(2, 'seaside');
const shell = (await waitSave((st) => st.ents.some((e) => e.t === 'shell'))).ents.find((e) => e.t === 'shell');
if (shell) {
  const sh = await box(`.v3-ent[data-id="${shell.id}"]`);
  const bagZone = { x: 1440 - 70, y: 810 - 60 };
  await drag(sh, bagZone);
  const s4 = await waitSave((st) => st.bag.length === 1);
  check('拖动贝壳到篮子 = 收进篮子', s4.bag.length === 1, `bag=${s4.bag.length}`);
  // 去森林
  await goMap(0, 'forest');
  await waitSave((st) => st.bag.length === 1);
  const bagBtn = await box('.v3-bag-item');
  if (bagBtn) {
    await page.mouse.click(bagBtn.x, bagBtn.y);
    await sleep(500);
    const s5 = await waitSave((st) => st.bag.length === 0);
    const moved = s5.ents.find((e) => e.id === shell.id);
    check('跨区域：贝壳取出后落在森林', s5.bag.length === 0 && moved && moved.r === 'forest', `r=${moved && moved.r}`);
  } else {
    // 失败时把现场打出来：篮子里的东西还在不在、到底落在哪个区域
    const st = await save();
    const sh2 = st.ents.find((e) => e.id === shell.id);
    check(
      '跨区域：篮子按钮存在',
      false,
      `界面=${await chipName()} region=${st.region} bag=${JSON.stringify(st.bag)} shell=${sh2 ? 'r=' + sh2.r : '不在ents里'}`,
    );
  }
}


/* ── 4. 新增机制：植物渲染 / 连点反应 / 天气连锁 / 云可拖 ── */
await goMap(0, 'forest');

// 4a 种下去的东西必须是"植物"，不能是兜底灰球
// 注意：前面的"橡果+种子"配方会把森林那颗种子消耗掉，所以这里没有种子就重置一次世界
let seedNow = (await save()).ents.find((e) => e.t === 'seed' && e.r === 'forest');
if (!seedNow) {
  await page.evaluate(() => localStorage.removeItem('little-world.v3'));
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1500);
  // 新世界是跑着的：动物一动，按存档坐标点就会点空，先按暂停
  await setSpeed(0);
  await goMap(0, 'forest');
  seedNow = (await save()).ents.find((e) => e.t === 'seed' && e.r === 'forest');
}
if (seedNow) {
  const sd = await box(`.v3-ent[data-id="${seedNow.id}"]`);
  const spot = await toScreen(820, 728);
  await drag(sd, spot);
  const planted = (await save()).ents.find((e) => e.t === 'plant');
  // 阶段 0 只有土坑，浇水后长出茎叶；要能看出"土坑 → 苗"的变化
  const stage0 = await page.evaluate(() => {
    const g = document.querySelector('.v3-ent[data-t="plant"]');
    if (!g) return null;
    return { html: g.innerHTML, shapes: g.querySelectorAll('path, circle, ellipse').length };
  });
  let stage1 = null;
  if (planted) {
    const pp = await toScreen(planted.x, planted.y - 12);
    await page.mouse.click(pp.x, pp.y);
    // 浇水不再直接抬一级：靠生态时钟自己长，4 倍速等 6 秒
    await setSpeed(4);
    await sleep(6500);
    stage1 = await page.evaluate(() => {
      const g = document.querySelector('.v3-ent[data-t="plant"]');
      if (!g) return null;
      return { html: g.innerHTML, shapes: g.querySelectorAll('path, circle, ellipse').length };
    });
  }
  const notFallback = !!stage0 && !stage0.html.includes('#b9b6ae') && stage0.html.includes('#a98a68');
  const grew = !!stage1 && stage1.shapes > stage0.shapes && stage1.html.includes('#7fb96c');
  check(
    '植物渲染成植物，浇水后长高（不是灰球）',
    !!planted && notFallback && grew,
    `stage0=${stage0 && stage0.shapes} stage1=${stage1 && stage1.shapes}`,
  );
} else {
  check('植物渲染成植物（不是兜底灰球）', false, '没有种子可拖');
}

// 4b 连点动物给出不同反应
const rab = (await save()).ents.find((e) => e.t === 'rabbit');
const reactions = [];
/**
 * 等上一次反应播完再点下一回。
 * 反应是 CSS 动画，播的时候整只兔子会离开落脚点，画面上看是在动——但判定用的是
 * 落脚点。所以等它退干净再点，语义上也更像孩子的做法。
 */
const settleRabbit = () =>
  page
    .waitForFunction(() => !document.querySelector('.v3-ent[data-t="rabbit"] .v3-react'), { timeout: 5000, polling: 120 })
    .catch(() => {});
if (rab) {
  for (let i = 0; i < 3; i += 1) {
    await settleRabbit();
    /**
     * 每次点击前重新量一次元素当前位置。
     *
     * 兔子会走（生态一直在推），存档里的坐标和上一拍的位置都可能已经过期；
     * 而反应动画会把它抬离落脚点——所以先等动画退干净、再按"此刻"的框点。
     */
    let cls = '';
    const dbg = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const box = await page.evaluate((id) => {
        const el = document.querySelector(`.v3-ent[data-id="${id}"]`);
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: b.x + b.width / 2, y: b.y + b.height * 0.55, w: Math.round(b.width), h: Math.round(b.height) };
      }, rab.id);
      if (!box || box.x < 4 || box.y < 4 || box.x > 1436 || box.y > 806) {
        dbg.push('不在可视区');
        continue;
      }
      await page.mouse.click(box.x, box.y);
      await sleep(240);
      const fx = await page.evaluate(() => document.querySelectorAll('.v3-fx').length);
      dbg.push(`@${Math.round(box.x)},${Math.round(box.y)} ${box.w}×${box.h} fx=${fx}`);
      cls = await page.evaluate(() => {
        const n = document.querySelector('.v3-ent[data-t="rabbit"] .v3-react');
        return n ? n.getAttribute('class') : '';
      });
      if (cls) break;
    }
    reactions.push(cls || `(第${i + 1}次点空: ${dbg.join(' / ')})`);
    await sleep(820);
  }
}
check(
  '连点兔子换不同反应（跳/摇/转）',
  reactions.length === 3 && new Set(reactions).size === 3 && reactions.every((c) => c.includes('v3-react-')),
  reactions.join(' | '),
);

// 4c 天气连锁：下雨出现蜗牛，停了就消失
await patch({ weather: 'rain' });
const snailsRain = await page.evaluate(() => document.querySelectorAll('.v3-ent[data-t="snail"]').length);
const mushRain = await page.evaluate(() => document.querySelectorAll('.v3-ent[data-t="mushroom"]').length);
check('雨天：森林出现蜗牛与蘑菇', snailsRain >= 1 && mushRain >= 1, `蜗牛${snailsRain} 蘑菇${mushRain}（刺猬会吃蘑菇）`);

await patch({ weather: 'clear' });
const snailsClear = await page.evaluate(() => document.querySelectorAll('.v3-ent[data-t="snail"]').length);
check('雨停后蜗牛消失', snailsClear === 0, `蜗牛${snailsClear}`);

// 4d 夜间：萤火虫出现、蝴蝶消失
// 先确认这会儿真的是白天：时钟会自己走，走到夜里蝴蝶本来就不出来
if ((await save()).phase === 'night') await patch({ phase: 'day' });
const dayNow = await save();
const butterflyDay = await page.evaluate(() => document.querySelectorAll('.v3-ent[data-t="butterfly"]').length);
await patch({ phase: 'night' });
const nightInfo = await page.evaluate(() => ({
  fly: document.querySelectorAll('.v3-ent[data-t="firefly"]').length,
  butterfly: document.querySelectorAll('.v3-ent[data-t="butterfly"]').length,
}));
check(
  '夜晚：萤火虫出现 / 蝴蝶退场',
  nightInfo.fly >= 2 && butterflyDay >= 1 && nightInfo.butterfly === 0,
  `萤火虫${nightInfo.fly} 白天蝴蝶${butterflyDay} 夜里蝴蝶${nightInfo.butterfly}` +
    `（白天时 phase=${dayNow.phase} 季节=${dayNow.season} 区=${dayNow.region}）`,
);
await patch({ phase: 'day' });

// 4e 天空的云可以拖，但不该被收进篮子
await goMap(7, 'sky');
const cloud = (await waitSave((st) => st.ents.some((e) => e.t === 'clouditem'))).ents.find((e) => e.t === 'clouditem');
let cloudMoved = false;
if (cloud) {
  const cb = await box(`.v3-ent[data-id="${cloud.id}"]`);
  await drag(cb, { x: cb.x + 160, y: cb.y - 40 });
  const after = (await save()).ents.find((e) => e.id === cloud.id);
  cloudMoved = !!after && Math.abs(after.x - cloud.x) > 40;
  const cb2 = await box(`.v3-ent[data-id="${cloud.id}"]`);
  await drag(cb2, { x: 1440 - 70, y: 810 - 60 });
  const bagNow = (await save()).bag.length;
  check('天空云朵可拖动，且不会被收进篮子', cloudMoved && bagNow === 0, `moved=${cloudMoved} bag=${bagNow}`);
} else {
  check('天空云朵可拖动，且不会被收进篮子', false, '找不到云');
}


/* ── 4f 纵深：拖到画面前方要留在前方（不能被吸回地平线） ── */
await patch({ region: 'forest', weather: 'clear', phase: 'day' });
const rockNow = (await save()).ents.find((e) => e.t === 'rock' && e.r === 'forest');
let rockY = 0;
if (rockNow) {
  const rb = await box(`.v3-ent[data-id="${rockNow.id}"]`);
  await drag(rb, await toScreen(880, 860));
  const after = (await save()).ents.find((e) => e.id === rockNow.id);
  rockY = after ? after.y : 0;
  check('纵深：拖到画面前方的物体留在前方', rockY > 760, `y=${Math.round(rockY)}（地平线 646）`);
} else {
  check('纵深：拖到画面前方的物体留在前方', false, '没有石头');
}

/* ── 4g 室内 / 水下不该有雨雪 ── */
await patch({ region: 'home', weather: 'rain' });
const homeRain = await page.evaluate(() => document.querySelectorAll('.v3-rain line').length);
const homeWinRain = await page.evaluate(() => document.querySelectorAll('#homeWindow ~ *').length >= 0);
await patch({ region: 'underwater', weather: 'rain' });
const seaRain = await page.evaluate(() => document.querySelectorAll('.v3-rain line').length);
check('下雨时室内与水下没有雨丝（只在窗外）', homeRain === 0 && seaRain === 0, `室内${homeRain} 水下${seaRain}`);

/* ── 4h 船能拖进海里并浮住 ── */
await patch({ region: 'seaside', weather: 'clear' });
const boatNow = (await save()).ents.find((e) => e.t === 'boat');
let boatY = 0;
if (boatNow) {
  const bb = await box(`.v3-ent[data-id="${boatNow.id}"]`);
  await drag(bb, await toScreen(900, 640));
  const after = (await save()).ents.find((e) => e.id === boatNow.id);
  boatY = after ? after.y : 0;
  check('帆船可以拖进海里并停在水中', boatY >= 590 && boatY <= 700, `y=${Math.round(boatY)}（海面 590–700）`);
} else {
  check('帆船可以拖进海里并停在水中', false, '找不到船');
}

/* ── 4. 家长设置：天气与昼夜 ── */
const gear = await box('.v3-gear');
await page.mouse.move(gear.x, gear.y);
await page.mouse.down();
await sleep(1350);
await page.mouse.up();
await sleep(400);
const panelOpen = !!(await page.$('.v3-panel'));
check('长按齿轮打开家长设置', panelOpen);

if (panelOpen) {
  const rainBtn = await page.evaluateHandle(() => {
    const rows = [...document.querySelectorAll('.v3-panel-row')];
    const row = rows.find((r) => r.textContent.includes('天气'));
    return [...row.querySelectorAll('button')].find((b) => b.textContent === '雨');
  });
  await rainBtn.asElement().click();
  await sleep(600);
  const rainOk = await page.evaluate(() => document.querySelectorAll('.v3-rain line').length > 20);
  check('切换到雨天并出现雨滴', (await save()).weather === 'rain' && rainOk);

  const nightBtn = await page.evaluateHandle(() => {
    const rows = [...document.querySelectorAll('.v3-panel-row')];
    const row = rows.find((r) => r.textContent.includes('时段'));
    return [...row.querySelectorAll('button')].find((b) => b.textContent === '夜晚');
  });
  await nightBtn.asElement().click();
  await sleep(700);
  check('切换到夜晚', (await save()).phase === 'night');
  await page.screenshot({ path: '.shots/t-night-rain.png' });
}

/* ── 5. 刷新后恢复 ── */
// 前面植物测试开了 4 倍速，存档恢复要在世界静止下测——否则 reload 期间
// 昼夜会跨天、天气会重掷、实体会漂移，测的不是"恢复"而是"时钟在跑"。
await setSpeed(0);
const beforeReload = await save();
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1500);
const afterReload = await save();
check(
  '刷新后存档恢复（区域/天气/昼夜/实体数）',
  afterReload.region === beforeReload.region &&
    afterReload.weather === beforeReload.weather &&
    afterReload.phase === beforeReload.phase &&
    // 生态系统允许增减（气泡会破、落叶会分解完），只要求数量基本一致
    Math.abs(afterReload.ents.length - beforeReload.ents.length) <= 2,
  `ents ${beforeReload.ents.length} → ${afterReload.ents.length}`,
);

/* ── 6. 存档损坏时不崩 ── */
await page.evaluate(() => localStorage.setItem('little-world.v3', '{"ents":"broken","weather":123}'));
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1200);
const survived = await page.evaluate(() => !!document.querySelector('.v3-stage') && document.querySelectorAll('.v3-ent').length > 3);
check('存档损坏后仍能正常打开', survived);

/* ── 7. 控制台错误 ── */
check('无控制台报错', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('\n── 结果 ──');
results.forEach((r) => console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? '  (' + r.detail + ')' : ''}`));
console.log(`\n通过 ${results.filter((r) => r.ok).length}/${results.length}`);
await browser.close();
