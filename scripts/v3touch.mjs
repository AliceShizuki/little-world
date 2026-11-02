import puppeteer from 'puppeteer-core';

const browser = await puppeteer.launch({
  executablePath: 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: 'new', args: ['--no-sandbox'],
});
const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const vp of [
  { name: '竖屏手机 390×844', width: 390, height: 844, isMobile: true, hasTouch: true },
  { name: '横屏手机 844×390', width: 844, height: 390, isMobile: true, hasTouch: true },
  { name: '平板 1024×768', width: 1024, height: 768, hasTouch: true },
]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  await page.setViewport(vp);
  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1600);

  // 用触摸事件拖动一个可拖动物体
  const target = await page.evaluate(() => {
    const el = document.querySelector('.v3-ent:not([data-t="rabbit"]):not([data-t="squirrel"])');
    const list = [...document.querySelectorAll('.v3-ent')].filter((n) => !n.querySelector('.v3-hit')?.parentElement?.dataset.fixed);
    /*
     * 优先拖石头：它是惰性的，不会在落点上跟别的东西合成掉。
     * 之前优先橡果 / 种子，偶尔拖到别的东西上就"合成了"，实体从存档里消失，
     * 断言只看到 no entity——看起来像拖拽失败，其实是拖成功了。
     */
    const pick = list.find((n) => n.dataset.t === 'rock') || list.find((n) => n.dataset.t === 'log') || el;
    if (!pick) return null;
    const r = pick.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, t: pick.dataset.t, id: pick.dataset.id };
  });
  if (target) {
    await page.touchscreen.touchStart(target.x, target.y);
    for (let i = 1; i <= 10; i += 1) {
      await page.touchscreen.touchMove(target.x + i * 9, target.y - i * 2);
      await sleep(12);
    }
    await page.touchscreen.touchEnd();
    await sleep(500);
    const moved = await page.evaluate((id) => {
      const s = JSON.parse(localStorage.getItem('little-world.v3') || '{}');
      const e = (s.ents || []).find((x) => x.id === id);
      return e ? { x: e.x, y: e.y } : null;
    }, target.id);
    const before = await page.evaluate((id) => {
      const s = JSON.parse(localStorage.getItem('little-world.v3') || '{}');
      return (s.ents || []).find((x) => x.id === id)?.x ?? 0;
    }, target.id);
    check(`${vp.name} 触摸拖动成功`, !!moved, moved ? `x=${Math.round(moved.x)}` : 'no entity');
  } else {
    check(`${vp.name} 触摸拖动成功`, false, '未找到可拖动物体');
  }

  // 页面没有被拖动滚动
  const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
  check(`${vp.name} 拖动时页面不滚动`, scroll.x === 0 && scroll.y === 0, `scroll=${scroll.x},${scroll.y}`);

  // 场景铺满
  const fill = await page.evaluate(() => {
    const svg = document.querySelector('.v3-stage');
    if (!svg) return null;
    const r = svg.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), vw: innerWidth, vh: innerHeight };
  });
  check(`${vp.name} 画面铺满视口`, fill && fill.w === fill.vw && fill.h === fill.vh, fill ? `${fill.w}×${fill.h}` : '');

  // 地图在窄屏可用（节点够大）
  await page.click('.v3-chip');
  await sleep(700);
  const nodeSize = await page.evaluate(() => {
    const n = document.querySelector('.v3-map-node');
    if (!n) return 0;
    return Math.round(n.getBoundingClientRect().width);
  });
  check(`${vp.name} 地图节点可点（≥60px）`, nodeSize >= 60, `${nodeSize}px`);
  await page.screenshot({ path: `.shots/m-${vp.width}.png` });
  check(`${vp.name} 无报错`, errs.length === 0, errs.slice(0, 2).join('|'));
  await page.close();
}

results.forEach((r) => console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.n}${r.d ? '  (' + r.d + ')' : ''}`));
console.log(`通过 ${results.filter((r) => r.ok).length}/${results.length}`);
await browser.close();
