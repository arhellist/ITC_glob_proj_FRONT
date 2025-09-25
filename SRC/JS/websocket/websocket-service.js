import io from 'socket.io-client';
import axiosAPI from '../../JS/auth/http/axios.js';

class SecureWebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.heartbeatInterval = null;
    this.connectionCheckInterval = null;
  }

  // Подключение к WebSocket серверу
  async connect() {
    try {
      // Получаем свежий токен
      const token = await this.getValidToken();
      
      if (!token) {
        console.warn('No valid token available for WebSocket connection');
        return false;
      }

      // Подключаемся к серверу
      this.socket = io(process.env.REACT_APP_WS_URL || 'ws://localhost:5000', {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay
      });

      this.setupEventHandlers();
      this.startHeartbeat();
      
      return true;
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.handleReconnect();
      return false;
    }
  }

  // Получение валидного токена
  async getValidToken() {
    try {
      // Проверяем и обновляем токен если нужно
      const response = await axiosAPI.get('/auth/checkAuth');
      return response.data.accessToken;
    } catch (error) {
      console.error('Failed to get valid token:', error);
      return null;
    }
  }

  // Настройка обработчиков событий
  setupEventHandlers() {
    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('WebSocket securely connected');
      
      // Уведомляем о подключении
      document.dispatchEvent(new CustomEvent('websocket-connected'));
    });

    this.socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data);
      
      // Сохраняем информацию о пользователе
      this.userInfo = data;
      
      // Уведомляем о аутентификации
      document.dispatchEvent(new CustomEvent('websocket-authenticated', { 
        detail: data 
      }));
    });

    this.socket.on('notification', (notification) => {
      console.log('Received notification:', notification);
      this.handleSecureNotification(notification);
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log('WebSocket disconnected:', reason);
      
      // Уведомляем об отключении
      document.dispatchEvent(new CustomEvent('websocket-disconnected', { 
        detail: { reason } 
      }));
      
      if (reason === 'io server disconnect') {
        // Сервер принудительно отключил, переподключаемся
        this.handleReconnect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      this.handleReconnect();
    });
  }

  // Обработка безопасного уведомления
  handleSecureNotification(notification) {
    try {
      // Валидация полученного уведомления
      if (!notification || !notification.type || !notification.description) {
        console.warn('Invalid notification received:', notification);
        return;
      }

      // Проверяем тип уведомления
      const validTypes = ['INFO', 'POST', 'SUCCESS', 'ERROR', 'ATTENTION'];
      if (!validTypes.includes(notification.type)) {
        console.warn('Invalid notification type:', notification.type);
        return;
      }

      // Отправляем событие для ContainerNotification
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { 
          type: notification.type.toLowerCase(), 
          text: notification.description,
          header: notification.header,
          id: notification.id,
          timestamp: notification.timestamp
        } 
      }));
      
      // Если это INFO или POST, обновляем список
      if (notification.type === 'INFO' || notification.type === 'POST') {
        document.dispatchEvent(new CustomEvent('main-notify', { 
          detail: { type: 'info' } 
        }));
      }

      // Логируем получение уведомления
      console.log(`Notification received: ${notification.type} - ${notification.header}`);

    } catch (error) {
      console.error('Error handling notification:', error);
    }
  }

  // Heartbeat для поддержания соединения
  startHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping');
      }
    }, 30000); // Ping каждые 30 секунд
  }

  // Проверка соединения
  startConnectionCheck() {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    this.connectionCheckInterval = setInterval(async () => {
      if (!this.isConnected) {
        console.log('Connection lost, attempting to reconnect...');
        await this.connect();
      }
    }, 60000); // Проверяем каждую минуту
  }

  // Обработка переподключения
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      setTimeout(async () => {
        console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
        await this.connect();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.startConnectionCheck();
    }
  }

  // Отправка сообщения (если нужно)
  sendMessage(event, data) {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
      return true;
    }
    return false;
  }

  // Получение статуса соединения
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      userInfo: this.userInfo
    };
  }

  // Отключение
  disconnect() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Переподключение при смене пользователя
  async reconnect() {
    this.disconnect();
    await this.connect();
  }
}

// Создаем единственный экземпляр
const websocketService = new SecureWebSocketService();

// Экспортируем сервис
export default websocketService;

// Экспортируем также класс для тестирования
export { SecureWebSocketService };
