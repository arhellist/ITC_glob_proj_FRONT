import './docs-room.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import axiosAPI from '../../../JS/auth/http/axios.js';
import { API_CONFIG } from '../../../config/api.js';

const normalizeKindName = (value = '') => value.toString().trim().toLowerCase();
const sanitizeSlug = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

const buildDownloadUrl = (path) => {
  if (!path) {
    return null;
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  const baseUrl = `${API_CONFIG.BASE_URL}/${normalized}`;
  
  // Добавляем токен в query параметр для защищенных эндпоинтов
  // Проверяем как normalized (без начального /), так и оригинальный path
  if (normalized.startsWith('profile/docs/') || path.includes('/profile/docs/')) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const separator = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
    }
  }
  
  return baseUrl;
};

const BASE_DOC_CONFIGS = [
  {
    key: 'passport',
    kind: 'PASPORT',
    title: 'Загрузить фото паспорта',
    description: 'Изображение должно быть четким, без бликов и обрезаний.',
    endpoint: '/profile/docs/passport',
    synonyms: ['pasport', 'passport'],
  },
  {
    key: 'bank',
    kind: 'bank-information',
    title: 'Справка из банка',
    description: 'Поддерживаются изображения и PDF-файлы с реквизитами.',
    endpoint: '/profile/docs/other',
    synonyms: ['bankinformation', 'bank_information', 'bank-information'],
  },
];

const buildProductDocConfigs = (products = []) =>
  products
    .filter((product) => product?.investment_rules_required !== false)
    .map((product) => {
      const slug = sanitizeSlug(product?.ticker || product?.type || `product-${product?.id || 'custom'}`);
      const kind = `investmentrules-${slug}`;
      const legacyKind = `investmentrules-${sanitizeSlug(product?.type || '')}`;
      // Добавляем также kind без префикса investmentrules- для совместимости
      const rawKind = slug;
      const rawTypeKind = sanitizeSlug(product?.type || '');
      const tickerLabel = (product?.ticker || product?.type || '').toUpperCase().slice(0, 4) || 'PR';
      const productDisplayName = product?.type || tickerLabel;

      // Формируем все возможные варианты kind для совместимости
      const allSynonyms = [
        kind,
        legacyKind,
        `investmentrules-${rawKind}`,
        `investmentrules-${rawTypeKind}`,
        // Добавляем также варианты с разными регистрами
        kind.toLowerCase(),
        legacyKind.toLowerCase(),
      ].filter(Boolean);

      return {
        key: `product-${product?.id ?? slug}`,
        kind,
        title: `Инвест. правила ${productDisplayName}`,
        description: `Загрузите подписанный документ по продукту ${productDisplayName}.`,
        endpoint: '/profile/docs/other',
        synonyms: allSynonyms,
        productId: product?.id,
        downloadUrl: buildDownloadUrl(product?.investment_rules_path),
        requiresDownloadConfirmation: Boolean(product?.investment_rules_path),
        buttonLinePrimary: 'Загрузить инвестиционные правила',
        buttonLineSecondary: `продукт ${productDisplayName}`,
      };
    });

