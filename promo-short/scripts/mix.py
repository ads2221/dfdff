import subprocess
DUR = 54.8
sfx = {
    'impact': ([0.05, 4.8, 17.5, 26.4, 42.9, 47.72], -4),
    'whoosh': ([1.7, 7.45, 10.3, 12.55, 13.4, 16.5, 18.35, 20.05, 22.9, 24.55, 27.8, 28.4, 29.9, 31.35, 32.2, 34.1, 41.45, 47.6], -3),
    'glitch': ([1.1, 1.76, 27.86], -4),
    'riser': ([2.75, 40.85], -5),
    'pop': ([3.46, 5.18, 15.45, 34.19, 36.66, 38.22, 40.0, 46.27, 48.4, 49.2], 10),
}
inputs = ['-i', 'audio/voiceover.mp3', '-stream_loop', '3', '-i', 'audio/sfx/beat.mp3']
fc = []
# music: lowpassed during the hook, then full ("drop") at 4.8s; fade out at the end
fc.append(f"[1:a]atrim=0:{DUR},asetpts=PTS-STARTPTS,lowpass=f=600:enable='lt(t,4.8)',volume=0.55,"
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
cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error'] + inputs + ['-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', 'audio/mix.wav']
subprocess.run(cmd, check=True)
print('mix ok')
