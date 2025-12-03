import React, { useEffect, useState, useCallback } from 'react';
import './EmailList.css';
import axiosAPI from '../../../../JS/auth/http/axios';
import { connect, getSocket } from '../../../../JS/websocket/websocket-service';
import { ErrorNotification, SuccessNotification } from '../../../../JS/utils/notifications';

/**
 * Компонент списка писем
 */
const EmailList = ({ folderType, folderId, onEmailSelect, selectedEmail, onReply, selectedFolder, onFoldersReload }) => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUnread, setFilterUnread] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState(null);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [availableFolders, setAvailableFolders] = useState([]);
  
  // Определяем, является ли текущая папка папкой корзины
  const isTrashFolder = selectedFolder && (
    selectedFolder.type === 'trash' ||
    selectedFolder.name?.toLowerCase().includes('trash') ||
    selectedFolder.name?.toLowerCase().includes('deleted') ||
    selectedFolder.name?.toLowerCase().includes('корзина') ||
    selectedFolder.name?.toLowerCase().includes('удаленные')
  );

  // Убираем автообновление - используем только WebSocket для живых обновлений
  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     loadEmails();
  //   }, 20000);

  //   return () => clearInterval(intervalId);
  // }, [folderType, folderId, searchQuery, filterUnread, currentPage]);

  // WebSocket обработчики для живых обновлений
  useEffect(() => {
    const setupWebSocket = async () => {
      await connect();
      const socket = getSocket();
      console.log('📧 EmailList: WebSocket состояние:', socket?.connected ? 'подключен' : 'отключен');
      if (socket && socket.connected) {
        // Новое письмо
        socket.on('email:new', (data) => {
          console.log('📧 EmailList: Получено новое письмо:', data);
          console.log('📧 EmailList: Текущий folderId:', folderId, 'Полученный folder_id:', data.folder_id);
          if (data.folder_id === folderId || data.folderName === folderId) {
            console.log('📧 EmailList: Добавляем новое письмо в список');
            setEmails(prev => [data.email || data, ...prev]);
          }
        });

        // Обновление письма (статус прочтения)
        socket.on('email:updated', (data) => {
          console.log('📧 EmailList: Получено обновление письма:', data);
          setEmails(prev => prev.map(email => {
            const currentId = email.id;
            const dataId = data.id || data.email?.id;
            if (currentId === dataId) {
              console.log('📧 EmailList: Обновляем статус письма:', currentId, 'is_read:', data.is_read);
              return { 
                ...email, 
                is_read: data.is_read,
                is_important: data.is_important
              };
            }
            return email;
          }));
        });

        // Удаление письма
        socket.on('email:deleted', (data) => {
          console.log('📧 EmailList: Получено удаление письма:', data);
          setEmails(prev => prev.filter(email => {
            const currentId = email.id;
            const dataId = data.id || data.emailId;
            return currentId !== dataId;
          }));
        });

        // Изменения папок
        socket.on('email:folder_changed', (data) => {
          console.log('📧 EmailList: Получено изменение папки:', data);
          // Можно добавить логику для обновления счетчиков папок
        });

        // Удаление папки
        socket.on('email:folder_deleted', (data) => {
          console.log('📧 EmailList: Получено удаление папки:', data);
          // Если удалена текущая папка, переходим в папку "Входящие"
          if (data.folderId === folderId) {
            console.log('📧 EmailList: Удалена текущая папка, переходим в "Входящие"');
            // Очищаем список писем
            setEmails([]);
            // Можно добавить логику для перехода в папку "Входящие"
            // Это должно обрабатываться в родительском компоненте
          }
          // Обновляем список папок через родительский компонент
          if (onFoldersReload) {
            onFoldersReload();
          }
        });
      }
    };

    setupWebSocket();

    return () => {
      // Очистка обработчиков при размонтировании
      const socket = getSocket();
      if (socket) {
        socket.off('email:new');
        socket.off('email:updated');
        socket.off('email:deleted');
        socket.off('email:folder_changed');
        socket.off('email:folder_deleted');
      }
    };
  }, [folderId, onFoldersReload]);

  const loadEmails = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage,
        limit: 20
      });

      if (searchQuery) {
        params.append('search', searchQuery);
      }

      // Убираем фильтр по непрочитанным - загружаем все письма
      // if (filterUnread) {
      //   params.append('unread', 'true');
      // }

      let endpoint = '/admin/email/emails';
      console.log('📧 EmailList: Загружаем письма по folderId:', folderId, 'endpoint:', endpoint);
      
      if (folderId) {
        params.append('folderId', folderId);
      }

      console.log('📧 EmailList: Запрос к endpoint:', `${endpoint}?${params}`);
      const { data } = await axiosAPI.get(`${endpoint}?${params}`);
      
      console.log('📧 EmailList: Ответ от сервера:', data);
      
      if (data.emails) {
        const emailsData = data.emails || [];
        console.log('📧 EmailList: Данные писем:', emailsData, 'Тип:', typeof emailsData, 'Является массивом:', Array.isArray(emailsData));
        if (emailsData.length > 0) {
          console.log('📧 EmailList: Первое письмо:', emailsData[0]);
          console.log('📧 EmailList: Статус прочтения первого письма:', emailsData[0].is_read);
        }
        
        // Убеждаемся, что emailsData является массивом
        if (Array.isArray(emailsData)) {
          // Сортируем письма по дате (самые новые сверху)
          const sortedEmails = emailsData.sort((a, b) => {
            const dateA = new Date(a.received_date || 0);
            const dateB = new Date(b.received_date || 0);
            return dateB - dateA; // Новые сверху (убывающий порядок)
          });
          
          console.log('📧 EmailList: Отсортировано писем по дате:', sortedEmails.length);
          setEmails(sortedEmails);
        } else {
          console.warn('📧 EmailList: data.emails не является массивом, устанавливаем пустой массив');
          setEmails([]);
        }
        
        setTotalPages(data.pages || 1);
      }
    } catch (error) {
      console.error('Ошибка загрузки писем:', error);
      setError('Ошибка загрузки писем');
    } finally {
      setLoading(false);
    }
  }, [folderType, folderId, currentPage, searchQuery]);

  // Функция загрузки доступных папок для перемещения
  const loadAvailableFolders = useCallback(async () => {
    try {
      const { data } = await axiosAPI.get('/admin/email/folders');
      if (data && Array.isArray(data)) {
        // Исключаем текущую папку из списка доступных для перемещения
        const filteredFolders = data.filter(folder => folder.id !== folderId);
        setAvailableFolders(filteredFolders);
      }
    } catch (error) {
      console.error('Ошибка загрузки папок:', error);
    }
  }, [folderId]);

  // Загружаем письма при изменении параметров
  useEffect(() => {
    loadEmails();
    loadAvailableFolders();
  }, [loadEmails, loadAvailableFolders]);

  // Обработчики поиска с useCallback для предотвращения перемонтирования
  const handleSearchChange = useCallback((e) => {
    setSearchQuery(e.target.value);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Функции для работы с выбором писем
  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedEmails(new Set());
      setSelectAll(false);
      setShowActionMenu(false);
    } else {
      const allEmailIds = new Set(emails.map(email => email.id));
      setSelectedEmails(allEmailIds);
      setSelectAll(true);
      setShowActionMenu(true);
    }
  }, [selectAll, emails]);

  const handleSelectEmail = useCallback((emailId) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailId)) {
      newSelected.delete(emailId);
    } else {
      newSelected.add(emailId);
    }
    setSelectedEmails(newSelected);
    setSelectAll(newSelected.size === emails.length);
    setShowActionMenu(newSelected.size > 0);
  }, [selectedEmails, emails.length]);

  const handleBulkAction = useCallback(async (action) => {
    try {
      const emailIds = Array.from(selectedEmails);
      
      if (action === 'delete') {
        // Умная логика: выбираем только письма, которые еще не удалены
        // (не находятся в папках Trash, Deleted Messages и т.д.)
        const deletableEmails = emails.filter(email => 
          selectedEmails.has(email.id) && 
          !email.folder_name?.toLowerCase().includes('trash') &&
          !email.folder_name?.toLowerCase().includes('deleted') &&
          !email.folder_name?.toLowerCase().includes('корзина')
        );
        
        if (deletableEmails.length === 0) {
          console.log('🗑️ Все выбранные письма уже удалены или находятся в корзине');
          // Очищаем выбор и скрываем меню
          setSelectedEmails(new Set());
          setSelectAll(false);
          setShowActionMenu(false);
          return;
        }
        
        const deletableEmailIds = deletableEmails.map(email => email.id);
        console.log('🗑️ Удаляем письма:', deletableEmailIds);
        
        // Отправляем запрос на удаление
        const { data } = await axiosAPI.post('/admin/email/bulk-operations', {
          action: 'delete',
          emailIds: deletableEmailIds
        });
        
        if (data.success) {
          console.log('✅ Письма успешно удалены');
          // Обновляем список писем
          loadEmails();
          // Очищаем выбор
          setSelectedEmails(new Set());
          setSelectAll(false);
          setShowActionMenu(false);
        }
        
      } else if (action === 'mark_read') {
        // Умная логика: выбираем только непрочитанные письма
        const unreadEmails = emails.filter(email => 
          selectedEmails.has(email.id) && email.is_read !== true
        );
        
        if (unreadEmails.length === 0) {
          console.log('📖 Все выбранные письма уже прочитаны');
          // Очищаем выбор и скрываем меню
          setSelectedEmails(new Set());
          setSelectAll(false);
          setShowActionMenu(false);
          return;
        }
        
        const unreadEmailIds = unreadEmails.map(email => email.id);
        console.log('📖 Помечаем как прочитанные только непрочитанные письма:', unreadEmailIds);
        
        // Отправляем запрос на пометку как прочитанные
        const { data } = await axiosAPI.post('/admin/email/bulk-operations', {
          action: 'mark_read',
          emailIds: unreadEmailIds
        });
        
        if (data.success) {
          console.log('✅ Письма помечены как прочитанные');
          // Обновляем список писем
          loadEmails();
          // Очищаем выбор
          setSelectedEmails(new Set());
          setSelectAll(false);
          setShowActionMenu(false);
        }
      }
      
    } catch (error) {
      console.error('❌ Ошибка выполнения массовой операции:', error);
    }
  }, [selectedEmails, emails, loadEmails]);

  const handleMoveToFolder = useCallback(async (targetFolderId) => {
    try {
      const emailIds = Array.from(selectedEmails);
      
      // Получаем информацию о целевой папке
      const targetFolder = availableFolders.find(folder => folder.id === targetFolderId);
      if (!targetFolder) {
        console.error('❌ Целевая папка не найдена');
        return;
      }
      
      // Умная логика: выбираем только письма, которые не находятся в целевой папке
      const moveableEmails = emails.filter(email => 
        selectedEmails.has(email.id) && 
        email.folder_id !== targetFolderId
      );
      
      if (moveableEmails.length === 0) {
        console.log(`📁 Все выбранные письма уже находятся в папке "${targetFolder.name}"`);
        // Очищаем выбор и скрываем меню
        setSelectedEmails(new Set());
        setSelectAll(false);
        setShowActionMenu(false);
        setShowFolderMenu(false);
        return;
      }
      
      const moveableEmailIds = moveableEmails.map(email => email.id);
      console.log(`📁 Перемещаем письма в папку "${targetFolder.name}":`, moveableEmailIds);
      
      // Отправляем запрос на перемещение
      const { data } = await axiosAPI.post('/admin/email/move-to-folder', {
        emailIds: moveableEmailIds,
        targetFolderId: targetFolderId
      });
      
      if (data.success) {
        // Обновляем список писем
        loadEmails();
        // Очищаем выбор
        setSelectedEmails(new Set());
        setSelectAll(false);
        setShowActionMenu(false);
        setShowFolderMenu(false);
        
        console.log('✅ Письма успешно перемещены');
      }
    } catch (error) {
      console.error('❌ Ошибка перемещения писем:', error);
    }
  }, [selectedEmails, emails, availableFolders, loadEmails]);

  const handleEmailClick = (email) => {
    onEmailSelect(email);
    
    // Помечаем письмо как прочитанное только если оно действительно непрочитанное
    const emailId = email.id;
    const isRead = email.is_read === true; // Явно проверяем true
    
    console.log('📧 handleEmailClick: emailId=', emailId, 'is_read=', email.is_read, 'isRead=', isRead);
    
    if (emailId && !isRead) {
      markAsRead(emailId);
    }
  };

  const markAsRead = async (emailId) => {
    try {
      console.log('📧 Помечаем письмо как прочитанное, ID:', emailId);
      await axiosAPI.put(`/admin/email/emails/${emailId}/status`, { isRead: true });
      // Обновляем локальное состояние
      setEmails(emails.map(email => {
        const currentId = email.id;
        return currentId === emailId ? { ...email, is_read: true } : email;
      }));
    } catch (error) {
      console.error('Ошибка пометки письма как прочитанного:', error);
    }
  };

  const handleDeleteEmail = (emailId, e) => {
    e.stopPropagation();
    setEmailToDelete(emailId);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!emailToDelete) return;

    try {
      const { data } = await axiosAPI.delete(`/admin/email/emails/${emailToDelete}`);
      
      if (data.message) {
        setEmails(emails.filter(email => {
          const currentId = email.id;
          return currentId !== emailToDelete;
        }));
        const selectedId = selectedEmail?.id;
        if (selectedEmail && selectedId === emailToDelete) {
          onEmailSelect(null);
        }
      }
    } catch (error) {
      console.error('Ошибка удаления письма:', error);
      const errorMessage = 'Ошибка удаления письма: ' + (error.response?.data?.message || error.message);
      const root = document.querySelector('.root-content-notification-container');
      if (root) {
        ErrorNotification(root, errorMessage);
      }
    } finally {
      setShowDeleteModal(false);
      setEmailToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setEmailToDelete(null);
  };

  // Функция удаления папки
  const handleDeleteFolder = (folder) => {
    if (!folder) return;
    
    // Нельзя удалять системные папки
    if (folder.type === 'inbox' || folder.type === 'sent' || folder.type === 'drafts' || folder.type === 'trash') {
      const root = document.querySelector('.root-content-notification-container');
      if (root) {
        ErrorNotification(root, 'Нельзя удалять системные папки');
      }
      return;
    }
    
    setFolderToDelete(folder);
    setShowDeleteFolderModal(true);
  };

  // Функция подтверждения удаления папки
  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    
    try {
      console.log('🗑️ Удаляем папку:', folderToDelete);
      
      const { data } = await axiosAPI.delete(`/admin/email/folders/${folderToDelete.id}`);
      
      if (data.success) {
        console.log('✅ Папка успешно удалена');
        
        // Показываем уведомление об успехе
        const root = document.querySelector('.root-content-notification-container');
        if (root) {
          SuccessNotification(root, `Папка "${folderToDelete.name}" удалена`);
        }
        
        // Перезагружаем папки через родительский компонент
        // Убираем window.location.reload() чтобы не сбрасывать аутентификацию
        // if (window.location.reload) {
        //   window.location.reload();
        // }
      } else {
        throw new Error(data.error || 'Ошибка удаления папки');
      }
    } catch (error) {
      console.error('❌ Ошибка удаления папки:', error);
      
      // Показываем уведомление об ошибке
      const root = document.querySelector('.root-content-notification-container');
      if (root) {
        ErrorNotification(root, 'Ошибка удаления папки: ' + error.message);
      }
    } finally {
      setShowDeleteFolderModal(false);
      setFolderToDelete(null);
    }
  };

  // Функция отмены удаления папки
  const handleCancelDeleteFolder = () => {
    setShowDeleteFolderModal(false);
    setFolderToDelete(null);
  };

  const handleToggleImportant = async (emailId, e) => {
    e.stopPropagation();
    
    try {
      // Находим письмо по ID
      const email = emails.find(e => e.id === emailId);
      if (!email) {
        console.error('Письмо не найдено:', emailId);
        return;
      }
      
      const { data } = await axiosAPI.put(`/admin/email/emails/${emailId}/status`, { 
        isFlagged: !email.is_important 
      });
      
      if (data.email) {
        setEmails(emails.map(email => 
          email.id === emailId ? { ...email, is_important: !email.is_important } : email
        ));
        
        // Показываем уведомление об успешном изменении
        const root = document.querySelector('.root-content-notification-container');
        if (root) {
          SuccessNotification(root, email.is_important ? 'Письмо убрано из важных' : 'Письмо помечено как важное');
        }
      }
    } catch (error) {
      console.error('Ошибка изменения важности письма:', error);
    }
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return '';
      
      // Парсим дату из различных форматов
      let date;
      if (dateString instanceof Date) {
        date = dateString;
      } else if (typeof dateString === 'string') {
        date = new Date(dateString);
      } else {
        return '';
      }
      
      if (isNaN(date.getTime())) return '';
      
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        return 'Вчера';
      } else if (diffDays < 7) {
        return `${diffDays} дн. назад`;
      } else {
        return date.toLocaleDateString('ru-RU', {
          day: '2-digit',
          month: '2-digit',
          year: '2-digit'
        });
      }
    } catch (error) {
      console.error('Ошибка форматирования даты:', error, dateString);
      return '';
    }
  };

  const formatTime = (dateString) => {
    try {
      if (!dateString) return '';
      
      // Парсим дату из различных форматов
      let date;
      if (dateString instanceof Date) {
        date = dateString;
      } else if (typeof dateString === 'string') {
        date = new Date(dateString);
      } else {
        return '';
      }
      
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Ошибка форматирования времени:', error, dateString);
      return '';
    }
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    
    // Убираем HTML теги если это HTML содержимое
    let cleanText = text;
    if (text.includes('<') && text.includes('>')) {
      cleanText = text.replace(/<[^>]*>/g, '');
    }
    
    return cleanText.length > maxLength ? cleanText.substring(0, maxLength) + '...' : cleanText;
  };


  // Функция getSenderName больше не нужна - используем прямые поля

  if (loading) {
    return (
      <div className="email-list">
        <div className="email-loading">
          Загрузка писем...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="email-list">
        <div className="email-empty-state">
          <p>{error}</p>
          <button 
            className="email-action-button"
            onClick={loadEmails}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="email-list">
      {/* Заголовок и поиск */}
      <div className="email-list-header">
        <div className="email-list-header-left">
          <div className="email-list-checkbox-container">
            <input
              type="checkbox"
              checked={selectAll}
              onChange={handleSelectAll}
              className="email-list-checkbox"
            />
          </div>
          
          <div className="email-list-title">
            <h3>
              {selectedFolder ? selectedFolder.name : (
                <>
                  {folderType === 'inbox' && 'Входящие'}
                  {folderType === 'sent' && 'Исходящие'}
                  {folderType === 'drafts' && 'Черновики'}
                </>
              )}
            </h3>
            
            {/* Иконка удаления папки */}
            {selectedFolder && selectedFolder.type !== 'inbox' && selectedFolder.type !== 'sent' && selectedFolder.type !== 'drafts' && selectedFolder.type !== 'trash' && (
              <button
                className="email-folder-delete-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFolder(selectedFolder);
                }}
                title={`Удалить папку "${selectedFolder.name}"`}
              >
                🗑️
              </button>
            )}
          </div>
          
          {/* Выпадающее меню действий - перемещено к чекбоксу */}
          {showActionMenu && (
            <div className={`email-action-menu ${isTrashFolder ? 'trash-folder' : ''}`}>
              {/* Кнопка УДАЛИТЬ - скрываем для папок корзины */}
              {!isTrashFolder && (
                <button
                  className="email-action-button"
                  onClick={() => handleBulkAction('delete')}
                >
                  УДАЛИТЬ
                </button>
              )}
              <button
                className="email-action-button"
                onClick={() => handleBulkAction('mark_read')}
              >
                ПРОЧИТАТЬ
              </button>
              <div className="email-action-dropdown">
                <button
                  className="email-action-button"
                  onClick={() => setShowFolderMenu(!showFolderMenu)}
                >
                  В ПАПКУ ▼
                </button>
                {showFolderMenu && (
                  <div className="email-folder-dropdown">
                    {availableFolders.map(folder => (
                      <button
                        key={folder.id}
                        className="email-folder-option"
                        onClick={() => handleMoveToFolder(folder.id)}
                      >
                        {folder.name}
                      </button>
                    ))}
                    {availableFolders.length === 0 && (
                      <div className="email-folder-option disabled">
                        Нет доступных папок
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="email-list-header-right">
          <div className="email-list-controls">
            {folderType === 'inbox' && (
              <button
                className={`email-filter-button ${filterUnread ? 'active' : ''}`}
                onClick={() => setFilterUnread(!filterUnread)}
              >
                Только непрочитанные
              </button>
            )}
            
            <div className="email-search">
              <input
                type="text"
                placeholder="Поиск писем..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="email-search-input"
              />
              {searchQuery ? (
                <button
                  className="email-search-clear"
                  onClick={handleClearSearch}
                  title="Очистить поиск"
                >
                  ✕
                </button>
              ) : (
                <span className="email-search-icon">🔍</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Список писем */}
      <div className="email-list-content">
        {!Array.isArray(emails) || emails.length === 0 ? (
          <div className="email-empty-state">
            <h3>Нет писем</h3>
            <p>В этой папке пока нет писем</p>
          </div>
        ) : (
          emails.map((email, index) => (
            <div
              key={email.id || `email-${index}`}
              className={`email-item ${selectedEmail?.id === email.id ? 'selected' : ''} ${email.is_read !== true ? 'unread' : ''} ${email.is_important ? 'important' : ''} ${email.imap_flags?.includes('\\Deleted') ? 'deleted' : ''}`}
              onClick={() => handleEmailClick(email)}
            >
              <div 
                className="email-item-checkbox"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleSelectEmail(email.id);
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedEmails.has(email.id)}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleSelectEmail(email.id);
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                />
              </div>
              
              <div 
                className="email-item-content"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEmailClick(email);
                }}
              >
                <div className="email-item-header">
                  <div className="email-item-sender">
                    <span className="email-item-name">
                      {email.from_name || email.from_email || 'Отправитель'}
                    </span>
                    {email.is_important && (
                      <span className="email-item-important" title="Важное письмо">
                        ⭐
                      </span>
                    )}
                  </div>
                  
                  <div className="email-item-meta">
                    <span className="email-item-date">
                      {formatDate(email.received_date)}
                    </span>
                    <span className="email-item-time">
                      {formatTime(email.received_date)}
                    </span>
                  </div>
                </div>
                
                <div className="email-item-subject">
                  {email.subject || '(Без темы)'}
                </div>
                
                <div className="email-item-preview">
                  {truncateText(email.body_html || email.body_text || '')}
                </div>
              </div>
              
              <div className="email-item-actions">
                <button
                  className={`email-item-action ${email.is_important ? 'important' : ''}`}
                  onClick={(e) => handleToggleImportant(email.id, e)}
                  title={email.is_important ? 'Убрать из важных' : 'Пометить как важное'}
                >
                  ⭐
                </button>
                
                {onReply && folderType !== 'drafts' && (
                  <button
                    className="email-item-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReply(email);
                    }}
                    title="Ответить"
                  >
                    ↩️
                  </button>
                )}
                
                <button
                  className="email-item-action danger"
                  onClick={(e) => handleDeleteEmail(email.id, e)}
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="email-list-pagination">
          <button
            className="email-pagination-button"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Предыдущая
          </button>
          
          <span className="email-pagination-info">
            Страница {currentPage} из {totalPages}
          </span>
          
          <button
            className="email-pagination-button"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Следующая →
          </button>
        </div>
      )}

      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && (
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
          onClick={handleCancelDelete}
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
              color: '#ff5757',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Подтверждение удаления
            </h3>
            <p style={{ 
              marginBottom: '20px',
              color: '#ccc',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              Вы уверены, что хотите удалить это письмо? Это действие нельзя отменить.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleCancelDelete}
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
                onClick={handleConfirmDelete}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#ff5757',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#ff4444';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ff5757';
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно удаления папки */}
      {showDeleteFolderModal && (
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
          onClick={handleCancelDeleteFolder}
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
              color: '#ff5757',
              fontSize: '18px',
              fontWeight: '600'
            }}>
              Подтверждение удаления папки
            </h3>
            <p style={{ 
              marginBottom: '20px',
              color: '#ccc',
              fontSize: '14px',
              lineHeight: '1.5'
            }}>
              Вы уверены, что хотите удалить папку <strong style={{color: '#fff'}}>"{folderToDelete?.name}"</strong>? 
              Все письма в этой папке будут удалены. Это действие нельзя отменить.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleCancelDeleteFolder}
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
                onClick={handleConfirmDeleteFolder}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  background: '#ff5757',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#ff4444';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#ff5757';
                }}
              >
                Удалить папку
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailList;
