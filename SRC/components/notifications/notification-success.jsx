import { useEffect, useRef } from "react";

function NotificationSuccess({ text, onClose }) {
  const hasHoveredRef = useRef(false);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    hasHoveredRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const handleMouseLeave = (e) => {
    if (hasHoveredRef.current && !timeoutRef.current) {
      const not = e.currentTarget.closest(".notification.success");
      if (not) not.classList.add("delete_notification");
      timeoutRef.current = setTimeout(() => {
        if (typeof onClose === "function") {
          onClose();
        }
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="notification success flex flex-row bru pointer"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="success_icon notification_img img"></div>
      <div className="text">{text}</div>
    </div>
  );
}

export default NotificationSuccess;
