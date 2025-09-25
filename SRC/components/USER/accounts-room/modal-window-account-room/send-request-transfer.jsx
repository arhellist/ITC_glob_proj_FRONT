import { useEffect, useRef, useState } from "react";
import axiosAPI from "../../../../JS/auth/http/axios.js";
import NotificationError from "../../../notifications/notification-error.jsx";
import "../accounts-room.css";

function ModalWindowSendRequestTransfer({ onClose, onCreated, accounts = [], fromId, toId, setFromId, setToId }) {
  const [fromBalance, setFromBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState([]);
  const initDoneRef = useRef(false);

  // Инициализация значений только один раз при наличии accounts
  useEffect(() => {
    if (initDoneRef.current) return;
    if (!accounts || accounts.length === 0) return;
    if (!fromId) setFromId(String(accounts[0].id));
    if (!toId && accounts.length > 1) setToId(String(accounts[1].id));
    initDoneRef.current = true;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  useEffect(() => {
    const acc = accounts.find(a => String(a.id) === String(fromId));
    setFromBalance(acc ? Number(acc.value || 0) : 0);
  }, [fromId, accounts]);

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
                    {accounts.map(acc => (
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
                    {accounts.map(acc => (
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