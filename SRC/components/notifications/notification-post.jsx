import React, { useState } from 'react';
import ReportModal from '../USER/report-modal/ReportModal';

function NotificationPost({ id, header, description, onClose }) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);

  // Обработчик клика на нотификацию
  const handleClick = () => {
    try {
      // Парсим данные отчета из description
      const data = typeof description === 'string' ? JSON.parse(description) : description;
      setReportData(data);
      setShowReportModal(true);
    } catch (error) {
      console.error('Ошибка парсинга данных отчета:', error);
    }
  };

  // Закрыть модалку отчета
  const handleCloseReport = () => {
    setShowReportModal(false);
    setReportData(null);
  };

  // Закрыть нотификацию
  const handleCloseNotification = (e) => {
    e.stopPropagation();
    if (onClose) onClose(id);
  };

  return (
    <>
      <div
        className="notification click_notification post flex flex-row bru pointer"
        data-id={id}
        onClick={handleClick}
      >
        <div 
          className="cancel_icon_notification img" 
          onClick={handleCloseNotification}
        ></div>

        <div className="post_icon notification_img img"></div>
        <div className="text">{header || 'Новое уведомление'}</div>
      </div>

      {showReportModal && (
        <ReportModal 
          reportData={reportData} 
          onClose={handleCloseReport} 
        />
      )}
    </>
  );
}

export default NotificationPost;

