import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({ executablePath: 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: 'new', args:['--no-sandbox'], defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:3} });
const page = await browser.newPage();
await page.goto('http://127.0.0.1:5173/', {waitUntil:'domcontentloaded'});
await page.evaluate(()=>localStorage.clear());
await page.reload({waitUntil:'networkidle0'});
await new Promise(r=>setTimeout(r,1500));
await page.screenshot({path:'D:/新建文件夹/2026-10-31-10-30-30/.shots/crop-rabbit.png', clip:{x:60,y:470,width:220,height:230}});
await browser.close();
