// Vertical shorts renderer (1080x1920). renderAt(t) draws the frame at time t, fully deterministic.
(() => {
const $ = id => document.getElementById(id);
const C = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t, a, b) => C((t - a) / (b - a));
const L = (a, b, x) => a + (b - a) * x;
const E = { o3: x => 1 - Math.pow(1 - x, 3), o5: x => 1 - Math.pow(1 - x, 5), io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  back: x => { const c = 1.7, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); } };
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const SID = window.SID, DUR = window.DUR, WORDS = window.WORDS, D = window.D;
const ERR = []; window.ERR = ERR;
const LANG = window.LANG || 'ru'; const T = (ru, en) => LANG === 'en' ? en : ru;
const norm = s => s.toLowerCase().replace(/[«»"!?.,:;—]/g, '');
function A(word, n = 1, off = 0) { let k = 0; const w0 = norm(word); for (const w of WORDS) if (norm(w.w).startsWith(w0)) { k++; if (k === n) return w.s + off; } ERR.push('anchor ' + word + '#' + n); return 0; }
const SFX = []; window.SFX = SFX; // [time, kind]
const stage = $('stage');
function el(html, css = '', parent = stage) { const d = document.createElement('div'); d.className = 'abs'; d.style.cssText = css; d.innerHTML = html; parent.appendChild(d); return d; }
function show(e, o, x = 0, y = 0, s = 1) { e.style.display = o <= .002 ? 'none' : ''; e.style.opacity = o; e.style.transform = `translate(${x}px,${y}px) scale(${s})`; }
const fmtPct = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1) + '%';
const fmtDur = s => s < 3600 ? Math.round(s / 60) + T(' мин', ' min') : (s / 3600 >= 10 ? Math.round(s / 3600) : T((s / 3600).toFixed(1).replace('.', ','), (s / 3600).toFixed(1))) + T(' ч', 'h');
// scene in/out helper: returns {o, y, s}
function io(t, t0, t1, din = .45, dout = .35) { const a = E.back(P(t, t0, t0 + din)); const b = E.io(P(t, t1 - dout, t1)); return { o: C(P(t, t0, t0 + din * .6)) * (1 - b), y: (1 - C(a)) * 70 - b * 40, s: L(.9, 1, C(a)) * L(1, 1.04, b) }; }
const STAR = s => `<svg width="${s}" height="${s}" viewBox="-110 -110 220 220"><path d="M0-105 C8-20 20-8 105 0 C20 8 8 20 0 105 C-8 20 -20 8 -105 0 C-20 -8 -8 -20 0 -105Z" fill="#1FD18B"/><circle r="12" fill="#EAFFF5"/></svg>`;
const TG = s => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path fill="#fff" d="M21.5 3.6 2.9 10.8c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.8-.8l3.2-15.2c.3-1.3-.5-1.9-1.9-1.5z"/></svg>`;
// price-path generator: 0 -> trough -> peak -> close
function pricePath(o, n = 80) { const pts = []; const R = rng(o.s.length * 97 + Math.round(o.pnl));
  for (let i = 0; i <= n; i++) { const x = i / n; let y;
    if (x < .18) y = L(0, o.trough, E.io(x / .18)); else if (x < .72) y = L(o.trough, o.peak, E.io((x - .18) / .54)); else y = L(o.peak, o.pnl, E.io((x - .72) / .28));
    if (i > 0 && i < n) y += (R() - .5) * Math.max(4, (o.peak - o.trough) * .06);
    pts.push([x, y]); } return pts; }
function chartSVG(id, pts, W, H, lo, hi, opts = {}) {
  const X = x => x * W, Y = y => H - (y - lo) / (hi - lo) * H;
  const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p[0]).toFixed(1) + ' ' + Y(p[1]).toFixed(1)).join(' ');
  return `<svg width="${W}" height="${H + 10}" style="overflow:visible"><defs><linearGradient id="gf${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${opts.col || '#1FD18B'}" stop-opacity=".45"/><stop offset="1" stop-color="${opts.col || '#1FD18B'}" stop-opacity="0"/></linearGradient>
   <filter id="gl${id}"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><clipPath id="cp${id}"><rect class="clipr" x="-20" y="-60" width="0" height="${H + 120}"/></clipPath></defs>
   <line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="rgba(255,255,255,.25)" stroke-dasharray="8 10" stroke-width="2"/>
   <g clip-path="url(#cp${id})"><path d="${d} L${W} ${H} L0 ${H}Z" fill="url(#gf${id})"/><path d="${d}" fill="none" stroke="${opts.col || '#5CFFB7'}" stroke-width="${opts.sw || 9}" stroke-linejoin="round" stroke-linecap="round" filter="url(#gl${id})"/></g></svg>`;
}

// ---------- background ----------
const bg = $('bg').getContext('2d'); const R0 = rng(11);
const DOTS = [...Array(70)].map(() => ({ x: R0() * 1080, y: R0() * 1920, r: .8 + R0() * 2.2, s: .3 + R0() * .9, p: R0() * 6 }));
function drawBG(t) {
  bg.fillStyle = '#030806'; bg.fillRect(0, 0, 1080, 1920);
  const blob = (x, y, r, c, a) => { const g = bg.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); bg.fillStyle = g; bg.fillRect(x - r, y - r, 2 * r, 2 * r); };
  blob(200 + 160 * Math.sin(t * .23), 420 + 140 * Math.cos(t * .19), 900, '31,209,139', .2);
  blob(900 + 120 * Math.cos(t * .21), 1350 + 160 * Math.sin(t * .17), 950, '14,150,170', .16);
  blob(540 + 260 * Math.sin(t * .13), 1900, 800, '31,209,139', .12);
  bg.save(); bg.strokeStyle = 'rgba(31,209,139,.11)'; bg.lineWidth = 1.5; const hz = 1330;
  for (let i = -16; i <= 16; i++) { bg.beginPath(); bg.moveTo(540 + i * 26, hz); bg.lineTo(540 + i * 190, 1960); bg.stroke(); }
  const sp = (t * .35) % 1; for (let k = 0; k < 12; k++) { const z = (k + sp) / 12; const y = hz + Math.pow(z, 2.2) * 630; bg.globalAlpha = z * .9; bg.beginPath(); bg.moveTo(0, y); bg.lineTo(1080, y); bg.stroke(); }
  bg.restore(); const f = bg.createLinearGradient(0, hz - 30, 0, hz + 220); f.addColorStop(0, 'rgba(3,8,6,1)'); f.addColorStop(1, 'rgba(3,8,6,0)'); bg.fillStyle = f; bg.fillRect(0, hz - 30, 1080, 250);
  bg.save(); bg.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 2; i++) { const x = ((t * 40 + i * 700) % 1800) - 400; const g = bg.createLinearGradient(x, 0, x + 300, 0); g.addColorStop(0, 'rgba(150,255,205,0)'); g.addColorStop(.5, 'rgba(150,255,205,.04)'); g.addColorStop(1, 'rgba(150,255,205,0)'); bg.fillStyle = g; bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x + 300, 0); bg.lineTo(x + 50, 1920); bg.lineTo(x - 250, 1920); bg.fill(); }
  bg.restore();
  for (const d of DOTS) { const y = ((d.y - t * 40 * d.s) % 1920 + 1920) % 1920; bg.fillStyle = `rgba(150,255,205,${.15 + .2 * Math.sin(t * 1.3 + d.p)})`; bg.beginPath(); bg.arc(d.x, y, d.r, 0, 7); bg.fill(); }
}
const gr = $('grain').getContext('2d'), GI = [];
for (let k = 0; k < 4; k++) { const r = rng(70 + k), d = gr.createImageData(540, 1000); for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } GI.push(d); }

// ---------- captions ----------
const groups = []; { let g = [], len = 0;
  for (const w of WORDS) { g.push(w); len += w.w.length + 1;
    if (/[.!?]/.test(w.p) || (/[,:;—]/.test(w.p) && len > 10) || len > 19 || g.length >= 3) { groups.push(g); g = []; len = 0; } }
  if (g.length) groups.push(g); }
groups.forEach((g, i) => { g.start = g[0].s - .06; g.end = i < groups.length - 1 ? groups[i + 1][0].s - .06 : g[g.length - 1].e + .8; });
const capsIn = $('capsIn'); let lastG = null;
function drawCaps(t, hide) {
  const g = groups.find(g => t >= g.start && t < g.end);
  if (!g || hide) { $('caps').style.opacity = 0; return; }
  if (g !== lastG) { capsIn.innerHTML = g.map(w => `<span>${w.w}${w.p.replace(/[.,;:]/g, '')}</span>`).join(''); lastG = g; }
  const k = E.back(P(t, g.start, g.start + .22)); $('caps').style.opacity = C(P(t, g.start, g.start + .1)); $('caps').style.transform = `scale(${L(.85, 1, C(k))})`;
  [...capsIn.children].forEach((sp, i) => { const w = g[i]; const act = t >= w.s - .03 && (i === g.length - 1 || t < g[i + 1].s - .03);
    sp.style.color = act ? '#3CF0A6' : (t < w.s ? 'rgba(255,255,255,.55)' : '#fff'); sp.style.transform = act ? 'scale(1.08) translateY(-4px)' : 'none'; });
}

// ---------- scenes ----------
const SC = []; // {t0,t1,draw(t)}
const FOOT = LANG === 'en' ? {
  sA: 'PnL of whale orders · V3 monitoring, 09/02–10/21/2026<br>no fees or slippage included · not financial advice',
  sB: 'Whale order result · V3 monitoring · the bot enters after the 2nd cycle,<br>your result will differ · not financial advice',
  sC: 'V3 monitoring, 09/02–10/21/2026 · whale order prices<br>without your costs · not financial advice' } : {
  sA: 'PnL ордеров китов · мониторинг V3, 02.09–21.10.2026<br>без комиссий и проскальзывания · не финансовый совет',
  sB: 'Итог ордера кита · мониторинг V3 · бот входит после 2-го цикла,<br>ваш результат отличается · не финансовый совет',
  sC: 'Мониторинг V3, 02.09–21.10.2026 · цены ордеров китов<br>без ваших издержек · не финансовый совет' };
$('foot').innerHTML = FOOT[SID];
if ($('mon')) $('mon').textContent = T('МОНИТОРИНГ V3', 'V3 MONITORING');
const flashes = [];

function ctaScene(t0, t1, opts = {}) {
  const c = el(`<div class="glass" style="width:900px;padding:46px 50px;text-align:center">
    <div style="display:flex;justify-content:center">${STAR(120)}</div>
    <div style="font-weight:700;font-size:72px;margin-top:10px;letter-spacing:-1px">DCA SOLANA <span style="color:#1FD18B">TRADE</span></div>
    <div class="big gnum" style="font-size:58px;margin-top:26px">${opts.title || T('ССЫЛКА В ПРОФИЛЕ', 'LINK IN BIO')}</div>
    <div class="mono" style="margin-top:30px;font-size:34px;padding:18px 26px;border-radius:50px;border:2px solid #1FD18B;display:inline-block">jupiter-dca-bot.online</div><br>
    <div style="margin-top:18px;font-size:34px;padding:12px 26px 12px 12px;border-radius:50px;border:2px solid #2AABEE;display:inline-flex;align-items:center;gap:16px;font-weight:700"><span style="width:58px;height:58px;border-radius:50%;background:linear-gradient(135deg,#37BBFE,#007DBB);display:flex;align-items:center;justify-content:center">${TG(32)}</span>@dca_solana_trade_bot</div>
    <div class="mono" style="font-size:26px;color:#9BF7CF;margin-top:26px;letter-spacing:3px">${opts.sub || T('СТАРТ БЕСПЛАТНО · ТОРГОВЛЯ С PRO', 'START FREE · TRADE WITH PRO')}</div></div>`, 'left:90px;top:' + (opts.top || 330) + 'px');
  SFX.push([t0, 'shimmer']);
  SC.push({ t0, t1, draw(t) { const s = io(t, t0, t1); show(c, s.o, 0, s.y, s.s); } });
}

if (SID === 'sA') {
  const TOPS = D.top; // STONK, NC, ROCK, FRIES, Kimchi  (5th..1st)
  const RW = LANG === 'en' ? [['number', 1], ['number', 2], ['number', 3], ['number', 4], ['number', 5]] : [['пятое', 1], ['четвёртое', 1], ['третье', 1], ['второе', 1], ['первое', 1]];
  const tR = RW.map(([w, n]) => A(w, n) - .15);
  const tRecap = A(T('копирует', 'copies')) - .7, tCTA = A(T('ссылка', 'link')) - .1;
  // hook
  const h = el(`<div style="width:1080px;text-align:center">
     <div class="big gnum" style="font-size:250px;letter-spacing:-10px">${T('ТОП-5', 'TOP-5')}</div>
     <div class="big" style="font-size:92px;margin-top:10px">${T('ОРДЕРОВ КИТОВ', 'WHALE ORDERS')}</div>
     <div style="margin-top:40px"><span class="chip">SOLANA · JUPITER DCA</span></div>
     <div id="hlogos" style="position:relative;height:300px;margin-top:60px"></div></div>`, 'top:300px');
  const hl = h.querySelector('#hlogos');
  TOPS.forEach((o, i) => { const im = document.createElement('img'); im.src = `logo/${o.s}.png`; im.className = 'logo'; im.style.cssText = `position:absolute;width:150px;height:150px;left:${465 + (i - 2) * 190}px;top:60px`; hl.appendChild(im); });
  SC.push({ t0: .2, t1: tR[0], draw(t) { const s = io(t, .2, tR[0]); show(h, s.o, 0, s.y, s.s);
    [...hl.children].forEach((im, i) => { const k = E.back(P(t, .6 + i * .18, 1.1 + i * .18)); im.style.transform = `translateY(${Math.sin(t * 2 + i) * 14}px) scale(${C(k)})`; }); } });
  SFX.push([.2, 'impact']);
  // rank cards
  TOPS.forEach((o, i) => {
    const rank = 5 - i, t0 = tR[i], t1 = i < 4 ? tR[i + 1] : tRecap;
    const pts = pricePath(o); const lo = Math.min(-15, o.trough * 1.15), hi = o.peak * 1.12;
    const card = el(`
      <div style="display:flex;align-items:flex-end;gap:24px;margin-left:70px"><div class="big" style="font-size:220px;color:transparent;-webkit-text-stroke:5px #1FD18B;letter-spacing:-6px">#${rank}</div>
        <div class="mono" style="font-size:34px;color:#9BF7CF;letter-spacing:6px;padding-bottom:30px">${rank === 1 ? T('ПЕРВОЕ МЕСТО', 'FIRST PLACE') : T('МЕСТО', 'PLACE')}</div></div>
      <div class="glass" style="position:absolute;left:60px;top:250px;width:960px;height:930px;padding:44px 50px">
        <div style="display:flex;align-items:center;gap:30px"><img src="logo/${o.s}.png" class="logo" style="width:150px;height:150px">
          <div><div style="font-weight:700;font-size:84px;letter-spacing:-1px">${o.s}</div><div class="mono" style="font-size:26px;color:#aaa;letter-spacing:2px">${T('ОРДЕР КИТА', 'WHALE ORDER')} · ${o.status === 'completed' ? T('ЗАВЕРШЁН', 'COMPLETED') : T('ЗАКРЫТ', 'CLOSED')}</div></div></div>
        <div class="big gnum pnl" style="font-size:158px;letter-spacing:-6px;margin-top:40px">+0.0%</div>
        <div class="ch" style="position:absolute;left:50px;top:520px">${chartSVG('r' + i, pts, 860, 260, lo, hi)}</div>
        <div class="pk mono" style="position:absolute;font-size:26px;font-weight:700;padding:8px 14px;border-radius:10px;background:#1FD18B;color:#03140c">${T('пик', 'peak')} ${fmtPct(o.peak)}</div>
        <div style="position:absolute;left:50px;top:830px;display:flex;gap:14px"><span class="chip w" style="font-size:28px">DCA ${o.dep}</span><span class="chip w" style="font-size:28px">${T('за', 'in')} ${fmtDur(o.dur)}</span><span class="chip w" style="font-size:28px">${o.cyc} ${T('циклов', 'cycles')}</span></div>
      </div>`, 'top:190px;width:1080px;height:1300px');
    const pnl = card.querySelector('.pnl'), clip = card.querySelector('.clipr'), pk = card.querySelector('.pk');
    const pkI = pts.reduce((b, p, j) => p[1] > pts[b][1] ? j : b, 0); const pkX = 50 + pts[pkI][0] * 860, pkY = 520 + 260 - (pts[pkI][1] - lo) / (hi - lo) * 260;
    SFX.push([t0, 'whoosh']); SFX.push([t0 + .55, 'riser_short']); flashes.push(t0);
    if (rank === 1) SFX.push([t0 + .1, 'impact']);
    SC.push({ t0, t1, draw(t) { const ki = E.o5(P(t, t0 - .12, t0 + .32)), ke = E.io(P(t, t1 - .12, t1 + .22)); show(card, Math.min(C(ki * 1.4), 1 - ke), (1 - ki) * 320 - ke * 320, 0, L(.94, 1, ki));
      const k = E.o3(P(t, t0 + .4, t0 + 1.8)); pnl.textContent = fmtPct(o.pnl * k);
      pnl.style.transform = `scale(${1 + .06 * Math.max(0, Math.sin((t - t0 - 1.8) * 6)) * (t > t0 + 1.8 && t < t0 + 2.3 ? 1 : 0)})`; pnl.style.transformOrigin = '0 50%';
      clip.setAttribute('width', 900 * E.io(P(t, t0 + .4, t0 + 2.2)));
      const pv = P(t, t0 + .4 + pts[pkI][0] * 1.8, t0 + .7 + pts[pkI][0] * 1.8); pk.style.opacity = o.peak - o.pnl > 5 ? pv : 0; pk.style.left = (pkX - 70) + 'px'; pk.style.top = (pkY - 64) + 'px';
    } });
  });
  // confetti for #1
  const conf = el('<canvas width="1080" height="1920"></canvas>', 'z-index:40;pointer-events:none'); const cx = conf.firstChild.getContext('2d');
  const CF = [...Array(140)].map((_, i) => { const r = rng(300 + i); return { x: 540 + (r() - .5) * 200, y: 700, vx: (r() - .5) * 1500, vy: -600 - r() * 1300, c: ['#1FD18B', '#9BF7CF', '#EAFFF5', '#14B8C4'][i % 4], w: 10 + r() * 14, rot: r() * 6, vr: (r() - .5) * 14 }; });
  SC.push({ t0: tR[4], t1: tR[4] + 3.5, draw(t) { cx.clearRect(0, 0, 1080, 1920); const dt = t - tR[4] - .9; if (dt < 0) return; for (const p of CF) { const x = p.x + p.vx * dt, y = p.y + p.vy * dt + 1100 * dt * dt; cx.save(); cx.globalAlpha = C(1 - dt / 2.6); cx.translate(x, y); cx.rotate(p.rot + p.vr * dt); cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); cx.restore(); } }, always: true });
  // recap leaderboard
  const rows = [...TOPS].reverse();
  const rec = el(`<div class="glass" style="width:960px;padding:40px 44px"><div class="mono" style="font-size:30px;letter-spacing:5px;color:#9BF7CF">${T('ТОП-5 · ИТОГ ОРДЕРА КИТА', 'TOP-5 · WHALE ORDER RESULT')}</div>
    ${rows.map((o, i) => `<div class="rw" style="display:flex;align-items:center;gap:22px;margin-top:26px"><div class="big" style="font-size:44px;width:70px;color:#1FD18B">#${i + 1}</div><img src="logo/${o.s}.png" class="logo" style="width:76px;height:76px;box-shadow:0 0 0 3px rgba(31,209,139,.5)">
      <div style="width:190px;font-weight:700;font-size:40px">${o.s}</div><div style="flex:1;height:30px;border-radius:15px;background:rgba(255,255,255,.06);overflow:hidden"><div class="bar" style="height:100%;width:0;border-radius:15px;background:linear-gradient(90deg,#0FB37A,#5CFFB7)"></div></div>
      <div class="mono" style="width:190px;text-align:right;font-weight:700;font-size:40px;color:#5CFFB7">${fmtPct(o.pnl)}</div></div>`).join('')}</div>`, 'left:60px;top:250px');
  const bars = [...rec.querySelectorAll('.bar')], rws = [...rec.querySelectorAll('.rw')];
  SFX.push([tRecap, 'whoosh']);
  SC.push({ t0: tRecap, t1: tCTA + .2, draw(t) { const s = io(t, tRecap, tCTA + .2); show(rec, s.o, 0, s.y, s.s);
    rws.forEach((r, i) => { const k = E.o3(P(t, tRecap + .2 + i * .12, tRecap + .6 + i * .12)); r.style.opacity = k; r.style.transform = `translateX(${(1 - k) * 60}px)`; bars[i].style.width = (E.io(P(t, tRecap + .4 + i * .12, tRecap + 1.4 + i * .12)) * rows[i].pnl / rows[0].pnl * 100) + '%'; }); } });
  ctaScene(tCTA, DUR + 1, { top: 380 });
}

if (SID === 'sB') {
  const o = D.top.find(x => x.s === 'FRIES');
  const AN = LANG === 'en' ? { ord: ['launches'], see: ['sees'], two: ['waits'], f: ['checks'], buy: ['buys', 2], rise: ['keeps'], end: ['schedule', 2], res: ['result'], fee: ['fee'], cta: ['link'], pan: ['fries'] } : { ord: ['запускает'], see: ['видит'], two: ['второй'], f: ['проверяет'], buy: ['покупает'], rise: ['продолжает'], end: ['расписание'], res: ['итог'], fee: ['комиссия'], cta: ['ссылка'], pan: ['токен'] };
  const AA = k => A(...AN[k]);
  const tOrd = AA('ord') - .1, tSee = AA('see') - .1, t2 = AA('two') - .1, tF = AA('f') - .1, tBuy = AA('buy') - .1, tRise = AA('rise') - .1, tEnd = AA('end') - .1, tRes = AA('res') - .25, tFee = AA('fee') - .1, tCTA = AA('cta') - .1;
  // hook
  const h = el(`<div style="width:1080px;text-align:center"><div class="whale" style="display:flex;justify-content:center"><svg width="420" height="250" viewBox="0 0 420 250"><defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5CFFB7"/><stop offset="1" stop-color="#0B7F57"/></linearGradient></defs><path d="M20 140 C40 70 140 40 230 55 C300 66 350 100 368 140 C380 120 395 95 412 88 C405 120 400 140 392 160 C402 180 410 200 414 222 C392 212 376 196 362 178 C330 215 270 238 190 236 C100 234 30 205 20 140Z" fill="url(#wg)"/><path d="M60 170 C120 200 230 205 320 178" stroke="#EAFFF5" stroke-width="5" fill="none" opacity=".5"/><circle cx="96" cy="124" r="11" fill="#03140c"/><path d="M175 50 C170 25 160 12 150 6 M180 50 C190 26 204 14 218 10" stroke="#9BF7CF" stroke-width="7" fill="none" stroke-linecap="round"/></svg></div>
    <div class="big" style="font-size:${T(118, 100)}px;margin-top:20px">${T('КИТ', 'WHALE')} <span style="color:#1FD18B">VS</span> ${T('БОТ', 'BOT')}</div>
    <div class="mono" style="font-size:34px;color:#9BF7CF;margin-top:30px;letter-spacing:3px">${T('ОДНА СДЕЛКА · ОТ СИГНАЛА ДО ВЫХОДА', 'ONE TRADE · FROM SIGNAL TO EXIT')}</div></div>`, 'top:420px');
  SFX.push([.2, 'impact']);
  const tPan = AA('pan') - .2;
  SC.push({ t0: .15, t1: tPan, draw(t) { const s = io(t, .15, tPan); show(h, s.o, 0, s.y + Math.sin(t * 2) * 8, s.s); } });
  // main panel
  const pts = pricePath(o, 90); const lo = -30, hi = o.peak * 1.1;
  const panel = el(`<div class="glass" style="width:960px;height:1060px;padding:40px 44px">
     <div style="display:flex;align-items:center;gap:24px"><img src="logo/FRIES.png" class="logo" style="width:110px;height:110px"><div><div style="font-weight:700;font-size:64px">FRIES</div><div class="mono" style="font-size:24px;color:#aaa;letter-spacing:2px">${T('DCA-ОРДЕР КИТА', 'WHALE DCA ORDER')}</div></div>
       <div style="margin-left:auto;text-align:right"><span class="chip" style="font-size:28px">DCA ${o.dep}</span><div class="mono cyc" style="font-size:30px;margin-top:14px;color:#fff">${T('цикл', 'cycle')} 0 / 30</div></div></div>
     <div class="pnlLive big" style="position:absolute;right:44px;top:200px;font-size:72px;color:#5CFFB7">+0.0%</div>
     <div style="position:absolute;left:44px;top:300px">${chartSVG('b', pts, 872, 330, lo, hi)}</div>
     <div class="wh" style="position:absolute;left:300px;top:360px;opacity:.5"><svg width="300" height="180" viewBox="0 0 420 250"><defs><linearGradient id="wg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5CFFB7"/><stop offset="1" stop-color="#0B7F57"/></linearGradient></defs><path d="M20 140 C40 70 140 40 230 55 C300 66 350 100 368 140 C380 120 395 95 412 88 C405 120 400 140 392 160 C402 180 410 200 414 222 C392 212 376 196 362 178 C330 215 270 238 190 236 C100 234 30 205 20 140Z" fill="url(#wg2)"/><path d="M60 170 C120 200 230 205 320 178" stroke="#EAFFF5" stroke-width="5" fill="none" opacity=".5"/><circle cx="96" cy="124" r="11" fill="#03140c"/><path d="M175 50 C170 25 160 12 150 6 M180 50 C190 26 204 14 218 10" stroke="#9BF7CF" stroke-width="7" fill="none" stroke-linecap="round"/></svg></div><div class="mk buy mono" style="position:absolute;font-size:26px;font-weight:700;padding:8px 14px;border-radius:10px;background:#1FD18B;color:#03140c">BUY</div>
     <div class="mk sell mono" style="position:absolute;font-size:26px;font-weight:700;padding:8px 14px;border-radius:10px;background:#FF3B5C;color:#fff">SELL</div>
     <div class="bars" style="position:absolute;left:44px;top:690px;width:872px;height:70px;display:flex;gap:6px;align-items:flex-end">${[...Array(30)].map((_, i) => `<div style="flex:1;border-radius:5px;background:rgba(255,255,255,.08);height:100%"><div class="bf" style="height:0;width:100%;border-radius:5px;background:linear-gradient(#9BF7CF,#1FD18B)"></div></div>`).join('')}</div>
     <div class="mono" style="position:absolute;left:44px;top:772px;font-size:22px;color:#888;letter-spacing:2px">${T('30 ПОКУПОК КИТА ПО РАСПИСАНИЮ', '30 SCHEDULED WHALE BUYS')}</div>
     <div class="steps" style="position:absolute;left:44px;top:812px;width:872px"></div></div>`, 'left:60px;top:200px');
  const STEPS = [[tSee, '01', T('Сигнал из сети · мониторинг V3', 'On-chain signal · V3 monitoring')], [t2, '02', T('2-й цикл — сигнал подтверждён', '2nd cycle — signal confirmed')], [tF, '03', T('Фильтры · слот · баланс', 'Filters · slot · balance')], [tBuy, '04', T('BUY · на ваш кошелёк', 'BUY · into your wallet')], [tEnd, '05', T('SELL · вместе с китом', 'SELL · with the whale')]];
  const stp = panel.querySelector('.steps');
  stp.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">' + STEPS.map(s => `<div class="st" style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);font-size:24px;font-weight:600"><span class="mono" style="font-size:22px;width:44px;height:34px;border-radius:8px;background:rgba(31,209,139,.2);color:#9BF7CF;display:flex;align-items:center;justify-content:center">${s[1]}</span>${s[2]}</div>`).join('') + '</div>';
  const whp = panel.querySelector('.wh'); const sts = [...panel.querySelectorAll('.st')], bfs = [...panel.querySelectorAll('.bf')], clip = panel.querySelector('.clipr'), cyc = panel.querySelector('.cyc'), pl = panel.querySelector('.pnlLive'), buy = panel.querySelector('.buy'), sell = panel.querySelector('.sell');
  STEPS.forEach(s => SFX.push([s[0], 'tick'])); SFX.push([tBuy, 'pop']); SFX.push([tEnd, 'pop']); SFX.push([tOrd, 'whoosh']);
  const X = x => 44 + x * 872, Yv = y => 300 + 330 - (y - lo) / (hi - lo) * 330;
  const cycAt = t => t < tOrd + .4 ? 0 : t < t2 ? 1 : t < tEnd ? 2 + Math.floor(27.99 * E.io(P(t, t2 + .3, tEnd))) : 30;
  const progAt = t => cycAt(t) / 30;
  SC.push({ t0: tPan, t1: tRes, draw(t) { const s = io(t, tPan, tRes); show(panel, s.o, 0, s.y, s.s);
    whp.style.opacity = .55 * (1 - P(t, tBuy - .4, tBuy)); whp.style.transform = `translateX(${Math.sin(t * 1.5) * 20}px)`;
    const n = cycAt(t); cyc.textContent = `${T('цикл', 'cycle')} ${n} / 30`; bfs.forEach((b, i) => { b.style.height = (i < n ? 100 : 0) + '%'; b.parentNode.style.boxShadow = i === 1 && t > t2 && t < tF + .5 ? '0 0 0 3px #EAFFF5,0 0 24px #1FD18B' : 'none'; });
    const pr = n <= 1 ? 0 : (n - 1) / 29; clip.setAttribute('width', 872 * pr + 2);
    const idx = Math.round(pr * 90); const cur = pts[idx][1]; pl.textContent = fmtPct(n ? cur : 0); pl.style.color = cur >= 0 ? '#5CFFB7' : '#FF3B5C';
    const bx = 1 / 29; buy.style.left = (X(bx) - 30) + 'px'; buy.style.top = (Yv(pts[Math.round(bx * 90)][1]) - 62) + 'px'; buy.style.opacity = P(t, tBuy, tBuy + .3);
    sell.style.left = (X(1) - 70) + 'px'; sell.style.top = (Yv(o.pnl) - 62) + 'px'; sell.style.opacity = P(t, tEnd + .4, tEnd + .7);
    sts.forEach((e, i) => { const on = t >= STEPS[i][0]; e.style.background = on ? 'rgba(31,209,139,.16)' : 'rgba(255,255,255,.04)'; e.style.borderColor = on ? '#1FD18B' : 'rgba(255,255,255,.1)'; e.style.opacity = on ? 1 : .4; e.style.transform = `scale(${on ? L(1.06, 1, C(P(t, STEPS[i][0], STEPS[i][0] + .3))) : 1})`; });
  } });
  // result
  const res = el(`<div style="width:1080px;text-align:center"><div class="mono" style="font-size:36px;letter-spacing:6px;color:#9BF7CF">${T('ИТОГ ОРДЕРА КИТА', 'WHALE ORDER RESULT')}</div>
    <div class="big gnum rv" style="font-size:186px;letter-spacing:-7px;margin-top:20px">+0%</div>
    <div style="font-weight:700;font-size:64px;margin-top:10px">${T('за', 'in')} ${fmtDur(o.dur)}</div>
    <div class="fee" style="margin-top:70px"><span class="chip" style="font-size:38px;padding:22px 34px">${T('КОМИССИЯ 20% — ТОЛЬКО С ПРИБЫЛИ', '20% FEE — ONLY ON PROFIT')}</span></div></div>`, 'top:430px');
  const rv = res.querySelector('.rv'), fee = res.querySelector('.fee'); flashes.push(tRes + .2); SFX.push([tRes + .1, 'impact']); SFX.push([tFee, 'pop']);
  SC.push({ t0: tRes, t1: tCTA, draw(t) { const s = io(t, tRes, tCTA); show(res, s.o, 0, s.y, s.s); rv.textContent = fmtPct(o.pnl * E.o3(P(t, tRes + .2, tRes + 1.4)));
    fee.style.opacity = P(t, tFee, tFee + .3); fee.style.transform = `scale(${L(.8, 1, C(E.back(P(t, tFee, tFee + .45))))})`; } });
  ctaScene(tCTA, DUR + 1, { top: 380 });
}

