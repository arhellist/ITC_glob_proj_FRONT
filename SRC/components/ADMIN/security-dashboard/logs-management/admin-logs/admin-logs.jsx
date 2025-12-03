import React, { useState, useEffect } from 'react';
import axiosAPI from '../../../../../JS/auth/http/axios';
import './admin-logs.css';

const AdminLogs = () => {
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
    'user_ban',
    'user_unban',
    'user_edit',
    'admin_create',
    'admin_edit',
    'admin_delete',
    'whitelist_add',
    'whitelist_remove',
    'system_settings',
    'security_action'
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

      const response = await axiosAPI.get('/admin/logs/admins', { params });
      
      if (response.data.success) {
        setLogs(response.data.logs || []);
        setTotalPages(response.data.totalPages || 1);
      }
    } catch (err) {
      console.error('Ошибка загрузки логов администраторов:', err);
      setError('Не удалось загрузить логи администраторов');
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
      user_ban: 'Блокировка пользователя',
      user_unban: 'Разблокировка пользователя',
      user_edit: 'Редактирование пользователя',
      admin_create: 'Создание админа',
      admin_edit: 'Редактирование админа',
      admin_delete: 'Удаление админа',
      whitelist_add: 'Добавление в белый список',
      whitelist_remove: 'Удаление из белого списка',
      system_settings: 'Изменение настроек',
      security_action: 'Действие безопасности'
    };
    return labels[action] || action;
  };

  const getActionColor = (action) => {
    const colors = {
      login: '#4ade80',
      logout: '#f87171',
      user_ban: '#ef4444',
      user_unban: '#10b981',
      user_edit: '#3b82f6',
      admin_create: '#8b5cf6',
      admin_edit: '#f59e0b',
      admin_delete: '#dc2626',
      whitelist_add: '#06b6d4',
      whitelist_remove: '#f97316',
      system_settings: '#6366f1',
      security_action: '#ec4899'
    };
    return colors[action] || '#6b7280';
  };

  const getRoleColor = (role) => {
    const colors = {
      'ROOT': '#DC2626',
      'ADMIN': '#7C3AED',
      'MODERATOR': '#EA580C',
      'MANAGER': '#0891B2',
      'SUPPORT': '#059669',
      'VIEWER': '#6B7280',
      'SYSTEM': '#374151'
    };
    return colors[role] || colors.VIEWER;
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

      const response = await axiosAPI.get(`/admin/logs/admins/export?${params}`);
      
      if (format === 'excel') {
        // Создаем blob для Excel файла
        const blob = new Blob([response.data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `admin-logs-${new Date().toISOString().split('T')[0]}.xlsx`;
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
        link.download = `admin-logs-${new Date().toISOString().split('T')[0]}.json`;
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

  const clearAdminLogs = async () => {
    const confirmText = 'CLEAR_ADMIN_LOGS';
    const confirmMessage = 'Вы уверены, что хотите очистить все логи администраторов? Это действие нельзя отменить!';
    
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
      const response = await axiosAPI.post('/admin/logs/admins/clear', { confirm: confirmText });
      
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

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="admin-logs">
        <div className="admin-logs-loading">Загрузка логов администраторов...</div>
      </div>
    );
  }

  return (
    <div className="admin-logs">
      <div className="admin-logs-header">
        <h4>Логи администраторов</h4>
        <div className="admin-logs-header-actions">
          <button onClick={loadLogs} className="admin-logs-refresh-btn">
            Обновить
          </button>
          <button 
            onClick={() => clearAdminLogs()}
            className="admin-logs-clear-btn"
            title="Очистить логи администраторов (только ROOT)"
          >
            🗑️ Очистить
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-logs-error">{error}</div>
      )}

      {/* Фильтры */}
      <div className="admin-logs-filters">
        <form onSubmit={handleSearch} className="admin-logs-filter-form">
          <div className="admin-logs-filter-row">
            <input
              type="text"
              placeholder="Поиск по email или ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-logs-search-input"
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="admin-logs-date-input"
            />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="admin-logs-action-select"
            >
              <option value="">Все действия</option>
              {actionTypes.map(action => (
                <option key={action} value={action}>
                  {getActionLabel(action)}
                </option>
              ))}
            </select>
            <button type="submit" className="admin-logs-search-btn">
              Поиск
            </button>
            <button 
              type="button" 
              onClick={clearFilters}
              className="admin-logs-clear-btn"
            >
              Очистить
            </button>
          </div>
        </form>
      </div>

      {/* Таблица логов */}
      <div className="admin-logs-table-wrapper">
        <table className="admin-logs-table">
          <thead>
            <tr>
              <th className="admin-logs-th">ID</th>
              <th className="admin-logs-th">Время</th>
              <th className="admin-logs-th">Администратор</th>
              <th className="admin-logs-th">Роль</th>
              <th className="admin-logs-th">Действие</th>
              <th className="admin-logs-th">Уровень риска</th>
              <th className="admin-logs-th">IP</th>
              <th className="admin-logs-th">Детали</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="admin-logs-row">
                <td className="admin-logs-td">
                  <div className="admin-logs-id">{log.id}</div>
                </td>
                <td className="admin-logs-td">
                  <div className="admin-logs-time">{formatDate(log.createdAt)}</div>
                </td>
                <td className="admin-logs-td">
                  <div className="admin-logs-admin">
                    <div className="admin-logs-admin-name">
                      {log.admin?.email || 'Система'}
                    </div>
                    <div className="admin-logs-admin-id">ID: {log.adminId}</div>
                  </div>
                </td>
                <td className="admin-logs-td">
                  <span 
                    className="admin-logs-role"
                    style={{ backgroundColor: getRoleColor(log.admin?.role) }}
                  >
                    {log.admin?.role || 'SYSTEM'}
                  </span>
                </td>
                <td className="admin-logs-td">
                  <span 
                    className="admin-logs-action"
                    style={{ backgroundColor: getActionColor(log.action) }}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="admin-logs-td">
                  <span 
                    className="admin-logs-risk"
                    style={{ backgroundColor: getRiskColor(log.riskLevel) }}
                  >
                    {getRiskLabel(log.riskLevel)}
                  </span>
                </td>
                <td className="admin-logs-td">
                  <div className="admin-logs-ip">{log.ip || '—'}</div>
                </td>
                <td className="admin-logs-td">
                  <div className="admin-logs-details">
                    {log.details && (
                      <div className="admin-logs-details-text">
                        {log.details.length > 50 
                          ? `${log.details.substring(0, 50)}...` 
                          : log.details
                        }
                      </div>
                    )}
                    {log.targetUser && (
                      <div className="admin-logs-target-user">
                        Цель: {log.targetUser.email}
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
        <div className="admin-logs-empty">
          {searchTerm || dateFilter || actionFilter 
            ? 'По вашему запросу ничего не найдено' 
            : 'Логи администраторов отсутствуют'
          }
        </div>
      )}

      {/* Кнопки экспорта */}
      <div className="admin-logs-actions">
        <button 
          onClick={() => exportLogs('excel')}
          className="admin-logs-export-btn admin-logs-export-excel"
          disabled={loading}
        >
          <span className="export-icon">📊</span>
          <span className="export-text">Excel</span>
        </button>
        <button 
          onClick={() => exportLogs('json')}
          className="admin-logs-export-btn admin-logs-export-json"
          disabled={loading}
        >
          <span className="export-icon">📋</span>
          <span className="export-text">JSON</span>
        </button>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="admin-logs-pagination">
          <button 
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="admin-logs-page-btn"
          >
            Предыдущая
          </button>
          <span className="admin-logs-page-info">
            Страница {currentPage} из {totalPages}
          </span>
          <button 
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="admin-logs-page-btn"
          >
            Следующая
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminLogs;
