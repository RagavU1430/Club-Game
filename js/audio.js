// js/audio.js — Web Audio API sound effects (no external files)

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = typeof localStorage !== 'undefined' ? localStorage.getItem('wordwave_muted') !== 'true' : true;
    this._lastTick = 0;
  }

  _ensureContext() {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      } catch (e) {
        console.warn('[Audio] Could not create AudioContext:', e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  _resume() {
    this._ensureContext();
  }

  _osc(freq, type, gain, duration, startTime, endFreq = null) {
    if (!this.enabled) return;
    // Create the context on demand — previously returned silently forever when ctx was null
    if (!this.ctx) this._ensureContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    const t = startTime ?? this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const vol = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq !== null) osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);
    vol.gain.setValueAtTime(gain, t);
    vol.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.connect(vol);
    vol.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  // Good hit — short upward chirp
  hitGood() {
    this._osc(440, 'sine', 0.18, 0.12, null, 660);
  }

  // Perfect hit — fuller chord arpeggio
  hitPerfect() {
    const now = this.ctx?.currentTime ?? 0;
    this._osc(523, 'sine', 0.22, 0.18, now);
    this._osc(659, 'sine', 0.18, 0.18, now + 0.06);
    this._osc(784, 'sine', 0.14, 0.18, now + 0.12);
  }

  // Level up / victory / login success
  levelUp() {
    this.hitPerfect();
  }

  // Near miss — quick downward wobble
  nearMiss() {
    this._osc(350, 'triangle', 0.12, 0.15, null, 250);
  }

  // Miss — low thud
  miss() {
    this._osc(80, 'sine', 0.2, 0.18, null, 60);
  }

  // Combo! — ascending scale burst
  combo(multiplier = 2) {
    const now = this.ctx?.currentTime ?? 0;
    const freqs = [523,659,784,1046,1319].slice(0, Math.min(multiplier + 1, 5));
    freqs.forEach((f, i) => this._osc(f, 'sine', 0.15, 0.14, now + i * 0.07));
  }

  // Streak clear — triumphant sweep
  streakClear() {
    const now = this.ctx?.currentTime ?? 0;
    [523,659,784,1046,1319,1568].forEach((f, i) => {
      this._osc(f, 'sine', 0.18, 0.2, now + i * 0.06);
    });
    this._osc(800, 'sawtooth', 0.08, 0.6, now + 0.2, 1200);
  }

  // Chain block clear — single plop
  chainPop(delay = 0) {
    const now = (this.ctx?.currentTime ?? 0) + delay;
    this._osc(300 + delay * 80, 'sine', 0.14, 0.1, now, 500 + delay * 100);
  }

  // Big chain — cascade of plops
  bigChain(count) {
    for (let i = 0; i < Math.min(count, 8); i++) {
      this.chainPop(i * 0.06);
    }
  }

  // Game over — descending
  gameOver() {
    const now = this.ctx?.currentTime ?? 0;
    [523,415,330,262].forEach((f, i) => this._osc(f, 'triangle', 0.2, 0.25, now + i * 0.18));
  }

  // New word added — faint tick (softened + throttled; was harsh 1200Hz square every spawn)
  tick() {
    const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
    if (now - this._lastTick < 350) return;
    this._lastTick = now;
    this._osc(880, 'sine', 0.03, 0.05);
  }

  // Robot throws a new word — energetic sci-fi whoosh / launch chirp
  robotThrow() {
    if (!this.enabled) return;
    const now = this.ctx?.currentTime ?? 0;
    this._osc(280, 'sine', 0.08, 0.15, now, 680);
    this._osc(480, 'triangle', 0.04, 0.10, now + 0.04, 820);
  }

  // Robot word lands in the stack — satisfying high-tech thud & chime
  robotLand() {
    if (!this.enabled) return;
    const now = this.ctx?.currentTime ?? 0;
    this._osc(420, 'triangle', 0.09, 0.10, now, 180);
    this._osc(880, 'sine', 0.06, 0.08, now + 0.03);
  }

  // Match countdown beeps (3, 2, 1, GO!)
  countdown(isFinal = false) {
    if (!this.enabled) return;
    const now = this.ctx?.currentTime ?? 0;
    if (isFinal) {
      this._osc(660, 'sine', 0.15, 0.22, now, 880);
      this._osc(880, 'triangle', 0.12, 0.22, now + 0.04, 1320);
    } else {
      this._osc(440, 'sine', 0.12, 0.12, now);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem('wordwave_muted', (!this.enabled).toString()); } catch {}
    if (this.enabled) this._ensureContext();
    return this.enabled;
  }
  setEnabled(v) {
    this.enabled = !!v;
    try { localStorage.setItem('wordwave_muted', (!this.enabled).toString()); } catch {}
    if (this.enabled) this._ensureContext();
  }
}

export const audio = new AudioEngine();
export const sound = audio;
if (typeof window !== 'undefined') {
  window.audio = audio;
  window.sound = audio;
}
export default audio;
