import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + process.cwd() + '/comp.html'); await p.waitForFunction(() => window.READY, null, { timeout: 180000 });
const ev = await p.evaluate(() => ({ clicks: window.DEBUG.KF.filter(k => k.click).map(k => k.t), navs: window.DEBUG.NAV.map(n => n.t), scrolls: window.DEBUG.SCR.map(s => s.t),
  spots: window.DEBUG.SPOTS.map(s => s.t0), cards: window.TL.chapters.filter(c => c.card !== null).map(c => c.card), starts: window.TL.chapters.map(c => c.start), DUR: window.DUR,
  mco: window.DEBUG.MINI.filter(m => m.kind === 'mco').map(m => m.t), ovs: window.DEBUG.OVS.map(o => [o.name, o.t0]) }));
fs.writeFileSync('events.json', JSON.stringify(ev)); console.log(Object.fromEntries(Object.entries(ev).map(([k, v]) => [k, Array.isArray(v) ? v.length : v])));
await b.close();
