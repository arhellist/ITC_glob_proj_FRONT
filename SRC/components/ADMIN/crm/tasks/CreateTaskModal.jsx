import React, { useState, useEffect } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';

const CreateTaskModal = ({ onClose, onTaskCreated }) => {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [files, setFiles] = useState([]);
  
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    reminderDate: ''
  });

  // Загрузка доступных клиентов
  useEffect(() => {
    const loadClients = async () => {
      try {
        console.log('🔍 Загружаем клиентов для создания задачи...');
        const response = await axiosAPI.get('/admin/crm/deals/clients');
        console.log('🔍 Ответ сервера:', response.data);
        setClients(response.data.clients || response.data.data || []);
      } catch (error) {
        console.error('Ошибка загрузки клиентов:', error);
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Ошибка загрузки списка клиентов: ' + error.message
          }
        }));
      }
    };
    loadClients();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedClient) {
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Выберите клиента'
        }
      }));
      return;
    }

    if (!taskData.title.trim()) {
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Введите название задачи'
        }
      }));
      return;
    }

    try {
      setLoading(true);

      // Создаем задачу
      const taskResponse = await axiosAPI.post('/admin/tasks', {
        ...taskData,
        clientId: selectedClient
      });

      const taskId = taskResponse.data.data.id;

      // Загружаем документы, если они есть
      if (files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append('title', file.name);
          formData.append('description', 'Документ, загруженный при создании задачи');
          formData.append('file', file);

          await axiosAPI.post(`/admin/tasks/${taskId}/documents`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      }

      onTaskCreated();
      onClose();
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Задача успешно создана'
        }
      }));
    } catch (error) {
      console.error('Ошибка создания задачи:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка создания задачи: ' + error.message
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content create-task-modal">
        <div className="modal-header">
          <h3>Создать задачу</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название задачи *</label>
            <input
              type="text"
              name="title"
              value={taskData.title}
              onChange={handleInputChange}
              placeholder="Введите название задачи"
              required
            />
          </div>

          <div className="form-group">
            <label>Клиент *</label>
            <select
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
              required
            >
              <option value="">Выберите клиента</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.surname || client.lastName || ''} {client.firstname || client.firstName || ''} {client.patronymic || client.middleName || ''} {client.email ? `(${client.email})` : ''}
                </option>
              ))}
            </select>
            {clients.length === 0 && (
              <small style={{ color: '#f44336' }}>
                Клиенты не загружены. Проверьте консоль для подробностей.
              </small>
            )}
            {clients.length > 0 && (
              <small style={{ color: '#4CAF50' }}>
                Загружено {clients.length} клиент(ов)
              </small>
            )}
          </div>

          <div className="form-group">
            <label>Описание</label>
            <textarea
              name="description"
              value={taskData.description}
              onChange={handleInputChange}
              rows="4"
              placeholder="Описание задачи"
            />
          </div>

          <div className="form-group">
            <label>Приоритет</label>
            <select
              name="priority"
              value={taskData.priority}
              onChange={handleInputChange}
            >
              <option value="low">🟢 Низкий</option>
              <option value="medium">🟡 Средний</option>
              <option value="high">🟠 Высокий</option>
              <option value="urgent">🔴 Срочный</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Дата выполнения</label>
              <input
                type="date"
                name="dueDate"
                value={taskData.dueDate}
                onChange={handleInputChange}
              />
            </div>

            <div className="form-group">
              <label>Напоминание</label>
              <input
                type="datetime-local"
                name="reminderDate"
                value={taskData.reminderDate}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Документы</label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.jpg,.jpeg,.png,.gif,.webp,.json,.xml"
            />
            <small>Можно выбрать несколько файлов</small>
            
            {files.length > 0 && (
              <div className="files-list">
                <h4>Выбранные файлы:</h4>
                {files.map((file, index) => (
                  <div key={index} className="file-item">
                    <span>{file.name}</span>
                    <button 
                      type="button"
                      onClick={() => removeFile(index)}
                      className="btn-remove-file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" className="btn-save" disabled={loading}>
              {loading ? 'Создание...' : 'Создать задачу'}
            </button>
            <button type="button" onClick={onClose} className="btn-cancel">
              Отменить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;
