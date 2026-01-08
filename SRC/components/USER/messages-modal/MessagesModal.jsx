import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosAPI from '../../../JS/auth/http/axios';
import ReportModal from '../report-modal/ReportModal';
import AlertModal from '../../common/AlertModal';
import EmojiPicker from '../../ADMIN/crm/client-communication/EmojiPicker.jsx';
import telegramIcon from '../../../IMG/telegram.png';
import postIcon from '../../../IMG/post.png';
import itcIcon from '../../../IMG/mainLogoDark.svg';
import './MessagesModal.css';

/**
 * Модальное окно просмотра истории сообщений
 * Интерфейс почтового клиента с двумя зонами
 */
const MessagesModal = ({ onClose }) => {
  const [messages, setMessages] = useState([]); // Уведомления (INFO, POST, ERROR, SUCCESS, ATTENTION)
  const [conversations, setConversations] = useState([]); // Обращения в поддержку
  const [unreadConversationsCount, setUnreadConversationsCount] = useState(0); // Счетчик непрочитанных обращений
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
  // Дополнительные модалки как в миниапке
  const [showNotificationDetail, setShowNotificationDetail] = useState(false); // детальный просмотр уведомления
  const [showConversationDetail, setShowConversationDetail] = useState(false); // детальный просмотр беседы
  const [activeTab, setActiveTab] = useState('notifications'); // notifications | support
  const [loading, setLoading] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [showNewMessageForm, setShowNewMessageForm] = useState(false);
  const [newMessageData, setNewMessageData] = useState({
    subject: '',
    messageText: ''
  });
  const [newMessageFiles, setNewMessageFiles] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [replyFiles, setReplyFiles] = useState([]);
  const [sendingReply, setSendingReply] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalData, setAlertModalData] = useState({ title: '', message: '' });
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReplyEmojiPicker, setShowReplyEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const replyEmojiPickerRef = useRef(null);
  const [fullscreenAttachment, setFullscreenAttachment] = useState(null);
  const [attachmentBlobs, setAttachmentBlobs] = useState({}); // Кэш blob URL для вложений
  
  // Ref для контейнера сообщений для автоматической прокрутки
  const messagesContainerRef = useRef(null);
  const conversationDetailMessagesRef = useRef(null);
  const [isNewMessage, setIsNewMessage] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  // Состояния для мобильной шторки и окна чата
  const [isChatOpen, setIsChatOpen] = useState(false); // Открыто ли окно чата
  const [drawerPosition, setDrawerPosition] = useState(0); // Позиция шторки (0 = открыта, 100 = закрыта)
  const drawerRef = useRef(null); // Ref для шторки
  const [isDragging, setIsDragging] = useState(false); // Идет ли перетаскивание
  const [dragStartY, setDragStartY] = useState(null); // Начальная позиция при перетаскивании
  const [dragStartPosition, setDragStartPosition] = useState(null); // Начальная позиция шторки при перетаскивании
  
  // Функция для прокрутки к последнему сообщению
  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }, 100);
    }
  };
  
  // Функция для прокрутки к первому сообщению
  const scrollToTop = () => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current.scrollTop = 0;
      }, 100);
    }
  };

  // Обработка выбора эмодзи для формы нового обращения
  const handleEmojiSelect = (emoji) => {
    setNewMessageData(prev => ({
      ...prev,
      messageText: prev.messageText + emoji
    }));
    setShowEmojiPicker(false);
  };

  // Закрытие эмодзи пикера при клике вне его (работает на десктопе и мобильных)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      // Добавляем обработчики для десктопа и мобильных
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
      };
    }
  }, [showEmojiPicker]);
  
  // Определяем мобильный режим (для показа отдельных детальных модалок)
  useEffect(() => {
    const updateView = () => {
      if (typeof window !== 'undefined') {
        setIsMobileView(window.innerWidth <= 768);
      }
    };
    updateView();
    window.addEventListener('resize', updateView);
    return () => window.removeEventListener('resize', updateView);
  }, []);

  // Функция для подсчета непрочитанных обращений
  const calculateUnreadConversationsCount = (conversationsList) => {
    const count = conversationsList.reduce((total, conv) => {
      return total + (conv.unread_count_user || 0);
    }, 0);
    return count;
  };

  // Загрузка всех сообщений
  useEffect(() => {
    loadMessages();
    loadConversations();
  }, []); // Загружаем только при монтировании

  // Очистка blob URL при размонтировании компонента
  useEffect(() => {
    return () => {
      // Очищаем все blob URLs только при размонтировании компонента
      setAttachmentBlobs(currentBlobs => {
        Object.values(currentBlobs).forEach(blobUrl => {
          if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
          }
        });
        return {};
      });
    };
  }, []); // Пустой массив зависимостей - эффект срабатывает только при размонтировании
  
  // Прокрутка при изменении сообщений
  useEffect(() => {
    if (conversationMessages.length > 0) {
      if (isNewMessage) {
        // Если пришло новое сообщение - прокручиваем к концу
        scrollToBottom();
        setIsNewMessage(false); // Сбрасываем флаг
      } else {
        // Если это первая загрузка - прокручиваем к последнему сообщению
        scrollToBottom();
      }
    }
  }, [conversationMessages, isNewMessage]);

  // Прокрутка для мобильного окна чата
  useEffect(() => {
    if (isMobileView && isChatOpen && conversationDetailMessagesRef.current && conversationMessages.length > 0) {
      setTimeout(() => {
        if (conversationDetailMessagesRef.current) {
          conversationDetailMessagesRef.current.scrollTop = conversationDetailMessagesRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [conversationMessages, isChatOpen, isMobileView]);
  
  // Автоматическая прокрутка к форме нового обращения при её открытии
  useEffect(() => {
    if (showNewMessageForm && newMessageFormRef.current) {
      // Небольшая задержка для завершения рендеринга
      setTimeout(() => {
        if (newMessageFormRef.current) {
          newMessageFormRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
    }
  }, [showNewMessageForm]);
  
  // Закрытие эмодзи-пикера при клике вне его области (для нового сообщения) - работает на десктопе и мобильных
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    
    // Добавляем обработчики для десктопа и мобильных
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showEmojiPicker]);
  
  // Закрытие эмодзи-пикера при клике вне его области (для ответа) - работает на десктопе и мобильных
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showReplyEmojiPicker && replyEmojiPickerRef.current && !replyEmojiPickerRef.current.contains(event.target)) {
        setShowReplyEmojiPicker(false);
      }
    };
    
    // Добавляем обработчики для десктопа и мобильных
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showReplyEmojiPicker]);

  // Сброс позиции шторки при переключении на вкладку "ОБРАЩЕНИЯ" в мобильной версии
  useEffect(() => {
    if (isMobileView && activeTab === 'support') {
      // Рассчитываем позицию шторки до нижнего края messages-modal-content
      setTimeout(() => {
        const contentElement = document.querySelector('.messages-modal-content');
        const drawerElement = drawerRef.current;
        
        if (contentElement && drawerElement) {
          const contentRect = contentElement.getBoundingClientRect();
          const drawerRect = drawerElement.getBoundingClientRect();
          const viewportHeight = window.innerHeight;
          
          // Вычисляем, на сколько процентов нужно поднять шторку, чтобы ее верхний край был на уровне нижнего края content
          // contentRect.bottom - это расстояние от верха viewport до нижнего края content
          // drawerRect.height - это высота шторки
          // Нужно поднять шторку так, чтобы ее верхняя граница была на уровне contentRect.bottom
          const contentBottom = contentRect.bottom;
          const drawerHeight = drawerRect.height;
          
          // Позиция в процентах: ((drawerHeight - contentBottom) / drawerHeight) * 100
          // Если contentBottom = 200px, а drawerHeight = 600px, то нужно поднять на (600 - 200) / 600 * 100 = 66.67%
          const positionPercent = ((drawerHeight - contentBottom) / drawerHeight) * 100;
          
          // Ограничиваем от 0 до 100
          const clampedPosition = Math.max(0, Math.min(100, positionPercent));
          
          setDrawerPosition(clampedPosition);
          setIsChatOpen(false);
        } else {
          // Fallback: полностью открываем шторку
          setDrawerPosition(0);
          setIsChatOpen(false);
        }
      }, 100);
    }
  }, [activeTab, isMobileView]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      const { data } = await axiosAPI.get('/profile/notifications?all=true');
      const list = Array.isArray(data?.notifications) ? data.notifications : [];
      
      const sorted = list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setMessages(sorted);
      
      if (sorted.length > 0 && activeTab === 'notifications') {
        setSelectedMessage(sorted[0]);
      }
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    try {
      console.log('Frontend: Загрузка обращений из /profile/support/conversations');
      const { data } = await axiosAPI.get('/profile/support/conversations');
      console.log('Frontend: Получено обращений:', data);
      const list = Array.isArray(data?.conversations) ? data.conversations : [];
      console.log('Frontend: Обработано обращений:', list.length);
      
      // Сортировка бесед по приоритету, затем по дате создания, затем по дате последнего сообщения
      const sorted = list.sort((a, b) => {
        // Определяем есть ли непрочитанные сообщения
        const aHasUnread = (a.unread_count_user || 0) > 0;
        const bHasUnread = (b.unread_count_user || 0) > 0;
        
        // 1. Сначала беседы с новыми сообщениями (непрочитанными)
        if (aHasUnread && !bHasUnread) return -1;
        if (!aHasUnread && bHasUnread) return 1;
        
        // 2. Если обе беседы имеют непрочитанные сообщения - сортируем по времени последнего сообщения (новые сверху)
        if (aHasUnread && bHasUnread) {
          const lastMessageDiff = new Date(b.last_message_at) - new Date(a.last_message_at);
          if (lastMessageDiff !== 0) return lastMessageDiff;
        }
        
        // 3. Если обе беседы без непрочитанных - сортируем по приоритету
        if (!aHasUnread && !bHasUnread) {
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
          if (priorityDiff !== 0) return priorityDiff;
        }
        
        // 4. При одинаковом приоритете - по дате создания (новые сверху)
        const createdDiff = new Date(b.createdAt) - new Date(a.createdAt);
        if (createdDiff !== 0) return createdDiff;
        
        // 5. При одинаковой дате создания - по дате последнего сообщения
        return new Date(b.last_message_at) - new Date(a.last_message_at);
      });
      setConversations(sorted);
      
      // Обновляем счетчик непрочитанных обращений
      const unreadCount = calculateUnreadConversationsCount(sorted);
      setUnreadConversationsCount(unreadCount);
    } catch (error) {
      console.error('Frontend: Ошибка загрузки обращений:', error);
      console.error('Frontend: Response:', error.response);
    }
  };

  const loadConversationMessages = async (conversationId) => {
    try {
      const { data } = await axiosAPI.get(`/profile/support/conversations/${conversationId}/messages`);
      const messages = data.messages || [];
      
      // КРИТИЧНО: Сохраняем временные сообщения (оптимистичные) при обновлении
      setConversationMessages(prev => {
        // Находим временные сообщения (с ID начинающимся с 'temp-')
        const tempMessages = prev.filter(msg => msg.id && msg.id.toString().startsWith('temp-'));
        
        // Объединяем временные сообщения с новыми данными с сервера
        // Удаляем дубликаты по ID
        const existingIds = new Set(messages.map(m => m.id));
        const uniqueTempMessages = tempMessages.filter(msg => !existingIds.has(msg.id));
        
        // Объединяем: сначала временные, потом реальные сообщения
        const mergedMessages = [...uniqueTempMessages, ...messages];
        
        // Сортируем по времени создания
        return mergedMessages.sort((a, b) => {
          const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
          const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
          return timeA - timeB;
        });
      });
      
      // Загружаем вложения как blob для изображений, видео и аудио
      // Сначала очищаем старые blob URLs для этой темы (на случай, если они были отозваны)
      setAttachmentBlobs(prev => {
        const updated = { ...prev };
        // Очищаем blob URLs для текущей темы, чтобы пересоздать их
        Object.keys(updated).forEach(key => {
          if (key.startsWith(`${conversationId}_`)) {
            if (updated[key]) {
              try {
                URL.revokeObjectURL(updated[key]);
              } catch (e) {
                // Игнорируем ошибки при отзыве (blob URL может быть уже отозван)
              }
            }
            delete updated[key];
          }
        });
        return updated;
      });
      
      // Теперь загружаем новые blob URLs
      const newBlobs = {};
      
      for (const msg of messages) {
        const attachments = parseAttachments(msg.attachments);
        if (attachments && attachments.length > 0) {
          for (const attachment of attachments) {
            const fileType = getFileType(attachment);
            if (fileType === 'image' || fileType === 'video' || fileType === 'audio') {
              const fileName = attachment.split('/').pop();
              const url = getAttachmentUrl(attachment, conversationId);
              const blobKey = `${conversationId}_${fileName}`;
              
              // Всегда создаем новый blob URL (старые уже очищены)
              try {
                const response = await axiosAPI.get(url, { responseType: 'blob' });
                const blob = new Blob([response.data]);
                const blobUrl = URL.createObjectURL(blob);
                newBlobs[blobKey] = blobUrl;
              } catch (error) {
                console.error(`Ошибка загрузки вложения ${fileName}:`, error);
              }
            }
          }
        }
      }
      
      // Обновляем кэш blob URLs
      if (Object.keys(newBlobs).length > 0) {
        setAttachmentBlobs(prev => ({ ...prev, ...newBlobs }));
      }
      
      // Прокручиваем к последнему сообщению после загрузки
      scrollToBottom();
    } catch (error) {
      console.error('Ошибка загрузки сообщений беседы:', error);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setSelectedMessage(null);
    setIsNewMessage(false); // Сбрасываем флаг нового сообщения
    await loadConversationMessages(conversation.id);
    
    // Отмечаем сообщения как прочитанные на сервере
    if (conversation.unread_count_user > 0) {
      try {
        await axiosAPI.post(`/profile/support/conversations/${conversation.id}/read`);
        console.log(`✅ MessagesModal: Сообщения беседы ${conversation.id} отмечены как прочитанные`);
        
        // Отправляем событие для обновления клиентского бейджа в main.jsx
        const event = new CustomEvent('client-messages-read', { 
          detail: { conversationId: conversation.id, unreadCount: conversation.unread_count_user }
        });
        document.dispatchEvent(event);
        console.log('🔔 MessagesModal: Отправлено событие client-messages-read');
      } catch (error) {
        console.error('Ошибка отметки сообщений как прочитанных:', error);
      }
    }
    
    // Обнуляем счетчик непрочитанных локально
    setConversations(prev => {
      const updated = prev.map(conv => 
        conv.id === conversation.id ? { ...conv, unread_count_user: 0 } : conv
      );
      
      // Обновляем общий счетчик непрочитанных обращений
      const unreadCount = calculateUnreadConversationsCount(updated);
      setUnreadConversationsCount(unreadCount);
      
      return updated;
    });
  };

  // WebSocket слушатель для новых сообщений от админа
  const handleNewMessage = useCallback(async (event) => {
    console.log('MessagesModal: Получено новое сообщение от админа:', event.detail);
    
    // Перезагружаем список обращений (обновится счетчик непрочитанных)
    await loadConversations();
    
    // Если открыта эта беседа - обновляем сообщения
    if (selectedConversation && selectedConversation.id === event.detail.conversationId) {
      setIsNewMessage(true); // Устанавливаем флаг нового сообщения
      
      // Если в событии есть само сообщение - добавляем его оптимистично
      if (event.detail.message) {
        setConversationMessages(prev => {
          const existingMessages = prev || [];
          // Проверяем, что сообщение еще не добавлено
          const messageExists = existingMessages.find(m => m.id === event.detail.message.id);
          if (!messageExists) {
            console.log('MessagesModal: Добавляем новое сообщение от админа в состояние');
            return [...existingMessages, event.detail.message];
          }
          console.log('MessagesModal: Сообщение уже существует, пропускаем');
          return prev;
        });
        // Прокручиваем к новому сообщению
        scrollToBottom();
      } else {
        // Если сообщения нет в событии - перезагружаем все сообщения
        console.log('MessagesModal: Сообщение не найдено в событии, перезагружаем все сообщения');
        await loadConversationMessages(event.detail.conversationId);
      }
    }
  }, [selectedConversation, loadConversations, loadConversationMessages, scrollToBottom]);

  // WebSocket слушатель для новых бесед (когда пользователь создает новое обращение)
  const handleNewConversation = useCallback(async (event) => {
    console.log('MessagesModal: Получена новая беседа:', event.detail);
    
    // Добавляем новую беседу в список, если её еще нет
    if (event.detail.conversation) {
      setConversations(prev => {
        const existingConversation = prev.find(c => c.id === event.detail.conversation.id);
        if (!existingConversation) {
          console.log('MessagesModal: Добавляем новую беседу в список');
          // Добавляем новую беседу в начало списка
          return [event.detail.conversation, ...prev];
        }
        console.log('MessagesModal: Беседа уже существует в списке');
        return prev;
      });
      
      // Если есть новое сообщение в событии - обновляем сообщения, если беседа открыта
      if (event.detail.message && selectedConversation && selectedConversation.id === event.detail.conversation.id) {
        setConversationMessages(prev => {
          const existingMessages = prev || [];
          const messageExists = existingMessages.find(m => m.id === event.detail.message.id);
          if (!messageExists) {
            console.log('MessagesModal: Добавляем новое сообщение в открытую беседу');
            return [...existingMessages, event.detail.message];
          }
          return prev;
        });
        scrollToBottom();
      }
    }
    
    // Также перезагружаем список для синхронизации
    await loadConversations();
  }, [selectedConversation, loadConversations, scrollToBottom]);

  // Подписка на WebSocket события
  useEffect(() => {
    document.addEventListener('support-new-message', handleNewMessage);
    document.addEventListener('support-new-conversation', handleNewConversation);

    return () => {
      document.removeEventListener('support-new-message', handleNewMessage);
      document.removeEventListener('support-new-conversation', handleNewConversation);
    };
  }, [handleNewMessage, handleNewConversation]);

  const handleSelectMessage = async (message) => {
    setSelectedMessage(message);
    setSelectedConversation(null);
    // Всегда открываем модалку с детальным просмотром уведомления
    setShowNotificationDetail(true);

    if (message.status !== 'read') {
      try {
        await axiosAPI.put(`/profile/notifications/${message.id}/read`);
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, status: 'read' } : m
        ));
      } catch (error) {
        console.error('Ошибка пометки как прочитанного:', error);
      }
    }
  };

  const handleOpenReport = () => {
    if (selectedMessage?.type === 'POST') {
      try {
        const data = typeof selectedMessage.description === 'string' 
          ? JSON.parse(selectedMessage.description) 
          : selectedMessage.description;
        setReportData(data);
        setShowReportModal(true);
      } catch (error) {
        console.error('Ошибка парсинга данных отчета:', error);
      }
    }
  };

  const newMessageFormRef = useRef(null);
  
  const handleOpenNewMessageForm = useCallback(() => {
    setShowNewMessageForm(true);
    setNewMessageData({
      subject: '',
      messageText: ''
    });
    setNewMessageFiles([]);
    
    // На мобильных устройствах: закрываем шторку и чат, прокручиваем к форме
    if (isMobileView) {
      setDrawerPosition(100); // Полностью опускаем шторку
      setIsChatOpen(false); // Закрываем чат
      
      // Прокручиваем к форме нового обращения после небольшой задержки
      setTimeout(() => {
        if (newMessageFormRef.current) {
          newMessageFormRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 350); // Задержка для завершения анимации закрытия шторки
    }
  }, [isMobileView]);

  // Обработчик события для автоматического открытия формы нового обращения
  useEffect(() => {
    const handleOpenNewMessageFormEvent = () => {
      setActiveTab('support');
      handleOpenNewMessageForm();
    };
    
    window.addEventListener('open-new-message-form', handleOpenNewMessageFormEvent);
    
    return () => {
      window.removeEventListener('open-new-message-form', handleOpenNewMessageFormEvent);
    };
  }, [handleOpenNewMessageForm]); // Добавляем handleOpenNewMessageForm в зависимости

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewMessageFiles(prev => [...prev, ...files]);
    // Сбрасываем input, чтобы можно было выбрать тот же файл снова
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setNewMessageFiles(prev => prev.filter((_, i) => i !== index));
  };

  const showAlert = (title, message) => {
    setAlertModalData({ title, message });
    setShowAlertModal(true);
  };

  const handleSendNewMessage = async () => {
    if (!newMessageData.subject.trim() || (!newMessageData.messageText.trim() && newMessageFiles.length === 0)) {
      showAlert('Внимание', 'Заполните тему обращения и текст сообщения или прикрепите файл');
      return;
    }

    console.log('Frontend: Отправка обращения:', newMessageData, 'Файлы:', newMessageFiles);

    try {
      // Создаем FormData для отправки файлов
      const formData = new FormData();
      formData.append('subject', newMessageData.subject);
      formData.append('messageText', newMessageData.messageText || '');
      
      // Добавляем файлы
      newMessageFiles.forEach((file) => {
        formData.append('attachments', file);
      });

      const response = await axiosAPI.post('/profile/support/conversations', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Frontend: Обращение создано успешно:', response.data);
      
      setShowNewMessageForm(false);
      setNewMessageFiles([]);
      
      // На мобильных устройствах: поднимаем шторку после отправки
      if (isMobileView) {
        setDrawerPosition(0); // Поднимаем шторку
        setIsChatOpen(false); // Закрываем чат
      }
      
      console.log('Frontend: Загрузка списка обращений...');
      await loadConversations();
      
      // Переключаемся на вкладку "Обращения" и выбираем новое обращение
      setActiveTab('support');
      if (response.data && response.data.conversation) {
        // Ждем немного, чтобы беседы успели загрузиться
        setTimeout(() => {
          const newConversation = response.data.conversation;
          handleSelectConversation(newConversation);
        }, 500);
      }
      
      showAlert('Успешно', 'Обращение отправлено! Мы ответим вам в ближайшее время.');
    } catch (error) {
      console.error('Frontend: Ошибка отправки обращения:', error);
      console.error('Frontend: Response:', error.response);
      const errorMsg = error.response?.data?.message || error.message || 'Ошибка отправки сообщения';
      showAlert('Ошибка', errorMsg);
    }
  };

  const handleSendReply = async () => {
    if ((!replyText.trim() && replyFiles.length === 0) || !selectedConversation) return;

    try {
      setSendingReply(true);
      
      // КРИТИЧНО: Оптимистичное обновление - добавляем сообщение СРАЗУ, до отправки на сервер
      const tempMessageId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempMessageId,
        conversation_id: selectedConversation.id,
        sender_type: 'user',
        sender_name: 'Вы',
        message_text: replyText.trim(),
        createdAt: new Date().toISOString(),
        attachments: replyFiles.map(file => ({ 
          name: file.name, 
          size: file.size, 
          type: file.type 
        })),
        is_read_user: true,
        is_read_admin: false,
      };

      // Добавляем сообщение в состояние сразу
      setConversationMessages(prev => {
        // Проверяем, что сообщение еще не добавлено
        if (!prev.find(m => m.id === tempMessageId)) {
          return [...prev, optimisticMessage];
        }
        return prev;
      });
      setIsNewMessage(true);
      scrollToBottom(); // Прокручиваем к новому сообщению
      
      const formData = new FormData();
      formData.append('messageText', replyText);

      // Добавляем файлы
      replyFiles.forEach((file) => {
        formData.append('attachments', file);
      });
      
      const response = await axiosAPI.post(`/profile/support/conversations/${selectedConversation.id}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setReplyText('');
      setReplyFiles([]);
      
      // После успешной отправки перезагружаем сообщения для получения полных данных (вложения, реальный ID и т.д.)
      await loadConversationMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      console.error('Ошибка отправки ответа:', error);
      const errorMsg = error.response?.data?.message || 'Ошибка отправки ответа';
      showAlert('Ошибка', errorMsg);
      
      // Удаляем оптимистичное сообщение при ошибке
      setConversationMessages(prev => prev.filter(msg => msg.id !== tempMessageId));
    } finally {
      setSendingReply(false);
    }
  };

  // Закрытие детального окна беседы
  const handleCloseConversationDetail = () => {
    setShowConversationDetail(false);
  };

  // Обработка выбора беседы в мобильной версии
  const handleMobileConversationSelect = async (conversation) => {
    await handleSelectConversation(conversation);
    setIsChatOpen(true);
    // Закрываем шторку до уровня counter
    // Используем setTimeout чтобы элемент был отрендерен
    setTimeout(() => {
      const counterElement = document.getElementById('mobile-drawer-counter');
      if (counterElement && drawerRef.current) {
        const counterRect = counterElement.getBoundingClientRect();
        const drawerRect = drawerRef.current.getBoundingClientRect();
        const counterBottom = counterRect.bottom;
        const drawerTop = drawerRect.top;
        const position = ((counterBottom - drawerTop) / drawerRect.height) * 100;
        const newPosition = Math.min(100, Math.max(0, 100 - position));
        setDrawerPosition(newPosition);
      } else {
        setDrawerPosition(85); // Fallback - поднимаем до уровня counter (примерно)
      }
    }, 100);
  };

  // Обработка кнопки "назад" в мобильной версии
  const handleMobileBack = () => {
    setIsChatOpen(false);
    setDrawerPosition(0); // Открываем шторку (0% = полностью открыта)
  };

  // Обработчики для ручного управления шторкой
  const handleDrawerMouseDown = (e) => {
    if (!isMobileView || activeTab !== 'support') return;
    setIsDragging(true);
    const touchY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
    if (touchY === null) return;
    setDragStartY(touchY);
    setDragStartPosition(drawerPosition);
    e.preventDefault();
  };

  const handleDrawerMouseMove = (e) => {
    if (!isDragging || !isMobileView || activeTab !== 'support') return;
    const currentY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : null);
    if (currentY === null || dragStartY === null || dragStartPosition === null) return;
    
    const deltaY = dragStartY - currentY; // Положительное значение = движение вверх (шторка поднимается)
    const drawerHeight = drawerRef.current ? drawerRef.current.offsetHeight : window.innerHeight;
    
    // Вычисляем процент перемещения относительно высоты шторки
    const deltaPercent = (deltaY / drawerHeight) * 100;
    
    let newPosition = dragStartPosition - deltaPercent; // Уменьшаем позицию при движении вверх
    newPosition = Math.max(0, Math.min(100, newPosition)); // Ограничиваем от 0 до 100
    
    setDrawerPosition(newPosition);
    
    // Если шторка поднята более чем на 85%, показываем чат
    if (newPosition < 15) {
      setIsChatOpen(true);
    } else {
      setIsChatOpen(false);
    }
    
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrawerMouseUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    if (dragStartY === null || dragStartPosition === null) {
      setDragStartY(null);
      setDragStartPosition(null);
      return;
    }
    
    // Получаем текущую позицию мыши/пальца
    const currentY = e?.clientY || (e?.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientY : null);
    if (currentY === null) {
      // Если не можем определить позицию, используем текущую позицию шторки
      if (drawerPosition < 50) {
        // Поднимаем до уровня counter
        const counterElement = document.getElementById('mobile-drawer-counter');
        if (counterElement && drawerRef.current) {
          const counterRect = counterElement.getBoundingClientRect();
          const drawerRect = drawerRef.current.getBoundingClientRect();
          const counterBottom = counterRect.bottom;
          const drawerTop = drawerRect.top;
          const position = ((counterBottom - drawerTop) / drawerRect.height) * 100;
          setDrawerPosition(Math.min(100, Math.max(0, 100 - position)));
        } else {
          setDrawerPosition(15);
        }
        setIsChatOpen(true);
      } else {
        setDrawerPosition(0);
        setIsChatOpen(false);
      }
      setDragStartY(null);
      setDragStartPosition(null);
      return;
    }
    
    // Вычисляем реальное перемещение в пикселях
    const deltaY = dragStartY - currentY; // Положительное = движение вверх (шторка поднимается)
    
    // Минимальный порог для автоматического закрытия/открытия (в пикселях)
    // Уменьшен до 15px для очень чувствительной реакции
    const threshold = 15; // 15px - минимальное движение
    
    // Определяем направление движения
    const movedDown = deltaY < -threshold; // Потянули вниз (шторка закрывается)
    const movedUp = deltaY > threshold; // Потянули вверх (шторка открывается)
    
    // Если потянули вниз (закрываем шторку)
    if (movedDown) {
      // Закрываем шторку до уровня counter
      const counterElement = document.getElementById('mobile-drawer-counter');
      if (counterElement && drawerRef.current) {
        const counterRect = counterElement.getBoundingClientRect();
        const drawerRect = drawerRef.current.getBoundingClientRect();
        const counterBottom = counterRect.bottom;
        const drawerTop = drawerRect.top;
        const position = ((counterBottom - drawerTop) / drawerRect.height) * 100;
        setDrawerPosition(Math.min(100, Math.max(0, 100 - position)));
      } else {
        setDrawerPosition(15); // Fallback - поднимаем до уровня counter
      }
      setIsChatOpen(true);
    }
    // Если потянули вверх (открываем шторку)
    else if (movedUp) {
      setDrawerPosition(0); // Открываем полностью
      setIsChatOpen(false);
    }
    // Если движение было недостаточным, определяем по текущей позиции
    else if (drawerPosition < 50) {
      // Поднимаем до уровня counter
      const counterElement = document.getElementById('mobile-drawer-counter');
      if (counterElement && drawerRef.current) {
        const counterRect = counterElement.getBoundingClientRect();
        const drawerRect = drawerRef.current.getBoundingClientRect();
        const counterBottom = counterRect.bottom;
        const drawerTop = drawerRect.top;
        const position = ((counterBottom - drawerTop) / drawerRect.height) * 100;
        setDrawerPosition(Math.min(100, Math.max(0, 100 - position)));
      } else {
        setDrawerPosition(15); // Fallback - поднимаем до уровня counter
      }
      setIsChatOpen(true);
    } else {
      setDrawerPosition(0); // Опускаем полностью
      setIsChatOpen(false);
    }
    
    setDragStartY(null);
    setDragStartPosition(null);
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Добавляем обработчики для touch событий
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDrawerMouseMove);
      document.addEventListener('mouseup', handleDrawerMouseUp);
      document.addEventListener('touchmove', handleDrawerMouseMove);
      document.addEventListener('touchend', handleDrawerMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleDrawerMouseMove);
        document.removeEventListener('mouseup', handleDrawerMouseUp);
        document.removeEventListener('touchmove', handleDrawerMouseMove);
        document.removeEventListener('touchend', handleDrawerMouseUp);
      };
    }
  }, [isDragging, dragStartY, dragStartPosition, drawerPosition, isMobileView, activeTab]);
  
  // Обработка выбора файлов для ответа
  const handleReplyFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setReplyFiles(prev => [...prev, ...files]);
    e.target.value = ''; // Сбрасываем input
  };
  
  // Удаление файла из списка ответа
  const handleReplyRemoveFile = (index) => {
    setReplyFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // Вставка эмодзи в поле ответа
  const handleReplyEmojiSelect = (emoji) => {
    setReplyText(prev => prev + emoji);
    setShowReplyEmojiPicker(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Функция для получения иконки по типу уведомления
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'INFO':
        return 'ℹ️';
      case 'POST':
        return '📊';
      case 'ERROR':
        return '❌';
      case 'SUCCESS':
        return '✅';
      case 'ATTENTION':
        return '⚠️';
      default:
        return '📬';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'normal': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'open': return 'Открыто';
      case 'in_progress': return 'В работе';
      case 'resolved': return 'Решено';
      case 'closed': return 'Закрыто';
      default: return status;
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'itc': 
        return <img src={itcIcon} alt="ITC" className="channel-icon" />;
      case 'telegram': 
        return <img src={telegramIcon} alt="Telegram" className="channel-icon" />;
      case 'email': 
        return <img src={postIcon} alt="Email" className="channel-icon" />;
      default: 
        return <img src={itcIcon} alt="ITC" className="channel-icon" />;
    }
  };
  
  const getChannelIconText = (channel) => {
    // Для текстовых мест, где нужен только текст без img
    switch (channel) {
      case 'itc': return '💬';
      case 'telegram': return '📱';
      case 'email': return '📧';
      default: return '💬';
    }
  };

  const getChannelName = (channel) => {
    switch (channel) {
      case 'itc': return 'ITC';
      case 'telegram': return 'Telegram';
      case 'email': return 'Email';
      default: return 'ITC';
    }
  };

  // Проверяем, можно ли отправлять сообщения в эту беседу
  const canSendMessage = (conversation) => {
    // Отправлять сообщения можно только через канал ITC
    return conversation.channel === 'itc' || !conversation.channel;
  };

  // Функция для парсинга вложений из сообщения
  const parseAttachments = (attachments) => {
    if (!attachments) return [];
    
    let parsed = attachments;
    if (typeof attachments === 'string') {
      try {
        parsed = JSON.parse(attachments);
      } catch {
        // Если не JSON, возможно это PostgreSQL array string формата "{item1,item2}"
        if (attachments.startsWith('{') && attachments.endsWith('}')) {
          parsed = attachments.slice(1, -1).split(',').map(item => item.trim().replace(/^"|"$/g, ''));
        } else {
          parsed = [];
        }
      }
    }
    
    if (!Array.isArray(parsed)) {
      parsed = parsed ? [parsed] : [];
    }
    
    return parsed;
  };

  // Функция для получения URL файла
  const getAttachmentUrl = (attachment, conversationId) => {
    if (!attachment) return '';
    
    const fileName = attachment.split('/').pop();
    
    // Если это вложение из email - используем API endpoint
    if (attachment.includes('storage/email/attachments')) {
      // Извлекаем emailId из пути: storage/email/attachments/{emailId}/{filename}
      const parts = attachment.split('/');
      const emailIdIndex = parts.indexOf('attachments');
      if (emailIdIndex !== -1 && parts[emailIdIndex + 1]) {
        const emailId = parts[emailIdIndex + 1];
        return `/profile/email/attachments/${emailId}/${encodeURIComponent(fileName)}`;
      }
      // Fallback: если не удалось извлечь emailId
      console.warn('MessagesModal: Не удалось извлечь emailId из пути:', attachment);
      return '';
    }
    
    // Для вложений из поддержки всегда используем API endpoint
    if (attachment.includes('storage/support/attachments')) {
      return `/profile/support/attachments/${conversationId}/${encodeURIComponent(fileName)}`;
    }
    
    // Fallback: используем API endpoint для поддержки
    return `/profile/support/attachments/${conversationId}/${encodeURIComponent(fileName)}`;
  };

  // Функция для определения типа файла
  const getFileType = (attachment) => {
    // Если attachment - это объект (из оптимистичного сообщения), пропускаем
    if (typeof attachment !== 'string') {
      return null;
    }
    
    const fileName = attachment.split('/').pop();
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      return 'image';
    }
    if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) {
      return 'video';
    }
    if (['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'wma'].includes(ext)) {
      return 'audio';
    }
    return 'file';
  };

  // Функция для получения blob URL для изображений, видео и аудио
  const getAttachmentBlobUrl = (attachment, conversationId) => {
    if (!attachment) return '';
    
    const fileName = attachment.split('/').pop();
    const fileType = getFileType(attachment);
    
    // Для изображений, видео и аудио используем blob URL из кэша
    if (fileType === 'image' || fileType === 'video' || fileType === 'audio') {
      const blobKey = `${conversationId}_${fileName}`;
      return attachmentBlobs[blobKey] || '';
    }
    
    // Для других файлов используем обычный URL
    return getAttachmentUrl(attachment, conversationId);
  };

  return (
    <div className="messages-modal-overlay" onClick={onClose}>
      <div className="messages-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Заголовок с вкладками */}
        <div className="messages-modal-header">
          <div className="messages-modal-title-bar">
            <h2 className="messages-modal-title">📬 Сообщения</h2>
            <button className="messages-modal-close-btn" onClick={onClose}>×</button>
          </div>

          {/* Вкладки */}
          <div className="messages-modal-tabs">
            <button
              className={`messages-modal-tab ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('notifications');
                setSelectedConversation(null);
              }}
            >
              📢 Уведомления ({messages.length})
            </button>
            <button
              className={`messages-modal-tab ${activeTab === 'support' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('support');
                setSelectedMessage(null);
                // Позиция шторки будет рассчитана автоматически в useEffect
              }}
              style={{ position: 'relative' }}
            >
              💬 Обращения ({conversations.length})
              {unreadConversationsCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#f44336',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  border: '2px solid #141414'
                }}>
                  {unreadConversationsCount > 99 ? '99+' : unreadConversationsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Основной контент */}
        <div className="messages-modal-content">
          {/* Для мобильной версии уведомлений - сплошная лента без разделения */}
          {isMobileView && activeTab === 'notifications' ? (
            <div className="mobile-notifications-list">
              <div className="messages-list-counter">
                Уведомлений: {messages.length}
              </div>
              <div className="messages-list-items">
                {loading ? (
                  <div className="messages-list-loading">Загрузка...</div>
                ) : (
                  messages.length === 0 ? (
                    <div className="messages-list-empty">Нет уведомлений</div>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`notification-item ${msg.status === 'sent' ? 'unread' : ''}`}
                        onClick={() => handleSelectMessage(msg)}
                      >
                        <div className="notification-item-header">
                          <span>{getNotificationIcon(msg.type)}</span>
                          <span className="notification-item-date">{formatDate(msg.createdAt)}</span>
                        </div>
                        <div className="notification-item-subject">
                          {msg.header || 'Без заголовка'}
                        </div>
                        {msg.status === 'sent' && (
                          <div className="notification-item-new-badge">• Новое</div>
                        )}
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          ) : (
            <>
              {/* ЗОНА 1: Список (для десктопа и обращений на мобиле) */}
              <div className={`messages-list-zone ${isMobileView && activeTab === 'support' ? 'mobile-drawer-list' : ''}`}>
                {/* Кнопка "Написать сообщение" */}
                {activeTab === 'support' && (
                  <div className="messages-list-new-btn-container">
                    <button className="messages-list-new-btn" onClick={handleOpenNewMessageForm}>
                      ✉️ Новое обращение
                    </button>
                  </div>
                )}

                <div className="messages-list-counter" ref={activeTab === 'support' && isMobileView ? null : undefined}>
                  {activeTab === 'notifications' && `Уведомлений: ${messages.length}`}
                  {activeTab === 'support' && `Обращений: ${conversations.length}`}
                </div>

                <div className="messages-list-items">
                  {loading ? (
                    <div className="messages-list-loading">Загрузка...</div>
                  ) : (
                    <>
                      {/* Список уведомлений (только для десктопа) */}
                      {!isMobileView && activeTab === 'notifications' && (
                        messages.length === 0 ? (
                          <div className="messages-list-empty">Нет уведомлений</div>
                        ) : (
                          messages.map(msg => (
                            <div
                              key={msg.id}
                              className={`notification-item ${selectedMessage?.id === msg.id ? 'active' : ''} ${msg.status === 'sent' ? 'unread' : ''}`}
                              onClick={() => handleSelectMessage(msg)}
                            >
                              <div className="notification-item-header">
                                <span>{getNotificationIcon(msg.type)}</span>
                                <span className="notification-item-date">{formatDate(msg.createdAt)}</span>
                              </div>
                              <div className="notification-item-subject">
                                {msg.header || 'Без заголовка'}
                              </div>
                              {msg.status === 'sent' && (
                                <div className="notification-item-new-badge">• Новое</div>
                              )}
                            </div>
                          ))
                        )
                      )}
                      
                      {/* Список обращений */}
                      {activeTab === 'support' && (
                        conversations.length === 0 ? (
                          <div className="messages-list-empty">Нет обращений</div>
                        ) : (
                          conversations.map(conv => (
                            <div
                              key={conv.id}
                              className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation(); // Предотвращаем всплытие события
                                if (isMobileView) {
                                  handleMobileConversationSelect(conv);
                                } else {
                                  handleSelectConversation(conv);
                                }
                              }}
                            >
                              <div className="conversation-item-header">
                                <span className="conversation-item-priority">{getPriorityIcon(conv.priority)}</span>
                                <span className="conversation-item-id">#{conv.id}</span>
                                <span className="conversation-item-channel" title={getChannelName(conv.channel || 'itc')}>
                                  {getChannelIcon(conv.channel || 'itc')}
                                </span>
                                {conv.unread_count_user > 0 && (
                                  <span className="conversation-item-unread-badge">{conv.unread_count_user}</span>
                                )}
                              </div>
                              <div className={`conversation-item-subject ${conv.unread_count_user > 0 ? 'unread' : ''}`}>
                                {conv.subject}
                              </div>
                              <div className="conversation-item-date">{formatDate(conv.last_message_at)}</div>
                              <div className="conversation-item-status">{getStatusText(conv.status)}</div>
                            </div>
                          ))
                        )
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ЗОНА 2: Просмотр (только для десктопа) */}
              {!isMobileView && (
                <div className="messages-view-zone">
            {activeTab === 'notifications' ? (
              !selectedMessage ? (
                <div className="messages-view-empty">Выберите уведомление для просмотра</div>
              ) : (
                <>
                  <div className="messages-view-header">
                    <div className="messages-view-title-row">
                      <span style={{ fontSize: '24px' }}>{getNotificationIcon(selectedMessage.type)}</span>
                      <h3 className="messages-view-title">{selectedMessage.header || 'Без заголовка'}</h3>
                    </div>
                    <div className="messages-view-meta">{formatDate(selectedMessage.createdAt)}</div>
                  </div>

                  <div className="notification-view-content">
                    {selectedMessage.type === 'INFO' || selectedMessage.type === 'ERROR' || selectedMessage.type === 'SUCCESS' || selectedMessage.type === 'ATTENTION' ? (
                      <div className="notification-view-text">{selectedMessage.description}</div>
                    ) : selectedMessage.type === 'POST' ? (
                      <div>
                        <div className="notification-view-report-desc">
                          Отчет о доходности по вашему инвестиционному счету
                        </div>
                        <button className="notification-view-report-btn" onClick={handleOpenReport}>
                          📊 Открыть отчет
                        </button>
                      </div>
                    ) : (
                      <div className="notification-view-text">{selectedMessage.description || 'Неизвестный тип сообщения'}</div>
                    )}
                  </div>
                </>
              )
            ) : (
              !selectedConversation ? (
                <div className="messages-view-empty">Выберите обращение для просмотра</div>
              ) : (
                <>
                  <div className="messages-view-header conversation">
                    <div className="messages-view-title-row">
                      <h3 className="messages-view-title">{selectedConversation.subject}</h3>
                    </div>
                    <div className="messages-view-meta">
                      Обращение #{selectedConversation.id} • {getStatusText(selectedConversation.status)} • <span className="conversation-header-channel">{getChannelIcon(selectedConversation.channel || 'itc')}</span> {getChannelName(selectedConversation.channel || 'itc')}
                    </div>
                  </div>

                  <div className="conversation-messages" ref={messagesContainerRef}>
                    {conversationMessages.map(msg => (
                      <div
                        key={msg.id}
                        className={`conversation-message ${msg.sender_type === 'user' ? 'user' : msg.is_system_message ? 'system' : 'admin'}`}
                      >
                        <div className="conversation-message-header">
                          <span className="conversation-message-sender">
                            {msg.sender_type === 'user' ? '💼 ' : msg.is_system_message ? '🤖 ' : '👤 '}
                            {msg.sender_name}
                          </span>
                          <span className="conversation-message-time">
                            {new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        {msg.message_text && (
                          <div className="conversation-message-text">{msg.message_text}</div>
                        )}
                        
                        {/* Вложения */}
                        {(() => {
                          const attachments = parseAttachments(msg.attachments);
                          if (!attachments || attachments.length === 0) return null;
                          
                          // Фильтруем только строковые вложения (объекты из оптимистичных сообщений пропускаем)
                          const validAttachments = attachments.filter(att => typeof att === 'string');
                          if (validAttachments.length === 0) return null;
                          
                          return (
                            <div className="conversation-message-attachments">
                              {validAttachments.map((attachment, idx) => {
                                const fileType = getFileType(attachment);
                                if (!fileType) return null; // Пропускаем, если тип не определен
                                
                                const fileUrl = (fileType === 'image' || fileType === 'video' || fileType === 'audio') 
                                  ? getAttachmentBlobUrl(attachment, selectedConversation.id) 
                                  : getAttachmentUrl(attachment, selectedConversation.id);
                                const fileName = attachment.split('/').pop();
                                
                                return (
                                  <div key={idx} className="conversation-attachment-item">
                                    {fileType === 'image' && fileUrl && (
                                      <div 
                                        className="conversation-attachment-image"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setFullscreenAttachment({ url: fileUrl, type: 'image', name: fileName });
                                        }}
                                      >
                                        <img 
                                          src={fileUrl} 
                                          alt={fileName}
                                          loading="lazy"
                                        />
                                      </div>
                                    )}
                                    {fileType === 'video' && fileUrl && (
                                      <div 
                                        className="conversation-attachment-video"
                                        onClick={() => setFullscreenAttachment({ url: fileUrl, type: 'video', name: fileName })}
                                      >
                                        <video src={fileUrl} />
                                        <div className="conversation-attachment-play-icon">▶</div>
                                      </div>
                                    )}
                                    {fileType === 'audio' && fileUrl && (
                                      <div 
                                        className="conversation-attachment-audio"
                                        onClick={() => setFullscreenAttachment({ url: fileUrl, type: 'audio', name: fileName })}
                                      >
                                        <audio src={fileUrl} controls className="conversation-audio-player" onClick={(e) => e.stopPropagation()}>
                                          Ваш браузер не поддерживает аудио элемент.
                                        </audio>
                                        <div className="conversation-audio-filename">{fileName}</div>
                                      </div>
                                    )}
                                    {fileType === 'file' && (
                                      <a 
                                        href="#"
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          try {
                                            console.log('🔗 Начинаем скачивание файла:', {
                                              conversationId: selectedConversation.id,
                                              fileName
                                            });
                                            
                                            // Используем API endpoint для скачивания
                                            const url = `/profile/support/attachments/${selectedConversation.id}/${encodeURIComponent(fileName)}`;
                                            console.log('📥 URL для скачивания:', url);
                                            
                                            const response = await axiosAPI.get(url, {
                                              responseType: 'blob'
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
                                            showAlert('Ошибка', 'Не удалось скачать файл: ' + (error.response?.data?.message || error.message));
                                          }
                                        }}
                                        className="conversation-attachment-file"
                                      >
                                        📎 {fileName}
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    ))}
                  </div>

                  {selectedConversation.status !== 'closed' && canSendMessage(selectedConversation) && (
                    <div className="conversation-reply-input">
                      {/* Список выбранных файлов */}
                      {replyFiles.length > 0 && (
                        <div className="conversation-reply-files">
                          {replyFiles.map((file, index) => (
                            <div key={index} className="conversation-reply-file-item">
                              <span className="conversation-reply-file-name">{file.name}</span>
                              <button
                                className="conversation-reply-file-remove"
                                onClick={() => handleReplyRemoveFile(index)}
                                type="button"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="conversation-reply-textarea-wrapper">
                        <textarea
                          className="conversation-reply-textarea"
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Введите ваш ответ..."
                          rows={3}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendReply();
                            }
                          }}
                        />
                        <button
                          className="conversation-reply-emoji-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReplyEmojiPicker(!showReplyEmojiPicker);
                          }}
                          type="button"
                          title="Добавить эмодзи"
                        >
                          😀
                        </button>
                        {showReplyEmojiPicker && (
                          <div 
                            className="conversation-reply-emoji-picker-wrapper"
                            ref={replyEmojiPickerRef}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <EmojiPicker 
                              onEmojiSelect={handleReplyEmojiSelect}
                              theme="light"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="conversation-reply-actions">
                        <label className="conversation-reply-attach-btn">
                          <input
                            type="file"
                            multiple
                            onChange={handleReplyFileSelect}
                            style={{ display: 'none' }}
                          />
                          📎 Вложение
                        </label>
                        <button
                          className="conversation-reply-btn"
                          onClick={handleSendReply}
                          disabled={(!replyText.trim() && replyFiles.length === 0) || sendingReply}
                        >
                          {sendingReply ? '⏳ Отправка...' : '📤 Отправить'}
                        </button>
                      </div>
                    </div>
                  )}
                  {selectedConversation.status !== 'closed' && !canSendMessage(selectedConversation) && (
                    <div className="conversation-readonly-notice">
                      <p>💡 Это обращение из канала {getChannelName(selectedConversation.channel)}. Вы можете только просматривать сообщения. Для отправки сообщений используйте канал ITC.</p>
                    </div>
                  )}
                </>
              )
            )}
              </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Мобильная версия: шторка с окном чата для обращений */}
      {isMobileView && activeTab === 'support' && (
        <>
          {/* Шторка со списком бесед */}
          <div 
            ref={drawerRef}
            className="mobile-conversations-drawer"
            onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие модального окна
            style={{
              transform: `translateY(${drawerPosition}%)`,
              transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            <div 
              className="mobile-drawer-handle"
              onMouseDown={handleDrawerMouseDown}
              onTouchStart={handleDrawerMouseDown}
            ></div>
            <div className="mobile-drawer-content">
              <div className="messages-list-new-btn-container">
                <button className="messages-list-new-btn" onClick={handleOpenNewMessageForm}>
                  ✉️ Новое обращение
                </button>
              </div>
              <div className="messages-list-counter" id="mobile-drawer-counter">
                Обращений: {conversations.length}
              </div>
              <div className="messages-list-items">
                {loading ? (
                  <div className="messages-list-loading">Загрузка...</div>
                ) : (
                  conversations.length === 0 ? (
                    <div className="messages-list-empty">Нет обращений</div>
                  ) : (
                    conversations.map(conv => (
                      <div
                        key={conv.id}
                        className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation(); // Предотвращаем всплытие события
                          handleMobileConversationSelect(conv);
                        }}
                      >
                        <div className="conversation-item-header">
                          <span className="conversation-item-priority">{getPriorityIcon(conv.priority)}</span>
                          <span className="conversation-item-id">#{conv.id}</span>
                          <span className="conversation-item-channel" title={getChannelName(conv.channel || 'itc')}>
                            {getChannelIcon(conv.channel || 'itc')}
                          </span>
                          {conv.unread_count_user > 0 && (
                            <span className="conversation-item-unread-badge">{conv.unread_count_user}</span>
                          )}
                        </div>
                        <div className={`conversation-item-subject ${conv.unread_count_user > 0 ? 'unread' : ''}`}>
                          {conv.subject}
                        </div>
                        <div className="conversation-item-date">{formatDate(conv.last_message_at)}</div>
                        <div className="conversation-item-status">{getStatusText(conv.status)}</div>
                      </div>
                    ))
                  )
                )}
              </div>
            </div>
          </div>

          {/* Окно чата */}
          {isChatOpen && selectedConversation && (
            <div 
              className="mobile-chat-window"
              onClick={(e) => e.stopPropagation()} // Предотвращаем закрытие модального окна
            >
              <div className="mobile-chat-header">
                <div className="mobile-chat-header-info">
                  <h3 className="mobile-chat-title">{selectedConversation.subject}</h3>
                  <div className="mobile-chat-meta">
                    Обращение #{selectedConversation.id} • {getStatusText(selectedConversation.status)} •{' '}
                    <span className="messages-conversation-header-channel">
                      {getChannelIcon(selectedConversation.channel || 'itc')}
                    </span>{' '}
                    {getChannelName(selectedConversation.channel || 'itc')}
                  </div>
                </div>
                <button
                  className="mobile-chat-close-btn"
                  onClick={handleMobileBack}
                  type="button"
                  title="Закрыть чат"
                >
                  ×
                </button>
              </div>

              <div className="mobile-chat-messages" ref={conversationDetailMessagesRef}>
                {conversationMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`messages-conversation-message ${
                      msg.sender_type === 'user' ? 'user' : msg.is_system_message ? 'system' : 'admin'
                    }`}
                  >
                    <div className="messages-conversation-message-header">
                      <span className="messages-conversation-message-sender">
                        {msg.sender_type === 'user' ? '💼 ' : msg.is_system_message ? '🤖 ' : '👤 '}
                        {msg.sender_name}
                      </span>
                      <span className="messages-conversation-message-time">
                        {new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {msg.message_text && (
                      <div className="messages-conversation-message-text">{msg.message_text}</div>
                    )}

                    {/* Вложения */}
                    {(() => {
                      const attachments = parseAttachments(msg.attachments);
                      if (!attachments || attachments.length === 0) return null;
                      
                      // Фильтруем только строковые вложения (объекты из оптимистичных сообщений пропускаем)
                      const validAttachments = attachments.filter(att => typeof att === 'string');
                      if (validAttachments.length === 0) return null;
                      
                      return (
                        <div className="conversation-message-attachments">
                          {validAttachments.map((attachment, idx) => {
                            const fileType = getFileType(attachment);
                            if (!fileType) return null; // Пропускаем, если тип не определен
                            
                            const fileUrl = (fileType === 'image' || fileType === 'video' || fileType === 'audio') 
                              ? getAttachmentBlobUrl(attachment, selectedConversation.id) 
                              : getAttachmentUrl(attachment, selectedConversation.id);
                            const fileName = attachment.split('/').pop();
                            
                            return (
                              <div key={idx} className="conversation-attachment-item">
                                {fileType === 'image' && fileUrl && (
                                  <div 
                                    className="conversation-attachment-image"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFullscreenAttachment({ url: fileUrl, type: 'image', name: fileName });
                                    }}
                                  >
                                    <img 
                                      src={fileUrl} 
                                      alt={fileName}
                                      loading="lazy"
                                    />
                                  </div>
                                )}
                                {fileType === 'video' && fileUrl && (
                                  <div 
                                    className="conversation-attachment-video"
                                    onClick={() => setFullscreenAttachment({ url: fileUrl, type: 'video', name: fileName })}
                                  >
                                    <video src={fileUrl} />
                                    <div className="conversation-attachment-play-icon">▶</div>
                                  </div>
                                )}
                                {fileType === 'audio' && fileUrl && (
                                  <div 
                                    className="conversation-attachment-audio"
                                    onClick={() => setFullscreenAttachment({ url: fileUrl, type: 'audio', name: fileName })}
                                  >
                                    <audio src={fileUrl} controls className="conversation-audio-player" onClick={(e) => e.stopPropagation()}>
                                      Ваш браузер не поддерживает аудио элемент.
                                    </audio>
                                    <div className="conversation-audio-filename">{fileName}</div>
                                  </div>
                                )}
                                {fileType === 'file' && (
                                  <a 
                                    href="#"
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      try {
                                        const url = `/profile/support/attachments/${selectedConversation.id}/${encodeURIComponent(fileName)}`;
                                        const response = await axiosAPI.get(url, {
                                          responseType: 'blob'
                                        });
                                        const blob = new Blob([response.data]);
                                        const downloadUrl = window.URL.createObjectURL(blob);
                                        const link = document.createElement('a');
                                        link.href = downloadUrl;
                                        link.download = fileName;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        window.URL.revokeObjectURL(downloadUrl);
                                      } catch (error) {
                                        showAlert('Ошибка', 'Не удалось скачать файл: ' + (error.response?.data?.message || error.message));
                                      }
                                    }}
                                    className="conversation-attachment-file"
                                  >
                                    📎 {fileName}
                                  </a>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>

              {selectedConversation.status !== 'closed' && canSendMessage(selectedConversation) && (
                <div className="conversation-reply-input">
                  {replyFiles.length > 0 && (
                    <div className="conversation-reply-files">
                      {replyFiles.map((file, index) => (
                        <div key={index} className="conversation-reply-file-item">
                          <span className="conversation-reply-file-name">{file.name}</span>
                          <button
                            className="conversation-reply-file-remove"
                            onClick={() => handleReplyRemoveFile(index)}
                            type="button"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="conversation-reply-textarea-wrapper">
                    <textarea
                      className="conversation-reply-textarea"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Введите ваш ответ..."
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendReply();
                        }
                      }}
                    />
                    <button
                      className="conversation-reply-emoji-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowReplyEmojiPicker(!showReplyEmojiPicker);
                      }}
                      type="button"
                      title="Добавить эмодзи"
                    >
                      😀
                    </button>
                    {showReplyEmojiPicker && (
                      <div 
                        className="conversation-reply-emoji-picker-wrapper"
                        ref={replyEmojiPickerRef}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <EmojiPicker 
                          onEmojiSelect={handleReplyEmojiSelect}
                          theme="light"
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="conversation-reply-actions">
                    <label className="conversation-reply-attach-btn">
                      <input
                        type="file"
                        multiple
                        onChange={handleReplyFileSelect}
                        style={{ display: 'none' }}
                      />
                      📎 Вложение
                    </label>
                    <button
                      className="mobile-chat-back-btn"
                      onClick={handleMobileBack}
                      type="button"
                      title="Назад к списку"
                    >
                      ← Назад
                    </button>
                    <button
                      className="conversation-reply-btn"
                      onClick={handleSendReply}
                      disabled={(!replyText.trim() && replyFiles.length === 0) || sendingReply}
                    >
                      {sendingReply ? '⏳ Отправка...' : '📤 Отправить'}
                    </button>
                  </div>
                </div>
              )}
              {selectedConversation.status !== 'closed' && !canSendMessage(selectedConversation) && (
                <div className="conversation-readonly-notice">
                  <p>
                    💡 Это обращение из канала {getChannelName(selectedConversation.channel)}. Вы можете только
                    просматривать сообщения. Для отправки сообщений используйте канал ITC.
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Модальное окно отчета */}
      {showReportModal && reportData && (
        <ReportModal 
          reportData={reportData} 
          onClose={() => {
            setShowReportModal(false);
            setReportData(null);
          }} 
        />
      )}

      {/* Форма нового сообщения */}
      {showNewMessageForm && (
        <div className="new-message-form-overlay" onClick={() => setShowNewMessageForm(false)}>
          <div 
            ref={newMessageFormRef}
            className="new-message-form-container" 
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="new-message-form-title">✉️ Новое обращение в поддержку</h2>

            <div className="new-message-form-field">
              <label className="new-message-form-label">Тема обращения:</label>
              <input
                type="text"
                className="new-message-form-input"
                value={newMessageData.subject}
                onChange={(e) => setNewMessageData(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Введите тему обращения"
              />
            </div>

            <div className="new-message-form-field">
              <label className="new-message-form-label">Сообщение:</label>
              <div className="new-message-form-textarea-wrapper" style={{ position: 'relative' }}>
                <textarea
                  className="new-message-form-textarea"
                  value={newMessageData.messageText}
                  onChange={(e) => setNewMessageData(prev => ({ ...prev, messageText: e.target.value }))}
                  placeholder="Опишите ваш вопрос подробно..."
                />
                <div style={{ position: 'absolute', right: '10px', bottom: '10px', zIndex: 10 }}>
                  <button
                    type="button"
                    className="new-message-form-emoji-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowEmojiPicker(!showEmojiPicker);
                    }}
                    title="Добавить эмодзи"
                  >
                    😀
                  </button>
                </div>
                {showEmojiPicker && (
                  <div 
                    ref={emojiPickerRef} 
                    className="new-message-form-emoji-picker-wrapper"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <EmojiPicker 
                      onEmojiSelect={handleEmojiSelect}
                      onClose={() => setShowEmojiPicker(false)}
                      theme="light"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="new-message-form-field">
              <label className="new-message-form-label">Вложения:</label>
              <div className="new-message-form-files-section">
                <label className="new-message-form-file-btn">
                  📎 Прикрепить файл
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                </label>
                {newMessageFiles.length > 0 && (
                  <div className="new-message-form-files-list">
                    {newMessageFiles.map((file, index) => (
                      <div key={index} className="new-message-form-file-item">
                        <span className="new-message-form-file-name">{file.name}</span>
                        <span className="new-message-form-file-size">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          type="button"
                          className="new-message-form-file-remove"
                          onClick={() => handleRemoveFile(index)}
                          title="Удалить файл"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="new-message-form-buttons">
              <button className="new-message-form-cancel-btn" onClick={() => {
                setShowNewMessageForm(false);
                // На мобильных устройствах: поднимаем шторку после отмены
                if (isMobileView) {
                  setDrawerPosition(0); // Поднимаем шторку
                  setIsChatOpen(false); // Закрываем чат
                }
              }}>
                Отмена
              </button>
              <button className="new-message-form-submit-btn" onClick={handleSendNewMessage}>
                📤 Отправить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно с алертом */}
      {showAlertModal && (
        <AlertModal
          title={alertModalData.title}
          message={alertModalData.message}
          onClose={() => setShowAlertModal(false)}
        />
      )}

      {/* Детальное модальное окно для уведомления (как в миниапке, показываем только на мобильной версии) */}
      {isMobileView && showNotificationDetail && selectedMessage && (
        <div className="messages-notification-detail-overlay" onClick={() => setShowNotificationDetail(false)}>
          <div className="messages-notification-detail-container" onClick={(e) => e.stopPropagation()}>
            <div className="messages-notification-detail-header">
              <div className="messages-notification-detail-title-row">
                <span style={{ fontSize: '24px' }}>{getNotificationIcon(selectedMessage.type)}</span>
                <h3 className="messages-notification-detail-title">{selectedMessage.header || 'Без заголовка'}</h3>
              </div>
              <button
                className="messages-notification-detail-close-btn"
                onClick={() => setShowNotificationDetail(false)}
              >
                ×
              </button>
            </div>
            <div className="messages-notification-detail-meta">{formatDate(selectedMessage.createdAt)}</div>
            <div className="messages-notification-detail-content">
              {selectedMessage.type === 'INFO' || selectedMessage.type === 'ERROR' || selectedMessage.type === 'SUCCESS' || selectedMessage.type === 'ATTENTION' ? (
                <div className="messages-notification-detail-text">{selectedMessage.description}</div>
              ) : selectedMessage.type === 'POST' ? (
                <div>
                  <div className="messages-notification-detail-report-desc">
                    Отчет о доходности по вашему инвестиционному счету
                  </div>
                  <button className="messages-notification-detail-report-btn" onClick={handleOpenReport}>
                    📊 Открыть отчет
                  </button>
                </div>
              ) : (
                <div className="messages-notification-detail-text">{selectedMessage.description || 'Неизвестный тип сообщения'}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Детальное модальное окно для беседы (как в миниапке, показываем только на мобильной версии) */}
      {isMobileView && showConversationDetail && selectedConversation && (
        <div className="messages-conversation-detail-overlay" onClick={handleCloseConversationDetail}>
          <div className="messages-conversation-detail-container" onClick={(e) => e.stopPropagation()}>
            <div className="messages-conversation-detail-header">
              <div className="messages-conversation-detail-title-row">
                <h3 className="messages-conversation-detail-title">{selectedConversation.subject}</h3>
              </div>
              <button
                className="messages-conversation-detail-close-btn"
                onClick={handleCloseConversationDetail}
              >
                ×
              </button>
            </div>
            <div className="messages-conversation-detail-meta">
              Обращение #{selectedConversation.id} • {getStatusText(selectedConversation.status)} •{' '}
              <span className="messages-conversation-header-channel">
                {getChannelIcon(selectedConversation.channel || 'itc')}
              </span>{' '}
              {getChannelName(selectedConversation.channel || 'itc')}
            </div>

            <div className="messages-conversation-detail-messages" ref={conversationDetailMessagesRef}>
              {conversationMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`messages-conversation-message ${
                    msg.sender_type === 'user' ? 'user' : msg.is_system_message ? 'system' : 'admin'
                  }`}
                >
                  <div className="messages-conversation-message-header">
                    <span className="messages-conversation-message-sender">
                      {msg.sender_type === 'user' ? '💼 ' : msg.is_system_message ? '🤖 ' : '👤 '}
                      {msg.sender_name}
                    </span>
                    <span className="messages-conversation-message-time">
                      {new Date(msg.createdAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {msg.message_text && (
                    <div className="messages-conversation-message-text">{msg.message_text}</div>
                  )}

                  {/* Вложения (как в основной зоне просмотра) */}
                  {(() => {
                    const attachments = parseAttachments(msg.attachments);
                    if (!attachments || attachments.length === 0) return null;
                    
                    return (
                      <div className="conversation-message-attachments">
                        {attachments.map((attachment, idx) => {
                          const fileType = getFileType(attachment);
                          const fileUrl = (fileType === 'image' || fileType === 'video' || fileType === 'audio') 
                            ? getAttachmentBlobUrl(attachment, selectedConversation.id) 
                            : getAttachmentUrl(attachment, selectedConversation.id);
                          const fileName = attachment.split('/').pop();
                          
                          return (
                            <div key={idx} className="conversation-attachment-item">
                              {fileType === 'image' && fileUrl && (
                                <div 
                                  className="conversation-attachment-image"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFullscreenAttachment({ url: fileUrl, type: 'image', name: fileName });
                                  }}
                                >
                                  <img 
                                    src={fileUrl} 
                                    alt={fileName}
                                    loading="lazy"
                                  />
                                </div>
                              )}
                              {fileType === 'video' && fileUrl && (
                                <div 
                                  className="conversation-attachment-video"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFullscreenAttachment({ url: fileUrl, type: 'video', name: fileName });
                                  }}
                                >
                                  <video src={fileUrl} />
                                  <div className="conversation-attachment-play-icon">▶</div>
                                </div>
                              )}
                              {fileType === 'audio' && fileUrl && (
                                <div 
                                  className="conversation-attachment-audio"
                                  onClick={() => setFullscreenAttachment({ url: fileUrl, type: 'audio', name: fileName })}
                                >
                                  <audio src={fileUrl} controls className="conversation-audio-player" onClick={(e) => e.stopPropagation()}>
                                    Ваш браузер не поддерживает аудио элемент.
                                  </audio>
                                  <div className="conversation-audio-filename">{fileName}</div>
                                </div>
                              )}
                              {fileType === 'file' && (
                                <a 
                                  href="#"
                                  onClick={async (e) => {
                                    e.preventDefault();
                                    try {
                                      const url = `/profile/support/attachments/${selectedConversation.id}/${encodeURIComponent(fileName)}`;
                                      console.log('📥 URL для скачивания:', url);
                                      
                                      const response = await axiosAPI.get(url, {
                                        responseType: 'blob'
                                      });
                                      
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
                                      showAlert('Ошибка', 'Не удалось скачать файл: ' + (error.response?.data?.message || error.message));
                                    }
                                  }}
                                  className="conversation-attachment-file"
                                >
                                  📎 {fileName}
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>

            {selectedConversation.status !== 'closed' && canSendMessage(selectedConversation) && (
              <div className="conversation-reply-input">
                {/* Список выбранных файлов */}
                {replyFiles.length > 0 && (
                  <div className="conversation-reply-files">
                    {replyFiles.map((file, index) => (
                      <div key={index} className="conversation-reply-file-item">
                        <span className="conversation-reply-file-name">{file.name}</span>
                        <button
                          className="conversation-reply-file-remove"
                          onClick={() => handleReplyRemoveFile(index)}
                          type="button"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="conversation-reply-textarea-wrapper">
                  <textarea
                    className="conversation-reply-textarea"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Введите ваш ответ..."
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                  <button
                    className="conversation-reply-emoji-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReplyEmojiPicker(!showReplyEmojiPicker);
                    }}
                    type="button"
                    title="Добавить эмодзи"
                  >
                    😀
                  </button>
                  {showReplyEmojiPicker && (
                    <div 
                      className="conversation-reply-emoji-picker-wrapper"
                      ref={replyEmojiPickerRef}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EmojiPicker 
                        onEmojiSelect={handleReplyEmojiSelect}
                        theme="light"
                      />
                    </div>
                  )}
                </div>
                
                <div className="conversation-reply-actions">
                  <label className="conversation-reply-attach-btn">
                    <input
                      type="file"
                      multiple
                      onChange={handleReplyFileSelect}
                      style={{ display: 'none' }}
                    />
                    📎 Вложение
                  </label>
                  <button
                    className="conversation-reply-btn"
                    onClick={handleSendReply}
                    disabled={(!replyText.trim() && replyFiles.length === 0) || sendingReply}
                  >
                    {sendingReply ? '⏳ Отправка...' : '📤 Отправить'}
                  </button>
                </div>
              </div>
            )}
            {selectedConversation.status !== 'closed' && !canSendMessage(selectedConversation) && (
              <div className="conversation-readonly-notice">
                <p>
                  💡 Это обращение из канала {getChannelName(selectedConversation.channel)}. Вы можете только
                  просматривать сообщения. Для отправки сообщений используйте канал ITC.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Полноэкранный просмотр вложений - доступен в любой версии */}
      {fullscreenAttachment && (
        <div 
          className="conversation-fullscreen-overlay"
          onClick={(e) => {
            e.stopPropagation(); // Предотвращаем закрытие основного модального окна
            setFullscreenAttachment(null);
          }}
        >
          <div className="conversation-fullscreen-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="conversation-fullscreen-close"
              onClick={(e) => {
                e.stopPropagation(); // Предотвращаем закрытие основного модального окна
                setFullscreenAttachment(null);
              }}
            >
              ×
            </button>
            {fullscreenAttachment.type === 'image' && (
              <img src={fullscreenAttachment.url} alt={fullscreenAttachment.name} />
            )}
            {fullscreenAttachment.type === 'video' && (
              <video src={fullscreenAttachment.url} controls autoPlay />
            )}
            {fullscreenAttachment.type === 'audio' && (
              <div className="conversation-fullscreen-audio">
                <div className="conversation-fullscreen-audio-title">{fullscreenAttachment.name}</div>
                <audio src={fullscreenAttachment.url} controls autoPlay className="conversation-fullscreen-audio-player">
                  Ваш браузер не поддерживает аудио элемент.
                </audio>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesModal;
