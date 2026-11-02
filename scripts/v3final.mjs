import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

fs.mkdirSync('docs', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 1440, height: 810 },
});
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1800);

const setState = async (patch) => {
  await page.evaluate((p) => {
    const s = JSON.parse(localStorage.getItem('little-world.v3'));
    localStorage.setItem('little-world.v3', JSON.stringify({ ...s, ...p }));
  }, patch);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1700);
};

await page.screenshot({ path: 'docs/v3-forest.png' });
await page.screenshot({ path: 'docs/preview-day.png' });

await setState({ region: 'farm' });
await page.screenshot({ path: 'docs/v3-farm.png' });
await setState({ region: 'seaside' });
await page.screenshot({ path: 'docs/v3-seaside.png' });
await setState({ region: 'town' });
await page.screenshot({ path: 'docs/v3-town.png' });
await setState({ region: 'home' });
await page.screenshot({ path: 'docs/v3-home.png' });
await setState({ region: 'site' });
await page.screenshot({ path: 'docs/v3-site.png' });
await setState({ region: 'underwater' });
await page.screenshot({ path: 'docs/v3-underwater.png' });
await setState({ region: 'sky' });
await page.screenshot({ path: 'docs/v3-sky.png' });

// 夜雨
await setState({ region: 'forest', phase: 'night', weather: 'rain' });
await page.screenshot({ path: 'docs/preview-night-rain.png' });
// 雪天小镇
await setState({ region: 'town', phase: 'day', weather: 'snow' });
await page.screenshot({ path: 'docs/v3-snow.png' });
// 日落海边
await setState({ region: 'seaside', phase: 'sunset', weather: 'clear' });
await page.screenshot({ path: 'docs/v3-sunset.png' });

// 地图（宽屏）
await page.click('.v3-chip');
await sleep(800);
await page.screenshot({ path: 'docs/v3-map.png' });
await page.close();

// 竖屏
const m = await browser.newPage();
await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await m.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle0' });
await sleep(1800);
await m.screenshot({ path: 'docs/preview-mobile.png' });
await m.click('.v3-chip');
await sleep(800);
await m.screenshot({ path: 'docs/v3-map-mobile.png' });
await m.close();

await browser.close();
console.log('shots done');
