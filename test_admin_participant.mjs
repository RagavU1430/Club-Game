// Test admin and storage functions
import {
  getAdminPassword,
  setAdminPassword,
  verifyAdminPassword,
  isAdminAuthenticated,
  adminLogout,
  getMatchState,
  broadcastMatchState,
  exportLeaderboardCSV,
  getLeaderboard,
  saveLeaderboardEntry,
  deleteLeaderboardEntry
} from './js/storage.js';

// Setup mock window/localStorage/sessionStorage
globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

globalThis.sessionStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; }
};

console.log('Testing Default Admin Password...');
const defaultPass = getAdminPassword();
console.log('Default Pass:', defaultPass);
if (defaultPass !== 'RagavDeepika1430@') throw new Error('Expected RagavDeepika1430@');

console.log('Testing Password Verification...');
if (!verifyAdminPassword('RagavDeepika1430@')) throw new Error('Default password should verify');
if (verifyAdminPassword('wrongpass')) throw new Error('Wrong password should fail');

console.log('Testing Admin Session...');
if (!isAdminAuthenticated()) throw new Error('Should be authenticated after verify');
adminLogout();
if (isAdminAuthenticated()) throw new Error('Should not be authenticated after logout');

console.log('Testing Password Update...');
setAdminPassword('supersecret2026');
if (getAdminPassword() !== 'supersecret2026') throw new Error('Password update failed');
if (!verifyAdminPassword('supersecret2026')) throw new Error('New password should verify');

console.log('Testing Match State Broadcast...');
const state1 = getMatchState();
console.log('Initial State:', state1.status);
const broadcasted = broadcastMatchState({ status: 'COUNTDOWN', message: 'Ready!' });
if (broadcasted.status !== 'COUNTDOWN' || broadcasted.message !== 'Ready!') {
  throw new Error('Broadcast match state failed');
}

console.log('Testing Leaderboard CSV Export...');
const csv = exportLeaderboardCSV();
console.log('CSV Preview:\n' + csv.split('\n').slice(0, 3).join('\n'));

console.log('ALL STORAGE & ADMIN TESTS PASSED! 🎉');
