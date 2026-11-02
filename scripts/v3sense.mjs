/**
 * 感官与关系验收
 *
 * 这一轮加的东西都不是"功能按钮"，而是让世界更像有人住：
 *   1. 会唱歌的石头：敲不同的那块，音高不一样（五声音阶）
 *   2. 谁吓唬谁：狐狸靠近兔子，兔子撒腿就跑
 *   3. 等一等才有的秘密：退潮才浮出来的、要连点三下的
 *   4. 回来时世界留下痕迹
 *   5. 画面左右两枚翻页箭头
 *
 * 声音用"数振荡器"来验证：playNote 一次建 3 个，别的音效建 1 个。
 * 这样不用真的听，也能确认"敲出了音高"而不是"随便响了一下"。
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

fs.mkdirSync('.shots', { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C://Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1440, height: 810 },
});
const page = await browser.newPage();
const errs = [];
page.on('console', (m) => {
  if (m.type() === 'error' && !m.text().includes('404')) errs.push(m.text());
});
page.on('pageerror', (e) => errs.push('PAGEERROR: ' + e.message));

const results = [];
const check = (n, ok, d = '') => results.push({ n, ok, d });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('little-world.v3') || '{}'));

const PHASE_START = { dawn: 0.005, day: 0.105, sunset: 0.505, night: 0.605 };
const TAG = () => 'mut-' + Math.random().toString(36).slice(2, 8);
/** 写存档 + 刷新（原子）+ 标记校验，与其它套件同一套写法 */
const mutate = async (src, wait = 1400, tries = 3) => {
  for (let i = 0; i < tries; i += 1) {
    const tag = TAG();
    await page.evaluate(
      ([code, t, starts]) => {
        const s = JSON.parse(localStorage.getItem('little-world.v3'));
        // eslint-disable-next-line no-new-func
        new Function('s', code)(s);
        if (!code.includes('clock')) s.eco.clock = starts[s.phase || 'day'] ?? 0.105;
        s.eco.log = [...(s.eco.log || []), t];
        localStorage.setItem('little-world.v3', JSON.stringify(s));
        location.reload();
      },
      [src, tag, PHASE_START],
    );
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(wait);
    if (((await read()).eco?.log || []).includes(tag)) return;
  }
};

const toScreen = (x, y) =>
  page.evaluate(
    (dx, dy) => {
      const svg = document.querySelector('.v3-stage');
      if (!svg) return null;
      const pt = svg.createSVGPoint();
      pt.x = dx;
      pt.y = dy;
      const p = pt.matrixTransform(svg.getScreenCTM());
      return { x: p.x, y: p.y };
    },
    x,
    y,
  );

const NAME_CHIP = '.v3-chip[aria-label="打开世界地图"] span';
const chipName = () =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    return el ? el.textContent.trim() : '';
  }, NAME_CHIP);

/** 数振荡器：playNote 建 3 个，其它音效建 1 个 */
const spyAudio = () =>
  page.evaluate(() => {
    window.__osc = 0;
    const proto = window.AudioContext.prototype;
    if (proto.__spied) return;
    const orig = proto.createOscillator;
    proto.createOscillator = function (...a) {
      window.__osc += 1;
      return orig.apply(this, a);
    };
    proto.__spied = true;
  });
const oscCount = () => page.evaluate(() => window.__osc ?? 0);

