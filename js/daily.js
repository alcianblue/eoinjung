/**
 * daily.js — 데일리 단어 결정 (서버 없이 날짜 기반)
 */

const EPOCH = new Date('2026-04-16T00:00:00+09:00');

function getDayIndex() {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const diff = kst - EPOCH;
  return Math.max(0, Math.floor(diff / 86400000));
}

function getDailyWord() {
  const idx = getDayIndex() % ANSWER_WORDS.length;
  return ANSWER_WORDS[idx];
}

function getDailyNumber() {
  return getDayIndex() + 1;
}

window.Daily = { getDailyWord, getDailyNumber, getDayIndex };
