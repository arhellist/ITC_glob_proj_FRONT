import React from 'react';
import './LockupPackagesModal.css';

const LockupPackagesModal = ({ isOpen, onClose, packages, totalBalance, accountInfo, month, year }) => {
  if (!isOpen) return null;

  const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatBalance = (balance) => {
    return parseFloat(balance).toFixed(2);
  };

  const getOperationTypeName = (type) => {
    switch(type) {
      case 'deposit':
        return 'Пополнение';
      case 'profitability':
        return 'Доходность';
      case 'withdrawal':
        return 'Вывод';
      case 'transfer':
      case 'transfer_in':
      case 'transfer_out':
        return 'Перевод';
      case 'fine':
        return 'Штраф';
      case 'commission':
        return 'Комиссия';
      case 'debiting':
        return 'Списание';
      case 'adjustment':
        return 'Корректировка';
      default:
        return 'Неизвестная операция';
    }
  };

  return (
    <div className="lockup-modal-overlay" onClick={onClose}>
      <div className="lockup-modal-content" onClick={(e) => e.stopPropagation()}>
               <div className="lockup-modal-header">
                 <h2>Локап-пакеты</h2>
                 <button className="lockup-close-button" onClick={onClose}>×</button>
               </div>

               <div className="lockup-modal-body">
                 {accountInfo && (
                   <div className="lockup-account-info">
                     <p><strong>Пользователь:</strong> {accountInfo.userFullName}</p>
                     <p><strong>Email:</strong> {accountInfo.userEmail}</p>
                     <p><strong>Продукт:</strong> {accountInfo.product}</p>
                     {month && year && (
                       <p><strong>Период:</strong> Начало {MONTHS[month - 1]} {year}</p>
                     )}
                   </div>
                 )}

                 {packages && packages.length > 0 ? (
                   <>
                     <div className="lockup-total-balance">
                       <strong>Итого баланс на начало {month && year ? `${MONTHS[month - 1]} ${year}` : 'периода'}:</strong> {formatBalance(totalBalance)} {accountInfo?.currency || ''}
                     </div>
              
              <div className="lockup-packages-table-container">
                <table className="lockup-packages-table">
                  <thead>
                    <tr>
                      <th>Название пакета</th>
                      <th>Дата депозита</th>
                      <th>Стартовый депозит</th>
                      <th>Остаток пакета</th>
                      <th>Окончание локапа</th>
                      <th>Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {packages.map((pkg) => {
                      return (
                        <tr key={pkg.id} className={pkg.remainingBalance === 0 ? 'lockup-zero-balance' : ''}>
                          <td>{pkg.packageName}</td>
                          <td>{formatDate(pkg.depositDate)}</td>
                          <td className="lockup-numeric-cell lockup-initial-deposit">{formatBalance(pkg.initialDeposit)}</td>
                          <td className={`lockup-balance-cell-operations ${pkg.remainingBalance === 0 ? 'lockup-zero-balance-cell' : ''}`}>
                            <div className="lockup-balance-value">{formatBalance(pkg.remainingBalance)}</div>
                            {pkg.operations && pkg.operations.length > 0 && (
                              <div className="lockup-operations-list">
                                {(() => {
                                  const PRIORITY_MAP = {
                                    deposit: 0,
                                    profitability: 1,
                                    fine: 2,
                                    withdrawal: 3,
                                    commission: 4,
                                    transfer_in: 5,
                                    transfer_out: 6,
                                    debiting: 7
                                  };

                                  const sortedOperations = [...pkg.operations].sort((a, b) => {
                                    const timeA = new Date(a.date).getTime();
                                    const timeB = new Date(b.date).getTime();
                                    if (timeA !== timeB) {
                                      return timeA - timeB;
                                    }

                                    const priorityA = Number.isFinite(a.priority) ? a.priority : (PRIORITY_MAP[a.type] ?? Number.MAX_SAFE_INTEGER);
                                    const priorityB = Number.isFinite(b.priority) ? b.priority : (PRIORITY_MAP[b.type] ?? Number.MAX_SAFE_INTEGER);
                                    if (priorityA !== priorityB) {
                                      return priorityA - priorityB;
                                    }

                                    return (a.transactionId ?? 0) - (b.transactionId ?? 0);
                                  });

                                  return sortedOperations.map((op, idx) => (
                                  <div key={idx} className={`lockup-operation-item lockup-operation-${op.type}`}>
                                    <span className="lockup-operation-type">{getOperationTypeName(op.type)}</span>
                                    <div className="lockup-operation-details">
                                      <span className="lockup-operation-date">{formatDate(op.date)}</span>
                                      <span className={`lockup-operation-amount ${op.amount >= 0 ? 'lockup-positive' : 'lockup-negative'}`}>
                                        {op.amount >= 0 ? '+' : ''}{formatBalance(op.amount)}
                                      </span>
                                    </div>
                                  </div>
                                  ));
                                })()}
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="lockup-end-date-cell">
                              <div className="lockup-end-date">{formatDate(pkg.lockupEndDate)}</div>
                              <span className={`lockup-end-date-badge ${pkg.isLockupExpired ? 'lockup-closed' : 'lockup-open'}`}>
                                {pkg.isLockupExpired ? 'ЗАКРЫТ' : 'ОТКРЫТ'}
                              </span>
                            </div>
                          </td>
                          <td>
                            {/* КРИТИЧНО: Проверяем isClosed или is_closed (для совместимости) */}
                            {(() => {
                              const isClosed = pkg.isClosed !== undefined ? pkg.isClosed : (pkg.is_closed !== undefined ? pkg.is_closed : false);
                              console.log(`🔍 Пакет ${pkg.packageName}: isClosed=${pkg.isClosed}, is_closed=${pkg.is_closed}, итог=${isClosed}`);
                              return (
                                <span className={`lockup-status-badge ${isClosed ? 'lockup-closed' : 'lockup-active'}`}>
                                  {isClosed ? 'Закрыт' : 'Активен'}
                                </span>
                              );
                            })()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="lockup-no-packages">
              <p>Нет активных локап-пакетов</p>
            </div>
          )}
        </div>
        
        <div className="lockup-modal-footer">
          <button className="lockup-btn-secondary" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  );
};

export default LockupPackagesModal;