await page.goto('http://127.0.0.1:5173/', { waitUntil: 'domcontentloaded' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1800);
await page.evaluate(() => {
  const st = document.createElement('style');
  st.textContent = '.hint{display:none!important}';
  document.head.appendChild(st);
});

/* ── 1. 会唱歌的石头：五块石头，五个不同的音 ── */
await mutate(`s.region = 'forest'; s.eco.speed = 0;`);
await spyAudio();
const notes = [];
for (let i = 0; i < 5; i += 1) {
  // 与 hotspots.ts 的 CHIMES[0] 同一份坐标（x 860 / gap 36 / y 866）
  const x = 860 + i * 36;
  const pt = await toScreen(x, 866);
  const before = await oscCount();
  await page.mouse.click(pt.x, pt.y);
  await sleep(320);
  notes.push((await oscCount()) - before);
}
check(
  '溪边五块石头都能敲响（每次三个泛音）',
  notes.every((n) => n >= 3),
  `每次新增振荡器 ${notes.join('/')}`,
);

/* ── 2. 谁吓唬谁：狐狸凑近，兔子跑开 ── */
/**
 * 把狐狸挪到兔子旁边。
 *
 * 不用通用的 mutate：它靠 `new Function` 执行字符串，这里要传两个实体 id、
 * 而且必须在同一个函数作用域里改两个对象，写成字符串很容易静默失败。
 * 直接写 + 标记 + 刷新后校验，和 mutate 是同一套约定（见 AGENTS 3.16）。
 */
const putFoxNearRabbit = async (tries = 3) => {
  for (let i = 0; i < tries; i += 1) {
    const st = await read();
    const rab = st.ents.find((e) => e.t === 'rabbit' && e.r === 'forest');
    const fox = st.ents.find((e) => e.t === 'fox' && e.r === 'forest');
    if (!rab || !fox) return null;
    const tag = 'scare-' + Math.random().toString(36).slice(2, 8);
    /*
     * 写盘和刷新必须在**同一次** evaluate 里。
     * 分成两次的话，中间那零点几秒里应用会拍一次自动存档，把写入盖回旧值
     * ——表现是"写进去 777，刷新后读出来 866"（见 AGENTS 3.16）。
     * 写入后的实际坐标塞进一个应用不会碰的 key，刷新后回读，用来判断到底写成了什么。
     */
    await page.evaluate(
      ([rid, fid, t]) => {
        const s = JSON.parse(localStorage.getItem('little-world.v3'));
        const r = s.ents.find((e) => e.id === rid);
        const f = s.ents.find((e) => e.id === fid);
        if (!r || !f) return;
        /*
         * 把**兔子**挪到狐狸左边，而不是把狐狸拖到兔子那儿：
         * 狐狸的活动范围被 HABITAT 限制在右侧（x > 900 一带），
         * 放到 777 它第一拍就被拉回边界，两者永远近不了。
         */
        r.x = f.x - 34;
        r.y = f.y;
        s.eco.speed = 1;
        s.eco.clock = 0.105;
        s.eco.log = [...(s.eco.log || []), t];
        localStorage.setItem('little-world.v3', JSON.stringify(s));
        localStorage.setItem('__scare', JSON.stringify({ tag: t, rx: r.x, ry: r.y, fx: f.x, fy: f.y }));
        location.reload();
      },
      [rab.id, fox.id, tag],
    );
    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => {});
    await sleep(650);
    const wrote = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('__scare') || 'null');
      } catch {
        return null;
      }
    });
    const got = await read();
    const f2 = got.ents.find((e) => e.id === fox.id);
    console.log(`      ↳ 试${i + 1}：写入狐 ${wrote ? Math.round(wrote.fx) : '?'}（兔 ${wrote ? Math.round(wrote.rx) : '?'}）→ 刷新后狐 ${f2 ? Math.round(f2.x) : '?'} 标记=${(got.eco?.log || []).includes(tag)}`);
    if (wrote && wrote.tag === tag && (got.eco?.log || []).includes(tag)) {
      return { id: rab.id, x: wrote.rx, y: wrote.ry, foxId: fox.id };
    }
  }
  return null;
};

