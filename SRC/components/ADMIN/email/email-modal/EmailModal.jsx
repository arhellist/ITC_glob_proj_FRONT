import React from 'react';

const EmailModal = ({ email, isOpen, onClose, onReply, onForward, onDelete }) => {
  if (!isOpen || !email) return null;

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Дата не указана';
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Неверная дата';
      
      return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Ошибка форматирования даты:', error, dateString);
      return 'Ошибка даты';
    }
  };

  const formatSender = (from) => {
    try {
      if (!from) return 'Неизвестный отправитель';
      
      // Если это строка (новый формат: from_name или from_email)
      if (typeof from === 'string') return from;
      
      if (from && typeof from === 'object') {
        // Обрабатываем mailparser формат: {value: [{address, name}], html, text}
        if (from.value && Array.isArray(from.value)) {
          const firstValue = from.value[0];
          if (firstValue && firstValue.address) {
            const name = firstValue.name && firstValue.name.trim() ? firstValue.name.trim() : '';
            return name ? `${name} <${firstValue.address}>` : firstValue.address;
          }
        }
        
        // Стандартный формат: {address, name}
        if (from.address) {
          const name = from.name && from.name.trim() ? from.name.trim() : '';
          return name ? `${name} <${from.address}>` : from.address;
        }
        
        return from.name || 'Неизвестный отправитель';
      }
      
      return String(from);
    } catch (error) {
      console.error('Ошибка форматирования отправителя:', error, from);
      return 'Неизвестный отправитель';
    }
  };

  const formatRecipients = (recipients) => {
    try {
      if (!recipients) return 'Не указано';
      
      // Если это строка (новый формат)
      if (typeof recipients === 'string') return recipients;
      
      // Если это массив строк (новый формат: to_email, cc_email)
      if (Array.isArray(recipients)) {
        return recipients.filter(r => r && typeof r === 'string').join(', ');
      }
      
      // Обрабатываем mailparser формат: {value: [{address, name}], html, text}
      if (recipients && typeof recipients === 'object' && recipients.value && Array.isArray(recipients.value)) {
        return recipients.value.map(recipient => {
          if (recipient && recipient.address) {
            const name = recipient.name && recipient.name.trim() ? recipient.name.trim() : '';
            return name ? `${name} <${recipient.address}>` : recipient.address;
          }
          return String(recipient);
        }).join(', ');
      }
      
      // Старый формат массива объектов
      if (Array.isArray(recipients)) {
        return recipients.map(recipient => {
          if (typeof recipient === 'string') return recipient;
          if (recipient && typeof recipient === 'object') {
            if (recipient.name && recipient.address) {
              return `${recipient.name} <${recipient.address}>`;
            }
            return recipient.address || recipient.name || String(recipient);
          }
          return String(recipient);
        }).join(', ');
      }
      
      if (recipients && typeof recipients === 'object') {
        if (recipients.name && recipients.address) {
          return `${recipients.name} <${recipients.address}>`;
        }
        return recipients.address || recipients.name || 'Не указано';
      }
      
      return String(recipients);
    } catch (error) {
      console.error('Ошибка форматирования получателей:', error, recipients);
      return 'Ошибка отображения';
    }
  };

  const getEmailContent = () => {
    // Приоритет: HTML содержимое (новый формат)
    if (email.body_html) {
      return { __html: email.body_html };
    }
    // Старый формат HTML
    if (email.body?.html) {
      return { __html: email.body.html };
    }
    // Текстовое содержимое (новый формат)
    if (email.body_text) {
      return { __html: `<pre style="white-space: pre-wrap; font-family: inherit;">${email.body_text}</pre>` };
    }
    // Старый формат текста
    if (email.body?.text) {
      return { __html: `<pre style="white-space: pre-wrap; font-family: inherit;">${email.body.text}</pre>` };
    }
    return { __html: '<p>Содержимое письма недоступно</p>' };
  };

  return (
    <div className="email-modal-overlay" onClick={onClose}>
      <div className="email-modal" onClick={(e) => e.stopPropagation()}>
        <div className="email-modal-header">
          <div className="email-modal-title">
            <h3>{email.subject || email.headers?.subject || 'Без темы'}</h3>
          </div>
          <div className="email-modal-actions">
            <button 
              className="email-modal-btn email-modal-btn-reply"
              onClick={() => onReply(email)}
              title="Ответить"
            >
              Ответить
            </button>
            <button 
              className="email-modal-btn email-modal-btn-forward"
              onClick={() => onForward(email)}
              title="Переслать"
            >
              Переслать
            </button>
            <button 
              className="email-modal-btn email-modal-btn-delete"
              onClick={() => onDelete(email)}
              title="Удалить"
            >
              Удалить
            </button>
            <button 
              className="email-modal-btn email-modal-btn-close"
              onClick={onClose}
              title="Закрыть"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="email-modal-content">
          <div className="email-modal-info">
            <div className="email-info-row">
              <span className="email-info-label">От:</span>
              <span className="email-info-value">{formatSender(email.from_name || email.from_email || email.headers?.from)}</span>
            </div>
            <div className="email-info-row">
              <span className="email-info-label">Кому:</span>
              <span className="email-info-value">
                {formatRecipients(email.to_email || email.headers?.to)}
              </span>
            </div>
            <div className="email-info-row">
              <span className="email-info-label">Дата:</span>
              <span className="email-info-value">{formatDate(email.received_date || email.headers?.date)}</span>
            </div>
            {(email.cc_email || email.headers?.cc) && (
              <div className="email-info-row">
                <span className="email-info-label">Копия:</span>
                <span className="email-info-value">
                  {formatRecipients(email.cc_email || email.headers.cc)}
                </span>
              </div>
            )}
          </div>

          <div className="email-modal-body">
            <div 
              className="email-content"
              dangerouslySetInnerHTML={getEmailContent()}
            />
          </div>

          {email.attachments && email.attachments.length > 0 && (
            <div className="email-modal-attachments">
              <h4>Вложения ({email.attachments.length})</h4>
              <div className="attachments-list">
                {email.attachments.map((attachment, index) => (
                  <div key={index} className="attachment-item">
                    <span className="attachment-name">{attachment.filename}</span>
                    <span className="attachment-size">
                      {attachment.size ? `${Math.round(attachment.size / 1024)} KB` : 'Размер неизвестен'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailModal;
