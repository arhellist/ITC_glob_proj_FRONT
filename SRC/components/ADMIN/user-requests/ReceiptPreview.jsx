import React, { useState, useEffect } from 'react';
import { API_CONFIG } from '../../../config/api.js';
import './ReceiptPreview.css';

const ReceiptPreview = ({ receiptPath, onClick }) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPdf, setIsPdf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!receiptPath || receiptPath === 'Нет данных') {
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('accessToken');
    if (!token) {
      setLoading(false);
      setError(true);
      return;
    }

    // Нормализуем путь: убираем все начальные слэши
    let normalizedPath = receiptPath;
    while (normalizedPath.startsWith('/')) {
      normalizedPath = normalizedPath.substring(1);
    }
    // Добавляем токен в query параметр для img, так как cookie может не передаваться
    const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
    const receiptUrl = `${API_CONFIG.BASE_URL}/admin/receipts/${normalizedPath}?t=${Date.now()}${tokenParam}`;
    
    // Проверяем, является ли файл PDF
    const isPdfFile = receiptPath.toLowerCase().endsWith('.pdf');
    setIsPdf(isPdfFile);

    if (isPdfFile) {
      // Для PDF используем URL напрямую (браузер покажет превью или иконку)
      setPreviewUrl(receiptUrl);
      setLoading(false);
    } else {
      // Для изображений загружаем превью
      const img = new Image();
      img.onload = () => {
        setPreviewUrl(receiptUrl);
        setLoading(false);
      };
      img.onerror = () => {
        setError(true);
        setLoading(false);
      };
      img.src = receiptUrl;
    }
  }, [receiptPath]);

  const handleClick = (e) => {
    e.stopPropagation(); // Предотвращаем открытие модалки заявки
    if (onClick) {
      onClick();
    }
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    if (!receiptPath || receiptPath === 'Нет данных') return;
    
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        alert('Ошибка: Токен авторизации отсутствует.');
        return;
      }
      
      // Нормализуем путь: убираем все начальные слэши
      let normalizedPath = receiptPath;
      while (normalizedPath.startsWith('/')) {
        normalizedPath = normalizedPath.substring(1);
      }
      
      // Используем axiosAPI для скачивания - токен будет в куках
      const { default: axiosAPI } = await import('../../../JS/auth/http/axios');
      const response = await axiosAPI.get(`/admin/receipts/${normalizedPath}`, {
        params: { download: 'true' },
        responseType: 'blob'
      });
      
      // axios возвращает данные напрямую в response.data
      const blob = response.data;
      
      // Создаем временную ссылку для скачивания
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = normalizedPath.split('/').pop() || 'receipt';
      document.body.appendChild(link);
      link.click();
      
      // Очищаем
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Ошибка скачивания чека:', error);
      alert(`Ошибка скачивания: ${error.message}`);
    }
  };

  if (!receiptPath || receiptPath === 'Нет данных') {
    return (
      <div className="receipt-preview receipt-preview-empty">
        <span>Чек не прикреплен</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="receipt-preview receipt-preview-loading">
        <span>Загрузка...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="receipt-preview receipt-preview-error">
        <span>Ошибка загрузки</span>
      </div>
    );
  }

  return (
    <div className="receipt-preview" onClick={handleClick}>
      {isPdf ? (
        <div className="receipt-preview-pdf">
          <div className="receipt-preview-pdf-icon">📄</div>
          <span className="receipt-preview-pdf-label">PDF</span>
        </div>
      ) : (
        <img 
          src={previewUrl} 
          alt="Превью чека" 
          className="receipt-preview-image"
        />
      )}
      <div className="receipt-preview-overlay">
        <button 
          className="receipt-preview-download-btn"
          onClick={handleDownload}
          title="Скачать"
        >
          ⬇
        </button>
      </div>
    </div>
  );
};

export default ReceiptPreview;

