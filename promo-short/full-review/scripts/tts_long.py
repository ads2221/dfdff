import json, re, sys, base64, os, urllib.request
K = os.environ["ELEVENLABS_API_KEY"]; VOICE = "nPczCjzI2devNBz1zQrb"  # Brian
s = open('script.txt').read()
ch = re.findall(r'## (c\d+) (.*)\n(.*)', s)
only = set(sys.argv[1:])
os.makedirs('vo', exist_ok=True)
for i, (cid, title, text) in enumerate(ch):
    if only and cid not in only: continue
    if os.path.exists(f'vo/{cid}.mp3') and not only: continue
    body = {"text": text, "model_id": "eleven_multilingual_v2", "language_code": "ru",
            "previous_text": ch[i-1][2][-300:] if i else None, "next_text": ch[i+1][2][:300] if i+1 < len(ch) else None,
            "voice_settings": {"stability": 0.5, "similarity_boost": 0.8, "style": 0.3, "use_speaker_boost": True, "speed": 1.03}}
    req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"xi-api-key": K, "Content-Type": "application/json"})
    try: d = json.load(urllib.request.urlopen(req, timeout=600))
    except urllib.error.HTTPError as e: print(cid, e.code, e.read()[:300]); sys.exit(1)
    open(f'vo/{cid}.mp3', 'wb').write(base64.b64decode(d["audio_base64"]))
    json.dump(d.get("normalized_alignment") or d["alignment"], open(f'vo/{cid}.json', 'w'), ensure_ascii=False)
    print(cid, 'ok', flush=True)