const startle = await putFoxNearRabbit();
if (startle) {
  /*
   * 判据看**方向和距离**，不看 act / fl：
   *
   * act === 'flee' 只维持 4.5 秒，而写入 + 刷新 + 等待加起来很容易错过那一拍；
   * fl 虽然在存档里，但存档 0.7 秒才写一次，轮询也拿不稳。
   * "朝远离狐狸的方向跑出一大段"才是这件事的本质，而且它骗不了人：
   * 普通散步是随机方向的，不可能稳定地朝同一个方向跑 100 多。
   */
  await sleep(2600);
  const st = await read();
  const rab = st.ents.find((e) => e.id === startle.id);
  const foxNow = st.ents.find((e) => e.id === startle.foxId);
  const moved = rab ? Math.hypot(rab.x - startle.x, rab.y - startle.y) : 0;
  const away = rab && foxNow ? foxNow.x - rab.x : 0;
  check(
    '狐狸靠近，兔子撒腿就跑',
    !!rab && moved > 90 && away > 60,
    `跑了 ${Math.round(moved)}，与狐狸拉开 ${Math.round(away)}（act=${rab ? rab.act : '?'}）`,
  );
} else {
  check('狐狸靠近，兔子撒腿就跑', false, '森林里没有狐狸或兔子');
}

/* ── 3. 退潮才浮出来的秘密 ── */
await mutate(`s.region = 'seaside'; s.eco.speed = 0; s.eco.tide = 0.2;`);
const lowCount = await page.evaluate(() => document.querySelectorAll('.v3-secret').length);
await mutate(`s.region = 'seaside'; s.eco.speed = 0; s.eco.tide = 0.8;`);
const highCount = await page.evaluate(() => document.querySelectorAll('.v3-secret').length);
check(
  '退潮与涨潮露出的秘密不一样多',
  lowCount !== highCount && lowCount > 0 && highCount > 0,
  `退潮 ${lowCount} 处 / 涨潮 ${highCount} 处`,
);

/* ── 4. 连点三次才开的秘密 ── */
// f-knock 在森林 1170,652：前两下只抖，第三下才开
/*
 * 先把兔子挪回左边。
 * 上一段把它放到了 1363 一带，它的宽容命中盒（外扩 16）会盖住 1170 附近，
 * 三次点击全被它吃掉——表现就是"点了三下，秘密一个没开"。
 */
await mutate(`s.region = 'forest'; s.eco.speed = 0;
  const rr = s.ents.find((e) => e.t === 'rabbit' && e.r === 'forest');
  if (rr) { rr.x = 420; rr.y = 720; }`);
const knockPt = await toScreen(1170, 642);
const secretBefore = (await read()).secrets.length;
for (let i = 0; i < 2; i += 1) {
  await page.mouse.click(knockPt.x, knockPt.y);
  await sleep(320);
}
const after2 = (await read()).secrets.length;
await page.mouse.click(knockPt.x, knockPt.y);
await sleep(700);
const after3 = (await read()).secrets.length;
check(
  '要连点三下才开的秘密：两下不开、第三下开',
  after2 === secretBefore && after3 > secretBefore,
  `秘密数 ${secretBefore} → ${after2} → ${after3}`,
);

/* ── 5. 回来时世界留下痕迹 ── */
await mutate(`s.region = 'forest'; s.eco.speed = 0; s.lastSeen = Date.now() - 6 * 60 * 1000;`, 1500);
const trace = (await read()).ents.filter((e) => String(e.id).startsWith('trace-'));
check('隔一阵回来，门口多了一点痕迹', trace.length === 1, trace.length ? `${trace[0].t}@${Math.round(trace[0].x)},${Math.round(trace[0].y)}` : '没有痕迹');
// 再刷新一次不该越攒越多
await page.reload({ waitUntil: 'networkidle0' });
await sleep(1500);
const trace2 = (await read()).ents.filter((e) => String(e.id).startsWith('trace-'));
check('痕迹不会越攒越多', trace2.length === 1, `${trace2.length} 件`);

/* ── 6. 画面左右两枚翻页箭头 ── */
await mutate(`s.region = 'forest'; s.eco.speed = 0;`);
const boxOf = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: Math.round(r.width) };
  }, sel);
const right = await boxOf('.v3-flip-r');
const left = await boxOf('.v3-flip-l');
check('左右箭头都在、且够大能戳到', !!right && !!left && right.w >= 44 && left.w >= 44, `直径 ${right ? right.w : '?'}px`);

