/**
 * ui.js — DOM 렌더링, 애니메이션, 모달, 토스트
 */

const TILE_FLIP_DELAY = 300; // ms per tile

const DIFF_LABEL = { easy: '쉬움', normal: '보통', hard: '어려움' };
const DIFF_COLOR = { easy: '#6aaa64', normal: '#c9b458', hard: '#e05252' };
const CAT_EMOJI  = {
  '음식':'🍱','생활':'🏠','자연':'🌿','장소':'📍','스포츠':'⚽',
  '문화':'🎭','직업':'💼','기술':'💻','패션':'👗','여행':'✈️',
  '감정':'💭','교육':'📚','동물':'🐾','사회':'🏛️','기타':'❓',
};

function init() {
  buildBoard();
  Keyboard.buildKeyboard();
  bindModals();

  const gs = Game.initGame();
  render(gs);
  renderHint(gs);
}

/** 6×5 보드 생성 */
function buildBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  for (let r = 0; r < Game.MAX_GUESSES; r++) {
    const row = document.createElement('div');
    row.className = 'row';
    row.id = `row-${r}`;
    for (let c = 0; c < Game.WORD_LENGTH; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      tile.id = `tile-${r}-${c}`;
      // 자모 표시용 span
      tile.innerHTML = `<span class="jamo-cho"></span><span class="jamo-jung"></span><span class="jamo-jong"></span><span class="jamo-full"></span>`;
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

/** 전체 보드 상태 렌더링 */
function render(state) {
  // 확정된 추측 행
  state.guesses.forEach((word, ri) => {
    const decomp = Hangul.decomposeWord(word);
    decomp.forEach((d, ci) => {
      const tile = document.getElementById(`tile-${ri}-${ci}`);
      setTileChar(tile, d);
      // 결과가 이미 있으면(이전 세션 복원 시) 바로 색 적용
      if (state.results[ri]) {
        applyTileResult(tile, state.results[ri][ci]);
        tile.classList.add('revealed');
      }
    });
  });

  // 현재 입력 행
  const curRow = state.guesses.length;
  if (curRow < Game.MAX_GUESSES && state.status === 'playing') {
    renderCurrentRow(state, curRow);
  }

  // 비어있는 나머지 행 초기화
  for (let r = curRow + 1; r < Game.MAX_GUESSES; r++) {
    for (let c = 0; c < Game.WORD_LENGTH; c++) {
      clearTile(document.getElementById(`tile-${r}-${c}`));
    }
  }
}

function renderCurrentRow(state, rowIdx) {
  const word   = state.currentWord;
  const buf    = state.currentInput;
  const decomps = Hangul.decomposeWord(word.padEnd(Game.WORD_LENGTH, ' '));

  for (let c = 0; c < Game.WORD_LENGTH; c++) {
    const tile = document.getElementById(`tile-${rowIdx}-${c}`);
    tile.removeAttribute('data-state');
    tile.classList.remove('revealed');

    if (c < word.length) {
      setTileChar(tile, decomps[c]);
      tile.classList.add('filled');
    } else if (c === word.length && buf.length > 0) {
      // 현재 조합 중인 글자
      const partial = Hangul.buildCurrentChar(buf);
      const d = Hangul.decompose(partial);
      setTileChar(tile, d);
      tile.classList.add('filled');
      tile.classList.add('active');
    } else {
      clearTile(tile);
    }
  }
}

function setTileChar(tile, decomp) {
  tile.querySelector('.jamo-cho').textContent  = decomp.cho  || '';
  tile.querySelector('.jamo-jung').textContent = decomp.jung || '';
  tile.querySelector('.jamo-jong').textContent = decomp.jong || '';
  // 완성 글자도 표시 (스크린리더 등)
  tile.querySelector('.jamo-full').textContent = Hangul.buildCurrentChar(
    [decomp.cho, decomp.jung, decomp.jong].filter(Boolean)
  );
  tile.classList.add('filled');
  tile.classList.remove('active');
}

function clearTile(tile) {
  tile.querySelector('.jamo-cho').textContent  = '';
  tile.querySelector('.jamo-jung').textContent = '';
  tile.querySelector('.jamo-jong').textContent = '';
  tile.querySelector('.jamo-full').textContent = '';
  tile.classList.remove('filled','active','revealed');
  tile.removeAttribute('data-state');
}

function applyTileResult(tile, result) {
  tile.dataset.cho  = result.cho;
  tile.dataset.jung = result.jung;
  tile.dataset.jong = result.jong || 'none';
}

// ══════════════════════════════════════════
// 힌트 렌더링
// ══════════════════════════════════════════
function renderHint(state) {
  if (!state.meta) return;
  const { cat, diff, hint } = state.meta;
  const emoji = CAT_EMOJI[cat] || '❓';

  // 카테고리 태그
  const catEl = document.getElementById('hint-category');
  if (catEl) catEl.textContent = `${emoji} ${cat}`;

  // 난이도 태그
  const diffEl = document.getElementById('hint-difficulty');
  if (diffEl) {
    diffEl.textContent = DIFF_LABEL[diff] || diff;
    diffEl.style.color = DIFF_COLOR[diff] || '#888';
    diffEl.style.borderColor = DIFF_COLOR[diff] || '#888';
  }

  // 힌트 버튼 / 자동 공개 처리
  const hs = Game.getHintState();
  const btnHint = document.getElementById('btn-hint');
  const hintBox = document.getElementById('hint-box');
  const hintText = document.getElementById('hint-text');

  if (hs.autoReveal || state.hintRevealed) {
    // 힌트 자동 또는 수동 공개
    if (hintBox) hintBox.classList.remove('hidden');
    if (hintText) hintText.textContent = hint;
    if (btnHint) btnHint.classList.add('hidden');
  } else if (hs.hintUnlocked) {
    // 버튼 활성화
    if (btnHint) {
      btnHint.classList.remove('hidden');
      btnHint.disabled = false;
      btnHint.textContent = '💡 힌트 보기';
    }
    if (hintBox) hintBox.classList.add('hidden');
  } else {
    // 아직 잠금
    if (btnHint) {
      const thresholds = { easy: 2, normal: 3, hard: 5 };
      const remain = thresholds[diff] - state.guesses.length;
      btnHint.classList.remove('hidden');
      btnHint.disabled = true;
      btnHint.textContent = `💡 ${remain}번 더 시도 후 힌트`;
    }
    if (hintBox) hintBox.classList.add('hidden');
  }
}

/** 행 플립 애니메이션으로 결과 공개 */
function revealRow(rowIdx, result, callback) {
  for (let c = 0; c < Game.WORD_LENGTH; c++) {
    const tile = document.getElementById(`tile-${rowIdx}-${c}`);
    const delay = c * TILE_FLIP_DELAY;
    setTimeout(() => {
      tile.classList.add('flipping');
      setTimeout(() => {
        applyTileResult(tile, result[c]);
        tile.classList.add('revealed');
        tile.classList.remove('flipping');
        if (c === Game.WORD_LENGTH - 1) {
          // 행 공개 완료 → 힌트 상태 갱신
          renderHint(Game.state);
          callback && callback();
        }
      }, TILE_FLIP_DELAY / 2);
    }, delay);
  }
}

/** 행 흔들기 (오류) */
function shakeRow(rowIdx) {
  const row = document.getElementById(`row-${rowIdx}`);
  row.classList.add('shake');
  row.addEventListener('animationend', () => row.classList.remove('shake'), { once: true });
}

/** 키보드 색상 업데이트 */
function updateKeyboard(guesses, results) {
  Keyboard.updateKeyColors(guesses, results);
}

/** 토스트 메시지 */
function showToast(msg, duration = 1800) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
  }, duration);
}

