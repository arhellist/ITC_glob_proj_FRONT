import React, { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';
import websocketService from '../../../../JS/websocket/websocket-service';
import { useCRM } from '../../../../contexts/CRMContext.jsx';
import { useSupport } from '../../../../hooks/useSupport.js';
import FunnelStageModal from './funnel-stage-modal';
import ClientModal from './client-modal';
import ClientDetailsModal from './client-details-modal';
import './deals.css';

// Мемоизированный компонент карточки клиента с кастомным сравнением
const ClientCard = memo(({ client, adminRole, clientUnreadMessages, handleDragStart, handleClientClick, handleDeleteClient }) => {
  return (
    <div
      key={client.id}
      className="client-card"
      draggable={adminRole !== 'VIEWER'}
      onDragStart={(e) => handleDragStart(e, client.id)}
      onClick={() => handleClientClick(client)}
      title="Кликните для просмотра деталей"
    >
      <div className="client-info">
        <h4 className="client-fio">
          {(client.User?.surname || client.lastName) || ''} {(client.User?.firstname || client.firstName) || ''} {(client.User?.patronymic || client.middleName) || ''}
        </h4>
        <p className="client-email">{client.User?.User_Auth?.email || client.email}</p>
        {/* Бейдж непрочитанных сообщений на карточке клиента */}
        {clientUnreadMessages[client.id] > 0 && (
          <div className="client-card-unread-badge">
            {clientUnreadMessages[client.id]}
          </div>
        )}
        {(client.User?.phone || client.phone) && (
          <p className="client-phone">{client.User?.phone || client.phone}</p>
        )}
        {client.description && (
          <p className="client-description">{client.description}</p>
        )}
      </div>
      {adminRole !== 'VIEWER' && (
        <div className="client-actions">
          <button
            className="delete-client-btn"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteClient(client.id);
            }}
            title="Удалить клиента"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Кастомная функция сравнения для React.memo
  const prevUnreadCount = prevProps.clientUnreadMessages[prevProps.client.id] || 0;
  const nextUnreadCount = nextProps.clientUnreadMessages[nextProps.client.id] || 0;
  
  return (
    prevProps.client.id === nextProps.client.id &&
    prevProps.client.funnelStageId === nextProps.client.funnelStageId &&
    prevProps.adminRole === nextProps.adminRole &&
    prevUnreadCount === nextUnreadCount &&
    prevProps.handleDragStart === nextProps.handleDragStart &&
    prevProps.handleClientClick === nextProps.handleClientClick &&
    prevProps.handleDeleteClient === nextProps.handleDeleteClient
  );
});

ClientCard.displayName = 'ClientCard';

const Deals = () => {
  const [funnelStages, setFunnelStages] = useState([]);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showClientDetailsModal, setShowClientDetailsModal] = useState(false);
  const [selectedStageId, setSelectedStageId] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [adminRole, setAdminRole] = useState(null);
  const [assignedClients, setAssignedClients] = useState({});
  const [availableClients, setAvailableClients] = useState([]);
  const [loading] = useState(false);
  const { clientUnreadMessages, incrementDealsCount, incrementClientUnread, setClientUnreadMessages } = useCRM();
  const { conversations, getClientUnreadCount } = useSupport(); // Используем SupportContext для получения данных в реальном времени
  
  // Используем useRef для хранения актуальных значений в обработчиках
  const conversationsRef = useRef([]);
  const assignedClientsRef = useRef({});
  
  // Обновляем refs при изменении состояний (теперь conversations из SupportContext)
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);
  
  useEffect(() => {
    assignedClientsRef.current = assignedClients;
  }, [assignedClients]);

  // Загружаем профиль админа
  useEffect(() => {
    loadProfile();
  }, []);

  // Функции загрузки данных
  const loadFunnelStages = useCallback(async () => {
    try {
      const response = await axiosAPI.get('/admin/crm/deals/funnel-stages');
      setFunnelStages(response.data.stages || []);
    } catch (error) {
      console.error('Ошибка загрузки этапов:', error);
    }
  }, []);

  // Обновляем счетчики непрочитанных сообщений из SupportContext
  const loadClientUnreadMessages = useCallback((clients) => {
    const unreadMessages = {};
    
    clients.forEach(client => {
      const clientId = client.userId || client.id;
      const totalUnread = getClientUnreadCount(clientId);
      
      console.log(`🔍 Deals: Счетчик для клиента ${clientId}: ${totalUnread}`);
      
      if (totalUnread > 0) {
        unreadMessages[client.id] = totalUnread;
      }
    });
    
    // Обновляем счетчики через контекст
    setClientUnreadMessages(unreadMessages);
    console.log('✅ Deals: Обновлены счетчики непрочитанных сообщений:', unreadMessages);
  }, [getClientUnreadCount, setClientUnreadMessages]);

  const loadAssignedClients = useCallback(async () => {
    try {
      const response = await axiosAPI.get('/admin/crm/deals/clients/funnel');
      
      // Группируем клиентов по этапам воронки
      const clientsByStage = {};
      const clients = response.data.clients || [];
      
      console.log('🔍 Клиенты в воронке получены с сервера:', clients.length);
      
      // Логируем первые 5 клиентов в воронке
      console.log('🔍 Первые 5 клиентов в воронке:');
      clients.slice(0, 5).forEach((client, index) => {
        console.log(`  ${index + 1}. ${client.lastName} ${client.firstName} (ID: ${client.id}, userId: ${client.userId}, stageId: ${client.funnelStageId})`);
      });
      
      clients.forEach(client => {
        const stageId = client.funnelStageId || client.stageId;
        if (!clientsByStage[stageId]) {
          clientsByStage[stageId] = [];
        }
        clientsByStage[stageId].push(client);
      });
      
      console.log('🔍 Клиенты сгруппированы по этапам:', Object.keys(clientsByStage).map(stageId => `${stageId}: ${clientsByStage[stageId].length}`));
      
      setAssignedClients(clientsByStage);
      
      // Загружаем непрочитанные сообщения для всех клиентов
      await loadClientUnreadMessages(clients);
    } catch (error) {
      console.error('Ошибка загрузки клиентов:', error);
    }
  }, [loadClientUnreadMessages]);

  // Получаем доступных клиентов для добавления в воронку
  const loadAvailableClients = useCallback(async () => {
    try {
      // Загружаем всех клиентов (для ROOT/ADMIN) или назначенных клиентов (для MANAGER)
      const response = await axiosAPI.get('/admin/crm/deals/clients');
      const allClients = response.data.clients || [];
      
      console.log('🔍 Всего клиентов получено с сервера:', allClients.length);
      
      // Логируем первые 5 клиентов с сервера
      console.log('🔍 Первые 5 клиентов с сервера:');
      allClients.slice(0, 5).forEach((client, index) => {
        console.log(`  ${index + 1}. ${client.lastName} ${client.firstName} (ID: ${client.id}, userId: ${client.userId})`);
      });
      
      // Получаем клиентов, которые уже в воронке (убираем дубликаты)
      const clientsInFunnel = [...new Set(Object.values(assignedClients)
        .flat()
        .map(client => client.userId))]; // Используем userId для сравнения и убираем дубликаты
      
      console.log('🔍 Клиенты уже в воронке (userId, уникальные):', clientsInFunnel);
      console.log('🔍 Количество уникальных клиентов в воронке:', clientsInFunnel.length);
      
      // Фильтруем клиентов, исключая тех, кто уже в воронке
      const available = allClients.filter(client => {
        // Исключаем клиентов, которые уже в воронке
        return !clientsInFunnel.includes(client.userId);
      });
      
      console.log('🔍 Доступные клиенты для добавления:', available.length);
      
      // Логируем первые 5 доступных клиентов
      console.log('🔍 Первые 5 доступных клиентов:');
      available.slice(0, 5).forEach((client, index) => {
        console.log(`  ${index + 1}. ${client.lastName} ${client.firstName} (ID: ${client.id}, userId: ${client.userId})`);
      });
      
      // Ищем Жеребцову в доступных клиентах (только по фамилии)
      const zherebtsova = available.find(client => 
        client.lastName && client.lastName.toLowerCase().includes('жеребцова')
      );
      
      if (zherebtsova) {
        console.log('🔍 Жеребцова найдена в доступных клиентах:', {
          id: zherebtsova.id,
          userId: zherebtsova.userId,
          firstName: zherebtsova.firstName,
          lastName: zherebtsova.lastName
        });
      } else {
        console.log('❌ Жеребцова НЕ найдена в доступных клиентах');
        
        // Ищем всех клиентов с фамилией, содержащей "жеребц"
        const similar = available.filter(client => 
          client.lastName && client.lastName.toLowerCase().includes('жеребц')
        );
        
        if (similar.length > 0) {
          console.log('🔍 Найдены похожие на Жеребцову клиенты:');
          similar.forEach(client => {
            console.log(`  - ${client.lastName} ${client.firstName} (ID: ${client.id}, userId: ${client.userId})`);
          });
        }
      }
      
      setAvailableClients(available);
      return available;
    } catch (error) {
      console.error('Ошибка получения доступных клиентов:', error);
      setAvailableClients([]);
      return [];
    }
  }, [assignedClients]);

  // Загружаем этапы воронки и клиентов
  useEffect(() => {
    if (adminRole) {
      loadFunnelStages();
      loadAssignedClients();
    }
  }, [adminRole, loadFunnelStages, loadAssignedClients]);

  // Загружаем доступных клиентов при изменении assignedClients
  useEffect(() => {
    if (adminRole) {
      loadAvailableClients();
    }
  }, [assignedClients, loadAvailableClients, adminRole]);

  // Обновляем счетчики непрочитанных сообщений при изменении conversations из SupportContext
  useEffect(() => {
    if (assignedClients) {
      const allClients = Object.values(assignedClients).flat();
      if (allClients.length > 0) {
        loadClientUnreadMessages(allClients);
      }
    }
  }, [conversations, assignedClients, loadClientUnreadMessages]);

  // WebSocket подписка для обновления бейджей в реальном времени
  useEffect(() => {
    const handleNewMessage = (data) => {
      if (data.message && data.message.sender_type === 'user') {
        // Находим клиента по conversationId
        const conversation = conversationsRef.current.find(c => c.id === data.conversationId);
        if (conversation) {
          const userId = conversation.user_id;
          // Находим CRM клиента по userId
          const crmClient = assignedClientsRef.current.find(client => 
            client.userId === userId || client.User?.id === userId
          );
          if (crmClient) {
            incrementClientUnread(crmClient.id);
            incrementDealsCount();
          }
        }
      }
    };

    websocketService.on('support_new_message', handleNewMessage);

    return () => {
      websocketService.off('support_new_message', handleNewMessage);
    };
  }, [incrementClientUnread, incrementDealsCount]);

  const loadProfile = async () => {
    try {
      const response = await axiosAPI.get('/admin/profile');
      setAdminRole(response.data.admin.role);
    } catch (error) {
      console.error('Ошибка загрузки профиля:', error);
    }
  };




  const handleCreateStage = async (stageData) => {
    try {
      await axiosAPI.post('/admin/crm/deals/funnel-stages', stageData);
      await loadFunnelStages();
      setShowStageModal(false);
    } catch (error) {
      console.error('Ошибка создания этапа:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка создания этапа'
        }
      }));
    }
  };

  const handleDeleteStage = async (stageId) => {
    // Показываем модальное окно подтверждения
    const shouldDelete = window.confirm('Вы уверены, что хотите удалить этот этап?');
    if (!shouldDelete) return;
    
    try {
      await axiosAPI.delete(`/admin/crm/deals/funnel-stages/${stageId}`);
      await loadFunnelStages();
    } catch (error) {
      console.error('Ошибка удаления этапа:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка удаления этапа'
        }
      }));
    }
  };

  const handleAddClient = useCallback(async (clientData) => {
    try {
      // Проверяем, что clientData передан
      if (!clientData) {
        console.error('❌ clientData не передан в handleAddClient');
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Ошибка: данные клиента не переданы'
          }
        }));
        return;
      }
      
      // Определяем тип клиента и формируем данные
      let requestData;
      if (clientData.id) {
        // Существующий клиент
        requestData = {
          stageId: selectedStageId,
          type: 'existing',
          clientId: clientData.id,
          clientData: clientData
        };
      } else {
        // Новый клиент
        requestData = {
          stageId: selectedStageId,
          type: 'new',
          clientData: clientData
        };
      }
      
      await axiosAPI.post('/admin/crm/deals/clients', requestData);
      await loadFunnelStages();
      await loadAssignedClients(); // Обновляем список назначенных клиентов
      await loadAvailableClients(); // Обновляем список доступных клиентов
      setShowClientModal(false);
    } catch (error) {
      console.error('Ошибка добавления клиента:', error);
      
      // Показываем более информативное сообщение об ошибке
      if (error.response?.status === 409) {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Клиент с таким email уже добавлен в воронку продаж'
          }
        }));
      } else if (error.response?.status === 400) {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Ошибка: ' + (error.response?.data?.message || 'Неверные данные')
          }
        }));
      } else {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Ошибка добавления клиента: ' + (error.response?.data?.message || 'Неизвестная ошибка')
          }
        }));
      }
    }
  }, [selectedStageId, loadFunnelStages, loadAssignedClients, loadAvailableClients]);

  const handleDeleteClient = useCallback(async (clientId) => {
    // Показываем модальное окно подтверждения
    const shouldDelete = window.confirm('Вы уверены, что хотите удалить этого клиента?');
    if (!shouldDelete) return;
    
    try {
      await axiosAPI.delete(`/admin/crm/deals/clients/${clientId}`);
      await loadFunnelStages();
      await loadAssignedClients(); // Обновляем список назначенных клиентов
      await loadAvailableClients(); // Обновляем список доступных клиентов
    } catch (error) {
      console.error('Ошибка удаления клиента:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка удаления клиента'
        }
      }));
    }
  }, [loadAssignedClients, loadFunnelStages, loadAvailableClients]);

  // ПРОСТОЙ drag-and-drop для клиентов
  const handleDragStart = useCallback((e, clientId) => {
    e.dataTransfer.setData('text/plain', clientId);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(async (e, targetStageId) => {
    e.preventDefault();
    const clientId = e.dataTransfer.getData('text/plain');
    
    if (!clientId) return;

    // Находим исходный этап клиента
    let sourceStageId = null;
    Object.keys(assignedClients).forEach(stageId => {
      if (assignedClients[stageId]?.some(client => client.id === parseInt(clientId))) {
        sourceStageId = parseInt(stageId);
      }
    });

    // Если клиент уже в этом этапе - ничего не делаем
    if (sourceStageId === targetStageId) {
      return;
    }

    try {
      // Отправляем запрос на сервер БЕЗ обновления состояния
      await axiosAPI.put(`/admin/crm/deals/clients/${clientId}/move`, {
        stageId: targetStageId
      });
      
      // Только после успешного ответа обновляем состояние
      await loadAssignedClients();
      await loadAvailableClients(); // Обновляем список доступных клиентов
      
    } catch (error) {
      console.error('Ошибка перемещения клиента:', error);
    }
  }, [assignedClients, loadAssignedClients, loadAvailableClients]);

  // Функция для получения доступных клиентов (синхронная)
  const getAvailableClients = () => {
    console.log('🔍 getAvailableClients вызвана, availableClients.length:', availableClients.length);
    console.log('🔍 availableClients:', availableClients);
    return availableClients;
  };

  const handleClientClick = useCallback((client) => {
    setSelectedClient(client);
    setShowClientDetailsModal(true);
  }, []);

  // Мемоизированное формирование клиентов для каждого этапа с глубоким сравнением
  const clientsByStage = useMemo(() => {
    const result = {};
    Object.keys(assignedClients).forEach(stageId => {
      result[stageId] = assignedClients[stageId]?.map(client => ({
        ...client,
        _stableKey: `${client.id}-${client.funnelStageId}` // Добавляем funnelStageId для стабильности
      })) || [];
    });
    return result;
  }, [assignedClients]);

  if (loading) {
    return (
      <div className="deals-container">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="deals-container">
      <div className="deals-header">
        <h2>🎯 Воронка продаж</h2>
        <p>Управление этапами продаж и клиентами</p>
      </div>

      {funnelStages.length === 0 ? (
        <div className="empty-funnel">
          <div className="empty-funnel-content">
            <h3>Воронка продаж пуста</h3>
            <p>Создайте первый этап воронки для начала работы</p>
            {adminRole !== 'VIEWER' && (
              <button 
                className="add-first-stage-btn"
                onClick={() => setShowStageModal(true)}
              >
                + Создать первый этап
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="funnel-stages">
          {funnelStages.map((stage) => (
            <div
              key={stage.id}
              className="funnel-stage"
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="stage-header">
                <h3>{stage.name}</h3>
                <div className="stage-actions">
                  <span className="clients-count">
                    {stage.clients?.length || 0} клиентов
                  </span>
                  {adminRole !== 'VIEWER' && (
                    <button
                      className="delete-stage-btn"
                      onClick={() => handleDeleteStage(stage.id)}
                      title="Удалить этап"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <div className="stage-clients">
                {clientsByStage[stage.id]?.map((client) => (
                  <ClientCard
                    key={client._stableKey}
                    client={client}
                    adminRole={adminRole}
                    clientUnreadMessages={clientUnreadMessages}
                    handleDragStart={handleDragStart}
                    handleClientClick={handleClientClick}
                    handleDeleteClient={handleDeleteClient}
                  />
                ))}
                
                {adminRole !== 'VIEWER' && (
                  <button 
                    className="add-client-btn"
                    onClick={() => {
                      setSelectedStageId(stage.id);
                      setShowClientModal(true);
                    }}
                  >
                    + Клиент
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {adminRole !== 'VIEWER' && (
            <div className="add-stage-column">
              <button 
                className="add-stage-btn"
                onClick={() => setShowStageModal(true)}
              >
                + Добавить этап воронки
              </button>
            </div>
          )}
        </div>
      )}

      {/* Модальные окна */}
      {showStageModal && (
        <FunnelStageModal
          onClose={() => setShowStageModal(false)}
          onSave={handleCreateStage}
        />
      )}

      {showClientModal && (
        <ClientModal
          onClose={() => setShowClientModal(false)}
          onSave={handleAddClient}
          availableClients={getAvailableClients()}
        />
      )}

      {showClientDetailsModal && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={() => {
            setShowClientDetailsModal(false);
            setSelectedClient(null);
          }}
        />
      )}
    </div>
  );
};

Deals.displayName = 'Deals';

export default Deals;
