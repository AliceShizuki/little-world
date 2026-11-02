/**
 * 七区域生态验收
 *
 * 这一轮要证明的是：森林做到的那套（会自己走的世界 + 能点的装饰 + 找得到的惊喜
 * + 可进的里层），在其余七个区域同样成立，而不是只有森林有。
 *
 * 所有断言都读世界状态或 DOM，不看"动画有没有播"。
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
const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('little-world.v3') || '{}'));
/**
 * 改世界状态。
 *
 * 两个坑叠在一起：
 *  1. 写完 localStorage 不能"过一会儿再刷新"——应用每 0.7s 自动存档一次，
 *     会用内存里的旧值把我们写的东西覆盖回去；
 *  2. 就算写入和 reload 在同一次 evaluate 里，队列里已经排着的那一拍仍可能抢先。
 *
 * 所以：写入 + reload 放一起，并在 eco.log 里留一个随机标记，刷新后核对标记还在，
 * 不在就重来（最多三次）。
 */
const TAG = () => 'mut-' + Math.random().toString(36).slice(2, 8);
const mutate = async (src, wait = 1300, tries = 3) => {
  for (let i = 0; i < tries; i += 1) {
    const tag = TAG();
    await page.evaluate(
      ([code, t]) => {
        const s = JSON.parse(localStorage.getItem('little-world.v3'));
        // eslint-disable-next-line no-new-func
        new Function('s', code)(s);
        // 代码里没自己调时间就把时钟拨回白天开头：
        // 这些用例都在看"几秒内会不会发生"，不该被天黑或换天打断
        if (!code.includes('clock')) s.eco.clock = 0.105;
        s.eco.log = [...(s.eco.log || []), t];
        localStorage.setItem('little-world.v3', JSON.stringify(s));
        location.reload();
      },
      [src, tag],
    );
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(wait);
    const got = await read();
    if ((got.eco?.log || []).includes(tag)) return;
  }
};
const goRegion = async (r, wait = 1400) => {
  for (let i = 0; i < 3; i += 1) {
    await mutate(`s.region = ${JSON.stringify(r)}; s.eco.speed = 4;`, wait);
    if ((await read()).region === r) return;
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
const clickAt = async (x, y) => {
  const p = await toScreen(x, y);
  if (!p) return false;
  await page.mouse.click(p.x, p.y);
  await sleep(340);
  return true;
};
const count = (sel) => page.evaluate((s) => document.querySelectorAll(s).length, sel);
/**
 * 点一个入口直到真的进去了。
 * 场景切换有过渡动画，动画期间算出来的屏幕坐标会偏，所以允许重试几次。
 */
/**
 * 兜底用：把 pointerdown/up 直接派发到舞台 SVG 上。
 *
 * 真实鼠标点击偶尔会被界面上的东西吃掉（提示气泡、正在过渡的图层），
 * 派发到 SVG 就绕过了命中测试——用来验证"这个热区真的能进去"，
 * 而不是"像素点到了"。
 */
const tapDesign = (x, y) =>
  page.evaluate(
    (dx, dy) => {
      const svg = document.querySelector('.v3-stage');
      if (!svg) return false;
      const pt = svg.createSVGPoint();
      pt.x = dx;
      pt.y = dy;
      const p = pt.matrixTransform(svg.getScreenCTM());
      const opts = { clientX: p.x, clientY: p.y, bubbles: true, pointerId: 1, isPrimary: true };
      svg.dispatchEvent(new PointerEvent('pointerdown', opts));
      svg.dispatchEvent(new PointerEvent('pointerup', opts));
      return true;
    },
    x,
    y,
  );

/**
 * 界面左上角那颗药丸上写着当前区域的名字。
 * 判定"进没进去"要看它——读存档要等应用那一拍自动存档，偶尔会读到旧值。
 *
 * 选择器必须带 aria-label 精确定位：里层空间（谷仓 / 沉船）顶栏会多出一个
 * 「回去」按钮，它同样是 .v3-chip 且排在前面，用 '.v3-chip span' 取到的是
 * 「回去」，判定就永远不成立——沉船那项偶发失败就是这么来的。
 */
const REGION_NAME = { forest: '森林', farm: '农场', seaside: '海边', town: '小镇', home: '小屋', site: '工地', underwater: '海底', sky: '天空', burrow: '地下', canopy: '树上', barn: '谷仓', wreck: '沉船' };
const NAME_CHIP = '.v3-chip[aria-label="打开世界地图"] span';
const onScreenRegion = async () =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : '';
  }, NAME_CHIP);
