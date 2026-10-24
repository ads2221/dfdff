import subprocess
DUR = 93.9
sfx = {
    'impact': ([0.04, 5.15, 13.72, 53.7, 61.3, 62.8, 77.95, 87.55], -4),
    'whoosh': ([1.8, 6.0, 11.5, 16.3, 19.5, 22.6, 23.4, 27.6, 28.8, 32.0, 34.55, 35.5, 38.2, 40.0, 41.5, 44.1, 44.8, 48.1, 49.9, 51.6, 52.4, 54.4, 59.8, 67.6, 70.1, 74.2, 81.6, 84.4], -3),
    'glitch': ([1.17, 1.85, 5.12, 53.68, 61.97], -4),
    'riser': ([3.1, 11.6, 51.6, 60.8, 68.0], -5),
    'pop': ([3.78, 5.5, 10.48, 14.4, 15.95, 56.05, 58.2, 60.23, 65.18, 66.36, 70.5, 74.65, 78.3, 81.9, 85.53, 88.33, 89.19], 10),
}
inputs = ['-i', 'audio/voiceover_v2.mp3', '-stream_loop', '3', '-i', 'audio/sfx/beat.mp3']
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
cmd = ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error'] + inputs + ['-filter_complex', ';'.join(fc), '-map', '[out]', '-ar', '48000', '-c:a', 'pcm_s16le', 'audio/mix_v2.wav']
subprocess.run(cmd, check=True)
print('mix ok')
