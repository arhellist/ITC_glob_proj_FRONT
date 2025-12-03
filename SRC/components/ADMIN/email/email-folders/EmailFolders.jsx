import React, { useEffect, useState } from 'react';
import './EmailFolders.css';
import axiosAPI from '../../../../JS/auth/http/axios';
import { ErrorNotification } from '../../../../JS/utils/notifications';
import { connect, getSocket } from '../../../../JS/websocket/websocket-service';

/**
 * Компонент управления папками email
 */
const EmailFolders = ({ folders, onFolderSelect, selectedFolder, onFoldersReload }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Используем переданные папки вместо загрузки своих
  useEffect(() => {
    if (folders && folders.length > 0) {
      setLoading(false);
      setError(null);
      
      
      // Автоматически выбираем папку "Входящие" если ничего не выбрано
      if (!selectedFolder) {
        const inboxFolder = folders.find(folder => folder.type === 'inbox') || folders[0];
        console.log('📁 EmailFolders: Автоматически выбираем папку:', inboxFolder);
        onFolderSelect(inboxFolder);
      }
    } else if (folders && folders.length === 0) {
      setLoading(true);
    }
  }, [folders, selectedFolder, onFolderSelect]);

  // WebSocket обработчик для обновления папок
  useEffect(() => {
    const setupWebSocket = async () => {
      try {
        await connect();
        const socket = getSocket();
        
        if (socket) {
          console.log('📁 EmailFolders: WebSocket подключен для обновления папок');
          
          // Обработчик создания новой папки
          socket.on('email:folder_created', (data) => {
            console.log('📁 EmailFolders: Получено уведомление о создании папки:', data);
            // Перезагружаем папки через родительский компонент
            if (onFoldersReload) {
              onFoldersReload();
            }
          });
          
          // Обработчик изменения папок
          socket.on('email:folder_changed', (data) => {
            console.log('📁 EmailFolders: Получено изменение папки:', data);
            if (onFoldersReload) {
              onFoldersReload();
            }
          });
        }
      } catch (error) {
        console.error('📁 EmailFolders: Ошибка подключения WebSocket:', error);
      }
    };

    setupWebSocket();

    return () => {
      try {
        const socket = getSocket();
        if (socket) {
          socket.off('email:folder_created');
          socket.off('email:folder_changed');
        }
      } catch (error) {
        console.error('📁 EmailFolders: Ошибка отключения WebSocket:', error);
      }
    };
  }, [onFoldersReload]);

  const handleFolderClick = (folder) => {
    onFolderSelect(folder);
  };

  const handleCreateFolder = () => {
    setNewFolderName('');
    setShowCreateModal(true);
  };

  const handleConfirmCreateFolder = async () => {
    if (!newFolderName.trim()) {
      const errorMessage = 'Введите название папки';
      const root = document.querySelector('.root-content-notification-container');
      if (root) {
        ErrorNotification(root, errorMessage);
      }
      return;
    }

    try {
      const { data } = await axiosAPI.post('/admin/email/folders', {
        name: newFolderName.trim(),
        type: 'custom'
      });

      if (data.success) {
        setShowCreateModal(false);
        setNewFolderName('');
        // Перезагружаем папки через родительский компонент
        if (onFoldersReload) {
          onFoldersReload();
        }
      }
    } catch (error) {
      console.error('Ошибка создания папки:', error);
      const errorMessage = 'Ошибка создания папки: ' + (error.response?.data?.message || error.message);
      const root = document.querySelector('.root-content-notification-container');
      if (root) {
        ErrorNotification(root, errorMessage);
      } else {
        console.error('Контейнер для нотификаций не найден:', errorMessage);
      }
    }
  };

  const handleCancelCreateFolder = () => {
    setShowCreateModal(false);
    setNewFolderName('');
  };


  const getFolderIcon = (type) => {
    switch (type) {
      case 'inbox': return '📥';
      case 'sent': return '📤';
      case 'drafts': return '📝';
      case 'trash': return '🗑️';
      case 'spam': return '🚫';
      case 'custom': return '📁';
      default: return '📁';
    }
  };

  const getFolderCount = (folder) => {
    return folder.emailCount || folder.total_count || 0;
  };

  const getUnreadCount = (folder) => {
    // Не показываем бейджи для папок СПАМ и Корзина
    if (folder.type === 'spam' || folder.type === 'trash') {
      return 0;
    }
    return folder.unreadCount || folder.unread_count || 0;
  };

  // Для папки "Sent" и "Drafts" показываем общее количество писем в бейдже
  const getBadgeCount = (folder) => {
    // Для всех папок показываем непрочитанные
    return getUnreadCount(folder);
  };

  if (loading) {
    return (
      <div className="email-folders">
        <div className="email-folders-header">
          <h3>Папки</h3>
        </div>
        <div className="email-loading">
          Загрузка папок...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="email-folders">
        <div className="email-folders-header">
          <h3>Папки</h3>
        </div>
        <div className="email-empty-state">
          <p>{error}</p>
          <button 
            className="email-action-button"
            onClick={onFoldersReload}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="email-folders">
      <div className="email-folders-header">
        <h3>Папки</h3>
        <button 
          className="email-folders-add"
          onClick={handleCreateFolder}
          title="Создать папку"
        >
          ➕
        </button>
      </div>

      <div className="email-folders-list">
        {(folders || [])
          .sort((a, b) => {
            // Папка "Входящие" всегда первая
            if (a.type === 'inbox') return -1;
            if (b.type === 'inbox') return 1;
            // Остальные папки сортируем по sort_order
            return (a.sort_order || 999) - (b.sort_order || 999);
          })
          .map((folder) => (
          <div
            key={folder.id}
            className={`email-folder-item ${selectedFolder?.id === folder.id ? 'active' : ''}`}
            onClick={() => handleFolderClick(folder)}
          >
            <div className="email-folder-info">
              <span className="email-folder-icon">
                {getFolderIcon(folder.type)}
              </span>
              <span className="email-folder-name">
                {folder.name}
              </span>
              <span className="email-folder-count">
                {getBadgeCount(folder) > 0 && (
                  <span className="email-folder-unread-badge">
                    {getBadgeCount(folder)}
                  </span>
                )}
                <span className="email-folder-total-count">
                  ({getFolderCount(folder)})
                </span>
              </span>
            </div>
            
          </div>
        ))}
      </div>

      {folders.length === 0 && (
        <div className="email-empty-state">
          <h3>Нет папок</h3>
          <p>Создайте папку для организации писем</p>
          <button 
            className="email-action-button"
            onClick={handleCreateFolder}
          >
            Создать папку
          </button>
        </div>
      )}

      {/* Модальное окно создания папки */}
      {showCreateModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000
          }}
          onClick={handleCancelCreateFolder}
        >
          <div 
            style={{
              background: '#2a2a2a',
              borderRadius: '8px',
              padding: '20px',
              minWidth: '400px',
              maxWidth: '600px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              border: '1px solid #444'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '20px',
              color: '#fff',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Создание новой папки
            </h3>
            <p style={{ 
              marginBottom: '15px',
              color: '#ccc',
              fontSize: '14px'
            }}>
              Введите название новой папки:
            </p>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Название папки"
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '20px',
                border: '1px solid #555',
                borderRadius: '6px',
                boxSizing: 'border-box',
                background: '#333',
                color: '#fff',
                fontSize: '14px',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#4caf50';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#555';
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleConfirmCreateFolder();
                }
              }}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleCancelCreateFolder}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #555',
                  borderRadius: '6px',
                  background: '#333',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#444';
                  e.target.style.borderColor = '#666';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#333';
                  e.target.style.borderColor = '#555';
                }}
              >
                Отмена
              </button>
              <button 
                onClick={handleConfirmCreateFolder}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#4caf50',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#45a049';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#4caf50';
                }}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailFolders;
