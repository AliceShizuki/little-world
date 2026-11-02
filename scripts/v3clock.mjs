/**
 * 世界时钟与手势验收
 *
 * 这一轮加了两件事，都要证明"真的会走、真的能划"：
 *   1. 昼夜/季节/天气由世界时钟推进（常速 2 分钟一个昼夜，4 个昼夜换一季，
 *      每天按当季的概率表换一次天气，夏天不掷雪）。
 *   2. 空白处左右横划可以换区域，地图照旧。
 *
 * 断言全部读世界状态或界面，不看动画有没有播。
 * 改状态一律"写入 + 刷新"原子操作 + eco.log 标记校验（见 AGENTS.md 3.16）。
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

const TAG = () => 'mut-' + Math.random().toString(36).slice(2, 8);
/** 改世界状态：写入 + 刷新放同一次 evaluate，并在 eco.log 留标记，刷新后核对 */
const mutate = async (src, wait = 1400, tries = 3) => {
  for (let i = 0; i < tries; i += 1) {
    const tag = TAG();
    await page.evaluate(
      ([code, t]) => {
        const s = JSON.parse(localStorage.getItem('little-world.v3'));
        // eslint-disable-next-line no-new-func
        new Function('s', code)(s);
        s.eco.log = [...(s.eco.log || []), t];
        localStorage.setItem('little-world.v3', JSON.stringify(s));
        location.reload();
      },
      [src, tag],
    );
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(wait);
    if (((await read()).eco?.log || []).includes(tag)) return;
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

const NAME_CHIP = '.v3-chip[aria-label="打开世界地图"] span';
const chipName = () =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : '';
  }, NAME_CHIP);

/**
 * 在设计坐标上横划一段。
 * 起点取画面上半部（那儿通常是天空/背景，不会压到实体），
 * 按 x1 → x2 的方向分 10 步走完，松手时才算一次手势。
 */
const swipe = async (x1, x2, y = 260) => {
  const a = await toScreen(x1, y);
  const b = await toScreen(x2, y);
  if (!a || !b) return false;
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) {
    await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y, { steps: 1 });
    await sleep(16);
  }
  await page.mouse.up();
  await sleep(1100);
  return true;
};

/** 打开家长面板（长按 1.1 秒才出现） */
const openPanel = async () => {
  const b = await page.evaluate(() => {
    const el = document.querySelector('.v3-gear');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!b) return false;
  await page.mouse.move(b.x, b.y);
  await page.mouse.down();
  await sleep(1450);
  await page.mouse.up();
  await sleep(450);
  return page.evaluate(() => !!document.querySelector('.v3-panel'));
};

/** 点家长面板里某一行上的某个按钮（按文字找，不依赖顺序） */
const panelPick = (rowLabel, btnText) =>
  page.evaluate(
    ([row, txt]) => {
      const rows = [...document.querySelectorAll('.v3-panel-row')];
      const r = rows.find((x) => (x.querySelector('span')?.textContent || '').trim() === row);
      if (!r) return false;
      const b = [...r.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === txt);
      if (!b) return false;
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      return true;
    },
    [rowLabel, btnText],
  );

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1800);

/* ── 1. 世界时钟会自己走 ── */
const clockA = (await read()).eco.clock;
await sleep(3000);
const clockB = (await read()).eco.clock;
check('世界时钟会自己走', clockB > clockA, `clock ${clockA.toFixed(3)} → ${clockB.toFixed(3)}`);

/* ── 2. 常速下 2 分钟一个昼夜 ── */
// 常速：3 秒真实时间应该只走掉 3/120 = 0.025 天
await mutate(`s.eco.speed = 1; s.eco.clock = 0.2;`);
const c0 = (await read()).eco.clock;
await sleep(4000);
const c1 = (await read()).eco.clock;
const perSec = (c1 - c0) / 4;
const secPerDay = 1 / perSec;
check(
  '常速 2 分钟走完一个昼夜',
  secPerDay > 105 && secPerDay < 140,
  `实测 ${secPerDay.toFixed(0)} 秒/昼夜`,
);

