import React, { useState, useMemo, useEffect } from 'react';
import './profitability-calculation.css';
import CalculationModal from './CalculationModal';
import CalculationDetailsModal from './CalculationDetailsModal';
import ReportQueueInterface from './ReportQueueInterface';
import ReportPreviewModal from './ReportPreviewModal';
import QueueCalculationsModal from './QueueCalculationsModal';
import reportService from '../../../JS/services/report-service';
import ConfirmModal from '../../common/ConfirmModal';
import AlertModal from '../../common/AlertModal';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const ProfitabilityCalculation = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [calculationResults, setCalculationResults] = useState(null);
  const [productFilter, setProductFilter] = useState('all');
  const [productDropdownOpen, setProductDropdownOpen] = useState(false);
  const [selectedAccountData, setSelectedAccountData] = useState(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [approveCalculations, setApproveCalculations] = useState(false);
  
  // Состояния для очереди отчетов
  const [showQueueInterface, setShowQueueInterface] = useState(false);
  const [queueData, setQueueData] = useState(null);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [previewAccountData, setPreviewAccountData] = useState(null);
  const [savedQueues, setSavedQueues] = useState([]);
  const [showQueuesList, setShowQueuesList] = useState(false);
  const [showQueueCalculations, setShowQueueCalculations] = useState(false);
  
  // Модальные окна
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalData, setAlertModalData] = useState(null);
  const [isQueueCreating, setIsQueueCreating] = useState(false);

  // Функция загрузки сохраненных очередей
  const loadSavedQueues = async () => {
    try {
      const response = await reportService.getReportQueuesList();
      setSavedQueues(response.data.queues || []);
    } catch (error) {
      console.error('Ошибка загрузки сохраненных очередей:', error);
    }
  };

  // Загружаем сохраненные очереди при входе в раздел
  useEffect(() => {
    loadSavedQueues();
  }, []);

  // Функция открытия списка очередей
  const handleOpenQueuesList = () => {
    setShowQueuesList(true);
  };

  // Функция закрытия списка очередей
  const handleCloseQueuesList = () => {
    setShowQueuesList(false);
  };

  // Функция загрузки конкретной очереди
  const handleLoadQueue = async (queueId) => {
    try {
      const response = await reportService.getReportQueueById(queueId);
      const queueData = response.data.queue;
      
      console.log('📊 Данные очереди из БД:', queueData);
      console.log('📊 Счета в очереди:', queueData.ReportAccounts || queueData.accounts);
      
      setQueueData(queueData);
      // Синхронизируем чекбоксы с данными из БД
      const accounts = queueData.ReportAccounts || queueData.accounts || [];
      const dbSelectedAccounts = accounts
        .filter(account => account.is_selected)
        .map(account => account.id);
      
      setSelectedAccounts(dbSelectedAccounts);
      console.log('Загружена очередь, синхронизированы чекбоксы с БД:', dbSelectedAccounts);
      
      setShowQueueInterface(true);
      setShowQueuesList(false);
      
    } catch (error) {
      console.error('Ошибка загрузки очереди:', error);
      setAlertModalData({
        title: 'Ошибка',
        message: 'Ошибка загрузки очереди: ' + (error.message || 'Неизвестная ошибка')
      });
      setShowAlertModal(true);
    }
  };

  // Функция форматирования чисел - заменяет 0 на прочерк
  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (num === 0) return '—';
    return num.toFixed(decimals);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    // Скрываем интерфейс очереди при открытии расчета
    setShowQueueInterface(false);
    // Очищаем данные очереди
    setQueueData(null);
    setSelectedAccounts([]);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const enhancePreviewPayload = (payload) => {
    if (!payload) {
      return null;
    }

    const periodStart = new Date(Date.UTC(payload.year, payload.month - 1, 1, 0, 0, 0, 0)).toISOString();
    const periodEnd = new Date(Date.UTC(payload.year, payload.month, 0, 23, 59, 59, 999)).toISOString();

    return {
      ...payload,
      periodStart,
      periodEnd
    };
  };

  const handlePreviewUpdate = (updatedPreview) => {
    const enhanced = enhancePreviewPayload(updatedPreview);
    if (!enhanced) {
      return;
    }
    setCalculationResults(enhanced);

    if (enhanced && selectedAccountData) {
      const updatedAccount = enhanced.results?.find((item) => item.accountId === selectedAccountData.accountId);
      if (updatedAccount) {
        setSelectedAccountData(updatedAccount);
      }
    }
  };

  const handleCalculationComplete = (results) => {
    handlePreviewUpdate(results);
    setProductFilter('all'); // Сбрасываем фильтр
    setIsModalOpen(false);
  };

  // Обработчик переключения фильтра продукта
  const handleProductFilter = (selectedProduct) => {
    setProductFilter(selectedProduct);
    setProductDropdownOpen(false);
  };

  // Обработчик клика на строку - открывает модальное окно с детализацией
  const handleRowClick = (result) => {
    setSelectedAccountData(result);
    setIsDetailsModalOpen(true);
  };

  // Закрытие модального окна детализации
  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedAccountData(null);
  };

  // Формирование очереди отчетов
  const handleSendReports = async () => {
    if (!approveCalculations) {
      setAlertModalData({
        title: 'Внимание',
        message: 'Необходимо утвердить расчеты перед формированием очереди отчетов'
      });
      setShowAlertModal(true);
      return;
    }
    
    // Показываем confirm модалку
    setConfirmModalData({
      title: 'Формирование очереди отчетов',
      message: 
        `Сформировать очередь отчетов за ${MONTHS[calculationResults.month - 1]} ${calculationResults.year}?\n\n` +
        `Будет выполнено:\n` +
        `• Утверждение расчетов (перенос в базу данных)\n` +
        `• Формирование очереди счетов для отправки\n` +
        `• Подготовка HTML шаблонов отчетов`,
      onConfirm: async () => {
        setShowConfirmModal(false);
        setConfirmModalData(null);
        setIsQueueCreating(true);
        
        try {
          console.log('Формирование очереди отчетов за', MONTHS[calculationResults.month - 1], calculationResults.year);
          
          // Создаем очередь отчетов через бэкенд
          const queueResult = await reportService.sendReports(
            calculationResults.month,
            calculationResults.year
          );
          
          console.log('Результат создания очереди:', queueResult);
          
          // Загружаем созданную очередь
          const queueResponse = await reportService.getReportQueue(
            calculationResults.month,
            calculationResults.year,
            'pending'
          );
          
          if (queueResponse.data.queue) {
            const queueData = queueResponse.data.queue;
            setQueueData(queueData);
            // Синхронизируем чекбоксы с данными из БД
            const accounts = queueData.ReportAccounts || queueData.accounts || [];
            const dbSelectedAccounts = accounts
              .filter(account => account.is_selected)
              .map(account => account.id);
            
            setSelectedAccounts(dbSelectedAccounts);
            console.log('Создана очередь, синхронизированы чекбоксы с БД:', dbSelectedAccounts);
            setShowQueueInterface(true);
          } else {
            throw new Error('Очередь не была создана');
          }
          
          // Скрываем таблицу предварительных расчетов
          setCalculationResults(null);
          setApproveCalculations(false);
          
        } catch (error) {
          console.error('Ошибка формирования очереди отчетов:', error);
          setAlertModalData({
            title: 'Ошибка',
            message: 'Ошибка формирования очереди отчетов: ' + (error.message || 'Неизвестная ошибка')
          });
          setShowAlertModal(true);
        }
        finally {
          setIsQueueCreating(false);
        }
      }
    });
    setShowConfirmModal(true);
  };

  // Получаем список уникальных продуктов из результатов
  const availableProducts = useMemo(() => {
    if (!calculationResults || !calculationResults.results) return [];
    
    const uniqueProducts = [...new Set(calculationResults.results.map(r => r.product))];
    return [
      { value: 'all', label: 'Все продукты' },
      ...uniqueProducts.map(p => ({ value: p, label: p }))
    ];
  }, [calculationResults]);

  // Фильтрация результатов по продукту
  const filteredResults = useMemo(() => {
    if (!calculationResults || !calculationResults.results) return [];
    
    if (productFilter === 'all') {
      return calculationResults.results;
    }
    
    return calculationResults.results.filter(r => r.product === productFilter);
  }, [calculationResults, productFilter]);

  // Обработчики для очереди отчетов
  const handleStartQueue = async () => {
    try {
      console.log('Запуск очереди отчетов');
      
      // Получаем ID выбранных элементов очереди
      const selectedQueueIds = selectedAccounts;
      
      if (selectedQueueIds.length === 0) {
        setAlertModalData({
          title: 'Ошибка',
          message: 'Не выбрано ни одного счета для отправки'
        });
        setShowAlertModal(true);
        return;
      }
      
      console.log('Выбранные ID элементов очереди:', selectedQueueIds);
      
      // Запускаем отправку очереди отчетов напрямую с выбранными ID
      const result = await reportService.startReportQueue(selectedQueueIds);
      console.log('Результат запуска очереди:', result);
      
    } catch (error) {
      console.error('Ошибка запуска очереди отчетов:', error);
      setAlertModalData({
        title: 'Ошибка',
        message: 'Ошибка запуска очереди отчетов: ' + (error.message || 'Неизвестная ошибка')
      });
      setShowAlertModal(true);
    }
  };

  const handlePauseQueue = async () => {
    try {
      console.log('Пауза очереди отчетов');
      
      // Получаем ID выбранных элементов очереди
      const selectedQueueIds = selectedAccounts;
      
      if (selectedQueueIds.length === 0) {
        setAlertModalData({
          title: 'Ошибка',
          message: 'Не выбрано ни одного счета для паузы'
        });
        setShowAlertModal(true);
        return;
      }
      
      console.log('Выбранные ID элементов очереди для паузы:', selectedQueueIds);
      
      // Приостанавливаем отправку очереди отчетов напрямую с выбранными ID
      const result = await reportService.pauseReportQueue(selectedQueueIds);
      console.log('Результат паузы очереди:', result);
      
    } catch (error) {
      console.error('Ошибка паузы очереди отчетов:', error);
      setAlertModalData({
        title: 'Ошибка',
        message: 'Ошибка паузы очереди отчетов: ' + (error.message || 'Неизвестная ошибка')
      });
      setShowAlertModal(true);
    }
  };

  const handleCancelQueue = async (removedQueueId) => {
    console.log('Отмена очереди отчетов, закрытие интерфейса');
    setShowQueueInterface(false);
    setQueueData(null);
    setSelectedAccounts([]);
    if (removedQueueId) {
      setSavedQueues(prev => prev.filter(queue => queue.id !== removedQueueId));
      await loadSavedQueues();
    }
  };

  const handleAccountSelect = (account) => {
    console.log('Выбран счет:', account);
    // TODO: Реализовать логику выбора счета
  };

  const handleToggleAccount = async (queueItemId) => {
    const isCurrentlySelected = selectedAccounts.includes(queueItemId);
    const newIsSelected = !isCurrentlySelected;
    
    // Обновляем локальное состояние
    setSelectedAccounts(prev => 
      prev.includes(queueItemId) 
        ? prev.filter(id => id !== queueItemId)
        : [...prev, queueItemId]
    );
    
    // Обновляем БД
    try {
      await reportService.updateAccountSelection(queueData.id, queueItemId, newIsSelected);
      console.log(`Обновлен статус счета ${queueItemId} в БД: ${newIsSelected}`);
    } catch (error) {
      console.error('Ошибка обновления статуса счета в БД:', error);
      // Откатываем локальное изменение при ошибке
      setSelectedAccounts(prev => 
        newIsSelected 
          ? prev.filter(id => id !== queueItemId)
          : [...prev, queueItemId]
      );
    }
  };

  const handleToggleAllAccounts = async () => {
    const isSelectingAll = selectedAccounts.length !== queueData.accounts.length;
    const newSelectedAccounts = isSelectingAll 
      ? queueData.accounts.map(acc => acc.id)
      : [];
    
    // Обновляем локальное состояние
    setSelectedAccounts(newSelectedAccounts);
    
    // Обновляем БД для всех счетов
    try {
      const updatePromises = queueData.accounts.map(account => 
        reportService.updateAccountSelection(queueData.id, account.id, isSelectingAll)
      );
      
      await Promise.all(updatePromises);
      console.log(`Обновлен статус всех счетов в БД: ${isSelectingAll ? 'выбраны' : 'сняты'}`);
    } catch (error) {
      console.error('Ошибка обновления статуса всех счетов в БД:', error);
      // Откатываем локальное изменение при ошибке
      setSelectedAccounts(prev => 
        isSelectingAll 
          ? prev.filter(id => !queueData.accounts.map(acc => acc.id).includes(id))
          : queueData.accounts.map(acc => acc.id)
      );
    }
  };

  const handlePreviewReport = (account) => {
    setPreviewAccountData(account);
    setShowReportPreview(true);
  };

  const handleCloseReportPreview = () => {
    setShowReportPreview(false);
    setPreviewAccountData(null);
  };

  // Функция просмотра расчетов очереди
  const handleViewQueueCalculations = () => {
    setShowQueueCalculations(true);
  };

  // Функция закрытия просмотра расчетов очереди
  const handleCloseQueueCalculations = () => {
    setShowQueueCalculations(false);
  };

  return (
    <div className="profitability-calculation-container">
      {isQueueCreating && (
        <div className="profitability-queue-preloader">
          <div className="profitability-queue-spinner" />
          <span>Формируем очередь отчетов…</span>
        </div>
      )}
      <div className="profitability-calculation-header">
        <h2 className="profitability-calculation-title">Расчет доходности</h2>
        
        <div className="profitability-calculation-controls">
          {savedQueues.length > 0 && (
            <button 
              className="profitability-queue-btn"
              onClick={handleOpenQueuesList}
            >
              ОЧЕРЕДЬ
            </button>
          )}
          
          <button 
            className="profitability-calculation-open-btn"
            onClick={handleOpenModal}
          >
            Расчет доходности
          </button>

          {calculationResults && (
            <>
              <label className="profitability-approve-checkbox">
                <input 
                  type="checkbox"
                  checked={approveCalculations}
                  onChange={(e) => setApproveCalculations(e.target.checked)}
                />
                <span>Утвердить расчеты</span>
              </label>
              
              <button 
                className="profitability-send-reports-btn"
                onClick={handleSendReports}
                disabled={!approveCalculations || isQueueCreating}
              >
                {isQueueCreating ? 'Формируем…' : 'Сформировать очередь'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="profitability-calculation-content">
        {showQueueInterface ? (
          <ReportQueueInterface
            queueData={queueData}
            onStartQueue={handleStartQueue}
            onPauseQueue={handlePauseQueue}
            onCancelQueue={handleCancelQueue}
            onAccountSelect={handleAccountSelect}
            selectedAccounts={selectedAccounts}
            setSelectedAccounts={setSelectedAccounts}
            onToggleAccount={handleToggleAccount}
            onToggleAllAccounts={handleToggleAllAccounts}
            onPreviewReport={handlePreviewReport}
            onViewCalculations={handleViewQueueCalculations}
            onUpdateQueueData={setQueueData}
          />
        ) : !calculationResults ? (
          <p className="profitability-calculation-description">
            Нажмите кнопку "Расчет доходности" для открытия формы расчета и предварительного просмотра начисления доходности по всем счетам.
          </p>
        ) : (
          <div className="profitability-results-wrapper">
            <div className="profitability-results-header">
              <div className="profitability-results-header-left">
                <h3 className="profitability-results-title">
                  Предварительный просмотр расчета за {MONTHS[calculationResults.month - 1]} {calculationResults.year} года
                </h3>
              </div>
              
              {/* Фильтр по продукту */}
              <div className="profitability-results-filter">
                <label>Продукт:</label>
                <div className="custom-dropdown">
                  <button 
                    className="custom-dropdown-toggle"
                    onClick={() => setProductDropdownOpen(!productDropdownOpen)}
                  >
                    {availableProducts.find(opt => opt.value === productFilter)?.label || 'Все продукты'}
                    <span className="dropdown-arrow">{productDropdownOpen ? '▲' : '▼'}</span>
                  </button>
                  {productDropdownOpen && (
                    <div className="custom-dropdown-menu">
                      {availableProducts.map(option => (
                        <button
                          key={option.value}
                          className={`custom-dropdown-item ${productFilter === option.value ? 'active' : ''}`}
                          onClick={() => handleProductFilter(option.value)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="profitability-results-table-scroll">
              <table className="profitability-results-table">
                <thead>
                  <tr>
                    <th className="sticky-col">ФИО</th>
                    <th>Email</th>
                    <th>Счет</th>
                    <th>Продукт</th>
                    <th>Начальный баланс</th>
                    <th>Депозиты</th>
                    <th>Выводы</th>
                    <th>Списания</th>
                    <th>Переводы IN</th>
                    <th>Переводы OUT</th>
                    <th>Доход %</th>
                    <th>Доход $</th>
                    <th>Конечный баланс</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((result, idx) => (
                    <tr 
                      key={result.accountId} 
                      className={`${idx % 2 === 0 ? 'even' : 'odd'} clickable-row`}
                      onClick={() => handleRowClick(result)}
                    >
                      <td className="sticky-col">{result.userFullName}</td>
                      <td>{result.userEmail}</td>
                      <td>{result.accountId}</td>
                      <td>{result.product}</td>
                      <td className="numeric">{formatNumber(result.startBalance)}</td>
                      <td className="numeric">{formatNumber(result.periodDeposits)}</td>
                      <td className="numeric">{formatNumber(result.periodWithdrawals)}</td>
                      <td className="numeric">{formatNumber(result.periodDebitings)}</td>
                      <td className="numeric">{formatNumber(result.periodTransfersIn)}</td>
                      <td className="numeric">{formatNumber(result.periodTransfersOut)}</td>
                      <td className="numeric profitability">{formatNumber(result.profitabilityPercent, 1)}{result.profitabilityPercent !== 0 ? '%' : ''}</td>
                      <td className="numeric profitability">{formatNumber(result.profitabilityValue)}</td>
                      <td className="numeric balance">{formatNumber(result.endBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Модальное окно расчета */}
      {isModalOpen && (
        <CalculationModal 
          onClose={handleCloseModal}
          onCalculationComplete={handleCalculationComplete}
        />
      )}

      {/* Модальное окно детализации расчета */}
      {isDetailsModalOpen && selectedAccountData && calculationResults && (
        <CalculationDetailsModal 
          accountData={selectedAccountData}
          periodStart={calculationResults.periodStart}
          calcKey={calculationResults.calcKey}
          onAccountUpdate={handlePreviewUpdate}
          onClose={handleCloseDetailsModal}
        />
      )}

      {/* Модальное окно подтверждения */}
      {showConfirmModal && confirmModalData && (
        <ConfirmModal
          title={confirmModalData.title}
          message={confirmModalData.message}
          onConfirm={confirmModalData.onConfirm}
          onCancel={() => {
            setShowConfirmModal(false);
            setConfirmModalData(null);
          }}
        />
      )}

      {/* Модальное окно списка очередей */}
      {showQueuesList && (
        <div className="modal-overlay">
          <div className="modal-content queues-list-modal">
            <div className="modal-header">
              <h3>Сохраненные очереди отчетов</h3>
              <button 
                className="modal-close-btn"
                onClick={handleCloseQueuesList}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              {savedQueues.length === 0 ? (
                <p className="no-queues-message">Нет сохраненных очередей</p>
              ) : (
                <div className="queues-list">
                  {savedQueues.map(queue => (
                    <div 
                      key={queue.id} 
                      className="queue-item"
                      onClick={() => handleLoadQueue(queue.id)}
                    >
                      <div className="queue-item-header">
                        <h4>{queue.title}</h4>
                        <span className={`queue-status ${queue.status}`}>
                          {queue.status === 'pending' && 'Ожидает'}
                          {queue.status === 'sending' && 'Отправка'}
                          {queue.status === 'paused' && 'Пауза'}
                          {queue.status === 'completed' && 'Завершено'}
                          {queue.status === 'cancelled' && 'Отменено'}
                        </span>
                      </div>
                      <div className="queue-item-details">
                        <p>Период: {queue.month}/{queue.year}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно уведомления */}
      {showAlertModal && alertModalData && (
        <AlertModal
          title={alertModalData.title}
          message={alertModalData.message}
          onClose={() => {
            setShowAlertModal(false);
            setAlertModalData(null);
          }}
        />
      )}

      {/* Модальное окно предварительного просмотра отчета */}
      {showReportPreview && previewAccountData && (
        <ReportPreviewModal
          isOpen={showReportPreview}
          onClose={handleCloseReportPreview}
          accountData={previewAccountData}
          reportData={previewAccountData}
        />
      )}

      {/* Модальное окно расчетов очереди */}
      {showQueueCalculations && queueData && (
        <QueueCalculationsModal
          isOpen={showQueueCalculations}
          onClose={handleCloseQueueCalculations}
          queueData={queueData}
        />
      )}
    </div>
  );
};

export default ProfitabilityCalculation;

