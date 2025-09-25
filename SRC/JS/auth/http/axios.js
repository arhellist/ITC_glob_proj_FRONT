import axios from 'axios';

// Определяем API URL в зависимости от окружения
// eslint-disable-next-line no-undef
const url = typeof __API_URL__ !== 'undefined' ? __API_URL__ :  (typeof __IS_PRODUCTION__ !== 'undefined' && __IS_PRODUCTION__ ? 'https://arhellist.ru' : 'http://localhost:3000');

console.log('=== Конфигурация axios ===');
console.log('API URL:', url);
// eslint-disable-next-line no-undef
console.log('Is Production:', typeof __IS_PRODUCTION__ !== 'undefined' ? __IS_PRODUCTION__ : 'undefined');
// eslint-disable-next-line no-undef
console.log('Domain:', typeof __DOMAIN__ !== 'undefined' ? __DOMAIN__ : 'undefined');

const axiosAPI = axios.create({
  baseURL: url,
  timeout: 60000, // 20 секунд таймаут
  headers: {},
  withCredentials: true // Добавляем по умолчанию
});

// Request interceptor
axiosAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
   /* console.log(`=== REQUEST INTERCEPTOR ===`);
    console.log(`URL: ${config.url}`);
    console.log(`Method: ${config.method}`);
    console.log(`accessToken: ${token}`);
    console.log(`Current headers:`, config.headers);
    console.log(`Data type:`, typeof config.data);
    console.log(`Data constructor:`, config.data?.constructor?.name);
    console.log(`Is FormData:`, config.data instanceof FormData);
    console.log(`Data:`, config.data);*/
    
    // Принудительно устанавливаем токен для всех запросов
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
  //ё    console.log('✅ Authorization заголовок установлен:', config.headers.Authorization);
    } else {
      console.log('❌ Authorization заголовок НЕ установлен - нет токена');
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

// Response interceptor
axiosAPI.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const isOnLogin = typeof window !== 'undefined' && window.location && window.location.pathname === '/login';
    const isPublic = originalRequest?.url && (
      originalRequest.url.includes('/auth/login') ||
      originalRequest.url.includes('/auth/registration') ||
      originalRequest.url.includes('/auth/csrf') ||
      originalRequest.url.includes('/auth/refresh')
    );
    // На странице логина и для публичных запросов не запускаем refresh-ретрай
    if (isOnLogin || isPublic) {
      return Promise.reject(error);
    }
    
    // Обрабатываем ошибки 401 для всех запросов (кроме refresh)
    if (status === 401 && 
        !originalRequest._retry && 
        !originalRequest.url.includes('/auth/refresh')) {
      
      originalRequest._retry = true;
      //console.log(`Response interceptor: обрабатываем ошибку 401 для ${originalRequest.url}`);
      
      try {
        const refreshAxios = axios.create({ baseURL: url, withCredentials: true });
        const { data } = await refreshAxios.get('/auth/refresh');
        //console.log('Refresh token data:', data);
        
        if (data && data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          axiosAPI.defaults.headers.Authorization = `Bearer ${data.accessToken}`;
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          //console.log('Response interceptor: токен обновлен, повторяем запрос');
          //console.log('Новый accessToken:', data.accessToken);
          return axiosAPI(originalRequest);
        }
        throw new Error('No accessToken received');
      } catch (refreshError) {
        console.log('Response interceptor: ошибка при обновлении токена, очищаем localStorage');
        localStorage.removeItem('accessToken');
        delete axiosAPI.defaults.headers.Authorization;
        
        // Если это не запрос к /auth/checkAuth, перенаправляем на логин
        if (!originalRequest.url.includes('/auth/checkAuth') && !originalRequest.url.includes('/profile/correct-profileData')) {
          window.location.href = '/login';
        }
        
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosAPI;