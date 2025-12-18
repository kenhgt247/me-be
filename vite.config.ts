import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // Tối ưu hóa việc đóng gói
    rollupOptions: {
      output: {
        // Chia nhỏ các thư viện khổng lồ (Manual Chunking)
        manualChunks: {
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'ai-vendor': ['@google/genai'], // Tách riêng thư viện AI nặng nề
          'editor-vendor': ['react-quill-new'], // Tách riêng trình soạn thảo
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // Giảm dung lượng file bằng cách nén mã nguồn
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000, // Tăng giới hạn cảnh báo lên 1MB để bớt báo lỗi đỏ
  },
});