if (SID === 'sC') {
  const ov = D.overall; const EN_ = LANG === 'en'; const tWe = A(T('мы', 'we')) - .1, tN = A(T('тысяча', 'eleven')) - .1, t63 = A(T('шестьдесят', 'sixty-three')) - .1, tOn = A(T('включаем', 'turn')), t67 = EN_ ? A('sixty-seven') - .1 : A('шестьдесят', 2) - .1, tAvg = A(T('средний', 'average')) - .1, tPF = A(T('профит', 'factor')) - .1, tHold = A(T('удержание', 'holding')) - .1, tSig = A(T('сигналов', 'signals')) - .2, tCurve = A(T('сигналов', 'signals')) + 1.0, tCTA = A(T('лаборатории', 'lab')) - .2;
  const h = el(`<div style="width:1080px;text-align:center"><div class="big gnum" style="font-size:420px;line-height:.9">?</div>
    <div class="big" style="font-size:96px;line-height:1.05;margin-top:30px">${T('СКОЛЬКО<br>ПРИНОСЯТ<br><span style="color:#1FD18B">ОРДЕРА КИТОВ</span>', 'HOW MUCH<br>DO WHALE<br><span style="color:#1FD18B">ORDERS MAKE</span>')}</div></div>`, 'top:300px');
  SFX.push([.2, 'impact']);
  SC.push({ t0: .15, t1: tWe + .3, draw(t) { const s = io(t, .15, tWe + .3); show(h, s.o, 0, s.y, s.s); h.querySelector('.gnum').style.transform = `rotate(${Math.sin(t * 3) * 6}deg)`; } });
  const RAD = 150, CIRC = 2 * Math.PI * RAD;
  const dash = el(`<div class="glass" style="width:960px;height:1130px;padding:44px 50px">
     <div class="mono" style="font-size:28px;letter-spacing:5px;color:#9BF7CF">${T('ЗАКРЫТЫЕ ОРДЕРА КИТОВ · 49 ДНЕЙ', 'CLOSED WHALE ORDERS · 49 DAYS')}</div>
     <div style="display:flex;align-items:baseline;gap:24px;margin-top:16px"><div class="big n" style="font-size:150px;letter-spacing:-4px">0</div><div class="nl mono" style="font-size:30px;color:#1FD18B;font-weight:700"></div></div>
     <div style="position:absolute;left:50px;top:300px;display:flex;align-items:center;gap:40px">
       <svg width="340" height="340" viewBox="-170 -170 340 340"><circle r="${RAD}" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="36"/><circle class="arc" r="${RAD}" fill="none" stroke="#1FD18B" stroke-width="36" stroke-linecap="round" transform="rotate(-90)" stroke-dasharray="0 ${CIRC}"/>
         <text class="wr" x="0" y="20" text-anchor="middle" font-family="Unbounded" font-weight="900" font-size="70" fill="#fff">0%</text><text x="0" y="68" text-anchor="middle" font-family="JetBrains Mono" font-size="24" fill="#9BF7CF">${T('В ПЛЮСЕ', 'IN PROFIT')}</text></svg>
       <div><div class="mono" style="font-size:26px;color:#aaa;letter-spacing:3px">${T('БАЗОВЫЙ ФИЛЬТР', 'BASE FILTER')}</div>
         <div class="sw" style="margin-top:16px;width:190px;height:96px;border-radius:48px;background:rgba(255,255,255,.12);position:relative"><div class="kn" style="position:absolute;top:8px;left:8px;width:80px;height:80px;border-radius:50%;background:#fff"></div></div>
         <div class="mono fd" style="font-size:22px;color:#9BF7CF;margin-top:18px;line-height:1.5">PPC &gt; 0.1<br>ETA &lt; 24h<br>txns &lt; 100K</div></div></div>
     <div style="position:absolute;left:50px;top:690px;width:860px;display:grid;grid-template-columns:1fr 1fr;gap:18px">
       ${[[T('СРЕДНИЙ ОРДЕР', 'AVERAGE ORDER'), fmtPct(ov.filtered.avg)], ['PROFIT FACTOR', ov.filtered.pf.toFixed(2)], [T('УДЕРЖАНИЕ', 'HOLDING TIME'), '≈ ' + T((ov.filtered.holdMin / 60).toFixed(1).replace('.', ',') + ' ч', (ov.filtered.holdMin / 60).toFixed(1) + 'h')], [T('СИГНАЛОВ В НЕДЕЛЮ', 'SIGNALS PER WEEK'), '≈ ' + Math.round(ov.filtered.perWeek)]].map(r => `<div class="tl" style="padding:24px 28px;border-radius:20px;background:rgba(31,209,139,.08);border:1px solid rgba(31,209,139,.35)"><div class="mono" style="font-size:22px;color:#aaa;letter-spacing:2px">${r[0]}</div><div class="big" style="font-size:66px;margin-top:10px;color:#5CFFB7">${r[1]}</div></div>`).join('')}</div></div>`, 'left:60px;top:200px');
  const nEl = dash.querySelector('.n'), arc = dash.querySelector('.arc'), wr = dash.querySelector('.wr'), sw = dash.querySelector('.sw'), kn = dash.querySelector('.kn'), fd = dash.querySelector('.fd'), tls = [...dash.querySelectorAll('.tl')];
  const tT = [tAvg, tPF, tHold, tSig];
  SFX.push([tWe, 'whoosh']); SFX.push([tOn + .5, 'pop']); tT.forEach(x => SFX.push([x, 'tick'])); flashes.push(tOn + .5);
  SC.push({ t0: tWe, t1: tCurve, draw(t) { const s = io(t, tWe, tCurve); show(dash, s.o, 0, s.y, s.s);
    const on = E.io(P(t, tOn + .4, tOn + .8));
    const nAll = Math.round(ov.all.n * E.o3(P(t, tN, tN + 1.6))), nF = ov.filtered.n; nEl.textContent = (on > .5 ? nF : nAll).toLocaleString(T('ru-RU', 'en-US')); dash.querySelector('.nl').textContent = on > .5 ? T('С ФИЛЬТРОМ', 'FILTERED') : T('ВСЕГО', 'TOTAL');
    const w0 = ov.all.winRate * E.o3(P(t, t63, t63 + 1.2)); const wv = L(w0, ov.filtered.winRate, E.io(P(t, t67, t67 + 1)));
    arc.setAttribute('stroke-dasharray', `${CIRC * wv / 100} ${CIRC}`); wr.textContent = T(wv.toFixed(1).replace('.', ','), wv.toFixed(1)) + '%'; arc.setAttribute('stroke', on > .5 ? '#1FD18B' : '#8FA59B');
    sw.style.background = on > .5 ? '#1FD18B' : 'rgba(255,255,255,.12)'; kn.style.left = L(8, 102, on) + 'px'; fd.style.opacity = .35 + .65 * on;
    tls.forEach((e, i) => { const k = E.back(P(t, tT[i], tT[i] + .45)); e.style.opacity = C(P(t, tT[i], tT[i] + .2)); e.style.transform = `scale(${L(.8, 1, C(k))})`; }); } });
  // curve
  const cf = D.slots.find(s => s.id === 's3'); const curA = D.curveAll, curF = D.curve;
  const toPts = arr => arr.map((p, i) => [i / (arr.length - 1), p.cum]);
  const hiC = Math.max(...curF.map(p => p.cum), ...curA.map(p => p.cum)) * 1.08, loC = Math.min(0, ...curA.map(p => p.cum)) - 50;
  const cv = el(`<div class="glass" style="width:960px;padding:44px 50px"><div class="mono" style="font-size:28px;letter-spacing:5px;color:#9BF7CF">${T('НАКОПЛЕННЫЙ PNL ОРДЕРОВ · 49 ДНЕЙ', 'CUMULATIVE ORDER PNL · 49 DAYS')}</div>
     <div style="display:flex;gap:40px;margin-top:20px;align-items:flex-end"><div><div class="big gnum cvF" style="font-size:110px">+0%</div><div class="mono" style="font-size:24px;color:#1FD18B">${T('С ФИЛЬТРОМ', 'FILTERED')} · ${ov.filtered.n} ${T('ОРДЕРА', 'ORDERS')}</div></div>
       <div><div class="big cvA" style="font-size:64px;color:#8FA59B">+0%</div><div class="mono" style="font-size:22px;color:#8FA59B">${T('ВСЕ', 'ALL')} · ${ov.all.n}</div></div></div>
     <div style="position:relative;margin-top:40px;height:560px"><div style="position:absolute;left:0;top:0">${chartSVG('ca', toPts(curA), 860, 540, loC, hiC, { col: '#8FA59B', sw: 6 })}</div><div style="position:absolute;left:0;top:0">${chartSVG('cf', toPts(curF), 860, 540, loC, hiC)}</div></div>
     <div class="big" style="font-size:54px;margin-top:20px;text-align:center">${T('ФИЛЬТРЫ <span style="color:#1FD18B">РЕШАЮТ</span>', 'FILTERS <span style="color:#1FD18B">DECIDE</span>')}</div></div>`, 'left:60px;top:220px');
  const clA = cv.querySelectorAll('.clipr')[0], clF = cv.querySelectorAll('.clipr')[1];
  SFX.push([tCurve, 'whoosh']);
  SC.push({ t0: tCurve, t1: tCTA, draw(t) { const s = io(t, tCurve, tCTA); show(cv, s.o, 0, s.y, s.s); const k = E.io(P(t, tCurve + .3, tCurve + 2.2));
    clA.setAttribute('width', 880 * k); clF.setAttribute('width', 880 * k);
    cv.querySelector('.cvF').textContent = '+' + Math.round(ov.filtered.sum * k) + '%'; cv.querySelector('.cvA').textContent = '+' + Math.round(ov.all.sum * k) + '%'; } });
  ctaScene(tCTA, DUR + 1, { title: T('ПРОВЕРЬ<br>СВОИ ФИЛЬТРЫ', 'TEST<br>YOUR FILTERS'), sub: T('ЛАБОРАТОРИЯ ФИЛЬТРОВ · БЕСПЛАТНО', 'FILTER LAB · FREE'), top: 380 });
}

