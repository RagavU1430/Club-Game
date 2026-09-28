// js/semantic.js — Semantic similarity engine using Transformers.js

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm';


// Use CDN-hosted models only
env.allowLocalModels = true;
env.useBrowserCache = true;

// Hit thresholds — tuned for approachable, fun, and easy semantic matching
export const THRESHOLD_PERFECT = 0.58;  // perfect hit (rewarding high-similarity clues)
export const THRESHOLD_GOOD = 0.38;  // good hit (clears word smoothly for everyday associations)
export const THRESHOLD_NEAR_MISS = 0.25;  // near miss (informative hint shake)

class SemanticEngine {
  constructor() {
    this.embedder = null;
    this.cache = new Map();   // word → Float32Array (LRU-capped)
    this.ready = false;
    this._initPromise = null;
    this._fileProgress = new Map(); // file → 0-100, for aggregate progress
  }

  /**
   * Load the Transformers.js model.
   * Safe to call multiple times / concurrently — returns the same promise.
   * @param {Function} onProgress  called with { status, progress } during download (progress 0-100 overall)
   */
  async init(onProgress) {
    if (this.ready) {
      if (onProgress) { try { onProgress({ status: 'ready', progress: 100 }); } catch { } }
      return;
    }
    if (this._initPromise) return this._initPromise;
    this._initPromise = (async () => {
      try {
        const emit = (status, progress) => {
          if (onProgress) { try { onProgress({ status, progress }); } catch { } }
        };
        this.embedder = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
          {
            progress_callback: (ev) => {
              // Transformers.js emits per-file events:
              // {status:'initiate'|'progress'|'done'|'ready', file, progress, loaded, total}
              if (!ev || typeof ev !== 'object') return;
              const s = ev.status;
              if (s === 'initiate') {
                if (ev.file) this._fileProgress.set(ev.file, 0);
                emit('initiate', this._overallProgress());
              } else if (s === 'progress') {
                const p = typeof ev.progress === 'number' ? ev.progress : 0;
                if (ev.file) this._fileProgress.set(ev.file, p);
                emit('downloading', this._overallProgress());
              } else if (s === 'done') {
                if (ev.file) this._fileProgress.set(ev.file, 100);
                emit('downloading', this._overallProgress());
              } else if (s === 'ready') {
                emit('ready', 100);
              } else if (typeof ev.progress === 'number') {
                // Forward-compat: unknown status with numeric progress
                emit('downloading', Math.max(0, Math.min(100, ev.progress)));
              }
            },
          }
        );
        this.ready = true;
        if (onProgress) { try { onProgress({ status: 'ready', progress: 100 }); } catch { } }
      } catch (e) {
        this._initPromise = null;
        this._fileProgress.clear();
        console.error('[Semantic] Model load failed:', e);
        throw e;
      }
    })();
    return this._initPromise;
  }

  _overallProgress() {
    if (this._fileProgress.size === 0) return 0;
    let sum = 0;
    for (const v of this._fileProgress.values()) sum += Math.max(0, Math.min(100, v));
    return Math.round(sum / this._fileProgress.size);
  }

  /** Generate embedding vector for a word/phrase */
  async embed(text) {
    const key = String(text || '').toLowerCase().trim();
    if (!key) throw new Error('Cannot embed empty text');
    if (this.cache.has(key)) {
      // LRU refresh
      const v = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, v);
      return v;
    }
    if (!this.embedder) throw new Error('Model not loaded');
    const out = await this.embedder(key, { pooling: 'mean', normalize: true });
    const vec = out.data;           // Float32Array, 384 dims
    this.cache.set(key, vec);
    // Cap cache to avoid unbounded memory growth in long sessions
    if (this.cache.size > 600) {
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    return vec;
  }

  /** Cosine similarity — both vecs should be normalised (norm=1) */
  cosineSim(a, b) {
    if (!a || !b) return 0;
    let dot = 0;
    const len = Math.min(a.length, b.length);
    for (let i = 0; i < len; i++) dot += a[i] * b[i];
    if (isNaN(dot)) return 0;
    return Math.max(-1, Math.min(1, dot));
  }

  /**
   * Find similarity between clue and every word in the list.
   * Returns array sorted descending by score.
   */
  async findMatches(clue, words) {
    const clean = String(clue || '').toLowerCase().trim();
    if (!clean || !Array.isArray(words) || words.length === 0) return [];
    const clueVec = await this.embed(clean);
    // Embed all candidates in parallel (was sequential → 300-600ms freeze)
    const vecs = await Promise.all(
      words.map((w) => this.embed(String(w || '').toLowerCase()).catch(() => null))
    );
    const results = [];
    for (let i = 0; i < words.length; i++) {
      if (!vecs[i]) continue;
      const score = this.cosineSim(clueVec, vecs[i]);
      results.push({ word: words[i], score });
    }
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Pre-warm the cache for a set of words.
   * Call this with the initial game word set for zero-latency in-game.
   */
  async preloadWords(words, onStep) {
    const uniq = [...new Set((words || []).map((w) => String(w || '').toLowerCase().trim()).filter(Boolean))];
    // Small batches to warm quickly without hammering the model
    const BATCH = 4;
    for (let i = 0; i < uniq.length; i += BATCH) {
      const batch = uniq.slice(i, i + BATCH);
      await Promise.all(batch.map((w) => this.embed(w).catch(() => null)));
      if (onStep) onStep(Math.min(i + BATCH, uniq.length), uniq.length);
    }
  }

  /** Classify a score into a hit type */
  classify(score) {
    if (score >= THRESHOLD_PERFECT) return 'perfect';
    if (score >= THRESHOLD_GOOD) return 'good';
    if (score >= THRESHOLD_NEAR_MISS) return 'near-miss';
    return 'miss';
  }
}

export const semanticEngine = new SemanticEngine();
