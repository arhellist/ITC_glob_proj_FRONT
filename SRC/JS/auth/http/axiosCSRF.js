import axios from 'axios';
import { API_CONFIG } from '../../../config/api.js';


// Динамически получаем BASE_URL при создании экземпляра
const getBaseURL = () => {
  const baseUrl = API_CONFIG.BASE_URL;
  console.log('=== Конфигурация axiosCSRF ===');
  console.log('API URL:', baseUrl);
  console.log('Environment:', import.meta.env.MODE);
  console.log('Window location:', typeof window !== 'undefined' ? window.location.href : 'server');
  return baseUrl;
};

const axiosCSRF = axios.create({
  baseURL: getBaseURL(), // Вызываем функцию для получения актуального URL
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
        const refreshAxios = axios.create({ baseURL: API_CONFIG.BASE_URL, withCredentials: true });
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