import axios from 'axios'; // Импорт HTTP клиента axios для выполнения запросов к API
import { API_CONFIG } from '../../../config/api.js'; // Импорт конфигурации API

// Динамически получаем BASE_URL при создании экземпляра
const getBaseURL = () => {
  // Используем геттер API_CONFIG.BASE_URL, который всегда возвращает актуальное значение
  const baseUrl = API_CONFIG.BASE_URL;
  return baseUrl;
};

const axiosAPI = axios.create({ // Создание экземпляра axios с базовой конфигурацией
  baseURL: getBaseURL(), // Вызываем функцию для получения актуального URL
  timeout: 60000, // Таймаут запросов в миллисекундах (60 секунд)
  headers: {}, // Пустой объект заголовков по умолчанию
  withCredentials: true // Включение отправки куков с запросами
});

// Request interceptor - перехватчик для обработки исходящих запросов
axiosAPI.interceptors.request.use( // Настройка перехватчика запросов
  async (config) => { // Функция обработки каждого исходящего запроса (теперь async)
    // Обновляем baseURL динамически на случай изменения окружения
    const currentBaseURL = API_CONFIG.BASE_URL;
    // В development baseURL должен быть пустой строкой для работы через прокси Vite
    // В production baseURL должен быть установлен в window.location.origin
    config.baseURL = currentBaseURL !== undefined && currentBaseURL !== null ? currentBaseURL : '';
    
    const token = localStorage.getItem("accessToken"); // Получение JWT токена из локального хранилища
   /* console.log(`=== REQUEST INTERCEPTOR ===`); // Закомментированное логирование для отладки
    console.log(`URL: ${config.url}`); // Логирование URL запроса
    console.log(`Method: ${config.method}`); // Логирование HTTP метода
    console.log(`accessToken: ${token}`); // Логирование токена
    console.log(`Current headers:`, config.headers); // Логирование текущих заголовков
    console.log(`Data type:`, typeof config.data); // Логирование типа данных
    console.log(`Data constructor:`, config.data?.constructor?.name); // Логирование конструктора данных
    console.log(`Is FormData:`, config.data instanceof FormData); // Проверка на FormData
    console.log(`Data:`, config.data); // Логирование данных запроса
    */
    
    // Проверяем, является ли запрос публичным (не требует авторизации)
    const isPublicRequest = config.url && (
      config.url.includes('/auth/login') ||
      config.url.includes('/auth/registration') ||
      config.url.includes('/auth/csrf') ||
      config.url.includes('/auth/refresh')
    );
    
    // Для публичных запросов не проверяем токен
    if (isPublicRequest) {
      return config;
    }
    
    // PROACTIVE TOKEN REFRESH: Проверяем срок действия токена перед отправкой запроса
    if (token && isTokenExpiredOrExpiringSoon(token)) {
      console.log('⚠️ Request interceptor: Токен истек или скоро истечет, обновляем...');
      console.log(`   URL запроса: ${config.url}`);
      
      // Если уже идет обновление, ждем его завершения
      if (isRefreshing && refreshPromise) {
        try {
          console.log('⏳ Request interceptor: Ожидаем завершения обновления токена...');
          const newToken = await refreshPromise;
          config.headers.Authorization = `Bearer ${newToken}`;
          console.log('✅ Request interceptor: Используем обновленный токен из очереди');
          return config;
        } catch (error) {
          // Если обновление не удалось, продолжаем с текущим токеном
          // (запрос получит 401 и будет обработан response interceptor'ом)
          console.warn('⚠️ Request interceptor: Не удалось обновить токен из очереди, продолжаем с текущим');
          console.warn('   Запрос будет повторен после обновления токена через response interceptor');
        }
      } else {
        // Запускаем обновление токена
        try {
          console.log('🔄 Request interceptor: Запускаем обновление токена...');
          const newToken = await refreshToken();
          config.headers.Authorization = `Bearer ${newToken}`;
          console.log('✅ Request interceptor: Токен обновлен перед отправкой запроса');
          return config;
        } catch (error) {
          // Если обновление не удалось, продолжаем с текущим токеном
          console.warn('⚠️ Request interceptor: Не удалось обновить токен, продолжаем с текущим');
          console.warn('   Запрос будет повторен после обновления токена через response interceptor');
        }
      }
    }
    
    // Принудительно устанавливаем токен для всех запросов
    if (token) { // Проверяем наличие токена
      config.headers.Authorization = `Bearer ${token}`;
      // Логируем только важные запросы (уменьшаем шум в консоли)
      if (config.url.includes('/behavioral-biometrics') || 
          config.url.includes('/notifications') || 
          config.url.includes('/publications')) {
        console.log(`✅ API Request: ${config.method.toUpperCase()} ${config.url}`);
        console.log(`   Token: ${token.substring(0, 20)}...`);
      }
    } else {
      console.log('❌ Authorization заголовок НЕ установлен - нет токена');
      console.log(`❌ Request URL: ${config.url}`);
    }
    
    // Для FormData позволяем браузеру выставить boundary сам
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
    }
    
 //   console.log(`Final headers:`, config.headers);
 //   console.log(`=== END REQUEST INTERCEPTOR ===`);
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Флаг для предотвращения одновременных refresh запросов
let isRefreshing = false;
let failedQueue = [];
let refreshPromise = null; // Промис для обновления токена

/**
 * Декодирование JWT токена без проверки подписи (для проверки exp)
 */
function decodeJWT(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

/**
 * Проверка, истек ли токен или скоро истечет (за 8 минут до истечения)
 * Токен живет 10 минут, поэтому обновляем за 8 минут до истечения для надежности
 */
function isTokenExpiredOrExpiringSoon(token) {
  if (!token) return true;
  
  try {
    const decoded = decodeJWT(token);
    if (!decoded || !decoded.exp) {
      console.warn('⚠️ Token check: Не удалось декодировать токен или отсутствует exp');
      return true;
    }
    
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = decoded.exp;
    const timeUntilExpiry = expiresAt - now;
    
    // Токен истек или истечет в течение 8 минут (480 секунд)
    // Это дает запас в 2 минуты до истечения токена (который живет 10 минут)
    const shouldRefresh = timeUntilExpiry <= 480; // 8 минут = 480 секунд
    
    if (shouldRefresh) {
      console.log(`⚠️ Token check: Токен истечет через ${Math.floor(timeUntilExpiry / 60)} минут, требуется обновление`);
    }
    
    return shouldRefresh;
  } catch (error) {
    console.warn('⚠️ Token check: Ошибка декодирования токена для проверки срока действия:', error);
    return true; // В случае ошибки считаем токен невалидным
  }
}

/**
 * Обновление токена (с защитой от одновременных вызовов)
 */
async function refreshToken() {
  // Если уже идет обновление, возвращаем существующий промис
  if (refreshPromise) {
    return refreshPromise;
  }
  
  refreshPromise = (async () => {
    try {
      console.log('🔄 Начинаем обновление токена...');
      const refreshAxios = axios.create({ baseURL: API_CONFIG.BASE_URL, withCredentials: true });
      const { data } = await refreshAxios.get('/auth/refresh');
      
      if (data && data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        axiosAPI.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
        console.log('✅ Токен успешно обновлен');
        return data.accessToken;
      }
      throw new Error('No accessToken received');
    } catch (error) {
      console.error('❌ Ошибка обновления токена:', error);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      delete axiosAPI.defaults.headers.Authorization;
      throw error;
    } finally {
      refreshPromise = null;
    }
  })();
  
  return refreshPromise;
}

const processQueue = (error, token = null) => {
  const queue = [...failedQueue];
  failedQueue = [];
  
  queue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
};

// Response interceptor
axiosAPI.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const status = error.response?.status;
    
    // Логируем все 401 ошибки
    if (status === 401) {
      console.log(`❌ 401 Unauthorized for: ${originalRequest.method.toUpperCase()} ${originalRequest.url}`);
      console.log(`   Headers:`, originalRequest.headers);
    }
    
    const isOnLogin = typeof window !== 'undefined' && window.location && window.location.pathname === '/login';
    const isPublic = originalRequest?.url && (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/registration') ||
      originalRequest.url.includes('/auth/csrf') ||
      originalRequest.url.includes('/auth/refresh')
    );
    
    // Проверяем, находимся ли мы на публичных страницах
    const isOnPublicPage = typeof window !== 'undefined' && window.location && (
      window.location.pathname === '/login' ||
      window.location.pathname === '/registration' ||
      window.location.pathname.startsWith('/profile/activate/') ||
      window.location.pathname.startsWith('/ref/')
    );
    
    // На странице логина, публичных страницах и для публичных запросов не запускаем refresh-ретрай
    if (isOnLogin || isPublic || isOnPublicPage) {
      return Promise.reject(error);
    }
    
    // Проверяем сообщение об ошибке для определения типа проблемы
    const errorMessage = error.response?.data?.message || error.message || '';
    const isTokenExpired = errorMessage.includes('Token expired') || 
                          errorMessage.includes('Токен невалиден или истек') ||
                          errorMessage.includes('expired') ||
                          status === 401;
    
    // Обрабатываем ошибки 401 для всех запросов (кроме refresh)
    // Обрабатываем как "Token expired", так и другие 401 ошибки
    if (isTokenExpired && 
        !originalRequest._retry && 
        !originalRequest.url.includes('/auth/refresh')) {
      
      // Если уже идет процесс обновления токена, добавляем запрос в очередь
      if (isRefreshing && refreshPromise) {
        console.log(`⏳ Response interceptor: Токен уже обновляется, добавляем запрос в очередь: ${originalRequest.url}`);
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            if (token) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              console.log(`✅ Response interceptor: Повторяем запрос с новым токеном: ${originalRequest.url}`);
              return axiosAPI(originalRequest);
            } else {
              return Promise.reject(new Error('Token refresh failed'));
            }
          })
          .catch(err => {
            console.error(`❌ Response interceptor: Ошибка при повторной отправке запроса ${originalRequest.url}:`, err);
            return Promise.reject(err);
          });
      }
      
      // Помечаем запрос как повторяемый и запускаем обновление токена
      originalRequest._retry = true;
      
      console.log(`🔄 Response interceptor: обрабатываем ошибку 401 для ${originalRequest.url}`);
      console.log(`   Сообщение об ошибке: ${errorMessage}`);
      
      try {
        // Используем общую функцию refreshToken для избежания дублирования
        // Функция сама управляет флагом isRefreshing
        const newToken = await refreshToken();
        
        if (newToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          
          // Обрабатываем очередь ожидающих запросов
          processQueue(null, newToken);
          isRefreshing = false;
          
          console.log(`✅ Response interceptor: токен обновлен, повторяем запрос: ${originalRequest.url}`);
          return axiosAPI(originalRequest);
        }
        throw new Error('No accessToken received');
      } catch (refreshError) {
        console.error('❌ Response interceptor: ошибка при обновлении токена:', refreshError);
        isRefreshing = false;
        processQueue(refreshError, null);
        
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        delete axiosAPI.defaults.headers.Authorization;
        
        // Если это не запрос к /auth/checkAuth, перенаправляем на логин
        // НО только если мы не находимся уже на публичных страницах
        if (!originalRequest.url.includes('/auth/checkAuth') && 
            !originalRequest.url.includes('/profile/correct-profileData') &&
            !originalRequest.url.includes('/behavioral-biometrics/analyze') && // Не перенаправляем для behavioral biometrics
            !isOnPublicPage) {
          console.log('🔄 Response interceptor: перенаправляем на логин из-за ошибки refresh');
          window.location.href = '/login';
        } else {
          console.log('⏭️ Response interceptor: пропускаем перенаправление - уже на публичной странице или это специальный запрос');
        }
        
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosAPI;