import { API_CONFIG } from '../../config/api.js';
import axiosAPI from '../auth/http/axios.js';

class SecurityService {
  constructor() {
    this.baseURL = `${API_CONFIG.BASE_URL}/security`;
    this.adminBaseURL = `${API_CONFIG.BASE_URL}/admin`;
  }

  // Получение статистики безопасности
  async getSecurityStats() {
    try {
      console.log('SecurityService: Запрос статистики безопасности');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.get(`${this.baseURL}/stats`, { headers });
      console.log('SecurityService: Получена статистика безопасности:', response.data);
      return response.data.stats;
    } catch (error) {
      console.error('SecurityService: Ошибка получения статистики:', error);
      // Возвращаем пустую статистику при ошибке
      return {
        totalActivities: 0,
        recentActivities: 0,
        highRiskActivities: 0,
        blockedIPs: 0,
        activeSessions: { admin: 0, user: 0, total: 0 }
      };
    }
  }

  // Получение угроз безопасности
  async getSuspiciousActivities(params = {}) {
    try {
      console.log('SecurityService: Запрос угроз безопасности', params);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const queryParams = new URLSearchParams(params).toString();
      const url = `${this.baseURL}/threats${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await axiosAPI.get(url, { headers });
      console.log('SecurityService: Получены угрозы безопасности:', response.data);
      return response.data;
    } catch (error) {
      console.error('SecurityService: Ошибка получения угроз:', error);
      // Возвращаем пустые данные при ошибке
      return {
        activities: [],
        threats: [],
        total: 0,
        pagination: {
          limit: 50,
          offset: 0,
          hasMore: false
        }
      };
    }
  }

  // Получение активных сессий
  async getActiveSessions() {
    try {
      console.log('SecurityService: Запрос активных сессий');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.get(`${this.baseURL}/sessions`, { headers });
      console.log('SecurityService: Получены активные сессии:', response.data);
      return response.data;
    } catch (error) {
      console.error('SecurityService: Ошибка получения сессий:', error);
      // Возвращаем пустые данные при ошибке
      return {
        sessions: { admin: [], user: [] },
        total: { admin: 0, user: 0, total: 0 }
      };
    }
  }

  // Получение заблокированных IP (новая система)
  async getBlockedIPs(filters = {}) {
    try {
      console.log('SecurityService: Запрос заблокированных IP', filters);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const queryParams = new URLSearchParams(filters).toString();
      const url = `${this.baseURL}/ip-blocks${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await axiosAPI.get(url, { headers });
      console.log('SecurityService: Получены заблокированные IP:', response.data);
      return response.data.data || [];
    } catch (error) {
      console.error('SecurityService: Ошибка получения заблокированных IP:', error);
      // Возвращаем пустой массив при ошибке
      return [];
    }
  }

  // Блокировка IP вручную (новая система)
  async blockIP(ipAddress, blockData = {}) {
    try {
      console.log('SecurityService: Блокировка IP:', ipAddress, blockData);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.post(
        `${this.baseURL}/ip-blocks`,
        { ipAddress, ...blockData },
        { headers }
      );
      console.log('SecurityService: IP заблокирован:', response.data);
      return response.data;
    } catch (error) {
      console.error('SecurityService: Ошибка блокировки IP:', error);
      return { success: false, error: error.message };
    }
  }

  // Разблокировка IP (новая система)
  async unblockIP(ipAddress) {
    try {
      console.log('SecurityService: Разблокировка IP:', ipAddress);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.delete(`${this.baseURL}/ip-blocks/${encodeURIComponent(ipAddress)}`, { headers });
      console.log('SecurityService: IP разблокирован:', response.data);
      return response.data;
    } catch (error) {
      console.error('SecurityService: Ошибка разблокировки IP:', error);
      // Возвращаем ошибку вместо throw
      return { success: false, error: error.message };
    }
  }

  // Получение статистики нарушений для IP
  async getIPStatistics(ipAddress, hours = 24) {
    try {
      console.log('SecurityService: Запрос статистики IP:', ipAddress, hours);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.get(
        `${this.baseURL}/ip-blocks/${encodeURIComponent(ipAddress)}/statistics?hours=${hours}`,
        { headers }
      );
      console.log('SecurityService: Получена статистика IP:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('SecurityService: Ошибка получения статистики IP:', error);
      return null;
    }
  }

  // Проверка статуса блокировки IP
  async checkIPStatus(ipAddress) {
    try {
      console.log('SecurityService: Проверка статуса IP:', ipAddress);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.get(
        `${this.baseURL}/ip-blocks/${encodeURIComponent(ipAddress)}/status`,
        { headers }
      );
      console.log('SecurityService: Статус IP получен:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('SecurityService: Ошибка проверки статуса IP:', error);
      return null;
    }
  }

  // Принудительное завершение сессии
  async terminateSession(sessionId) {
    try {
      console.log('SecurityService: Завершение сессии:', sessionId);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.post(`${this.baseURL}/terminate-session/${sessionId}`, {}, { headers });
      console.log('SecurityService: Сессия завершена:', response.data);
      return response.data;
    } catch (error) {
      console.error('SecurityService: Ошибка завершения сессии:', error);
      // Возвращаем ошибку вместо throw
      return { success: false, error: error.message };
    }
  }

  // Получение детальной информации об активности
  async getActivityDetails(activityId) {
    try {
      console.log('SecurityService: Запрос деталей активности:', activityId);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.get(`${this.baseURL}/threats/${activityId}`, { headers });
      console.log('SecurityService: Получены детали угрозы:', response.data);
      return response.data.threat;
    } catch (error) {
      console.error('SecurityService: Ошибка получения деталей активности:', error);
      // Возвращаем null при ошибке
      return null;
    }
  }

  // Экспорт логов безопасности
  async exportSecurityLogs(params = {}) {
    try {
      console.log('SecurityService: Экспорт логов безопасности', params);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const queryParams = new URLSearchParams(params).toString();
      const url = `${this.baseURL}/export${queryParams ? `?${queryParams}` : ''}`;
      
      const response = await axiosAPI.get(url, { 
        headers,
        responseType: 'blob' // Для скачивания файла
      });
      
      // Создаем ссылку для скачивания
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `security-logs-${new Date().toISOString().split('T')[0]}.${params.format || 'json'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      
      console.log('SecurityService: Логи экспортированы');
      return { success: true };
    } catch (error) {
      console.error('SecurityService: Ошибка экспорта логов:', error);
      // Возвращаем ошибку вместо throw
      return { success: false, error: error.message };
    }
  }

  // Получение настроек безопасности
  async getSecuritySettings() {
    try {
      console.log('SecurityService: Запрос настроек безопасности');
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.get(`${this.baseURL}/settings`, { headers });
      console.log('SecurityService: Получены настройки безопасности:', response.data);
      return response.data.settings;
    } catch (error) {
      console.error('SecurityService: Ошибка получения настроек:', error);
      // Возвращаем настройки по умолчанию при ошибке
      return {
        maxFailedAttempts: 5,
        lockoutDuration: 900000, // 15 минут
        threatScore: 8,
        maxThreatsInMemory: 1000
      };
    }
  }

  // Обновление настроек безопасности
  async updateSecuritySettings(settings) {
    try {
      console.log('SecurityService: Обновление настроек безопасности:', settings);
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await axiosAPI.put(`${this.baseURL}/settings`, settings, { headers });
      console.log('SecurityService: Настройки обновлены:', response.data);
      return response.data;
    } catch (error) {
      console.error('SecurityService: Ошибка обновления настроек:', error);
      // Возвращаем ошибку вместо throw
      return { success: false, error: error.message };
    }
  }

  // Получение ролей и разрешений
  async getRolesPermissionsConfig() {
    try {
      console.log('SecurityService: Запрос ролей и разрешений');
      console.log('SecurityService: baseURL:', this.baseURL);
      console.log('SecurityService: Полный URL:', `${this.baseURL}/roles`);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.error('SecurityService: Токен отсутствует');
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      console.log('SecurityService: Отправляем GET запрос на', `${this.baseURL}/roles`);
      const response = await axiosAPI.get(`${this.baseURL}/roles`, { headers });
      console.log('SecurityService: Ответ получен:', {
        status: response.status,
        hasData: !!response.data,
        hasSuccess: !!response.data?.success,
        hasDataData: !!response.data?.data,
        rolesCount: response.data?.data?.roles?.length || 0,
        permissionsCount: response.data?.data?.permissions?.length || 0
      });
      
      const result = response.data?.data || { roles: [], permissions: [], menu: [] };
      console.log('SecurityService: Возвращаем данные:', {
        roles: result.roles?.length || 0,
        permissions: result.permissions?.length || 0,
        menu: result.menu?.length || 0
      });
      
      return result;
    } catch (error) {
      console.error('SecurityService: Ошибка получения ролей:', error);
      console.error('SecurityService: Детали ошибки:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url
      });
      return { roles: [], permissions: [], menu: [] };
    }
  }

  // Обновление разрешений роли
  async updateRolePermissions(roleKey, payload) {
    try {
      console.log('SecurityService: Обновление роли', roleKey, payload);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axiosAPI.put(`${this.baseURL}/roles/${roleKey}`, payload, { headers });
      return response.data;
    } catch (error) {
      console.error('SecurityService: Ошибка обновления роли:', error);
      return { success: false, error: error.message };
    }
  }

  // Получение доступа к меню для текущей роли
  async getMenuAccess(roleKey = null) {
    try {
      console.log('SecurityService: Запрос меню для роли', roleKey);

      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const query = roleKey ? `?role=${encodeURIComponent(roleKey)}` : '';

      const response = await axiosAPI.get(`${this.baseURL}/menu-access${query}`, { headers });
      return response.data?.data || { role: roleKey, menuAccess: {}, menu: [] };
    } catch (error) {
      console.error('SecurityService: Ошибка получения меню доступа:', error);
      return { role: roleKey, menuAccess: {}, menu: [] };
    }
  }

  async getProducts() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await axiosAPI.get(`${this.baseURL}/products`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data?.data || [];
    } catch (error) {
      console.error('SecurityService: Ошибка получения продуктов:', error);
      return [];
    }
  }

  async createProduct(payload) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await axiosAPI.post(`${this.baseURL}/products`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data?.data || null;
    } catch (error) {
      console.error('SecurityService: Ошибка создания продукта:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteProduct(productId) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      await axiosAPI.delete(`${this.baseURL}/products/${productId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return { success: true };
    } catch (error) {
      console.error('SecurityService: Ошибка удаления продукта:', error);
      return { success: false, error: error.message };
    }
  }

  async updateProduct(productId, payload) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await axiosAPI.put(`${this.baseURL}/products/${productId}`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data?.data || null;
    } catch (error) {
      console.error('SecurityService: Ошибка обновления продукта:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadProductInvestmentRules(productId, file) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosAPI.post(`${this.baseURL}/products/${productId}/investment-rules`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data?.data || null;
    } catch (error) {
      console.error('SecurityService: Ошибка загрузки инвестправил продукта:', error);
      return { success: false, error: error.message };
    }
  }

  async getOptionsConfig() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await axiosAPI.get(`${this.baseURL}/options`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data?.data || null;
    } catch (error) {
      console.error('SecurityService: Ошибка получения опций:', error);
      return null;
    }
  }

  async updateOptionsConfig(payload) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await axiosAPI.put(`${this.baseURL}/options`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data?.data || null;
    } catch (error) {
      console.error('SecurityService: Ошибка обновления опций:', error);
      return { success: false, error: error.message };
    }
  }

  // Получение шаблона подписки для продукта
  async getSubscriptionTemplate(productId) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await axiosAPI.get(`${this.baseURL}/products/${productId}/subscription-template`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data?.data || null;
    } catch (error) {
      console.error('SecurityService: Ошибка получения шаблона подписки:', error);
      return null;
    }
  }

  // Создание или обновление шаблона подписки для продукта
  async createOrUpdateSubscriptionTemplate(productId, payload) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const response = await axiosAPI.put(`${this.baseURL}/products/${productId}/subscription-template`, payload, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      return response.data?.data || null;
    } catch (error) {
      console.error('SecurityService: Ошибка создания/обновления шаблона подписки:', error);
      return { success: false, error: error.message };
    }
  }

