import React, { useState } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';

const TaskCard = ({ task, onTaskUpdate, onTaskClick, isOverdue }) => {
  const [showDetails, setShowDetails] = useState(false);

  const handleDeleteTask = async () => {
    // Проверяем, является ли задача просроченной
    if (isOverdue) {
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Просроченные задачи можно удалять только ROOT и ADMIN'
        }
      }));
      return;
    }

    // Показываем модальное окно подтверждения
    const shouldDelete = window.confirm('Вы уверены, что хотите удалить эту задачу?');
    if (shouldDelete) {
      try {
        await axiosAPI.delete(`/admin/tasks/${task.id}`);
        onTaskUpdate();
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
      }
    }
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

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'low': return '🟢';
      case 'medium': return '🟡';
      case 'high': return '🟠';
      case 'urgent': return '🔴';
      default: return '⚪';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('ru-RU');
  };

  return (
    <div className="task-card" onClick={() => onTaskClick && onTaskClick(task)}>
      <div className="task-header">
        <h4 className="task-title">{task.title}</h4>
        <div className="task-actions">
          <button 
            className="btn-details"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(!showDetails);
            }}
            title="Подробности"
          >
            {showDetails ? '👁️‍🗨️' : '👁️'}
          </button>
          <button 
            className={`btn-delete ${isOverdue ? 'disabled' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTask();
            }}
            title={isOverdue ? "Просроченные задачи можно удалять только ROOT и ADMIN" : "Удалить задачу"}
            disabled={isOverdue}
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="task-meta">
        <div className="task-priority">
          <span 
            className="priority-indicator"
            style={{ color: getPriorityColor(task.priority) }}
          >
            {getPriorityIcon(task.priority)}
          </span>
          <span className="priority-text">
            {task.priority === 'low' && 'Низкий'}
            {task.priority === 'medium' && 'Средний'}
            {task.priority === 'high' && 'Высокий'}
            {task.priority === 'urgent' && 'Срочный'}
          </span>
        </div>

        {task.dueDate && (
          <div className="task-due-date">
            📅 {formatDate(task.dueDate)}
          </div>
        )}

        {task.reminderDate && (
          <div className="task-reminder">
            ⏰ {formatDateTime(task.reminderDate)}
          </div>
        )}

        {task.documents && task.documents.length > 0 && (
          <div className="task-documents-count">
            📎 {task.documents.length} документ(ов)
          </div>
        )}
      </div>

      {showDetails && (
        <div className="task-details">
          {task.description && (
            <div className="task-description">
              <strong>Описание:</strong>
              <p>{task.description}</p>
            </div>
          )}

          <div className="task-info">
            <div className="task-client">
              <strong>Клиент:</strong> {task.client ? `${task.client.surname} ${task.client.firstname} ${task.client.patronymic}` : 'Не указан'}
            </div>
            <div className="task-created">
              <strong>Создана:</strong> {formatDateTime(task.createdAt)}
            </div>
            
            {task.completedAt && (
              <div className="task-completed">
                <strong>Завершена:</strong> {formatDateTime(task.completedAt)}
              </div>
            )}
          </div>

          {task.documents && task.documents.length > 0 && (
            <div className="task-documents">
              <strong>Документы:</strong>
              {task.documents.map(doc => (
                <div key={`task-${task.id}-doc-${doc.id}`} className="document-item">
                  <span>{doc.title}</span>
                  <button 
                    className="btn-download"
                    onClick={async () => {
                      try {
                        const response = await axiosAPI.get(`/admin/task-documents/${doc.id}/download`, {
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
                        // Показываем ERROR-уведомление
                        document.dispatchEvent(new CustomEvent('main-notify', {
                          detail: {
                            type: 'error',
                            text: 'Ошибка скачивания документа'
                          }
                        }));
                      }
                    }}
                  >
                    📥
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskCard;
