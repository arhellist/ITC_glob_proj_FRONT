import React, { useEffect, useState } from 'react';
import './EmailViewer.css';
import axiosAPI from '../../../../JS/auth/http/axios';

/**
 * Компонент просмотра письма
 */
const EmailViewer = ({ email, onReply, onClose }) => {
  const [emailData, setEmailData] = useState(email);
  const [loading, setLoading] = useState(false);
  const [showRawHeaders, setShowRawHeaders] = useState(false);
  const [attachments, setAttachments] = useState([]);

  useEffect(() => {
    if (email && email.id) {
      loadFullEmailData(email.id);
    }
  }, [email]);

  const loadFullEmailData = async (emailId) => {
    try {
      setLoading(true);
      const { data } = await axiosAPI.get(`/admin/email/emails/${emailId}`);
      
      if (data.success) {
        setEmailData(data.data);
        
        // Загружаем вложения если есть
        if (data.data.attachments && data.data.attachments.length > 0) {
          console.log('📎 Загружены вложения для письма:', data.data.attachments);
          setAttachments(data.data.attachments);
        } else {
          console.log('📎 Вложений для письма не найдено');
          setAttachments([]);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки полных данных письма:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAttachment = async (attachment) => {
    try {
      const response = await axiosAPI.get(`/admin/email/attachments/${attachment.id}/download`, {
        responseType: 'blob'
      });

      // Создаем ссылку для скачивания
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания вложения:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка скачивания вложения'
        }
      }));
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatEmailAddresses = (addresses) => {
    if (!addresses) return '';
    if (Array.isArray(addresses)) {
      return addresses.join(', ');
    }
    return addresses;
  };

  const renderEmailBody = () => {
    if (!emailData) return '';

    // Если есть HTML версия, показываем её
    if (emailData.body_html) {
      return (
        <div 
          className="email-body-html"
          dangerouslySetInnerHTML={{ __html: emailData.body_html }}
        />
      );
    }

    // Иначе показываем текстовую версию
    if (emailData.body_text) {
      return (
        <div className="email-body-text">
          {emailData.body_text.split('\n').map((line, index) => (
            <div key={index}>{line}</div>
          ))}
        </div>
      );
    }

    return (
      <div className="email-body-empty">
        Содержимое письма недоступно
      </div>
    );
  };

  if (!emailData) {
    return (
      <div className="email-viewer">
        <div className="email-empty-state">
          <h3>Выберите письмо</h3>
          <p>Выберите письмо из списка для просмотра</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="email-viewer">
        <div className="email-loading">
          Загрузка письма...
        </div>
      </div>
    );
  }

  return (
    <div className="email-viewer">
      {/* Заголовок письма */}
      <div className="email-viewer-header">
        <div className="email-viewer-title">
          <h2>{emailData.subject || '(Без темы)'}</h2>
          <div className="email-viewer-meta">
            <span className="email-viewer-date">
              {formatDate(emailData.received_date || emailData.sent_date)}
            </span>
            {emailData.is_important && (
              <span className="email-viewer-important" title="Важное письмо">
                ⭐
              </span>
            )}
          </div>
        </div>
        
        <div className="email-viewer-actions">
          {onReply && (
            <button
              className="email-viewer-action"
              onClick={() => onReply(emailData)}
              title="Ответить"
            >
              ↩️ Ответить
            </button>
          )}
          
          <button
            className="email-viewer-action"
            onClick={() => setShowRawHeaders(!showRawHeaders)}
            title="Показать заголовки"
          >
            📋 Заголовки
          </button>
          
          <button
            className="email-viewer-action"
            onClick={onClose}
            title="Закрыть"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Информация об отправителе/получателе */}
      <div className="email-viewer-info">
        <div className="email-info-row">
          <span className="email-info-label">От:</span>
          <span className="email-info-value">
            {emailData.from_name && `${emailData.from_name} `}
            &lt;{emailData.from_email}&gt;
          </span>
        </div>
        
        {emailData.to_email && (
          <div className="email-info-row">
            <span className="email-info-label">Кому:</span>
            <span className="email-info-value">
              {formatEmailAddresses(emailData.to_email)}
            </span>
          </div>
        )}
        
        {emailData.cc_email && (
          <div className="email-info-row">
            <span className="email-info-label">Копия:</span>
            <span className="email-info-value">
              {formatEmailAddresses(emailData.cc_email)}
            </span>
          </div>
        )}
        
        {emailData.bcc_email && (
          <div className="email-info-row">
            <span className="email-info-label">Скрытая копия:</span>
            <span className="email-info-value">
              {formatEmailAddresses(emailData.bcc_email)}
            </span>
          </div>
        )}
        
        <div className="email-info-row">
          <span className="email-info-label">Размер:</span>
          <span className="email-info-value">
            {(emailData.size / 1024).toFixed(1)} KB
          </span>
        </div>
      </div>

      {/* Вложения */}
      {attachments.length > 0 && (
        <div className="email-viewer-attachments">
          <h4>Вложения ({attachments.length})</h4>
          <div className="email-attachments-list">
            {attachments.map((attachment, index) => {
              const isImage = attachment.type === 'image' || 
                             (attachment.content_type && attachment.content_type.startsWith('image/'));
              const isVideo = attachment.type === 'video' || 
                             (attachment.content_type && attachment.content_type.startsWith('video/'));
              
              // Формируем URL для просмотра
              // Используем специальный маршрут для скачивания через attachment ID
              const fileUrl = attachment.id 
                ? `/admin/email/attachments/${attachment.id}/download`
                : (attachment.file_path 
                    ? (attachment.file_path.startsWith('http') 
                        ? attachment.file_path 
                        : `${axiosAPI.defaults.baseURL || ''}/${attachment.file_path}`)
                    : null);
              
              return (
                <div key={index} className="email-attachment-item">
                  {isImage && fileUrl ? (
                    <div className="email-attachment-preview">
                      <img 
                        src={fileUrl} 
                        alt={attachment.filename}
                        style={{ maxWidth: '100%', maxHeight: '300px', cursor: 'pointer' }}
                        onClick={() => window.open(fileUrl, '_blank')}
                      />
                      <div className="email-attachment-info">
                        <span className="email-attachment-name">{attachment.filename}</span>
                        <span className="email-attachment-size">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          className="email-attachment-download"
                          onClick={() => handleDownloadAttachment(attachment)}
                          title="Скачать"
                        >
                          ⬇️
                        </button>
                      </div>
                    </div>
                  ) : isVideo && fileUrl ? (
                    <div className="email-attachment-preview">
                      <video 
                        src={fileUrl} 
                        controls
                        style={{ maxWidth: '100%', maxHeight: '300px' }}
                      >
                        Ваш браузер не поддерживает видео.
                      </video>
                      <div className="email-attachment-info">
                        <span className="email-attachment-name">{attachment.filename}</span>
                        <span className="email-attachment-size">
                          {(attachment.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          className="email-attachment-download"
                          onClick={() => handleDownloadAttachment(attachment)}
                          title="Скачать"
                        >
                          ⬇️
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <span className="email-attachment-icon">
                        {attachment.type === 'image' ? '🖼️' : 
                         attachment.type === 'video' ? '🎥' :
                         attachment.type === 'pdf' ? '📄' : 
                         attachment.type === 'document' ? '📝' : '📎'}
                      </span>
                      <span className="email-attachment-name">
                        {attachment.filename}
                      </span>
                      <span className="email-attachment-size">
                        {(attachment.size / 1024).toFixed(1)} KB
                      </span>
                      <button
                        className="email-attachment-download"
                        onClick={() => handleDownloadAttachment(attachment)}
                        title="Скачать"
                      >
                        ⬇️
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Заголовки письма (по требованию) */}
      {showRawHeaders && emailData.headers && (
        <div className="email-viewer-headers">
          <h4>Заголовки письма</h4>
          <pre className="email-headers-content">
            {JSON.stringify(emailData.headers, null, 2)}
          </pre>
        </div>
      )}

      {/* Содержимое письма */}
      <div className="email-viewer-body">
        {renderEmailBody()}
      </div>
    </div>
  );
};

export default EmailViewer;
