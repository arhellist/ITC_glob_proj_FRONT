import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import axiosAPI from "../../../JS/auth/http/axios.js";
import "./accounts-room.css";
import "../../ADMIN/users-list/UsersList.css";
import mainLogo from "../../../IMG/mainLogo.png";
import ModalWindowOpenNewAccount from "./modal-window-account-room/open-new-account.jsx";
import ModalWindowSendRequestDeposit from "./modal-window-account-room/send-request-deposit.jsx";
import ModalWindowSendRequestTransfer from "./modal-window-account-room/send-request-transfer.jsx";
import ModalWindowSendRequestWithdrawl from "./modal-window-account-room/send-request-withdrawl.jsx";

// Функции для нормализации kind (как в open-new-account.jsx)
const normalizeKindName = (value = '') => value.toString().trim().toLowerCase();
const sanitizeSlug = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

function AccountsRoom() {
  const [accounts, setAccounts] = useState([]);
  const [referralAccount, setReferralAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openModal, setOpenModal] = useState(""); // 'open' | 'deposit' | 'transfer' | 'withdraw'
  const [transferFromId, setTransferFromId] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [products, setProducts] = useState([]);
  const [documentsStatus, setDocumentsStatus] = useState({
    kinds: [],
    statusByKind: {},
    loaded: false
  });
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [showWithdrawRequestsModal, setShowWithdrawRequestsModal] = useState(false);
  const [loadingWithdrawRequests, setLoadingWithdrawRequests] = useState(false);
  const [hasPendingWithdrawals, setHasPendingWithdrawals] = useState(false);
  const [cancelConfirmRequest, setCancelConfirmRequest] = useState(null); // ID заявки для отмены
  const [transferRequests, setTransferRequests] = useState([]);
  const [showTransferRequestsModal, setShowTransferRequestsModal] = useState(false);
  const [loadingTransferRequests, setLoadingTransferRequests] = useState(false);
  const [hasPendingTransfers, setHasPendingTransfers] = useState(false);
  const [cancelConfirmTransferRequest, setCancelConfirmTransferRequest] = useState(null); // ID заявки на перевод для отмены

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [{ data: accData }, { data: pendData }, { data: requestsData }] = await Promise.all([
          axiosAPI.get('/profile/accounts'),
          axiosAPI.get('/profile/withdraw/pending'),
          axiosAPI.get('/profile/withdraw/requests').catch(() => ({ data: { requests: [] } }))
        ]);
        if (!isMounted) return;
        const allAccounts = Array.isArray(accData?.accounts) ? accData.accounts : [];
        
        // Разделяем счета на обычные и реферальный
        const regularAccounts = allAccounts.filter(acc => acc.product !== 'Referral');
        const refAccount = allAccounts.find(acc => acc.product === 'Referral');
        
        setAccounts(regularAccounts);
        setReferralAccount(refAccount || null);
        
        // Проверяем наличие заявок на вывод (любых, не только pending)
        const pendings = pendData?.pendings || {};
        const allRequests = Array.isArray(requestsData?.requests) ? requestsData.requests : [];
        const hasPending = Object.keys(pendings).length > 0;
        const hasAnyRequests = allRequests.length > 0;
        const hasRequests = hasPending || hasAnyRequests;
        console.log('Проверка заявок на вывод:', { pendings, allRequests: allRequests.length, hasPending, hasAnyRequests, hasRequests });
        setHasPendingWithdrawals(hasRequests);
        
        // Загружаем заявки на перевод
        try {
          const { data: transferRequestsData } = await axiosAPI.get('/profile/transfers/requests').catch(() => ({ data: { requests: [] } }));
          const allTransferRequests = Array.isArray(transferRequestsData?.requests) ? transferRequestsData.requests : [];
          const hasTransferRequests = allTransferRequests.length > 0;
          setHasPendingTransfers(hasTransferRequests);
        } catch (e) {
          console.error('Ошибка загрузки заявок на перевод:', e);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Ошибка загрузки счетов:', err);
        setError('Не удалось загрузить счета');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Загружаем список продуктов
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const response = await axiosAPI.get('/profile/products');
        const productsData = response.data?.data || [];
        if (!isMounted) return;
        setProducts(productsData);
      } catch (err) {
        if (!isMounted) return;
        console.error('Ошибка загрузки продуктов:', err);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  // Загружаем статусы документов
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await axiosAPI.get('/profile/docs/status');
        if (!isMounted) return;
        const kinds = Array.isArray(data?.kinds) ? data.kinds : [];
        const statusByKind = data?.statusByKind || {};
        
        setDocumentsStatus({
          kinds,
          statusByKind,
          loaded: true
        });
      } catch (err) {
        if (!isMounted) return;
        console.error('Ошибка загрузки статусов документов:', err);
        setDocumentsStatus(prev => ({ ...prev, loaded: true }));
      }
    })();

    // Подписываемся на обновления статусов через WebSocket события
    const handleDocumentStatusUpdate = () => {
      axiosAPI.get('/profile/docs/status').then(({ data }) => {
        const kinds = Array.isArray(data?.kinds) ? data.kinds : [];
        const statusByKind = data?.statusByKind || {};
        setDocumentsStatus({
          kinds,
          statusByKind,
          loaded: true
        });
      }).catch(err => {
        console.error('Ошибка обновления статусов документов:', err);
      });
    };

    document.addEventListener('user-document-status-updated', handleDocumentStatusUpdate);
    
    return () => {
      isMounted = false;
      document.removeEventListener('user-document-status-updated', handleDocumentStatusUpdate);
    };
  }, []);

  // Функция проверки, утверждены ли инвестиционные правила для продукта
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

  // Закрытие по ESC
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenModal("");
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const handleModalClick = (e) => {
    const closeArea = e.target.closest(
      '.account-container-addAccount-modal-window-menu-cancel, '
      + '.account-container-craa-modal-window-menu-cancel, '
      + '.account-container-transfer-modal-window-menu-cancel, '
      + '.account-container-withdrawl-modal-window-menu-cancel'
    );
    if (closeArea) setOpenModal("");
  };

  const RootPortal = ({ children }) => {
    const rootEl = typeof document !== 'undefined' ? document.querySelector('.root') : null;
    if (!rootEl) return null;
    return createPortal(children, rootEl);
  };

  return (
    <>
    <div className="account-container flex flex-row">
      <div className="account-container-left flex flex-column">
        <div className="account-container-myaccounts gradient-border flex flex-column bru-max">
          <h2 className="account-container-myaccounts-title">Мои счета</h2>
          <div className="account-container-myaccounts-table flex flex-column">
            {loading && <div className="account-loading">Загрузка...</div>}
            {error && <div className="account-error">{error}</div>}
            {!loading && !error && accounts.length === 0 && (
              <div className="account-empty">У вас еще нет открытых счетов, чтобы начать инвестировать откройте счет</div>
            )}
            {!loading && !error && accounts.length > 0 && accounts.map((acc) => {
              const isRulesApproved = checkInvestmentRulesApproved(acc.product);
              const shouldBlur = isRulesApproved === false; // blur только если точно известно, что правила не утверждены
              
              return (
                <div 
                  key={acc.id} 
                  className="account-container-myaccounts-table-item gradient-border flex flex-column bru"
                >
                  <div className={`account-container-myaccounts-table-item-content flex flex-column ${shouldBlur ? 'account-blurred' : ''}`}>
                    <div className="account-container-myaccounts-table-item-number"><span>№</span><span className="account-number">{acc.id}</span></div>
                    <div className="account-container-myaccounts-table-item-product"><span>Продукт:</span><span className="account-product">{acc.product || '-'}</span></div>
                    <div className="account-container-myaccounts-table-item-name"><span>"</span><span className="account-name">{acc.name || '-'}</span><span>"</span></div>
                    <div className="account-container-myaccounts-table-item-currency"><span>валюта:</span><span className="account-currency">{acc.currency || '-'}</span></div>
                    <div className="account-container-myaccounts-table-item-value"><span>Сумма:</span><span className="account-value">{(acc.value ?? 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className="dollar">$</span></div>
                  </div>
                  {shouldBlur && (
                    <div className="account-blur-tooltip">
                      Подпишите инвестиционные правила чтобы снова иметь возможность просматривать информацию по счетам
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="account-container-right flex flex-column">
        {referralAccount ? (
          <div className="account-container-right-refaccount gradient-border flex flex-column bru-max">
            <div className="account-container-right-refaccount-title">реферальный счет</div>
            <div className="account-container-right-refaccount-number">
              <span>№</span>
              <span className="account-number">{referralAccount.id}</span>
            </div>
            <div className="account-container-right-refaccount-text">
              <span className="refaccount-value">
                {referralAccount.value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="refaccount-currency">{referralAccount.currency === 'USDT' ? 'USDT' : referralAccount.currency || '$'}</span>
            </div>
          </div>
        ) : (
          <div className="account-container-right-refaccount gradient-border flex flex-column bru-max">
            <div className="account-container-right-refaccount-title">реферальный счет</div>
            <div className="account-container-right-refaccount-empty">
              Реферальный счет будет открыт автоматически, как только по вашей ссылке зарегистрируется новый инвестор
            </div>
          </div>
        )}
        <div className="account-container-buttons flex flex-row">
          <div className="account-container-buttons-item gradient-border flex flex-column bru-max">
            <div className="account-container-buttons-item-title">открыть новый инвестиционный счет</div>
            <div className="account-container-buttons-item-button gradient-border flex bru pointer" onClick={() => setOpenModal('open')}>открыть счет</div>
          </div>
          <div className="account-container-buttons-item gradient-border flex flex-column bru-max">
            <div className="account-container-buttons-item-title">подать заявку на пополнение инвестиционного счета</div>
            <div className="account-container-buttons-item-button gradient-border flex bru pointer" onClick={() => setOpenModal('deposit')}>подать заявку</div>
          </div>
          <div className="account-container-buttons-item gradient-border flex flex-column bru-max">
            <div className="account-container-buttons-item-title">подать заявку на перевод средств между счетами</div>
            {hasPendingTransfers && (
              <div className="account-container-buttons-item-button gradient-border flex bru pointer" 
                   style={{ position: 'absolute', bottom: '5vw', width: '80%' }}
                   onClick={async () => {
                     setLoadingTransferRequests(true);
                     try {
                       const { data } = await axiosAPI.get('/profile/transfers/requests');
                       setTransferRequests(data?.requests || []);
                       setShowTransferRequestsModal(true);
                     } catch (e) {
                       console.error('Ошибка загрузки заявок на перевод:', e);
                       document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Не удалось загрузить заявки' } }));
                     } finally {
                       setLoadingTransferRequests(false);
                     }
                   }}>
                {loadingTransferRequests ? 'Загрузка...' : 'МОИ ЗАЯВКИ'}
              </div>
            )}
            <div className="account-container-buttons-item-button gradient-border flex bru pointer" onClick={() => setOpenModal('transfer')}>подать заявку</div>
          </div>
          <div className="account-container-buttons-item gradient-border flex flex-column bru-max">
            <div className="account-container-buttons-item-title">подать заявку на вывод средств</div>
            {hasPendingWithdrawals && (
              <div className="account-container-buttons-item-button gradient-border flex bru pointer" 
                   style={{ position: 'absolute', bottom: '5vw', width: '80%' }}
                   onClick={async () => {
                     setLoadingWithdrawRequests(true);
                     try {
                       const { data } = await axiosAPI.get('/profile/withdraw/requests');
                       setWithdrawRequests(data?.requests || []);
                       setShowWithdrawRequestsModal(true);
                     } catch (e) {
                       console.error('Ошибка загрузки заявок:', e);
                       document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Не удалось загрузить заявки' } }));
                     } finally {
                       setLoadingWithdrawRequests(false);
                     }
                   }}>
                {loadingWithdrawRequests ? 'Загрузка...' : 'МОИ ЗАЯВКИ'}
              </div>
            )}
            <div className="account-container-buttons-item-button gradient-border flex bru pointer" onClick={() => setOpenModal('withdraw')}>подать заявку</div>
          </div>
        </div>
      </div>
    </div>
  {openModal && (
    <RootPortal>
      <div 
        className="account-modal-overlay"
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpenModal("");
          handleModalClick(e);
        }}
      >
            {openModal === 'open' && (
          <ModalWindowOpenNewAccount 
            onClose={() => setOpenModal("")}
            onCreated={async ()=>{
              try {
                const { data } = await axiosAPI.get('/profile/accounts');
                const allAccounts = Array.isArray(data?.accounts) ? data.accounts : [];
                
                // Разделяем счета на обычные и реферальный
                const regularAccounts = allAccounts.filter(acc => acc.product !== 'Referral');
                const refAccount = allAccounts.find(acc => acc.product === 'Referral');
                
                setAccounts(regularAccounts);
                setReferralAccount(refAccount || null);
              } catch (e) {
                console.error('Не удалось обновить список счетов', e);
              }
            }}
          />
        )}
        {openModal === 'deposit' && (
          <ModalWindowSendRequestDeposit onClose={() => setOpenModal("")} />
        )}
        {openModal === 'transfer' && (
          <ModalWindowSendRequestTransfer 
            accounts={accounts}
            fromId={transferFromId}
            toId={transferToId}
            setFromId={setTransferFromId}
            setToId={setTransferToId}
            onClose={() => setOpenModal("")}
          />
        )}
        {openModal === 'withdraw' && (
          <ModalWindowSendRequestWithdrawl onClose={() => setOpenModal("")} />
        )}
      </div>
    </RootPortal>
  )}
  {showWithdrawRequestsModal && (
    <RootPortal>
      <div className="notification-withdrawl-modal-window flex flex-column" onClick={() => setShowWithdrawRequestsModal(false)}>
        <div className="notification-withdrawl-modal-window-menu gradient-border flex flex-column bru-max" onClick={(e) => e.stopPropagation()}>
          <div className="notification-withdrawl-modal-window-menu-cancel flex pointer" onClick={() => setShowWithdrawRequestsModal(false)}>
            <div className="notification-withdrawl-modal-window-menu-cancel-icon img"></div>
          </div>
          <div className="notification-withdrawl-modal-window-menu-titleImg flex pointer" onClick={() => setShowWithdrawRequestsModal(false)} style={{ marginTop: '1vw' }}>
            <div className="notification-withdrawl-modal-window-menu-titleImg-icon img" style={{ backgroundImage: `url("${mainLogo}")` }}></div>
          </div>
          <h2 className="notification-withdrawl-modal-window-menu-title" style={{ width: '100%', marginTop: '1vw', marginBottom: '1vw' }}>МОИ ЗАЯВКИ НА ВЫВОД</h2>
          <div style={{ flex: 1, overflow: 'auto', padding: '1vw 2vw 2vw 2vw', width: '100%', boxSizing: 'border-box' }}>
            {withdrawRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2vw', color: '#fff' }}>Заявок на вывод нет</div>
            ) : (
              <div className="withdraw-requests-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {[...withdrawRequests].sort((a, b) => b.id - a.id).map((req) => (
                  <div key={req.id} className="admin-client-card">
                    <div className="admin-client-card__header">
                      <div className="admin-client-card__header-info">
                        <span className="admin-client-card__name">Заявка №{req.id}</span>
                        <span className="admin-client-card__email" style={{ 
                          color: req.status === 'credited' ? '#4caf50' : req.status === 'rejected' ? '#f44336' : '#ffc107'
                        }}>
                          {req.status === 'credited' ? 'Исполнена' : req.status === 'rejected' ? 'Отклонена' : 'В обработке'}
                        </span>
                      </div>
                    </div>
                    <div className="admin-client-card__body">
                      <div className="admin-client-card__row">
                        <span className="admin-client-card__label">Счет</span>
                        <span className="admin-client-card__value">№{req.account_number} {req.product_type || ''}</span>
                      </div>
                      <div className="admin-client-card__row">
                        <span className="admin-client-card__label">Сумма вывода</span>
                        <span className="admin-client-card__value">{req.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {req.currency}</span>
                      </div>
                      <div className="admin-client-card__row">
                        <span className="admin-client-card__label">Комиссия</span>
                        <span className="admin-client-card__value">{req.commission.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {req.currency}</span>
                      </div>
                      <div className="admin-client-card__row">
                        <span className="admin-client-card__label">Итого к выводу</span>
                        <span className="admin-client-card__value">{req.total.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {req.currency}</span>
                      </div>
                      <div className="admin-client-card__row">
                        <span className="admin-client-card__label">Штрафы</span>
                        <span className="admin-client-card__value" style={{ color: (req.penalty || 0) > 0 ? '#f44336' : 'inherit' }}>
                          {(req.penalty || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {req.currency}
                        </span>
                      </div>
                      {req.fines && req.fines.length > 0 && (
                        <div className="admin-client-card__row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px', marginTop: '4px' }}>
                          <span className="admin-client-card__label" style={{ fontSize: '11px', color: '#9aa6bf' }}>Детали штрафов:</span>
                          {req.fines.map((fine, idx) => (
                            <div key={fine.id || idx} style={{ fontSize: '11px', color: '#ff9800', marginLeft: '8px' }}>
                              • {fine.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {req.currency}
                              {fine.description && ` - ${fine.description}`}
                            </div>
                          ))}
                        </div>
                      )}
                      {req.rejection_reason && (
                        <div className="admin-client-card__row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                          <span className="admin-client-card__label" style={{ color: '#f44336' }}>Причина отклонения</span>
                          <span className="admin-client-card__value" style={{ wordBreak: 'break-word', textAlign: 'left', color: '#f44336', fontSize: '12px' }}>
                            {req.rejection_reason}
                          </span>
                        </div>
                      )}
                      {req.requisites && (
                        <div className="admin-client-card__row">
                          <span className="admin-client-card__label">Реквизиты</span>
                          <span className="admin-client-card__value" style={{ wordBreak: 'break-word', textAlign: 'right' }}>{req.requisites}</span>
                        </div>
                      )}
                    </div>
                    <div className="admin-client-card__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="admin-client-card__status" style={{ fontSize: '12px', color: '#9aa6bf' }}>
                        {new Date(req.date).toLocaleString('ru-RU')}
                      </span>
                      {req.status === 'processing' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelConfirmRequest(req.id);
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#ff6b8f',
                            background: 'rgba(255, 99, 132, 0.16)',
                            border: '1px solid rgba(255, 99, 132, 0.35)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 99, 132, 0.25)';
                            e.target.style.borderColor = 'rgba(255, 99, 132, 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 99, 132, 0.16)';
                            e.target.style.borderColor = 'rgba(255, 99, 132, 0.35)';
                          }}
                        >
                          Отменить
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RootPortal>
  )}
  {showTransferRequestsModal && (
    <RootPortal>
      <div className="notification-withdrawl-modal-window flex flex-column" onClick={() => setShowTransferRequestsModal(false)}>
        <div className="notification-withdrawl-modal-window-menu gradient-border flex flex-column bru-max" onClick={(e) => e.stopPropagation()}>
          <div className="notification-withdrawl-modal-window-menu-cancel flex pointer" onClick={() => setShowTransferRequestsModal(false)}>
            <div className="notification-withdrawl-modal-window-menu-cancel-icon img"></div>
          </div>
          <div className="notification-withdrawl-modal-window-menu-titleImg flex pointer" onClick={() => setShowTransferRequestsModal(false)} style={{ marginTop: '1vw' }}>
            <div className="notification-withdrawl-modal-window-menu-titleImg-icon img" style={{ backgroundImage: `url("${mainLogo}")` }}></div>
          </div>
          <h2 className="notification-withdrawl-modal-window-menu-title" style={{ width: '100%', marginTop: '1vw', marginBottom: '1vw' }}>МОИ ЗАЯВКИ НА ПЕРЕВОД</h2>
          <div style={{ flex: 1, overflow: 'auto', padding: '1vw 2vw 2vw 2vw', width: '100%', boxSizing: 'border-box' }}>
            {transferRequests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2vw', color: '#fff' }}>Заявок на перевод нет</div>
            ) : (
              <div className="withdraw-requests-grid" style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px',
                paddingTop: '1vw'
              }}>
                {[...transferRequests].sort((a, b) => b.id - a.id).map((req) => (
                  <div key={req.id} className="admin-client-card">
                    <div className="admin-client-card__header">
                      <div className="admin-client-card__header-info">
                        <span className="admin-client-card__name">Заявка №{req.id}</span>
                        <span className="admin-client-card__email" style={{ 
                          color: req.status === 'Resolve' ? '#4caf50' : req.status === 'Reject' ? '#f44336' : '#ffc107'
                        }}>
                          {req.status === 'Resolve' ? 'Исполнена' : req.status === 'Reject' ? 'Отклонена' : 'В обработке'}
                        </span>
                      </div>
                    </div>
                    <div className="admin-client-card__body">
                      <div className="admin-client-card__row">
                        <span className="admin-client-card__label">Счет отправитель</span>
                        <span className="admin-client-card__value">№{req.account_original_number} {req.account_original_product || ''}</span>
                      </div>
                      <div className="admin-client-card__row">
                        <span className="admin-client-card__label">Счет получатель</span>
                        <span className="admin-client-card__value">№{req.account_transfer_number} {req.account_transfer_product || ''}</span>
                      </div>
                      <div className="admin-client-card__row">
                        <span className="admin-client-card__label">Сумма перевода</span>
                        <span className="admin-client-card__value">
                          {req.currency_value_original.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {req.account_original_currency}
                        </span>
                      </div>
                      <div className="admin-client-card__row">
                        <span className="admin-client-card__label">Сумма получения</span>
                        <span className="admin-client-card__value">
                          {req.account_original_currency === req.account_transfer_currency ? (
                            // Если валюты одинаковые - показываем сумму перевода
                            `${req.currency_value_original.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${req.account_transfer_currency}`
                          ) : (
                            // Если валюты разные
                            req.status === 'Pending' ? (
                              // Если в обработке - показываем "обрабатывается"
                              'обрабатывается'
                            ) : (
                              // Если обработано - показываем фактическую сумму получения
                              `${req.currency_value_transfer.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${req.account_transfer_currency}`
                            )
                          )}
                        </span>
                      </div>
                      {req.rejection_reason && (
                        <div className="admin-client-card__row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                          <span className="admin-client-card__label" style={{ color: '#f44336' }}>Причина отклонения</span>
                          <span className="admin-client-card__value" style={{ wordBreak: 'break-word', textAlign: 'left', color: '#f44336', fontSize: '12px' }}>
                            {req.rejection_reason}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="admin-client-card__footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="admin-client-card__status" style={{ fontSize: '12px', color: '#9aa6bf' }}>
                        {new Date(req.date).toLocaleString('ru-RU')}
                      </span>
                      {req.status === 'Pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCancelConfirmTransferRequest(req.id);
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: '#ff6b8f',
                            background: 'rgba(255, 99, 132, 0.16)',
                            border: '1px solid rgba(255, 99, 132, 0.35)',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 99, 132, 0.25)';
                            e.target.style.borderColor = 'rgba(255, 99, 132, 0.5)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 99, 132, 0.16)';
                            e.target.style.borderColor = 'rgba(255, 99, 132, 0.35)';
                          }}
                        >
                          Отменить
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </RootPortal>
  )}
  {cancelConfirmRequest && (
    <RootPortal>
      <div className="notification-withdrawl-modal-window flex flex-column" onClick={() => setCancelConfirmRequest(null)}>
        <div className="notification-withdrawl-modal-window-menu gradient-border flex flex-column bru-max" onClick={(e) => e.stopPropagation()}>
          <div className="notification-withdrawl-modal-window-menu-cancel flex pointer" onClick={() => setCancelConfirmRequest(null)}>
            <div className="notification-withdrawl-modal-window-menu-cancel-icon img"></div>
          </div>
          <div className="notification-withdrawl-modal-window-menu-titleImg flex pointer" onClick={() => setCancelConfirmRequest(null)} style={{ marginTop: '1vw' }}>
            <div className="notification-withdrawl-modal-window-menu-titleImg-icon img" style={{ backgroundImage: `url("${mainLogo}")` }}></div>
          </div>
          <h2 className="notification-withdrawl-modal-window-menu-title" style={{ width: '100%', marginTop: '1vw', marginBottom: '1vw' }}>ПОДТВЕРЖДЕНИЕ ОТМЕНЫ</h2>
          <div className="notification-withdrawl-modal-window-menu-item flex flex-column" style={{ marginBottom: '1.5vw' }}>
            <div className="notification-withdrawl-modal-window-menu-item-inputwrapper gradient-border flex bru">
              <div className="notification-withdrawl-modal-window-menu-item-text bru">
                Вы уверены, что хотите отменить заявку на вывод №{cancelConfirmRequest}?
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1vw', justifyContent: 'center', width: '100%', paddingBottom: '1vw' }}>
            <div 
              className="notification-withdrawl-modal-window-menu-button gradient-border flex flex-column bru pointer" 
              onClick={() => setCancelConfirmRequest(null)}
              style={{ width: '40%', background: 'rgba(255, 255, 255, 0.1)' }}
            >
              ОТМЕНА
            </div>
            <div 
              className="notification-withdrawl-modal-window-menu-button gradient-border flex flex-column bru pointer" 
              onClick={async () => {
                try {
                  await axiosAPI.delete(`/profile/withdraw/requests/${cancelConfirmRequest}`);
                  document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'success', text: 'Заявка на вывод отменена' } }));
                  setCancelConfirmRequest(null);
                  // Обновляем список заявок
                  const { data } = await axiosAPI.get('/profile/withdraw/requests');
                  setWithdrawRequests(data?.requests || []);
                  // Обновляем флаг наличия заявок
                  const { data: pendData } = await axiosAPI.get('/profile/withdraw/pending');
                  const pendings = pendData?.pendings || {};
                  const allRequests = Array.isArray(data?.requests) ? data.requests : [];
                  const hasPending = Object.keys(pendings).length > 0;
                  const hasAnyRequests = allRequests.length > 0;
                  setHasPendingWithdrawals(hasPending || hasAnyRequests);
                } catch (error) {
                  const msg = error?.response?.data?.message || error?.message || 'Ошибка отмены заявки';
                  document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: msg } }));
                }
              }}
              style={{ width: '40%' }}
            >
              ДА, ОТМЕНИТЬ
            </div>
          </div>
        </div>
      </div>
    </RootPortal>
  )}
  {cancelConfirmTransferRequest && (
    <RootPortal>
      <div className="notification-withdrawl-modal-window flex flex-column" onClick={() => setCancelConfirmTransferRequest(null)}>
        <div className="notification-withdrawl-modal-window-menu gradient-border flex flex-column bru-max" onClick={(e) => e.stopPropagation()}>
          <div className="notification-withdrawl-modal-window-menu-cancel flex pointer" onClick={() => setCancelConfirmTransferRequest(null)}>
            <div className="notification-withdrawl-modal-window-menu-cancel-icon img"></div>
          </div>
          <div className="notification-withdrawl-modal-window-menu-titleImg flex pointer" onClick={() => setCancelConfirmTransferRequest(null)} style={{ marginTop: '1vw' }}>
            <div className="notification-withdrawl-modal-window-menu-titleImg-icon img" style={{ backgroundImage: `url("${mainLogo}")` }}></div>
          </div>
          <h2 className="notification-withdrawl-modal-window-menu-title" style={{ width: '100%', marginTop: '1vw', marginBottom: '1vw' }}>ПОДТВЕРЖДЕНИЕ ОТМЕНЫ</h2>
          <div className="notification-withdrawl-modal-window-menu-item flex flex-column" style={{ marginBottom: '1.5vw' }}>
            <div className="notification-withdrawl-modal-window-menu-item-inputwrapper gradient-border flex bru">
              <div className="notification-withdrawl-modal-window-menu-item-text bru">
                Вы уверены, что хотите отменить заявку на перевод №{cancelConfirmTransferRequest}?
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1vw', justifyContent: 'center', width: '100%', paddingBottom: '1vw' }}>
            <div 
              className="notification-withdrawl-modal-window-menu-button gradient-border flex flex-column bru pointer" 
              onClick={() => setCancelConfirmTransferRequest(null)}
              style={{ width: '40%', background: 'rgba(255, 255, 255, 0.1)' }}
            >
              ОТМЕНА
            </div>
            <div 
              className="notification-withdrawl-modal-window-menu-button gradient-border flex flex-column bru pointer" 
              onClick={async () => {
                try {
                  await axiosAPI.delete(`/profile/transfers/requests/${cancelConfirmTransferRequest}`);
                  document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'success', text: 'Заявка на перевод отменена' } }));
                  setCancelConfirmTransferRequest(null);
                  // Обновляем список заявок
                  const { data } = await axiosAPI.get('/profile/transfers/requests');
                  setTransferRequests(data?.requests || []);
                  // Обновляем флаг наличия заявок
                  const hasTransferRequests = (data?.requests || []).length > 0;
                  setHasPendingTransfers(hasTransferRequests);
                } catch (error) {
                  const msg = error?.response?.data?.message || error?.message || 'Ошибка отмены заявки';
                  document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: msg } }));
                }
              }}
              style={{ width: '40%' }}
            >
              ДА, ОТМЕНИТЬ
            </div>
          </div>
        </div>
      </div>
    </RootPortal>
  )}
  </>
  );
}

export default AccountsRoom;



