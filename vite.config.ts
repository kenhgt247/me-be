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
    rollupOptions: {
      output: {
        manualChunks: {
          // Tách riêng các "ông tạ" nặng ký
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          // Sửa chính xác thành @google/genai theo package.json của bạn
          'ai-vendor': ['@google/genai'], 
          'editor-vendor': ['react-quill-new'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000, 
  },
});
