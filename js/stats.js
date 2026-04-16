/**
 * stats.js — 통계 및 localStorage 관리
 */

const STATS_KEY  = 'kkordle_stats';
const RESULT_KEY = 'kkordle_result_';

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem(STATS_KEY)) || defaultStats();
  } catch { return defaultStats(); }
}

function defaultStats() {
  return {
    played: 0,
    wins: 0,
    streak: 0,
    maxStreak: 0,
    distribution: { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 },
  };
}

function saveStats(stats) {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

function recordResult(guesses, won) {
  const stats = loadStats();
  stats.played++;
  if (won) {
    stats.wins++;
    stats.streak++;
    stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
    stats.distribution[guesses]++;
  } else {
    stats.streak = 0;
  }
  saveStats(stats);
  return stats;
}

function saveDailyResult(dayIdx, guesses, won) {
  localStorage.setItem(RESULT_KEY + dayIdx, JSON.stringify({ guesses, won, ts: Date.now() }));
}

function loadDailyResult(dayIdx) {
  try {
    return JSON.parse(localStorage.getItem(RESULT_KEY + dayIdx));
  } catch { return null; }
}

window.Stats = { loadStats, saveStats, recordResult, saveDailyResult, loadDailyResult };
