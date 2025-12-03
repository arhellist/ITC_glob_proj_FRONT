import React from 'react';

const formatReferralValue = (value) => {
  if (!value) {
    return '—';
  }
  return value;
};

const UserPartner = ({ user }) => {
  if (!user) return null;

  const referrals = Array.isArray(user.referrals) ? user.referrals : [];

  return (
    <div className="admin-user-portfolio-list-item user-partner active-tab">
      <div className="admin-user-portfolio-list-item-content">
        <div className="admin-user-portfolio-list-item-content-grid two-columns">
          <div className="admin-user-portfolio-section">
            <h3>Партнерская программа</h3>
            <div className="admin-user-portfolio-fields">
              <div className="admin-user-portfolio-field">
                <label>Реферальная ссылка</label>
                <span className="admin-user-portfolio-value--mono">{formatReferralValue(user.refLink)}</span>
              </div>
              <div className="admin-user-portfolio-field">
                <label>Состояние реферального счёта</label>
                <span>{formatReferralValue(user.refAccountState)}</span>
              </div>
              <div className="admin-user-portfolio-field">
                <label>Разовый доход по ссылке</label>
                <span>{formatReferralValue(user.refSingleIncome)}</span>
              </div>
              <div className="admin-user-portfolio-field">
                <label>Количество приглашённых</label>
                <span>{referrals.length}</span>
              </div>
            </div>
          </div>

          <div className="admin-user-portfolio-section">
            <h3>Список приглашённых</h3>
            {referrals.length > 0 ? (
              <div className="partner-referrals-list">
                {referrals.map((referral) => (
                  <div key={referral.id} className="partner-referrals-item">
                    <div className="partner-referrals-avatar">
                      <span>{(referral.fullName || '—').slice(0, 1).toUpperCase()}</span>
                    </div>
                    <div className="partner-referrals-info">
                      <span className="partner-referrals-name">{referral.fullName || '—'}</span>
                      <span className="partner-referrals-email">{referral.email || '—'}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="admin-user-portfolio-empty">Рефералов нет</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPartner;
