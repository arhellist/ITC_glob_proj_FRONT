import axiosAPI from "../http/axios.js"

export default class AuthService {
  static async login(email, password) {
    console.log('=== Начало процесса логина ===');
    console.log('Email:', email);
    try {
      const response = await axiosAPI.post("/auth/login", { 
        email, 
        password 
      });
      console.log('Успешный ответ при логине:', response.data);
      return response;
    } catch (error) {
      console.error('Ошибка при логине:', error);
      throw error;
    }
  }

  static async registration(email, password, name, phone) {
    console.log('=== Начало процесса регистрации ===');
    try {
      const response = await axiosAPI.post("/auth/registration", { 
        email, 
        password,
        name,
        phone 
      });
      console.log('Успешный ответ при регистрации:', response.data);
      return response;
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      throw error;
    }
  }

  static async logout() {
    console.log('=== Начало процесса выхода ===');
    try {
      const response = await axiosAPI.post("/auth/logout");
      console.log('Успешный ответ при выходе:', response.data);
      return response;
    } catch (error) {
      console.error('Ошибка при выходе:', error);
      throw error;
    }
  }
}
