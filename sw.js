const CACHE_NAME = 'moodeng-budget-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './icon.png',
  './manifest.json'
];

// 1. บันทึกไฟล์ทั้งหมดลงเครื่องตอนติดตั้ง
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ดึงไฟล์จากความจำเครื่องมาแสดงแม้ออฟไลน์อยู่
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
