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
  
  // Настройки сервера разработки
  server: {
    port: 5173,
    host: true,
    open: true,
    cors: true,
    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  
  // Настройки для оптимизации
  optimizeDeps: {
    include: ['axios']
  },
  
  // Настройки для CSS
  css: {
    devSourcemap: true
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
  
  // Настройки для define
  define: {
    __VERSION__: JSON.stringify(process.env.npm_package_version),
    __API_URL__: JSON.stringify('http://localhost:3000'),
    __IS_PRODUCTION__: false,
    __DOMAIN__: JSON.stringify('localhost')
  },

  esbuild: {
    drop: []
  }
}) 