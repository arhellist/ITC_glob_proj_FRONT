import React from 'react';
import '../index.admin.css';

const NavPanelAdmin = ({ isActive, activeView, onViewChange, menuAccess = null, pendingDocumentsCount = 0, supportUnreadCount = 0, emailUnreadCount = 0 }) => {
  const isAllowed = (key) => {
    if (menuAccess === null) {
      return true;
    }
    return menuAccess[key] === true;
  };

  const hasPendingDocs = pendingDocumentsCount > 0;
  const hasSupportUnread = supportUnreadCount > 0;
  const hasEmailUnread = emailUnreadCount > 0;

  // Логирование для отладки
  if (pendingDocumentsCount > 0) {
    console.log('NavPanelAdmin: Есть непроверенные документы:', pendingDocumentsCount);
  }
  if (supportUnreadCount > 0) {
    console.log('NavPanelAdmin: Есть непрочитанные сообщения в поддержке:', supportUnreadCount);
  }
  if (emailUnreadCount > 0) {
    console.log('NavPanelAdmin: Есть непрочитанные письма:', emailUnreadCount);
  }

  return (
    <nav className={`admin-nav flex flex-column ${isActive ? 'admin-nav-active' : ''}`}>
      {isAllowed('users') && (
        <div 
        className={`admin-nav-button flex pointer gradient-border admin-btn-userslist ${activeView === 'users' ? 'active' : ''}`}
        onClick={() => onViewChange('users')}
        style={{ position: 'relative' }}
      >
        <div className="admin-nav-button-icon img admin-btn-userslist-icon"></div>
        {hasPendingDocs && (
          <span className="admin-nav-badge" title={`Непроверенных документов: ${pendingDocumentsCount}`}></span>
        )}
      </div>
      )}
      
      {isAllowed('requests') && (
        <div 
        className={`admin-nav-button flex pointer gradient-border admin-btn-requests ${activeView === 'requests' ? 'active' : ''}`}
        onClick={() => onViewChange('requests')}
      >
        <div className="admin-nav-button-icon img admin-btn-requests-icon"></div>
      </div>
      )}
      
      {isAllowed('security') && (
        <div 
        className={`admin-nav-button flex pointer gradient-border admin-btn-security ${activeView === 'security' ? 'active' : ''}`}
        onClick={() => onViewChange('security')}
      >
        <div className="admin-nav-button-icon img admin-btn-security-icon"></div>
      </div>
      )}
      
      {isAllowed('monitoring') && (
        <div 
        className={`admin-nav-button flex pointer gradient-border admin-btn-monitoring ${activeView === 'monitoring' ? 'active' : ''}`}
        onClick={() => onViewChange('monitoring')}
      >
        <div className="admin-nav-button-icon img admin-btn-monitoring-icon"></div>
      </div>
      )}
      
      {isAllowed('profitability') && (
        <div 
        className={`admin-nav-button flex pointer gradient-border admin-btn-profitability ${activeView === 'profitability' ? 'active' : ''}`}
        onClick={() => onViewChange('profitability')}
      >
        <div className="admin-nav-button-icon img admin-btn-profitability-icon"></div>
      </div>
      )}
      
      {isAllowed('crm') && (
        <div 
        className={`admin-nav-button flex pointer gradient-border admin-btn-crm ${activeView === 'crm' ? 'active' : ''}`}
        onClick={() => onViewChange('crm')}
        title="CRM - Общение с клиентами"
        style={{ position: 'relative' }}
      >
        <div className="admin-nav-button-icon crm-letters flex flex-row">
          <div className="crm-letter-icon c img"></div>
          <div className="crm-letter-icon r img"></div>
          <div className="crm-letter-icon m img"></div>
        </div>
        {hasSupportUnread && (
          <span className="admin-nav-badge" title={`Непрочитанных сообщений в поддержке: ${supportUnreadCount}`}></span>
        )}
      </div>
      )}
      
      {isAllowed('email') && (
        <div 
        className={`admin-nav-button flex pointer gradient-border admin-btn-email ${activeView === 'email' ? 'active' : ''}`}
        onClick={() => onViewChange('email')}
        title="Email клиент"
        style={{ position: 'relative' }}
      >
        <div className="admin-nav-button-icon mail-letters flex flex-row">
          <div className="mail-letter-icon m img"></div>
          <div className="mail-letter-icon a img"></div>
          <div className="mail-letter-icon i img"></div>
          <div className="mail-letter-icon l img"></div>
        </div>
        {hasEmailUnread && (
          <span className="admin-nav-badge" title={`Непрочитанных писем: ${emailUnreadCount}`}></span>
        )}
      </div>
      )}
    </nav>
  );
};

export default NavPanelAdmin;