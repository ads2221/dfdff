import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const st = JSON.parse(fs.readFileSync('state.json'));
const token = st.origins[0].localStorage.find(i => i.name === 'token').value;
const b = await chromium.launch();
const DPR = 2.7;
const ctx = await b.newContext({ viewport: { width: 400, height: 760 }, deviceScaleFactor: DPR, storageState: 'state.json',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Telegram-iOS' });
const DICT = JSON.parse(fs.readFileSync('v2/tma_en_dict.json'));
await ctx.addInitScript((DICT) => { try { localStorage.setItem('ui_theme','emerald'); } catch(e){}
  const tr = () => { const w = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT); let n; const todo = [];
    while (n = w.nextNode()) { const raw = n.textContent; const t = raw.trim(); if (!t || !/[а-яё]/i.test(t)) continue; const en = DICT[t]; if (en) todo.push([n, raw.replace(t, en), t]); }
    for (const [n, v, ru] of todo) { if (n.parentElement && !n.parentElement.dataset.ru) n.parentElement.dataset.ru = ru; n.textContent = v; }
    document.querySelectorAll('[placeholder]').forEach(e => { const en = DICT[e.placeholder]; if (en) e.placeholder = en; }); };
  setInterval(() => { try { tr(); } catch (e) {} }, 100);
  const noop = () => {};
  window.Telegram = { WebApp: { initData: 'query_id=demo', initDataUnsafe: { user: { first_name: 'Demo' } }, ready: noop, expand: noop, setHeaderColor: noop, setBackgroundColor: noop,
    onEvent: noop, offEvent: noop, HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
    MainButton: { show: noop, hide: noop, setText: noop, onClick: noop, offClick: noop }, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop },
    themeParams: {}, colorScheme: 'dark', platform: 'ios', version: '7.0', viewportHeight: 760, isExpanded: true, openLink: noop, openTelegramLink: noop, close: noop, showAlert: noop, showConfirm: noop } };
}, DICT);
await ctx.route('**/telegram-web-app.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await ctx.route('**/api/tg/miniauth', async r => {
  const me = await (await fetch('https://jupiter-dca-bot.online/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })).json().catch(() => null);
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token, user: me?.user ?? me }) });
});
const p = await ctx.newPage();
await p.goto('https://jupiter-dca-bot.online/panel/tg', { waitUntil: 'commit', timeout: 90000 }).catch(()=>{});
await p.waitForTimeout(8000);
fs.mkdirSync('tma_en', { recursive: true });

const EN = { 'Главная': 'Home', 'Рынок': 'Market', 'Статистика': 'Stats', 'Фильтры': 'Filters', 'Торговля': 'Trading', 'Профиль': 'Profile' };
const tab = async name => { await p.keyboard.press('Escape').catch(()=>{}); await p.locator('button').filter({ hasText: new RegExp('^(' + name + '|' + EN[name] + ')$') }).last().click(); await p.waitForTimeout(4500); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400); await left(name); };
const LEFT = new Set();
async function left(where) { (await p.evaluate(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); const o = []; let n; while (n = w.nextNode()) { const t = n.textContent.trim(); if (t && /[а-яё]/i.test(t) && !/^[.\/]/.test(t) && t.length < 400) o.push(t); } return o; })).forEach(t => LEAVE(where, t)); }
const LEAVE = (w, t) => { if (!LEFT.has(t)) { LEFT.add(t); } };
async function card(name, text, extraUp = 0) {
  const h = await p.evaluateHandle(([text, extraUp]) => {
    const T = text.toLowerCase();
    const all = [...document.querySelectorAll('[data-ru]')];
    let el = all.find(e => e.dataset.ru.toLowerCase().startsWith(T)) || all.find(e => e.dataset.ru.toLowerCase().includes(T));
    if (!el) { const tx = [...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())); el = tx.find(e => e.textContent.trim().toLowerCase().startsWith(T)); }
    if (!el) return null;
    const ok = e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 300 && (parseFloat(cs.borderTopWidth) > 0 || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')) && cs.position !== 'fixed'; };
    let e = el; while (e && e !== document.body && !ok(e)) e = e.parentElement;
    for (let i = 0; i < extraUp && e && e.parentElement !== document.body; i++) e = e.parentElement;
    return e;
  }, [text, extraUp]);
  const el = h.asElement(); if (!el) { console.log('MISS', name); return; }
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelectorAll('body *').forEach(e => { const s = getComputedStyle(e).position; if (s === 'fixed' || s === 'sticky') { e.dataset.h = 1; e.style.visibility = 'hidden'; } }));
  await el.screenshot({ path: `tma_en/${name}.png` }).catch(e => console.log('ERR', name, e.message.slice(0, 80)));
  await p.evaluate(() => document.querySelectorAll('[data-h]').forEach(e => { e.style.visibility = ''; }));
  const bb = await el.boundingBox(); console.log(name, Math.round(bb.width), Math.round(bb.height));
}
async function full(name) {
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
  await p.screenshot({ path: `tma_en/${name}_view.png` });
  await p.evaluate(() => document.querySelectorAll('body *').forEach(e => { const s = getComputedStyle(e).position; if (s === 'fixed' || s === 'sticky') { e.dataset.h = 1; e.style.visibility = 'hidden'; } }));
  await p.screenshot({ path: `tma_en/${name}_page.png`, fullPage: true });
  await p.evaluate(() => document.querySelectorAll('[data-h]').forEach(e => { e.style.visibility = ''; }));
}
await tab('Главная'); await full('home');
await card('home_balance', 'Баланс кошелька'); await card('home_warn', 'Бот не откроет ордер'); await card('home_wallet', 'Состав кошелька'); await card('home_deposit', 'Пополнить кошелёк');
await tab('Рынок'); await full('market'); await card('market_buy', 'Купить по контракту'); await card('market_signals', 'Сигналы DCA V3');
await tab('Статистика'); await full('stats'); await card('stats_result', 'Результат торговли'); await card('stats_flow', 'Поток V3 за 30 дней');
await tab('Фильтры'); await full('filters'); await card('filters_market', 'Рынок токена');
for (const acc of ['Защитные фильтры', 'Закрытие позиций', 'Настройка DCA торговли', 'Чёрный список']) { await p.locator('[data-ru="' + acc + '"]').first().click().catch(() => console.log('noacc', acc)); await p.waitForTimeout(1200); }
await left('filters-open');
await p.locator('[data-ru="Проверить фильтры на истории"]').first().click().catch(() => console.log('nolab')); await p.waitForTimeout(6000);
await left('lab'); await full('lab');
fs.writeFileSync('tma_en/left1.json', JSON.stringify([...LEFT], null, 1)); console.log('LEFT', LEFT.size);
await b.close();
