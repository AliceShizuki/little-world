import puppeteer from 'puppeteer-core';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const OUT = 'D:/新建文件夹/2026-10-31-10-30-30/.shots';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: EDGE,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  defaultViewport: { width: 1440, height: 810, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1600);

const clipOf = async (sel, pad = 30, path = 'detail') => {
  const box = await page.evaluate((s, p) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.max(0, r.x - p), y: Math.max(0, r.y - p), width: r.width + p * 2, height: r.height + p * 2 };
  }, sel, pad);
  if (!box) {
    console.log('missing', sel);
    return;
  }
  await page.screenshot({ path: `${OUT}/${path}.png`, clip: box });
  console.log('saved', path);
};

await clipOf('.rabbit', 30, 'd-rabbit');
await clipOf('.interactive[aria-label="树"]', 20, 'd-tree');
await clipOf('.gear-btn', 10, 'd-gear');
await page.evaluate(() => {
  const h = document.querySelector('svg > g:last-of-type');
  return h;
});
// 房子
const houseBox = await page.evaluate(() => {
  const gs = [...document.querySelectorAll('g')].filter((g) => g.querySelector('.door-leaf'));
  const r = gs[0].getBoundingClientRect();
  return { x: r.x - 20, y: r.y - 20, width: r.width + 40, height: r.height + 40 };
});
await page.screenshot({ path: `${OUT}/d-house.png`, clip: houseBox });
console.log('saved d-house');

// 兔子吃东西状态
await page.evaluate(() => {
  document.querySelector('.rabbit')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
});
await sleep(300);

await browser.close();
