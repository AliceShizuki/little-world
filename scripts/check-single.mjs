import puppeteer from 'puppeteer-core';
import path from 'node:path';
const file = 'file:///' + path.resolve('小小世界.html').replace(/\\/g, '/');
const b = await puppeteer.launch({ executablePath:'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless:'new', args:['--no-sandbox'], defaultViewport:{width:1440,height:810} });
const p = await b.newPage();
const errs = [];
p.on('pageerror', e => errs.push(e.message));
p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
await p.goto(file, { waitUntil:'networkidle0' });
await new Promise(r=>setTimeout(r,1800));
const info = await p.evaluate(() => ({
  ents: document.querySelectorAll('.v3-ent').length,
  svg: !!document.querySelector('.v3-stage'),
  ls: (() => { try { localStorage.setItem('t','1'); localStorage.removeItem('t'); return 'ok'; } catch(e){ return 'blocked'; } })(),
}));
console.log(JSON.stringify(info), 'errors:', errs.length? errs.slice(0,3):'none');
await b.close();
