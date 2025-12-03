import React, { useState, useEffect, useCallback } from 'react'; // Импорт React и хуков
import adminService from '../../../JS/services/admin-service.js'; // Импорт сервиса админ-панели
import RequestModal from './RequestModal.jsx'; // Импорт модального окна заявки
import RejectReasonModal from './RejectReasonModal.jsx'; // Импорт модального окна причины отклонения
import './user-requests.css'; // Импорт стилей компонента

const UserRequests = () => { // Компонент отображения всех заявок
  // === СОСТОЯНИЯ КОМПОНЕНТА ===
  const [requests, setRequests] = useState([]); // Массив заявок
  const [loading, setLoading] = useState(false); // Флаг загрузки
  const [error, setError] = useState(null); // Ошибка загрузки
  
  // Модальные окна
  const [selectedRequest, setSelectedRequest] = useState(null); // Выбранная заявка для модального окна
  const [rejectingRequest, setRejectingRequest] = useState(null); // Заявка для отклонения (модалка причины)
  
  // Фильтры
  const [typeFilter, setTypeFilter] = useState('all'); // Фильтр по типу (all/deposits/withdrawals/transfers)
  const [statusFilter, setStatusFilter] = useState('all'); // Фильтр по статусу (all/processing/credited/rejected)
  const [emailFilter, setEmailFilter] = useState(''); // Фильтр по email
  const [surnameFilter, setSurnameFilter] = useState(''); // Фильтр по фамилии
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false); // Состояние dropdown типа
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false); // Состояние dropdown статуса
  
  // Пагинация
  const [currentPage, setCurrentPage] = useState(1); // Текущая страница
  const [totalPages, setTotalPages] = useState(1); // Всего страниц
  const [totalItems, setTotalItems] = useState(0); // Всего заявок
  const limit = 50; // Заявок на страницу
  
  // === ЗАГРУЗКА ЗАЯВОК ===
  const loadRequests = useCallback(async () => { // Функция загрузки заявок с useCallback
    try { // Начинаем блок обработки ошибок
      setLoading(true); // Устанавливаем флаг загрузки
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
      
      setRequests(result.requests || []); // Устанавливаем заявки
      setTotalPages(result.pagination?.totalPages || 1); // Устанавливаем количество страниц
      setTotalItems(result.pagination?.totalItems || 0); // Устанавливаем общее количество заявок
    } catch (err) { // Обработка ошибок
      console.error('UserRequests: Ошибка загрузки заявок:', err); // Логируем ошибку
      setError(err.message || 'Ошибка загрузки заявок'); // Устанавливаем текст ошибки
    } finally { // Блок finally выполняется всегда
      setLoading(false); // Снимаем флаг загрузки
    }
  }, [typeFilter, statusFilter, emailFilter, surnameFilter, currentPage, limit]); // Зависимости для useCallback
  
  // === ЭФФЕКТ ДЛЯ ЗАГРУЗКИ ЗАЯВОК ПРИ ИЗМЕНЕНИИ ФИЛЬТРОВ ===
  useEffect(() => { // Хук useEffect для загрузки данных
    loadRequests(); // Загружаем заявки
  }, [typeFilter, statusFilter, emailFilter, surnameFilter, currentPage, loadRequests]); // Зависимости - фильтры, страница и функция загрузки
  
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
  
  // Обработчик переключения страниц
  const handlePageChange = (newPage) => { // Функция переключения страницы
    if (newPage >= 1 && newPage <= totalPages) { // Проверяем валидность страницы
      console.log('UserRequests: Переход на страницу:', newPage); // Логируем
      setCurrentPage(newPage); // Устанавливаем новую страницу
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
    <div className="admin-dashboard-requests-list-container gradient-border bru-max flex flex-column">
      {/* Заголовок */}
      <h2 className="admin-dashboard-requests-list-container-header">заявки</h2>
      
      {/* Фильтры */}
      <div className="admin-dashboard-requests-filters flex flex-row">
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
                {typeFilter === 'all' ? '-- выберите тип транзакции --' : 
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
                {statusFilter === 'all' ? '-- выберите статус --' : 
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
      
      {/* Список заявок */}
      <div className="admin-dashboard-requests-list bru-max flex flex-column gradient-border">
        {/* Контейнер со скроллом для всего содержимого */}
        <div className="admin-dashboard-requests-list-scroll-container">
          {/* Заголовок таблицы */}
          <div className="admin-dashboard-requests-list-item-header flex flex-row bru">
            <span className="admin-dashboard-requests-list-item-point">ID ЗАЯВКИ</span>
            <span className="admin-dashboard-requests-list-item-point">Фамилия клиента</span>
            <span className="admin-dashboard-requests-list-item-point">E-mail клиента</span>
            <span className="admin-dashboard-requests-list-item-point">ТИП ЗАЯВКИ</span>
            <span className="admin-dashboard-requests-list-item-point">ПЕРЕВОД СО СЧЕТА</span>
            <span className="admin-dashboard-requests-list-item-point">ПЕРЕВОД НА СЧЕТ</span>
            <span className="admin-dashboard-requests-list-item-point">СУММА ПЕРЕВОДА</span>
            <span className="admin-dashboard-requests-list-item-point">СТАТУС ЗАЯВКИ</span>
            <span className="admin-dashboard-requests-list-item-point">ДАТА</span>
          </div>
          
          {/* Индикатор загрузки */}
          {loading && (
            <div className="reports-absence-message gradient-border flex flex-row bru-max">
              <div className="reports-absence-message-icon bru flex">
                <div className="reports-absence-message-icon-img img"></div>
              </div>
              <div className="reports-absence-message-text flex flex-column">
                <span className="reports-absence-message-text-title">загрузка заявок...</span>
                <span className="reports-absence-message-text-description">пожалуйста, подождите</span>
              </div>
            </div>
          )}
          
          {/* Сообщение об ошибке */}
          {error && !loading && (
            <div className="reports-absence-message gradient-border flex flex-row bru-max">
              <div className="reports-absence-message-icon bru flex">
                <div className="reports-absence-message-icon-img img"></div>
              </div>
              <div className="reports-absence-message-text flex flex-column">
                <span className="reports-absence-message-text-title">ошибка загрузки</span>
                <span className="reports-absence-message-text-description">{error}</span>
              </div>
            </div>
          )}
          
          {/* Сообщение об отсутствии заявок */}
          {!loading && !error && requests.length === 0 && (
            <div className="reports-absence-message gradient-border flex flex-row bru-max">
              <div className="reports-absence-message-icon bru flex">
                <div className="reports-absence-message-icon-img img"></div>
              </div>
              <div className="reports-absence-message-text flex flex-column">
                <span className="reports-absence-message-text-title">нет доступных операций по выбранным фильтрам</span>
                <span className="reports-absence-message-text-description">пожалуйста, введите другие параметры</span>
              </div>
            </div>
          )}
          
          {/* Список заявок */}
          {!loading && !error && requests.length > 0 && requests.map((request) => (
            <div 
              key={`${request.type}-${request.id}`} 
              className="admin-dashboard-requests-list-item flex flex-row gradient-border bru pointer"
              onClick={() => handleRequestClick(request)}
            >
              <span className="admin-dashboard-requests-list-item-point">
                REQ-ID № <span className="req-num">{request.id}</span>
              </span>
              <span className="admin-dashboard-requests-list-item-point">
                <span className="req-fio">{request.userFullName || 'Неизвестно'}</span>
              </span>
              <span className="admin-dashboard-requests-list-item-point">
                <span className="req-email">{request.userEmail || 'Неизвестно'}</span>
              </span>
              <span className="admin-dashboard-requests-list-item-point">
                <span className="req-type">{getTypeLabel(request.type)}</span>
              </span>
              <span className="admin-dashboard-requests-list-item-point">
                <span className="req-acc-from">{request.fromAccount || '—'}</span>
              </span>
              <span className="admin-dashboard-requests-list-item-point">
                <span className="req-acc-to">{request.toAccount || '—'}</span>
              </span>
              <span className="admin-dashboard-requests-list-item-point">
                <span className="req-summ">{request.amount || 0} {request.currency || '$'}</span>
              </span>
              <span className="admin-dashboard-requests-list-item-point">
                <span className="req-status">{getStatusLabel(request.status)}</span>
              </span>
              <span className="admin-dashboard-requests-list-item-point">
                <span className="req-date">{formatDate(request.date)}</span>
              </span>
            </div>
          ))}
          
          {/* Пагинация - ВНУТРИ СКРОЛЛ-КОНТЕЙНЕРА */}
          {!loading && !error && totalPages > 1 && (
            <div className="admin-dashboard-requests-pagination flex flex-row">
              <button 
                className="admin-dashboard-requests-pagination-button gradient-border bru"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                ← Назад
              </button>
              <span className="admin-dashboard-requests-pagination-info">
                Страница {currentPage} из {totalPages} (Всего заявок: {totalItems})
              </span>
              <button 
                className="admin-dashboard-requests-pagination-button gradient-border bru"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Вперед →
              </button>
            </div>
          )}
        </div>
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
    </div>
  );
};

export default UserRequests; // Экспорт компонента
