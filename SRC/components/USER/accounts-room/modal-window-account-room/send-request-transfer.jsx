import { useEffect, useRef, useState } from "react";
import axiosAPI from "../../../../JS/auth/http/axios.js";
import NotificationError from "../../../notifications/notification-error.jsx";
import "../accounts-room.css";

// Функции для нормализации kind
const normalizeKindName = (value = '') => value.toString().trim().toLowerCase();
const sanitizeSlug = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

function ModalWindowSendRequestTransfer({ onClose, onCreated, accounts = [], fromId, toId, setFromId, setToId }) {
  const [fromBalance, setFromBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState([]);
  const initDoneRef = useRef(false);
  const [products, setProducts] = useState([]);
  const [documentsStatus, setDocumentsStatus] = useState({
    kinds: [],
    statusByKind: {},
    loaded: false
  });
  
  // Исключаем реферальные счета из списка для перевода
  const filteredAccounts = accounts.filter(acc => acc.product !== 'Referral');

  // Загружаем список продуктов
  useEffect(() => {
    (async () => {
      try {
        const response = await axiosAPI.get('/profile/products');
        const productsData = response.data?.data || [];
        setProducts(productsData);
      } catch (e) {
        console.error('Ошибка загрузки продуктов:', e);
      }
    })();
  }, []);

  // Загружаем статус документов
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosAPI.get('/profile/docs/status');
        setDocumentsStatus({
          kinds: Array.isArray(data?.kinds) ? data.kinds : [],
          statusByKind: data?.statusByKind || {},
          loaded: true
        });
      } catch (e) {
        console.error('Ошибка загрузки статуса документов:', e);
        setDocumentsStatus(prev => ({ ...prev, loaded: true }));
      }
    })();
  }, []);

  // Инициализация значений только один раз при наличии accounts
  useEffect(() => {
    if (initDoneRef.current) return;
    if (!filteredAccounts || filteredAccounts.length === 0) return;
    if (!fromId) setFromId(String(filteredAccounts[0].id));
    if (!toId && filteredAccounts.length > 1) setToId(String(filteredAccounts[1].id));
    initDoneRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAccounts]);

  useEffect(() => {
    const acc = filteredAccounts.find(a => String(a.id) === String(fromId));
    setFromBalance(acc ? Number(acc.value || 0) : 0);
  }, [fromId, filteredAccounts]);

  // Функция проверки инвестиционных правил для продукта
  const checkInvestmentRulesApproved = (productType) => {
    if (!documentsStatus.loaded || !products.length) {
      return null; // Данные еще загружаются
    }

    const product = products.find(p => p.type === productType);
    if (!product) {
      return null;
    }

    // Если продукт не требует инвестиционных правил - считаем, что они утверждены
    if (product.investment_rules_required === false) {
      return true;
    }

    const productTicker = product.ticker;

    // Формируем возможные варианты kind для документа инвестиционных правил
    const possibleKinds = [];
    
    // Вариант 1: по ticker (приоритетный) - investmentrules-{ticker}
    if (productTicker || product.ticker) {
      const tickerLower = (productTicker || product.ticker).toLowerCase();
      possibleKinds.push(`investmentrules-${tickerLower}`);
      possibleKinds.push(normalizeKindName(`investmentrules-${tickerLower}`));
    }
    
    // Вариант 2: по type с sanitizeSlug - investmentrules-{type-slug}
    if (productType || product.type) {
      const typeSlug = sanitizeSlug(productType || product.type);
      if (typeSlug) {
        possibleKinds.push(`investmentrules-${typeSlug}`);
        possibleKinds.push(normalizeKindName(`investmentrules-${typeSlug}`));
      }
    }

    // Также добавляем вариант по ticker || type
    if (productTicker || product.ticker || productType || product.type) {
      const slug = sanitizeSlug(productTicker || product.ticker || productType || product.type || `product-${product.id}`);
      possibleKinds.push(`investmentrules-${slug}`);
      possibleKinds.push(normalizeKindName(`investmentrules-${slug}`));
    }

    // Убираем дубликаты
    const uniqueKinds = [...new Set(possibleKinds)];

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
        
        if (isApproved) {
          return true;
        }
      }
    }

    // Документ не найден или не утвержден - правила не утверждены
    return false;
  };

  const onChangeFrom = (val) => {
    setFromId(val);
    if (val && toId && String(val) === String(toId)) {
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'attention', text: 'Вы выбрали один и тот же счет' } }));
    }
  };

  const onChangeTo = (val) => {
    setToId(val);
    if (fromId && val && String(fromId) === String(val)) {
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'attention', text: 'Вы выбрали один и тот же счет' } }));
    }
  };

  const submit = async () => {
    if (!fromId || !toId || !amount) {
      setErrors((p)=>[...p, 'Заполните все поля']);
      return;
    }
    if (String(fromId) === String(toId)) {
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Вы выбрали один и тот же счет' } }));
      return;
    }

    // Проверяем инвестиционные правила для счета "откуда"
    // Загружаем актуальные данные перед проверкой
    const fromAccount = filteredAccounts.find(acc => String(acc.id) === String(fromId));
    if (fromAccount && fromAccount.product) {
      try {
        console.log('Transfer: Начало проверки инвестиционных правил для продукта:', fromAccount.product);
        
        // Загружаем актуальные данные продуктов и статусов документов
        const [productsResponse, docsResponse] = await Promise.all([
          axiosAPI.get('/profile/products').catch(err => {
            console.error('Transfer: Ошибка загрузки продуктов:', err);
            throw new Error('Не удалось загрузить данные продуктов');
          }),
          axiosAPI.get('/profile/docs/status').catch(err => {
            console.error('Transfer: Ошибка загрузки статуса документов:', err);
            throw new Error('Не удалось загрузить статус документов');
          })
        ]);
        
        console.log('Transfer: Данные загружены:', {
          products: productsResponse.data,
          docsStatus: docsResponse.data
        });
        
        const actualProducts = Array.isArray(productsResponse.data?.data) ? productsResponse.data.data : [];
        const actualDocsStatus = {
          kinds: Array.isArray(docsResponse.data?.kinds) ? docsResponse.data.kinds : [],
          statusByKind: docsResponse.data?.statusByKind || {},
          loaded: true
        };
        
        console.log('Transfer: Обработанные данные:', {
          actualProducts: actualProducts.length,
          actualDocsStatus: {
            kindsCount: actualDocsStatus.kinds.length,
            statusByKindKeys: Object.keys(actualDocsStatus.statusByKind)
          }
        });
        
        // Используем актуальные данные для проверки
        const actualProduct = actualProducts.find(p => p.type === fromAccount.product);
        if (!actualProduct) {
          console.error('Transfer: Продукт не найден:', fromAccount.product, 'Доступные продукты:', actualProducts.map(p => p.type));
          document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Продукт не найден' } }));
          return;
        }
        
        console.log('Transfer: Найден продукт:', {
          type: actualProduct.type,
          ticker: actualProduct.ticker,
          investment_rules_required: actualProduct.investment_rules_required
        });
        
        // Если продукт не требует инвестиционных правил - считаем, что они утверждены
        if (actualProduct.investment_rules_required === false) {
          console.log('Transfer: Продукт не требует инвестиционных правил, продолжаем');
          // Продолжаем выполнение
        } else {
          const productTicker = actualProduct.ticker;
          const possibleKinds = [];
          
          // Вариант 1: по ticker (приоритетный) - investmentrules-{ticker}
          if (productTicker || actualProduct.ticker) {
            const tickerLower = (productTicker || actualProduct.ticker).toLowerCase();
            possibleKinds.push(`investmentrules-${tickerLower}`);
            possibleKinds.push(normalizeKindName(`investmentrules-${tickerLower}`));
          }
          
          // Вариант 2: по type с sanitizeSlug - investmentrules-{type-slug}
          if (fromAccount.product || actualProduct.type) {
            const typeSlug = sanitizeSlug(fromAccount.product || actualProduct.type);
            if (typeSlug) {
              possibleKinds.push(`investmentrules-${typeSlug}`);
              possibleKinds.push(normalizeKindName(`investmentrules-${typeSlug}`));
            }
          }
          
          // Также добавляем вариант по ticker || type
          if (productTicker || actualProduct.ticker || fromAccount.product || actualProduct.type) {
            const slug = sanitizeSlug(productTicker || actualProduct.ticker || fromAccount.product || actualProduct.type || `product-${actualProduct.id}`);
            possibleKinds.push(`investmentrules-${slug}`);
            possibleKinds.push(normalizeKindName(`investmentrules-${slug}`));
          }
          
          const uniqueKinds = [...new Set(possibleKinds)];
          const normalizedUploadedKinds = actualDocsStatus.kinds.map(k => normalizeKindName(k));
          
          console.log('Transfer: Варианты kind для проверки:', {
            uniqueKinds,
            uploadedKinds: actualDocsStatus.kinds,
            normalizedUploadedKinds,
            statusByKind: actualDocsStatus.statusByKind
          });
          
          // Детальное логирование для отладки
          console.log('Transfer: ДЕТАЛЬНАЯ ПРОВЕРКА:');
          console.log('Transfer: uniqueKinds:', uniqueKinds);
          console.log('Transfer: uniqueKinds normalized:', uniqueKinds.map(k => ({ original: k, normalized: normalizeKindName(k) })));
          console.log('Transfer: uploadedKinds:', actualDocsStatus.kinds);
          console.log('Transfer: uploadedKinds normalized:', actualDocsStatus.kinds.map(k => ({ original: k, normalized: normalizeKindName(k) })));
          console.log('Transfer: statusByKind keys:', Object.keys(actualDocsStatus.statusByKind));
          console.log('Transfer: statusByKind full:', actualDocsStatus.statusByKind);
          console.log('Transfer: statusByKind entries:', Object.entries(actualDocsStatus.statusByKind).map(([k, v]) => ({ key: k, value: v, normalized: normalizeKindName(k) })));
          
          let isApproved = false;
          
          // Проверяем каждый возможный kind
          for (const kind of uniqueKinds) {
            const normalizedKind = normalizeKindName(kind);
            
            // Ищем точное совпадение (без нормализации)
            let matchedKind = actualDocsStatus.kinds.find(k => k === kind);
            
            // Если не нашли точное совпадение, ищем по нормализованному виду
            if (!matchedKind) {
              matchedKind = actualDocsStatus.kinds.find(k => {
                const normalizedK = normalizeKindName(k);
                return normalizedK === normalizedKind;
              });
            }
            
            // Также проверяем, есть ли в нормализованном списке
            const isInNormalizedList = normalizedUploadedKinds.includes(normalizedKind);
            
            console.log('Transfer: Проверка kind:', {
              kind,
              normalizedKind,
              matchedKind,
              isInNormalizedList,
              allUploadedKinds: actualDocsStatus.kinds,
              allNormalizedKinds: normalizedUploadedKinds
            });
            
            // Если нашли совпадение (точное или нормализованное)
            if (matchedKind || isInNormalizedList) {
              // Используем найденный kind или оригинальный
              const kindToCheck = matchedKind || kind;
              const normalizedKindToCheck = normalizeKindName(kindToCheck);
              
              // Проверяем статус по разным вариантам ключа
              const status = actualDocsStatus.statusByKind[kindToCheck] || 
                            actualDocsStatus.statusByKind[normalizedKindToCheck] ||
                            actualDocsStatus.statusByKind[kind] ||
                            actualDocsStatus.statusByKind[normalizedKind];
              
              console.log('Transfer: Найдено совпадение kind, проверяем статус:', {
                kind,
                kindToCheck,
                normalizedKind,
                normalizedKindToCheck,
                matchedKind,
                status,
                statusByKindKeys: Object.keys(actualDocsStatus.statusByKind),
                statusByKindOriginal: actualDocsStatus.statusByKind[kindToCheck],
                statusByKindNormalized: actualDocsStatus.statusByKind[normalizedKindToCheck],
                statusByKindKind: actualDocsStatus.statusByKind[kind],
                statusByKindNormalizedKind: actualDocsStatus.statusByKind[normalizedKind],
                isApproved: status === 'approve' || status === 'approved'
              });
              
              if (status === 'approve' || status === 'approved') {
                isApproved = true;
                console.log('Transfer: ✅ Инвестиционные правила утверждены для kind:', kind, 'matchedKind:', matchedKind);
                break;
              } else {
                console.log('Transfer: ❌ Статус не утвержден:', status, 'для kind:', kind, 'matchedKind:', matchedKind);
              }
            } else {
              console.log('Transfer: ❌ Kind не найден в списке загруженных документов:', {
                kind,
                normalizedKind,
                uploadedKinds: actualDocsStatus.kinds,
                normalizedUploadedKinds,
                comparison: actualDocsStatus.kinds.map(k => ({
                  original: k,
                  normalized: normalizeKindName(k),
                  matches: normalizeKindName(k) === normalizedKind
                }))
              });
            }
          }
          
          console.log('Transfer: Результат проверки:', {
            isApproved,
            uniqueKinds,
            uploadedKinds: actualDocsStatus.kinds,
            statusByKind: actualDocsStatus.statusByKind
          });
          
          // Если правила не утверждены, блокируем операцию
          if (!isApproved) {
            const productName = actualProduct.type || fromAccount.product;
            const message = `Чтобы перевести средства со счета по продукту ${productName}, Вам необходимо подписать и загрузить инвестиционные правила по соответствующему продукту. Дождитесь утверждения ваших подписанных инвестиционных правил, если они были загружены ранее`;
            console.log('Transfer: Правила не утверждены, блокируем операцию');
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'info', text: message } }));
            return;
          }
          
          console.log('Transfer: Правила утверждены, продолжаем операцию');
        }
      } catch (e) {
        console.error('Transfer: Ошибка проверки инвестиционных правил:', e);
        console.error('Transfer: Детали ошибки:', {
          message: e?.message,
          response: e?.response?.data,
          status: e?.response?.status,
          stack: e?.stack
        });
        
        // Если ошибка загрузки документов - показываем понятное сообщение
        if (e?.message?.includes('документ') || e?.message?.includes('docs') || e?.response?.status === 404) {
          const errorMsg = 'Не удалось загрузить статус документов. Пожалуйста, попробуйте позже или обратитесь в поддержку.';
          document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: errorMsg } }));
          return;
        }
        
        const errorMsg = e?.response?.data?.message || e?.message || 'Ошибка проверки инвестиционных правил';
        document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: errorMsg } }));
        return;
      }
    }

    try {
      const { data } = await axiosAPI.post('/profile/transfers', {
        account_id_original: Number(fromId),
        account_id_transfer: Number(toId),
        currency_value_original: Number(amount)
      });
      const okMsg = data?.serviceMessage || 'Заявка на перевод создана';
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'success', text: okMsg } }));
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'info' } }));
      if (typeof onCreated === 'function') await onCreated();
      if (typeof onClose === 'function') onClose();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Ошибка создания перевода';
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: msg } }));
    }
  };

  return (
    <div className="account-container-transfer-modal-window flex flex-column" onClick={()=>{ if (typeof onClose === 'function') onClose(); }}>
        <div className="account-container-transfer-modal-window-menu gradient-border flex flex-column bru-max" onMouseDown={(e)=>e.stopPropagation()} onClick={(e)=>e.stopPropagation()}>
            <div className="account-container-transfer-modal-window-menu-cancel flex pointer" onClick={()=>{ if (typeof onClose === 'function') onClose(); }}>
                <div className="account-container-transfer-modal-window-menu-cancel-icon img"></div>
            </div>
            <h2 className="account-container-transfer-modal-window-menu-title">подать заявку на перевод средств между счетами</h2>
            
            <div className="account-container-transfer-modal-window-menu-item flex flex-column">
                <label htmlFor="transfer-product-from" className="">выберите счет с которого будет перевод</label>
                <div className="account-container-transfer-modal-window-menu-item-inputwrapper gradient-border flex bru">
                <select type="text" id="transfer-product-from" className="gradient-border bru" value={fromId || ""} onChange={(e)=>onChangeFrom(e.target.value)}>
                    {filteredAccounts.map(acc => (
                      <option key={acc.id} value={String(acc.id)}>{acc.id} {acc.product}</option>
                    ))}
                </select>
            </div>
            </div>

            <div className="account-container-transfer-modal-window-menu-item flex flex-column">
                <label htmlFor="transfer-product-from-summ" className="">сумма на счете</label>
                <div className="account-container-transfer-modal-window-menu-item-inputwrapper gradient-border flex bru">
                    <input type="text" id="transfer-product-from-summ" className="bru" readOnly value={fromBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} />
                </div>
                
            </div>

            <div className="account-container-transfer-modal-window-menu-item flex flex-column">
                <label htmlFor="transfer-product-to" className="">выберите счет на который будет перевод</label>
                <div className="account-container-transfer-modal-window-menu-item-inputwrapper gradient-border flex bru">
                <select type="text" id="transfer-product-to" className="gradient-border bru" value={toId || ""} onChange={(e)=>onChangeTo(e.target.value)}>
                    {filteredAccounts.map(acc => (
                      <option key={acc.id} value={String(acc.id)}>{acc.id} {acc.product}</option>
                    ))}
                </select>
            </div>
            </div>

            <div className="account-container-transfer-modal-window-menu-item flex flex-column">
                <label htmlFor="transfer-product-to-summ" className="">введите сумму перевода</label>
                <div className="account-container-transfer-modal-window-menu-item-inputwrapper gradient-border flex bru">
                    <input type="number" id="transfer-product-to-summ" className="bru" value={amount} onChange={(e)=>setAmount(e.target.value)} />
                </div>
                
            </div>



            <div className="account-container-transfer-modal-window-menu-button gradient-border flex flex-column bru pointer" onClick={submit}>подать заявку</div>
            {errors.map((m, i) => (
              <NotificationError key={i} text={m} onClose={()=>setErrors((p)=>p.filter((_, idx)=>idx!==i))} />
            ))}

        </div>
    </div>
  );
}

export default ModalWindowSendRequestTransfer;