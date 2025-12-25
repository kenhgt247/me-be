import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// --- ĐOẠN MÃ THÊM VÀO ĐỂ FIX LỖI PWA ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Đảm bảo file service-worker.js nằm trong thư mục public/
    navigator.serviceWorker.register('/service-worker.js')
      .then((reg) => {
        console.log('✅ Asking.vn: Service Worker đã đăng ký thành công!', reg.scope);
      })
      .catch((err) => {
        console.error('❌ Asking.vn: Đăng ký Service Worker thất bại:', err);
      });
  });
}
