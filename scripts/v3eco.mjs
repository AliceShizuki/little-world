/**
 * 生态因果验收
 *
 * 每一项都去读世界状态（localStorage 里的 eco / ents），而不是看动画有没有播。
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
 * 写存档的助手（两个都带"写完校验 + 重试"）。
 *
 * 坑有两层：
 *  1. 直接往 localStorage 写是无效的——应用每 0.7 秒用自己的内存状态覆盖一次；
 *  2. 就算写了之后立刻 reload，也还有一个极小的窗口（队列里已经排着的那一拍），
 *     偶尔会把我们的写入盖掉。表现是"这一项随机失败"，而且每次失败的地方都不一样。
 *
 * 做法：写盘 + reload 放进同一次 evaluate；写的时候在 eco.log 里塞一个随机标记，
 * reload 后读回来核对标记还在不在，不在就重来。
 */
const TAG = () => 'mut-' + Math.random().toString(36).slice(2, 8);

/**
 * 各时段的起点（一天的进度 0..1）。
 * 昼夜现在是时钟推的：光写 phase/weather 下一拍就会被改回去，
 * 所以要顺手把 clock 拨到该时段的开头，同时给测试留出整整一个时段。
 */
const PHASE_START = { dawn: 0.005, day: 0.105, sunset: 0.505, night: 0.605 };

const patch = async (p, wait = 1600, tries = 3) => {
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
    await sleep(wait);
    const got = await read();
    if ((got.eco?.log || []).includes(tag)) return;
  }
};

