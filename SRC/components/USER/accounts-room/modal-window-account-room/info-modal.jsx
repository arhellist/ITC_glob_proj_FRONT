import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function InfoModal() {
  const [open, setOpen] = useState(false);
  const [header, setHeader] = useState('Информация');
  const [text, setText] = useState('');

  useEffect(() => {
    const handler = (e) => {
      const { header: h, text: t } = e.detail || {};
      setHeader(h || 'Информация');
      setText(t || '');
      setOpen(true);
    };
    document.addEventListener('main-open-info-modal', handler);
    return () => document.removeEventListener('main-open-info-modal', handler);
  }, []);

  if (!open) return null;

  const rootEl = typeof document !== 'undefined' ? document.querySelector('.root') : null;
  if (!rootEl) return null;

  return createPortal(



    <div className="notification-withdrawl-modal-window flex flex-column" onClick={()=> setOpen(false)}>
    <div className="notification-withdrawl-modal-window-menu gradient-border flex flex-column bru-max" onClick={(e)=>e.stopPropagation()}>
      <div className="notification-withdrawl-modal-window-menu-cancel flex pointer" onClick={()=> setOpen(false)}>
        <div className="notification-withdrawl-modal-window-menu-cancel-icon img"></div>
      </div>
      <div className="notification-withdrawl-modal-window-menu-titleImg flex pointer" onClick={()=> setOpen(false)}>
        <div className="notification-withdrawl-modal-window-menu-titleImg-icon img"></div>
      </div>

      <h2 className="notification-withdrawl-modal-window-menu-title">{header}</h2>
      <div className="notification-withdrawl-modal-window-menu-item flex flex-column">
        <div className="notification-withdrawl-modal-window-menu-item-inputwrapper gradient-border flex bru">
                <div className="notification-withdrawl-modal-window-menu-item-text bru" > {text}</div>
                </div>
      </div>
      <div className="notification-withdrawl-modal-window-menu-button gradient-border flex flex-column bru pointer" onClick={()=> setOpen(false)}>ОЗНАКОМЛЕН</div>
    </div>
  </div>

  , rootEl);
}

export default InfoModal;


