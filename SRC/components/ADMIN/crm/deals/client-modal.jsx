import React, { useState } from 'react';

const ClientModal = ({ onClose, onSave, availableClients }) => {
  const [selectedClientId, setSelectedClientId] = useState('');
  const [newClient, setNewClient] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    email: '',
    phone: '',
    description: ''
  });
  const [isNewClient, setIsNewClient] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (isNewClient) {
      // Проверяем обязательные поля для нового клиента
      if (!newClient.lastName.trim() || !newClient.firstName.trim() || !newClient.email.trim()) {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Заполните обязательные поля: Фамилия, Имя, Email'
          }
        }));
        return;
      }
      onSave(newClient);
    } else {
      // Проверяем выбор существующего клиента
      if (!selectedClientId) {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Выберите клиента из списка'
          }
        }));
        return;
      }
      // Ищем клиента по ID (может быть как числом, так и строкой типа "user_6")
      const selectedClient = availableClients.find(client => {
        // Если ID клиента - строка (user_X), сравниваем как строки
        if (typeof client.id === 'string') {
          return client.id === selectedClientId;
        }
        // Если ID клиента - число, парсим selectedClientId
        return client.id === parseInt(selectedClientId);
      });
      
      if (!selectedClient) {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Выбранный клиент не найден'
          }
        }));
        return;
      }
      
      // Дополнительная валидация: проверяем, что клиент еще не в воронке
      console.log('🔍 Проверяем клиента перед добавлением:', selectedClient);
      console.log('🔍 Доступные клиенты:', availableClients);
      
      const isClientAvailable = availableClients.some(client => 
        client.id === selectedClient.id || client.userId === selectedClient.userId
      );
      
      if (!isClientAvailable) {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Этот клиент уже добавлен в воронку продаж или недоступен для добавления'
          }
        }));
        return;
      }
      
      onSave(selectedClient);
    }
  };

  const handleNewClientToggle = () => {
    setIsNewClient(!isNewClient);
    setSelectedClientId('');
    setNewClient({
      lastName: '',
      firstName: '',
      middleName: '',
      email: '',
      phone: '',
      description: ''
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content large">
        <div className="modal-header">
          <h3>Добавить клиента в этап</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>
              <input
                type="radio"
                checked={!isNewClient}
                onChange={() => setIsNewClient(false)}
              />
              Выбрать из существующих клиентов
            </label>
            <label>
              <input
                type="radio"
                checked={isNewClient}
                onChange={() => setIsNewClient(true)}
              />
              Добавить нового клиента
            </label>
          </div>

          {!isNewClient ? (
            <div className="form-group">
              <label htmlFor="clientSelect">Выберите клиента</label>
              <select
                id="clientSelect"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
              >
                <option value="">Выберите клиента...</option>
                {availableClients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.lastName} {client.firstName} {client.middleName} ({client.email})
                  </option>
                ))}
              </select>
              {availableClients.length === 0 && (
                <div className="no-clients-message">
                  <p className="no-clients">Нет доступных клиентов для добавления</p>
                </div>
              )}
            </div>
          ) : (
            <div className="new-client-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="lastName">Фамилия *</label>
                  <input
                    type="text"
                    id="lastName"
                    value={newClient.lastName}
                    onChange={(e) => setNewClient({...newClient, lastName: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="firstName">Имя *</label>
                  <input
                    type="text"
                    id="firstName"
                    value={newClient.firstName}
                    onChange={(e) => setNewClient({...newClient, firstName: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="middleName">Отчество</label>
                <input
                  type="text"
                  id="middleName"
                  value={newClient.middleName}
                  onChange={(e) => setNewClient({...newClient, middleName: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  value={newClient.email}
                  onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Телефон</label>
                <input
                  type="tel"
                  id="phone"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({...newClient, phone: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Описание</label>
                <textarea
                  id="description"
                  value={newClient.description}
                  onChange={(e) => setNewClient({...newClient, description: e.target.value})}
                  rows="3"
                />
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Отмена
            </button>
            <button type="submit" className="btn-save">
              Добавить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientModal;
