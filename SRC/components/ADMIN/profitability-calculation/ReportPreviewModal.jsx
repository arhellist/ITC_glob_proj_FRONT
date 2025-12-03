import React, { useState } from 'react';
import './ReportPreviewModal.css';
import reportService from '../../../JS/services/report-service';
import { getSocket, connect } from '../../../JS/websocket/websocket-service';

const ReportPreviewModal = ({ 
  isOpen, 
  onClose, 
  accountData 
}) => {
  const [isSending, setIsSending] = useState(false);
  const [sendStatus, setSendStatus] = useState(null); // 'sending', 'sent', 'delivered', 'failed'
  const [socket, setSocket] = useState(null);

  // WebSocket подключение для получения статусов отправки
  React.useEffect(() => {
    if (!isOpen || !accountData?.id) return;
    
    const setupWebSocket = async () => {
      await connect();
      const wsSocket = getSocket();
      setSocket(wsSocket);
      
      if (wsSocket) {
        // Слушаем статус отправки отчета
        wsSocket.on('report:queue_item_sent', (data) => {
          if (data.queueId === accountData.id) {
            console.log('📊 Отчет отправлен:', data);
            setSendStatus('sent');
            
            // Показываем SUCCESS-уведомление
            document.dispatchEvent(new CustomEvent('main-notify', {
              detail: {
                type: 'success',
                text: 'Отчет успешно отправлен!'
              }
            }));
          }
        });
        
        // Слушаем статус доставки отчета
        wsSocket.on('report:queue_item_delivered', (data) => {
          if (data.queueId === accountData.id) {
            console.log('📊 Отчет доставлен:', data);
            setSendStatus('delivered');
            
            // Показываем SUCCESS-уведомление
            document.dispatchEvent(new CustomEvent('main-notify', {
              detail: {
                type: 'success',
                text: 'Отчет успешно доставлен!'
              }
            }));
          }
        });
        
        // Слушаем ошибки отправки
        wsSocket.on('report:queue_item_failed', (data) => {
          if (data.queueId === accountData.id) {
            console.log('📊 Ошибка отправки отчета:', data);
            setSendStatus('failed');
            
            // Показываем ERROR-уведомление
            document.dispatchEvent(new CustomEvent('main-notify', {
              detail: {
                type: 'error',
                text: 'Ошибка отправки отчета: ' + (data.error || 'Неизвестная ошибка')
              }
            }));
          }
        });
      }
    };
    
    setupWebSocket();
    
    return () => {
      if (socket) {
        socket.off('report:queue_item_sent');
        socket.off('report:queue_item_delivered');
        socket.off('report:queue_item_failed');
      }
    };
  }, [isOpen, accountData?.id, socket]);

  // Извлекаем данные из новой структуры
  const profitability = accountData?.Profitability || {};
  
  // Ранний возврат если модалка закрыта или нет данных
  if (!isOpen || !accountData) return null;
  
  const formatCurrency = (value, currency = 'USD') => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (num === 0) return '—';
    return `${num.toFixed(2)} ${currency}`;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (num === 0) return '—';
    return `${num.toFixed(2)}%`;
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('ru-RU');
  };

  const formatPeriod = (month, year) => {
    if (!month || !year) return '—';
    
    const monthNames = [
      'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
      'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'
    ];
    
    const monthName = monthNames[month - 1] || month;
    return `${monthName} ${year}`;
  };

  // Обработчик отправки отчета
  const handleSendReport = async () => {
    try {
      setIsSending(true);
      setSendStatus('sending');

      // Отправляем отчет
      const result = await reportService.sendSingleReport(accountData.id);
      
      console.log('Отчет отправлен:', result);
      
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Отчет отправлен! Ожидаем подтверждения доставки...'
        }
      }));
      
    } catch (error) {
      console.error('Ошибка отправки отчета:', error);
      setSendStatus('failed');
      
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка отправки отчета: ' + (error.response?.data?.message || error.message)
        }
      }));
    } finally {
      setIsSending(false);
    }
  };



  return (
    <div className="report-preview-modal-overlay" onClick={onClose}>
      <div className="report-preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-preview-header">
          <div className="header-content">
            <div className="company-logo">
              <img src="/src/IMG/mainLogo.png" alt="ITC" className="company-logo-img" />
            </div>
            <h2>Предварительный просмотр отчета</h2>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="report-preview-content">
          <div className="report-client-info">
            <div className="client-name">{accountData.clientName}</div>
            <div className="client-details">
              <div className="detail-item">
                <span className="label">Номер счета:</span>
                <span className="value">{accountData.accountId}</span>
              </div>
              <div className="detail-item">
                <span className="label">Продукт:</span>
                <span className="value">{accountData.product}</span>
              </div>
              <div className="detail-item">
                <span className="label">Email:</span>
                <span className="value">{accountData.email}</span>
              </div>
              <div className="detail-item">
                <span className="label">Период:</span>
                <span className="value period-value">{formatPeriod(profitability.month_add, profitability.year_add)}</span>
              </div>
            </div>
          </div>

          <div className="report-performance">
            <h3>Финансовые показатели</h3>
            <div className="performance-grid">
              <div className="performance-card">
                <div className="card-title">Начальный капитал</div>
                <div className="card-value">{formatCurrency(profitability.start_capital)}</div>
              </div>
              <div className="performance-card success">
                <div className="card-title">Доходность</div>
                <div className="card-value">{formatPercent(profitability.percent_profitability)}</div>
              </div>
              <div className="performance-card success">
                <div className="card-title">Сумма дохода</div>
                <div className="card-value">{formatCurrency(profitability.profitability_value)}</div>
              </div>
              <div className="performance-card">
                <div className="card-title">Итоговый капитал</div>
                <div className="card-value">{formatCurrency(profitability.end_capital)}</div>
              </div>
            </div>
          </div>

          <div className="report-transactions">
            <h3>Детализация операций</h3>
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Тип операции</th>
                    <th>Дата</th>
                    <th>Сумма</th>
                    <th>Описание</th>
                  </tr>
                </thead>
                <tbody>
                  {profitability.adding_deposit > 0 && (
                    <tr>
                      <td>Дополнительный депозит</td>
                      <td>{formatDate(new Date())}</td>
                      <td className="amount">{formatCurrency(profitability.adding_deposit)}</td>
                      <td>Дополнительное пополнение счета</td>
                    </tr>
                  )}
                  {profitability.widthdrawling_deposit > 0 && (
                    <tr>
                      <td>Вывод средств</td>
                      <td>{formatDate(new Date())}</td>
                      <td className="amount">{formatCurrency(profitability.widthdrawling_deposit)}</td>
                      <td>Вывод средств со счета</td>
                    </tr>
                  )}
                  {profitability.profitability_value > 0 && (
                    <tr>
                      <td>Начисление доходности</td>
                      <td>{formatDate(new Date())}</td>
                      <td className="amount">{formatCurrency(profitability.profitability_value)}</td>
                      <td>Доходность {formatPercent(profitability.percent_profitability)}</td>
                    </tr>
                  )}
                  {profitability.adding_deposit === 0 && profitability.widthdrawling_deposit === 0 && profitability.profitability_value === 0 && (
                    <tr>
                      <td colSpan="4" style={{textAlign: 'center', color: '#bdc3c7'}}>Нет операций за период</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="report-highlight">
            <div className="highlight-text">
              🎉 Поздравляем! Ваш счет показал отличные результаты с доходностью {formatPercent(profitability.percent_profitability)} за отчетный период.
            </div>
          </div>

          <div className="report-company-info">
            <h3>Информация о компании</h3>
            <div className="company-details">
              <div className="company-item">
                <span className="company-label">Компания:</span>
                <span className="company-value">Invest Time Capital Limited</span>
              </div>
              <div className="company-item">
                <span className="company-label">Регистрационный номер:</span>
                <span className="company-value">3324158</span>
              </div>
              <div className="company-item">
                <span className="company-label">Адрес:</span>
                <span className="company-value">7/F, MW Tower, 111 Bonham Strand, Sheung Wan, Hong Kong</span>
              </div>
              <div className="company-item">
                <span className="company-label">Email:</span>
                <span className="company-value">
                  <a href="mailto:support@investtimecapital.pro" className="company-link">
                    support@investtimecapital.pro
                  </a>
                </span>
              </div>
              <div className="company-item">
                <span className="company-label">Сайт:</span>
                <span className="company-value">
                  <a href="https://investtimecapital.pro" target="_blank" rel="noopener noreferrer" className="company-link">
                    investtimecapital.pro
                  </a>
                </span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="report-preview-footer">
          <button 
            className="send-btn" 
            onClick={handleSendReport}
            disabled={isSending || sendStatus === 'sending' || sendStatus === 'sent' || sendStatus === 'delivered'}
          >
            {isSending || sendStatus === 'sending' ? 'Отправка...' : 
             sendStatus === 'sent' ? 'Отправлено' : 
             sendStatus === 'delivered' ? 'Доставлено' : 
             sendStatus === 'failed' ? 'Ошибка отправки' : 
             'Отправить отчет'}
          </button>
          <button className="cancel-btn" onClick={onClose}>
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportPreviewModal;
