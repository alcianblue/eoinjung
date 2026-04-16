/**
 * hangul.js — 한글 자모 분리 / 조합 유틸리티
 */

const CHO  = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
const JUNG = ['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ'];
const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

// 겹받침을 단자음 두 개로 분해하는 맵
const JONG_SPLIT = {
  'ㄳ': ['ㄱ','ㅅ'], 'ㄵ': ['ㄴ','ㅈ'], 'ㄶ': ['ㄴ','ㅎ'],
  'ㄺ': ['ㄹ','ㄱ'], 'ㄻ': ['ㄹ','ㅁ'], 'ㄼ': ['ㄹ','ㅂ'],
  'ㄽ': ['ㄹ','ㅅ'], 'ㄾ': ['ㄹ','ㅌ'], 'ㄿ': ['ㄹ','ㅍ'],
  'ㅀ': ['ㄹ','ㅎ'], 'ㅄ': ['ㅂ','ㅅ'],
};

/**
 * 완성형 한글 한 글자를 { cho, jung, jong } 으로 분해
 * @param {string} char
 * @returns {{ cho: string, jung: string, jong: string }}
 */
function decompose(char) {
  const code = char.charCodeAt(0) - 0xAC00;
  if (code < 0 || code > 11171) return { cho: char, jung: '', jong: '' };
  const choIdx  = Math.floor(code / 28 / 21);
  const jungIdx = Math.floor(code / 28) % 21;
  const jongIdx = code % 28;
  return {
    cho:  CHO[choIdx],
    jung: JUNG[jungIdx],
    jong: JONG[jongIdx],   // '' if no final consonant
  };
}

/**
 * 단어(5글자)를 자모 배열로 분해
 * @param {string} word
 * @returns {Array<{ cho: string, jung: string, jong: string }>}
 */
function decomposeWord(word) {
  return [...word].map(decompose);
}

/**
 * 한 글자가 완성형 한글인지 확인
 */
function isComplete(char) {
  const code = char.charCodeAt(0);
  return code >= 0xAC00 && code <= 0xD7A3;
}

/**
 * 자모 조합: 초성 인덱스 + 중성 인덱스 + 종성 인덱스 → 완성형 글자
 */
function compose(choIdx, jungIdx, jongIdx) {
  return String.fromCharCode(0xAC00 + choIdx * 21 * 28 + jungIdx * 28 + jongIdx);
}

/**
 * 현재 입력 버퍼(자모 배열)를 완성 글자 문자열로 조합
 * 예: ['ㅅ','ㅏ','ㄱ'] → '삭'
 * @param {string[]} jamos
 * @returns {string}
 */
function buildCurrentChar(jamos) {
  if (jamos.length === 0) return '';
  if (jamos.length === 1) {
    // 초성만 있는 경우: 자모 그대로 보여줌
    return jamos[0];
  }
  const choIdx  = CHO.indexOf(jamos[0]);
  const jungIdx = JUNG.indexOf(jamos[1]);
  if (choIdx === -1 || jungIdx === -1) return jamos.join('');
  const jongIdx = jamos[2] ? JONG.indexOf(jamos[2]) : 0;
  if (jongIdx === -1) return jamos.join('');
  return compose(choIdx, jungIdx, jongIdx < 0 ? 0 : jongIdx);
}

/**
 * 자모가 초성으로 사용 가능한지
 */
function isCho(j)  { return CHO.includes(j); }
/**
 * 자모가 중성으로 사용 가능한지
 */
function isJung(j) { return JUNG.includes(j); }
/**
 * 자모가 종성으로 사용 가능한지 (빈 문자열 제외)
 */
function isJong(j) { return j !== '' && JONG.includes(j); }

// 종성에서 뒤 자음을 다음 글자 초성으로 옮기는 처리
// 예: '삭' + 'ㅏ' → '사' + 'ㄱ' 조합 시작
function splitJongForNext(jongChar) {
  if (JONG_SPLIT[jongChar]) return JONG_SPLIT[jongChar]; // 겹받침
  return [null, jongChar]; // 단받침: 앞 글자는 받침 없음, 뒤는 초성
}

window.Hangul = { decompose, decomposeWord, isComplete, compose, buildCurrentChar,
                  isCho, isJung, isJong, splitJongForNext,
                  CHO, JUNG, JONG, JONG_SPLIT };
