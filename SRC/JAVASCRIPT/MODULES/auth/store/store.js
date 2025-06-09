console.log('=== Модуль store.js загружен ===');

import axiosAPI from '../http/axios.js'
import AuthService from "../services/AuthService.js"

console.log('=== Импорты в store.js завершены ===');

// Состояние приложения
let user = {};
let isAuth = false;

// Геттеры для состояния
export const getUser = () => user;
export const getIsAuth = () => isAuth;

// Сеттеры для состояния
export const setAuth = (bool) => {
  isAuth = bool;
};

export const setUser = (newUser) => {
  user = newUser;
};

// Обработка ответа авторизации
const handleAuthResponse = (response) => {
  console.log('handleAuthResponse вызвана с данными:', {
    ...response.data,
    accessToken: response.data.accessToken ? '[скрыт]' : undefined
  });
  localStorage.setItem("accessToken", response.data.accessToken);
  setAuth(true);
  setUser(response.data.user);
  console.log('handleAuthResponse завершена, состояние обновлено');
};

// Сброс авторизации
const resetAuth = () => {
  localStorage.removeItem("accessToken");
  setAuth(false);
  setUser({});
};

// Функция входа
export const login = async (email, password) => {
  try {
    const response = await AuthService.login(email, password);
    handleAuthResponse(response);
  } catch (error) {
    console.error('Login error:', error.response?.data?.message);
    throw error;
  }
};

// Функция регистрации
export const registration = async (email, password) => {
  try {
    const response = await AuthService.registration(email, password);
    handleAuthResponse(response);
  } catch (error) {
    console.error('Registration error:', error.response?.data?.message);
    throw error;
  }
};

// Функция выхода
export const logout = async () => {
  try {
    await AuthService.logout();
    resetAuth();
  } catch (error) {
    console.error('Logout error:', error.response?.data?.message);
    throw error;
  }
};

// Функция проверки авторизации
export const checkAuth = async () => {
  console.log('=== Проверка авторизации в checkAuth===');
  try {
    console.log('Отправляем запрос на /auth/refresh...');
    
    // Добавляем таймаут для запроса
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 5 секунд таймаут
    
    const response = await axiosAPI.get('/auth/refresh', {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    console.log('Ответ сервера при проверке авторизации:', response);
    
    if (response.data && response.data.accessToken) {
      console.log('Авторизация успешна, токен получен');
      handleAuthResponse(response);
      console.log('checkAuth возвращает true');
      return true;
    } else {
      console.log('Токен не получен в ответе');
      resetAuth();
      console.log('checkAuth возвращает false (нет токена)');
      return false;
    }
  } catch (error) {
    console.error('=== Ошибка при проверке авторизации ===');
    console.error('Тип ошибки:', error.constructor.name);
    console.error('Сообщение ошибки:', error.message);
    
    if (error.name === 'AbortError') {
      console.error('Запрос был отменен из-за таймаута');
    } else if (error.response) {
      console.error('Статус ошибки:', error.response.status);
      console.error('Данные ошибки:', error.response.data);
      
      // Проверяем различные статусы ошибок
      switch (error.response.status) {
        case 401:
          console.log('Unauthorized - токен истек или недействителен');
          break;
        case 403:
          console.log('Forbidden - доступ запрещен');
          break;
        case 404:
          console.log('Not Found - эндпоинт не найден');
          break;
        default:
          console.log('Неизвестная ошибка сервера');
      }
    } else if (error.request) {
      console.error('Запрос отправлен, но ответ не получен');
    } else {
      console.error('Ошибка при настройке запроса:', error.message);
    }
    
    resetAuth();
    console.log('checkAuth возвращает false (ошибка)');
    return false;
  }
};

// Экспортируем все функции как объект для совместимости
export default {
  user: getUser,
  isAuth: getIsAuth,
  setAuth,
  setUser,
  login,
  registration,
  logout,
  checkAuth
};