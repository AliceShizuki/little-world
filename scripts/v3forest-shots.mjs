/** 生成森林区域的预览图（docs/） */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

fs.mkdirSync('docs', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1440, height: 810 },
});
const page = await browser.newPage();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const setAndShot = async (patch, file) => {
  await page.evaluate((pp) => {
    const s = JSON.parse(localStorage.getItem('little-world.v3'));
    localStorage.setItem('little-world.v3', JSON.stringify({ ...s, ...pp }));
  }, patch);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1600);
  await page.evaluate(() => {
    if (!document.getElementById('hideHint')) {
      const st = document.createElement('style');
      st.id = 'hideHint';
      st.textContent = '.hint{display:none!important}';
      document.head.appendChild(st);
    }
  });
  await page.screenshot({ path: `docs/${file}` });
};

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1800);

// 让世界先自己跑一会儿：植物长到开花、落叶积起来、动物走开位置
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('little-world.v3'));
  s.eco.stage = 2;
  s.eco.speed = 3;
  s.eco.soil = 0.6;
  // 给一株植物浇水，让它真的长起来
  const seed = s.ents.find((e) => e.id === 'amb-f-flower1');
  if (seed) seed.f = true;
  localStorage.setItem('little-world.v3', JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle0' });
await sleep(14000);

await setAndShot({ region: 'forest', weather: 'clear', phase: 'day' }, 'forest-day.png');
await setAndShot({ region: 'forest', weather: 'clear', phase: 'night' }, 'forest-night.png');
await setAndShot({ region: 'forest', weather: 'rain', phase: 'day' }, 'forest-rain.png');
await setAndShot({ region: 'forest', weather: 'clear', phase: 'sunset' }, 'forest-sunset.png');
await setAndShot({ region: 'burrow', weather: 'clear', phase: 'day' }, 'forest-burrow.png');
await setAndShot({ region: 'canopy', weather: 'clear', phase: 'day' }, 'forest-canopy.png');

// 竖屏
const m = await browser.newPage();
await m.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
await m.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await m.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('little-world.v3'));
  localStorage.setItem('little-world.v3', JSON.stringify({ ...s, region: 'forest', phase: 'day', weather: 'clear' }));
});
await m.reload({ waitUntil: 'networkidle0' });
await sleep(1700);
await m.evaluate(() => {
  const st = document.createElement('style');
  st.textContent = '.hint{display:none!important}';
  document.head.appendChild(st);
});
await m.screenshot({ path: 'docs/forest-mobile.png' });

await browser.close();
console.log('shots done');
