import React from 'react';
import './EmailSendingLoader.css';

/**
 * Компонент прелоадера отправки письма
 */
const EmailSendingLoader = ({ isVisible, message = "ОТПРАВЛЯЕМ..." }) => {
  if (!isVisible) return null;

  return (
    <div className="email-sending-loader-overlay">
      <div className="email-sending-loader-container">
        <div className="email-sending-loader-circle">
          <div className="email-sending-loader-pulse delay-1"></div>
          <div className="email-sending-loader-pulse delay-2"></div>
          <div className="email-sending-loader-pulse delay-3"></div>
          <div className="email-sending-loader-pulse delay-4"></div>
        </div>
        <div className="email-sending-loader-text">
          {message}
        </div>
      </div>
    </div>
  );
};

export default EmailSendingLoader;
