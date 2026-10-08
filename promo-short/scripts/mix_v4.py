import subprocess
DUR = 71.0
sfx = {
    'impact': ([0.1, 8.92, 39.59, 55.39, 62.74], -5),
    'swoosh2': ([8.6, 11.4, 12.25, 15.3, 17.2, 20.0, 22.15, 22.45, 24.4, 26.35, 31.1, 33.75, 35.55, 39.5, 41.2, 42.45, 43.0, 43.75, 44.7, 46.15, 47.7, 50.65, 53.75, 56.75, 62.6], -2),
    'shimmer': ([9.0, 14.2, 26.6, 45.5, 57.3, 59.2, 65.19], -3),
    'riser': ([7.0, 37.6, 60.7], -6),
    'pop': ([1.02, 1.9, 2.6, 3.3, 5.06, 6.73, 11.9, 12.8, 38.6, 40.4, 55.2, 63.3, 63.5, 66.78], 9),
}
inputs = ['-i', 'audio/voiceover_v4.mp3', '-stream_loop', '3', '-i', 'audio/sfx/beat2.mp3']
fc = []
# music: lowpassed during the hook, then full ("drop") at 4.8s; fade out at the end
fc.append(f"[1:a]atrim=0:{DUR},asetpts=PTS-STARTPTS,lowpass=f=500:enable='lt(t,8.9)',volume=0.55,"
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
cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error'] + inputs + ['-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', 'audio/mix_v4.wav']
subprocess.run(cmd, check=True)
print('mix ok')
