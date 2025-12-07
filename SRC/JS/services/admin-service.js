import { API_CONFIG } from '../../config/api.js';
import axiosAPI from '../auth/http/axios.js';

class AdminService {
  constructor() {
    this.baseURL = `${API_CONFIG.BASE_URL}/admin`;
  }

  // Получение списка пользователей с документами
  async getUsersList(page = 1, limit = 50, email = '', surname = '') { // Добавлены параметры фильтров email и surname
    try { // Начинаем блок обработки ошибок
      console.log('AdminService: Запрос списка пользователей', { page, limit, email, surname }); // Логируем параметры запроса
      
      // Используем axiosAPI для автоматического refresh токена
      // Формируем query параметры для фильтрации
      const params = new URLSearchParams({ // Создаем объект для query параметров
        page: page.toString(), // Номер страницы
        limit: limit.toString(), // Количество пользователей на странице
        sortBy: 'surname' // Сортировка по фамилии
      });
      
      // Добавляем фильтры только если они не пустые
      if (email && email.trim() !== '') { // Если фильтр email не пустой
        params.append('email', email.trim()); // Добавляем email в параметры
      }
      if (surname && surname.trim() !== '') { // Если фильтр surname не пустой
        params.append('surname', surname.trim()); // Добавляем surname в параметры
      }
      
      const response = await axiosAPI.get(`${this.baseURL}/users?${params.toString()}`); // Отправляем GET запрос с параметрами

      console.log('AdminService: Получен список пользователей:', response.data); // Логируем ответ
      return response.data; // Возвращаем данные
    } catch (error) { // Обработка ошибок
      console.error('AdminService: Ошибка получения списка пользователей:', error); // Логируем ошибку
      throw error; // Пробрасываем ошибку
    }
  }

  // Получение данных конкретного пользователя по ID
  async getUserById(userId) { // Функция получения одного пользователя
    try { // Начинаем блок обработки ошибок
      console.log('AdminService: Запрос данных пользователя по ID:', userId); // Логируем запрос
      
      // Запрашиваем пользователя с limit=999 и фильтром по email (чтобы гарантированно найти)
      // Альтернативно можно использовать специальный эндпоинт /admin/users/:id
      const response = await axiosAPI.get(`${this.baseURL}/users/${userId}`); // Запрос по ID
      
      console.log('AdminService: Получены данные пользователя:', response.data); // Логируем ответ
      return response.data; // Возвращаем данные пользователя
    } catch (error) { // Обработка ошибок
      console.error('AdminService: Ошибка получения пользователя по ID:', error); // Логируем ошибку
      throw error; // Пробрасываем ошибку
    }
  }

  async getProductsList() {
    try {
      const response = await axiosAPI.get(`${this.baseURL}/products`);
      return response.data?.data || [];
    } catch (error) {
      console.error('AdminService: Ошибка получения списка продуктов:', error);
      return [];
    }
  }

  // Обновление заметок пользователя
  async updateUserNotes(userId, description) {
    try {
      console.log('AdminService: Обновление заметок пользователя', { userId, description });
      
      // Используем пользовательский токен для админ-запросов
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.put(`${this.baseURL}/users/${userId}/notes`, 
        { description }, 
        { headers }
      );

      console.log('AdminService: Заметки пользователя обновлены:', response.data);
      return response.data;
    } catch (error) {
      console.error('AdminService: Ошибка обновления заметок пользователя:', error);
      throw error;
    }
  }

  // Получение счетов пользователя с балансом
  async getUserAccounts(userId) {
    try {
      console.log('AdminService: Получение счетов пользователя', { userId });
      
      // Используем пользовательский токен для админ-запросов
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.get(`${this.baseURL}/users/${userId}/accounts`, { headers });

      console.log('AdminService: Получены счета пользователя:', response.data);
      return response.data.accounts;
    } catch (error) {
      console.error('AdminService: Ошибка получения счетов пользователя:', error);
      throw error;
    }
  }

