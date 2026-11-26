// Generated WebAudio: engine drone, wind, chimes and impacts.
// No audio files are loaded; every sound is synthesised here.

export function makeAudio() {
  return {
    ctx: null, master: null, engineOsc: null, engineOsc2: null,
    engineGain: null, windGain: null, windSrc: null,
    muted: false, started: false,
  };
}

export function startAudio(audio) {
  if (audio.started) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new AC();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);
    audio.engineOsc = audio.ctx.createOscillator();
    audio.engineOsc.type = 'sawtooth';
    audio.engineOsc.frequency.value = 62;
    audio.engineOsc2 = audio.ctx.createOscillator();
    audio.engineOsc2.type = 'square';
    audio.engineOsc2.frequency.value = 31;
    const lp = audio.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    audio.engineGain = audio.ctx.createGain();
    audio.engineGain.gain.value = 0;
    audio.engineOsc.connect(lp);
    audio.engineOsc2.connect(lp);
    lp.connect(audio.engineGain);
    audio.engineGain.connect(audio.master);
    audio.engineOsc.start();
    audio.engineOsc2.start();
    // Wind: looped noise through a bandpass filter.
    const len = audio.ctx.sampleRate * 2;
    const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    audio.windSrc = audio.ctx.createBufferSource();
    audio.windSrc.buffer = buf;
    audio.windSrc.loop = true;
    const bp = audio.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 700;
    bp.Q.value = 0.6;
    audio.windGain = audio.ctx.createGain();
    audio.windGain.gain.value = 0;
    audio.windSrc.connect(bp);
    bp.connect(audio.windGain);
    audio.windGain.connect(audio.master);
    audio.windSrc.start();
    audio.started = true;
  } catch (e) {
    audio.started = false;
  }
}

export function updateEngineSound(audio, plane, flying) {
  if (!audio.started || !audio.ctx) return;
  const t = audio.ctx.currentTime;
  const rpm = 40 + plane.throttle * 90 + plane.speed * 0.25;
  audio.engineOsc.frequency.setTargetAtTime(rpm, t, 0.08);
  audio.engineOsc2.frequency.setTargetAtTime(rpm * 0.5, t, 0.08);
  const vol = flying && !plane.crashed ? 0.05 + plane.throttle * 0.11 : (plane.onGround && plane.throttle > 0.05 ? 0.06 : 0.012);
  audio.engineGain.gain.setTargetAtTime(audio.muted ? 0 : vol, t, 0.1);
  const wind = flying ? Math.min(0.16, plane.speed * 0.0016) : 0;
  audio.windGain.gain.setTargetAtTime(audio.muted ? 0 : wind, t, 0.15);
}

function blip(audio, freq, dur, vol, type) {
  if (!audio.started || audio.muted) return;
  const t = audio.ctx.currentTime;
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(audio.master);
  o.start(t);
  o.stop(t + dur);
}

export function playRingChime(audio) {
  blip(audio, 880, 0.35, 0.22);
  setTimeout(() => blip(audio, 1320, 0.4, 0.2), 90);
}

export function playCheckpointChime(audio) {
  blip(audio, 660, 0.25, 0.2);
  setTimeout(() => blip(audio, 990, 0.3, 0.2), 80);
}

export function playCompleteFanfare(audio) {
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(audio, f, 0.5, 0.22), i * 130));
}

export function playThud(audio) {
  if (!audio.started || audio.muted) return;
  const t = audio.ctx.currentTime;
  const len = audio.ctx.sampleRate * 0.3;
  const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audio.ctx.createBufferSource();
  src.buffer = buf;
  const lp = audio.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 240;
  const g = audio.ctx.createGain();
  g.gain.value = 0.5;
  src.connect(lp); lp.connect(g); g.connect(audio.master);
  src.start(t);
}

export function toggleMute(audio) {
  audio.muted = !audio.muted;
  return audio.muted;
}
