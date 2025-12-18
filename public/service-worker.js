const CACHE_NAME = 'asking-vn-v2'; // Đổi từ v1 sang v2 để ép trình duyệt xóa cache cũ
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/images/512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName); // Xóa sạch version cũ v1
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Chiến lược: Ưu tiên lấy từ Mạng, lỗi mạng mới lấy từ Cache
self.addEventListener('fetch', (event) => {
  // Bỏ qua các yêu cầu từ chrome-extension hoặc không phải http
  if (!(event.request.url.indexOf('http') === 0)) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Nếu lấy được file mới, trả về luôn
        return response;
      })
      .catch(() => {
        // Nếu mất mạng, mới tìm trong cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Nếu là trang web thì trả về index.html từ cache
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
