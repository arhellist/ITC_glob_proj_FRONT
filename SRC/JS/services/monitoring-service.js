import axios from '../auth/http/axios'; // Импорт настроенного axios

class MonitoringService {
  // Получение списка продуктов (легкий запрос без расчетов)
  async getProductsList() {
    console.log('MonitoringService: Запрос списка продуктов');
    const response = await axios.get('/admin/products');
    console.log('MonitoringService: Получен список продуктов:', response.data);
    const payload = response?.data;
    if (Array.isArray(payload)) {
      return payload;
    }
    if (Array.isArray(payload?.data)) {
      return payload.data;
    }
    return [];
  }

  // Получение данных мониторинга счетов
  async getAccountsMonitoring(filters = {}) {
    console.log('MonitoringService: Запрос данных мониторинга с фильтрами:', filters);
    
    // Формируем query параметры
    const params = new URLSearchParams();
    if (filters.year) params.append('year', filters.year);
    if (filters.product) params.append('product', filters.product);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);
    
    const queryString = params.toString();
    const url = `/admin/monitoring/accounts${queryString ? `?${queryString}` : ''}`;
    
    console.log('MonitoringService: URL запроса:', url);
    
    const response = await axios.get(url);
    console.log('MonitoringService: Получены данные мониторинга:', response.data);
    return response.data;
  }

  // Проверка существования расчетов
  async checkExistingProfitability(month, year) {
    console.log('MonitoringService: Проверка существования расчетов:', { month, year });
    const response = await axios.get(`/admin/profitability/check-existing?month=${month}&year=${year}`);
    console.log('MonitoringService: Результат проверки:', response.data);
    return response.data;
  }

  // Предварительный просмотр расчета доходности
  async calculateProfitabilityPreview(month, year, profitability) {
    console.log('MonitoringService: Запрос расчета доходности:', { month, year, profitability });
    
    const response = await axios.post('/admin/profitability/calculate-preview', {
      month,
      year,
      profitability
    });
    
    console.log('MonitoringService: Результат расчета:', response.data);
    return response.data;
  }

  async getPreviewProfitability(calcKey) {
    console.log('MonitoringService: Получение sandbox-превью:', { calcKey });
    const response = await axios.get('/admin/profitability/preview', {
      params: { calcKey }
    });
    console.log('MonitoringService: Получено sandbox-превью:', response.data);
    return response.data;
  }

  async updatePreviewAccountPercent(calcKey, accountId, percent) {
    console.log('MonitoringService: Обновление процента sandbox-превью:', { calcKey, accountId, percent });
    const response = await axios.patch('/admin/profitability/preview/account', {
      calcKey,
      accountId,
      percent
    });
    console.log('MonitoringService: Обновленное sandbox-превью:', response.data);
    return response.data;
  }

  async deletePreviewProfitability(calcKey) {
    console.log('MonitoringService: Удаление sandbox-превью:', { calcKey });
    const response = await axios.delete(`/admin/profitability/preview/${encodeURIComponent(calcKey)}`);
    console.log('MonitoringService: Sandbox-превью удалено:', response.data);
    return response.data;
  }

  // Получение детализации начального баланса
  async getInitialBalanceDetails(accountId, targetDate) {
    console.log('MonitoringService: Запрос детализации начального баланса:', { accountId, targetDate });
    
    const params = new URLSearchParams();
    params.append('accountId', accountId);
    params.append('targetDate', targetDate);
    
    const response = await axios.get(`/admin/profitability/initial-balance-details?${params.toString()}`);
    
    console.log('MonitoringService: Получена детализация начального баланса:', response.data);
    return response.data;
  }

  // Сохранение предварительных расчетов в БД
  async savePreliminaryCalculations(month, year, results) {
    console.log('MonitoringService: Сохранение предварительных расчетов:', { month, year, resultsCount: results.length });
    
    const response = await axios.post('/admin/profitability/save-preliminary', {
      month,
      year,
      results
    });
    
    console.log('MonitoringService: Результат сохранения:', response.data);
    return response.data;
  }

  // Получение локап-пакетов для аккаунта
  async getAccountLockupPackages(accountId, year, month) {
    console.log('MonitoringService: Запрос локап-пакетов:', { accountId, year, month });
    
    const params = new URLSearchParams();
    params.append('accountId', accountId);
    params.append('year', year);
    params.append('month', month);
    
    const response = await axios.get(`/admin/monitoring/lockup-packages?${params.toString()}`);
    
    console.log('MonitoringService: Получены локап-пакеты:', response.data);
    return response.data;
  }

  // Получение данных мониторинга для ОДНОГО счета (оптимизировано)
  async getSingleAccountMonitoring(accountId, year) {
    console.log('MonitoringService: Запрос данных мониторинга для одного счета:', { accountId, year });
    
    const response = await axios.get(`/admin/monitoring/accounts/${accountId}?year=${year}`);
    
    console.log('MonitoringService: Получены данные мониторинга для одного счета:', response.data);
    return response.data;
  }
}

export default new MonitoringService();

