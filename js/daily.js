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

/** 다음 자정(KST)까지 남은 시간을 "HH:MM:SS" 형식으로 반환 */
function getTimeUntilNextWord() {
  const now = new Date();
  const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  const next = new Date(kst);
  next.setDate(next.getDate() + 1);
  next.setHours(0, 0, 0, 0);
  const diff = next - kst;
  const h = String(Math.floor(diff / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

window.Daily = { getDailyWord, getDailyNumber, getDayIndex, getTimeUntilNextWord };
