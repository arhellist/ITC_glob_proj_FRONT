import React, { useState, useEffect } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';
import AllDealsList from './AllDealsList';
import './DealsKPI.css';

/**
 * Компонент для управления сделками KPI
 * Включает подразделы с доступом по ролям
 */
const DealsKPI = () => {
  const [adminRole, setAdminRole] = useState(null);
  const [activeSubModule, setActiveSubModule] = useState('manager-deals');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await axiosAPI.get('/admin/profile');
        setAdminRole(data?.admin?.role || data?.role || null);
      } catch (error) {
        console.error('❌ Ошибка загрузки профиля:', error);
      }
    };
    loadProfile();
  }, []);

  // Определяем доступные подразделы в зависимости от роли
  const getAvailableSubModules = () => {
    const modules = [
      { id: 'manager-deals', name: '📋 Мои сделки', icon: '📋', roles: ['MANAGER', 'ADMIN', 'ROOT'] }
    ];

    if (adminRole === 'ROOT' || adminRole === 'ADMIN') {
      modules.push(
        { id: 'all-deals', name: '📊 Все сделки', icon: '📊', roles: ['ADMIN', 'ROOT'] },
        { id: 'deals-analytics', name: '📈 Аналитика сделок', icon: '📈', roles: ['ADMIN', 'ROOT'] }
      );
    }

    return modules.filter(module => module.roles.includes(adminRole));
  };

  const renderSubModuleContent = () => {
    switch (activeSubModule) {
      case 'manager-deals':
        return <ManagerDealsList />;
      case 'all-deals':
        return <AllDealsList />;
      case 'deals-analytics':
        return (
          <div style={{ padding: '20px', color: '#666' }}>
            Модуль "Аналитика сделок" в разработке...
          </div>
        );
      default:
        return <ManagerDealsList />;
    }
  };

  return (
    <div className="deals-kpi-container">
      {/* Навигация по подразделам */}
      <div className="deals-kpi-navigation">
        {getAvailableSubModules().map(module => (
          <button
            key={module.id}
            className={`deals-kpi-nav-item ${activeSubModule === module.id ? 'active' : ''}`}
            onClick={() => setActiveSubModule(module.id)}
          >
            {module.icon} {module.name}
          </button>
        ))}
      </div>

      {/* Контент подраздела */}
      <div className="deals-kpi-content">
        {renderSubModuleContent()}
      </div>
    </div>
  );
};

/**
 * Компонент списка сделок менеджера
 */
