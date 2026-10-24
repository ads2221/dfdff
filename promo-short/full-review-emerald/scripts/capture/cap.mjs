import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
// Full emerald re-capture: landing (with FAQ open), onboarding modal steps, every panel page (view + main + cards + targets).
const OUT = 'v2/desk'; fs.mkdirSync(OUT, { recursive: true });
const PAGES = ['dashboard','wallet','orders-v3','dca-stats','archive','dca-lab','trading','portfolio','tpsl','user-stats','alerts','filters','blacklist','plans','docs','profile'];
const only = process.argv[2] ? process.argv[2].split(',') : null;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5, storageState: 'state.json' });
await ctx.addInitScript(() => { try { localStorage.setItem('ui_theme', 'emerald'); } catch (e) {} });
const p = await ctx.newPage();
const hideFixed = () => p.evaluate(() => document.querySelectorAll('body *').forEach(e => { const s = getComputedStyle(e).position; if (s === 'fixed' || s === 'sticky') { e.dataset.h = 1; e.style.visibility = 'hidden'; } }));
const showFixed = () => p.evaluate(() => document.querySelectorAll('[data-h]').forEach(e => { e.style.visibility = ''; }));

if (!only || only.includes('landing')) {
  await p.goto('https://jupiter-dca-bot.online/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(5000);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 450) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(120); }
  // open FAQ answers
  for (let i = 1; i <= 7; i++) { await p.getByText(new RegExp('^0' + i + '$')).first().click().catch(() => {}); }
  await p.waitForTimeout(800);
  fs.writeFileSync(`${OUT}/landing.txt`, await p.evaluate(() => document.body.innerText));
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(2500);
  await p.screenshot({ path: `${OUT}/landing_view.png` });
  await hideFixed();
  await p.screenshot({ path: `${OUT}/landing_full.png`, fullPage: true });
  const sec = await p.evaluate(() => [...document.querySelectorAll('section,[id]')].map(e => ({ id: e.id, cls: String(e.className).slice(0, 30), y: Math.round(e.getBoundingClientRect().top + scrollY), h: Math.round(e.getBoundingClientRect().height), t: (e.innerText || '').slice(0, 40).replace(/\n/g, ' ') })).filter(o => o.h > 250));
  fs.writeFileSync(`${OUT}/landing_sections.json`, JSON.stringify({ H: await p.evaluate(() => document.documentElement.scrollHeight), sec }));
  await showFixed();
  console.log('landing done');
}
if (!only || only.includes('onboarding')) {
  await p.goto('https://jupiter-dca-bot.online/panel/dashboard', { waitUntil: 'commit', timeout: 90000 }).catch(e=>console.log('goto',e.message.slice(0,60))); await p.waitForTimeout(8000);
  for (let i = 0; i < 8; i++) {
    await p.screenshot({ path: `${OUT}/onb_${i}.png` });
    const txt = await p.evaluate(() => { const d = [...document.querySelectorAll('div')].find(e => /ДАЛЕЕ|ГОТОВО|НАЧАТЬ/i.test(e.innerText || '') && e.getBoundingClientRect().width < 800 && e.getBoundingClientRect().width > 300); return d ? d.innerText.slice(0, 600) : ''; });
    fs.writeFileSync(`${OUT}/onb_${i}.txt`, txt);
    const next = p.getByText(/^(Дальше|Далее|Готово|Начать)/i).last();
    if (!(await next.count())) break;
    await next.click().catch(() => {}); await p.waitForTimeout(1500);
  }
  console.log('onboarding done');
}
const targetsOut = {};
for (const pg of PAGES) {
  if (only && !only.includes(pg)) continue;
  await p.goto('https://jupiter-dca-bot.online/panel/' + pg, { waitUntil: 'commit', timeout: 90000 }).catch(e=>console.log('goto',pg,e.message.slice(0,60)));
  await p.waitForTimeout(8000);
  await p.keyboard.press('Escape').catch(() => {});
  // close any modal (onboarding) if still present
  await p.getByText(/^Пропустить$/i).first().click({ timeout: 1500 }).catch(() => {});
  if (pg === 'filters') { for (const t of ['Объём и холдеры', 'Настройка DCA торговли', 'Защитные фильтры', 'Закрытие позиций', 'Управление временем']) await p.getByText(t, { exact: false }).first().click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(1500); }
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/${pg}_view.png` });
  const side = await p.evaluate(() => [...document.querySelectorAll('a[href^="/panel/"]')].map(a => { const r = a.getBoundingClientRect(); return { href: a.getAttribute('href'), x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }).filter(o => o.w > 0 && o.x < 240));
  await hideFixed();
  const main = await p.$('main');
  await main.screenshot({ path: `${OUT}/${pg}_main.png` }).catch(e => console.log('mainshot', pg, e.message.slice(0, 80)));
  const mb = await main.boundingBox();
  const data = await p.evaluate(() => {
    const main = document.querySelector('main'); const mr = main.getBoundingClientRect();
    const out = []; const seen = new Set();
    const isCard = e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 160 && r.height > 40 && (parseFloat(cs.borderTopWidth) > 0 || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')) && r.width < mr.width - 10 && r.height < 2500; };
    for (const el of main.querySelectorAll('*')) {
      if (el.tagName === 'STYLE' || el.tagName === 'SCRIPT') continue;
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 1)) continue;
      const txt = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60);
      let c = el; while (c && c !== main && !isCard(c)) c = c.parentElement;
      if (!c || c === main || seen.has(c)) continue; seen.add(c);
      const r = c.getBoundingClientRect();
      out.push({ t: txt, x: Math.round(r.left - mr.left), y: Math.round(r.top - mr.top), w: Math.round(r.width), h: Math.round(r.height) });
    }
    const btns = [...main.querySelectorAll('button, a, input, [role=button], [role=tab]')].map(e => { const r = e.getBoundingClientRect(); const t = (e.tagName === 'INPUT' ? (e.placeholder || '') : e.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40); return { t, x: Math.round(r.left - mr.left + r.width / 2), y: Math.round(r.top - mr.top + r.height / 2), w: Math.round(r.width), h: Math.round(r.height) }; }).filter(o => o.w > 0 && o.t);
    return { cards: out, btns, x: mr.left, w: mr.width };
  });
  fs.writeFileSync(`${OUT}/${pg}_cards.json`, JSON.stringify({ main: mb, cards: data.cards }));
  targetsOut[pg] = { side, btns: data.btns, mainX: data.x, mainW: data.w };
  fs.writeFileSync(`${OUT}/${pg}.txt`, await p.evaluate(() => document.querySelector('main').innerText));
  await showFixed();
  console.log(pg, 'h', Math.round(mb.height), 'cards', data.cards.length, 'btns', data.btns.length, 'mainX', data.x);
}
if (Object.keys(targetsOut).length) { const prev = fs.existsSync(`${OUT}/targets.json`) ? JSON.parse(fs.readFileSync(`${OUT}/targets.json`)) : {}; fs.writeFileSync(`${OUT}/targets.json`, JSON.stringify({ ...prev, ...targetsOut })); }
await b.close();
