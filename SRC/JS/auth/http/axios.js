import axios from 'axios'; // Импорт HTTP клиента axios для выполнения запросов к API
import { API_CONFIG } from '../../../config/api.js'; // Импорт конфигурации API

// Динамически получаем BASE_URL при создании экземпляра
const getBaseURL = () => {
  const baseUrl = API_CONFIG.BASE_URL;
  console.log('=== Конфигурация axios ==='); // Логирование начала конфигурации axios
  console.log('API URL:', baseUrl); // Логирование базового URL API
  console.log('Environment:', import.meta.env.MODE); // Логирование текущего окружения
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
  (config) => { // Функция обработки каждого исходящего запроса
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
    
    // Принудительно устанавливаем токен для всех запросов
    if (token) { // Проверяем наличие токена
      config.headers.Authorization = `Bearer ${token}`;
      // Логируем для всех запросов, включая профильные
      console.log(`✅ API Request: ${config.method.toUpperCase()} ${config.url}`);
      console.log(`   Token: ${token.substring(0, 20)}...`);
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

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
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
    
    // Обрабатываем ошибки 401 для всех запросов (кроме refresh)
    if (status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url.includes('/auth/refresh')) {
      
      // Если уже идет процесс обновления токена, добавляем запрос в очередь
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosAPI(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      console.log(`🔄 Response interceptor: обрабатываем ошибку 401 для ${originalRequest.url}`);
      
      try {
        const refreshAxios = axios.create({ baseURL: API_CONFIG.BASE_URL, withCredentials: true });
        const { data } = await refreshAxios.get('/auth/refresh');
        console.log('✅ Refresh token успешен, получен новый accessToken');
        
        if (data && data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          axiosAPI.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          
          // Обрабатываем очередь ожидающих запросов
          processQueue(null, data.accessToken);
          isRefreshing = false;
          
          console.log('✅ Response interceptor: токен обновлен, повторяем запрос');
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
            !isOnPublicPage) {
          console.log('🔄 Response interceptor: перенаправляем на логин из-за ошибки refresh');
          window.location.href = '/login';
        } else {
          console.log('⏭️ Response interceptor: пропускаем перенаправление - уже на публичной странице или это checkAuth');
        }
        
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosAPI;