import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axiosAPI from "../../JS/auth/http/axios";
import "./entryes.css";
import "./account-activation.css";

function AccountActivation() {
  const { activationLink } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(4);

  // Таймер обратного отсчета
  useEffect(() => {
    if (status === 'success') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, navigate]);

  useEffect(() => {
    const activateAccount = async () => {
      try {
        console.log('AccountActivation: Активируем аккаунт с ссылкой:', activationLink);
        
        const response = await axiosAPI.get(`/profile/activate/${activationLink}`);
        
        console.log('AccountActivation: Ответ от сервера:', response.data);
        
        if (response.data.activated) {
          setStatus('success');
          setMessage(response.data.message || 'Аккаунт успешно активирован! Теперь вы можете войти в систему.');
          setCountdown(4);
        } else {
          setStatus('error');
          setMessage(response.data.message || 'Ошибка активации аккаунта');
        }
      } catch (error) {
        console.error('AccountActivation: Ошибка активации:', error);
        setStatus('error');
        
        if (error.response?.status === 400) {
          setMessage('Неверная ссылка активации или аккаунт уже активирован');
        } else if (error.response?.status === 404) {
          setMessage('Ссылка активации не найдена');
        } else {
          setMessage('Произошла ошибка при активации аккаунта. Попробуйте позже.');
        }
      }
    };

    if (activationLink) {
      activateAccount();
    } else {
      setStatus('error');
      setMessage('Отсутствует ссылка активации');
    }
  }, [activationLink, navigate]);

  return (
    <section className="entryes">
      <div className="entryes-bg"></div>
      <div className="entryes-bg-overlay"></div>
      
      <div className="activation-container">
        <div className="activation-card formm-shadow">
          {/* Логотип */}
          <div className="form-login-logo">
            <div className="form-login-logo-img img"></div>
          </div>

          {/* Иконка статуса */}
          <div className={`activation-icon activation-icon-${status}`}>
            {status === 'loading' && (
              <div className="spinner"></div>
            )}
            {status === 'success' && (
              <svg className="success-checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="success-checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="success-checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            )}
            {status === 'error' && (
              <svg className="error-cross" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle className="error-cross-circle" cx="26" cy="26" r="25" fill="none"/>
                <path className="error-cross-line error-cross-line1" fill="none" d="M16 16 36 36 M36 16 16 36"/>
              </svg>
            )}
          </div>

          {/* Заголовок */}
          <h1 className="activation-title">
            {status === 'loading' && 'Активация аккаунта'}
            {status === 'success' && 'Аккаунт успешно активирован!'}
            {status === 'error' && 'Ошибка активации'}
          </h1>

          {/* Сообщение */}
          <p className={`activation-message activation-message-${status}`}>
            {message}
          </p>

          {/* Таймер для успешной активации */}
          {status === 'success' && (
            <div className="activation-redirect">
              <p className="activation-redirect-text">
                Через <span className="activation-countdown">{countdown}</span> {countdown === 1 ? 'секунду' : countdown < 5 ? 'секунды' : 'секунд'} вы будете перенаправлены на страницу входа...
              </p>
            </div>
          )}

          {/* Кнопки действий */}
          <div className="activation-buttons">
            {(status === 'success' || status === 'error') && (
              <button
                className="activation-button activation-button-primary gradient-effect-bg gradient-effect-border"
                onClick={() => navigate('/login')}
              >
                Войти в систему
              </button>
            )}
            
            {status === 'error' && (
              <button
                className="activation-button activation-button-secondary"
                onClick={() => navigate('/registration')}
              >
                Регистрация
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default AccountActivation;
