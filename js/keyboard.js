/**
 * keyboard.js — 가상 한글 키보드 (쌍자음 Shift 지원)
 */

// 쌍자음 매핑: 평자음 → 쌍자음
const SHIFT_MAP = { 'ㄱ':'ㄲ', 'ㄷ':'ㄸ', 'ㅂ':'ㅃ', 'ㅈ':'ㅉ', 'ㅅ':'ㅆ' };
const VOWELS    = new Set(['ㅏ','ㅐ','ㅑ','ㅒ','ㅓ','ㅔ','ㅕ','ㅖ','ㅗ','ㅘ','ㅙ','ㅚ','ㅛ','ㅜ','ㅝ','ㅞ','ㅟ','ㅠ','ㅡ','ㅢ','ㅣ']);

// 두벌식 자판 배열
const ROW1 = ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'];
const ROW2 = ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'];
const ROW3 = ['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ'];

let _shiftOn = false;

function buildKeyboard() {
  const row1     = document.getElementById('key-row-cho');
  const row2     = document.getElementById('key-row-jung');
  const jongRow  = document.getElementById('key-row-jong');
  const jongWrap = document.getElementById('key-row-jong-wrap');

  ROW1.forEach(j => row1.appendChild(makeKey(j)));
  ROW2.forEach(j => row2.appendChild(makeKey(j)));

  // ⇧ Shift 버튼을 받침 행 맨 앞에 삽입
  const shiftBtn = document.createElement('button');
  shiftBtn.className   = 'key shift-btn';
  shiftBtn.id          = 'key-shift';
  shiftBtn.textContent = '⇧';
  shiftBtn.title       = '쌍자음 (ㄲㄸㅃㅉㅆ)';
  shiftBtn.addEventListener('click', toggleShift);
  jongRow.insertBefore(shiftBtn, jongWrap);

  ROW3.forEach(j => jongWrap.appendChild(makeKey(j)));

  document.getElementById('key-enter').addEventListener('click', () => Game.submitGuess());
  document.getElementById('key-backspace').addEventListener('click', () => Game.inputBackspace());

  // 물리 키보드: Shift 키로 토글
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter')     { Game.submitGuess();    return; }
    if (e.key === 'Backspace') { Game.inputBackspace(); return; }
    if (e.key === 'Shift')     { setShift(true);        return; }
  });
  document.addEventListener('keyup', e => {
    if (e.key === 'Shift') setShift(false);
  });
}

function toggleShift() {
  setShift(!_shiftOn);
}

function setShift(on) {
  _shiftOn = on;
  const btn = document.getElementById('key-shift');
  if (btn) btn.classList.toggle('shift-active', on);

  // shift 상태에 따라 쌍자음 키 텍스트·dataset 변경
  document.querySelectorAll('.key[data-jamo]').forEach(k => {
    const base  = k.dataset.base  || k.dataset.jamo;
    const shift = SHIFT_MAP[base];
    if (!shift) return;
    k.dataset.base = base;  // 원래 자음 저장
    k.dataset.jamo = on ? shift : base;
    k.textContent  = on ? shift : base;
    k.classList.toggle('shifted', on);
  });
}

function makeKey(jamo) {
  const btn = document.createElement('button');
  btn.className      = 'key';
  btn.textContent    = jamo;
  btn.dataset.jamo   = jamo;
  if (VOWELS.has(jamo))     btn.dataset.vowel = 'true';
  if (SHIFT_MAP[jamo])      btn.dataset.base  = jamo;  // 쌍자음 전환 대상
  btn.addEventListener('click', () => {
    Game.inputJamo(btn.dataset.jamo);
    // 쌍자음 입력 후 Shift 자동 해제
    if (_shiftOn && SHIFT_MAP[btn.dataset.base]) setShift(false);
  });
  return btn;
}

/** 추측 결과에 따라 키보드 색상 업데이트 */
function updateKeyColors(guesses, results) {
  const priority = { correct: 3, present: 2, absent: 1 };
  const jamoState = {};  // jamo → best state

  guesses.forEach((word, gi) => {
    const decomp = Hangul.decomposeWord(word);
    const result = results[gi];
    decomp.forEach((d, i) => {
      ['cho','jung','jong'].forEach(p => {
        const jamo = d[p];
        if (!jamo) return;
        const st = result[i][p];
        if (!jamoState[jamo] || priority[st] > priority[jamoState[jamo]]) {
          jamoState[jamo] = st;
        }
      });
    });
  });

  document.querySelectorAll('.key[data-jamo]').forEach(btn => {
    const j = btn.dataset.jamo;
    const st = jamoState[j];
    btn.dataset.state = st || '';
  });
}

window.Keyboard = { buildKeyboard, updateKeyColors };
