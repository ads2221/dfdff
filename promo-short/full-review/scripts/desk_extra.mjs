import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b = await chromium.launch();
// public pages (no login)
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
const p = await ctx.newPage();
await p.goto('https://jupiter-dca-bot.online/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await p.waitForTimeout(5000);
await p.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')));
const H = await p.evaluate(() => document.documentElement.scrollHeight);
for (let y = 0; y < H; y += 500) { await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(80); }
await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(2500);
await p.screenshot({ path: 'desk/landing_view.png' });
await p.evaluate(() => document.querySelectorAll('body *').forEach(e => { const s = getComputedStyle(e).position; if (s === 'fixed' || s === 'sticky') e.style.visibility = 'hidden'; }));
await p.screenshot({ path: 'desk/landing_full.png', fullPage: true });
const sec = await p.evaluate(() => Object.fromEntries(['how', 'overview', 'plans', 'faq', 'trade-stats-panel'].map(id => { const e = document.getElementById(id); return [id, e ? Math.round(e.getBoundingClientRect().top + scrollY) : null]; })));
fs.writeFileSync('desk/landing_sections.json', JSON.stringify({ H, sec }));
console.log('landing', H, JSON.stringify(sec));
await p.goto('https://jupiter-dca-bot.online/pnl', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await p.waitForTimeout(6000);
await p.screenshot({ path: 'desk/pnl_view.png' });
await p.screenshot({ path: 'desk/pnl_full.png', fullPage: true });
await p.goto('https://jupiter-dca-bot.online/panel/auth', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(4000);
await p.screenshot({ path: 'desk/auth_login.png' });
await p.getByText('СОЗДАТЬ', { exact: false }).first().click(); await p.waitForTimeout(1200);
await p.screenshot({ path: 'desk/auth_register.png' });
await b.close();
