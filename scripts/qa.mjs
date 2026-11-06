// 验收脚本：node scripts/qa.mjs [url]
// 需要 playwright（npm i -D playwright && npx playwright install chromium）
// 检查：控制台报错、裂图、390 宽横向溢出、滚动揭示是否全部出现、原型四条路由、播放器、轮播、图谱标签重叠、减少动画。
import { chromium } from 'playwright';
import fs from 'node:fs';
const url = process.argv[2] || 'http://127.0.0.1:8080/index.html';
fs.mkdirSync('scripts/out', { recursive: true });
const b = await chromium.launch();
let fail = 0; const ok = (name, cond, extra='') => { console.log((cond ? '✓ ' : '✗ ') + name, extra); if (!cond) fail++; };
for (const [W, H] of [[1440, 900], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: W, height: H } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && errs.push(m.text()));
  await p.goto(url); await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' }); await p.waitForTimeout(800);
  const Ht = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < Ht; y += H) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(300); }
  await p.waitForTimeout(2200);
  const r = await p.evaluate(() => ({
    sw: document.documentElement.scrollWidth, broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src),
    hidden: [...document.querySelectorAll('.reveal')].filter(x => getComputedStyle(x).opacity < .9).length,
    wide: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && r.width > 0 && !e.closest('.pw-res,.fan,.drawer,canvas'); }).length }));
  ok(`${W} 无控制台报错`, errs.length === 0, errs.join(' | ').slice(0, 200));
  ok(`${W} 无裂图`, r.broken.length === 0, r.broken.join(','));
  ok(`${W} 无横向溢出`, r.sw === W && r.wide === 0, `scrollWidth=${r.sw} wide=${r.wide}`);
  ok(`${W} 滚动揭示全部出现`, r.hidden === 0, `未出现 ${r.hidden}`);
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500); await p.screenshot({ path: `scripts/out/${W}-top.png` });
  await p.close();
}
// 原型交互
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url); await p.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
await p.evaluate(() => document.getElementById('prototype').scrollIntoView()); await p.waitForTimeout(9500);
const st = () => p.evaluate(() => ({ route: document.querySelector('#lx-proto-window').dataset.route, steps: [...document.querySelectorAll('.pw-panel:not([hidden]) .dp-steps li')].map(l => l.dataset.state).join(',') }));
let s = await st(); ok('原型自动播放到完成', s.steps.split(',').every(x => x === 'done'), s.steps);
for (const route of ['review', 'channels', 'knowledge']) { await p.click(`.ptask[data-route=${route}]`); await p.waitForTimeout(600); s = await st(); ok(`任务卡 → ${route}`, s.route === route);
  if (route === 'channels') { await p.focus('[data-fan]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500); ok('轮播方向键', await p.evaluate(() => document.querySelector('.fan-count').textContent.startsWith('02'))); } }
await p.click('.ptask[data-route=knowledge]'); await p.waitForTimeout(9000);
ok('图谱标签无重叠', await p.evaluate(() => { const r = [...document.querySelectorAll('.kn-graph text')].map(t => t.getBoundingClientRect()); let n = 0; for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) if (r[i].left < r[j].right && r[j].left < r[i].right && r[i].top < r[j].bottom && r[j].top < r[i].bottom) n++; return n === 0; }));
await p.screenshot({ path: 'scripts/out/prototype.png' }); await p.close();
const rm = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' }); await rm.goto(url); await rm.waitForTimeout(800);
ok('减少动画下演示直接显示结果', await rm.evaluate(() => [...document.querySelectorAll('.dp-steps li')].every(l => l.dataset.state === 'done')));
await b.close(); console.log(fail ? `\n${fail} 项未通过` : '\n全部通过'); process.exit(fail ? 1 : 0);
