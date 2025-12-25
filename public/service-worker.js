const CACHE_NAME = 'asking-v1';

self.addEventListener('install', (e) => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => k !== CACHE_NAME && caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // QUAN TRỌNG: Chỉ xử lý các yêu cầu GET. Bỏ qua POST, PUT, DELETE...
  if (event.request.method !== 'GET') return;

  // Bỏ qua các yêu cầu từ Chrome Extension hoặc Chrome-extension://
  if (!(event.request.url.indexOf('http') === 0)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Nếu đã có trong kho (cache), trả về luôn cho nhanh
      if (cachedResponse) return cachedResponse;

      // Nếu chưa có, đi lấy từ mạng (Network)
      return fetch(event.request)
        .then((response) => {
          // Chỉ lưu vào kho nếu tải thành công (status 200)
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Nếu mất mạng hoàn toàn và là trang chính, trả về index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
