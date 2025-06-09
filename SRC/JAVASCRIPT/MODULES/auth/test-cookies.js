// Тестовый скрипт для проверки работы cookies
import axiosAPI from './http/axios.js';

// Функция для проверки cookies в браузере
function checkCookies() {
  console.log('=== Проверка Cookies ===');
  console.log('document.cookie:', document.cookie);
  
  // Проверяем все cookies
  const cookies = document.cookie.split(';');
  console.log('Все cookies:', cookies);
  
  // Ищем refreshToken
  const refreshTokenCookie = cookies.find(cookie => 
    cookie.trim().startsWith('refreshToken=')
  );
  console.log('Refresh token cookie:', refreshTokenCookie);
}

// Функция для тестирования входа и проверки cookies
export async function testLoginAndCookies() {
  try {
    console.log('=== Тест входа и cookies ===');
    
    // Проверяем cookies до входа
    console.log('Cookies до входа:');
    checkCookies();
    
    // Пытаемся войти
    const loginResponse = await axiosAPI.post('/auth/login', {
      email: 'test@example.com',
      password: 'password123'
    });
    
    console.log('Ответ входа:', loginResponse.data);
    
    // Проверяем cookies после входа
    console.log('Cookies после входа:');
    checkCookies();
    
    // Пытаемся обновить токен
    console.log('=== Тест обновления токена ===');
    const refreshResponse = await axiosAPI.get('/auth/refresh');
    console.log('Ответ обновления:', refreshResponse.data);
    
    // Проверяем cookies после обновления
    console.log('Cookies после обновления:');
    checkCookies();
    
  } catch (error) {
    console.error('Ошибка тестирования:', error);
    console.log('Cookies при ошибке:');
    checkCookies();
  }
}

// Функция для проверки настроек axios
export function checkAxiosSettings() {
  console.log('=== Проверка настроек Axios ===');
  console.log('baseURL:', axiosAPI.defaults.baseURL);
  console.log('withCredentials:', axiosAPI.defaults.withCredentials);
  console.log('headers:', axiosAPI.defaults.headers);
}

// Автоматический запуск проверки при импорте
if (typeof window !== 'undefined') {
  console.log('Тестовый скрипт загружен');
  checkAxiosSettings();
} 