self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  );
  self.clients.claim();
  // Sau khi dọn xong, yêu cầu các client tự hủy SW này nếu cần
  self.registration.unregister().then(() => {
    console.log('Service Worker đã tự hủy sau khi dọn dẹp.');
  });
});

// XÓA BỎ hoàn toàn event 'fetch' để trình duyệt chạy trực tiếp, không qua trung gian
