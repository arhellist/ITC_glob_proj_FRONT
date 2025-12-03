import React, { useState, useEffect } from 'react';
import './CalculationModal.css';
import monitoringService from '../../../JS/services/monitoring-service';
import ConfirmModal from '../../common/ConfirmModal';
import AlertModal from '../../common/AlertModal';

const MONTHS = [
  { value: 1, label: 'Январь' },
  { value: 2, label: 'Февраль' },
  { value: 3, label: 'Март' },
  { value: 4, label: 'Апрель' },
  { value: 5, label: 'Май' },
  { value: 6, label: 'Июнь' },
  { value: 7, label: 'Июль' },
  { value: 8, label: 'Август' },
  { value: 9, label: 'Сентябрь' },
  { value: 10, label: 'Октябрь' },
  { value: 11, label: 'Ноябрь' },
  { value: 12, label: 'Декабрь' }
];

const CalculationModal = ({ onClose, onCalculationComplete }) => {
  const [products, setProducts] = useState([]);
  const [profitabilityValues, setProfitabilityValues] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  
  // Модальные окна
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalData, setAlertModalData] = useState(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const productsList = await monitoringService.getProductsList();
      const normalized = Array.isArray(productsList) ? productsList : [];

      setProducts(normalized);

      if (normalized.length > 0) {
        setProfitabilityValues((prev) => {
          const next = { ...prev };
          normalized.forEach((product) => {
            if (typeof next[product.id] !== 'number') {
              next[product.id] = 0;
            }
          });
          return next;
        });
      }
    } catch (error) {
      console.error('CalculationModal: Ошибка загрузки продуктов:', error);
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка загрузки продуктов: ' + error.message
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  // Загружаем список продуктов при монтировании
  useEffect(() => {
    loadProducts();
  }, []);

  // Обработчик изменения доходности для продукта
  const handleProfitabilityChange = (productId, value) => {
    setProfitabilityValues(prev => ({
      ...prev,
      [productId]: parseFloat(value) || 0
    }));
  };

  // Обработчик изменения месяца
  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setMonthDropdownOpen(false);
  };

  // Обработчик изменения года
  const handleYearChange = (e) => {
    setSelectedYear(parseInt(e.target.value) || new Date().getFullYear());
  };

  // Обработчик расчета
  const handleCalculate = async () => {
    const executeCalculation = async () => {
      try {
        setCalculating(true);
        console.log('CalculationModal: Расчет доходности:', {
          month: selectedMonth,
          year: selectedYear,
          profitability: profitabilityValues
        });
        
        const result = await monitoringService.calculateProfitabilityPreview(
          selectedMonth,
          selectedYear,
          profitabilityValues
        );
        
        console.log('CalculationModal: Результат расчета:', result);
        
        // Передаем результаты в родительский компонент
        onCalculationComplete(result);
      } catch (error) {
        console.error('CalculationModal: Ошибка расчета:', error);
        setAlertModalData({
          title: 'Ошибка',
          message: 'Ошибка расчета доходности: ' + (error.message || 'Неизвестная ошибка')
        });
        setShowAlertModal(true);
      } finally {
        setCalculating(false);
      }
    };

    try {
      // Проверяем существование расчетов в ProfitabilityModel
      const existingCheck = await monitoringService.checkExistingProfitability(
        selectedMonth,
        selectedYear
      );
      
      if (existingCheck.data.exists) {
        // Показываем confirm модалку
        setConfirmModalData({
          title: '⚠️ ВНИМАНИЕ!',
          message:
            `Для периода ${selectedMonth}/${selectedYear} уже существуют расчеты в базе данных.\n\n` +
            `При продолжении будет выполнен ПЕРЕРАСЧЕТ всех начислений доходности за этот период.\n\n` +
            `Вы уверены что хотите продолжить?`,
          onConfirm: () => {
            setShowConfirmModal(false);
            setConfirmModalData(null);
            executeCalculation();
          }
        });
        setShowConfirmModal(true);
      } else {
        await executeCalculation();
      }
    } catch (error) {
      console.error('CalculationModal: Ошибка проверки существующих расчетов:', error);
      await executeCalculation();
    }
  };

  return (
    <div className="calculation-modal-overlay" onClick={onClose}>
      <div className="calculation-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="calculation-modal-header">
          <h3 className="calculation-modal-title">Расчет доходности</h3>
          <button className="calculation-modal-close-btn" onClick={onClose}>×</button>
        </div>

        <div className="calculation-modal-body">
          {loading ? (
            <div className="calculation-modal-loading">Загрузка продуктов...</div>
          ) : (
            <>
              {/* Таблица с продуктами и доходностью */}
              <div className="calculation-products-table-wrapper">
                <table className="calculation-products-table">
                  <thead>
                    <tr>
                      <th>Продукт</th>
                      <th>Валюта</th>
                      <th>Доходность (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product.id}>
                        <td>{product.type}</td>
                        <td>{product.currency}</td>
                        <td>
                          <input
                            type="number"
                            step="0.1"
                            value={profitabilityValues[product.id] || 0}
                            onChange={(e) => handleProfitabilityChange(product.id, e.target.value)}
                            className="profitability-input"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Фильтры: месяц и год */}
              <div className="calculation-filters">
                {/* Выбор месяца */}
                <div className="calculation-filter-month">
                  <label>Месяц:</label>
                  <div className="custom-dropdown">
                    <button 
                      className="custom-dropdown-toggle"
                      onClick={() => setMonthDropdownOpen(!monthDropdownOpen)}
                    >
                      {MONTHS.find(m => m.value === selectedMonth)?.label || 'Выберите месяц'}
                      <span className="dropdown-arrow">{monthDropdownOpen ? '▲' : '▼'}</span>
                    </button>
                    {monthDropdownOpen && (
                      <div className="custom-dropdown-menu">
                        {MONTHS.map(month => (
                          <button
                            key={month.value}
                            className={`custom-dropdown-item ${selectedMonth === month.value ? 'active' : ''}`}
                            onClick={() => handleMonthSelect(month.value)}
                          >
                            {month.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ввод года */}
                <div className="calculation-filter-year">
                  <label htmlFor="calc-year">Год:</label>
                  <input
                    id="calc-year"
                    type="number"
                    min="2020"
                    max="2099"
                    value={selectedYear}
                    onChange={handleYearChange}
                    className="year-input"
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Кнопка расчета */}
        <div className="calculation-modal-footer">
          <button 
            className="calculation-calculate-btn"
            onClick={handleCalculate}
            disabled={loading || calculating || products.length === 0}
          >
            {calculating ? 'Рассчитывается...' : 'Рассчитать'}
          </button>
        </div>
      </div>

      {/* Модальное окно подтверждения */}
      {showConfirmModal && confirmModalData && (
        <ConfirmModal
          title={confirmModalData.title}
          message={confirmModalData.message}
          onConfirm={confirmModalData.onConfirm}
          onCancel={() => {
            setShowConfirmModal(false);
            setConfirmModalData(null);
            setCalculating(false);
          }}
        />
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
    </div>
  );
};

export default CalculationModal;

