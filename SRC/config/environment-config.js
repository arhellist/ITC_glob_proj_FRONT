/**
 * Конфигурация окружения для фронтенда
 * Автоматически определяет WS/WSS протокол и URL
 */

class FrontendEnvironmentConfig {
  constructor() {
    this.env = this.detectEnvironment();
    this.config = this.getConfig();
  }

  /**
   * Определение окружения фронтенда
   */
  detectEnvironment() {
    // Проверяем hostname для определения окружения
    const hostname = window.location.hostname;
    
    // Продакшен домены
    if (hostname === 'arhellist.ru' || hostname === 'www.arhellist.ru') {
      return 'production';
    }
    
    if (hostname === 'investtimecapital.pro' || hostname === 'www.investtimecapital.pro') {
      return 'production';
    }

    // Локальная разработка
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }

    // По умолчанию - продакшен
    return 'production';
  }

  /**
   * Получение конфигурации для текущего окружения
   */
  getConfig() {
    // Определяем протокол на основе текущего протокола страницы
    // Это позволяет автоматически использовать HTTPS, если фронтенд работает по HTTPS
    const currentProtocol = window.location.protocol === 'https:' ? 'https' : 'http';
    const wsProtocol = currentProtocol === 'https' ? 'wss' : 'ws';
    
    const baseConfig = {
      // API настройки
      api: {
        protocol: this.env === 'production' ? 'https' : currentProtocol,
        host: this.env === 'production' ? window.location.hostname : 'localhost',
        port: this.env === 'production' ? 3443 : 3000
      },
      
      // WebSocket настройки
      websocket: {
        protocol: this.env === 'production' ? 'wss' : wsProtocol,
        host: this.env === 'production' ? window.location.hostname : 'localhost',
        port: this.env === 'production' ? 3443 : 3000
      }
    };

    return baseConfig;
  }

  /**
   * Получение WebSocket URL для подключения
   */
  getWebSocketUrl() {
    // В development при использовании HTTPS используем текущий origin через прокси Vite
    if (this.isDevelopment() && typeof window !== 'undefined' && window.location.protocol === 'https:') {
      // Используем текущий origin (https://localhost:5173), прокси Vite перенаправит на бэкенд
      return window.location.origin; // https://localhost:5173 - прокси обработает /socket.io
    }
    
    const { protocol, host, port } = this.config.websocket;
    return `${protocol}://${host}:${port}`;
  }

  /**
   * Получение API URL для HTTP запросов
   */
  getApiUrl() {
    // В development используем пустую строку, чтобы запросы шли через прокси Vite
    // Это позволяет избежать проблем с CORS и смешанным контентом (HTTPS -> HTTP)
    // Прокси Vite перехватывает запросы к /auth, /api, /profile, /admin, /uploads
    if (this.isDevelopment()) {
      return ''; // Используем относительные пути через прокси Vite
    }
    
    // В production используем полный URL
    const { protocol, host, port } = this.config.api;
    return `${protocol}://${host}:${port}`;
  }

  /**
   * Получение конфигурации для Socket.IO клиента
   */
  getSocketIOConfig() {
    return {
      url: this.getWebSocketUrl(),
      options: {
        transports: ['websocket', 'polling'],
          timeout: 5000, // Уменьшаем таймаут до 5 секунд для быстрого отклика при проблемах с подключением
        forceNew: true,
        autoConnect: false, // Отключаем автоматическое подключение
        // В продакшене используем более строгие настройки
        ...(this.env === 'production' && {
          secure: true,
          rejectUnauthorized: true
        })
      }
    };
  }

  /**
   * Получение конфигурации для Axios
   */
  getAxiosConfig() {
    return {
      baseURL: this.getApiUrl(),
      timeout: 10000,
      withCredentials: true,
      // В продакшене используем более строгие настройки
      ...(this.env === 'production' && {
        https: true
      })
    };
  }

  /**
   * Проверка, включен ли SSL
   */
  isSSLEnabled() {
    // Проверяем, используется ли HTTPS на текущей странице
    return window.location.protocol === 'https:' || this.env === 'production';
  }

  /**
   * Проверка, продакшен ли это
   */
  isProduction() {
    return this.env === 'production';
  }

  /**
   * Проверка, разработка ли это
   */
  isDevelopment() {
    return this.env === 'development';
  }

  /**
   * Логирование конфигурации (только в разработке)
   */
  logConfig() {
    if (this.isDevelopment()) {
      console.log('🔧 Frontend Environment Configuration:');
      console.log(`   Environment: ${this.env}`);
      console.log(`   WebSocket URL: ${this.getWebSocketUrl()}`);
      console.log(`   API URL: ${this.getApiUrl()}`);
      console.log(`   SSL Enabled: ${this.isSSLEnabled()}`);
      console.log(`   Current Hostname: ${window.location.hostname}`);
    }
  }

  /**
   * Получение конфигурации для Vite (если используется)
   */
  getViteConfig() {
    if (this.isDevelopment()) {
      return {
        server: {
          proxy: {
            '/api': {
              target: this.getApiUrl(),
              changeOrigin: true,
              secure: false
            },
            '/socket.io': {
              target: this.getWebSocketUrl(),
              changeOrigin: true,
              secure: false,
              ws: true
            }
          }
        }
      };
    }
    return {};
  }
}

// Создаем глобальный экземпляр
const envConfig = new FrontendEnvironmentConfig();

// Логируем конфигурацию при загрузке
envConfig.logConfig();

export default envConfig;
