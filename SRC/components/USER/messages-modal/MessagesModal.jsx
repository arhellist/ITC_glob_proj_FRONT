import React, { useState, useEffect, useRef } from 'react';
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
  const [messages, setMessages] = useState([]); // INFO и POST уведомления
  const [conversations, setConversations] = useState([]); // Обращения в поддержку
  const [unreadConversationsCount, setUnreadConversationsCount] = useState(0); // Счетчик непрочитанных обращений
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationMessages, setConversationMessages] = useState([]);
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
  
  // Ref для контейнера сообщений для автоматической прокрутки
  const messagesContainerRef = useRef(null);
  const [isNewMessage, setIsNewMessage] = useState(false);
  
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

    // WebSocket слушатель для новых сообщений от админа
    const handleNewMessage = async (event) => {
      console.log('MessagesModal: Получено новое сообщение от админа:', event.detail);
      
      // Перезагружаем список обращений (обновится счетчик непрочитанных)
      await loadConversations();
      
      // Если открыта эта беседа - обновляем сообщения
      if (selectedConversation && selectedConversation.id === event.detail.conversationId) {
        setIsNewMessage(true); // Устанавливаем флаг нового сообщения
        loadConversationMessages(event.detail.conversationId);
      }
    };

    document.addEventListener('support-new-message', handleNewMessage);

    return () => {
      document.removeEventListener('support-new-message', handleNewMessage);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation]);
  
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
  
  // Закрытие эмодзи-пикера при клике вне его области (для нового сообщения)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);
  
  // Закрытие эмодзи-пикера при клике вне его области (для ответа)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showReplyEmojiPicker && replyEmojiPickerRef.current && !replyEmojiPickerRef.current.contains(event.target)) {
        setShowReplyEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showReplyEmojiPicker]);

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
      setConversationMessages(data.messages || []);
      
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

  const handleSelectMessage = async (message) => {
    setSelectedMessage(message);
    setSelectedConversation(null);
    
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

  const handleOpenNewMessageForm = () => {
    setShowNewMessageForm(true);
    setNewMessageData({
      subject: '',
      messageText: ''
    });
    setNewMessageFiles([]);
  };

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
      
      const formData = new FormData();
      formData.append('messageText', replyText);
      
      // Добавляем файлы
      replyFiles.forEach((file) => {
        formData.append('attachments', file);
      });
      
      await axiosAPI.post(`/profile/support/conversations/${selectedConversation.id}/messages`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setReplyText('');
      setReplyFiles([]);
      await loadConversationMessages(selectedConversation.id);
      await loadConversations();
    } catch (error) {
      console.error('Ошибка отправки ответа:', error);
      const errorMsg = error.response?.data?.message || 'Ошибка отправки ответа';
      showAlert('Ошибка', errorMsg);
    } finally {
      setSendingReply(false);
    }
  };
  
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
    
    // Если это вложение из email - используем прямой путь
    if (attachment.includes('storage/email/attachments')) {
      const normalizedPath = attachment.startsWith('/') ? attachment : `/${attachment}`;
      return normalizedPath;
    }
    
    // Для вложений из поддержки всегда используем API endpoint
    if (attachment.includes('storage/support/attachments')) {
      return `/profile/support/attachments/${conversationId}/${encodeURIComponent(fileName)}`;
    }
    
    // Fallback: используем API endpoint
    return `/profile/support/attachments/${conversationId}/${encodeURIComponent(fileName)}`;
  };

  // Функция для определения типа файла
  const getFileType = (attachment) => {
    const fileName = attachment.split('/').pop();
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      return 'image';
    }
    if (['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'].includes(ext)) {
      return 'video';
    }
    return 'file';
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

        {/* Основной контент - 2 зоны */}
        <div className="messages-modal-content">
          {/* ЗОНА 1: Список */}
          <div className="messages-list-zone">
            {/* Кнопка "Написать сообщение" */}
            {activeTab === 'support' && (
              <div className="messages-list-new-btn-container">
                <button className="messages-list-new-btn" onClick={handleOpenNewMessageForm}>
                  ✉️ Новое обращение
                </button>
              </div>
            )}

            <div className="messages-list-counter">
              {activeTab === 'notifications' && `Уведомлений: ${messages.length}`}
              {activeTab === 'support' && `Обращений: ${conversations.length}`}
            </div>

            <div className="messages-list-items">
              {loading ? (
                <div className="messages-list-loading">Загрузка...</div>
              ) : (
                <>
                  {/* Список уведомлений */}
                  {activeTab === 'notifications' && (
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
                            {msg.type === 'INFO' && <span>ℹ️</span>}
                            {msg.type === 'POST' && <span>📊</span>}
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
                          onClick={() => handleSelectConversation(conv)}
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

          {/* ЗОНА 2: Просмотр */}
          <div className="messages-view-zone">
            {activeTab === 'notifications' ? (
              !selectedMessage ? (
                <div className="messages-view-empty">Выберите уведомление для просмотра</div>
              ) : (
                <>
                  <div className="messages-view-header">
                    <div className="messages-view-title-row">
                      {selectedMessage.type === 'INFO' && <span style={{ fontSize: '24px' }}>ℹ️</span>}
                      {selectedMessage.type === 'POST' && <span style={{ fontSize: '24px' }}>📊</span>}
                      <h3 className="messages-view-title">{selectedMessage.header || 'Без заголовка'}</h3>
                    </div>
                    <div className="messages-view-meta">{formatDate(selectedMessage.createdAt)}</div>
                  </div>

                  <div className="notification-view-content">
                    {selectedMessage.type === 'INFO' ? (
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
                      <div className="notification-view-unknown">Неизвестный тип сообщения</div>
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
                          
                          return (
                            <div className="conversation-message-attachments">
                              {attachments.map((attachment, idx) => {
                                const fileType = getFileType(attachment);
                                const fileUrl = getAttachmentUrl(attachment, selectedConversation.id);
                                const fileName = attachment.split('/').pop();
                                
                                return (
                                  <div key={idx} className="conversation-attachment-item">
                                    {fileType === 'image' && (
                                      <div 
                                        className="conversation-attachment-image"
                                        onClick={() => setFullscreenAttachment({ url: fileUrl, type: 'image', name: fileName })}
                                      >
                                        <img 
                                          src={fileUrl} 
                                          alt={fileName}
                                          loading="lazy"
                                        />
                                      </div>
                                    )}
                                    {fileType === 'video' && (
                                      <div 
                                        className="conversation-attachment-video"
                                        onClick={() => setFullscreenAttachment({ url: fileUrl, type: 'video', name: fileName })}
                                      >
                                        <video src={fileUrl} />
                                        <div className="conversation-attachment-play-icon">▶</div>
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

                  {/* Полноэкранный просмотр вложений */}
                  {fullscreenAttachment && (
                    <div 
                      className="conversation-fullscreen-overlay"
                      onClick={() => setFullscreenAttachment(null)}
                    >
                      <div className="conversation-fullscreen-content" onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="conversation-fullscreen-close"
                          onClick={() => setFullscreenAttachment(null)}
                        >
                          ×
                        </button>
                        {fullscreenAttachment.type === 'image' && (
                          <img src={fullscreenAttachment.url} alt={fullscreenAttachment.name} />
                        )}
                        {fullscreenAttachment.type === 'video' && (
                          <video src={fullscreenAttachment.url} controls autoPlay />
                        )}
                      </div>
                    </div>
                  )}

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
                          onClick={() => setShowReplyEmojiPicker(!showReplyEmojiPicker)}
                          type="button"
                          title="Добавить эмодзи"
                        >
                          😀
                        </button>
                        {showReplyEmojiPicker && (
                          <div 
                            className="conversation-reply-emoji-picker-wrapper"
                            ref={replyEmojiPickerRef}
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
        </div>
      </div>

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
          <div className="new-message-form-container" onClick={(e) => e.stopPropagation()}>
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
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title="Добавить эмодзи"
                  >
                    😀
                  </button>
                  {showEmojiPicker && (
                    <div ref={emojiPickerRef} className="new-message-form-emoji-picker-wrapper">
                      <EmojiPicker 
                        onEmojiSelect={handleEmojiSelect}
                        onClose={() => setShowEmojiPicker(false)}
                        theme="light"
                      />
                    </div>
                  )}
                </div>
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
              <button className="new-message-form-cancel-btn" onClick={() => setShowNewMessageForm(false)}>
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
    </div>
  );
};

export default MessagesModal;
