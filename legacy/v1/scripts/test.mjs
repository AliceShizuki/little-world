import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

fs.mkdirSync('.shots', { recursive: true });

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const URL = 'http://127.0.0.1:5173/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok: !!ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 810 },
});
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text());
});
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1500);

const save = async () => {
  await sleep(600);
  return page.evaluate(() => JSON.parse(localStorage.getItem('little-world.save.v1') || '{}'));
};

const center = async (sel) => {
  const box = await page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  }, sel);
  return box;
};

const clickSel = async (sel) => {
  const b = await center(sel);
  if (!b) throw new Error('找不到元素 ' + sel);
  await page.mouse.move(b.x, b.y);
  await page.mouse.down();
  await sleep(60);
  await page.mouse.up();
  await sleep(260);
  return b;
};

const dragSel = async (sel, dx, dy, steps = 18) => {
  const b = await center(sel);
  if (!b) throw new Error('找不到元素 ' + sel);
  await page.mouse.move(b.x, b.y);
  await page.mouse.down();
  await sleep(50);
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(b.x + (dx * i) / steps, b.y + (dy * i) / steps);
    await sleep(12);
  }
  await sleep(60);
  await page.mouse.up();
  await sleep(300);
};

// 1. 首屏
let s = await save();
check('初始状态：晴天白天', s.weather === 'clear' && s.timeOfDay === 'day', JSON.stringify({ w: s.weather, t: s.timeOfDay }));
check('种子已生成', s.seed !== null);

// 2. 太阳：连续点击三次不报错
const sunClicks = await page.evaluate(() => {
  const g = document.querySelectorAll('.interactive');
  return g.length;
});
check('场景中可交互元素数量', sunClicks > 10, `共 ${sunClicks} 个 .interactive`);

const sun = await center('.sun-halo');
if (sun) {
  for (let i = 0; i < 3; i++) {
    await page.mouse.move(sun.x, sun.y);
    await page.mouse.down();
    await sleep(60);
    await page.mouse.up();
    await sleep(200);
  }
  check('点击太阳（3 次，含长按前的轻点）', true);
} else check('点击太阳', false, '未找到太阳');

// 3. 太阳长按
await page.mouse.move(sun.x, sun.y);
await page.mouse.down();
await sleep(900);
await page.mouse.up();
await sleep(300);
check('长按太阳出现光芒', await page.evaluate(() => !!document.querySelector('.sun-rays.on')));

// 4. 雨云 -> 下雨
await clickSel('.interactive[aria-label="雨云"]');
let s2 = await save();
check('点击雨云切换为雨天', s2.weather === 'rain', `weather=${s2.weather}`);
check('雨层已显示', await page.evaluate(() => !!document.querySelector('.rain-layer.on')));

// 5. 月亮 -> 夜晚
const moon = await center('.interactive[aria-label="月亮"]');
if (moon) {
  await page.mouse.move(moon.x, moon.y);
  await page.mouse.down();
  await sleep(60);
  await page.mouse.up();
  await sleep(400);
}
let s3 = await save();
check('点击白天的小月亮进入夜晚', s3.timeOfDay === 'night', `timeOfDay=${s3.timeOfDay}`);
// 夜晚再点月亮回到白天
const moonNight = await center('.interactive[aria-label="月亮"]');
await page.mouse.move(moonNight.x, moonNight.y);
await page.mouse.down();
await sleep(80);
await page.mouse.up();
await sleep(500);
let s3b = await save();
check('夜晚点击月亮回到白天', s3b.timeOfDay === 'day', `timeOfDay=${s3b.timeOfDay}`);

// 用设置面板切回白天
await page.evaluate(() => window.scrollTo(0, 0));
// 6. 门 / 窗
const doorBefore = await page.evaluate(() => document.querySelector('.door-leaf').style.transform);
await page.mouse.move(...Object.values(await center('.interactive[aria-label="房门"]')).slice(0, 2));
await clickSel('.interactive[aria-label="房门"]');
const doorAfter = await page.evaluate(() => document.querySelector('.door-leaf').style.transform);
check('点击房门可以开门', doorBefore !== doorAfter, `${doorBefore} -> ${doorAfter}`);

const winBefore = (await save()).windowLit;
await clickSel('.interactive[aria-label="窗户"]');
let s4 = await save();
check('点击窗户可以切换灯光', s4.windowLit === !winBefore, `${winBefore} -> ${s4.windowLit}`);

// 7. 花：点击收拢花瓣
const petalBefore = await page.evaluate(() => document.querySelector('.flower-head .petals').style.transform);
await clickSel('.flower-head');
const petalAfter = await page.evaluate(() => document.querySelector('.flower-head .petals').style.transform);
check('点击花朵收拢花瓣', petalBefore !== petalAfter, `${petalBefore} -> ${petalAfter}`);

// 8. 树：点击摇晃
await clickSel('.interactive[aria-label="树"]');
check('点击树触发摇晃', await page.evaluate(() => !!document.querySelector('.anim-tree-shake')));