// ---------- shorts sD..sH (Russian) ----------
const FOOT2 = {
  sD: 'PnL ордеров китов · мониторинг V3, 02.09–24.10.2026<br>без комиссий и проскальзывания · не финансовый совет',
  sE: 'Сумма PnL 1169 закрытых ордеров китов · мониторинг V3<br>TP/SL пересчитаны по пику и просадке · не финансовый совет',
  sF: 'Средний PnL ордеров китов по капитализации · мониторинг V3<br>без ваших издержек · не финансовый совет',
  sG: 'Слоты с базовым фильтром · мониторинг V3, всё время<br>прошлые результаты не гарантируют будущих',
  sH: 'Средний PnL ордеров по часу открытия (МСК) · мониторинг V3<br>без ваших издержек · не финансовый совет' };
if (FOOT2[SID]) $('foot').innerHTML = FOOT2[SID];
const fmtN = v => Math.round(v).toLocaleString('ru-RU');
function hookScene(t1, html, top = 330) { const h = el(`<div style="width:1080px;text-align:center">${html}</div>`, 'top:' + top + 'px'); SFX.push([.2, 'impact']);
  SC.push({ t0: .15, t1, draw(t) { const s = io(t, .15, t1); show(h, s.o, 0, s.y + Math.sin(t * 2) * 6, s.s); } }); return h; }