const ManagerDealsList = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadManagerDeals();
  }, []);

  const loadManagerDeals = async () => {
    try {
      setLoading(true);
      const { data } = await axiosAPI.get('/admin/deals/manager');
      
      if (data.success) {
        setDeals(data.data || []);
      } else {
        setError('Ошибка загрузки сделок');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки сделок менеджера:', error);
      setError('Ошибка загрузки сделок');
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentUpload = async (e, dealId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('document', file);

      console.log(`🔍 Загружаем документ для сделки ID: ${dealId}, файл: ${file.name}`);

      const { data } = await axiosAPI.post(`/admin/deals/${dealId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (data.success) {
        console.log('✅ Документ успешно загружен');
        // Перезагружаем список сделок
        loadManagerDeals();
      } else {
        console.error('❌ Ошибка загрузки документа:', data.message);
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Ошибка загрузки документа: ' + (data.message || 'Неизвестная ошибка')
          }
        }));
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки документа:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка загрузки документа: ' + (error.response?.data?.message || 'Неизвестная ошибка')
        }
      }));
    }

    // Очищаем input
    e.target.value = '';
  };

  const handleDownloadDocument = async (documentPath, dealId, documentIndex) => {
    try {
      console.log(`🔍 Скачиваем документ: ${documentPath}, dealId: ${dealId}, index: ${documentIndex}`);
      
      // Если путь начинается с http, используем его напрямую
      if (documentPath.startsWith('http')) {
        window.open(documentPath, '_blank');
        return;
      }

      // Используем API endpoint для скачивания документа сделки
      if (dealId !== undefined && documentIndex !== undefined) {
        const response = await axiosAPI.get(`/admin/deals/${dealId}/documents/${documentIndex}/download`, {
          responseType: 'blob'
        });
        
        // Получаем имя файла из заголовка Content-Disposition или из пути
        const contentDisposition = response.headers['content-disposition'];
        let filename = documentPath.split('/').pop() || 'document';
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/);
          if (filenameMatch) {
            filename = decodeURIComponent(filenameMatch[1]);
          }
        }
        
        // Получаем MIME-тип из заголовка Content-Type
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        const blob = new Blob([response.data], { type: contentType });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        // Освобождаем память
        window.URL.revokeObjectURL(url);
        
        console.log(`✅ Документ скачан: ${filename}`);
        return;
      }

      // Fallback: старая логика для обратной совместимости
      let fullUrl;
      if (documentPath.startsWith('/uploads/')) {
        fullUrl = documentPath;
      } else if (documentPath.startsWith('/')) {
        fullUrl = documentPath;
      } else {
        fullUrl = `/uploads/deals/${documentPath}`;
      }

      console.log(`🔍 Полный URL для скачивания: ${fullUrl}`);

      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = documentPath.split('/').pop();
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('❌ Ошибка скачивания документа:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка скачивания документа: ' + (error.response?.data?.message || error.message)
        }
      }));
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'На рассмотрении';
      case 'approved':
        return 'Утверждена';
      case 'rejected':
        return 'Отклонена';
      default:
        return status;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="deals-loading">
        <div className="loading-spinner"></div>
        <p>Загрузка сделок...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="deals-error">
        <p>❌ {error}</p>
        <button onClick={loadManagerDeals} className="retry-button">
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="manager-deals-list">
      <div className="deals-header">
        <h2>📋 Мои сделки</h2>
        <p className="deals-subtitle">Список всех сделок с назначенными клиентами</p>
      </div>

      {deals.length === 0 ? (
        <div className="no-deals">
          <p>📝 У вас пока нет сделок</p>
          <p className="no-deals-subtitle">
            Сделки будут отображаться здесь после их создания в карточках клиентов
          </p>
        </div>
      ) : (
        <div className="deals-grid">
          {deals.map(deal => (
            <div key={deal.id} className="deal-card">
              <div className="deal-header">
                <div className="deal-client-info">
                  <h4>{deal.Client?.firstname} {deal.Client?.surname}</h4>
                  <p className="client-email">{deal.Client?.email}</p>
                </div>
                <div className={`status-badge ${getStatusClass(deal.status)}`}>
                  {getStatusText(deal.status)}
                </div>
              </div>

              <div className="deal-amounts">
                <div className="amount-item">
                  <span className="amount-label">Сумма в валюте:</span>
                  <span className="amount-value">
                    {deal.amountCurrency} {deal.currency}
                  </span>
                </div>
                <div className="amount-item">
                  <span className="amount-label">Сумма в рублях:</span>
                  <span className="amount-value">
                    {deal.amountRub.toLocaleString()} ₽
                  </span>
                </div>
                <div className="amount-item">
                  <span className="amount-label">Курс:</span>
                  <span className="amount-value">
                    {deal.exchangeRate}
                  </span>
                </div>
              </div>

              {deal.description && (
                <div className="deal-description">
                  <strong>Описание:</strong>
                  <p>{deal.description}</p>
                </div>
              )}

              <div className="deal-meta">
                <div className="deal-date">
                  <strong>Дата сделки:</strong>
                  <span>{new Date(deal.dealDate).toLocaleDateString('ru-RU')}</span>
                </div>
                <div className="deal-type">
                  <strong>Тип сделки:</strong>
                  <span>{deal.DealType?.name || 'Не указан'}</span>
                </div>
              </div>

              <div className="deal-documents">
                <strong>Закрывающие документы:</strong>
                {deal.documents && deal.documents.length > 0 ? (
                  <div className="documents-list">
                    {deal.documents.map((doc, index) => (
                      <div key={index} className="document-item">
                        <span className="document-name">
                          📎 {doc.split('/').pop()}
                        </span>
                                  <button 
                                    className="btn-download"
                                    onClick={() => handleDownloadDocument(doc, deal.id, index)}
                                  >
                                    Скачать
                                  </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-documents">Документы не загружены</p>
                )}
                
                {/* Кнопка для загрузки дополнительных документов */}
                <div className="upload-document-section">
                  <input
                    type="file"
                    id={`document-upload-${deal.id}`}
                    className="document-upload-input"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                    onChange={(e) => handleDocumentUpload(e, deal.id)}
                  />
                  <label htmlFor={`document-upload-${deal.id}`} className="btn-upload-document">
                    📎 Загрузить документ
                  </label>
                </div>
              </div>

              {deal.status === 'rejected' && deal.rejectionReason && (
                <div className="deal-rejection">
                  <strong>Причина отклонения:</strong>
                  <p>{deal.rejectionReason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealsKPI;
