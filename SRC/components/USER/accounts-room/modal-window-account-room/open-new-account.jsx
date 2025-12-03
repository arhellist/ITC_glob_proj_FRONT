import { useState, useEffect, useMemo, useRef } from "react";
import axiosAPI from "../../../../JS/auth/http/axios.js";
import NotificationSuccess from "../../../notifications/notification-success.jsx";
import "../accounts-room.css";

// Функции для нормализации kind (как в docs-room.jsx)
const normalizeKindName = (value = '') => value.toString().trim().toLowerCase();
const sanitizeSlug = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

function ModalWindowOpenNewAccount({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [product, setProduct] = useState("");
  const [success, setSuccess] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [documentsStatus, setDocumentsStatus] = useState({
    kinds: [],
    statusByKind: {},
    loaded: false
  });
  const [productSubscriptionStatus, setProductSubscriptionStatus] = useState({
    requiresSubscription: false,
    hasActiveSubscription: false,
    loaded: false
  });
  
  // Используем ref для отслеживания последнего продукта, для которого уже показана нотификация
  const lastNotifiedProductRef = useRef(null);
  const lastNotifiedSubscriptionRef = useRef(null);

  // Загружаем список продуктов из БД
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        const response = await axiosAPI.get('/profile/products');
        const productsData = response.data?.data || [];
        
        console.log('📄 OpenNewAccount: Загружено продуктов из БД:', productsData);
        
        // Сортируем продукты: Classic первый, остальные по алфавиту
        const sortedProducts = [...productsData].sort((a, b) => {
          if (a.type === 'Classic') return -1;
          if (b.type === 'Classic') return 1;
          return (a.type || '').localeCompare(b.type || '');
        });
        
        setProducts(sortedProducts);
        
        // Устанавливаем первый продукт по умолчанию (или Classic, если есть)
        if (sortedProducts.length > 0) {
          const defaultProduct = sortedProducts.find(p => p.type === 'Classic') || sortedProducts[0];
          setProduct(defaultProduct.type || '');
        }
      } catch (error) {
        console.error('📄 OpenNewAccount: Ошибка загрузки продуктов:', error);
        // В случае ошибки используем пустой список или fallback
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  // Загружаем статусы документов
  useEffect(() => {
    const loadDocumentsStatus = async () => {
      try {
        const { data } = await axiosAPI.get('/profile/docs/status');
        const kinds = Array.isArray(data?.kinds) ? data.kinds : [];
        const statusByKind = data?.statusByKind || {};
        
        console.log('📄 OpenNewAccount: Загружены статусы документов:', {
          kinds,
          statusByKind,
          kindsCount: kinds.length
        });
        
        setDocumentsStatus({
          kinds,
          statusByKind,
          loaded: true
        });
      } catch (error) {
        console.error('📄 OpenNewAccount: Ошибка загрузки статусов документов:', error);
        setDocumentsStatus(prev => ({ ...prev, loaded: true }));
      }
    };

    loadDocumentsStatus();

    // Подписываемся на обновления статусов через WebSocket события
    const handleDocumentStatusUpdate = () => {
      loadDocumentsStatus();
    };

    document.addEventListener('user-document-status-updated', handleDocumentStatusUpdate);
    
    return () => {
      document.removeEventListener('user-document-status-updated', handleDocumentStatusUpdate);
    };
  }, []);

  // Получаем выбранный продукт
  const selectedProduct = useMemo(() => {
    if (!product || !products.length) return null;
    return products.find(p => p.type === product) || null;
  }, [product, products]);

  // Загружаем статус подписки для выбранного продукта
  useEffect(() => {
    const loadProductSubscriptionStatus = async () => {
      if (!selectedProduct?.id) {
        setProductSubscriptionStatus({ requiresSubscription: false, hasActiveSubscription: false, loaded: true });
        return;
      }

      try {
        const { data } = await axiosAPI.get(`/profile/subscriptions/check-product?productId=${selectedProduct.id}`);
        setProductSubscriptionStatus({
          requiresSubscription: data.requiresSubscription || false,
          hasActiveSubscription: data.hasActiveSubscription || false,
          loaded: true
        });
      } catch (error) {
        console.error('📄 OpenNewAccount: Ошибка загрузки статуса подписки:', error);
        setProductSubscriptionStatus({ requiresSubscription: false, hasActiveSubscription: false, loaded: true });
      }
    };

    loadProductSubscriptionStatus();
  }, [selectedProduct?.id]);

  // Проверяем, утверждены ли инвестиционные правила для выбранного продукта
  const isInvestmentRulesApproved = useMemo(() => {
    if (!selectedProduct || !documentsStatus.loaded) {
      return false;
    }

    // Если продукт не требует инвестиционных правил - считаем, что они утверждены
    if (selectedProduct.investment_rules_required === false) {
      return true;
    }

    // Формируем возможные варианты kind для документа инвестиционных правил
    // Используем ту же логику, что и в docs-room.jsx
    const possibleKinds = [];
    
    // Вариант 1: по ticker (приоритетный) - investmentrules-{ticker}
    if (selectedProduct.ticker) {
      const tickerLower = selectedProduct.ticker.toLowerCase();
      possibleKinds.push(`investmentrules-${tickerLower}`);
      possibleKinds.push(normalizeKindName(`investmentrules-${tickerLower}`));
    }
    
    // Вариант 2: по type с sanitizeSlug - investmentrules-{type-slug}
    if (selectedProduct.type) {
      const typeSlug = sanitizeSlug(selectedProduct.type);
      if (typeSlug) {
        possibleKinds.push(`investmentrules-${typeSlug}`);
        possibleKinds.push(normalizeKindName(`investmentrules-${typeSlug}`));
      }
    }

    // Также добавляем вариант по ticker || type (как в buildProductDocConfigs)
    if (selectedProduct.ticker || selectedProduct.type) {
      const slug = sanitizeSlug(selectedProduct.ticker || selectedProduct.type || `product-${selectedProduct.id}`);
      possibleKinds.push(`investmentrules-${slug}`);
      possibleKinds.push(normalizeKindName(`investmentrules-${slug}`));
    }

    // Убираем дубликаты
    const uniqueKinds = [...new Set(possibleKinds)];

    console.log('📄 OpenNewAccount: Проверка инвестиционных правил для продукта:', {
      productType: selectedProduct.type,
      productTicker: selectedProduct.ticker,
      productId: selectedProduct.id,
      possibleKinds: uniqueKinds,
      uploadedKinds: documentsStatus.kinds,
      normalizedUploadedKinds: documentsStatus.kinds.map(k => normalizeKindName(k)),
      statusByKind: documentsStatus.statusByKind
    });

    // Проверяем, есть ли документ инвестиционных правил для этого продукта
    const normalizedUploadedKinds = documentsStatus.kinds.map(k => normalizeKindName(k));
    
    for (const kind of uniqueKinds) {
      const normalizedKind = normalizeKindName(kind);
      
      // Проверяем по оригинальному и нормализованному kind
      const originalKindInList = documentsStatus.kinds.find(k => normalizeKindName(k) === normalizedKind);
      
      if (originalKindInList || normalizedUploadedKinds.includes(normalizedKind)) {
        // Получаем статус - проверяем по оригинальному kind и нормализованному
        const originalKind = originalKindInList || kind;
        const status = documentsStatus.statusByKind[originalKind] || 
                      documentsStatus.statusByKind[normalizedKind] ||
                      documentsStatus.statusByKind[kind];
        
        const isApproved = status === 'approve' || status === 'approved';
        
        console.log('📄 OpenNewAccount: Документ инвестиционных правил найден:', {
          kind,
          normalizedKind,
          originalKind,
          status,
          isApproved
        });
        
        return isApproved;
      }
    }

    // Документ не найден - правила не утверждены
    console.log('📄 OpenNewAccount: Документ инвестиционных правил НЕ найден для продукта:', {
      productType: selectedProduct.type,
      productTicker: selectedProduct.ticker,
      checkedKinds: uniqueKinds
    });
    return false;
  }, [selectedProduct, documentsStatus]);

  const handleCreate = async () => {
    if (!product) {
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Выберите продукт' } }));
      return;
    }

    // Проверяем, утверждены ли инвестиционные правила
    if (!isInvestmentRulesApproved && selectedProduct?.investment_rules_required !== false) {
      const productName = selectedProduct?.type || product;
      const message = `Чтобы открыть новый счет по продукту ${productName}, Вам необходимо подписать и загрузить инвестиционные правила по соответствующему продукту. Дождитесь утверждения ваших подписанных инвестиционных правил, если они были загружены ранее`;
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'info', text: message } }));
      return;
    }

    // Проверяем, оплачена ли подписка (если продукт требует подписку)
    if (productSubscriptionStatus.requiresSubscription && !productSubscriptionStatus.hasActiveSubscription) {
      const productName = selectedProduct?.type || product;
      const message = `Чтобы открыть инвестиционный счет по продукту ${productName} вам необходимо оформить подписку`;
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'info', text: message } }));
      return;
    }

    try {
      await axiosAPI.post('/profile/accounts', { name, productType: product });
      setSuccess('Счет успешно открыт');
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'success', text: 'Счет успешно открыт' } }));
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'info' } }));
      if (typeof onCreated === 'function') await onCreated();
      // авто закрытие после показа
      setTimeout(() => { if (typeof onClose === 'function') onClose(); }, 0);
    } catch (e) {
      console.error('Ошибка открытия счета:', e);
      const msg = e?.response?.data?.message || 'Ошибка открытия счета';
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: msg } }));
    }
  };

  // Определяем, должна ли быть заблокирована кнопка
  const isButtonDisabled = !product || 
    (loading && !documentsStatus.loaded) || 
    (!documentsStatus.loaded) ||
    (!productSubscriptionStatus.loaded) ||
    (!isInvestmentRulesApproved && selectedProduct?.investment_rules_required !== false) ||
    (productSubscriptionStatus.requiresSubscription && !productSubscriptionStatus.hasActiveSubscription);

  // Показываем INFO-нотификацию при выборе продукта с неподтвержденными правилами
  useEffect(() => {
    // Пропускаем, если данные еще загружаются или продукт не выбран
    if (!product || !selectedProduct || !documentsStatus.loaded || !productSubscriptionStatus.loaded || loading) {
      return;
    }

    // Пропускаем, если уже показывали нотификацию для этого продукта
    if (lastNotifiedProductRef.current === product) {
      return;
    }

    // Если продукт требует инвестиционные правила и они не утверждены
    if (selectedProduct.investment_rules_required !== false && !isInvestmentRulesApproved) {
      const productName = selectedProduct.type || product;
      const message = `Чтобы открыть новый счет по продукту ${productName}, Вам необходимо подписать и загрузить инвестиционные правила по соответствующему продукту. Дождитесь утверждения ваших подписанных инвестиционных правил, если они были загружены ранее`;
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'info', text: message } }));
      lastNotifiedProductRef.current = product;
    } else {
      // Если правила утверждены или не требуются - сбрасываем ref для этого продукта
      lastNotifiedProductRef.current = null;
    }
  }, [product, selectedProduct, documentsStatus.loaded, productSubscriptionStatus.loaded, isInvestmentRulesApproved, loading]);

  // Показываем INFO-нотификацию при выборе продукта с неподтвержденной подпиской
  useEffect(() => {
    // Пропускаем, если данные еще загружаются или продукт не выбран
    if (!product || !selectedProduct || !productSubscriptionStatus.loaded || loading) {
      return;
    }

    // Пропускаем, если уже показывали нотификацию для этого продукта
    if (lastNotifiedSubscriptionRef.current === product) {
      return;
    }

    // Если продукт требует подписку и она не оплачена
    if (productSubscriptionStatus.requiresSubscription && !productSubscriptionStatus.hasActiveSubscription) {
      const productName = selectedProduct.type || product;
      const message = `Чтобы открыть инвестиционный счет по продукту ${productName} вам необходимо оформить подписку`;
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'info', text: message } }));
      lastNotifiedSubscriptionRef.current = product;
    } else {
      // Если подписка оплачена или не требуется - сбрасываем ref для этого продукта
      lastNotifiedSubscriptionRef.current = null;
    }
  }, [product, selectedProduct, productSubscriptionStatus, loading]);

  // Текст тултипа для заблокированной кнопки
  const buttonTooltip = useMemo(() => {
    if (!isButtonDisabled) return '';
    if (!product) return 'Выберите продукт';
    if (loading && !documentsStatus.loaded) return 'Загрузка данных...';
    if (!productSubscriptionStatus.loaded) return 'Загрузка данных...';
    if (productSubscriptionStatus.requiresSubscription && !productSubscriptionStatus.hasActiveSubscription) {
      return 'Чтобы открыть этот инвестиционный счет вам необходимо оформить подписку на этот продукт';
    }
    if (!isInvestmentRulesApproved && selectedProduct?.investment_rules_required !== false) {
      return 'Подпишите инвестиционные правила по выбранному продукту';
    }
    return '';
  }, [isButtonDisabled, product, loading, documentsStatus.loaded, productSubscriptionStatus, isInvestmentRulesApproved, selectedProduct]);

  return (
    <div className="account-container-addAccount-modal-window flex flex-column" onClick={()=> onClose?.()}>
        <div className="account-container-addAccount-modal-window-menu gradient-border flex flex-column bru-max" onClick={(e)=>e.stopPropagation()}>
            <div className="account-container-addAccount-modal-window-menu-cancel flex pointer" onClick={()=> onClose?.()}>
                <div className="account-container-addAccount-modal-window-menu-cancel-icon img"></div>
            </div>
            <h2 className="account-container-addAccount-modal-window-menu-title">открыть новый инвестиционный счет</h2>
            
            <div className="account-container-addAccount-modal-window-menu-item flex flex-column">
                <label htmlFor="new-account-name" className="">введите название счета</label>
                <div className="account-container-addAccount-modal-window-menu-item-inputwrapper gradient-border flex bru">
                    <input type="text" id="new-account-name" className="bru" value={name} onChange={(e)=>setName(e.target.value)} />
                </div>
                
            </div>

            <div className="account-container-addAccount-modal-window-menu-item flex flex-column">
                <label htmlFor="new-account-product" className="">выберите продукт</label>
                <div className="account-container-addAccount-modal-window-menu-item-inputwrapper gradient-border flex bru">
                  {loading ? (
                    <select id="new-account-product" className="gradient-border bru" disabled>
                      <option value="">Загрузка продуктов...</option>
                    </select>
                  ) : products.length > 0 ? (
                    <select 
                      id="new-account-product" 
                      className="gradient-border bru" 
                      value={product} 
                      onChange={(e)=>setProduct(e.target.value)}
                      required
                    >
                      <option value="">Выберите продукт</option>
                      {products.map((prod) => (
                        <option key={prod.id} value={prod.type}>
                          {prod.type?.toUpperCase() || ''}{prod.currency ? ` (${prod.currency})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select id="new-account-product" className="gradient-border bru" disabled>
                      <option value="">Продукты не найдены</option>
                    </select>
                  )}
                </div>
            </div>

            <div 
              className={`account-container-addAccount-modal-window-menu-button gradient-border flex flex-column bru ${isButtonDisabled ? 'disabled' : 'pointer'}`}
              onClick={handleCreate}
              style={isButtonDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              title={buttonTooltip}
            >
              открыть счет
            </div>
            {success && <NotificationSuccess text={success} onClose={()=>setSuccess("")} />}

        </div>
    </div>
  );
}

export default ModalWindowOpenNewAccount;


