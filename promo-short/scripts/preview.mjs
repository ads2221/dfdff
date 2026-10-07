import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const times = process.argv.slice(2).map(Number);
const b = await chromium.launch();
const p = await b.newPage({viewport:{width:1080,height:1920}});
p.on('pageerror', e=>console.log('ERR', e.message));
await p.goto('file://'+process.cwd()+'/'+(process.env.COMP||'comp.html'));
await p.waitForFunction(()=>window.READY);
await p.waitForTimeout(500);
for (const t of times){ await p.evaluate(t=>renderAt(t), t); await p.screenshot({path:`pv/${t.toFixed(2)}.jpg`, type:'jpeg', quality:80}); }
await b.close();
