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
        drop_console: false, // Временно оставляем console.log для отладки
        drop_debugger: true,
      },
    },
    // Увеличиваем лимит предупреждений для больших чанков
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Автоматическое разделение кода на чанки
        manualChunks(id) {
          // Разделение node_modules на отдельные чанки
          if (id.includes('node_modules')) {
            // React и React DOM в отдельный чанк
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            // React Router в отдельный чанк
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            // Zustand в отдельный чанк
            if (id.includes('zustand')) {
              return 'store-vendor';
            }
            // Axios в отдельный чанк
            if (id.includes('axios')) {
              return 'axios-vendor';
            }
            // Остальные node_modules в общий vendor чанк
            return 'vendor';
          }
          // Разделение компонентов по папкам для лучшего code splitting
          if (id.includes('/components/entryes/')) {
            return 'entryes';
          }
          if (id.includes('/components/main/')) {
            return 'main';
          }
          if (id.includes('/components/USER/')) {
            return 'user-components';
          }
          if (id.includes('/components/ADMIN/')) {
            return 'admin-components';
          }
        },
        // Оптимизация имен файлов для лучшего кеширования
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
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
    // Настройки HMR для исправления проблем с react-refresh
    // Используем автоматическое определение настроек
    hmr: true,
    // Увеличиваем таймауты для предотвращения ERR_TOO_MANY_RETRIES
    watch: {
      usePolling: false,
    },
    // Исключаем определенные пути из прокси (для HMR и Vite внутренних путей)
    proxy: {
      // Прокси для всех запросов к бэкенду
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '', // Убираем перезапись домена для cookies
        cookiePathRewrite: '/', // Устанавливаем путь для cookies
        bypass: (req) => {
          // Исключаем внутренние пути Vite из прокси
          if (req.url.startsWith('/@') || req.url.includes('react-refresh')) {
            return req.url;
          }
        },
      },
      // Прокси для маршрутов аутентификации и других маршрутов бэкенда
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '', // Убираем перезапись домена для cookies
        cookiePathRewrite: '/', // Устанавливаем путь для cookies
        bypass: (req) => {
          if (req.url.startsWith('/@') || req.url.includes('react-refresh')) {
            return req.url;
          }
        },
      },
      '/profile': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        bypass: (req) => {
          if (req.url.startsWith('/@') || req.url.includes('react-refresh')) {
            return req.url;
          }
        },
      },
      '/admin': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        bypass: (req) => {
          if (req.url.startsWith('/@') || req.url.includes('react-refresh')) {
            return req.url;
          }
        },
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        bypass: (req) => {
          if (req.url.startsWith('/@') || req.url.includes('react-refresh')) {
            return req.url;
          }
        },
      },
      // Прокси для статических файлов подписок
      '/subscriptions': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        bypass: (req) => {
          if (req.url.startsWith('/@') || req.url.includes('react-refresh')) {
            return req.url;
          }
        },
      },
      '/security': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        bypass: (req) => {
          if (req.url.startsWith('/@') || req.url.includes('react-refresh')) {
            return req.url;
          }
        },
      },
      // Прокси для статических файлов (аватары пользователей)
      '/users': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        bypass: (req) => {
          if (req.url.startsWith('/@') || req.url.includes('react-refresh')) {
            return req.url;
          }
        },
      },
      // Прокси для других статических файлов (public папка)
      '/public': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        bypass: (req) => {
          if (req.url.startsWith('/@') || req.url.includes('react-refresh')) {
            return req.url;
          }
        },
      },
      // Прокси для статических файлов storage (вложения поддержки)
      '/storage': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        bypass: (req) => {
          if (req.url.startsWith('/@') || req.url.includes('react-refresh')) {
            return req.url;
          }
        },
      },
      // Прокси для WebSocket через Socket.IO
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true, // Включаем поддержку WebSocket
        cookieDomainRewrite: '',
        cookiePathRewrite: '/',
        bypass: (req) => {
          if (req.url.startsWith('/@') || req.url.includes('react-refresh')) {
            return req.url;
          }
        },
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
