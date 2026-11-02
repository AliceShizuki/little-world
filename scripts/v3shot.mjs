import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

const OUT = '.shots';
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1440, height: 810 },
});
const page = await browser.newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1800));

const regions = ['forest', 'farm', 'seaside', 'town', 'home', 'site', 'underwater', 'sky'];
const names = { forest: '森林', farm: '农场', seaside: '海边', town: '小镇', home: '小屋', site: '工地', underwater: '海底', sky: '天空' };

await page.screenshot({ path: `${OUT}/r0-forest.png` });

// 打开地图
await page.click('.v3-chip');
await new Promise((r) => setTimeout(r, 900));
await page.screenshot({ path: `${OUT}/r-map.png` });

for (let i = 0; i < regions.length; i += 1) {
  const r = regions[i];
  if (!(await page.$('.v3-map'))) {
    await page.click('.v3-chip');
    await new Promise((x) => setTimeout(x, 700));
  }
  const nodes = await page.$$('.v3-map-node');
  await nodes[i].click();
  await new Promise((x) => setTimeout(x, 1200));
  await page.screenshot({ path: `${OUT}/r${i + 1}-${r}.png` });
}

console.log('errors:', errs.length ? errs.slice(0, 6) : 'none');
await browser.close();
