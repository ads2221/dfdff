# Silent stand-in VO (and evenly spaced word timings) for chapters whose real voiceover isn't generated yet.
import re, json, os, subprocess
s = open('script.txt').read(); ch = re.findall(r'## (c\d+) (.*)\n(.*)', s)
for cid, title, text in ch:
    if os.path.exists(f'vo/{cid}.mp3') and not os.path.exists(f'vo/{cid}.placeholder'): continue
    dur = len(text) / 15.5
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', f'{dur:.2f}', '-b:a', '64k', f'vo/{cid}.mp3'], check=True)
    chars = list(text); n = len(chars)
    json.dump({'characters': chars, 'character_start_times_seconds': [i / n * dur for i in range(n)], 'character_end_times_seconds': [(i + 1) / n * dur for i in range(n)]}, open(f'vo/{cid}.json', 'w'))
    open(f'vo/{cid}.placeholder', 'w').write('1'); print('placeholder', cid, round(dur, 1))
