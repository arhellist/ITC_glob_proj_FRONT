import React, { useState, useCallback, useEffect } from 'react';
import axiosAPI from '../JS/auth/http/axios';
import { SupportContext } from './SupportContextContext.js';
import websocketService from '../JS/websocket/websocket-service';

export const SupportProvider = ({ children }) => {
  // Централизованное состояние сообщений
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState({}); // { conversationId: [messages] }
  const [readMessages, setReadMessages] = useState(new Set()); // Set of message IDs that are read
  const [unreadCounts, setUnreadCounts] = useState({}); // { conversationId: count }
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Загрузка всех бесед для текущего админа
  const loadConversations = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔍 SupportContext: Начинаем загрузку бесед...');
      const response = await axiosAPI.get('/admin/support/conversations');
      console.log('🔍 SupportContext: Ответ от сервера:', response.data);
      const allConversations = response.data.conversations || response.data || [];
      console.log('🔍 SupportContext: Обработанные беседы:', allConversations.length, allConversations);
      
      // Сортировка бесед с учетом новых сообщений
      const sortedConversations = allConversations.sort((a, b) => {
        // Определяем есть ли непрочитанные сообщения
        const aHasUnread = (a.unread_count_admin || 0) > 0;
        const bHasUnread = (b.unread_count_admin || 0) > 0;
        
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
      
      setConversations(sortedConversations);
      
      // Подсчитываем общее количество непрочитанных сообщений
      let totalUnread = 0;
      const unreadCountsMap = {};
      
      allConversations.forEach(conv => {
        const unreadCount = conv.unread_count_admin || 0;
        unreadCountsMap[conv.id] = unreadCount;
        totalUnread += unreadCount;
        console.log(`🔍 SupportContext: Беседа ${conv.id} - непрочитанных: ${unreadCount}`);
      });
      
      setUnreadCounts(unreadCountsMap);
      setTotalUnreadCount(totalUnread);
      
      console.log(`📊 SupportContext: Загружено ${allConversations.length} бесед, всего непрочитанных: ${totalUnread}`);
    } catch (error) {
      console.error('❌ SupportContext: Ошибка загрузки бесед:', error);
      console.error('❌ SupportContext: Детали ошибки:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      setConversations([]);
      setUnreadCounts({});
      setTotalUnreadCount(0);
      
      // Показываем уведомление об ошибке
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: error.response?.data?.message || 'Ошибка загрузки бесед'
        }
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка сообщений для конкретной беседы
  const loadMessages = useCallback(async (conversationId, loadMore = false) => {
    try {
      const offset = loadMore ? (messages[conversationId]?.length || 0) : 0;
      console.log('🔍 SupportContext: Загрузка сообщений для беседы', conversationId, 'offset:', offset);
      const response = await axiosAPI.get(`/admin/support/conversations/${conversationId}/messages?limit=20&offset=${offset}`);
      console.log('🔍 SupportContext: Ответ от сервера для сообщений:', response.data);
      
      const { messages: newMessages } = response.data;
      console.log('🔍 SupportContext: Обработанные сообщения:', newMessages?.length || 0, newMessages);
      
      setMessages(prev => {
        if (loadMore) {
          // При загрузке дополнительных сообщений добавляем к существующим
          const existingMessages = prev[conversationId] || [];
          const existingIds = new Set(existingMessages.map(m => m.id));
          const additionalMessages = newMessages.filter(msg => !existingIds.has(msg.id));
          return {
            ...prev,
            [conversationId]: [...additionalMessages, ...existingMessages]
          };
        } else {
          // При первой загрузке или обновлении сохраняем временные сообщения
          const existingMessages = prev[conversationId] || [];
          // Находим временные сообщения (с ID начинающимся с 'temp-')
          const tempMessages = existingMessages.filter(msg => msg.id && msg.id.toString().startsWith('temp-'));
          
          // Объединяем временные сообщения с новыми данными с сервера
          // Удаляем дубликаты по ID
          const existingIds = new Set(newMessages.map(m => m.id));
          const uniqueTempMessages = tempMessages.filter(msg => !existingIds.has(msg.id));
          
          // Объединяем: сначала временные, потом реальные сообщения
          const mergedMessages = [...uniqueTempMessages, ...newMessages];
          
          // Сортируем по времени создания
          const sortedMessages = mergedMessages.sort((a, b) => {
            const timeA = new Date(a.createdAt || a.created_at || 0).getTime();
            const timeB = new Date(b.createdAt || b.created_at || 0).getTime();
            return timeA - timeB;
          });
          
          return {
            ...prev,
            [conversationId]: sortedMessages
          };
        }
      });
      
      return newMessages;
    } catch (error) {
      console.error('❌ SupportContext: Ошибка загрузки сообщений:', error);
      console.error('❌ SupportContext: Детали ошибки загрузки сообщений:', {
        conversationId,
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      
      // Показываем уведомление об ошибке
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: error.response?.data?.message || 'Ошибка загрузки сообщений'
        }
      }));
      
      return [];
    }
  }, [messages]);

  // Отправка сообщения
  const sendMessage = useCallback(async (conversationId, messageText) => {
    try {
      // КРИТИЧНО: Оптимистичное обновление - добавляем сообщение СРАЗУ, до отправки на сервер
      const tempMessageId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: tempMessageId,
        conversation_id: conversationId,
        sender_type: 'admin',
        sender_name: 'Администратор',
        message_text: messageText.trim(),
        createdAt: new Date().toISOString(),
        is_read_user: false,
        is_read_admin: true,
      };

      // Добавляем сообщение в состояние сразу
      setMessages(prev => {
        const existingMessages = prev[conversationId] || [];
        // Проверяем, что сообщение еще не добавлено
        if (!existingMessages.find(m => m.id === tempMessageId)) {
          return {
            ...prev,
            [conversationId]: [...existingMessages, optimisticMessage]
          };
        }
        return prev;
      });
      
      // Обновляем время последнего сообщения в беседе
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { 
              ...conv, 
              last_message_at: new Date().toISOString()
            }
          : conv
      ));
      
      const response = await axiosAPI.post(`/admin/support/conversations/${conversationId}/messages`, {
        messageText: messageText.trim()
      });
      
      // После успешной отправки перезагружаем сообщения для получения полных данных (реальный ID, вложения и т.д.)
      await loadMessages(conversationId);
      
      return true;
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      
      // Удаляем оптимистичное сообщение при ошибке
      setMessages(prev => {
        const existingMessages = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: existingMessages.filter(m => m.id !== tempMessageId)
        };
      });
      
      return false;
    }
  }, [loadMessages]);

  // Создание новой беседы
  const createConversation = useCallback(async (clientId, subject, messageText, channel = 'email') => {
    try {
      await axiosAPI.post('/admin/support/conversations', {
        clientId,
        subject,
        messageText,
        channel
      });
      
      // Обновляем список бесед
      await loadConversations();
      
      return true;
    } catch (error) {
      console.error('Ошибка создания беседы:', error);
      return false;
    }
  }, [loadConversations]);

  // Отметка сообщений как прочитанных
  const markMessagesAsRead = useCallback(async (conversationId) => {
    try {
      await axiosAPI.post(`/admin/support/conversations/${conversationId}/read`);
      
      // Сначала получаем текущий счетчик из состояния
      let currentUnreadForConversation = 0;
      
      // Обновляем локальное состояние
      setUnreadCounts(prev => {
        currentUnreadForConversation = prev[conversationId] || 0;
        console.log(`🔍 SupportContext: Сбрасываем счетчик для беседы ${conversationId} с ${currentUnreadForConversation} на 0`);
        
        return {
          ...prev,
          [conversationId]: 0
        };
      });
      
      // Обновляем общий счетчик с использованием сохраненного значения
      setTotalUnreadCount(prev => {
        const newTotal = Math.max(0, prev - currentUnreadForConversation);
        console.log(`🔍 SupportContext: Обновляем общий счетчик с ${prev} на ${newTotal} (вычли ${currentUnreadForConversation})`);
        return newTotal;
      });
      
      // Обновляем список бесед
      setConversations(prev => {
        const updated = prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, unread_count_admin: 0 }
            : conv
        );
        console.log(`🔍 SupportContext: Обновлен список бесед после отметки как прочитанных. Беседа ${conversationId}: unread_count_admin = 0`);
        return updated;
      });
      
      console.log(`✅ SupportContext: Сообщения отмечены как прочитанные для беседы ${conversationId}`);
      
      // Отправляем событие для обновления бейджа в main.jsx
      const event = new CustomEvent('support-messages-read', { 
        detail: { conversationId, unreadCount: currentUnreadForConversation }
      });
      document.dispatchEvent(event);
      console.log('🔔 SupportContext: Отправлено событие support-messages-read');
    } catch (error) {
      console.error('Ошибка отметки сообщений как прочитанных:', error);
    }
  }, []);

  // Получение непрочитанных сообщений для клиента
  const getClientUnreadCount = useCallback((clientId) => {
    const clientConversations = conversations.filter(conv => 
      conv.user_id === clientId || conv.User?.id === clientId
    );
    
    const total = clientConversations.reduce((sum, conv) => {
      // Используем данные напрямую из беседы, а не из unreadCounts
      const count = conv.unread_count_admin || 0;
      console.log(`🔍 SupportContext: getClientUnreadCount для клиента ${clientId}, беседа ${conv.id}: ${count} (из conv.unread_count_admin)`);
      return sum + count;
    }, 0);
    
    console.log(`🔍 SupportContext: Общий счетчик для клиента ${clientId}: ${total}`);
    return total;
  }, [conversations]);

  // Получение бесед для клиента
  const getClientConversations = useCallback((clientId) => {
    const clientConversations = conversations.filter(conv => 
      conv.user_id === clientId || conv.User?.id === clientId
    );
    
    // Сортируем беседы клиента с учетом новых сообщений
    const sortedClientConversations = clientConversations.sort((a, b) => {
      // Определяем есть ли непрочитанные сообщения
      const aHasUnread = (a.unread_count_admin || 0) > 0;
      const bHasUnread = (b.unread_count_admin || 0) > 0;
      
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
    
    console.log(`🔍 SupportContext: getClientConversations для клиента ${clientId}: найдено ${sortedClientConversations.length} бесед`);
    sortedClientConversations.forEach(conv => {
      console.log(`🔍 SupportContext: Беседа ${conv.id} - unread_count_admin: ${conv.unread_count_admin}`);
    });
    
    return sortedClientConversations;
  }, [conversations]);

  // Обработка новых сообщений из WebSocket
  const handleNewMessage = useCallback((data) => {
    console.log('💬 SupportContext: Получено новое сообщение:', data);
    
    const { conversationId, message } = data;
    
    // Обновляем сообщения для беседы
    setMessages(prev => {
      const existingMessages = prev[conversationId] || [];
      // Проверяем, что сообщение еще не добавлено
      if (!existingMessages.find(m => m.id === message.id)) {
        return {
          ...prev,
          [conversationId]: [...existingMessages, message]
        };
      }
      return prev;
    });
    
    // Увеличиваем счетчик непрочитанных сообщений ТОЛЬКО для входящих сообщений (от клиентов)
    if (message.sender_type === 'user') {
      console.log('🔍 SupportContext: Входящее сообщение от клиента, увеличиваем счетчик');
      
      setUnreadCounts(prev => ({
        ...prev,
        [conversationId]: (prev[conversationId] || 0) + 1
      }));
      
      setTotalUnreadCount(prev => prev + 1);
      
      // Обновляем список бесед
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { 
              ...conv, 
              unread_count_admin: (conv.unread_count_admin || 0) + 1,
              last_message_at: new Date()
            }
          : conv
      ));
    } else {
      console.log('🔍 SupportContext: Исходящее сообщение от админа, НЕ увеличиваем счетчик');
      
      // Для исходящих сообщений только обновляем время последнего сообщения
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { 
              ...conv, 
              last_message_at: new Date()
            }
          : conv
      ));
    }
  }, []);

  // Обработка новых бесед из WebSocket
  const handleNewConversation = useCallback((data) => {
    console.log('📬 SupportContext: Получена новая беседа:', data);
    
    const { conversation } = data;
    
    // Добавляем новую беседу
    setConversations(prev => {
      // Проверяем, что беседа еще не добавлена
      if (!prev.find(c => c.id === conversation.id)) {
        return [conversation, ...prev];
      }
      return prev;
    });
    
    // Увеличиваем общий счетчик непрочитанных
    if (conversation.unread_count_admin > 0) {
      setTotalUnreadCount(prev => prev + conversation.unread_count_admin);
      setUnreadCounts(prev => ({
        ...prev,
        [conversation.id]: conversation.unread_count_admin
      }));
    }
  }, []);

  // Обработка обновления беседы из WebSocket
  const handleConversationUpdated = useCallback((data) => {
    console.log('🔄 SupportContext: Получено обновление беседы:', data);
    
    const { conversation } = data;
    
    // Обновляем беседу в списке
    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.id === conversation.id);
      if (existingIndex >= 0) {
        // Обновляем существующую беседу
        const updated = [...prev];
        updated[existingIndex] = conversation;
        return updated;
      } else {
        // Если беседы нет в списке, добавляем её
        return [conversation, ...prev];
      }
    });
    
    // Обновляем счетчики непрочитанных
    if (conversation.unread_count_admin !== undefined) {
      setUnreadCounts(prev => ({
        ...prev,
        [conversation.id]: conversation.unread_count_admin || 0
      }));
      
      // Пересчитываем общий счетчик
      setConversations(prev => {
        const total = prev.reduce((sum, conv) => sum + (conv.unread_count_admin || 0), 0);
        setTotalUnreadCount(total);
        return prev;
      });
    }
  }, []);

  // WebSocket обработчики - используем прямое подключение к WebSocket
  useEffect(() => {
    const socket = websocketService.getSocket();
    
    if (!socket) {
      console.warn('⚠️ SupportContext: WebSocket не доступен');
      return;
    }

    // Обработчик новых сообщений
    const handleSupportMessage = (data) => {
      console.log('💬 SupportContext: WebSocket support_new_message:', data);
      
      // Если в данных есть беседа, обновляем её
      if (data.conversation) {
        handleConversationUpdated({ conversation: data.conversation });
      }
      
      // Обрабатываем сообщение
      if (data.message) {
        handleNewMessage({
          conversationId: data.conversationId,
          message: data.message
        });
      }
    };

    // Обработчик новых бесед
    const handleSupportConversation = (data) => {
      console.log('📬 SupportContext: WebSocket support_new_conversation:', data);
      handleNewConversation(data);
    };

    // Обработчик обновления беседы
    const handleConversationUpdate = (data) => {
      console.log('🔄 SupportContext: WebSocket support_conversation_updated:', data);
      handleConversationUpdated(data);
    };

    // Обработчик удаления беседы
    const handleConversationDelete = (data) => {
      console.log('🗑️ SupportContext: WebSocket support_conversation_deleted:', data);
      const { conversationId } = data;
      
      // Удаляем беседу из списка сразу
      setConversations(prev => {
        const filtered = prev.filter(conv => conv.id !== conversationId);
        console.log(`🗑️ SupportContext: Удалена беседа ${conversationId} из списка. Осталось бесед: ${filtered.length}`);
        return filtered;
      });
      
      // Удаляем сообщения беседы
      setMessages(prev => {
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });
      
      // Удаляем счетчики непрочитанных
      setUnreadCounts(prev => {
        const updated = { ...prev };
        delete updated[conversationId];
        return updated;
      });
      
      // Пересчитываем общий счетчик непрочитанных
      setConversations(prev => {
        const total = prev.reduce((sum, conv) => sum + (conv.unread_count_admin || 0), 0);
        setTotalUnreadCount(total);
        return prev;
      });
    };

    // Подписываемся на WebSocket события напрямую
    socket.on('support_new_message', handleSupportMessage);
    socket.on('support_new_conversation', handleSupportConversation);
    socket.on('support_conversation_updated', handleConversationUpdate);
    socket.on('support_conversation_deleted', handleConversationDelete);
    
    console.log('✅ SupportContext: Подписка на WebSocket события установлена');

    // Очистка при размонтировании
    return () => {
      if (socket) {
        socket.off('support_new_message', handleSupportMessage);
        socket.off('support_new_conversation', handleSupportConversation);
        socket.off('support_conversation_updated', handleConversationUpdate);
        socket.off('support_conversation_deleted', handleConversationDelete);
        console.log('🔌 SupportContext: Отписка от WebSocket событий');
      }
    };
  }, [handleNewMessage, handleNewConversation, handleConversationUpdated]);

  // Автоматическая загрузка бесед при монтировании
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const value = {
    // Состояние
    conversations,
    messages,
    readMessages,
    unreadCounts,
    totalUnreadCount,
    loading,
    
    // Методы
    loadConversations,
    loadMessages,
    sendMessage,
    createConversation,
    markMessagesAsRead,
    getClientUnreadCount,
    getClientConversations,
    handleNewMessage,
    handleNewConversation,
    
    // Утилиты
    setConversations,
    setMessages,
    setReadMessages,
    setUnreadCounts,
    setTotalUnreadCount
  };

  return (
    <SupportContext.Provider value={value}>
      {children}
    </SupportContext.Provider>
  );
};
