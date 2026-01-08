import React, { useState, useEffect, useRef } from 'react';
import './entryes.css';

/**
 * Модальное окно для запроса разрешений на сбор данных отпечатка браузера
 * 
 * ВАЖНО: Это НЕ системные разрешения браузера!
 * 
 * Как это работает:
 * 1. Пользователь выбирает, какие данные разрешить собирать
 * 2. Выбор сохраняется в localStorage как JSON объект
 * 3. При входе мы читаем этот объект и вызываем только разрешенные функции
 * 
 * Браузер НЕ запрашивает разрешения - мы просто уважаем выбор пользователя
 * и не вызываем функции сбора данных, если пользователь не дал согласие.
 * 
 * Все эти API (Canvas, WebGL, Audio, navigator.plugins и т.д.) доступны
 * без явных разрешений браузера, но мы предоставляем пользователю контроль.
 */
function FingerprintPermissionsModal({ onPermissionsGranted, onPermissionsDenied }) {
  const overlayRef = useRef(null);
  const modalRef = useRef(null);
  
  const [permissions, setPermissions] = useState({
    canvas: false,
    webgl: false,
    audio: false,
    fonts: false,
    plugins: false,
    hardware: false
  });

  // Блокируем прокрутку body когда модалка открыта
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Обработчики touch событий для прокрутки модального окна на мобильных устройствах
  useEffect(() => {
    const modal = modalRef.current;
    if (!modal) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let scrollStart = 0;
    let isVerticalScroll = false;
    let touchStartTime = 0;

    const handleTouchStart = (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      scrollStart = modal.scrollTop;
      isVerticalScroll = false;
      touchStartTime = Date.now();
    };

    const handleTouchMove = (e) => {
      if (!touchStartY) return;

      const touchY = e.touches[0].clientY;
      const touchX = e.touches[0].clientX;
      const deltaY = touchStartY - touchY;
      const deltaX = touchStartX - touchX;
      
      // Определяем направление прокрутки только один раз
      if (!isVerticalScroll) {
        if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 3) {
          isVerticalScroll = true;
        } else if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 3) {
          // Горизонтальная прокрутка - не обрабатываем
          touchStartY = 0;
          return;
        } else {
          // Слишком маленькое движение - ждем больше
          return;
        }
      }

      if (!isVerticalScroll) return;

      const scrollTop = modal.scrollTop;
      const scrollHeight = modal.scrollHeight;
      const clientHeight = modal.clientHeight;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);

      // Всегда прокручиваем, если это вертикальное движение
      const newScrollTop = scrollStart + deltaY;
      modal.scrollTop = Math.max(0, Math.min(maxScroll, newScrollTop));
      e.preventDefault();
      e.stopPropagation();
    };

    const handleTouchEnd = (e) => {
      touchStartY = 0;
      touchStartX = 0;
      scrollStart = 0;
      isVerticalScroll = false;
      touchStartTime = 0;
    };

    // Используем passive: false для touchmove, чтобы иметь возможность preventDefault
    modal.addEventListener('touchstart', handleTouchStart, { passive: true });
    modal.addEventListener('touchmove', handleTouchMove, { passive: false });
    modal.addEventListener('touchend', handleTouchEnd, { passive: true });
    modal.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      modal.removeEventListener('touchstart', handleTouchStart);
      modal.removeEventListener('touchmove', handleTouchMove);
      modal.removeEventListener('touchend', handleTouchEnd);
      modal.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []);

  const handlePermissionToggle = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleGrantAll = () => {
    setPermissions({
      canvas: true,
      webgl: true,
      audio: true,
      fonts: true,
      plugins: true,
      hardware: true
    });
  };

  const handleDenyAll = () => {
    setPermissions({
      canvas: false,
      webgl: false,
      audio: false,
      fonts: false,
      plugins: false,
      hardware: false
    });
  };

  const handleConfirm = () => {
    // Сохраняем разрешения в localStorage
    // Это НЕ системное разрешение браузера, а наше внутреннее согласие пользователя
    localStorage.setItem('fingerprint_permissions', JSON.stringify(permissions));
    
    if (onPermissionsGranted) {
      onPermissionsGranted(permissions);
    }
  };

  const handleCancel = () => {
    // Сохраняем отказ от всех разрешений
    localStorage.setItem('fingerprint_permissions', JSON.stringify({
      canvas: false,
      webgl: false,
      audio: false,
      fonts: false,
      plugins: false,
      hardware: false
    }));
    
    if (onPermissionsDenied) {
      onPermissionsDenied();
    }
  };

  return (
    <div 
      ref={overlayRef}
      className="fingerprint-permissions-modal-overlay" 
      onClick={(e) => {
        if (e.target === overlayRef.current) {
          handleCancel();
        }
      }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        zIndex: 10000,
        padding: '20px',
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden'
      }}
    >
      <div 
        ref={modalRef}
        className="fingerprint-permissions-modal" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: '#1a1a1a',
          padding: '2rem',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          minHeight: '400px',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          boxSizing: 'border-box',
          overflowY: 'scroll',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          overscrollBehavior: 'contain',
          // Критично для мобильной прокрутки
          willChange: 'scroll-position',
          WebkitTransform: 'translateZ(0)',
          transform: 'translateZ(0)'
        }}
      >
        <h2 style={{ color: '#fff', marginBottom: '1rem', fontSize: '1.5rem' }}>
          Разрешения для безопасности
        </h2>
        
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          padding: '1rem', 
          borderRadius: '8px', 
          marginBottom: '1.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <p style={{ color: '#fff', marginBottom: '0.75rem', fontSize: '0.95rem', lineHeight: '1.6', fontWeight: '500' }}>
            Для повышения безопасности вашего аккаунта мы собираем цифровой отпечаток вашего браузера. 
            Это помогает защитить вас от несанкционированного доступа и мошенничества.
          </p>
          
          <p style={{ color: '#aaa', marginBottom: '0.75rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <strong style={{ color: '#fff' }}>Использование куки:</strong> Наш сайт использует куки для безопасного доступа к персональной информации и обеспечения защиты вашего аккаунта.
          </p>
          
          <p style={{ color: '#aaa', marginBottom: '0.75rem', fontSize: '0.9rem', lineHeight: '1.6' }}>
            <strong style={{ color: '#fff' }}>Конфиденциальность данных:</strong> Полученные данные о вашем устройстве и браузере:
          </p>
          
          <ul style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.8', marginLeft: '1.5rem', marginBottom: '0.75rem' }}>
            <li>Не передаются третьим лицам</li>
            <li>Не используются в рекламных целях</li>
            <li>Используются исключительно для аутентификации и безопасности</li>
            <li>Применяются для борьбы с мошенничеством</li>
          </ul>
          
          <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: '1.6', fontStyle: 'italic' }}>
            Вы можете выбрать, какие данные разрешить собирать. Базовые данные (User Agent, разрешение экрана, часовой пояс) собираются всегда и не требуют разрешения.
          </p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <input
                type="checkbox"
                checked={permissions.canvas}
                onChange={() => handlePermissionToggle('canvas')}
                style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', marginBottom: '0.25rem' }}>Canvas fingerprinting</span>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>Анализ рендеринга Canvas для создания уникального отпечатка</span>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <input
                type="checkbox"
                checked={permissions.webgl}
                onChange={() => handlePermissionToggle('webgl')}
                style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', marginBottom: '0.25rem' }}>WebGL fingerprinting</span>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>Информация о видеокарте и WebGL драйверах</span>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <input
                type="checkbox"
                checked={permissions.audio}
                onChange={() => handlePermissionToggle('audio')}
                style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', marginBottom: '0.25rem' }}>Audio fingerprinting</span>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>Анализ обработки аудио для создания уникального отпечатка</span>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <input
                type="checkbox"
                checked={permissions.fonts}
                onChange={() => handlePermissionToggle('fonts')}
                style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', marginBottom: '0.25rem' }}>Установленные шрифты</span>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>Список установленных в системе шрифтов</span>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <input
                type="checkbox"
                checked={permissions.plugins}
                onChange={() => handlePermissionToggle('plugins')}
                style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', marginBottom: '0.25rem' }}>Плагины браузера</span>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>Список установленных плагинов и MIME-типов</span>
              </div>
            </label>
          </div>

          <div style={{ marginBottom: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label style={{ color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
              <input
                type="checkbox"
                checked={permissions.hardware}
                onChange={() => handlePermissionToggle('hardware')}
                style={{ width: '18px', height: '18px', cursor: 'pointer', flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <span style={{ display: 'block', marginBottom: '0.25rem' }}>Аппаратные характеристики</span>
                <span style={{ fontSize: '0.8rem', color: '#888' }}>Количество ядер CPU и объем оперативной памяти</span>
              </div>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <button
            onClick={handleGrantAll}
            style={{
              flex: 1,
              padding: '0.5rem',
              backgroundColor: 'rgba(76, 175, 80, 0.2)',
              color: '#4CAF50',
              border: '1px solid #4CAF50',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Разрешить все
          </button>
          <button
            onClick={handleDenyAll}
            style={{
              flex: 1,
              padding: '0.5rem',
              backgroundColor: 'rgba(255, 107, 107, 0.2)',
              color: '#ff6b6b',
              border: '1px solid #ff6b6b',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}
          >
            Отказать всем
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleConfirm}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#4CAF50',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold'
            }}
          >
            Подтвердить
          </button>
          <button
            onClick={handleCancel}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

export default FingerprintPermissionsModal;
