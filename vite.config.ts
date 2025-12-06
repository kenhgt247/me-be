
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true
  },
  // Define process.env to prevent "ReferenceError: process is not defined" in browser
  define: {
    'process.env': {}
  }
});
