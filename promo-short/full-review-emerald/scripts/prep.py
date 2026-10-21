from PIL import Image
import json, re, unicodedata, subprocess, os
Image.MAX_IMAGE_PIXELS = None
D = '../v2/desk'; D2 = '../v2/desk2'; os.makedirs('a', exist_ok=True); os.makedirs('a3', exist_ok=True)
pages = ['dashboard','wallet','orders-v3','dca-stats','dca-lab','trading','portfolio','tpsl','user-stats','alerts','filters','blacklist','plans','docs','profile']
VIEW = {}
meta = {}; tg = json.load(open(f'{D2}/targets.json')); TG = {}
for p in pages:
    v = Image.open(f'{D2}/{p}_view.png').convert('RGB')
    v.crop((0, 0, 354, 1500)).save(f'a/{p}_side.jpg', quality=92)
    v.crop((354, 0, 2400, 104)).save(f'a/{p}_head.jpg', quality=92)
    if p == 'docs':
        m = Image.open(f'{D}/docs_page.png').convert('RGB'); m.save('a/docs_main.jpg', quality=88)
        dv = Image.open(f'{D}/docs_view.png').convert('RGB'); dv.crop((30, 592, 450, 1404)).save('a/docs_toc.jpg', quality=92)
        meta[p] = {'h': m.height / 1.5 + 69, 'cards': [], 'heads': json.load(open(f'{D}/docs_heads.json'))['heads']}
    else:
        m = Image.open(f'{D2}/{p}_main.png').convert('RGB'); m.save(f'a/{p}_main.jpg', quality=88)
        cards = json.load(open(f'{D2}/{p}_cards.json'))['cards']
        meta[p] = {'h': m.height / 1.5, 'cards': [c for c in cards if not c['t'].startswith('@keyframes')]}
    d = {}
    for b in tg.get(p, {}).get('btns', []): d.setdefault(b['t'], {k: b[k] for k in 'xywh'})
    TG[p] = {'side': tg.get(p, {}).get('side', []), 'tg': d}
L = Image.open(f'{D}/landing_full.png').convert('RGB')
sa = Image.open(f'{D}/landing_slotan.png').convert('RGB'); L.paste(sa, (round(678 * 1.5), round(4045 * 1.5)))
L.save('a/landing_full.jpg', quality=86)
Image.open(f'{D}/auth_register.png').convert('RGB').save('a/auth_register.jpg', quality=92)
meta['landing'] = {'h': L.height / 1.5}
json.dump(meta, open('meta.json', 'w'), ensure_ascii=False)
open('targets.js', 'w').write('window.TARGETS=' + json.dumps(TG, ensure_ascii=False) + ';')
# mini app assets
T = '../tma3'
for tab in ['home', 'market', 'stats', 'filters', 'lab', 'trading', 'profile']:
    v = Image.open(f'{T}/{tab}_view.png').convert('RGB'); W, H = v.size
    v.crop((0, 0, W, 151)).save(f'a3/head_{tab}.png'); v.crop((0, H - 179, W, H)).save(f'a3/nav_{tab}.png')
    Image.open(f'{T}/{tab}_page.png').convert('RGB').save(f'a3/page_{tab}.png')
import shutil, glob
for f in glob.glob(f'{T}/*.png'):
    n = os.path.basename(f)
    if not re.match(r'(home|market|stats|filters|lab|trading|profile)_(view|page)\.png', n): shutil.copy(f, 'a3/' + n)
shutil.copy('../long/a3/bot_avatar.jpg', 'a3/')
# timeline
MAP = {'ди-си-э́й': 'DCA', 'Сола́на': 'Solana', 'Сола́не': 'Solana', 'Сола́ны': 'Solana', 'Сола́на-кошелёк': 'Solana-кошелёк', 'Джу́питер': 'Jupiter', 'Джу́питера': 'Jupiter',
       'пи-эн-э́л': 'PnL', 'ю-эс-ди-си́': 'USDC', 'со́ле': 'SOL', 'со́ла': 'SOL', 'со́л': 'SOL', 'вин-ре́йт': 'Win rate', 'тейк-про́фит': 'Take-Profit', 'стоп-ло́сс': 'Stop-Loss',
       'ПРО': 'PRO', 'Телегра́ме': 'Telegram', 'Телегра́м': 'Telegram', 'ордера́': 'ордера', 'ордеро́в': 'ордеров', 'вэ-три': 'V3', 'ТГ': 'TG', 'Трейд': 'Trade'}
s = open('script.txt').read(); ch = re.findall(r'## (c\d+) (.*)\n(.*)', s)
OPEN = 4.0; CARD = 2.6; GAP = 0.5; t = OPEN; chapters = []; words = []
for i, (cid, title, text) in enumerate(ch):
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'vo/{cid}.mp3']).decode())
    card = None
    if i > 0: card = t; t += CARD
    start = t; a = json.load(open(f'vo/{cid}.json'))
    cur = ''; s0 = e0 = None; ws = []
    for c, a0, a1 in zip(a['characters'], a['character_start_times_seconds'], a['character_end_times_seconds']):
        if c.isspace():
            if cur: ws.append([cur, s0, e0]); cur = ''
            continue
        if not cur: s0 = a0
        cur += c; e0 = a1
    if cur: ws.append([cur, s0, e0])
    for w, a0, a1 in ws:
        if a0 > dur: continue
        w = w.replace('<<', '«').replace('>>', '»')
        m = re.match(r'^([«"(]*)(.*?)([.,!?:;»")—]*)$', w); pre, core, p = m.group(1), m.group(2), m.group(3)
        if not any(x.isalnum() for x in core): continue
        ML = {k.lower(): v for k, v in MAP.items() if k != 'ПРО'}
        disp = MAP['ПРО'] if core == 'ПРО' else ML.get(core.lower(), unicodedata.normalize('NFC', core.replace('́', '')))
        words.append({'w': pre.replace('«', '').replace('"', '') + disp, 'p': p.replace('»', '').replace('"', ''), 's': round(start + a0, 3), 'e': round(start + min(a1, dur), 3), 'c': i})
    chapters.append({'id': cid, 'title': title, 'card': card, 'start': start, 'end': start + dur})
    t = start + dur + GAP
DUR = t + 5.5
json.dump({'chapters': chapters, 'DUR': DUR}, open('timeline.json', 'w'), ensure_ascii=False)
open('data.js', 'w').write('window.META=' + json.dumps(meta, ensure_ascii=False) + ';window.TL=' + json.dumps({'chapters': chapters, 'DUR': DUR}, ensure_ascii=False) + ';window.WORDS=' + json.dumps(words, ensure_ascii=False) + ';')
for c in chapters: print(c['id'], c['title'], round(c['card'] or 0, 1), round(c['start'], 1), round(c['end'], 1))
print('DUR', round(DUR, 1), 'words', len(words))
print(sorted({w['w'] for w in words if re.search(r'[-́]', w['w'])}))
