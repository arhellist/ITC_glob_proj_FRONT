import { useState, useEffect, useCallback, useRef } from 'react';
import adminAuthService from '../../../JS/services/admin-auth-service.js';
import '../index.admin.css';

const AdminLogin = ({ onLoginSuccess }) => {
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tokenSent, setTokenSent] = useState(false);
  const [expiresAt, setExpiresAt] = useState(null);
  const hasGeneratedToken = useRef(false);

  const generateToken = useCallback(async (force = false) => {
    // Предотвращаем повторные вызовы только если это не принудительная генерация
    if (!force && hasGeneratedToken.current) {
      console.log('AdminLogin: Токен уже был сгенерирован, пропускаем');
      return;
    }

    try {
      hasGeneratedToken.current = true;
      setLoading(true);
      setError('');
      
      console.log('AdminLogin: Генерируем токен...');
      const result = await adminAuthService.generateToken();
      
      if (result.success) {
        setTokenSent(true);
        setExpiresAt(result.expiresAt);
      } else if (result.needsTelegramRegistration) {
        setError(result.message || 'Токен не отправлен, отсутствует адрес отправителя');
      } else {
        setError(result.message || 'Ошибка генерации токена');
      }
    } catch (err) {
      console.error('Ошибка генерации токена:', err);
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  }, []);

  // Автоматически генерируем токен при загрузке (только один раз)
  useEffect(() => {
    if (!hasGeneratedToken.current) {
      generateToken();
    }
  }, [generateToken]);

  const handlePasteToken = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setToken(text.trim());
        setError('');
      }
    } catch (err) {
      console.error('Ошибка чтения из буфера обмена:', err);
      setError('Не удалось прочитать буфер обмена. Убедитесь, что у браузера есть разрешение на доступ к буферу обмена.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!token) {
      setError('Введите токен из Telegram');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const result = await adminAuthService.loginWithToken(token);
      
      if (result.success) {
        localStorage.setItem('adminToken', result.token);
        onLoginSuccess();
      } else {
        setError(result.message || 'Ошибка входа');
      }
    } catch (err) {
      console.error('Ошибка входа администратора:', err);
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-form">
        <h2>Вход в админ-панель</h2>
        
        {tokenSent ? (
          <div>
            <div className="admin-login-info">
              <p>Токен отправлен</p>
              {expiresAt && (
                <p>Действителен до: {new Date(expiresAt).toLocaleString()}</p>
              )}
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="admin-login-field">
                <label htmlFor="admin-token" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Токен:</span>
                  <button
                    type="button"
                    onClick={handlePasteToken}
                    disabled={loading}
                    className="admin-login-paste-button"
                  >
                    Вставить
                  </button>
                </label>
                <input
                  type="text"
                  id="admin-token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={loading}
                  placeholder="Введите токен"
                  required
                />
              </div>

              {error && (
                <div className="admin-login-error">
                  {error}
                  {error.includes('отсутствует адрес отправителя') && (
                    <div className="admin-login-info">
                      <p>Для получения токена необходимо:</p>
                      <ol>
                        <li>Зарегистрироваться в Telegram боте: <a href="https://t.me/ArhellistCreatorAppKrobot" target="_blank" rel="noopener noreferrer">https://t.me/ArhellistCreatorAppKrobot</a></li>
                        <li>Использовать команду <code>/start</code> или <code>/register</code></li>
                        <li>Указать тот же email, что используется для входа в систему</li>
                      </ol>
                      <p>После регистрации в боте попробуйте снова получить токен.</p>
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="admin-login-button"
              >
                {loading ? 'Вход...' : 'Войти'}
              </button>
            </form>

            <button 
              onClick={() => generateToken(true)}
              disabled={loading}
              className="admin-login-button"
              style={{ marginTop: '1rem', backgroundColor: '#666' }}
            >
              Отправить новый токен
            </button>
          </div>
        ) : (
          <div>
            {loading ? (
              <div>Генерация токена...</div>
            ) : (
              <div>
                <div className="admin-login-error">
                  {error}
                </div>
                <button 
                  onClick={() => generateToken(true)}
                  className="admin-login-button"
                >
                  Получить токен
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminLogin;