/** 결과 모달 */
function showResult(state) {
  const modal = document.getElementById('modal-result');
  document.getElementById('result-title').textContent =
    state.status === 'won' ? '정답!' : '아쉬워요...';
  document.getElementById('result-answer').textContent =
    state.status === 'lost' ? `정답: ${state.answer}` : '';

  const stats = Stats.loadStats();
  document.getElementById('result-stats').innerHTML = buildStatsSummaryHTML(stats);
  modal.classList.remove('hidden');
}

/** 통계 모달 */
function showStats() {
  const modal = document.getElementById('modal-stats');
  const stats = Stats.loadStats();
  document.getElementById('stats-summary').innerHTML = buildStatsSummaryHTML(stats);
  document.getElementById('guess-distribution').innerHTML = buildDistributionHTML(stats);
  modal.classList.remove('hidden');
}

function buildStatsSummaryHTML(stats) {
  const winRate = stats.played ? Math.round(stats.wins / stats.played * 100) : 0;
  return `<div class="stats-grid">
    <div class="stat"><div class="stat-num">${stats.played}</div><div class="stat-label">플레이</div></div>
    <div class="stat"><div class="stat-num">${winRate}</div><div class="stat-label">정답률%</div></div>
    <div class="stat"><div class="stat-num">${stats.streak}</div><div class="stat-label">연속정답</div></div>
    <div class="stat"><div class="stat-num">${stats.maxStreak}</div><div class="stat-label">최고연속</div></div>
  </div>`;
}

