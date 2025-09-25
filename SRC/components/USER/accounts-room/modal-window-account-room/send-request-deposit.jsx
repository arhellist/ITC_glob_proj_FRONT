import "../accounts-room.css";
import { useEffect, useRef, useState } from "react";
import axiosAPI from "../../../../JS/auth/http/axios.js";
import qrImg from "../../../../IMG/qrcode-transfer/qr.png";

function ModalWindowSendRequestDeposit({ onClose }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [rub, setRub] = useState("");
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('название файла');
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async ()=>{
      try {
        const { data } = await axiosAPI.get('/profile/accounts');
        const list = Array.isArray(data?.accounts) ? data.accounts : [];
        setAccounts(list);
        if (list.length) setSelectedId(String(list[0].id));
      } catch (e) {
        console.error('Ошибка загрузки счетов:', e);
        document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Не удалось загрузить счета' } }));
      }
    })();
  }, []);

  const submit = async () => {
    if (!selectedId || !rub) {
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'attention', text: 'Заполните счет и сумму в рублях' } }));
      return;
    }
    try {
      const form = new FormData();
      form.append('account_id', String(selectedId));
      form.append('deposit_RUB_value', String(rub));
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

            <span className="account-container-craa-modal-window-menu-qrcode-title">QR-код для пополнения</span>
            <div className="account-container-craa-modal-window-menu-qrcode pointer flex gradient-border bru">
                <img src={qrImg} alt="qrcode" className="account-container-craa-modal-window-menu-qrcode-img bru"/>
            </div>
            <span className="account-container-craa-modal-window-menu-qrcode-description">нажмите на QR-код для загрузки</span>

            <div className="account-container-craa-modal-window-menu-item flex flex-column">
                <label htmlFor="craa-product-to-summ" className="">введите сумму пополнения (RUB)</label>
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


