import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Отключаем console.log в продакшен сборке
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    // Настройки для оптимизации
    minify: 'terser',
    rollupOptions: {
      output: {
        // Разделение кода на чанки
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          store: ['zustand'],
          utils: ['axios'],
        },
      },
    },
  },
  // Настройки для dev сервера
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Оптимизация зависимостей
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand', 'axios'],
  },
  // Настройки для CSS
  css: {
    devSourcemap: true,
  },
})
