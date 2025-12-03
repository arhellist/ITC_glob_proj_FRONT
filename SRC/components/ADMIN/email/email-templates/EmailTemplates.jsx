import React, { useEffect, useState } from 'react';
import './EmailTemplates.css';
import axiosAPI from '../../../../JS/auth/http/axios';

/**
 * Компонент управления шаблонами писем
 */
const EmailTemplates = ({ onTemplateSelect, selectedTemplate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const { data } = await axiosAPI.get('/admin/email/templates');
      
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки шаблонов:', error);
      setError('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setShowCreateForm(true);
  };

  const handleEditTemplate = (template) => {
    setEditingTemplate(template);
    setShowCreateForm(true);
  };

  const handleDeleteTemplate = async (templateId) => {
    // Показываем модальное окно подтверждения
    const shouldDelete = window.confirm('Вы уверены, что хотите удалить этот шаблон?');
    if (!shouldDelete) {
      return;
    }

    try {
      const { data } = await axiosAPI.delete(`/admin/email/templates/${templateId}`);
      
      if (data.success) {
        await loadTemplates();
      }
    } catch (error) {
      console.error('Ошибка удаления шаблона:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка удаления шаблона'
        }
      }));
    }
  };

  const handleUseTemplate = (template) => {
    onTemplateSelect(template);
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="email-templates">
        <div className="email-loading">
          Загрузка шаблонов...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="email-templates">
        <div className="email-empty-state">
          <p>{error}</p>
          <button 
            className="email-action-button"
            onClick={loadTemplates}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="email-templates">
      {/* Заголовок */}
      <div className="email-templates-header">
        <div className="email-templates-title">
          <h3>Шаблоны писем</h3>
          <span className="email-templates-count">
            {templates.length} шаблонов
          </span>
        </div>
        
        <button
          className="email-action-button"
          onClick={handleCreateTemplate}
        >
          ➕ Создать шаблон
        </button>
      </div>

      {/* Список шаблонов */}
      <div className="email-templates-list">
        {templates.length === 0 ? (
          <div className="email-empty-state">
            <h3>Нет шаблонов</h3>
            <p>Создайте первый шаблон для быстрого написания писем</p>
            <button 
              className="email-action-button"
              onClick={handleCreateTemplate}
            >
              Создать шаблон
            </button>
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.id}
              className={`email-template-item ${selectedTemplate?.id === template.id ? 'selected' : ''}`}
              onClick={() => handleUseTemplate(template)}
            >
              <div className="email-template-info">
                <div className="email-template-header">
                  <h4 className="email-template-name">
                    {template.name}
                  </h4>
                  <span className="email-template-date">
                    {formatDate(template.created_at)}
                  </span>
                </div>
                
                <div className="email-template-subject">
                  {template.subject || '(Без темы)'}
                </div>
                
                <div className="email-template-preview">
                  {truncateText(template.body_text || template.body_html)}
                </div>
                
                <div className="email-template-meta">
                  <span className="email-template-type">
                    {template.type || 'custom'}
                  </span>
                  {template.category && (
                    <span className="email-template-category">
                      {template.category}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="email-template-actions">
                <button
                  className="email-template-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditTemplate(template);
                  }}
                  title="Редактировать"
                >
                  ✏️
                </button>
                
                <button
                  className="email-template-action"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUseTemplate(template);
                  }}
                  title="Использовать"
                >
                  📤
                </button>
                
                <button
                  className="email-template-action danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteTemplate(template.id);
                  }}
                  title="Удалить"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Форма создания/редактирования шаблона */}
      {showCreateForm && (
        <EmailTemplateForm
          template={editingTemplate}
          onClose={() => {
            setShowCreateForm(false);
            setEditingTemplate(null);
          }}
          onSave={loadTemplates}
        />
      )}
    </div>
  );
};

/**
 * Форма создания/редактирования шаблона
 */
const EmailTemplateForm = ({ template, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    body: template?.body_text || template?.body_html || '',
    category: template?.category || '',
    type: template?.type || 'custom'
  });
  const [saving, setSaving] = useState(false);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Укажите название шаблона'
        }
      }));
      return;
    }

    try {
      setSaving(true);
      
      const endpoint = template 
        ? `/admin/email/templates/${template.id}`
        : '/admin/email/templates';
      
      const method = template ? 'PUT' : 'POST';
      
      const { data } = await axiosAPI[method.toLowerCase()](endpoint, formData);
      
      if (data.success) {
        // Показываем SUCCESS-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'success',
            text: template ? 'Шаблон обновлен' : 'Шаблон создан'
          }
        }));
        onSave();
        onClose();
      }
    } catch (error) {
      console.error('Ошибка сохранения шаблона:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка сохранения шаблона'
        }
      }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="email-template-form-overlay">
      <div className="email-template-form">
        <div className="email-template-form-header">
          <h3>
            {template ? 'Редактировать шаблон' : 'Создать шаблон'}
          </h3>
          <button
            className="email-template-form-close"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="email-template-form-content">
          <div className="email-template-form-field">
            <label>Название шаблона *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Название шаблона"
            />
          </div>
          
          <div className="email-template-form-field">
            <label>Тема письма</label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Тема письма"
            />
          </div>
          
          <div className="email-template-form-field">
            <label>Категория</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              placeholder="Категория"
            />
          </div>
          
          <div className="email-template-form-field">
            <label>Содержимое шаблона *</label>
            <textarea
              value={formData.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              placeholder="Содержимое шаблона..."
              rows={10}
            />
          </div>
        </div>
        
        <div className="email-template-form-actions">
          <button
            className="email-action-button secondary"
            onClick={onClose}
            disabled={saving}
          >
            Отмена
          </button>
          
          <button
            className="email-action-button"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplates;
