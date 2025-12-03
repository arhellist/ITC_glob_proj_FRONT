import React, { useState, useRef, useEffect } from 'react';
import './EmailComposer.css';
import axiosAPI from '../../../../JS/auth/http/axios';
import { ErrorNotification, SuccessNotification } from '../../../../JS/utils/notifications';
import EmailSendingLoader from './EmailSendingLoader';
import ClientDetailsModal from './ClientDetailsModal';

/**
 * Генерирует текстовый ответ с контекстом предыдущего письма
 */
function generateReplyText(replyToEmail) {
  const fromName = replyToEmail.from_name || replyToEmail.from_email || 'Отправитель';
  const date = replyToEmail.received_date ? new Date(replyToEmail.received_date).toLocaleString('ru-RU') : 'Дата не указана';
  const subject = replyToEmail.subject || 'Без темы';
  
  // Получаем текст письма (приоритет: body_text, затем body_html без тегов)
  let originalText = replyToEmail.body_text || '';
  if (!originalText && replyToEmail.body_html) {
    // Убираем HTML теги из body_html для текстовой версии
    originalText = replyToEmail.body_html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
  
  return `\n\n---\n\n${fromName} писал(а) ${date}:\nТема: ${subject}\n\n${originalText}`;
}

/**
 * Генерирует HTML ответ с контекстом предыдущего письма
 */
function generateReplyHtml(replyToEmail) {
  const fromName = replyToEmail.from_name || replyToEmail.from_email || 'Отправитель';
  const date = replyToEmail.received_date ? new Date(replyToEmail.received_date).toLocaleString('ru-RU') : 'Дата не указана';
  const subject = replyToEmail.subject || 'Без темы';
  
  // Получаем HTML содержимое письма
  let originalHtml = replyToEmail.body_html || '';
  if (!originalHtml && replyToEmail.body_text) {
    // Если есть только текст, оборачиваем в HTML
    originalHtml = `<p>${replyToEmail.body_text.replace(/\n/g, '<br>')}</p>`;
  }
  
  return `<br><br><hr><br><div style="border-left: 3px solid #ccc; padding-left: 15px; margin-left: 10px; color: #666;">
    <strong>${fromName}</strong> писал(а) <em>${date}</em>:<br>
    <strong>Тема:</strong> ${subject}<br><br>
    ${originalHtml}
  </div>`;
}

/**
 * Компонент написания писем
 */
const EmailComposer = ({ replyToEmail, onClose, onQueueCreated }) => {
  const [formData, setFormData] = useState({
    to: replyToEmail ? (Array.isArray(replyToEmail.from_email) ? replyToEmail.from_email[0] : replyToEmail.from_email) : '',
    cc: '',
    bcc: '',
    subject: replyToEmail ? `Re: ${replyToEmail.subject || ''}` : '',
    bodyText: replyToEmail ? generateReplyText(replyToEmail) : '',
    bodyHtml: replyToEmail ? generateReplyHtml(replyToEmail) : '',
    activeEditor: 'text' // 'text' или 'html'
  });
  
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [addressBook, setAddressBook] = useState([]);
  const [loadingAddressBook, setLoadingAddressBook] = useState(false);
  const [emailServiceStatus, setEmailServiceStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [showTemplatesMenu, setShowTemplatesMenu] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [loadingClient, setLoadingClient] = useState(false);
  const fileInputRef = useRef(null);

  // Загрузка записной книги и статуса email сервиса
  useEffect(() => {
    loadAddressBook();
    loadEmailServiceStatus();
  }, []);

  // Закрытие меню шаблонов при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTemplatesMenu && !event.target.closest('.templates-dropdown')) {
        setShowTemplatesMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTemplatesMenu]);

  const loadAddressBook = async () => {
    try {
      setLoadingAddressBook(true);
      const { data } = await axiosAPI.get('/admin/email/address-book');
      setAddressBook(data || []);
    } catch (error) {
      console.error('Ошибка загрузки записной книги:', error);
    } finally {
      setLoadingAddressBook(false);
    }
  };

  const loadEmailServiceStatus = async () => {
    try {
      setLoadingStatus(true);
      const { data } = await axiosAPI.get('/admin/email/admin/service/status');
      setEmailServiceStatus(data);
    } catch (error) {
      console.error('Ошибка загрузки статуса email сервиса:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  // Функция получения данных клиента по email
  const loadClientData = async (email) => {
    try {
      setLoadingClient(true);
      const { data } = await axiosAPI.get(`/admin/email/client-by-email/${encodeURIComponent(email)}`);
      setClientData(data);
      setShowClientModal(true);
    } catch (error) {
      console.error('Ошибка загрузки данных клиента:', error);
      const root = document.querySelector('.root-content-notification-container');
      if (root) {
        ErrorNotification(root, 'Клиент с таким email не найден');
      }
    } finally {
      setLoadingClient(false);
    }
  };

  const handleAddressBookSelect = (selectedClient) => {
    if (selectedClient && selectedClient.email) {
      handleInputChange('to', selectedClient.email);
    }
  };

  const handleBroadcastToggle = (checked) => {
    setIsBroadcast(checked);
    if (checked) {
      // При включении BROADCAST очищаем поле получателя
      handleInputChange('to', '');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  /**
   * Вставляет шаблонную переменную в место курсора
   * @param {string} template - Шаблонная переменная (например, "{{name}}")
   */
  const insertTemplate = (template) => {
    if (formData.activeEditor === 'html') {
      // Для HTML редактора
      const editor = document.querySelector('.email-composer-editor');
      if (editor) {
        editor.focus();
        document.execCommand('insertText', false, template);
      }
    } else {
      // Для текстового поля
      const textarea = document.querySelector('.email-composer-textarea');
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = formData.bodyText;
        const newText = text.substring(0, start) + template + text.substring(end);
        
        handleInputChange('bodyText', newText);
        
        // Устанавливаем курсор после вставленного текста
        setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + template.length, start + template.length);
        }, 0);
      }
    }
    
    // Закрываем меню
    setShowTemplatesMenu(false);
  };

  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newAttachments = files.map(file => ({
      id: Date.now() + Math.random(),
      file: file,
      name: file.name,
      size: file.size,
      type: file.type
    }));
    
    setAttachments(prev => [...prev, ...newAttachments]);
    
    // Очищаем input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = (attachmentId) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      
      const formDataToSend = new FormData();
      formDataToSend.append('to', formData.to);
      formDataToSend.append('cc', formData.cc);
      formDataToSend.append('bcc', formData.bcc);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('bodyText', formData.bodyText);
      formDataToSend.append('bodyHtml', formData.bodyHtml);
      formDataToSend.append('isDraft', true);
      
      // Добавляем вложения
      attachments.forEach(attachment => {
        formDataToSend.append('attachments', attachment.file);
      });

      const { data } = await axiosAPI.post('/admin/email/send', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (data.success) {
        const root = document.querySelector('.root-content-notification-container');
        if (root) {
          SuccessNotification(root, 'Черновик сохранен');
        }
        onClose();
      }
    } catch (error) {
      console.error('Ошибка сохранения черновика:', error);
      const errorMessage = 'Ошибка сохранения черновика: ' + (error.response?.data?.message || error.message);
      const root = document.querySelector('.root-content-notification-container');
      if (root) {
        ErrorNotification(root, errorMessage);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSendEmail = async () => {
    if (!isBroadcast && !formData.to.trim()) {
      const errorMessage = 'Укажите получателя';
      const root = document.querySelector('.root-content-notification-container');
      if (root) {
        ErrorNotification(root, errorMessage);
      }
      return;
    }

    if (!formData.subject.trim()) {
      const errorMessage = 'Укажите тему письма';
      const root = document.querySelector('.root-content-notification-container');
      if (root) {
        ErrorNotification(root, errorMessage);
      }
      return;
    }

    try {
      setSending(true);
      
      if (isBroadcast) {
        // Формирование очереди рассылки
        const broadcastData = {
          subject: formData.subject,
          bodyText: formData.bodyText,
          bodyHtml: formData.bodyHtml,
          adminId: 1, // TODO: Replace with actual admin ID
          attachments: attachments.map(att => ({
            filename: att.file.name,
            size: att.file.size,
            mimetype: att.file.type
          }))
        };

        const { data } = await axiosAPI.post('/admin/email/broadcast/queue', broadcastData);

        if (data.success) {
          const root = document.querySelector('.root-content-notification-container');
          if (root) {
            SuccessNotification(root, 'ОЧЕРЕДЬ СФОРМИРОВАНА');
          }
          // Уведомляем родительский компонент о создании очереди
          if (onQueueCreated) {
            onQueueCreated();
          }
          onClose();
        }
      } else {
        // Обычная отправка письма
        const formDataToSend = new FormData();
        formDataToSend.append('to', formData.to);
        formDataToSend.append('cc', formData.cc);
        formDataToSend.append('bcc', formData.bcc);
        formDataToSend.append('subject', formData.subject);
        formDataToSend.append('bodyText', formData.bodyText);
        formDataToSend.append('bodyHtml', formData.bodyHtml);
        formDataToSend.append('isBroadcast', false);
        formDataToSend.append('adminId', 1); // Временно хардкодим adminId
        
        // Добавляем вложения
        attachments.forEach(attachment => {
          formDataToSend.append('attachments', attachment.file);
        });

        console.log('📧 Отправляем письмо:', {
          to: formData.to,
          subject: formData.subject,
          bodyText: formData.bodyText,
          bodyHtml: formData.bodyHtml
        });

        const { data } = await axiosAPI.post('/admin/email/send', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (data.success) {
          const root = document.querySelector('.root-content-notification-container');
          if (root) {
            SuccessNotification(root, 'Письмо отправлено успешно');
          }
          onClose();
        }
      }
    } catch (error) {
      console.error('Ошибка отправки письма:', error);
      console.error('Response data:', error.response?.data);
      console.error('Response status:', error.response?.status);
      const errorMessage = 'Ошибка отправки письма: ' + (error.response?.data?.error || error.response?.data?.message || error.message);
      const root = document.querySelector('.root-content-notification-container');
      if (root) {
        ErrorNotification(root, errorMessage);
      }
    } finally {
      setSending(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="email-composer">
      {/* Заголовок композера */}
      <div className="email-composer-header">
        <div className="email-composer-title">
          <h3>
            {replyToEmail ? 'Ответить' : 'Новое письмо'}
          </h3>
          {replyToEmail && (
            <span className="email-composer-reply-info">
              Ответ на письмо от {replyToEmail.from_email}
            </span>
          )}
        </div>
        
        {/* Бейдж тестового режима */}
        {emailServiceStatus?.data?.testMode && (
          <div className="email-test-mode-badge">
            <span className="test-mode-icon">🧪</span>
            <span className="test-mode-text">Тестовый режим</span>
            <span className="test-mode-email">→ {emailServiceStatus.data.testEmail}</span>
          </div>
        )}
        
        <div className="email-composer-actions">
          <button
            className="email-composer-action secondary"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить черновик'}
          </button>
          
          <button
            className="email-composer-action"
            onClick={handleSendEmail}
            disabled={sending || saving}
          >
            {sending ? (isBroadcast ? 'Формирование очереди...' : 'Отправка...') : (isBroadcast ? 'СФОРМИРОВАТЬ ОЧЕРЕДЬ' : 'Отправить')}
          </button>
          
          <button
            className="email-composer-action danger"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Форма письма */}
      <div className="email-composer-form">
        {/* Чекбокс BROADCAST */}
        <div className="email-composer-field broadcast-field">
          <label className={`email-composer-checkbox-label ${isBroadcast ? 'active' : ''}`}>
            <input
              type="checkbox"
              checked={isBroadcast}
              onChange={(e) => handleBroadcastToggle(e.target.checked)}
              className="email-composer-checkbox"
            />
            <span className="email-composer-checkbox-text">BROADCAST</span>
          </label>
        </div>

        {/* Получатели */}
        <div className="email-composer-field">
          <label className="email-composer-label">
            Кому <span className="required">*</span>
          </label>
          <div className="email-composer-recipients">
            <input
              type="email"
              className="email-composer-input email-composer-input-short"
              value={formData.to}
              onChange={(e) => handleInputChange('to', e.target.value)}
              placeholder="email@example.com"
              multiple
              disabled={isBroadcast}
            />
            <select
              className="email-composer-select"
              onChange={(e) => {
                const selectedClient = addressBook.find(client => client.id === parseInt(e.target.value));
                handleAddressBookSelect(selectedClient);
                e.target.value = ''; // Сбрасываем выбор
              }}
              disabled={isBroadcast || loadingAddressBook}
            >
              <option value="">Записная книга</option>
              {addressBook.map(client => (
                <option key={client.id} value={client.id}>
                  {client.displayText}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Кнопка показать СС и ВСС */}
        <div className="email-composer-toggle">
          <button
            type="button"
            className="email-composer-toggle-button"
            onClick={() => setShowCcBcc(!showCcBcc)}
          >
            {showCcBcc ? 'Скрыть СС и ВСС' : 'Показать СС и ВСС'}
          </button>
        </div>

        {/* СС и ВСС */}
        {showCcBcc && (
          <>
            <div className="email-composer-field">
              <label className="email-composer-label">Копия (СС)</label>
              <input
                type="email"
                className="email-composer-input"
                value={formData.cc}
                onChange={(e) => handleInputChange('cc', e.target.value)}
                placeholder="email@example.com"
                multiple
              />
            </div>

            <div className="email-composer-field">
              <label className="email-composer-label">Скрытая копия (ВСС)</label>
              <input
                type="email"
                className="email-composer-input"
                value={formData.bcc}
                onChange={(e) => handleInputChange('bcc', e.target.value)}
                placeholder="email@example.com"
                multiple
              />
            </div>
          </>
        )}

        {/* Тема */}
        <div className="email-composer-field">
          <label className="email-composer-label">
            Тема <span className="required">*</span>
          </label>
          <input
            type="text"
            className="email-composer-input"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            placeholder="Тема письма"
          />
        </div>

        {/* Вложения */}
        <div className="email-composer-field">
          <label className="email-composer-label">Вложения</label>
          <div className="email-composer-attachments">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileUpload}
              className="email-composer-file-input"
              id="file-upload"
            />
            <label htmlFor="file-upload" className="email-composer-file-button">
              📎 Прикрепить файлы
            </label>
            
            {attachments.length > 0 && (
              <div className="email-attachments-preview">
                {attachments.map(attachment => (
                  <div key={attachment.id} className="email-attachment-preview">
                    <span className="email-attachment-name">
                      📎 {attachment.name}
                    </span>
                    <span className="email-attachment-size">
                      {formatFileSize(attachment.size)}
                    </span>
                    <button
                      className="email-attachment-remove"
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Панель инструментов */}
        <div className="email-composer-toolbar">
          <div className="email-composer-toolbar-group">
            <button
              type="button"
              className={`email-composer-toolbar-button ${formData.activeEditor === 'text' ? 'active' : ''}`}
              onClick={() => handleInputChange('activeEditor', 'text')}
            >
              ТЕКСТ
            </button>
            <button
              type="button"
              className={`email-composer-toolbar-button ${formData.activeEditor === 'html' ? 'active' : ''}`}
              onClick={() => handleInputChange('activeEditor', 'html')}
            >
              HTML
            </button>
          </div>
          
          {formData.activeEditor === 'html' && (
            <div className="email-composer-toolbar-group">
              <button
                type="button"
                className="email-composer-toolbar-button"
                onClick={() => document.execCommand('bold')}
                title="Жирный"
              >
                <b>B</b>
              </button>
              <button
                type="button"
                className="email-composer-toolbar-button"
                onClick={() => document.execCommand('italic')}
                title="Курсив"
              >
                <i>I</i>
              </button>
              <button
                type="button"
                className="email-composer-toolbar-button"
                onClick={() => document.execCommand('underline')}
                title="Подчеркнутый"
              >
                <u>U</u>
              </button>
            </div>
          )}
          
          {/* Кнопка ШАБЛОНЫ */}
          <div className="email-composer-toolbar-group templates-group">
            <div className="templates-dropdown">
              <button
                type="button"
                className={`email-composer-toolbar-button templates-button ${showTemplatesMenu ? 'active' : ''}`}
                onClick={() => setShowTemplatesMenu(!showTemplatesMenu)}
                title="Вставить шаблонную переменную"
              >
                📝 ШАБЛОНЫ
                <span className="dropdown-arrow">▼</span>
              </button>
              
              {showTemplatesMenu && (
                <div className="templates-menu">
                  <div className="templates-category">
                    <div className="templates-category-title">ЛИЧНЫЕ ДАННЫЕ</div>
                    <div className="templates-items">
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{name}}')}
                        title="Имя"
                      >
                        {'{{name}}'} - Имя
                      </button>
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{surname}}')}
                        title="Фамилия"
                      >
                        {'{{surname}}'} - Фамилия
                      </button>
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{patronymic}}')}
                        title="Отчество"
                      >
                        {'{{patronymic}}'} - Отчество
                      </button>
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{full_name}}')}
                        title="Полное ФИО"
                      >
                        {'{{full_name}}'} - Полное ФИО
                      </button>
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{age}}')}
                        title="Возраст"
                      >
                        {'{{age}}'} - Возраст
                      </button>
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{birthday}}')}
                        title="Дата рождения"
                      >
                        {'{{birthday}}'} - Дата рождения
                      </button>
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{geography}}')}
                        title="Местоположение"
                      >
                        {'{{geography}}'} - Местоположение
                      </button>
                    </div>
                  </div>
                  
                  <div className="templates-category">
                    <div className="templates-category-title">КОНТАКТЫ</div>
                    <div className="templates-items">
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{email}}')}
                        title="Email"
                      >
                        {'{{email}}'} - Email
                      </button>
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{phone}}')}
                        title="Телефон"
                      >
                        {'{{phone}}'} - Телефон
                      </button>
                    </div>
                  </div>
                  
                  <div className="templates-category">
                    <div className="templates-category-title">СИСТЕМНЫЕ ДАННЫЕ</div>
                    <div className="templates-items">
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{registration_date}}')}
                        title="Дата регистрации"
                      >
                        {'{{registration_date}}'} - Дата регистрации
                      </button>
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{days_since_registration}}')}
                        title="Дней с регистрации"
                      >
                        {'{{days_since_registration}}'} - Дней с регистрации
                      </button>
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{user_id}}')}
                        title="ID пользователя"
                      >
                        {'{{user_id}}'} - ID пользователя
                      </button>
                      <button
                        type="button"
                        className="template-item"
                        onClick={() => insertTemplate('{{greeting}}')}
                        title="Приветствие"
                      >
                        {'{{greeting}}'} - Приветствие
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Кнопка ЛИЧНОЕ ДЕЛО */}
          {formData.to.trim() && (
            <div className="email-composer-toolbar-group personal-file-group">
              <button
                type="button"
                className="email-composer-toolbar-button personal-file-button"
                onClick={() => loadClientData(formData.to.trim())}
                disabled={loadingClient}
                title="Открыть личное дело клиента"
              >
                {loadingClient ? '⏳' : '📁'} ЛИЧНОЕ ДЕЛО
              </button>
            </div>
          )}
        </div>

        {/* Тело письма */}
        <div className="email-composer-field">
          <label className="email-composer-label">
            Сообщение <span className="required">*</span>
          </label>
          
          {/* Переключатель между редакторами */}
          <div className="editor-tabs">
            <button
              type="button"
              className={`editor-tab ${formData.activeEditor === 'text' ? 'active' : ''}`}
              onClick={() => handleInputChange('activeEditor', 'text')}
            >
              ТЕКСТ
            </button>
            <button
              type="button"
              className={`editor-tab ${formData.activeEditor === 'html' ? 'active' : ''}`}
              onClick={() => handleInputChange('activeEditor', 'html')}
            >
              HTML
            </button>
          </div>
          
          {/* Текстовый редактор */}
          {formData.activeEditor === 'text' && (
            <textarea
              className="email-composer-textarea"
              value={formData.bodyText}
              onChange={(e) => handleInputChange('bodyText', e.target.value)}
              placeholder="Введите текстовое сообщение..."
            />
          )}
          
          {/* HTML редактор */}
          {formData.activeEditor === 'html' && (
            <div
              className="email-composer-editor"
              contentEditable
              dangerouslySetInnerHTML={{ __html: formData.bodyHtml }}
              onInput={(e) => handleInputChange('bodyHtml', e.target.innerHTML)}
              placeholder="Введите HTML сообщение..."
            />
          )}
        </div>
      </div>
      
      {/* Прелоадер отправки */}
      <EmailSendingLoader 
        isVisible={sending} 
        message={isBroadcast ? "ФОРМИРУЕМ ОЧЕРЕДЬ..." : "ОТПРАВЛЯЕМ..."} 
      />
      
      {/* Модальное окно с личным делом клиента */}
      {showClientModal && clientData && (
        <ClientDetailsModal
          client={clientData}
          onClose={() => {
            setShowClientModal(false);
            setClientData(null);
          }}
        />
      )}
    </div>
  );
};

export default EmailComposer;
