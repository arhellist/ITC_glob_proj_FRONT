/**
 * Конфигурация API для ITC Global React
 * Использует универсальную систему определения окружения
 */

import envConfig from './environment-config'; // Импорт конфигурации окружения для определения URL API

// Получаем базовый URL API из environment config
const getApiUrl = () => { // Функция для получения базового URL API сервера
  // В development при использовании HTTPS (через прокси Vite) игнорируем VITE_API_URL
  // и используем относительные пути для работы через прокси
  const isDevelopment = envConfig.isDevelopment();
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  
  if (isDevelopment && isHttps) {
    // В development с HTTPS используем относительные пути через прокси Vite
    console.log('🔧 getApiUrl: Development + HTTPS - используем относительные пути через прокси');
    return ''; // Пустая строка = относительные пути через прокси
  }
  
  // Проверяем переменную окружения Vite (для переопределения в production или HTTP development)
  if (import.meta.env.VITE_API_URL) { // Проверяем наличие переменной окружения VITE_API_URL
    console.log('🔧 getApiUrl: Используем VITE_API_URL:', import.meta.env.VITE_API_URL); // Логируем использование переменной окружения
    return import.meta.env.VITE_API_URL; // Возвращаем URL из переменной окружения
  }
  
  // Используем автоматически определенный URL из environment config
  const apiUrl = envConfig.getApiUrl(); // Получаем URL из конфигурации окружения
  console.log('🔧 getApiUrl: Используем автоматически определенный URL:', apiUrl); // Логируем автоматически определенный URL
  return apiUrl; // Возвращаем автоматически определенный URL
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
  
  // Если это уже полный URL (http/https), возвращаем как есть
  if (avatarPath.startsWith('http')) {
    return avatarPath;
  }
  
  // Если путь начинается с /, используем его напрямую (работает через прокси)
  if (avatarPath.startsWith('/')) {
    return avatarPath;
  }
  
  // Если BASE_URL пустой (development с HTTPS через прокси), добавляем / перед путем
  const baseUrl = API_CONFIG.BASE_URL;
  if (!baseUrl) {
    return `/${avatarPath}`;
  }
  
  // Иначе добавляем BASE_URL
  return `${baseUrl}${avatarPath.startsWith('/') ? '' : '/'}${avatarPath}`;
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

// Логирование конфигурации
console.log('🔧 API Configuration:', {
  baseUrl: API_CONFIG.BASE_URL,
  environment: envConfig.env,
  isProduction: envConfig.isProduction(),
  isDevelopment: envConfig.isDevelopment(),
  sslEnabled: envConfig.isSSLEnabled(),
  hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
});
