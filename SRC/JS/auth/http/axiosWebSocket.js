import axios from 'axios';
import { API_CONFIG } from '../../../config/api.js';

// Динамически получаем BASE_URL при создании экземпляра
const getBaseURL = () => {
  const baseUrl = API_CONFIG.BASE_URL;
  console.log('=== Конфигурация axiosWebSocket ===');
  console.log('API URL:', baseUrl);
  console.log('Environment:', import.meta.env.MODE);
  return baseUrl;
};

const axiosWebSocket = axios.create({
  baseURL: getBaseURL(),
  timeout: 10000, // 10 секунд таймаут для WebSocket CSRF
  headers: {
    "Content-Type": "application/json"
  },
  withCredentials: true // Обязательно для получения кук
});

// Request interceptor для WebSocket CSRF
axiosWebSocket.interceptors.request.use(
  (config) => {
    console.log(`=== WEBSOCKET CSRF REQUEST ===`);
    console.log(`URL: ${config.url}`);
    console.log(`Method: ${config.method}`);
    console.log(`WithCredentials: ${config.withCredentials}`);
    
    // Для WebSocket CSRF токенов НЕ добавляем Authorization заголовок
    // Это публичный эндпоинт, который не требует аутентификации
    console.log('WebSocket CSRF запрос - без Authorization заголовка');
    
    return config;
  },
  (error) => {
    console.error('WebSocket CSRF Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor для WebSocket CSRF
axiosWebSocket.interceptors.response.use(
  (response) => {
    console.log(`=== WEBSOCKET CSRF RESPONSE ===`);
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, response.headers);
    console.log(`Data:`, response.data);
    
    // Проверяем, что сервер установил куку
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      console.log('WebSocket CSRF: Куки установлены сервером:', setCookieHeader);
    } else {
      console.log('WebSocket CSRF: Куки НЕ установлены сервером');
    }
    
    return response;
  },
  (error) => {
    console.error('WebSocket CSRF Response interceptor error:', error);
    return Promise.reject(error);
  }
);

export default axiosWebSocket;
