const CACHE_NAME = 'moodeng-budget-v1';
// ระบุไฟล์ทั้งหมดที่จำเป็นต้องใช้ในการแสดงผล
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './app.js'
];

// ติดตั้งและบันทึกไฟล์ลงในเครื่อง
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// ทำงานตอนออฟไลน์: ถ้าไม่มีเน็ต ให้ไปดึงไฟล์ที่จำไว้ในเครื่องมาแสดงแทน
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