/* ── 3. 白天会自己走到夜晚（不用人手按） ── */
await mutate(`s.eco.speed = 4; s.eco.clock = 0.47; s.phase = 'day';`);
await sleep(4600);
const dusk = await read();
check(
  '白天会自己走到夜晚',
  dusk.phase === 'night' || dusk.phase === 'sunset',
  `phase=${dusk.phase} clock=${dusk.eco.clock.toFixed(2)}`,
);

/* ── 4. 四个昼夜换一季 ── */
await mutate(`s.eco.speed = 4; s.eco.day = 4; s.season = 'spring'; s.eco.clock = 0.97; s.phase = 'night';`);
await sleep(2200);
const next = await read();
check(
  '四个昼夜换一季',
  next.eco.day === 5 && next.season === 'summer',
  `day=${next.eco.day} season=${next.season}`,
);

/* ── 5~7. 天气：每天换一次、随季节变、夏天不下雪 ── */
/**
 * 把时钟推到当天最后一刻，跨天后再读——这样"一天"只要一秒多。
 * 收到的天气是**跨过去的那一天**的天气（第 day 天的天气由 day 掷出）。
 */
const weatherOf = async (day) => {
  await mutate(
    `s.eco.speed = 4; s.eco.day = ${day - 1}; s.eco.clock = 0.995; s.phase = 'night';`,
    1500,
  );
  await sleep(1400);
  const st = await read();
  return { day: st.eco.day, season: st.season, weather: st.weather };
};

const SCHEDULE = [];
for (let d = 5; d <= 16; d += 1) SCHEDULE.push({ want: d, got: await weatherOf(d) });

const collected = SCHEDULE.filter((x) => x.got.day === x.want);
const summer = collected.filter((x) => x.got.season === 'summer');
const winter = collected.filter((x) => x.got.season === 'winter');
const kinds = new Set(collected.map((x) => x.got.weather));

check(
  '每天按季节换一次天气',
  collected.length >= 10 && kinds.size >= 3,
  `${collected.length} 天，天气 ${[...kinds].join('/')}`,
);
check(
  '夏天不会下雪',
  summer.length >= 3 && summer.every((x) => x.got.weather !== 'snow'),
  `夏天 ${summer.map((x) => `D${x.got.day}:${x.got.weather}`).join(' ')}`,
);
check(
  '冬天会下雪',
  winter.length >= 3 && winter.some((x) => x.got.weather === 'snow'),
  `冬天 ${winter.map((x) => `D${x.got.day}:${x.got.weather}`).join(' ')}`,
);

/* ── 8. 家长模式还在：手动切夜晚 = 把时钟拨到晚上 ── */
await mutate(`s.eco.speed = 1; s.eco.clock = 0.2; s.phase = 'day'; s.weather = 'clear';`);
const opened = await openPanel();
check('长按能打开家长设置', opened);
if (opened) {
  /* 先确认天气真的下到画面上（不只是改了个字段） */
  await panelPick('季节', '冬');
  await sleep(500);
  await panelPick('天气', '雪');
  await sleep(900);
  const flakes = await page.evaluate(() => document.querySelectorAll('.v3-flake').length);
  check('切到雪天，画面上真的在下雪', flakes > 10, `雪片 ${flakes} 个`);

  await panelPick('时段', '夜晚');
  await sleep(700);
  const night = await read();
  check(
    '手动切夜晚会拨动时钟',
    night.phase === 'night' && night.eco.clock > 0.6 && night.eco.clock < 0.95,
    `phase=${night.phase} clock=${night.eco.clock.toFixed(2)}`,
  );

  /* ── 9. 手动换季会按新季节重掷天气（不能夏天还下雪） ── */
  await panelPick('季节', '冬');
  await sleep(500);
  const w0 = await read();
  await panelPick('季节', '夏');
  await sleep(700);
  const w1 = await read();
  check(
    '手动换季会按新季节重掷天气',
    w0.season === 'winter' && w1.season === 'summer' && w1.weather !== 'snow',
    `冬:${w0.weather} → 夏:${w1.weather}`,
  );
  await page.evaluate(() => {
    const x = document.querySelector('.v3-panel-x');
    if (x) x.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  });
  await sleep(400);
}

