// js/storage.js — High score persistence via localStorage

const KEY = 'wordwave_v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {};
  } catch { return {}; }
}

function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {}
}

export function getHighScore(mode) {
  return (load()[mode] || {}).best || 0;
}

export function saveScore(mode, score, stats = {}) {
  const data = load();
  if (!data[mode]) data[mode] = { best: 0, games: 0 };
  const safeScore = Number(score) || 0;
  const isNew = safeScore > 0 && safeScore > data[mode].best;
  if (isNew) data[mode].best = safeScore;
  data[mode].games = (data[mode].games || 0) + 1;
  // Store extra stats per mode
  if (mode === 'arcade') {
    // Longest survival wins — "best" time = longest time
    if (!data[mode].bestTime || (stats.time || 0) > data[mode].bestTime) {
      data[mode].bestTime = stats.time || 0;
    }
    // Max consecutive-hit streak in a single game (accept legacy `streaks` key too)
    const gameStreak = stats.bestStreak ?? stats.streaks ?? 0;
    if (!data[mode].bestStreak || gameStreak > data[mode].bestStreak) {
      data[mode].bestStreak = gameStreak;
    }
    // Legacy aggregate kept for backward-compat with old saves
    data[mode].totalStreaks = (data[mode].totalStreaks || 0) + gameStreak;
  }
  if (mode === 'blocks') {
    if (!data[mode].longestChain || stats.longestChain > data[mode].longestChain) {
      data[mode].longestChain = stats.longestChain || 0;
    }
  }
  save(data);
  return isNew;
}

export function getAllScores() {
  return load();
}

export function clearScores() {
  localStorage.removeItem(KEY);
}

/* ─── Team & Leaderboard Persistence ──────────────────── */
const TEAM_KEY        = 'wordwave_active_team';
const LEADERBOARD_KEY = 'wordwave_leaderboard';

// No pre-defined teams — board starts empty and only shows teams registered via the game page.
// Supports up to 50 teams (covers 30-team tournaments).
const LEGACY_SEED_IDS = ['lb_1', 'lb_2', 'lb_3'];

export function getActiveTeam() {
  try {
    const raw = localStorage.getItem(TEAM_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name) return parsed;
    }
  } catch {}
  return { name: '', badge: '⚡' };
}

export function setActiveTeam(name, badge = '⚡') {
  const team = {
    name: (name || '').trim().slice(0, 24),
    badge: badge || '⚡'
  };
  try {
    localStorage.setItem(TEAM_KEY, JSON.stringify(team));
  } catch {}
  return team;
}

export function getLeaderboard() {
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        // Drop legacy pre-defined seed entries (lb_1/2/3) so old browsers start clean.
        // Real registered teams have unique `lb_<timestamp>_*` ids and are kept.
        const cleaned = list.filter(e => !LEGACY_SEED_IDS.includes(e?.id));
        if (cleaned.length !== list.length) {
          try {
            localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(cleaned));
          } catch {}
        }
        return cleaned.sort((a, b) => b.score - a.score || b.time - a.time);
      }
    }
  } catch {}
  // Empty board — no pre-defined data. Entries appear only when teams register/play.
  return [];
}

export function saveLeaderboardEntry(entry) {
  const current = getLeaderboard();
  const safeScore = Number(entry.score) || 0;
  const newEntry = {
    id: 'lb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    teamName: (entry.teamName || 'Team Alpha').trim().slice(0, 24),
    badge: entry.badge || '⚡',
    score: safeScore,
    time: Number(entry.time) || 0,
    maxStreak: Number(entry.maxStreak) || 0,
    date: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    timestamp: Date.now()
  };

  current.push(newEntry);
  // Sort descending by score, then survival time
  current.sort((a, b) => b.score - a.score || b.time - a.time);
  const trimmed = current.slice(0, 50); // Keep top 50
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(trimmed));
  } catch {}

  const rank = trimmed.findIndex(item => item.id === newEntry.id) + 1;
  return { entry: newEntry, rank };
}

export function clearLeaderboard() {
  try {
    localStorage.removeItem(LEADERBOARD_KEY);
  } catch {}
}

export function deleteLeaderboardEntry(id) {
  try {
    const list = getLeaderboard().filter(item => item.id !== id);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(list));
    return list;
  } catch { return []; }
}

export function exportLeaderboardCSV() {
  const entries = getLeaderboard();
  const headers = ['Rank', 'Team Name', 'Badge', 'Score', 'Survival Time (s)', 'Max Streak', 'Date'];
  const rows = entries.map((e, idx) => [
    idx + 1,
    `"${(e.teamName || '').replace(/"/g, '""')}"`,
    `"${e.badge || ''}"`,
    e.score || 0,
    e.time || 0,
    e.maxStreak || 0,
    `"${e.date || ''}"`
  ]);
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
}

/* ─── Admin Authentication ────────────────────────────── */
const ADMIN_PASS_KEY    = 'wordwave_admin_password';
const ADMIN_SESSION_KEY = 'wordwave_admin_session';
const DEFAULT_ADMIN_PASS = 'admin123';

export function getAdminPassword() {
  try {
    return localStorage.getItem(ADMIN_PASS_KEY) || DEFAULT_ADMIN_PASS;
  } catch {
    return DEFAULT_ADMIN_PASS;
  }
}

export function setAdminPassword(newPassword) {
  if (!newPassword || newPassword.trim().length < 4) {
    throw new Error('Password must be at least 4 characters long');
  }
  try {
    localStorage.setItem(ADMIN_PASS_KEY, newPassword.trim());
    return true;
  } catch { return false; }
}

export function verifyAdminPassword(inputPassword) {
  const current = getAdminPassword();
  const valid = (inputPassword || '').trim() === current;
  if (valid) {
    try {
      sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    } catch {}
  }
  return valid;
}

export function isAdminAuthenticated() {
  try {
    return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function adminLogout() {
  try {
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  } catch {}
}

/* ─── Real-time Tournament Match Broadcast ─────────────── */
const MATCH_STATE_KEY = 'wordwave_match_state';

export function getMatchState() {
  try {
    const raw = localStorage.getItem(MATCH_STATE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    status: 'LOBBY', // 'LOBBY', 'COUNTDOWN', 'ACTIVE', 'PAUSED'
    round: 1,
    countdownDuration: 3,
    timestamp: Date.now(),
    message: 'Welcome to the tournament lobby'
  };
}

export function broadcastMatchState(stateUpdate) {
  const current = getMatchState();
  const next = {
    ...current,
    ...stateUpdate,
    timestamp: Date.now()
  };
  try {
    localStorage.setItem(MATCH_STATE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}


