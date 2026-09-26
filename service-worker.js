const CACHE_NAME = 'moodeng-smart-budget-v2'; // เปลี่ยนเวอร์ชันเพื่อบังคับอัปเดต

// เก็บเฉพาะไฟล์หลักที่เป็นของเราเอง
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

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
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // ถ้าเจอในแคช เอาจากแคชก่อนทันที
      if (cachedResponse) {
        return cachedResponse;
      }
      // ถ้าไม่เจอ ให้ลองดึงจากเน็ต (รวมถึง CDN ภายนอกด้วย)
      return fetch(event.request).catch(() => {
        // กรณีออฟไลน์และไม่มีในแคช
        console.log('Offline fetch failed for:', event.request.url);
      });
    })
  );
});
