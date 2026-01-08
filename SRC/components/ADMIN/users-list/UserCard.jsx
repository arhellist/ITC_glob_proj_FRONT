import React, { useMemo } from 'react';
import { getAvatarUrl } from '../../../config/api';
import './UsersList.css';

const getInitials = (name = '') => {
  if (!name) {
    return 'NA';
  }
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
};

const normalizeValue = (value = '') => value.toString().trim().toLowerCase();

const resolveDocumentStatus = (documents = [], definition, products = []) => {
  if (!definition) {
    return 'empty';
  }

  const targets = [definition.kind, ...(definition.synonyms || [])]
    .filter(Boolean)
    .map((key) => normalizeValue(key));

  const relevantDocs = (documents || []).filter((doc) =>
    targets.includes(normalizeValue(doc?.kind || doc?.type))
  );

  if (!relevantDocs.length) {
    return 'empty';
  }

  // Сортируем документы по дате (новые первые)
  const sortedDocs = [...relevantDocs].sort(
    (a, b) =>
      new Date(b?.updatedAt || b?.createdAt || 0) -
      new Date(a?.updatedAt || a?.createdAt || 0)
  );

  // Проверяем устаревшие документы
  const investmentRulesUpdatedAt = definition?.investmentRulesUpdatedAt;
  const checkOutdated = (doc) => {
    // Сначала проверяем флаг из бэкенда
    if (doc?.isOutdated === true) {
      return true;
    }
    
    // Если флага нет, проверяем по дате (только для инвестиционных правил)
    if (investmentRulesUpdatedAt && doc?.createdAt) {
      const docKind = normalizeValue(doc?.kind || doc?.type);
      const isInvestmentRules = targets.some(key => 
        docKind === normalizeValue(key) && key.toLowerCase().startsWith('investmentrules-')
      );
      
      if (isInvestmentRules) {
        const docCreatedAt = new Date(doc.createdAt);
        const rulesUpdatedAt = new Date(investmentRulesUpdatedAt);
        
        if (docCreatedAt < rulesUpdatedAt) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Проверяем, есть ли актуальные документы (не устаревшие)
  const actualDocs = sortedDocs.filter(doc => !checkOutdated(doc));
  
  // Если все документы устарели, возвращаем 'empty' (в карточке клиента устаревшие = нет документа)
  if (actualDocs.length === 0) {
    return 'empty';
  }
  
  const latestDoc = actualDocs[0];
  const status = normalizeValue(latestDoc?.status);

  if (status === 'approve' || status === 'approved') {
    return 'approved';
  }

  if (status === 'not approve' || status === 'notapprove' || status === 'rejected') {
    return 'rejected';
  }

  return 'pending';
};

const UserCard = ({ user, docDefinitions = [], products = [], onClick }) => {
  const fullName = user.fullName || '-';
  const accountCount = Array.isArray(user.accounts) ? user.accounts.length : 0;
  const lastLogin = user.lastLoginAt
    ? new Date(user.lastLoginAt).toLocaleString('ru-RU')
    : '—';
  const documents = Array.isArray(user.documents) ? user.documents : [];

  const docStatuses = useMemo(() => {
    const statuses = {};
    docDefinitions.forEach((definition) => {
      statuses[definition.key] = resolveDocumentStatus(documents, definition, products);
    });
    return statuses;
  }, [docDefinitions, documents, products]);

  return (
    <button type="button" className="admin-client-card" onClick={onClick}>
      <div className="admin-client-card__header">
        <div className="admin-client-card__avatar">
          {user.avatar && user.avatar !== 'noAvatar' ? (
            <img
              src={getAvatarUrl(user.avatar)}
              alt={fullName}
            />
          ) : (
            <span>{getInitials(fullName)}</span>
          )}
        </div>

        <div className="admin-client-card__header-info">
          <span className="admin-client-card__name">{fullName}</span>
          <span className="admin-client-card__email">{user.email || '—'}</span>
        </div>
      </div>

      <div className="admin-client-card__body">
        <div className="admin-client-card__row">
          <span className="admin-client-card__label">ID клиента</span>
          <span className="admin-client-card__value">#{user.id}</span>
        </div>
        <div className="admin-client-card__row">
          <span className="admin-client-card__label">Счета</span>
          <span className="admin-client-card__value">{accountCount}</span>
        </div>
        <div className="admin-client-card__row">
          <span className="admin-client-card__label">Последний вход</span>
          <span className="admin-client-card__value">{lastLogin}</span>
        </div>

        <div className="admin-client-card__docs">
          {docDefinitions.map(({ key, label, title }) => {
            const status = docStatuses[key] || 'empty';
            const hasPendingBadge = status === 'pending';
            return (
              <span
                key={key}
                className={`admin-client-card__doc admin-client-card__doc--${status}`}
                title={title}
                style={{ position: 'relative' }}
              >
                {label}
                {hasPendingBadge && (
                  <span className="admin-client-card__doc-badge"></span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      <div className="admin-client-card__footer">
        <span
          className={`admin-client-card__status ${
            user.isActivated ? 'admin-client-card__status--active' : 'admin-client-card__status--inactive'
          }`}
        >
          {user.isActivated ? 'Email подтверждён' : 'Email не подтверждён'}
        </span>
      </div>
    </button>
  );
};

export default UserCard;

