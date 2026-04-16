/**
 * game.js — 게임 상태 및 채점 로직
 */

const MAX_GUESSES = 6;
const WORD_LENGTH = 5;

let state = {
  answer: '',
  dayNumber: 1,
  meta: null,         // { cat, diff, hint }
  guesses: [],
  results: [],
  currentInput: [],
  currentWord: '',
  status: 'playing',
  hintRevealed: false,
};

/** 게임 초기화 */
function initGame() {
  state.answer    = Daily.getDailyWord();
  state.dayNumber = Daily.getDailyNumber();
  state.meta      = (window.WORD_META && WORD_META[state.answer]) || { cat: '기타', diff: 'normal', hint: '' };

  const saved = Stats.loadDailyResult(Daily.getDayIndex());
  if (saved) {
    state.status = saved.won ? 'won' : 'lost';
  }

  state.guesses       = [];
  state.results       = [];
  state.currentInput  = [];
  state.currentWord   = '';
  state.hintRevealed  = false;
  return state;
}

/**
 * 힌트 공개 규칙
 * easy   → 처음부터 카테고리 공개, 2번 틀리면 전체 힌트 자동 공개
 * normal → 3번 틀리면 힌트 버튼 활성화
 * hard   → 5번 틀리면 힌트 버튼 활성화
 */
function getHintState() {
  const diff = state.meta ? state.meta.diff : 'normal';
  const tried = state.guesses.length;
  const thresholds = { easy: 2, normal: 3, hard: 5 };
  return {
    catVisible:  true,                        // 카테고리는 항상 표시
    hintUnlocked: tried >= thresholds[diff],  // 힌트 버튼 활성 여부
    autoReveal:  diff === 'easy' && tried >= thresholds.easy,
  };
}

/**
 * 추측 단어 채점
 * @param {string} guess  5글자 단어
 * @param {string} answer 정답 단어
 * @returns {Array<{cho,jung,jong}>}  각 글자의 {cho, jung, jong} 결과 ('correct'|'present'|'absent')
 */
function scoreGuess(guess, answer) {
  const gDecomp = Hangul.decomposeWord(guess);
  const aDecomp = Hangul.decomposeWord(answer);
  const parts   = ['cho', 'jung', 'jong'];

  // 전체 자모 풀 (위치 무관 존재 여부 판단용)
  const answerJamoPool = { cho: {}, jung: {}, jong: {} };
  aDecomp.forEach(a => {
    parts.forEach(p => {
      const v = a[p];
      if (v) answerJamoPool[p][v] = (answerJamoPool[p][v] || 0) + 1;
    });
  });

  // 1차: correct 체크 후 풀에서 차감
  const results = gDecomp.map((g, i) => {
    const r = {};
    parts.forEach(p => {
      const gv = g[p], av = aDecomp[i][p];
      if (gv === av) {
        r[p] = 'correct';
        if (gv && answerJamoPool[p][gv]) answerJamoPool[p][gv]--;
      } else {
        r[p] = null;
      }
    });
    return r;
  });

  // 2차: present / absent 체크
  results.forEach((r, i) => {
    const g = gDecomp[i];
    parts.forEach(p => {
      if (r[p] !== null) return;
      const gv = g[p];
      if (!gv) { r[p] = 'absent'; return; }
      if (answerJamoPool[p][gv] > 0) {
        r[p] = 'present';
        answerJamoPool[p][gv]--;
      } else {
        r[p] = 'absent';
      }
    });
  });

  return results;
}

/** 현재 입력 버퍼로부터 완성된 글자 수 반환 */
function currentWordLength() {
  return state.currentWord.length + (state.currentInput.length > 0 ? 1 : 0);
}

