import json, re, unicodedata, subprocess, sys
MAP = {'ди-си-э́й': 'DCA', 'Сола́на': 'Solana', 'Сола́не': 'Solana', 'Сола́на-кошелёк': 'Solana-кошелёк', 'Джу́питер': 'Jupiter', 'пи-эн-э́л': 'PnL',
       'вин-ре́йт': 'Win rate', 'ПРО': 'PRO', 'Телегра́ме': 'Telegram', 'Телегра́м': 'Telegram', 'ордера́': 'ордера', 'ордеро́в': 'ордеров', 'Трейд': 'Trade',
       'Стонк': 'STONK', 'Эн-Си': 'NC', 'Рок': 'ROCK', 'Фрайз': 'FRIES', 'Кимчи': 'Kimchi', 'Пурр': 'PURR', 'Макси': 'MAXI', 'Аутон': 'AUTON', 'Топ-пять': 'Топ-5'}
ML = {k.lower(): v for k, v in MAP.items() if k != 'ПРО'}
LEAD = 0.5
d = json.load(open('data.json'))
for sid in ['sD', 'sE', 'sF', 'sG', 'sH']:
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'vo/{sid}.mp3']).decode())
    a = json.load(open(f'vo/{sid}.json'))
    cur = ''; s0 = e0 = None; ws = []
    for c, a0, a1 in zip(a['characters'], a['character_start_times_seconds'], a['character_end_times_seconds']):
        if c.isspace():
            if cur: ws.append([cur, s0, e0]); cur = ''
            continue
        if not cur: s0 = a0
        cur += c; e0 = a1
    if cur: ws.append([cur, s0, e0])
    words = []
    for w, a0, a1 in ws:
        w = w.replace('<<', '«').replace('>>', '»')
        m = re.match(r'^([«"(]*)(.*?)([.,!?:;»")—]*)$', w); pre, core, p = m.groups()
        if not any(x.isalnum() for x in core): continue
        disp = MAP['ПРО'] if core == 'ПРО' else ML.get(core.lower(), unicodedata.normalize('NFC', core.replace('́', '')))
        words.append({'w': disp, 'p': p.replace('»', ''), 's': round(LEAD + a0, 3), 'e': round(LEAD + a1, 3)})
    DUR = LEAD + dur + 2.6
    open(f'data_{sid}.js', 'w').write('window.SID=' + json.dumps(sid) + ';window.DUR=' + str(round(DUR, 3)) + ';window.LEAD=' + str(LEAD) + ';window.WORDS=' + json.dumps(words, ensure_ascii=False) + ';window.D=' + json.dumps(d, ensure_ascii=False) + ';')
    print(sid, round(DUR, 1), ' '.join(w['w'] for w in words)[:300])
