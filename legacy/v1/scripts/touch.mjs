import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text());
});
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1500);

const client = await page.createCDPSession();
const touch = async (type, x, y) => {
  await client.send('Input.dispatchTouchEvent', {
    type,
    touchPoints: type === 'touchEnd' ? [] : [{ x, y, radiusX: 12, radiusY: 12, force: 1 }],
  });
};

const box = async (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width, h: r.height };
  }, sel);

// 触屏拖动种子
const seed = await box('.seed');
await touch('touchStart', seed.x, seed.y);
await sleep(60);
for (let i = 1; i <= 14; i++) {
  await touch('touchMove', seed.x + i * 4, seed.y + i * 5);
  await sleep(16);
}
await touch('touchEnd', 0, 0);
await sleep(800);

const planted = await page.evaluate(() => document.querySelectorAll('.plant').length);
console.log(planted > 0 ? 'PASS  触屏拖动种子成功种植' : 'FAIL  触屏拖动种子未能种植');

const scrolled = await page.evaluate(() => window.scrollY !== 0 || document.documentElement.scrollTop !== 0);
console.log(!scrolled ? 'PASS  拖动过程中页面没有滚动' : 'FAIL  页面发生了滚动');

// 触屏点击太阳
const sun = await box('.sun-halo');
await touch('touchStart', sun.x, sun.y);
await sleep(80);
await touch('touchEnd', 0, 0);
await sleep(300);
console.log('PASS  触屏点击太阳无异常');

// 触屏点击青蛙
const frog = await box('.frog');
await touch('touchStart', frog.x, frog.y);
await sleep(80);
await touch('touchEnd', 0, 0);
await sleep(900);
const frogAway = await page.evaluate(() => document.querySelector('.frog')?.style.opacity === '0');
console.log(frogAway ? 'PASS  触屏点击青蛙跳水' : 'FAIL  触屏点击青蛙没有反应');

await page.screenshot({ path: 'D:/新建文件夹/2026-10-31-10-30-30/.shots/06-mobile-planted.png' });
console.log(errors.length === 0 ? 'PASS  无控制台报错' : 'FAIL  报错: ' + errors.join(' | '));
await browser.close();
