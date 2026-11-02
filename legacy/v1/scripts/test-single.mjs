import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const file = 'file:///' + path.resolve('standalone/index.html').replace(/\\/g, '/');
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
await page.goto(file, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 1500));

const info = await page.evaluate(() => {
  const svg = document.querySelector('svg');
  let ls = 'ok';
  try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); } catch (e) { ls = 'BLOCKED: ' + e.name; }
  return {
    hasSvg: !!svg,
    interactiveCount: document.querySelectorAll('.interactive').length,
    localStorage: ls,
    bodyBg: getComputedStyle(document.body).backgroundColor,
  };
});
console.log(JSON.stringify(info, null, 1));
console.log('console errors:', errs.length ? errs.slice(0, 5) : 'none');

fs.mkdirSync('.shots', { recursive: true });
await page.screenshot({ path: '.shots/single-file.png' });
await browser.close();
