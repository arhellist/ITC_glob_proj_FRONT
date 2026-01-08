import React, { useState, useEffect } from 'react';
import securityService from '../../../JS/services/security-service';
import WhiteListManagement from './white-list-management/white-list-management';
import LogsManagement from './logs-management/logs-management';
import SecuritySettings from './settings/security-settings';
import './security-dashboard.css';

const SecurityDashboard = () => {
  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);
  const [sessions, setSessions] = useState({ admin: [], user: [] });
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadSecurityData();

    // Слушаем события WebSocket для обновления сессий в реальном времени
    const handleSessionConnected = (event) => {
      console.log('SecurityDashboard: Сессия подключена:', event.detail);
      // Обновляем только данные сессий, не всю панель
      loadActiveSessions();
    };

    const handleSessionDisconnected = (event) => {
      console.log('SecurityDashboard: Сессия отключена:', event.detail);
      // Обновляем только данные сессий, не всю панель
      loadActiveSessions();
    };

    document.addEventListener('session-connected', handleSessionConnected);
    document.addEventListener('session-disconnected', handleSessionDisconnected);

    return () => {
      document.removeEventListener('session-connected', handleSessionConnected);
      document.removeEventListener('session-disconnected', handleSessionDisconnected);
    };
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      setError('');

      const [statsData, activitiesData, sessionsData, blockedIPsData] = await Promise.all([
        securityService.getSecurityStats(),
        securityService.getSuspiciousActivities({ limit: 20 }),
        securityService.getActiveSessions(),
        securityService.getBlockedIPs({ activeOnly: true, limit: 100 })
      ]);

      console.log('SecurityDashboard: Полученные данные:', {
        stats: statsData,
        activities: activitiesData,
        sessions: sessionsData,
        blockedIPs: blockedIPsData
      });

      setStats(statsData);
      setActivities(activitiesData.activities || []);
      setSessions(sessionsData.sessions || { admin: [], user: [] });
      setBlockedIPs(blockedIPsData || []);
    } catch (err) {
      console.error('Ошибка загрузки данных безопасности:', err);
      setError('Не удалось загрузить данные безопасности');
      // Устанавливаем значения по умолчанию при ошибке
      setStats({
        totalActivities: 0,
        recentActivities: 0,
        highRiskActivities: 0,
        blockedIPs: 0,
        activeSessions: { admin: 0, user: 0, total: 0 }
      });
      setActivities([]);
      setSessions({ admin: [], user: [] });
      setBlockedIPs([]);
    } finally {
      setLoading(false);
    }
  };

  // Функция для обновления только активных сессий
  const loadActiveSessions = async () => {
    try {
      const sessionsData = await securityService.getActiveSessions();
      console.log('SecurityDashboard: Обновлены данные сессий:', sessionsData);
      setSessions(sessionsData.sessions || { admin: [], user: [] });
      
      // Обновляем статистику сессий в stats
      setStats(prevStats => ({
        ...prevStats,
        activeSessions: {
          admin: sessionsData.total?.admin || 0,
          user: sessionsData.total?.user || 0,
          total: sessionsData.total?.total || 0
        }
      }));
    } catch (err) {
      console.error('Ошибка загрузки активных сессий:', err);
      // Устанавливаем значения по умолчанию при ошибке
      setSessions({ admin: [], user: [] });
      setStats(prevStats => ({
        ...prevStats,
        activeSessions: { admin: 0, user: 0, total: 0 }
      }));
    }
  };

  const handleUnblockIP = async (ip) => {
    try {
      const result = await securityService.unblockIP(ip);
      if (result.success !== false) {
        await loadSecurityData(); // Перезагружаем данные
      } else {
        setError('Не удалось разблокировать IP адрес');
      }
    } catch (err) {
      console.error('Ошибка разблокировки IP:', err);
      // Показываем пользователю сообщение об ошибке
      setError('Не удалось разблокировать IP адрес');
    }
  };

  const handleTerminateSession = async (sessionId) => {
    try {
      const result = await securityService.terminateSession(sessionId);
      if (result.success !== false) {
        await loadSecurityData(); // Перезагружаем данные
      } else {
        setError('Не удалось завершить сессию');
      }
    } catch (err) {
      console.error('Ошибка завершения сессии:', err);
      // Показываем пользователю сообщение об ошибке
      setError('Не удалось завершить сессию');
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return '#ff4444';
      case 'high': return '#ff8800';
      case 'medium': return '#ffaa00';
      case 'low': return '#00aa00';
      default: return '#666666';
    }
  };

  const formatDuration = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}ч ${minutes % 60}м`;
    if (minutes > 0) return `${minutes}м ${seconds % 60}с`;
    return `${seconds}с`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  if (loading) {
    return (
      <div className="security-dashboard">
        <div className="security-loading">Загрузка данных безопасности...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="security-dashboard">
        <div className="security-error">{error}</div>
        <button onClick={loadSecurityData} className="security-retry-btn">
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="security-dashboard">
      <div className="security-header">
        <h2>Панель безопасности</h2>
        <button onClick={loadSecurityData} className="security-refresh-btn">
          Обновить
        </button>
      </div>

      <div className="security-tabs">
        <button 
          className={`security-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Обзор
        </button>
        <button 
          className={`security-tab ${activeTab === 'activities' ? 'active' : ''}`}
          onClick={() => setActiveTab('activities')}
        >
          Опасности
        </button>
        <button 
          className={`security-tab ${activeTab === 'sessions' ? 'active' : ''}`}
          onClick={() => setActiveTab('sessions')}
        >
          Сессии
        </button>
        <button 
          className={`security-tab ${activeTab === 'blocked' ? 'active' : ''}`}
          onClick={() => setActiveTab('blocked')}
        >
          Заблокированные IP
        </button>
        <button 
          className={`security-tab ${activeTab === 'whitelist' ? 'active' : ''}`}
          onClick={() => setActiveTab('whitelist')}
        >
          Белый список
        </button>
        <button 
          className={`security-tab ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Логи
        </button>
        <button
          className={`security-tab ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Настройки
        </button>
      </div>

      {activeTab === 'overview' && stats && (
        <div className="security-overview">
          <div className="security-stats-grid">
            <div className="security-stat-card">
              <div className="security-stat-title">Всего активностей</div>
              <div className="security-stat-value">{stats.totalActivities}</div>
            </div>
            <div className="security-stat-card">
              <div className="security-stat-title">За последние 24ч</div>
              <div className="security-stat-value">{stats.recentActivities}</div>
            </div>
            <div className="security-stat-card">
              <div className="security-stat-title">Высокий риск</div>
              <div className="security-stat-value">{stats.highRiskActivities}</div>
            </div>
            <div className="security-stat-card">
              <div className="security-stat-title">Заблокированных IP</div>
              <div className="security-stat-value">{stats.blockedIPs}</div>
            </div>
            <div className="security-stat-card">
              <div className="security-stat-title">Активных сессий</div>
              <div className="security-stat-value">
                {(stats.activeSessions?.admin || 0) + (stats.activeSessions?.user || 0)}
              </div>
            </div>
            <div className="security-stat-card">
              <div className="security-stat-title">Админ сессий</div>
              <div className="security-stat-value">{stats.activeSessions?.admin || 0}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activities' && (
        <div className="security-activities">
          <div className="security-activities-header">
            <h3>Подозрительные активности</h3>
            <button 
              onClick={async () => {
                try {
                  const result = await securityService.exportSecurityLogs({ format: 'json' });
                  if (result.success === false) {
                    setError('Не удалось экспортировать логи безопасности');
                  }
                } catch (err) {
                  console.error('Ошибка экспорта логов:', err);
                  setError('Не удалось экспортировать логи безопасности');
                }
              }}
              className="security-export-btn"
            >
              Экспорт JSON
            </button>
          </div>
          <div className="security-activities-list">
            {activities.map((activity) => (
              <div key={activity.id} className="security-activity-item">
                <div className="security-activity-header">
                  <div className="security-activity-type">{activity.type}</div>
                  <div 
                    className="security-activity-severity"
                    style={{ backgroundColor: getSeverityColor(activity.severity) }}
                  >
                    {activity.severity}
                  </div>
                  <div className="security-activity-risk">Risk: {activity.riskScore}</div>
                </div>
                <div className="security-activity-description">{activity.description}</div>
                <div className="security-activity-meta">
                  <span>IP: {activity.ip}</span>
                  <span>Время: {formatDate(activity.timestamp)}</span>
                  {activity.userId && <span>User ID: {activity.userId}</span>}
                  {activity.adminId && <span>Admin ID: {activity.adminId}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="security-sessions">
          <div className="security-sessions-section">
            <h3>Административные сессии ({sessions.admin?.length || 0})</h3>
            <div className="security-sessions-list">
              {sessions.admin && sessions.admin.length > 0 ? sessions.admin.map((session) => (
                <div key={session.sessionId} className="security-session-item">
                  <div className="security-session-info">
                    <div className="security-session-header">
                      <span className="security-session-role">{session.admin?.role || 'Admin'}</span>
                      <span className="security-session-status online">Онлайн</span>
                    </div>
                    <div>Email: {session.admin?.email || 'N/A'}</div>
                    <div>IP: {session.ip}</div>
                    <div>Длительность: {formatDuration(Date.now() - new Date(session.loginTime).getTime())}</div>
                    <div>Последняя активность: {formatDate(session.lastActivity)}</div>
                    {session.deviceInfo && (
                      <div>Устройство: {session.deviceInfo.browser?.substring(0, 50)}...</div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleTerminateSession(session.sessionId)}
                    className="security-terminate-btn"
                  >
                    Завершить
                  </button>
                </div>
              )) : (
                <div className="security-no-sessions">Нет активных административных сессий</div>
              )}
            </div>
          </div>

          <div className="security-sessions-section">
            <h3>Пользовательские сессии ({sessions.user?.length || 0})</h3>
            <div className="security-sessions-list">
              {sessions.user && sessions.user.length > 0 ? sessions.user.map((session) => (
                <div key={session.sessionId} className="security-session-item">
                  <div className="security-session-info">
                    <div className="security-session-header">
                      <span className="security-session-role">Пользователь</span>
                      <span className="security-session-status online">Онлайн</span>
                    </div>
                    <div>Имя: {session.user?.firstname} {session.user?.surname}</div>
                    <div>Email: {session.user?.email || 'N/A'}</div>
                    <div>IP: {session.ip}</div>
                    <div>Длительность: {formatDuration(Date.now() - new Date(session.loginTime).getTime())}</div>
                    <div>Последняя активность: {formatDate(session.lastActivity)}</div>
                    {session.deviceInfo && (
                      <div>Устройство: {session.deviceInfo.browser?.substring(0, 50)}...</div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleTerminateSession(session.sessionId)}
                    className="security-terminate-btn"
                  >
                    Завершить
                  </button>
                </div>
              )) : (
                <div className="security-no-sessions">Нет активных пользовательских сессий</div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'blocked' && (
        <div className="security-blocked">
          <div className="security-blocked-header">
            <h3>Заблокированные IP ({blockedIPs.length})</h3>
            <button 
              onClick={() => {
                const ip = prompt('Введите IP адрес для блокировки:');
                if (ip) {
                  const reason = prompt('Причина блокировки (необязательно):') || 'Ручная блокировка администратором';
                  const expiresHours = prompt('Срок блокировки в часах (0 = бессрочно):') || '0';
                  const expiresAt = expiresHours === '0' ? null : new Date(Date.now() + parseInt(expiresHours) * 60 * 60 * 1000).toISOString();
                  
                  securityService.blockIP(ip, { reason, expiresAt })
                    .then(result => {
                      if (result.success !== false) {
                        loadSecurityData();
                        alert(`IP ${ip} успешно заблокирован`);
                      } else {
                        alert(`Ошибка блокировки IP: ${result.error || 'Неизвестная ошибка'}`);
                      }
                    })
                    .catch(err => {
                      console.error('Ошибка блокировки IP:', err);
                      alert('Ошибка блокировки IP');
                    });
                }
              }}
              className="security-block-btn"
            >
              Заблокировать IP
            </button>
          </div>
          <div className="security-blocked-list">
            {blockedIPs.length === 0 ? (
              <div className="security-no-blocked">Нет заблокированных IP адресов</div>
            ) : (
              blockedIPs.map((blocked) => {
                const expiresAt = blocked.expires_at ? new Date(blocked.expires_at) : null;
                const remainingTime = expiresAt ? expiresAt.getTime() - Date.now() : null;
                const isExpired = remainingTime !== null && remainingTime <= 0;
                
                return (
                  <div key={blocked.id || blocked.ip_address} className="security-blocked-item">
                    <div className="security-blocked-info">
                      <div className="security-blocked-ip">
                        <strong>IP:</strong> {blocked.ip_address}
                      </div>
                      <div className="security-blocked-type">
                        <strong>Тип:</strong> {
                          blocked.block_type === 'automatic' ? 'Автоматическая' :
                          blocked.block_type === 'manual' ? 'Ручная' :
                          blocked.block_type === 'temporary' ? 'Временная' :
                          blocked.block_type
                        }
                      </div>
                      {blocked.reason && (
                        <div className="security-blocked-reason">
                          <strong>Причина:</strong> {blocked.reason}
                        </div>
                      )}
                      {blocked.violation_count > 0 && (
                        <div className="security-blocked-violations">
                          <strong>Нарушений:</strong> {blocked.violation_count}
                        </div>
                      )}
                      <div className="security-blocked-time">
                        <strong>Заблокирован:</strong> {formatDate(blocked.blocked_at)}
                      </div>
                      {expiresAt ? (
                        <div className={`security-blocked-expires ${isExpired ? 'expired' : ''}`}>
                          <strong>Истекает:</strong> {formatDate(blocked.expires_at)}
                          {!isExpired && remainingTime && (
                            <span> (осталось: {formatDuration(remainingTime)})</span>
                          )}
                          {isExpired && <span className="expired-label"> - ИСТЕКЛА</span>}
                        </div>
                      ) : (
                        <div className="security-blocked-expires">
                          <strong>Срок:</strong> Бессрочно
                        </div>
                      )}
                      {blocked.metadata && Object.keys(blocked.metadata).length > 0 && (
                        <details className="security-blocked-details">
                          <summary>Дополнительная информация</summary>
                          <pre>{JSON.stringify(blocked.metadata, null, 2)}</pre>
                        </details>
                      )}
                    </div>
                    <div className="security-blocked-actions">
                      <button 
                        onClick={async () => {
                          const stats = await securityService.getIPStatistics(blocked.ip_address, 24);
                          if (stats) {
                            alert(`Статистика нарушений для ${blocked.ip_address}:\n\n` +
                                  `Всего нарушений: ${stats.totalViolations}\n` +
                                  `По типам: ${JSON.stringify(stats.byType, null, 2)}\n` +
                                  `По серьезности: ${JSON.stringify(stats.bySeverity, null, 2)}`);
                          }
                        }}
                        className="security-stats-btn"
                        title="Показать статистику нарушений"
                      >
                        Статистика
                      </button>
                      <button 
                        onClick={() => handleUnblockIP(blocked.ip_address)}
                        className="security-unblock-btn"
                      >
                        Разблокировать
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <SecuritySettings />
      )}

      {activeTab === 'whitelist' && <WhiteListManagement />}

      {activeTab === 'logs' && <LogsManagement />}
    </div>
  );
};

export default SecurityDashboard;
