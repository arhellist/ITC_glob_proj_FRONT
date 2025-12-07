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

    // Нормализуем путь (убираем начальный слэш если есть)
    const normalizedPath = receiptPath.startsWith('/') ? receiptPath.substring(1) : receiptPath;
    const receiptUrl = `${API_CONFIG.BASE_URL}/admin/receipts/${normalizedPath}?token=${token}&t=${Date.now()}`;
    
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
      
      // Нормализуем путь (убираем начальный слэш если есть)
      const normalizedPath = receiptPath.startsWith('/') ? receiptPath.substring(1) : receiptPath;
      const downloadUrl = `${API_CONFIG.BASE_URL}/admin/receipts/${normalizedPath}?token=${token}&download=true`;
      
      // Используем fetch для получения файла как blob
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`);
      }
      
      // Получаем blob
      const blob = await response.blob();
      
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

