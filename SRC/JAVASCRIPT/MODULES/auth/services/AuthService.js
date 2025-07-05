import axiosAPI from "../http/axios.js";
import axiosCSRF from "../http/axiosCSRF.js";

export async function login(email, password, recaptchaToken = null) {
  try {
    console.log('=== Попытка входа ===');
    console.log('Email:', email);
    console.log('CSRF-токен в window.csrfToken:', window.csrfToken);
    
    const requestData = { email, password };
    
    // Добавляем reCAPTCHA токен если он есть
    if (recaptchaToken) {
      requestData.recaptcha_token = recaptchaToken;
      console.log('reCAPTCHA токен добавлен');
    }
    
    // CSRF-токен автоматически добавляется в axiosCSRF interceptor
    console.log('Отправляем запрос на /auth/login с данными:', requestData);
    
    const response = await axiosCSRF.post("/auth/login", requestData);

    console.log(`response in LOGIN: `); console.log(response);
    if (!response.data.token) {
      throw new Error("No accessToken in response");
    }

    console.log(`return response in LOGIN: `);
    return response;
  } catch (error) {
    console.error('Ошибка в login:', error);
    throw error;
  }
}

export async function registration(email, password, name, surname, patronymic, phone, captcha) {
  if (!email || !password) {
    throw new Error("Email и пароль обязательны");
  }

  try {
    console.log('=== Попытка регистрации ===');
    console.log('Email:', email);
    console.log('CSRF-токен в window.csrfToken:', window.csrfToken);
    
    const requestData = { email, password, name, surname, patronymic, phone, captcha };
    
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
  try {
    const response = await axiosAPI.post("/auth/logout");

    if (!response.data) {
      throw new Error("Пустой ответ от сервера");
    }

    return response;
  } catch (error) {
    throw error;
  }
}

export async function getCSRF() {
  try {
    console.log('=== Получение CSRF-токена ===');
    const response = await axiosAPI.get("/auth/csrf");
    console.log('CSRF ответ от сервера:', response.data);
    
    if (response.data && response.data.csrfToken) {
      window.csrfToken = response.data.csrfToken;
      console.log('CSRF-токен сохранен в window.csrfToken:', window.csrfToken);
      return response.data.csrfToken;
    } else {
      throw new Error('CSRF-токен не найден в ответе сервера');
    }
  } catch (error) {
    console.error('Ошибка при получении CSRF-токена:', error);
    throw error;
  }
}

// Экспортируем по умолчанию объект с функциями для совместимости
export default {
  login,
  registration,
  logout,
  getCSRF,
};
