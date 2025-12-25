const CACHE_NAME = 'asking-v2'; // Tăng version để xóa cache cũ
const OFFLINE_URL = '/index.html';

// 1. Cài đặt: Buộc SW mới kích hoạt ngay lập tức
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Kích hoạt: Xóa bỏ toàn bộ kho lưu trữ (cache) cũ để tránh xung đột
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Xử lý yêu cầu (Fetch)
self.addEventListener('fetch', (event) => {
  // Chỉ xử lý các yêu cầu GET và bỏ qua Chrome Extensions
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // CHIẾN LƯỢC: NETWORK FIRST cho điều hướng (Tránh lỗi trắng trang)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
    return;
  }

  // CHIẾN LƯỢC: CACHE FIRST cho tài nguyên tĩnh (Ảnh, CSS, JS)
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;

      return fetch(event.request).then((networkResponse) => {
        // Kiểm tra tính hợp lệ trước khi cache (Tránh lỗi Screenshot 330)
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          // Không cache các file của Google Adsense để tránh lỗi bảo mật
          if (!event.request.url.includes('googlesyndication')) {
             cache.put(event.request, responseToCache);
          }
        });

        return networkResponse;
      }).catch(() => {
          // Trả về Response rỗng thay vì ném lỗi nếu là ảnh
          if (event.request.destination === 'image') {
              return new Response('', { status: 404 });
          }
      });
    })
  );
});