  // Получение всех заявок с фильтрацией и пагинацией (для админ-панели user-requests)
  async getAllRequests(filters = {}) { // Функция получения всех заявок со всех пользователей
    try { // Начинаем блок обработки ошибок
      const { type = 'all', status = 'all', email = '', surname = '', page = 1, limit = 50 } = filters; // Деструктуризация параметров фильтров
      console.log('AdminService: Получение всех заявок с фильтрами:', filters); // Логируем начало
      
      // Формируем query параметры
      const params = new URLSearchParams({ // Создаем объект для query параметров
        type, // Тип заявки (deposits/withdrawals/transfers/all)
        status, // Статус заявки (processing/credited/rejected/all)
        page: page.toString(), // Номер страницы
        limit: limit.toString() // Количество заявок на странице
      });
      
      // Добавляем фильтры поиска только если они не пустые
      if (email && email.trim()) { // Если фильтр email не пустой
        params.append('email', email.trim()); // Добавляем email в параметры
      }
      if (surname && surname.trim()) { // Если фильтр surname не пустой
        params.append('surname', surname.trim()); // Добавляем surname в параметры
      }
      
      // Используем axiosAPI для автоматического refresh токена
      const response = await axiosAPI.get(`${this.baseURL}/requests?${params.toString()}`); // Отправляем GET запрос

      console.log('AdminService: Получены заявки:', response.data); // Логируем результат
      return response.data; // Возвращаем данные (requests + pagination)
    } catch (error) { // Обработка ошибок
      console.error('AdminService: Ошибка получения заявок:', error); // Логируем ошибку
      throw error; // Пробрасываем ошибку
    }
  }

  // Получение заявок пользователя (депозиты, выводы, переводы)
  async getUserApplications(userId) { // Функция получения всех заявок пользователя
    try { // Начинаем блок обработки ошибок
      console.log('AdminService: Получение заявок пользователя', { userId }); // Логируем начало
      
      // Используем axiosAPI для автоматического refresh токена
      const response = await axiosAPI.get(`${this.baseURL}/users/${userId}/applications`); // Отправляем GET запрос

      console.log('AdminService: Получены заявки пользователя:', response.data); // Логируем результат
      return response.data; // Возвращаем данные (deposits, withdrawals, transfers)
    } catch (error) { // Обработка ошибок
      console.error('AdminService: Ошибка получения заявок пользователя:', error); // Логируем ошибку
      throw error; // Пробрасываем ошибку
    }
  }

  // Закрытие счета пользователя
  async closeUserAccount(userId, accountId) { // Функция закрытия счета пользователя
    try { // Начинаем блок обработки ошибок
      console.log('AdminService: Закрытие счета', { userId, accountId }); // Логируем начало
      
      // Используем axiosAPI для автоматического refresh токена
      const response = await axiosAPI.delete(`${this.baseURL}/users/${userId}/accounts/${accountId}`); // Отправляем DELETE запрос

      console.log('AdminService: Счет закрыт:', response.data); // Логируем результат
      return response.data; // Возвращаем результат
    } catch (error) { // Обработка ошибок
      console.error('AdminService: Ошибка закрытия счета:', error); // Логируем ошибку
      throw error; // Пробрасываем ошибку
    }
  }

  // Открытие счета для пользователя
  async openUserAccount(userId, accountData) { // Функция открытия нового счета для пользователя
    try { // Начинаем блок обработки ошибок
      console.log('AdminService: Открытие счета для пользователя', { userId, accountData }); // Логируем начало
      
      // Используем axiosAPI для автоматического refresh токена
      const response = await axiosAPI.post(`${this.baseURL}/users/${userId}/accounts`, accountData); // Отправляем POST запрос

      console.log('AdminService: Счет открыт:', response.data); // Логируем результат
      return response.data; // Возвращаем данные созданного счета
    } catch (error) { // Обработка ошибок
      console.error('AdminService: Ошибка открытия счета:', error); // Логируем ошибку
      throw error; // Пробрасываем ошибку
    }
  }

  // Обновление статуса документа (утверждение/отклонение)
  async updateDocumentStatus(userId, documentId, status, kind, notApproveDescription = null) { // Функция обновления статуса документа
    try { // Начинаем блок обработки ошибок
      console.log('AdminService: Обновление статуса документа', { userId, documentId, status, kind, notApproveDescription }); // Логируем начало
      
      // Используем axiosAPI для автоматического refresh токена
      const requestBody = { status, kind }; // Базовое тело запроса
      if (notApproveDescription) {
        requestBody.notApproveDescription = notApproveDescription; // Добавляем причину отклонения, если она указана
      }
      
      const response = await axiosAPI.put(`${this.baseURL}/users/${userId}/documents/${documentId}/status`, requestBody); // Отправляем PUT запрос

      console.log('AdminService: Статус документа обновлён:', response.data); // Логируем результат
      return response.data; // Возвращаем результат
    } catch (error) { // Обработка ошибок
      console.error('AdminService: Ошибка обновления статуса документа:', error); // Логируем ошибку
      throw error; // Пробрасываем ошибку
    }
  }

