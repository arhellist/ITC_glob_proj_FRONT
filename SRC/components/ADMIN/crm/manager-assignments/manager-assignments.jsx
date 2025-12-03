import React, { useEffect, useState } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';
import './manager-assignments.css';

const ManagerAssignments = () => {
  const [users, setUsers] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [usersRes, managersRes] = await Promise.all([
          axiosAPI.get('/admin/crm/users-all'),
          axiosAPI.get('/admin/crm/managers')
        ]);

        const usersList = (usersRes.data?.users || []).map(u => ({
          id: u.id,
          firstname: u.firstname,
          surname: u.surname,
          patronymic: u.patronymic,
          email: u.User_Auth?.email || u.email,
          assigned_admin_id: u.assigned_admin_id || u.assignedAdminId || u.AssignedManager?.id || null
        }));

        const managersList = (managersRes.data?.admins || []).map(a => ({
          id: a.id,
          role: a.role,
          email: a.email,
          firstname: a.firstname,
          surname: a.surname,
          patronymic: a.patronymic
        }));

        setUsers(usersList);
        setManagers(managersList);
      } catch (e) {
        console.error('Ошибка загрузки данных для назначений:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fullName = (u) => `${u.surname || ''} ${u.firstname || ''} ${u.patronymic || ''}`.trim();

  const handleAssign = async (userId, adminId) => {
    try {
      setSavingId(userId);
      await axiosAPI.post(`/admin/crm/users/${userId}/assign-manager`, { adminId });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, assigned_admin_id: adminId } : u));
    } catch (e) {
      console.error('Ошибка назначения менеджера:', e);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Не удалось назначить менеджера'
        }
      }));
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <div className="ma-loading">Загрузка...</div>;

  return (
    <div className="ma-container">
      <h3 className="ma-title">Назначения менеджеров</h3>
      <div className="ma-table-wrapper">
        <table className="ma-table">
        <thead>
          <tr>
            <th className="ma-th">ID</th>
            <th className="ma-th">ФИО</th>
            <th className="ma-th">Email</th>
            <th className="ma-th">Ответственный менеджер</th>
          </tr>
        </thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="ma-row">
              <td className="ma-td">{u.id}</td>
              <td className="ma-td">{fullName(u)}</td>
              <td className="ma-td">{u.email}</td>
              <td className="ma-td">
                <select
                  className="ma-select"
                  value={u.assigned_admin_id || ''}
                  onChange={(e) => handleAssign(u.id, e.target.value ? parseInt(e.target.value) : null)}
                  disabled={savingId === u.id}
                >
                  <option value="">— не назначен —</option>
                  {managers.map(m => {
                    const initials = `${(m.firstname || '').charAt(0)}.${(m.patronymic || '').charAt(0)}.`;
                    const fio = `${m.surname || ''} ${initials}`.trim();
                    const label = `${fio} ${m.email ? m.email : ''} ${m.role || ''}`.trim();
                    return (
                      <option key={m.id} value={m.id}>{label}</option>
                    );
                  })}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManagerAssignments;


