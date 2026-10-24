import numpy as np, json, subprocess, wave, sys, re
sr = 48000; sid = sys.argv[1]
js = open(f'data_{sid}.js').read(); DUR = float(re.search(r'window.DUR=([\d.]+)', js).group(1)); LEAD = float(re.search(r'window.LEAD=([\d.]+)', js).group(1))
N = int(DUR * sr) + sr
def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(sr), '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
def add(buf, x, t, g=1.0):
    i = int(t * sr)
    if i < 0: x = x[-i:]; i = 0
    if i >= len(buf): return
    n = min(len(x), len(buf) - i); buf[i:i + n] += x[:n] * g
db = lambda d: 10 ** (d / 20)
vo = np.zeros((N, 2), np.float32); add(vo, load(f'vo/{sid}.mp3'), LEAD)
bed = load('../sfx/' + ('beat2.mp3' if sid == 'sB' else 'beat.mp3')); xf = int(.5 * sr)
mus = np.zeros((N, 2), np.float32); pos = 0; fade = np.linspace(0, 1, xf)[:, None]
while pos < N:
    seg = bed.copy()
    if pos > 0: seg[:xf] *= fade
    seg[-xf:] *= fade[::-1]; add(mus, seg, pos / sr); pos += len(bed) - xf
env = np.abs(vo).max(1); win = int(.2 * sr); cs = np.cumsum(np.concatenate([[0], env])); h = win // 2; idx = np.arange(len(env))
lo = np.clip(idx - h, 0, len(env)); hi = np.clip(idx + h, 0, len(env)); env = (cs[hi] - cs[lo]) / np.maximum(hi - lo, 1); act = env > .01
g = np.empty(len(act), np.float32); cur = 1.0
for i in range(0, len(act), 48):
    tgt = .42 if act[i] else 1.0; cur += (tgt - cur) * (.08 if tgt < cur else .02); g[i:i + 48] = cur
mus *= g[:, None] * db(-11)
end = int(DUR * sr); fo = int(1.5 * sr); mus[end - fo:end] *= np.linspace(1, 0, fo)[:, None]; mus[end:] = 0
fx = np.zeros((N, 2), np.float32)
S = {k: load(f'../sfx/{k}.mp3') for k in ['whoosh', 'impact', 'pop', 'shimmer', 'riser', 'swoosh2']}
S['tick'] = load('../v3/tick.wav'); S['riser_short'] = S['riser'][:int(1.2 * sr)] * np.linspace(1, .2, int(1.2 * sr))[:, None] if len(S['riser']) > 1.2 * sr else S['riser']
GAIN = {'whoosh': -8, 'impact': -9, 'pop': 0, 'shimmer': -6, 'tick': -4, 'riser_short': -14}
for t, k in json.load(open(f'sfx_{sid}.json')): add(fx, S[k], t, db(GAIN.get(k, -8)))
mix = vo * 1.15 + mus + fx; mix /= max(1, np.abs(mix).max() / .98)
w = wave.open(f'mix_{sid}.wav', 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr); w.writeframes((mix[:end] * 32767).astype('<i2').tobytes()); w.close()
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', f'mix_{sid}.wav', '-af', 'loudnorm=I=-14:TP=-1.0:LRA=9', '-ar', '48000', f'mixn_{sid}.wav'], check=True)
print('ok', sid, DUR)
