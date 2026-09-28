// js/semantic.js — Semantic similarity engine using Transformers.js

import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm';


// Use CDN-hosted models only
env.allowLocalModels = false;
env.useBrowserCache = true;

// Hit thresholds — tuned for approachable, fun, and easy semantic matching
export const THRESHOLD_PERFECT = 0.58;  // perfect hit (rewarding high-similarity clues)
export const THRESHOLD_GOOD = 0.38;  // good hit (clears word smoothly for everyday associations)
export const THRESHOLD_NEAR_MISS = 0.25;  // near miss (informative hint shake)

class SemanticEngine {
  constructor() {
    this.embedder = null;
    this.cache = new Map();   // word → Float32Array (LRU-capped)
    this._pending = new Map(); // word → Promise<Float32Array> for concurrent in-flight deduplication
    this.ready = false;
    this._initPromise = null;
    this._listeners = new Set();
    this._fileProgress = new Map(); // file → { progress, loaded, total }
    this._lastProgress = 0;
  }

  /**
   * Load the Transformers.js model.
   * Safe to call multiple times / concurrently — returns the same promise.
   * @param {Function} onProgress  called with { status, progress } during download (progress 0-100 overall)
   */
  async init(onProgress) {
    if (onProgress) this._listeners.add(onProgress);

    if (this.ready) {
      this._emit('ready', 100);
      return;
    }
    if (this._initPromise) return this._initPromise;

    this._initPromise = (async () => {
      try {
        this.embedder = await pipeline(
          'feature-extraction',
          'Xenova/all-MiniLM-L6-v2',
          {
            progress_callback: (ev) => {
              if (!ev || typeof ev !== 'object') return;
              const s = ev.status;
              const file = ev.file || 'unknown';

              if (s === 'initiate') {
                this._fileProgress.set(file, { progress: 0, loaded: 0, total: ev.total || 0 });
                this._emit('initiate', this._overallProgress());
              } else if (s === 'progress') {
                const p = typeof ev.progress === 'number' ? ev.progress : 0;
                this._fileProgress.set(file, { progress: p, loaded: ev.loaded || 0, total: ev.total || 0 });
                this._emit('downloading', this._overallProgress());
              } else if (s === 'done') {
                this._fileProgress.set(file, { progress: 100, loaded: ev.total || 1, total: ev.total || 1 });
                this._emit('downloading', this._overallProgress());
              } else if (s === 'ready') {
                this._lastProgress = 100;
                this._emit('ready', 100);
              } else if (typeof ev.progress === 'number') {
                this._emit('downloading', Math.max(this._lastProgress, Math.min(100, Math.round(ev.progress))));
              }
            },
          }
        );
        this.ready = true;
        this._lastProgress = 100;
        this._emit('ready', 100);
      } catch (e) {
        this._initPromise = null;
        this._fileProgress.clear();
        this._lastProgress = 0;
        console.error('[Semantic] Model load failed:', e);
        throw e;
      }
    })();
    return this._initPromise;
  }

  _emit(status, progress) {
    for (const cb of this._listeners) {
      try { cb({ status, progress }); } catch {}
    }
  }

  _overallProgress() {
    if (this._fileProgress.size === 0) return this._lastProgress;
    let totalLoaded = 0;
    let totalBytes = 0;
    let fileSum = 0;

    for (const [file, info] of this._fileProgress.entries()) {
      if (info.total > 0) {
        totalLoaded += info.loaded;
        totalBytes += info.total;
      }
      // Weight ONNX model heavily if byte totals aren't yet populated
      const weight = file.includes('onnx') ? 5 : 1;
      fileSum += Math.max(0, Math.min(100, info.progress)) * weight;
    }

    let calculated = 0;
    if (totalBytes > 0) {
      calculated = Math.round((totalLoaded / totalBytes) * 100);
    } else {
      let totalWeight = 0;
      for (const file of this._fileProgress.keys()) {
        totalWeight += file.includes('onnx') ? 5 : 1;
      }
      calculated = totalWeight > 0 ? Math.round(fileSum / totalWeight) : 0;
    }

    // Keep progress strictly monotonic so bar never retreats
    this._lastProgress = Math.max(this._lastProgress, Math.min(99, calculated));
    return this._lastProgress;
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
    // Deduplicate in-flight requests for the same word
    if (this._pending.has(key)) {
      return this._pending.get(key);
    }

    if (!this.embedder) {
      if (this._initPromise) {
        await this._initPromise;
      } else {
        await this.init();
      }
    }
    if (!this.embedder) throw new Error('Model not loaded');

    const promise = (async () => {
      try {
        const out = await this.embedder(key, { pooling: 'mean', normalize: true });
        const vec = out.data;           // Float32Array, 384 dims
        this.cache.set(key, vec);
        // Cap cache to avoid unbounded memory growth in long sessions
        if (this.cache.size > 600) {
          const oldest = this.cache.keys().next().value;
          this.cache.delete(oldest);
        }
        return vec;
      } finally {
        this._pending.delete(key);
      }
    })();

    this._pending.set(key, promise);
    return promise;
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

    // Embed clue and candidate words in parallel
    const [clueVec, ...vecs] = await Promise.all([
      this.embed(clean),
      ...words.map((w) => {
        const str = String(w || '').toLowerCase().trim();
        return str ? this.embed(str).catch(() => null) : Promise.resolve(null);
      })
    ]);

    if (!clueVec) return [];

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

const globalEngine = (typeof globalThis !== 'undefined' && globalThis.__semanticEngine) || new SemanticEngine();
if (typeof globalThis !== 'undefined') globalThis.__semanticEngine = globalEngine;
export const semanticEngine = globalEngine;
