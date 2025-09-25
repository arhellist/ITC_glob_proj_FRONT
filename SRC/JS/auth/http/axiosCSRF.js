import axios from 'axios';

// Определяем API URL в зависимости от окружения
// eslint-disable-next-line no-undef
const url = typeof __API_URL__ !== 'undefined' ? __API_URL__ :  (typeof __IS_PRODUCTION__ !== 'undefined' && __IS_PRODUCTION__ ? 'https://arhellist.ru' : 'http://localhost:3000');


console.log('=== Конфигурация axiosCSRF ===');
console.log('API URL:', url);
// eslint-disable-next-line no-undef
console.log('Is Production:', typeof __IS_PRODUCTION__ !== 'undefined' ? __IS_PRODUCTION__ : 'undefined');
// eslint-disable-next-line no-undef
console.log('Domain:', typeof __DOMAIN__ !== 'undefined' ? __DOMAIN__ : 'undefined');

const axiosCSRF = axios.create({
  baseURL: url,
  timeout: 60000, // 60 секунд таймаут
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true // Добавляем по умолчанию
});

// Request interceptor
axiosCSRF.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    console.log(`accessToken axiosCSRF.interceptors.request.use: ${token}` )
    
    // Добавляем Authorization заголовок если есть токен
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Authorization заголовок добавлен:', config.headers.Authorization);
    } else {
      console.log('Authorization заголовок НЕ добавлен - нет токена');
    }
    
    // CSRF токен автоматически отправляется через httpOnly куки
    // Браузер сам добавляет куку в каждый запрос
    console.log('CSRF токен будет отправлен через httpOnly куки');
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosCSRF.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/refresh')) {
      originalRequest._retry = true;
      try {
        const refreshAxios = axios.create({ baseURL: url, withCredentials: true });
        const { data } = await refreshAxios.get('/auth/refresh');
        console.log('Refresh token data:', data); // Теперь будет выводиться
        if (data.accessToken) {
          localStorage.setItem('accessToken', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return axiosCSRF(originalRequest);
        }
        throw new Error('No accessToken received');
      } catch (refreshError) {
        localStorage.removeItem('accessToken');
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default axiosCSRF;