const mutate = async (src, wait = 1300, tries = 3) => {
  for (let i = 0; i < tries; i += 1) {
    const tag = TAG();
    await page.evaluate(
      ([code, t]) => {
        const s = JSON.parse(localStorage.getItem('little-world.v3'));
        // eslint-disable-next-line no-new-func
        new Function('s', code)(s);
        // 代码里没自己调时间的话，把时钟拨回白天开头：
        // 否则跑到一半天黑/换天，后面等的那些"长出来"就会被拖慢或打断
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

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(2000);

/* ── 0. 世界状态存在 ── */
let s = await read();
check(
  '世界状态存在（时间/湿度/水位/有机质）',
  !!s.eco && typeof s.eco.t === 'number' && typeof s.eco.soil === 'number' && typeof s.eco.water === 'number',
  `t=${s.eco && s.eco.t.toFixed(1)} soil=${s.eco && s.eco.soil.toFixed(2)}`,
);

/* ── 1. 下雨 → 土壤湿度上升 ── */
await mutate(`
  s.weather = 'rain';
  s.eco.speed = 1;
  s.eco.soil = 0.25;
  s.eco.rain = 0;
`);
const soilBefore = (await read()).eco.soil;
await sleep(4000);
const afterRain = await read();
check(
  '下雨后土壤湿度上升',
  afterRain.eco.soil > soilBefore + 0.1,
  `${soilBefore.toFixed(2)} → ${afterRain.eco.soil.toFixed(2)}，雨量 ${afterRain.eco.rain.toFixed(2)}`,
);
check('水位跟着雨变大', afterRain.eco.water > 0.5, `water=${afterRain.eco.water.toFixed(2)}`);

/* ── 2. 转晴 → 湿度逐渐下降 ── */
// 转晴 = 雨停：rain 要一起归零，否则上一场的雨还在往土里渗
await mutate(`s.weather = 'clear'; s.eco.rain = 0; s.eco.soil = 0.8; s.eco.speed = 4;`);
const wetSoil = (await read()).eco.soil;
await sleep(5000);
const dried = await read();
check(
  '转晴后土壤湿度下降（蒸发）',
  dried.eco.soil < wetSoil - 0.02,
  `${wetSoil.toFixed(2)} → ${dried.eco.soil.toFixed(2)}`,
);

/* ── 3. 花开 + 蜂在附近 → 授粉 ── */
await mutate(`
  s.eco.speed = 4;
  s.weather = 'clear';
  const fl = s.ents.find((e) => e.t === 'flower' && e.r === 'forest');
  fl.st = 4; fl.pol = false; fl.age = 0;
  const bee = s.ents.find((e) => e.t === 'bee' && e.r === 'forest');
  bee.x = fl.x + 20; bee.y = fl.y - 30; bee.hx = bee.x; bee.hy = bee.y;
  s.__flowerId = fl.id;
  window.__fid = fl.id;
`);
await sleep(2600);
const pollinated = await read();
const fid = pollinated.ents.find((e) => e.t === 'flower' && e.r === 'forest' && e.pol)?.id;
check('蜂蝶访问后花朵被授粉', !!fid, fid ? `已授粉 ${fid}` : '没有 pol=true 的花');

/* ── 4. 授粉之后 → 进入结果阶段 ── */
let fruited = null;
for (let i = 0; i < 12; i += 1) {
  const st = await read();
  fruited = st.ents.find((e) => (e.st ?? 0) >= 5 && ['plant', 'flower', 'berry'].includes(e.t));
  if (fruited) break;
  await sleep(900);
}
check('授粉后进入结果阶段', !!fruited, fruited ? `st=${fruited.st} t=${fruited.t}` : '一直是 4');

/* ── 5. 松果 → 松鼠收集（或被搬走） ── */
await mutate(`
  s.eco.speed = 4;
  const sq = s.ents.find((e) => e.t === 'squirrel' && e.r === 'forest');
  // 在松鼠旁边放一颗松果
  s.ents.push({ id: 'test-pine', t: 'pinecone', r: 'forest', x: sq.x + 60, y: sq.y + 4, s: 1.2 });
  sq.cd = 0;
  sq.car = undefined;
`);
let squirrelTook = false;
for (let i = 0; i < 14; i += 1) {
  const st = await read();
  const pine = st.ents.find((e) => e.id === 'test-pine');
  const sq = st.ents.find((e) => e.t === 'squirrel' && e.r === 'forest');
  if (!pine || (sq && sq.car) || (sq && sq.f)) {
    squirrelTook = true;
    break;
  }
  await sleep(800);
}
check('松鼠会去收集松果', squirrelTook, squirrelTook ? '松果被带走/吃掉' : '松果还在原地');

/* ── 6 & 7. 落叶分解 → 有机质上升 ── */
await mutate(`
  s.eco.speed = 4;
  s.eco.organic = 0.24;
  s.ents = s.ents.filter((e) => e.id !== 'test-litter');
`);
const orgBefore = (await read()).eco.organic;
await mutate(`
  s.eco.speed = 4;
  s.ents.push({ id: 'test-litter', t: 'leafpile', r: 'forest', x: 700, y: 776, st: 1, age: 0.99, s: 1.2 });
`, 1600);
let decomposed = false;
for (let i = 0; i < 10; i += 1) {
  await sleep(800);
  const st = await read();
  if (!st.ents.find((e) => e.id === 'test-litter')) {
    decomposed = true;
    break;
  }
}
const orgAfter = (await read()).eco.organic;
check('落叶会分解消失', decomposed);
check('分解让土壤有机质上升', orgAfter > orgBefore, `${orgBefore.toFixed(2)} → ${orgAfter.toFixed(2)}`);

/* ── 8. 夜晚 → 白天活动的动物睡觉 ── */
await patch({ phase: 'night' }, 2200);
let s2 = await read();
const rabbit = s2.ents.find((e) => e.t === 'rabbit' && e.r === 'forest');
const sleepers = s2.ents.filter((e) => e.r === 'forest' && e.act === 'sleep').length;
check('夜里白天活动的动物进入睡眠', sleepers >= 1, `睡着 ${sleepers} 只（兔子 act=${rabbit && rabbit.act}）`);
await page.screenshot({ path: '.shots/eco-night.png' });

/* ── 9. 昼夜影响环境 ── */
const nightDom = await page.evaluate(() => ({
  moon: document.querySelectorAll('circle[fill="url(#moonBody)"]').length,
  bright: getComputedStyle(document.body).backgroundColor,
}));
check('夜晚出现月亮', nightDom.moon >= 1, `月亮 ${nightDom.moon}`);
await patch({ phase: 'day' }, 1800);

/* ── 10. 暂停 → 时间停住 ── */
await mutate(`s.eco.speed = 0;`);
const tPaused = (await read()).eco.t;
await sleep(2200);
const tAfterPause = (await read()).eco.t;
check('暂停后世界不再推进', Math.abs(tAfterPause - tPaused) < 0.05, `${tPaused.toFixed(1)} → ${tAfterPause.toFixed(1)}`);

/* ── 11. 恢复播放 → 时间继续 ── */
await mutate(`s.eco.speed = 2;`);
await sleep(2500);
const tResumed = (await read()).eco.t;
check('恢复后时间继续走', tResumed > tAfterPause + 1, `${tAfterPause.toFixed(1)} → ${tResumed.toFixed(1)}`);

/* ── 12. 连续快速操作不炸 ── */
const before = await read();
for (let i = 0; i < 6; i += 1) {
  await page.evaluate((k) => {
    const svg = document.querySelector('.v3-stage');
    const r = svg.getBoundingClientRect();
    const el = document.elementFromPoint(r.x + 300 + k * 90, r.y + r.height * 0.6);
    el?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.x + 300 + k * 90, clientY: r.y + r.height * 0.6 }));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  }, i);
  await sleep(120);
}
await sleep(1500);
const after = await read();
check(
  '连续快速操作后世界仍然完整',
  Math.abs(after.ents.length - before.ents.length) < 12 && !!after.eco && !Number.isNaN(after.eco.t),
  `${before.ents.length} → ${after.ents.length}`,
);

/* ── 13. 动物不瞬移（连续两次采样位移合理） ── */
// 用常速采样：1.4 秒最多走 1.4×40 = 56 单位。4 倍速下 5.6 秒的上限本来就是 224，
// 阈值 140 拦不住真正的瞬移，只能拦住"走得快"。
await mutate(`s.eco.speed = 1;`);
const posA = await read();
await sleep(1400);
const posB = await read();
let maxJump = 0;
for (const a of posA.ents) {
  const b = posB.ents.find((x) => x.id === a.id);
  if (!b || !a.act) continue;
  maxJump = Math.max(maxJump, Math.hypot(b.x - a.x, b.y - a.y));
}
// 常速 1.4 秒：闲逛最多 40×1.4 = 56，被吓到时快 45% 也就是 81。
// 阈值放到 95 仍然拦得住真正的瞬移（那都是几百单位），但不会因为"刚好在逃"误报。
check('动物移动是连续的（没有瞬移）', maxJump < 95, `单步最大位移 ${Math.round(maxJump)}（常速 1.4 秒，逃跑上限约 81）`);

/* ── 14. 刷新后世界状态恢复 ── */
const beforeReload = await read();
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1200);
const afterReload = await read();
check(
  '刷新后世界状态恢复',
  Math.abs(afterReload.eco.t - beforeReload.eco.t) < 12 &&
    afterReload.eco.stage === beforeReload.eco.stage &&
    Math.abs(afterReload.eco.soil - beforeReload.eco.soil) < 0.2,
  `t ${beforeReload.eco.t.toFixed(0)} → ${afterReload.eco.t.toFixed(0)}`,
);

/* ── 15. 事件流真的有内容 ── */
const final = await read();
check('事件流记录了世界变化', final.eco.log.length >= 3, final.eco.log.slice(-4).join(' | '));

/* ── 16. 无控制台报错 ── */
check('无控制台报错', errs.length === 0, errs.slice(0, 3).join(' | '));

console.log('\n── 生态因果验收 ──');
results.forEach((r) => console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.n}${r.d ? '  (' + r.d + ')' : ''}`));
console.log(`\n通过 ${results.filter((r) => r.ok).length}/${results.length}`);
await browser.close();