  // Загрузка титульной картинки для подписки
  async uploadSubscriptionTitleImage(productId, file) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosAPI.post(`${this.baseURL}/products/${productId}/subscription-template/title-image`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data?.data || null;
    } catch (error) {
      console.error('SecurityService: Ошибка загрузки титульной картинки подписки:', error);
      return { success: false, error: error.message };
    }
  }

  // Загрузка промо материалов для подписки
  async uploadSubscriptionPromoMaterials(productId, files) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const formData = new FormData();
      if (Array.isArray(files)) {
        files.forEach(file => {
          formData.append('files', file);
        });
      } else {
        formData.append('files', files);
      }

      const response = await axiosAPI.post(`${this.baseURL}/products/${productId}/subscription-template/promo-materials`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data?.data || null;
    } catch (error) {
      console.error('SecurityService: Ошибка загрузки промо материалов подписки:', error);
      return { success: false, error: error.message };
    }
  }

  // Реферальная программа
  async getReferralMatrix() {
    try {
      const response = await axiosAPI.get(`${this.adminBaseURL}/referral/matrix`);
      return response.data;
    } catch (error) {
      console.error('Ошибка получения матрицы реферальных вознаграждений:', error);
      return { success: false, error: error.message };
    }
  }

  async createOrUpdateReferralMatrixLevel(levelData) {
    try {
      const response = await axiosAPI.post(`${this.adminBaseURL}/referral/matrix/level`, levelData);
      return response.data;
    } catch (error) {
      console.error('Ошибка создания/обновления уровня матрицы:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteReferralMatrixLevel(levelId) {
    try {
      const response = await axiosAPI.delete(`${this.adminBaseURL}/referral/matrix/level/${levelId}`);
      return response.data;
    } catch (error) {
      console.error('Ошибка удаления уровня матрицы:', error);
      return { success: false, error: error.message };
    }
  }

  async getReferralRewardsHistory(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await axiosAPI.get(`${this.adminBaseURL}/referral/rewards?${params}`);
      return response.data;
    } catch (error) {
      console.error('Ошибка получения истории вознаграждений:', error);
      return { success: false, error: error.message };
    }
  }

  // Получение всех способов пополнения
  async getPaymentMethods() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axiosAPI.get(`${this.adminBaseURL}/payment-methods`, { headers });
      return response.data.paymentMethods || [];
    } catch (error) {
      console.error('Ошибка получения способов пополнения:', error);
      return [];
    }
  }

  // Создание способа пополнения
  async createPaymentMethod(formData) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`
      };

      const response = await axiosAPI.post(`${this.adminBaseURL}/payment-methods`, formData, { headers });
      return response.data;
    } catch (error) {
      console.error('Ошибка создания способа пополнения:', error);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  // Обновление способа пополнения
  async updatePaymentMethod(id, formData) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`
      };

      const response = await axiosAPI.put(`${this.adminBaseURL}/payment-methods/${id}`, formData, { headers });
      return response.data;
    } catch (error) {
      console.error('Ошибка обновления способа пополнения:', error);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  // Удаление способа пополнения
  async deletePaymentMethod(id) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axiosAPI.delete(`${this.adminBaseURL}/payment-methods/${id}`, { headers });
      return response.data;
    } catch (error) {
      console.error('Ошибка удаления способа пополнения:', error);
      return { success: false, message: error.response?.data?.message || error.message };
    }
  }

  // Публикации
  async getPublications() {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axiosAPI.get(`${this.adminBaseURL}/publications`, { headers });
      return response.data.publications || [];
    } catch (error) {
      console.error('SecurityService: Ошибка получения публикаций:', error);
      throw error;
    }
  }

  async getPublication(id) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axiosAPI.get(`${this.adminBaseURL}/publications/${id}`, { headers });
      return response.data.publication;
    } catch (error) {
      console.error('SecurityService: Ошибка получения публикации:', error);
      throw error;
    }
  }

  async createPublication(publicationData) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axiosAPI.post(`${this.adminBaseURL}/publications`, publicationData, { headers });
      return response.data.publication;
    } catch (error) {
      console.error('SecurityService: Ошибка создания публикации:', error);
      throw error;
    }
  }

  async updatePublication(id, publicationData) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const response = await axiosAPI.put(`${this.adminBaseURL}/publications/${id}`, publicationData, { headers });
      return response.data.publication;
    } catch (error) {
      console.error('SecurityService: Ошибка обновления публикации:', error);
      throw error;
    }
  }

  async deletePublication(id) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      await axiosAPI.delete(`${this.adminBaseURL}/publications/${id}`, { headers });
      return true;
    } catch (error) {
      console.error('SecurityService: Ошибка удаления публикации:', error);
      throw error;
    }
  }

  async uploadPublicationFile(file) {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Пользователь не авторизован');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosAPI.post(`${this.adminBaseURL}/publications/upload`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error('SecurityService: Ошибка загрузки файла публикации:', error);
      throw error;
    }
  }
}

export default new SecurityService();
