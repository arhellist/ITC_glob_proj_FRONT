import React, { useState, useEffect } from 'react';
import './CalculationDetailsModal.css';
import monitoringService from '../../../JS/services/monitoring-service';

const CalculationDetailsModal = ({ accountData, periodStart, calcKey, onClose, onAccountUpdate }) => {
  const [initialBalanceDetails, setInitialBalanceDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [localPercent, setLocalPercent] = useState(accountData?.profitabilityPercent?.toString() || '0');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingPercent, setIsSavingPercent] = useState(false);
  const [percentError, setPercentError] = useState(null);

  useEffect(() => {
    const loadInitialBalanceDetails = async () => {
      if (!accountData || !periodStart) return;
      
      try {
        setLoadingDetails(true);
        const targetDate = new Date(periodStart);
        if (Number.isNaN(targetDate.getTime())) {
          console.warn('CalculationDetailsModal: periodStart is invalid', periodStart);
          setInitialBalanceDetails(null);
          return;
        }
        const details = await monitoringService.getInitialBalanceDetails(
          accountData.accountId,
          targetDate.toISOString()
        );
        setInitialBalanceDetails(details);
      } catch (error) {
        console.error('CalculationDetailsModal: Ошибка загрузки детализации начального баланса:', error);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadInitialBalanceDetails();
  }, [accountData, periodStart]);

  useEffect(() => {
    if (!accountData) return;
    const nextPercent = Number(accountData.profitabilityPercent || 0);
    setLocalPercent(Number.isFinite(nextPercent) ? nextPercent.toString() : '0');
    setHasUnsavedChanges(false);
    setPercentError(null);
  }, [accountData]);

  const handlePercentChange = (event) => {
    setLocalPercent(event.target.value);
    setHasUnsavedChanges(true);
  };

  const applyPercentUpdate = async () => {
    if (!calcKey || !accountData) {
      return true;
    }
    if (!hasUnsavedChanges) {
      return true;
    }

    const parsedPercent = parseFloat(localPercent);
    if (Number.isNaN(parsedPercent)) {
      setPercentError('Введите корректное значение процента');
      return false;
    }

    try {
      setIsSavingPercent(true);
      setPercentError(null);
      const updatedPreview = await monitoringService.updatePreviewAccountPercent(
        calcKey,
        accountData.accountId,
        parsedPercent
      );
      onAccountUpdate?.(updatedPreview);
      setHasUnsavedChanges(false);
      return true;
    } catch (error) {
      console.error('CalculationDetailsModal: Ошибка обновления процента:', error);
      setPercentError(error?.response?.data?.error || error?.message || 'Не удалось обновить процент');
      return false;
    } finally {
      setIsSavingPercent(false);
    }
  };

  const handleApplyPercent = async () => {
    await applyPercentUpdate();
  };

  const handleRequestClose = async () => {
    if (isSavingPercent) {
      return;
    }
    const success = await applyPercentUpdate();
    if (!success) {
      return;
    }
    onClose?.();
  };

  if (!accountData) return null;

  // Форматирование чисел - заменяет 0 на прочерк
  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (num === 0) return '—';
    return num.toFixed(decimals);
  };

  // Форматирование даты
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="calc-details-modal-overlay" onClick={handleRequestClose}>
      <div className="calc-details-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="calc-details-modal-header">
          <h3 className="calc-details-modal-title">
            Детализация расчета для счета #{accountData.accountId}
          </h3>
          <button
            className="calc-details-modal-close-btn"
            onClick={handleRequestClose}
            disabled={isSavingPercent}
          >
            ×
          </button>
        </div>

        <div className="calc-details-modal-body">
          {/* Информация о клиенте и счете */}
          <div className="calc-details-section">
            <h4 className="calc-details-section-title">Информация о счете</h4>
            <div className="calc-details-info-grid">
              <div className="calc-details-info-item">
                <span className="calc-details-label">Клиент:</span>
                <span className="calc-details-value">{accountData.userFullName}</span>
              </div>
              <div className="calc-details-info-item">
                <span className="calc-details-label">Email:</span>
                <span className="calc-details-value">{accountData.userEmail}</span>
              </div>
              <div className="calc-details-info-item">
                <span className="calc-details-label">Счет:</span>
                <span className="calc-details-value">#{accountData.accountId}</span>
              </div>
              <div className="calc-details-info-item">
                <span className="calc-details-label">Продукт:</span>
                <span className="calc-details-value">{accountData.product}</span>
              </div>
            </div>
          </div>

          {/* Расчет баланса */}
          <div className="calc-details-section">
            <h4 className="calc-details-section-title">Расчет баланса</h4>
            <div className="calc-details-balance-calc">
              <div className="calc-details-balance-row">
                <span className="calc-details-label">Начальный баланс:</span>
                <span className="calc-details-value-numeric">{formatNumber(accountData.startBalance)}</span>
              </div>
              <div className="calc-details-balance-row profitability-row">
                <span className="calc-details-label">+ Доходность ({formatNumber(accountData.profitabilityPercent, 1)}{accountData.profitabilityPercent !== 0 ? '%' : ''}):</span>
                <span className="calc-details-value-numeric">{accountData.profitabilityValue !== 0 ? `+${formatNumber(accountData.profitabilityValue)}` : '—'}</span>
              </div>
              <div className="calc-details-balance-row">
                <span className="calc-details-label">+ Депозиты периода:</span>
                <span className="calc-details-value-numeric">{accountData.periodDeposits !== 0 ? `+${formatNumber(accountData.periodDeposits)}` : '—'}</span>
              </div>
              <div className="calc-details-balance-row">
                <span className="calc-details-label">- Выводы периода:</span>
                <span className="calc-details-value-numeric">{accountData.periodWithdrawals !== 0 ? `-${formatNumber(accountData.periodWithdrawals)}` : '—'}</span>
              </div>
              <div className="calc-details-balance-row">
                <span className="calc-details-label">- Списания периода:</span>
                <span className="calc-details-value-numeric">{accountData.periodDebitings !== 0 ? `-${formatNumber(accountData.periodDebitings)}` : '—'}</span>
              </div>
              <div className="calc-details-balance-row">
                <span className="calc-details-label">+ Входящие переводы:</span>
                <span className="calc-details-value-numeric">{accountData.periodTransfersIn !== 0 ? `+${formatNumber(accountData.periodTransfersIn)}` : '—'}</span>
              </div>
              <div className="calc-details-balance-row">
                <span className="calc-details-label">- Исходящие переводы:</span>
                <span className="calc-details-value-numeric">{accountData.periodTransfersOut !== 0 ? `-${formatNumber(accountData.periodTransfersOut)}` : '—'}</span>
              </div>
              <div className="calc-details-balance-row total-row">
                <span className="calc-details-label">= Конечный баланс:</span>
                <span className="calc-details-value-numeric">{formatNumber(accountData.endBalance)}</span>
              </div>
              <div className="calc-details-percent-editor">
                <div className="calc-details-percent-input-wrapper">
                  <label className="calc-details-label">Индивидуальная доходность, %</label>
                  <input
                    type="number"
                    step="0.01"
                    className="calc-details-percent-input"
                    value={localPercent}
                    onChange={handlePercentChange}
                    disabled={isSavingPercent}
                  />
                </div>
                <button
                  type="button"
                  className="calc-details-percent-apply"
                  onClick={handleApplyPercent}
                  disabled={isSavingPercent || !hasUnsavedChanges}
                >
                  {isSavingPercent ? 'Пересчет...' : 'Пересчитать'}
                </button>
              </div>
              {percentError && (
                <div className="calc-details-error">
                  {percentError}
                </div>
              )}
            </div>
          </div>

          {/* Детализация начального баланса */}
          {loadingDetails ? (
            <div className="calc-details-section">
              <h4 className="calc-details-section-title">Детализация начального баланса</h4>
              <p style={{ textAlign: 'center', padding: '1vw' }}>Загрузка...</p>
            </div>
          ) : initialBalanceDetails && (
            <>
              {/* Депозиты для начального баланса */}
              {initialBalanceDetails.deposits && initialBalanceDetails.deposits.length > 0 && (
                <div className="calc-details-section">
                  <h4 className="calc-details-section-title">Депозиты формирующие начальный баланс ({initialBalanceDetails.deposits.length})</h4>
                  <div className="calc-details-transactions-list">
                    {initialBalanceDetails.deposits.map((d, idx) => (
                      <div key={idx} className="calc-details-transaction-item">
                        <span className="transaction-date">{formatDate(d.date)}</span>
                        <span className="transaction-amount">+{d.amount.toFixed(2)} {accountData.currency}</span>
                        <span className="transaction-info">Курс: {d.rate?.toFixed(2) || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Выводы для начального баланса */}
              {initialBalanceDetails.withdrawals && initialBalanceDetails.withdrawals.length > 0 && (
                <div className="calc-details-section">
                  <h4 className="calc-details-section-title">Выводы формирующие начальный баланс ({initialBalanceDetails.withdrawals.length})</h4>
                  <div className="calc-details-transactions-list">
                    {initialBalanceDetails.withdrawals.map((w, idx) => (
                      <div key={idx} className="calc-details-transaction-item">
                        <span className="transaction-date">{formatDate(w.date)}</span>
                        <span className="transaction-amount withdrawal">-{w.amount.toFixed(2)} {accountData.currency}</span>
                        <span className="transaction-info">Комиссия: {w.commission?.toFixed(2) || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Переводы для начального баланса */}
              {initialBalanceDetails.transfers && initialBalanceDetails.transfers.length > 0 && (
                <div className="calc-details-section">
                  <h4 className="calc-details-section-title">Переводы формирующие начальный баланс ({initialBalanceDetails.transfers.length})</h4>
                  <div className="calc-details-transactions-list">
                    {initialBalanceDetails.transfers.map((t, idx) => (
                      <div key={idx} className="calc-details-transaction-item">
                        <span className="transaction-date">{formatDate(t.date)}</span>
                        <span className={`transaction-amount ${t.type === 'in' ? '' : 'withdrawal'}`}>
                          {t.type === 'in' ? '+' : '-'}{t.amount.toFixed(2)} {accountData.currency}
                        </span>
                        <span className="transaction-info">
                          {t.type === 'in' 
                            ? `← Счет #${t.fromAccountId} (${t.fromProduct})`
                            : `→ Счет #${t.toAccountId} (${t.toProduct})`
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Доходности для начального баланса */}
              {initialBalanceDetails.profitabilities && initialBalanceDetails.profitabilities.length > 0 && (
                <div className="calc-details-section">
                  <h4 className="calc-details-section-title">Начисления доходности формирующие начальный баланс ({initialBalanceDetails.profitabilities.length})</h4>
                  <div className="calc-details-transactions-list">
                    {initialBalanceDetails.profitabilities.map((p, idx) => (
                      <div key={idx} className="calc-details-transaction-item">
                        <span className="transaction-date">{formatDate(p.date)}</span>
                        <span className="transaction-amount profitability-amount">+{p.amount.toFixed(2)} {accountData.currency}</span>
                        <span className="transaction-info">{p.month}/{p.year}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Списания для начального баланса */}
              {initialBalanceDetails.debitings && initialBalanceDetails.debitings.length > 0 && (
                <div className="calc-details-section">
                  <h4 className="calc-details-section-title">Списания формирующие начальный баланс ({initialBalanceDetails.debitings.length})</h4>
                  <div className="calc-details-transactions-list">
                    {initialBalanceDetails.debitings.map((d, idx) => (
                      <div key={idx} className="calc-details-transaction-item">
                        <span className="transaction-date">{formatDate(d.date)}</span>
                        <span className="transaction-amount withdrawal">-{d.amount.toFixed(2)} {accountData.currency}</span>
                        <span className="transaction-info">{d.description || 'Без описания'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Детали транзакций за период */}
          {accountData.details && (
            <>
              {/* Депозиты */}
              {accountData.details.deposits && accountData.details.deposits.length > 0 && (
                <div className="calc-details-section">
                  <h4 className="calc-details-section-title">Депозиты за период ({accountData.details.deposits.length})</h4>
                  <div className="calc-details-transactions-list">
                    {accountData.details.deposits.map((d, idx) => (
                      <div key={idx} className="calc-details-transaction-item">
                        <span className="transaction-date">{formatDate(d.date)}</span>
                        <span className="transaction-amount">+{d.amount.toFixed(2)} {accountData.currency}</span>
                        <span className="transaction-info">Курс: {d.rate?.toFixed(2) || 'N/A'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Выводы */}
              {accountData.details.withdrawals && accountData.details.withdrawals.length > 0 && (
                <div className="calc-details-section">
                  <h4 className="calc-details-section-title">Выводы за период ({accountData.details.withdrawals.length})</h4>
                  <div className="calc-details-transactions-list">
                    {accountData.details.withdrawals.map((w, idx) => (
                      <div key={idx} className="calc-details-transaction-item">
                        <span className="transaction-date">{formatDate(w.date)}</span>
                        <span className="transaction-amount withdrawal">-{w.amount.toFixed(2)} {accountData.currency}</span>
                        <span className="transaction-info">Комиссия: {w.commission?.toFixed(2) || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Списания */}
              {accountData.details.debitings && accountData.details.debitings.length > 0 && (
                <div className="calc-details-section">
                  <h4 className="calc-details-section-title">Списания за период ({accountData.details.debitings.length})</h4>
                  <div className="calc-details-transactions-list">
                    {accountData.details.debitings.map((d, idx) => (
                      <div key={idx} className="calc-details-transaction-item">
                        <span className="transaction-date">{formatDate(d.date)}</span>
                        <span className="transaction-amount withdrawal">-{d.amount.toFixed(2)} {accountData.currency}</span>
                        <span className="transaction-info">{d.description || 'Без описания'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Переводы */}
              {accountData.details.transfers && accountData.details.transfers.length > 0 && (
                <div className="calc-details-section">
                  <h4 className="calc-details-section-title">Переводы за период ({accountData.details.transfers.length})</h4>
                  <div className="calc-details-transactions-list">
                    {accountData.details.transfers.map((t, idx) => (
                      <div key={idx} className="calc-details-transaction-item">
                        <span className="transaction-date">{formatDate(t.date)}</span>
                        <span className={`transaction-amount ${t.type === 'in' ? '' : 'withdrawal'}`}>
                          {t.type === 'in' ? '+' : '-'}{t.amount.toFixed(2)} {accountData.currency}
                        </span>
                        <span className="transaction-info">
                          {t.type === 'in' 
                            ? `← Счет #${t.fromAccountId} (${t.fromProduct})`
                            : `→ Счет #${t.toAccountId} (${t.toProduct})`
                          }
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="calc-details-modal-footer">
          <button
            className="calc-details-close-btn"
            onClick={handleRequestClose}
            disabled={isSavingPercent}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalculationDetailsModal;

