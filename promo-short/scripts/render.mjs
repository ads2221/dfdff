import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
const FPS = 30, DUR = Number(process.env.DUR||54.8), N = Math.round(DUR * FPS), WORKERS = 4;
const b = await chromium.launch();
const per = Math.ceil(N / WORKERS);
async function work(w) {
  const f0 = w * per, f1 = Math.min(N, f0 + per);
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('file://' + process.cwd() + '/'+(process.env.COMP||'comp.html'));
  await p.waitForFunction(() => window.READY);
  await p.waitForTimeout(500);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', (process.env.SEG||'seg')+w+'.mp4'], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = f0; f < f1; f++) {
    await p.evaluate(t => renderAt(t), f / FPS);
    const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((f - f0) % 150 === 0) console.log(`w${w} ${f - f0}/${f1 - f0}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await Promise.all([...Array(WORKERS)].map((_, w) => work(w)));
await b.close();
console.log('done');
