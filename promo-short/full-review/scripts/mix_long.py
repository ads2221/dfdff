import numpy as np, json, subprocess, wave
sr=48000
ev=json.load(open('events.json')); tl=json.load(open('timeline.json'))
DUR=ev['DUR']; N=int(DUR*sr)+sr
def load(path):
    raw=subprocess.run(['ffmpeg','-v','error','-i',path,'-f','f32le','-ac','2','-ar',str(sr),'-'],capture_output=True).stdout
    return np.frombuffer(raw,dtype=np.float32).reshape(-1,2).copy()
def add(buf,x,t,g=1.0):
    i=int(t*sr); 
    if i>=len(buf): return
    n=min(len(x),len(buf)-i); buf[i:i+n]+=x[:n]*g
db=lambda d:10**(d/20)
vo=np.zeros((N,2),np.float32)
for c in tl['chapters']: add(vo,load(f"vo/{c['id']}.mp3"),c['start'])
# music loop with crossfade
bed=load('../sfx/bed_long.mp3'); xf=int(1.5*sr)
mus=np.zeros((N,2),np.float32); pos=0; fade=np.linspace(0,1,xf)[:,None]
while pos<N:
    seg=bed.copy()
    if pos>0: seg[:xf]*=fade
    seg[-xf:]*=fade[::-1]
    add(mus,seg,pos/sr); pos+=len(bed)-xf
# ducking from VO envelope
env=np.abs(vo).max(1); win=int(.25*sr); k=np.ones(win)/win
cs=np.cumsum(np.concatenate([[0],env])); h=win//2; idx=np.arange(len(env)); lo=np.clip(idx-h,0,len(env)); hi=np.clip(idx+h,0,len(env)); env=(cs[hi]-cs[lo])/np.maximum(hi-lo,1); act=(env>0.01).astype(np.float32)
# smooth gain: attack .15s release .6s
g=np.empty_like(act); cur=1.0; a=1-np.exp(-1/(.15*sr)); r=1-np.exp(-1/(.6*sr))
for i in range(0,len(act),48):
    tgt=0.32 if act[i] else 1.0; cur+= (tgt-cur)*(1-(1-(a if tgt<cur else r))**48); g[i:i+48]=cur
mus*=g[:,None]*db(-15)
mus[:int(.8*sr)]*=np.linspace(0,1,int(.8*sr))[:,None]
fo=int(3*sr); end=int(DUR*sr); mus[end-fo:end]*=np.linspace(1,0,fo)[:,None]; mus[end:]=0
fx=np.zeros((N,2),np.float32)
sw=load('../sfx/swoosh2.mp3'); sh=load('../sfx/shimmer.mp3'); im=load('../sfx/impact.mp3'); pop=load('../sfx/pop.mp3'); riser=load('../sfx/riser.mp3')
cl=load('click.wav'); tk=load('tick.wav')
add(fx,sh,0.3,db(-8)); add(fx,im,0.15,db(-14)); add(fx,sw,2.9,db(-8))
for t in ev['cards']: add(fx,riser,t-1.6,db(-16)); add(fx,sw,t-.1,db(-7)); add(fx,im,t+.05,db(-18))
for t in ev['clicks']: add(fx,cl,t,db(-6))
for t in ev['spots']: add(fx,tk,t+.05,db(-6))
for t in ev['mco']: add(fx,pop,t,db(4))
for n,t in ev['ovs']: add(fx,sh if n in ('cta','fee') else pop,t,db(-6) if n in ('cta','fee') else db(4))
mix=vo+mus+fx
peak=np.abs(mix).max(); mix/=max(1,peak/0.98)
w=wave.open('mix_raw.wav','wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
w.writeframes((mix[:end]*32767).astype('<i2').tobytes()); w.close()
subprocess.run(['ffmpeg','-y','-v','error','-i','mix_raw.wav','-af','loudnorm=I=-14:TP=-1.0:LRA=11','-ar','48000','mix.wav'],check=True)
print('ok', DUR)
