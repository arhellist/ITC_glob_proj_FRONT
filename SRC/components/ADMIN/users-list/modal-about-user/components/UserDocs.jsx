import React, { useMemo } from 'react';
import { API_CONFIG } from '../../../../../config/api.js'; // Импорт конфигурации API для получения базового URL
import axiosAPI from '../../../../../JS/auth/http/axios.js'; // Импорт axios с interceptors

const UserDocs = ({ user, products = [], onDocumentView, onDocumentAction, onDocumentDelete }) => {
  console.log('UserDocs: user=', user); // Логируем объект пользователя
  console.log('UserDocs: user.documents=', user?.documents); // Логируем массив документов
  
  if (!user) return null; // Если пользователь не передан, ничего не рендерим

  // Функция для получения свежего токена (с попыткой refresh если нужно)
  const getFreshToken = async () => { // Асинхронная функция получения свежего токена
    try { // Начинаем блок обработки ошибок
      // Делаем легковесный запрос для проверки/обновления токена через interceptors
      await axiosAPI.get('/auth/checkAuth'); // Запрос проверки аутентификации (автоматически обновит токен если истёк)
      return localStorage.getItem('accessToken'); // Возвращаем свежий токен из localStorage
    } catch (error) { // Обработка ошибок
      console.error('getFreshToken error:', error); // Логируем ошибку
      return localStorage.getItem('accessToken'); // Возвращаем токен как есть (лучше чем ничего)
    }
  };

  // Обработчик клика на документ с обновлением токена
  const handleDocumentClick = async (document, fileType) => { // Асинхронная функция обработки клика на документ
    console.log('handleDocumentClick: обновляем токен перед открытием документа'); // Логируем начало обработки
    const freshToken = await getFreshToken(); // Получаем свежий токен (с автоматическим refresh)
    console.log('handleDocumentClick: токен обновлён, формируем URL'); // Логируем получение токена
    
    // Формируем URL с СВЕЖИМ токеном
    // ВАЖНО: для PDF добавляем preview=true для конвертации в изображение (избегаем iframe блокировки)
    const baseUrl = API_CONFIG.BASE_URL; // Базовый URL API
    const timestamp = Date.now(); // Timestamp для обхода кэша
    const previewParam = fileType === 'pdf' ? '&preview=true' : ''; // Для PDF конвертируем в изображение
    const fullDocumentUrl = `${baseUrl}/admin/documents/${document.filePath}?token=${freshToken}&t=${timestamp}${previewParam}`; // URL документа (с preview для PDF)
    
    console.log('handleDocumentClick: открываем модалку с URL:', fullDocumentUrl); // Логируем URL
    onDocumentView(document.type, fullDocumentUrl, 'image'); // Вызываем колбэк с типом 'image' - всё показываем как изображения
  };

  const getDocumentImageSrc = (document, isPreview = false) => { // Функция получения URL изображения документа (с опцией preview)
    
    if (!document || !document.status) { // Если документ не загружен или нет статуса
      console.log(`No status for document ${document?.id}, returning placeholder`); // Логируем отсутствие статуса
      return '/src/IMG/lostDoc.png'; // Возвращаем placeholder изображение
    }
    
    // Получаем СВЕЖИЙ токен для авторизации запроса (берём из localStorage каждый раз)
    const token = localStorage.getItem('accessToken'); // Извлекаем JWT токен из localStorage
    if (!token) { // Если токен отсутствует
      console.log(`No token found, returning placeholder`); // Логируем отсутствие токена
      return '/src/IMG/lostDoc.png'; // Возвращаем placeholder
    }
    
    // Для ВСЕХ документов (включая паспорта) используем единый endpoint по filePath
    // Это позволяет просматривать любой документ из истории загрузок
    if (document.filePath) { // Если у документа есть путь к файлу
      const baseUrl = API_CONFIG.BASE_URL; // Получаем базовый URL из конфигурации
      const timestamp = Date.now(); // Текущее время в миллисекундах
      // Добавляем параметр preview для конвертации PDF в изображение на бэкенде
      const previewParam = isPreview ? '&preview=true' : ''; // Параметр preview
      const url = `${baseUrl}/admin/documents/${document.filePath}?token=${token}&t=${timestamp}${previewParam}`; // Формируем URL
      return url; // Возвращаем сформированный URL
    }
    
    console.log(`No filePath for document ${document.id}, returning placeholder`); // Логируем отсутствие пути
    return '/src/IMG/lostDoc.png'; // Возвращаем placeholder если путь отсутствует
  };

  const handleImageError = (document, event) => { // Обработчик ошибки загрузки изображения
    console.error(`❌ Error loading image for document ${document.id}:`, event); // Логируем событие ошибки
    console.error(`  Document type: ${document.type}`); // Логируем тип документа
    console.error(`  Document filePath: ${document.filePath}`); // Логируем путь к файлу
    console.error(`  Document status: ${document.status}`); // Логируем статус
    console.error(`  Image src that failed: ${event.target.src}`); // Логируем URL который не загрузился
    console.error(`  Event target:`, event.target); // Логируем элемент img
    console.error(`  Native event:`, event.nativeEvent); // Логируем нативное событие
    
    // Попробуем сделать fetch запрос для диагностики
    fetch(event.target.src) // Делаем тестовый запрос
      .then(response => { // Обрабатываем ответ
        console.log(`  Fetch response status: ${response.status}`); // Логируем статус HTTP
        console.log(`  Fetch response headers:`, response.headers); // Логируем заголовки
        console.log(`  Fetch response contentType:`, response.headers.get('content-type')); // Логируем content-type
        return response.blob(); // Получаем данные как blob
      })
      .then(blob => { // Обрабатываем blob
        console.log(`  Fetch blob size: ${blob.size} bytes`); // Логируем размер
        console.log(`  Fetch blob type: ${blob.type}`); // Логируем MIME тип
      })
      .catch(err => { // Обработка ошибки fetch
        console.error(`  Fetch error:`, err); // Логируем ошибку fetch
      });
    
    event.target.src = '/src/IMG/lostDoc.png'; // Устанавливаем placeholder
    
    // Если это паспорт и не удалось загрузить, показываем сообщение
    if (document.type === 'passport') { // Если паспорт
      console.log(`Passport ${document.id} failed to decrypt/load`); // Логируем ошибку паспорта
    }
  };

  // Функция форматирования даты для отображения
  const formatDate = (dateString) => { // Функция форматирования даты загрузки документа
    if (!dateString) return 'Неизвестно'; // Если дата отсутствует
    // Парсим дату из UTC (ISO строка) и отображаем в локальном времени пользователя
    const date = new Date(dateString); // Преобразуем строку в объект Date (дата в UTC)
    
    // Проверяем, что дата корректна
    if (isNaN(date.getTime())) {
      return 'Неизвестно';
    }
    
    // КРИТИЧНО: Используем московское время (UTC+3 зимой, UTC+4 летом)
    // Определяем смещение для Москвы (обычно +3 часа зимой, +4 летой)
    // Используем Intl.DateTimeFormat для правильной конвертации в московское время
    try {
      const formatter = new Intl.DateTimeFormat('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Moscow',
        hour12: false
      });
      
      return formatter.format(date);
    } catch (error) {
      // Fallback: вручную добавляем смещение для Москвы (UTC+3/+4)
      // Используем среднее смещение UTC+3.5 и корректируем вручную
      const moscowOffset = 3 * 60 * 60 * 1000; // +3 часа в миллисекундах (зимой)
      const localDate = new Date(date.getTime() + moscowOffset);
      
      return localDate.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    }
  };

  // Функция получения статуса документа на русском
  const getStatusLabel = (status, isOutdated = false) => { // Функция перевода статуса на русский язык
    if (isOutdated) {
      return '⚠️ Устаревший'; // Устаревший документ
    }
    switch (status) { // Проверяем статус
      case 'approve': return '✅ Утверждён'; // Утверждённый документ (статус из БД)
      case 'approved': return '✅ Утверждён'; // Утверждённый документ (альтернативный вариант)
      case 'not approve': return '❌ Отклонён'; // Отклонённый документ (статус из БД)
      case 'rejected': return '❌ Отклонён'; // Отклонённый документ (альтернативный вариант)
      case 'under review': return '⏳ Ожидает'; // Ожидает проверки (статус из БД)
      case 'pending': return '⏳ Ожидает'; // Ожидает проверки (альтернативный вариант)
      default: return '❓ Неизвестно'; // Неизвестный статус
    }
  };

  // Функция определения типа файла по расширению
  const getFileExtension = (filePath) => { // Функция получения расширения файла
    if (!filePath) return ''; // Если путь пустой, возвращаем пустую строку
    const parts = filePath.split('.'); // Разделяем путь по точке
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''; // Возвращаем последнюю часть (расширение) в нижнем регистре
  };

  // Функция проверки является ли файл PDF
  const isPdfDocument = (document) => { // Функция проверки типа PDF
    // Проверяем сначала mimeType (более надёжно для зашифрованных файлов)
    if (document.mimeType) { // Если есть mimeType в данных
      return document.mimeType === 'application/pdf'; // Проверяем MIME тип
    }
    // Если mimeType нет, проверяем расширение
    const ext = getFileExtension(document.filePath); // Получаем расширение
    return ext === 'pdf'; // PDF файл
  };

  // Функция проверки является ли файл изображением
  const isImageDocument = (document) => { // Функция проверки типа изображения
    // Проверяем сначала mimeType (более надёжно для зашифрованных файлов)
    if (document.mimeType) { // Если есть mimeType в данных
      return document.mimeType.startsWith('image/'); // Проверяем что MIME начинается с 'image/'
    }
    // Если mimeType нет, проверяем расширение
    const ext = getFileExtension(document.filePath); // Получаем расширение
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext); // Поддерживаемые форматы изображений
  };

  const resolveDocumentId = (doc, index) => {
    if (doc?.fileId) {
      return doc.fileId;
    }
    if (typeof doc?.id === 'number') {
      return doc.id;
    }
    if (typeof doc?.id === 'string') {
      const numeric = parseInt(doc.id.replace(/\D+/g, ''), 10);
      if (!Number.isNaN(numeric)) {
        return numeric;
      }
    }
    return index;
  };

  const normalizeStatus = (status) => {
    if (!status) return 'pending';
    const normalized = status.toLowerCase().trim();
    if (normalized === 'approve' || normalized === 'approved') {
      return 'approved';
    }
    if (normalized === 'not approve' || normalized === 'notapprove' || normalized === 'rejected') {
      return 'notApprove';
    }
    if (normalized === 'pending' || normalized === 'under review') {
      return 'pending';
    }
    return 'pending';
  };

  // Создаем карту продуктов для проверки устаревших документов
  const productMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(products) && products.length > 0) {
      products.forEach((product) => {
        if (product?.investment_rules_updated_at) {
          if (product.ticker) {
            const tickerLower = product.ticker.toLowerCase();
            map.set(`investmentrules-${tickerLower}`, product);
          }
          if (product.type) {
            const typeSlug = product.type.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            if (typeSlug) {
              map.set(`investmentrules-${typeSlug}`, product);
            }
          }
        }
      });
    }
    return map;
  }, [products]);

  // Функция проверки устаревания документа
  const checkDocumentOutdated = (doc) => {
    // Если это не документ инвестиционных правил, не проверяем устаревание
    if (!doc.kind || !doc.kind.toLowerCase().startsWith('investmentrules-')) {
      return false;
    }

    // Всегда проверяем по датам для точности, игнорируя флаг isOutdated из бэкенда
    // (флаг может быть устаревшим из-за кэширования или других проблем)
    // КРИТИЧНО: Сравниваем время в московском часовом поясе, так как все время сохраняется в московском времени
    if (doc.createdAt) {
      const kindLower = doc.kind.toLowerCase();
      const product = productMap.get(kindLower);
      
      if (product && product.investment_rules_updated_at) {
        // Парсим даты, убеждаясь что они в правильном формате
        // doc.createdAt может быть строкой ISO или Date объектом
        // product.investment_rules_updated_at тоже может быть строкой или Date
        const docCreatedAtRaw = doc.createdAt;
        const rulesUpdatedAtRaw = product.investment_rules_updated_at;
        
        const docCreatedAt = new Date(docCreatedAtRaw);
        const rulesUpdatedAt = new Date(rulesUpdatedAtRaw);
        
        // Проверяем, что даты корректно распарсились
        if (isNaN(docCreatedAt.getTime()) || isNaN(rulesUpdatedAt.getTime())) {
          console.error(`❌ UserDocs: Ошибка парсинга дат для документа ${doc.kind} (ID: ${doc.id}):`, {
            docCreatedAtRaw: docCreatedAtRaw,
            rulesUpdatedAtRaw: rulesUpdatedAtRaw,
            docCreatedAtParsed: docCreatedAt.toISOString(),
            rulesUpdatedAtParsed: rulesUpdatedAt.toISOString()
          });
          return false; // Если даты некорректны, считаем документ актуальным
        }
        
        // КРИТИЧНО: Сравниваем даты в московском времени
        // При сохранении сервер передает время с московским offset (+03:00), PostgreSQL конвертирует в UTC
        // При чтении Sequelize возвращает UTC, поэтому преобразуем обе даты в московское время для сравнения
        const getMoscowTimeFromUTC = (date) => {
          const utcDate = date instanceof Date ? date : new Date(date);
          
          if (isNaN(utcDate.getTime())) {
            return null;
          }
          
          // Форматируем UTC дату в московское время
          const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Moscow',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            fractionalSecondDigits: 3,
            hour12: false
          });
          
          const parts = formatter.formatToParts(utcDate);
          const year = parts.find(p => p.type === 'year').value;
          const month = parts.find(p => p.type === 'month').value;
          const day = parts.find(p => p.type === 'day').value;
          const hour = parts.find(p => p.type === 'hour').value;
          const minute = parts.find(p => p.type === 'minute').value;
          const second = parts.find(p => p.type === 'second').value;
          const fractionalSecond = parts.find(p => p.type === 'fractionalSecond')?.value || '000';
          
          // Создаем новую дату из московских компонентов (интерпретируем как локальное время для сравнения)
          return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.${fractionalSecond}`);
        };
        
        const docMoscowTime = getMoscowTimeFromUTC(docCreatedAt);
        const rulesMoscowTime = getMoscowTimeFromUTC(rulesUpdatedAt);
        
        if (!docMoscowTime || !rulesMoscowTime) {
          console.error(`📄 UserDocs: Ошибка преобразования дат в московское время для документа ${doc.kind}`);
          return false;
        }
        
        const docTime = docMoscowTime.getTime(); // Московское время
        const rulesTime = rulesMoscowTime.getTime(); // Московское время
        
        // КРИТИЧНО: Используем запас в 60 секунд (1 минута) на случай проблем с часовыми поясами,
        // расхождений при сохранении в БД, или если документ загружен почти одновременно с обновлением правил.
        // Документ считается устаревшим ТОЛЬКО если он загружен ЗАМЕТНО РАНЬШЕ обновления правил (по московскому времени).
        const timeDiff = rulesTime - docTime;
        const SAFETY_MARGIN_MS = 60 * 1000; // 60 секунд запас
        const isOutdated = timeDiff > SAFETY_MARGIN_MS; // Разница больше 60 секунд
        
        console.log(`📄 UserDocs: Проверка устаревания для документа ${doc.kind} (ID: ${doc.id}) в московском времени:`, {
          docCreatedAtRaw: docCreatedAtRaw,
          rulesUpdatedAtRaw: rulesUpdatedAtRaw,
          docCreatedAtUTC: docCreatedAt.toISOString(),
          rulesUpdatedAtUTC: rulesUpdatedAt.toISOString(),
          docMoscowTime: docMoscowTime.toISOString(),
          rulesMoscowTime: rulesMoscowTime.toISOString(),
          docTimestamp: docTime,
          rulesTimestamp: rulesTime,
          timeDiffMs: timeDiff,
          timeDiffSeconds: Math.round(timeDiff / 1000),
          timeDiffMinutes: Math.round(timeDiff / 60000),
          isOutdated: isOutdated,
          isOutdatedFromBackend: doc?.isOutdated,
          kindLower: kindLower,
          productTicker: product.ticker,
          productType: product.type
        });
        
        if (isOutdated) {
          console.log(`📄 UserDocs: ✅ Документ ${doc.kind} (ID: ${doc.id}) УСТАРЕЛ по московскому времени - загружен ДО обновления правил (разница: ${Math.round(timeDiff / 1000)} сек = ${Math.round(timeDiff / 60000)} мин)`);
          return true;
        } else {
          console.log(`✅ UserDocs: Документ ${doc.kind} (ID: ${doc.id}) АКТУАЛЕН по московскому времени - загружен ПОСЛЕ обновления правил (разница: ${Math.round(-timeDiff / 1000)} сек = ${Math.round(-timeDiff / 60000)} мин)`);
          return false;
        }
      } else {
        console.log(`⚠️ UserDocs: Не найдено продукта или investment_rules_updated_at для документа ${doc.kind} (ID: ${doc.id})`, {
          hasProduct: !!product,
          hasUpdatedAt: !!(product && product.investment_rules_updated_at),
          docId: doc.id,
          kindLower: kindLower,
          productMapKeys: Array.from(productMap.keys())
        });
        // Если продукт не найден или нет даты обновления, документ считается актуальным
        return false;
      }
    } else {
      console.log(`⚠️ UserDocs: У документа ${doc.kind} (ID: ${doc.id}) нет createdAt, считаем актуальным`);
      return false;
    }
  };

  const documents = useMemo(() => {
    const list = user.documents || [];
    return list.map((doc, idx) => {
      const labelKind = doc.kind || doc.type || 'document';
      const isOutdated = checkDocumentOutdated(doc);
      const statusClass = isOutdated ? 'outdated' : normalizeStatus(doc.status);
      
      return {
        ...doc,
        _internalId: `${doc.id || 'doc'}-${doc.filePath || doc.originalName || idx}`,
        _resolvedId: resolveDocumentId(doc, idx),
        _statusClass: statusClass,
        _labelKind: labelKind,
        _isOutdated: isOutdated
      };
    });
  }, [user.documents, productMap]);

  return (
    <div className="admin-user-portfolio-list-item flex flex-column bru-max gradient-border bg-color-lilac user-docs active-tab">
      <div className="admin-user-portfolio-document-scroll">
        <div className="admin-user-portfolio-document-grid">
          {documents.length > 0 ? documents.map((document) => (
            <div
              key={document._internalId}
              className={`admin-user-portfolio-document-item gradient-border admin-user-portfolio-document-item--${document._statusClass}`}
            >
              <div className="admin-user-portfolio-document-item-header">
                <div className={`admin-user-portfolio-document-status admin-user-portfolio-document-status--${document._statusClass}`}>
                  {getStatusLabel(document.status, document._isOutdated)}
                </div>
                <div className="admin-user-portfolio-document-item-title">
                  {(document.kind || document.type || 'DOC').toUpperCase()} #{document._resolvedId ?? document.id}
                  {document._isOutdated && ' (Устаревший)'}
                </div>
                <div className="admin-user-portfolio-document-meta">
                  📅 {formatDate(document.createdAt)}
                </div>
              </div>
              {document && document.status ? (
                <>
                  <div className="admin-user-portfolio-document-item-preview">
                    {isImageDocument(document) && (
                    <img 
                      src={getDocumentImageSrc(document)}
                      alt={`${document.type} document`}
                      className="admin-user-portfolio-document-item-view bru pointer img"
                      onClick={() => handleDocumentClick(document, 'image')}
                      onError={(e) => handleImageError(document, e)}
                    />
                  )}
                  {isPdfDocument(document) && document.type === 'passport' && (
                    <img 
                      src={getDocumentImageSrc(document, true)}
                      alt="Passport PDF document"
                      className="admin-user-portfolio-document-item-view bru pointer img"
                      onClick={() => handleDocumentClick(document, 'pdf')}
                      onError={(e) => handleImageError(document, e)}
                    />
                  )}
                  {isPdfDocument(document) && document.type !== 'passport' && (
                    <img 
                      src={getDocumentImageSrc(document, true)}
                      alt={`${document.type} PDF document`}
                      className="admin-user-portfolio-document-item-view bru pointer img"
                      onClick={() => handleDocumentClick(document, 'pdf')}
                      onError={(e) => handleImageError(document, e)}
                    />
                  )}
                  {!isImageDocument(document) && !isPdfDocument(document) && (
                    <div 
                      className="admin-user-portfolio-document-item-view bru pointer flex" 
                      onClick={() => handleDocumentClick(document, 'other')}
                      style={{
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: '#f0f0f0',
                        minHeight: '150px',
                        padding: '1rem'
                      }}
                    >
                      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📎</div>
                      <div style={{ fontSize: '0.8rem', textAlign: 'center', marginBottom: '0.5rem' }}>
                        Файл ({getFileExtension(document.filePath).toUpperCase()})
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#666', textAlign: 'center' }}>
                        Нажмите для просмотра
                      </div>
                    </div>
                  )}
                    
                    {document.type !== 'passport' && (
                      <button
                        style={{
                          position: 'absolute',
                          top: '0.5rem',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          padding: '0.3rem 0.6rem',
                          backgroundColor: 'rgba(76, 175, 80, 0.95)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.7rem',
                          fontWeight: 'bold',
                          textAlign: 'center',
                          cursor: 'pointer',
                          zIndex: 10,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                        }}
                        onClick={async (e) => {
                          e.stopPropagation();
                          
                          try {
                            const freshToken = await getFreshToken();
                            const url = `/admin/documents/${document.filePath}`;
                            
                            const response = await axiosAPI.get(url, {
                              responseType: 'blob',
                              params: {
                                token: freshToken,
                                t: Date.now(),
                                download: 'true'
                              }
                            });
                            
                            // Получаем имя файла из заголовка Content-Disposition или используем оригинальное имя
                            const contentDisposition = response.headers['content-disposition'];
                            let filename = document.originalName || `document-${document.id}.${getFileExtension(document.filePath)}`;
                            
                            if (contentDisposition) {
                              const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/);
                              if (filenameMatch) {
                                filename = decodeURIComponent(filenameMatch[1]);
                              }
                            }
                            
                            // Получаем MIME-тип из заголовка Content-Type
                            const contentType = response.headers['content-type'] || 'application/octet-stream';
                            const blob = new Blob([response.data], { type: contentType });
                            
                            const blobUrl = window.URL.createObjectURL(blob);
                            
                            const link = window.document.createElement('a');
                            link.href = blobUrl;
                            link.setAttribute('download', filename);
                            link.style.display = 'none';
                            window.document.body.appendChild(link);
                            link.click();
                            window.document.body.removeChild(link);
                            
                            // Освобождаем память
                            window.URL.revokeObjectURL(blobUrl);
                            
                            console.log(`✅ Документ скачан: ${filename}`);
                          } catch (error) {
                            console.error(`❌ Ошибка скачивания:`, error);
                            if (window.document && window.document.dispatchEvent) {
                              window.document.dispatchEvent(new CustomEvent('main-notify', {
                                detail: {
                                  type: 'error',
                                  text: `Ошибка скачивания документа: ${error.response?.data?.message || error.message || 'Неизвестная ошибка'}`
                                }
                              }));
                            } else {
                              console.error('Не удалось отправить уведомление: document.dispatchEvent недоступен');
                            }
                          }
                        }}
                      >
                        📥 Скачать {/* Текст кнопки */}
                      </button>
                    )}
                  </div>
                  
                  {/* Кнопки утверждения/отклонения для всех типов документов, или кнопка удаления для устаревших */}
                  {document._isOutdated ? (
                    <div className="admin-user-portfolio-document-item-buttons flex flex-row">
                      <div 
                        className="admin-user-portfolio-document-item-buttons-item bru flex pointer"
                        style={{
                          backgroundColor: '#f44336',
                          color: 'white',
                          width: '100%',
                          justifyContent: 'center'
                        }}
                        onClick={() => onDocumentDelete && onDocumentDelete(document._resolvedId ?? document.id, document.kind || document.type)}
                      >
                        🗑️ Удалить
                      </div>
                    </div>
                  ) : (
                    <div className="admin-user-portfolio-document-item-buttons flex flex-row">
                      <div 
                        className="admin-user-portfolio-document-item-buttons-item bru flex pointer approve"
                        onClick={() => onDocumentAction(document._resolvedId ?? document.id, document.kind || document.type, 'approve')}
                      >
                        утвердить
                      </div>
                      <div 
                        className="admin-user-portfolio-document-item-buttons-item bru flex pointer unapprove"
                        onClick={() => onDocumentAction(document._resolvedId ?? document.id, document.kind || document.type, 'reject')}
                      >
                        отклонить
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="admin-user-portfolio-document-item-no-doc">
                  Документ не загружен
                </div>
              )}
            </div>
          )) : (
            <div className="admin-user-portfolio-document-empty">
              Документы не найдены
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDocs;
