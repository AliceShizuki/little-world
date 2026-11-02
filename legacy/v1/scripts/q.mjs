import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: 'new', args:['--no-sandbox'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true} });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', {waitUntil:'domcontentloaded'});
await page.evaluate(()=>localStorage.clear());
await page.reload({waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,1500));
const info = await page.evaluate(()=>{
  const q = (s)=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); return {x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2), w:Math.round(r.width)};};
  return { seed:q('.seed'), rabbit:q('.rabbit'), carrot:q('.carrot'), frog:q('.frog'), boat:q('.boat'), plant:q('.plant') };
});
console.log(JSON.stringify(info,null,1));
await browser.close();
