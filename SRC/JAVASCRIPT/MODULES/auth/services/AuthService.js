import axiosAPI from "../http/axios.js";


export async function login(email, password, recaptchaToken = null) {
  try {
    const requestData = { email, password };
    
    // Добавляем reCAPTCHA токен если он есть
    if (recaptchaToken) {
      requestData.recaptcha_token = recaptchaToken;
    }
    
    const response = await axiosAPI.post("/auth/login", requestData);

    console.log(`response in LOGIN: `); console.log(response)
    if (!response.data.token) {
      throw new Error("No accessToken in response");
    }

    console.log(`return response in LOGIN: `);
    return response;
  } catch (error) {
    throw error;
  }
}

export async function registration(email, password, name, surname, patronymic, phone) {
  if (!email || !password) {
    throw new Error("Email и пароль обязательны");
  }

  try {
    const requestData = { email, password, name, surname, patronymic, phone };
    
      
    const response = await axiosAPI.post("/auth/registration", requestData);

    console.log(`response`);console.log(response)

    if (!response.data) {
      throw new Error("Пустой ответ от сервера");
    }

    return response;
  } catch (error) {
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

// Экспортируем по умолчанию объект с функциями для совместимости
export default {
  login,
  registration,
  logout,
};
