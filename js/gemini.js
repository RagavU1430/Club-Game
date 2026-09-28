// js/gemini.js — Google Gemini AI Semantic Engine & Word Relation Analyzer

export const GEMINI_CONFIG = {
  apiKey: localStorage.getItem('wordwave_gemini_key') || '',
  modelFlash: 'gemini-2.5-flash',
  modelEmbedding: 'gemini-embedding-001',
  apiBase: 'https://generativelanguage.googleapis.com/v1beta/models'
};

class GeminiService {
  constructor() {
    this.cache = new Map();
    this.embedCache = new Map();
    this.enabled = true;
  }

  get key() {
    return localStorage.getItem('wordwave_gemini_key') || GEMINI_CONFIG.apiKey;
  }

  setKey(newKey) {
    if (newKey) {
      localStorage.setItem('wordwave_gemini_key', newKey.trim());
    } else {
      localStorage.removeItem('wordwave_gemini_key');
    }
  }

  /**
   * Deeply analyze semantic relationship between a clue and a target word.
   * Returns: { score: 0.0 - 1.0, relationship: string, explanation: string }
   */
  async analyzeRelation(clue, word) {
    const cacheKey = `${clue.toLowerCase()}::${word.toLowerCase()}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

    const prompt = `You are a semantic word association referee for a word game.
Analyze the conceptual semantic relationship between the player's CLUE: "${clue}" and the TARGET WORD: "${word}".

Evaluate how closely they are associated in meaning, context, synonymy, category, function, or cultural association.
Score from 0.00 (completely unrelated) to 1.00 (identical or perfect direct association).
Criteria:
- >= 0.85: Direct synonym, defining attribute, or quintessential association (e.g. "whisker" -> "cat", "flame" -> "fire").
- 0.55 - 0.84: Solid contextual or categorical association (e.g. "beach" -> "ocean", "bark" -> "tree").
- 0.30 - 0.54: Distant or tangential connection.
- < 0.30: Unrelated or weak coincidence.

Output JSON with keys:
- "score": number between 0.0 and 1.0
- "relationship": string (e.g. "Synonym", "Defining Feature", "Contextual", "Tangential", "Unrelated")
- "explanation": brief 1-sentence explanation of the conceptual connection.`;

    try {
      const url = `${GEMINI_CONFIG.apiBase}/${GEMINI_CONFIG.modelFlash}:generateContent?key=${this.key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawText);

      const result = {
        score: Math.max(0, Math.min(1, Number(parsed.score) || 0)),
        relationship: parsed.relationship || 'Association',
        explanation: parsed.explanation || ''
      };

      this.cache.set(cacheKey, result);
      return result;
    } catch (e) {
      console.warn('[Gemini] Relation analysis failed, falling back:', e);
      return null;
    }
  }

  /**
   * Batch evaluate a clue against a list of active words on the board.
   * Returns sorted list of matches: [{ word, score, relationship, explanation }]
   */
  async matchClueAgainstBoard(clue, words) {
    if (!words || words.length === 0) return [];

    const prompt = `You are a semantic word association referee for the word game WordWave.
The player submitted the CLUE: "${clue}".
Evaluate this clue against all the following TARGET WORDS on the board:
${JSON.stringify(words)}

For EACH target word, assign a semantic association score from 0.00 (completely unrelated) to 1.00 (perfect association).
Return a JSON array of objects, sorted descending by score:
[
  {
    "word": "target word",
    "score": 0.00 to 1.00,
    "relationship": "Synonym / Attribute / Category / Unrelated",
    "explanation": "brief explanation"
  }
]`;

    try {
      const url = `${GEMINI_CONFIG.apiBase}/${GEMINI_CONFIG.modelFlash}:generateContent?key=${this.key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(rawText);

      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => b.score - a.score);
      }
      return [];
    } catch (e) {
      console.warn('[Gemini] Board matching failed, falling back to local vectors:', e);
      return [];
    }
  }

  /**
   * Generate creative clues, associations and trivia for any given word.
   */
  async generateCluesForWord(word, count = 6) {
    const prompt = `Give ${count} creative, high-quality semantic clues or associations for the word: "${word}".
Return JSON array of strings: ["clue1", "clue2", ...]`;

    try {
      const url = `${GEMINI_CONFIG.apiBase}/${GEMINI_CONFIG.modelFlash}:generateContent?key=${this.key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(rawText);
    } catch (e) {
      console.warn('[Gemini] Clue generation failed:', e);
      return [];
    }
  }

  /**
   * Generate 3072-dimensional vector embedding using Google Gemini Embedding Model
   */
  async getEmbedding(text) {
    const key = text.toLowerCase().trim();
    if (this.embedCache.has(key)) return this.embedCache.get(key);

    try {
      const url = `${GEMINI_CONFIG.apiBase}/${GEMINI_CONFIG.modelEmbedding}:embedContent?key=${this.key}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: key }] }
        })
      });

      const data = await res.json();
      const values = data.embedding?.values;
      if (values) {
        const floatArray = new Float32Array(values);
        this.embedCache.set(key, floatArray);
        return floatArray;
      }
    } catch (e) {
      console.warn('[Gemini] Embedding error:', e);
    }
    return null;
  }
}

export const geminiService = new GeminiService();