function rankCard(o, rank, t0, t1, i, sub) {
  const pts = pricePath(o); const lo = Math.min(-15, o.trough * 1.15), hi = Math.max(o.peak, o.pnl) * 1.15 + 5;
  const card = el(`
    <div style="display:flex;align-items:flex-end;gap:24px;margin-left:70px"><div class="big" style="font-size:220px;color:transparent;-webkit-text-stroke:5px #1FD18B;letter-spacing:-6px">#${rank}</div>
      <div class="mono" style="font-size:34px;color:#9BF7CF;letter-spacing:6px;padding-bottom:30px">${rank === 1 ? 'ПЕРВОЕ МЕСТО' : 'МЕСТО'}</div></div>
    <div class="glass" style="position:absolute;left:60px;top:250px;width:960px;height:930px;padding:44px 50px">
      <div style="display:flex;align-items:center;gap:30px"><img src="logo/${o.s}.png" class="logo" style="width:150px;height:150px">
        <div><div style="font-weight:700;font-size:84px;letter-spacing:-1px">${o.s}</div><div class="mono" style="font-size:26px;color:#aaa;letter-spacing:2px">ОРДЕР КИТА · DCA ${o.dep}</div></div></div>
      <div style="display:flex;align-items:baseline;gap:30px;margin-top:40px"><div class="big gnum pnl" style="font-size:158px;letter-spacing:-6px">+0.0%</div></div>
      <div class="big sub" style="font-size:76px;margin-top:6px;color:#fff">${sub}</div>
      <div style="position:absolute;left:50px;top:600px">${chartSVG('k' + i, pts, 860, 230, lo, hi)}</div>
      <div style="position:absolute;left:50px;top:850px;display:flex;gap:14px"><span class="chip w" style="font-size:28px">${o.cyc} циклов</span><span class="chip w" style="font-size:28px">${o.status === 'completed' ? 'завершён' : 'закрыт досрочно'}</span></div>
    </div>`, 'top:190px;width:1080px;height:1300px');
  const pnl = card.querySelector('.pnl'), clip = card.querySelector('.clipr'), sb = card.querySelector('.sub');
  SFX.push([t0, 'whoosh']); SFX.push([t0 + .55, 'riser_short']); flashes.push(t0); if (rank === 1) SFX.push([t0 + .1, 'impact']);
  SC.push({ t0, t1, draw(t) { const ki = E.o5(P(t, t0 - .12, t0 + .32)), ke = E.io(P(t, t1 - .12, t1 + .22)); show(card, Math.min(C(ki * 1.4), 1 - ke), (1 - ki) * 320 - ke * 320, 0, L(.94, 1, ki));
    pnl.textContent = fmtPct(o.pnl * E.o3(P(t, t0 + .4, t0 + 1.8))); clip.setAttribute('width', 900 * E.io(P(t, t0 + .4, t0 + 2.2)));
    const k = E.back(P(t, t0 + 1.2, t0 + 1.7)); sb.style.opacity = C(P(t, t0 + 1.2, t0 + 1.4)); sb.style.transform = `scale(${L(.7, 1, C(k))})`; sb.style.transformOrigin = '0 50%'; } });
}
function confetti(tc) { const conf = el('<canvas width="1080" height="1920"></canvas>', 'z-index:40;pointer-events:none'); const cx = conf.firstChild.getContext('2d');
  const CF = [...Array(140)].map((_, i) => { const r = rng(300 + i); return { x: 540 + (r() - .5) * 200, y: 700, vx: (r() - .5) * 1500, vy: -600 - r() * 1300, c: ['#1FD18B', '#9BF7CF', '#EAFFF5', '#14B8C4'][i % 4], w: 10 + r() * 14, rot: r() * 6, vr: (r() - .5) * 14 }; });
  SC.push({ t0: tc, t1: tc + 3.5, always: true, draw(t) { cx.clearRect(0, 0, 1080, 1920); const dt = t - tc - .9; if (dt < 0) return; for (const p of CF) { const x = p.x + p.vx * dt, y = p.y + p.vy * dt + 1100 * dt * dt; cx.save(); cx.globalAlpha = C(1 - dt / 2.6); cx.translate(x, y); cx.rotate(p.rot + p.vr * dt); cx.fillStyle = p.c; cx.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); cx.restore(); } } }); }
