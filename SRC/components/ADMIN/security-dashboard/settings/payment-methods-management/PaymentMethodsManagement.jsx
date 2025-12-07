import React, { useState, useEffect } from 'react';
import securityService from '../../../../../JS/services/security-service';
import './PaymentMethodsManagement.css';

const PAYMENT_METHOD_TYPES = [
  { value: 'СБП', label: 'СБП' },
  { value: 'SWIFT', label: 'SWIFT' },
  { value: 'межбанковский перевод', label: 'Межбанковский перевод' },
  { value: 'перевод на карту', label: 'Перевод на карту' },
  { value: 'криптоперевод', label: 'Криптоперевод' }
];

const PaymentMethodsManagement = () => {
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingMethod, setEditingMethod] = useState(null);
  const [formData, setFormData] = useState({
    method_type: '',
    qr_code: null,
    qr_code_file: null,
    payment_details: '',
    description: '',
    is_active: true,
    order_index: 0
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      setError('');
      const methods = await securityService.getPaymentMethods();
      setPaymentMethods(methods || []);
    } catch (err) {
      console.error('Ошибка загрузки способов пополнения:', err);
      setError('Не удалось загрузить способы пополнения');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      if (name === 'qr_code_file' && files && files[0]) {
        const file = files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
          setFormData(prev => ({
            ...prev,
            qr_code_file: file,
            qr_code: reader.result
          }));
        };
        reader.readAsDataURL(file);
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      // Валидация
      if (!formData.method_type || formData.method_type.trim() === '') {
        setError('Выберите способ пополнения');
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('method_type', formData.method_type);
      formDataToSend.append('payment_details', formData.payment_details || '');
      formDataToSend.append('description', formData.description || '');
      formDataToSend.append('is_active', formData.is_active ? 'true' : 'false');
      formDataToSend.append('order_index', String(formData.order_index || 0));
      
      if (formData.qr_code_file) {
        formDataToSend.append('qr_code', formData.qr_code_file);
      } else if (formData.qr_code && !formData.qr_code_file) {
        formDataToSend.append('qr_code', formData.qr_code);
      }

      console.log('PaymentMethodsManagement: Отправка данных:', {
        method_type: formData.method_type,
        has_qr_code_file: !!formData.qr_code_file,
        has_qr_code: !!formData.qr_code,
        payment_details: formData.payment_details,
        description: formData.description,
        is_active: formData.is_active,
        order_index: formData.order_index
      });

      let result;
      if (editingMethod) {
        result = await securityService.updatePaymentMethod(editingMethod.id, formDataToSend);
      } else {
        result = await securityService.createPaymentMethod(formDataToSend);
      }

      if (result && result.success !== false) {
        resetForm();
        await loadPaymentMethods();
      } else {
        setError(result?.message || 'Не удалось сохранить способ пополнения');
      }
    } catch (err) {
      console.error('Ошибка сохранения способа пополнения:', err);
      setError(err.response?.data?.message || err.message || 'Не удалось сохранить способ пополнения');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (method) => {
    setEditingMethod(method);
    setFormData({
      method_type: method.method_type || '',
      qr_code: method.qr_code || null,
      qr_code_file: null,
      payment_details: method.payment_details || '',
      description: method.description || '',
      is_active: method.is_active !== false,
      order_index: method.order_index || 0
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот способ пополнения?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      const result = await securityService.deletePaymentMethod(id);
      
      if (result && result.success !== false) {
        await loadPaymentMethods();
      } else {
        setError(result?.message || 'Не удалось удалить способ пополнения');
      }
    } catch (err) {
      console.error('Ошибка удаления способа пополнения:', err);
      setError('Не удалось удалить способ пополнения');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingMethod(null);
    setFormData({
      method_type: '',
      qr_code: null,
      qr_code_file: null,
      payment_details: '',
      description: '',
      is_active: true,
      order_index: 0
    });
  };

  const getQrCodeUrl = (qrCode) => {
    if (!qrCode) return null;
    if (qrCode.startsWith('data:') || qrCode.startsWith('http')) {
      return qrCode;
    }
    const token = localStorage.getItem('accessToken');
    return `${process.env.REACT_APP_API_URL || ''}/admin/payment-methods/qr/${qrCode}?token=${token}&t=${Date.now()}`;
  };

  return (
    <div className="payment-methods-management">
      <h3>Управление способами пополнения</h3>

      {error && (
        <div className="payment-methods-error">
          {error}
        </div>
      )}

      {/* Форма добавления/редактирования */}
      <form onSubmit={handleSubmit} className="payment-methods-form">
        <div className="payment-methods-form-row">
          <label className="payment-methods-form-field">
            <span>Способ пополнения *</span>
            <select
              name="method_type"
              value={formData.method_type}
              onChange={handleInputChange}
              required
            >
              <option value="">Выберите способ</option>
              {PAYMENT_METHOD_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <label className="payment-methods-form-field">
            <span>Порядок отображения</span>
            <input
              type="number"
              name="order_index"
              value={formData.order_index}
              onChange={handleInputChange}
              min="0"
            />
          </label>
        </div>

        <label className="payment-methods-form-field">
          <span>QR-код</span>
          <input
            type="file"
            name="qr_code_file"
            accept="image/*"
            onChange={handleInputChange}
          />
          {formData.qr_code && (
            <div className="payment-methods-qr-preview">
              <img 
                src={getQrCodeUrl(formData.qr_code)} 
                alt="QR-код" 
                style={{ maxWidth: '200px', maxHeight: '200px' }}
              />
            </div>
          )}
        </label>

        <label className="payment-methods-form-field">
          <span>Реквизиты оплаты</span>
          <textarea
            name="payment_details"
            value={formData.payment_details}
            onChange={handleInputChange}
            rows="5"
            placeholder="Введите реквизиты для оплаты..."
          />
        </label>

        <label className="payment-methods-form-field">
          <span>Описание</span>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
            placeholder="Введите описание способа пополнения..."
          />
        </label>

        <label className="payment-methods-form-field checkbox">
          <input
            type="checkbox"
            name="is_active"
            checked={formData.is_active}
            onChange={handleInputChange}
          />
          <span>Активен</span>
        </label>

        <div className="payment-methods-form-actions">
          <button type="submit" disabled={loading}>
            {editingMethod ? 'Сохранить изменения' : 'Добавить способ'}
          </button>
          {editingMethod && (
            <button type="button" onClick={resetForm}>
              Отмена
            </button>
          )}
        </div>
      </form>

      {/* Список способов пополнения */}
      <div className="payment-methods-list">
        <h4>Способы пополнения ({paymentMethods.length})</h4>
        {loading && !paymentMethods.length && (
          <div className="payment-methods-loading">Загрузка...</div>
        )}
        {!loading && paymentMethods.length === 0 && (
          <div className="payment-methods-empty">Способы пополнения не добавлены</div>
        )}
        {paymentMethods.length > 0 && (
          <div className="payment-methods-items">
            {paymentMethods
              .sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
              .map(method => (
                <div 
                  key={method.id} 
                  className={`payment-methods-item ${!method.is_active ? 'inactive' : ''}`}
                >
                  <div className="payment-methods-item-content">
                    <div className="payment-methods-item-header">
                      <h5>{method.method_type}</h5>
                      <span className={`payment-methods-item-status ${method.is_active ? 'active' : 'inactive'}`}>
                        {method.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                    </div>
                    {method.qr_code && (
                      <div className="payment-methods-item-qr">
                        <img 
                          src={getQrCodeUrl(method.qr_code)} 
                          alt="QR-код" 
                          style={{ maxWidth: '150px', maxHeight: '150px' }}
                        />
                      </div>
                    )}
                    {method.payment_details && (
                      <div className="payment-methods-item-details">
                        <strong>Реквизиты:</strong>
                        <pre>{method.payment_details}</pre>
                      </div>
                    )}
                    {method.description && (
                      <div className="payment-methods-item-description">
                        <strong>Описание:</strong>
                        <p>{method.description}</p>
                      </div>
                    )}
                    <div className="payment-methods-item-meta">
                      <span>Порядок: {method.order_index || 0}</span>
                    </div>
                  </div>
                  <div className="payment-methods-item-actions">
                    <button 
                      onClick={() => handleEdit(method)}
                      className="payment-methods-edit-btn"
                    >
                      Редактировать
                    </button>
                    <button 
                      onClick={() => handleDelete(method.id)}
                      className="payment-methods-delete-btn"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentMethodsManagement;