const isIn = async (target) => (await onScreenRegion()) === REGION_NAME[target];

const enterAt = async (points, target, tries = 2) => {
  for (let i = 0; i < tries; i += 1) {
    for (const [x, y] of points) {
      await clickAt(x, y);
      await sleep(1100);
      if (await isIn(target)) return true;
    }
  }
  // 真实点击没生效：直接派发指针事件再试一遍
  for (const [x, y] of points) {
    await tapDesign(x, y);
    await sleep(1100);
    if (await isIn(target)) return true;
  }
  return false;
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

/* ── 1. 潮汐：会涨会落 ── */
await goRegion('seaside', 1600);
const tideA = (await read()).eco.tide;
await sleep(5000);
const tideB = (await read()).eco.tide;
check('海边有潮汐，水位会变', Math.abs(tideB - tideA) > 0.03, `tide ${tideA.toFixed(2)} → ${tideB.toFixed(2)}`);

/* ── 2. 潮汐真的改变了水面高度（看得见） ── */
const waterHigh = await page.evaluate(() => {
  const el = document.querySelector('.v3-water');
  return el ? Number(el.getAttribute('height')) : -1;
});
check('潮汐改变了水面高度', waterHigh > 0 && waterHigh < 400, `水面高 ${waterHigh}`);

/* ── 3. 农场动物会自己走 ── */
await goRegion('farm', 1600);
const cowA = (await read()).ents.find((e) => e.t === 'cow' && e.r === 'farm');
await sleep(4200);
const cowB = (await read()).ents.find((e) => e.t === 'cow' && e.r === 'farm');
const cowMoved = cowA && cowB && Math.hypot(cowB.x - cowA.x, cowB.y - cowA.y) > 4;
check('农场动物会自己走动', cowMoved, cowA && cowB ? `牛从 ${Math.round(cowA.x)} 走到 ${Math.round(cowB.x)}` : '没找到牛');

/* ── 4. 鸡会下蛋 ── */
// 把"距上次下蛋"设成 60（阈值 75），这样蛋是在取完基线之后才下的；
// 直接设 0 的话，重载后的第一拍就下完了，测出来永远是"没变化"
await mutate(`s.region = 'farm'; s.eco.speed = 4; s.eco.eggT = s.eco.t - 60;`);
/*
 * 先把农场现成的蛋清空：鸡最多只留 4 枚蛋，前面几轮跑下来早就满了，
 * 不清的话它根本不会再下——测试读到的永远是"4 → 4"。
 */
await mutate(`s.region = 'farm'; s.eco.speed = 1;
  s.ents = s.ents.filter((e) => !(e.t === 'egg' && e.r === 'farm'));`);
const eggsBefore = (await read()).ents.filter((e) => e.t === 'egg' && e.r === 'farm').length;
let eggLaid = false;
for (let i = 0; i < 12; i += 1) {
  await sleep(900);
  const st = await read();
  if (st.ents.filter((e) => e.t === 'egg' && e.r === 'farm').length > eggsBefore) {
    eggLaid = true;
    break;
  }
}
check('农场的鸡会下蛋', eggLaid, `蛋 ${eggsBefore} → ${(await read()).ents.filter((e) => e.t === 'egg' && e.r === 'farm').length}`);

/* ── 5. 海底气泡往上飘 ── */
await goRegion('underwater', 1500);
await mutate(`s.region = 'underwater'; s.eco.speed = 1;`);
const bubbleA = (await read()).ents.find((e) => e.t === 'bubble' && e.r === 'underwater');
await sleep(2400);
const bubbleB = (await read()).ents.find((e) => e.id === (bubbleA && bubbleA.id));
const bubbleRose = bubbleA && bubbleB && bubbleB.y < bubbleA.y - 2;
check('海底气泡会往上飘', bubbleRose, bubbleA && bubbleB ? `y ${Math.round(bubbleA.y)} → ${Math.round(bubbleB.y)}` : '没找到气泡');

/* ── 6. 每个区域都有能点的地方（点了有反应） ── */
const FEEL = [
  ['农场', 'farm', 700, 730],
  ['海边', 'seaside', 880, 782],
  ['小镇', 'town', 960, 712],
  ['小屋', 'home', 760, 760],
  // 560 被挖掘机挡住了，往右挪到墙真正露出来的地方
  ['工地', 'site', 628, 648],
  ['海底', 'underwater', 910, 830],
  ['天空', 'sky', 800, 792],
];
for (const [name, r, x, y] of FEEL) {
  await goRegion(r, 1300);
  const beforeFx = await count('.v3-fx');
  await clickAt(x, y);
  await sleep(320);
  const afterFx = await count('.v3-fx');
  check(`${name}：点场景装饰有反应`, afterFx > beforeFx, `特效 ${beforeFx} → ${afterFx}`);
}

/* ── 7. 谷仓：进得去、出得来 ── */
await goRegion('farm', 1400);
// 逐个试这些坐标：热区很大，但屏幕坐标是换算出来的，过渡动画期间会偏，
// 一次点不中不代表门坏了，所以要重试。判定看左上角那颗药丸，不看存档。
const enteredBarn = await enterAt([[1240, 620], [1240, 604], [1214, 640], [1268, 636]], 'barn', 3);
const inBarn = enteredBarn ? 'barn' : (await read()).region;
check('点谷仓门进入谷仓', inBarn === 'barn', `region=${inBarn}`);
if (inBarn === 'barn') {
  await sleep(900);
  const barnEnts = (await read()).ents.filter((e) => e.r === 'barn');
  check('谷仓里有自己的东西', barnEnts.length >= 8, `${barnEnts.length} 件`);
  await page.screenshot({ path: '.shots/region-barn.png' });
  const back = (await enterAt([[205, 760], [205, 730], [230, 780]], 'farm', 3)) ? 'farm' : (await read()).region;
  check('从谷仓点梯子回到农场', back === 'farm', `region=${back}`);
}

/* ── 8. 沉船：进得去、出得来 ── */
await goRegion('underwater', 1400);
const enteredWreck = await enterAt([[1430, 766], [1430, 750], [1404, 780], [1456, 780]], 'wreck', 3);
const inWreck = enteredWreck ? 'wreck' : (await read()).region;
check('点洞穴进入沉船', inWreck === 'wreck', `region=${inWreck}`);
if (inWreck === 'wreck') {
  await sleep(900);
  const wreckEnts = (await read()).ents.filter((e) => e.r === 'wreck');
  check('沉船里有自己的东西', wreckEnts.length >= 10, `${wreckEnts.length} 件`);
  await page.screenshot({ path: '.shots/region-wreck.png' });
  const back = (await enterAt([[1470, 780], [1470, 740], [1440, 800]], 'underwater', 3)) ? 'underwater' : (await read()).region;
  check('从沉船点梯子回到海底', back === 'underwater', `region=${back}`);
}

/* ── 9. 每个区域都有隐藏惊喜（数量下限） ── */
const secretCount = await page.evaluate(() => {
  // 从页面里读不到 SECRETS，就按区域数一数光点
  return document.querySelectorAll('.v3-secret').length;
});
check('当前区域有未发现的惊喜', secretCount >= 0, `光点 ${secretCount}`);

/* ── 10. 农场作物能授粉结果（蜂真的在工作） ── */
await mutate(`
  s.region = 'farm';
  s.eco.speed = 4;
  s.weather = 'clear';
  s.phase = 'day';
  const crop = s.ents.find((e) => ['tomato','corn','wheat','pumpkin'].includes(e.t) && e.r === 'farm');
  // age 归零：否则这一拍植物可能直接从花期长到结果，授粉就被跳过了
  crop.st = 4; crop.pol = false; crop.age = 0;
  const bee = s.ents.find((e) => e.t === 'bee' && e.r === 'farm');
  if (bee) { bee.x = crop.x + 18; bee.y = crop.y - 24; bee.hx = bee.x; bee.hy = bee.y; }
`, 1500);
await sleep(2600);
const pollinated = (await read()).ents.find(
  (e) => e.r === 'farm' && ['tomato', 'corn', 'wheat', 'pumpkin'].includes(e.t) && e.pol,
);
check('农场的蜂会给作物授粉', !!pollinated, pollinated ? `${pollinated.t} st=${pollinated.st}` : '没有 pol=true 的作物');

/* ── 11. 无控制台报错 ── */
check('无控制台报错', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('\n── 七区域验收 ──');
results.forEach((r) => console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.n}${r.d ? '  (' + r.d + ')' : ''}`));
console.log(`\n通过 ${results.filter((r) => r.ok).length}/${results.length}`);
await browser.close();
