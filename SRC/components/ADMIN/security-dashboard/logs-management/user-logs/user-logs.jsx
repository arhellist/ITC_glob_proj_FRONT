import React, { useState, useEffect } from 'react';
import axiosAPI from '../../../../../JS/auth/http/axios';
import './user-logs.css';

const UserLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  const actionTypes = [
    'login',
    'logout',
    'register',
    'password_change',
    'profile_update',
    'document_upload',
    'deposit',
    'withdrawal',
    'transfer'
  ];

  useEffect(() => {
    loadLogs();
  }, [currentPage, searchTerm, dateFilter, actionFilter]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm,
        date: dateFilter,
        action: actionFilter
      };

      const response = await axiosAPI.get('/admin/logs/users', { params });
      
      if (response.data.success) {
        setLogs(response.data.logs || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Ошибка загрузки логов пользователей:', err);
      setError('Не удалось загрузить логи пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadLogs();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setDateFilter('');
    setActionFilter('');
    setCurrentPage(1);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getActionLabel = (action) => {
    const labels = {
      login: 'Вход',
      logout: 'Выход',
      register: 'Регистрация',
      password_change: 'Смена пароля',
      profile_update: 'Обновление профиля',
      document_upload: 'Загрузка документа',
      deposit: 'Пополнение',
      withdrawal: 'Вывод',
      transfer: 'Перевод'
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    const colors = {
      login: '#4ade80',
      logout: '#f87171',
      register: '#3b82f6',
      password_change: '#f59e0b',
      profile_update: '#8b5cf6',
      document_upload: '#06b6d4',
      deposit: '#10b981',
      withdrawal: '#ef4444',
      transfer: '#6366f1'
    };
    return colors[action] || '#6b7280';
  };

  const getRiskColor = (riskLevel) => {
    const colors = {
      'low': '#4CAF50',
      'medium': '#FF9800',
      'high': '#F44336',
      'critical': '#D32F2F'
    };
    return colors[riskLevel] || colors.low;
  };

  const getRiskLabel = (riskLevel) => {
    const labels = {
      'low': 'Низкий',
      'medium': 'Средний',
      'high': 'Высокий',
      'critical': 'Критический'
    };
    return labels[riskLevel] || 'Низкий';
  };

  const exportLogs = async (format) => {
    try {
      const params = new URLSearchParams({
        format,
        page: 1,
        limit: 10000, // Экспортируем все логи
        search: searchTerm,
        date: dateFilter,
        action: actionFilter
      });

      const response = await axiosAPI.get(`/admin/logs/users/export?${params}`);
      
      if (format === 'excel') {
        // Создаем blob для Excel файла
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `user-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else if (format === 'json') {
        // Скачиваем JSON файл
        const dataStr = JSON.stringify(response.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `user-logs-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Ошибка экспорта логов:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка при экспорте логов'
        }
      }));
    }
  };

  const clearUserLogs = async () => {
    const confirmText = 'CLEAR_USER_LOGS';
    const confirmMessage = 'Вы уверены, что хотите очистить все логи пользователей? Это действие нельзя отменить!';
    
    // Показываем модальное окно подтверждения с вводом текста
    const userConfirm = prompt(`${confirmMessage}\n\nДля подтверждения введите: ${confirmText}`);
    
    if (userConfirm !== confirmText) {
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Операция отменена. Неверное подтверждение.'
        }
      }));
      return;
    }

    try {
      const response = await axiosAPI.post('/admin/logs/users/clear', { confirm: confirmText });
      
      if (response.data.success) {
        // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: response.data.message
        }
      }));
        // Перезагружаем логи
        loadLogs();
      }
    } catch (error) {
      console.error('Ошибка очистки логов:', error);
      if (error.response?.status === 403) {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'У вас нет прав для очистки логов. Только ROOT может очищать логи.'
          }
        }));
      } else {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Ошибка при очистке логов'
          }
        }));
      }
    }
  };

  if (loading) {
    return (
      <div className="user-logs">
        <div className="user-logs-loading">Загрузка логов пользователей...</div>
      </div>
    );
  }

  return (
    <div className="user-logs">
      <div className="user-logs-header">
        <h4>Логи пользователей</h4>
        <div className="user-logs-header-actions">
          <button onClick={loadLogs} className="user-logs-refresh-btn">
            Обновить
          </button>
          <button 
            onClick={() => clearUserLogs()}
            className="user-logs-clear-btn"
            title="Очистить логи пользователей (только ROOT)"
          >
            🗑️ Очистить
          </button>
        </div>
      </div>

      {error && (
        <div className="user-logs-error">{error}</div>
      )}

      {/* Фильтры */}
      <div className="user-logs-filters">
        <form onSubmit={handleSearch} className="user-logs-filter-form">
          <div className="user-logs-filter-row">
            <input
              type="text"
              placeholder="Поиск по email или ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="user-logs-search-input"
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="user-logs-date-input"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="user-logs-action-select"
            >
              <option value="">Все действия</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>
                  {getActionLabel(action)}
                </option>
              ))}
            </select>
            <button type="submit" className="user-logs-search-btn">
              Поиск
            </button>
            <button 
              type="button" 
              onClick={clearFilters}
              className="user-logs-clear-btn"
            >
              Очистить
            </button>
          </div>
        </form>
      </div>

      {/* Таблица логов */}
      <div className="user-logs-table-wrapper">
        <table className="user-logs-table">
          <thead>
            <tr>
              <th className="user-logs-th">ID</th>
              <th className="user-logs-th">Время</th>
              <th className="user-logs-th">Пользователь</th>
              <th className="user-logs-th">Действие</th>
              <th className="user-logs-th">Уровень риска</th>
              <th className="user-logs-th">Эндпоинт</th>
              <th className="user-logs-th">IP</th>
              <th className="user-logs-th">Детали</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="user-logs-row">
                <td className="user-logs-td">
                  <div className="user-logs-id">{log.id}</div>
                </td>
                <td className="user-logs-td">
                  <div className="user-logs-time">{formatDate(log.createdAt)}</div>
                </td>
                <td className="user-logs-td">
                  <div className="user-logs-user">
                    <div className="user-logs-user-name">
                      {log.user?.firstname} {log.user?.surname}
                    </div>
                    <div className="user-logs-user-email">{log.user?.email}</div>
                    <div className="user-logs-user-id">ID: {log.userId}</div>
                  </div>
                </td>
                <td className="user-logs-td">
                  <span 
                    className="user-logs-action"
                    style={{ backgroundColor: getActionColor(log.action) }}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="user-logs-td">
                  <span 
                    className="user-logs-risk"
                    style={{ backgroundColor: getRiskColor(log.riskLevel) }}
                  >
                    {getRiskLabel(log.riskLevel)}
                  </span>
                </td>
                <td className="user-logs-td">
                  <div className="user-logs-endpoint">{log.endpoint || '—'}</div>
                </td>
                <td className="user-logs-td">
                  <div className="user-logs-ip">{log.ip || '—'}</div>
                </td>
                <td className="user-logs-td">
                  <div className="user-logs-details">
                    {log.details && (
                      <div className="user-logs-details-text">
                        {log.details.length > 50 
                          ? `${log.details.substring(0, 50)}...` 
                          : log.details
                        }
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {logs.length === 0 && !loading && (
        <div className="user-logs-empty">
          {searchTerm || dateFilter || actionFilter 
            ? 'По вашему запросу ничего не найдено' 
            : 'Логи пользователей отсутствуют'
          }
        </div>
      )}

      {/* Кнопки экспорта */}
      <div className="user-logs-actions">
        <button 
          onClick={() => exportLogs('excel')}
          className="user-logs-export-btn user-logs-export-excel"
          disabled={loading}
        >
          <span className="export-icon">📊</span>
          <span className="export-text">Excel</span>
        </button>
        <button 
          onClick={() => exportLogs('json')}
          className="user-logs-export-btn user-logs-export-json"
          disabled={loading}
        >
          <span className="export-icon">📋</span>
          <span className="export-text">JSON</span>
        </button>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="user-logs-pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="user-logs-page-btn"
          >
            Предыдущая
          </button>
          <span className="user-logs-page-info">
            Страница {currentPage} из {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="user-logs-page-btn"
          >
            Следующая
          </button>
        </div>
      )}
    </div>
  );
};

export default UserLogs;
