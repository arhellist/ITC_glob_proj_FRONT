import "../accounts-room.css";
import { useEffect, useRef, useState } from "react";
import axiosAPI from "../../../../JS/auth/http/axios.js";
import qrImg from "../../../../IMG/qrcode-transfer/qr.png";
import leftArrow from "../../../../IMG/profiles/white/arrow.png";

// Функции для нормализации kind
const normalizeKindName = (value = '') => value.toString().trim().toLowerCase();
const sanitizeSlug = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

function ModalWindowSendRequestDeposit({ onClose }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [rub, setRub] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('название файла');
  const fileInputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [documentsStatus, setDocumentsStatus] = useState({
    kinds: [],
    statusByKind: {},
    loaded: false
  });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [currentQRIndex, setCurrentQRIndex] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);

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

  useEffect(() => {
    (async ()=>{
      try {
        const { data } = await axiosAPI.get('/profile/accounts');
        const allAccounts = Array.isArray(data?.accounts) ? data.accounts : [];
        // Исключаем реферальные счета из списка пополнения
        const list = allAccounts.filter(acc => acc.product !== 'Referral');
        setAccounts(list);
        if (list.length) setSelectedId(String(list[0].id));
      } catch (e) {
        console.error('Ошибка загрузки счетов:', e);
        document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Не удалось загрузить счета' } }));
      }
    })();
  }, []);

  // Загружаем способы оплаты
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axiosAPI.get('/profile/payment-methods');
        const methods = Array.isArray(data?.data) ? data.data.filter(m => m.qr_code) : [];
        setPaymentMethods(methods);
        if (methods.length > 0) setCurrentQRIndex(0);
      } catch (e) {
        console.error('Ошибка загрузки способов оплаты:', e);
      }
    })();
  }, []);

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

  // Функция для скачивания QR-кода
  const downloadQRCode = (qrCode, methodType = 'QR-код') => {
    try {
      let imageUrl = qrCode;
      
      // Если QR-код уже в формате data URL или URL, используем его напрямую
      if (!qrCode.startsWith('data:') && !qrCode.startsWith('http://') && !qrCode.startsWith('https://')) {
        imageUrl = `data:image/png;base64,${qrCode}`;
      }
      
      // Создаем временную ссылку для скачивания
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `QR-код-${methodType || 'пополнение'}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Ошибка скачивания QR-кода:', error);
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Не удалось скачать QR-код' } }));
    }
  };

  const submit = async () => {
    if (!selectedId || !rub) {
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'attention', text: 'Заполните счет и сумму в рублях' } }));
      return;
    }

    // Проверяем инвестиционные правила для выбранного счета
    const selectedAccount = accounts.find(acc => String(acc.id) === String(selectedId));
    if (selectedAccount && selectedAccount.product) {
      const isRulesApproved = checkInvestmentRulesApproved(selectedAccount.product);
      
      // Если данные еще загружаются, ждем
      if (isRulesApproved === null) {
        document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'attention', text: 'Проверка инвестиционных правил... Пожалуйста, подождите' } }));
        return;
      }
      
      // Если правила не утверждены, блокируем операцию
      if (isRulesApproved === false) {
        const product = products.find(p => p.type === selectedAccount.product);
        const productName = product?.type || selectedAccount.product;
        const message = `Чтобы пополнить счет по продукту ${productName}, Вам необходимо подписать и загрузить инвестиционные правила по соответствующему продукту. Дождитесь утверждения ваших подписанных инвестиционных правил, если они были загружены ранее`;
        document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'info', text: message } }));
        return;
      }
    }

    try {
      const form = new FormData();
      form.append('account_id', String(selectedId));
      form.append('deposit_RUB_value', String(rub));
      // Передаем ID способа пополнения, если выбран
      if (paymentMethods.length > 0 && paymentMethods[currentQRIndex]?.id) {
        form.append('payment_method_id', String(paymentMethods[currentQRIndex].id));
      }
      if (file) form.append('cheque', file);
      const { data } = await axiosAPI.post('/profile/deposit', form);
      const ok = data?.serviceMessage || 'Заявка на пополнение создана';
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'success', text: ok } }));
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'info' } }));
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Ошибка создания заявки на пополнение';
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: msg } }));
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'info' } }));
    }
  };

  return (
    <div className="account-container-craa-modal-window flex flex-column" onClick={()=> onClose?.()}>
        <div className="account-container-craa-modal-window-menu gradient-border flex flex-column bru-max" onClick={(e)=>e.stopPropagation()}>
            <div className="account-container-craa-modal-window-menu-cancel flex pointer" onClick={()=> onClose?.()}>
                <div className="account-container-craa-modal-window-menu-cancel-icon img"></div>
            </div>
            <h2 className="account-container-craa-modal-window-menu-title">подать заявку на пополнение счета</h2>
            
            <div className="account-container-craa-modal-window-menu-item flex flex-column">
                <label htmlFor="craa-product-from" className="">выберите счет пополнения</label>
                <div className="account-container-craa-modal-window-menu-item-inputwrapper gradient-border flex bru">
                <select id="craa-product-from" className="gradient-border bru" value={selectedId} onChange={(e)=>setSelectedId(e.target.value)}>
                    {accounts.map(acc => (
                      <option key={acc.id} value={String(acc.id)}>№{acc.id} {acc.product || ''} {(acc.value ?? 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}$</option>
                    ))}
                </select>
            </div>
            </div>

            {paymentMethods.length > 0 && paymentMethods[currentQRIndex] && (
              <div className="account-container-craa-modal-window-menu-payment-method-title">
                <span>СПОСОБ ПОПОЛНЕНИЯ:</span>
                <span>{paymentMethods[currentQRIndex].method_type?.toUpperCase() || ''}</span>
              </div>
            )}
            <span className="account-container-craa-modal-window-menu-qrcode-title">QR-код для пополнения</span>
            {paymentMethods.length > 0 ? (
              <div className="account-container-craa-modal-window-menu-qrcode-slider flex" style={{ position: 'relative' }}>
                {paymentMethods.length > 1 && (
                  <div 
                    className="account-container-craa-modal-window-menu-qrcode-slider-arrow account-container-craa-modal-window-menu-qrcode-slider-arrow-left pointer flex"
                    onClick={() => setCurrentQRIndex((prev) => (prev === 0 ? paymentMethods.length - 1 : prev - 1))}
                  >
                    <img src={leftArrow} alt="предыдущий" className="account-container-craa-modal-window-menu-qrcode-slider-arrow-img" style={{ transform: 'rotate(180deg)' }} />
                  </div>
                )}
                <div 
                  className="account-container-craa-modal-window-menu-qrcode-wrapper"
                  onMouseEnter={() => setShowTooltip(true)}
                  onMouseLeave={() => setShowTooltip(false)}
                >
                <div 
                  className="account-container-craa-modal-window-menu-qrcode pointer flex gradient-border bru"
                >
                  {(() => {
                    const qrCode = paymentMethods[currentQRIndex]?.qr_code;
                    let qrSrc = qrImg;
                    if (qrCode) {
                      if (qrCode.startsWith('data:')) {
                        qrSrc = qrCode;
                      } else if (qrCode.startsWith('http://') || qrCode.startsWith('https://')) {
                        qrSrc = qrCode;
                      } else {
                        qrSrc = `data:image/png;base64,${qrCode}`;
                      }
                    }
                    return (
                      <img 
                        src={qrSrc} 
                        alt={`QR-код ${paymentMethods[currentQRIndex]?.method_type || ''}`} 
                        className="account-container-craa-modal-window-menu-qrcode-img bru"
                        onClick={() => downloadQRCode(paymentMethods[currentQRIndex]?.qr_code, paymentMethods[currentQRIndex]?.method_type)}
                      />
                    );
                  })()}
                </div>
                {showTooltip && paymentMethods[currentQRIndex]?.description && (
                  <div className="account-container-craa-modal-window-menu-qrcode-tooltip">
                    {paymentMethods[currentQRIndex].description}
                  </div>
                )}
                </div>
                {paymentMethods.length > 1 && (
                  <div 
                    className="account-container-craa-modal-window-menu-qrcode-slider-arrow account-container-craa-modal-window-menu-qrcode-slider-arrow-right pointer flex"
                    onClick={() => setCurrentQRIndex((prev) => (prev === paymentMethods.length - 1 ? 0 : prev + 1))}
                  >
                    <img src={leftArrow} alt="следующий" className="account-container-craa-modal-window-menu-qrcode-slider-arrow-img" />
                  </div>
                )}
              </div>
            ) : (
              <div className="account-container-craa-modal-window-menu-qrcode pointer flex gradient-border bru">
                <img src={qrImg} alt="qrcode" className="account-container-craa-modal-window-menu-qrcode-img bru" onClick={() => {
                  // Для статичного QR-кода тоже можно скачать, но это будет дефолтное изображение
                  const link = document.createElement('a');
                  link.href = qrImg;
                  link.download = 'QR-код-пополнение.png';
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }} />
              </div>
            )}
            <span className="account-container-craa-modal-window-menu-qrcode-description">нажмите на QR-код для загрузки</span>

            <div className="account-container-craa-modal-window-menu-item flex flex-column">
                <label htmlFor="craa-product-to-summ" className="" style={{ display: 'flex', flexDirection: 'column' }}>
                    <span>введите сумму пополнения</span>
                    <span style={{ fontSize: '0.65em', fontStyle: 'italic', marginTop: '0.25rem' }}>(В валюте отправляемых средств)</span>
                </label>
                <div className="account-container-craa-modal-window-menu-item-inputwrapper gradient-border flex bru">
                    <input type="number" id="craa-product-to-summ" className="bru" placeholder="100000" value={rub} onChange={(e)=>setRub(e.target.value)} />
                </div>
            </div>

            <div className="account-container-craa-modal-window-menu-addChequ flex flex-column">
                <div className="account-container-craa-modal-window-menu-addChequ-title">прикрепите чек</div>
                <div className="account-container-craa-modal-window-menu-addChequ-inputwrapper gradient-border pointer flex flex-row bru" onClick={()=> fileInputRef.current?.click()}>
                    <div className="account-container-craa-modal-window-menu-addChequ-icon gradient-border bru">
                        <div className="account-container-craa-modal-window-menu-addChequ-icon-img img"></div>
                    </div>
                    <span id="addChequ-title">{fileName}</span>
                    <input ref={fileInputRef} type="file" id="craa-product-to-chequ" onChange={(e)=>{ const f = e.target.files?.[0] || null; setFile(f); setFileName(f ? f.name : 'название файла'); }} style={{ display: 'none' }} />
                </div>
            </div>

            <div className="account-container-transfer-modal-window-menu-button gradient-border flex flex-column bru pointer" onClick={submit}>подать заявку</div>

        </div>
    </div>
  );
}

export default ModalWindowSendRequestDeposit;


