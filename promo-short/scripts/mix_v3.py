import subprocess
DUR = 80.3
sfx = {
    'impact': ([0.16, 1.42, 2.23, 58.33, 63.07, 65.6, 71.61, 74.53], -4),
    'whoosh': ([2.1, 5.55, 9.5, 12.2, 14.1, 20.0, 24.85, 25.5, 28.25, 29.1, 31.7, 34.4, 35.0, 38.1, 39.4, 40.4, 44.45, 45.9, 47.6, 49.7, 51.8, 53.55, 54.3, 59.0, 61.2, 66.0, 68.5], -3),
    'glitch': ([2.2, 58.3, 63.07], -4),
    'riser': ([0.2, 56.3, 64.0, 69.6], -5),
    'pop': ([2.9, 3.3, 3.7, 5.42, 24.75, 28.15, 34.3, 40.3, 44.35, 53.45, 56.5, 56.88, 57.26, 57.64, 58.02, 62.33, 66.08, 66.3, 66.52, 69.28, 72.78, 75.1], 10),
}
inputs = ['-i', 'audio/voiceover_v3.mp3', '-stream_loop', '3', '-i', 'audio/sfx/beat.mp3']
fc = []
# music: lowpassed during the hook, then full ("drop") at 4.8s; fade out at the end
fc.append(f"[1:a]atrim=0:{DUR},asetpts=PTS-STARTPTS,lowpass=f=600:enable='lt(t,2.2)',volume=0.55,"
          f"afade=t=in:d=0.3,afade=t=out:st={DUR-1.6}:d=1.6[mus]")
fc.append(f"[0:a]apad=whole_dur={DUR},highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=80:makeup=3,"
          "aformat=channel_layouts=stereo,asplit=2[vo][vosc]")
fc.append("[mus][vosc]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=300[duck]")
labels = []
idx = 2
for name, (times, gain) in sfx.items():
    for t in times:
        inputs += ['-i', f'audio/sfx/{name}.mp3']
        ms = int(t * 1000)
        fc.append(f"[{idx}:a]volume={gain}dB,adelay={ms}|{ms},aformat=channel_layouts=stereo[x{idx}]")
        labels.append(f"[x{idx}]")
        idx += 1
fc.append(f"{''.join(labels)}amix=inputs={len(labels)}:normalize=0,volume=0.6[fx]")
fc.append(f"[vo][duck][fx]amix=inputs=3:normalize=0,alimiter=limit=0.95,atrim=0:{DUR},loudnorm=I=-14:TP=-1.0:LRA=11[out]")
cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error'] + inputs + ['-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', 'audio/mix_v3.wav']
subprocess.run(cmd, check=True)
print('mix ok')