  // Удаление документа
  async deleteDocument(userId, documentId, kind) {
    try {
      console.log('AdminService: Удаление документа', { userId, documentId, kind });
      
      const response = await axiosAPI.delete(`${this.baseURL}/users/${userId}/documents/${documentId}`, {
        data: { kind }
      });
      
      console.log('AdminService: Документ удалён:', response.data);
      return response.data;
    } catch (error) {
      console.error('AdminService: Ошибка удаления документа:', error);
      throw error;
    }
  }

  // Обновление статуса заявки (принять/отклонить)
  async updateRequestComment(requestId, requestType, comment) { // Функция обновления комментария к заявке
    try {
      console.log('AdminService: Обновление комментария к заявке', { requestId, requestType, comment });
      
      const response = await axiosAPI.put(`${this.baseURL}/requests/${requestType}/${requestId}/comment`, {
        comment: comment || ''
      });
      
      console.log('AdminService: Комментарий обновлен:', response.data);
      return response.data;
    } catch (error) {
      console.error('AdminService: Ошибка обновления комментария к заявке:', error);
      throw error;
    }
  }

  async updateRequestStatus(requestId, requestType, status, rejectReason = null) { // Функция обновления статуса заявки
    try { // Начинаем блок обработки ошибок
      console.log('AdminService: Обновление статуса заявки', { requestId, requestType, status, rejectReason }); // Логируем начало
      
      // Формируем тело запроса
      const body = { status }; // Тело запроса с статусом
      if (rejectReason) { // Если есть причина отклонения
        body.rejectReason = rejectReason; // Добавляем причину
      }
      
      // Используем axiosAPI для автоматического refresh токена
      const response = await axiosAPI.put(`${this.baseURL}/requests/${requestType}/${requestId}/status`, body); // Отправляем PUT запрос

      console.log('AdminService: Статус заявки обновлён:', response.data); // Логируем результат
      return response.data; // Возвращаем результат
    } catch (error) { // Обработка ошибок
      console.error('AdminService: Ошибка обновления статуса заявки:', error); // Логируем ошибку
      throw error; // Пробрасываем ошибку
    }
  }

  // Получение количества непроверенных документов
  async getPendingDocumentsCount() {
    try {
      console.log('AdminService: Запрос количества непроверенных документов');
      const response = await axiosAPI.get(`${this.baseURL}/documents/pending/count`);
      console.log('AdminService: Получено количество непроверенных документов:', response.data);
      return response.data?.count || 0;
    } catch (error) {
      console.error('AdminService: Ошибка получения количества непроверенных документов:', error);
      return 0; // Возвращаем 0 при ошибке
    }
  }

  // Принудительный сброс пароля пользователя
  async forcePasswordReset(userId, reason = '') {
    try {
      console.log('AdminService: Принудительный сброс пароля', { userId, reason });
      
      const response = await axiosAPI.post(`${this.baseURL}/users/${userId}/force-password-reset`, {
        reason: reason || 'Принудительный сброс пароля администратором'
      });
      
      console.log('AdminService: Пароль сброшен:', response.data);
      return response.data;
    } catch (error) {
      console.error('AdminService: Ошибка сброса пароля:', error);
      throw error;
    }
  }

  // Блокировка/разблокировка аккаунта пользователя
  async toggleAccountBlock(userId, block = true, reason = '') {
    try {
      console.log('AdminService: Блокировка/разблокировка аккаунта', { userId, block, reason });
      
      const response = await axiosAPI.post(`${this.baseURL}/users/${userId}/toggle-block`, {
        block: block,
        reason: reason || (block ? 'Блокировка аккаунта администратором' : 'Разблокировка аккаунта администратором')
      });
      
      console.log('AdminService: Статус блокировки изменен:', response.data);
      return response.data;
    } catch (error) {
      console.error('AdminService: Ошибка блокировки/разблокировки аккаунта:', error);
      throw error;
    }
  }
}

export default new AdminService(); // Экспорт singleton экземпляра сервиса
