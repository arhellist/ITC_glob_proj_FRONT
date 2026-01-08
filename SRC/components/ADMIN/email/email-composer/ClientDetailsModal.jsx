import React, { useState, useEffect, useCallback } from 'react';
import { API_CONFIG, getAvatarUrl } from '../../../../config/api';
import axiosAPI from '../../../../JS/auth/http/axios';
import { useAuthStore } from '../../../../JS/auth/store/store';
import './ClientDetailsModal.css';

const ClientDetailsModal = ({ client, onClose }) => {
  const [activeTab, setActiveTab] = useState("personal");
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [deals, setDeals] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [dealTypes, setDealTypes] = useState([]);
  const [currencyRates, setCurrencyRates] = useState({});
  const [selectedConversation, setSelectedConversation] = useState(null);
  
  const { checkAuth } = useAuthStore();

  // Загрузка всех данных клиента
  const loadClientDetails = useCallback(async () => {
    if (!client?.id) return;
    
    try {
      setLoading(true);
      console.log('🔍 Загружаем полные данные клиента:', client.id);

      // Загружаем детальную информацию о клиенте с обработкой ошибок для каждого запроса
      const promises = [
        axiosAPI
          .get(`/admin/crm/deals/clients/user_${client.id}/details`)
          .catch((err) => {
            console.error("Ошибка загрузки деталей клиента:", err);
            return { data: { client: null } };
          }),
        axiosAPI
          .get(`/admin/crm/deals/clients/user_${client.id}/accounts`)
          .catch((err) => {
            console.error("Ошибка загрузки счетов клиента:", err);
            return { data: { accounts: [] } };
          }),
        axiosAPI
          .get(`/admin/crm/deals/clients/user_${client.id}/referrals`)
          .catch((err) => {
            console.error("Ошибка загрузки рефералов клиента:", err);
            return { data: { referrals: [] } };
          }),
        axiosAPI
          .get(`/admin/crm/deals/clients/user_${client.id}/documents`)
          .catch((err) => {
            console.error("Ошибка загрузки документов клиента:", err);
            return { data: { documents: [] } };
          }),
        axiosAPI
          .get(`/admin/crm/deals/clients/user_${client.id}/tasks`)
          .catch((err) => {
            console.error("Ошибка загрузки задач клиента:", err);
            return { data: { tasks: [] } };
          }),
        axiosAPI
          .get(`/admin/crm/deals/clients/user_${client.id}/deals`)
          .catch((err) => {
            console.error("Ошибка загрузки сделок клиента:", err);
            return { data: { deals: [] } };
          }),
        axiosAPI
          .get(`/admin/crm/deals/clients/user_${client.id}/conversations`)
          .catch((err) => {
            console.error("Ошибка загрузки переписки клиента:", err);
            return { data: { conversations: [] } };
          }),
        axiosAPI
          .get('/admin/crm/deals/deal-types')
          .catch((err) => {
            console.error("Ошибка загрузки типов сделок:", err);
            return { data: { dealTypes: [] } };
          }),
        axiosAPI
          .get('/admin/course/current?currency=USD')
          .catch((err) => {
            console.error("Ошибка загрузки курса валют:", err);
            return { data: { data: { rate: 100 } } };
          })
      ];

      const [
        clientResponse,
        accountsResponse,
        referralsResponse,
        documentsResponse,
        tasksResponse,
        dealsResponse,
        conversationsResponse,
        dealTypesResponse,
        currencyResponse
      ] = await Promise.all(promises);

      // Устанавливаем данные
      setClientData(clientResponse.data.client || client);
      setAccounts(accountsResponse.data.accounts || []);
      setReferrals(referralsResponse.data.referrals || []);
      setDocuments(documentsResponse.data.documents || []);
      setTasks(tasksResponse.data.tasks || []);
      setDeals(dealsResponse.data.deals || []);
      setConversations(conversationsResponse.data.conversations || []);
      setDealTypes(dealTypesResponse.data.dealTypes || []);
          setCurrencyRates(currencyResponse.data.data ? { USD: currencyResponse.data.data.rate } : { USD: 100 });

      console.log('🔍 Получены данные клиента:', clientResponse.data.client);
      console.log('🔍 Получены счета:', accountsResponse.data.accounts);
      console.log('🔍 Получены рефералы:', referralsResponse.data.referrals);
      console.log('🔍 Получены документы:', documentsResponse.data.documents);
      console.log('🔍 Получены задачи:', tasksResponse.data.tasks);
      console.log('🔍 Получены сделки:', dealsResponse.data.deals);
      console.log('🔍 Получена переписка:', conversationsResponse.data.conversations);
      
      // Подробное логирование данных клиента
      if (clientResponse.data.client) {
        console.log('🔍 Подробные данные клиента:', {
          id: clientResponse.data.client.id,
          firstname: clientResponse.data.client.firstname,
          surname: clientResponse.data.client.surname,
          patronymic: clientResponse.data.client.patronymic,
          phone: clientResponse.data.client.phone,
          email: clientResponse.data.client.email,
          dateReg: clientResponse.data.client.dateReg,
          dateBorn: clientResponse.data.client.dateBorn,
          geography: clientResponse.data.client.geography,
          statusPerson: clientResponse.data.client.statusPerson
        });
      }

    } catch (error) {
      console.error('❌ Ошибка загрузки данных клиента:', error);
    } finally {
      setLoading(false);
    }
  }, [client?.id]);

  useEffect(() => {
    loadClientDetails();
  }, [loadClientDetails]);

  // Форматирование ФИО
  const getFullName = () => {
    if (!clientData) return 'Не указано';
    const parts = [];
    
    // Проверяем разные форматы данных
    if (clientData.surname) parts.push(clientData.surname);
    else if (clientData.lastName) parts.push(clientData.lastName);
    
    if (clientData.firstname) parts.push(clientData.firstname);
    else if (clientData.firstName) parts.push(clientData.firstName);
    
    if (clientData.patronymic) parts.push(clientData.patronymic);
    else if (clientData.middleName) parts.push(clientData.middleName);
    
    return parts.join(' ') || 'Не указано';
  };

  // Форматирование email
  const getEmail = () => {
    return clientData?.email || client?.email || 'Не указан';
  };

  // Форматирование телефона
  const getPhone = () => {
    return clientData?.phone || client?.phone || 'Не указан';
  };

  // Получение инициалов
  const getInitials = () => {
    const firstName = clientData?.firstname || client?.firstName || '';
    const lastName = clientData?.surname || client?.lastName || '';
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    return firstInitial + lastInitial || 'К';
  };

  // Получение аватара
  const getAvatar = () => {
    const avatar = clientData?.avatar || client?.avatar;
    return avatar && avatar !== "noAvatar" ? avatar : null;
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return 'Не указана';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  // Форматирование суммы
  const formatAmount = (amount, currency = 'USD') => {
    if (!amount) return '0';
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Копирование в буфер обмена
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      console.log(`${label} скопирован в буфер обмена: ${text}`);
    }).catch(err => {
      console.error('Ошибка копирования:', err);
    });
  };

  if (!client) {
    return null;
  }

  return (
    <div className="client-details-modal-overlay" onClick={onClose}>
      <div className="client-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="client-details-modal-header">
          <h2>Личное дело клиента</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Загрузка данных клиента...</p>
          </div>
        ) : (
          <>
            {/* Навигация по вкладкам */}
            <div className="client-tabs">
              <button
                className={`tab-button ${activeTab === "personal" ? "active" : ""}`}
                onClick={() => setActiveTab("personal")}
              >
                👤 Личные данные
              </button>
              <button
                className={`tab-button ${activeTab === "accounts" ? "active" : ""}`}
                onClick={() => setActiveTab("accounts")}
              >
                💳 Счета ({accounts.length})
              </button>
              <button
                className={`tab-button ${activeTab === "referrals" ? "active" : ""}`}
                onClick={() => setActiveTab("referrals")}
              >
                👥 Рефералы ({referrals.length})
              </button>
              <button
                className={`tab-button ${activeTab === "documents" ? "active" : ""}`}
                onClick={() => setActiveTab("documents")}
              >
                📄 Документы ({documents.length})
              </button>
              <button
                className={`tab-button ${activeTab === "tasks" ? "active" : ""}`}
                onClick={() => setActiveTab("tasks")}
              >
                ✅ Задачи ({tasks.length})
              </button>
              <button
                className={`tab-button ${activeTab === "deals" ? "active" : ""}`}
                onClick={() => setActiveTab("deals")}
              >
                💼 Сделки ({deals.length})
              </button>
              <button
                className={`tab-button ${activeTab === "communication" ? "active" : ""}`}
                onClick={() => setActiveTab("communication")}
              >
                💬 Общение ({conversations.length})
              </button>
            </div>

            <div className="client-details-modal-content">
              {/* Вкладка Личные данные */}
              {activeTab === "personal" && (
                <div className="tab-content">
                  {/* Профиль клиента */}
                  <div className="client-profile-section">
                    <div className="client-avatar-large">
                      {(() => {
                        const avatar = getAvatar();
                        return avatar ? (
                          <img
                            src={getAvatarUrl(avatar)}
                            alt="Avatar"
                          />
                        ) : (
                          <span className="client-initials-large">{getInitials()}</span>
                        );
                      })()}
                    </div>
                    <div className="client-basic-info">
                      <h3 className="client-name-large">{getFullName()}</h3>
                      <p className="client-id">ID: {clientData?.id || client?.id}</p>
                      <p className="client-status">
                        Статус: {clientData?.isActivated ? 'Активирован' : 'Не активирован'}
                      </p>
                    </div>
                  </div>

                  {/* Контактная информация */}
                  <div className="client-info-section">
                    <h4>Контактная информация</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Email:</label>
                        <div className="info-value-with-copy">
                          <span>{getEmail()}</span>
                          <button 
                            className="copy-button"
                            onClick={() => copyToClipboard(getEmail(), 'Email')}
                            title="Копировать email"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <label>Телефон:</label>
                        <div className="info-value-with-copy">
                          <span>{getPhone()}</span>
                          <button 
                            className="copy-button"
                            onClick={() => copyToClipboard(getPhone(), 'Телефон')}
                            title="Копировать телефон"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Личная информация */}
                  <div className="client-info-section">
                    <h4>Личная информация</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Дата рождения:</label>
                        <span>{formatDate(clientData?.dateBorn || client?.dateBorn)}</span>
                      </div>
                      
                      <div className="info-item">
                        <label>Дата регистрации:</label>
                        <span>{formatDate(clientData?.dateReg || client?.dateReg)}</span>
                      </div>
                      
                      <div className="info-item">
                        <label>Пол:</label>
                        <span>{clientData?.gender || 'Не указан'}</span>
                      </div>
                      
                      <div className="info-item">
                        <label>Местоположение:</label>
                        <div className="info-value-with-copy">
                          <span>{clientData?.geography || client?.geography || 'Не указано'}</span>
                          {clientData?.geography && (
                            <button 
                              className="copy-button"
                              onClick={() => copyToClipboard(clientData.geography, 'Местоположение')}
                              title="Копировать местоположение"
                            >
                              📋
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="info-item">
                        <label>Статус персоны:</label>
                        <span>{clientData?.statusPerson || 'Не указан'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Дополнительная информация */}
                  <div className="client-info-section">
                    <h4>Дополнительная информация</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <label>Полное ФИО:</label>
                        <div className="info-value-with-copy">
                          <span>{getFullName()}</span>
                          <button 
                            className="copy-button"
                            onClick={() => copyToClipboard(getFullName(), 'Полное ФИО')}
                            title="Копировать ФИО"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Вкладка Счета */}
              {activeTab === "accounts" && (
                <div className="tab-content">
                  <div className="section-header">
                    <h3>Счета клиента</h3>
                    <div className="section-actions">
                      <span className="count-badge">{accounts.length}</span>
                      <button className="btn-add" onClick={() => {/* TODO: Добавить создание счета */}}>
                        + Создать счет
                      </button>
                    </div>
                  </div>
                  
                  {accounts.length === 0 ? (
                    <div className="empty-state">
                      <p>У клиента нет счетов</p>
                    </div>
                  ) : (
                    <div className="accounts-list">
                      {accounts.map((account, index) => (
                        <div key={index} className="account-card">
                          <div className="account-header">
                            <h4>{account.accountName || `Счет #${account.id}`}</h4>
                            <span className="account-balance">
                              {account.balance !== undefined
                                ? `${account.balance} ${account.currency || "USD"}`
                                : "0 USD"}
                            </span>
                          </div>
                          <div className="account-details">
                            <div className="account-info">
                              <span><strong>Продукт:</strong> {account.productName || "Не указан"}</span>
                              <span><strong>Создан:</strong> {formatDate(account.createdAt)}</span>
                              <span><strong>Статус:</strong> {account.status || "Активен"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Вкладка Рефералы */}
              {activeTab === "referrals" && (
                <div className="tab-content">
                  <div className="section-header">
                    <h3>Реферальная структура</h3>
                    <span className="count-badge">{referrals.length}</span>
                  </div>
                  
                  {referrals.length === 0 ? (
                    <div className="empty-state">
                      <p>У клиента нет рефералов</p>
                    </div>
                  ) : (
                    <div className="referrals-list">
                      {referrals.map((referral, index) => (
                        <div key={index} className="referral-card">
                          <div className="referral-info">
                            <h4>
                              {referral.surname} {referral.firstname} {referral.patronymic}
                            </h4>
                            <p>Email: {referral.email}</p>
                            <p>Зарегистрирован: {formatDate(referral.dateReg)}</p>
                          </div>
                          <div className="referral-status">
                            <span className={`status-badge ${referral.status === "active" ? "active" : "inactive"}`}>
                              {referral.status === "active" ? "Активен" : "Неактивен"}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Вкладка Документы */}
              {activeTab === "documents" && (
                <div className="tab-content">
                  <div className="section-header">
                    <h3>Документы клиента</h3>
                    <div className="section-actions">
                      <span className="count-badge">{documents.length}</span>
                      <button className="btn-add" onClick={() => {/* TODO: Добавить загрузку документа */}}>
                        + Добавить документ
                      </button>
                    </div>
                  </div>
                  
                  {documents.length === 0 ? (
                    <div className="empty-state">
                      <p>У клиента нет документов</p>
                    </div>
                  ) : (
                    <div className="documents-list">
                      {documents.map((doc, index) => (
                        <div key={index} className="document-card">
                          <div className="document-icon">
                            {doc.kind === "PASPORT" || doc.kind === "passport" ? "🛂" :
                             doc.kind === "selfie" ? "📸" :
                             doc.kind === "bank-information" ? "🏦" :
                             doc.kind === "investmentrules-crypto" ? "₿" :
                             doc.kind === "investmentrules-ETF" ? "📈" : "📄"}
                          </div>
                          <div className="document-info">
                            <h4>
                              {doc.kind === "PASPORT" || doc.kind === "passport" ? "Паспорт" :
                               doc.kind === "selfie" ? "Селфи" :
                               doc.kind === "bank-information" ? "Банковская информация" :
                               doc.kind === "investmentrules-crypto" ? "Правила инвестирования (Крипто)" :
                               doc.kind === "investmentrules-ETF" ? "Правила инвестирования (ETF)" :
                               doc.kind}
                            </h4>
                            <p className="document-status">
                              {doc.status === "approve" || doc.status === "approved" ? "✅ Утвержден" :
                               doc.status === "not approve" || doc.status === "rejected" ? "❌ Отклонен" :
                               "⏳ На рассмотрении"}
                            </p>
                            <p className="document-date">{formatDate(doc.createdAt)}</p>
                          </div>
                          <div className="document-actions">
                            <button 
                              className="btn-view"
                              onClick={async () => {
                                if (doc.viewUrl) {
                                  try {
                                    // Обновляем токен перед открытием документа
                                    const isValid = await checkAuth();
                                    
                                    if (!isValid) {
                                      console.error('Токен недействителен, невозможно открыть документ');
                                      return;
                                    }
                                    
                                    const token = localStorage.getItem("accessToken");
                                    const url = `${API_CONFIG.BASE_URL}${doc.viewUrl}?token=${token}&t=${Date.now()}`;
                                    window.open(url, "_blank", "width=800,height=600,scrollbars=yes,resizable=yes");
                                  } catch (error) {
                                    console.error('Ошибка при открытии документа:', error);
                                  }
                                }
                              }}
                            >
                              👁️ Просмотр
                            </button>
                            {!doc.isEncrypted && doc.kind !== "PASPORT" && doc.kind !== "passport" && (
                              <button 
                                className="btn-download"
                                onClick={async () => {
                                  try {
                                    // Обновляем токен перед скачиванием документа
                                    const isValid = await checkAuth();
                                    
                                    if (!isValid) {
                                      console.error('Токен недействителен, невозможно скачать документ');
                                      return;
                                    }
                                    
                                    const token = localStorage.getItem("accessToken");
                                    const url = `${API_CONFIG.BASE_URL}${doc.viewUrl}?token=${token}&download=true&t=${Date.now()}`;
                                    window.open(url, "_blank");
                                  } catch (error) {
                                    console.error('Ошибка при скачивании документа:', error);
                                  }
                                }}
                              >
                                📥 Скачать
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Вкладка Задачи */}
              {activeTab === "tasks" && (
                <div className="tab-content">
                  <div className="section-header">
                    <h3>Задачи клиента</h3>
                    <div className="section-actions">
                      <span className="count-badge">{tasks.length}</span>
                      <button className="btn-add" onClick={() => {/* TODO: Добавить создание задачи */}}>
                        + Создать задачу
                      </button>
                    </div>
                  </div>
                  
                  {tasks.length === 0 ? (
                    <div className="empty-state">
                      <p>У клиента нет задач</p>
                    </div>
                  ) : (
                    <div className="tasks-list">
                      {tasks.map((task, index) => (
                        <div key={index} className="task-card">
                          <div className="task-header">
                            <h4>{task.title}</h4>
                            <div className="task-actions">
                              <select 
                                value={task.status}
                                onChange={(e) => {/* TODO: Добавить обновление статуса */}}
                                className="status-select"
                              >
                                <option value="pending">⏳ В ожидании</option>
                                <option value="in_progress">🔄 В работе</option>
                                <option value="completed">✅ Завершена</option>
                                <option value="cancelled">❌ Отменена</option>
                              </select>
                              <button 
                                className="btn-upload-doc"
                                onClick={() => {/* TODO: Добавить загрузку документа */}}
                                title="Добавить документ"
                              >
                                📎
                              </button>
                              <button 
                                className="btn-delete"
                                onClick={() => {/* TODO: Добавить удаление задачи */}}
                                title="Удалить задачу"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                          {task.description && (
                            <p className="task-description">{task.description}</p>
                          )}
                          <div className="task-meta">
                            <span className={`priority priority-${task.priority}`}>
                              {task.priority === 'low' && '🟢 Низкий'}
                              {task.priority === 'medium' && '🟡 Средний'}
                              {task.priority === 'high' && '🟠 Высокий'}
                              {task.priority === 'urgent' && '🔴 Срочный'}
                            </span>
                            {task.dueDate && (
                              <span className="due-date">
                                📅 До: {formatDate(task.dueDate)}
                              </span>
                            )}
                            {task.reminderDate && (
                              <span className="reminder-date">
                                ⏰ Напоминание: {new Date(task.reminderDate).toLocaleString('ru-RU')}
                              </span>
                            )}
                            <span className="created-date">
                              📝 Создана: {formatDate(task.createdAt)}
                            </span>
                          </div>
                          {task.documents && task.documents.length > 0 && (
                            <div className="task-documents">
                              <h6>Документы:</h6>
                              {task.documents.map((doc, docIndex) => (
                                <div key={docIndex} className="document-item">
                                  <span>{doc.title}</span>
                                  <button 
                                    className="btn-download"
                                    onClick={() => {/* TODO: Добавить скачивание документа */}}
                                  >
                                    📥 Скачать
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Вкладка Сделки */}
              {activeTab === "deals" && (
                <div className="tab-content">
                  <div className="section-header">
                    <h3>Сделки клиента</h3>
                    <div className="section-actions">
                      <span className="count-badge">{deals.length}</span>
                      <button className="btn-add" onClick={() => {/* TODO: Добавить создание сделки */}}>
                        + Создать сделку
                      </button>
                    </div>
                  </div>
                  
                  {deals.length === 0 ? (
                    <div className="empty-state">
                      <p>У клиента нет сделок</p>
                    </div>
                  ) : (
                    <div className="deals-list">
                      {deals.map((deal, index) => (
                        <div key={index} className="deal-card">
                          <div className="deal-header">
                            <h4>Сделка #{deal.id}</h4>
                            <span className={`status-badge ${deal.status}`}>
                              {deal.status === 'pending' ? '⏳ На рассмотрении' :
                               deal.status === 'approved' ? '✅ Утверждена' :
                               deal.status === 'rejected' ? '❌ Отклонена' :
                               deal.status === 'completed' ? '✅ Завершена' :
                               deal.status === 'cancelled' ? '❌ Отменена' :
                               deal.status}
                            </span>
                          </div>
                          <div className="deal-amounts">
                            <div className="amount-item">
                              <span className="amount-label">Сумма:</span>
                              <span className="amount-value">
                                {parseFloat(deal.amountCurrency || deal.amount || 0).toLocaleString('ru-RU')} {deal.currency || 'USD'}
                              </span>
                            </div>
                            <div className="amount-item">
                              <span className="amount-label">В рублях:</span>
                              <span className="amount-value">
                                {parseFloat(deal.amountRub || 0).toLocaleString('ru-RU')} ₽
                              </span>
                            </div>
                            <div className="amount-item">
                              <span className="amount-label">Курс:</span>
                              <span className="amount-value">
                                {parseFloat(deal.exchangeRate || deal.rate || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                          {deal.description && (
                            <p className="deal-description">{deal.description}</p>
                          )}
                          <div className="deal-meta">
                            <span className="deal-date">
                              📅 Дата сделки: {formatDate(deal.dealDate || deal.createdAt)}
                            </span>
                            <span className="created-date">
                              📝 Создана: {formatDate(deal.createdAt)}
                            </span>
                            {deal.DealType && (
                              <span className="deal-type">
                                🏷️ Тип: {deal.DealType.name || deal.DealType}
                              </span>
                            )}
                          </div>
                          {deal.status === 'approved' && deal.approvedAt && (
                            <div className="deal-approval">
                              ✅ Утверждена: {new Date(deal.approvedAt).toLocaleString('ru-RU')}
                            </div>
                          )}
                          {deal.status === 'rejected' && (
                            <div className="deal-rejection">
                              <div>❌ Отклонена: {new Date(deal.rejectedAt).toLocaleString('ru-RU')}</div>
                              {deal.rejectionReason && (
                                <div className="rejection-reason">
                                  Причина: {deal.rejectionReason}
                                </div>
                              )}
                            </div>
                          )}
                          {deal.documents && deal.documents.length > 0 && (
                            <div className="deal-documents">
                              <h6>Документы:</h6>
                              <div className="documents-list">
                                {deal.documents.map((doc, docIndex) => (
                                  <div key={docIndex} className="document-item">
                                    <span className="document-name">
                                      📎 {doc.split('/').pop()}
                                    </span>
                                    <button 
                                      className="btn-download"
                                      onClick={() => {/* TODO: Добавить скачивание документа */}}
                                    >
                                      Скачать
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Вкладка Общение */}
              {activeTab === "communication" && (
                <div className="tab-content">
                  <div className="section-header">
                    <h3>Переписка с клиентом</h3>
                    <div className="section-actions">
                      <span className="count-badge">{conversations.length}</span>
                      <button className="btn-add" onClick={() => {/* TODO: Добавить создание беседы */}}>
                        💬 БЕСЕДА
                      </button>
                    </div>
                  </div>
                  
                  {conversations.length === 0 ? (
                    <div className="empty-state">
                      <p>Нет переписки с клиентом</p>
                    </div>
                  ) : (
                    <div className="communication-layout">
                      {/* Список бесед слева */}
                      <div className="conversations-sidebar">
                        <h5>Беседы</h5>
                        <div className="conversations-list">
                          {conversations.map((conversation, index) => (
                            <div 
                              key={index} 
                              className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                              onClick={() => setSelectedConversation(conversation)}
                            >
                              <div className="conversation-header">
                                <div className="conversation-title">
                                  <span className="priority-indicator">
                                    {conversation.priority === 'high' ? '🔴' :
                                     conversation.priority === 'medium' ? '🟡' : '🟢'}
                                  </span>
                                  <span className="conversation-subject">{conversation.subject}</span>
                                </div>
                                <span className="conversation-status">
                                  {conversation.status === 'open' ? 'Открыто' :
                                   conversation.status === 'in_progress' ? 'В работе' :
                                   conversation.status === 'resolved' ? 'Решено' :
                                   conversation.status === 'closed' ? 'Закрыто' :
                                   conversation.status}
                                </span>
                              </div>
                              <div className="conversation-meta">
                                <span className="conversation-date">
                                  {formatDate(conversation.createdAt)}
                                </span>
                                {conversation.unread_count_admin > 0 && (
                                  <span className="unread-badge">{conversation.unread_count_admin}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Детали беседы справа */}
                      <div className="conversation-details">
                        {selectedConversation ? (
                          <div className="conversation-content">
                            <div className="conversation-header-detail">
                              <h4>{selectedConversation.subject}</h4>
                              <div className="conversation-meta-detail">
                                <span className={`status-badge ${selectedConversation.status}`}>
                                  {selectedConversation.status === 'open' ? 'Открыто' :
                                   selectedConversation.status === 'in_progress' ? 'В работе' :
                                   selectedConversation.status === 'resolved' ? 'Решено' :
                                   selectedConversation.status === 'closed' ? 'Закрыто' :
                                   selectedConversation.status}
                                </span>
                                <span className="priority-badge">
                                  {selectedConversation.priority === 'high' ? '🔴 Высокий' :
                                   selectedConversation.priority === 'medium' ? '🟡 Средний' : '🟢 Низкий'}
                                </span>
                                <span className="conversation-date-detail">
                                  {formatDate(selectedConversation.createdAt)}
                                </span>
                              </div>
                            </div>

                            {/* Сообщения */}
                            <div className="messages-container">
                              <h5>Сообщения ({selectedConversation.Messages?.length || 0})</h5>
                              <div className="messages-list">
                                {selectedConversation.Messages && selectedConversation.Messages.length > 0 ? (
                                  selectedConversation.Messages.map((message, msgIndex) => {
                                    console.log('🔍 Сообщение:', message);
                                    return (
                                    <div key={msgIndex} className={`message-item ${message.sender_type === 'admin' ? 'admin-message' : 'client-message'}`}>
                                      <div className="message-header">
                                        <span className="message-sender">
                                          {message.sender_type === 'admin' ? '👨‍💼 Администратор' : 
                                           message.sender_type === 'user' ? '👤 Клиент' :
                                           message.sender_name || '👤 Отправитель'}
                                        </span>
                                        <span className="message-date">
                                          {formatDate(message.createdAt)}
                                        </span>
                                      </div>
                                      <div className="message-content">
                                        {message.message_text || message.content || 'Нет текста'}
                                      </div>
                                      {message.attachments && message.attachments.length > 0 && (
                                        <div className="message-attachments">
                                          <span className="attachment-label">📎 Вложения:</span>
                                          {message.attachments.map((attachment, attIndex) => (
                                            <span key={attIndex} className="attachment-item">
                                              {typeof attachment === 'string' ? attachment : attachment.name || `Файл ${attIndex + 1}`}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                    );
                                  })
                                ) : (
                                  <div className="empty-messages">
                                    <p>Нет сообщений в этой беседе</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="no-conversation-selected">
                            <p>Выберите беседу для просмотра сообщений</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        <div className="client-details-modal-footer">
          <button className="close-modal-button" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientDetailsModal;
