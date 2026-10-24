import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const st = JSON.parse(fs.readFileSync('state.json'));
const token = st.origins[0].localStorage.find(i => i.name === 'token').value;
const b = await chromium.launch();
const DPR = 2.7;
const ctx = await b.newContext({ viewport: { width: 400, height: 760 }, deviceScaleFactor: DPR, storageState: 'state.json',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Telegram-iOS' });
await ctx.addInitScript(() => {
  const noop = () => {};
  window.Telegram = { WebApp: { initData: 'query_id=demo', initDataUnsafe: { user: { first_name: 'Demo' } }, ready: noop, expand: noop, setHeaderColor: noop, setBackgroundColor: noop,
    onEvent: noop, offEvent: noop, HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
    MainButton: { show: noop, hide: noop, setText: noop, onClick: noop, offClick: noop }, BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop },
    themeParams: {}, colorScheme: 'dark', platform: 'ios', version: '7.0', viewportHeight: 760, isExpanded: true, openLink: noop, openTelegramLink: noop, close: noop, showAlert: noop, showConfirm: noop } };
});
await ctx.route('**/telegram-web-app.js', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
await ctx.route('**/api/tg/miniauth', async r => {
  const me = await (await fetch('https://jupiter-dca-bot.online/api/auth/me', { headers: { Authorization: 'Bearer ' + token } })).json().catch(() => null);
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token, user: me?.user ?? me }) });
});
const p = await ctx.newPage();
await p.goto('https://jupiter-dca-bot.online/panel/tg', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(8000);
fs.mkdirSync('tma2', { recursive: true });
const tab = async name => { await p.keyboard.press('Escape').catch(()=>{}); await p.locator('button').filter({ hasText: new RegExp('^' + name + '$') }).last().click(); await p.waitForTimeout(4500); await p.evaluate(() => window.scrollTo(0, 0)); };
// crop a card that contains text: climb to nearest bordered/bg box wider than 300
async function card(name, text, extraUp = 0) {
  const h = await p.evaluateHandle(([text, extraUp]) => {
    const all = [...document.querySelectorAll('body *')].filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
    const T=text.toLowerCase(); let el = all.find(e => e.textContent.trim().toLowerCase().startsWith(T)) || all.find(e => e.textContent.toLowerCase().includes(T));
    if (!el) return null;
    const ok = e => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.width > 300 && (parseFloat(cs.borderTopWidth) > 0 || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent')) && cs.position !== 'fixed'; };
    let e = el; while (e && e !== document.body && !ok(e)) e = e.parentElement;
    for (let i = 0; i < extraUp && e && e.parentElement !== document.body; i++) e = e.parentElement;
    return e;
  }, [text, extraUp]);
  const el = h.asElement(); if (!el) { console.log('MISS', name); return; }
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
  await p.evaluate(() => document.querySelectorAll('body *').forEach(e => { const s = getComputedStyle(e).position; if (s === 'fixed' || s === 'sticky') { e.dataset.h = 1; e.style.visibility = 'hidden'; } }));
  await el.screenshot({ path: `tma2/${name}.png` }).catch(e => console.log('ERR', name, e.message.slice(0, 80)));
  await p.evaluate(() => document.querySelectorAll('[data-h]').forEach(e => { e.style.visibility = ''; }));
  const bb = await el.boundingBox(); console.log(name, Math.round(bb.width), Math.round(bb.height));
}
async function full(name) {
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(300);
  await p.screenshot({ path: `tma2/${name}_view.png` });
  await p.evaluate(() => document.querySelectorAll('body *').forEach(e => { const s = getComputedStyle(e).position; if (s === 'fixed' || s === 'sticky') { e.dataset.h = 1; e.style.visibility = 'hidden'; } }));
  await p.screenshot({ path: `tma2/${name}_page.png`, fullPage: true });
  await p.evaluate(() => document.querySelectorAll('[data-h]').forEach(e => { e.style.visibility = ''; }));
}
// HOME
await tab('Главная'); await full('home');
await card('home_balance', 'БАЛАНС КОШЕЛЬКА'); await card('home_warn', 'Бот не откроет ордер'); await card('home_wallet', 'СОСТАВ КОШЕЛЬКА'); await card('home_deposit', 'ПОПОЛНИТЬ КОШЕЛЁК');
// MARKET
await tab('Рынок'); await full('market'); await card('market_buy', 'КУПИТЬ ПО КОНТРАКТУ'); await card('market_signals', 'СИГНАЛЫ DCA V3', 0);
// STATS
await tab('Статистика'); await full('stats'); await card('stats_result', 'РЕЗУЛЬТАТ ТОРГОВЛИ'); await card('stats_flow', 'ПОТОК V3 ЗА 30 ДНЕЙ'); await card('stats_mon', 'МОНИТОРИНГ DCA V3');
// FILTERS
await tab('Фильтры'); await full('filters'); await card('filters_market', 'Рынок токена');
for (const acc of ['Защитные фильтры', 'Закрытие позиций', 'Настройка DCA торговли', 'Чёрный список']) {
  await p.getByText(acc, { exact: true }).first().click().catch(() => console.log('noacc', acc)); await p.waitForTimeout(1200);
  await card('filters_' + acc.split(' ')[0].toLowerCase(), acc);
}
await full('filters_open');
await p.getByText('Проверить фильтры на истории').click().catch(() => console.log('nolab')); await p.waitForTimeout(6000);
await full('lab'); fs.writeFileSync('tma2/lab.txt', await p.evaluate(() => document.body.innerText));
await p.reload({ waitUntil: 'domcontentloaded' }); await p.waitForTimeout(8000);
// TRADING
await tab('Торговля'); await full('trading'); await card('trading_bot', 'Бот торгует'); await card('trading_exit', 'ВЫХОД ИЗ ПОЗИЦИИ'); await card('trading_buy', 'ПОКУПКА');
await p.getByText('Исполнение (Jupiter)').click().catch(() => {}); await p.waitForTimeout(1200); await card('trading_jup', 'Исполнение (Jupiter)');
// PROFILE
await tab('Профиль'); await full('profile'); await card('profile_head', 'Бесплатный тариф'); await card('profile_sub', 'ПОДПИСКА И КОМИССИЯ'); await card('profile_theme', 'ТЕМА ОФОРМЛЕНИЯ');
// themes: switch & capture home in several colours
for (const th of ['Violet', 'Cyan', 'Emerald', 'Crimson', 'Amber']) {
  await tab('Профиль'); await p.getByText(th, { exact: true }).click(); await p.waitForTimeout(800);
  await tab('Главная'); await p.screenshot({ path: `tma2/theme_${th}.png` });
}
// bell / notifications
await p.locator('header button, button').filter({ has: p.locator('svg') }).nth(1).click().catch(() => {}); await p.waitForTimeout(2000);
await p.screenshot({ path: 'tma2/bell.png' });
await p.keyboard.press('Escape');
// buy PRO
await tab('Профиль'); await p.getByText('Купить PRO').click().catch(() => console.log('nobuy')); await p.waitForTimeout(5000);
await p.screenshot({ path: 'tma2/buypro_view.png' }); fs.writeFileSync('tma2/buypro.txt', await p.evaluate(() => document.body.innerText)); console.log('URL after buy', p.url());
await p.screenshot({ path: 'tma2/buypro_page.png', fullPage: true });
await b.close();
