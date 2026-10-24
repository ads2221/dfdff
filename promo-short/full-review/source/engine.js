// Deterministic renderer for the long-form review. renderAt(t) draws frame at time t.
(() => {
const $ = id => document.getElementById(id);
const C = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const P = (t, a, b) => C((t - a) / (b - a));
const L = (a, b, x) => a + (b - a) * x;
const E = { o3: x => 1 - Math.pow(1 - x, 3), o5: x => 1 - Math.pow(1 - x, 5), io: x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  back: x => { const c = 1.6, c3 = c + 1; return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); }, expo: x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x) };
function rng(s) { return () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const ERR = []; window.ERR = ERR;
const TL = window.TL, CH = TL.chapters, DUR = TL.DUR, META = window.META, TG = window.TARGETS, WORDS = window.WORDS;
const PANEL = ['dashboard','wallet','orders-v3','dca-stats','dca-lab','trading','portfolio','tpsl','user-stats','alerts','filters','blacklist','plans','docs','profile'];
const URLS = { landing: 'jupiter-dca-bot.online', auth: 'jupiter-dca-bot.online/panel/auth' };
PANEL.forEach(p => URLS[p] = 'jupiter-dca-bot.online/panel/' + p);
const KSCR = 0.98, WX = 176, WY = 70; // content -> screen
const MX = 220; // main left offset in content
const HEADH = 104 / 1.5;

// ---------- DOM: pages ----------
const pagesEl = $('pages');
function addPage(id, html) { const d = document.createElement('div'); d.className = 'pp'; d.id = 'pp_' + id; d.innerHTML = html; pagesEl.appendChild(d); return d; }
PANEL.forEach(p => addPage(p, `<img class="main" src="a/${p}_main.jpg" style="left:${MX}px;top:0;width:1380px">
  <img src="a/${p}_head.jpg" style="left:${MX}px;top:0;width:1380px;height:${HEADH}px">
  <img src="a/${p}_side.jpg" style="left:0;top:0;width:220px;height:1000px">`));
addPage('landing', `<img class="main" src="a/landing_full.jpg" style="left:0;top:0;width:1600px">`);
addPage('auth', `<img src="a/auth_register.jpg" style="left:0;top:0;width:1600px;height:1000px">`);
const PH = p => p === 'landing' ? META.landing.h : p === 'auth' ? 1000 : META[p].h;
const maxScroll = p => Math.max(0, PH(p) - 1000);

// ---------- anchors ----------
function anchor(ci, a) {
  const ch = CH[ci];
  if (typeof a === 'number') return ch.start + a;
  let off = 0; let m = String(a).match(/^(.*?)([+-]\d+(\.\d+)?)$/); if (m && m[1]) { a = m[1]; off = parseFloat(m[2]); }
  let n = 1; m = a.match(/^(.*)#(\d+)$/); if (m) { a = m[1]; n = +m[2]; }
  const want = a.toLowerCase(); let k = 0;
  for (const w of WORDS) { if (w.c !== ci) continue; if (w.w.toLowerCase().replace(/[«»"]/g, '').startsWith(want)) { k++; if (k === n) return w.s + off; } }
  ERR.push(`anchor not found c${ci} "${a}"#${n}`); return ch.start;
}
function endAnchor(ci, a) { return a === 999 ? DUR : anchor(ci, a); }

// ---------- target rects (content coords, unscrolled) ----------
function cardRect(page, name) {
  let n = 1; const m = name.match(/^(.*)#(\d+)$/); if (m) { name = m[1]; n = +m[2]; }
  const cards = (META[page] || {}).cards || []; let k = 0;
  for (const c of cards) if (c.t.toLowerCase().startsWith(name.toLowerCase())) { k++; if (k === n) return { x: c.x + MX, y: c.y, w: c.w, h: c.h }; }
  ERR.push(`card not found ${page} "${name}"`); return { x: 600, y: 300, w: 300, h: 200 };
}
function tgtRect(page, name) {
  const t = ((TG[page] || {}).tg || {})[name];
  if (!t) { ERR.push(`target not found ${page} "${name}"`); return { x: 800, y: 500, w: 100, h: 40 }; }
  return { x: t.x - t.w / 2 + MX, y: t.y - t.h / 2, w: t.w, h: t.h };
}
const union = rs => { const x0 = Math.min(...rs.map(r => r.x)), y0 = Math.min(...rs.map(r => r.y)), x1 = Math.max(...rs.map(r => r.x + r.w)), y1 = Math.max(...rs.map(r => r.y + r.h)); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
function resolve(page, tg) {
  if (Array.isArray(tg)) return union(tg.map(n => cardRect(page, n)));
  if (typeof tg === 'string') return cardRect(page, tg);
  if (tg.t) return union(tg.t.map(n => tgtRect(page, n)));
  return { ...tg };
}
function clickRect(page, tg) {
  if (typeof tg === 'string') { const t = ((TG[page] || {}).tg || {})[tg]; if (t) return tgtRect(page, tg); return cardRect(page, tg); }
  return { x: tg.x - 5, y: tg.y - 5, w: 10, h: 10, fixed: tg.fixed };
}

// ---------- build events ----------
const NAV = [], SCR = [], SPOTS = [], KF = [], OVS = [], SCENES = [], MINI = [];
NAV.push({ t: 0, page: 'landing', via: 'cut' });
SCENES.push({ t: 0, s: 'web' });
const order = [];
CH.forEach((ch, ci) => (window.SHOTS[ch.id] || []).forEach(s => order.push({ ci, s, t: anchor(ci, s[1]) })));
order.sort((a, b) => a.t - b.t);
function pageAt(t) { let p = NAV[0]; for (const n of NAV) if (n.t <= t) p = n; return p; }
function scrollAt(t) {
  const nv = pageAt(t); let v = 0, from = 0, t0 = -1, dur = 0, to = 0;
  for (const s of SCR) { if (s.t < nv.t || s.t > t || s.page !== nv.page) continue;
    // value at s.t of previous anim
    const cur = (t0 >= 0) ? L(from, to, E.io(P(s.t, t0, t0 + dur))) : v;
    from = cur; to = s.y; t0 = s.t; dur = C(0.7 + Math.abs(to - from) / 2600, .8, 2.4); v = to; }
  if (t0 < 0) return 0;
  return L(from, to, E.io(P(t, t0, t0 + dur)));
}
function ensureVisible(page, r, t) {
  if (r.fixed || page === 'auth') return;
  const s = scrollAt(t); const top = r.y - s, bot = r.y + r.h - s;
  if (top >= 85 && bot <= 930) return;
  let y = r.h > 760 ? r.y - 90 : r.y - (930 - 85 - r.h) / 2 - 85 + 85 - 40; y = r.h > 760 ? r.y - 90 : r.y - Math.max(90, (845 - r.h) / 2);
  y = C(y, 0, maxScroll(page));
  SCR.push({ t: t - 1.0, y, page, auto: true }); SCR.sort((a, b) => a.t - b.t);
}
const sideY = href => { const s = (TG.dashboard.side || []).find(o => o.href === '/panel/' + href); return s ? s.y : 400; };
for (const o of order) {
  const [kind, , a2, a3, a4] = o.s; const t = o.t; const ci = o.ci;
  if (kind === 'go') { NAV.push({ t, page: a2, via: 'cut' }); NAV.sort((a, b) => a.t - b.t); }
  else if (kind === 'nav') {
    const cur = pageAt(t - .01).page;
    if (PANEL.includes(cur)) { NAV.push({ t, page: a2, via: 'click' }); KF.push({ t, x: 110, y: sideY(a2), click: true, fixed: true }); }
    else NAV.push({ t, page: a2, via: 'cut' });
    NAV.sort((a, b) => a.t - b.t);
  }
  else if (kind === 'scroll') { const page = pageAt(t).page; SCR.push({ t, y: C(a2, 0, maxScroll(page)), page }); SCR.sort((a, b) => a.t - b.t); KF.push({ t: t - .15, x: 1000, y: 560, wheel: true, fixed: true }); }
  else if (kind === 'spot') {
    const page = pageAt(t + .01).page; const r = resolve(page, a2); const op = a4 || {};
    ensureVisible(page, r, t);
    SPOTS.push({ t0: t, t1: op.dur ? t + op.dur : null, page, r, label: a3, zoom: op.zoom || 1, color: op.color, ci });
    KF.push({ t: t + .3, page, x: r.x + Math.min(r.w * .72, r.w - 30), y: r.y + Math.min(r.h * .62, r.h - 20), fixed: !!r.fixed });
  }
  else if (kind === 'click') {
    const page = pageAt(t + .01).page; const r = clickRect(page, a2); ensureVisible(page, r, t);
    KF.push({ t, page, x: r.x + r.w / 2, y: r.y + r.h / 2, click: true, fixed: !!r.fixed || page === 'auth' });
  }
  else if (kind === 'ov') OVS.push({ name: a2, t0: t, t1: endAnchor(ci, a3) });
  else if (kind === 'scene') SCENES.push({ t, s: a2 });
  else MINI.push({ kind, t, a: a2, b: a3, c: a4 });
}
// spot end times: until next spot (same chapter) or +4.6
SPOTS.sort((a, b) => a.t0 - b.t0);
SPOTS.forEach((s, i) => { const nx = SPOTS[i + 1]; const lim = s.t0 + 4.6; let e = s.t1 || lim; if (nx && nx.t0 < e + .1) e = nx.t0 - .05; if (!s.t1 && nx && nx.ci === s.ci) e = Math.min(lim, nx.t0 - .05); e = Math.min(e, CH[s.ci].end + .3); s.t1 = e; });
SCENES.sort((a, b) => a.t - b.t);
const sceneAt = t => { let s = 'web'; for (const e of SCENES) if (e.t <= t) s = e.s; return s; };

// ---------- mini app ----------
const MLEFT = 1090, MTOP = 70, MW = 420, MF = 420 / 1080, MBODY = 810;
const TABS = ['home', 'market', 'stats', 'filters', 'trading', 'profile'];
const mb = $('miniBody');
['home', 'market', 'stats', 'filters', 'lab', 'trading', 'profile'].forEach(p => {
  const d = document.createElement('div'); d.className = 'mp'; d.id = 'mp_' + p;
  d.innerHTML = `<img class="pg" src="a3/page_${p}.png" style="top:0">` + `<img src="a3/head_${p}.png" style="top:0;z-index:2">` + (p !== 'lab' ? `<img src="a3/nav_${p}.png" style="top:${MBODY - 179 * MF}px;z-index:2">` : '');
  mb.appendChild(d);
});
['Violet', 'Cyan', 'Emerald', 'Crimson', 'Amber'].forEach(th => { const i = document.createElement('img'); i.src = `a3/theme_${th}.png`; i.className = 'thm'; i.style.cssText = 'position:absolute;left:0;top:0;width:420px;z-index:5;display:none'; i.id = 'th_' + th; mb.appendChild(i); });
const MCOS = [];
for (const m of MINI) {
  if (m.kind === 'mopen') KF.push({ t: m.t, x: 440, y: 968, click: true, fixed: true, mini: true });
  if (m.kind === 'mtab') KF.push({ t: m.t, x: MLEFT + (TABS.indexOf(m.a) + .5) * 70, y: MTOP + 40 + MBODY - 34, click: true, fixed: true, mini: true });
  if (m.kind === 'mlab') KF.push({ t: m.t, x: MLEFT + 210, y: MTOP + 40 + 128, click: true, fixed: true, mini: true });
  if (m.kind === 'mscroll') KF.push({ t: m.t - .15, x: MLEFT + 250, y: 500, wheel: true, fixed: true, mini: true });
  if (m.kind === 'mco') { const el = document.createElement('div'); el.className = 'mco'; el.innerHTML = `<img src="a3/${m.a}.png">`; $('tg').appendChild(el); MCOS.push({ ...m, el, label: m.b, color: (m.c || {}).color }); }
}
MCOS.forEach((m, i) => { const nx = MCOS[i + 1]; m.t1 = nx ? Math.min(nx.t - .05, m.t + 4.2) : m.t + 4.2; });
const mEv = k => MINI.filter(m => m.kind === k);
function miniTab(t) { let tab = 'home', t0 = -1; for (const m of MINI) { if (m.t > t) break; if (m.kind === 'mtab') { tab = m.a; t0 = m.t; } if (m.kind === 'mlab') { tab = 'lab'; t0 = m.t; } } return { tab, t0 }; }
function miniScroll(t, t0) { let v = 0, from = 0, to = 0, s0 = -1; for (const m of mEv('mscroll')) { if (m.t < t0 || m.t > t) continue; from = s0 < 0 ? 0 : L(from, to, E.io(P(m.t, s0, s0 + 1.3))); to = m.a; s0 = m.t; } return s0 < 0 ? 0 : L(from, to, E.io(P(t, s0, s0 + 1.3))); }

// ---------- cursor ----------
KF.sort((a, b) => a.t - b.t);
function kfPos(k) { // content coords at its time
  if (k.fixed) return { x: k.x, y: k.y };
  const s = scrollAt(k.t); return { x: k.x, y: k.y - s };
}
const KP = KF.map(k => ({ ...k, ...kfPos(k) }));
function cursorAt(t) {
  if (!KP.length) return { x: 1300, y: 700 };
  let i = -1; for (let j = 0; j < KP.length; j++) if (KP[j].t <= t) i = j;
  const R = rng(Math.floor(t / 7) + 3);
  const idle = (p, tt) => ({ x: p.x + Math.sin(tt * .9) * 6, y: p.y + Math.cos(tt * .7) * 5 });
  const nx = KP[i + 1];
  const cur = i < 0 ? { x: 1300, y: 760, t: 0 } : KP[i];
  if (!nx) return idle(cur, t);
  const dist = Math.hypot(nx.x - cur.x, nx.y - cur.y); const md = C(dist / 1500 + .25, .35, .95);
  const ts = Math.max(cur.t, nx.t - md);
  if (t < ts) return idle(cur, t);
  const k = E.io(P(t, ts, nx.t)); const arc = Math.sin(k * Math.PI) * Math.min(80, dist * .12);
  const nxv = { x: -(nx.y - cur.y) / (dist || 1), y: (nx.x - cur.x) / (dist || 1) };
  return { x: L(cur.x, nx.x, k) + nxv.x * arc, y: L(cur.y, nx.y, k) + nxv.y * arc };
}

// ---------- overlays ----------
const ov = $('overlay');
function mk(html, css) { const d = document.createElement('div'); d.className = 'abs'; d.style.cssText = css || ''; d.innerHTML = html; ov.appendChild(d); return d; }
const OV = {
  intro: mk(`<div class="glass" style="padding:26px 34px;display:flex;align-items:center;gap:24px"><svg width="64" height="64" viewBox="-110 -110 220 220"><path d="M0-105 C8-20 20-8 105 0 C20 8 8 20 0 105 C-8 20 -20 8 -105 0 C-20 -8 -8 -20 0 -105Z" fill="#F5B400"/><circle r="12" fill="#22D37A"/></svg>
    <div><div class="big" style="font-size:40px">Полный обзор платформы</div><div class="mono" style="font-size:20px;color:#F5B400;letter-spacing:3px;margin-top:10px">DCA SOLANA TRADE · ВЕБ-ПАНЕЛЬ + TELEGRAM MINI APP</div></div></div>`),
  tgteaser: mk(`<div class="glass" style="padding:16px 24px;display:flex;align-items:center;gap:16px;border-color:rgba(42,171,238,.6)"><div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#37BBFE,#007DBB);display:flex;align-items:center;justify-content:center"><svg width="30" height="30" viewBox="0 0 24 24"><path fill="#fff" d="M21.5 3.6 2.9 10.8c-1.3.5-1.3 1.2-.2 1.5l4.8 1.5 1.8 5.6c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.4-2.3 4.9 3.6c.9.5 1.5.2 1.8-.8l3.2-15.2c.3-1.3-.5-1.9-1.9-1.5z"/></svg></div><div><div style="font-weight:700;font-size:24px">Telegram Mini App</div><div class="mono" style="font-size:16px;color:#8fd3ff">@dca_solana_trade_bot</div></div></div>`),
  dca: mk(`<div class="glass" style="width:620px;padding:28px 30px">
    <div class="mono" style="font-size:18px;letter-spacing:3px;color:#F5B400">КАК РАБОТАЕТ DCA-ОРДЕР КИТА</div>
    <div style="display:flex;align-items:baseline;gap:14px;margin-top:16px"><div class="big" style="font-size:44px">$100 000</div><div style="font-size:20px;color:#aaa">→ 20 циклов × $5 000</div></div>
    <div id="dcaBars" style="display:flex;gap:6px;align-items:flex-end;height:120px;margin-top:20px"></div>
    <div style="display:flex;align-items:center;gap:14px;margin-top:22px;font-size:20px"><span style="padding:8px 14px;border-radius:8px;background:rgba(123,92,255,.25);border:1px solid #7B5CFF">сигнал DCA</span><span style="color:#F5B400;font-size:26px">→</span><span style="padding:8px 14px;border-radius:8px;background:rgba(245,180,0,.18);border:1px solid #F5B400">фильтры</span><span style="color:#F5B400;font-size:26px">→</span><span style="padding:8px 14px;border-radius:8px;background:rgba(34,211,122,.18);border:1px solid #22D37A">бот входит</span></div></div>`),
  delay: mk(`<div class="glass" style="padding:16px 26px;display:flex;align-items:center;gap:16px;border-color:rgba(255,59,92,.6)"><svg width="44" height="44" viewBox="-24 -24 48 48"><circle r="20" fill="none" stroke="#FF3B5C" stroke-width="4"/><line id="dlh" x1="0" y1="0" x2="0" y2="-13" stroke="#fff" stroke-width="4" stroke-linecap="round"/></svg><div style="font-weight:700;font-size:26px">FREE: данные с задержкой <span style="color:#FF3B5C">15 минут</span></div></div>`),
  fee: mk(`<div class="glass" style="width:560px;padding:26px 28px"><div style="display:flex;align-items:center;gap:22px"><div class="big" style="font-size:96px;color:#F5B400">20%</div><div style="font-size:24px;line-height:1.35;font-weight:600">комиссия только<br>с <span style="color:#22D37A">прибыльных</span> сделок</div></div>
    <img src="a3/profile_sub.png" style="width:100%;margin-top:18px;border-radius:12px;display:block"><div class="mono" style="font-size:16px;color:#aaa;margin-top:12px">Убыточные сделки комиссией не облагаются</div></div>`),
  cta: mk(`<div class="glass" style="width:980px;padding:44px 50px;text-align:center"><svg width="90" height="90" viewBox="-110 -110 220 220"><path d="M0-105 C8-20 20-8 105 0 C20 8 8 20 0 105 C-8 20 -20 8 -105 0 C-20 -8 -8 -20 0 -105Z" fill="#F5B400"/><circle r="12" fill="#22D37A"/></svg>
    <div style="font-weight:700;font-size:58px;margin-top:10px">DCA SOLANA <span style="color:#F5B400">TRADE</span></div>
    <div style="display:flex;justify-content:center;gap:22px;margin-top:28px"><div class="mono" style="padding:16px 26px;border-radius:40px;border:2px solid #F5B400;font-size:26px">🌐&nbsp;jupiter-dca-bot.online</div><div class="mono" style="padding:16px 26px;border-radius:40px;border:2px solid #2AABEE;font-size:26px">@dca_solana_trade_bot</div></div>
    <div class="big" style="font-size:40px;margin-top:30px;color:#F5B400">Начните бесплатно</div><div class="mono" style="font-size:20px;color:#aaa;margin-top:12px;letter-spacing:3px">ССЫЛКИ — В ОПИСАНИИ</div></div>`),
  disc: mk(`<div class="glass" style="padding:16px 28px;display:flex;align-items:center;gap:16px;border-color:rgba(255,59,92,.55)"><svg width="34" height="34" viewBox="0 0 24 24"><path d="M12 2 1 21h22L12 2z" fill="none" stroke="#FF3B5C" stroke-width="2"/><path d="M12 9v5" stroke="#FF3B5C" stroke-width="2.2"/><circle cx="12" cy="17.3" r="1.3" fill="#FF3B5C"/></svg><div style="font-size:22px">Криптовалюта — высокий риск. Прошлые результаты не гарантируют будущих. Не финансовый совет.</div></div>`),
};
// replace emoji globe with svg
OV.cta.innerHTML = OV.cta.innerHTML.replace('🌐&nbsp;', '<svg width="26" height="26" viewBox="0 0 24 24" style="vertical-align:-5px;margin-right:10px"><circle cx="12" cy="12" r="10" fill="none" stroke="#F5B400" stroke-width="2"/><path d="M2 12h20M12 2c3 3 4 6.5 4 10s-1 7-4 10c-3-3-4-6.5-4-10s1-7 4-10z" fill="none" stroke="#F5B400" stroke-width="2"/></svg>');
$('dcaBars').innerHTML = [...Array(20)].map((_, i) => `<div class="db" style="flex:1;border-radius:4px 4px 0 0;background:linear-gradient(#FFD34D,#F5B400);height:0"></div>`).join('');
const OVPOS = { intro: [80, 790], tgteaser: [1450, 40], dca: [1220, 150], delay: [700, 40], fee: [1260, 120], cta: [470, 250], disc: [300, 860] };
function place(el, x, y, s, o) { el.style.transform = `translate(${x}px,${y}px) scale(${s})`; el.style.opacity = o; el.style.display = o <= .001 ? 'none' : ''; }

const OPEN = mk(`<div style="width:1920px;text-align:center"><svg width="170" height="170" viewBox="-110 -110 220 220"><path d="M0-105 C8-20 20-8 105 0 C20 8 8 20 0 105 C-8 20 -20 8 -105 0 C-20 -8 -8 -20 0 -105Z" fill="#F5B400"/><circle r="12" fill="#22D37A"/></svg>
  <div style="font-weight:700;font-size:96px;letter-spacing:-2px;margin-top:10px">DCA SOLANA <span style="color:#F5B400">TRADE</span></div>
  <div class="mono" style="font-size:28px;letter-spacing:10px;color:#cfcfd8;margin-top:18px">ПОЛНЫЙ ОБЗОР ПЛАТФОРМЫ</div>
  <div class="mono" style="font-size:20px;letter-spacing:6px;color:#F5B400;margin-top:14px">ВЕБ-ПАНЕЛЬ · TELEGRAM MINI APP · ТАРИФЫ</div></div>`);
// ---------- chapter rail & cards ----------
$('chapRail').innerHTML = window.SHORT.map((s, i) => `<div class="cr" id="cr${i}"><i></i><span>${String(i + 1).padStart(2, '0')} ${s}</span></div>`).join('');
const cc = $('chapCard');
cc.innerHTML = `<div class="abs" id="ccNum" style="font-family:Unbounded;font-weight:900;font-size:300px;color:transparent;-webkit-text-stroke:3px rgba(245,180,0,.85);line-height:1"></div>
 <div class="abs mono" id="ccSub" style="font-size:24px;letter-spacing:8px;color:#F5B400"></div>
 <div class="abs big" id="ccTitle" style="font-size:86px"></div>
 <div class="abs" id="ccLine" style="height:5px;background:linear-gradient(90deg,#F5B400,#7B5CFF);border-radius:3px"></div>`;

// ---------- background ----------
const bg = $('bg').getContext('2d'); const R = rng(5);
const DOTS = [...Array(90)].map(() => ({ x: R() * 1920, y: R() * 1080, r: .6 + R() * 1.8, s: .2 + R() * .6, p: R() * 6 }));
function drawBG(t) {
  bg.fillStyle = '#07070a'; bg.fillRect(0, 0, 1920, 1080);
  const blob = (x, y, r, c, a) => { const g = bg.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(${c},${a})`); g.addColorStop(1, `rgba(${c},0)`); bg.fillStyle = g; bg.fillRect(x - r, y - r, 2 * r, 2 * r); };
  blob(300 + 200 * Math.sin(t * .11), 250 + 120 * Math.cos(t * .09), 900, '245,180,0', .13);
  blob(1650 + 150 * Math.cos(t * .1), 820 + 120 * Math.sin(t * .12), 950, '123,92,255', .16);
  blob(960 + 300 * Math.sin(t * .07), 1100, 700, '34,211,122', .05);
  // perspective grid floor
  bg.save(); bg.strokeStyle = 'rgba(245,180,0,.10)'; bg.lineWidth = 1;
  const hz = 760; for (let i = -24; i <= 24; i++) { bg.beginPath(); bg.moveTo(960 + i * 30, hz); bg.lineTo(960 + i * 220, 1100); bg.stroke(); }
  const sp = (t * .25) % 1; for (let k = 0; k < 12; k++) { const z = (k + sp) / 12; const y = hz + Math.pow(z, 2.3) * 340; bg.globalAlpha = z; bg.beginPath(); bg.moveTo(0, y); bg.lineTo(1920, y); bg.stroke(); }
  bg.restore();
  const f = bg.createLinearGradient(0, hz - 20, 0, hz + 160); f.addColorStop(0, 'rgba(7,7,10,1)'); f.addColorStop(1, 'rgba(7,7,10,0)'); bg.fillStyle = f; bg.fillRect(0, hz - 20, 1920, 180);
  // light beams
  bg.save(); bg.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 3; i++) { const x = ((t * 22 + i * 700) % 2600) - 400; const g = bg.createLinearGradient(x, 0, x + 260, 0); g.addColorStop(0, 'rgba(255,220,140,0)'); g.addColorStop(.5, 'rgba(255,220,140,.035)'); g.addColorStop(1, 'rgba(255,220,140,0)'); bg.fillStyle = g; bg.beginPath(); bg.moveTo(x, 0); bg.lineTo(x + 260, 0); bg.lineTo(x + 60, 1080); bg.lineTo(x - 200, 1080); bg.fill(); }
  bg.restore();
  for (const d of DOTS) { const y = ((d.y - t * 12 * d.s) % 1080 + 1080) % 1080; bg.fillStyle = `rgba(255,220,150,${.18 + .15 * Math.sin(t + d.p)})`; bg.beginPath(); bg.arc(d.x, y, d.r, 0, 7); bg.fill(); }
}
const gr = $('grain').getContext('2d'), GI = [];
for (let k = 0; k < 4; k++) { const r = rng(90 + k), d = gr.createImageData(700, 420); for (let i = 0; i < d.data.length; i += 4) { const v = r() * 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } GI.push(d); }

// ---------- captions ----------
const groups = []; { let g = []; let len = 0; let lastC = -1;
  for (const w of WORDS) { if (g.length && (w.c !== lastC)) { groups.push(g); g = []; len = 0; }
    g.push(w); len += w.w.length + 1; lastC = w.c;
    if ((/[.!?]/.test(w.p) && len > 22) || (/[,:;—]/.test(w.p) && len > 44) || len > 62) { groups.push(g); g = []; len = 0; } }
  if (g.length) groups.push(g); }
groups.forEach((g, i) => { g.start = g[0].s - .05; g.end = i < groups.length - 1 ? Math.min(groups[i + 1][0].s - .05, g[g.length - 1].e + .9) : g[g.length - 1].e + 1.5; });
const capsIn = $('capsIn'); let lastG = null;
function drawCaps(t) {
  const g = groups.find(g => t >= g.start && t < g.end);
  if (!g || inCard(t)) { $('caps').style.opacity = 0; return; }
  if (g !== lastG) { capsIn.innerHTML = g.map(w => `<span>${w.w}${w.p}</span>`).join(' '); lastG = g; }
  $('caps').style.opacity = C(P(t, g.start, g.start + .15) * (1 - P(t, g.end - .12, g.end)));
  [...capsIn.children].forEach((sp, i) => { const w = g[i]; const act = t >= w.s - .02 && (i === g.length - 1 || t < g[i + 1].s); sp.className = act ? 'on' : (t < w.s ? 'off' : ''); });
}
function inCard(t) { return CH.some(c => c.card !== null && t >= c.card && t < c.start - .05); }

// ---------- render ----------
let curPage = null;
function renderAt(t) {
  drawBG(t);
  const scene = sceneAt(t);
  // camera & window intro
  const winIn = E.o5(P(t, 3.0, 4.0));
  let Z = 1, Fx = 960, Fy = 540, Cx = 960, Cy = 540;
  // chapter card state
  let cardK = 0, cardCh = null;
  for (const c of CH) if (c.card !== null && t >= c.card - .4 && t < c.start + .35) { cardCh = c; cardK = Math.min(E.io(P(t, c.card - .4, c.card + .2)), 1 - E.io(P(t, c.start - .25, c.start + .35))); }
  // page
  const nv = pageAt(t); const page = nv.page;
  if (scene === 'web') {
    $('tg').style.display = 'none';
    PANEL.concat(['landing', 'auth']).forEach(p => { const el = $('pp_' + p); el.style.display = (p === page || (p === pageAt(nv.t - .01).page && t < nv.t + .35)) ? 'block' : 'none'; });
    const prev = pageAt(nv.t - .01).page; const k = E.o3(P(t, nv.t, nv.t + .35));
    const el = $('pp_' + page); el.style.opacity = prev === page ? 1 : k; el.style.zIndex = 2; el.style.transform = `translateY(${(1 - k) * 14}px)`;
    if (prev !== page) { const pe = $('pp_' + prev); pe.style.zIndex = 1; pe.style.opacity = 1; pe.style.transform = ''; }
    const s = scrollAt(t); el.querySelector('img.main') && (el.querySelector('img.main').style.transform = `translateY(${-s}px)`);
    if (prev !== page && t < nv.t + .35) { const pe = $('pp_' + prev); const ss = scrollAt(nv.t - .01); pe.querySelector('img.main') && (pe.querySelector('img.main').style.transform = `translateY(${-ss}px)`); }
    $('urlT').textContent = URLS[page]; $('tabT').textContent = 'DCA SOLANA TRADE';
    const lb = P(t, nv.t, nv.t + .55); $('loadbar').style.width = (lb > 0 && lb < 1 ? L(10, 100, E.o3(lb)) : 0) + '%'; $('loadbar').style.opacity = lb < 1 ? 1 : 0;
  } else {
    PANEL.concat(['landing', 'auth']).forEach(p => $('pp_' + p).style.display = 'none');
    $('tg').style.display = 'block'; $('urlT').textContent = 'Telegram Desktop'; $('tabT').textContent = 'Telegram'; $('loadbar').style.opacity = 0;
    renderMini(t);
  }
  // spotlight
  if (scene === 'web') {
  let sp = null; for (const s of SPOTS) if (t >= s.t0 && t < s.t1 + .35 && s.page === page && scene === 'web') sp = s;
  const spotEl = $('spot'), lbl = $('spotLbl');
  if (sp) {
    const o = Math.min(E.o3(P(t, sp.t0, sp.t0 + .35)), 1 - P(t, sp.t1, sp.t1 + .35));
    const s = sp.r.fixed ? 0 : scrollAt(t); const pad = 8; const r = { x: sp.r.x - pad, y: sp.r.y - s - pad, w: sp.r.w + pad * 2, h: sp.r.h + pad * 2 };
    const col = sp.color === 'r' ? '#FF3B5C' : '#F5B400';
    spotEl.style.display = ''; spotEl.style.left = r.x + 'px'; spotEl.style.top = r.y + 'px'; spotEl.style.width = r.w + 'px'; spotEl.style.height = r.h + 'px';
    spotEl.style.borderColor = col; spotEl.style.boxShadow = `0 0 0 4000px rgba(4,4,8,${.55 * o}),0 0 40px ${col}88`; spotEl.style.opacity = o;
    lbl.style.display = ''; lbl.textContent = sp.label; lbl.style.background = col; lbl.style.color = sp.color === 'r' ? '#fff' : '#111';
    const ly = r.y > 70 ? r.y - 46 : r.y + r.h + 10; lbl.style.left = Math.min(r.x, 1600 - 20 - lbl.offsetWidth) + 'px'; lbl.style.top = ly + 'px';
    lbl.style.opacity = o; lbl.style.transform = `translateY(${(1 - o) * 10}px)`;
    if (sp.zoom > 1) { const e = Math.min(E.io(P(t, sp.t0, sp.t0 + .7)), 1 - E.io(P(t, sp.t1 - .2, sp.t1 + .45))); Z = 1 + (sp.zoom - 1) * e;
      Fx = WX + KSCR * (r.x + r.w / 2); Fy = WY + KSCR * (r.y + r.h / 2); Cx = L(Fx, 960, .75 * e); Cy = L(Fy, 520, .75 * e); }
  } else { spotEl.style.display = 'none'; lbl.style.display = 'none'; }
  }
  // cursor
  const cp = cursorAt(t); const cur = $('cursor'); cur.style.left = cp.x + 'px'; cur.style.top = cp.y + 'px';
  let rip = null; for (const k of KP) if (k.click && t >= k.t && t < k.t + .5) rip = k;
  const press = rip && t < rip.t + .12 ? .82 : 1; cur.style.transform = `scale(${press})`;
  const re = $('ripple'); if (rip) { const k = (t - rip.t) / .5; re.style.display = ''; re.style.left = (rip.x - 30) + 'px'; re.style.top = (rip.y - 30) + 'px'; re.style.transform = `scale(${L(.3, 1.6, E.o3(k))})`; re.style.opacity = 1 - k; } else re.style.display = 'none';
  // wheel indicator during scroll animations
  let wh = null; for (const s of SCR) if (t >= s.t - .1 && t < s.t + 1.6 && s.page === page && scene === 'web') wh = s;
  const we = $('wheel'); if (wh) { we.style.display = ''; we.style.left = (cp.x + 30) + 'px'; we.style.top = (cp.y + 24) + 'px'; we.querySelector('b').style.top = (6 + ((t * 30) % 18)) + 'px'; we.style.opacity = 1 - P(t, wh.t + 1.2, wh.t + 1.6); } else we.style.display = 'none';
  // camera
  let camS = Z * L(.86, 1, winIn) * (1 - cardK * .1);
  const camT = `translate(${Cx - Z * Fx}px,${Cy - Z * Fy}px) scale(${Z})`;
  const intro = `translate(960px,540px) scale(${L(.86, 1, winIn) * (1 - cardK * .1)}) rotateX(${(1 - winIn) * 18}deg) translate(-960px,-540px)`;
  $('cam').style.transform = intro + ' ' + camT;
  $('cam').style.opacity = winIn * (1 - cardK * .85);
  $('cam').style.filter = cardK > .01 ? `blur(${cardK * 10}px)` : '';
  // chapter rail
  let ci = 0; CH.forEach((c, i) => { if (t >= (c.card ?? c.start) - .1) ci = i; });
  CH.forEach((c, i) => { const el = $('cr' + i); el.style.color = i === ci ? '#F5B400' : (i < ci ? '#8a8a96' : '#4a4a55'); el.querySelector('i').style.background = i === ci ? '#F5B400' : (i < ci ? '#8a8a96' : '#2a2a33'); el.querySelector('i').style.boxShadow = i === ci ? '0 0 12px #F5B400' : 'none'; });
  $('chapRail').style.opacity = winIn;
  // chapter card
  if (cardCh && cardK > 0.001) { cc.style.display = 'block'; const n = CH.indexOf(cardCh);
    $('ccNum').textContent = String(n + 1).padStart(2, '0'); $('ccTitle').textContent = cardCh.title; $('ccSub').textContent = `ГЛАВА ${n + 1} / ${CH.length}`;
    const a = cardCh.card; const kN = E.o5(P(t, a - .2, a + .6)), kT = E.o5(P(t, a, a + .7)), kL = E.io(P(t, a + .1, a + 1.0));
    $('ccNum').style.transform = `translate(${L(260, 200, kN)}px,300px)`; $('ccNum').style.opacity = kN * cardK;
    $('ccSub').style.transform = `translate(${L(820, 780, kT)}px,420px)`; $('ccSub').style.opacity = kT * cardK;
    $('ccTitle').style.transform = `translate(${L(820, 780, kT)}px,470px)`; $('ccTitle').style.opacity = kT * cardK;
    $('ccLine').style.transform = `translate(780px,600px)`; $('ccLine').style.width = (kL * 760) + 'px'; $('ccLine').style.opacity = cardK;
  } else cc.style.display = 'none';
  // overlays
  for (const [name, el] of Object.entries(OV)) {
    const o = OVS.filter(v => v.name === name && t >= v.t0 - .05 && t < v.t1 + .4).pop();
    if (!o) { el.style.display = 'none'; continue; }
    const k = Math.min(E.back(P(t, o.t0, o.t0 + .5)), 1); const out = P(t, o.t1, o.t1 + .4);
    const [x, y] = OVPOS[name]; place(el, x, y + (1 - k) * 30 + out * 20, L(.9, 1, k), C(P(t, o.t0, o.t0 + .25) * (1 - out)));
    if (name === 'dca') { [...el.querySelectorAll('.db')].forEach((b, i) => { const kk = E.o3(P(t, o.t0 + .6 + i * .18, o.t0 + .9 + i * .18)); b.style.height = (kk * (40 + (i % 5) * 12 + i * 2.5)) + 'px'; b.style.opacity = .4 + .6 * kk; }); }
    if (name === 'delay') el.querySelector('#dlh').setAttribute('transform', `rotate(${t * 240})`);
  }
  // opening title (before window)
  { const k = E.o5(P(t, .2, 1.2)), out = E.io(P(t, 2.8, 3.6)); place(OPEN, 0, 300 - out * 120, L(.9, 1, k) * L(1, .8, out), C(P(t, .1, .6) * (1 - out)));
    const sv = OPEN.querySelector('svg'); sv.style.transform = `rotate(${t * 40}deg) scale(${E.back(P(t, .1, .9))})`; }
  drawCaps(t);
  $('prog').style.width = (t / DUR * 100) + '%';
  gr.putImageData(GI[Math.floor(t * 30) % 4], 0, 0); $('grain').style.transform = `translate(${(Math.floor(t * 30) * 37) % 60}px,${(Math.floor(t * 30) * 53) % 60}px) scale(3)`;
  let fl = 0; for (const c of CH) if (c.card !== null) { const d = t - (c.start - .05); if (d > -.02 && d < .25) fl = Math.max(fl, .25 * Math.exp(-Math.max(0, d) * 12)); }
  $('flash').style.opacity = fl;
  document.body.style.opacity = Math.min(P(t, 0, .6), 1 - P(t, DUR - .8, DUR));
}
function renderMini(t) {
  $('spot').style.display = 'none'; $('spotLbl').style.display = 'none';
  const open = mEv('mopen')[0]; const mini = $('mini');
  $('b1').style.opacity = P(t, CH[12].start + .6, CH[12].start + .9); $('b2').style.opacity = P(t, CH[12].start + 1.1, CH[12].start + 1.4);
  $('openBtn').style.boxShadow = open && t > open.t - 1.2 && t < open.t + .3 ? `0 0 ${18 + 14 * Math.sin(t * 10)}px rgba(42,171,238,.9)` : 'none';
  if (!open || t < open.t + .15) { mini.style.display = 'none'; MCOS.forEach(m => m.el.style.display = 'none'); return; }
  const k = E.back(P(t, open.t + .15, open.t + .65));
  mini.style.display = 'block'; mini.style.left = MLEFT + 'px'; mini.style.top = MTOP + 'px'; mini.style.transform = `scale(${L(.85, 1, k)})`; mini.style.opacity = P(t, open.t + .15, open.t + .35); mini.style.transformOrigin = '50% 100%';
  const { tab, t0 } = miniTab(t);
  ['home', 'market', 'stats', 'filters', 'lab', 'trading', 'profile'].forEach(p => { const d = $('mp_' + p); const on = p === tab; d.style.display = on ? 'block' : 'none'; if (on) { const kk = t0 < 0 ? 1 : E.o3(P(t, t0, t0 + .3)); d.style.opacity = kk; d.style.transform = `translateX(${(1 - kk) * 30}px)`; d.querySelector('img.pg').style.transform = `translateY(${-miniScroll(t, t0 < 0 ? 0 : t0)}px)`; } });
  const th = mEv('mtheme')[0]; const TH = ['Violet', 'Cyan', 'Emerald', 'Crimson', 'Amber']; const ti = th && t >= th.t ? Math.floor((t - th.t) / .45) : -1;
  TH.forEach((n, i) => $('th_' + n).style.display = (ti === i && tab === 'profile') ? '' : 'none');
  // callouts
  MCOS.forEach(m => { const on = t >= m.t && t < m.t1 + .3; m.el.style.display = on ? 'block' : 'none'; if (!on) return;
    const kk = Math.min(E.back(P(t, m.t, m.t + .45)), 1); const o = C(P(t, m.t, m.t + .2) * (1 - P(t, m.t1, m.t1 + .3)));
    const img = m.el.querySelector('img'); const ar = img.naturalHeight / img.naturalWidth || .5; let w = 600; if (w * ar > 640) w = 640 / ar;
    m.el.style.width = w + 'px'; m.el.style.left = (720 - w / 2) + 'px'; m.el.style.top = (500 - w * ar / 2) + 'px';
    m.el.style.transform = `translateX(${(1 - kk) * 120}px) scale(${L(.85, 1, kk)})`; m.el.style.opacity = o;
    m.el.style.boxShadow = m.color === 'r' ? '0 0 0 3px #FF3B5C,0 0 60px rgba(255,59,92,.45),0 30px 80px rgba(0,0,0,.7)' : '';
    $('spotLbl').style.display = ''; $('spotLbl').textContent = m.label; $('spotLbl').style.left = (720 - w / 2) + 'px'; $('spotLbl').style.top = (500 - w * ar / 2 - 52) + 'px'; $('spotLbl').style.opacity = o;
    $('spotLbl').style.background = m.color === 'r' ? '#FF3B5C' : '#F5B400'; $('spotLbl').style.color = m.color === 'r' ? '#fff' : '#111'; });
  // nav spot
  const ns = mEv('mspot')[0];
  if (ns && t >= ns.t && t < ns.t + 3) { const o = Math.min(P(t, ns.t, ns.t + .3), 1 - P(t, ns.t + 2.6, ns.t + 3)); const s = $('spot'); s.style.display = ''; s.style.left = (MLEFT - 6) + 'px'; s.style.top = (MTOP + 40 + MBODY - 179 * MF - 6) + 'px'; s.style.width = (MW + 12) + 'px'; s.style.height = (179 * MF + 12) + 'px'; s.style.opacity = o; s.style.borderColor = '#F5B400'; s.style.boxShadow = `0 0 0 4000px rgba(4,4,8,${.5 * o}),0 0 40px #F5B40088`;
    const l = $('spotLbl'); l.style.display = ''; l.textContent = ns.b; l.style.left = (MLEFT) + 'px'; l.style.top = (MTOP + 40 + MBODY - 179 * MF - 56) + 'px'; l.style.opacity = o; l.style.background = '#F5B400'; l.style.color = '#111'; }
}
window.renderAt = renderAt; window.DUR = DUR;
window.DEBUG = { NAV, SCR, SPOTS, KF, OVS, MINI };
Promise.all([document.fonts.ready, ...[...document.images].map(i => i.complete ? 1 : new Promise(r => { i.onload = i.onerror = r; }))]).then(() => { window.READY = true; });
})();
