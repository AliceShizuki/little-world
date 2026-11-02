import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const OUT = 'D:/新建文件夹/2026-10-31-10-30-30/.shots';
fs.mkdirSync(OUT, { recursive: true });

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';

const run = async () => {
  const browser = await puppeteer.launch({
    executablePath: EDGE,
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1'],
    defaultViewport: { width: 1440, height: 810 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1800));
  await page.screenshot({ path: `${OUT}/01-wide.png` });

  // 移动端竖屏
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise((r) => setTimeout(r, 900));
  await page.screenshot({ path: `${OUT}/02-portrait.png` });

  // 桌面横屏：夜晚 + 雨
  await page.setViewport({ width: 1440, height: 810 });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => {
    localStorage.setItem(
      'little-world.save.v1',
      JSON.stringify({ ...JSON.parse(localStorage.getItem('little-world.save.v1') || '{}'), timeOfDay: 'night', weather: 'rain', windowLit: true, doorOpen: true }),
    );
  });
  await page.reload({ waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 2200));
  await page.screenshot({ path: `${OUT}/03-night-rain.png` });

  console.log(JSON.stringify({ errors }, null, 2));
  await browser.close();
};

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
