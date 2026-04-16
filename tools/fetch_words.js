/**
 * fetch_words.js — 국립국어원 표준국어대사전 Open API로 5글자 단어 수집
 *
 * 사용 전 필요:
 *   1. https://opendict.korean.go.kr 회원가입
 *   2. 마이페이지 > API 키 발급
 *   3. 아래 API_KEY 에 발급받은 키 입력
 *
 * 실행:
 *   node tools/fetch_words.js
 *
 * 결과:
 *   tools/raw_words.json 에 저장
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── 설정 ──────────────────────────────────────────────────────
const API_KEY  = process.env.KOREAN_DICT_API_KEY || 'YOUR_API_KEY_HERE';
const OUT_FILE = path.join(__dirname, 'raw_words.json');
const BASE_URL = 'https://opendict.korean.go.kr/api/search';

// 검색 키워드 목록 — 카테고리별로 넓게 수집
const SEARCH_QUERIES = [
  // 음식
  '음식','요리','식당','반찬','국수','찌개','볶음','구이','튀김','떡',
  '과자','음료','커피','케이크','빵','죽','밥','면','탕','국',
  // 자연
  '꽃','나무','숲','산','강','바다','하늘','구름','바람','비',
  '눈','햇빛','계절','봄','여름','가을','겨울','동물','식물','새',
  // 장소
  '공원','도서관','학교','병원','시장','거리','광장','항구','역','터미널',
  // 생활
  '집','방','거실','부엌','욕실','정원','마당','창문','문','계단',
  // 교통
  '자동차','기차','버스','배','비행기','자전거','오토바이',
  // 스포츠
  '운동','경기','선수','팀','코치','훈련','시합','야구','축구','농구',
  // 문화
  '공연','영화','음악','그림','조각','전시','박물관','갤러리','무대',
  // 직업
  '의사','선생','경찰','소방','요리사','화가','작가','음악가','배우',
  // 감정
  '기쁨','슬픔','분노','두려움','설렘','행복','외로움','그리움',
  // 사회
  '사회','문화','역사','경제','정치','법','교육','과학','기술',
];
// ──────────────────────────────────────────────────────────────

const DELAY_MS   = 300;  // API 호출 간격 (과도한 요청 방지)
const PER_QUERY  = 100;  // 쿼리당 최대 수집 수 (API 최대 100)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function apiRequest(query, start = 1) {
  return new Promise((resolve, reject) => {
    const params = new URLSearchParams({
      key:      API_KEY,
      q:        query,
      advanced: 'y',
      target:   1,     // 표제어 검색
      pos:      1,     // 명사
      num:      100,
      start,
      sort:     'dict',
      type1:    'word',
    });
    const url = `${BASE_URL}?${params}`;

    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for "${query}": ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function charLen(str) { return [...str].length; }

async function fetchAll() {
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    console.error('❌ API_KEY를 설정해주세요.');
    console.error('   KOREAN_DICT_API_KEY=your_key node tools/fetch_words.js');
    process.exit(1);
  }

  const collected = {};  // word → { word, pos, definition }

  for (const query of SEARCH_QUERIES) {
    process.stdout.write(`🔍 "${query}" 검색 중...`);
    try {
      const res = await apiRequest(query);
      const items = res?.channel?.item;
      if (!items) { console.log(' (결과 없음)'); continue; }
      const arr = Array.isArray(items) ? items : [items];

      let added = 0;
      for (const item of arr) {
        const word = item.word?.replace(/[-\s]/g, '') ?? '';
        if (charLen(word) !== 5) continue;
        if (!/^[가-힣]+$/.test(word)) continue;
        if (collected[word]) continue;

        // 뜻풀이 첫 번째 추출
        const senses = item.sense;
        const senseArr = Array.isArray(senses) ? senses : senses ? [senses] : [];
        const def = senseArr[0]?.definition?.replace(/<[^>]+>/g, '').trim() ?? '';

        collected[word] = { word, pos: item.pos ?? '명사', definition: def };
        added++;
      }
      console.log(` ${added}개 추가 (누적 ${Object.keys(collected).length}개)`);
    } catch (e) {
      console.log(` ❌ 오류: ${e.message}`);
    }
    await sleep(DELAY_MS);
  }

  const result = Object.values(collected);
  fs.writeFileSync(OUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n✅ 완료! ${result.length}개 저장 → ${OUT_FILE}`);
}

fetchAll();
