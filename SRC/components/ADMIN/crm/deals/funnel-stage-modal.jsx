import React, { useState } from 'react';

const FunnelStageModal = ({ onClose, onSave }) => {
  const [stageName, setStageName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!stageName.trim()) {
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Введите название этапа'
        }
      }));
      return;
    }

    onSave({ name: stageName.trim() });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Создать этап воронки</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="stageName">Название этапа</label>
            <input
              type="text"
              id="stageName"
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              placeholder="Например: Первичный контакт"
              autoFocus
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-cancel">
              Отмена
            </button>
            <button type="submit" className="btn-save">
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FunnelStageModal;
