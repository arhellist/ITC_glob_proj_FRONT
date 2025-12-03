import React, { useEffect, useState } from 'react';
import ClientCommunication from './client-communication/client-communication';
import ManagerAssignments from './manager-assignments/manager-assignments';
import Deals from './deals/deals';
import Tasks from './tasks/Tasks';
import Clients from './clients/Clients';
import DealsKPI from './deals-kpi/DealsKPI';
import './crm-main.css';
import axiosAPI from '../../../JS/auth/http/axios';
import { useCRM } from '../../../contexts/CRMContext.jsx';
import { SupportProvider } from '../../../contexts/SupportContext.jsx';
import { useSupport } from '../../../hooks/useSupport.js';

/**
 * Внутренний компонент CRM с доступом к SupportContext
 */
const CRMMainContent = () => {
  const [activeModule, setActiveModule] = useState('clients'); // clients, deals, tasks, communication, deals-kpi, assignments, analytics
  const [adminRole, setAdminRole] = useState(null);
  const { dealsUnreadCount } = useCRM();
  const { totalUnreadCount } = useSupport();
  
  // Логируем изменения dealsUnreadCount
  useEffect(() => {
    console.log('📊 dealsUnreadCount изменился:', dealsUnreadCount);
  }, [dealsUnreadCount]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data } = await axiosAPI.get('/admin/profile');
        setAdminRole(data?.admin?.role || data?.role || null);
      } catch {
        // ignore
      }
    };
    loadProfile();
  }, []);

  return (
    <div className="crm-container">
      {/* Навигация CRM */}
      <div className="crm-nav">
        <button
          className={`crm-nav-item ${activeModule === 'clients' ? 'active' : ''}`}
          onClick={() => setActiveModule('clients')}
        >
          👥 Клиенты
        </button>
        <button
          className={`crm-nav-item ${activeModule === 'deals' ? 'active' : ''}`}
          onClick={() => setActiveModule('deals')}
        >
          🎯 Продажи
        </button>
        <button
          className={`crm-nav-item ${activeModule === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveModule('tasks')}
        >
          📋 Задачи
        </button>
        <button
          className={`crm-nav-item ${activeModule === 'communication' ? 'active' : ''}`}
          onClick={() => setActiveModule('communication')}
          style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}
        >
          <span>💬 Общение</span>
          {/* Счетчик непрочитанных сообщений на кнопке ОБЩЕНИЕ */}
          {totalUnreadCount > 0 && (
            <span className="crm-nav-unread-count" title={`Непрочитанных сообщений: ${totalUnreadCount}`}>
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </button>
        <button
          className={`crm-nav-item ${activeModule === 'deals-kpi' ? 'active' : ''}`}
          onClick={() => setActiveModule('deals-kpi')}
        >
          💼 Сделки
        </button>
        {(adminRole !== 'MANAGER') && (
          <button
            className={`crm-nav-item ${activeModule === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveModule('assignments')}
          >
            👤 Назначения менеджеров
          </button>
        )}
        <button
          className={`crm-nav-item ${activeModule === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveModule('analytics')}
        >
          📊 Аналитика
        </button>
      </div>

      {/* Контент модуля */}
      <div className={`crm-content ${activeModule === 'deals' || activeModule === 'clients' || activeModule === 'tasks' ? 'no-scroll' : ''}`}>
        {activeModule === 'communication' && <ClientCommunication />}
        {activeModule === 'assignments' && (adminRole !== 'MANAGER') && <ManagerAssignments />}
        {activeModule === 'deals' && <Deals />}
        {activeModule === 'tasks' && <Tasks />}
        {activeModule === 'clients' && <Clients />}
        {activeModule === 'deals-kpi' && <DealsKPI />}
        {activeModule === 'analytics' && (
          <div style={{ padding: '20px', color: '#666' }}>
            Модуль "Аналитика" в разработке...
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Главный компонент CRM-системы с SupportProvider
 */
const CRMMain = () => {
  return (
    <SupportProvider>
      <CRMMainContent />
    </SupportProvider>
  );
};

export default CRMMain;

