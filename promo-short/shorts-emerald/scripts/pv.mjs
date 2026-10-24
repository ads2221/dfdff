import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [id, ...ts] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('PAGEERR', e.message));
await p.goto('file://' + process.cwd() + '/short.html?id=' + id); await p.waitForFunction(() => window.READY, null, { timeout: 60000 });
console.log('ERR', JSON.stringify(await p.evaluate(() => window.ERR)), 'DUR', await p.evaluate(() => window.DUR));
for (const t of ts) { await p.evaluate(t => renderAt(+t), t); await p.screenshot({ path: `pv/${id}_${t}.jpg`, type: 'jpeg', quality: 80 }); }
await b.close();
