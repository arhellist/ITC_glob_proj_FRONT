import React, { useState } from 'react';
import adminService from '../../../../../JS/services/admin-service';

const UserProfile = ({ user, onUserUpdate, onPasswordReset, onAccountBlock }) => {
  const [notes, setNotes] = useState(user?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  if (!user) return null;

  const handleSaveNotes = async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const result = await adminService.updateUserNotes(user.id, notes);
      
      if (result.success) {
        setSaveMessage('Заметки сохранены успешно');
        
        // Обновляем данные пользователя в родительском компоненте
        if (onUserUpdate) {
          onUserUpdate({
            ...user,
            description: notes
          });
        }
        
        // Скрываем сообщение через 3 секунды
        setTimeout(() => setSaveMessage(''), 3000);
      }
    } catch (error) {
      console.error('Ошибка сохранения заметок:', error);
      setSaveMessage('Ошибка сохранения заметок');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="admin-user-portfolio-list-item user-profile active-tab">
      <div className="admin-user-portfolio-list-item-content-grid">
        <div className="user-profile-form">
          <div className="user-profile-block">
            <label>Фамилия Имя Отчество</label>
            <input type="text" value={user.fullName} readOnly />
          </div>
          <div className="user-profile-grid">
            <div>
              <label>Телефон</label>
              <input type="tel" value={user.phone} readOnly />
            </div>
            <div>
              <label>Email</label>
              <input type="email" value={user.email} readOnly />
            </div>
            <div>
              <label>Telegram</label>
              <input type="text" value={user.telegramHandle} readOnly />
            </div>
            <div>
              <label>Местоположение</label>
              <input type="text" value={user.geography} readOnly />
            </div>
          </div>
          <div className="user-profile-block">
            <label>Заметки о клиенте</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Заметки об инвесторе"
            />
          </div>
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('успешно') ? 'success' : 'error'}`}>
              {saveMessage}
            </div>
          )}
          <button
            type="button"
            className={`user-profile-save ${isSaving ? 'saving' : ''}`}
            onClick={handleSaveNotes}
          >
            {isSaving ? 'сохранение...' : 'сохранить заметки'}
          </button>
        </div>

        <div className="user-profile-side">
          <div className="user-profile-avatar">
            {user.avatar && user.avatar !== 'noAvatar' ? (
              <img
                src={user.avatar.startsWith('http') ? user.avatar : `${import.meta.env.VITE_API_URL}${user.avatar}`}
                alt={user.fullName}
              />
            ) : (
              <span>{(user.fullName || 'NA').split(' ').map((part) => part[0]).join('').toUpperCase()}</span>
            )}
          </div>

          <div className="user-profile-reset">
            <label>Сброс пароля клиента</label>
            <button 
              type="button"
              onClick={() => {
                if (onPasswordReset) {
                  onPasswordReset();
                }
              }}
            >
              СБРОСИТЬ ПАРОЛЬ
            </button>
          </div>

          <div className="user-profile-reset">
            <label>
              {user?.isBlocked ? 'Аккаунт клиента ЗАБЛОКИРОВАН' : 'Аккаунт клиента РАЗБЛОКИРОВАН'}
            </label>
            <button 
              type="button"
              onClick={() => {
                if (onAccountBlock) {
                  onAccountBlock();
                }
              }}
              style={{
                backgroundColor: user?.isBlocked ? '#4CAF50' : '#ff6b6b',
                color: 'white'
              }}
            >
              {user?.isBlocked ? 'РАЗБЛОКИРОВАТЬ АККАУНТ' : 'ЗАБЛОКИРОВАТЬ АККАУНТ'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;