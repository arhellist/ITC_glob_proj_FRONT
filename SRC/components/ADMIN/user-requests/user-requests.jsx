import React, { useState, useEffect, useCallback, useRef } from 'react'; // Импорт React и хуков
import adminService from '../../../JS/services/admin-service.js'; // Импорт сервиса админ-панели
import RequestModal from './RequestModal.jsx'; // Импорт модального окна заявки
import RejectReasonModal from './RejectReasonModal.jsx'; // Импорт модального окна причины отклонения
import ReceiptPreview from './ReceiptPreview.jsx'; // Импорт компонента превью чека
import { API_CONFIG } from '../../../config/api.js'; // Импорт конфигурации API
import './user-requests.css'; // Импорт стилей компонента
import checkIcon from '../../../IMG/check.png';
import warningIcon from '../../../IMG/warning.png';
import refreshIcon from '../../../IMG/profiles/white/Refresh.png';

const UserRequests = () => { // Компонент отображения всех заявок
  // === СОСТОЯНИЯ КОМПОНЕНТА ===
  const [requests, setRequests] = useState([]); // Массив заявок
  const [loading, setLoading] = useState(false); // Флаг загрузки
  const [error, setError] = useState(null); // Ошибка загрузки
  
  // Модальные окна
  const [selectedRequest, setSelectedRequest] = useState(null); // Выбранная заявка для модального окна
  const [rejectingRequest, setRejectingRequest] = useState(null); // Заявка для отклонения (модалка причины)
  const [fullscreenReceipt, setFullscreenReceipt] = useState(null); // Полноэкранный просмотр чека
  
  // Фильтры
  const [typeFilter, setTypeFilter] = useState('all'); // Фильтр по типу (all/deposits/withdrawals/transfers)
  const [statusFilter, setStatusFilter] = useState('all'); // Фильтр по статусу (all/processing/credited/rejected)
  const [emailFilter, setEmailFilter] = useState(''); // Фильтр по email
  const [surnameFilter, setSurnameFilter] = useState(''); // Фильтр по фамилии
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false); // Состояние dropdown типа
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false); // Состояние dropdown статуса
  
  // Infinite scroll пагинация
  const [currentPage, setCurrentPage] = useState(1); // Текущая страница
  const [totalPages, setTotalPages] = useState(1); // Всего страниц
  const [totalItems, setTotalItems] = useState(0); // Всего заявок
  const [loadingMore, setLoadingMore] = useState(false); // Флаг загрузки дополнительных заявок
  const [hasMore, setHasMore] = useState(true); // Есть ли еще заявки для загрузки
  const limit = 50; // Заявок на страницу
  const contentRef = useRef(null); // Ref для контейнера с заявками
  const loaderRef = useRef(null); // Ref для элемента-триггера загрузки
  const savedScrollPosition = useRef(0); // Сохраненная позиция прокрутки
  const shouldRestoreScroll = useRef(false); // Флаг необходимости восстановления прокрутки
  
  // === ЗАГРУЗКА ЗАЯВОК ===
  const loadRequests = useCallback(async () => { // Функция загрузки заявок с useCallback
    try { // Начинаем блок обработки ошибок
      const isFirstPage = currentPage === 1;
      
      // Сохраняем позицию прокрутки перед загрузкой (только для последующих страниц)
      if (!isFirstPage && contentRef.current) {
        savedScrollPosition.current = contentRef.current.scrollTop;
        shouldRestoreScroll.current = true;
      }
      
      // Устанавливаем флаги загрузки в зависимости от страницы
      if (isFirstPage) {
        setLoading(true); // Полная загрузка только для первой страницы
        shouldRestoreScroll.current = false; // Не восстанавливаем прокрутку для первой страницы
      } else {
        setLoadingMore(true); // Индикатор загрузки дополнительных заявок
      }
      setError(null); // Сбрасываем ошибку
      
      console.log('UserRequests: Загружаем заявки с фильтрами:', { // Логируем параметры
        type: typeFilter,
        status: statusFilter,
        page: currentPage,
        limit
      });
      
      const result = await adminService.getAllRequests({ // Запрашиваем заявки
        type: typeFilter, // Тип заявки
        status: statusFilter, // Статус заявки
        email: emailFilter, // Поиск по email
        surname: surnameFilter, // Поиск по фамилии
        page: currentPage, // Текущая страница
        limit // Лимит на страницу
      });
      
      console.log('UserRequests: Получены заявки:', result); // Логируем результат
      
      const newRequests = result.requests || [];
      if (isFirstPage) {
        // Первая страница - заменяем все заявки
        setRequests(newRequests);
      } else {
        // Последующие страницы - добавляем к существующим
        setRequests(prev => [...prev, ...newRequests]);
      }
      setTotalPages(result.pagination?.totalPages || 1); // Устанавливаем количество страниц
      setTotalItems(result.pagination?.totalItems || 0); // Устанавливаем общее количество заявок
      setHasMore(currentPage < (result.pagination?.totalPages || 1)); // Проверяем, есть ли еще страницы
    } catch (err) { // Обработка ошибок
      console.error('UserRequests: Ошибка загрузки заявок:', err); // Логируем ошибку
      setError(err.message || 'Ошибка загрузки заявок'); // Устанавливаем текст ошибки
      shouldRestoreScroll.current = false; // Отменяем восстановление прокрутки при ошибке
    } finally { // Блок finally выполняется всегда
      setLoading(false); // Снимаем флаг загрузки
      setLoadingMore(false); // Снимаем флаг загрузки дополнительных заявок
    }
  }, [typeFilter, statusFilter, emailFilter, surnameFilter, currentPage, limit]); // Зависимости для useCallback
  
  // === ЭФФЕКТ ДЛЯ СБРОСА ПРИ ИЗМЕНЕНИИ ФИЛЬТРОВ ===
  useEffect(() => { // Хук useEffect для сброса при изменении фильтров
    setRequests([]); // Очищаем заявки
    setCurrentPage(1); // Сбрасываем на первую страницу
    setHasMore(true); // Сбрасываем флаг наличия заявок
  }, [typeFilter, statusFilter, emailFilter, surnameFilter]); // Зависимости - только фильтры
  
  // === ЭФФЕКТ ДЛЯ ЗАГРУЗКИ ЗАЯВОК ===
  useEffect(() => { // Хук useEffect для загрузки данных
    loadRequests(); // Загружаем заявки
  }, [loadRequests]); // Зависимости - функция загрузки
  
  // === ЭФФЕКТ ДЛЯ ВОССТАНОВЛЕНИЯ ПОЗИЦИИ ПРОКРУТКИ ===
  useEffect(() => { // Хук useEffect для восстановления позиции прокрутки
    if (shouldRestoreScroll.current && contentRef.current && savedScrollPosition.current > 0) {
      // Используем двойной requestAnimationFrame для гарантии, что DOM обновлен
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (contentRef.current) {
            contentRef.current.scrollTop = savedScrollPosition.current;
            shouldRestoreScroll.current = false; // Сбрасываем флаг после восстановления
          }
        });
      });
    }
  }, [requests]); // Восстанавливаем прокрутку после обновления списка заявок
  
  // === ЭФФЕКТ ДЛЯ INFINITE SCROLL ===
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !loading && !loadingMore && currentPage < totalPages) {
          setLoadingMore(true);
          setCurrentPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );
    
    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }
    
    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [hasMore, loading, loadingMore, currentPage, totalPages]);
  
  // === ОБРАБОТЧИКИ СОБЫТИЙ ===
  
  // Обработчик смены типа заявки
  const handleTypeFilter = (type) => { // Функция смены типа заявки
    console.log('UserRequests: Изменение фильтра типа на:', type); // Логируем
    setTypeFilter(type); // Устанавливаем новый тип
    setCurrentPage(1); // Сбрасываем на первую страницу
    setTypeDropdownOpen(false); // Закрываем dropdown типа
  };
  
  // Обработчик смены статуса заявки
  const handleStatusFilter = (status) => { // Функция смены статуса заявки
    console.log('UserRequests: Изменение фильтра статуса на:', status); // Логируем
    setStatusFilter(status); // Устанавливаем новый статус
    setCurrentPage(1); // Сбрасываем на первую страницу
    setStatusDropdownOpen(false); // Закрываем dropdown статуса
  };
  
  // Функция получения префикса типа заявки
  const getTypePrefix = (type) => { // Функция получения префикса типа
    switch (type) {
      case 'deposit': return 'deposit';
      case 'withdrawal': return 'withdrawal';
      case 'transfer': return 'transfer';
      default: return 'request';
    }
  };
  
  // Обработчик клика на заявку (открытие модалки)
  const handleRequestClick = (request) => { // Функция открытия модалки
    console.log('UserRequests: Открытие модалки для заявки:', request); // Логируем
    setSelectedRequest(request); // Устанавливаем выбранную заявку
  };
  
  // Обработчик закрытия модалки
  const handleCloseModal = () => { // Функция закрытия модалки
    console.log('UserRequests: Закрытие модалки'); // Логируем
    setSelectedRequest(null); // Сбрасываем выбранную заявку
  };
  
  // Обработчик принятия заявки
  const handleApprove = async (request) => { // Функция принятия заявки
    try { // Начинаем блок обработки ошибок
      console.log('UserRequests: Принятие заявки:', request); // Логируем
      
      const result = await adminService.updateRequestStatus(request.id, request.type, 'credited'); // Обновляем статус
      console.log('UserRequests: Заявка принята:', result); // Логируем результат
      
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: `Заявка ${request.type} #${request.id} успешно принята! Клиенту отправлено уведомление.`
        }
      }));
      handleCloseModal(); // Закрываем модалку
      loadRequests(); // Перезагружаем список заявок
    } catch (err) { // Обработка ошибок
      console.error('UserRequests: Ошибка принятия заявки:', err); // Логируем ошибку
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: `Ошибка принятия заявки: ${err.message || 'Неизвестная ошибка'}`
        }
      }));
    }
  };
  
  // Обработчик отклонения заявки (открытие модалки причины)
  const handleReject = (request) => { // Функция открытия модалки причины отклонения
    console.log('UserRequests: Открытие модалки причины для заявки:', request); // Логируем
    setRejectingRequest(request); // Устанавливаем заявку для отклонения
    setSelectedRequest(null); // Закрываем основную модалку
  };
  
  // Обработчик подтверждения отклонения с причиной
  const handleConfirmReject = async (reason) => { // Функция подтверждения отклонения с причиной
    try { // Начинаем блок обработки ошибок
      console.log('UserRequests: Отклонение заявки с причиной:', rejectingRequest, reason); // Логируем
      
      const result = await adminService.updateRequestStatus(rejectingRequest.id, rejectingRequest.type, 'rejected', reason); // Обновляем статус с причиной
      console.log('UserRequests: Заявка отклонена:', result); // Логируем результат
      
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: `Заявка ${rejectingRequest.type} #${rejectingRequest.id} отклонена! Клиенту отправлено уведомление.`
        }
      }));
      setRejectingRequest(null); // Закрываем модалку причины
      loadRequests(); // Перезагружаем список заявок
    } catch (err) { // Обработка ошибок
      console.error('UserRequests: Ошибка отклонения заявки:', err); // Логируем ошибку
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: `Ошибка отклонения заявки: ${err.message || 'Неизвестная ошибка'}`
        }
      }));
    }
  };
  
  // Обработчик отмены отклонения
  const handleCancelReject = () => { // Функция отмены отклонения
    console.log('UserRequests: Отмена отклонения'); // Логируем
    setRejectingRequest(null); // Закрываем модалку причины
  };
  
  // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
  
  // Функция получения русского названия типа заявки
  const getTypeLabel = (type) => { // Функция перевода типа на русский
    switch (type) { // Проверяем тип
      case 'deposit': return 'ПОПОЛНЕНИЕ'; // Пополнение
      case 'withdrawal': return 'ВЫВОД'; // Вывод
      case 'transfer': return 'ПЕРЕВОД'; // Перевод
      default: return type?.toUpperCase() || 'НЕИЗВЕСТНО'; // Неизвестный тип
    }
  };
  
  // Функция получения русского названия статуса
  const getStatusLabel = (status) => { // Функция перевода статуса на русский
    switch (status) { // Проверяем статус
      case 'processing': return 'НА РАССМОТРЕНИИ'; // В обработке
      case 'credited': return 'ПРИНЯТАЯ'; // Зачислено
      case 'rejected': return 'ОТКЛОНЕННАЯ'; // Отклонено
      case 'Pending': return 'НА РАССМОТРЕНИИ'; // В ожидании (для переводов)
      case 'Resolve': return 'ПРИНЯТАЯ'; // Выполнен (для переводов)
      case 'Reject': return 'ОТКЛОНЕННАЯ'; // Отклонен (для переводов)
      default: return status?.toUpperCase() || 'НЕИЗВЕСТНО'; // Неизвестный статус
    }
  };
  
  // Функция форматирования даты
  const formatDate = (dateString) => { // Функция форматирования даты
    if (!dateString) return 'Нет данных'; // Если даты нет
    const date = new Date(dateString); // Создаем объект Date
    return date.toLocaleDateString('ru-RU'); // Форматируем в русском формате
  };
  
  // === РЕНДЕР КОМПОНЕНТА ===
  return (
    <div className="admin-requests-page">
      {/* Заголовок */}
      <div className="admin-requests-header">
        <div className="admin-requests-header__title">
          <h1>Заявки</h1>
          <span>{totalItems}</span>
        </div>
      </div>
      
      {/* Фильтры */}
      <div className="admin-requests-filters">
        {/* Input поиска по email */}
        <input
          type="text"
          className="admin-dashboard-requests-search-input gradient-border bru"
          placeholder="Поиск по email..."
          value={emailFilter}
          onChange={(e) => {
            setEmailFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
        
        {/* Input поиска по фамилии */}
        <input
          type="text"
          className="admin-dashboard-requests-search-input gradient-border bru"
          placeholder="Поиск по фамилии..."
          value={surnameFilter}
          onChange={(e) => {
            setSurnameFilter(e.target.value);
            setCurrentPage(1);
          }}
        />
        
        {/* Dropdown фильтра по типу транзакции */}
        <div className="custom-select-admin-dashboard-requests-wrapper gradient-border bru">
          <div 
            className={`custom-select-admin-dashboard-requests ${typeDropdownOpen ? 'active' : ''}`}
          >
            <div 
              className="custom-select-admin-dashboard-requests-trigger"
              onClick={() => setTypeDropdownOpen(!typeDropdownOpen)}
            >
              <span className="custom-select-admin-dashboard-requests-value">
                {typeFilter === 'all' ? 'транзакции' : 
                 typeFilter === 'deposits' ? 'пополнения' :
                 typeFilter === 'withdrawals' ? 'выводы' :
                 typeFilter === 'transfers' ? 'переводы' : 'все типы'}
              </span>
              <div className="custom-select-admin-dashboard-requests-arrow pointer bru">
                <div className="custom-select-admin-dashboard-requests-arrow-img img bru"></div>
              </div>
            </div>
            {typeDropdownOpen && (
              <div className="custom-select-admin-dashboard-requests-options bru">
                <div 
                  className={`custom-select-admin-dashboard-requests-option bru ${typeFilter === 'deposits' ? 'selected' : ''}`}
                  onClick={() => handleTypeFilter('deposits')}
                >
                  пополнения
                </div>
                <div 
                  className={`custom-select-admin-dashboard-requests-option bru ${typeFilter === 'withdrawals' ? 'selected' : ''}`}
                  onClick={() => handleTypeFilter('withdrawals')}
                >
                  выводы
                </div>
                <div 
                  className={`custom-select-admin-dashboard-requests-option bru ${typeFilter === 'transfers' ? 'selected' : ''}`}
                  onClick={() => handleTypeFilter('transfers')}
                >
                  переводы
                </div>
                <div 
                  className={`custom-select-admin-dashboard-requests-option bru ${typeFilter === 'all' ? 'selected' : ''}`}
                  onClick={() => handleTypeFilter('all')}
                >
                  все типы
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Dropdown фильтра по статусу */}
        <div className="custom-select-admin-dashboard-requests-wrapper gradient-border bru">
          <div 
            className={`custom-select-admin-dashboard-requests ${statusDropdownOpen ? 'active' : ''}`}
          >
            <div 
              className="custom-select-admin-dashboard-requests-trigger"
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            >
              <span className="custom-select-admin-dashboard-requests-value">
                {statusFilter === 'all' ? 'статус' : 
                 statusFilter === 'processing' ? 'на рассмотрении' :
                 statusFilter === 'credited' ? 'принятые' :
                 statusFilter === 'rejected' ? 'отклоненные' : 'все'}
              </span>
              <div className="custom-select-admin-dashboard-requests-arrow pointer bru">
                <div className="custom-select-admin-dashboard-requests-arrow-img img bru"></div>
              </div>
            </div>
            {statusDropdownOpen && (
              <div className="custom-select-admin-dashboard-requests-options bru">
                <div 
                  className={`custom-select-admin-dashboard-requests-option bru ${statusFilter === 'processing' ? 'selected' : ''}`}
                  onClick={() => handleStatusFilter('processing')}
                >
                  на рассмотрении
                </div>
                <div 
                  className={`custom-select-admin-dashboard-requests-option bru ${statusFilter === 'credited' ? 'selected' : ''}`}
                  onClick={() => handleStatusFilter('credited')}
                >
                  принятые
                </div>
                <div 
                  className={`custom-select-admin-dashboard-requests-option bru ${statusFilter === 'rejected' ? 'selected' : ''}`}
                  onClick={() => handleStatusFilter('rejected')}
                >
                  отклоненные
                </div>
                <div 
                  className={`custom-select-admin-dashboard-requests-option bru ${statusFilter === 'all' ? 'selected' : ''}`}
                  onClick={() => handleStatusFilter('all')}
                >
                  все
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Контент */}
      <div className="admin-requests-content" ref={contentRef}>
        {/* Индикатор загрузки */}
        {loading && (
          <div className="admin-requests-loading">
            <div className="admin-requests-spinner" />
            <p>Загрузка заявок...</p>
          </div>
        )}
        
        {/* Сообщение об ошибке */}
        {error && !loading && (
          <div className="admin-requests-empty">
            <h3>Не удалось загрузить данные</h3>
            <p>{error}</p>
            <button type="button" onClick={() => loadRequests()}>
              Повторить
            </button>
          </div>
        )}
        
        {/* Сообщение об отсутствии заявок */}
        {!loading && !error && requests.length === 0 && (
          <div className="admin-requests-empty">
            <h3>Заявки не найдены</h3>
            <p>Попробуйте изменить параметры поиска.</p>
          </div>
        )}
        
        {/* Сетка карточек заявок */}
        {!loading && !error && requests.length > 0 && (
          <div className="admin-requests-grid">
            {requests.map((request) => (
              <div 
                key={`${request.type}-${request.id}`} 
                className="admin-request-card"
                onClick={() => handleRequestClick(request)}
              >
                <div className="admin-request-card__header">
                  <div className="admin-request-card__header-info">
                    <span className="admin-request-card__name">Заявка №{request.id}-{getTypePrefix(request.type)}</span>
                    <span className="admin-request-card__status" style={{
                      color: request.status === 'credited' || request.status === 'Resolve' ? '#4caf50' : 
                             request.status === 'rejected' || request.status === 'Reject' ? '#f44336' : '#ffc107'
                    }}>
                      {getStatusLabel(request.status)}
                    </span>
                  </div>
                  <div className="admin-request-card__icon">
                    {(request.status === 'credited' || request.status === 'Resolve') && (
                      <img src={checkIcon} alt="Принято" className="admin-request-card__icon-img admin-request-card__icon-img--check" />
                    )}
                    {(request.status === 'rejected' || request.status === 'Reject') && (
                      <img src={warningIcon} alt="Отклонено" className="admin-request-card__icon-img admin-request-card__icon-img--warning" />
                    )}
                    {(request.status === 'processing' || request.status === 'Pending') && (
                      <img src={refreshIcon} alt="На рассмотрении" className="admin-request-card__icon-img admin-request-card__icon-img--refresh" />
                    )}
                  </div>
                </div>
                <div className="admin-request-card__body">
                  <div className="admin-request-card__row">
                    <span className="admin-request-card__label">Тип</span>
                    <span className="admin-request-card__value">{getTypeLabel(request.type)}</span>
                  </div>
                  <div className="admin-request-card__row">
                    <span className="admin-request-card__label">Клиент</span>
                    <span className="admin-request-card__value">{request.userFullName || 'Неизвестно'}</span>
                  </div>
                  <div className="admin-request-card__row">
                    <span className="admin-request-card__label">Email</span>
                    <span className="admin-request-card__value" style={{ fontSize: '12px', wordBreak: 'break-word' }}>{request.userEmail || 'Неизвестно'}</span>
                  </div>
                  {request.fromAccount && (
                    <div className="admin-request-card__row">
                      <span className="admin-request-card__label">Со счета</span>
                      <span className="admin-request-card__value">№{request.fromAccount}</span>
                    </div>
                  )}
                  {request.toAccount && (
                    <div className="admin-request-card__row">
                      <span className="admin-request-card__label">На счет</span>
                      <span className="admin-request-card__value">№{request.toAccount}</span>
                    </div>
                  )}
                  <div className="admin-request-card__row">
                    <span className="admin-request-card__label">Сумма перевода</span>
                    <span className="admin-request-card__value">{request.amount || 0} {request.currency || '$'}</span>
                  </div>
                  {request.type === 'transfer' && (
                    <div className="admin-request-card__row">
                      <span className="admin-request-card__label">Сумма получения</span>
                      <span className="admin-request-card__value">
                        {request.currency === request.transferCurrency ? (
                          // Если валюты одинаковые - показываем сумму перевода
                          `${(request.amount || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${request.transferCurrency || '$'}`
                        ) : (
                          // Если валюты разные
                          request.status === 'Pending' ? (
                            // Если в обработке - показываем "обрабатывается"
                            'обрабатывается'
                          ) : (
                            // Если обработано - показываем фактическую сумму получения
                            `${(request.transferAmount || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${request.transferCurrency || '$'}`
                          )
                        )}
                      </span>
                    </div>
                  )}
                  {request.type === 'withdrawal' && (
                    <>
                      <div className="admin-request-card__row">
                        <span className="admin-request-card__label">Штрафы</span>
                        <span className="admin-request-card__value" style={{ color: (request.penalty || 0) > 0 ? '#f44336' : 'inherit' }}>
                          {(request.penalty || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {request.currency || '$'}
                        </span>
                      </div>
                      {request.fines && request.fines.length > 0 && (
                        <div className="admin-request-card__row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginTop: '4px' }}>
                          <span className="admin-request-card__label" style={{ fontSize: '11px', color: '#9aa6bf' }}>Детали штрафов:</span>
                          {request.fines.map((fine, idx) => (
                            <div key={fine.id || idx} style={{ fontSize: '11px', color: '#ff9800', marginLeft: '8px' }}>
                              • {fine.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {request.currency || '$'}
                              {fine.description && ` - ${fine.description}`}
                            </div>
                          ))}
                        </div>
                      )}
                      {request.rejectReason && (
                        <div className="admin-request-card__row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginTop: '8px' }}>
                          <span className="admin-request-card__label" style={{ color: '#f44336' }}>Причина отклонения</span>
                          <span className="admin-request-card__value" style={{ wordBreak: 'break-word', textAlign: 'left', color: '#f44336', fontSize: '12px' }}>
                            {request.rejectReason}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="admin-request-card__footer">
                  <span className="admin-request-card__date" style={{ fontSize: '12px', color: '#9aa6bf' }}>
                    {formatDate(request.date)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Индикатор загрузки дополнительных заявок (для infinite scroll) */}
        {loadingMore && (
          <div className="admin-requests-loading-more">
            <div className="admin-requests-spinner small" />
            <span>Загрузка заявок...</span>
          </div>
        )}
        
        {/* Элемент-триггер для infinite scroll */}
        {!loading && !error && hasMore && !loadingMore && (
          <div ref={loaderRef} className="admin-requests-sentinel" />
        )}
        
        {/* Информация о количестве заявок */}
        {!loading && !error && requests.length > 0 && (
          <div className="admin-requests-info">
            <span>Загружено {requests.length} из {totalItems} заявок</span>
          </div>
        )}
      </div>
      
      {/* Модальное окно детализации заявки */}
      {selectedRequest && (
        <RequestModal 
          request={selectedRequest}
          onClose={handleCloseModal}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
      
      {/* Модальное окно причины отклонения */}
      {rejectingRequest && (
        <RejectReasonModal 
          request={rejectingRequest}
          onConfirm={handleConfirmReject}
          onCancel={handleCancelReject}
        />
      )}
      
      {/* Полноэкранный просмотр чека */}
      {fullscreenReceipt && (
        <div 
          className="receipt-fullscreen-overlay"
          onClick={() => setFullscreenReceipt(null)}
        >
          <div 
            className="receipt-fullscreen-container"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="receipt-fullscreen-close"
              onClick={() => setFullscreenReceipt(null)}
            >
              ✕
            </button>
            {fullscreenReceipt.toLowerCase().endsWith('.pdf') ? (
              <iframe
                src={`${API_CONFIG.BASE_URL}/admin/receipts/${fullscreenReceipt}?token=${localStorage.getItem('accessToken')}`}
                className="receipt-fullscreen-content receipt-fullscreen-pdf"
                title="Чек"
              />
            ) : (
              <img
                src={`${API_CONFIG.BASE_URL}/admin/receipts/${fullscreenReceipt}?token=${localStorage.getItem('accessToken')}&t=${Date.now()}`}
                alt="Чек"
                className="receipt-fullscreen-content receipt-fullscreen-image"
              />
            )}
            <button
              className="receipt-fullscreen-download"
              onClick={() => {
                const token = localStorage.getItem('accessToken');
                const downloadUrl = `${API_CONFIG.BASE_URL}/admin/receipts/${fullscreenReceipt}?token=${token}&download=true`;
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fullscreenReceipt.split('/').pop() || 'receipt';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
            >
              Скачать
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserRequests; // Экспорт компонента
