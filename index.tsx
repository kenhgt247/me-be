import './index.css';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('SW registered: ', registration);

        // KIỂM TRA VÀ CẬP NHẬT TỰ ĐỘNG
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // Thông báo cho người dùng hoặc tự reload
                  console.log('Có nội dung mới, đang làm mới trang...');
                  window.location.reload(); 
                }
              }
            };
          }
        };
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
