import json, re, unicodedata
a = json.load(open('audio/voiceover_alignment.json'))
ch, st, en = a['characters'], a['character_start_times_seconds'], a['character_end_times_seconds']
words=[]; cur=''; s=None; e=None
for c,t0,t1 in zip(ch,st,en):
    if c.isspace():
        if cur: words.append([cur,s,e]); cur=''
        continue
    if not cur: s=t0
    cur+=c; e=t1
if cur: words.append([cur,s,e])
MAP={'ди-си-э́й':'DCA','Сола́на':'Solana','Сола́не':'Solana','Джу́питер':'Jupiter','пи-эн-э́л':'PnL','ю-эс-ди-си́':'USDC','со́ле':'SOL','вин-ре́йт':'Win Rate','тейк-про́фит':'Take-Profit','стоп-ло́сс':'Stop-Loss','ПРО':'PRO','Телегра́м':'Telegram','ордера́':'ордера','ордеро́в':'ордеров'}
out=[]
for w,s,e in words:
    if w=='—': continue
    m=re.match(r'^(.*?)([.,!?:;]*)$',w); core,p=m.group(1),m.group(2)
    disp=MAP.get(core, unicodedata.normalize('NFC',core.replace('́','')))
    out.append({'w':disp,'p':p,'s':round(s,3),'e':round(e,3)})
json.dump(out,open('audio/words.json','w'),ensure_ascii=False)
for i,o in enumerate(out): print(i,o['w']+o['p'],o['s'])
