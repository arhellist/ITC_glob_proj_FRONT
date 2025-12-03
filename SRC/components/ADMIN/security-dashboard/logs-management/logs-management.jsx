import React, { useState } from 'react';
import UserLogs from './user-logs/user-logs';
import AdminLogs from './admin-logs/admin-logs';
import './logs-management.css';

const LogsManagement = () => {
  const [activeSubTab, setActiveSubTab] = useState('users');

  return (
    <div className="logs-management">
      <div className="logs-header">
        <h3>Управление логами</h3>
        <div className="logs-sub-tabs">
          <button 
            className={`logs-sub-tab ${activeSubTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('users')}
          >
            Пользователи
          </button>
          <button 
            className={`logs-sub-tab ${activeSubTab === 'admins' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('admins')}
          >
            Администраторы
          </button>
        </div>
      </div>

      <div className="logs-content">
        {activeSubTab === 'users' && <UserLogs />}
        {activeSubTab === 'admins' && <AdminLogs />}
      </div>
    </div>
  );
};

export default LogsManagement;
