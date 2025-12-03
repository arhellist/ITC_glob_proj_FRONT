import React, { useState, useEffect } from 'react';
import './QueueCalculationsModal.css';
import adminService from '../../../JS/services/admin-service';

const QueueCalculationsModal = ({ 
  isOpen, 
  onClose, 
  queueData 
}) => {
  if (!isOpen || !queueData) return null;

  const [productFilter, setProductFilter] = useState('');
  const [nameEmailFilter, setNameEmailFilter] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const formatNumber = (value, decimals = 2) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (num === 0) return '—';
    return num.toFixed(decimals);
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (num === 0) return '—';
    return num.toFixed(2);
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined) return '—';
    const num = Number(value);
    if (num === 0) return '—';
    return `${num.toFixed(1)}%`;
  };

  // Загрузка списка продуктов из БД при открытии модалки
  useEffect(() => {
    if (isOpen) {
      loadProducts();
    }
  }, [isOpen]);

  const loadProducts = async () => {
    setProductsLoading(true);
    try {
      const products = await adminService.getProductsList();
      setAllProducts(products || []);
    } catch (error) {
      console.error('Ошибка загрузки списка продуктов:', error);
      setAllProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  // Функции плавной прокрутки таблицы
  const scrollToTop = () => {
    console.log('Попытка прокрутки в начало...');
    const tableContainer = document.querySelector('.table-scroll-wrapper');
    console.log('Найденный контейнер:', tableContainer);
    
    if (tableContainer) {
      console.log('ScrollHeight:', tableContainer.scrollHeight);
      console.log('ClientHeight:', tableContainer.clientHeight);
      
      tableContainer.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    } else {
      console.error('Контейнер .table-scroll-wrapper не найден');
    }
  };

  const scrollToBottom = () => {
    console.log('Попытка прокрутки в конец...');
    const tableContainer = document.querySelector('.table-scroll-wrapper');
    console.log('Найденный контейнер:', tableContainer);
    
    if (tableContainer) {
      console.log('ScrollHeight:', tableContainer.scrollHeight);
      console.log('ClientHeight:', tableContainer.clientHeight);
      
      tableContainer.scrollTo({
        top: tableContainer.scrollHeight,
        behavior: 'smooth'
      });
    } else {
      console.error('Контейнер .table-scroll-wrapper не найден');
    }
  };

  // Фильтрация счетов
  const filteredAccounts = queueData.accounts.filter(account => {
    const matchesProduct = !productFilter || 
      account.product.toLowerCase().includes(productFilter.toLowerCase());
    
    const matchesNameEmail = !nameEmailFilter || 
      account.clientName.toLowerCase().includes(nameEmailFilter.toLowerCase()) ||
      account.email.toLowerCase().includes(nameEmailFilter.toLowerCase());
    
    return matchesProduct && matchesNameEmail;
  });

  // Получаем список продуктов для фильтра из БД (все доступные продукты)
  // Используем поле 'type' из продуктов БД
  const availableProducts = allProducts
    .map(product => product.type)
    .filter(type => type && type.trim() !== '')
    .sort();
  
  // Отладочная информация
  console.log('Всего счетов в очереди:', queueData.accounts.length);
  console.log('Все продукты из БД:', availableProducts);
  console.log('Всего продуктов в БД:', allProducts.length);

  return (
    <div className="queue-calculations-modal-overlay" onClick={onClose}>
      <div className="queue-calculations-modal" onClick={(e) => e.stopPropagation()}>
        <div className="queue-calculations-header">
          <h2>Расчеты доходности очереди: {queueData.title}</h2>
          <div className="header-controls">
            <button 
              className="scroll-btn scroll-to-top"
              onClick={scrollToTop}
              title="Прокрутить в начало таблицы"
            >
              ↑
            </button>
            <button 
              className="scroll-btn scroll-to-bottom"
              onClick={scrollToBottom}
              title="Прокрутить в конец таблицы"
            >
              ↓
            </button>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>
        </div>
        
        <div className="queue-calculations-content">
          <div className="queue-calculations-info">
            <div className="info-item">
              <span className="label">Период:</span>
              <span className="value">{queueData.month}/{queueData.year}</span>
            </div>
            <div className="info-item">
              <span className="label">Всего счетов:</span>
              <span className="value">{filteredAccounts.length} из {queueData.accounts.length}</span>
            </div>
            <div className="info-item">
              <span className="label">Статус:</span>
              <span className={`status ${queueData.status}`}>
                {queueData.status === 'pending' && 'Ожидает'}
                {queueData.status === 'sending' && 'Отправка'}
                {queueData.status === 'paused' && 'Пауза'}
                {queueData.status === 'completed' && 'Завершено'}
                {queueData.status === 'cancelled' && 'Отменено'}
              </span>
            </div>
          </div>

          {/* Фильтры */}
          <div className="queue-calculations-filters">
            <div className="filter-group">
              <label className="filter-label">Фильтр по продуктам:</label>
              <select 
                className="filter-select"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                disabled={productsLoading}
              >
                <option value="">Все продукты</option>
                {productsLoading ? (
                  <option disabled>Загрузка...</option>
                ) : (
                  availableProducts.map(product => (
                    <option key={product} value={product}>{product}</option>
                  ))
                )}
              </select>
            </div>
            
            <div className="filter-group">
              <label className="filter-label">Поиск по ФИО/Email:</label>
              <input
                type="text"
                className="filter-input"
                placeholder="Введите ФИО или Email..."
                value={nameEmailFilter}
                onChange={(e) => setNameEmailFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="queue-calculations-table-container">
            <div className="table-scroll-wrapper">
              <table className="queue-calculations-table">
                <thead>
                  <tr>
                    <th className="sticky-column">Клиент</th>
                    <th>Email</th>
                    <th>Продукт</th>
                    <th>Счет</th>
                    <th>Начальный капитал</th>
                    <th>Доп. депозит</th>
                    <th>Вывод средств</th>
                    <th>Доходность %</th>
                    <th>Сумма дохода</th>
                    <th>Итоговый капитал</th>
                    <th>Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account, index) => {
                    const profitability = account.Profitability || {};
                    return (
                      <tr key={account.id}>
                        <td className="sticky-column client-name">{account.clientName}</td>
                        <td className="email">{account.email}</td>
                        <td>{account.product}</td>
                        <td>{account.accountId}</td>
                        <td className="amount">{formatCurrency(profitability.start_capital)}</td>
                        <td className="deposit">{formatCurrency(profitability.adding_deposit)}</td>
                        <td className="withdrawal">{formatCurrency(profitability.widthdrawling_deposit)}</td>
                        <td className="profitability">{formatPercent(profitability.percent_profitability)}</td>
                        <td className="profitability">{formatCurrency(profitability.profitability_value)}</td>
                        <td className="balance">{formatCurrency(profitability.end_capital)}</td>
                        <td>
                          <span className={`account-status ${account.status}`}>
                            {account.status === 'pending' && 'Ожидает'}
                            {account.status === 'sending' && 'Отправка'}
                            {account.status === 'sent' && 'Отправлено'}
                            {account.status === 'delivered' && 'Доставлено'}
                            {account.status === 'failed' && 'Ошибка'}
                            {account.status === 'cancelled' && 'Отменено'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="queue-calculations-summary">
            <h3>Сводка по очереди</h3>
            <div className="summary-grid">
              <div className="summary-card">
                <div className="card-title">Общий начальный капитал</div>
                <div className="card-value">
                  {formatCurrency(
                    filteredAccounts.reduce((sum, account) => {
                      const profitability = account.Profitability || {};
                      return sum + (Number(profitability.start_capital) || 0);
                    }, 0)
                  )}
                </div>
              </div>
              <div className="summary-card">
                <div className="card-title">Общие доп. депозиты</div>
                <div className="card-value">
                  {formatCurrency(
                    filteredAccounts.reduce((sum, account) => {
                      const profitability = account.Profitability || {};
                      return sum + (Number(profitability.adding_deposit) || 0);
                    }, 0)
                  )}
                </div>
              </div>
              <div className="summary-card">
                <div className="card-title">Общие выводы средств</div>
                <div className="card-value">
                  {formatCurrency(
                    filteredAccounts.reduce((sum, account) => {
                      const profitability = account.Profitability || {};
                      return sum + (Number(profitability.widthdrawling_deposit) || 0);
                    }, 0)
                  )}
                </div>
              </div>
              <div className="summary-card">
                <div className="card-title">Общая сумма дохода</div>
                <div className="card-value">
                  {formatCurrency(
                    filteredAccounts.reduce((sum, account) => {
                      const profitability = account.Profitability || {};
                      return sum + (Number(profitability.profitability_value) || 0);
                    }, 0)
                  )}
                </div>
              </div>
              <div className="summary-card">
                <div className="card-title">Общий итоговый капитал</div>
                <div className="card-value">
                  {formatCurrency(
                    filteredAccounts.reduce((sum, account) => {
                      const profitability = account.Profitability || {};
                      return sum + (Number(profitability.end_capital) || 0);
                    }, 0)
                  )}
                </div>
              </div>
              <div className="summary-card">
                <div className="card-title">Средняя доходность</div>
                <div className="card-value">
                  {formatPercent(
                    filteredAccounts.length > 0 ? 
                      filteredAccounts.reduce((sum, account) => {
                        const profitability = account.Profitability || {};
                        return sum + (Number(profitability.percent_profitability) || 0);
                      }, 0) / filteredAccounts.length : 0
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueueCalculationsModal;
