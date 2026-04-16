/**
 * build_words.js — tagged_words.json + 수동 시드 단어를 합쳐 words.js 자동 생성
 *
 * 실행:
 *   node tools/build_words.js
 *
 * 입력:  tools/tagged_words.json  (fetch → filter 결과)
 *        tools/seed_words.json    (수동 큐레이션 단어, 없으면 무시)
 * 출력:  js/words.js
 */

const fs   = require('fs');
const path = require('path');

const TAGGED_FILE = path.join(__dirname, 'tagged_words.json');
const SEED_FILE   = path.join(__dirname, 'seed_words.json');
const OUT_FILE    = path.join(__dirname, '..', 'js', 'words.js');

// ── 최종 검수: 뜻풀이 없이 제외할 단어 블랙리스트 ─────────────
const BLACKLIST = new Set([
  // 비속어, 너무 어렵거나 생소한 단어는 여기에 추가
]);

function main() {
  // 1. tagged_words.json 로드
  if (!fs.existsSync(TAGGED_FILE)) {
    console.error(`❌ ${TAGGED_FILE} 없음. filter_words.js를 먼저 실행하세요.`);
    process.exit(1);
  }
  const tagged = JSON.parse(fs.readFileSync(TAGGED_FILE, 'utf-8'));

  // 2. seed_words.json 로드 (없으면 빈 배열)
  let seed = [];
  if (fs.existsSync(SEED_FILE)) {
    seed = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
    console.log(`🌱 시드 단어: ${seed.length}개 로드`);
  }

  // 3. 합치기 + 블랙리스트 제거 + 중복 제거
  const seen = new Set();
  const all = [...seed, ...tagged].filter(([word]) => {
    if (BLACKLIST.has(word)) return false;
    if (seen.has(word)) return false;
    seen.add(word);
    return true;
  });

  // 4. 1000개 제한 (초과 시 easy>normal>hard 순 우선)
  const ORDER = { easy: 0, normal: 1, hard: 2 };
  all.sort((a, b) => ORDER[a[2]] - ORDER[b[2]]);
  const final = all.slice(0, 1000);

  // 5. 카테고리별 그룹화 (가독성을 위해)
  const groups = {};
  final.forEach(entry => {
    const cat = entry[1];
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(entry);
  });

  // 6. words.js 생성
  const lines = [];
  lines.push('/**');
  lines.push(' * words.js — 자동 생성된 단어 데이터베이스');
  lines.push(` * 생성일: ${new Date().toISOString().slice(0,10)}`);
  lines.push(` * 총 단어 수: ${final.length}개`);
  lines.push(' * 형식: [단어, 카테고리, 난이도, 힌트]');
  lines.push(' */');
  lines.push('');
  lines.push('const WORD_DATA = [');

  for (const [cat, entries] of Object.entries(groups)) {
    lines.push('');
    lines.push(`  // ${'═'.repeat(40)}`);
    lines.push(`  // ${cat} (${entries.length}개)`);
    lines.push(`  // ${'═'.repeat(40)}`);
    for (const [word, c, diff, hint] of entries) {
      const escaped = hint.replace(/'/g, "\\'");
      lines.push(`  ['${word}', '${c}', '${diff}', '${escaped}'],`);
    }
  }

  lines.push('];');
  lines.push('');
  lines.push('// ── 파생 배열 ──────────────────────────────────────────');
  lines.push('const ANSWER_WORDS = WORD_DATA.map(d => d[0]);');
  lines.push('');
  lines.push('const WORD_META = Object.fromEntries(');
  lines.push('  WORD_DATA.map(([w, cat, diff, hint]) => [w, { cat, diff, hint }])');
  lines.push(');');
  lines.push('');
  lines.push('const VALID_WORDS = [');
  lines.push('  ...ANSWER_WORDS,');
  lines.push('  // 추가 허용 단어는 여기에 수동으로 추가');
  lines.push('];');
  lines.push('');
  lines.push('if (typeof console !== \'undefined\') {');
  lines.push('  const bad = ANSWER_WORDS.filter(w => [...w].length !== 5);');
  lines.push('  if (bad.length) console.warn(\'[words] 5글자 아닌 단어:\', bad);');
  lines.push('}');
  lines.push('');
  lines.push('window.ANSWER_WORDS = ANSWER_WORDS;');
  lines.push('window.VALID_WORDS  = VALID_WORDS;');
  lines.push('window.WORD_META    = WORD_META;');

  fs.writeFileSync(OUT_FILE, lines.join('\n'), 'utf-8');
  console.log(`\n✅ words.js 생성 완료: ${final.length}개 → ${OUT_FILE}`);

  // 통계 출력
  const stats = {};
  final.forEach(([, cat, diff]) => {
    stats[cat] = stats[cat] || { easy:0, normal:0, hard:0 };
    stats[cat][diff]++;
  });
  console.log('\n📊 카테고리별 단어 수:');
  for (const [cat, s] of Object.entries(stats)) {
    const total = s.easy + s.normal + s.hard;
    console.log(`  ${cat.padEnd(8)}: ${total}개 (쉬움 ${s.easy} / 보통 ${s.normal} / 어려움 ${s.hard})`);
  }
}

main();
