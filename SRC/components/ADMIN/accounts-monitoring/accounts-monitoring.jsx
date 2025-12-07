import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ExcelJS from 'exceljs';
import './accounts-monitoring.css';
import monitoringService from '../../../JS/services/monitoring-service';
import TransactionListModal from './TransactionListModal';
import TransactionFormModal from './TransactionFormModal';
import ProfitabilityEditModal from './ProfitabilityEditModal';
import LockupPackagesModal from './LockupPackagesModal';
import CurrencyRatesModal from './CurrencyRatesModal';
import { getSocket } from '../../../JS/websocket/websocket-service';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

const AccountsMonitoring = () => {
  const [data, setData] = useState([]); // Данные для таблицы
  const [loading, setLoading] = useState(false); // Состояние загрузки
  const [error, setError] = useState(null); // Ошибка
  const [year, setYear] = useState(null); // Год выбирается пользователем
  const [product, setProduct] = useState('Classic'); // Продукт
const [products, setProducts] = useState([
    { value: 'Classic', label: 'Classic' },
    { value: 'all', label: 'ВСЕ ПРОДУКТЫ' }
  ]); // Список продуктов из БД
  const [productDropdownOpen, setProductDropdownOpen] = useState(false); // Состояние выпадающего списка продуктов
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' }); // Конфигурация сортировки
  const [filterText, setFilterText] = useState(''); // Текст фильтра
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: null }); // Всплывающая подсказка
  const tableScrollRef = useRef(null);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);

  const formatProductOptions = useCallback((rawProducts = []) => {
    const uniqueMap = new Map();

    rawProducts.forEach((prod) => {
      const type = prod?.type;
      if (!type) return;
      const currency = prod?.currency ? ` (${prod.currency})` : '';
      const label = `${type}${currency}`;
      if (!uniqueMap.has(type)) {
        uniqueMap.set(type, { value: type, label });
      }
    });

    const classicOption = uniqueMap.get('Classic') || { value: 'Classic', label: 'Classic' };
    uniqueMap.delete('Classic');

    const otherOptions = Array.from(uniqueMap.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'ru', { sensitivity: 'base' })
    );

    const allOption = { value: 'all', label: 'ВСЕ ПРОДУКТЫ' };

    const ordered = [classicOption, ...otherOptions];

    if (!ordered.some(opt => opt.value === allOption.value)) {
      ordered.push(allOption);
    }

    return ordered;
  }, []);

  // Предзагрузка списка продуктов (независимо от выбранного года)
  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      try {
        const rawProducts = await monitoringService.getProductsList();
        const formatted = formatProductOptions(rawProducts);
        if (!isMounted || formatted.length === 0) {
          return;
        }

        setProducts(formatted);

        if (!formatted.some(opt => opt.value === product)) {
          setProduct(formatted[0]?.value ?? 'all');
        }
      } catch (err) {
        console.error('AccountsMonitoring: не удалось загрузить список продуктов:', err);
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
    };
  }, [formatProductOptions, product]);

  // Загрузка данных (полная загрузка всех данных за год)
  const loadData = useCallback(async () => {
    if (!year) {
      console.log('AccountsMonitoring: год не выбран, пропускаем загрузку данных');
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      setError(null);
      console.log('AccountsMonitoring: Загружаем все данные', {
        year,
        product
      });

      const response = await monitoringService.getAccountsMonitoring({
        year,
        product
      });
      console.log('AccountsMonitoring: Получены все данные:', response);

      const incomingData = Array.isArray(response?.data) ? response.data : [];
      
      // Логируем profitabilityDetails для диагностики
      console.log('📊 AccountsMonitoring: Проверяем profitabilityDetails в полученных данных...');
      let totalProfitabilityDetails = 0;
      incomingData.forEach(item => {
        for (let m = 1; m <= 12; m++) {
          const monthData = item.monthlyData?.[m];
          if (monthData) {
            const hasProfitabilityDetails = monthData.hasOwnProperty('profitabilityDetails');
            const profitabilityDetailsLength = monthData.profitabilityDetails?.length || 0;
            if (profitabilityDetailsLength > 0) {
              totalProfitabilityDetails += profitabilityDetailsLength;
              console.log(`📊 Account ${item.accountId}, Month ${m}: profitabilityDetails count = ${profitabilityDetailsLength}`, monthData.profitabilityDetails);
            } else if (monthData.profitability_value > 0 && !hasProfitabilityDetails) {
              console.warn(`⚠️ Account ${item.accountId}, Month ${m}: profitability_value = ${monthData.profitability_value}, но profitabilityDetails отсутствует!`);
            }
          }
        }
      });
      console.log(`📊 AccountsMonitoring: Всего найдено profitabilityDetails: ${totalProfitabilityDetails} в ${incomingData.length} счетах`);

      if (tableScrollRef.current) {
        tableScrollRef.current.scrollTop = 0;
      }

      if (response?.products && response.products.length > 0) {
        const formattedOptions = formatProductOptions(response.products);
        if (formattedOptions.length > 0) {
          setProducts(formattedOptions);
          if (!formattedOptions.some(opt => opt.value === product)) {
            setProduct(formattedOptions[0].value);
          }
        }
      }

      setData(incomingData);
    } catch (err) {
      console.error('AccountsMonitoring: Ошибка загрузки данных:', err);
      setError(err.message || 'Ошибка загрузки данных');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [year, product, formatProductOptions]);

  // Модальные окна для транзакций
  const [showTransactionList, setShowTransactionList] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [selectedTransactionType, setSelectedTransactionType] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  
  // Модальное окно для локап-пакетов
  const [showLockupPackages, setShowLockupPackages] = useState(false);
  const [lockupPackagesData, setLockupPackagesData] = useState(null);
  
  // Уведомление о копировании (храним уникальный ID строки)
  const [copiedEmailRowId, setCopiedEmailRowId] = useState(null);

  // Загружаем данные при изменении фильтров
  useEffect(() => {
    if (!year) {
      setLoading(false);
      setData([]);
      setError(null);
      return;
    }

    setData([]);
    loadData();
  }, [year, product, loadData]);

  // Обработчик изменения года
  const handleYearChange = (e) => {
    const { value } = e.target;

    if (!value) {
      setYear(null);
      return;
    }

    const newYear = parseInt(value, 10);
    setYear(Number.isFinite(newYear) ? newYear : null);
  };

  // Обработчик переключения фильтра продукта
  const handleProductFilter = (selectedProduct) => {
    setProduct(selectedProduct);
    setProductDropdownOpen(false);
  };

  // Сортировка данных
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Показать tooltip
  const showTooltip = (e, content) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return;
    const rect = e.target.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY + 5,
      content: content
    });
  };

  // Скрыть tooltip
  const hideTooltip = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: null });
  };

  // Загрузка локап-пакетов для аккаунта
  const loadLockupPackages = async (accountId, accountInfo, month, initialCapital) => {
    try {
      console.log('📦 Загрузка локап-пакетов для счета:', accountId, 'месяц:', month, 'капитал:', initialCapital);
      
      const response = await monitoringService.getAccountLockupPackages(accountId, year, month);
      console.log('📦 Получены локап-пакеты:', response);
      
      // КРИТИЧНО: Проверяем что приходит с сервера
      if (response.packages && response.packages.length > 0) {
        response.packages.forEach(pkg => {
          console.log(`📦 Пакет ${pkg.packageName}: isClosed=${pkg.isClosed}, remainingBalance=${pkg.remainingBalance}, is_closed=${pkg.is_closed}`);
        });
      }
      
      setLockupPackagesData({
        packages: response.packages || [],
        totalBalance: initialCapital || 0, // Используем капитал из таблицы мониторинга
        accountInfo: accountInfo,
        month: month,
        year: year
      });
      setShowLockupPackages(true);
    } catch (error) {
      console.error('📦 Ошибка загрузки локап-пакетов:', error);
      alert('Ошибка загрузки локап-пакетов: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  // Обработчик клика на ячейку транзакции
  const handleCellClick = (accountData, transactionType, month, hasTransactions, initialCapital) => {
    console.log('📥 handleCellClick вызван:', { accountData, transactionType, month, hasTransactions, initialCapital });
    
    const selectedAccountData = {
      accountId: accountData.accountId,
      userId: accountData.userId,
      userFullName: accountData.userFullName,
      userEmail: accountData.userEmail,
      product: accountData.product,
      currency: accountData.currency || 'USD' // Используем реальную валюту из данных
    };
    
    console.log('📥 selectedAccountData:', selectedAccountData);
    
    setSelectedAccount(selectedAccountData);
    setSelectedTransactionType(transactionType);
    setSelectedMonth(month);
    
    // Для локап-пакетов (капитал)
    if (transactionType === 'capital') {
      loadLockupPackages(accountData.accountId, selectedAccountData, month, initialCapital);
      return;
    }
    
    // Для редактирования процента доходности
    if (transactionType === 'profitability') {
      setShowTransactionForm(true);
    } else if (transactionType === 'profitability-value' && hasTransactions) {
      // Для списка транзакций доходности
      setShowTransactionList(true);
    } else if (hasTransactions) {
      // Если есть транзакции - показываем список
      setShowTransactionList(true);
    } else {
      // Если нет транзакций - сразу форму добавления
      setShowTransactionForm(true);
    }
  };

  // Закрыть модальные окна
  const handleCloseModals = () => {
    setShowTransactionList(false);
    setShowTransactionForm(false);
    setShowLockupPackages(false);
    setSelectedAccount(null);
    setSelectedTransactionType(null);
    setSelectedMonth(null);
    setLockupPackagesData(null);
  };

  // Открыть форму добавления из списка
  const handleAddNewFromList = () => {
    setShowTransactionList(false);
    setShowTransactionForm(true);
  };

  // Обновить данные после операции с транзакцией
  // Обновление данных для конкретного счета (оптимизировано)
  const handleRefreshData = useCallback(async (rawAccountId = null) => {
    if (!year) {
      console.log('AccountsMonitoring: год не выбран, пропускаем точечное обновление данных');
      return;
    }

    const hasAccountId = rawAccountId !== null && rawAccountId !== undefined;
    const numericAccountId = hasAccountId ? Number(rawAccountId) : null;
    const accountId = hasAccountId && Number.isFinite(numericAccountId)
      ? numericAccountId
      : rawAccountId;

    if (hasAccountId) {
      // Обновляем только один счет
      try {
        console.log(`AccountsMonitoring: Обновляем данные для счета ${accountId}`);
        const updatedAccountData = await monitoringService.getSingleAccountMonitoring(accountId, year);
        
        // Валидация данных перед обновлением
        if (!updatedAccountData || !updatedAccountData.monthlyData) {
          console.error(`AccountsMonitoring: Получены некорректные данные для счета ${accountId}`, updatedAccountData);
          throw new Error('Invalid data received from server');
        }
        
        // Нормализуем числовые значения - заменяем NaN на 0
        for (let m = 1; m <= 12; m++) {
          const monthData = updatedAccountData.monthlyData[m];
          if (monthData) {
            monthData.profitability_value = Number.isFinite(monthData.profitability_value) ? monthData.profitability_value : 0;
            monthData.profitability_percent = Number.isFinite(monthData.profitability_percent) ? monthData.profitability_percent : 0;
            monthData.balance = Number.isFinite(monthData.balance) ? monthData.balance : 0;
            monthData.deposits = Number.isFinite(monthData.deposits) ? monthData.deposits : 0;
            monthData.withdrawals = Number.isFinite(monthData.withdrawals) ? monthData.withdrawals : 0;
            monthData.debitings = Number.isFinite(monthData.debitings) ? monthData.debitings : 0;
            monthData.initialCapital = Number.isFinite(monthData.initialCapital) ? monthData.initialCapital : 0;
          }
        }
        
        setData(prevData => {
          const targetId = Number.isFinite(Number(accountId)) ? Number(accountId) : accountId;

          const updatedData = prevData.map(item => {
            const itemId = Number.isFinite(Number(item.accountId)) ? Number(item.accountId) : item.accountId;
            return itemId === targetId ? updatedAccountData : item;
          });

          const hasItem = updatedData.some(item => {
            const itemId = Number.isFinite(Number(item.accountId)) ? Number(item.accountId) : item.accountId;
            return itemId === targetId;
          });

          if (!hasItem) {
            updatedData.push(updatedAccountData);
          }

          return updatedData;
        });
        
        console.log(`AccountsMonitoring: Данные для счета ${accountId} обновлены`, updatedAccountData);
      } catch (err) {
        console.error(`AccountsMonitoring: Ошибка обновления данных для счета ${accountId}:`, err);
        // При ошибке загружаем все данные
        loadData();
      }
    } else {
      // Если accountId не указан, загружаем все данные (fallback)
      loadData();
    }
  }, [year, loadData]);

  const handleTransactionRefresh = useCallback(async (defaultAccountId, payload = {}) => {
    await handleRefreshData(defaultAccountId);

    const transactionType = payload.deleteType || payload.type;
    if (transactionType !== 'transfer') {
      return;
    }

    const normalizeId = (value) => {
      if (value === null || value === undefined) return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : value;
    };

    const defaultId = normalizeId(defaultAccountId);
    const relatedIds = new Set();

    if (payload.deletedTransaction) {
      const { account_id_original, account_id_transfer } = payload.deletedTransaction;
      [account_id_original, account_id_transfer].forEach((id) => {
        const normalized = normalizeId(id);
        if (normalized !== null && normalized !== undefined) {
          relatedIds.add(normalized);
        }
      });
    }

    if (payload.result) {
      const { account_id_original, account_id_transfer } = payload.result;
      [account_id_original, account_id_transfer].forEach((id) => {
        const normalized = normalizeId(id);
        if (normalized !== null && normalized !== undefined) {
          relatedIds.add(normalized);
        }
      });
    }

    for (const id of relatedIds) {
      if (id === defaultId) {
        continue;
      }

      await handleRefreshData(id);
    }
  }, [handleRefreshData]);

  // Подписка на WebSocket для точечного обновления счета после пересчёта на бэке
  useEffect(() => {
    const socket = getSocket && getSocket();
    if (socket && socket.on) {
      const handler = (payload) => {
        try {
          const rawId = payload?.accountId;
          if (rawId !== null && rawId !== undefined) {
            const numericId = Number(rawId);
            const accId = Number.isFinite(numericId) ? numericId : rawId;
            console.log('📡 WS monitoring:account_updated → refresh account', accId);
            handleRefreshData(accId);
          }
        } catch (e) {
          console.warn('WS monitoring:account_updated handler error:', e?.message);
        }
      };
      socket.on('monitoring:account_updated', handler);
      return () => {
        try {
          socket.off && socket.off('monitoring:account_updated', handler);
        } catch (unsubscribeError) {
          console.warn('WS monitoring:account_updated off error:', unsubscribeError?.message || unsubscribeError);
        }
      };
    }
  }, [year, handleRefreshData]);

  // Копирование email в буфер обмена
  const handleCopyEmail = async (email, rowId) => {
    try {
      await navigator.clipboard.writeText(email);
      // Показываем уведомление для конкретной строки
      setCopiedEmailRowId(rowId);
      // Автоматически скрываем через 2 секунды
      setTimeout(() => {
        setCopiedEmailRowId(null);
      }, 2000);
    } catch (error) {
      console.error('Ошибка копирования в буфер обмена:', error);
    }
  };

  // Форматирование даты
  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Экспорт в Excel
  const handleExportToExcel = async () => {
    try {
      // Создаем новую книгу
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`Мониторинг ${year}`);
      
      // Функция для получения буквы колонки Excel (A, B, ..., Z, AA, AB, ...)
      const getColumnLetter = (colNum) => {
        let letter = '';
        while (colNum > 0) {
          const mod = (colNum - 1) % 26;
          letter = String.fromCharCode(65 + mod) + letter;
          colNum = Math.floor((colNum - 1) / 26);
        }
        return letter;
      };
      
      // Добавляем первую строку - заголовки месяцев и базовые колонки
      const headerRow1 = worksheet.getRow(1);
      headerRow1.values = ['ФИО', 'Email', 'Счет', 'Продукт'];
      
      // Объединяем ячейки для базовых заголовков (вертикально на 2 строки)
      worksheet.mergeCells('A1:A2'); // ФИО
      worksheet.mergeCells('B1:B2'); // Email
      worksheet.mergeCells('C1:C2'); // Счет
      worksheet.mergeCells('D1:D2'); // Продукт
      
      // Объединяем ячейки для месяцев (горизонтально) и устанавливаем названия
      let currentCol = 5; // Начинаем с E (после A,B,C,D)
      MONTHS.forEach((monthName) => {
        const colsCount = 8; // Все месяцы имеют 8 колонок (Капитал + 7 других)
        const startCol = currentCol;
        const endCol = currentCol + colsCount - 1;
        
        // Получаем буквы колонок
        const startLetter = getColumnLetter(startCol);
        const endLetter = getColumnLetter(endCol);
        
        // Объединяем ячейки для месяца
        worksheet.mergeCells(`${startLetter}1:${endLetter}1`);
        
        // Устанавливаем название месяца в первую ячейку объединенного блока
        const monthCell = worksheet.getCell(`${startLetter}1`);
        monthCell.value = monthName;
        
        currentCol = endCol + 1;
      });
      
      // Вторая строка - подзаголовки
      const headerRow2Values = ['', '', '', ''];
      MONTHS.forEach(() => {
        headerRow2Values.push('Капитал', 'Депозиты', 'Выводы', 'Списания', 'Переводы', 'Доход %', 'Доход $', 'Баланс');
      });
      const headerRow2 = worksheet.getRow(2);
      headerRow2.values = headerRow2Values;
      
      // Стили для первой строки (месяцы)
      headerRow1.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF457B9D' }
        };
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
          size: 12
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Стили для второй строки (подзаголовки)
      headerRow2.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const value = cell.value;
        
        if (value === 'Капитал') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2196F3' } };
        } else if (value === 'Доход %' || value === 'Доход $') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFF9800' } };
        } else if (value === 'Баланс') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
        } else if (colNumber <= 4) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2C3E50' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF5A9BC5' } };
        }
        
        cell.font = {
          bold: true,
          color: { argb: 'FFFFFFFF' },
          size: 10
        };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      
      // Добавляем данные
      filteredAndSortedData.forEach((item, idx) => {
        const rowData = [
          item.userFullName,
          item.userEmail,
          item.accountId,
          item.product
        ];
        
        // Добавляем данные по месяцам
        MONTHS.forEach((monthName, mIdx) => {
          const m = mIdx + 1;
          const monthData = item.monthlyData[m];
          
          rowData.push(
            monthData.initialCapital !== undefined && monthData.initialCapital !== 0 ? monthData.initialCapital : '—',
            monthData.deposits !== 0 ? monthData.deposits : '—',
            monthData.withdrawals !== 0 ? monthData.withdrawals : '—',
            monthData.debitings !== 0 ? monthData.debitings : '—',
            monthData.transfers?.length > 0 ? monthData.transfers.length : '—',
            monthData.profitability_percent !== 0 ? monthData.profitability_percent : '—',
            monthData.profitability_value !== 0 ? monthData.profitability_value : '—',
            monthData.balance !== 0 ? monthData.balance : '—'
          );
        });
        
        const row = worksheet.addRow(rowData);
        
        // Стили для строки данных
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          // Чередующиеся цвета строк
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8F9FA' }
          };
          
          cell.font = { size: 10 };
          cell.border = {
            top: { style: 'thin' },
            bottom: { style: 'thin' },
            left: { style: 'thin' },
            right: { style: 'thin' }
          };
          
          // Выравнивание
          if (colNumber < 5) {
            cell.alignment = { horizontal: 'left', vertical: 'middle' };
          } else {
            cell.alignment = { horizontal: 'right', vertical: 'middle' };
            
            // Определяем тип колонки для цвета
            // Теперь все месяцы имеют 8 колонок: 0=Капитал, 1=Депозиты, 2=Выводы, 3=Списания, 4=Переводы, 5=Доход%, 6=Доход$, 7=Баланс
            const colOffset = colNumber - 5; // Offset после базовых колонок
            const colType = colOffset % 8; // Тип колонки в рамках месяца
            
            // Цвета для доходности (индексы 5 и 6)
            if (colType === 5 || colType === 6) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3E0' } };
              cell.font = { color: { argb: 'FFE65100' }, size: 10 };
            }
            
            // Цвет для баланса (индекс 7)
            if (colType === 7) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };
              cell.font = { color: { argb: 'FF2E7D32' }, bold: true, size: 10 };
            }
            
            // Цвет для капитала (индекс 0)
            if (colType === 0) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE3F2FD' } };
              cell.font = { color: { argb: 'FF1565C0' }, bold: true, size: 10 };
            }
            
            // Форматирование чисел (не форматируем прочерки)
            if (typeof cell.value === 'number') {
              cell.numFmt = '#,##0.00';
            } else if (cell.value === '—') {
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            }
          }
        });
      });
      
      // Устанавливаем ширину колонок
      worksheet.getColumn(1).width = 30; // ФИО
      worksheet.getColumn(2).width = 25; // Email
      worksheet.getColumn(3).width = 10; // Счет
      worksheet.getColumn(4).width = 15; // Продукт
      
      // Ширина для колонок месяцев
      let col = 5;
      MONTHS.forEach(() => {
        worksheet.getColumn(col++).width = 12; // Капитал
        worksheet.getColumn(col++).width = 12; // Депозиты
        worksheet.getColumn(col++).width = 12; // Выводы
        worksheet.getColumn(col++).width = 12; // Списания
        worksheet.getColumn(col++).width = 10; // Переводы
        worksheet.getColumn(col++).width = 10; // Доход %
        worksheet.getColumn(col++).width = 12; // Доход $
        worksheet.getColumn(col++).width = 12; // Баланс
      });
      
      // Высота строк
      headerRow1.height = 25;
      headerRow2.height = 20;

      // Создаем и скачиваем файл
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Мониторинг_счетов_${year}_${product}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      console.log('AccountsMonitoring: Экспорт в Excel завершен');
    } catch (error) {
      console.error('AccountsMonitoring: Ошибка экспорта в Excel:', error);
    }
  };

  // Фильтрация и сортировка данных
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Фильтрация по тексту
    if (filterText) {
      const lowerFilter = filterText.toLowerCase();
      result = result.filter(item => 
        item.userFullName.toLowerCase().includes(lowerFilter) ||
        item.userEmail.toLowerCase().includes(lowerFilter) ||
        String(item.accountId).includes(filterText)
      );
    }

    // Сортировка
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filterText, sortConfig]);

  // Генерация списка годов (от 2020 до текущего года + 1)
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = 2020; y <= currentYear + 1; y++) {
      years.push(y);
    }
    return years;
  };


  return (
    <div className="accounts-monitoring-container">
      <div className="accounts-monitoring-header">
        <h2 className="accounts-monitoring-title">Мониторинг счетов</h2>
        
        <div className="accounts-monitoring-filters">
          {/* Фильтр по году */}
          <div className="accounts-monitoring-filter-year">
            <label htmlFor="year-select">Год:</label>
            <select 
              id="year-select" 
              value={year ?? ''} 
              onChange={handleYearChange}
              className="accounts-monitoring-year-select"
            >
              <option value="" disabled>—</option>
              {getYearOptions().map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Фильтр по продукту */}
          <div className="accounts-monitoring-filter-product">
            <label>Продукт:</label>
            <div className="custom-dropdown">
              <button 
                className="custom-dropdown-toggle"
                onClick={() => setProductDropdownOpen(!productDropdownOpen)}
              >
                {products.find(opt => opt.value === product)?.label || 'Выберите продукт'}
                <span className="dropdown-arrow">{productDropdownOpen ? '▲' : '▼'}</span>
              </button>
              {productDropdownOpen && (
                <div className="custom-dropdown-menu">
                  {products.map(option => (
                    <button
                      key={option.value}
                      className={`custom-dropdown-item ${product === option.value ? 'active' : ''}`}
                      onClick={() => handleProductFilter(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Поиск по ФИО/Email/Счету */}
          <div className="accounts-monitoring-filter-search">
            <label htmlFor="filter-search">Поиск:</label>
            <input
              id="filter-search"
              type="text"
              placeholder="ФИО, Email, Счет..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="accounts-monitoring-search-input"
            />
          </div>

          {/* Кнопка экспорта в Excel */}
          <button 
            className="accounts-monitoring-export-btn"
            onClick={handleExportToExcel}
            disabled={loading || filteredAndSortedData.length === 0}
          >
            Экспорт в Excel
          </button>

          <button
            type="button"
            className="accounts-monitoring-currency-btn"
            onClick={() => setShowCurrencyModal(true)}
          >
            Курсы валют
          </button>
        </div>
      </div>

      {/* Контейнер для таблицы */}
      <div className="accounts-monitoring-table-wrapper">
        {!year && (
          <div className="accounts-monitoring-placeholder">
            <p>Выберите год, чтобы загрузить данные мониторинга</p>
          </div>
        )}

        {year && loading && (
          <div className="accounts-monitoring-loading">
            <p>Загрузка данных...</p>
          </div>
        )}

        {year && error && (
          <div className="accounts-monitoring-error">
            <p>Ошибка: {error}</p>
            <button onClick={() => loadData()}>Повторить</button>
          </div>
        )}

        {year && !loading && !error && filteredAndSortedData.length === 0 && (
          <div className="accounts-monitoring-empty">
            <p>Нет данных для отображения</p>
          </div>
        )}

        {year && !loading && !error && filteredAndSortedData.length > 0 && (
          <div className="accounts-monitoring-table-scroll" ref={tableScrollRef}>
            <table className="accounts-monitoring-table">
              <thead>
                <tr>
                  {/* Базовые заголовки */}
                  <th rowSpan="2" onClick={() => handleSort('userFullName')} className="sortable sticky-col-1">
                    ФИО {sortConfig.key === 'userFullName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th rowSpan="2" onClick={() => handleSort('userEmail')} className="sortable">
                    Email {sortConfig.key === 'userEmail' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th rowSpan="2" onClick={() => handleSort('accountId')} className="sortable">
                    Счет {sortConfig.key === 'accountId' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th rowSpan="2" onClick={() => handleSort('product')} className="sortable">
                    Продукт {sortConfig.key === 'product' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  
                  {/* Заголовки месяцев */}
                  {MONTHS.map((month, idx) => (
                    <th key={idx} colSpan={8} className="month-header">
                      {month}
                    </th>
                  ))}
                </tr>
                <tr>
                  {/* Подзаголовки для каждого месяца */}
                  {MONTHS.map((month, idx) => (
                    <React.Fragment key={idx}>
                      <th className="sub-header">Капитал</th>
                      <th className="sub-header">Депозиты</th>
                      <th className="sub-header">Выводы</th>
                      <th className="sub-header">Списания</th>
                      <th className="sub-header">Переводы</th>
                      <th className="sub-header profitability-header">Доход %</th>
                      <th className="sub-header profitability-header">Доход $</th>
                      <th className="sub-header balance-header">Баланс</th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedData.map((item, rowIdx) => (
                  <tr key={`${item.userId}-${item.accountId}`} className={rowIdx % 2 === 0 ? 'even-row' : 'odd-row'}>
                    {/* Базовые колонки */}
                    <td className="sticky-col-1">{item.userFullName}</td>
                    <td 
                      onClick={() => handleCopyEmail(item.userEmail, `${item.userId}-${item.accountId}`)}
                      style={{ cursor: 'pointer', position: 'relative' }}
                      title="Нажмите чтобы скопировать email"
                    >
                      {item.userEmail}
                      {copiedEmailRowId === `${item.userId}-${item.accountId}` && (
                        <span style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          background: '#4caf50',
                          color: 'white',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          whiteSpace: 'nowrap',
                          zIndex: 1000,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                        }}>
                          СКОПИРОВАНО
                        </span>
                      )}
                    </td>
                    <td>{item.accountId}</td>
                    <td>{item.product}</td>
                    
                    {/* Данные по месяцам */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
                      const monthData = item.monthlyData[m];
                      return (
                        <React.Fragment key={m}>
                          {/* Капитал на начало месяца */}
                          <td 
                            className="numeric-cell clickable-cell"
                            onClick={() => monthData.initialCapital !== undefined && monthData.initialCapital !== 0 && handleCellClick(item, 'capital', m, true, monthData.initialCapital)}
                          >
                            {monthData.initialCapital !== undefined && monthData.initialCapital !== 0 
                              ? monthData.initialCapital.toFixed(2) 
                              : '—'}
                          </td>
                          
                          {/* Депозиты */}
                          <td 
                            className="numeric-cell clickable-cell"
                            onMouseEnter={(e) => monthData.depositsDetails?.length > 0 && showTooltip(e, monthData.depositsDetails)}
                            onMouseLeave={hideTooltip}
                            onClick={() => handleCellClick(item, 'deposit', m, monthData.depositsDetails?.length > 0)}
                          >
                            {monthData.deposits !== 0 ? monthData.deposits.toFixed(2) : '—'}
                          </td>
                          
                          {/* Выводы */}
                          <td 
                            className="numeric-cell clickable-cell"
                            onMouseEnter={(e) => monthData.withdrawalsDetails?.length > 0 && showTooltip(e, monthData.withdrawalsDetails)}
                            onMouseLeave={hideTooltip}
                            onClick={() => handleCellClick(item, 'withdrawal', m, monthData.withdrawalsDetails?.length > 0)}
                          >
                            {monthData.withdrawals !== 0 ? monthData.withdrawals.toFixed(2) : '—'}
                          </td>
                          
                          {/* Списания */}
                          <td 
                            className="numeric-cell clickable-cell"
                            onMouseEnter={(e) => monthData.debitingsDetails?.length > 0 && showTooltip(e, monthData.debitingsDetails)}
                            onMouseLeave={hideTooltip}
                            onClick={() => handleCellClick(item, 'debiting', m, monthData.debitingsDetails?.length > 0)}
                          >
                            {monthData.debitings !== 0 ? monthData.debitings.toFixed(2) : '—'}
                          </td>
                          
                          {/* Переводы */}
                          <td 
                            className="numeric-cell clickable-cell"
                            onMouseEnter={(e) => monthData.transfers?.length > 0 && showTooltip(e, monthData.transfers)}
                            onMouseLeave={hideTooltip}
                            onClick={() => handleCellClick(item, 'transfer', m, monthData.transfers?.length > 0)}
                          >
                            {monthData.transfers?.length > 0 
                              ? monthData.transfers.reduce((sum, t) => {
                                  // Для отправителя показываем только исходящие переводы (отрицательные)
                                  // Для получателя показываем только входящие переводы (положительные)
                                  if (t.type === 'out') {
                                    return sum - (t.amount || 0); // Исходящие - отрицательные
                                  } else if (t.type === 'in') {
                                    return sum + (t.amount || 0); // Входящие - положительные
                                  }
                                  return sum;
                                }, 0).toFixed(2)
                              : '—'}
                          </td>
                          
                          {/* Доход % */}
                          <td 
                            className="numeric-cell profitability-cell clickable-cell"
                            onClick={() => handleCellClick(item, 'profitability', m, monthData.profitability_percent !== 0)}
                          >
                            {monthData.profitability_percent !== 0 ? monthData.profitability_percent.toFixed(2) + '%' : '—'}
                          </td>
                          
                          {/* Доход $ */}
                          <td 
                            className="numeric-cell profitability-cell"
                            onMouseEnter={(e) => monthData.profitabilityDetails?.length > 0 && showTooltip(e, monthData.profitabilityDetails)}
                            onMouseLeave={hideTooltip}
                          >
                            {monthData.profitability_value !== 0 ? monthData.profitability_value.toFixed(2) : '—'}
                          </td>
                          
                          {/* Баланс */}
                          <td className="numeric-cell balance-cell">
                            {monthData.balance !== 0 ? monthData.balance.toFixed(2) : '—'}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Всплывающая подсказка */}
        {tooltip.visible && tooltip.content && (
          <div 
            className="monitoring-tooltip"
            style={{
              position: 'fixed',
              left: `${tooltip.x}px`,
              top: `${tooltip.y}px`,
              zIndex: 1000
            }}
          >
            {Array.isArray(tooltip.content) && tooltip.content.length > 0 && (
              <div className="tooltip-content">
                {/* Для депозитов */}
                {tooltip.content[0].amountRub !== undefined && (
                  <div>
                    <strong>Депозиты:</strong>
                    {tooltip.content.map((d, idx) => (
                      <div key={idx} className="tooltip-item">
                        • {formatDate(d.date)}: {d.amount.toFixed(2)} (курс: {d.rate.toFixed(2)}, {d.amountRub.toFixed(2)} ₽)
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Для выводов */}
                {tooltip.content[0].commission !== undefined && (
                  <div>
                    <strong>Выводы:</strong>
                    {tooltip.content.map((w, idx) => (
                      <div key={idx} className="tooltip-item">
                        • {formatDate(w.date)}: {w.amount.toFixed(2)} (комиссия: {w.commission.toFixed(2)})
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Для переводов */}
                {(tooltip.content[0].toAccountId !== undefined || tooltip.content[0].fromAccountId !== undefined) && (
                  <div>
                    <strong>Переводы:</strong>
                    {tooltip.content.map((t, idx) => (
                      <div key={idx} className="tooltip-item">
                        • {formatDate(t.date)}: {t.amount.toFixed(2)} 
                        {t.type === 'out' ? ` → Счет #${t.toAccountId} (${t.toProduct})` : ` ← Счет #${t.fromAccountId} (${t.fromProduct})`}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Для списаний */}
                {tooltip.content[0].description !== undefined && tooltip.content[0].amount !== undefined && tooltip.content[0].type && 
                 tooltip.content[0].toAccountId === undefined && tooltip.content[0].fromAccountId === undefined && (
                  <div>
                    <strong>Списания:</strong>
                    {tooltip.content.map((d, idx) => {
                      let typeLabel = 'Списание';
                      if (d.type === 'fine' || d.type === 'fine:aggregated') {
                        typeLabel = 'Штраф';
                      } else if (d.type === 'commission:aggregated') {
                        typeLabel = 'Комиссия';
                      }
                      return (
                        <div key={idx} className="tooltip-item">
                          • {formatDate(d.date)}: {d.amount.toFixed(2)} - {typeLabel}: {d.description}
                          {d.penalty_amount && d.penalty_amount > 0 && (
                            <span className="tooltip-penalty"> (штраф: {d.penalty_amount.toFixed(2)})</span>
                          )}
                        </div>
                      );
                    })}
                    {/* Показываем статистику */}
                    {tooltip.content.length > 1 && (
                      <div className="tooltip-statistics">
                        <hr />
                        <div className="tooltip-stat-row">
                          <span>Списания (обычные):</span>
                          <span>{tooltip.content.filter(d => d.type === 'debiting').reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</span>
                        </div>
                        <div className="tooltip-stat-row">
                          <span>Штрафы:</span>
                          <span>{tooltip.content.filter(d => d.type === 'fine' || d.type === 'fine:aggregated').reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</span>
                        </div>
                        <div className="tooltip-stat-row">
                          <span>Комиссии:</span>
                          <span>{tooltip.content.filter(d => d.type === 'commission:aggregated').reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</span>
                        </div>
                        <div className="tooltip-stat-row">
                          <strong>Всего:</strong>
                          <strong>{tooltip.content.reduce((sum, d) => sum + d.amount, 0).toFixed(2)}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Для доходности */}
                {tooltip.content[0].lockupPackageId !== undefined && (
                  <div>
                    <strong>Начисления доходности:</strong>
                    {tooltip.content.map((p, idx) => (
                      <div key={idx} className="tooltip-item">
                        • {formatDate(p.date)}: {p.amount.toFixed(2)} ({p.percent.toFixed(1)}%) - Пакет P-{p.lockupPackageId}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Модальное окно списка транзакций */}
      {showTransactionList && selectedAccount && (
        <TransactionListModal
          accountData={selectedAccount}
          transactionType={selectedTransactionType}
          year={year}
          month={selectedMonth}
          onClose={handleCloseModals}
          onAddNew={handleAddNewFromList}
          onRefresh={(payload) => handleTransactionRefresh(selectedAccount.accountId, payload)}
        />
      )}

      {/* Модальное окно формы добавления транзакции */}
      {showTransactionForm && selectedAccount && selectedTransactionType !== 'profitability' && (
        <TransactionFormModal
          accountData={selectedAccount}
          transactionType={selectedTransactionType}
          year={year}
          month={selectedMonth}
          onClose={handleCloseModals}
          onSuccess={(payload) => handleTransactionRefresh(selectedAccount.accountId, payload)}
        />
      )}

      {/* Модальное окно редактирования процента доходности */}
      {showTransactionForm && selectedAccount && selectedTransactionType === 'profitability' && (
        <ProfitabilityEditModal
          accountData={selectedAccount}
          year={year}
          month={selectedMonth}
          onClose={handleCloseModals}
          onSuccess={() => handleRefreshData(selectedAccount.accountId)}
        />
      )}

      {/* Модальное окно локап-пакетов */}
      {showLockupPackages && lockupPackagesData && (
        <LockupPackagesModal
          isOpen={showLockupPackages}
          onClose={() => {
            setShowLockupPackages(false);
            setLockupPackagesData(null);
          }}
          packages={lockupPackagesData.packages}
          totalBalance={lockupPackagesData.totalBalance}
          accountInfo={lockupPackagesData.accountInfo}
          month={lockupPackagesData.month}
          year={lockupPackagesData.year}
        />
      )}

      {showCurrencyModal && (
        <CurrencyRatesModal
          isOpen={showCurrencyModal}
          onClose={() => setShowCurrencyModal(false)}
        />
      )}
    </div>
  );
};

export default AccountsMonitoring;
