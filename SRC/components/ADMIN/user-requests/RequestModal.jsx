import React, { useState, useEffect } from 'react'; // Импорт React
import './RequestModal.css'; // Импорт стилей модального окна
import { API_CONFIG } from '../../../config/api.js'; // Импорт конфигурации API
import ReceiptPreview from './ReceiptPreview.jsx'; // Импорт компонента превью чека
import adminService from '../../../JS/services/admin-service.js'; // Импорт сервиса админ-панели

const RequestModal = ({ request, onClose, onApprove, onReject }) => { // Компонент модального окна заявки
  const [fullscreenReceipt, setFullscreenReceipt] = useState(null); // Полноэкранный просмотр чека
  const [comment, setComment] = useState(request?.adminComment || ''); // Комментарий администратора
  const [savingComment, setSavingComment] = useState(false); // Флаг сохранения комментария
  
  // Обновляем комментарий при изменении request
  useEffect(() => {
    setComment(request?.adminComment || '');
  }, [request?.adminComment]);
  
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
        {/* Заголовок модального окна - зафиксирован вверху */}
        <div className="request-modal-header flex flex-row">
          <h2 className="request-modal-title">
            {getTypeLabel(request.type)} #{request.id}
          </h2>
          <button className="request-modal-close-btn pointer" onClick={onClose}>✕</button>
        </div>
        
        {/* Контент модального окна - прокручиваемый */}
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
          
          {/* Чеки для депозитов */}
          {request.type === 'deposit' && request.receipt && (
            <div className="request-modal-section">
              <h3 className="request-modal-section-title">ЧЕК ПОПОЛНЕНИЯ</h3>
              <div className="request-modal-receipt-container">
                <ReceiptPreview 
                  receiptPath={request.receipt}
                  onClick={() => setFullscreenReceipt(request.receipt)}
                />
              </div>
            </div>
          )}
          
          {/* Комментарий администратора */}
          <div className="request-modal-section">
            <h3 className="request-modal-section-title">КОММЕНТАРИЙ АДМИНИСТРАТОРА</h3>
            <div className="request-modal-comment-container">
              <textarea
                className="request-modal-comment-input"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Добавьте комментарий к заявке..."
                rows={4}
              />
              <button
                className="request-modal-comment-save-btn"
                onClick={async () => {
                  setSavingComment(true);
                  try {
                    await adminService.updateRequestComment(request.id, request.type, comment);
                    document.dispatchEvent(new CustomEvent('main-notify', {
                      detail: { type: 'success', text: 'Комментарий сохранен' }
                    }));
                    // Обновляем request с новым комментарием
                    if (request) {
                      request.adminComment = comment;
                    }
                  } catch (err) {
                    console.error('Ошибка сохранения комментария:', err);
                    document.dispatchEvent(new CustomEvent('main-notify', {
                      detail: { type: 'error', text: 'Ошибка сохранения комментария' }
                    }));
                  } finally {
                    setSavingComment(false);
                  }
                }}
                disabled={savingComment}
              >
                {savingComment ? 'Сохранение...' : 'Сохранить комментарий'}
              </button>
            </div>
          </div>
          
          {/* Реквизиты для выводов */}
          {request.type === 'withdrawal' && request.requisites && (
            <div className="request-modal-section">
              <h3 className="request-modal-section-title">РЕКВИЗИТЫ ДЛЯ ВЫВОДА</h3>
              <div className="request-modal-requisites">
                <pre>{request.requisites}</pre>
              </div>
            </div>
          )}
          
          {/* Штрафы для выводов */}
          {request.type === 'withdrawal' && (
            <div className="request-modal-section">
              <h3 className="request-modal-section-title">ШТРАФЫ</h3>
              <div className="request-modal-info-grid">
                <div className="request-modal-info-item">
                  <span className="request-modal-info-label">Общая сумма штрафов:</span>
                  <span className="request-modal-info-value" style={{ color: (request.penalty || 0) > 0 ? '#f44336' : '#e7ecf5' }}>
                    {(request.penalty || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {request.currency || 'USD'}
                  </span>
                </div>
              </div>
              {request.fines && request.fines.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '12px', color: '#7f8aa3', marginBottom: '12px', textTransform: 'uppercase' }}>Детали штрафов:</h4>
                  {request.fines.map((fine, idx) => (
                    <div key={fine.id || idx} style={{ 
                      padding: '12px', 
                      marginBottom: '8px', 
                      background: 'rgba(255, 152, 0, 0.1)', 
                      borderLeft: '4px solid #ff9800', 
                      borderRadius: '8px' 
                    }}>
                      <div style={{ fontSize: '13px', color: '#ff9800', marginBottom: '4px' }}>
                        <strong>Сумма:</strong> {fine.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {request.currency || 'USD'}
                      </div>
                      {fine.description && (
                        <div style={{ fontSize: '12px', color: '#e7ecf5', marginTop: '4px' }}>
                          <strong>Описание:</strong> {fine.description}
                        </div>
                      )}
                      {fine.status && (
                        <div style={{ fontSize: '12px', color: '#9aa6bf', marginTop: '4px' }}>
                          <strong>Статус:</strong> {fine.status}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
          
          {/* Информация о заявке - последняя секция */}
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
                  <div className="request-modal-info-item">
                    <span className="request-modal-info-label">Сумма получения:</span>
                    <span className="request-modal-info-value">
                      {request.currency === request.transferCurrency ? (
                        // Если валюты одинаковые - показываем сумму перевода
                        `${(request.amount || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${request.transferCurrency || 'USD'}`
                      ) : (
                        // Если валюты разные
                        request.status === 'Pending' ? (
                          // Если в обработке - показываем "обрабатывается"
                          'обрабатывается'
                        ) : (
                          // Если обработано - показываем фактическую сумму получения
                          `${(request.transferAmount || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${request.transferCurrency || 'USD'}`
                        )
                      )}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* Кнопки действий - зафиксированы внизу */}
        <div className="request-modal-footer">
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
      
      {/* Полноэкранный просмотр чека */}
      {fullscreenReceipt && (
        <div 
          className="receipt-fullscreen-overlay"
          onClick={() => setFullscreenReceipt(null)}
        >
          <div 
            className="receipt-fullscreen-container"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="receipt-fullscreen-close"
              onClick={() => setFullscreenReceipt(null)}
            >
              ✕
            </button>
            {(() => {
              const normalizedPath = fullscreenReceipt.startsWith('/') ? fullscreenReceipt.substring(1) : fullscreenReceipt;
              const token = localStorage.getItem('accessToken');
              return (
                <>
                  {fullscreenReceipt.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={`${API_CONFIG.BASE_URL}/admin/receipts/${normalizedPath}?token=${token}`}
                      className="receipt-fullscreen-content receipt-fullscreen-pdf"
                      title="Чек"
                    />
                  ) : (
                    <img
                      src={`${API_CONFIG.BASE_URL}/admin/receipts/${normalizedPath}?token=${token}&t=${Date.now()}`}
                      alt="Чек"
                      className="receipt-fullscreen-content receipt-fullscreen-image"
                    />
                  )}
                  <button
                    className="receipt-fullscreen-download"
                    onClick={async () => {
                      try {
                        const downloadUrl = `${API_CONFIG.BASE_URL}/admin/receipts/${normalizedPath}?token=${token}&download=true`;
                        
                        // Используем fetch для получения файла как blob
                        const response = await fetch(downloadUrl, {
                          method: 'GET',
                          headers: {
                            'Authorization': `Bearer ${token}`
                          }
                        });
                        
                        if (!response.ok) {
                          throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);
                        }
                        
                        // Получаем blob
                        const blob = await response.blob();
                        
                        // Создаем временную ссылку для скачивания
                        const blobUrl = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = normalizedPath.split('/').pop() || 'receipt';
                        document.body.appendChild(link);
                        link.click();
                        
                        // Очищаем
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(blobUrl);
                      } catch (error) {
                        console.error('Ошибка скачивания чека:', error);
                        alert(`Ошибка скачивания: ${error.message}`);
                      }
                    }}
                  >
                    Скачать
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestModal; // Экспорт компонента