const STOPWATCH = `<svg width="260" height="290" viewBox="0 0 260 290"><circle cx="130" cy="160" r="112" fill="none" stroke="#1FD18B" stroke-width="16"/><rect x="108" y="10" width="44" height="30" rx="8" fill="#1FD18B"/><line x1="130" y1="160" x2="130" y2="80" stroke="#EAFFF5" stroke-width="12" stroke-linecap="round" class="hand"/><circle cx="130" cy="160" r="12" fill="#EAFFF5"/></svg>`;

if (SID === 'sD') {
  const F = D.fast; const tR = [A('третье') - .15, A('второе') - .15, A('первое') - .15], tRecap = A('закончил') - .4, tCTA = A('ссылка') - .1;
  const h = hookScene(tR[0], `<div class="sw" style="display:flex;justify-content:center">${STOPWATCH}</div><div class="big" style="font-size:84px;line-height:1.05;margin-top:30px">САМЫЕ БЫСТРЫЕ<br><span style="color:#1FD18B">СДЕЛКИ КИТОВ</span></div><div style="margin-top:40px"><span class="chip">SOLANA · МЕНЬШЕ 30 МИНУТ</span></div>`, 300);
  const hand = h.querySelector('.hand'); SC.push({ t0: 0, t1: tR[0], draw(t) { hand.setAttribute('transform', `rotate(${t * 220} 130 160)`); } });
  F.forEach((o, i) => rankCard(o, 3 - i, tR[i], i < 2 ? tR[i + 1] : tRecap, i, 'за ' + fmtDur(o.dur)));
  confetti(tR[2]);
  const rows = [...F].reverse();
  const rec = el(`<div class="glass" style="width:960px;padding:40px 44px"><div class="mono" style="font-size:30px;letter-spacing:5px;color:#9BF7CF">ТОП-3 · САМЫЕ БЫСТРЫЕ</div>
    ${rows.map((o, i) => `<div class="rw" style="display:flex;align-items:center;gap:22px;margin-top:30px"><div class="big" style="font-size:48px;width:70px;color:#1FD18B">#${i + 1}</div><img src="logo/${o.s}.png" class="logo" style="width:84px;height:84px;box-shadow:0 0 0 3px rgba(31,209,139,.5)">
      <div style="flex:1"><div style="font-weight:700;font-size:44px">${o.s}</div><div class="mono" style="font-size:26px;color:#aaa">за ${fmtDur(o.dur)}</div></div>
      <div class="big" style="font-size:56px;color:#5CFFB7">${fmtPct(o.pnl)}</div></div>`).join('')}</div>`, 'left:60px;top:300px');
  const rws = [...rec.querySelectorAll('.rw')]; SFX.push([tRecap, 'whoosh']);
  SC.push({ t0: tRecap, t1: tCTA + .2, draw(t) { const s = io(t, tRecap, tCTA + .2); show(rec, s.o, 0, s.y, s.s); rws.forEach((r, i) => { const k = E.o3(P(t, tRecap + .2 + i * .15, tRecap + .6 + i * .15)); r.style.opacity = k; r.style.transform = `translateX(${(1 - k) * 60}px)`; }); } });
  ctaScene(tCTA, DUR + 1, { top: 380, sub: 'СИГНАЛЫ КИТОВ 24/7' });
}

