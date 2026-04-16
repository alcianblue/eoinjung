/**
 * sw.js — Service Worker (오프라인 캐시)
 */

const CACHE_NAME = 'kkordle-v1';

// GitHub Pages 배포 시 경로: /eoinjung/
// 커스텀 도메인(eoinjung.kr) 사용 시: /
const BASE = self.location.pathname.replace(/sw\.js$/, '');

const ASSETS = [
  BASE,
  BASE + 'index.html',
  BASE + 'style.css',
  BASE + 'js/hangul.js',
  BASE + 'js/words.js',
  BASE + 'js/daily.js',
  BASE + 'js/stats.js',
  BASE + 'js/game.js',
  BASE + 'js/keyboard.js',
  BASE + 'js/ui.js',
  BASE + 'manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Cache-first 전략
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
