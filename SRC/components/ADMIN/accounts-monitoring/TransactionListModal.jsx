import React, { useState, useEffect } from 'react';
import './TransactionListModal.css';
import transactionService from '../../../JS/services/transaction-service';

const TransactionListModal = ({ 
    accountData, 
    transactionType, 
    year, 
    month, 
    onClose, 
    onAddNew,
    onRefresh 
}) => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadTransactions();
    }, [accountData, year, month]);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            console.log('📥 TransactionListModal: Загружаем транзакции для accountData:', accountData, 'year:', year, 'month:', month);
            
            const data = await transactionService.getMonthTransactions(
                accountData.accountId,
                year,
                month
            );
            
            console.log('📥 TransactionListModal: Получены данные транзакций:', data);
            
            // Фильтруем по типу транзакции
            let filtered = [];
            switch (transactionType) {
                case 'deposit':
                    filtered = data.deposits || [];
                    break;
                case 'withdrawal':
                    filtered = data.withdrawals || [];
                    break;
                case 'debiting':
                    filtered = data.debitings || [];
                    break;
                case 'transfer':
                    filtered = data.transfers || [];
                    break;
                case 'profitability':
                    filtered = data.profitabilities || [];
                    break;
                default:
                    filtered = [];
            }
            
            console.log('📥 TransactionListModal: Отфильтрованные транзакции:', filtered);
            
            setTransactions(filtered);
        } catch (error) {
            console.error('Ошибка загрузки транзакций:', error);
            // Показываем ERROR-уведомление already has a // Показываем ERROR-уведомление
            document.dispatchEvent(new CustomEvent('main-notify', {
              detail: {
                type: 'error',
                text: 'Ошибка загрузки транзакций: ' + error.message
              }
            }));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (transaction) => {
        // Показываем модальное окно подтверждения
        const shouldDelete = window.confirm('Вы уверены что хотите удалить эту транзакцию? Это приведет к пересчету всех последующих операций.');
        if (!shouldDelete) {
            return;
        }

        try {
            // Определяем тип транзакции для удаления
            // Для дебитингов нужно проверить, является ли это штрафом
            let deleteType = transactionType;
            if (transactionType === 'debiting' && transaction.transactionType === 'fine') {
                deleteType = 'fine';
            }
            
            await transactionService.deleteTransaction(deleteType, transaction.id);
            // Показываем SUCCESS-уведомление
            document.dispatchEvent(new CustomEvent('main-notify', {
              detail: {
                type: 'success',
                text: 'Транзакция удалена. Выполняется пересчет...'
              }
            }));
            await loadTransactions();
            onRefresh && onRefresh({
                accountId: accountData?.accountId,
                deleteType,
                deletedTransaction: transaction
            });
        } catch (error) {
            console.error('Ошибка удаления транзакции:', error);
            // Показываем ERROR-уведомление
            document.dispatchEvent(new CustomEvent('main-notify', {
              detail: {
                type: 'error',
                text: 'Ошибка удаления: ' + error.message
              }
            }));
        }
    };

    const formatDate = (date) => {
        if (!date) return '';
        return new Date(date).toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatStatus = (status) => {
        if (status === 'credited') {
            return 'ИСПОЛНЕНО';
        }
        if (status === 'Resolve') {
            return 'ИСПОЛНЕНО';
        }
        return 'НА РАССМОТРЕНИИ';
    };

    const getTransactionTitle = () => {
        const titles = {
            deposit: 'ПОПОЛНЕНИЯ',
            withdrawal: 'ВЫВОДЫ',
            debiting: 'СПИСАНИЯ',
            transfer: 'ПЕРЕВОДЫ',
            profitability: 'НАЧИСЛЕНИЯ ДОХОДНОСТИ'
        };
        return titles[transactionType] || 'ТРАНЗАКЦИИ';
    };

    const renderTransactionRow = (transaction, index) => {
        // Рендерим в зависимости от типа транзакции
        switch (transactionType) {
            case 'deposit':
                return renderDepositRow(transaction, index);
            case 'withdrawal':
                return renderWithdrawalRow(transaction, index);
            case 'debiting':
                return renderDebitingRow(transaction, index);
            case 'transfer':
                return renderTransferRow(transaction, index);
            case 'profitability':
                return renderProfitabilityRow(transaction, index);
            default:
                return null;
        }
    };

    const renderDepositRow = (transaction) => {
        return (
            <div key={transaction.id} className="transaction-list-modal-row">
                <div className="transaction-list-modal-cell-number">{transaction.id}</div>
                <div className="transaction-list-modal-cell-date">{formatDate(transaction.date_time_widthdrawl)}</div>
                <div className="transaction-list-modal-cell-amount">+{parseFloat(transaction.deposit_CUR_value || 0).toFixed(2)} {accountData.currency}</div>
                <div className="transaction-list-modal-cell-course">{transaction.course ? parseFloat(transaction.course).toFixed(2) : ''}</div>
                <div className="transaction-list-modal-cell-amount-rub">{transaction.deposit_RUB_value ? parseFloat(transaction.deposit_RUB_value).toFixed(2) + ' ₽' : ''}</div>
                <div className="transaction-list-modal-cell-status">{formatStatus(transaction.status)}</div>
                <div className="transaction-list-modal-cell-description">{transaction.description || ''}</div>
                <div className="transaction-list-modal-cell-actions">
                    <button className="transaction-list-modal-delete-btn" onClick={() => handleDelete(transaction)}>Удалить</button>
                </div>
            </div>
        );
    };

    const renderWithdrawalRow = (transaction) => {
        return (
            <div key={transaction.id} className="transaction-list-modal-row">
                <div className="transaction-list-modal-cell-number">{transaction.id}</div>
                <div className="transaction-list-modal-cell-date">{formatDate(transaction.date_time_deposit)}</div>
                <div className="transaction-list-modal-cell-amount">-{parseFloat(transaction.widthdrawl_CURRENCY_value || 0).toFixed(2)} {accountData.currency}</div>
                <div className="transaction-list-modal-cell-commission">{transaction.widthdrawl_COMISSION_value ? parseFloat(transaction.widthdrawl_COMISSION_value).toFixed(2) : ''}</div>
                <div className="transaction-list-modal-cell-status">{formatStatus(transaction.status)}</div>
                <div className="transaction-list-modal-cell-description">{transaction.description || ''}</div>
                <div className="transaction-list-modal-cell-actions">
                    <button className="transaction-list-modal-delete-btn" onClick={() => handleDelete(transaction)}>Удалить</button>
                </div>
            </div>
        );
    };

    const renderDebitingRow = (transaction) => {
        // Определяем тип транзакции
        const isFine = transaction.transactionType === 'fine';
        const transactionType = isFine ? 'fine' : 'debiting';
        const amount = isFine 
            ? parseFloat(transaction.fine_CURRENCY_value || 0).toFixed(2)
            : parseFloat(transaction.debiting_CURRENCY_value || 0).toFixed(2);
        const date = isFine 
            ? transaction.date_time_fine 
            : transaction.date_time_debiting;
        const description = isFine 
            ? transaction.description || ''
            : transaction.debiting_description || '';
        
        return (
            <div key={transaction.id} className="transaction-list-modal-row">
                <div className="transaction-list-modal-cell-number">{transaction.id}</div>
                <div className="transaction-list-modal-cell-date">{formatDate(date)}</div>
                <div className="transaction-list-modal-cell-type">
                    <span className={`transaction-type-badge ${transactionType}`}>
                        {isFine ? 'Штраф' : 'Списание'}
                    </span>
                </div>
                <div className="transaction-list-modal-cell-amount">-{amount} {accountData.currency}</div>
                <div className="transaction-list-modal-cell-description">{description}</div>
                {isFine && transaction.penalty_amount && (
                    <div className="transaction-list-modal-cell-penalty">
                        Штраф: {parseFloat(transaction.penalty_amount).toFixed(2)}
                    </div>
                )}
                <div className="transaction-list-modal-cell-actions">
                    <button className="transaction-list-modal-delete-btn" onClick={() => handleDelete(transaction)}>Удалить</button>
                </div>
            </div>
        );
    };

    const renderTransferRow = (transaction) => {
        const isOutgoing = transaction.account_id_original === accountData.accountId;
        const direction = isOutgoing ? `→ Счет #${transaction.account_id_transfer}` : `← Счет #${transaction.account_id_original}`;
        const amount = isOutgoing 
            ? parseFloat(transaction.currency_value_original || 0).toFixed(2)
            : parseFloat(transaction.currency_value_transfer || 0).toFixed(2);

        return (
            <div key={transaction.id} className="transaction-list-modal-row">
                <div className="transaction-list-modal-cell-number">{transaction.id}</div>
                <div className="transaction-list-modal-cell-date">{formatDate(transaction.date_transfer)}</div>
                <div className="transaction-list-modal-cell-amount">{(isOutgoing ? '-' : '+')}{amount} {accountData.currency}</div>
                <div className="transaction-list-modal-cell-transfer">{direction}</div>
                <div className="transaction-list-modal-cell-status">{formatStatus(transaction.transfer_status)}</div>
                <div className="transaction-list-modal-cell-description">{transaction.descriptions || ''}</div>
                <div className="transaction-list-modal-cell-actions">
                    <button className="transaction-list-modal-delete-btn" onClick={() => handleDelete(transaction)}>Удалить</button>
                </div>
            </div>
        );
    };

    const renderProfitabilityRow = (transaction) => {
        const period = `${transaction.month_add}/${transaction.year_add}`;
        return (
            <div key={transaction.id} className="transaction-list-modal-row">
                <div className="transaction-list-modal-cell-number">{transaction.id}</div>
                <div className="transaction-list-modal-cell-date">{period}</div>
                <div className="transaction-list-modal-cell-amount">+{parseFloat(transaction.profitability_value || 0).toFixed(2)} {accountData.currency}</div>
                <div className="transaction-list-modal-cell-percent">{transaction.percent_profitability ? parseFloat(transaction.percent_profitability).toFixed(2) + '%' : ''}</div>
                <div className="transaction-list-modal-cell-start-capital">{transaction.start_capital ? parseFloat(transaction.start_capital).toFixed(2) : ''}</div>
                <div className="transaction-list-modal-cell-end-capital">{transaction.end_capital ? parseFloat(transaction.end_capital).toFixed(2) : ''}</div>
                <div className="transaction-list-modal-cell-actions">
                    <button className="transaction-list-modal-delete-btn" onClick={() => handleDelete(transaction)}>Удалить</button>
                </div>
            </div>
        );
    };

    const renderTableHeaders = () => {
        // Заголовки в зависимости от типа транзакции
        switch (transactionType) {
            case 'deposit':
                return (
                    <div className="transaction-list-modal-row-header">
                        <div className="transaction-list-modal-cell-number">#</div>
                        <div className="transaction-list-modal-cell-date">Дата</div>
                        <div className="transaction-list-modal-cell-amount">Сумма</div>
                        <div className="transaction-list-modal-cell-course">Курс</div>
                        <div className="transaction-list-modal-cell-amount-rub">Сумма в ₽</div>
                        <div className="transaction-list-modal-cell-status">Статус</div>
                        <div className="transaction-list-modal-cell-description">Описание</div>
                        <div className="transaction-list-modal-cell-actions">Действия</div>
                    </div>
                );
            case 'withdrawal':
                return (
                    <div className="transaction-list-modal-row-header">
                        <div className="transaction-list-modal-cell-number">#</div>
                        <div className="transaction-list-modal-cell-date">Дата</div>
                        <div className="transaction-list-modal-cell-amount">Сумма</div>
                        <div className="transaction-list-modal-cell-commission">Комиссия</div>
                        <div className="transaction-list-modal-cell-status">Статус</div>
                        <div className="transaction-list-modal-cell-description">Описание</div>
                        <div className="transaction-list-modal-cell-actions">Действия</div>
                    </div>
                );
            case 'debiting':
                return (
                    <div className="transaction-list-modal-row-header">
                        <div className="transaction-list-modal-cell-number">#</div>
                        <div className="transaction-list-modal-cell-date">Дата</div>
                        <div className="transaction-list-modal-cell-type">Тип</div>
                        <div className="transaction-list-modal-cell-amount">Сумма</div>
                        <div className="transaction-list-modal-cell-description">Описание</div>
                        <div className="transaction-list-modal-cell-penalty">Штраф</div>
                        <div className="transaction-list-modal-cell-actions">Действия</div>
                    </div>
                );
            case 'transfer':
                return (
                    <div className="transaction-list-modal-row-header">
                        <div className="transaction-list-modal-cell-number">#</div>
                        <div className="transaction-list-modal-cell-date">Дата</div>
                        <div className="transaction-list-modal-cell-amount">Сумма</div>
                        <div className="transaction-list-modal-cell-transfer">Направление</div>
                        <div className="transaction-list-modal-cell-status">Статус</div>
                        <div className="transaction-list-modal-cell-description">Описание</div>
                        <div className="transaction-list-modal-cell-actions">Действия</div>
                    </div>
                );
            case 'profitability':
                return (
                    <div className="transaction-list-modal-row-header">
                        <div className="transaction-list-modal-cell-number">#</div>
                        <div className="transaction-list-modal-cell-date">Период</div>
                        <div className="transaction-list-modal-cell-amount">Сумма</div>
                        <div className="transaction-list-modal-cell-percent">%</div>
                        <div className="transaction-list-modal-cell-start-capital">Нач. капитал</div>
                        <div className="transaction-list-modal-cell-end-capital">Кон. капитал</div>
                        <div className="transaction-list-modal-cell-actions">Действия</div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="transaction-list-modal-overlay" onClick={onClose}>
            <div className="transaction-list-modal" onClick={(e) => e.stopPropagation()}>
                <div className="transaction-list-modal-header">
                    <h3>{getTransactionTitle()}</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="transaction-list-modal-info">
                    <p><strong>Клиент:</strong> {accountData.userFullName}</p>
                    <p><strong>Счет:</strong> #{accountData.accountId}</p>
                    <p><strong>Продукт:</strong> {accountData.product}</p>
                    <p><strong>Период:</strong> {month}/{year}</p>
                </div>

                <div className="transaction-list-modal-body">
                    {loading ? (
                        <p className="loading">Загрузка...</p>
                    ) : transactions.length === 0 ? (
                        <p className="empty">Нет транзакций за этот период</p>
                    ) : (
                        <div className="transaction-list-modal-table">
                            {renderTableHeaders()}
                            {transactions.map((transaction, index) => 
                                renderTransactionRow(transaction, index)
                            )}
                        </div>
                    )}
                </div>

                <div className="transaction-list-modal-footer">
                    <button className="transaction-list-modal-add-new-btn" onClick={onAddNew}>
                        + Добавить новую транзакцию
                    </button>
                    <button className="transaction-list-modal-close-footer-btn" onClick={onClose}>
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TransactionListModal;

