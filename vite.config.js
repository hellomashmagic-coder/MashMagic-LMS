import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: 'public',
  envDir: resolve(__dirname, '.'),
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    target: 'es2022'
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
