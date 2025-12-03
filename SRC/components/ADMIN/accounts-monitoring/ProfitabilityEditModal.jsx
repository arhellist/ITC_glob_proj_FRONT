import React, { useState, useEffect } from 'react';
import './ProfitabilityEditModal.css';
import transactionService from '../../../JS/services/transaction-service';

const ProfitabilityEditModal = ({ 
    accountData, 
    year, 
    month, 
    onClose, 
    onSuccess 
}) => {
    const [loading, setLoading] = useState(false);
    const [profitPercent, setProfitPercent] = useState('');
    const [existingProfitability, setExistingProfitability] = useState(null);
    const [balance, setBalance] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            
            console.log('📥 ProfitabilityEditModal: Загружаем данные для accountData:', accountData, 'year:', year, 'month:', month);
            
            // Загружаем существующую доходность за этот месяц
            const transactions = await transactionService.getMonthTransactions(
                accountData.accountId,
                year,
                month
            );
            
            console.log('📥 ProfitabilityEditModal: Получены транзакции:', transactions);
            
            if (transactions.profitabilities && transactions.profitabilities.length > 0) {
                // Ищем доходность, которая соответствует нужному месяцу
                const prof = transactions.profitabilities.find(p => 
                    p.SetProfitability?.year_add === year && 
                    p.SetProfitability?.month_add === month
                ) || transactions.profitabilities[0];
                
                console.log('📥 ProfitabilityEditModal: Найдена доходность:', prof);
                console.log('📥 ProfitabilityEditModal: SetProfitability:', prof.SetProfitability);
                setExistingProfitability(prof);
                // Получаем процент из SetProfitability
                const percent = prof.SetProfitability?.percent || prof.percent || 0;
                const percentValue = parseFloat(percent);
                console.log('📥 ProfitabilityEditModal: Процент:', percent, '->', percentValue);
                setProfitPercent(isNaN(percentValue) ? '' : percentValue.toFixed(2));
            } else {
                console.log('⚠️ ProfitabilityEditModal: Доходность не найдена');
            }

            // Загружаем баланс на начало месяца + депозиты на 1 число месяца
            // Это соответствует иерархии: начальный капитал + депозиты на 1 число = база для расчета доходности
            const date = `${year}-${String(month).padStart(2, '0')}-01`;
            const balanceValue = await transactionService.getBalanceOnDate(
                accountData.accountId,
                date,
                'profitability' // Тип транзакции для корректного расчета баланса
            );
            setBalance(balanceValue);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const newPercent = parseFloat(profitPercent);
        if (isNaN(newPercent) || newPercent < 0) {
            // Показываем ERROR-уведомление
            document.dispatchEvent(new CustomEvent('main-notify', {
              detail: {
                type: 'error',
                text: 'Введите корректный процент доходности'
              }
            }));
            return;
        }

        // Показываем модальное окно подтверждения
        const shouldUpdate = window.confirm(`Изменить процент доходности на ${newPercent}%? Это приведет к пересчету баланса за этот месяц и все последующие периоды.`);
        if (!shouldUpdate) {
            return;
        }

        try {
            setLoading(true);
            
            // Вызываем API для обновления процента доходности
            await transactionService.updateProfitabilityPercent(
                accountData.accountId,
                year,
                month,
                newPercent
            );
            
            // Показываем SUCCESS-уведомление
            document.dispatchEvent(new CustomEvent('main-notify', {
              detail: {
                type: 'success',
                text: 'Процент доходности обновлен! Выполнен пересчет баланса.'
              }
            }));
            onSuccess && onSuccess();
            onClose();
        } catch (error) {
            console.error('Ошибка обновления процента:', error);
            // Показываем ERROR-уведомление
            document.dispatchEvent(new CustomEvent('main-notify', {
              detail: {
                type: 'error',
                text: 'Ошибка: ' + (error.response?.data?.message || error.message)
              }
            }));
        } finally {
            setLoading(false);
        }
    };

    const calculateProfitValue = () => {
        if (!balance || !profitPercent) return '—';
        const value = (balance * parseFloat(profitPercent)) / 100;
        return value.toFixed(2);
    };

    return (
        <div className="profitability-edit-modal-overlay" onClick={onClose}>
            <div className="profitability-edit-modal" onClick={(e) => e.stopPropagation()}>
                <div className="profitability-edit-modal-header">
                    <h3>РЕДАКТИРОВАНИЕ ПРОЦЕНТА ДОХОДНОСТИ</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                {loading ? (
                    <div className="loading-section">
                        <p>Загрузка...</p>
                    </div>
                ) : (
                    <form className="profitability-edit-form" onSubmit={handleSubmit}>
                        <div className="form-info-section">
                            <div className="info-row">
                                <span className="info-label">Клиент:</span>
                                <span className="info-value">{accountData.userFullName}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Счет:</span>
                                <span className="info-value">#{accountData.accountId}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Продукт:</span>
                                <span className="info-value">{accountData.product}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Период:</span>
                                <span className="info-value">{month}/{year}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Баланс на начало:</span>
                                <span className="info-value balance">{balance !== null ? balance.toFixed(2) : '—'} {accountData.currency}</span>
                            </div>
                        </div>

                        <div className="form-edit-section">
                            <div className="form-field">
                                <label>Процент доходности: *</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    min="0"
                                    max="100"
                                    value={profitPercent}
                                    onChange={(e) => setProfitPercent(e.target.value)}
                                    onWheel={(e) => e.target.blur()}
                                    required
                                    autoFocus
                                />
                                <small>Введите процент от 0 до 100</small>
                            </div>

                            <div className="calc-preview">
                                <div className="calc-row">
                                    <span>Баланс на начало месяца:</span>
                                    <span className="calc-value">{balance !== null ? balance.toFixed(2) : '—'} {accountData.currency}</span>
                                </div>
                                <div className="calc-row">
                                    <span>× Процент доходности:</span>
                                    <span className="calc-value">{profitPercent || '0'}%</span>
                                </div>
                                <div className="calc-row highlight">
                                    <span>= Доход в валюте:</span>
                                    <span className="calc-value">{calculateProfitValue()} {accountData.currency}</span>
                                </div>
                            </div>

                            {existingProfitability && (
                                <div className="warning-note">
                                    ⚠️ Уже есть начисление с процентом {parseFloat(existingProfitability.SetProfitability?.percent || existingProfitability.percent || 0).toFixed(2)}%. 
                                    При изменении процента будет выполнен пересчет баланса.
                                </div>
                            )}
                        </div>

                        <div className="profitability-edit-footer">
                            <button type="button" className="cancel-btn" onClick={onClose}>
                                Отмена
                            </button>
                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? 'Обновление...' : 'Обновить процент'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default ProfitabilityEditModal;

