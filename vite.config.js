import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Базовый путь для продакшена
  base: '/',
  build: {
    // Настройки для оптимизации
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
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
    // Используем сертификаты, созданные через mkcert
    // Это обеспечивает доверенное HTTPS соединение без предупреждений браузера
    https: {
      key: fs.readFileSync('./localhost+2-key.pem'),
      cert: fs.readFileSync('./localhost+2.pem'),
    },
    proxy: {
      // Прокси для всех запросов к бэкенду
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '', // Убираем перезапись домена для cookies
        cookiePathRewrite: '/', // Устанавливаем путь для cookies
      },
      // Прокси для маршрутов аутентификации и других маршрутов бэкенда
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '', // Убираем перезапись домена для cookies
        cookiePathRewrite: '/', // Устанавливаем путь для cookies
      },
      '/profile': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
      },
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
      },
      // Прокси для статических файлов подписок
      '/subscriptions': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
      },
      '/security': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
      },
      // Прокси для статических файлов (аватары пользователей)
      '/users': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
      },
      // Прокси для других статических файлов (public папка)
      '/public': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
      },
      // Прокси для статических файлов storage (вложения поддержки)
      '/storage': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
      },
      // Прокси для WebSocket через Socket.IO
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true, // Включаем поддержку WebSocket
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
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
