import { useState } from "react";
import axiosAPI from "../../../../JS/auth/http/axios.js";
import NotificationSuccess from "../../../notifications/notification-success.jsx";
import "../accounts-room.css";

function ModalWindowOpenNewAccount({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [product, setProduct] = useState("Classic");
  const [success, setSuccess] = useState("");

  const handleCreate = async () => {
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
  return (
    <div className="account-container-addAccount-modal-window flex flex-column" onClick={()=> onClose?.()}>
        <div className="account-container-addAccount-modal-window-menu gradient-border flex flex-column bru-max" onClick={(e)=>e.stopPropagation()}>
            <div className="account-container-addAccount-modal-window-menu-cancel flex pointer" onClick={()=> onClose?.()}>
                <div className="account-container-addAccount-modal-window-menu-cancel-icon img"></div>
            </div>
            <h2 className="account-container-addAccount-modal-window-menu-title">открыть новый инвестиционный счет</h2>
            
            <div className="account-container-addAccount-modal-window-menu-item flex flex-column">
                <label forHtml="new-account-name" className="">введите название счета</label>
                <div className="account-container-addAccount-modal-window-menu-item-inputwrapper gradient-border flex bru">
                    <input type="text" id="new-account-name" className="bru" value={name} onChange={(e)=>setName(e.target.value)} />
                </div>
                
            </div>

            <div className="account-container-addAccount-modal-window-menu-item flex flex-column">
                <label forHtml="new-account-product" className="">выберите продукт</label>
                <div className="account-container-addAccount-modal-window-menu-item-inputwrapper gradient-border flex bru">
                <select type="text" id="new-account-product" className="gradient-border bru" value={product} onChange={(e)=>setProduct(e.target.value)}>
                    <option value="Classic">CLASSIC</option>
                    <option value="Crypto">CRYPTO</option>
                    <option value="ETF">ETF</option>
                    <option value="ETF2">ETF-2.0</option>
                </select>
            </div>
            </div>

            <div className="account-container-addAccount-modal-window-menu-button gradient-border flex flex-column bru pointer" onClick={handleCreate}>открыть счет</div>
            {success && <NotificationSuccess text={success} onClose={()=>setSuccess("")} />}

        </div>
    </div>
  );
}

export default ModalWindowOpenNewAccount;