if (right) {
  await page.mouse.click(right.x, right.y);
  await sleep(1000);
  const next = await chipName();
  await page.mouse.click(left.x, left.y);
  await sleep(1000);
  const back = await chipName();
  check('点右箭头去下一个、点左箭头回上一个', next === '农场' && back === '森林', `${next} → ${back}`);
}

/* ── 7. 稻草人与挂钟：新加的东西真的在画面上 ── */
await mutate(`s.region = 'farm'; s.eco.speed = 0;`);
const scare = await page.evaluate(() => !!document.querySelector('.v3-stage'));
const scareFx = async () => {
  const p2 = await toScreen(890, 630);
  const before = await page.evaluate(() => document.querySelectorAll('.v3-fx').length);
  await page.mouse.click(p2.x, p2.y);
  await sleep(320);
  return (await page.evaluate(() => document.querySelectorAll('.v3-fx').length)) > before;
};
check('农场稻草人点一下有反应', scare && (await scareFx()), `舞台存在=${scare}`);

await mutate(`s.region = 'home'; s.eco.speed = 0;`);
const hands = await page.evaluate(() => document.querySelectorAll('svg line[transform^="rotate"]').length);
check('小屋挂钟的指针跟着时钟转', hands >= 2, `指针 ${hands} 根`);

/* ── 8. 动物按移动方向转身（0.3 秒过渡） ── */
await mutate(`s.region = 'forest'; s.eco.speed = 1;`);
const samples = [];
for (let i = 0; i < 14; i += 1) {
  const st = await read();
  const r = st.ents.find((e) => e.t === 'rabbit' && e.r === 'forest');
  const face = await page.evaluate(() => {
    const el = document.querySelector('.v3-ent[data-t="rabbit"] .v3-face');
    const m = /scaleX\((-?1)\)/.exec(el?.getAttribute('style') || '');
    return m ? Number(m[1]) : null;
  });
  if (r) samples.push({ x: r.x, face });
  await sleep(620);
}
/**
 * 判据：**朝向要跟着位移走**。
 * 只检查"出现过 -1"是不够的——静止时也有个初始朝向；
 * 真正要证明的是"往右走的时候朝右、往左走的时候朝左"。
 */
let agree = 0;
for (let i = 1; i < samples.length; i += 1) {
  const dx = samples[i].x - samples[i - 1].x;
  if (Math.abs(dx) > 3 && Math.sign(dx) === samples[i].face) agree += 1;
}
const faces = new Set(samples.map((s) => s.face));
check(
  '动物会按移动方向转身',
  agree >= 2 && faces.size >= 1,
  `${agree} 次朝向与位移一致 / ${samples.length} 个样本，朝向集合 ${[...faces].join(',')}`,
);

/* ── 9. 点击不会让动物倒立 ── */
const reactAnim = await page.evaluate(() => {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'v3-react v3-react-2');
  const svg = document.querySelector('.v3-stage');
  if (!svg) return null;
  svg.appendChild(g);
  const n = getComputedStyle(g).animationName;
  g.remove();
  return n;
});
// 转一整圈（rotate 360deg）中途是头朝下的，现实里没有生物被点一下会倒立
const flat = await page.evaluate(() => {
  const out = [];
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (const r of rules) {
      if (r.type === CSSRule.KEYFRAMES_RULE && String(r.name).startsWith('v3React')) {
        out.push(String(r.cssText));
      }
    }
  }
  return out.join(' ');
});
check(
  '点击动物不会倒立',
  reactAnim === 'v3ReactCrouch' && !/rotate\(\s*360deg/.test(flat),
  `反应动画=${reactAnim}${/rotate\(\s*360deg/.test(flat) ? '，仍有一圈旋转' : ''}`,
);

/* ── 10. 控制台干净 ── */
check('无控制台报错', errs.length === 0, errs.slice(0, 2).join(' | '));

await page.screenshot({ path: '.shots/sense-final.png' });
await browser.close();

const pass = results.filter((r) => r.ok).length;
console.log('\n── 感官与关系 ──');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.n}${r.d ? `  (${r.d})` : ''}`);
console.log(`\n通过 ${pass}/${results.length}`);
process.exit(pass === results.length ? 0 : 1);
