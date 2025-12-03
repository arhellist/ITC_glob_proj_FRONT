import React, { useEffect, useState } from 'react';
import './EmailConversations.css';
import axiosAPI from '../../../../JS/auth/http/axios';

/**
 * Компонент управления переписками
 */
const EmailConversations = ({ onEmailSelect, selectedEmail, onReply }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversationEmails, setConversationEmails] = useState([]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const { data } = await axiosAPI.get(`/admin/email/conversations?${params}`);
      
      if (data.success) {
        const conversationsData = data.data || [];
        if (Array.isArray(conversationsData)) {
          setConversations(conversationsData);
        } else {
          console.warn('EmailConversations: data.data не является массивом, устанавливаем пустой массив');
          setConversations([]);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки переписок:', error);
      setError('Ошибка загрузки переписок');
    } finally {
      setLoading(false);
    }
  };

  const loadConversationEmails = async (conversationId) => {
    try {
      const { data } = await axiosAPI.get(`/admin/email/conversations/${conversationId}/emails`);
      
      if (data.success) {
        const emailsData = data.data || [];
        if (Array.isArray(emailsData)) {
          setConversationEmails(emailsData);
        } else {
          console.warn('EmailConversations: emails data не является массивом, устанавливаем пустой массив');
          setConversationEmails([]);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки писем переписки:', error);
    }
  };

  const handleConversationSelect = (conversation) => {
    setSelectedConversation(conversation);
    loadConversationEmails(conversation.id);
  };

  const handleEmailClick = (email) => {
    onEmailSelect(email);
    
    // Помечаем письмо как прочитанное
    if (!email.is_read) {
      markAsRead(email.id);
    }
  };

  const markAsRead = async (emailId) => {
    try {
      await axiosAPI.put(`/admin/email/emails/${emailId}/read`);
      // Обновляем локальное состояние
      setConversationEmails(emails => 
        emails.map(email => 
          email.id === emailId ? { ...email, is_read: true } : email
        )
      );
    } catch (error) {
      console.error('Ошибка пометки письма как прочитанного:', error);
    }
  };

  const handleAssignConversation = async (conversationId, adminId) => {
    try {
      const { data } = await axiosAPI.put(`/admin/email/conversations/${conversationId}/assign`, {
        admin_id: adminId
      });
      
      if (data.success) {
        await loadConversations();
      }
    } catch (error) {
      console.error('Ошибка назначения переписки:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка назначения переписки'
        }
      }));
    }
  };

  const handleArchiveConversation = async (conversationId) => {
    // Показываем модальное окно подтверждения
    const shouldArchive = window.confirm('Вы уверены, что хотите архивировать эту переписку?');
    if (!shouldArchive) {
      return;
    }

    try {
      const { data } = await axiosAPI.put(`/admin/email/conversations/${conversationId}/archive`);
      
      if (data.success) {
        await loadConversations();
        if (selectedConversation && selectedConversation.id === conversationId) {
          setSelectedConversation(null);
          setConversationEmails([]);
        }
      }
    } catch (error) {
      console.error('Ошибка архивирования переписки:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка архивирования переписки'
        }
      }));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
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
  };

  const getConversationStatusColor = (status) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'archived': return '#999';
      case 'blocked': return '#f44336';
      default: return '#666';
    }
  };

  const getConversationStatusText = (status) => {
    switch (status) {
      case 'active': return 'Активная';
      case 'archived': return 'Архивная';
      case 'blocked': return 'Заблокированная';
      default: return 'Неизвестная';
    }
  };

  if (loading) {
    return (
      <div className="email-conversations">
        <div className="email-loading">
          Загрузка переписок...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="email-conversations">
        <div className="email-empty-state">
          <p>{error}</p>
          <button 
            className="email-action-button"
            onClick={loadConversations}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="email-conversations">
      {/* Заголовок и поиск */}
      <div className="email-conversations-header">
        <div className="email-conversations-title">
          <h3>Переписки</h3>
          <span className="email-conversations-count">
            {conversations.length} переписок
          </span>
        </div>
        
        <div className="email-conversations-search">
          <input
            type="text"
            placeholder="Поиск по перепискам..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="email-conversations-search-input"
          />
          <span className="email-conversations-search-icon">🔍</span>
        </div>
      </div>

      {/* Основной контент */}
      <div className="email-conversations-content">
        {/* Список переписок */}
        <div className="email-conversations-list">
          {!Array.isArray(conversations) || conversations.length === 0 ? (
            <div className="email-empty-state">
              <h3>Нет переписок</h3>
              <p>Переписки появятся здесь автоматически</p>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`email-conversation-item ${selectedConversation?.id === conversation.id ? 'selected' : ''}`}
                onClick={() => handleConversationSelect(conversation)}
              >
                <div className="email-conversation-info">
                  <div className="email-conversation-header">
                    <div className="email-conversation-email">
                      {conversation.email_address}
                    </div>
                    <div className="email-conversation-meta">
                      <span className="email-conversation-date">
                        {formatDate(conversation.last_email_date)}
                      </span>
                      <span 
                        className="email-conversation-status"
                        style={{ color: getConversationStatusColor(conversation.status) }}
                      >
                        {getConversationStatusText(conversation.status)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="email-conversation-stats">
                    <span className="email-conversation-count">
                      {conversation.email_count} писем
                    </span>
                    {conversation.unread_count > 0 && (
                      <span className="email-conversation-unread">
                        {conversation.unread_count} непрочитанных
                      </span>
                    )}
                    {conversation.is_important && (
                      <span className="email-conversation-important">
                        ⭐ Важная
                      </span>
                    )}
                  </div>
                  
                  {conversation.assigned_admin && (
                    <div className="email-conversation-assigned">
                      Назначено: {conversation.assigned_admin.name}
                    </div>
                  )}
                </div>
                
                <div className="email-conversation-actions">
                  <button
                    className="email-conversation-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAssignConversation(conversation.id, 1); // TODO: Получить ID текущего админа
                    }}
                    title="Назначить себе"
                  >
                    👤
                  </button>
                  
                  <button
                    className="email-conversation-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleArchiveConversation(conversation.id);
                    }}
                    title="Архивировать"
                  >
                    📁
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Письма выбранной переписки */}
        {selectedConversation && (
          <div className="email-conversation-emails">
            <div className="email-conversation-emails-header">
              <h4>Письма в переписке</h4>
              <span className="email-conversation-emails-count">
                {conversationEmails.length} писем
              </span>
            </div>
            
            <div className="email-conversation-emails-list">
              {conversationEmails.length === 0 ? (
                <div className="email-empty-state">
                  <p>В этой переписке пока нет писем</p>
                </div>
              ) : (
                conversationEmails.map((email) => (
                  <div
                    key={email.id}
                    className={`email-conversation-email-item ${selectedEmail?.id === email.id ? 'selected' : ''} ${!email.is_read ? 'unread' : ''}`}
                    onClick={() => handleEmailClick(email)}
                  >
                    <div className="email-conversation-email-info">
                      <div className="email-conversation-email-header">
                        <span className="email-conversation-email-subject">
                          {email.subject || '(Без темы)'}
                        </span>
                        <span className="email-conversation-email-date">
                          {formatDate(email.received_date || email.sent_date)}
                        </span>
                      </div>
                      
                      <div className="email-conversation-email-meta">
                        <span className="email-conversation-email-from">
                          {email.from_name || email.from_email}
                        </span>
                        {email.is_important && (
                          <span className="email-conversation-email-important">
                            ⭐
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="email-conversation-email-actions">
                      {onReply && (
                        <button
                          className="email-conversation-email-action"
                          onClick={(e) => {
                            e.stopPropagation();
                            onReply(email);
                          }}
                          title="Ответить"
                        >
                          ↩️
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailConversations;
