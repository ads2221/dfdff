import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const times = process.argv.slice(2).map(Number);
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on('pageerror', e => console.log('PAGEERR', e.message));
p.on('console', m => { if (m.type() === 'error') console.log('CONSOLE', m.text()); });
await p.goto('file://' + process.cwd() + '/comp.html');
await p.waitForFunction(() => window.READY, null, { timeout: 120000 });
console.log('ERR', JSON.stringify(await p.evaluate(() => window.ERR)));
for (const t of times) { await p.evaluate(t => renderAt(t), t); await p.screenshot({ path: `pv/${t.toFixed(1)}.jpg`, type: 'jpeg', quality: 82 }); }
await b.close();