/** 자모 입력 처리 */
function inputJamo(jamo) {
  if (state.status !== 'playing') return;
  if (currentWordLength() >= WORD_LENGTH && state.currentInput.length === 0) return;

  const buf = state.currentInput;

  if (buf.length === 0) {
    // 새 글자 시작: 반드시 초성
    if (!Hangul.isCho(jamo)) return;
    state.currentInput = [jamo];
  } else if (buf.length === 1) {
    // 초성만 있음: 중성 입력
    if (Hangul.isJung(jamo)) {
      state.currentInput = [buf[0], jamo];
    } else if (Hangul.isCho(jamo)) {
      // 이전 초성 확정, 새 초성 시작
      if (state.currentWord.length < WORD_LENGTH) {
        state.currentWord += buf[0]; // 단자음으로 저장 (불완전 글자)
      }
      state.currentInput = [jamo];
    }
  } else if (buf.length === 2) {
    // 초성+중성: 종성 또는 다음 글자 초성
    if (Hangul.isJong(jamo) && !Hangul.isJung(jamo)) {
      // 종성 후보로 추가
      state.currentInput = [buf[0], buf[1], jamo];
    } else if (Hangul.isJung(jamo)) {
      // 이중모음? (일단 무시, 현재 글자 확정 후 새 글자)
      _commitCurrentChar();
      if (state.currentWord.length < WORD_LENGTH) {
        state.currentInput = [];
      }
    } else if (Hangul.isCho(jamo)) {
      _commitCurrentChar();
      if (state.currentWord.length < WORD_LENGTH) {
        state.currentInput = [jamo];
      }
    }
  } else if (buf.length === 3) {
    // 초성+중성+종성: 다음 입력
    if (Hangul.isJung(jamo)) {
      // 종성이 다음 글자의 초성으로 이동
      const jong = buf[2];
      const split = Hangul.splitJongForNext(jong);
      if (split[0]) {
        // 겹받침 분리: 앞 글자에 첫 자음, 뒤 글자 초성으로 두 번째 자음
        state.currentInput = [buf[0], buf[1], split[0]];
        _commitCurrentChar();
        state.currentInput = [split[1], jamo];
      } else {
        // 단받침: 앞 글자는 받침 없음으로, 받침은 초성으로
        state.currentInput = [buf[0], buf[1]];
        _commitCurrentChar();
        state.currentInput = [jong, jamo];
      }
    } else if (Hangul.isCho(jamo)) {
      _commitCurrentChar();
      if (state.currentWord.length < WORD_LENGTH) {
        state.currentInput = [jamo];
      }
    }
  }

  UI && UI.render(state);
}

function _commitCurrentChar() {
  if (state.currentInput.length === 0) return;
  const char = Hangul.buildCurrentChar(state.currentInput);
  if (state.currentWord.length < WORD_LENGTH) {
    state.currentWord += char;
  }
  state.currentInput = [];
}

/** 백스페이스 처리 */
function inputBackspace() {
  if (state.status !== 'playing') return;

  if (state.currentInput.length > 0) {
    state.currentInput.pop();
  } else if (state.currentWord.length > 0) {
    // 마지막 완성 글자 해체
    const last = state.currentWord[state.currentWord.length - 1];
    state.currentWord = state.currentWord.slice(0, -1);
    const d = Hangul.decompose(last);
    // 종성이 있으면 종성까지 버퍼로, 없으면 초성+중성
    if (d.jong) {
      state.currentInput = [d.cho, d.jung, d.jong];
    } else if (d.jung) {
      state.currentInput = [d.cho, d.jung];
    } else {
      state.currentInput = [d.cho];
    }
  }

  UI && UI.render(state);
}

/** 입력 확정 (Enter) */
function submitGuess() {
  if (state.status !== 'playing') return;

  // 현재 버퍼 확정
  if (state.currentInput.length > 0) {
    _commitCurrentChar();
  }

  const word = state.currentWord;

  if (word.length !== WORD_LENGTH) {
    UI && UI.showToast('5글자를 모두 입력해주세요');
    UI && UI.shakeRow(state.guesses.length);
    return;
  }

  // 5글자 완성 한글 여부만 검사 (단어 목록 제한 없음)
  if (![...word].every(ch => ch.charCodeAt(0) >= 0xAC00 && ch.charCodeAt(0) <= 0xD7A3)) {
    UI && UI.showToast('완성된 한글 5글자를 입력해주세요', 2000);
    UI && UI.shakeRow(state.guesses.length);
    return;
  }

  const result = scoreGuess(word, state.answer);
  state.guesses.push(word);
  state.results.push(result);
  state.currentWord  = '';
  state.currentInput = [];

  const won = word === state.answer;
  if (won) {
    state.status = 'won';
    Stats.recordResult(state.guesses.length, true);
    Stats.saveDailyResult(Daily.getDayIndex(), state.guesses.length, true);
  } else if (state.guesses.length >= MAX_GUESSES) {
    state.status = 'lost';
    Stats.recordResult(state.guesses.length, false);
    Stats.saveDailyResult(Daily.getDayIndex(), state.guesses.length, false);
  }

  UI && UI.render(state);
  UI && UI.revealRow(state.guesses.length - 1, result, () => {
    if (state.status === 'won') {
      UI.showToast(WON_MESSAGES[Math.min(state.guesses.length - 1, WON_MESSAGES.length - 1)]);
      setTimeout(() => UI.showResult(state), 1600);
    } else if (state.status === 'lost') {
      UI.showToast(`정답: ${state.answer}`, 4000);
      setTimeout(() => UI.showResult(state), 2000);
    }
  });

  UI && UI.updateKeyboard(state.guesses, state.results);
}

