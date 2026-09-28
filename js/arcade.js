// js/arcade.js — Arcade game mode (full Semantris replication, polished & bug-free)
import { semanticEngine, THRESHOLD_GOOD, THRESHOLD_PERFECT, THRESHOLD_NEAR_MISS } from './semantic.js';
import { getPoolForTime, pickWords, SAMPLE_CLUES } from './word-pool.js';
import { saveScore, getHighScore, getActiveTeam, saveLeaderboardEntry } from './storage.js';
import { audio }                     from './audio.js';
import { geminiService }             from './gemini.js';

/* ─── Config ─────────────────────────────────────────── */
const CFG = {
  INITIAL_WORDS    : 6,
  MAX_WORDS        : 12,
  ROW_HEIGHT       : 54,    // px — word row height + gap
  INITIAL_SPEED    : 8,     // px/s — baseline smooth upward crawl
  SPEED_STEP       : 3.5,   // px/s added every 30s
  MAX_SPEED        : 45,
  WORD_INTERVAL_MS : 4200,  // ms between new word spawns
  MIN_WORD_INTERVAL: 1800,
  STREAK_TARGET    : 5,     // consecutive hits for STREAK CLEAR
  PTS_GOOD         : 100,
  PTS_PERFECT_BONUS: 55,
  PTS_TARGET_BONUS : 40,
  PTS_STREAK_BONUS : 250,
  PTS_SPEED_BONUS  : 30,    // submitted < 2s after previous clear
};

/* ─── Particle System with Retina / High-DPI Support ──── */
class Particles {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas ? canvas.getContext('2d') : null;
    this.list    = [];
    this.running = !!this.ctx;
    this._rafId  = null;

    if (this.canvas && this.ctx) {
      this._onResize = () => this._resize();
      window.addEventListener('resize', this._onResize);
      this._resize();
      this._loop();
    }
  }

  _resize() {
    if (!this.canvas || !this.ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // NOTE: canvas may be inside a hidden wrapper during load → offsetWidth 0.
    // Fall back to parent/area size, and caller must call resize() again after reveal.
    const parent = this.canvas.parentElement;
    const w   = this.canvas.offsetWidth || this.canvas.clientWidth
      || (parent && parent.clientWidth) || window.innerWidth || 300;
    const h   = this.canvas.offsetHeight || this.canvas.clientHeight
      || (parent && parent.clientHeight) || window.innerHeight || 300;
    this.canvas.width  = Math.max(1, Math.round(w * dpr));
    this.canvas.height = Math.max(1, Math.round(h * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
  }

  /** Public: re-measure after the game wrapper becomes visible. */
  resize() { this._resize(); }

  spawn(x, y, color = '#00D4FF', count = 18) {
    if (!this.ctx) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5.5 + 1.8;
      this.list.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2.5,
        size: Math.random() * 3.5 + 1.8,
        color,
        life: 1,
        decay: Math.random() * 0.035 + 0.02,
      });
    }
  }

  _loop() {
    if (!this.running || !this.ctx) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);
    this.list = this.list.filter(p => p.life > 0);

    for (const p of this.list) {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.18; // gentle gravity
      p.life -= p.decay;

      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle   = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur  = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    this._rafId = requestAnimationFrame(() => this._loop());
  }

  destroy() {
    this.running = false;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._onResize) window.removeEventListener('resize', this._onResize);
    this.list = [];
  }
}