function DocsRoom() {
  const fileInputRef = useRef(null);
  const [pending, setPending] = useState(false);
  const [currentKind, setCurrentKind] = useState(null);
  const [currentEndpoint, setCurrentEndpoint] = useState(null);
  const [statusByKind, setStatusByKind] = useState({});
  const [uploadedKinds, setUploadedKinds] = useState([]);
  const [products, setProducts] = useState([]);
  const [notApproveDescriptionByKind, setNotApproveDescriptionByKind] = useState({});
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: '' });
  const [showViewer, setShowViewer] = useState(false);
  const [viewerKind, setViewerKind] = useState(null);
  const [viewerDocuments, setViewerDocuments] = useState([]);
  const [documentUrls, setDocumentUrls] = useState({});
  const viewerContentRef = useRef(null);

  // Функция для получения названия документа (должна быть определена до использования)
  const getDocumentName = useCallback((config, useQuotes = false) => {
    if (!config) return 'документ';
    if (config.title) {
      // Для базовых документов (паспорт, банковская выписка)
      if (config.kind?.toLowerCase() === 'pasport' || config.kind?.toLowerCase() === 'passport') {
        return 'ПАСПОРТ';
      }
      if (config.kind?.toLowerCase().includes('bank')) {
        return 'БАНКОВСКАЯ ВЫПИСКА';
      }
      // Для инвестиционных правил
      if (config.kind?.toLowerCase().startsWith('investmentrules-')) {
        let productName = config.buttonLineSecondary || config.title.replace('Инвест. правила ', '');
        // Убираем "продукт " из начала, если оно есть (buttonLineSecondary уже содержит "продукт ")
        if (productName.toLowerCase().startsWith('продукт ')) {
          productName = productName.substring(8); // Убираем "продукт " (8 символов)
        }
        const name = `Инвестиционные правила по продукту ${productName}`;
        return useQuotes ? `"${name}"` : name;
      }
      return config.title.toUpperCase();
    }
    return config.kind?.toUpperCase() || 'документ';
  }, []);

  // Функция для обновления статуса документа
  const updateDocumentStatus = useCallback((kind, status) => {
    const normalizedKind = normalizeKindName(kind);
    console.log('📄 DocsRoom: updateDocumentStatus вызвана с kind:', kind, 'normalizedKind:', normalizedKind, 'status:', status);
    
    setStatusByKind((prev) => {
      const next = { ...prev };
      // Нормализуем статус для совместимости с бэкендом и фронтендом
      if (status === 'approve' || status === 'approved') {
        next[normalizedKind] = 'approved';
        console.log('📄 DocsRoom: Установлен статус approved для', normalizedKind);
      } else if (status === 'not approve' || status === 'rejected') {
        next[normalizedKind] = 'rejected';
        console.log('📄 DocsRoom: Установлен статус rejected для', normalizedKind);
      } else if (status === 'under review' || status === 'pending' || status === 'uploaded') {
        next[normalizedKind] = 'uploaded';
        console.log('📄 DocsRoom: Установлен статус uploaded для', normalizedKind);
      } else {
        // Если статус неизвестен, помечаем как загруженный
        next[normalizedKind] = 'uploaded';
        console.log('📄 DocsRoom: Установлен статус uploaded (по умолчанию) для', normalizedKind, 'неизвестный статус:', status);
      }
      console.log('📄 DocsRoom: Новое состояние statusByKind:', next);
      return next;
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axiosAPI.get('/profile/docs/status');
        if (!mounted) {
          return;
        }
        const kinds = Array.isArray(data?.kinds) ? data.kinds : [];
        const normalizedKinds = kinds.map((kind) => normalizeKindName(kind));
        setUploadedKinds(normalizedKinds);
        
        // Получаем статусы документов из API
        const apiStatusByKind = data?.statusByKind || {};
        const apiNotApproveDescriptionByKind = data?.notApproveDescriptionByKind || {};
        setStatusByKind((prev) => {
          const next = { ...prev };
          normalizedKinds.forEach((kind) => {
            // Если документ загружен, но статус не утвержден/отклонен - просто помечаем как загруженный
            const apiStatus = apiStatusByKind[kind];
            if (apiStatus === 'approve') {
              next[kind] = 'approved';
            } else if (apiStatus === 'not approve') {
              next[kind] = 'rejected';
            } else {
              // Документ загружен, но еще на проверке
              next[kind] = 'uploaded';
            }
          });
          return next;
        });
        setNotApproveDescriptionByKind(apiNotApproveDescriptionByKind);
      } catch (error) {
        console.error('DocsRoom: Ошибка получения статусов документов', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const productDocConfigs = useMemo(
    () => buildProductDocConfigs(products),
    [products]
  );

  const allDocConfigs = useMemo(
    () => [...BASE_DOC_CONFIGS, ...productDocConfigs],
    [productDocConfigs]
  );

  // WebSocket обработчик для обновления статусов документов в реальном времени
  useEffect(() => {
    const handleDocumentStatusUpdate = (event) => {
      const { documentKind, status, notApproveDescription } = event.detail;
      console.log('📄 DocsRoom: Получено событие обновления статуса документа:', { documentKind, status, notApproveDescription });
      console.log('📄 DocsRoom: Текущие allDocConfigs:', allDocConfigs.map(c => ({ kind: c.kind, synonyms: c.synonyms })));
      
      if (!documentKind || !status) {
        console.warn('DocsRoom: Отсутствуют обязательные поля в событии:', event.detail);
        return;
      }

      // Нормализуем kind для поиска конфига
      const normalizedKind = normalizeKindName(documentKind);
      console.log('📄 DocsRoom: Нормализованный kind:', normalizedKind);

      // Обновляем статус документа
      console.log('📄 DocsRoom: Вызываем updateDocumentStatus с kind:', documentKind, 'status:', status);
      updateDocumentStatus(documentKind, status);
      
      // Обновляем описание отклонения, если оно есть
      if (notApproveDescription !== undefined) {
        setNotApproveDescriptionByKind((prev) => {
          const next = {
            ...prev,
            [normalizedKind]: notApproveDescription || null
          };
          console.log('📄 DocsRoom: Обновлено описание отклонения:', next);
          return next;
        });
      }

      // Проверяем обновление статуса после небольшой задержки
      setTimeout(() => {
        setStatusByKind((prev) => {
          console.log('📄 DocsRoom: Текущее состояние statusByKind после обновления:', prev);
          return prev;
        });
      }, 100);

      // Показываем INFO-нотификацию при обновлении статуса
      // Ищем конфиг по kind и synonyms
      let config = null;
      for (const c of allDocConfigs) {
        if (!c || !c.kind) continue;
        const configKinds = [c.kind, ...(c.synonyms || [])].map(k => normalizeKindName(k));
        if (configKinds.includes(normalizedKind)) {
          config = c;
          console.log('📄 DocsRoom: Найден конфиг документа по kind/synonyms:', {
            config: c,
            documentKind,
            normalizedKind,
            configKinds
          });
          break;
        }
      }
      
      // Если не нашли по kind, пробуем найти по частичному совпадению
      if (!config && documentKind) {
        const partialMatch = allDocConfigs.find(c => {
          if (!c || !c.kind) return false;
          const configKindNorm = normalizeKindName(c.kind);
          return configKindNorm.includes(normalizedKind) || normalizedKind.includes(configKindNorm);
        });
        if (partialMatch) {
          config = partialMatch;
          console.log('📄 DocsRoom: Найден конфиг документа по частичному совпадению:', {
            config: partialMatch,
            documentKind,
            normalizedKind
          });
        }
      }
      
      const documentName = config ? getDocumentName(config) : 'документ';
      console.log('📄 DocsRoom: Название документа для нотификации:', documentName);
      
      let notificationText = '';
      if (status === 'approve' || status === 'approved') {
        notificationText = `Документ ${documentName} утверждён`;
      } else if (status === 'not approve' || status === 'rejected') {
        if (notApproveDescription) {
          notificationText = `Документ ${documentName} отклонён. Причина: ${notApproveDescription}`;
        } else {
          notificationText = `Документ ${documentName} отклонён`;
        }
      }

      if (notificationText) {
        console.log('📄 DocsRoom: Отправляем нотификацию:', notificationText);
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'info',
            text: notificationText
          }
        }));
      }
    };

    document.addEventListener('user-document-status-updated', handleDocumentStatusUpdate);
    console.log('📄 DocsRoom: Зарегистрирован обработчик событий user-document-status-updated');
    
    // Обработчик обновления файла инвестиционных правил продукта
    const handleProductRulesUpdated = async (event) => {
      const { productType, productTicker, updatedAt } = event.detail;
      console.log('📄 DocsRoom: Получено событие обновления правил продукта:', { productType, productTicker, updatedAt });
      
      // Перезагружаем статусы документов, чтобы проверить устаревшие документы
      try {
        console.log('📄 DocsRoom: Запрашиваем актуальные статусы документов...');
        const { data } = await axiosAPI.get('/profile/docs/status');
        console.log('📄 DocsRoom: Получены данные из API:', {
          kinds: data?.kinds,
          statusByKind: data?.statusByKind,
          kindsCount: data?.kinds?.length || 0
        });
        
        const kinds = Array.isArray(data?.kinds) ? data.kinds : [];
        const normalizedKinds = kinds.map((kind) => normalizeKindName(kind));
        console.log('📄 DocsRoom: Нормализованные kinds:', normalizedKinds);
        
        // Проверяем, какие документы устарели (не в списке kinds, но есть в статусах)
        const apiStatusByKind = data?.statusByKind || {};
        const apiNotApproveDescriptionByKind = data?.notApproveDescriptionByKind || {};
        console.log('📄 DocsRoom: API статусы:', apiStatusByKind);
        
        setStatusByKind((prev) => {
          const next = { ...prev };
          
          // Обновляем статусы документов из API
          normalizedKinds.forEach((kind) => {
            const apiStatus = apiStatusByKind[kind];
            if (apiStatus === 'approve') {
              next[kind] = 'approved';
            } else if (apiStatus === 'not approve') {
              next[kind] = 'rejected';
            } else {
              next[kind] = 'uploaded';
            }
          });
          
          // Удаляем устаревшие документы (которые не в списке kinds)
          // Ищем документы с инвестиционными правилами для этого продукта
          allDocConfigs.forEach((config) => {
            const configKind = normalizeKindName(config.kind);
            const isInvestmentRules = config.kind.toLowerCase().startsWith('investmentrules-');
            
            if (isInvestmentRules) {
              // Проверяем, относится ли этот документ к обновленному продукту
              const productSlug = configKind.replace('investmentrules-', '').trim();
              const tickerLower = productTicker ? productTicker.toLowerCase() : null;
              const typeLower = productType ? normalizeKindName(productType).replace('investmentrules-', '').trim() : null;
              
              const matchesTicker = tickerLower && productSlug === tickerLower;
              const matchesType = typeLower && (productSlug === typeLower || productSlug.includes(typeLower) || typeLower.includes(productSlug));
              
              console.log(`📄 DocsRoom: Проверка соответствия документа ${configKind} продукту:`, {
                productSlug,
                tickerLower,
                typeLower,
                matchesTicker,
                matchesType,
                isInKinds: normalizedKinds.includes(configKind),
                currentStatus: next[configKind]
              });
              
              if (matchesTicker || matchesType) {
                // Если документ не в списке kinds (устарел) - удаляем из статусов
                if (!normalizedKinds.includes(configKind) && next[configKind]) {
                  console.log(`📄 DocsRoom: ✅ Документ ${configKind} устарел после обновления правил продукта ${productType} - удаляем из статусов`);
                  delete next[configKind];
                } else if (normalizedKinds.includes(configKind)) {
                  console.log(`📄 DocsRoom: ✅ Документ ${configKind} актуален - обновляем статус`);
                }
              }
            }
          });
          
          return next;
        });
        
        // Обновляем uploadedKinds - удаляем устаревшие документы
        setUploadedKinds((prev) => {
          // Находим документы с инвестиционными правилами для этого продукта
          const productSlug = productTicker ? productTicker.toLowerCase() : null;
          const typeSlug = productType ? normalizeKindName(productType).replace('investmentrules-', '').trim() : null;
          
          return prev.filter((kind) => {
            const isInvestmentRules = kind.startsWith('investmentrules-');
            if (!isInvestmentRules) return true;
            
            const kindSlug = kind.replace('investmentrules-', '').trim();
            const matchesProduct = (productSlug && kindSlug === productSlug) || 
                                  (typeSlug && (kindSlug === typeSlug || kindSlug.includes(typeSlug)));
            
            // Если документ относится к обновленному продукту и не в списке kinds - удаляем
            if (matchesProduct && !normalizedKinds.includes(kind)) {
              console.log(`📄 DocsRoom: Удаляем устаревший документ ${kind} из uploadedKinds`);
              return false;
            }
            
            return true;
          });
        });
        
        setNotApproveDescriptionByKind(apiNotApproveDescriptionByKind);
        
        // Показываем INFO-нотификацию о необходимости подписать правила повторно
        const productName = productType || productTicker || 'продукта';
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'info',
            text: `Изменены правила инвестирования по продукту ${productName}. Необходимо подписать новые правила повторно.`
          }
        }));
      } catch (error) {
        console.error('📄 DocsRoom: Ошибка перезагрузки статусов документов после обновления правил продукта:', error);
      }
    };
    
    document.addEventListener('product-investment-rules-updated', handleProductRulesUpdated);
    console.log('📄 DocsRoom: Зарегистрирован обработчик событий product-investment-rules-updated');
    
    return () => {
      document.removeEventListener('user-document-status-updated', handleDocumentStatusUpdate);
      document.removeEventListener('product-investment-rules-updated', handleProductRulesUpdated);
      console.log('📄 DocsRoom: Обработчики событий удалены');
    };
  }, [allDocConfigs, updateDocumentStatus, getDocumentName]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await axiosAPI.get('/profile/products');
        if (!mounted) {
          return;
        }
        const list = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : [];
        setProducts(list);
      } catch (error) {
        console.error('DocsRoom: Ошибка загрузки продуктов', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!uploadedKinds.length || !allDocConfigs.length) {
      return;
    }
    setStatusByKind((prev) => {
      const next = { ...prev };
      allDocConfigs.forEach((config) => {
        const normalizedKey = normalizeKindName(config.kind);
        // Не перезаписываем статусы approve/reject, только если статус еще не установлен
        if (next[normalizedKey] === 'approved' || next[normalizedKey] === 'rejected') {
          return;
        }
        const synonyms = (config.synonyms || []).map((value) => normalizeKindName(value));
        if (synonyms.some((key) => uploadedKinds.includes(key))) {
          // Если документ загружен, но статус еще не установлен - помечаем как загруженный
          if (!next[normalizedKey] || next[normalizedKey] === 'pending' || next[normalizedKey] === 'error') {
            next[normalizedKey] = 'uploaded';
          }
        }
      });
      return next;
    });
  }, [uploadedKinds, allDocConfigs]);

  const triggerSelect = (config) => {
    if (!config) {
      return;
    }
    setCurrentEndpoint(config.endpoint);
    setCurrentKind(config.kind);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDocButtonClick = (config) => {
    if (!config) {
      return;
    }
    
    // Убрана логика первичной загрузки инвестиционных правил
    // Теперь сразу открываем input для выбора файла
    triggerSelect(config);
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentEndpoint || !currentKind) {
      return;
    }
    const normalizedKind = normalizeKindName(currentKind);
    try {
      setStatusByKind((prev) => ({ ...prev, [normalizedKind]: 'pending' }));
      setPending(true);
      const form = new FormData();
      const files = e.target.files ? Array.from(e.target.files) : [file];
      for (const f of files) {
        form.append('files', f);
      }
      form.append('kind', currentKind);
      await axiosAPI.post(currentEndpoint, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // После успешной загрузки документ помечается как загруженный (не утвержден, не отклонен)
      setStatusByKind((prev) => ({ ...prev, [normalizedKind]: 'uploaded' }));
      setUploadedKinds((prev) =>
        prev.includes(normalizedKind) ? prev : [...prev, normalizedKind]
      );
    } catch (err) {
      console.error('Ошибка загрузки документа:', err);
      setStatusByKind((prev) => ({ ...prev, [normalizedKind]: 'error' }));
    } finally {
      setPending(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setCurrentEndpoint(null);
      setCurrentKind(null);
    }
  };

  const btnClass = (base, kind) => {
    const st = statusByKind[normalizeKindName(kind)];
    if (st === 'approved') {
      return `${base} DL-COMPLITE`;
    }
    if (st === 'rejected') {
      return `${base} DL-ERROR`;
    }
    if (st === 'error') {
      return `${base} DL-ERROR`;
    }
    return base;
  };


  // Функция для генерации текста tooltip
  const getTooltipText = (config) => {
    const normalizedKey = normalizeKindName(config.kind);
    const status = statusByKind[normalizedKey];
    const isInvestmentRules = config.kind.toLowerCase().startsWith('investmentrules-');
    const documentName = getDocumentName(config, isInvestmentRules); // Используем кавычки для инвестиционных правил
    const notApproveDescription = notApproveDescriptionByKind[normalizedKey];

    // 1. Если документ еще не загружен
    if (!status || status === 'pending' || status === 'error') {
      if (isInvestmentRules) {
        return `Вы еще не прошли верификацию. Нажмите на кнопку чтобы сохранить шаблон ${documentName}. После сохранения ${documentName} распечатайте шаблон, заполните личными данными, сделайте качественное фото и нажмите кнопку повторно, чтобы добавить (загрузить) документ в личный кабинет для верификации. Мы сообщим когда документ будет утвержден или отклонен с детализацией причины отклонения`;
      } else {
        return `Вы еще не прошли верификацию. Нажмите на кнопку чтобы загрузить ${documentName}`;
      }
    }

    // 2. Если документ загружен и находится на проверке
    if (status === 'uploaded') {
      return 'Ваш документ еще проходит стадию верификации. Ожидайте.';
    }

    // 3. Если документ утвержден
    if (status === 'approved') {
      return `Ваш документ ${documentName} успешно прошел модерацию`;
    }

    // 4. Если документ отклонен
    if (status === 'rejected') {
      if (notApproveDescription) {
        return `Ваш документ ${documentName} отклонен модератором по следующей причине: ${notApproveDescription}`;
      } else {
        return `Ваш документ ${documentName} отклонен модератором`;
      }
    }

    return '';
  };

  // Показать tooltip
  const showTooltip = (e, config) => {
    const tooltipText = getTooltipText(config);
    if (!tooltipText) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + window.scrollX + rect.width / 2,
      y: rect.top + window.scrollY - 10,
      content: tooltipText
    });
  };

  // Скрыть tooltip
  const hideTooltip = () => {
    setTooltip({ visible: false, x: 0, y: 0, content: '' });
  };

  // URL документа: сначала пробуем blob-URL (для зашифрованных/предзагруженных файлов),
  // если его нет — используем прямой API-URL основного backend (/profile/docs) как запасной вариант
  const getDocumentUrl = (doc) => {
    if (!doc || !doc.id) return null;

    // 1) Если уже есть blob-URL из предварительной загрузки — используем его
    if (documentUrls[doc.id]) {
      return documentUrls[doc.id];
    }

    // 2) Fallback: прямой URL к API (/profile/docs), чтобы браузер сам запросил поток
    const kind = normalizeKindName(doc.kind);
    const endpoint =
      kind === 'pasport' || kind === 'passport'
        ? `/profile/docs/passport/${doc.id}`
        : `/profile/docs/other/${doc.id}`;
    return buildDownloadUrl(endpoint);
  };

  const handleViewDocuments = async (config) => {
    if (!config) return;
    setViewerKind(config.kind);
    setShowViewer(true);
    setViewerDocuments([]);
    setDocumentUrls({});
    try {
      // Запрашиваем документы по нужному kind (как в миниапке)
      const { data } = await axiosAPI.get('/profile/docs', {
        params: { kind: config.kind }
      });
      const documents = Array.isArray(data?.documents) ? data.documents : [];

      setViewerDocuments(documents);

      // Загружаем каждый документ как blob (паспорт и другие), чтобы бэкенд расшифровал и отдал уже готовый поток
      const urls = {};
      for (const doc of documents) {
        try {
          const kind = normalizeKindName(doc.kind);
          const endpoint =
            kind === 'pasport' || kind === 'passport'
              ? `/profile/docs/passport/${doc.id}`
              : `/profile/docs/other/${doc.id}`;

          const response = await axiosAPI.get(endpoint, {
            responseType: 'blob'
          });

          const blob = new Blob([response.data], { type: doc.mimeType || 'image/jpeg' });
          urls[doc.id] = URL.createObjectURL(blob);
        } catch (err) {
          console.error(`DocsRoom: Ошибка загрузки файла документа ${doc.id} для просмотра`, err);
          urls[doc.id] = null;
        }
      }
      setDocumentUrls(urls);

      // Сбрасываем скролл ленты вьювера в самое начало после загрузки
      setTimeout(() => {
        if (viewerContentRef.current) {
          viewerContentRef.current.scrollTop = 0;
        }
      }, 100);
    } catch (error) {
      console.error('DocsRoom: Ошибка загрузки документов для просмотра', error);
      setViewerDocuments([]);
      setDocumentUrls({});
    }
  };

  const closeViewer = () => {
    // Освобождаем blob-URL
    Object.values(documentUrls).forEach((url) => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    });
    setShowViewer(false);
    setViewerKind(null);
    setViewerDocuments([]);
    setDocumentUrls({});
  };

  const handleDownloadFromViewer = async (doc) => {
    const kind = normalizeKindName(doc.kind);
    const endpoint =
      kind === 'pasport' || kind === 'passport'
        ? `/profile/docs/passport/${doc.id}`
        : `/profile/docs/other/${doc.id}`;

    try {
      // Качаем файл через axiosAPI (с авторизацией), а не прямым запросом браузера,
      // чтобы избежать ошибок сети/HTTPS и проблем с токенами
      const response = await axiosAPI.get(endpoint, {
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: doc.mimeType || 'application/octet-stream' });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.originalName || `document_${doc.id}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Освобождаем URL после скачивания
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('DocsRoom: Ошибка скачивания документа из вьювера', error);
    }
  };

  const renderDocCard = (config) => {
    const normalizedKey = normalizeKindName(config.kind);
    const status = statusByKind[normalizedKey];

    return (
      <div
        key={config.key}
        className="add-document-button-container-item gradient-border flex flex-column bru"
      >
        <div className="add-document-button-container-item-buttons flex flex-row">
          <div
            className={btnClass(
              'add-document-button-container-item-button flex bru pointer',
              config.kind
            )}
            onClick={() => handleDocButtonClick(config)}
            onMouseEnter={(e) => showTooltip(e, config)}
            onMouseLeave={hideTooltip}
          >
            {config.buttonLinePrimary && config.buttonLineSecondary ? (
              <span className="docs-room-button-text">
                <span className="docs-room-button-text-line">{config.buttonLinePrimary}</span>
                <span className="docs-room-button-text-line docs-room-button-text-line--secondary">
                  {config.buttonLineSecondary}
                </span>
              </span>
            ) : (
              config.title
            )}
            {/* Крестик слева - показывается только при ошибке загрузки */}
            <div className="iconEr img" style={{ 
              display: status === 'error' ? 'block' : 'none',
              left: '1vw',
              right: 'auto'
            }}></div>
            {/* Вращающаяся Refresh-картинка слева - показывается когда документ на проверке (uploaded) */}
            <div className="iconRefresh iconRefresh--uploaded img" style={{ 
              display: status === 'uploaded' ? 'block' : 'none',
              left: '1vw',
              right: 'auto'
            }}></div>
            {/* Индикатор загрузки - показывается только при pending */}
            <div className="iconRefresh img" style={{ 
              display: status === 'pending' ? 'block' : 'none',
              left: '1vw',
              right: 'auto'
            }}></div>
            {/* Галочка справа - показывается когда документ загружен (uploaded, approved, rejected) */}
            <div className="iconOk img" style={{ 
              display: (status === 'uploaded' || status === 'approved' || status === 'rejected') ? 'block' : 'none'
            }}></div>
          </div>
          <div
            className="add-document-button-container-item-view-button flex bru pointer"
            onClick={() => handleViewDocuments(config)}
          >
            <div className="iconView img" />
          </div>
        </div>
        {config.description && (
          <span className="add-document-button-container-item-text">
            {config.description}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="add-document-container gradient-border bru-max flex flex-column">
      <div className="add-document-title">проверка документов</div>
      <div className="add-document-layout">
        <div className="add-document-column add-document-column--base">
          {BASE_DOC_CONFIGS.map((config) => renderDocCard(config))}
          <div className="add-document-button-container-item add-about flex flex-column bru bg-color-lilac">
            <h2 className="add-document-button-container-item-about-title">
              проверка документов
            </h2>
            <span className="add-document-button-container-item-about-text">
              После загрузки вашего паспорта мы начинаем процесс проверки данных. Обычно это занимает
              от нескольких часов до пяти рабочих дней. В случае успешной проверки вы получите
              уведомление о подтверждении личности.
            </span>
            <span className="add-document-button-container-item-about-text">
              Если потребуется дополнительная информация, мы свяжемся с вами. После одобрения документов
              вы сможете продолжить работу с сервисом; при отклонении мы сообщим причину и вы сможете
              загрузить файлы повторно.
            </span>
          </div>
        </div>
        <div className="add-document-column add-document-column--products">
          <div className="docs-room-products-list">
            {productDocConfigs.length === 0 ? (
              <div className="docs-room-products-empty-card">
                Нет продуктов с обязательными инвестиционными правилами
              </div>
            ) : (
              productDocConfigs.map((config) => renderDocCard(config))
            )}
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={onFileChange}
        disabled={pending}
      />

      {/* Tooltip */}
      {tooltip.visible && tooltip.content && (
        <div 
          className="docs-room-tooltip"
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            zIndex: 10000,
            transform: 'translateX(-50%) translateY(-100%)'
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Модальное окно просмотра документов */}
      {showViewer && (
        <div className="docs-viewer-overlay flex flex-column" onClick={closeViewer}>
          <div
            className="docs-viewer-container gradient-border flex flex-column bru-max"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="docs-viewer-header flex flex-row">
              <h2 className="docs-viewer-title">
                {viewerKind || 'Документы'}
              </h2>
              <div className="docs-viewer-close flex pointer" onClick={closeViewer}>
                <div className="docs-viewer-close-icon img" />
              </div>
            </div>
            <div className="docs-viewer-content flex flex-column" ref={viewerContentRef}>
              {viewerDocuments.length === 0 ? (
                <div className="docs-viewer-empty">Нет загруженных документов</div>
              ) : (
                viewerDocuments.map((doc) => (
                  <div key={doc.id} className="docs-viewer-item flex flex-column">
                    <div className="docs-viewer-item-header flex flex-row">
                      <span className="docs-viewer-item-name">
                        {doc.originalName || `Документ ${doc.id}`}
                      </span>
                    </div>
                    <div className="docs-viewer-item-image-wrapper">
                      {doc.mimeType === 'application/pdf' ? (
                        <iframe
                          src={getDocumentUrl(doc)}
                          className="docs-viewer-item-iframe"
                          title={doc.originalName || `Документ ${doc.id}`}
                        />
                      ) : (
                        <img
                          src={getDocumentUrl(doc)}
                          alt={doc.originalName || `Документ ${doc.id}`}
                          className="docs-viewer-item-image"
                        />
                      )}
                    </div>
                    <div className="docs-viewer-item-actions flex flex-row">
                      <button
                        className="docs-viewer-item-download-button flex bru pointer"
                        onClick={() => handleDownloadFromViewer(doc)}
                      >
                        Скачать
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocsRoom;
