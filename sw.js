const CACHE_NAME = 'moodeng-budget-v2'; // เปลี่ยนเป็น v2 เพื่ออัปเดตไฟล์ใหม่
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './icon.png',
  './manifest.json'
];

// 1. ติดตั้งและดาวน์โหลดไฟล์ใหม่เก็บไว้ใช้ออฟไลน์
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// 2. ลบ Cache เวอร์ชันเก่าทิ้งเมื่อมีการอัปเดต
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. ดึงไฟล์จากเครื่องมาแสดงผลแม้ออฟไลน์
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
