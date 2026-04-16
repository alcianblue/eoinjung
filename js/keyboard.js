/**
 * keyboard.js — 가상 한글 키보드
 */

const CHO_KEYS  = ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ',
                   'ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ',
                   'ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ'];

// 표준 두벌식 자판 배열
const ROW1 = ['ㅂ','ㅈ','ㄷ','ㄱ','ㅅ','ㅛ','ㅕ','ㅑ','ㅐ','ㅔ'];
const ROW2 = ['ㅁ','ㄴ','ㅇ','ㄹ','ㅎ','ㅗ','ㅓ','ㅏ','ㅣ'];
const ROW3 = ['ㅋ','ㅌ','ㅊ','ㅍ','ㅠ','ㅜ','ㅡ'];

function buildKeyboard() {
  const row1 = document.getElementById('key-row-cho');
  const row2 = document.getElementById('key-row-jung');
  const jongWrap = document.getElementById('key-row-jong-wrap');

  ROW1.forEach(j => row1.appendChild(makeKey(j)));
  ROW2.forEach(j => row2.appendChild(makeKey(j)));
  ROW3.forEach(j => jongWrap.appendChild(makeKey(j)));

  document.getElementById('key-enter').addEventListener('click', () => Game.submitGuess());
  document.getElementById('key-backspace').addEventListener('click', () => Game.inputBackspace());

  // 물리 키보드 지원
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    if (e.key === 'Enter') { Game.submitGuess(); return; }
    if (e.key === 'Backspace') { Game.inputBackspace(); return; }
  });
}

function makeKey(jamo) {
  const btn = document.createElement('button');
  btn.className = 'key';
  btn.textContent = jamo;
  btn.dataset.jamo = jamo;
  btn.addEventListener('click', () => Game.inputJamo(jamo));
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
