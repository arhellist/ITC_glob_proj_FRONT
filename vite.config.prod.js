import { defineConfig } from 'vite'

export default defineConfig({
  // Корневая директория проекта
  root: '.',
  
  // Директория для сборки
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false,
        drop_debugger: false,
        pure_funcs: []
      },
      mangle: {
        toplevel: true,
        safari10: true,
        reserved: ['__VERSION__', 'axios', 'localStorage', 'window', 'document', 'console', 'console.log', 'console.error', 'console.warn', 'console.info']
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      input: {
        main: 'index.html'
      },
      output: {
        entryFileNames: 'js/[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(css)$/.test(assetInfo.name)) {
            return `css/[name]-[hash].${ext}`
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `images/[name]-[hash].${ext}`
          }
          return `assets/[name]-[hash].${ext}`
        },
        compact: true,
        generatedCode: {
          constBindings: true
        }
      }
    }
  },
  
  // Настройки для production preview
  preview: {
    port: 4173,
    host: true,
    cors: true,
    proxy: {
      '/auth': {
        target: 'https://arhellist.ru',
        changeOrigin: true,
        secure: true,
        ws: true
      },
      '/api': {
        target: 'https://arhellist.ru',
        changeOrigin: true,
        secure: true
      }
    }
  },
  
  // Настройки для оптимизации
  optimizeDeps: {
    include: ['axios']
  },
  
  // Настройки для CSS
  css: {
    devSourcemap: false
  },
  
  // Настройки для resolve
  resolve: {
    alias: {
      '@': '/SRC/JAVASCRIPT',
      '@modules': '/SRC/JAVASCRIPT/MODULES',
      '@auth': '/SRC/JAVASCRIPT/MODULES/auth',
      '@pages': '/SRC/JAVASCRIPT/MODULES/pages',
      '@utils': '/SRC/JAVASCRIPT/MODULES/utils'
    }
  },
  
  // Настройки для define - PRODUCTION
  define: {
    __VERSION__: JSON.stringify(process.env.npm_package_version),
    __API_URL__: JSON.stringify('https://arhellist.ru'),
    __IS_PRODUCTION__: true,
    __DOMAIN__: JSON.stringify('arhellist.ru')
  },

  esbuild: {
    drop: []
  }
}) 