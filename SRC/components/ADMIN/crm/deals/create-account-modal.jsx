import React, { useState, useEffect } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';
import './create-account-modal.css';

const CreateAccountModal = ({ client, onClose, onAccountCreated }) => {
  const [products, setProducts] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    productId: ''
  });
  const [loading, setLoading] = useState(false);

  // Загружаем список продуктов
  useEffect(() => {
    const loadProducts = async () => {
      try {
        console.log('🔍 CreateAccountModal: Загружаем продукты...');
        const response = await axiosAPI.get('/admin/crm/deals/products');
        console.log('🔍 CreateAccountModal: Получен ответ:', response.data);
        setProducts(response.data.products || []);
        console.log('🔍 CreateAccountModal: Установлено продуктов:', response.data.products?.length || 0);
      } catch (error) {
        console.error('Ошибка загрузки продуктов:', error);
      }
    };

    loadProducts();
  }, []);

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.productId) {
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Заполните все поля'
        }
      }));
      return;
    }

    setLoading(true);
    
    try {
      const selectedProduct = products.find(p => p.id === parseInt(formData.productId));
      console.log('🔍 CreateAccountModal: selectedProduct:', selectedProduct);
      console.log('🔍 CreateAccountModal: client.userId:', client.userId);
      console.log('🔍 CreateAccountModal: formData:', formData);
      
      if (!selectedProduct) {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Выберите тип продукта'
          }
        }));
        return;
      }
      
      const requestData = {
        name: formData.name,
        productType: selectedProduct.name
      };
      console.log('🔍 CreateAccountModal: Отправляем данные:', requestData);
      
      await axiosAPI.post(`/admin/users/${client.userId}/accounts`, requestData);

      // Уведомляем родительский компонент о создании счета
      if (onAccountCreated) {
        onAccountCreated();
      }

      onClose();
      
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Счет успешно создан'
        }
      }));
    } catch (error) {
      console.error('Ошибка создания счета:', error);
      
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка создания счета: ' + error.message
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content create-account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Создать новый счет</h3>
          <button onClick={onClose} className="close-btn">✕</button>
        </div>

        <div className="modal-body">
          <div className="client-info">
            <p><strong>Клиент:</strong> {client.surname} {client.firstname} {client.patronymic}</p>
            <p><strong>Email:</strong> {client.email}</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="account-name">Название счета:</label>
              <input
                type="text"
                id="account-name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Введите название счета"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="product-select">Тип продукта:</label>
              <select
                id="product-select"
                value={formData.productId}
                onChange={(e) => setFormData({...formData, productId: e.target.value})}
                required
              >
                <option value="">Выберите тип продукта</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.currency})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-actions">
              <button type="button" onClick={onClose} className="btn-cancel">
                Отменить
              </button>
              <button type="submit" className="btn-create" disabled={loading}>
                {loading ? 'Создание...' : 'Создать счет'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateAccountModal;
