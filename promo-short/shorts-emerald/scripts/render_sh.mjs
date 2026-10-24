import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
const id = process.argv[2]; const FPS = 30;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
p.on('pageerror', e => console.log('ERR', e.message));
await p.goto('file://' + process.cwd() + '/short.html?id=' + id); await p.waitForFunction(() => window.READY, null, { timeout: 60000 }); await p.waitForTimeout(500);
const DUR = await p.evaluate(() => window.DUR); fs.writeFileSync(`sfx_${id}.json`, JSON.stringify(await p.evaluate(() => window.SFX)));
const N = Math.round(DUR * FPS);
const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', `v_${id}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let f = 0; f < N; f++) { await p.evaluate(t => renderAt(t), f / FPS); const buf = await p.screenshot({ type: 'jpeg', quality: 94 }); if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); }
ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', id, N);