function buildDistributionHTML(stats) {
  const max = Math.max(...Object.values(stats.distribution), 1);
  const rows = Object.entries(stats.distribution).map(([n, cnt]) => {
    const pct = Math.round(cnt / max * 100);
    return `<div class="dist-row">
      <span class="dist-label">${n}</span>
      <div class="dist-bar-wrap"><div class="dist-bar" style="width:${Math.max(pct,5)}%">${cnt}</div></div>
    </div>`;
  }).join('');
  return `<div class="distribution">${rows}</div>`;
}

/** 공유 */
function shareResult() {
  const text = Game.buildShareText();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(() => showToast('클립보드에 복사됐어요!'));
  } else {
    showToast('공유: ' + text);
  }
}

// ===== 무한 모드 렌더링 =====
let _infiniteMode = false;

function renderInfinite(s) {
  if (!_infiniteMode) return;
  // 보드를 infiniteState 기준으로 다시 그림
  const saved = Game.state;
  render(s);
}

function showInfiniteResult(s, streak) {
  const modal = document.getElementById('modal-infinite-result');
  document.getElementById('inf-result-title').textContent =
    s.status === 'won' ? `어인정! 🏆 (${streak}연속)` : '아쉽다... 😢';
  document.getElementById('inf-result-answer').textContent =
    s.status === 'lost' ? `정답: ${s.answer}` : '';
  document.getElementById('inf-streak').textContent =
    streak > 1 ? `🔥 ${streak}연속 정답!` : '';
  modal.classList.remove('hidden');
}

/** 모달 바인딩 */
function bindModals() {
  document.getElementById('btn-help').addEventListener('click', () =>
    document.getElementById('modal-help').classList.remove('hidden'));
  document.getElementById('btn-stats').addEventListener('click', showStats);

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () =>
      document.getElementById(btn.dataset.target).classList.add('hidden'));
  });

  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.add('hidden'); });
  });

  document.getElementById('btn-share').addEventListener('click', shareResult);
  document.getElementById('btn-share2').addEventListener('click', shareResult);

  // 힌트 버튼
  document.getElementById('btn-hint').addEventListener('click', () => {
    Game.state.hintRevealed = true;
    renderHint(Game.state);
  });

  // 무한 모드 진입 버튼
  document.getElementById('btn-infinite').addEventListener('click', () => {
    document.getElementById('modal-result').classList.add('hidden');
    document.getElementById('modal-ad').classList.remove('hidden');
    Ad.showRewardAd(() => {
      _infiniteMode = true;
      _startInfiniteRound();
    });
  });

  // 무한 모드: 다음 문제
  document.getElementById('btn-infinite-next').addEventListener('click', () => {
    document.getElementById('modal-infinite-result').classList.add('hidden');
    _startInfiniteRound();
  });

  // 무한 모드: 그만하기
  document.getElementById('btn-infinite-quit').addEventListener('click', () => {
    document.getElementById('modal-infinite-result').classList.add('hidden');
    _infiniteMode = false;
    buildBoard();
    render(Game.state);
    updateKeyboard(Game.state.guesses, Game.state.results);
    // 키보드 입력 원상 복구
    _setKeyboardTarget('daily');
  });
}


function _startInfiniteRound() {
  const s = Game.startInfinite();
  buildBoard();
  render(s);
  updateKeyboard([], []);
  _setKeyboardTarget('infinite');
}

function _setKeyboardTarget(mode) {
  document.querySelectorAll('.key[data-jamo]').forEach(btn => {
    btn.onclick = () => {
      if (mode === 'infinite') Game.inputJamoActive(btn.dataset.jamo);
      else Game.inputJamo(btn.dataset.jamo);
    };
  });
  document.getElementById('key-enter').onclick = () => {
    if (mode === 'infinite') Game.submitGuessActive();
    else Game.submitGuess();
  };
  document.getElementById('key-backspace').onclick = () => {
    if (mode === 'infinite') Game.inputBackspaceActive();
    else Game.inputBackspace();
  };
}

window.UI = { init, render, renderHint, renderInfinite, revealRow, shakeRow, showToast, showResult, showInfiniteResult, updateKeyboard };

document.addEventListener('DOMContentLoaded', () => UI.init());
