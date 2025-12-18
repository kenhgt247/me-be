self.addEventListener('install', (e) => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
  self.clients.claim();
});

// Chiến lược chỉ lấy từ mạng (Network Only) để cứu web đang bị trắng trang
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
