import React, { useState, useEffect, useCallback } from 'react';
import axiosAPI from '../../../../../JS/auth/http/axios';
import './DealTypesManagement.css';

const DealTypesManagement = () => {
  const [dealTypes, setDealTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isActive: true,
    sortOrder: 0
  });

  const loadDealTypes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axiosAPI.get('/security/deal-types');
      setDealTypes(response.data.data || []);
    } catch (err) {
      console.error('Ошибка загрузки типов сделок:', err);
      setError('Ошибка загрузки типов сделок');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDealTypes();
  }, [loadDealTypes]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Название типа сделки обязательно');
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      await axiosAPI.post('/security/deal-types', formData);
      
      // Очищаем форму
      setFormData({
        name: '',
        description: '',
        isActive: true,
        sortOrder: 0
      });
      
      // Перезагружаем список
      await loadDealTypes();
    } catch (err) {
      console.error('Ошибка создания типа сделки:', err);
      setError(err.response?.data?.message || 'Ошибка создания типа сделки');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот тип сделки?')) {
      return;
    }

    try {
      setError('');
      await axiosAPI.delete(`/security/deal-types/${id}`);
      await loadDealTypes();
    } catch (err) {
      console.error('Ошибка удаления типа сделки:', err);
      setError(err.response?.data?.message || 'Ошибка удаления типа сделки');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return <div className="deal-types-management-loading">Загрузка типов сделок...</div>;
  }

  return (
    <div className="deal-types-management">
      {error && (
        <div className="deal-types-management-error">
          {error}
        </div>
      )}

      <div className="deal-types-list">
        <h3>Типы сделок</h3>
        {dealTypes.length === 0 ? (
          <p style={{ color: '#7f8aa3', fontSize: '14px' }}>Типы сделок не найдены</p>
        ) : (
          <table className="deal-types-table">
            <thead>
              <tr>
                <th>Название</th>
                <th>Описание</th>
                <th>Активен</th>
                <th>Порядок</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {dealTypes.map(dealType => (
                <tr key={dealType.id}>
                  <td>{dealType.name}</td>
                  <td>{dealType.description || '-'}</td>
                  <td>{dealType.isActive ? 'Да' : 'Нет'}</td>
                  <td>{dealType.sortOrder}</td>
                  <td>
                    <button
                      className="deal-types-delete-btn"
                      onClick={() => handleDelete(dealType.id)}
                      type="button"
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="deal-types-form-container">
        <h3>Добавить тип сделки</h3>
        <form onSubmit={handleSubmit} className="deal-types-form">
          <div className="deal-types-form-field">
            <label>
              Название <span className="required">*</span>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="deal-types-input"
                required
              />
            </label>
          </div>

          <div className="deal-types-form-field">
            <label>
              Описание
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="deal-types-textarea"
                rows="3"
              />
            </label>
          </div>

          <div className="deal-types-form-field checkbox">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="deal-types-checkbox"
              id="deal-types-is-active"
            />
            <label htmlFor="deal-types-is-active">
              Активен
            </label>
          </div>

          <div className="deal-types-form-field">
            <label>
              Порядок сортировки
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 0)}
                className="deal-types-input"
                min="0"
              />
            </label>
          </div>

          <button
            type="submit"
            className="deal-types-submit-btn"
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Добавить тип сделки'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DealTypesManagement;

