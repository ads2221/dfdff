import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
// Desktop capture of every panel section: viewport shot (chrome), full main-content shot, and card rects for spotlights.
const OUT = 'desk'; fs.mkdirSync(OUT, { recursive: true });
const pages = (process.argv[2] || 'dashboard,wallet,orders-v3,dca-stats,dca-lab,trading,portfolio,tpsl,user-stats,alerts,filters,blacklist,plans,docs,profile').split(',');
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5, storageState: 'state.json' });
const p = await ctx.newPage();
for (const pg of pages) {
  await p.goto('https://jupiter-dca-bot.online/panel/' + pg, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(8000);
  if (pg === 'filters') { // open all collapsible sections
    for (const t of ['Объём и холдеры', 'Настройка DCA торговли', 'Защитные фильтры', 'Закрытие позиций']) await p.getByText(t, { exact: false }).first().click().catch(() => {});
    await p.waitForTimeout(1500);
  }
  await p.screenshot({ path: `${OUT}/${pg}_view.png` });
  // find scroll container = main content
  const info = await p.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    const r = main.getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: main.scrollHeight, docH: document.documentElement.scrollHeight };
  });
  // hide fixed/sticky so the full screenshot has only content
  await p.evaluate(() => document.querySelectorAll('body *').forEach(e => { const s = getComputedStyle(e).position; if (s === 'fixed' || s === 'sticky') { e.dataset.h = 1; e.style.visibility = 'hidden'; } }));
  const main = await p.$('main');
  await main.screenshot({ path: `${OUT}/${pg}_main.png` }).catch(e => console.log('mainshot', pg, e.message.slice(0, 80)));
  const mb = await main.boundingBox();
  // card rects relative to main
  const cards = await p.evaluate(() => {
    const main = document.querySelector('main'); const mr = main.getBoundingClientRect();
    const out = []; const seen = new Set();
    const isCard = e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 160 && r.height > 40 && (parseFloat(cs.borderTopWidth) > 0 || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')) && r.width < 1370 && r.height < 2500; };
    for (const el of main.querySelectorAll('*')) {
      if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim().length > 2)) continue;
      const txt = el.textContent.trim().replace(/\s+/g, ' ').slice(0, 60);
      let c = el; while (c && c !== main && !isCard(c)) c = c.parentElement;
      if (!c || c === main || seen.has(c)) continue; seen.add(c);
      const r = c.getBoundingClientRect();
      out.push({ t: txt, x: Math.round(r.left - mr.left), y: Math.round(r.top - mr.top), w: Math.round(r.width), h: Math.round(r.height) });
    }
    return out;
  });
  fs.writeFileSync(`${OUT}/${pg}_cards.json`, JSON.stringify({ main: mb, cards }, null, 0));
  fs.writeFileSync(`${OUT}/${pg}.txt`, await p.evaluate(() => document.querySelector('main').innerText));
  await p.evaluate(() => document.querySelectorAll('[data-h]').forEach(e => { e.style.visibility = ''; }));
  console.log(pg, JSON.stringify(info), 'cards', cards.length, 'mainbox', JSON.stringify(mb));
}
await b.close();
