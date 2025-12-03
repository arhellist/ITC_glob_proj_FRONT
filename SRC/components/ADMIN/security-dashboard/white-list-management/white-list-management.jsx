import React, { useState, useEffect } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';
import './white-list-management.css';

const WhiteListManagement = () => {
  const [whiteListItems, setWhiteListItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('VIEWER');
  const [adding, setAdding] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');

  const roles = [
    { value: 'ROOT', label: 'Супер Администратор' },
    { value: 'ADMIN', label: 'Администратор' },
    { value: 'MODERATOR', label: 'Модератор' },
    { value: 'MANAGER', label: 'Менеджер' },
    { value: 'SUPPORT', label: 'Поддержка' },
    { value: 'VIEWER', label: 'Наблюдатель' }
  ];

  useEffect(() => {
    loadWhiteList();
  }, []);

  const loadWhiteList = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('WhiteListManagement: Загружаем whitelist...');
      const response = await axiosAPI.get('/admin/security/whitelist');
      console.log('WhiteListManagement: Получен ответ:', response.data);
      setWhiteListItems(response.data?.whiteList || []);
    } catch (err) {
      console.error('Ошибка загрузки белого списка:', err);
      console.error('Статус ошибки:', err.response?.status);
      console.error('Данные ошибки:', err.response?.data);
      
      let errorMessage = 'Не удалось загрузить белый список';
      if (err.response?.status === 401) {
        errorMessage = 'Необходима авторизация администратора';
      } else if (err.response?.status === 403) {
        errorMessage = 'Недостаточно прав доступа';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWhiteList = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      setAdding(true);
      setError('');
      
      // Проверяем, не пытаются ли добавить второго ROOT
      if (newRole === 'ROOT') {
        const existingRoot = whiteListItems.find(item => item.role === 'ROOT');
        if (existingRoot) {
          setError('Пользователь с ролью ROOT уже существует');
          setAdding(false);
          return;
        }
      }
      
      const response = await axiosAPI.post('/admin/security/whitelist', {
        email: newEmail.trim(),
        role: newRole
      });

      if (response.data.success) {
        setNewEmail('');
        setNewRole('MANAGER');
        await loadWhiteList(); // Перезагружаем список
      }
    } catch (err) {
      console.error('Ошибка добавления в белый список:', err);
      setError(err.response?.data?.message || 'Не удалось добавить пользователя в белый список');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveFromWhiteList = async (id) => {
    // Находим элемент в списке для проверки email и роли
    const item = whiteListItems.find(item => item.id === id);
    
    // Запрет на удаление arhellist@mail.ru
    if (item && item.email === 'arhellist@mail.ru') {
      setError('Удаление arhellist@mail.ru запрещено');
      return;
    }
    
    // Запрет на удаление пользователей с ролью ROOT
    if (item && item.role === 'ROOT') {
      setError('Удаление пользователей с ролью ROOT запрещено');
      return;
    }

    // Показываем модальное окно подтверждения
    const shouldDelete = window.confirm('Вы уверены, что хотите удалить этого пользователя из белого списка?');
    if (!shouldDelete) {
      return;
    }

    try {
      setError('');
      await axiosAPI.delete(`/admin/security/whitelist/${id}`);
      await loadWhiteList(); // Перезагружаем список
    } catch (err) {
      console.error('Ошибка удаления из белого списка:', err);
      setError(err.response?.data?.message || 'Не удалось удалить пользователя из белого списка');
    }
  };

  const handleRoleChange = async (id, newRole) => {
    try {
      setError('');
      
      // Находим элемент в списке для проверки email
      const item = whiteListItems.find(item => item.id === id);
      
      // Запрет на изменение роли для arhellist@mail.ru
      if (item && item.email === 'arhellist@mail.ru') {
        setError('Изменение роли для arhellist@mail.ru запрещено');
        return;
      }

      await axiosAPI.put(`/admin/security/whitelist/${id}/role`, { role: newRole });
      await loadWhiteList(); // Перезагружаем список
    } catch (err) {
      console.error('Ошибка изменения роли:', err);
      setError(err.response?.data?.message || 'Не удалось изменить роль пользователя');
    }
  };

  const filteredItems = whiteListItems.filter(item => 
    item.email.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('ru-RU');
  };

  const getRoleLabel = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ROOT': return '#ff4444';
      case 'ADMIN': return '#ff8800';
      case 'MODERATOR': return '#4a8a4a';
      case 'MANAGER': return '#8a4a4a';
      case 'SUPPORT': return '#4a9eff';
      case 'VIEWER': return '#999999';
      default: return '#666666';
    }
  };

  if (loading) {
    return (
      <div className="wl-management">
        <div className="wl-loading">Загрузка белого списка...</div>
      </div>
    );
  }

  return (
    <div className="wl-management">
      <div className="wl-header">
        <h3>Управление белым списком</h3>
        <button onClick={loadWhiteList} className="wl-refresh-btn">
          Обновить
        </button>
      </div>

      {error && (
        <div className="wl-error">{error}</div>
      )}

      {/* Форма добавления нового пользователя */}
      <div className="wl-add-form">
        <h4>Добавить пользователя в белый список</h4>
        <form onSubmit={handleAddToWhiteList}>
          <div className="wl-form-row">
            <input
              type="email"
              placeholder="Email пользователя"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="wl-email-input"
              required
              disabled={adding}
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="wl-role-select"
              disabled={adding}
            >
              {roles.map(role => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="wl-add-btn"
              disabled={adding || !newEmail.trim()}
            >
              {adding ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>

      {/* Поиск */}
      <div className="wl-search">
        <input
          type="text"
          placeholder="Поиск по email..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          className="wl-search-input"
        />
      </div>

      {/* Список пользователей в белом списке */}
      <div className="wl-list">
        <h4>Пользователи в белом списке ({filteredItems.length})</h4>
        <div className="wl-table-wrapper">
          <table className="wl-table">
            <thead>
              <tr>
                <th className="wl-th">Email</th>
                <th className="wl-th">ФИО</th>
                <th className="wl-th">Роль</th>
                <th className="wl-th">Статус</th>
                <th className="wl-th">Добавлен</th>
                <th className="wl-th">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="wl-row">
                  <td className="wl-td">
                    <div className="wl-email">{item.email}</div>
                    {item.isExistingUser && (
                      <div className="wl-user-note">Зарегистрированный пользователь</div>
                    )}
                  </td>
                  <td className="wl-td">
                    {item.userInfo ? (
                      <div className="wl-user-info">
                        <div className="wl-user-name">
                          {item.userInfo.surname} {item.userInfo.firstname} {item.userInfo.patronymic}
                        </div>
                        <div className="wl-user-id">ID: {item.userInfo.id}</div>
                      </div>
                    ) : (
                      <span className="wl-no-info">—</span>
                    )}
                  </td>
                  <td className="wl-td">
                    <select
                      value={item.role}
                      onChange={(e) => handleRoleChange(item.id, e.target.value)}
                      className="wl-role-select-small"
                      style={{ backgroundColor: getRoleColor(item.role) }}
                      disabled={item.email === 'arhellist@mail.ru'}
                      title={item.email === 'arhellist@mail.ru' ? 'Изменение роли для arhellist@mail.ru запрещено' : ''}
                    >
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    {item.email === 'arhellist@mail.ru' && (
                      <div className="wl-protected-badge">Защищено</div>
                    )}
                  </td>
                  <td className="wl-td">
                    <span className={`wl-status ${item.isActive ? 'active' : 'inactive'}`}>
                      {item.isActive ? 'Активен' : 'Неактивен'}
                    </span>
                  </td>
                  <td className="wl-td">
                    <div className="wl-date">{formatDate(item.createdAt)}</div>
                    {item.addedBy && (
                      <div className="wl-added-by">
                        Добавлен: {item.addedBy.email}
                      </div>
                    )}
                  </td>
                  <td className="wl-td">
                    <button
                      onClick={() => handleRemoveFromWhiteList(item.id)}
                      className="wl-remove-btn"
                      title={item.email === 'arhellist@mail.ru' || item.role === 'ROOT' ? 'Удаление запрещено' : 'Удалить из белого списка'}
                      disabled={item.email === 'arhellist@mail.ru' || item.role === 'ROOT'}
                      style={{
                        opacity: (item.email === 'arhellist@mail.ru' || item.role === 'ROOT') ? 0.5 : 1,
                        cursor: (item.email === 'arhellist@mail.ru' || item.role === 'ROOT') ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Удалить
                    </button>
                    {(item.email === 'arhellist@mail.ru' || item.role === 'ROOT') && (
                      <div className="wl-protected-badge">Защищено</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="wl-empty">
            {searchEmail ? 'По вашему запросу ничего не найдено' : 'Белый список пуст'}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhiteListManagement;
