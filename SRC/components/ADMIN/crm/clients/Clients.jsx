import React, { useState, useEffect, useCallback } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';
import ClientCard from './ClientCard';
import ClientDetailsModal from '../deals/client-details-modal';
import './Clients.css';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Загрузка клиентов
  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 Загружаем клиентов для менеджера...');
      
      const response = await axiosAPI.get('/admin/crm/deals/clients');
      console.log('📋 Ответ от сервера:', response.data);
      
      const clientsData = response.data.clients || response.data.data || [];
      console.log('👥 Количество клиентов:', clientsData.length);
      
      // Подробное логирование структуры клиентов
      clientsData.forEach((client, index) => {
        console.log(`🔍 Клиент ${index + 1}:`, {
          id: client.id,
          firstName: client.firstName,
          lastName: client.lastName,
          middleName: client.middleName,
          email: client.email,
          phone: client.phone,
          description: client.description,
          userId: client.userId,
          hasUserData: !!client.User
        });
      });
      
      setClients(clientsData);
      setFilteredClients(clientsData);
    } catch (error) {
      console.error('❌ Ошибка загрузки клиентов:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка загрузки списка клиентов'
        }
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Функция фильтрации клиентов
  const filterClients = useCallback((query) => {
    if (!query.trim()) {
      setFilteredClients(clients);
      return;
    }

    const filtered = clients.filter(client => {
      const searchLower = query.toLowerCase();
      
      // Поиск по фамилии
      const lastName = client.lastName || client.User?.surname || '';
      if (lastName.toLowerCase().includes(searchLower)) return true;
      
      // Поиск по email
      const email = client.email || client.User?.User_Auth?.email || '';
      if (email.toLowerCase().includes(searchLower)) return true;
      
      // Поиск по телефону
      const phone = client.phone || client.User?.phone || '';
      if (phone.toLowerCase().includes(searchLower)) return true;
      
      // Поиск по имени
      const firstName = client.firstName || client.User?.firstname || '';
      if (firstName.toLowerCase().includes(searchLower)) return true;
      
      // Поиск по отчеству
      const middleName = client.middleName || client.User?.patronymic || '';
      if (middleName.toLowerCase().includes(searchLower)) return true;
      
      return false;
    });
    
    setFilteredClients(filtered);
  }, [clients]);

  // Обработчик изменения поискового запроса
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    filterClients(query);
  };

  // Загрузка клиентов при монтировании компонента
  useEffect(() => {
    loadClients();
  }, [loadClients]);

  // Обработка клика по карточке клиента
  const handleClientClick = (client) => {
    console.log('🖱️ Клик по клиенту:', client);
    setSelectedClient(client);
    setShowClientModal(true);
  };

  // Закрытие модального окна
  const handleCloseModal = () => {
    setShowClientModal(false);
    setSelectedClient(null);
  };

  // Обновление клиента после изменений в модальном окне
  const handleClientUpdate = () => {
    loadClients(); // Перезагружаем список клиентов
  };

  // Обновляем фильтрацию при изменении списка клиентов
  useEffect(() => {
    if (clients.length > 0) {
      filterClients(searchQuery);
    }
  }, [clients, filterClients, searchQuery]);

  if (loading) {
    return (
      <div className="clients-page">
        <div className="clients-loading">
          <div className="loading-spinner"></div>
          <p>Загрузка клиентов...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="clients-page">
      <div className="clients-header">
        <h2>📋 Клиенты</h2>
        <div className="clients-info">
          <div className="search-container">
            <input
              type="text"
              placeholder="Поиск по ФИО, email, телефону..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          <span className="clients-count">
            Найдено {filteredClients.length} клиента
          </span>
        </div>
      </div>

      <div className="clients-content">
        {clients.length === 0 ? (
          <div className="clients-empty">
            <div className="empty-icon">👥</div>
            <h3>Нет назначенных клиентов</h3>
            <p>К вам пока не назначены клиенты для работы</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="clients-empty">
            <div className="empty-icon">🔍</div>
            <h3>Клиенты не найдены</h3>
            <p>Попробуйте изменить поисковый запрос</p>
          </div>
        ) : (
          <div className="clients-grid">
            {filteredClients.map((client) => (
              <ClientCard
                key={client.id}
                client={client}
                onClick={() => handleClientClick(client)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно с детальной информацией о клиенте */}
      {showClientModal && selectedClient && (
        <ClientDetailsModal
          client={selectedClient}
          onClose={handleCloseModal}
          onClientUpdate={handleClientUpdate}
        />
      )}
    </div>
  );
};

export default Clients;
