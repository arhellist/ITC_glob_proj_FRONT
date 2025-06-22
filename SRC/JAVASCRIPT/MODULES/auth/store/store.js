import axiosAPI from '../http/axios.js'
import {login as authLogin, registration as authRegistration, logout as authLogout}   from "../services/AuthService.js"

// Состояние приложения
let user = {};
let responseAxios = {}
let isAuth = false;

// Геттеры для состояния
export const getUser = () => user;
export const getIsAuth = () => isAuth;
export const getResponse = () => responseAxios;

// Сеттеры для состояния
export const setAuth = (bool) => {
  isAuth = bool;
};

export const setUser = (newUser) => {
  user = newUser;
};

export const setResponse = (newresponseAxios) => {
  responseAxios = newresponseAxios;
};

// Обработка ответа авторизации
const handleAuthResponse = (response) => {
  console.log(`handleAuthResponse started`)

  console.log(`token = ${response.data.token}`)
  console.log(`data = `);console.log(response.data)

  if (!response?.data?.token) {
    throw new Error('Invalid auth response');
  }
  
  try {
    localStorage.setItem("accessToken", response.data.token);
    setAuth(true);
    setUser(response.data.user);
  } catch (storageError) {
    console.error('❌ Ошибка при сохранении в localStorage:', storageError);
    throw storageError;
  }
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
    const response = await authLogin(email, password);
    handleAuthResponse(response);
    await checkAuth();
    return response;
  } catch (error) {
    throw error;
  }
};

// Функция регистрации
export const registration = async (email, password, name, surname, patronymic, phone) => {
  try {
    const response = await authRegistration(email, password, name, surname, patronymic, phone);
    handleAuthResponse(response);
    await checkAuth();
  } catch (error) {
    throw error;
  }
};

// Функция выхода
export const logout = async () => {
  try {
    await authLogout();
    resetAuth();
  } catch (error) {
    throw error;
  }
};

export const checkAuth = async () => {
  try {
    // Проверяем токен перед запросом
    const token = localStorage.getItem("accessToken");
    console.log('=== checkAuth ===');
    console.log('Токен в localStorage:', token ? 'ЕСТЬ' : 'НЕТ');

    
    console.log('Отправляем запрос на /auth/checkAuth...');
    const response = await axiosAPI.get('/auth/checkAuth');

    
    if (response.data && response.data.token) {
      handleAuthResponse(response);
      return true;
    } else {
      resetAuth();
      return false;
    }
  } catch (error) {
    console.log('checkAuth завершился с ошибкой:', error.message);
    console.log('Полная ошибка:', error);
    resetAuth();
    return false;
  }
};

// Экспортируем все функции как объект для совместимости
export default {
  user: getUser,
  isAuth: getIsAuth,
  setAuth,
  setUser,
  setResponse,
  login,
  registration,
  logout,
  checkAuth,
};


