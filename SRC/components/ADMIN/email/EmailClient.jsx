import React, { useEffect, useState, useCallback } from 'react';
import './EmailClient.css';
import EmailFolders from './email-folders/EmailFolders';
import EmailList from './email-list/EmailList';
import EmailViewer from './email-viewer/EmailViewer';
import EmailComposer from './email-composer/EmailComposer';
import EmailTemplates from './email-templates/EmailTemplates';
import EmailConversations from './email-conversations/EmailConversations';
import EmailModal from './email-modal/EmailModal';
import EmailQueueModal from './email-queue/EmailQueueModal';
import axiosAPI from '../../../JS/auth/http/axios';
import { connect, getSocket } from '../../../JS/websocket/websocket-service';
import { SuccessNotification, ErrorNotification } from '../../../JS/utils/notifications';

/*
 * Основной компонент почтового клиента для админ панели
 */
const EmailClient = () => {
  const [activeModule, setActiveModule] = useState('inbox'); // inbox, sent, drafts, templates, conversations
  const [selectedEmail, setSelectedEmail] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState(null);
  // const [unreadCount, setUnreadCount] = useState(0); // Убрано - не используется
  const [isComposing, setIsComposing] = useState(false);
    const [folders, setFolders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEmail, setModalEmail] = useState(null);
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [hasActiveQueues, setHasActiveQueues] = useState(false);

  // Функция проверки активных очередей
  const checkActiveQueues = useCallback(async () => {
    try {
      const { data } = await axiosAPI.get('/admin/email/broadcast/queues');
      const hasQueues = data && data.length > 0;
      setHasActiveQueues(hasQueues);
    } catch (error) {
      console.error('Ошибка проверки очередей:', error);
      setHasActiveQueues(false);
    }
  }, []);

  // Функция загрузки папок
    const loadFolders = useCallback(async () => {
        try {
      console.log('📁 EmailClient: Загружаем папки...');
      console.log('📁 EmailClient: axiosAPI.defaults.baseURL =', axiosAPI.defaults.baseURL);
      console.log('📁 EmailClient: Запрос к URL:', '/admin/email/folders');
      console.log('📁 EmailClient: Полный URL будет:', `${axiosAPI.defaults.baseURL || window.location.origin}/admin/email/folders`);
      const { data } = await axiosAPI.get('/admin/email/folders');
      console.log('📁 EmailClient: Получены данные папок:', data);
      
      if (data && Array.isArray(data)) {
        console.log('📁 EmailClient: Устанавливаем папки:', data);
        setFolders(data);
        
        // КРИТИЧНО: Обновляем selectedFolder с новыми данными из загруженных папок
        // Это нужно для обновления счетчиков непрочитанных
        setSelectedFolder(prevSelectedFolder => {
          if (prevSelectedFolder) {
            // Находим обновленную папку с теми же данными
            const updatedFolder = data.find(folder => folder.id === prevSelectedFolder.id);
            if (updatedFolder) {
              console.log('📁 EmailClient: Обновляем selectedFolder с новыми данными:', updatedFolder);
              return updatedFolder;
            }
          }
          
          // Если папка не выбрана, выбираем "Входящие"
          const inboxFolder = data.find(folder => folder.type === 'inbox');
          if (inboxFolder) {
            console.log('📁 EmailClient: Автоматически выбираем папку:', inboxFolder);
            return inboxFolder;
          }
          
          return prevSelectedFolder;
        });
            }
        } catch (error) {
            console.error('❌ EmailClient: Ошибка загрузки папок:', error);
            console.error('❌ EmailClient: URL запроса:', '/admin/email/folders');
            console.error('❌ EmailClient: BASE_URL:', axiosAPI.defaults.baseURL);
            console.error('❌ EmailClient: Полный URL:', `${axiosAPI.defaults.baseURL || ''}/admin/email/folders`);
            console.error('❌ EmailClient: Error details:', error.response?.data || error.message);
    }
  }, []); // Убираем зависимость selectedFolder

  // Загружаем папки только один раз при монтировании компонента
  useEffect(() => {
    console.log('📁 EmailClient: Компонент смонтирован, запускаем loadFolders и checkActiveQueues');
    loadFolders();
    checkActiveQueues();
  }, [loadFolders, checkActiveQueues]); // Добавляем loadFolders в зависимости

  // Загружаем количество непрочитанных писем из данных папок
  // useEffect(() => {
  //   if (folders.length > 0) {
  //     const inboxFolder = folders.find(folder => folder.type === 'inbox');
  //     if (inboxFolder) {
  //       console.log('📧 EmailClient: Устанавливаем количество непрочитанных:', inboxFolder.unread_count);
  //       setUnreadCount(inboxFolder.unread_count || 0);
  //     }
  //   }
  // }, [folders]); // Убрано - не используется

  // WebSocket обработчик для обновления счетчиков папок
  useEffect(() => {
    const setupWebSocket = async () => {
      await connect();
      const socket = getSocket();
      if (socket && socket.connected) {
        console.log('📧 EmailClient: WebSocket подключен для обновления счетчиков папок');
        
        // Обновление счетчиков папок
        socket.on('email:unread_counts_update', (data) => {
          console.log('📧 EmailClient: Получено обновление счетчиков:', data);
          
          // КРИТИЧНО: Обновляем папки локально на основе данных из WebSocket
          // Это обновит счетчики непрочитанных мгновенно без запроса к серверу
          if (data && data.unreadCounts) {
            setFolders(prevFolders => {
              const updatedFolders = prevFolders.map(folder => {
                const updatedCount = data.unreadCounts[folder.id];
                if (updatedCount !== undefined) {
                  return {
                    ...folder,
                    unreadCount: updatedCount.unreadCount,
                    unread_count: updatedCount.unreadCount,
                    // Обновляем также общее количество писем для правильного отображения бейджа
                    totalCount: updatedCount.totalCount !== undefined ? updatedCount.totalCount : folder.totalCount,
                    total_count: updatedCount.totalCount !== undefined ? updatedCount.totalCount : folder.total_count
                  };
                }
                return folder;
              });
              
              console.log('📧 EmailClient: Обновлены счетчики папок локально:', updatedFolders);
              
              // Обновляем selectedFolder с новыми данными
              setSelectedFolder(prevSelectedFolder => {
                if (prevSelectedFolder) {
                  const updatedFolder = updatedFolders.find(f => f.id === prevSelectedFolder.id);
                  if (updatedFolder) {
                    console.log('📧 EmailClient: Обновлен selectedFolder с новыми счетчиками:', updatedFolder);
                    return updatedFolder;
                  }
                }
                return prevSelectedFolder;
              });
              
              return updatedFolders;
            });
          } else {
            // Если данных нет, делаем полную перезагрузку
            loadFolders();
          }
        });

        // Обновление при изменении папок
        socket.on('email:folder_changed', (data) => {
          console.log('📧 EmailClient: Получено изменение папки:', data);
          // Обновляем папки для отображения новых счетчиков
          loadFolders();
        });

        // Обновление при новых письмах
        socket.on('email:new', (data) => {
          console.log('📧 EmailClient: Получено новое письмо, обновляем папки:', data);
          // Обновляем папки для отображения новых счетчиков
          loadFolders();
        });

        // Обновление при изменении статуса письма
        socket.on('email:updated', (data) => {
          console.log('📧 EmailClient: Получено обновление письма, обновляем папки:', data);
          // Обновляем папки для отображения новых счетчиков
          loadFolders();
        });
      }
    };

    setupWebSocket();

    return () => {
      const socket = getSocket();
      if (socket) {
        socket.off('email:unread_counts_update');
        socket.off('email:folder_changed');
        socket.off('email:new');
        socket.off('email:updated');
      }
    };
  }, [loadFolders]);

  const handleEmailSelect = (email) => {
    console.log('📧 EmailClient: Открываем письмо в модальном окне:', email);
    setModalEmail(email);
    setIsModalOpen(true);
    setIsComposing(false);
  };

  const handleFolderSelect = (folder) => {
    console.log('📁 EmailClient: Выбрана папка:', folder);
    console.log('📁 EmailClient: folderId для корзины:', folder?.id);
    setSelectedFolder(folder);
    setSelectedEmail(null);
    setIsComposing(false);
    
    // Синхронизируем activeModule с типом папки
    if (folder?.type) {
      setActiveModule(folder.type);
    }
  };

  const handleModuleChange = (module) => {
    console.log('📧 EmailClient: Переключение модуля на:', module);
    setActiveModule(module);
    setSelectedEmail(null);
    setModalEmail(null);
    setIsModalOpen(false);
    setIsComposing(false);
    
    // Если возвращаемся к папкам с письмами, выбираем папку "Входящие" по умолчанию
    if (module === 'inbox' && folders.length > 0) {
      const inboxFolder = folders.find(folder => folder.type === 'inbox');
      if (inboxFolder) {
        setSelectedFolder(inboxFolder);
        console.log('📧 EmailClient: Автоматически выбрана папка Входящие');
      }
    }
  };

  const handleComposeEmail = () => {
    setIsComposing(true);
        setSelectedEmail(null);
  };

  // const handleModuleChange = (module) => {
  //   setActiveModule(module);
  //   setSelectedEmail(null);
  //   setIsComposing(false);
    
  //   // Ищем папку соответствующего типа
  //   const folderForModule = folders.find(folder => folder.type === module);
  //   if (folderForModule) {
  //     setSelectedFolder(folderForModule);
  //   }
  // }; // Убрано - не используется

  const handleCloseComposer = () => {
    setIsComposing(false);
  };

  const handleReplyEmail = (email) => {
        setSelectedEmail(email);
    setIsComposing(true);
  };

  // const handleEmailStatusChange = (emailId, isRead) => {
  //   // Обновляем счетчик непрочитанных писем
  //   if (activeModule === 'inbox') {
  //     if (isRead) {
  //       setUnreadCount(prev => Math.max(0, prev - 1));
  //     } else {
  //       setUnreadCount(prev => prev + 1);
  //     }
  //   }
  // }; // Убрано - не используется

  const handleModalClose = () => {
    setIsModalOpen(false);
    setModalEmail(null);
  };

  const handleModalReply = (email) => {
    console.log('📧 EmailClient: Ответ на письмо:', email);
    handleModalClose();
    handleReplyEmail(email);
  };

  const handleModalForward = (email) => {
    console.log('📧 EmailClient: Пересылка письма:', email);
    handleModalClose();
    // TODO: Реализовать пересылку
  };

  const handleModalDelete = async (email) => {
    if (!email || !email.id) {
      console.error('📧 EmailClient: Не удалось удалить письмо - нет ID');
      return;
    }

    console.log('📧 EmailClient: Удаление письма:', email);

    try {
      const { data } = await axiosAPI.delete(`/admin/email/emails/${email.id}`);
      
      if (data.message || data.success) {
        // Показываем уведомление об успехе
        const root = document.querySelector('.root-content-notification-container');
        if (root) {
          SuccessNotification(root, 'Письмо успешно удалено');
        }

        // Закрываем модалку
        handleModalClose();
        
        // Сбрасываем выбранное письмо, если оно было удалено
        if (selectedEmail && selectedEmail.id === email.id) {
          setSelectedEmail(null);
        }
        
        // Сбрасываем письмо в модалке, если оно было удалено
        if (modalEmail && modalEmail.id === email.id) {
          setModalEmail(null);
        }

        // Обновляем папки для обновления счетчиков
        loadFolders();
        
        console.log('✅ Письмо успешно удалено');
      } else {
        throw new Error('Неожиданный формат ответа от сервера');
      }
    } catch (error) {
      console.error('❌ Ошибка удаления письма:', error);
      const errorMessage = 'Ошибка удаления письма: ' + (error.response?.data?.error || error.response?.data?.message || error.message);
      const root = document.querySelector('.root-content-notification-container');
      if (root) {
        ErrorNotification(root, errorMessage);
      }
    }
  };

  // const refreshUnreadCount = async () => {
  //   try {
  //     const { data } = await axiosAPI.get('/admin/email/folders/inbox/emails?unreadOnly=true');
  //     setUnreadCount(data?.totalCount || 0);
  //   } catch (error) {
  //     console.error('Ошибка обновления счетчика непрочитанных писем:', error);
  //   }
  // }; // Убрано - не используется

    return (
    <div className="email-container">
      {/* Навигация Email клиента */}
      <div className="email-nav">
                    <button 
          className={`email-nav-item ${!['conversations', 'templates'].includes(activeModule) ? 'active' : ''}`}
          onClick={() => handleModuleChange('inbox')}
        >
          📧 Почта
                    </button>
                    
                    <button 
          className={`email-nav-item ${activeModule === 'conversations' ? 'active' : ''}`}
          onClick={() => handleModuleChange('conversations')}
                        >
                            💬 Переписки
                        </button>
        
                        <button 
          className={`email-nav-item ${activeModule === 'templates' ? 'active' : ''}`}
          onClick={() => handleModuleChange('templates')}
                        >
                            📝 Шаблоны
                        </button>
        
        <div className="email-nav-spacer"></div>
        
        <button
          className={`email-nav-queue ${!hasActiveQueues ? 'disabled' : ''}`}
          onClick={() => hasActiveQueues && setIsQueueModalOpen(true)}
          disabled={!hasActiveQueues}
        >
          📊 Очередь
        </button>
        
        <button
          className="email-nav-compose"
          onClick={handleComposeEmail}
        >
          ✏️ Написать
                        </button>
                    </div>

      {/* Контент Email клиента */}
      <div className="email-content">
        {isComposing && (
          <EmailComposer 
            replyToEmail={selectedEmail}
            onClose={handleCloseComposer}
            onQueueCreated={checkActiveQueues}
          />
        )}
        
        {!isComposing && (
          <>
            {/* Панель папок и списка писем */}
            <div className="email-main-panel">
              {/* Панель папок - показываем только когда не в режиме переписок или шаблонов */}
              {!['conversations', 'templates'].includes(activeModule) && (
                <div className="email-sidebar">
                  <EmailFolders 
                    folders={folders}
                    onFolderSelect={handleFolderSelect}
                    selectedFolder={selectedFolder}
                    onFoldersReload={loadFolders}
                  />
                </div>
              )}

              {/* Панель списка писем */}
              <div className="email-list-panel">
                {!['conversations', 'templates'].includes(activeModule) && selectedFolder && (
                  <EmailList 
                    folderId={selectedFolder.id}
                    folderType={selectedFolder.type}
                    onEmailSelect={handleEmailSelect}
                    selectedEmail={selectedEmail}
                    onReply={handleReplyEmail}
                    selectedFolder={selectedFolder}
                    onFoldersReload={loadFolders}
                  />
                )}
                {activeModule === 'conversations' && (
                  <EmailConversations 
                    onEmailSelect={handleEmailSelect}
                    selectedEmail={selectedEmail}
                    onReply={handleReplyEmail}
                  />
                )}
                {activeModule === 'templates' && (
                  <EmailTemplates 
                    onTemplateSelect={handleEmailSelect}
                    selectedTemplate={selectedEmail}
                        />
                    )}
                </div>
            </div>

            {/* Модальное окно для просмотра письма */}
            <EmailModal
              email={modalEmail}
              isOpen={isModalOpen}
              onClose={handleModalClose}
              onReply={handleModalReply}
              onForward={handleModalForward}
              onDelete={handleModalDelete}
            />
          </>
        )}
      </div>
      
      {/* Модалка очереди отправки */}
      <EmailQueueModal
        isOpen={isQueueModalOpen}
        onClose={() => setIsQueueModalOpen(false)}
      />
        </div>
    );
};

export default EmailClient;
