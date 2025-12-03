import React, { useState, useEffect, useRef } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';

const TaskDetailsModal = ({ task, onClose, onTaskUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [documentPreviews, setDocumentPreviews] = useState({});
  const documentPreviewsRef = useRef({});
  const [documentViewer, setDocumentViewer] = useState(null);
  
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    reminderDate: ''
  });

  // Инициализация данных задачи при открытии модального окна
  useEffect(() => {
    if (task) {
      setTaskData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
        reminderDate: task.reminderDate ? new Date(task.reminderDate).toISOString().slice(0, 16) : ''
      });
    }
  }, [task]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setTaskData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setLoading(true);

      // Обновляем задачу
      await axiosAPI.put(`/admin/tasks/${task.id}`, {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        reminderDate: taskData.reminderDate
      });

      // Загружаем новые документы, если они есть
      if (files.length > 0) {
        for (const file of files) {
          const formData = new FormData();
          formData.append('title', file.name);
          formData.append('description', 'Документ, добавленный при редактировании задачи');
          formData.append('file', file);

          await axiosAPI.post(`/admin/tasks/${task.id}/documents`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
        }
      }

      onTaskUpdated();
      onClose();
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Задача успешно обновлена'
        }
      }));
    } catch (error) {
      console.error('Ошибка обновления задачи:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка обновления задачи: ' + error.message
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    // Показываем модальное окно подтверждения
    const shouldDelete = window.confirm('Вы уверены, что хотите удалить эту задачу?');
    if (shouldDelete) {
      try {
        setLoading(true);
        await axiosAPI.delete(`/admin/tasks/${task.id}`);
        onTaskUpdated();
        onClose();
        // Показываем SUCCESS-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'success',
            text: 'Задача успешно удалена'
          }
        }));
      } catch (error) {
        console.error('Ошибка удаления задачи:', error);
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Ошибка удаления задачи'
          }
        }));
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'high': return '#FF9800';
      case 'urgent': return '#F44336';
      default: return '#999';
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'low': return 'Низкий';
      case 'medium': return 'Средний';
      case 'high': return 'Высокий';
      case 'urgent': return 'Срочный';
      default: return 'Не указан';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'В ожидании';
      case 'in_progress': return 'В работе';
      case 'completed': return 'Завершена';
      case 'cancelled': return 'Отменена';
      default: return 'Неизвестно';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFC107';
      case 'in_progress': return '#2196F3';
      case 'completed': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#999';
    }
  };

  // Загрузка превью для документов
  useEffect(() => {
    const loadDocumentPreviews = async () => {
      if (!task?.documents || task.documents.length === 0) return;
      
      const previewsToLoad = [];
      
      task.documents.forEach((doc) => {
        const fileName = doc.originalFileName || doc.title || 'document';
        const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
        const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExt);
        const isPdf = fileExt === 'pdf';
        
        if (isImage || isVideo || isPdf) {
          const previewKey = `task-${task.id}-doc-${doc.id}`;
          if (!documentPreviewsRef.current[previewKey]) {
            previewsToLoad.push({ documentId: doc.id, previewKey, isPdf });
          }
        }
      });

      if (previewsToLoad.length > 0) {
        const loadPromises = previewsToLoad.map(async ({ documentId, previewKey, isPdf }) => {
          try {
            const url = `/admin/task-documents/${documentId}/download${isPdf ? '?preview=true' : ''}`;
            const response = await axiosAPI.get(url, {
              responseType: 'blob'
            });
            const blobUrl = URL.createObjectURL(response.data);
            
            if (!documentPreviewsRef.current[previewKey]) {
              documentPreviewsRef.current[previewKey] = blobUrl;
              setDocumentPreviews(prev => ({
                ...prev,
                [previewKey]: blobUrl
              }));
            } else {
              URL.revokeObjectURL(blobUrl);
            }
          } catch (error) {
            console.error(`❌ Ошибка загрузки превью для ${previewKey}:`, error);
          }
        });

        await Promise.all(loadPromises);
      }
    };

    if (task) {
      loadDocumentPreviews();
    }

    return () => {
      Object.values(documentPreviewsRef.current).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
      documentPreviewsRef.current = {};
      setDocumentPreviews({});
    };
  }, [task]);

  const handleOpenDocumentViewer = async (doc, fileName, fileExt, isImage, isVideo, isPdf) => {
    try {
      const response = await axiosAPI.get(`/admin/task-documents/${doc.id}/download`, {
        responseType: 'blob'
      });

      const blobUrl = URL.createObjectURL(response.data);

      setDocumentViewer({
        url: blobUrl,
        title: fileName,
        isImage,
        isVideo,
        isPdf,
        extension: fileExt,
        documentId: doc.id
      });
    } catch (error) {
      console.error('❌ Ошибка открытия документа:', error);
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка открытия документа: ' + (error.response?.data?.message || error.message)
        }
      }));
    }
  };

  const handleCloseDocumentViewer = () => {
    if (documentViewer?.url) {
      URL.revokeObjectURL(documentViewer.url);
    }
    setDocumentViewer(null);
  };

  const handleDownloadDocument = async (documentId) => {
    try {
      const response = await axiosAPI.get(`/admin/task-documents/${documentId}/download`, {
        responseType: 'blob'
      });
      
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'document';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
      
      const contentType = response.headers['content-type'];
      const blob = new Blob([response.data], { type: contentType });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания документа:', error);
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка скачивания документа'
        }
      }));
    }
  };

  const handleDeleteDocument = async (documentId) => {
    const shouldDelete = window.confirm('Вы уверены, что хотите удалить этот документ?');
    if (!shouldDelete) return;
    
    try {
      await axiosAPI.delete(`/admin/task-documents/${documentId}`);
      
      // Удаляем превью из состояния
      const previewKey = `task-${task.id}-doc-${documentId}`;
      if (documentPreviewsRef.current[previewKey]) {
        URL.revokeObjectURL(documentPreviewsRef.current[previewKey]);
        delete documentPreviewsRef.current[previewKey];
        setDocumentPreviews(prev => {
          const updated = { ...prev };
          delete updated[previewKey];
          return updated;
        });
      }
      
      // Обновляем задачу
      if (onTaskUpdated) {
        onTaskUpdated();
      }
      
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Документ успешно удален'
        }
      }));
    } catch (error) {
      console.error('Ошибка удаления документа:', error);
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка удаления документа: ' + (error.response?.data?.message || error.message)
        }
      }));
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content task-details-modal">
        <div className="modal-header">
          <h3>Детали задачи</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="modal-body">
          {/* Информация о задаче (только для чтения) */}
          <div className="task-info-section">
            <h4>Информация о задаче</h4>
            <div className="info-grid">
              <div className="info-item">
                <label>Статус:</label>
                <span style={{ color: getStatusColor(task.status) }}>
                  {getStatusText(task.status)}
                </span>
              </div>
              <div className="info-item">
                <label>Клиент:</label>
                <span>
                  {task.client ? `${task.client.surname} ${task.client.firstname} ${task.client.patronymic}` : 'Не указан'}
                </span>
              </div>
              <div className="info-item">
                <label>Создана:</label>
                <span>{formatDateTime(task.createdAt)}</span>
              </div>
              {task.completedAt && (
                <div className="info-item">
                  <label>Завершена:</label>
                  <span>{formatDateTime(task.completedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Редактируемые поля */}
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
            <div className="form-group">
              <label>Название задачи *</label>
              <input
                type="text"
                name="title"
                value={taskData.title}
                onChange={handleInputChange}
                placeholder="Введите название задачи"
                required
              />
            </div>

            <div className="form-group">
              <label>Описание</label>
              <textarea
                name="description"
                value={taskData.description}
                onChange={handleInputChange}
                rows="4"
                placeholder="Описание задачи"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Приоритет</label>
                <select
                  name="priority"
                  value={taskData.priority}
                  onChange={handleInputChange}
                >
                  <option value="low">🟢 Низкий</option>
                  <option value="medium">🟡 Средний</option>
                  <option value="high">🟠 Высокий</option>
                  <option value="urgent">🔴 Срочный</option>
                </select>
              </div>

              <div className="form-group">
                <label>Текущий приоритет</label>
                <div className="current-priority" style={{ color: getPriorityColor(task.priority) }}>
                  {getPriorityText(task.priority)}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Дата выполнения</label>
                <input
                  type="date"
                  name="dueDate"
                  value={taskData.dueDate}
                  onChange={handleInputChange}
                />
              </div>

              <div className="form-group">
                <label>Напоминание</label>
                <input
                  type="datetime-local"
                  name="reminderDate"
                  value={taskData.reminderDate}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Существующие документы */}
            {task.documents && task.documents.length > 0 && (
              <div className="existing-documents">
                <h4>Документы задачи</h4>
                <div className="task-documents-grid">
                  {task.documents.map(doc => {
                    const fileName = doc.originalFileName || doc.title || 'document';
                    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
                    const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExt);
                    const isPdf = fileExt === 'pdf';
                    
                    // Превью показываем для изображений, видео и PDF
                    const showPreview = isImage || isVideo || isPdf;
                    const previewKey = `task-${task.id}-doc-${doc.id}`;
                    const previewUrl = showPreview ? (documentPreviews[previewKey] || null) : null;
                    
                    const handlePreviewClick = () => {
                      // Открываем полноэкранный вьювер
                      handleOpenDocumentViewer(doc, fileName, fileExt, isImage, isVideo, isPdf);
                    };
                    
                    const handleDownloadClick = (e) => {
                      e.stopPropagation();
                      handleDownloadDocument(doc.id);
                    };
                    
                    const handleDeleteClick = (e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.id);
                    };
                    
                    return (
                      <div 
                        key={`task-${task.id}-doc-${doc.id}`} 
                        className="task-document-card"
                      >
                        <div 
                          className="task-document-preview"
                          onClick={handlePreviewClick}
                          style={{ cursor: 'pointer' }}
                        >
                          {showPreview && previewUrl ? (
                            isImage || isPdf ? (
                              <img 
                                src={previewUrl} 
                                alt={fileName}
                                onError={(e) => {
                                  console.error('❌ Ошибка загрузки изображения/PDF:', e);
                                  e.target.style.display = 'none';
                                  const fallback = e.target.parentElement.querySelector('.document-icon-fallback');
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : isVideo ? (
                              <video 
                                src={previewUrl}
                                preload="metadata"
                                onError={(e) => {
                                  console.error('❌ Ошибка загрузки видео:', e);
                                  e.target.style.display = 'none';
                                  const fallback = e.target.parentElement.querySelector('.document-icon-fallback');
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null
                          ) : null}
                          <div className="document-icon-fallback" style={{ display: showPreview && previewUrl ? 'none' : 'flex' }}>
                            <span className="file-icon">
                              {fileExt === 'pdf' ? '📄' : 
                               fileExt === 'doc' || fileExt === 'docx' ? '📝' :
                               fileExt === 'xls' || fileExt === 'xlsx' ? '📊' :
                               isVideo ? '🎥' :
                               '📎'}
                            </span>
                          </div>
                        </div>
                        <div className="task-document-info">
                          <span className="task-document-name" title={fileName}>
                            {fileName}
                          </span>
                          <div className="task-document-actions">
                            <button 
                              className="btn-download"
                              onClick={handleDownloadClick}
                            >
                              📥 Скачать
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={handleDeleteClick}
                            >
                              🗑️ Удалить
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Добавление новых документов */}
            <div className="form-group">
              <label>Добавить документы</label>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.jpg,.jpeg,.png,.gif,.webp,.json,.xml"
              />
              <small>Можно выбрать несколько файлов</small>
              
              {files.length > 0 && (
                <div className="files-list">
                  <h4>Новые файлы:</h4>
                  {files.map((file, index) => (
                    <div key={index} className="file-item">
                      <span>{file.name}</span>
                      <button 
                        type="button"
                        onClick={() => removeFile(index)}
                        className="btn-remove-file"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
              <button type="button" onClick={handleDeleteTask} className="btn-delete" disabled={loading}>
                🗑️ Удалить задачу
              </button>
              <button type="button" onClick={onClose} className="btn-cancel">
                Отменить
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Полноэкранный вьювер документа */}
      {documentViewer && (
        <div className="client-doc-viewer-overlay" onClick={handleCloseDocumentViewer}>
          <div className="client-doc-viewer-container" onClick={(e) => e.stopPropagation()}>
            <div className="client-doc-viewer-header">
              <div className="client-doc-viewer-title">{documentViewer.title}</div>
              <div className="client-doc-viewer-meta">
                {documentViewer.extension.toUpperCase()} · Документ задачи
              </div>
              <div className="client-doc-viewer-actions">
                <button
                  className="btn-download"
                  onClick={() => handleDownloadDocument(documentViewer.documentId)}
                >
                  📥 Скачать
                </button>
                <button
                  className="btn-close"
                  onClick={handleCloseDocumentViewer}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="client-doc-viewer-content">
              {documentViewer.isImage && (
                <img src={documentViewer.url} alt={documentViewer.title} />
              )}
              {documentViewer.isVideo && (
                <video src={documentViewer.url} controls autoPlay>
                  Ваш браузер не поддерживает видео.
                </video>
              )}
              {!documentViewer.isImage && !documentViewer.isVideo && documentViewer.isPdf && (
                <iframe src={documentViewer.url} title={documentViewer.title} />
              )}
              {!documentViewer.isImage && !documentViewer.isVideo && !documentViewer.isPdf && (
                <div className="client-doc-viewer-fallback">
                  <div className="client-doc-viewer-ext">{documentViewer.extension.toUpperCase()}</div>
                  <button
                    className="btn-download-large"
                    onClick={() => handleDownloadDocument(documentViewer.documentId)}
                  >
                    📥 Скачать документ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskDetailsModal;