/* ─── ArcadeGame Class ───────────────────────────────── */
export class ArcadeGame {
  constructor() {
    // DOM references (supports both arcade.html and participant.html)
    this.stackEl      = document.getElementById('word-stack');
    this.inputEl      = document.getElementById('word-input') || document.getElementById('clue-input');
    this.submitEl     = document.getElementById('submit-btn');
    this.feedbackEl   = document.getElementById('feedback-text') || document.getElementById('input-feedback');
    this.scoreEl      = document.getElementById('score-display');
    this.timerEl      = document.getElementById('timer-display') || document.getElementById('time-display');
    this.dangerEl     = document.getElementById('danger-line');
    this.streakDotsEl = document.getElementById('streak-dots');
    this.comboEl      = document.getElementById('combo-badge') || document.getElementById('multiplier-pill');
    this.bannerEl     = document.getElementById('streak-banner');
    this.simEl        = document.getElementById('sim-indicator');
    this.simFillEl    = document.getElementById('sim-fill');
    this.simPctEl     = document.getElementById('sim-pct');
    this.overlayEl    = document.getElementById('game-over-overlay');
    this.stackArea    = document.getElementById('stack-area') || document.getElementById('game-field');
    this.robotCompanionEl = document.getElementById('robot-companion');
    this.robotSpeechEl    = document.getElementById('robot-speech');
    this._robotSpeechTimer = null;
    this._lastDangerState  = false;

    const canvas      = document.getElementById('particle-canvas');
    this.particles    = new Particles(canvas);

    // State
    this.words        = [];       // [{word, id, el}] — words[0] = top visual = TARGET
    this.usedWords    = new Set();
    this.score        = 0;
    this.streak       = 0;
    this.maxStreak    = 0;
    this.comboCount   = 0;
    this.elapsed      = 0;        // seconds
    this.stackOffset  = 0;        // px — smooth upward offset
    this.riseSpeed    = CFG.INITIAL_SPEED;
    this.lastWordTime = 0;        // ms
    this.lastClearTime= 0;
    this.running      = false;
    this.over         = false;
    this.submitting   = false;
    this.wordIdCtr    = 0;

    this._rafId       = null;
    this._lastTs      = null;
    this._timerInterval = null;
    this._paused      = false;
    this._freezeUntil = 0;        // timestamp ms — no spawns while > now (streak banner)
    this._fbTimer     = null;
    this._simTimer    = null;
    this._comboTimer  = null;
    this._pendingTimeouts = new Set();

    this._boundKeyDown = (e) => {
      if (e.key === 'Enter') this._onSubmit();
    };
    this._boundSubmitClick = () => this._onSubmit();
    this._boundVisibility = () => {
      if (document.hidden) this._pause();
      else this._resume();
    };

    this._bindInput();
    this._renderStreakDots();
    document.addEventListener('visibilitychange', this._boundVisibility);
  }

  get isRunning() {
    return this.running && !this.over && !this._paused;
  }

  /* ── Bind input events ────────────────────────────── */
  _bindInput() {
    if (this.inputEl) this.inputEl.addEventListener('keydown', this._boundKeyDown);
    if (this.submitEl) this.submitEl.addEventListener('click', this._boundSubmitClick);
  }