if (SID === 'sE') {
  const K = D.kimchi, S = D.summary, G = D.tpsl.grid; const tAvg = A('среднем') - .2, tTP = A('тейк-профит') - .2, t5 = A('пять') - .1, tSL = A('стоп') - .1, tLab = A('подбери') - .2;
  // scene 1: Kimchi peak vs exit
  const pts = pricePath(K, 90); const lo = -30, hi = K.peak * 1.12; const pkI = pts.reduce((b, p, j) => p[1] > pts[b][1] ? j : b, 0);
  const W = 860, H = 420, X = x => 50 + x * W, Yv = y => 330 + H - (y - lo) / (hi - lo) * H;
  const s1 = el(`<div class="glass" style="width:960px;height:1030px;padding:44px 50px">
     <div style="display:flex;align-items:center;gap:26px"><img src="logo/Kimchi.png" class="logo" style="width:120px;height:120px"><div><div style="font-weight:700;font-size:72px">Kimchi</div><div class="mono" style="font-size:24px;color:#aaa;letter-spacing:2px">ОРДЕР КИТА · ПИК VS ВЫХОД</div></div></div>
     <div style="position:absolute;left:50px;top:330px">${chartSVG('e', pts, W, H, lo, hi)}</div>
     <div class="pk" style="position:absolute;text-align:center"><div class="big" style="font-size:64px;color:#5CFFB7">+294%</div><div class="mono" style="font-size:24px;color:#9BF7CF">ПИК</div></div>
     <div class="cl" style="position:absolute;text-align:center"><div class="big" style="font-size:64px;color:#fff">+158%</div><div class="mono" style="font-size:24px;color:#ccc">ВЫХОД</div></div>
     <div class="q big" style="position:absolute;left:50px;top:860px;width:860px;text-align:center;font-size:58px;color:#FF5C7A">−136% ОТДАНО ОБРАТНО</div></div>`, 'left:60px;top:220px');
  const c1 = s1.querySelector('.clipr'), pk = s1.querySelector('.pk'), cl = s1.querySelector('.cl'), q = s1.querySelector('.q');
  pk.style.left = (X(pts[pkI][0]) - 110) + 'px'; pk.style.top = (Yv(pts[pkI][1]) - 120) + 'px'; cl.style.left = (X(1) - 200) + 'px'; cl.style.top = (Yv(K.pnl) + 20) + 'px';
  SFX.push([.2, 'impact']); SFX.push([A('закрылся') - .1, 'pop']); SFX.push([A('куда') - .1, 'tick']);
  SC.push({ t0: .15, t1: tAvg, draw(t) { const s = io(t, .15, tAvg); show(s1, s.o, 0, s.y, s.s); c1.setAttribute('width', (W + 20) * E.io(P(t, .5, 3))); pk.style.opacity = P(t, .5 + pts[pkI][0] * 2.5, .8 + pts[pkI][0] * 2.5); cl.style.opacity = P(t, A('закрылся') - .1, A('закрылся') + .2); q.style.opacity = P(t, A('куда') - .1, A('куда') + .2); } });
  // scene 2: average peak vs close
  const s2 = el(`<div class="glass" style="width:960px;padding:50px"><div class="mono" style="font-size:28px;letter-spacing:4px;color:#9BF7CF">${fmtN(S.closed)} ОРДЕРОВ КИТОВ · В СРЕДНЕМ</div>
     ${[['СРЕДНИЙ ПИК', S.avgPeak, '#5CFFB7'], ['СРЕДНИЙ ВЫХОД', S.avgPnl, '#EAFFF5']].map((r, i) => `<div style="margin-top:44px"><div style="display:flex;justify-content:space-between;align-items:baseline"><div class="mono" style="font-size:30px;color:#aaa">${r[0]}</div><div class="big v${i}" style="font-size:80px;color:${r[2]}">+0%</div></div>
       <div style="height:44px;border-radius:22px;background:rgba(255,255,255,.07);margin-top:14px"><div class="b${i}" style="height:100%;width:0;border-radius:22px;background:${i ? '#9aa9a2' : 'linear-gradient(90deg,#0FB37A,#5CFFB7)'}"></div></div></div>`).join('')}
     <div class="tbl" style="margin-top:56px;padding:30px;border-radius:24px;border:2px dashed #FF5C7A;text-align:center"><div class="big" style="font-size:120px;color:#FF5C7A">${S.leftOnTable.toFixed(1)}%</div><div class="mono" style="font-size:30px;color:#ffc2cd;letter-spacing:3px">ОСТАЁТСЯ НА СТОЛЕ</div></div></div>`, 'left:60px;top:300px');
  const tTable = A('шесть') - .1; SFX.push([tAvg, 'whoosh']); SFX.push([tTable, 'impact']);
  SC.push({ t0: tAvg, t1: tTP, draw(t) { const s = io(t, tAvg, tTP); show(s2, s.o, 0, s.y, s.s);
    [S.avgPeak, S.avgPnl].forEach((v, i) => { const k = E.o3(P(t, tAvg + .3 + i * .9, tAvg + 1.5 + i * .9)); s2.querySelector('.v' + i).textContent = '+' + (v * k).toFixed(1) + '%'; s2.querySelector('.b' + i).style.width = (k * v / S.avgPeak * 100) + '%'; });
    const tb = s2.querySelector('.tbl'), k = E.back(P(t, tTable, tTable + .45)); tb.style.opacity = C(P(t, tTable, tTable + .2)); tb.style.transform = `scale(${L(.7, 1, C(k))})`; } });
  // scene 3: TP / SL totals
  const g = (tp, sl) => G.find(r => r.tp === tp && r.sl === sl).sum; const ROWS = [['Без TP/SL', g(0, 0), 'w', tTP], ['Тейк +30%', g(30, 0), 'g', tTP + 1.2], ['Тейк +5%', g(5, 0), 'r', t5], ['Стоп −3%', g(0, -3), 'r', tSL]];
  const mx = Math.max(...ROWS.map(r => r[1]));
  const s3 = el(`<div class="glass" style="width:960px;padding:50px"><div class="mono" style="font-size:28px;letter-spacing:4px;color:#9BF7CF">СУММА PNL ВСЕХ ОРДЕРОВ · С ПОРОГАМИ ВЫХОДА</div>
     ${ROWS.map((r, i) => `<div class="tr" style="margin-top:40px"><div style="display:flex;justify-content:space-between;align-items:baseline"><div style="font-weight:700;font-size:42px">${r[0]}</div><div class="big tv" style="font-size:62px;color:${r[2] === 'g' ? '#5CFFB7' : r[2] === 'r' ? '#FF5C7A' : '#fff'}">+0%</div></div>
       <div style="height:40px;border-radius:20px;background:rgba(255,255,255,.07);margin-top:12px"><div class="tb" style="height:100%;width:0;border-radius:20px;background:${r[2] === 'g' ? 'linear-gradient(90deg,#0FB37A,#5CFFB7)' : r[2] === 'r' ? 'linear-gradient(90deg,#B3203B,#FF5C7A)' : '#9aa9a2'}"></div></div></div>`).join('')}</div>`, 'left:60px;top:280px');
  const trs = [...s3.querySelectorAll('.tr')]; ROWS.forEach(r => SFX.push([r[3], r[2] === 'r' ? 'tick' : 'pop'])); SFX.push([tTP, 'whoosh']);
  SC.push({ t0: tTP, t1: tLab, draw(t) { const s = io(t, tTP, tLab); show(s3, s.o, 0, s.y, s.s);
    trs.forEach((e, i) => { const r = ROWS[i], k = E.o3(P(t, r[3], r[3] + 1)); e.style.opacity = C(P(t, r[3] - .1, r[3] + .2)); e.querySelector('.tv').textContent = '+' + fmtN(r[1] * k) + '%'; e.querySelector('.tb').style.width = (k * r[1] / mx * 100) + '%'; }); } });
  ctaScene(tLab, DUR + 1, { title: 'ПОДБЕРИ<br>СВОЙ ТЕЙК И СТОП', sub: 'ЛАБОРАТОРИЯ ФИЛЬТРОВ · БЕСПЛАТНО', top: 380 });
}

