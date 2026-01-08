/**
 * Конфигурация API для ITC Global React
 * Использует универсальную систему определения окружения
 */

import envConfig from './environment-config'; // Импорт конфигурации окружения для определения URL API

// Получаем базовый URL API из environment config
const getApiUrl = () => { // Функция для получения базового URL API сервера
  // В development ВСЕГДА используем пустую строку для работы через прокси Vite
  // Это критично для передачи кук между HTTPS фронтендом и HTTP бэкендом
  if (envConfig.isDevelopment()) {
    return ''; // Относительные пути через прокси Vite dev сервера
  }
  
  // В production всегда используем window.location.origin (надежнее, чем переменные окружения при сборке)
  if (envConfig.isProduction() && typeof window !== 'undefined' && window.location) {
    return window.location.origin;
  }
  
  // Используем автоматически определенный URL из environment config (fallback)
  return envConfig.getApiUrl();
};

// Экспортируем конфигурацию API для использования в других модулях
// Используем функцию вместо прямого вызова, чтобы BASE_URL вычислялся динамически
export const API_CONFIG = { // Объект конфигурации API
  get BASE_URL() { // Геттер для динамического получения BASE_URL
    return getApiUrl();
  },
  TIMEOUT: 10000, // Таймаут HTTP запросов в миллисекундах
  RETRY_ATTEMPTS: 3, // Количество попыток повторного запроса при ошибке
};

// Функция для получения полного URL аватара
export const getAvatarUrl = (avatarPath) => {
  if (!avatarPath || avatarPath === 'noAvatar') {
    return null;
  }
  
  // Преобразуем в строку на случай если это не строка
  let normalizedPath = String(avatarPath).trim();
  
  // Логируем исходный путь для диагностики
  if (normalizedPath.includes('localhost') || normalizedPath.includes('127.0.0.1')) {
    console.warn('⚠️ getAvatarUrl: Обнаружен localhost в пути аватара:', normalizedPath);
  }
  
  // Агрессивная нормализация: извлекаем только путь после домена
  // Обрабатываем случаи: http://localhost:3000/users/... или http://127.0.0.1:3000/users/...
  const localhostMatch = normalizedPath.match(/(?:https?:\/\/)?(?:localhost|127\.0\.0\.1)(?::\d+)?\/(users\/.*?)(?:\?|$)/i);
  if (localhostMatch && localhostMatch[1]) {
    normalizedPath = '/' + localhostMatch[1];
    console.log('✅ getAvatarUrl: Извлечен путь из localhost URL:', avatarPath, '->', normalizedPath);
  } else {
    // Нормализуем URL: убираем localhost если есть (различные варианты)
    normalizedPath = normalizedPath
      .replace(/https?:\/\/localhost:3000/gi, '')
      .replace(/https?:\/\/127\.0\.0\.1:3000/gi, '')
      .replace(/http:\/\/localhost:3000/gi, '')
      .replace(/http:\/\/127\.0\.0\.1:3000/gi, '')
      .replace(/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/gi, '');
    
    // Дополнительная проверка: если все еще есть localhost, извлекаем путь
    if (normalizedPath.includes('localhost') || normalizedPath.includes('127.0.0.1')) {
      console.warn('⚠️ getAvatarUrl: localhost все еще присутствует, применяем агрессивную нормализацию');
      // Извлекаем только путь после /users/
      const usersMatch = normalizedPath.match(/\/(users\/.*?)(?:\?|$)/);
      if (usersMatch) {
        normalizedPath = '/' + usersMatch[1];
      } else {
        // Пробуем найти первый / после localhost
        const localhostIndex = normalizedPath.indexOf('localhost');
        const ipIndex = normalizedPath.indexOf('127.0.0.1');
        const index = localhostIndex > -1 ? localhostIndex : ipIndex;
        if (index > -1) {
          const slashAfter = normalizedPath.indexOf('/', index);
          if (slashAfter > -1) {
            normalizedPath = normalizedPath.substring(slashAfter);
          }
        }
      }
    }
  }
  
  // Если после замены осталась пустая строка, возвращаем null
  if (!normalizedPath || normalizedPath.trim() === '' || normalizedPath.trim() === '/') {
    console.warn('⚠️ getAvatarUrl: После нормализации путь пуст, возвращаем null');
    return null;
  }
  
  // Убираем лишние слэши в начале, но оставляем один
  normalizedPath = normalizedPath.replace(/^\/+/, '/');
  
  // Если это уже полный URL (http/https) после нормализации, НЕ возвращаем - продолжаем обработку
  if (normalizedPath.startsWith('http')) {
    console.warn('⚠️ getAvatarUrl: После нормализации все еще полный URL, пытаемся извлечь путь:', normalizedPath);
    // Пытаемся извлечь путь из полного URL
    try {
      const url = new URL(normalizedPath);
      normalizedPath = url.pathname;
    } catch (e) {
      // Если не получилось распарсить, пробуем найти путь после домена
      const pathMatch = normalizedPath.match(/\/(users\/.*?)(?:\?|$)/);
      if (pathMatch) {
        normalizedPath = '/' + pathMatch[1];
      }
    }
  }
  
  // Если путь начинается с /, используем его напрямую (работает через прокси)
  if (normalizedPath.startsWith('/')) {
    if (avatarPath.includes('localhost') || avatarPath.includes('127.0.0.1')) {
      console.log('✅ getAvatarUrl: Нормализован путь с localhost:', avatarPath, '->', normalizedPath);
    }
    return normalizedPath;
  }
  
  // Если BASE_URL пустой (development с HTTPS через прокси), добавляем / перед путем
  const baseUrl = API_CONFIG.BASE_URL;
  if (!baseUrl) {
    return `/${normalizedPath}`;
  }
  
  // Иначе добавляем BASE_URL
  return `${baseUrl}${normalizedPath.startsWith('/') ? '' : '/'}${normalizedPath}`;
};

// Функция для получения дефолтного аватара
export const getDefaultAvatarUrl = (gender = 'male') => {
  return `/src/IMG/${gender}/ava.png`;
};

// Функция для получения полного URL аватара с дефолтным значением
export const getFullAvatarUrl = (avatarPath, gender = 'male') => {
  const avatarUrl = getAvatarUrl(avatarPath);
  return avatarUrl || getDefaultAvatarUrl(gender);
};

// Логирование конфигурации (только в development)
if (envConfig.isDevelopment()) {
  console.log('🔧 API Configuration:', {
    baseUrl: API_CONFIG.BASE_URL,
    environment: envConfig.env,
    isProduction: envConfig.isProduction(),
    isDevelopment: envConfig.isDevelopment(),
    sslEnabled: envConfig.isSSLEnabled(),
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
  });
}
