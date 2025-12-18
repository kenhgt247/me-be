// sw.js
self.addEventListener('install', (e) => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// XÓA BỎ HOÀN TOÀN event 'fetch'. 
// Không để Service Worker làm trung gian, giúp giảm INP và Time to First Byte.
