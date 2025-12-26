/* public/service-worker.js */

const CACHE_NAME = 'asking-v3'; // tăng version mỗi lần deploy thay đổi SW
const OFFLINE_URL = '/index.html';

// Install: kích hoạt SW mới ngay + cache offline page
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL]))
  );
});

// Activate: xóa cache cũ + claim clients (đặt trong waitUntil để chắc chắn)
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))
    );
    await self.clients.claim();
  })());
});

// Fetch
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Chỉ xử lý GET và request http(s)
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  const url = new URL(req.url);

  // Chỉ xử lý cùng origin (tránh đụng Adsense, analytics...)
  if (url.origin !== self.location.origin) return;

  // 1) Điều hướng trang (SPA): Network first, fallback index.html
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // 2) CỰC QUAN TRỌNG: /assets (JS chunk của Vite) => KHÔNG cache-first
  // Tránh cache nhầm HTML cho JS gây trắng trang.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      fetch(req).catch(() => caches.match(req))
    );
    return;
  }

  // 3) Static assets khác: cache-first + fallback fetch
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);

      // Chỉ cache response hợp lệ (basic + 200)
      if (res && res.status === 200 && res.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res;
    } catch (e) {
      // LUÔN trả về Response để không lỗi "Failed to convert value to Response"
      if (req.destination === 'image') {
        return new Response('', { status: 404 });
      }
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    }
  })());
});
