import { API_CONFIG } from '../../config/api.js';
import axiosAPI from '../auth/http/axios.js';

class TransactionService {
    constructor() {
        this.baseURL = `${API_CONFIG.BASE_URL}/admin`;
    }

    /**
     * Получить курс валюты на дату
     */
    async getCourseOnDate(currency, date) {
        try {
            const response = await axiosAPI.get(`${this.baseURL}/course/on-date`, {
                params: { currency, date }
            });
            return response.data.data;
        } catch (error) {
            console.error('TransactionService: Ошибка получения курса:', error);
            throw error;
        }
    }

    /**
     * Получить транзакции за месяц
     */
    async getMonthTransactions(accountId, year, month) {
        try {
            const response = await axiosAPI.get(`${this.baseURL}/transactions/month`, {
                params: { accountId, year, month }
            });
            // Бэкенд возвращает объект напрямую, а не в data
            return response.data;
        } catch (error) {
            console.error('TransactionService: Ошибка получения транзакций:', error);
            throw error;
        }
    }

    /**
     * Получить баланс на дату
     * @param {string} accountId - ID счета
     * @param {string} date - Дата в формате YYYY-MM-DD
     * @param {string} transactionType - Тип транзакции (deposit, withdrawal, profitability, transfer) для корректного расчета баланса по иерархии
     */
    async getBalanceOnDate(accountId, date, transactionType = null) {
        try {
            const params = { accountId, date };
            if (transactionType) {
                params.transactionType = transactionType;
            }
            const response = await axiosAPI.get(`${this.baseURL}/transactions/balance`, {
                params
            });
            return response.data.data.balance;
        } catch (error) {
            console.error('TransactionService: Ошибка получения баланса:', error);
            throw error;
        }
    }

    /**
     * Получить локап-пакеты счета (для оценки доступной суммы вывода)
     */
    async getLockupPackages(accountId, year, month) {
        try {
            const response = await axiosAPI.get(`${this.baseURL}/monitoring/lockup-packages`, {
                params: { accountId, year, month }
            });
            return response.data;
        } catch (error) {
            console.error('TransactionService: Ошибка получения локап-пакетов:', error);
            throw error;
        }
    }

    /**
     * Получить максимально возможную сумму для вывода
     * @param {string} accountId - ID счета
     * @param {string} date - Дата в формате YYYY-MM-DD
     */
    async getMaxWithdrawalAmount(accountId, date) {
        try {
            const response = await axiosAPI.get(`${this.baseURL}/transactions/max-withdrawal`, {
                params: { accountId, date }
            });
            return response.data;
        } catch (error) {
            console.error('TransactionService: Ошибка получения максимальной суммы вывода:', error);
            throw error;
        }
    }

    /**
     * Добавить транзакцию
     */
    async addTransaction(type, data) {
        try {
            const response = await axiosAPI.post(`${this.baseURL}/transactions/add`, {
                type,
                data
            });
            return response.data.data;
        } catch (error) {
            console.error('TransactionService: Ошибка добавления транзакции:', error);
            throw error;
        }
    }

    /**
     * Удалить транзакцию
     */
    async deleteTransaction(type, id) {
        try {
            const response = await axiosAPI.delete(`${this.baseURL}/transactions/${type}/${id}`);
            return response.data;
        } catch (error) {
            console.error('TransactionService: Ошибка удаления транзакции:', error);
            throw error;
        }
    }

    /**
     * Обновить процент доходности
     */
    async updateProfitabilityPercent(accountId, year, month, percent) {
        try {
            const response = await axiosAPI.put(`${this.baseURL}/transactions/profitability/percent`, {
                accountId,
                year,
                month,
                percent
            });
            return response.data;
        } catch (error) {
            console.error('TransactionService: Ошибка обновления процента:', error);
            throw error;
        }
    }

    /**
     * Получить доступные счета для перевода
     */
    async getAvailableAccountsForTransfer(userId, excludeAccountId) {
        try {
            // Получаем счета конкретного пользователя
            const response = await axiosAPI.get(`${this.baseURL}/users/${userId}/accounts`);
            const accounts = response.data.accounts || [];
            
            // Фильтруем счета: исключаем текущий счет и возвращаем только открытые
            return accounts
                .filter(account => account.id !== excludeAccountId)
                .map(account => ({
                    id: account.id,
                    userName: account.name || `Счет #${account.id}`,
                    productType: account.product || 'Unknown',
                    currency: account.currency || 'USD',
                    status: 'Open' // Счета уже отфильтрованы по статусу
                }));
        } catch (error) {
            console.error('TransactionService: Ошибка получения счетов:', error);
            throw error;
        }
    }
}

export default new TransactionService();

