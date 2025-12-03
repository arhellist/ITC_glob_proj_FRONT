import { API_CONFIG } from '../../config/api.js';
import axiosAPI from '../auth/http/axios.js';

class UserService {
  constructor() {
    this.baseURL = `${API_CONFIG.BASE_URL}/profile`;
  }

  // Получение активных подписок пользователя
  async getUserSubscriptions() {
    try {
      const response = await axiosAPI.get(`${this.baseURL}/subscriptions`);
      return response.data?.data || [];
    } catch (error) {
      console.error('UserService: Ошибка получения подписок пользователя:', error);
      return [];
    }
  }

  // Получение доступных подписок (продукты с включенной подпиской)
  async getAvailableSubscriptions() {
    try {
      const response = await axiosAPI.get(`${this.baseURL}/subscriptions/available`);
      return response.data?.data || [];
    } catch (error) {
      console.error('UserService: Ошибка получения доступных подписок:', error);
      return [];
    }
  }
}

export default new UserService();

