import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './ReportQueueInterface.css';
import { getSocket, connect } from "../../../JS/websocket/websocket-service";
import reportService from '../../../JS/services/report-service';
import { SuccessNotification, ErrorNotification } from '../../../JS/utils/notifications';

const ReportQueueInterface = ({
  queueData, 
  onStartQueue, 
  onPauseQueue, 
  onCancelQueue,
  onAccountSelect,
  selectedAccounts,
  setSelectedAccounts,
  onToggleAccount,
  // onToggleAllAccounts,
  onPreviewReport,
  onViewCalculations,
  onUpdateQueueData
}) => {
  const [queueStatus, setQueueStatus] = useState('pending'); // pending, sending, paused
  const [progress, setProgress] = useState({ sent: 0, delivered: 0, total: 0 });
  const [isReady, setIsReady] = useState(false); // Состояние готовности
  const [searchFilter, setSearchFilter] = useState(''); // Фильтр поиска
  const [currentTime, setCurrentTime] = useState(new Date()); // Текущее время для таймеров
  const [timerSyncState, setTimerSyncState] = useState({
    isActive: false,
    lastSentTime: null,
    nextSendTime: null,
    currentPosition: 0
  }); // Состояние синхронизации таймеров
  const [socket, setSocket] = useState(null); // WebSocket соединение
  const [showCancelConfirm, setShowCancelConfirm] = useState(false); // Модалка подтверждения отмены

  useEffect(() => {
    if (queueData) {
      console.log('🔄 ReportQueueInterface: Обновление данных очереди', queueData);
      const accounts = queueData.ReportAccounts || queueData.accounts || [];
      console.log('🔄 Счета для синхронизации:', accounts.map(acc => ({ id: acc.id, is_selected: acc.is_selected, status: acc.status })));
      
      setProgress({
        sent: accounts.filter(acc => acc.status === 'sent').length,
        delivered: accounts.filter(acc => acc.status === 'delivered').length,
        total: accounts.length
      });
      
      // Синхронизируем selectedAccounts с данными из БД при загрузке очереди
      const dbSelectedAccounts = accounts
        .filter(account => account.is_selected)
        .map(account => account.id);
      
      setSelectedAccounts(dbSelectedAccounts);
      console.log('✅ Синхронизация чекбоксов с БД:', dbSelectedAccounts);
    }
  }, [queueData]);

  const handleStartQueue = () => {
    setQueueStatus('sending');
    // Сбрасываем состояние паузы и возобновляем активность таймеров
    setTimerSyncState(prev => ({ ...prev, isPaused: false, isActive: true }));
    initializeTimerSync(); // Инициализируем таймеры
    onStartQueue();
  };

  const handlePauseQueue = () => {
    setQueueStatus('paused');
    // Устанавливаем только флаг паузы, таймеры остаются видимыми
    setTimerSyncState(prev => ({ ...prev, isPaused: true }));
    onPauseQueue();
  };

  const handleCancelQueue = () => {
    console.log('Отмена очереди отчетов');
    setShowCancelConfirm(true);
  };

  const confirmCancelQueue = async () => {
    console.log('Подтверждение отмены очереди отчетов');
    try {
      const result = await reportService.cancelReportQueue(queueData.id);
      console.log('Результат отмены очереди:', result);
      
      SuccessNotification(document.querySelector('.root-content-notification-container'), 'Очередь отчетов отменена');
      
      setShowCancelConfirm(false);
      setQueueStatus('cancelled');
      onCancelQueue(queueData.id);
    } catch (error) {
      console.error('Ошибка отмены очереди:', error);
      ErrorNotification(document.querySelector('.root-content-notification-container'), 'Ошибка отмены очереди отчетов');
    }
  };

  const cancelCancelQueue = () => {
    console.log('Отмена подтверждения отмены очереди отчетов');
    setShowCancelConfirm(false);
  };

  const handleRepeatQueue = async () => {
    console.log('Повтор очереди отчетов');
    try {
      const result = await reportService.repeatReportQueue(queueData.id);
      console.log('Результат повтора очереди:', result);
      
      SuccessNotification(document.querySelector('.root-content-notification-container'), 'Очередь отчетов повторена');
      
      setQueueStatus('pending');
      // Обновляем данные очереди
      if (onUpdateQueueData) {
        onUpdateQueueData({ ...queueData, status: 'pending' });
      }
    } catch (error) {
      console.error('Ошибка повтора очереди:', error);
      ErrorNotification(document.querySelector('.root-content-notification-container'), 'Ошибка повтора очереди отчетов');
    }
  };

  const handleReadyToggle = async () => {
    if (!isReady) {
      // При нажатии "ГОТОВО" - фильтруем счета и обновляем БД
      try {
        console.log('Фильтрация счетов по выбранным чекбоксам:', selectedAccounts);
        
        // Обновляем статус is_selected в базе данных
        const updatePromises = queueData.accounts.map(account => {
          const isSelected = selectedAccounts.includes(account.id);
          return reportService.updateAccountSelection(queueData.id, account.id, isSelected);
        });
        
        await Promise.all(updatePromises);
        
        // Обновляем локальные данные очереди
        const updatedAccounts = queueData.accounts.map(account => ({
          ...account,
          is_selected: selectedAccounts.includes(account.id)
        }));
        
        if (onUpdateQueueData) {
          onUpdateQueueData({ ...queueData, accounts: updatedAccounts });
        }
        
        SuccessNotification(document.querySelector('.root-content-notification-container'), 'Счета отфильтрованы для отправки');
        
      } catch (error) {
        console.error('Ошибка фильтрации счетов:', error);
        ErrorNotification(document.querySelector('.root-content-notification-container'), 'Ошибка фильтрации счетов');
        return;
      }
    } else {
      // При повторном нажатии "ГОТОВО" - сбрасываем фильтрацию и загружаем все счета из БД
      try {
        console.log('Сброс фильтрации - загружаем все счета из БД');
        
        const response = await reportService.getReportQueue(
          queueData.month, 
          queueData.year, 
          'pending',
          false // ready = false, показываем все счета
        );
        
        if (response.data.queue) {
          const allQueueData = response.data.queue;
          
          // Синхронизируем selectedAccounts с данными из БД
          const dbSelectedAccounts = allQueueData.accounts
            .filter(account => account.is_selected)
            .map(account => account.id);
          
          setSelectedAccounts(dbSelectedAccounts);
          
          if (onUpdateQueueData) {
            onUpdateQueueData(allQueueData);
          }
        }
        
        SuccessNotification(document.querySelector('.root-content-notification-container'), 'Фильтрация сброшена');
        
      } catch (error) {
        console.error('Ошибка сброса фильтрации:', error);
        ErrorNotification(document.querySelector('.root-content-notification-container'), 'Ошибка сброса фильтрации');
        return;
      }
    }
    
    setIsReady(!isReady);
    
    // Сбрасываем состояние паузы при повторном нажатии ГОТОВО
    if (isReady) {
      setTimerSyncState(prev => ({ ...prev, isPaused: false }));
    }
  };

  // Фильтрация счетов по поисковому запросу и готовности
  const filteredAccounts = useMemo(() => {
    if (!queueData) return [];
    
    const accounts = queueData.ReportAccounts || queueData.accounts || [];
    
    // Если нажато "ГОТОВО", показываем только выбранные счета
    if (isReady) {
      return accounts.filter(account => selectedAccounts.includes(account.id));
    }
    
    // Дополнительная фильтрация по поисковому запросу
    if (!searchFilter) return accounts;
    
    const searchLower = searchFilter.toLowerCase();
    return accounts.filter(account => (
      account.clientName?.toLowerCase().includes(searchLower) ||
      account.email?.toLowerCase().includes(searchLower) ||
      account.accountId?.toString().includes(searchLower)
    ));
  }, [queueData, searchFilter, isReady, selectedAccounts]);

  // Инициализация синхронизации таймеров при запуске рассылки
  const initializeTimerSync = useCallback(() => {
    console.log('🔄 Инициализация синхронизации таймеров для отчетов');
    
    // Получаем все счета из очереди (не отфильтрованные)
    const allAccounts = queueData.ReportAccounts || queueData.accounts || [];
    
    // Фильтруем только выбранные и неотправленные счета
    const selectedUnsentAccounts = allAccounts.filter(account => 
      selectedAccounts.includes(account.id) && 
      account.status !== 'sent' && 
      account.status !== 'delivered' && 
      account.status !== 'failed'
    );
    
    console.log('🔄 Выбранные неотправленные счета для рассылки:', selectedUnsentAccounts.map(acc => ({
      id: acc.id,
      email: acc.email,
      status: acc.status,
      is_selected: acc.is_selected
    })));
    
    if (selectedUnsentAccounts.length === 0) {
      console.log('🔍 Нет неотправленных счетов среди выбранных');
      return;
    }
    
    // Находим первый неотправленный счет среди выбранных
    const firstUnsentAccount = selectedUnsentAccounts[0];
    const firstUnsentIndex = allAccounts.findIndex(account => account.id === firstUnsentAccount.id);
    
    const now = new Date();
    setTimerSyncState({
      isActive: true,
      lastSentTime: now,
      nextSendTime: new Date(now.getTime() + 6667), // 6.67 секунд между отчетами
      currentPosition: firstUnsentIndex
    });
    
    console.log('🔄 Синхронизация таймеров инициализирована', {
      selectedUnsentCount: selectedUnsentAccounts.length,
      firstUnsentIndex,
      currentPosition: firstUnsentIndex,
      nextSendTime: new Date(now.getTime() + 6667).toISOString(),
      firstUnsentAccount: {
        id: firstUnsentAccount.id,
        email: firstUnsentAccount.email,
        status: firstUnsentAccount.status
      }
    });
    
  }, [queueData, selectedAccounts]);

  // Обновление синхронизации таймеров при отправке отчета
  const updateTimerSync = useCallback((sentItemId) => {
    console.log('🔄 Обновление синхронизации таймеров после отправки отчета', sentItemId);
    
    // Получаем все счета из очереди
    const allAccounts = queueData.ReportAccounts || queueData.accounts || [];
    
    // Находим следующий неотправленный счет среди выбранных
    const selectedUnsentAccounts = allAccounts.filter(account => 
      selectedAccounts.includes(account.id) && 
      account.status !== 'sent' && 
      account.status !== 'delivered' && 
      account.status !== 'failed'
    );
    
    if (selectedUnsentAccounts.length === 0) {
      console.log('🔍 Больше нет неотправленных счетов среди выбранных');
      setTimerSyncState(prev => ({ ...prev, isActive: false }));
      return;
    }
    
    // Находим индекс следующего неотправленного счета
    const nextUnsentAccount = selectedUnsentAccounts[0];
    const nextUnsentIndex = allAccounts.findIndex(account => account.id === nextUnsentAccount.id);
    
    setTimerSyncState(prev => {
      const now = new Date();
      return {
        ...prev,
        lastSentTime: now,
        nextSendTime: new Date(now.getTime() + 6667),
        currentPosition: nextUnsentIndex
      };
    });
    
    console.log('🔄 Следующий неотправленный счет:', {
      id: nextUnsentAccount.id,
      email: nextUnsentAccount.email,
      status: nextUnsentAccount.status,
      index: nextUnsentIndex
    });
    
  }, [queueData, selectedAccounts]);

  // Расчет времени до отправки отчета
  const getTimeToSend = useCallback((account) => {
    // Таймеры показываются если готовность подтверждена
    if (!isReady) {
      return null;
    }
    
    // Если отчет уже отправлен - показываем статус
    if (account.status === 'sent' || account.status === 'delivered') {
      return account.status === 'sent' ? 'Отправлено' : 'Доставлено';
    } else if (account.status === 'failed') {
      return 'Ошибка';
    }
    
    // Если очередь на паузе - показываем замороженное время до отправки
    if (queueStatus === 'paused') {
      // Получаем все счета из очереди
      const allAccounts = queueData.ReportAccounts || queueData.accounts || [];
      
      // Фильтруем только выбранные и неотправленные счета
      const selectedUnsentAccounts = allAccounts.filter(acc => 
        selectedAccounts.includes(acc.id) && 
        acc.status !== 'sent' && 
        acc.status !== 'delivered' && 
        acc.status !== 'failed'
      );
      
      // Находим позицию текущего счета среди неотправленных выбранных
      const unsentIndex = selectedUnsentAccounts.findIndex(acc => acc.id === account.id);
      
      if (unsentIndex === -1) {
        return null; // Счет не выбран или уже отправлен
      }
      
      const delayPerReport = 6667; // 6.67 секунд между отчетами
      const totalSeconds = Math.ceil((unsentIndex * delayPerReport) / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    // Получаем все счета из очереди
    const allAccounts = queueData.ReportAccounts || queueData.accounts || [];
    
    // Фильтруем только выбранные и неотправленные счета
    const selectedUnsentAccounts = allAccounts.filter(acc => 
      selectedAccounts.includes(acc.id) && 
      acc.status !== 'sent' && 
      acc.status !== 'delivered' && 
      acc.status !== 'failed'
    );
    
    // Находим позицию текущего счета среди неотправленных выбранных
    const unsentIndex = selectedUnsentAccounts.findIndex(acc => acc.id === account.id);
    
    if (unsentIndex === -1) {
      return null; // Счет не выбран или уже отправлен
    }
    
    const delayPerReport = 6667; // 6.67 секунд между отчетами
    
    // Если рассылка запущена и синхронизация активна - показываем синхронизированный отсчет
    if (queueStatus === 'sending' && timerSyncState.isActive) {
      // Рассчитываем время относительно текущей позиции в синхронизации
      const positionFromCurrent = unsentIndex;
      
      if (positionFromCurrent === 0) {
        // Отчет должен быть отправлен сейчас
        return '00:00';
      } else {
        // Рассчитываем время до отправки этого отчета с учетом текущего времени
        const plannedSendTime = new Date(timerSyncState.lastSentTime.getTime() + (positionFromCurrent * delayPerReport));
        const timeDiff = plannedSendTime.getTime() - currentTime.getTime();
        
        if (timeDiff <= 0) {
          // Время отправки уже прошло
          return '00:00';
        }
        
        const totalSeconds = Math.ceil(timeDiff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }
    
    // Если готовность подтверждена, но рассылка еще не запущена - показываем планируемое время (статичное)
    if (isReady && queueStatus === 'pending') {
      const totalSeconds = Math.ceil((unsentIndex * delayPerReport) / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return null;
  }, [isReady, timerSyncState, queueStatus, queueData, selectedAccounts, currentTime]);

  // Обновление статуса отчета через WebSocket
  const updateReportStatus = useCallback((queueItemId, newStatus, deliveryResult = null, parentQueueId = null) => {
    console.log(`📊 WebSocket: Обновление статуса отчета ${queueItemId} на ${newStatus}`, deliveryResult);

    if (!queueData) {
      return;
    }

    if (parentQueueId && queueData.id && Number(parentQueueId) !== Number(queueData.id)) {
      console.log('📊 WebSocket: Игнорируем событие другой очереди', parentQueueId, queueData.id);
      return;
    }
    
    if (onUpdateQueueData) {
      const updatedAccounts = (queueData.accounts || []).map(account => {
        if (Number(account.id) === Number(queueItemId)) {
          const updatedAccount = { ...account, status: newStatus };
          
          if (deliveryResult) {
            updatedAccount.deliveryResult = deliveryResult;
          }
          
          return updatedAccount;
        }
        return account;
      });
      
      onUpdateQueueData({ ...queueData, accounts: updatedAccounts });
    }
  }, [queueData, onUpdateQueueData]);

  // WebSocket подключение и обработчики
  useEffect(() => {
    const setupWebSocket = async () => {
      await connect();
      const wsSocket = getSocket();
      setSocket(wsSocket);
      
      if (wsSocket) {
        // Подписываемся на обновления статуса отчетов
        wsSocket.on('report:queue_item_sent', (data) => {
          console.log('📊 WebSocket: Отчет отправлен', data);
          updateReportStatus(data.queueId, 'sent', null, data.parentQueueId);
          
          // Обновляем синхронизацию таймеров
          updateTimerSync(data.queueId);
        });
        
        wsSocket.on('report:queue_item_delivered', (data) => {
          console.log('📊 WebSocket: Отчет доставлен', data);
          updateReportStatus(data.queueId, 'delivered', data.deliveryResult, data.parentQueueId);
          updateTimerSync(data.queueId);
        });
        
        wsSocket.on('report:queue_item_failed', (data) => {
          console.log('📊 WebSocket: Ошибка отправки отчета', data);
          updateReportStatus(data.queueId, 'failed', data.error, data.parentQueueId);
        });
        
        wsSocket.on('report:queue_status_updated', (data) => {
          console.log('📊 WebSocket: Статус очереди отчетов обновлен', data);
          setQueueStatus(data.status);
          
          // Если рассылка остановлена или завершена - скрываем таймеры
          if (data.status === 'paused' || data.status === 'completed' || data.status === 'cancelled') {
            setTimerSyncState(prev => ({ ...prev, isActive: false }));
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
        socket.off('report:queue_status_updated');
      }
    };
  }, [socket, updateReportStatus, updateTimerSync]);

  // Обновление времени каждую секунду для синхронизированного отсчета
  useEffect(() => {
    // Таймер работает если готовность подтверждена ИЛИ рассылка запущена
    const shouldRunTimer = isReady || (timerSyncState.isActive && queueStatus === 'sending');
    
    if (!shouldRunTimer) {
      return;
    }
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isReady, timerSyncState.isActive, queueStatus]);

  const getStatusText = () => {
    switch (queueStatus) {
      case 'pending': return 'ОЖИДАЕТ';
      case 'sending': return 'ОТПРАВКА';
      case 'paused': return 'ПАУЗА';
      case 'cancelled': return 'ОТМЕНЕНА';
      default: return 'ОЖИДАЕТ';
    }
  };

  // const getStatusColor = () => {
  //   switch (queueStatus) {
  //     case 'pending': return '#f39c12';
  //     case 'sending': return '#3498db';
  //     case 'paused': return '#e74c3c';
  //     default: return '#f39c12';
  //   }
  // };

  if (!queueData) return null;

  return (
    <div className="report-queue-interface-container">
      {/* Левая панель - карточка очереди (30% ширины) */}
      <div className="queue-summary-card">
        <h3>Очередь отчетов</h3>
        
        <div className="queue-info-item">
          <span>Заголовок очереди:</span>
          <strong>{queueData.title}</strong>
        </div>
        
        <div className="queue-info-item">
          <span>Тема письма:</span>
          <strong>Отчет о результатах деятельности компании</strong>
        </div>
        
        <div className="queue-info-item">
          <span>Период:</span>
          <strong>{queueData.month} {queueData.year}</strong>
        </div>
        
        <div className="queue-info-item">
          <span>Всего счетов:</span>
          <strong>{progress.total}</strong>
        </div>
        
        <div className="queue-info-item">
          <span>Выбрано для отправки:</span>
          <strong>{selectedAccounts.length}</strong>
        </div>
        
        <div className="queue-info-item">
          <span>Статус отправки:</span>
          <strong className={`queue-status ${queueStatus}`}>{getStatusText()}</strong>
        </div>

        {/* Прогресс-бар */}
        <div className="queue-progress-bar-wrapper">
          <div 
            className="queue-progress-bar" 
            style={{ width: `${progress.total > 0 ? (progress.sent / progress.total) * 100 : 0}%` }}
          ></div>
        </div>
        <span className="queue-progress-text">{progress.sent} из {progress.total} отправлено</span>

        <div className="queue-actions">
          {queueStatus === 'pending' && (
            <button 
              className="queue-action-btn start"
              onClick={handleStartQueue}
              disabled={!isReady || selectedAccounts.length === 0}
            >
              ЗАПУСТИТЬ
            </button>
          )}
          
          {queueStatus === 'sending' && (
            <button 
              className="queue-action-btn pause"
              onClick={handlePauseQueue}
            >
              ПАУЗА
            </button>
          )}
          
          {queueStatus === 'paused' && (
            <button 
              className="queue-action-btn start"
              onClick={handleStartQueue}
            >
              ПРОДОЛЖИТЬ
            </button>
          )}
          
          <button 
            className="queue-action-btn view-calculations"
            onClick={onViewCalculations}
          >
            ПРОСМОТРЕТЬ РАСЧЕТЫ
          </button>
          
          {(queueStatus === 'pending' || queueStatus === 'paused') && (
            <button 
              className="queue-action-btn cancel"
              onClick={handleCancelQueue}
            >
              ОТМЕНИТЬ
            </button>
          )}
          
          {queueStatus === 'cancelled' && (
            <button 
              className="queue-action-btn repeat"
              onClick={handleRepeatQueue}
            >
              ПОВТОРИТЬ
            </button>
          )}
        </div>
      </div>

      {/* Правая панель - список счетов (70% ширины) */}
      <div className={`account-list-panel ${isReady ? 'hide-checkboxes' : ''}`}>
        <div className="account-list-header">
          <label className="select-all-checkbox">
            <input 
              type="checkbox" 
              checked={selectedAccounts.length === filteredAccounts.length && filteredAccounts.length > 0} 
              onChange={() => {
                const filteredIds = filteredAccounts.map(acc => acc.id);
                const allSelected = filteredIds.every(id => selectedAccounts.includes(id));
                
                if (allSelected) {
                  // Снимаем выделение с отфильтрованных счетов
                  // Снимаем выделение с отфильтрованных счетов
                  filteredIds.forEach(id => {
                    if (selectedAccounts.includes(id)) {
                      onToggleAccount(id);
                    }
                  });
                } else {
                  // Выделяем все отфильтрованные счета
                  filteredIds.forEach(id => {
                    if (!selectedAccounts.includes(id)) {
                      onToggleAccount(id);
                    }
                  });
                }
              }} 
              disabled={filteredAccounts.length === 0}
            />
            <span>Выбрать всех ({selectedAccounts.length}/{filteredAccounts.length})</span>
          </label>
          
          <div className="account-search-filter">
            <input
              type="text"
              className="search-input"
              placeholder="Поиск по ФИО, Email, номеру счета..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          
          <button 
            className="ready-checkbox-btn"
            disabled={selectedAccounts.length === 0}
            onClick={handleReadyToggle}
          >
            <input 
              type="checkbox" 
              checked={isReady}
              onChange={handleReadyToggle}
            />
            ГОТОВО
          </button>
        </div>
        <div className="account-cards-scroll">
          {filteredAccounts.length === 0 ? (
            <p className="no-accounts-message">
              {searchFilter ? 'Счета не найдены по заданному фильтру.' : 'Нет счетов для формирования очереди.'}
            </p>
          ) : (
            filteredAccounts.map(account => (
              <div key={account.id} className={`account-card ${selectedAccounts.includes(account.id) ? 'selected' : ''}`}>
                <div className="account-card-left">
                  <input 
                    type="checkbox" 
                    checked={selectedAccounts.includes(account.id)} 
                    onChange={() => onToggleAccount(account.id)}
                  />
                  <div className="account-details">
                    <p><strong>{account.clientName}</strong></p>
                    <p>Счет: {account.accountId} ({account.product})</p>
                    <p>Email: {account.email}</p>
                  </div>
                </div>
                <div className="account-card-right">
                  <div className="status-indicators">
                    <div className="status-item">
                      <span className={`status-icon ${account.status === 'delivered' ? 'success' : account.status === 'failed' ? 'error' : 'pending'}`}>
                        {account.status === 'delivered' ? '✓' : account.status === 'failed' ? '✗' : '—'}
                      </span>
                      <span>Доставка: {account.status === 'delivered' ? 'Доставлено' : account.status === 'failed' ? 'Ошибка' : 'В очереди'}</span>
                    </div>
                    {getTimeToSend(account) && (
                      <div className="status-item timer-item">
                        <span className="timer-icon">⏱️</span>
                        <span className="timer-text">{getTimeToSend(account)}</span>
                      </div>
                    )}
                  </div>
                  <button 
                    className="preview-report-btn"
                    onClick={() => onPreviewReport(account)}
                  >
                    Просмотр отчета
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Модалка подтверждения отмены */}
      {showCancelConfirm && (
        <div className="cancel-confirm-overlay" onClick={cancelCancelQueue}>
          <div className="cancel-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cancel-confirm-header">
              <h3>Подтверждение отмены</h3>
            </div>
            <div className="cancel-confirm-body">
              <p>Вы уверены, что хотите отменить очередь отчетов?</p>
              <p className="warning-text">Это действие нельзя будет отменить.</p>
            </div>
            <div className="cancel-confirm-actions">
              <button 
                className="cancel-confirm-btn cancel-btn" 
                onClick={cancelCancelQueue}
              >
                Отмена
              </button>
              <button 
                className="cancel-confirm-btn confirm-btn" 
                onClick={confirmCancelQueue}
              >
                Да, отменить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportQueueInterface;
