
import { useEffect, useState } from "react";
import axiosAPI from "../../../../JS/auth/http/axios.js";
import NotificationSuccess from "../../../notifications/notification-success.jsx";
import NotificationError from "../../../notifications/notification-error.jsx";
import NotificationAttention from "../../../notifications/notification-attantion.jsx";
import NotificationInfo from "../../../notifications/notification-info.jsx";

function ContainerNotification() {
  const [showSuccess, setShowSuccess] = useState("");
  const [successMsgs, setSuccessMsgs] = useState([]);
  const [attentionMsgs, setAttentionMsgs] = useState([]);
  const [errorMsgs, setErrorMsgs] = useState([]);
  const [infoNotifs, setInfoNotifs] = useState([]); // [{id, header, description}]

  // Загрузка непрочитанных INFO из БД
  const refreshInfo = async () => {
    try {
      const { data } = await axiosAPI.get('/profile/notifications');
      const list = Array.isArray(data?.notifications) ? data.notifications : [];
      setInfoNotifs(list.map(n => ({ id: n.id, header: n.header, description: n.description })));
    } catch (e) {
      // молча, не ломаем UI
    }
  };

  // Слушатель нотификаций
  useEffect(() => {
    const handler = (e) => {
      const { type, text } = e.detail || {};
      if (type === 'success') {
        if (text) setSuccessMsgs((prev) => [...prev, text]);
      } else if (type === 'attention') {
        if (text) setAttentionMsgs((prev) => [...prev, text]);
      } else if (type === 'error') {
        if (text) setErrorMsgs((prev) => [...prev, text]);
      } else if (type === 'info') {
        // Тригерим подтяжку INFO из БД
        refreshInfo();
      }
    };

    const refreshHandler = () => refreshInfo();
    
    document.addEventListener('main-notify', handler);
    document.addEventListener('main-notify-info-refresh', refreshHandler);
    return () => {
      document.removeEventListener('main-notify', handler);
      document.removeEventListener('main-notify-info-refresh', refreshHandler);
    };
  }, []);

  // Обработка уведомлений из sessionStorage
  useEffect(() => {
    const note = sessionStorage.getItem('notify_success');
    if (note) {
      setTimeout(() => {
        setShowSuccess(note);
        sessionStorage.removeItem('notify_success');
      }, 0);
    }
  }, []);

  // Первая загрузка INFO
  useEffect(() => { refreshInfo(); }, []);

  const openInfoModal = async (notif) => {
    // Удаляем карточку из списка
    setInfoNotifs(prev => prev.filter(n => n.id !== notif.id));
    // Помечаем прочитанным, если из БД
    if (!notif.local) {
      try { await axiosAPI.put(`/profile/notifications/${notif.id}/read`); } catch(e) {}
    }
    // Открываем модалку через глобальное событие
    document.dispatchEvent(new CustomEvent('main-open-info-modal', { detail: { header: notif.header || 'Информация', text: notif.description || '' } }));
  };

  return (
    <div className="root-content-notification-container flex flex-column">
      {showSuccess && (
        <NotificationSuccess
          text={showSuccess}
          onClose={() => setShowSuccess("")}
        />
      )}
      {successMsgs.map((m, idx) => (
        <NotificationSuccess key={`s-${idx}`} text={m} onClose={() => {
          setSuccessMsgs((prev) => prev.filter((_, i) => i !== idx));
        }} />
      ))}
      {attentionMsgs.map((m, idx) => (
        <NotificationAttention key={`a-${idx}`} text={m} onClose={() => {
          setAttentionMsgs((prev) => prev.filter((_, i) => i !== idx));
        }} />
      ))}
      {errorMsgs.map((m, idx) => (
        <NotificationError key={`e-${idx}`} text={m} onClose={() => {
          setErrorMsgs((prev) => prev.filter((_, i) => i !== idx));
        }} />
      ))}

      {infoNotifs.map((n) => (
        <div key={`i-${n.id}`} onClick={() => openInfoModal(n)}>
          <NotificationInfo text={n.description} />
        </div>
      ))}
    </div>
  );
}

export default ContainerNotification;