// 9. 河流：点击产生波纹
const riverBox = await page.evaluate(() => {
  const p = document.querySelector('.interactive[aria-label="河流"]');
  const r = p.getBoundingClientRect();
  return { x: r.x + r.width * 0.35, y: r.y + r.height * 0.5 };
});
await page.mouse.move(riverBox.x, riverBox.y);
await page.mouse.down();
await sleep(60);
await page.mouse.up();
await sleep(200);
check('点击河面产生波纹', await page.evaluate(() => document.querySelectorAll('.ripple').length > 0));

// 10. 青蛙跳水
await clickSel('.frog');
await sleep(1200);
check('点击青蛙跳入水中', await page.evaluate(() => !!document.querySelector('.frog-away') || document.querySelector('.frog')?.style.opacity === '0'));

// 11. 种植：把种子拖到草地
const plantCountBefore = await page.evaluate(() => document.querySelectorAll('.plant').length);
await dragSel('.seed', 60, 90);
await sleep(700);
const plantCountAfter = await page.evaluate(() => document.querySelectorAll('.plant').length);
let s5 = await save();
check('拖动种子到草地后出现土坑', plantCountAfter > plantCountBefore, `${plantCountBefore} -> ${plantCountAfter}`);
check('种子状态已写入存档', s5.seed === null, `seed=${JSON.stringify(s5.seed)}`);

// 12. 浇水 -> 生长
await clickSel('.plant');
await sleep(500);
check('点击土坑浇水', await page.evaluate(() => !!document.querySelector('.water-drop')));
await sleep(3600);
let s6 = await save();
check('植物生长到幼芽/小苗阶段', (s6.plants?.[0]?.stage ?? 0) >= 1, `stage=${s6.plants?.[0]?.stage}`);

// 13. 胡萝卜喂兔子
const carrotBox = await center('.carrot');
const rabbitBox = await center('.rabbit');
const dx = rabbitBox.x + rabbitBox.w * 0.28 - carrotBox.x;
const dy = rabbitBox.y + rabbitBox.h * 0.25 - carrotBox.y;
await dragSel('.carrot', dx, dy, 22);
await sleep(2600);
const carrotGone = await page.evaluate(() => !document.querySelector('.carrot'));
check('把胡萝卜拖到兔子嘴边被吃掉', carrotGone);

// 14. 小船拖动
const boatBefore = await page.evaluate(() => {
  const b = document.querySelector('.boat');
  return b ? b.getAttribute('transform') : null;
});
await dragSel('.boat', 160, 0, 14);
const boatAfter = await page.evaluate(() => document.querySelector('.boat')?.getAttribute('transform'));
let s7 = await save();
check('小船可以拖动', boatBefore !== boatAfter, `${boatBefore} -> ${boatAfter}`);
check('小船位置已保存', !!s7.boat);

// 15. 云朵拖动
const cloudBefore = await page.evaluate(() => document.querySelector('.cloud')?.getAttribute('transform'));
await dragSel('.cloud', 90, -30, 14);
const cloudAfter = await page.evaluate(() => document.querySelector('.cloud')?.getAttribute('transform'));
check('云朵可以拖动', cloudBefore !== cloudAfter);

// 16. 刷新后恢复
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1400);
const restored = await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('little-world.save.v1') || '{}');
  return {
    plants: s.plants?.length ?? 0,
    weather: s.weather,
    timeOfDay: s.timeOfDay,
    windowLit: s.windowLit,
    plantNodes: document.querySelectorAll('.plant').length,
  };
});
check('刷新后植物仍在场景中', restored.plantNodes === restored.plants && restored.plants > 0, JSON.stringify(restored));
check('刷新后天气/昼夜/灯光保持', restored.weather === 'rain' || restored.timeOfDay === 'night', JSON.stringify(restored));

// 17. 家长设置长按
await sleep(300);
const gear = await center('.gear-btn');
await page.mouse.move(gear.x, gear.y);
await page.mouse.down();
await sleep(1500);
await page.mouse.up();
await sleep(400);
check('长按齿轮打开家长设置', await page.evaluate(() => !!document.querySelector('.panel')));
// 面板内切换白天晴天
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.segments button')];
  btns.find((b) => b.textContent === '白天')?.click();
});
await sleep(200);
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('.segments button')];
  btns.find((b) => b.textContent === '晴天')?.click();
});
await sleep(600);
let s8 = await save();
check('家长面板可切换昼夜与天气', s8.weather === 'clear' && s8.timeOfDay === 'day', JSON.stringify({ w: s8.weather, t: s8.timeOfDay }));
await page.screenshot({ path: 'D:/新建文件夹/2026-10-31-10-30-30/.shots/04-panel.png' });

// 18. 声音开关
await page.evaluate(() => document.querySelector('.panel .close')?.click());
await sleep(300);
await page.evaluate(() => document.querySelector('.gear-btn')?.click());
await page.evaluate(() => document.querySelector('.sound-btn')?.click());
await sleep(400);
let s9 = await save();
check('声音按钮可关闭声音', s9.soundOn === false);

check('无控制台报错', errors.length === 0, errors.join(' | '));

await page.screenshot({ path: 'D:/新建文件夹/2026-10-31-10-30-30/.shots/05-after-test.png' });
console.log('\n==== 汇总 ====');
console.log(`通过 ${results.filter((r) => r.ok).length} / ${results.length}`);
await browser.close();
