import React, { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import axiosAPI from '../../../../JS/auth/http/axios';
import { useSupport } from '../../../../hooks/useSupport.js';
import websocketService from '../../../../JS/websocket/websocket-service.js';
import { API_CONFIG, getAvatarUrl } from '../../../../config/api.js';
import telegramIcon from '../../../../IMG/telegram.png';
import itcIcon from '../../../../IMG/mainLogo.png';
import EmojiPicker from './EmojiPicker.jsx';
import './client-communication.css';

// Функция для получения иконки канала
const getChannelIcon = (channel) => {
  switch (channel) {
    case 'email':
      return '📧';
    case 'telegram':
      return <img src={telegramIcon} alt="Telegram" className="comm-channel-icon" />;
    case 'itc':
      return <img src={itcIcon} alt="ITC" className="comm-channel-icon" />;
    default:
      return '📧';
  }
};

// Функция для получения названия канала
const getChannelName = (channel) => {
  switch (channel) {
    case 'email':
      return 'Email';
    case 'telegram':
      return 'Telegram';
    case 'itc':
      return 'ITC';
    default:
      return 'Email';
  }
};

/**
 * Компонент общения с клиентами (чат-интерфейс)
 */
const ClientCommunication = () => {
  const { 
    conversations, 
    loadMessages, 
    markMessagesAsRead,
    totalUnreadCount,
    loading: supportLoading
  } = useSupport();
  
  const [users, setUsers] = useState([]); // Список пользователей
  const [selectedUser, setSelectedUser] = useState(null); // Выбранный пользователь
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatAttachedFiles, setChatAttachedFiles] = useState([]);
  
  // Фильтры
  const [filterStatus, setFilterStatus] = useState('all'); // all, open, in_progress, resolved, closed
  const [filterPriority, setFilterPriority] = useState('all'); // all, urgent, high, normal, low
  const [searchQuery, setSearchQuery] = useState('');

  // Модальное окно "Написать клиенту"
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [availableClients, setAvailableClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [messageSubject, setMessageSubject] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedClientTelegramId, setSelectedClientTelegramId] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null); // 'email', 'telegram', 'itc' или null
  const [channelLocked, setChannelLocked] = useState(false); // Блокировка изменения канала после отправки
  const [showChannelTooltip, setShowChannelTooltip] = useState(false); // Показ тултипа о необходимости выбора канала
  const [channelWarningAnimation, setChannelWarningAnimation] = useState(false); // Анимация предупреждения
  
  // Роль администратора и модалка удаления
  const [adminRole, setAdminRole] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  // Refs для интервалов
  const pollingIntervalRef = useRef(null);
  const selectedConversationRef = useRef(null);
  const messagesContainerRef = useRef(null);
  
  // Отслеживаем изменения общего счетчика
  useEffect(() => {
    console.log(`🔍 ClientCommunication: Общий счетчик непрочитанных: ${totalUnreadCount}`);
  }, [totalUnreadCount]);
  
  // Обновляем ref при изменении selectedConversation
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);
  
  // Загружаем роль администратора
  useEffect(() => {
    try {
      const adminDataRaw = sessionStorage.getItem('adminData');
      if (adminDataRaw) {
        const adminData = JSON.parse(adminDataRaw);
        setAdminRole(adminData?.role || null);
      } else {
        setAdminRole(null);
      }
    } catch (err) {
      console.error('ClientCommunication: Ошибка чтения adminData', err);
      setAdminRole(null);
    }
  }, []);

  // Загрузка списка бесед (теперь используем SupportContext)
  const loadConversations = useCallback((silent = false) => {
    console.log('🔍 ClientCommunication: loadConversations вызван, silent:', silent);
    console.log('🔍 ClientCommunication: conversations из SupportContext:', conversations);
    console.log('🔍 ClientCommunication: supportLoading:', supportLoading);
    
    // Синхронизируем состояние загрузки с SupportContext
    if (!silent) {
      setLoading(supportLoading);
    }
    
    // Если данные еще загружаются, не обрабатываем
    if (supportLoading && !silent) {
      console.log('⏳ ClientCommunication: Данные еще загружаются, ждем...');
      return;
    }
    
    // Группируем беседы из SupportContext по пользователям
    const usersMap = new Map();
    if (!conversations || conversations.length === 0) {
      console.log('⚠️ ClientCommunication: Нет бесед для отображения');
      setUsers([]);
      if (!silent) setLoading(false);
      return;
    }
    
    conversations.forEach(conv => {
      const userId = conv.user_id;
      
      // Подробное логирование для отладки
      if (!conv.User) {
        console.warn('⚠️ ClientCommunication: Беседа без данных пользователя:', {
          conversationId: conv.id,
          userId: conv.user_id,
          conv: conv
        });
      }
      
      // Получаем email из User_Auth
      const userEmail = conv.User?.User_Auth?.email || (conv.User?.User_Auth ? null : `User ${userId}`);
      
      // Используем surname и firstname из модели User
      // Игнорируем значения по умолчанию из модели
      const surname = conv.User?.surname;
      const firstname = conv.User?.firstname;
      
      // Значения по умолчанию из модели User
      const defaultSurname = 'Вы не назвали вышу фамилию?';
      const defaultFirstname = 'Как вас зовут?';
      
      const hasValidSurname = surname && 
        surname !== defaultSurname && 
        surname.trim() !== '';
      const hasValidFirstname = firstname && 
        firstname !== defaultFirstname && 
        firstname.trim() !== '';
      
      // Формируем имя: если есть валидные surname или firstname - используем их, иначе email
      let userName;
      if (hasValidSurname || hasValidFirstname) {
        userName = `${hasValidSurname ? surname : ''} ${hasValidFirstname ? firstname : ''}`.trim();
      } else {
        // Если нет валидных имени/фамилии, используем email
        userName = userEmail || `User ${userId}`;
      }
      
      // Логирование для отладки
      console.log('🔍 ClientCommunication: Обработка беседы:', {
        conversationId: conv.id,
        userId,
        hasUser: !!conv.User,
        hasUserAuth: !!conv.User?.User_Auth,
        userEmail,
        surname,
        firstname,
        hasValidSurname,
        hasValidFirstname,
        userName,
        userData: conv.User
      });
      
      const userAvatar = conv.User?.avatar || 'noAvatar';
      
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          id: userId,
          email: userEmail,
          name: userName,
          avatar: userAvatar,
          conversations: [],
          totalUnread: 0,
          hasUrgent: false
        });
      }
      
      const user = usersMap.get(userId);
      user.conversations.push(conv);
      user.totalUnread += conv.unread_count_admin || 0;
      
      if (conv.priority === 'urgent' || conv.priority === 'high') {
        user.hasUrgent = true;
      }
    });
    
    const usersList = Array.from(usersMap.values());
    console.log('✅ ClientCommunication: Сформирован список пользователей:', usersList.length, usersList);
    setUsers(usersList);
    if (!silent) setLoading(false);
  }, [conversations, supportLoading]);

  // Функция для отметки сообщений как прочитанных (теперь используем SupportContext)
  const markMessagesAsReadLocal = useCallback(async (conversationId) => {
    console.log(`📖 [MARK READ] Начало отметки сообщений как прочитанных для беседы ${conversationId}`);
    
    await markMessagesAsRead(conversationId);
    console.log('✅ [MARK READ] Сообщения отмечены как прочитанные для беседы:', conversationId);
    
    // КРИТИЧНО: Обновляем selectedConversation сразу, чтобы бейдж исчез
    setSelectedConversation(prev => {
      if (prev && prev.id === conversationId) {
        const updated = {
          ...prev,
          unread_count_admin: 0
        };
        console.log(`✅ [MARK READ] Обновлена selectedConversation для беседы ${conversationId}, unread_count_admin: ${prev.unread_count_admin} -> 0`);
        return updated;
      }
      return prev;
    });
    
    // КРИТИЧНО: НЕМЕДЛЕННО обновляем список пользователей, чтобы бейдж исчез
    setUsers(prev => {
      // Проверяем, что prev является массивом
      if (!Array.isArray(prev)) {
        console.warn('⚠️ ClientCommunication: prev в setUsers не является массивом:', prev);
        return [];
      }
      
      let hasChanges = false;
      const updated = prev.map(user => {
        // Проверяем, что user.conversations является массивом
        if (!Array.isArray(user.conversations)) {
          console.warn('⚠️ ClientCommunication: user.conversations не является массивом:', user);
          return user;
        }
        
        const updatedConversations = user.conversations.map(conv => {
          if (conv.id === conversationId) {
            const oldUnread = conv.unread_count_admin || 0;
            if (oldUnread > 0) {
              hasChanges = true;
              console.log(`✅ [MARK READ] Обновление беседы ${conversationId} у пользователя ${user.id}, unread_count_admin: ${oldUnread} -> 0`);
            }
            return { ...conv, unread_count_admin: 0 };
          }
          return conv;
        });
        
        // Пересчитываем totalUnread для пользователя
        const newTotalUnread = updatedConversations.reduce((sum, conv) => sum + (conv.unread_count_admin || 0), 0);
        
        return {
          ...user,
          conversations: updatedConversations,
          totalUnread: newTotalUnread
        };
      });
      
      if (hasChanges) {
        console.log('✅ [MARK READ] Список пользователей обновлен, бейдж должен исчезнуть');
        
        // КРИТИЧНО: Обновляем selectedUser, если он выбран, чтобы бейдж исчез немедленно
        // Используем flushSync для немедленного обновления DOM
        flushSync(() => {
          setSelectedUser(prevSelectedUser => {
            if (prevSelectedUser) {
              const updatedUser = updated.find(u => u.id === prevSelectedUser.id);
              if (updatedUser) {
                console.log(`✅ [MARK READ] Обновлен selectedUser для немедленного обновления бейджа`);
                return updatedUser;
              }
            }
            return prevSelectedUser;
          });
        });
      }
      
      return updated;
    });
    
    // КРИТИЧНО: НЕ вызываем loadConversations сразу, чтобы не перезаписать локальные изменения
    // WebSocket событие обновит состояние автоматически
    // Если WebSocket не сработает в течение 500ms, обновим через loadConversations
    const updateTimeout = setTimeout(() => {
      setUsers(prev => {
        if (!Array.isArray(prev)) return prev;
        
        // Проверяем, обновилась ли беседа через WebSocket
        const stillHasUnread = prev.some(user => 
          Array.isArray(user.conversations) && 
          user.conversations.some(conv => 
            conv.id === conversationId && conv.unread_count_admin > 0
          )
        );
        
        if (stillHasUnread) {
          console.log(`⚠️ [MARK READ] Беседа ${conversationId} все еще имеет unread_count_admin > 0 после 500ms, обновляем через loadConversations`);
          loadConversations(true); // silent mode
        } else {
          console.log(`✅ [MARK READ] Беседа ${conversationId} обновлена через WebSocket, loadConversations не требуется`);
        }
        
        return prev;
      });
    }, 500); // Даем 500ms WebSocket событию (уменьшено с 1000ms для более быстрого обновления)
    
    // Сохраняем timeout для возможной очистки
    return () => clearTimeout(updateTimeout);
  }, [markMessagesAsRead, loadConversations]);

  // Загрузка сообщений беседы (теперь используем SupportContext)
  const loadMessagesLocal = useCallback(async (conversationId, markAsRead = false) => {
    const messagesData = await loadMessages(conversationId);
    setMessages(messagesData || []);
    
    // Отмечаем сообщения как прочитанные только если явно указано
    // (чтобы избежать двойной отметки при выборе беседы)
    if (markAsRead) {
      await markMessagesAsReadLocal(conversationId);
    }
  }, [loadMessages, markMessagesAsReadLocal]);

  // Автоматическая прокрутка к последнему сообщению
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Обновление списка пользователей при изменении бесед из SupportContext
  useEffect(() => {
    console.log('🔄 ClientCommunication: conversations изменились, обновляем список пользователей');
    loadConversations();
  }, [conversations, loadConversations]);
  
  // Отдельный эффект для обновления selectedConversation при изменении списка бесед
  useEffect(() => {
    if (selectedConversation) {
      const updatedConv = conversations.find(c => c.id === selectedConversation.id);
      if (updatedConv) {
        // Обновляем только если данные действительно изменились
        if (updatedConv.unread_count_admin !== selectedConversation.unread_count_admin ||
            updatedConv.last_message_at !== selectedConversation.last_message_at) {
          setSelectedConversation(updatedConv);
          console.log('🔄 ClientCommunication: Обновлена selectedConversation из списка бесед');
        }
      }
    }
  }, [conversations, selectedConversation]);

  // Инициализация и автообновление
  useEffect(() => {
    // Автообновление каждые 30 секунд
    pollingIntervalRef.current = setInterval(() => {
      loadConversations(true); // silent mode
      
      // Если открыта беседа - обновляем сообщения
      if (selectedConversationRef.current) {
        loadMessagesLocal(selectedConversationRef.current.id);
      }
    }, 30000);

    // WebSocket слушатель для новых обращений
    const handleNewConversation = () => {
      console.log('CRM: Получено уведомление о новом обращении');
      loadConversations(true);
    };

    document.addEventListener('crm-new-conversation', handleNewConversation);

    // WebSocket слушатель для новых сообщений
    const handleNewMessage = (data) => {
      console.log('🔔 CRM: Получено WebSocket уведомление о новом сообщении:', data);
      
      // Если открыта беседа, в которой пришло сообщение - обновляем сообщения
      if (selectedConversationRef.current && selectedConversationRef.current.id === data.conversationId) {
        console.log('🔄 Обновляем сообщения для открытой беседы:', data.conversationId);
        loadMessagesLocal(data.conversationId);
      }
      
      // Обновляем список бесед для обновления счетчиков непрочитанных
      loadConversations(true);
    };

    // Обработчик удаления беседы
    const handleConversationDeleted = (data) => {
      console.log('🗑️ CRM: Получено WebSocket уведомление об удалении беседы:', data);
      const { conversationId } = data;
      
      // Удаляем беседу из списка сразу
      setUsers(prev => {
        // Проверяем, что prev является массивом
        if (!Array.isArray(prev)) {
          console.warn('⚠️ ClientCommunication: prev в handleConversationDeleted не является массивом:', prev);
          return [];
        }
        
        return prev.map(user => {
          // Проверяем, что user.conversations является массивом
          if (!Array.isArray(user.conversations)) {
            return user;
          }
          
          return {
            ...user,
            conversations: user.conversations.filter(conv => conv.id !== conversationId)
          };
        });
      });
      
      // Если удаленная беседа была открыта - закрываем её
      if (selectedConversationRef.current && selectedConversationRef.current.id === conversationId) {
        setSelectedConversation(null);
        setSelectedUser(null);
      }
      
      // Обновляем список бесед
      loadConversations(true);
    };

    // КРИТИЧНО: Обработчик обновления беседы (для обновления бейджей после прочтения)
    const handleConversationUpdated = (data) => {
      console.log('🔄 [WS] CRM: Получено WebSocket уведомление об обновлении беседы:', data);
      const { conversationId, conversation } = data;
      
      if (!conversation) {
        console.warn('⚠️ [WS] Данные беседы не переданы в уведомлении');
        return;
      }
      
      // КРИТИЧНО: Принудительно устанавливаем unread_count_admin = 0, если его нет или он не 0
      const unreadCount = conversation.unread_count_admin !== undefined ? conversation.unread_count_admin : 0;
      console.log(`🔄 [WS] CRM: Обновление беседы ${conversationId}, unread_count_admin: ${unreadCount}`);
      
      // Обновляем беседу в списке пользователей
      setUsers(prev => {
        // Проверяем, что prev является массивом
        if (!Array.isArray(prev)) {
          console.warn('⚠️ [WS] ClientCommunication: prev в handleConversationUpdated не является массивом:', prev);
          return [];
        }
        
        let hasChanges = false;
        const updated = prev.map(user => {
          // Проверяем, что user.conversations является массивом
          if (!Array.isArray(user.conversations)) {
            return user;
          }
          
          const updatedConversations = user.conversations.map(conv => {
            if (conv.id === conversationId) {
              // Проверяем, изменился ли unread_count_admin
              const oldUnread = conv.unread_count_admin || 0;
              const newUnread = unreadCount;
              
              if (oldUnread !== newUnread) {
                hasChanges = true;
                console.log(`✅ [WS] CRM: Обновление беседы ${conversationId} у пользователя ${user.id}, unread_count_admin: ${oldUnread} -> ${newUnread}`);
              }
              
              // Обновляем беседу с новыми данными, принудительно устанавливая unread_count_admin
              return {
                ...conv,
                ...conversation,
                unread_count_admin: newUnread // Принудительно устанавливаем значение
              };
            }
            return conv;
          });
          
          // Пересчитываем totalUnread для пользователя
          const newTotalUnread = updatedConversations.reduce((sum, conv) => sum + (conv.unread_count_admin || 0), 0);
          
          return {
            ...user,
            conversations: updatedConversations,
            totalUnread: newTotalUnread
          };
        });
        
        if (hasChanges) {
          console.log('✅ [WS] CRM: Список пользователей обновлен через WebSocket, бейдж должен обновиться');
        } else {
          console.log('⚠️ [WS] CRM: Изменений не обнаружено, возможно беседа уже обновлена');
        }
        
        // КРИТИЧНО: Обновляем selectedUser, если он выбран, чтобы бейдж обновился немедленно
        if (hasChanges) {
          flushSync(() => {
            setSelectedUser(prevSelectedUser => {
              if (prevSelectedUser) {
                // Находим обновленного пользователя в новом списке
                const updatedUser = updated.find(u => u.id === prevSelectedUser.id);
                if (updatedUser) {
                  // Проверяем, изменилась ли беседа в списке бесед пользователя
                  const prevConv = prevSelectedUser.conversations.find(c => c.id === conversationId);
                  const updatedConv = updatedUser.conversations.find(c => c.id === conversationId);
                  if (updatedConv && (prevConv?.unread_count_admin || 0) !== (updatedConv.unread_count_admin || 0)) {
                    console.log(`✅ [WS] CRM: Обновлен selectedUser для немедленного обновления бейджа`);
                    return updatedUser;
                  }
                }
              }
              return prevSelectedUser;
            });
          });
        }
        
        return updated;
      });
      
      // Обновляем selectedConversation если она открыта
      if (selectedConversationRef.current && selectedConversationRef.current.id === conversationId) {
        setSelectedConversation(prev => {
          if (prev && prev.id === conversationId) {
            const oldUnread = prev.unread_count_admin || 0;
            const newUnread = unreadCount;
            
            if (oldUnread !== newUnread) {
              console.log(`✅ [WS] CRM: Обновление selectedConversation ${conversationId}, unread_count_admin: ${oldUnread} -> ${newUnread}`);
            }
            
            return {
              ...prev,
              ...conversation,
              unread_count_admin: newUnread // Принудительно устанавливаем значение
            };
          }
          return prev;
        });
      }
      
      console.log('✅ [WS] Беседа обновлена через WebSocket, бейдж должен обновиться');
    };

    // Подписываемся на WebSocket события
    const socket = websocketService.getSocket();
    if (socket) {
      socket.on('support_new_message', handleNewMessage);
      socket.on('support_conversation_deleted', handleConversationDeleted);
      socket.on('support_conversation_updated', handleConversationUpdated);
      console.log('✅ Подписка на WebSocket события установлена');
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.removeEventListener('crm-new-conversation', handleNewConversation);
      
      // Отписываемся от WebSocket событий
      if (socket) {
        socket.off('support_new_message', handleNewMessage);
        socket.off('support_conversation_deleted', handleConversationDeleted);
        socket.off('support_conversation_updated', handleConversationUpdated);
        console.log('🔌 Отписка от WebSocket событий');
      }
    };
  }, [loadConversations, loadMessagesLocal]);

  // Выбор беседы
  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    
    // КРИТИЧНО: Отмечаем сообщения как прочитанные сразу при выборе беседы
    // Это нужно для немедленного обновления бейджа
    if (conversation.unread_count_admin > 0) {
      console.log(`📖 Отмечаем сообщения как прочитанные для беседы ${conversation.id} (непрочитанных: ${conversation.unread_count_admin})`);
      await markMessagesAsReadLocal(conversation.id);
    }
    
    // Загружаем сообщения беседы (не отмечаем как прочитанные, т.к. уже отметили выше)
    await loadMessagesLocal(conversation.id, false);
  };

  // Обработка выбора файлов для чата
  const handleChatFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setChatAttachedFiles(prev => [...prev, ...files]);
    e.target.value = ''; // Сбрасываем input
  };

  // Удаление файла из списка чата
  const handleChatRemoveFile = (index) => {
    setChatAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Обработка выбора эмодзи
  const handleEmojiSelect = (emoji) => {
    setNewMessageText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  // Закрытие эмодзи пикера при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showEmojiPicker]);

  // Отправка сообщения
  const handleSendMessage = async () => {
    if ((!newMessageText.trim() && chatAttachedFiles.length === 0) || !selectedConversation) return;

    try {
      setSending(true);
      // Получаем канал из беседы (если не установлен, используем 'email' по умолчанию)
      const channel = selectedConversation.channel || 'email';
      
      const formData = new FormData();
      formData.append('messageText', newMessageText || '');
      formData.append('channel', channel);
      
      // Добавляем файлы
      chatAttachedFiles.forEach((file) => {
        formData.append('attachments', file);
      });
      
      await axiosAPI.post(`/admin/support/conversations/${selectedConversation.id}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setNewMessageText('');
      setChatAttachedFiles([]);
      await loadMessagesLocal(selectedConversation.id);
      await loadConversations();
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка отправки сообщения'
        }
      }));
    } finally {
      setSending(false);
    }
  };

  // Изменение статуса
  const handleChangeStatus = async (status) => {
    if (!selectedConversation) return;
    
    try {
      await axiosAPI.put(`/admin/support/conversations/${selectedConversation.id}`, { status });
      setSelectedConversation({ ...selectedConversation, status });
      await loadConversations();
    } catch (err) {
      console.error('Ошибка изменения статуса:', err);
    }
  };

  // Изменение приоритета
  const handleChangePriority = async (priority) => {
    if (!selectedConversation) return;
    
    try {
      await axiosAPI.put(`/admin/support/conversations/${selectedConversation.id}`, { priority });
      setSelectedConversation({ ...selectedConversation, priority });
      await loadConversations();
    } catch (err) {
      console.error('Ошибка изменения приоритета:', err);
    }
  };

  // Получить иконку приоритета
  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'normal': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  // Получить текст статуса
  const getStatusText = (status) => {
    switch (status) {
      case 'open': return 'Открыто';
      case 'in_progress': return 'В работе';
      case 'resolved': return 'Решено';
      case 'closed': return 'Закрыто';
      default: return status;
    }
  };

  // Загрузка доступных клиентов для модального окна
  const loadAvailableClients = async () => {
    try {
      const response = await axiosAPI.get('/admin/crm/deals/clients');
      setAvailableClients(response.data.clients || []);
    } catch (err) {
      console.error('Ошибка загрузки клиентов:', err);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка загрузки списка клиентов'
        }
      }));
    }
  };

  // Загрузка Telegram ID для выбранного клиента
  const loadClientTelegramId = async (clientId) => {
    if (!clientId) {
      setSelectedClientTelegramId(null);
      return;
    }

    try {
      const response = await axiosAPI.get(`/admin/user/telegram/${clientId}`);
      if (response.data && response.data.telegramId) {
        setSelectedClientTelegramId(response.data.telegramId);
      } else {
        setSelectedClientTelegramId(null);
      }
    } catch {
      console.log('Telegram ID не найден для клиента:', clientId);
      setSelectedClientTelegramId(null);
    }
  };

  // Открытие модального окна "Написать клиенту"
  const handleOpenWriteModal = async () => {
    setShowWriteModal(true);
    await loadAvailableClients();
    // Сброс полей
    setSelectedClientId('');
    setMessageSubject('');
    setMessageText('');
    setAttachedFiles([]);
    setIsDragOver(false);
    setSelectedClientTelegramId(null);
    setSelectedChannel(null); // По умолчанию ничего не выбрано
    setChannelLocked(false); // Разблокируем выбор канала
    setShowChannelTooltip(false);
    setChannelWarningAnimation(false);
  };

  // Закрытие модального окна
  const handleCloseWriteModal = () => {
    setShowWriteModal(false);
    setSelectedClientId('');
    setMessageSubject('');
    setMessageText('');
    setAttachedFiles([]);
    setIsDragOver(false);
    setSelectedClientTelegramId(null);
    setSelectedChannel(null);
    setChannelLocked(false);
    setShowChannelTooltip(false);
    setChannelWarningAnimation(false);
  };

  // Обработка выбора файлов
  const handleFileSelect = (files) => {
    const newFiles = Array.from(files).map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      size: file.size,
      type: file.type
    }));
    
    setAttachedFiles(prev => [...prev, ...newFiles]);
  };

  // Обработка drag & drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  };

  // Удаление файла
  const handleRemoveFile = (fileId) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  // Форматирование размера файла
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Получение иконки файла
  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('word') || fileType.includes('document')) return '📝';
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
    if (fileType.includes('zip') || fileType.includes('rar')) return '📦';
    return '📎';
  };

  // Обработка изменения выбранного клиента
  const handleClientChange = async (clientId) => {
    setSelectedClientId(clientId);
    await loadClientTelegramId(clientId);
    // Если канал не заблокирован, сбрасываем выбор канала при смене клиента
    if (!channelLocked) {
      setSelectedChannel(null);
      setShowChannelTooltip(false);
      setChannelWarningAnimation(false);
    }
  };

  // Обработка выбора канала связи
  const handleChannelSelect = (channel) => {
    // Если канал заблокирован, не позволяем менять
    if (channelLocked) {
      return;
    }
    
    // Проверяем доступность канала
    if (channel === 'telegram' && !selectedClientTelegramId) {
      // Telegram недоступен, если нет TGID
      return;
    }
    
    setSelectedChannel(channel);
  };

  // Отправка сообщения клиенту
  const handleSendMessageToClient = async () => {
    if (!selectedClientId || !messageSubject.trim() || !messageText.trim()) {
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Пожалуйста, заполните все поля'
        }
      }));
      return;
    }

    // Валидация выбора канала
    if (!selectedChannel) {
      setShowChannelTooltip(true);
      setChannelWarningAnimation(true);
      
      // Запускаем анимацию мигания
      setTimeout(() => {
        setChannelWarningAnimation(false);
      }, 2000);
      
      // Скрываем тултип через 3 секунды
      setTimeout(() => {
        setShowChannelTooltip(false);
      }, 3000);
      
      return;
    }

    try {
      setSendingMessage(true);
      
      // Создаем FormData для отправки файлов
      const formData = new FormData();
      formData.append('clientId', selectedClientId);
      formData.append('subject', messageSubject);
      formData.append('messageText', messageText);
      
      // Добавляем файлы
      attachedFiles.forEach((fileObj) => {
        formData.append(`files`, fileObj.file);
      });

      // Добавляем выбранный канал в FormData
      formData.append('channel', selectedChannel);

      // Отправляем сообщение
      await axiosAPI.post('/admin/support/send-message', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Блокируем изменение канала после успешной отправки
      setChannelLocked(true);

      // Очищаем поля сообщения, но оставляем модалку открытой для продолжения переписки
      setMessageText('');
      setAttachedFiles([]);

      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: `Сообщение успешно отправлено клиенту через ${selectedChannel === 'email' ? 'Email' : selectedChannel === 'telegram' ? 'Telegram' : 'ITC'}`
        }
      }));
      
      // Обновляем список бесед
      await loadConversations();
      
    } catch (err) {
      console.error('Ошибка отправки сообщения:', err);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка отправки сообщения: ' + (err.response?.data?.message || err.message)
        }
      }));
    } finally {
      setSendingMessage(false);
    }
  };

  // Форматирование даты
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Форматирование времени для сообщений
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Открытие модалки подтверждения удаления
  const handleOpenDeleteModal = (conversation) => {
    setDeletingConversation(conversation);
    setShowDeleteModal(true);
  };
  
  // Закрытие модалки удаления
  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setDeletingConversation(null);
  };
  
  // Удаление беседы
  const handleDeleteConversation = async () => {
    if (!deletingConversation) return;
    
    try {
      setIsDeleting(true);
      
      await axiosAPI.delete(`/admin/support/conversations/${deletingConversation.id}`);
      
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Беседа успешно удалена'
        }
      }));
      
      // Если удаляемая беседа была выбрана, сбрасываем выбор
      if (selectedConversation?.id === deletingConversation.id) {
        setSelectedConversation(null);
        setMessages([]);
      }
      
      // Обновляем список бесед
      await loadConversations();
      
      // Закрываем модалку
      handleCloseDeleteModal();
    } catch (err) {
      console.error('Ошибка удаления беседы:', err);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка удаления беседы: ' + (err.response?.data?.message || err.message)
        }
      }));
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Проверка прав на удаление (только ROOT и ADMINISTRATOR)
  const canDeleteConversation = adminRole === 'ROOT' || adminRole === 'ADMINISTRATOR';

  return (
    <div className="client-communication">
      {/* Панель фильтров */}
      <div className="comm-filters">
        <input
          type="text"
          placeholder="🔍 Поиск по теме, email клиента..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="comm-search"
        />
        
        <select 
          value={filterStatus} 
          onChange={(e) => setFilterStatus(e.target.value)}
          className="comm-filter-select"
        >
          <option value="all">Все статусы</option>
          <option value="open">Открытые</option>
          <option value="in_progress">В работе</option>
          <option value="resolved">Решенные</option>
          <option value="closed">Закрытые</option>
        </select>

        <select 
          value={filterPriority} 
          onChange={(e) => setFilterPriority(e.target.value)}
          className="comm-filter-select"
        >
          <option value="all">Все приоритеты</option>
          <option value="urgent">🔴 Urgent</option>
          <option value="high">🟠 High</option>
          <option value="normal">🟡 Normal</option>
          <option value="low">🟢 Low</option>
        </select>

        {/* Кнопка "Написать клиенту" */}
        <button 
          onClick={handleOpenWriteModal}
          className="comm-write-btn"
        >
          ✉️ Написать клиенту
        </button>

        {/* Индикатор автообновления удален - используется SupportContext */}
      </div>

      {/* Основной контент */}
      <div className="comm-main">
        {/* Список пользователей / бесед */}
        <div className="comm-list">
          <div className="comm-list-header">
            {!selectedUser ? (
              <>
                <h3>👥 Клиенты ({users.length})</h3>
                <div className="comm-list-auto-refresh">
                  🔄 Автообновление через SupportContext
                </div>
              </>
            ) : (
              <>
                <button 
                  className="comm-back-btn" 
                  onClick={() => {
                    setSelectedUser(null);
                    setSelectedConversation(null);
                    setMessages([]);
                  }}
                >
                  ← Назад
                </button>
                <h3>{selectedUser.name}</h3>
              </>
            )}
          </div>
          
          <div className="comm-list-items">
            {loading ? (
              <div className="comm-loading">Загрузка...</div>
            ) : !selectedUser ? (
              // Список пользователей
              users.length === 0 ? (
                <div className="comm-empty">Нет обращений</div>
              ) : (
                users.map(user => (
                  <div
                    key={user.id}
                    className="comm-list-item comm-user-item"
                    onClick={() => setSelectedUser(user)}
                  >
                    <div className="comm-item-header">
                      {user.avatar && user.avatar !== 'noAvatar' ? (
                        <img 
                          src={getAvatarUrl(user.avatar)}
                          alt={user.name}
                          className="comm-user-icon comm-user-avatar"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'inline-block';
                          }}
                        />
                      ) : null}
                      <span className="comm-user-icon" style={{ display: user.avatar && user.avatar !== 'noAvatar' ? 'none' : 'inline-block' }}>👤</span>
                      <span className="comm-user-name">{user.name}</span>
                      {user.totalUnread > 0 && (
                        <span className="comm-item-badge">{user.totalUnread}</span>
                      )}
                      {user.hasUrgent && <span className="comm-urgent-badge">🔴</span>}
                    </div>
                    <div className="comm-item-meta">
                      <span className="comm-item-user">📧 {user.email}</span>
                      <span className="comm-user-count">Обращений: {user.conversations.length}</span>
                    </div>
                  </div>
                ))
              )
            ) : (
              // Список обращений выбранного пользователя
              selectedUser.conversations.map(conv => (
                <div
                  key={conv.id}
                  className={`comm-list-item ${selectedConversation?.id === conv.id ? 'active' : ''} ${conv.unread_count_admin > 0 ? 'unread' : ''}`}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <div className="comm-item-header">
                    <span className="comm-item-priority">{getPriorityIcon(conv.priority)}</span>
                    <span className="comm-item-id">#{conv.id}</span>
                    {conv.unread_count_admin > 0 && (
                      <span className="comm-item-badge">{conv.unread_count_admin}</span>
                    )}
                  </div>
                  <div className="comm-item-subject">{conv.subject}</div>
                  <div className="comm-item-meta">
                    <span className="comm-item-category">📁 {conv.category}</span>
                    <span className="comm-item-date">{formatDate(conv.last_message_at)}</span>
                  </div>
                  <div className="comm-item-footer">
                    {conv.channel && (
                      <div className="comm-item-channel-badge" title={`Канал: ${getChannelName(conv.channel)}`}>
                        {getChannelIcon(conv.channel)}
                        <span className="comm-item-channel-badge-text">{getChannelName(conv.channel)}</span>
                      </div>
                    )}
                    <div className="comm-item-status">{getStatusText(conv.status)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Область чата */}
        <div className="comm-chat">
          {!selectedConversation ? (
            <div className="comm-chat-empty">
              Выберите беседу для просмотра
            </div>
          ) : (
            <>
              {/* Заголовок беседы */}
              <div className="comm-chat-header">
                <div className="comm-chat-title">
                  <span className="comm-chat-priority">{getPriorityIcon(selectedConversation.priority)}</span>
                  <h3>{selectedConversation.subject}</h3>
                  {selectedConversation.channel && (
                    <div className="comm-channel-badge" title={`Канал общения: ${getChannelName(selectedConversation.channel)}`}>
                      {getChannelIcon(selectedConversation.channel)}
                      <span className="comm-channel-badge-text">{getChannelName(selectedConversation.channel)}</span>
                    </div>
                  )}
                </div>
                <div className="comm-chat-controls">
                  <select 
                    value={selectedConversation.status}
                    onChange={(e) => handleChangeStatus(e.target.value)}
                    className="comm-status-select"
                  >
                    <option value="open">Открыто</option>
                    <option value="in_progress">В работе</option>
                    <option value="resolved">Решено</option>
                    <option value="closed">Закрыто</option>
                  </select>

                  <select 
                    value={selectedConversation.priority}
                    onChange={(e) => handleChangePriority(e.target.value)}
                    className="comm-priority-select"
                  >
                    <option value="urgent">🔴 Urgent</option>
                    <option value="high">🟠 High</option>
                    <option value="normal">🟡 Normal</option>
                    <option value="low">🟢 Low</option>
                  </select>
                  
                  {canDeleteConversation && (
                    <button
                      onClick={() => handleOpenDeleteModal(selectedConversation)}
                      className="comm-delete-btn"
                      title="Удалить беседу"
                    >
                      🗑️ УДАЛИТЬ
                    </button>
                  )}
                </div>
              </div>

              {/* Сообщения */}
              <div className="comm-chat-messages" ref={messagesContainerRef}>
                {messages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`comm-message ${msg.sender_type === 'admin' ? 'admin' : 'user'}`}
                  >
                    <div className="comm-message-header">
                      <span className="comm-message-sender">
                        {msg.sender_type === 'admin' ? '👤 ' : '💼 '}
                        {msg.sender_name}
                      </span>
                      <span className="comm-message-time">{formatTime(msg.createdAt)}</span>
                    </div>
                    {(() => {
                      // Парсим attachments, если они приходят как строка
                      let attachments = msg.attachments;
                      
                      // КРИТИЧНО: Логируем для отладки
                      console.log(`🔍 Обработка вложений для сообщения ${msg.id}:`, {
                        original: msg.attachments,
                        type: typeof msg.attachments,
                        isArray: Array.isArray(msg.attachments)
                      });
                      
                      if (typeof attachments === 'string') {
                        try {
                          attachments = JSON.parse(attachments);
                        } catch {
                          // Если не JSON, возможно это PostgreSQL array string формата "{item1,item2}"
                          if (attachments.startsWith('{') && attachments.endsWith('}')) {
                            attachments = attachments.slice(1, -1).split(',').map(item => item.trim().replace(/^"|"$/g, ''));
                            console.log(`📎 Распарсили PostgreSQL array string:`, attachments);
                          } else {
                            console.warn('Не удалось распарсить attachments как JSON:', attachments);
                            attachments = [];
                          }
                        }
                      }
                      if (!Array.isArray(attachments)) {
                        attachments = attachments ? [attachments] : [];
                      }
                      
                      console.log(`📎 Финальные вложения для сообщения ${msg.id}:`, attachments);
                      
                      // Определяем, нужно ли показывать текст как основной или как подпись
                      const hasValidText = msg.message_text && 
                        !msg.message_text.match(/^📎\s|^attachment-/i) &&
                        msg.message_text.trim() !== '';
                      
                      // Если есть вложения (изображения или файлы), текст показываем ТОЛЬКО как подпись
                      // Если нет вложений - показываем текст как основной
                      const hasAttachments = attachments && attachments.length > 0;
                      // Основной текст показываем ТОЛЬКО если НЕТ вложений
                      const showTextAsMain = !hasAttachments && hasValidText;
                      
                      console.log('🔍 Логика отображения текста:', {
                        hasAttachments,
                        hasValidText,
                        showTextAsMain,
                        attachmentsCount: attachments ? attachments.length : 0
                      });
                      
                      // КРИТИЧНО: Убеждаемся, что attachments - массив и не пустой
                      const hasAttachmentsArray = Array.isArray(attachments) && attachments.length > 0;
                      
                      console.log('🔍 Проверка вложений перед рендерингом:', {
                        hasAttachmentsArray,
                        attachmentsLength: attachments?.length || 0,
                        attachments: attachments,
                        msgId: msg.id,
                        msgText: msg.message_text
                      });
                      
                      return (
                        <>
                          {/* Вложения - показываем ПЕРЕД текстом, если есть */}
                          {hasAttachmentsArray && (
                            <div className="comm-message-attachments" key={`attachments-${msg.id}`}>
                              {attachments.map((attachment, idx) => {
                                const fileName = attachment.split('/').pop();
                                
                                // Определяем тип файла по расширению (проверяем и имя файла, и путь)
                                const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(attachment) || 
                                               /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName) ||
                                               /^photo_/i.test(fileName) ||
                                               /attachment-.*\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(fileName);
                                
                                const isVideo = /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(attachment) ||
                                                /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(fileName);
                              
                                // Формируем правильный URL для файла
                                let fileUrl = '';
                                if (attachment.startsWith('http') || attachment.startsWith('blob:') || attachment.startsWith('data:')) {
                                  fileUrl = attachment;
                                } else {
                                  // КРИТИЧНО: Проверяем, является ли это вложением из email
                                  // Путь email attachments: storage/email/attachments/{emailId}/{filename}
                                  const isEmailAttachment = attachment.includes('storage/email/attachments');
                                  
                                  if (isEmailAttachment) {
                                    // Для email attachments нужно извлечь ID из пути и использовать специальный маршрут
                                    // Путь: storage/email/attachments/{emailId}/{filename}
                                    const pathParts = attachment.split('/');
                                    const emailIdIndex = pathParts.indexOf('attachments');
                                    if (emailIdIndex !== -1 && pathParts[emailIdIndex + 1]) {
                                      // Пытаемся найти attachment ID через API или используем путь напрямую
                                      // Пока используем прямой путь к файлу через storage
                                      const normalizedPath = attachment.startsWith('/') ? attachment : `/${attachment}`;
                                      const baseUrl = API_CONFIG.BASE_URL;
                                      fileUrl = baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
                                    } else {
                                      // Fallback: используем прямой путь
                                      const normalizedPath = attachment.startsWith('/') ? attachment : `/${attachment}`;
                                      const baseUrl = API_CONFIG.BASE_URL;
                                      fileUrl = baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
                                    }
                                  } else {
                                    // Для обычных вложений поддержки используем API endpoint
                                    // Путь в БД: storage/support/attachments/{conversationId}/{filename}
                                    // Нужно: /admin/support/attachments/{conversationId}/{filename}
                                    if (attachment.includes('storage/support/attachments')) {
                                      // ПРИОРИТЕТ: Используем conversation_id из сообщения (наиболее надежно)
                                      // Fallback: извлекаем из пути или используем ID текущей беседы
                                      let conversationId = msg.conversation_id || selectedConversation?.id;
                                      
                                      // Если conversation_id нет в сообщении, пытаемся извлечь из пути
                                      if (!conversationId) {
                                        const pathParts = attachment.split('/');
                                        const attachmentsIndex = pathParts.indexOf('attachments');
                                        if (attachmentsIndex !== -1 && pathParts[attachmentsIndex + 1]) {
                                          conversationId = pathParts[attachmentsIndex + 1];
                                          console.log('⚠️ [CRM] conversationId не найден в сообщении, извлечен из пути:', conversationId);
                                        }
                                      }
                                      
                                      if (conversationId) {
                                        const filename = fileName;
                                        
                                        console.log('✅ [CRM] Используемый conversationId для вложения:', {
                                          conversationId,
                                          source: msg.conversation_id ? 'message' : (selectedConversation?.id ? 'selectedConversation' : 'path'),
                                          fileName: filename,
                                          attachment
                                        });
                                        
                                        // Используем API endpoint с токеном в query параметре
                                        const token = localStorage.getItem('accessToken');
                                        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
                                        const baseUrl = API_CONFIG.BASE_URL || '';
                                        fileUrl = `${baseUrl}/admin/support/attachments/${conversationId}/${encodeURIComponent(filename)}${tokenParam}`;
                                        
                                        console.log('🔗 [CRM] Сформированный URL для вложения:', fileUrl);
                                      } else {
                                        console.error('❌ [CRM] Не удалось определить conversationId для вложения:', {
                                          attachment,
                                          fileName,
                                          msgConversationId: msg.conversation_id,
                                          selectedConversationId: selectedConversation?.id
                                        });
                                        // Последний fallback: прямой путь (может не работать без аутентификации)
                                        const normalizedPath = attachment.startsWith('/') ? attachment : `/${attachment}`;
                                        const baseUrl = API_CONFIG.BASE_URL;
                                        fileUrl = baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
                                      }
                                    } else {
                                      // Для других типов вложений используем прямой путь
                                      const normalizedPath = attachment.startsWith('/') ? attachment : `/${attachment}`;
                                      const baseUrl = API_CONFIG.BASE_URL;
                                      fileUrl = baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
                                    }
                                  }
                                  
                                  // Логирование для отладки
                                  console.log('🔍 Формирование URL для файла:', {
                                    original: attachment,
                                    isEmailAttachment,
                                    normalizedPath: attachment.startsWith('/') ? attachment : `/${attachment}`,
                                    baseUrl: API_CONFIG.BASE_URL || '(пустой)',
                                    finalUrl: fileUrl
                                  });
                                }
                                
                                // Логирование для отладки
                                console.log('🔍 Обработка вложения:', {
                                  attachment,
                                  fileName,
                                  isImage,
                                  isVideo,
                                  fileUrl,
                                  idx
                                });
                                
                                // Для изображений и файлов показываем текст как подпись ТОЛЬКО под первым вложением
                                // и только если есть валидный текст И есть вложения
                                const isFirstAttachment = idx === 0;
                                const showCaption = isFirstAttachment && hasValidText && hasAttachments;
                                
                                return (
                                  <div key={idx} className="comm-message-attachment">
                                    {isImage ? (
                                      <div className="comm-attachment-image">
                                        <img 
                                          src={fileUrl} 
                                          alt={fileName}
                                          className="comm-attachment-img"
                                          loading="lazy"
                                          onClick={() => window.open(fileUrl, '_blank')}
                                          onError={(e) => {
                                            console.error('❌ Ошибка загрузки изображения:', {
                                              fileUrl,
                                              attachment,
                                              fileName,
                                              error: e.target.error,
                                              naturalWidth: e.target.naturalWidth,
                                              naturalHeight: e.target.naturalHeight,
                                              complete: e.target.complete,
                                              src: e.target.src
                                            });
                                            
                                            // Если URL уже содержит baseUrl, не дублируем его
                                            // Пробуем загрузить через API endpoint, если еще не использовали
                                            if (attachment.includes('storage/support/attachments') && !fileUrl.includes('/admin/support/attachments')) {
                                              const pathParts = attachment.split('/');
                                              const attachmentsIndex = pathParts.indexOf('attachments');
                                              if (attachmentsIndex !== -1 && pathParts[attachmentsIndex + 1]) {
                                                const conversationId = pathParts[attachmentsIndex + 1];
                                                const token = localStorage.getItem('accessToken');
                                                const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
                                                const baseUrl = API_CONFIG.BASE_URL || '';
                                                const apiUrl = `${baseUrl}/admin/support/attachments/${conversationId}/${encodeURIComponent(fileName)}${tokenParam}`;
                                                console.log('🔄 Пробуем загрузить через API endpoint:', apiUrl);
                                                e.target.src = apiUrl;
                                                return; // Не показываем fallback сразу, даем шанс загрузиться через API
                                              }
                                            }
                                            
                                            // Скрываем изображение и показываем fallback
                                            e.target.style.display = 'none';
                                            const fallback = e.target.parentElement.querySelector('.comm-attachment-fallback');
                                            if (fallback) {
                                              fallback.classList.add('show');
                                            }
                                          }}
                                          onLoad={(e) => {
                                            // Убеждаемся, что изображение видимо, а fallback скрыт
                                            console.log('✅ Изображение успешно загружено:', {
                                              fileUrl,
                                              fileName,
                                              naturalWidth: e.target.naturalWidth,
                                              naturalHeight: e.target.naturalHeight,
                                              complete: e.target.complete
                                            });
                                            e.target.style.display = 'block';
                                            const fallback = e.target.parentElement.querySelector('.comm-attachment-fallback');
                                            if (fallback) {
                                              fallback.classList.remove('show');
                                            }
                                          }}
                                        />
                                        <div className="comm-attachment-fallback">
                                          <span>📷 {fileName}</span>
                                        </div>
                                        {showCaption && (
                                          <div className="comm-attachment-caption">{msg.message_text}</div>
                                        )}
                                      </div>
                                    ) : isVideo ? (
                                      <div className="comm-attachment-video">
                                        <video 
                                          src={fileUrl} 
                                          controls
                                          className="comm-attachment-video-element"
                                        >
                                          Ваш браузер не поддерживает видео.
                                        </video>
                                        {showCaption && (
                                          <div className="comm-attachment-caption">{msg.message_text}</div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="comm-attachment-file">
                                        <a 
                                          href="#"
                                          download={fileName} 
                                          className="comm-attachment-link"
                                          onClick={async (e) => {
                                            e.preventDefault();
                                            const conversationId = selectedConversation?.id || msg.conversation_id;
                                            
                                            console.log('🔗 Начинаем скачивание файла:', {
                                              conversationId,
                                              fileName
                                            });
                                            
                                            try {
                                              const token = localStorage.getItem('accessToken');
                                              if (!token) {
                                                alert('Ошибка: Пользователь не авторизован');
                                                return;
                                              }
                                              
                                              // КРИТИЧНО: Определяем тип пути вложения
                                              // Если путь начинается с storage/email - это вложение из email
                                              // Если с storage/support - это вложение из поддержки
                                              let url = '';
                                              if (attachment.startsWith('storage/email/')) {
                                                // Вложение из email - используем прямой путь к файлу
                                                const normalizedPath = attachment.startsWith('/') ? attachment : `/${attachment}`;
                                                url = normalizedPath;
                                                console.log('📥 Вложение из email, используем прямой путь:', url);
                                              } else {
                                                // Вложение из поддержки - используем API endpoint
                                                url = `/admin/support/attachments/${conversationId}/${encodeURIComponent(fileName)}`;
                                                console.log('📥 Вложение из поддержки, используем API:', url);
                                              }
                                              
                                              console.log('📥 URL для скачивания:', url);
                                              console.log('📥 axiosAPI baseURL:', axiosAPI.defaults.baseURL || '(пустой - используем прокси)');
                                              
                                              // Для вложений из email используем прямой путь через storage
                                              // Для вложений из поддержки используем API endpoint
                                              const response = await axiosAPI.get(url, {
                                                responseType: 'blob'
                                                // Authorization заголовок уже добавляется через interceptor
                                              });
                                              
                                              // Создаем blob URL для скачивания
                                              const blob = new Blob([response.data]);
                                              const downloadUrl = window.URL.createObjectURL(blob);
                                              const link = document.createElement('a');
                                              link.href = downloadUrl;
                                              link.download = fileName;
                                              document.body.appendChild(link);
                                              link.click();
                                              document.body.removeChild(link);
                                              window.URL.revokeObjectURL(downloadUrl);
                                              
                                              console.log('✅ Файл успешно скачан:', fileName);
                                            } catch (error) {
                                              console.error('❌ Ошибка скачивания файла:', error);
                                              alert(`Ошибка скачивания файла: ${error.response?.data?.message || error.message}`);
                                            }
                                          }}
                                        >
                                          {fileName}
                                        </a>
                                        {showCaption && (
                                          <div className="comm-attachment-caption">{msg.message_text}</div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          
                          {/* Текст сообщения - показываем ТОЛЬКО если нет вложений */}
                          {/* Важно: проверяем и showTextAsMain, и отсутствие вложений для надежности */}
                          {showTextAsMain && !hasAttachmentsArray && (
                            <div className="comm-message-text">{msg.message_text}</div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ))}
              </div>

              {/* Поле ввода */}
              <div className="comm-chat-input">
                {/* Список прикрепленных файлов */}
                {chatAttachedFiles.length > 0 && (
                  <div className="comm-attached-files">
                    {chatAttachedFiles.map((file, index) => {
                      const isImage = file.type && file.type.startsWith('image/');
                      const previewUrl = isImage ? URL.createObjectURL(file) : null;
                      
                      return (
                        <div key={index} className="comm-attached-file-item">
                          {isImage && previewUrl ? (
                            <div className="comm-attached-file-preview">
                              <img src={previewUrl} alt={file.name} />
                              <button 
                                className="comm-attached-file-remove"
                                onClick={() => {
                                  URL.revokeObjectURL(previewUrl);
                                  handleChatRemoveFile(index);
                                }}
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <div className="comm-attached-file-info">
                              <span>📎 {file.name}</span>
                              <button 
                                className="comm-attached-file-remove"
                                onClick={() => handleChatRemoveFile(index)}
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="comm-input-row">
                  <div className="comm-input-wrapper" style={{ position: 'relative', flex: 1 }}>
                    <textarea
                      value={newMessageText}
                      onChange={(e) => setNewMessageText(e.target.value)}
                      placeholder="Введите ответ клиенту..."
                      className="comm-input-textarea"
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    {showEmojiPicker && (
                      <div ref={emojiPickerRef}>
                        <EmojiPicker 
                          onEmojiSelect={handleEmojiSelect}
                          onClose={() => setShowEmojiPicker(false)}
                        />
                      </div>
                    )}
                  </div>
                  <div className="comm-input-actions">
                    <div className="comm-input-actions-column">
                      <button
                        className="comm-emoji-btn"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        title="Добавить эмодзи"
                        type="button"
                      >
                        😀
                      </button>
                      <label className="comm-attach-file-btn" title="Прикрепить файл">
                        📎
                        <input
                          type="file"
                          multiple
                          onChange={handleChatFileSelect}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                    <button 
                      onClick={handleSendMessage}
                      disabled={(!newMessageText.trim() && chatAttachedFiles.length === 0) || sending}
                      className="comm-send-btn"
                      title={sending ? 'Отправка...' : 'Отправить'}
                    >
                      {sending ? (
                        <span>⏳</span>
                      ) : (
                        <img 
                          src={telegramIcon} 
                          alt="Отправить" 
                          className="comm-send-btn-icon"
                        />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Модальное окно "Написать клиенту" */}
      {showWriteModal && (
        <div className="comm-write-modal-overlay">
          <div className="comm-write-modal">
            <div className="comm-write-modal-header">
              <h3>✉️ Написать клиенту</h3>
              <button 
                className="comm-write-modal-close"
                onClick={handleCloseWriteModal}
              >
                ✕
              </button>
            </div>
            
            <div className="comm-write-modal-content">
              {/* Выбор клиента */}
              <div className="comm-write-form-group">
                <label>Выберите клиента *</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="comm-write-select"
                  required
                >
                  <option value="">Выберите клиента</option>
                  {availableClients.map(client => (
                    <option key={client.id} value={client.id}>
                      {client.lastName || ''} {client.firstName || ''} {client.middleName || ''} {client.email ? `(${client.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Тема сообщения */}
              <div className="comm-write-form-group">
                <label>Тема сообщения *</label>
                <input
                  type="text"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="Введите тему сообщения"
                  className="comm-write-input"
                  required
                />
              </div>

              {/* Текст сообщения */}
              <div className="comm-write-form-group">
                <label>Текст сообщения *</label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите текст сообщения"
                  className="comm-write-textarea"
                  rows={6}
                  required
                />
              </div>

              {/* Загрузка файлов */}
              <div className="comm-write-form-group">
                <label>Вложения</label>
                <div 
                  className={`comm-write-file-upload ${isDragOver ? 'dragover' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('comm-file-input').click()}
                >
                  <input
                    id="comm-file-input"
                    type="file"
                    multiple
                    className="comm-write-file-input"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <div className="comm-write-file-label">
                    📎 Перетащите файлы сюда или нажмите для выбора
                    <br />
                    <small>Можно выбрать несколько файлов</small>
                  </div>
                </div>

                {/* Список прикрепленных файлов */}
                {attachedFiles.length > 0 && (
                  <div className="comm-write-files-list">
                    {attachedFiles.map(fileObj => (
                      <div key={fileObj.id} className="comm-write-file-item">
                        <div className="comm-write-file-info">
                          <span className="comm-write-file-icon">{getFileIcon(fileObj.type)}</span>
                          <span>{fileObj.name}</span>
                          <span>({formatFileSize(fileObj.size)})</span>
                        </div>
                        <button
                          className="comm-write-file-remove"
                          onClick={() => handleRemoveFile(fileObj.id)}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="comm-write-modal-footer">
              {/* Индикаторы способов отправки */}
              <div className={`comm-write-delivery-indicators ${channelWarningAnimation ? 'warning-animation' : ''}`}>
                {/* Email - всегда доступен */}
                <div 
                  className={`comm-write-delivery-indicator ${selectedChannel === 'email' ? 'active' : 'inactive'} ${channelLocked ? 'locked' : 'clickable'}`}
                  onClick={() => handleChannelSelect('email')}
                  title={channelLocked ? 'Канал заблокирован после отправки' : 'Выбрать Email'}
                >
                  <span className="comm-write-delivery-icon">📧</span>
                  <span className="comm-write-delivery-text">Email</span>
                </div>
                
                {/* Telegram - доступен только если есть TGID */}
                {selectedClientTelegramId && (
                  <div 
                    className={`comm-write-delivery-indicator ${selectedChannel === 'telegram' ? 'active' : 'inactive'} ${channelLocked ? 'locked' : 'clickable'}`}
                    onClick={() => handleChannelSelect('telegram')}
                    title={channelLocked ? 'Канал заблокирован после отправки' : 'Выбрать Telegram'}
                  >
                    <img 
                      src={telegramIcon} 
                      alt="Telegram" 
                      className="comm-write-delivery-icon telegram-icon"
                    />
                    <span className="comm-write-delivery-text">Telegram</span>
                  </div>
                )}
                
                {/* ITC - внутренняя система - всегда доступна */}
                <div 
                  className={`comm-write-delivery-indicator ${selectedChannel === 'itc' ? 'active' : 'inactive'} ${channelLocked ? 'locked' : 'clickable'}`}
                  onClick={() => handleChannelSelect('itc')}
                  title={channelLocked ? 'Канал заблокирован после отправки' : 'Выбрать ITC (внутренняя система)'}
                >
                  <img 
                    src={itcIcon} 
                    alt="ITC" 
                    className="comm-write-delivery-icon itc-icon"
                  />
                  <span className="comm-write-delivery-text">ITC</span>
                </div>
              </div>

              {/* Кнопки действий */}
              <div className="comm-write-modal-actions">
                <button 
                  className="comm-write-btn-cancel"
                  onClick={handleCloseWriteModal}
                >
                  Отменить
                </button>
                <div className="comm-write-send-wrapper">
                  {showChannelTooltip && (
                    <div className="comm-write-channel-tooltip">
                      Нужно выбрать способ обмена сообщениями
                    </div>
                  )}
                  <button 
                    className="comm-write-btn-send"
                    onClick={handleSendMessageToClient}
                    disabled={sendingMessage || !selectedClientId || !messageSubject.trim() || !messageText.trim()}
                  >
                    {sendingMessage ? '⏳ Отправка...' : '📤 Отправить'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно подтверждения удаления */}
      {showDeleteModal && deletingConversation && (
        <div className="comm-delete-modal-overlay">
          <div className="comm-delete-modal">
            <div className="comm-delete-modal-header">
              <h3>⚠️ Подтверждение удаления</h3>
            </div>
            <div className="comm-delete-modal-content">
              <p>Вы уверены, что хотите удалить беседу <strong>#{deletingConversation.id}</strong>?</p>
              <p className="comm-delete-warning">
                <strong>Внимание!</strong> Это действие удалит беседу и все связанные с ней сообщения. 
                Это действие нельзя отменить.
              </p>
              <div className="comm-delete-info">
                <p><strong>Тема:</strong> {deletingConversation.subject}</p>
                <p><strong>Статус:</strong> {getStatusText(deletingConversation.status)}</p>
                <p><strong>Приоритет:</strong> {getPriorityIcon(deletingConversation.priority)} {deletingConversation.priority}</p>
              </div>
            </div>
            <div className="comm-delete-modal-footer">
              <button
                className="comm-delete-btn-cancel"
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
              >
                Отменить
              </button>
              <button
                className="comm-delete-btn-confirm"
                onClick={handleDeleteConversation}
                disabled={isDeleting}
              >
                {isDeleting ? '⏳ Удаление...' : '🗑️ Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCommunication;

