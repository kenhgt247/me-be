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
          'firebase-vendor': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'ai-vendor': ['@google/generative-ai'], 
          'editor-vendor': ['react-quill-new'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000, 
  },
});
