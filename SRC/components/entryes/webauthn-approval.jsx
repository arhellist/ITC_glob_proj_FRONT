import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_CONFIG } from '../../config/api.js';
import { useAuthStore } from '../../JS/auth/store/store.js';
import '../entryes/entryes.css';

function WebAuthnApproval() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('checking'); // checking, success, error
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const isAuth = useAuthStore((s) => s.isAuth); // Проверяем авторизацию

  const token = searchParams.get('token');
  const actionParam = searchParams.get('action'); // approve или block

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Токен не найден в URL');
      setError('Токен подтверждения отсутствует');
      setLoading(false);
      return;
    }

    if (!actionParam || (actionParam !== 'approve' && actionParam !== 'block')) {
      setStatus('error');
      setMessage('Некорректное действие');
      setError('Используйте approve или block');
      setLoading(false);
      return;
    }

    handleWebAuthnAction();
  }, [token, actionParam]);

  const handleWebAuthnAction = async () => {
    if (!token || !actionParam) return;

    setLoading(true);
    setStatus('checking');

    try {
      const apiUrl = API_CONFIG.BASE_URL || '';
      const endpoint = actionParam === 'approve' 
        ? `${apiUrl}/auth/webauthn/approve`
        : `${apiUrl}/auth/webauthn/block`;
      
      const response = await axios.post(endpoint, { token });

      console.log('WebAuthn Approval Response:', response.data);

      if (response.data.success) {
        setStatus('success');
        setMessage('Ваш биометрический ключ успешно добавлен');
      } else {
        setStatus('error');
        setMessage('Ваш биометрический ключ не был добавлен');
        setError(response.data.message || response.data.error || 'Неизвестная ошибка');
      }
    } catch (error) {
      console.error('Ошибка обработки биометрического ключа:', error);
      setStatus('error');
      setMessage('Ваш биометрический ключ не был добавлен');
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Произошла ошибка при обработке запроса';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOk = () => {
    // Если пользователь авторизован, переходим в личный кабинет, иначе на страницу входа
    if (isAuth) {
      navigate('/personal-room');
    } else {
      navigate('/login');
    }
  };

  const handleGoToSite = () => {
    // Если пользователь авторизован, переходим в личный кабинет, иначе на страницу входа
    if (isAuth) {
      window.location.href = '/personal-room';
    } else {
      window.location.href = '/login';
    }
  };

  return (
    <div className="entryes">
      <div className="entryes-bg"></div>
      <div className="entryes-bg-overlay"></div>
      <div className="form-login-container formm-shadow flex flex-column bru-max bg-color-main txt-size-07" style={{ minHeight: '400px', justifyContent: 'center', alignItems: 'center' }}>
        <div className="form-login-logo">
          <div className="form-login-logo-img img"></div>
        </div>

        {loading && status === 'checking' && (
          <div style={{ textAlign: 'center', color: '#fff', marginTop: '2rem' }}>
            <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Обработка запроса...</p>
            <div style={{ display: 'inline-block', width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.3)', borderTop: '4px solid #fff', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          </div>
        )}

        {status === 'success' && (
          <div style={{ textAlign: 'center', color: '#4CAF50', marginTop: '2rem', width: '100%', padding: '0 2vw' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <p style={{ fontSize: '1.2rem', marginBottom: '1rem', color: '#fff' }}>{message}</p>
            <div style={{ display: 'flex', gap: '1vw', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleOk}
                className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
                style={{
                  padding: '12px 24px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                OK
              </button>
              <button
                onClick={handleGoToSite}
                className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
                style={{
                  padding: '12px 24px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Перейти на сайт
              </button>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', color: '#ff6b6b', marginTop: '2rem', width: '100%', padding: '0 2vw' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✗</div>
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: '#fff' }}>{message}</p>
            {error && (
              <p style={{ fontSize: '1rem', color: '#ff6b6b', marginBottom: '1rem', wordBreak: 'break-word' }}>
                Ошибка: {error}
              </p>
            )}
            <div style={{ display: 'flex', gap: '1vw', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleOk}
                className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
                style={{
                  padding: '12px 24px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                OK
              </button>
              <button
                onClick={handleGoToSite}
                className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
                style={{
                  padding: '12px 24px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  minWidth: '120px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                Перейти на сайт
              </button>
            </div>
          </div>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}

export default WebAuthnApproval;

