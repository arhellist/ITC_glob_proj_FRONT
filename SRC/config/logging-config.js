/**
 * Конфигурация логирования
 */

export const LOGGING_CONFIG = {
  // WebSocket логирование
  websocket: {
    enabled: false, // Отключить все WS логи
    verbose: false, // Подробные логи
    heartbeat: false, // Логи heartbeat
    connection: true, // Логи подключения/отключения (оставить только важное)
    errors: true // Логи ошибок
  },

  // API логирование
  api: {
    enabled: true,
    errors: true,
    requests: false // Не логировать каждый запрос
  },

  // Support/CRM логирование
  support: {
    enabled: true,
    verbose: true
  }
};

// Условный лог для WebSocket
export const wsLog = (...args) => {
  if (LOGGING_CONFIG.websocket.enabled) {
    console.log(...args);
  }
};

// Условный лог для ошибок WebSocket
export const wsError = (...args) => {
  if (LOGGING_CONFIG.websocket.errors) {
    console.error(...args);
  }
};

export default LOGGING_CONFIG;

