import React, { useState, useEffect } from 'react';
import './TransactionFormModal.css';
import transactionService from '../../../JS/services/transaction-service';

const TransactionFormModal = ({ 
    accountData, 
    transactionType, 
    year, 
    month, 
    onClose, 
    onSuccess 
}) => {
    // Состояния формы
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(`${year}-${String(month).padStart(2, '0')}-01`);
    const [amountCurrency, setAmountCurrency] = useState('');
    const [amountRub, setAmountRub] = useState('');
    const [rate, setRate] = useState('');
    const [rateModified, setRateModified] = useState(false);
    const [description, setDescription] = useState('');
    const [balance, setBalance] = useState(null);
    const [withdrawError, setWithdrawError] = useState('');
    const [maxWithdrawal, setMaxWithdrawal] = useState(null);
    const [maxWithdrawalInfo, setMaxWithdrawalInfo] = useState(null);
    
    // Для переводов
    const [toAccountId, setToAccountId] = useState('');
    const [availableAccounts, setAvailableAccounts] = useState([]);
    const [toAccountRate, setToAccountRate] = useState('');
    const [toAccountAmount, setToAccountAmount] = useState('');
    const [toAccountRateModified, setToAccountRateModified] = useState(false);

    // Для доходности
    const [profitPercent, setProfitPercent] = useState('');

    useEffect(() => {
        loadInitialData();
    }, [date]);

    useEffect(() => {
        if (transactionType === 'transfer') {
            loadAvailableAccounts();
        }
        if (transactionType === 'withdrawal') {
            loadMaxWithdrawalAmount();
        }
    }, []);

    useEffect(() => {
        if (transactionType === 'withdrawal' && date) {
            loadMaxWithdrawalAmount();
        }
    }, [date]);

    const loadInitialData = async () => {
        // Проверяем что дата валидна
        if (!date || date.trim() === '' || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            console.log('⚠️ Дата не указана или невалидна, пропускаем загрузку данных');
            return;
        }
        
        try {
            // Загружаем курс на выбранную дату
            const courseData = await transactionService.getCourseOnDate(
                accountData.currency,
                date
            );
            
            // Устанавливаем курс в зависимости от типа транзакции
            if (transactionType === 'deposit') {
                setRate(courseData.depositValue.toFixed(2));
            } else if (transactionType === 'withdrawal') {
                setRate(courseData.withdrawalValue.toFixed(2));
            } else {
                setRate(courseData.spotValue.toFixed(2));
            }
            
            // Загружаем баланс на дату
            // Баланс рассчитывается по иерархии транзакций в зависимости от типа транзакции
            const balanceValue = await transactionService.getBalanceOnDate(
                accountData.accountId,
                date,
                transactionType // Передаем тип транзакции для корректного расчета баланса
            );
            setBalance(balanceValue);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    };

    const loadAvailableAccounts = async () => {
        try {
            const accounts = await transactionService.getAvailableAccountsForTransfer(
                accountData.userId,
                accountData.accountId
            );
            setAvailableAccounts(accounts);
        } catch (error) {
            console.error('Ошибка загрузки счетов:', error);
        }
    };

    const loadMaxWithdrawalAmount = async () => {
        if (!date) return;
        try {
            const data = await transactionService.getMaxWithdrawalAmount(accountData.accountId, date);
            setMaxWithdrawal(data.maxAmount);
            setMaxWithdrawalInfo(data);
            
            // Проверка текущего введенного значения
            const val = parseFloat(amountCurrency || '0');
            if (val > data.maxAmount) {
                setWithdrawError(`Вы не можете совершить такую операцию. Недостаточно средств на счете. Максимально допустимо: ${data.maxAmount.toFixed(2)} ${accountData.currency}`);
            } else {
                setWithdrawError('');
            }
        } catch (error) {
            console.error('Ошибка загрузки максимальной суммы вывода:', error);
            setMaxWithdrawal(null);
            setMaxWithdrawalInfo(null);
        }
    };

    const handleAmountCurrencyChange = async (value) => {
        setAmountCurrency(value);
        if (value && rate) {
            const rubValue = parseFloat(value) * parseFloat(rate);
            setAmountRub(rubValue.toFixed(2));
        }
        // Клиентская проверка: не позволяем ввод больше максимально возможной суммы вывода
        if (transactionType === 'withdrawal' && maxWithdrawal !== null) {
            const val = parseFloat(value || '0');
            if (val > maxWithdrawal) {
                setWithdrawError(`Вы не можете совершить такую операцию. Недостаточно средств на счете. Максимально допустимо: ${maxWithdrawal.toFixed(2)} ${accountData.currency}`);
            } else {
                setWithdrawError('');
            }
        }
    };

    const handleAmountRubChange = (value) => {
        setAmountRub(value);
        if (value && rate) {
            const currencyValue = parseFloat(value) / parseFloat(rate);
            setAmountCurrency(currencyValue.toFixed(2));
        }
    };

    const handleRateChange = (value) => {
        setRate(value);
        setRateModified(true);
        // Пересчитываем при изменении курса
        if (amountCurrency) {
            const rubValue = parseFloat(amountCurrency) * parseFloat(value);
            setAmountRub(rubValue.toFixed(2));
        }
    };

    const handleToAccountChange = async (accountId) => {
        setToAccountId(accountId);
        
        const selectedAccount = availableAccounts.find(acc => acc.id === parseInt(accountId));
        if (selectedAccount) {
            // Загружаем курс для счета получателя
            const courseData = await transactionService.getCourseOnDate(
                selectedAccount.currency,
                date
            );
            setToAccountRate(courseData.spotValue.toFixed(2));
            
            // Рассчитываем сумму для получателя
            if (amountCurrency && rate) {
                const rubAmount = parseFloat(amountCurrency) * parseFloat(rate);
                const toAmount = rubAmount / courseData.spotValue;
                setToAccountAmount(toAmount.toFixed(2));
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Показываем модальное окно подтверждения
        const shouldSubmit = window.confirm('Вы уверены что все данные введены правильно? После добавления транзакции будет выполнен пересчет всех последующих операций.');
        if (!shouldSubmit) {
            return;
        }

        try {
            setLoading(true);
            
            let data = {
                accountId: accountData.accountId,
                date,
                description
            };

            switch (transactionType) {
                case 'deposit':
                    data = {
                        ...data,
                        amountCurrency: parseFloat(amountCurrency),
                        amountRub: parseFloat(amountRub),
                        rate: parseFloat(rate),
                        rateModified
                    };
                    break;
                
                case 'withdrawal':
                    data = {
                        ...data,
                        amountCurrency: parseFloat(amountCurrency),
                        rate: parseFloat(rate),
                        rateModified
                    };
                    break;
                
                case 'debiting':
                    data = {
                        ...data,
                        amountCurrency: parseFloat(amountCurrency)
                    };
                    break;
                
                case 'transfer':
                    data = {
                        fromAccountId: accountData.accountId,
                        toAccountId: parseInt(toAccountId),
                        date,
                        amountCurrencyFrom: parseFloat(amountCurrency),
                        amountCurrencyTo: parseFloat(toAccountAmount),
                        rateFrom: parseFloat(rate),
                        rateTo: parseFloat(toAccountRate),
                        rateFromModified: rateModified,
                        rateToModified: toAccountRateModified,
                        description
                    };
                    break;
                
                case 'profitability':
                    data = {
                        ...data,
                        profitPercent: parseFloat(profitPercent)
                    };
                    break;
                
                default:
                    throw new Error('Unknown transaction type');
            }

            // КРИТИЧНО: Клиентская валидация максимальной суммы вывода
            if (transactionType === 'withdrawal') {
                const val = parseFloat(amountCurrency || '0');
                
                // Проверка: сумма должна быть больше 0
                if (val <= 0) {
                    setLoading(false);
                    document.dispatchEvent(new CustomEvent('main-notify', {
                      detail: {
                        type: 'error',
                        text: 'Сумма вывода должна быть больше нуля'
                      }
                    }));
                    return;
                }
                
                // Проверка: сумма не должна превышать максимально доступную
                if (maxWithdrawal !== null) {
                    if (val > maxWithdrawal) {
                        setLoading(false);
                        const maxFormatted = maxWithdrawal.toFixed(2);
                        const available = maxWithdrawalInfo?.totalAvailable?.toFixed(2) || 'N/A';
                        const commission = maxWithdrawalInfo?.commission || 0;
                        const penalties = maxWithdrawalInfo?.totalPenalties?.toFixed(2) || '0.00';
                        
                        document.dispatchEvent(new CustomEvent('main-notify', {
                          detail: {
                            type: 'error',
                            text: `Вы не можете совершить такую операцию. Недостаточно средств на счете.\nМаксимально доступно для вывода: ${maxFormatted} ${accountData.currency}\n(Доступно: ${available}, Комиссия: ${commission}, Штрафы: ${penalties})`
                          }
                        }));
                        return;
                    }
                } else {
                    // Если maxWithdrawal еще не загружен, предупреждаем пользователя
                    console.warn('⚠️ Максимальная сумма вывода еще не загружена, но продолжаем отправку на сервер для валидации');
                }
            }
            
            // Проверка баланса для переводов
            if (transactionType === 'transfer' && balance !== null) {
                const requestedAmount = parseFloat(amountCurrency);
                if (balance < requestedAmount) {
                    alert(`❌ Недостаточно средств на счете для перевода.\nДоступно: ${balance.toFixed(2)}\nЗапрошено: ${requestedAmount.toFixed(2)}`);
                    setLoading(false);
                    return;
                }
            }

            const result = await transactionService.addTransaction(transactionType, data);
            // Показываем SUCCESS-уведомление
            document.dispatchEvent(new CustomEvent('main-notify', {
              detail: {
                type: 'success',
                text: 'Транзакция добавлена успешно! Выполняется пересчет...'
              }
            }));
            onSuccess && onSuccess({
                type: transactionType,
                accountId: accountData?.accountId,
                result
            });
            onClose();
        } catch (error) {
            console.error('Ошибка добавления транзакции:', error);
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

    const getTitle = () => {
        const titles = {
            deposit: 'ПОПОЛНЕНИЕ',
            withdrawal: 'ВЫВОД',
            debiting: 'СПИСАНИЕ',
            transfer: 'ПЕРЕВОД',
            profitability: 'НАЧИСЛЕНИЕ ДОХОДНОСТИ'
        };
        return `ДОБАВЛЕНИЕ ТРАНЗАКЦИИ ${titles[transactionType] || ''}`;
    };

    return (
        <div className="transaction-form-modal-overlay" onClick={onClose}>
            <div className="transaction-form-modal" onClick={(e) => e.stopPropagation()}>
                <div className="transaction-form-modal-header">
                    <h3>{getTitle()}</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form className="transaction-form" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <h4>Информация о счете</h4>
                        <div className="form-row">
                            <div className="form-field">
                                <label>ФИО клиента:</label>
                                <input type="text" value={accountData.userFullName} readOnly />
                            </div>
                            <div className="form-field">
                                <label>Счет:</label>
                                <input type="text" value={`#${accountData.accountId}`} readOnly />
                            </div>
                        </div>
                        <div className="form-row">
                            <div className="form-field">
                                <label>Продукт:</label>
                                <input type="text" value={accountData.product} readOnly />
                            </div>
                            <div className="form-field">
                                <label>Баланс на дату:</label>
                                <input 
                                    type="text" 
                                    value={balance !== null ? `${balance.toFixed(2)} ${accountData.currency}` : 'Загрузка...'} 
                                    readOnly 
                                    className="balance-field"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <h4>Данные транзакции</h4>
                        <div className="form-row">
                            <div className="form-field">
                                <label>Дата транзакции: *</label>
                                <input 
                                    type="date" 
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    required 
                                />
                            </div>
                        </div>

                        {/* Поля для разных типов транзакций */}
                        {(transactionType === 'deposit' || transactionType === 'withdrawal' || transactionType === 'debiting' || transactionType === 'transfer') && (
                            <>
                                <div className="form-row">
                                    <div className="form-field">
                                        <label>Сумма в {accountData.currency}: *</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            min="0"
                                            value={amountCurrency}
                                            onChange={(e) => handleAmountCurrencyChange(e.target.value)}
                                            onWheel={(e) => e.target.blur()}
                                            required 
                                        />
                                        {transactionType === 'withdrawal' && (
                                            <>
                                                {maxWithdrawal !== null && (
                                                    <>
                                                        <small style={{ color: '#5cb85c', display: 'block', marginTop: '5px' }}>
                                                            Максимально доступно для вывода: <strong>{maxWithdrawal.toFixed(2)} {accountData.currency}</strong>
                                                            {maxWithdrawalInfo && (
                                                                <span style={{ fontSize: '0.9em', display: 'block', marginTop: '3px', color: '#666' }}>
                                                                    (Доступно: {maxWithdrawalInfo.totalAvailable.toFixed(2)}, Комиссия: {maxWithdrawalInfo.commission}, Штрафы: {maxWithdrawalInfo.totalPenalties?.toFixed(2) || '0.00'})
                                                                </span>
                                                            )}
                                                        </small>
                                                        {maxWithdrawalInfo?.withoutPenaltyAmount > 0 && (
                                                            <small style={{ color: '#3a7bd5', display: 'block', marginTop: '4px' }}>
                                                                Доступно для вывода {maxWithdrawalInfo.withoutPenaltyAmount.toFixed(2)} {accountData.currency} без штрафа
                                                            </small>
                                                        )}
                                                    </>
                                                )}
                                                {withdrawError && (
                                                    <small className="error" style={{ color: '#d9534f', display: 'block', marginTop: '5px' }}>{withdrawError}</small>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    {(transactionType === 'deposit' || transactionType === 'withdrawal') && (
                                        <div className="form-field">
                                            <label>Сумма в рублях:</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                min="0"
                                                value={amountRub}
                                                onChange={(e) => handleAmountRubChange(e.target.value)}
                                                onWheel={(e) => e.target.blur()}
                                            />
                                        </div>
                                    )}
                                </div>

                                {(transactionType === 'deposit' || transactionType === 'withdrawal' || transactionType === 'transfer') && (
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label>Курс валюты: *</label>
                                            <input 
                                                type="number" 
                                                step="0.01"
                                                min="0"
                                                value={rate}
                                                onChange={(e) => handleRateChange(e.target.value)}
                                                onWheel={(e) => e.target.blur()}
                                                required 
                                                className={rateModified ? 'modified' : ''}
                                            />
                                            {rateModified && <small className="warning">⚠ Курс изменен оператором</small>}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Для переводов */}
                        {transactionType === 'transfer' && (
                            <>
                                <div className="form-row">
                                    <div className="form-field">
                                        <label>Счет получателя: *</label>
                                        <select 
                                            value={toAccountId}
                                            onChange={(e) => handleToAccountChange(e.target.value)}
                                            required
                                        >
                                            <option value="">Выберите счет</option>
                                            {availableAccounts.map(acc => (
                                                <option key={acc.id} value={acc.id}>
                                                    #{acc.id} - {acc.userName} ({acc.productType}, {acc.currency})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {toAccountId && (
                                    <div className="form-row">
                                        <div className="form-field">
                                            <label>Сумма получателю:</label>
                                            <input 
                                                type="text" 
                                                value={toAccountAmount}
                                                readOnly 
                                            />
                                        </div>
                                        <div className="form-field">
                                            <label>Курс получателя:</label>
                                            <input 
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={toAccountRate}
                                                onChange={(e) => {
                                                    const newRate = e.target.value;
                                                    setToAccountRate(newRate);
                                                    setToAccountRateModified(true);

                                                    // Пересчитываем сумму для получателя
                                                    if (amountCurrency && rate && newRate) {
                                                        const rubAmount = parseFloat(amountCurrency) * parseFloat(rate);
                                                        const toAmount = rubAmount / parseFloat(newRate);
                                                        setToAccountAmount(toAmount.toFixed(2));
                                                    }
                                                }}
                                                onWheel={(e) => e.target.blur()}
                                                className={toAccountRateModified ? 'modified' : ''}
                                            />
                                            {toAccountRateModified && <small className="warning">⚠ Курс изменен оператором</small>}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Для доходности */}
                        {transactionType === 'profitability' && (
                            <div className="form-row">
                                <div className="form-field">
                                    <label>Процент доходности: *</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        min="0"
                                        value={profitPercent}
                                        onChange={(e) => setProfitPercent(e.target.value)}
                                        onWheel={(e) => e.target.blur()}
                                        required 
                                    />
                                </div>
                            </div>
                        )}

                        <div className="form-row">
                            <div className="form-field full-width">
                                <label>Описание (причина добавления): *</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows="3"
                                    required
                                    placeholder="Укажите причину добавления транзакции..."
                                />
                            </div>
                        </div>
                    </div>

                    <div className="transaction-form-footer">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Отмена
                        </button>
                        <button type="submit" className="submit-btn" disabled={loading || (transactionType === 'withdrawal' && !!withdrawError)}>
                            {loading ? 'Добавление...' : 'Добавить транзакцию'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionFormModal;