if (SID === 'sF') {
  const B = D.mcap; const tMy = A('мы') - .2, tRow = A('разложили'), tSmall = A('мелкие') - .1, tBest = A('лучше') - .1, tCTA = A('поставь') - .2;
  hookScene(tMy, `<div class="big gnum" style="font-size:380px;line-height:.9">?</div><div class="big" style="font-size:78px;line-height:1.08;margin-top:30px">КАКИЕ МЕМКОИНЫ<br><span style="color:#1FD18B">КОПИРОВАТЬ</span><br>ЗА КИТАМИ</div>`, 300);
  const mxv = Math.max(...B.map(b => Math.abs(b.avg))); const Z = 560, SCL = 420 / mxv;
  const ch = el(`<div class="glass" style="width:960px;height:1080px;padding:44px 40px"><div class="mono" style="font-size:28px;letter-spacing:4px;color:#9BF7CF">СРЕДНИЙ ИТОГ ОРДЕРА · ПО КАПИТАЛИЗАЦИИ</div>
     <div class="mono cnt" style="font-size:26px;color:#aaa;margin-top:10px">${fmtN(D.summary.closed)} ОРДЕРОВ КИТОВ</div>
     <div style="position:absolute;left:40px;right:40px;top:${Z + 40}px;height:2px;background:rgba(255,255,255,.25)"></div>
     ${B.map((b, i) => `<div class="col" style="position:absolute;left:${48 + i * 124}px;width:110px;top:0;height:1080px">
        <div class="bar" style="position:absolute;left:10px;width:90px;border-radius:12px;background:${b.avg >= 0 ? 'linear-gradient(#5CFFB7,#0FB37A)' : 'linear-gradient(#B3203B,#FF5C7A)'}"></div>
        <div class="val big" style="position:absolute;width:110px;text-align:center;font-size:34px;color:${b.avg >= 0 ? '#5CFFB7' : '#FF5C7A'}">${fmtPct(b.avg)}</div>
        <div class="mono" style="position:absolute;top:${Z + 130}px;width:110px;text-align:center;font-size:21px;color:#ddd;line-height:1.3">${b.label.replace('–', '–<br>')}</div>
        <div class="mono" style="position:absolute;top:${Z + 210}px;width:110px;text-align:center;font-size:20px;color:#888">win ${b.win}%</div></div>`).join('')}
     <div class="tag big" style="position:absolute;left:40px;right:40px;top:960px;text-align:center;font-size:42px;color:#5CFFB7">$1M – $3M: ЛУЧШИЙ ДИАПАЗОН</div></div>`, 'left:60px;top:210px');
  const cols = [...ch.querySelectorAll('.col')], tag = ch.querySelector('.tag'); SFX.push([tMy, 'whoosh']); SFX.push([tSmall, 'tick']); SFX.push([tBest, 'impact']); flashes.push(tBest);
  const iBest = B.reduce((b, x, j) => x.avg > B[b].avg ? j : b, 0);
  SC.push({ t0: tMy, t1: tCTA, draw(t) { const s = io(t, tMy, tCTA); show(ch, s.o, 0, s.y, s.s);
    cols.forEach((c, i) => { const b = B[i], k = E.back(P(t, tRow + .2 + i * .18, tRow + .7 + i * .18)), hpx = Math.abs(b.avg) * SCL * C(k, 0, 1.1);
      const bar = c.querySelector('.bar'), val = c.querySelector('.val'); bar.style.height = Math.max(4, hpx) + 'px'; bar.style.top = (b.avg >= 0 ? Z + 40 - hpx : Z + 40) + 'px';
      val.style.top = (b.avg >= 0 ? Z + 40 - hpx - 50 : Z + 40 + hpx + 10) + 'px'; val.style.opacity = C(k);
      const hl = (i === 0 && t > tSmall && t < tBest + .5) || (i === iBest && t > tBest); c.style.opacity = t > tSmall && !hl ? .45 : 1; bar.style.boxShadow = hl ? `0 0 40px ${b.avg >= 0 ? '#1FD18B' : '#FF3B5C'}` : 'none'; });
    tag.style.opacity = P(t, tBest + .3, tBest + .6); } });
  ctaScene(tCTA, DUR + 1, { title: 'ФИЛЬТР ПО<br>КАПИТАЛИЗАЦИИ', sub: 'ССЫЛКА В ПРОФИЛЕ', top: 380 });
}

if (SID === 'sG') {
  const SL = D.slots; const tB = A('базовый') - .15, tP = A('про') - .15, tU = A('безлимит') - .15, tAvg = A('средний') - .1, tDiff = A('разница') - .1, tCTA = A('сравни') - .2;
  hookScene(tB, `<div class="big" style="font-size:118px;line-height:1.02">КАКОЙ СЛОТ<br><span style="color:#1FD18B">ВЫБРАТЬ?</span></div><div style="margin-top:60px;display:flex;justify-content:center;gap:20px"><span class="chip">$300</span><span class="chip">$600</span><span class="chip">$1 200</span></div>`, 520);
  const INFO = [['Базовый', 'ордера до $9K', '$300', SL[0]], ['Про', '$9K – $35K', '$600', SL[1]], ['Безлимит', 'любой объём', '$1 200', SL[2]]]; const maxW = Math.max(...SL.map(s => s.filtered.perWeek));
  const box = el(`<div style="width:960px">${INFO.map((r, i) => `<div class="glass sc" style="padding:30px 38px;margin-bottom:26px">
     <div style="display:flex;align-items:baseline;justify-content:space-between"><div><span style="font-weight:700;font-size:54px">${r[0]}</span><span class="mono" style="font-size:26px;color:#aaa;margin-left:18px">${r[1]}</span></div><div class="big" style="font-size:50px;color:#1FD18B">${r[2]}</div></div>
     <div style="display:flex;gap:16px;margin-top:22px">${[['В ПЛЮСЕ', r[3].filtered.winRate.toFixed(0) + '%'], ['СРЕДНИЙ', fmtPct(r[3].filtered.avg)], ['PF', r[3].filtered.pf.toFixed(2)]].map((m, j) => `<div class="m m${j}" style="flex:1;padding:14px 18px;border-radius:14px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1)"><div class="mono" style="font-size:20px;color:#aaa">${m[0]}</div><div class="big" style="font-size:40px;margin-top:6px">${m[1]}</div></div>`).join('')}</div>
     <div style="display:flex;align-items:center;gap:18px;margin-top:22px"><div style="flex:1;height:30px;border-radius:15px;background:rgba(255,255,255,.07)"><div class="wb" style="height:100%;width:0;border-radius:15px;background:linear-gradient(90deg,#0FB37A,#5CFFB7)"></div></div><div class="mono" style="font-size:28px;font-weight:700;width:230px;text-align:right">${Math.round(r[3].filtered.perWeek)} сигн./нед</div></div></div>`).join('')}</div>`, 'left:60px;top:220px');
  const cards = [...box.querySelectorAll('.sc')], T3 = [tB, tP, tU]; T3.forEach(x => SFX.push([x, 'pop'])); SFX.push([tAvg, 'tick']); SFX.push([tDiff, 'impact']);
  SC.push({ t0: tB, t1: tCTA, draw(t) { const s = io(t, tB, tCTA); show(box, s.o, 0, 0, 1);
    cards.forEach((c, i) => { const k = E.back(P(t, T3[i], T3[i] + .45)); c.style.opacity = C(P(t, T3[i], T3[i] + .2)); c.style.transform = `translateY(${(1 - C(k)) * 60}px) scale(${L(.9, 1, C(k))})`;
      c.querySelector('.wb').style.width = (E.o3(P(t, T3[i] + .3, T3[i] + 1.3)) * SL[i].filtered.perWeek / maxW * 100) + '%';
      const m1 = c.querySelector('.m1'); const on = t > tAvg && t < tDiff; m1.style.borderColor = on ? '#1FD18B' : 'rgba(255,255,255,.1)'; m1.style.boxShadow = on ? '0 0 30px rgba(31,209,139,.5)' : 'none';
      c.style.boxShadow = t > tDiff && i === 2 ? '0 0 0 3px #1FD18B,0 0 60px rgba(31,209,139,.4)' : ''; }); } });
  ctaScene(tCTA, DUR + 1, { title: 'СРАВНИ СЛОТЫ<br>НА САЙТЕ', sub: 'СТАТИСТИКА ДО РЕГИСТРАЦИИ', top: 380 });
}

