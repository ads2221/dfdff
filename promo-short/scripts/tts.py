import json, sys, base64, urllib.request
import os
K = os.environ["ELEVENLABS_API_KEY"]
voice, model, text, out = sys.argv[1], sys.argv[2], open(sys.argv[3]).read().strip(), sys.argv[4]
body = {"text": text, "model_id": model, "language_code": "ru",
        "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35, "use_speaker_boost": True, "speed": 1.08}}
req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128",
    data=json.dumps(body).encode(), headers={"xi-api-key": K, "Content-Type": "application/json"})
try:
    d = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    print(e.code, e.read()[:800]); sys.exit(1)
open(out + ".mp3", "wb").write(base64.b64decode(d["audio_base64"]))
json.dump(d.get("normalized_alignment") or d["alignment"], open(out + ".json", "w"), ensure_ascii=False)
print("ok")
