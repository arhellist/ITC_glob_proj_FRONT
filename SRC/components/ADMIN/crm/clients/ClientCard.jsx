import React from 'react';
import { getAvatarUrl } from '../../../../config/api';

const ClientCard = ({ client, onClick }) => {
  // Форматирование ФИО
  const getFullName = () => {
    const parts = [];
    if (client.lastName) parts.push(client.lastName);
    if (client.firstName) parts.push(client.firstName);
    if (client.middleName) parts.push(client.middleName);
    return parts.join(' ') || 'Не указано';
  };

  // Форматирование email
  const getEmail = () => {
    return client.email || 'Не указан';
  };

  // Форматирование телефона
  const getPhone = () => {
    return client.phone || 'Не указан';
  };

  // Получение инициалов
  const getInitials = () => {
    const firstName = client.firstName || '';
    const lastName = client.lastName || '';
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    return firstInitial + lastInitial || 'К';
  };

  // Получение аватара
  const getAvatar = () => {
    const avatar = client.avatar || client.User?.avatar;
    return avatar && avatar !== "noAvatar" ? avatar : null;
  };

  return (
    <div className="client-card" onClick={onClick}>
      <div className="client-card-header">
        <div className="client-avatar">
          {(() => {
            const avatar = getAvatar();
            return avatar ? (
              <img
                src={getAvatarUrl(avatar)}
                alt="Avatar"
              />
            ) : (
              <span className="client-initials">{getInitials()}</span>
            );
          })()}
        </div>
      </div>

      <div className="client-card-body">
        <h3 className="client-name">{getFullName()}</h3>
        
        <div className="client-info">
          <div className="client-info-item">
            <span className="client-info-icon">📧</span>
            <span className="client-info-text">{getEmail()}</span>
          </div>
          
          <div className="client-info-item">
            <span className="client-info-icon">📞</span>
            <span className="client-info-text">{getPhone()}</span>
          </div>
        </div>
      </div>

      <div className="client-card-footer">
        <div className="client-meta">
          <span className="client-id">ID: {client.id}</span>
          {client.dateReg && (
            <span className="client-reg-date">
              Регистрация: {new Date(client.dateReg).toLocaleDateString('ru-RU')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientCard;
