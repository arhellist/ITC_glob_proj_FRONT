import axiosAPI from '../auth/http/axios.js';

/**
 * Сервис для работы с отчетами
 */
class ReportService {
    /**
     * Отправить отчеты клиентам
     */
    async sendReports(month, year) {
        try {
            const response = await axiosAPI.post(
                '/admin/reports/send',
                {
                    month,
                    year
                },
                {
                    timeout: 300000 // 5 минут на формирование очереди и пересчет
                }
            );
            return response.data;
        } catch (error) {
            console.error('ReportService: Ошибка отправки отчетов:', error);
            throw error;
        }
    }

    /**
     * Запустить отправку очереди отчетов
     */
    async startReportQueue(queueIds) {
        try {
            const response = await axiosAPI.post('/admin/reports/queue/start', {
                queueIds
            });
            return response.data;
        } catch (error) {
            console.error('ReportService: Ошибка запуска очереди отчетов:', error);
            throw error;
        }
    }

    /**
     * Приостановить отправку очереди отчетов
     */
    async pauseReportQueue(queueIds) {
        try {
            const response = await axiosAPI.post('/admin/reports/queue/pause', {
                queueIds
            });
            return response.data;
        } catch (error) {
            console.error('ReportService: Ошибка паузы очереди отчетов:', error);
            throw error;
        }
    }

    /**
     * Получить очередь отчетов
     */
    async getReportQueue(month, year, status, ready = false) {
        try {
            const params = { month, year, status };
            if (ready) params.ready = 'true';
            
            const response = await axiosAPI.get('/admin/reports/queue', { params });
            return response.data;
        } catch (error) {
            console.error('ReportService: Ошибка получения очереди отчетов:', error);
            throw error;
        }
    }

    /**
     * Получить очередь отчетов по ID
     */
    async getReportQueueById(queueId) {
        try {
            const response = await axiosAPI.get(`/admin/reports/queue/${queueId}`);
            return response.data;
        } catch (error) {
            console.error('ReportService: Ошибка получения очереди отчетов по ID:', error);
            throw error;
        }
    }

    /**
     * Получить список всех очередей отчетов
     */
    async getReportQueuesList() {
        try {
            const response = await axiosAPI.get('/admin/reports/queue/list');
            return response.data;
        } catch (error) {
            console.error('ReportService: Ошибка получения списка очередей отчетов:', error);
            throw error;
        }
    }

    /**
     * Отменить очередь отчетов
     */
    async cancelReportQueue(queueId) {
        try {
            const response = await axiosAPI.post(`/admin/reports/queue/${queueId}/cancel`);
            return response.data;
        } catch (error) {
            console.error('ReportService: Ошибка отмены очереди отчетов:', error);
            throw error;
        }
    }

    /**
     * Повторить очередь отчетов
     */
    async repeatReportQueue(queueId) {
        try {
            const response = await axiosAPI.post(`/admin/reports/queue/${queueId}/repeat`);
            return response.data;
        } catch (error) {
            console.error('ReportService: Ошибка повтора очереди отчетов:', error);
            throw error;
        }
    }

    /**
     * Обновить статус выбора счета в очереди
     */
    async updateAccountSelection(queueId, accountId, isSelected) {
        try {
            const response = await axiosAPI.post(`/admin/reports/queue/${queueId}/account/${accountId}/select`, {
                is_selected: isSelected
            });
            return response.data;
        } catch (error) {
            console.error('ReportService: Ошибка обновления статуса выбора счета:', error);
            throw error;
        }
    }

    /**
     * Отправить один отчет (одноразовая отправка)
     */
    async sendSingleReport(queueId) {
        try {
            const response = await axiosAPI.post(`/admin/reports/queue/${queueId}/send`);
            return response.data;
        } catch (error) {
            console.error('ReportService: Ошибка отправки одного отчета:', error);
            throw error;
        }
    }
}

export default new ReportService();

