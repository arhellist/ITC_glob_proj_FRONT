import React from 'react';

/**
 * Универсальное модальное окно уведомления (inline стили)
 */
const AlertModal = ({ title, message, onClose, buttonText = 'OK' }) => {
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10000
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          minWidth: '400px',
          maxWidth: '600px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ marginBottom: '20px', borderBottom: '1px solid #ddd', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, color: '#333', fontSize: '18px' }}>{title}</h3>
        </div>
        
        <div style={{ marginBottom: '20px', color: '#666', fontSize: '14px', lineHeight: '1.6' }}>
          <p style={{ whiteSpace: 'pre-line', margin: 0 }}>{message}</p>
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              background: '#1565c0',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
            onClick={onClose}
          >
            {buttonText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;