if (SID === 'sH') {
  const hrs = [...Array(24)].map((_, h) => { const rs = D.heat.filter(r => r.hour === h); const n = rs.reduce((a, r) => a + r.n, 0); return { h, n, avg: n ? rs.reduce((a, r) => a + r.n * r.avg, 0) / n : 0 }; });
  const dows = [1, 2, 3, 4, 5, 6, 0].map(d => { const rs = D.heat.filter(r => r.dow === d); const n = rs.reduce((a, r) => a + r.n, 0); return { d, n, avg: rs.reduce((a, r) => a + r.n * r.avg, 0) / n }; });
  const DN = { 0: 'Вс', 1: 'Пн', 2: 'Вт', 3: 'Ср', 4: 'Чт', 5: 'Пт', 6: 'Сб' };
  const tMy = A('мы') - .2, tRow = A('разложили'), tBest = A('лучшее') - .1, tNext = A('полночь') - .1, tWorst = A('хуже') - .1, tDay = A('лучший') - .1, tCTA = A('бот') - .2;
  const CLOCK = `<svg width="300" height="300" viewBox="-150 -150 300 300"><circle r="130" fill="none" stroke="#1FD18B" stroke-width="14"/>${[...Array(12)].map((_, i) => `<line x1="0" y1="-112" x2="0" y2="-96" stroke="#9BF7CF" stroke-width="6" transform="rotate(${i * 30})"/>`).join('')}<line class="hh" x1="0" y1="0" x2="0" y2="-60" stroke="#EAFFF5" stroke-width="12" stroke-linecap="round"/><line class="mh" x1="0" y1="0" x2="0" y2="-95" stroke="#1FD18B" stroke-width="8" stroke-linecap="round"/><circle r="10" fill="#EAFFF5"/></svg>`;
  const h = hookScene(tMy, `<div style="display:flex;justify-content:center">${CLOCK}</div><div class="big" style="font-size:86px;line-height:1.05;margin-top:40px">КОГДА КИТЫ<br><span style="color:#1FD18B">ЗАХОДЯТ ЛУЧШЕ?</span></div>`, 330);
  const hh = h.querySelector('.hh'), mh = h.querySelector('.mh'); SC.push({ t0: 0, t1: tMy, draw(t) { hh.setAttribute('transform', `rotate(${t * 60})`); mh.setAttribute('transform', `rotate(${t * 720})`); } });
  const mx = Math.max(...hrs.map(x => Math.abs(x.avg))), Z = 520, SCL = 300 / mx, BW = 37;
  const ch = el(`<div class="glass" style="width:960px;height:1120px;padding:44px 40px"><div class="mono" style="font-size:28px;letter-spacing:4px;color:#9BF7CF">СРЕДНИЙ ИТОГ ОРДЕРА · ЧАС ОТКРЫТИЯ (МСК)</div>
     <div class="big call" style="font-size:78px;margin-top:20px;color:#5CFFB7;height:90px"></div>
     <div style="position:absolute;left:40px;right:40px;top:${Z}px;height:2px;background:rgba(255,255,255,.25)"></div>
     ${hrs.map((x, i) => `<div class="hb" style="position:absolute;left:${44 + i * BW}px;width:${BW - 7}px;border-radius:6px;background:${x.avg >= 0 ? 'linear-gradient(#5CFFB7,#0FB37A)' : 'linear-gradient(#B3203B,#FF5C7A)'}"></div>${i % 3 === 0 ? `<div class="mono" style="position:absolute;left:${34 + i * BW}px;top:${Z + 170}px;width:50px;text-align:center;font-size:20px;color:#aaa">${String(i).padStart(2, '0')}:00</div>` : ''}`).join('')}
     <div class="dw" style="position:absolute;left:40px;right:40px;top:780px"><div class="mono" style="font-size:24px;letter-spacing:3px;color:#9BF7CF">ПО ДНЯМ НЕДЕЛИ</div>
       <div style="display:flex;gap:12px;margin-top:20px;align-items:flex-end;height:200px">${dows.map(x => `<div class="db" style="flex:1;text-align:center"><div class="mono dv" style="font-size:22px;color:#ddd">${fmtPct(x.avg)}</div><div class="dbar" style="margin-top:8px;border-radius:8px;background:linear-gradient(#9BF7CF,#1FD18B);height:${x.avg / 3.2 * 120}px"></div><div style="font-weight:700;font-size:28px;margin-top:10px">${DN[x.d]}</div></div>`).join('')}</div></div></div>`, 'left:60px;top:200px');
  const hbs = [...ch.querySelectorAll('.hb')], call = ch.querySelector('.call'), dw = ch.querySelector('.dw'), dbs = [...ch.querySelectorAll('.db')];
  const best = [6], next = [0, 16], worst = [5, 13, 21]; SFX.push([tMy, 'whoosh']); SFX.push([tBest, 'impact']); flashes.push(tBest); SFX.push([tNext, 'pop']); SFX.push([tWorst, 'tick']); SFX.push([tDay, 'pop']);
  SC.push({ t0: tMy, t1: tCTA, draw(t) { const s = io(t, tMy, tCTA); show(ch, s.o, 0, s.y, s.s);
    hbs.forEach((b, i) => { const x = hrs[i], k = E.back(P(t, tRow + .1 + i * .05, tRow + .5 + i * .05)), hp = Math.max(3, Math.abs(x.avg) * SCL * C(k, 0, 1.1));
      b.style.height = hp + 'px'; b.style.top = (x.avg >= 0 ? Z - hp : Z + 2) + 'px';
      const hl = (t > tBest && best.includes(i)) || (t > tNext && next.includes(i)) || (t > tWorst && t < tDay && worst.includes(i)); const dim = t > tBest && !hl;
      b.style.opacity = dim ? .35 : 1; b.style.boxShadow = hl ? `0 0 26px ${x.avg >= 0 ? '#1FD18B' : '#FF3B5C'}` : 'none'; });
    call.textContent = t > tDay ? 'ЛУЧШИЙ ДЕНЬ: ВОСКРЕСЕНЬЕ' : t > tWorst ? '05:00 · 13:00 · 21:00 — МИНУС' : t > tNext ? '00:00 И 16:00 — ТОЖЕ ТОП' : t > tBest ? '06:00 МСК · ' + fmtPct(hrs[6].avg) : '';
    call.style.color = t > tWorst && t < tDay ? '#FF5C7A' : '#5CFFB7'; call.style.fontSize = t > tBest && t < tNext ? '72px' : '44px';
    dw.style.opacity = P(t, tDay - .2, tDay + .2); dbs.forEach((d, i) => { const on = dows[i].d === 0 && t > tDay + .3; d.style.opacity = t > tDay + .3 && !on ? .5 : 1; d.querySelector('.dbar').style.boxShadow = on ? '0 0 30px #1FD18B' : 'none'; }); } });
  ctaScene(tCTA, DUR + 1, { sub: 'БОТ РАБОТАЕТ 24/7', top: 380 });
}

function renderAt(t) {
  drawBG(t);
  for (const s of SC) { if (s.always || (t >= s.t0 - .25 && t < s.t1 + .3)) s.draw(t); else s.draw(t < s.t0 ? s.t0 - 1 : s.t1 + 1); }
  drawCaps(t, false);
  $('dot').style.opacity = .4 + .6 * Math.abs(Math.sin(t * 3));
  let fl = 0; for (const f of flashes) { const d = t - f; if (d > -.02 && d < .3) fl = Math.max(fl, .22 * Math.exp(-Math.max(0, d) * 10)); } $('flash').style.opacity = fl;
  const pulse = flashes.reduce((m, f) => { const d = t - f; return d > 0 && d < .4 ? Math.max(m, Math.sin(d / .4 * Math.PI) * .025) : m; }, 0); stage.style.transform = `scale(${1 + pulse})`;
  $('prog').style.width = (t / DUR * 100) + '%';
  gr.putImageData(GI[Math.floor(t * 30) % 4], 0, 0); $('grain').style.transform = `translate(${(Math.floor(t * 30) * 37) % 60}px,${(Math.floor(t * 30) * 53) % 60}px) scale(2)`;
  document.body.style.opacity = Math.min(P(t, 0, .3), 1 - P(t, DUR - .5, DUR));
}
window.renderAt = renderAt; window.DUR = DUR;
Promise.all([document.fonts.ready, ...[...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))]).then(() => { window.READY = true; });
})();
