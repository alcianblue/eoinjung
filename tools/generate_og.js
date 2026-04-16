/**
 * generate_og.js — OG 이미지(1200×630) 생성
 * node tools/generate_og.js
 * → og-image.png 생성
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const W = 1200, H = 630;
const OUT = path.join(__dirname, '..', 'og-image.png');

// RGB 픽셀 버퍼
const buf = Buffer.alloc(W * H * 3);

function setPixel(x, y, r, g, b) {
  if (x < 0 || x >= W || y < 0 || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = r; buf[i+1] = g; buf[i+2] = b;
}

// 사각형 채우기
function fillRect(x, y, w, h, r, g, b) {
  for (let dy = 0; dy < h; dy++)
    for (let dx = 0; dx < w; dx++)
      setPixel(x + dx, y + dy, r, g, b);
}

// 원 채우기
function fillCircle(cx, cy, radius, r, g, b) {
  for (let dy = -radius; dy <= radius; dy++)
    for (let dx = -radius; dx <= radius; dx++)
      if (dx*dx + dy*dy <= radius*radius)
        setPixel(cx+dx, cy+dy, r, g, b);
}

// ── 배경: 짙은 초록 그라디언트 근사 ──
for (let y = 0; y < H; y++) {
  const t = y / H;
  const r = Math.round(18  + t * 10);
  const g = Math.round(18  + t * 10);
  const b = Math.round(20  + t * 10);
  fillRect(0, y, W, 1, r, g, b);
}

// ── 타일 그리드 (배경 장식) ──
const TILE_C = [50, 55, 55];
const TILE_S = 60, TILE_G = 8;
for (let row = 0; row < 6; row++) {
  for (let col = 0; col < 5; col++) {
    const tx = 80 + col * (TILE_S + TILE_G);
    const ty = 120 + row * (TILE_S + TILE_G);
    // 일부 타일 색상
    const colors = [
      [106,170,100], // correct
      [201,180,88],  // present
      [80,80,82],    // absent
    ];
    const demo = [[0,2,0,2,0],[2,0,1,0,2],[0,1,0,1,0],[2,0,0,0,2],[0,2,1,2,0],[1,0,2,0,1]];
    const [cr,cg,cb] = colors[demo[row][col]];
    fillRect(tx, ty, TILE_S, TILE_S, cr, cg, cb);
  }
}

// ── 오른쪽 텍스트 영역 — 픽셀 폰트 근사 ──
// "어인정" 큰 글씨 → 단순 블록으로 표현
// 실제 배포에서는 Canvas API나 sharp 라이브러리 사용 권장
// 여기서는 강조 블록으로 시각적 표시

// 메인 타이틀 배경 블록
fillRect(530, 180, 580, 90, 106, 170, 100);  // 초록 배경
// 서브 설명 블록
fillRect(530, 300, 580, 8,  106, 170, 100);   // 구분선
fillRect(530, 330, 420, 16, 80, 80, 82);       // 텍스트 자리
fillRect(530, 360, 360, 16, 80, 80, 82);
fillRect(530, 390, 400, 16, 80, 80, 82);

// ── 하단 URL 바 ──
fillRect(0, H - 60, W, 60, 30, 35, 35);
fillRect(0, H - 60, W, 2,  106, 170, 100);

// ── 워터마크 점 장식 ──
for (let i = 0; i < 20; i++) {
  const x = 550 + (i % 5) * 120;
  const y = 480 + Math.floor(i / 5) * 30;
  fillCircle(x, y, 4, 106, 170, 100);
}

// ── PNG 인코딩 ──────────────────────────────────────────────────
function crc32(data) {
  const table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < data.length; i++) c = table[(c ^ data[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const t   = Buffer.from(type);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4);
ihdr[8]=8; ihdr[9]=2;

const raw = [];
for (let y = 0; y < H; y++) {
  raw.push(0);
  for (let x = 0; x < W; x++) {
    const i = (y*W+x)*3;
    raw.push(buf[i], buf[i+1], buf[i+2]);
  }
}
const compressed = zlib.deflateSync(Buffer.from(raw));

const png = Buffer.concat([
  Buffer.from([137,80,78,71,13,10,26,10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

fs.writeFileSync(OUT, png);
console.log(`✅ og-image.png 생성 완료 (${W}×${H})`);
