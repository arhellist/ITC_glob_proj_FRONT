import React, { useState } from 'react'; // Импорт React и хуков
import './RejectReasonModal.css'; // Импорт стилей

const RejectReasonModal = ({ request, onConfirm, onCancel }) => { // Компонент модального окна причины отклонения
  const [reason, setReason] = useState(''); // Состояние причины отклонения
  
  // Обработчик подтверждения
  const handleConfirm = () => { // Функция подтверждения
    if (!reason.trim()) { // Если причина не указана
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Пожалуйста, укажите причину отклонения!'
        }
      }));
      return; // Прерываем выполнение
    }
    onConfirm(reason); // Вызываем callback с причиной
  };
  
  // Обработка клика по оверлею (закрытие модалки)
  const handleOverlayClick = (e) => { // Обработчик клика по фону
    if (e.target === e.currentTarget) { // Если клик по самому оверлею
      onCancel(); // Закрываем модалку
    }
  };
  
  return (
    <div className="reject-reason-modal-overlay flex" onClick={handleOverlayClick}>
      <div className="reject-reason-modal-container gradient-border bru flex flex-column">
        {/* Заголовок */}
        <div className="reject-reason-modal-header flex flex-row">
          <h2 className="reject-reason-modal-title">
            ПРИЧИНА ОТКЛОНЕНИЯ ЗАЯВКИ #{request.id}
          </h2>
          <button className="reject-reason-modal-close-btn pointer" onClick={onCancel}>✕</button>
        </div>
        
        {/* Информация о заявке */}
        <div className="reject-reason-modal-info">
          <p>
            <span className="reject-reason-modal-info-label">Тип заявки:</span> 
            <strong>{request.type === 'deposit' ? 'ПОПОЛНЕНИЕ' : request.type === 'withdrawal' ? 'ВЫВОД' : 'ПЕРЕВОД'}</strong>
          </p>
          <p>
            <span className="reject-reason-modal-info-label">Клиент:</span> 
            <strong>{request.userFullName}</strong>
          </p>
          <p>
            <span className="reject-reason-modal-info-label">Email:</span> 
            <strong>{request.userEmail}</strong>
          </p>
          <p>
            <span className="reject-reason-modal-info-label">Сумма:</span> 
            <strong>{request.amount || 0} {request.currency || 'USD'}</strong>
          </p>
          
          {/* Для депозитов - счет пополнения */}
          {request.type === 'deposit' && (
            <p>
              <span className="reject-reason-modal-info-label">Счет пополнения:</span> 
              <strong>{request.toAccount || 'Неизвестно'}</strong>
            </p>
          )}
          
          {/* Для выводов - счет вывода */}
          {request.type === 'withdrawal' && (
            <p>
              <span className="reject-reason-modal-info-label">Счет вывода:</span> 
              <strong>{request.fromAccount || 'Неизвестно'}</strong>
            </p>
          )}
          
          {/* Для переводов - оба счета */}
          {request.type === 'transfer' && (
            <>
              <p>
                <span className="reject-reason-modal-info-label">Со счета:</span> 
                <strong>{request.fromAccount || 'Неизвестно'}</strong>
              </p>
              <p>
                <span className="reject-reason-modal-info-label">На счет:</span> 
                <strong>{request.toAccount || 'Неизвестно'}</strong>
              </p>
            </>
          )}
        </div>
        
        {/* Поле ввода причины */}
        <div className="reject-reason-modal-input-container">
          <label htmlFor="reject-reason" className="reject-reason-modal-label">
            Укажите причину отклонения:
          </label>
          <textarea
            id="reject-reason"
            className="reject-reason-modal-textarea bru"
            placeholder="Введите причину отклонения заявки..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={6}
          />
        </div>
        
        {/* Кнопки действий */}
        <div className="reject-reason-modal-actions flex flex-row">
          <button 
            className="reject-reason-modal-cancel-btn gradient-border bru"
            onClick={onCancel}
          >
            ОТМЕНА
          </button>
          <button 
            className="reject-reason-modal-confirm-btn gradient-border bru"
            onClick={handleConfirm}
          >
            ПОДТВЕРДИТЬ ОТКЛОНЕНИЕ
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectReasonModal; // Экспорт компонента

