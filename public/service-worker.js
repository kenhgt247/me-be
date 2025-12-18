// Version mới để trình duyệt nhận diện thay đổi
const CACHE_NAME = 'asking-vn-fix-v1';

self.addEventListener('install', (event) => {
  // Ép Service Worker mới hoạt động ngay mà không đợi đóng trình duyệt
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        // Xóa sạch mọi bộ nhớ đệm cũ đang gây lỗi trắng trang
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim();
});

// Cho phép mọi yêu cầu đi thẳng ra Internet, không lấy từ Cache cũ lỗi nữa
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
