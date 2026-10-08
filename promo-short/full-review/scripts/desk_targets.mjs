import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs';
// Collect click targets (viewport css coords for fixed chrome, main-relative for content) for the animated cursor.
const want = {
  dashboard: ['BTC', 'Баланс SOL', 'Win Rate', 'PnL История'],
  wallet: ['Копировать адрес', 'Пополнить', 'Копировать', 'Открыть окно пополнения'],
  'orders-v3': ['Поиск', 'Все (', 'Активные (', 'Завершённые (', 'Отменённые (', 'Новые', 'PnL', 'MCAP', 'Ликвидность'],
  'dca-stats': ['7 дней', '30 дней', '90 дней', 'Всё время'],
  'dca-lab': ['Как у меня', 'Чистое сравнение', 'Перенести в «Фильтры»', '7 дней', '90 дней', 'Фиксированная', 'Учитывать издержки'],
  trading: ['Оформить PRO', 'Настройки торговли', 'Ручной свап', 'Исполнение (Jupiter)', 'Сохранить'],
  filters: ['Сохранить', 'Подобрать значения', 'Маркет-кап и ликвидность'],
  tpsl: ['Сохранить дефолты'],
  blacklist: ['Добавить'],
  alerts: ['Привязать Telegram'],
  plans: ['ОФОРМИТЬ PRO', 'Слот 1', 'Слот 2', 'Слот 3', 'ВЫБЕРИТЕ СЛОТ'],
  profile: ['Сменить пароль', 'Настроить 2FA', 'Завершить'],
  docs: [],
};
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1, storageState: 'state.json' });
const p = await ctx.newPage();
const out = {};
for (const [pg, texts] of Object.entries(want)) {
  await p.goto('https://jupiter-dca-bot.online/panel/' + pg, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6500);
  const r = await p.evaluate((texts) => {
    const side = [...document.querySelectorAll('aside a[href^="/panel/"], nav a[href^="/panel/"]')].map(a => { const r = a.getBoundingClientRect(); return { href: a.getAttribute('href'), x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }).filter(o => o.w > 0 && o.x < 230);
    const main = document.querySelector('main'); const mr = main.getBoundingClientRect();
    const all = [...document.querySelectorAll('main button, main input, main a, main [role=button], main *')];
    const tg = {};
    for (const t of texts) {
      const T = t.toLowerCase();
      const el = all.find(e => (e.tagName === 'INPUT' ? (e.placeholder || '') : e.textContent).trim().toLowerCase().startsWith(T) && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().width < 700);
      if (el) { const q = el.getBoundingClientRect(); tg[t] = { x: Math.round(q.left - mr.left + q.width / 2), y: Math.round(q.top - mr.top + q.height / 2), w: Math.round(q.width), h: Math.round(q.height) }; }
    }
    return { side, tg };
  }, texts);
  out[pg] = r;
  console.log(pg, r.side.length, Object.keys(r.tg).join(','));
}
fs.writeFileSync('long/targets.json', JSON.stringify(out));
await b.close();