  /* ── Start the game ───────────────────────────────── */
  async start() {
    // Full state reset (safe for reuse, not just fresh instances)
    this.score = 0;
    this.streak = 0;
    this.maxStreak = 0;
    this.comboCount = 0;
    this.elapsed = 0;
    this.over = false;
    this.running = false;
    this.paused = false;
    this._paused = false;
    this.submitting = false;
    this.lastWordTime = 0;
    this.lastClearTime = 0;
    this._freezeUntil = 0;
    this._wordInterval = CFG.WORD_INTERVAL_MS;
    if (this.scoreEl) this.scoreEl.textContent = '0';
    if (this.timerEl) { this.timerEl.textContent = '00:00'; this.timerEl.classList.remove('danger'); }
    if (this.feedbackEl) this.feedbackEl.textContent = '';
    this._renderStreakDots();

    if (this.robotCompanionEl) {
      this.robotCompanionEl.classList.remove('throwing', 'charging', 'celebrate', 'danger-mode');
      this._robotSay('⚡ READY!', 1200);
    }

    this._updateHUDTeam();

    // Clear any leftover DOM rows
    this.stackEl.innerHTML = '';
    this.words = [];
    this.usedWords.clear();
    this.stackOffset = 0;
    this._applyStackTransform();

    // Canvas was likely measured while hidden — re-measure now that we're visible
    if (this.particles) this.particles.resize();

    // Add initial words
    const initPool = getPoolForTime(0);
    const initWords = pickWords(initPool, CFG.INITIAL_WORDS, this.usedWords);
    initWords.forEach(w => {
      this.usedWords.add(w);
      this._pushWord(w);
    });

    // Pre-warm embeddings
    semanticEngine.preloadWords(this.words.map(w => w.word)).catch(() => {});

    this.running = true;
    this._lastTs = performance.now();
    this._rafId  = requestAnimationFrame(ts => this._loop(ts));

    // Timer & dynamic speed scaling (frozen while tab hidden / paused)
    this._timerInterval = setInterval(() => {
      if (!this.running || this._paused) return;
      this.elapsed++;
      this._updateTimer();
      this._recalculateSpeeds();
    }, 1000);

    this._recalculateSpeeds();
    // Avoid popping the mobile keyboard over the board on game start
    try {
      if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
        this.inputEl.focus();
      }
    } catch { this.inputEl.focus(); }
  }

  pause() {
    if (!this.running || this.over) return;
    this._paused = true;
    if (this._rafId) cancelAnimationFrame(this._rafId);
  }

  resume() {
    if (!this.running || this.over || !this._paused) return;
    this._paused = false;
    this._lastTs = performance.now();
    this._rafId  = requestAnimationFrame(ts => this._loop(ts));
    this.inputEl.focus();
  }

  /* ── Dynamic Speed Scaling & Streak Acceleration ──── */
  _recalculateSpeeds() {
    const stage = Math.floor(this.elapsed / 30);
    const baseSpeed = Math.min(CFG.MAX_SPEED, CFG.INITIAL_SPEED + stage * CFG.SPEED_STEP);
    const baseInterval = Math.max(CFG.MIN_WORD_INTERVAL, CFG.WORD_INTERVAL_MS - stage * 280);

    // After 2 streak (streak >= 2), accelerate word coming speed significantly
    if (this.streak >= 2) {
      // Scale spawn rate: faster words coming for higher streaks
      // Streak 2: -1400ms, Streak 3: -2000ms, Streak 4: -2600ms
      const intervalReduction = 1400 + (this.streak - 2) * 600;
      this._wordInterval = Math.max(1200, Math.round(baseInterval - intervalReduction));

      // Upward crawl speed boost for heightened excitement
      const speedBoost = (this.streak - 1) * 5;
      this.riseSpeed = Math.min(CFG.MAX_SPEED + 15, Math.round(baseSpeed + speedBoost));
    } else {
      this._wordInterval = baseInterval;
      this.riseSpeed = baseSpeed;
    }
  }

  /* ── Main game loop ────────────────────────────────── */
  _loop(ts) {
    if (!this.running || this._paused) return;
    const delta = Math.min((ts - this._lastTs) / 1000, 0.08);
    this._lastTs = ts;

    // Smooth upward stack crawl
    this.stackOffset += this.riseSpeed * delta;
    this._applyStackTransform();

    // Spawning new word at bottom (frozen briefly during STREAK CLEAR banner)
    this.lastWordTime += delta * 1000;
    if (this.lastWordTime >= this._wordInterval && Date.now() >= this._freezeUntil) {
      this.lastWordTime = 0;
      this._addNewWord();
    }

    // Danger / Overflow checks
    if (this._isOverflowing()) {
      this._endGame();
      return;
    }

    const danger = this._isDanger();
    this.dangerEl.classList.toggle('active', danger);
    this.timerEl.classList.toggle('danger', danger);
    if (this.robotCompanionEl) {
      this.robotCompanionEl.classList.toggle('danger-mode', danger);
      if (danger && !this._lastDangerState) {
        this._robotSay('⚠️ WATCH OUT!', 1200);
      }
      this._lastDangerState = danger;
    }

    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  /* ── Apply CSS translateY ──────────────────────────── */
  _applyStackTransform() {
    this.stackEl.style.transform = `translateY(${-this.stackOffset}px)`;
  }

  /* ── Overflow and Danger calculations ──────────────── */
  _getStackHeight() {
    // Measure real DOM height so mobile row sizes / padding stay correct.
    // Falls back to estimated ROW_HEIGHT when no rows exist.
    if (this.stackEl && this.stackEl.scrollHeight > 0 && this.words.length > 0) {
      return this.stackEl.scrollHeight;
    }
    return this.words.length * CFG.ROW_HEIGHT;
  }

  _isOverflowing() {
    if (this.words.length === 0) return false;
    const areaH  = this.stackArea.clientHeight || 500;
    const stackH = this._getStackHeight();
    // Match the visual ceiling line (3px tall at top:0)
    return (stackH + this.stackOffset) >= (areaH - 3);
  }

  _isDanger() {
    if (this.words.length < 3) return false;
    const areaH  = this.stackArea.clientHeight || 500;
    const stackH = this._getStackHeight();
    return (stackH + this.stackOffset) >= (areaH * 0.72);
  }

  /* ── Pause on tab hide (timer + RAF both stop) ───────── */
  _pause() {
    if (!this.running || this._paused || this.over) return;
    this._paused = true;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    this._rafId = null;
  }

  _resume() {
    if (!this._paused || !this.running || this.over) return;
    this._paused = false;
    this._lastTs = performance.now();
    this._rafId = requestAnimationFrame(t => this._loop(t));
  }

  _later(fn, ms) {
    const id = setTimeout(() => { this._pendingTimeouts.delete(id); fn(); }, ms);
    this._pendingTimeouts.add(id);
    return id;
  }

  /* ── Add word: enters at bottom (DOM end), pushes older words up ── */
  _pushWord(word, isThrown = false) {
    const id = ++this.wordIdCtr;
    const el = this._createWordEl(word, id);
    if (isThrown) {
      el.classList.add('thrown-impact');
    }
    // With flex-direction:column and bottom:0, child 0 is at TOP, appended child is at BOTTOM
    this.stackEl.appendChild(el);
    this.words.push({ word, id, el });
    this._updateTargetIndicators();
    if (!isThrown) {
      audio.tick();
    }
  }

  /* ── Robot Companion: Throw new word into bottom of stack ── */
  _robotThrowWord(word) {
    if (!this.running || this.over) return;

    if (!this.robotCompanionEl) {
      this._pushWord(word, true);
      return;
    }

    // Speech bubble quips
    const quips = ['⚡ INCOMING!', '🚀 NEW WORD!', '🎯 CATCH!', '✨ TOSS!', '🔥 HERE IT COMES!', '👾 FRESH WORD!'];
    const quip = quips[Math.floor(Math.random() * quips.length)];
    this._robotSay(quip, 900);

    // Charge up & windup
    this.robotCompanionEl.classList.add('charging');
    audio.robotThrow();

    this._later(() => {
      if (!this.running || this.over) return;
      this.robotCompanionEl.classList.remove('charging');
      this.robotCompanionEl.classList.add('throwing');

      // Create flying projectile
      const capsule = document.createElement('div');
      capsule.className = 'thrown-word-capsule';
      capsule.innerHTML = `<span class="capsule-icon">🚀</span><span class="capsule-name">${word}</span>`;
      this.stackArea.appendChild(capsule);

      // Trajectory calculation relative to stackArea
      const areaRect = this.stackArea.getBoundingClientRect();
      const botRect  = this.robotCompanionEl.getBoundingClientRect();

      const startX = Math.max(10, (botRect.left - areaRect.left) + 20);
      const startY = Math.max(10, (botRect.top  - areaRect.top)  + 35);
      const targetX = Math.max(20, Math.min(areaRect.width - 120, areaRect.width * 0.38));
      const targetY = Math.max(30, areaRect.height - 45);

      let impactHandled = false;
      const onImpact = () => {
        if (impactHandled) return;
        impactHandled = true;
        if (capsule.parentNode) capsule.remove();
        if (!this.running || this.over) return;

        // Spark explosion on landing
        this.particles.spawn(targetX + 30, targetY + 10, '#00D4FF', 16);
        this.particles.spawn(targetX + 30, targetY + 10, '#8B5CF6', 8);
        audio.robotLand();

        // Push into stack with landing impact animation
        this._pushWord(word, true);

        // Reset robot arm
        this._later(() => {
          if (this.robotCompanionEl) {
            this.robotCompanionEl.classList.remove('throwing');
          }
        }, 150);
      };

      // Parabolic flight arc
      try {
        const anim = capsule.animate([
          {
            transform: `translate(${startX}px, ${startY}px) scale(0.6) rotate(24deg)`,
            opacity: 0.9,
            filter: 'brightness(1.8)'
          },
          {
            transform: `translate(${(startX + targetX) / 2}px, ${Math.min(startY, targetY) - 75}px) scale(1.15) rotate(-8deg)`,
            opacity: 1,
            offset: 0.45,
            filter: 'brightness(1.4)'
          },
          {
            transform: `translate(${targetX}px, ${targetY}px) scale(0.95) rotate(0deg)`,
            opacity: 1,
            filter: 'brightness(1)'
          }
        ], {
          duration: 290,
          easing: 'cubic-bezier(0.2, 0.8, 0.25, 1)',
          fill: 'forwards'
        });
        anim.onfinish = onImpact;
      } catch (err) {
        onImpact();
      }

      // Safety timeout in case animation fails/aborts
      this._later(onImpact, 350);
    }, 110);
  }

  _robotSay(text, duration = 1000) {
    if (!this.robotSpeechEl) return;
    this.robotSpeechEl.textContent = text;
    this.robotSpeechEl.classList.add('show');
    if (this._robotSpeechTimer) clearTimeout(this._robotSpeechTimer);
    this._robotSpeechTimer = setTimeout(() => {
      if (this.robotSpeechEl) this.robotSpeechEl.classList.remove('show');
    }, duration);
  }

  _addNewWord() {
    if (this.words.length >= CFG.MAX_WORDS) return;
    const pool = getPoolForTime(this.elapsed);

    // Active words currently in play
    const activeWords = new Set(this.words.map(w => w.word));
    let available = pool.filter(w => !this.usedWords.has(w) && !activeWords.has(w));

    // Recycle pool if exhausted
    if (available.length === 0) {
      this.usedWords = new Set(activeWords);
      available = pool.filter(w => !activeWords.has(w));
      if (!available.length) available = [...pool];
    }

    const word = available[Math.floor(Math.random() * available.length)];
    this.usedWords.add(word);
    this._robotThrowWord(word);
    semanticEngine.embed(word).catch(() => {});
  }

  /* ── Create word row element ──────────────────────── */
  _createWordEl(word, id) {
    const row = document.createElement('div');
    row.className  = 'word-row';
    row.dataset.id = id;
    row.innerHTML  = `
      <span class="row-arrow empty"></span>
      <span class="word-text">${word}</span>
      <span class="target-tag">TARGET</span>
    `;
    return row;
  }

  /* ── Target Indicator: words[0] = Topmost = TARGET ─── */
  _updateTargetIndicators() {
    this.words.forEach((w, i) => {
      const arrowEl = w.el.querySelector('.row-arrow');
      w.el.classList.remove('target', 'secondary');

      if (i === 0) {
        // TOPMOST = TARGET (closest to ceiling)
        arrowEl.textContent = '▶';
        arrowEl.className   = 'row-arrow';
        w.el.classList.add('target');
      } else if (i === 1) {
        // SECONDARY (next in line)
        arrowEl.textContent = '▷';
        arrowEl.className   = 'row-arrow dim';
        w.el.classList.add('secondary');
      } else {
        arrowEl.textContent = '';
        arrowEl.className   = 'row-arrow empty';
      }
    });
  }

  /* ── Handle player submission ─────────────────────── */
  _normalizeWord(s) {
    let w = String(s || '').toLowerCase().trim().replace(/[^a-z]/g, '');
    // Light stemming so "cats" can't clear "cat", "berries" can't clear "berry"
    if (w.endsWith('ies') && w.length > 4) w = w.slice(0, -3) + 'y';
    else if (w.endsWith('es') && w.length > 4) w = w.slice(0, -2);
    else if (w.endsWith('s') && w.length > 3) w = w.slice(0, -1);
    return w;
  }

  _isBoardWord(clue) {
    const n = this._normalizeWord(clue);
    if (!n) return false;
    return this.words.some((w) => {
      const b = this._normalizeWord(w.word);
      if (n === b) return true;
      // Block trivial substring cheats on longer words (e.g. "cat" vs "catsup" no, but "catfish" containing "cat" is legit — so only block near-equal lengths)
      if (Math.abs(n.length - b.length) <= 1 && (n.includes(b) || b.includes(n))) return true;
      return false;
    });
  }

  async _onSubmit() {
    if (!this.running || this._paused || this.submitting || this.over || this.words.length === 0) return;

    const clue = this.inputEl.value.trim().toLowerCase();
    if (!clue) return;
    if (clue.length < 2) {
      this._showFeedback('✏️ Type at least 2 letters for a clue', 'var(--warn)');
      this._inputFlash('near-miss');
      return;
    }

    // Exploit check: block the board word itself AND trivial morphological variants
    if (this._isBoardWord(clue)) {
      this._showFeedback('⚠️ Enter a clue or association, not the word itself!', 'var(--warn)');
      this._inputFlash('near-miss');
      audio.nearMiss();
      return;
    }

    this.submitting = true;
    this.submitEl.disabled = true;
    this.submitEl.classList.add('loading');
    this._submitLabel = this.submitEl.textContent;
    this.submitEl.textContent = '…';
    this.inputEl.disabled  = true;

    try {
      const wordList = this.words.map(w => w.word);
      const results  = await semanticEngine.findMatches(clue, wordList);
      await this._processResults(clue, results);
    } catch (e) {
      console.error('[Arcade] Semantic error:', e);
      this._showFeedback('⚠️ AI thinking... try again', 'var(--warn)');
    }

    this.inputEl.value     = '';
    this.inputEl.disabled  = false;
    this.submitEl.disabled = false;
    this.submitEl.classList.remove('loading');
    if (this._submitLabel !== undefined) this.submitEl.textContent = this._submitLabel;
    this.submitting        = false;
    try {
      if (window.matchMedia && window.matchMedia('(hover: hover)').matches) this.inputEl.focus();
    } catch { this.inputEl.focus(); }
  }

  /* ── Process semantic results ─────────────────────── */
  async _processResults(clue, results) {
    if (!results || results.length === 0) return;

    const hits = results.filter(r => r.score >= THRESHOLD_GOOD);
    const top  = results[0];

    if (hits.length === 0) {
      if (top && top.score >= THRESHOLD_NEAR_MISS) {
        this._onNearMiss(top, clue);
      } else {
        this._onMiss();
      }
      return;
    }

    // Topmost target word is words[0]
    const targetWord    = this.words[0]?.word;
    const clearedTarget = hits.some(h => h.word === targetWord);

    const isPerfect = hits.some(h => h.score >= THRESHOLD_PERFECT);

    // Per-hit base points, then a shared combo multiplier so floats match the score
    const bases = hits.map((hit) => hit.score >= THRESHOLD_PERFECT
      ? CFG.PTS_GOOD + CFG.PTS_PERFECT_BONUS
      : CFG.PTS_GOOD);
    let mult = 1;
    if (hits.length >= 3) mult = 2.0;
    else if (hits.length === 2) mult = 1.5;
    const finals = bases.map((b) => Math.round(b * mult));
    let pts = finals.reduce((a, b) => a + b, 0);

    // Staggered clearance of hits with truthful floats
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      if (i > 0) await new Promise(res => setTimeout(res, 55));
      this._clearWord(hit.word, hit.score >= THRESHOLD_PERFECT, finals[i]);
    }

    // Relieve stack pressure on hit (DOM shrink already drops the stack,
    // so only a small extra relief — was 0.7× and felt floaty / double-counted)
    this.stackOffset = Math.max(0, this.stackOffset - CFG.ROW_HEIGHT * hits.length * 0.3);
    this._applyStackTransform();

    if (clearedTarget) {
      pts += CFG.PTS_TARGET_BONUS;
    }

    // Multi-clear combo multiplier (already baked into floats above)
    if (hits.length >= 3) {
      this.comboCount = hits.length;
      this._showCombo(`×2 COMBO`);
      audio.combo(2);
    } else if (hits.length === 2) {
      this.comboCount = 2;
      this._showCombo(`×1.5 COMBO`);
      audio.combo(1);
    }

    // Rapid-clear speed bonus (< 2s)
    const now = Date.now();
    if (now - this.lastClearTime < 2000 && this.lastClearTime > 0) {
      pts += CFG.PTS_SPEED_BONUS;
    }
    this.lastClearTime = now;

    // Streak count
    this.streak++;
    if (this.streak > this.maxStreak) this.maxStreak = this.streak;
    this._renderStreakDots();
    this._recalculateSpeeds();

    if (this.streak === 2) {
      this._robotSay('⚡ SPEED UP!', 1100);
    }

    if (this.streak >= CFG.STREAK_TARGET) {
      pts += CFG.PTS_STREAK_BONUS;
      this._triggerStreakClear();
      this.streak = 0;
      this._renderStreakDots();
      this._recalculateSpeeds();
    }

    this._showSimBar(top.score, isPerfect);

    if (isPerfect) {
      this._showFeedback(
        `🔥 Perfect! "${top.word}" ${hits.length > 1 ? `+${hits.length - 1} more` : ''}`,
        'var(--cyan)'
      );
      audio.hitPerfect();
    } else {
      this._showFeedback(
        `✅ Hit! "${top.word}" ${hits.length > 1 ? `+${hits.length - 1} more` : ''}`,
        'var(--success)'
      );
      audio.hitGood();
    }

    this._inputFlash('success');
    this._addScore(pts);
  }

  /* ── Clear single word with animation & particle burst ── */
  _clearWord(word, perfect = false, pts = null) {
    const entry = this.words.find(w => w.word === word);
    if (!entry) return;

    // Particle burst coordinates
    const rect     = entry.el.getBoundingClientRect();
    const areaRect = this.stackArea.getBoundingClientRect();
    const px       = rect.left - areaRect.left + rect.width / 2;
    const py       = rect.top  - areaRect.top  + rect.height / 2;
    const color    = perfect ? '#00D4FF' : '#A78BFA';

    this.particles.spawn(px, py, color, perfect ? 28 : 16);
    const label = pts !== null && pts !== undefined ? `+${pts}` : (perfect ? '+155' : '+100');
    this._spawnScoreFloat(px, py, label, perfect ? 'var(--cyan)' : 'var(--purple)');

    // Animate row out with safety fallback
    entry.el.classList.add('clearing');
    const removeRow = () => {
      if (entry.el.parentNode) entry.el.remove();
    };
    entry.el.addEventListener('animationend', removeRow, { once: true });
    setTimeout(removeRow, 420);

    // Remove from array and recycle word back into pool
    this.words = this.words.filter(w => w !== entry);
    this.usedWords.delete(word);
    this._updateTargetIndicators();
  }

  /* ── Streak Clear — wipe board with shockwave ─────── */
  _triggerStreakClear() {
    audio.streakClear();
    const wordsCopy = [...this.words];

    // Freeze new spawns until the banner finishes so rows don't overlap the celebration
    this._freezeUntil = Date.now() + 1500;

    this.bannerEl.classList.remove('fire');
    void this.bannerEl.offsetWidth;
    this.bannerEl.classList.add('fire');

    if (this.robotCompanionEl) {
      this.robotCompanionEl.classList.add('celebrate');
      this._robotSay('🎉 STREAK CLEAR!', 1600);
      this._later(() => {
        if (this.robotCompanionEl) this.robotCompanionEl.classList.remove('celebrate');
      }, 1000);
    }

    wordsCopy.forEach((entry, i) => {
      this._later(() => {
        if (!entry.el.parentNode) return;
        const rect     = entry.el.getBoundingClientRect();
        const areaRect = this.stackArea.getBoundingClientRect();
        const px       = rect.left - areaRect.left + rect.width / 2;
        const py       = rect.top  - areaRect.top  + rect.height / 2;

        this.particles.spawn(px, py, '#00D4FF', 22);
        entry.el.classList.add('clearing');
        const rm = () => { if (entry.el.parentNode) entry.el.remove(); };
        entry.el.addEventListener('animationend', rm, { once: true });
        setTimeout(rm, 400);
      }, i * 50);
    });

    this.words       = [];
    this.stackOffset = 0;
    this._applyStackTransform();
    this.usedWords.clear();
    this._updateTargetIndicators();

    const bonus = wordsCopy.length * 85;
    this._addScore(bonus);
    this._spawnScoreFloat(
      this.stackArea.clientWidth / 2,
      this.stackArea.clientHeight / 2,
      `STREAK CLEAR! +${bonus}`,
      '#FFD700'
    );
  }

  /* ── Near miss ────────────────────────────────────── */
  _onNearMiss(top, clue = '') {
    this.streak = 0;
    this._renderStreakDots();
    this._recalculateSpeeds();

    const entry = this.words.find(w => w.word === top.word);
    if (entry) {
      entry.el.classList.remove('near-miss-anim');
      void entry.el.offsetWidth;
      entry.el.classList.add('near-miss-anim');
      entry.el.addEventListener('animationend', () => entry.el.classList.remove('near-miss-anim'), { once: true });
    }

    this._showSimBar(top.score, false);

    const clueList = SAMPLE_CLUES[top.word];
    let feedback = `⚠️ Close! Try something more specific to "${top.word}"`;
    if (clueList && clueList.length) {
      const hint = clueList[Math.floor(Math.random() * clueList.length)];
      feedback = `⚠️ Close to "${top.word}"! Hint: "${hint}"`;
    }

    this._showFeedback(feedback, 'var(--warn)');
    this._inputFlash('near-miss');
    audio.nearMiss();

    // Async Gemini explanation for nuanced contextual relation
    if (clue) {
      geminiService.analyzeRelation(clue, top.word).then(rel => {
        if (rel && rel.explanation && this.feedbackEl && this.feedbackEl.textContent.includes(top.word)) {
          this._showFeedback(`⚠️ ${rel.relationship}: "${top.word}" — ${rel.explanation}`, 'var(--warn)');
        }
      }).catch(() => {});
    }
  }

  /* ── Miss ─────────────────────────────────────────── */
  _onMiss() {
    this.streak = 0;
    this._renderStreakDots();
    this._recalculateSpeeds();
    this._showFeedback('❌ No match found — try another clue', 'var(--danger)');
    this._inputFlash('error');
    audio.miss();
  }

  /* ── UI Helpers ───────────────────────────────────── */
  _addScore(pts) {
    this.score += pts;
    this.scoreEl.textContent = this.score.toLocaleString();
    this.scoreEl.classList.remove('bounce');
    void this.scoreEl.offsetWidth;
    this.scoreEl.classList.add('bounce');
  }

  _updateTimer() {
    const m = Math.floor(this.elapsed / 60).toString().padStart(2, '0');
    const s = (this.elapsed % 60).toString().padStart(2, '0');
    this.timerEl.textContent = `${m}:${s}`;
  }

  _showFeedback(msg, color = 'var(--muted)') {
    this.feedbackEl.textContent = msg;
    this.feedbackEl.style.color = color;
    clearTimeout(this._fbTimer);
    this._fbTimer = setTimeout(() => {
      this.feedbackEl.textContent = '';
      this.feedbackEl.style.color = 'var(--muted)';
    }, 2800);
  }

  _inputFlash(type) {
    this.inputEl.classList.remove('success', 'error', 'near-miss');
    void this.inputEl.offsetWidth;
    this.inputEl.classList.add(type);
    setTimeout(() => this.inputEl.classList.remove(type), 600);
  }

  _showSimBar(score, perfect) {
    // sim-indicator only exists in arcade.html — skip silently on participant.html
    if (!this.simEl || !this.simFillEl || !this.simPctEl) return;
    // Show the true cosine similarity as a percentage (was a fake (score+0.1)*100 scale)
    const pct = Math.max(0, Math.min(100, Math.round(score * 100)));
    const color = perfect
      ? 'var(--cyan)'
      : score >= THRESHOLD_GOOD
        ? 'var(--success)'
        : 'var(--warn)';

    this.simFillEl.style.width           = `${pct}%`;
    this.simFillEl.style.backgroundColor = color;
    this.simPctEl.textContent            = `${pct}%`;
    this.simPctEl.style.color            = color;
    this.simEl.classList.add('show');

    clearTimeout(this._simTimer);
    this._simTimer = setTimeout(() => this.simEl.classList.remove('show'), 2600);
  }

  _showCombo(label) {
    this.comboEl.textContent = label;
    this.comboEl.classList.add('show');
    clearTimeout(this._comboTimer);
    this._comboTimer = setTimeout(() => this.comboEl.classList.remove('show'), 1600);
  }

  _renderStreakDots() {
    if (!this.streakDotsEl) return;
    this.streakDotsEl.innerHTML = '';
    for (let i = 0; i < CFG.STREAK_TARGET; i++) {
      const dot = document.createElement('div');
      dot.className = 'streak-dot' + (i < this.streak ? ' lit' : '');
      this.streakDotsEl.appendChild(dot);
    }
  }

  _spawnScoreFloat(x, y, text, color = 'var(--cyan)') {
    const el = document.createElement('div');
    el.className       = 'score-float';
    el.textContent     = text;
    el.style.left      = `${x}px`;
    el.style.top       = `${y}px`;
    el.style.color     = color;
    el.style.textShadow = `0 0 12px ${color}`;
    this.stackArea.appendChild(el);

    const rm = () => { if (el.parentNode) el.remove(); };
    el.addEventListener('animationend', rm, { once: true });
    setTimeout(rm, 900);
  }

  /* ── End game ─────────────────────────────────────── */
  _endGame() {
    if (this.over) return;
    this.over    = true;
    this.running = false;

    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._timerInterval) clearInterval(this._timerInterval);
    audio.gameOver();

    if (this.robotCompanionEl) {
      this.robotCompanionEl.classList.remove('throwing', 'charging', 'celebrate');
      this.robotCompanionEl.classList.add('danger-mode');
      this._robotSay('💥 GAME OVER!', 2000);
    }

    const isNew = saveScore('arcade', this.score, {
      time   : this.elapsed,
      bestStreak: this.maxStreak,
      streaks: this.maxStreak,
    });
    const best = getHighScore('arcade');

    // Save to Club Team Leaderboard
    const activeTeam = getActiveTeam();
    const lbResult = saveLeaderboardEntry({
      teamName: activeTeam.name,
      badge: activeTeam.badge,
      score: this.score,
      time: this.elapsed,
      maxStreak: this.maxStreak
    });

    const teamPill = document.getElementById('go-team-pill');
    if (teamPill) {
      const iconEl = document.getElementById('go-team-icon');
      const nameEl = document.getElementById('go-team-name');
      const rankEl = document.getElementById('go-rank-badge');
      if (iconEl) iconEl.textContent = activeTeam.badge;
      if (nameEl) nameEl.textContent = activeTeam.name;
      if (rankEl) rankEl.textContent = `🏆 Rank #${lbResult.rank}`;
      teamPill.style.display = 'inline-flex';
    }

    const goScore = document.getElementById('go-score');
    if (goScore) goScore.textContent = this.score.toLocaleString();

    const goBest = document.getElementById('go-best');
    if (goBest) goBest.textContent = `Best: ${best.toLocaleString()}`;

    const goTime = document.getElementById('go-time');
    if (goTime) goTime.textContent = `${Math.floor(this.elapsed / 60)}:${(this.elapsed % 60).toString().padStart(2, '0')}`;

    const goStreaks = document.getElementById('go-streaks');
    if (goStreaks) goStreaks.textContent = this.maxStreak;

    const newBestEl = document.getElementById('go-new-best');
    if (newBestEl) newBestEl.style.display = isNew ? 'inline-block' : 'none';

    setTimeout(() => {
      if (this.overlayEl) {
        this.overlayEl.classList.add('visible', 'active');
      }
    }, 500);
  }

  _updateHUDTeam() {
    const active = getActiveTeam();
    const iconEl = document.getElementById('hud-team-badge');
    const nameEl = document.getElementById('hud-team-name');
    if (iconEl) iconEl.textContent = active.badge;
    if (nameEl) nameEl.textContent = active.name;
  }

  /* ── Cleanup to prevent listener & RAF leaks ───────── */
  destroy() {
    this.running = false;
    this.over    = true;
    this._paused = false;

    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._timerInterval) clearInterval(this._timerInterval);
    if (this._fbTimer) clearTimeout(this._fbTimer);
    if (this._simTimer) clearTimeout(this._simTimer);
    if (this._comboTimer) clearTimeout(this._comboTimer);
    if (this._robotSpeechTimer) clearTimeout(this._robotSpeechTimer);
    for (const id of this._pendingTimeouts) clearTimeout(id);
    this._pendingTimeouts.clear();

    if (this.inputEl) this.inputEl.removeEventListener('keydown', this._boundKeyDown);
    if (this.submitEl) this.submitEl.removeEventListener('click', this._boundSubmitClick);
    document.removeEventListener('visibilitychange', this._boundVisibility);

    if (this.particles) this.particles.destroy();
  }
}
