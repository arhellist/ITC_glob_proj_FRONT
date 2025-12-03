import React, { useState, useEffect } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';
import './DealsKPI.css';

/**
 * Компонент для отображения всех сделок (только для ROOT/ADMIN)
 */
const AllDealsList = () => {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingDeal, setEditingDeal] = useState(null);
  const [editForm, setEditForm] = useState({
    status: '',
    rejectionReason: '',
    adminComments: ''
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [dealToDelete, setDealToDelete] = useState(null);
  const [managers, setManagers] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    managerId: ''
  });

  useEffect(() => {
    loadAllDeals();
    loadManagers();
  }, []);

  const loadAllDeals = async () => {
    try {
      setLoading(true);
      const { data } = await axiosAPI.get('/admin/deals/all');
      
      if (data.success) {
        setDeals(data.data || []);
      } else {
        setError('Ошибка загрузки сделок');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки всех сделок:', error);
      setError('Ошибка загрузки сделок');
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    try {
      const { data } = await axiosAPI.get('/admin/deals/managers');
      if (data.success) {
        setManagers(data.data || []);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки менеджеров:', error);
    }
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const filteredDeals = deals.filter(deal => {
    if (filters.status && deal.status !== filters.status) return false;
    if (filters.managerId && deal.adminId !== parseInt(filters.managerId)) return false;
    return true;
  });

  const handleStatusChange = (dealId, newStatus) => {
    setEditingDeal(dealId);
    setEditForm({
      status: newStatus,
      rejectionReason: '',
      adminComments: ''
    });
  };

  const updateDealInList = (updatedDeal) => {
    setDeals(prevDeals => 
      prevDeals.map(deal => 
        deal.id === updatedDeal.id ? updatedDeal : deal
      )
    );
  };

  const removeDealFromList = (dealId) => {
    setDeals(prevDeals => prevDeals.filter(deal => deal.id !== dealId));
  };

  const handleSaveStatus = async () => {
    if (!editingDeal) return;

    try {
      const deal = deals.find(d => d.id === editingDeal);
      const currentComments = deal?.adminComments || '';
      
      let updatedComments = editForm.adminComments;
      if (editForm.adminComments && currentComments) {
        const timestamp = new Date().toLocaleString('ru-RU');
        const newComment = `[${timestamp}] ${editForm.adminComments}`;
        updatedComments = `${currentComments}\n${newComment}`;
      } else if (editForm.adminComments && !currentComments) {
        const timestamp = new Date().toLocaleString('ru-RU');
        updatedComments = `[${timestamp}] ${editForm.adminComments}`;
      } else {
        updatedComments = currentComments;
      }

      const payload = {
        status: editForm.status,
        reason: editForm.status === 'rejected' ? editForm.rejectionReason : null,
        adminComments: updatedComments
      };

      console.log(`🔍 Отправляем payload для обновления статуса:`, payload);
      console.log(`🔍 editForm.rejectionReason:`, editForm.rejectionReason);

      const { data } = await axiosAPI.put(`/admin/deals/${editingDeal}/status`, payload);
      
      if (data.success) {
        updateDealInList(data.data);
        setEditingDeal(null);
        setEditForm({ status: '', rejectionReason: '', adminComments: '' });
      }
    } catch (error) {
      console.error('❌ Ошибка обновления статуса сделки:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingDeal(null);
    setEditForm({ status: '', rejectionReason: '', adminComments: '' });
  };

  const handleQuickComment = async (dealId, comment) => {
    try {
      // Сначала обновляем UI мгновенно
      const deal = deals.find(d => d.id === dealId);
      if (deal) {
        const currentComments = deal.adminComments || '';
        const timestamp = new Date().toLocaleString('ru-RU');
        const newComment = `[${timestamp}] ${comment}`;
        const updatedComments = currentComments 
          ? `${currentComments}\n${newComment}` 
          : newComment;
        
        const updatedDeal = { ...deal, adminComments: updatedComments };
        updateDealInList(updatedDeal);
      }

      // Затем отправляем на сервер
      const currentDeal = deals.find(d => d.id === dealId);
      const currentComments = currentDeal?.adminComments || '';
      const timestamp = new Date().toLocaleString('ru-RU');
      const newComment = `[${timestamp}] ${comment}`;
      const updatedComments = currentComments 
        ? `${currentComments}\n${newComment}` 
        : newComment;

      const { data } = await axiosAPI.put(`/admin/deals/${dealId}/status`, {
        status: 'pending', // Не меняем статус, только добавляем комментарий
        adminComments: updatedComments
      });
      
      if (data.success) {
        updateDealInList(data.data);
      }
    } catch (error) {
      console.error('❌ Ошибка добавления комментария:', error);
      // Возвращаем обратно при ошибке
      loadAllDeals();
    }
  };

  const handleDeleteClick = (deal) => {
    setDealToDelete(deal);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!dealToDelete) return;

    try {
      const { data } = await axiosAPI.delete(`/admin/deals/${dealToDelete.id}`);
      
      if (data.success) {
        removeDealFromList(dealToDelete.id);
      }
    } catch (error) {
      console.error('❌ Ошибка удаления сделки:', error);
    } finally {
      setShowDeleteModal(false);
      setDealToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setDealToDelete(null);
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'status-badge status-approved';
      case 'rejected': return 'status-badge status-rejected';
      case 'pending': return 'status-badge status-pending';
      default: return 'status-badge';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Утверждена';
      case 'rejected': return 'Отклонена';
      case 'pending': return 'На рассмотрении';
      default: return status;
    }
  };

  if (loading) {
    return <div className="loading">Загрузка сделок...</div>;
  }

  if (error) {
    return <div className="error">Ошибка: {error}</div>;
  }

  return (
    <div className="all-deals-list">
      <div className="deals-header">
        <h2>📊 Все сделки</h2>
        
        <div className="deals-filters">
          <div className="filter-group">
            <label>Статус:</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">Все статусы</option>
              <option value="pending">На рассмотрении</option>
              <option value="approved">Утверждена</option>
              <option value="rejected">Отклонена</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Менеджер:</label>
            <select 
              value={filters.managerId} 
              onChange={(e) => handleFilterChange('managerId', e.target.value)}
            >
              <option value="">Все менеджеры</option>
              {managers.map(manager => (
                <option key={manager.id} value={manager.id}>
                  {manager.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {loading ? (
        <p>Загрузка...</p>
      ) : error ? (
        <p className="error-message">{error}</p>
      ) : filteredDeals.length === 0 ? (
        <p className="no-deals">Сделки не найдены</p>
      ) : (
        <div className="deals-grid">
          {filteredDeals.map((deal) => (
            <div key={deal.id} className="deal-card">
              <div className="deal-header">
                <h3>{deal.DealType?.name || 'Тип не указан'}</h3>
                <div className="deal-header-right">
                  <span className={getStatusBadgeClass(deal.status)}>
                    {getStatusText(deal.status)}
                  </span>
                  <button 
                    className="btn-delete-deal"
                    onClick={() => handleDeleteClick(deal)}
                    title="Удалить сделку"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="deal-client">
                <strong>Клиент:</strong> {deal.Client?.firstname} {deal.Client?.surname}
              </div>

              <div className="deal-amounts">
                <div className="amount-item">
                  <span className="amount-label">Сумма в валюте:</span>
                  <span className="amount-value">
                    {deal.amountCurrency} {deal.currency}
                  </span>
                </div>
                <div className="amount-item">
                  <span className="amount-label">В рублях:</span>
                  <span className="amount-value">{deal.amountRub} ₽</span>
                </div>
                <div className="amount-item">
                  <span className="amount-label">Курс:</span>
                  <span className="amount-value">{deal.exchangeRate}</span>
                </div>
              </div>

              <div className="deal-meta">
                <div><strong>Дата сделки:</strong> {new Date(deal.dealDate).toLocaleDateString()}</div>
                <div><strong>Менеджер:</strong> {deal.Admin?.role || 'Не указан'}</div>
                <div><strong>Создана:</strong> {new Date(deal.createdAt).toLocaleDateString()}</div>
              </div>

              {deal.description && (
                <div className="deal-description">
                  <strong>Описание:</strong> {deal.description}
                </div>
              )}

              {deal.adminComments && (
                <div className="admin-comments">
                  <strong>Комментарии администратора:</strong>
                  <p>{deal.adminComments}</p>
                </div>
              )}

              {deal.status === 'rejected' && deal.rejectionReason && (
                <div className="deal-rejection">
                  <strong>Причина отклонения:</strong>
                  <p>{deal.rejectionReason}</p>
                </div>
              )}

              {/* Управление статусом */}
              <div className="deal-management">
                {editingDeal === deal.id ? (
                  <div className="edit-form">
                    <div className="form-group">
                      <label>Статус:</label>
                      <select 
                        value={editForm.status}
                        onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                      >
                        <option value="pending">На рассмотрении</option>
                        <option value="approved">Утверждена</option>
                        <option value="rejected">Отклонена</option>
                      </select>
                    </div>

                    {editForm.status === 'rejected' && (
                      <div className="form-group">
                        <label>Причина отклонения:</label>
                        <textarea
                          value={editForm.rejectionReason}
                          onChange={(e) => setEditForm({...editForm, rejectionReason: e.target.value})}
                          placeholder="Укажите причину отклонения"
                          rows="3"
                        />
                      </div>
                    )}

                    <div className="form-group">
                      <label>Комментарии администратора:</label>
                      <textarea
                        value={editForm.adminComments}
                        onChange={(e) => setEditForm({...editForm, adminComments: e.target.value})}
                        placeholder="Комментарии для внутреннего использования"
                        rows="3"
                      />
                    </div>

                    <div className="form-actions">
                      <button onClick={handleSaveStatus} className="btn-save">Сохранить</button>
                      <button onClick={handleCancelEdit} className="btn-cancel">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <div className="status-controls">
                    <div className="status-select">
                      <label>Статус:</label>
                      <select 
                        value={deal.status}
                        onChange={(e) => handleStatusChange(deal.id, e.target.value)}
                      >
                        <option value="pending">На рассмотрении</option>
                        <option value="approved">Утверждена</option>
                        <option value="rejected">Отклонена</option>
                      </select>
                    </div>
                    <div className="quick-comment">
                      <label>Быстрый комментарий:</label>
                      <textarea
                        placeholder="Добавить комментарий..."
                        rows="2"
                        onBlur={(e) => {
                          if (e.target.value.trim()) {
                            handleQuickComment(deal.id, e.target.value);
                            e.target.value = ''; // Очищаем поле после добавления
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Документы */}
              <div className="deal-documents">
                <h4>Документы:</h4>
                {deal.documents && deal.documents.length > 0 ? (
                  <div className="documents-list">
                    {deal.documents.map((doc, index) => (
                      <div key={index} className="document-item">
                        <span className="document-name">{doc.split('/').pop()}</span>
                        <button 
                          onClick={() => window.open(doc, '_blank')}
                          className="btn-download"
                        >
                          📥 Скачать
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-documents">Документы не загружены</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Модалка подтверждения удаления */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content delete-confirm-modal">
            <h3>Подтверждение удаления</h3>
            <p>Вы уверены, что хотите удалить сделку ID: {dealToDelete?.id}?</p>
            <p><strong>Клиент:</strong> {dealToDelete?.Client?.firstname} {dealToDelete?.Client?.surname}</p>
            <p><strong>Сумма:</strong> {dealToDelete?.amountCurrency} {dealToDelete?.currency}</p>
            <div className="modal-actions">
              <button onClick={handleDeleteConfirm} className="btn-confirm-delete">
                Удалить
              </button>
              <button onClick={handleDeleteCancel} className="btn-cancel">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllDealsList;
