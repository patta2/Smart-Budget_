const CACHE_NAME = 'moodeng-smart-budget-v3'; // เปลี่ยนเวอร์ชันเพื่อบังคับอัปเดต

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
  const url = new URL(event.request.url);

  // ถ้าเป็นการขอหน้า index.html หรือ root ให้ใช้กลยุทธ์ Network First (ลองโหลดจากเน็ตก่อน ถ้าไม่ได้ค่อยเอาจากแคช)
  if (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // ถ้าโหลดจากเน็ตได้ อัปเดตเก็บลงแคชใหม่ด้วย
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // ถ้าเน็ตหลุด ให้ดึงจากแคชแทน
          return caches.match(event.request);
        })
    );
    return;
  }

  // สำหรับไฟล์อื่นๆ (CSS, JS, ฯลฯ) ใช้ Cache First ตามเดิม
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        console.log('Offline fetch failed for:', event.request.url);
      });
    })
  );
});
