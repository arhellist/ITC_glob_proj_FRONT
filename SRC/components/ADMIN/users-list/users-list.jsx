import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import adminService from '../../../JS/services/admin-service.js';
import adminAuthService from '../../../JS/services/admin-auth-service.js';
import { PERMISSIONS } from '../../../JS/constants/admin-permissions.js';
import AboutUserModal from './modal-about-user/modal-about-user.jsx';
import UserCard from './UserCard.jsx';
import './UsersList.css';

const normalizeDocKey = (value = '') => value.toString().toLowerCase();
const normalizeStatusValue = (value = '') => value.toString().trim().toLowerCase();

const BASE_DOCUMENT_DEFINITIONS = [
  {
    key: 'doc-passport',
    kind: 'PASPORT',
    label: 'P',
    title: 'Паспорт',
    synonyms: ['pasport', 'passport', 'паспорт', 'doc-passport'],
  },
  {
    key: 'doc-bank',
    kind: 'bank-information',
    label: 'B',
    title: 'Справка банка',
    synonyms: ['bank-information', 'bank_information', 'doc-bank'],
  },
];

const normalizeTickerLabel = (ticker = '', fallback = '') => {
  const prepared = ticker.toString().trim().toUpperCase();
  if (prepared.length >= 2) {
    return prepared.slice(0, 4);
  }
  const alt = fallback.toString().trim().toUpperCase();
  return alt ? alt.slice(0, 4) : 'PR';
};

const sanitizeKindName = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '');

const resolveDocumentStatus = (documents = [], docDefinition) => {
  if (!docDefinition) {
    return 'empty';
  }

  const targetKeys = [docDefinition.kind, ...(docDefinition.synonyms || [])]
    .filter(Boolean)
    .map((key) => normalizeDocKey(key));

  const relevantDocs = (documents || []).filter((doc) => {
    const docKind = normalizeDocKey(doc?.kind || doc?.type);
    return targetKeys.includes(docKind);
  });

  if (!relevantDocs.length) {
    return 'empty';
  }

  // Сортируем документы по дате (новые первые)
  const sortedDocs = [...relevantDocs].sort(
    (a, b) =>
      new Date(b?.updatedAt || b?.createdAt || 0) -
      new Date(a?.updatedAt || a?.createdAt || 0)
  );

  // Проверяем устаревшие документы, используя investment_rules_updated_at из определения продукта
  // или флаг isOutdated из документа
  const investmentRulesUpdatedAt = docDefinition?.investmentRulesUpdatedAt;
  const checkOutdated = (doc) => {
    // Сначала проверяем флаг из бэкенда
    if (doc?.isOutdated === true) {
      console.log(`📄 UsersList: Документ ${doc?.kind || doc?.type} помечен как устаревший (флаг isOutdated)`);
      return true;
    }
    
    // Если флага нет, проверяем по дате (только для инвестиционных правил)
    if (investmentRulesUpdatedAt && doc?.createdAt) {
      const docKind = normalizeDocKey(doc?.kind || doc?.type);
      const isInvestmentRules = targetKeys.some(key => 
        docKind === normalizeDocKey(key) && key.toLowerCase().startsWith('investmentrules-')
      );
      
      if (isInvestmentRules) {
        const docCreatedAt = new Date(doc.createdAt);
        const rulesUpdatedAt = new Date(investmentRulesUpdatedAt);
        
        console.log(`📄 UsersList: Проверка устаревания для документа ${doc?.kind || doc?.type}:`, {
          docCreatedAt: docCreatedAt.toISOString(),
          rulesUpdatedAt: rulesUpdatedAt.toISOString(),
          docCreatedTimestamp: docCreatedAt.getTime(),
          rulesUpdatedTimestamp: rulesUpdatedAt.getTime(),
          isOutdated: docCreatedAt < rulesUpdatedAt,
          investmentRulesUpdatedAt: investmentRulesUpdatedAt
        });
        
        if (docCreatedAt < rulesUpdatedAt) {
          console.log(`📄 UsersList: ✅ Документ ${doc?.kind || doc?.type} УСТАРЕЛ (дата проверка)`);
          return true;
        }
      }
    } else if (investmentRulesUpdatedAt) {
      console.log(`📄 UsersList: Недостаточно данных для проверки устаревания документа ${doc?.kind || doc?.type}:`, {
        hasInvestmentRulesUpdatedAt: !!investmentRulesUpdatedAt,
        hasDocCreatedAt: !!doc?.createdAt
      });
    }
    
    return false;
  };

  // Проверяем, есть ли актуальные документы (не устаревшие)
  const actualDocs = sortedDocs.filter(doc => !checkOutdated(doc));
  const latestDoc = actualDocs.length > 0 ? actualDocs[0] : sortedDocs[0];
  const isLatestDocOutdated = checkOutdated(latestDoc);

  // Если все документы устарели, возвращаем 'outdated'
  if (isLatestDocOutdated) {
    const hasActualDocs = sortedDocs.some(doc => !checkOutdated(doc));
    if (!hasActualDocs) {
      return 'outdated';
    }
  }

  const normalizedStatus = normalizeStatusValue(latestDoc?.status);

  if (normalizedStatus === 'approve' || normalizedStatus === 'approved') {
    // Если документ утвержден, но устарел, возвращаем 'outdated'
    if (isLatestDocOutdated) {
      return 'outdated';
    }
    return 'approved';
  }

  if (
    normalizedStatus === 'not approve' ||
    normalizedStatus === 'notapprove' ||
    normalizedStatus === 'rejected'
  ) {
    // Если документ отклонен, но устарел, возвращаем 'outdated'
    if (isLatestDocOutdated) {
      return 'outdated';
    }
    return 'rejected';
  }

  if (!normalizedStatus || normalizedStatus === 'pending' || normalizedStatus === 'under review') {
    // Если документ на проверке, но устарел, возвращаем 'outdated'
    if (isLatestDocOutdated) {
      return 'outdated';
    }
    return 'pending';
  }

  return isLatestDocOutdated ? 'outdated' : 'pending';
};

