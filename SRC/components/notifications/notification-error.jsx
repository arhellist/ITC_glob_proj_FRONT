function NotificationError({ text, onClose }) {
  
  
  const handleCancel = (e) => {
    try {
      const root = e.currentTarget.closest('.notification.error');
      if (root) root.classList.add('delete_notification');
    } catch(err) {
      console.error("Ошибка при закрытии уведомления:", err);
    }
    setTimeout(() => {
      if (typeof onClose === 'function') onClose();
    }, 2000);
  };

  return (
    <div className="notification error flex flex-row bru pointer">
      <div className="cancel_icon_notification img" onClick={handleCancel}></div>
      <div className="error_icon notification_img img"></div>
      <div className="text">{text}</div>
    </div>
  );
}

export default NotificationError;
