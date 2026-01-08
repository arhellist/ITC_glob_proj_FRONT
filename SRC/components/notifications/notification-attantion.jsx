import { useEffect, useRef } from "react";

function NotificationAttention({ text, id, onClose }) {
  const hasHoveredRef = useRef(false);
  const timeoutRef = useRef(null);
  const hasClickedRef = useRef(false);

  // Проверка, является ли устройство touch-устройством (мобильное/планшет)
  const isTouchDevice = () => {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  };

  const handleMouseEnter = () => {
    hasHoveredRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleMouseLeave = (e) => {
    // На touch-устройствах не обрабатываем mouseLeave
    if (isTouchDevice()) return;
    
    if (hasHoveredRef.current && !timeoutRef.current) {
      const not = e.currentTarget.closest(".notification.attention");
      if (not) not.classList.add("delete_notification");
      timeoutRef.current = setTimeout(() => {
        if (typeof onClose === "function") onClose();
      }, 2000);
    }
  };

  const handleClick = (e) => {
    // На touch-устройствах обрабатываем клик для удаления
    if (isTouchDevice() && !hasClickedRef.current) {
      hasClickedRef.current = true;
      e.stopPropagation();
      
      // Очищаем таймаут, если есть
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      const not = e.currentTarget.closest(".notification.attention");
      if (not) not.classList.add("delete_notification");
      
      // Удаляем нотификацию через небольшую задержку для анимации
      setTimeout(() => {
        if (typeof onClose === "function") {
          onClose();
        }
      }, 300);
    }
  };

  useEffect(() => () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }, []);

  return (
    <div
      className="notification attention flex flex-row bru pointer"
      data-id={id}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="notification-blur-background"></div>
      <div className="attention_icon notification_img img"></div>
      <div className="text">{text}</div>
    </div>
  );
}

export default NotificationAttention;
