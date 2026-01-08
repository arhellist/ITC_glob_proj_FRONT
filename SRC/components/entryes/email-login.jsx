import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../JS/auth/store/store";
import { collectBasicFingerprint, parseUserAgent } from "../../utils/fingerprint-collector.js";
import FingerprintPermissionsModal from "./fingerprint-permissions-modal.jsx";
import axios from "axios";
import { API_CONFIG } from "../../config/api.js"; // Централизованный BASE_URL для API
import "../entryes/entryes.css";

function EmailLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFingerprintModal, setShowFingerprintModal] = useState(false);
  const token = searchParams.get('token');

  useEffect(() => {
    const handleEmailLogin = async () => {
      if (!token) {
        setError('Токен не предоставлен');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        // Используем централизованную конфигурацию, чтобы в проде всегда был верный BASE_URL
        const apiUrl = API_CONFIG.BASE_URL || '';
        const loginUrl = apiUrl
          ? `${apiUrl}/auth/email-link/login`
          : `/auth/email-link/login`;
        
        // Собираем информацию об устройстве
        // КРИТИЧНО: Все поля должны быть одинаковыми для всех способов входа,
        // чтобы deviceId был одинаковым для одного и того же устройства
        const basicFingerprint = collectBasicFingerprint();
        const browserInfo = parseUserAgent(basicFingerprint.user_agent);
        const deviceInfo = {
          userAgent: basicFingerprint.user_agent,
          ipAddress: '',
          deviceName: `${browserInfo.browser} на ${browserInfo.os}`,
          screenResolution: basicFingerprint.screen_resolution,
          browser: browserInfo.browser,
          os: browserInfo.os,
          platform: basicFingerprint.platform || '',
          timezone: basicFingerprint.timezone || '',
          language: basicFingerprint.language || '',
          location: '',
          fingerprintData: basicFingerprint
        };

        const response = await axios.post(loginUrl, { 
          token: token.trim(),
          deviceInfo
        }, {
          headers: {
            'Content-Type': 'application/json',
          },
          withCredentials: true
        });

        if (response.data.success) {
          // Обновляем состояние аутентификации
          const { handleAuthResponse } = useAuthStore.getState();
          const authResponse = response.data.data || {
            accessToken: response.data.accessToken,
            refreshToken: response.data.refreshToken,
            user: response.data.user
          };
          await handleAuthResponse({ data: authResponse });
          
          // Проверяем аутентификацию и загружаем профиль
          const { checkAuth, fetchUserProfile } = useAuthStore.getState();
          await checkAuth();
          await fetchUserProfile();
          
          document.dispatchEvent(new CustomEvent('main-notify', { 
            detail: { type: 'success', text: 'Вход выполнен успешно' } 
          }));
          
          // Проверяем fingerprint_permissions после успешной авторизации
          try {
            const storedPermissions = localStorage.getItem('fingerprint_permissions');
            if (!storedPermissions) {
              // Если разрешения не были запрошены - показываем модальное окно
              setShowFingerprintModal(true);
            } else {
              navigate('/personal-room');
            }
          } catch (e) {
            console.warn('Ошибка чтения разрешений из localStorage:', e);
            navigate('/personal-room');
          }
        } else {
          setError(response.data.message || 'Ошибка входа по ссылке');
        }
      } catch (error) {
        console.error('Ошибка входа по email-ссылке:', error);
        setError(error.response?.data?.message || 'Недействительная или истекшая ссылка');
      } finally {
        setLoading(false);
      }
    };

    handleEmailLogin();
  }, [token, navigate]);

  return (
    <div className="entryes">
      <div className="entryes-bg"></div>
      <div className="entryes-bg-overlay"></div>
      
      <div className="form-login-container formm-shadow flex flex-column bru-max bg-color-main txt-size-07" style={{ 
        minHeight: '300px', 
        justifyContent: 'center', 
        alignItems: 'center',
        padding: '2vw'
      }}>
        <div className="form-login-logo">
          <div className="form-login-logo-img img"></div>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', color: '#fff', marginTop: '2rem' }}>
            <p style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Выполняется вход...</p>
            <div style={{ 
              display: 'inline-block', 
              width: '40px', 
              height: '40px', 
              border: '4px solid rgba(255,255,255,0.3)', 
              borderTop: '4px solid #fff', 
              borderRadius: '50%', 
              animation: 'spin 1s linear infinite' 
            }}></div>
          </div>
        )}

        {error && !loading && (
          <div style={{ textAlign: 'center', color: '#f44336', marginTop: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✗</div>
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Ошибка входа</p>
            <p style={{ fontSize: '1rem', color: '#fff' }}>{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
              style={{
                marginTop: '2rem',
                padding: '1vw 2vw',
                fontSize: '1em',
                cursor: 'pointer'
              }}
            >
              Вернуться к форме входа
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

      {/* Модальное окно разрешений на fingerprint */}
      {showFingerprintModal && (
        <FingerprintPermissionsModal
          onPermissionsGranted={() => {
            setShowFingerprintModal(false);
            navigate('/personal-room');
          }}
          onPermissionsDenied={() => {
            setShowFingerprintModal(false);
            navigate('/personal-room');
          }}
        />
      )}
    </div>
  );
}

export default EmailLogin;

