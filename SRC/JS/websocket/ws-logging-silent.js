/**
 * ВРЕМЕННЫЙ ФАЙЛ для отключения WS логов
 * Просто замените все console.log в websocket-service.js на wsLog
 * и импортируйте этот файл
 */

const WS_LOGGING_ENABLED = false;

export const wsLog = (...args) => {
  if (WS_LOGGING_ENABLED) {
    console.log(...args);
  }
};

export const wsError = (...args) => {
  // Ошибки всегда логируем
  console.error(...args);
};

export default { wsLog, wsError };

