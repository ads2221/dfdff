import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const [file, out] = process.argv.slice(2);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
await p.goto('file://' + process.cwd() + '/' + file); await p.waitForTimeout(800); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: out }); await b.close();