const WON_MESSAGES = [
  '어휘력 천재! 🧠', '어인정!! 🏆', '대단한 어휘력!', '역시 실력자!', '간신히 어인정...', '겨우 구했다 😅',
];

/** 결과 공유 텍스트 생성 */
function buildShareText() {
  const lines = state.results.map(result =>
    result.map(r => {
      const cho  = r.cho  === 'correct' ? '🟩' : r.cho  === 'present' ? '🟨' : '⬛';
      const jung = r.jung === 'correct' ? '🟩' : r.jung === 'present' ? '🟨' : '⬛';
      const jong = r.jong === 'correct' ? '🟩' : r.jong === 'present' ? '🟨' : r.jong === 'absent' ? '⬛' : '⬜';
      return cho + jung + jong;
    }).join('')
  ).join('\n');

  const tries = state.status === 'won' ? `${state.guesses.length}/${MAX_GUESSES}` : 'X/6';
  const suffix = state.status === 'won' ? '나 어인정?' : '오늘은 탈락... 너는?';
  return `어인정 #${state.dayNumber} ${tries}\n${suffix}\n\n${lines}`;
}

// ===== 무한 모드 =====
let infiniteState = null;
let infiniteStreak = 0;

function startInfinite() {
  const usedToday = [state.answer];
  let pick;
  do {
    pick = ANSWER_WORDS[Math.floor(Math.random() * ANSWER_WORDS.length)];
  } while (usedToday.includes(pick));

  infiniteState = {
    answer: pick,
    guesses: [], results: [],
    currentInput: [], currentWord: '',
    status: 'playing',
    mode: 'infinite',
  };
  return infiniteState;
}

function getActiveState() {
  return infiniteState && infiniteState.status === 'playing' ? infiniteState : state;
}

function inputJamoActive(jamo) {
  const s = getActiveState();
  if (s === infiniteState) return _inputJamoToState(jamo, infiniteState);
  return inputJamo(jamo);
}

function inputBackspaceActive() {
  const s = getActiveState();
  if (s === infiniteState) return _backspaceState(infiniteState);
  return inputBackspace();
}

function submitGuessActive() {
  const s = getActiveState();
  if (s === infiniteState) return _submitToState(infiniteState);
  return submitGuess();
}

function _inputJamoToState(jamo, s) {
  if (s.status !== 'playing') return;
  // 기존 inputJamo 로직을 s에 적용 (state 대신 s 사용)
  const origState = state;
  Object.assign(state, s);          // 임시로 교체
  inputJamo(jamo);
  Object.assign(s, state);
  Object.assign(state, origState);  // 복원
  UI && UI.renderInfinite(infiniteState);
}

function _backspaceState(s) {
  const origState = state;
  Object.assign(state, s);
  inputBackspace();
  Object.assign(s, state);
  Object.assign(state, origState);
  UI && UI.renderInfinite(infiniteState);
}

function _submitToState(s) {
  const origState = state;
  Object.assign(state, s);
  const guessCount = state.guesses.length;
  submitGuess();
  Object.assign(s, state);
  Object.assign(state, origState);

  if (s.guesses.length > guessCount) {
    const won = s.status === 'won';
    const lost = s.status === 'lost';
    if (won) infiniteStreak++;
    if (lost) infiniteStreak = 0;
    if (won || lost) {
      setTimeout(() => UI.showInfiniteResult(s, infiniteStreak), 1800);
    }
    UI && UI.updateKeyboard(s.guesses, s.results);
  }
}

function buildInfiniteShareText(s) {
  const lines = s.results.map(result =>
    result.map(r => {
      const cho  = r.cho  === 'correct' ? '🟩' : r.cho  === 'present' ? '🟨' : '⬛';
      const jung = r.jung === 'correct' ? '🟩' : r.jung === 'present' ? '🟨' : '⬛';
      const jong = r.jong === 'correct' ? '🟩' : r.jong === 'present' ? '🟨' : r.jong === 'absent' ? '⬛' : '⬜';
      return cho + jung + jong;
    }).join('')
  ).join('\n');
  const tries = s.status === 'won' ? `${s.guesses.length}/${MAX_GUESSES}` : 'X/6';
  return `어인정 무한모드 ${tries} (${infiniteStreak}연속)\n\n${lines}`;
}

window.Game = {
  initGame, inputJamo, inputBackspace, submitGuess, buildShareText,
  getHintState,
  startInfinite, inputJamoActive, inputBackspaceActive, submitGuessActive,
  buildInfiniteShareText,
  get infiniteState() { return infiniteState; },
  get infiniteStreak() { return infiniteStreak; },
  state, MAX_GUESSES, WORD_LENGTH,
};
