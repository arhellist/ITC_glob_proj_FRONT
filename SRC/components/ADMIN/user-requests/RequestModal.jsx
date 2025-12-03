import React from 'react'; // Импорт React
import './RequestModal.css'; // Импорт стилей модального окна
import { API_CONFIG } from '../../../config/api.js'; // Импорт конфигурации API

const RequestModal = ({ request, onClose, onApprove, onReject }) => { // Компонент модального окна заявки
  if (!request) return null; // Если заявка не передана, не рендерим модалку
  
  // Функция форматирования даты и времени
  const formatDateTime = (dateString) => { // Форматирование даты
    if (!dateString) return 'Нет данных'; // Если даты нет
    const date = new Date(dateString); // Создаем объект Date
    return date.toLocaleString('ru-RU', { // Форматируем в русском формате
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Функция получения русского названия типа
  const getTypeLabel = (type) => { // Функция перевода типа
    switch (type) {
      case 'deposit': return 'ПОПОЛНЕНИЕ';
      case 'withdrawal': return 'ВЫВОД';
      case 'transfer': return 'ПЕРЕВОД';
      default: return type?.toUpperCase() || 'НЕИЗВЕСТНО';
    }
  };
  
  // Функция получения русского названия статуса
  const getStatusLabel = (status) => { // Функция перевода статуса
    switch (status) {
      case 'processing': return 'НА РАССМОТРЕНИИ';
      case 'credited': return 'ПРИНЯТАЯ';
      case 'rejected': return 'ОТКЛОНЕННАЯ';
      case 'Pending': return 'НА РАССМОТРЕНИИ';
      case 'Resolve': return 'ПРИНЯТАЯ';
      case 'Reject': return 'ОТКЛОНЕННАЯ';
      default: return status?.toUpperCase() || 'НЕИЗВЕСТНО';
    }
  };
  
  // Функция получения URL чека
  const getReceiptUrl = (receiptPath) => { // Функция формирования URL чека
    if (!receiptPath || receiptPath === 'Нет данных') return null; // Если чека нет
    const token = localStorage.getItem('accessToken'); // Получаем токен
    if (!token) return null; // Если токена нет
    return `${API_CONFIG.BASE_URL}/admin/receipts/${receiptPath}?token=${token}&t=${Date.now()}`; // URL чека
  };
  
  // Обработка клика по оверлею (закрытие модалки)
  const handleOverlayClick = (e) => { // Обработчик клика по фону
    if (e.target === e.currentTarget) { // Если клик по самому оверлею, а не по контенту
      onClose(); // Закрываем модалку
    }
  };
  
  return (
    <div className="request-modal-overlay flex" onClick={handleOverlayClick}>
      <div className="request-modal-container gradient-border bru flex flex-column">
        {/* Заголовок модального окна */}
        <div className="request-modal-header flex flex-row">
          <h2 className="request-modal-title">
            {getTypeLabel(request.type)} #{request.id}
          </h2>
          <button className="request-modal-close-btn pointer" onClick={onClose}>✕</button>
        </div>
        
        {/* Контент модального окна */}
        <div className="request-modal-content flex flex-column">
          {/* Информация о пользователе */}
          <div className="request-modal-section">
            <h3 className="request-modal-section-title">ИНФОРМАЦИЯ О КЛИЕНТЕ</h3>
            <div className="request-modal-info-grid">
              <div className="request-modal-info-item">
                <span className="request-modal-info-label">ФИО:</span>
                <span className="request-modal-info-value">{request.userFullName || 'Неизвестно'}</span>
              </div>
              <div className="request-modal-info-item">
                <span className="request-modal-info-label">E-mail:</span>
                <span className="request-modal-info-value">{request.userEmail || 'Неизвестно'}</span>
              </div>
              <div className="request-modal-info-item">
                <span className="request-modal-info-label">ID пользователя:</span>
                <span className="request-modal-info-value">{request.userId || 'Неизвестно'}</span>
              </div>
            </div>
          </div>
          
          {/* Информация о заявке */}
          <div className="request-modal-section">
            <h3 className="request-modal-section-title">ДЕТАЛИ ЗАЯВКИ</h3>
            <div className="request-modal-info-grid">
              <div className="request-modal-info-item">
                <span className="request-modal-info-label">Тип операции:</span>
                <span className="request-modal-info-value">{getTypeLabel(request.type)}</span>
              </div>
              <div className="request-modal-info-item">
                <span className="request-modal-info-label">Статус:</span>
                <span className="request-modal-info-value">{getStatusLabel(request.status)}</span>
              </div>
              <div className="request-modal-info-item">
                <span className="request-modal-info-label">Дата создания:</span>
                <span className="request-modal-info-value">{formatDateTime(request.date)}</span>
              </div>
              
              {/* Для депозитов и выводов */}
              {(request.type === 'deposit' || request.type === 'withdrawal') && (
                <>
                  <div className="request-modal-info-item">
                    <span className="request-modal-info-label">Счет:</span>
                    <span className="request-modal-info-value">{request.accountInfo || 'Неизвестно'}</span>
                  </div>
                  <div className="request-modal-info-item">
                    <span className="request-modal-info-label">Сумма:</span>
                    <span className="request-modal-info-value">{request.amount || 0} {request.currency || 'USD'}</span>
                  </div>
                </>
              )}
              
              {/* Для переводов */}
              {request.type === 'transfer' && (
                <>
                  <div className="request-modal-info-item">
                    <span className="request-modal-info-label">Со счета:</span>
                    <span className="request-modal-info-value">{request.fromAccount || 'Неизвестно'}</span>
                  </div>
                  <div className="request-modal-info-item">
                    <span className="request-modal-info-label">На счет:</span>
                    <span className="request-modal-info-value">{request.toAccount || 'Неизвестно'}</span>
                  </div>
                  <div className="request-modal-info-item">
                    <span className="request-modal-info-label">Сумма перевода:</span>
                    <span className="request-modal-info-value">{request.amount || 0} {request.currency || 'USD'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Чеки для депозитов */}
          {request.type === 'deposit' && request.receipt && (
            <div className="request-modal-section">
              <h3 className="request-modal-section-title">ЧЕК ПОПОЛНЕНИЯ</h3>
              <div className="request-modal-receipt-container">
                {getReceiptUrl(request.receipt) ? (
                  <img 
                    src={getReceiptUrl(request.receipt)} 
                    alt="Чек пополнения"
                    className="request-modal-receipt-image"
                    onClick={() => window.open(getReceiptUrl(request.receipt), '_blank')}
                  />
                ) : (
                  <div className="request-modal-no-receipt">
                    <span>Чек не прикреплен</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Реквизиты для выводов */}
          {request.type === 'withdrawal' && request.requisites && (
            <div className="request-modal-section">
              <h3 className="request-modal-section-title">РЕКВИЗИТЫ ДЛЯ ВЫВОДА</h3>
              <div className="request-modal-requisites">
                <pre>{request.requisites}</pre>
              </div>
            </div>
          )}
          
          {/* Причина отклонения (для отклоненных заявок) */}
          {(request.status === 'rejected' || request.status === 'Reject') && request.rejectReason && (
            <div className="request-modal-section">
              <h3 className="request-modal-section-title request-modal-reject-title">ПРИЧИНА ОТКЛОНЕНИЯ</h3>
              <div className="request-modal-reject-reason">
                <p>{request.rejectReason}</p>
              </div>
            </div>
          )}
          
          {/* Информация об обработавшем админе (для принятых/отклоненных заявок) */}
          {(request.status === 'credited' || request.status === 'Resolve' || request.status === 'rejected' || request.status === 'Reject') && request.processedByAdminEmail && (
            <div className="request-modal-section">
              <h3 className="request-modal-section-title">ОБРАБОТАНО АДМИНИСТРАТОРОМ</h3>
              <div className="request-modal-admin-info">
                <p>Email: <strong>{request.processedByAdminEmail}</strong></p>
              </div>
            </div>
          )}
        </div>
        
        {/* Кнопки действий - для НЕ принятых заявок */}
        {request.status !== 'credited' && request.status !== 'Resolve' && (
          <div className="request-modal-actions flex flex-row">
            <button 
              className="request-modal-action-btn request-modal-approve-btn gradient-border bru"
              onClick={() => onApprove(request)}
            >
              ✓ ПРИНЯТЬ
            </button>
            {/* Кнопка "ОТКЛОНИТЬ" только для НЕ отклоненных заявок */}
            {request.status !== 'rejected' && request.status !== 'Reject' && (
              <button 
                className="request-modal-action-btn request-modal-reject-btn gradient-border bru"
                onClick={() => onReject(request)}
              >
                ✕ ОТКЛОНИТЬ
              </button>
            )}
          </div>
        )}
        
        {/* Сообщение для принятых заявок */}
        {(request.status === 'credited' || request.status === 'Resolve') && (
          <div className="request-modal-processed-message request-modal-approved-message">
            <span>✓ Заявка уже принята</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestModal; // Экспорт компонента

