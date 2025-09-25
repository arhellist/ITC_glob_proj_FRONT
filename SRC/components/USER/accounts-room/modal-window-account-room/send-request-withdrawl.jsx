import { useEffect, useState } from "react";
import axiosAPI from "../../../../JS/auth/http/axios.js";
import "../accounts-room.css";

function ModalWindowSendRequestWithdrawl({ onClose }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [balance, setBalance] = useState(0);
  const [amount, setAmount] = useState("");
  const [settings, setSettings] = useState({ percent: 1, min: 50 });
  const [pendingByAccount, setPendingByAccount] = useState({});

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [{ data: accData }, { data: setData }, { data: pendData }] = await Promise.all([
          axiosAPI.get('/profile/accounts'),
          axiosAPI.get('/profile/withdraw/settings'),
          axiosAPI.get('/profile/withdraw/pending')
        ]);
        if (!isMounted) return;
        const list = Array.isArray(accData?.accounts) ? accData.accounts : [];
        setAccounts(list);
        if (list.length) {
          setSelectedId(String(list[0].id));
          setBalance(Number(list[0].value || 0));
        }
        setSettings({ percent: Number(setData?.settings?.percent ?? 1), min: Number(setData?.settings?.min ?? 50) });
        setPendingByAccount(pendData?.pendings || {});
      } catch (e) {
        console.error('Ошибка загрузки данных для вывода:', e);
        document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Не удалось загрузить данные для вывода' } }));
      }
    })();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const acc = accounts.find(a => String(a.id) === String(selectedId));
    setBalance(acc ? Number(acc.value || 0) : 0);
  }, [selectedId, accounts]);

  const pendingForSelected = Number(pendingByAccount[String(selectedId)] || 0);

  const computeCommission = (val) => {
    const v = Number(val || 0);
    if (!v) return 0;
    const pct = (v * settings.percent) / 100;
    return Math.max(pct, settings.min);
  };

  const handleChangeAmount = (e) => {
    const v = e.target.value;
    setAmount(v);
    
    // Валидация при вводе с задержкой для предотвращения перемонтирования
    setTimeout(() => {
      const num = Number(v || 0);
      if (!selectedId || !Number.isFinite(num) || num <= 0) return;
      
      const fee = computeCommission(num);
      const available = balance - pendingForSelected;
      
      if (num > available) {
        document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'attention', text: 'Вы не можете вывести больше остатка на счете' } }));
        return;
      }
      
      if (num + fee > available) {
        document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'attention', text: 'Комиссия с учетом вывода превышает остаток на счете. Операция возможна, сумма к получению будет уменьшена.' } }));
      }
    }, 0);
  };

  const submit = async () => {
    const num = Number(amount || 0);
    if (!selectedId || !Number.isFinite(num) || num <= 0) {
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'attention', text: 'Введите корректную сумму для вывода' } }));
      return;
    }
    const fee = computeCommission(num);
    const available = balance - pendingForSelected;

    // Проверяем только критичные ошибки, которые блокируют операцию
    if (available <= 0) {
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Ошибка запроса' } }));
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'attention', text: 'Дождитесь решения по вашим оставленным ранее заявкам' } }));
      return;
    }

    // Если дошли сюда, значит операция возможна
    let payout = num;
    let extraFromBalance = 0;
    if (num + fee > available) {
      // списываем "over" из суммы вывода, остальное покрываем с баланса
      // итог к получению уменьшается на (fee - extraFromBalance)
      extraFromBalance = Math.min(fee, available - num >= 0 ? fee - (available - num) : fee);
      payout = Math.max(0, num - (fee - extraFromBalance));
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'attention', text: 'Комиссия с учетом вывода превышает остаток на счете' } }));
    }

    try {
      // отправка заявки на вывод
      const requisites = (typeof document !== 'undefined' ? document.getElementById('payment-info')?.value : '') || '';
      const { data } = await axiosAPI.post('/profile/withdraw', {
        account_id: Number(selectedId),
        widthdrawl_CURRENCY_value: Number(num.toFixed(10)), // Округляем до 10 знаков для точности
        commission_value: Number(fee.toFixed(10)), // Округляем до 10 знаков для точности
        payout_value: Number(payout.toFixed(10)), // Округляем до 10 знаков для точности
        widthdrawl_requisites: requisites,
      });
      const okMsg = data?.serviceMessage || 'Заявка на вывод отправлена';
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'success', text: okMsg } }));
      // Тригерим обновление INFO-уведомлений из БД
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'info' } }));
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Ошибка создания заявки на вывод';
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: msg } }));
    }
  };

  return (
    <div className="account-container-withdrawl-modal-window flex flex-column" onClick={()=> onClose?.()}>
        <div className="account-container-withdrawl-modal-window-menu gradient-border flex flex-column bru-max" onClick={(e)=>e.stopPropagation()}>
            <div className="account-container-withdrawl-modal-window-menu-cancel flex pointer" onClick={()=> onClose?.()}>
                <div className="account-container-withdrawl-modal-window-menu-cancel-icon img"></div>
            </div>
            <h2 className="account-container-withdrawl-modal-window-menu-title">подать заявку на вывод средств</h2>
            
            <div className="account-container-withdrawl-modal-window-menu-item flex flex-column">
                <label htmlFor="withdrawl-select-product" className="">выберите счет</label>
                <div className="account-container-withdrawl-modal-window-menu-item-inputwrapper gradient-border flex bru">
                <select type="text" id="withdrawl-select-product" className="gradient-border bru" value={selectedId} onChange={(e)=>setSelectedId(e.target.value)}>
                    {accounts.map(acc => (
                      <option key={acc.id} value={String(acc.id)}>
                        №{acc.id}, {acc.product || '-'}, {(acc.value ?? 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}$
                      </option>
                    ))}
                </select>
            </div>
            </div>

            <div className="account-container-withdrawl-modal-window-menu-item flex flex-column">
                <label htmlFor="withdrawl-summ" className="">введите значение суммы вывода</label>
                <div className="account-container-withdrawl-modal-window-menu-item-inputwrapper gradient-border flex bru">
                    <input type="number" id="withdrawl-summ" className="bru" value={amount} onChange={handleChangeAmount} />
                </div>
                
            </div>
            <div className="account-container-withdrawl-modal-window-menu-item flex flex-column">
                <label htmlFor="withdrawl-summ" className="">Укажите платежную информацию</label>
                <div className="account-container-withdrawl-modal-window-menu-item-inputwrapper gradient-border flex bru">
                    <textarea type="text" id="payment-info" className="bru" placeholder="Например: номер карты, номер кошелька, адрес электронной почты и т.д." />
                </div>
                
            </div>


            <div className="account-container-withdrawl-modal-window-menu-button gradient-border flex flex-column bru pointer" onClick={submit}>подать заявку</div>

        </div>
    </div>
  );
}

export default ModalWindowSendRequestWithdrawl;


