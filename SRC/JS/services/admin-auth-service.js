import { API_CONFIG } from '../../config/api.js'; // Импорт конфигурации API
import axiosAPI from '../auth/http/axios.js'; // Импорт настроенного axios с interceptors для автоматического refresh

class AdminAuthService { // Класс для работы с аутентификацией администраторов
  constructor() { // Конструктор класса
    this.baseURL = `${API_CONFIG.BASE_URL}/admin`; // Установка базового URL для админских запросов
  }

  // Проверка whitelist администратора
  async checkWhitelist() { // Асинхронная функция проверки наличия пользователя в whitelist админов
    try { // Начинаем блок обработки ошибок
      // Проверяем наличие токена перед запросом
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('AdminAuthService: Токен отсутствует, пропускаем проверку whitelist');
        return { isAdmin: false };
      }
      
      console.log('AdminAuthService: Проверка whitelist'); // Логируем начало проверки
      
      // Используем axiosAPI вместо обычного axios для автоматического refresh токена
      const response = await axiosAPI.get(`${this.baseURL}/check-whitelist`); // Отправляем GET запрос (токен добавляется автоматически в interceptor)

      console.log('AdminAuthService: Результат проверки whitelist:', response.data); // Логируем результат
      return response.data; // Возвращаем данные о статусе админа
    } catch (error) { // Обработка ошибок
      // Игнорируем 401 ошибки, они обрабатываются axios interceptor
      if (error.response?.status === 401) {
        console.log('AdminAuthService: 401 ошибка при проверке whitelist, токен будет обновлен автоматически');
        return { isAdmin: false };
      }
      console.error('AdminAuthService: Ошибка проверки whitelist:', error); // Логируем ошибку
      return { isAdmin: false, admin: null }; // Возвращаем отрицательный результат при ошибке
    }
  }

  // Генерация токена для входа в админку
  async generateToken() { // Асинхронная функция генерации одноразового токена для входа в админ-панель
    try { // Начинаем блок обработки ошибок
      console.log('AdminAuthService: Генерация токена'); // Логируем начало генерации
      
      // Используем axiosAPI вместо обычного axios для автоматического refresh токена
      const response = await axiosAPI.post(`${this.baseURL}/generate-token`, {}); // Отправляем POST запрос (токен добавляется автоматически)

      console.log('AdminAuthService: Ответ сервера:', response.data);
      
      // Проверяем, нужна ли регистрация в Telegram
      if (!response.data.success && response.data.needsTelegramRegistration) {
        return {
          success: false,
          message: response.data.message,
          needsTelegramRegistration: true
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('AdminAuthService: Ошибка генерации токена:', error);
      return { success: false, message: 'Ошибка генерации токена' };
    }
  }

  // Вход в админку по токену
  async loginWithToken(token) { // Асинхронная функция входа в админ-панель по одноразовому токену
    try { // Начинаем блок обработки ошибок
      console.log('AdminAuthService: Вход по токену'); // Логируем начало входа
      
      // Используем axiosAPI для автоматического refresh токена при 401
      const response = await axiosAPI.post(`${this.baseURL}/login-token`, { // Отправляем POST запрос с токеном
        token // Одноразовый токен для входа в админку
      });

      console.log('AdminAuthService: Доступ подтвержден:', response.data);
      
      // Сохраняем данные администратора в sessionStorage (временное хранение)
      if (response.data.admin) {
        sessionStorage.setItem('adminData', JSON.stringify(response.data.admin));
      }

      return {
        success: true,
        admin: response.data.admin
      };
    } catch (error) {
      console.error('AdminAuthService: Ошибка входа по токену:', error);
      
      if (error.response?.status === 400) {
        return {
          success: false,
          message: error.response.data.message || 'Недействительный токен'
        };
      } else {
        return {
          success: false,
          message: 'Ошибка сервера'
        };
      }
    }
  }

  // Проверка сессии администратора (проверяет пользовательские JWT + adminData)
  async checkAuth() { // Асинхронная функция проверки активной сессии администратора
    try { // Начинаем блок обработки ошибок
      // Проверяем, что пользователь авторизован
      const userToken = localStorage.getItem('accessToken'); // Получаем пользовательский токен из localStorage
      if (!userToken) { // Если токен отсутствует
        return { success: false, message: 'Пользователь не авторизован' }; // Возвращаем ошибку
      }

      // Проверяем данные администратора в sessionStorage
      const adminData = sessionStorage.getItem('adminData'); // Получаем данные админа из sessionStorage
      if (!adminData) { // Если данные админа отсутствуют
        return { success: false, message: 'Админ-сессия не найдена' }; // Возвращаем ошибку
      }

      // Проверяем доступ к админке через whitelist
      try { // Вложенный блок обработки ошибок для whitelist проверки
        // Используем axiosAPI для автоматического refresh токена при 401
        const response = await axiosAPI.get(`${this.baseURL}/check-whitelist`); // Отправляем GET запрос (токен добавляется автоматически)

        if (!response.data.isAdmin) { // Если пользователь не является админом
          this.logout(); // Выполняем выход из админ-панели
          return { success: false, message: 'Нет доступа к админке' }; // Возвращаем ошибку доступа
        }

        return { // Возвращаем успешный результат
          success: true, // Флаг успеха
          admin: JSON.parse(adminData) // Распарсенные данные администратора
        };
      } catch (whitelistError) { // Обработка ошибок whitelist проверки
        console.error('AdminAuthService: Ошибка проверки whitelist:', whitelistError); // Логируем ошибку
        this.logout(); // Выполняем выход при ошибке
        return { // Возвращаем ошибку
          success: false, // Флаг неудачи
          message: 'Ошибка проверки доступа' // Сообщение об ошибке
        };
      }
    } catch (error) { // Общая обработка ошибок функции
      console.error('AdminAuthService: Ошибка проверки сессии:', error); // Логируем ошибку
      this.logout(); // Выполняем выход при ошибке
      return { // Возвращаем ошибку
        success: false, // Флаг неудачи
        message: 'Ошибка сессии' // Сообщение об ошибке
      };
    }
  }

  // Выход администратора
  logout() { // Функция выхода из админ-панели
    const adminData = sessionStorage.getItem('adminData'); // Получаем данные админа
    if (adminData) { // Если данные существуют
      try { // Начинаем блок обработки ошибок
        const admin = JSON.parse(adminData); // Парсим JSON данные
        console.log('AdminAuthService: Выход из админ-панели для админа:', admin.id); // Логируем выход
        // Здесь можно добавить API вызов для отслеживания выхода
      } catch (error) { // Обработка ошибок парсинга
        console.error('AdminAuthService: Ошибка парсинга adminData:', error); // Логируем ошибку
      }
    }
    sessionStorage.removeItem('adminData'); // Удаляем данные админа из sessionStorage
    console.log('AdminAuthService: Выход из админ-панели'); // Логируем завершение выхода
  }

  // Получение пользовательского токена для админ-запросов
  getToken() { // Функция получения access токена из localStorage
    return localStorage.getItem('accessToken'); // Возвращаем токен
  }

  // Проверка авторизации
  isAuthenticated() { // Функция проверки авторизации администратора
    return !!(localStorage.getItem('accessToken') && sessionStorage.getItem('adminData')); // Возвращаем true если есть и пользовательский токен и данные админа
  }

  // Проверка разрешения у текущего администратора
  hasPermission(permission) { // Функция проверки наличия конкретного разрешения у админа
    try { // Начинаем блок обработки ошибок
      const adminData = sessionStorage.getItem('adminData'); // Получаем данные админа
      if (!adminData) return false; // Если данных нет, возвращаем false
      
      const admin = JSON.parse(adminData); // Парсим JSON данные
      return admin.permissions && admin.permissions[permission] === true; // Проверяем наличие разрешения
    } catch (error) { // Обработка ошибок
      console.error('Ошибка проверки разрешения:', error); // Логируем ошибку
      return false; // Возвращаем false при ошибке
    }
  }

  // Получение роли администратора
  getRole() { // Функция получения роли текущего администратора
    try { // Начинаем блок обработки ошибок
      const adminData = sessionStorage.getItem('adminData'); // Получаем данные админа
      if (!adminData) return null; // Если данных нет, возвращаем null
      
      const admin = JSON.parse(adminData); // Парсим JSON данные
      return admin.role; // Возвращаем роль администратора
    } catch (error) { // Обработка ошибок
      console.error('Ошибка получения роли:', error); // Логируем ошибку
      return null; // Возвращаем null при ошибке
    }
  }

  // Получение всех разрешений администратора
  getPermissions() { // Функция получения всех разрешений текущего администратора
    try { // Начинаем блок обработки ошибок
      const adminData = sessionStorage.getItem('adminData'); // Получаем данные админа
      if (!adminData) return {}; // Если данных нет, возвращаем пустой объект
      
      const admin = JSON.parse(adminData); // Парсим JSON данные
      return admin.permissions || {}; // Возвращаем объект разрешений или пустой объект
    } catch (error) { // Обработка ошибок
      console.error('Ошибка получения разрешений:', error); // Логируем ошибку
      return {}; // Возвращаем пустой объект при ошибке
    }
  }

  // Сохранение данных администратора
  saveAdminData(admin) { // Функция сохранения данных администратора в sessionStorage
    sessionStorage.setItem('adminData', JSON.stringify(admin)); // Сохраняем данные в JSON формате
  }

  // Очистка данных администратора
  clearAdminData() { // Функция очистки данных администратора из sessionStorage
    sessionStorage.removeItem('adminData'); // Удаляем данные из sessionStorage
  }
}

export default new AdminAuthService(); // Экспорт singleton экземпляра сервиса