const toggleListValue = (list, value) =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

const UsersList = () => {
  const [users, setUsers] = useState([]); // Состояние списка пользователей
  const [loading, setLoading] = useState(true); // Состояние загрузки
  const [error, setError] = useState(null); // Состояние ошибки
  const [products, setProducts] = useState([]);
  const [searchEmail, setSearchEmail] = useState(''); // Состояние поиска по email (локальное, для отображения в input)
  const [searchSurname, setSearchSurname] = useState(''); // Состояние поиска по фамилии (локальное)
  const [debouncedEmail, setDebouncedEmail] = useState(''); // Debounced значение email для API запроса
  const [debouncedSurname, setDebouncedSurname] = useState(''); // Debounced значение surname для API запроса
  const [selectedUser, setSelectedUser] = useState(null); // Состояние выбранного пользователя для модального окна
  const [loadingMore, setLoadingMore] = useState(false);
  const [missingFilters, setMissingFilters] = useState([]);
  const [rejectedFilters, setRejectedFilters] = useState([]);
  const [pendingFilters, setPendingFilters] = useState([]);
  
  // Состояние пагинации
  const [currentPage, setCurrentPage] = useState(1); // Текущая страница пагинации
  const [totalPages, setTotalPages] = useState(1); // Общее количество страниц
  const [totalUsers, setTotalUsers] = useState(0); // Общее количество пользователей
  const usersPerPage = 50; // Количество пользователей на странице
  const hasMore = currentPage < totalPages;
  
  // Refs для debounce таймеров
  const emailDebounceTimer = useRef(null); // Ref для хранения таймера debounce email
  const surnameDebounceTimer = useRef(null); // Ref для хранения таймера debounce surname
  const contentRef = useRef(null);
  const loaderRef = useRef(null);

  const handleToggleMissing = useCallback((typeKey) => {
    const normalized = normalizeDocKey(typeKey);
    setMissingFilters((prev) => toggleListValue(prev, normalized));
  }, []);

  const handleToggleRejected = useCallback((typeKey) => {
    const normalized = normalizeDocKey(typeKey);
    setRejectedFilters((prev) => toggleListValue(prev, normalized));
  }, []);

  const handleTogglePending = useCallback((typeKey) => {
    const normalized = normalizeDocKey(typeKey);
    setPendingFilters((prev) => toggleListValue(prev, normalized));
  }, []);

  // Функция для добавления нового документа к пользователю
  const addDocumentToUser = useCallback((userData, payload) => {
    if (!userData || !payload || !payload.document) {
      return userData;
    }

    const documents = Array.isArray(userData.documents) ? [...userData.documents] : [];
    const newDoc = payload.document;
    
    // Проверяем, нет ли уже такого документа
    const existingIndex = documents.findIndex((doc) => doc.id === newDoc.id);
    if (existingIndex >= 0) {
      // Если документ уже есть, обновляем его
      documents[existingIndex] = { ...documents[existingIndex], ...newDoc };
    } else {
      // Если документа нет, добавляем новый
      documents.push(newDoc);
    }

    return {
      ...userData,
      documents,
    };
  }, []);

  const mergeDocumentUpdate = useCallback((userData, payload) => {
    if (!userData || !payload) {
      return userData;
    }

    const documentId = payload.documentId;
    const status = payload.status;

    if (!documentId || !status) {
      return userData;
    }

    const normalizedType =
      payload.document?.type ||
      payload.documentType ||
      payload.documentKind ||
      null;

    const normalizedKind =
      payload.document?.kind ||
      payload.documentKind ||
      normalizedType ||
      'document';

    const updatedAt =
      payload.document?.updatedAt ||
      payload.updatedAt ||
      new Date().toISOString();

    const createdAt = payload.document?.createdAt || updatedAt;
    const filePath = payload.document?.filePath || null;

    const documents = Array.isArray(userData.documents) ? [...userData.documents] : [];
    const targetIndex = documents.findIndex((doc) => {
      if (doc.id !== documentId) {
        return false;
      }
      if (!normalizedType || !doc.type) {
        return true;
      }
      return normalizeDocKey(doc.type) === normalizeDocKey(normalizedType);
    });

    const existingDoc = targetIndex >= 0 ? documents[targetIndex] : null;
    const resolvedType = normalizedType || existingDoc?.type || normalizedKind;

    const mergedDoc = {
      ...existingDoc,
      id: documentId,
      type: resolvedType,
      kind: normalizedKind,
      status,
      updatedAt,
    };

    if (!mergedDoc.createdAt) {
      mergedDoc.createdAt = createdAt;
    }

    if (filePath && !mergedDoc.filePath) {
      mergedDoc.filePath = filePath;
    }

    if (targetIndex >= 0) {
      documents[targetIndex] = mergedDoc;
    } else {
      documents.push(mergedDoc);
    }

    return { ...userData, documents };
  }, []);

  const productDocDefinitions = useMemo(() => {
    if (!Array.isArray(products) || !products.length) {
      return [];
    }

    return products
      .filter((product) => product?.investment_rules_required !== false)
      .map((product) => {
        const tickerLabel = normalizeTickerLabel(product?.ticker, product?.type);
        const kindKey = sanitizeKindName(product?.ticker || product?.type || `product-${product?.id}`);
        const baseKind = `investmentrules-${kindKey}`;
        const synonyms = Array.from(
          new Set(
            [
              baseKind,
              `investmentrules-${sanitizeKindName(product?.type || '')}`,
              `investmentrules-${sanitizeKindName(product?.ticker || '')}`,
            ].filter(Boolean)
          )
        );

        return {
          key: `product-${product?.id ?? kindKey}`,
          kind: baseKind,
          label: tickerLabel,
          title: product?.type ? `Инвест. правила ${product.type}` : `Инвест. правила ${tickerLabel}`,
          productId: product?.id,
          currency: product?.currency,
          investmentRulesPath: product?.investment_rules_path || '',
          investmentRulesUpdatedAt: product?.investment_rules_updated_at || null,
          synonyms,
        };
      });
  }, [products]);

  const docDefinitions = useMemo(
    () => [...BASE_DOCUMENT_DEFINITIONS, ...productDocDefinitions],
    [productDocDefinitions]
  );

  // Обработчик клика на label - включает/выключает все фильтры этого типа
  const handleToggleAllMissing = useCallback(() => {
    if (missingFilters.length === docDefinitions.length) {
      setMissingFilters([]);
    } else {
      const allKeys = docDefinitions.map(def => normalizeDocKey(def.key));
      setMissingFilters(allKeys);
    }
  }, [missingFilters, docDefinitions]);

  const handleToggleAllRejected = useCallback(() => {
    if (rejectedFilters.length === docDefinitions.length) {
      setRejectedFilters([]);
    } else {
      const allKeys = docDefinitions.map(def => normalizeDocKey(def.key));
      setRejectedFilters(allKeys);
    }
  }, [rejectedFilters, docDefinitions]);

  const handleToggleAllPending = useCallback(() => {
    if (pendingFilters.length === docDefinitions.length) {
      setPendingFilters([]);
    } else {
      const allKeys = docDefinitions.map(def => normalizeDocKey(def.key));
      setPendingFilters(allKeys);
    }
  }, [pendingFilters, docDefinitions]);

  const docDefinitionMap = useMemo(() => {
    const map = new Map();
    docDefinitions.forEach((definition) => {
      map.set(normalizeDocKey(definition.key), definition);
    });
    return map;
  }, [docDefinitions]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const productList = await adminService.getProductsList();
        if (!mounted) {
          return;
        }
        setProducts(Array.isArray(productList) ? productList : []);
      } catch (err) {
        console.error('UsersList: Ошибка загрузки продуктов для фильтров документов', err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleUserUpdate = useCallback((updatedUser) => {
    if (!updatedUser || !updatedUser.id) {
      return;
    }

    setUsers((prev) =>
      prev.map((user) => (user.id === updatedUser.id ? { ...user, ...updatedUser } : user))
    );

    setSelectedUser((prev) =>
      prev && prev.id === updatedUser.id ? { ...prev, ...updatedUser } : prev
    );
  }, []);

  // Для админ-панели не добавляем никаких обработчиков - используем только стандартное поведение браузера
  
  // Debounce для email - обновляем debouncedEmail с задержкой 500мс после окончания ввода
  useEffect(() => { // Хук useEffect для debounce email
    if (emailDebounceTimer.current) { // Если таймер уже установлен
      clearTimeout(emailDebounceTimer.current); // Очищаем предыдущий таймер
    }
    
    emailDebounceTimer.current = setTimeout(() => { // Устанавливаем новый таймер
      console.log('UsersList: Debounce email, обновляем debouncedEmail:', searchEmail); // Логируем обновление
      setDebouncedEmail(searchEmail); // Обновляем debounced значение через 500мс
    }, 500); // Задержка 500 миллисекунд
    
    return () => { // Cleanup функция при размонтировании или изменении searchEmail
      if (emailDebounceTimer.current) { // Если таймер активен
        clearTimeout(emailDebounceTimer.current); // Очищаем таймер
      }
    };
  }, [searchEmail]); // Зависимость: локальное значение searchEmail
  
  // Debounce для surname - обновляем debouncedSurname с задержкой 500мс
  useEffect(() => { // Хук useEffect для debounce surname
    if (surnameDebounceTimer.current) { // Если таймер уже установлен
      clearTimeout(surnameDebounceTimer.current); // Очищаем предыдущий таймер
    }
    
    surnameDebounceTimer.current = setTimeout(() => { // Устанавливаем новый таймер
      console.log('UsersList: Debounce surname, обновляем debouncedSurname:', searchSurname); // Логируем обновление
      setDebouncedSurname(searchSurname); // Обновляем debounced значение через 500мс
    }, 500); // Задержка 500 миллисекунд
    
    return () => { // Cleanup функция при размонтировании или изменении searchSurname
      if (surnameDebounceTimer.current) { // Если таймер активен
        clearTimeout(surnameDebounceTimer.current); // Очищаем таймер
      }
    };
  }, [searchSurname]); // Зависимость: локальное значение searchSurname
  
  // Функция для очистки всех фильтров
  const clearFilters = () => { // Функция сброса всех фильтров
    setSearchEmail(''); // Очищаем поле email
    setSearchSurname(''); // Очищаем поле surname
    setDebouncedEmail(''); // Сбрасываем debounced email
    setDebouncedSurname(''); // Сбрасываем debounced surname
    setMissingFilters([]);
    setRejectedFilters([]);
    setPendingFilters([]);
  };

  // Функция для открытия модального окна пользователя
  const handleUserClick = (user) => {
    setSelectedUser(user);
  };

  // Функция для закрытия модального окна
  const handleCloseModal = () => {
    setSelectedUser(null);
  };

  const loadUsers = useCallback(async (page) => { // Функция загрузки пользователей с бэкенда
    const isFirstPage = page === 1;
    if (isFirstPage) {
      setLoading(true);
      setError(null);
    } else {
      setLoadingMore(true);
    }

    try {
      const response = await adminService.getUsersList(page, usersPerPage, debouncedEmail, debouncedSurname); // Запрашиваем пользователей с debounced фильтрами
      console.log('UsersList: Получены данные пользователей:', response); // Логируем ответ

      const freshUsers = response.users || [];
      setUsers((prev) => {
        if (isFirstPage) {
          return freshUsers;
        }
        const existingIds = new Set(prev.map((item) => item.id));
        const merged = [...prev];
        freshUsers.forEach((item) => {
          if (!existingIds.has(item.id)) {
            merged.push(item);
          }
        });
        return merged;
      });

      setTotalPages(response.pagination?.totalPages || 1); // Устанавливаем общее количество страниц
      setTotalUsers(response.pagination?.totalUsers || 0); // Устанавливаем общее количество пользователей
    } catch (err) { // Обработка ошибок
      console.error('Ошибка загрузки пользователей:', err); // Логируем ошибку
      if (isFirstPage) {
        setError('Ошибка загрузки данных'); // Устанавливаем сообщение об ошибке
        setUsers([]);
      }
    } finally {
      if (isFirstPage) {
        setLoading(false);
      } else {
        setLoadingMore(false);
      }
    }
  }, [usersPerPage, debouncedEmail, debouncedSurname]); // Зависимости: лимит, DEBOUNCED фильтры

  // Загрузка пользователей при монтировании компонента, изменении страницы или debounced фильтров
  useEffect(() => { // Хук useEffect для автоматической загрузки
    loadUsers(currentPage); // Вызываем функцию загрузки пользователей
  }, [currentPage, loadUsers]); // Зависимости: страница, функция загрузки

  // При изменении DEBOUNCED фильтров сбрасываем на первую страницу
  useEffect(() => {
    setUsers([]);
    setTotalPages(1);
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
    setCurrentPage(1);
  }, [debouncedEmail, debouncedSurname]);

  // Фильтрация по статусам документов (не загружено / отклонено / непроверено)
  // Принцип "хотя бы один" - показываем клиентов, у которых хотя бы один документ соответствует фильтру
  const filteredUsers = useMemo(() => {
    if (missingFilters.length === 0 && rejectedFilters.length === 0 && pendingFilters.length === 0) {
      return users;
    }

    return users.filter((user) => {
      const documents = user?.documents || [];
      const statusCache = {};

      const getStatus = (key) => {
        const normalizedKey = normalizeDocKey(key);
        if (!statusCache[normalizedKey]) {
          const definition = docDefinitionMap.get(normalizedKey);
          statusCache[normalizedKey] = resolveDocumentStatus(documents, definition);
        }
        return statusCache[normalizedKey];
      };

      // Фильтр "НЕЗАГРУЖЕННЫЕ" - хотя бы один документ должен быть незагружен
      if (missingFilters.length > 0) {
        const hasMissing = missingFilters.some(typeKey => {
          return getStatus(typeKey) === 'empty';
        });
        if (!hasMissing) {
          return false;
        }
      }

      // Фильтр "ОТКЛОНЕННЫЕ" - хотя бы один документ должен быть отклонен
      if (rejectedFilters.length > 0) {
        const hasRejected = rejectedFilters.some(typeKey => {
          return getStatus(typeKey) === 'rejected';
        });
        if (!hasRejected) {
          return false;
        }
      }

      // Фильтр "НЕПРОВЕРЕННЫЕ" - хотя бы один документ должен быть непроверен
      if (pendingFilters.length > 0) {
        const hasPending = pendingFilters.some(typeKey => {
          return getStatus(typeKey) === 'pending';
        });
        if (!hasPending) {
          return false;
        }
      }

      return true;
    });
  }, [users, missingFilters, rejectedFilters, pendingFilters, docDefinitionMap]);

  const canViewUsers = adminAuthService.hasPermission(PERMISSIONS.VIEW_USERS);
  const hasFiltersApplied =
    Boolean(searchEmail || searchSurname) ||
    missingFilters.length > 0 ||
    rejectedFilters.length > 0 ||
    pendingFilters.length > 0;

  useEffect(() => {
    const root = contentRef.current;
    const loader = loaderRef.current;

    if (!root || !loader) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      {
        root,
        rootMargin: '200px',
        threshold: 0,
      }
    );

    observer.observe(loader);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loading, loadingMore]);

  // Обработчик события загрузки нового документа
  useEffect(() => {
    const handleDocumentUploaded = (event) => {
      const payload = event.detail;
      console.log('📄 UsersList: Получено событие admin-document-uploaded:', payload);
      
      if (!payload || !payload.userId || !payload.document) {
        console.warn('📄 UsersList: Некорректные данные в событии admin-document-uploaded:', payload);
        return;
      }

      setUsers((prev) => {
        let hasChanges = false;
        const updated = prev.map((user) => {
          if (user.id !== payload.userId) {
            return user;
          }
          const merged = addDocumentToUser(user, payload);
          if (merged !== user) {
            hasChanges = true;
            console.log('📄 UsersList: Обновлен пользователь с новым документом:', {
              userId: user.id,
              documentId: payload.document.id,
              documentKind: payload.document.kind
            });
          }
          return merged;
        });
        return hasChanges ? updated : prev;
      });

      setSelectedUser((prev) => {
        if (!prev || prev.id !== payload.userId) {
          return prev;
        }
        return addDocumentToUser(prev, payload);
      });
    };

    document.addEventListener('admin-document-uploaded', handleDocumentUploaded);
    console.log('📄 UsersList: Зарегистрирован обработчик admin-document-uploaded');
    
    return () => {
      document.removeEventListener('admin-document-uploaded', handleDocumentUploaded);
      console.log('📄 UsersList: Удален обработчик admin-document-uploaded');
    };
  }, [addDocumentToUser]);

  useEffect(() => {
    const handleDocumentStatusUpdate = (event) => {
      const payload = event.detail;
      if (!payload || !payload.userId) {
        return;
      }

      setUsers((prev) => {
        let hasChanges = false;
        const updated = prev.map((user) => {
          if (user.id !== payload.userId) {
            return user;
          }
          const merged = mergeDocumentUpdate(user, payload);
          if (merged !== user) {
            hasChanges = true;
          }
          return merged;
        });
        return hasChanges ? updated : prev;
      });

      setSelectedUser((prev) => {
        if (!prev || prev.id !== payload.userId) {
          return prev;
        }
        return mergeDocumentUpdate(prev, payload);
      });
    };

    document.addEventListener('admin-document-status-updated', handleDocumentStatusUpdate);
    return () => {
      document.removeEventListener('admin-document-status-updated', handleDocumentStatusUpdate);
    };
  }, [mergeDocumentUpdate]);

  // Обработчик обновления файла инвестиционных правил продукта
  useEffect(() => {
    const handleProductRulesUpdated = async (event) => {
      const { productType, productTicker, updatedAt } = event.detail;
      console.log('📄 UsersList: Получено событие обновления правил продукта:', { productType, productTicker, updatedAt });
      
      try {
        // Сначала перезагружаем список продуктов, чтобы получить актуальные investment_rules_updated_at
        console.log('📄 UsersList: Перезагружаем список продуктов после обновления правил');
        const productList = await adminService.getProductsList();
        if (Array.isArray(productList)) {
          setProducts(productList);
          console.log('📄 UsersList: Продукты обновлены:', productList.length);
        }
        
        // Затем перезагружаем список пользователей, чтобы обновить статусы документов
        console.log('📄 UsersList: Перезагружаем список пользователей после обновления правил продукта');
        setCurrentPage((prev) => {
          // Если уже на первой странице, устанавливаем 0, чтобы вызвать перезагрузку
          return prev === 1 ? 0 : 1;
        });
        setUsers([]);
        // Загрузка произойдет автоматически через useEffect для currentPage
      } catch (error) {
        console.error('📄 UsersList: Ошибка при обновлении списка пользователей после обновления правил продукта:', error);
      }
    };

    document.addEventListener('admin-product-investment-rules-updated', handleProductRulesUpdated);
    console.log('📄 UsersList: Зарегистрирован обработчик admin-product-investment-rules-updated');
    
    return () => {
      document.removeEventListener('admin-product-investment-rules-updated', handleProductRulesUpdated);
      console.log('📄 UsersList: Удален обработчик admin-product-investment-rules-updated');
    };
  }, []);

  return (
    <div className="admin-clients-page">
      <header className="admin-clients-header">
        <div className="admin-clients-header__title">
          <h1>Клиенты</h1>
          <span>
            {users.length < totalUsers
              ? `${users.length} из ${totalUsers}`
              : `${totalUsers}`}
          </span>
        </div>

        <div className="admin-clients-filters">
          <div className="admin-clients-filters-left">
            <div className="admin-clients-search">
              <label htmlFor="search-user-email">Поиск по email</label>
              <input
                id="search-user-email"
                type="search"
                placeholder="user@example.com"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
              />
            </div>

            <div className="admin-clients-search">
              <label htmlFor="search-user-surname">Поиск по фамилии</label>
              <input
                id="search-user-surname"
                type="search"
                placeholder="Введите фамилию клиента"
                value={searchSurname}
                onChange={(e) => setSearchSurname(e.target.value)}
              />
            </div>

            {hasFiltersApplied && (
              <button type="button" className="admin-clients-clear" onClick={clearFilters}>
                Сбросить фильтры
              </button>
            )}
          </div>

        <div className="admin-clients-docfilters">
          <div className="admin-clients-docfilter-row">
            <button
              type="button"
              className={`admin-clients-docfilter-label admin-clients-docfilter-label-btn${
                missingFilters.length === docDefinitions.length ? ' is-active' : ''
              }`}
              onClick={handleToggleAllMissing}
              title="Фильтр: хотя бы один незагруженный документ"
            >
              Незагруженные
            </button>
            <div className="admin-clients-docfilter-icons">
              {docDefinitions.map(({ key, label, title }) => {
                const normalizedKey = normalizeDocKey(key);
                const isActive = missingFilters.includes(normalizedKey);
                return (
                  <button
                    key={`missing-${key}`}
                    type="button"
                    className={`admin-clients-docfilter-icon admin-clients-docfilter-icon--missing${
                      isActive ? ' is-active' : ''
                    }`}
                    onClick={() => handleToggleMissing(key)}
                    aria-pressed={isActive}
                    title={`${title} — незагружено`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="admin-clients-docfilter-row">
            <button
              type="button"
              className={`admin-clients-docfilter-label admin-clients-docfilter-label-btn${
                rejectedFilters.length === docDefinitions.length ? ' is-active' : ''
              }`}
              onClick={handleToggleAllRejected}
              title="Фильтр: хотя бы один отклонённый документ"
            >
              Отклонённые
            </button>
            <div className="admin-clients-docfilter-icons">
              {docDefinitions.map(({ key, label, title }) => {
                const normalizedKey = normalizeDocKey(key);
                const isActive = rejectedFilters.includes(normalizedKey);
                return (
                  <button
                    key={`rejected-${key}`}
                    type="button"
                    className={`admin-clients-docfilter-icon admin-clients-docfilter-icon--rejected${
                      isActive ? ' is-active' : ''
                    }`}
                    onClick={() => handleToggleRejected(key)}
                    aria-pressed={isActive}
                    title={`${title} — отклонён`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="admin-clients-docfilter-row">
            <button
              type="button"
              className={`admin-clients-docfilter-label admin-clients-docfilter-label-btn${
                pendingFilters.length === docDefinitions.length ? ' is-active' : ''
              }`}
              onClick={handleToggleAllPending}
              title="Фильтр: хотя бы один непроверенный документ"
            >
              Непроверенные
            </button>
            <div className="admin-clients-docfilter-icons">
              {docDefinitions.map(({ key, label, title }) => {
                const normalizedKey = normalizeDocKey(key);
                const isActive = pendingFilters.includes(normalizedKey);
                return (
                  <button
                    key={`pending-${key}`}
                    type="button"
                    className={`admin-clients-docfilter-icon admin-clients-docfilter-icon--pending${
                      isActive ? ' is-active' : ''
                    }`}
                    onClick={() => handleTogglePending(key)}
                    aria-pressed={isActive}
                    title={`${title} — непроверен`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        </div>
      </header>

      <div className="admin-clients-content" ref={contentRef}>
        {!canViewUsers ? (
          <div className="admin-clients-empty">
            <h3>Недостаточно прав</h3>
            <p>У вас нет доступа к просмотру списка клиентов.</p>
          </div>
        ) : loading ? (
          <div className="admin-clients-loading">
            <div className="admin-clients-spinner" />
            <p>Загрузка клиентов...</p>
          </div>
        ) : error ? (
          <div className="admin-clients-empty">
            <h3>Не удалось загрузить данные</h3>
            <p>{error}</p>
            <button type="button" onClick={() => loadUsers(1)}>
              Повторить
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="admin-clients-empty">
            <h3>Клиенты не найдены</h3>
            <p>Попробуйте изменить параметры поиска.</p>
          </div>
        ) : (
          <div className="admin-clients-grid">
            {filteredUsers.map((user) => (
              <UserCard
                key={user.id}
                user={user}
                docDefinitions={docDefinitions}
                products={products}
                onClick={() => handleUserClick(user)}
              />
            ))}
          </div>
        )}

        {loadingMore && (
          <div className="admin-clients-inline-loader">
            <div className="admin-clients-spinner small" />
            <span>Загрузка...</span>
          </div>
        )}
        <div ref={loaderRef} className="admin-clients-sentinel" />
      </div>

      {selectedUser && (
        <AboutUserModal
          user={selectedUser}
          products={products}
          onClose={handleCloseModal}
          onUserUpdate={handleUserUpdate}
        />
      )}
    </div>
  );
};

export default UsersList;