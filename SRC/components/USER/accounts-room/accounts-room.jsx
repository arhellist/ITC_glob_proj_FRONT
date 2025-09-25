import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import axiosAPI from "../../../JS/auth/http/axios.js";
import "./accounts-room.css";
import ModalWindowOpenNewAccount from "./modal-window-account-room/open-new-account.jsx";
import ModalWindowSendRequestDeposit from "./modal-window-account-room/send-request-deposit.jsx";
import ModalWindowSendRequestTransfer from "./modal-window-account-room/send-request-transfer.jsx";
import ModalWindowSendRequestWithdrawl from "./modal-window-account-room/send-request-withdrawl.jsx";

function AccountsRoom() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openModal, setOpenModal] = useState(""); // 'open' | 'deposit' | 'transfer' | 'withdraw'
  const [transferFromId, setTransferFromId] = useState("");
  const [transferToId, setTransferToId] = useState("");

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await axiosAPI.get('/profile/accounts');
        if (!isMounted) return;
        setAccounts(Array.isArray(data?.accounts) ? data.accounts : []);
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
            {!loading && !error && accounts.length > 0 && accounts.map((acc) => (
              <div key={acc.id} className="account-container-myaccounts-table-item gradient-border flex flex-column bru">
                <div className="account-container-myaccounts-table-item-number"><span>№</span><span className="account-number">{acc.id}</span></div>
                <div className="account-container-myaccounts-table-item-product"><span>Продукт:</span><span className="account-product">{acc.product || '-'}</span></div>
                <div className="account-container-myaccounts-table-item-name"><span>"</span><span className="account-name">{acc.name || '-'}</span><span>"</span></div>
                <div className="account-container-myaccounts-table-item-currency"><span>валюта:</span><span className="account-currency">{acc.currency || '-'}</span></div>
                <div className="account-container-myaccounts-table-item-value"><span>Сумма:</span><span className="account-value">{(acc.value ?? 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className="dollar">$</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="account-container-right flex flex-column">
        <div className="account-container-right-refaccount gradient-border flex flex-column bru-max">
          <div className="account-container-right-refaccount-title">реферальный счет</div>
          <div className="account-container-right-refaccount-number"><span>№</span><span className="account-number">441516283746</span></div>
          <div className="account-container-right-refaccount-text"><span className="refaccount-value">5700</span><span>$</span></div>
        </div>
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
            <div className="account-container-buttons-item-button gradient-border flex bru pointer" onClick={() => setOpenModal('transfer')}>подать заявку</div>
          </div>
          <div className="account-container-buttons-item gradient-border flex flex-column bru-max">
            <div className="account-container-buttons-item-title">подать заявку на вывод средств</div>
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
                setAccounts(Array.isArray(data?.accounts) ? data.accounts : []);
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
  </>
  );
}

export default AccountsRoom;



