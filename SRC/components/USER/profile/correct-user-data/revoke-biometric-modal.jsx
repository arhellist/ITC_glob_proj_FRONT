import React from 'react';
import '../../../entryes/entryes.css';
import './correct-user-data.css';

/**
 * Модальное окно подтверждения удаления биометрического ключа
 */
function RevokeBiometricModal({ onConfirm, onCancel, deviceName }) {
  // Обрезаем токен из имени устройства, если он есть
  const cleanDeviceName = deviceName ? deviceName.split('|REVOKE_TOKEN:')[0].split('|TOKEN:')[0] : '';

  return (
    <div 
      className="revoke-biometric-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000
      }}
      onClick={onCancel}
    >
      <div 
        className="revoke-biometric-modal gradient-border bru flex flex-column"
        style={{
          backgroundColor: '#1a1a1a',
          padding: '2vw',
          borderRadius: '12px',
          maxWidth: '500px',
          width: '90%',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 0 0.8vw 0.2vw rgba(0, 0, 0, 0.5)',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="form-login-logo" style={{ marginBottom: '1.5vw' }}>
          <div className="form-login-logo-img img"></div>
        </div>

        <h2 style={{ 
          color: '#fff', 
          marginBottom: '1vw', 
          fontSize: '1.3vw', 
          fontWeight: '600',
          textAlign: 'center',
          textTransform: 'uppercase',
          wordBreak: 'break-word'
        }}>
          Подтверждение удаления
        </h2>
        
        <div style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.05)', 
          padding: '1.5vw', 
          borderRadius: '8px', 
          marginBottom: '1.5vw',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxSizing: 'border-box',
          overflow: 'hidden',
          width: '100%'
        }}>
          <p style={{ 
            color: '#fff', 
            marginBottom: '0.5vw', 
            fontSize: '1vw', 
            lineHeight: '1.6',
            textAlign: 'center',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto'
          }}>
            Вы уверены, что хотите отозвать этот биометрический ключ?
          </p>
          {cleanDeviceName && (
            <p style={{ 
              color: '#aaa', 
              fontSize: '0.9vw', 
              textAlign: 'center',
              marginTop: '0.5vw',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              hyphens: 'auto',
              maxWidth: '100%'
            }}>
              Устройство: {cleanDeviceName}
            </p>
          )}
          <p style={{ 
            color: '#ff6b6b', 
            fontSize: '0.85vw', 
            textAlign: 'center',
            marginTop: '1vw',
            fontWeight: '500',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto'
          }}>
            ⚠️ После удаления вы не сможете использовать это устройство для входа через биометрию
          </p>
        </div>
        
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '1vw',
          marginTop: '1vw'
        }}>
          <button 
            className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
            style={{
              padding: '0.8vw 2vw',
              fontSize: '1vw',
              fontWeight: '600',
              cursor: 'pointer',
              minWidth: '120px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}
            onClick={onCancel}
          >
            Отмена
          </button>
          <button 
            className="button txt-white gradient-effect-bg gradient-effect-border"
            style={{
              padding: '0.8vw 2vw',
              fontSize: '1vw',
              fontWeight: '600',
              cursor: 'pointer',
              minWidth: '120px',
              background: 'linear-gradient(90deg, #ff6b6b 0%, #ee5a6f 100%)',
              border: 'none'
            }}
            onClick={onConfirm}
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}

export default RevokeBiometricModal;

