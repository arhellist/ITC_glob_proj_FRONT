import axiosAPI from "../http/axios.js"; // Импорт настроенного HTTP клиента с авторизацией
import axiosCSRF from "../http/axiosCSRF.js"; // Импорт HTTP клиента с CSRF защитой
import axiosWebSocket from "../http/axiosWebSocket.js"; // Импорт HTTP клиента для WebSocket запросов

export async function login(email, password, recaptchaToken = null, deviceInfo = null) { // Функция входа пользователя принимает email, пароль и опциональный reCAPTCHA токен
  try { // Начинаем блок обработки ошибок
    console.log('=== Попытка входа ==='); // Логирование начала процесса входа
    console.log('Email:', email); // Логирование email пользователя
    console.log('CSRF-токен в window.csrfToken:', window.csrfToken); // Логирование CSRF токена
    
    const requestData = { email, password }; // Создаем объект с данными для входа
    
    // Добавляем reCAPTCHA токен если он есть для защиты от ботов
    if (recaptchaToken) { // Проверяем наличие reCAPTCHA токена
      requestData.recaptcha_token = recaptchaToken; // Добавляем токен в данные запроса
      console.log('reCAPTCHA токен добавлен'); // Логируем добавление токена
    }
    
    // Добавляем информацию об устройстве и отпечаток
    if (deviceInfo) {
      requestData.deviceInfo = deviceInfo;
      console.log('DeviceInfo добавлен в запрос');
    }
    
    // CSRF-токен автоматически добавляется в axiosCSRF interceptor
    console.log('Отправляем запрос на /auth/login с данными:', requestData); // Логирование данных запроса
    
    const response = await axiosCSRF.post("/auth/login", requestData); // Отправляем POST запрос на сервер для входа

    console.log(`response in LOGIN: `); console.log(response); // Логирование ответа сервера
    if (!response.data.token) { // Проверяем наличие токена в ответе
      throw new Error("No accessToken in response"); // Выбрасываем ошибку если токен отсутствует
    }

    console.log(`return response in LOGIN: `); // Логирование возврата ответа
    return response; // Возвращаем ответ сервера с токеном
  } catch (error) {
    console.error('Ошибка в login:', error);
    throw error;
  }
}

export async function registration(email, password, name, surname, patronymic, phone, captcha, referralCode) {
  if (!email || !password) {
    throw new Error("Email и пароль обязательны");
  }

  try {
    console.log('=== Попытка регистрации ===');
    console.log('Email:', email);
    console.log('CSRF-токен в window.csrfToken:', window.csrfToken);
    
    const requestData = { email, password, name, surname, patronymic, phone, captcha, referralCode };
    
    // CSRF-токен автоматически добавляется в axiosCSRF interceptor
    console.log('Отправляем запрос на /auth/registration с данными:', requestData);
      
    const response = await axiosCSRF.post("/auth/registration", requestData);

    console.log(`response`);console.log(response)

    if (!response.data) {
      throw new Error("Пустой ответ от сервера");
    }

    return response;
  } catch (error) {
    console.error('Ошибка в registration:', error);
    throw error;
  }
}

export async function logout() {
  const response = await axiosAPI.post("/auth/logout");

  if (!response.data) {
    throw new Error("Пустой ответ от сервера");
  }

  return response;
}

export async function getCSRF() {
  try {
    console.log('=== Получение CSRF-токена ===');
    const response = await axiosAPI.get("/auth/csrf");
    console.log('CSRF ответ от сервера:', response.data);
    
    // Сервер должен установить httpOnly куку с CSRF токеном
    // Мы не получаем токен в ответе, только подтверждение что кука установлена
    console.log('CSRF кука должна быть установлена сервером');
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении CSRF-токена:', error);
    throw error;
  }
}

export async function getWebSocketCSRF() {
  try {
    console.log('=== Получение WebSocket CSRF-токена ===');
    const response = await axiosWebSocket.get("/auth/ws-csrf");
    console.log('WebSocket CSRF ответ от сервера:', response.data);
    
    // Сервер должен установить httpOnly куку с WebSocket CSRF токеном
    console.log('WebSocket CSRF кука должна быть установлена сервером');
    return response.data;
  } catch (error) {
    console.error('Ошибка при получении WebSocket CSRF-токена:', error);
    throw error;
  }
}

// Экспортируем по умолчанию объект с функциями для совместимости
export default {
  login,
  registration,
  logout,
  getCSRF,
  getWebSocketCSRF,
};
