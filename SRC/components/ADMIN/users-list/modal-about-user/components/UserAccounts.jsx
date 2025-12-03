import React, { useState, useEffect, useMemo } from 'react';
import adminService from '../../../../../JS/services/admin-service';

const formatMoney = (value) => {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return '0,00';
  }
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (value) => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleDateString('ru-RU');
};

const buildReceiptUrl = (src) => {
  if (!src) {
    return null;
  }
  if (typeof src !== 'string') {
    return null;
  }
  if (src.startsWith('http')) {
    return src;
  }
  return `${import.meta.env.VITE_API_URL || ''}${src}`;
};

const UserAccounts = ({ user }) => {
  const [accounts, setAccounts] = useState([]);
  const [applications, setApplications] = useState({ deposits: [], withdrawals: [], transfers: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedAccountToClose, setSelectedAccountToClose] = useState('');
  const [newAccountName, setNewAccountName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [processingAction, setProcessingAction] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadUserAccounts();
      loadUserApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadUserAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const userAccounts = await adminService.getUserAccounts(user.id);
      setAccounts(userAccounts);
    } catch (err) {
      console.error('Ошибка загрузки счетов:', err);
      setError('Не удалось загрузить счета');
    } finally {
      setLoading(false);
    }
  };

  const loadUserApplications = async () => {
    try {
      const apps = await adminService.getUserApplications(user.id);
      setApplications(apps || { deposits: [], withdrawals: [], transfers: [] });
    } catch (err) {
      console.error('Ошибка загрузки заявок:', err);
      setApplications({ deposits: [], withdrawals: [], transfers: [] });
    }
  };

  const getAccountById = (id) => {
    if (!id) return null;
    return accounts.find((acc) => acc.id === Number(id));
  };

  const getAccountLabel = (id) => {
    if (!id && id !== 0) {
      return '—';
    }
    const account = getAccountById(id);
    if (!account) {
      return `№${id}`;
    }
    return `№${account.id} • ${account.product}`;
  };

  const requestRows = useMemo(() => {
    const rows = [];

    (applications.deposits || []).forEach((deposit) => {
      rows.push({
        id: `deposit-${deposit.id}`,
        type: 'DEPOSIT',
        date: deposit.date,
        account: getAccountLabel(deposit.accountId),
        amount: `${formatMoney(deposit.amount)} ${getAccountById(deposit.accountId)?.currency || '$'}`,
        status: deposit.status || '—',
        receipt: deposit.receipt
      });
    });

    (applications.withdrawals || []).forEach((withdrawal) => {
      rows.push({
        id: `withdrawal-${withdrawal.id}`,
        type: 'WITHDRAWAL',
        date: withdrawal.date,
        account: getAccountLabel(withdrawal.accountId),
        amount: `${formatMoney(withdrawal.amount)} ${getAccountById(withdrawal.accountId)?.currency || '$'}`,
        status: withdrawal.status || '—',
        receipt: withdrawal.receipt
      });
    });

    (applications.transfers || []).forEach((transfer) => {
      const fromLabel = getAccountLabel(transfer.fromAccountId);
      const toLabel = getAccountLabel(transfer.toAccountId);
      rows.push({
        id: `transfer-${transfer.id}`,
        type: 'TRANSFER',
        date: transfer.date,
        account: `${fromLabel} → ${toLabel}`,
        amount: `${formatMoney(transfer.amount)} ${getAccountById(transfer.fromAccountId)?.currency || '$'}`,
        status: transfer.status || '—',
        receipt: transfer.receipt
      });
    });

    return rows.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return dateB - dateA;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applications, accounts.length]);

  const isProcessing = Boolean(processingAction);

  const handleCloseAccount = async () => {
    if (!selectedAccountToClose || selectedAccountToClose === '0') {
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Выберите счет для закрытия'
        }
      }));
      return;
    }

    const account = accounts.find((acc) => acc.id === parseInt(selectedAccountToClose, 10));
    if (!account || !account.canClose) {
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Нельзя закрыть счет с положительным балансом'
        }
      }));
      return;
    }

    const shouldClose = window.confirm(`Вы уверены, что хотите закрыть счет №${account.id} "${account.name}"?`);
    if (!shouldClose) {
      return;
    }

    setProcessingAction('close');
    try {
      await adminService.closeUserAccount(user.id, selectedAccountToClose);
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Счет успешно закрыт'
        }
      }));
      await loadUserAccounts();
      await loadUserApplications();
      setSelectedAccountToClose('');
    } catch (err) {
      console.error('Ошибка закрытия счета:', err);
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: err.response?.data?.message || 'Ошибка при закрытии счета'
        }
      }));
    } finally {
      setProcessingAction(null);
    }
  };

  const handleOpenAccount = async () => {
    if (!newAccountName.trim()) {
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Введите название счета'
        }
      }));
      return;
    }

    if (!selectedProduct || selectedProduct === '0') {
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Выберите продукт'
        }
      }));
      return;
    }

    setProcessingAction('open');
    try {
      await adminService.openUserAccount(user.id, {
        name: newAccountName,
        productType: selectedProduct
      });
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Счет успешно открыт'
        }
      }));
      await loadUserAccounts();
      await loadUserApplications();
      setNewAccountName('');
      setSelectedProduct('');
    } catch (err) {
      console.error('Ошибка открытия счета:', err);
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: err.response?.data?.message || 'Ошибка при открытии счета'
        }
      }));
    } finally {
      setProcessingAction(null);
    }
  };

  const handleOpenReceipt = (src) => {
    const url = buildReceiptUrl(src);
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  };

  if (!user) return null;

  return (
    <div className="admin-user-portfolio-list-item user-accounts active-tab">
      <div className="admin-user-portfolio-list-item-content">
        <div className="admin-user-portfolio-list-item-content-grid two-columns">
          <div className="user-accounts-column">
            <div className="admin-user-portfolio-section">
              <h3>Счета клиента</h3>
              {loading ? (
                <div className="admin-user-portfolio-loading">Загрузка счетов...</div>
              ) : error ? (
                <div className="admin-user-portfolio-empty">{error}</div>
              ) : accounts.length > 0 ? (
                <div className="admin-user-portfolio-table-wrapper">
                  <table className="admin-user-portfolio-table user-accounts-table">
                    <thead>
                      <tr>
                        <th>Номер</th>
                        <th>Название</th>
                        <th>Продукт</th>
                        <th>Валюта</th>
                        <th>Баланс</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accounts.map((account) => (
                        <tr key={account.id}>
                          <td>№{account.id}</td>
                          <td>{account.name}</td>
                          <td>{account.product}</td>
                          <td>{account.currency}</td>
                          <td>{formatMoney(account.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-user-portfolio-empty">Счетов нет</div>
              )}
            </div>

            <div className="admin-user-portfolio-section">
              <h3>Заявки по счетам</h3>
              {requestRows.length > 0 ? (
                <div className="admin-user-portfolio-table-wrapper">
                  <table className="admin-user-portfolio-table user-accounts-requests-table">
                    <thead>
                      <tr>
                        <th>Тип</th>
                        <th>Дата</th>
                        <th>Счет</th>
                        <th>Сумма</th>
                        <th>Статус</th>
                        <th>Чек</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestRows.map((request) => (
                        <tr key={request.id}>
                          <td>
                            <span className={`user-accounts-request-type user-accounts-request-type--${request.type.toLowerCase()}`}>
                              {request.type}
                            </span>
                          </td>
                          <td>{formatDate(request.date)}</td>
                          <td className="user-accounts-request-account">{request.account}</td>
                          <td>{request.amount}</td>
                          <td>{request.status}</td>
                          <td>
                            {request.receipt ? (
                              <button
                                type="button"
                                className="admin-user-portfolio-button subtle"
                                onClick={() => handleOpenReceipt(request.receipt)}
                              >
                                Открыть
                              </button>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-user-portfolio-empty">Заявок нет</div>
              )}
            </div>
          </div>

          <div className="user-accounts-column user-accounts-column--actions">
            <div className="admin-user-portfolio-section">
              <h3>Закрытие счетов</h3>
              <div className="admin-user-portfolio-fields">
                <div className="admin-user-portfolio-field">
                  <label htmlFor="accouns-close-select">Счет</label>
                  <select
                    id="accouns-close-select"
                    value={selectedAccountToClose}
                    onChange={(e) => setSelectedAccountToClose(e.target.value)}
                  >
                    <option value="0">-- счет не выбран --</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id} disabled={!account.canClose}>
                        №{account.id} {account.product} {account.name} (Баланс: {formatMoney(account.value)} {account.currency})
                        {!account.canClose ? ' - нельзя закрыть' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="admin-user-portfolio-actions">
                <button
                  type="button"
                  className="admin-user-portfolio-button danger"
                  onClick={handleCloseAccount}
                  disabled={isProcessing}
                >
                  {processingAction === 'close' ? 'Закрытие…' : 'Закрыть счет'}
                </button>
              </div>
            </div>

            <div className="admin-user-portfolio-section">
              <h3>Открытие счетов</h3>
              <div className="admin-user-portfolio-fields">
                <div className="admin-user-portfolio-field">
                  <label htmlFor="accouns-open-name">Название счета</label>
                  <input
                    type="text"
                    id="accouns-open-name"
                    placeholder="Название нового счета"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                  />
                </div>
                <div className="admin-user-portfolio-field">
                  <label htmlFor="accouns-open-select">Продукт</label>
                  <select
                    id="accouns-open-select"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                  >
                    <option value="0">-- продукт не выбран --</option>
                    <option value="CLASSIC">CLASSIC</option>
                    <option value="CRYPTO">CRYPTO</option>
                    <option value="ETF">ETF</option>
                    <option value="ETF-2.0">ETF-2.0</option>
                  </select>
                </div>
              </div>
              <div className="admin-user-portfolio-actions">
                <button
                  type="button"
                  className="admin-user-portfolio-button primary"
                  onClick={handleOpenAccount}
                  disabled={isProcessing}
                >
                  {processingAction === 'open' ? 'Открытие…' : 'Открыть счет'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserAccounts;
