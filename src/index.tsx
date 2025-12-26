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

// register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/service-worker.js');
      console.log('✅ Asking.vn: SW registered:', reg.scope);

      // chủ động check update
      reg.update();

      // nếu có SW mới -> reload 1 lần để tránh dùng cache/chunk cũ
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;

        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            window.location.reload();
          }
        });
      });
    } catch (err) {
      console.error('❌ Asking.vn: SW register failed:', err);
    }
  });
}

