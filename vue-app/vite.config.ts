import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 8080, // Фронт будет работать на порту 8080
    proxy: {
      // Проксирование всех запросов /api/* на локальный API
      '/api': {
        target: 'https://localhost:5001',
        changeOrigin: true,
        secure: false, // Отключение проверки SSL для localhost
      },
    },
  }
});