/* ── 10~11. 左右横划换区域 ── */
await page.evaluate(() => localStorage.setItem('little-world.hint.v3', '1'));
await mutate(`s.eco.speed = 0; s.region = 'forest';`);
const before = await chipName();
// 往左划：看右边的下一个区域（forest → farm）
await swipe(1100, 500);
const afterLeft = await chipName();
check('往左划去下一个区域', before === '森林' && afterLeft === '农场', `${before} → ${afterLeft}`);

// 往右划：回到上一个
await swipe(500, 1100);
const afterRight = await chipName();
check('往右划回上一个区域', afterRight === '森林', `${afterLeft} → ${afterRight}`);

/* ── 12. 竖着划不算换区域（避免误触） ── */
const a = await toScreen(800, 500);
const b = await toScreen(760, 180);
await page.mouse.move(a.x, a.y);
await page.mouse.down();
for (let i = 1; i <= 10; i += 1) await page.mouse.move(a.x + ((b.x - a.x) * i) / 10, a.y + ((b.y - a.y) * i) / 10);
await page.mouse.up();
await sleep(900);
check('竖着划不换区域', (await chipName()) === '森林', `界面=${await chipName()}`);

/* ── 13. 抓着东西横拖不会误换区域 ── */
// 用橡果而不是动物：动物有走位偏移，DOM 位置和逻辑坐标对不齐，点不准
const prop = (await read()).ents.find((e) => e.t === 'acorn' && e.r === 'forest');
if (prop) {
  /**
   * 起点取元素在屏幕上的实际位置，不用设计坐标换算：
   * 相机视野不一定包含整个 1600 宽的森林，换算出来可能已经在视口外。
   */
  const pb = await page.evaluate((id) => {
    const el = document.querySelector(`.v3-ent[data-id="${id}"]`);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height * 0.72 };
  }, prop.id);
  const to = pb ? { x: pb.x - 250, y: pb.y } : null;
  if (pb && to) {
    await page.mouse.move(pb.x, pb.y);
    await page.mouse.down();
    for (let i = 1; i <= 12; i += 1) {
      await page.mouse.move(pb.x + ((to.x - pb.x) * i) / 12, to.y);
      await sleep(14);
    }
    await page.mouse.up();
    await sleep(900);
    const st = await read();
    const moved = st.ents.find((e) => e.id === prop.id);
    check(
      '抓着东西横拖只搬东西、不换区域',
      (await chipName()) === '森林' && !!moved && moved.x < prop.x - 100,
      `界面=${await chipName()} x ${Math.round(prop.x)} → ${moved ? Math.round(moved.x) : '?'}`,
    );
  } else {
    check('抓着东西横拖只搬东西、不换区域', false, '找不到橡果的屏幕位置');
  }
}

/* ── 14. 里层空间不参与横划（划走了会让孩子迷路） ── */
await mutate(`s.eco.speed = 0; s.region = 'barn';`);
const inBarn = await chipName();
await swipe(1100, 500);
check('谷仓里横划不换区域', inBarn === '谷仓' && (await chipName()) === '谷仓', `界面=${await chipName()}`);
await mutate(`s.region = 'forest';`);

/* ── 15. 控制台干净 ── */
check('无控制台报错', errs.length === 0, errs.slice(0, 2).join(' | '));

await page.screenshot({ path: '.shots/clock-final.png' });
await browser.close();

const pass = results.filter((r) => r.ok).length;
console.log('\n── 世界时钟与手势 ──');
for (const r of results) {
  console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.n}${r.d ? `  (${r.d})` : ''}`);
}
console.log(`\n通过 ${pass}/${results.length}`);
process.exit(pass === results.length ? 0 : 1);
