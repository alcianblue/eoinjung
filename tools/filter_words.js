/**
 * filter_words.js — raw_words.json 에서 게임용 단어 필터링 + 카테고리/난이도 자동 태깅
 *
 * 실행:
 *   node tools/filter_words.js
 *
 * 입력:  tools/raw_words.json
 * 출력:  tools/tagged_words.json
 */

const fs   = require('fs');
const path = require('path');

const IN_FILE  = path.join(__dirname, 'raw_words.json');
const OUT_FILE = path.join(__dirname, 'tagged_words.json');

// ── 제외 패턴 ──────────────────────────────────────────────────
const EXCLUDE_PATTERNS = [
  /[a-zA-Z0-9]/,        // 영문/숫자 포함
  /[ㄱ-ㅎㅏ-ㅣ]/,       // 불완성 자모 포함
];

// 품질 낮은 단어 뜻풀이 키워드 (지명/고유명사/방언)
const EXCLUDE_DEF_KEYWORDS = [
  '지명', '고유', '방언', '속어', '비속어', '사람 이름', '인명',
  '중국어', '일본어', '영어', '외래어 표기', '북한어',
];

// ── 카테고리 키워드 맵 (뜻풀이 기반) ─────────────────────────
const CATEGORY_RULES = [
  { cat: '음식',   kw: ['음식','먹는','요리','식품','식재료','조리','반찬','국','찌개','볶음','구이','튀김','떡','과자','음료','커피','빵','케이크','죽','밥','면','탕','소스','양념'] },
  { cat: '자연',   kw: ['식물','동물','꽃','나무','숲','산','강','바다','하늘','구름','바람','비','눈','햇빛','계절','지형','지질','광물','생태','자연현상'] },
  { cat: '장소',   kw: ['건물','장소','시설','공원','도서관','학교','병원','시장','거리','광장','항구','역','터미널','공항','궁','유적'] },
  { cat: '생활',   kw: ['가정','가구','생활','기구','도구','기계','용품','청소','세탁','요리 기구','전자 제품','집','방','부엌','욕실'] },
  { cat: '스포츠', kw: ['운동','경기','스포츠','선수','팀','훈련','시합','야구','축구','농구','수영','달리기','등산','골프','테니스'] },
  { cat: '문화',   kw: ['공연','예술','음악','그림','영화','전시','박물관','갤러리','무대','연극','무용','공예','문학','소설','시'] },
  { cat: '직업',   kw: ['직업','직종','종사자','전문가','의사','교사','경찰','소방','요리사','화가','작가','배우','기자'] },
  { cat: '교육',   kw: ['교육','학습','공부','학교','학생','시험','강의','수업','교과','지식','학문'] },
  { cat: '기술',   kw: ['기술','공학','과학','컴퓨터','인터넷','소프트웨어','하드웨어','통신','전자','디지털','데이터'] },
  { cat: '사회',   kw: ['사회','문화','역사','경제','정치','법','제도','정책','국가','시민','공동체'] },
  { cat: '감정',   kw: ['감정','기분','마음','느낌','기쁨','슬픔','분노','두려움','사랑','행복','외로움'] },
  { cat: '여행',   kw: ['여행','관광','탐방','방문','관람','투어'] },
  { cat: '패션',   kw: ['옷','의류','패션','화장','미용','헤어','스타일','장신구','액세서리'] },
  { cat: '동물',   kw: ['동물','짐승','새','물고기','곤충','파충류','포유류','조류','어류'] },
];

// ── 난이도 규칙 ───────────────────────────────────────────────
// 초등 어휘 목록 (일상 고빈도 명사) → easy
const EASY_SUFFIXES = ['나무','꽃밭','하늘','바다','강물','산길','공원','학교','선생','아이'];
const HARD_DEF_KEYWORDS = ['전문','학술','의학','법률','화학','물리','철학','고어','한자어로','접미사','접두사'];

function detectDifficulty(word, definition) {
  // 글자 복잡도: 겹받침 개수
  const complexJong = ['ㄳ','ㄵ','ㄶ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅄ'];
  let complexCount = 0;
  for (const ch of word) {
    const code = ch.charCodeAt(0) - 0xAC00;
    if (code < 0 || code > 11171) continue;
    const jongIdx = code % 28;
    const JONG = ['','ㄱ','ㄲ','ㄳ','ㄴ','ㄵ','ㄶ','ㄷ','ㄹ','ㄺ','ㄻ','ㄼ','ㄽ','ㄾ','ㄿ','ㅀ','ㅁ','ㅂ','ㅄ','ㅅ','ㅆ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    if (complexJong.includes(JONG[jongIdx])) complexCount++;
  }

  if (HARD_DEF_KEYWORDS.some(k => definition.includes(k)) || complexCount >= 3) return 'hard';
  if (complexCount === 0 && definition.length < 30) return 'easy';
  return 'normal';
}

function detectCategory(definition) {
  for (const rule of CATEGORY_RULES) {
    if (rule.kw.some(k => definition.includes(k))) return rule.cat;
  }
  return '기타';
}

function truncateHint(def, maxLen = 40) {
  // 뜻풀이에서 게임 힌트용으로 자연스럽게 자르기
  const clean = def.replace(/\(.*?\)/g, '').replace(/「.*?」/g, '').trim();
  if (clean.length <= maxLen) return clean;
  // 마침표/쉼표 기준으로 자르기
  const cut = clean.slice(0, maxLen);
  const lastPunct = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf(','), cut.lastIndexOf(' '));
  return (lastPunct > 20 ? cut.slice(0, lastPunct) : cut) + '…';
}

function isValidWord(entry) {
  const { word, definition } = entry;
  if (EXCLUDE_PATTERNS.some(p => p.test(word))) return false;
  if (!definition || definition.length < 5) return false;
  if (EXCLUDE_DEF_KEYWORDS.some(k => definition.includes(k))) return false;
  return true;
}

function main() {
  if (!fs.existsSync(IN_FILE)) {
    console.error(`❌ ${IN_FILE} 없음. 먼저 fetch_words.js를 실행하세요.`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(IN_FILE, 'utf-8'));
  console.log(`📥 입력: ${raw.length}개`);

  const tagged = raw
    .filter(isValidWord)
    .map(entry => {
      const cat  = detectCategory(entry.definition);
      const diff = detectDifficulty(entry.word, entry.definition);
      const hint = truncateHint(entry.definition);
      return [entry.word, cat, diff, hint];
    });

  // 중복 제거
  const seen = new Set();
  const unique = tagged.filter(([w]) => {
    if (seen.has(w)) return false;
    seen.add(w);
    return true;
  });

  // 난이도별 통계
  const stats = { easy: 0, normal: 0, hard: 0, '기타 카테고리': 0 };
  unique.forEach(([, cat, diff]) => {
    stats[diff]++;
    if (cat === '기타') stats['기타 카테고리']++;
  });

  fs.writeFileSync(OUT_FILE, JSON.stringify(unique, null, 2), 'utf-8');
  console.log(`\n✅ 필터링 완료: ${unique.length}개 → ${OUT_FILE}`);
  console.log('📊 난이도 분포:', stats);
}

main();
