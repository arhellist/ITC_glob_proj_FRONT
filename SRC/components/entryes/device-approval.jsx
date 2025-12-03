import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { API_CONFIG } from '../../config/api.js';
import '../entryes/entryes.css';

function DeviceApproval() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('checking'); // checking, success, error
  const [message, setMessage] = useState('');
  const [action, setAction] = useState(null);
  const [hasProcessed, setHasProcessed] = useState(false);

  const token = searchParams.get('token');
  const actionParam = searchParams.get('action'); // approve или block

  useEffect(() => {
    // Предотвращаем повторную обработку
    if (hasProcessed) return;
    
    if (!token) {
      setStatus('error');
      setMessage('Токен не найден в URL');
      setLoading(false);
      return;
    }

    if (!actionParam || (actionParam !== 'approve' && actionParam !== 'block')) {
      setStatus('error');
      setMessage('Некорректное действие. Используйте approve или block');
      setLoading(false);
      return;
    }

    setHasProcessed(true);
    setAction(actionParam);
    handleDeviceAction(actionParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, actionParam]);

  const handleDeviceAction = async (actionToUse) => {
    const currentAction = actionToUse || action;
    if (!token || !currentAction) {
      console.error('Device Approval: Missing token or action', { token, action: currentAction });
      return;
    }
    
    console.log('Device Approval: Starting action', { token: token.substring(0, 10) + '...', action: currentAction });

    setLoading(true);
    setStatus('checking');

    try {
      // Сначала проверяем статус токена (без авторизации, так как используется токен)
      console.log('Device Approval: Checking token status...', { url: `${API_CONFIG.BASE_URL}/profile/device-approval/check` });
      const checkResponse = await axios.get(`${API_CONFIG.BASE_URL}/profile/device-approval/check`, {
        params: { token },
        withCredentials: true
      });

      console.log('Device Approval Check Response:', checkResponse.data);

      if (!checkResponse.data.valid) {
        setStatus('error');
        setMessage(checkResponse.data.message || 'Токен недействителен или истек');
        setLoading(false);
        return;
      }

      // Выполняем действие
      if (currentAction === 'approve') {
        console.log('Device Approval: Approving device...', { url: `${API_CONFIG.BASE_URL}/profile/device-approval/approve` });
        const approveResponse = await axios.get(`${API_CONFIG.BASE_URL}/profile/device-approval/approve`, {
          params: { token },
          withCredentials: true
        });

        console.log('Device Approval Approve Response:', approveResponse.data);

        if (approveResponse.data.success) {
          setStatus('success');
          setMessage('Устройство успешно одобрено. Теперь вы можете войти в систему.');
          
          // Перенаправляем на страницу входа через 3 секунды
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(approveResponse.data.message || 'Ошибка при одобрении устройства');
        }
      } else if (currentAction === 'block') {
        console.log('Device Approval: Blocking device...', { url: `${API_CONFIG.BASE_URL}/profile/device-approval/block` });
        const blockResponse = await axios.post(`${API_CONFIG.BASE_URL}/profile/device-approval/block`, {
          token,
          reason: 'Пользователь заблокировал устройство через email'
        }, {
          withCredentials: true
        });

        console.log('Device Approval Block Response:', blockResponse.data);

        if (blockResponse.data.success) {
          setStatus('success');
          setMessage('Устройство заблокировано. Аккаунт также был заблокирован для безопасности.');
          
          // Перенаправляем на страницу входа через 3 секунды
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        } else {
          setStatus('error');
          setMessage(blockResponse.data.message || 'Ошибка при блокировке устройства');
        }
      }
    } catch (error) {
      console.error('Device Approval: Ошибка обработки устройства:', error);
      console.error('Device Approval: Error response:', error.response);
      console.error('Device Approval: Error data:', error.response?.data);
      setStatus('error');
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.message || 
                          'Произошла ошибка при обработке запроса';
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
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
        <div style={{ textAlign: 'center', color: '#4CAF50', marginTop: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
          <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Успешно!</p>
          <p style={{ fontSize: '1rem', color: '#fff' }}>{message}</p>
          <p style={{ fontSize: '0.9rem', color: '#aaa', marginTop: '1rem' }}>Перенаправление на страницу входа...</p>
        </div>
      )}

      {status === 'error' && (
        <div style={{ textAlign: 'center', color: '#ff6b6b', marginTop: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✗</div>
          <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Ошибка</p>
          <p style={{ fontSize: '1rem', color: '#fff' }}>{message}</p>
          <button
            onClick={() => navigate('/login')}
            style={{
              marginTop: '2rem',
              padding: '12px 24px',
              backgroundColor: '#ff6b6b',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            Перейти на страницу входа
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default DeviceApproval;

