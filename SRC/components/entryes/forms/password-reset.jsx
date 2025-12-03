import "../entryes.css"; // Импорт CSS стилей для формы сброса пароля
import { useNavigate, useSearchParams } from "react-router-dom"; // Импорт хуков для навигации и получения параметров URL
import { useState, useEffect } from "react"; // Импорт React хуков для состояния и побочных эффектов
import Captcha from "../captcha.jsx"; // Импорт компонента капчи для защиты от ботов
import axiosAPI from "../../../JS/auth/http/axios.js"; // Импорт axios для API запросов
import ContainerNotification from "../../USER/accounts-room/modal-window-account-room/container-notification.jsx"; // Импорт компонента уведомлений

function PasswordReset() { // Компонент формы сброса пароля
    console.log('PasswordReset: Компонент сброса пароля загружен'); // Логирование загрузки компонента
    const navigate = useNavigate(); // Хук для программной навигации между страницами
    const [searchParams] = useSearchParams(); // Получаем параметры из URL
    const token = searchParams.get('token'); // Извлекаем токен из URL параметров
    
    const [formData, setFormData] = useState({ // Состояние для хранения данных формы
        password: '', // Новый пароль пользователя
        passwordRepeat: '' // Повтор пароля для проверки
    });
    const [loading, setLoading] = useState(false); // Состояние загрузки при отправке формы
    const [showCaptcha, setShowCaptcha] = useState(false); // Состояние показа капчи
    const [captchaVerified, setCaptchaVerified] = useState(false); // Состояние проверки капчи
    const [captchaCompleted, setCaptchaCompleted] = useState(false); // Состояние завершения капчи
    const [tokenValid, setTokenValid] = useState(null); // Состояние валидности токена (null - проверяется, true - валиден, false - невалиден)
    const [tokenValidating, setTokenValidating] = useState(true); // Состояние проверки токена
    
    // Проверка валидности токена при загрузке компонента
    useEffect(() => {
        const validateToken = async () => {
            if (!token) {
                setTokenValid(false);
                setTokenValidating(false);
                document.dispatchEvent(new CustomEvent('main-notify', { 
                    detail: { type: 'error', text: 'Токен сброса пароля не предоставлен' } 
                }));
                return;
            }
            
            try {
                setTokenValidating(true);
                const response = await axiosAPI.get(`/auth/password-reset/validate?token=${token}`);
                
                if (response.data && response.data.valid) {
                    setTokenValid(true);
                    // Токен валиден, можно продолжать
                } else {
                    setTokenValid(false);
                    document.dispatchEvent(new CustomEvent('main-notify', { 
                        detail: { type: 'error', text: response.data?.message || 'Токен недействителен или истек' } 
                    }));
                }
            } catch (error) {
                console.error('Ошибка валидации токена:', error);
                setTokenValid(false);
                const errorMessage = error?.response?.data?.message || 'Ошибка проверки токена';
                document.dispatchEvent(new CustomEvent('main-notify', { 
                    detail: { type: 'error', text: errorMessage } 
                }));
            } finally {
                setTokenValidating(false);
            }
        };
        
        validateToken();
    }, [token]);
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    const handleLogin = () => {
        console.log('PasswordReset: handleLogin вызван - переходим на страницу входа');
        navigate('/login');
    };

    const handleCaptchaToggle = (e) => {
        if (e.target.checked && !captchaCompleted) {
            setShowCaptcha(true);
        } else {
            setShowCaptcha(false);
            setCaptchaVerified(false);
            setCaptchaCompleted(false);
        }
    };

    const handleCaptchaVerified = (verified) => {
        setCaptchaVerified(verified);
        if (verified) {
            setCaptchaCompleted(true);
            setShowCaptcha(false);
        }
    };
    
    const handlePasswordReset = async (e) => {
        e.preventDefault();
        
        // Проверка наличия токена
        if (!token) {
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'error', text: 'Токен сброса пароля не предоставлен' } 
            }));
            return;
        }
        
        // Валидация пароля
        if (!formData.password.trim()) {
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'error', text: 'Введите новый пароль' } 
            }));
            return;
        }
        
        // Проверка минимальной длины пароля (8 символов согласно требованиям)
        if (formData.password.length < 8) {
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'error', text: 'Пароль должен содержать минимум 8 символов' } 
            }));
            return;
        }
        
        // Проверка на наличие букв и цифр в пароле
        const hasLetters = /[a-zA-Zа-яА-Я]/.test(formData.password);
        const hasNumbers = /[0-9]/.test(formData.password);
        if (!hasLetters || !hasNumbers) {
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'error', text: 'Пароль должен содержать буквы и цифры' } 
            }));
            return;
        }
        
        if (!formData.passwordRepeat.trim()) {
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'error', text: 'Повторите пароль' } 
            }));
            return;
        }
        
        // Проверка совпадения паролей
        if (formData.password !== formData.passwordRepeat) {
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'error', text: 'Пароли не совпадают' } 
            }));
            return;
        }

        // Проверка чекбокса "тест на человечность"
        const humanTestCheckbox = document.getElementById('password-reset-humanyly-test');
        if (!humanTestCheckbox || !humanTestCheckbox.checked) {
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'error', text: 'Необходимо пройти тест на человечность' } 
            }));
            return;
        }

        // Проверка чекбокса согласия на обработку данных
        const disclameCheckbox = document.getElementById('password-reset-disclame-checkbox');
        if (!disclameCheckbox || !disclameCheckbox.checked) {
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'error', text: 'Необходимо согласиться на обработку персональных данных' } 
            }));
            return;
        }

        // Проверяем капчу если она была показана
        if (showCaptcha && !captchaVerified && !captchaCompleted) {
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'error', text: 'Необходимо пройти проверку капчи' } 
            }));
            return;
        }
        
        setLoading(true);
        
        try {
            // Получаем CSRF токен
            const csrfResponse = await axiosAPI.get('/auth/csrf');
            const csrfToken = csrfResponse.data.csrfToken;
            
            // Отправляем запрос на сброс пароля
            await axiosAPI.post('/auth/password-reset/confirm', {
                token: token,
                newPassword: formData.password,
                confirmPassword: formData.passwordRepeat
            }, {
                headers: {
                    'X-CSRF-Token': csrfToken
                }
            });
            
            // Отправляем SUCCESS уведомление
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'success', text: 'Пароль успешно изменен. Все активные сессии завершены.' } 
            }));
            
            // Перенаправляем на страницу входа через небольшую задержку
            setTimeout(() => {
                navigate('/login');
            }, 2000);
        } catch (err) {
            console.error('Ошибка сброса пароля:', err);
            const msg = err?.response?.data?.message || 'Ошибка сброса пароля';
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'error', text: msg } 
            }));
        } finally {
            setLoading(false);
        }
    }
    
    // Показываем загрузку при проверке токена
    if (tokenValidating) {
        return (
            <section className="entryes">
                <ContainerNotification />
                <div className="entryes-bg"></div>
                <div className="entryes-bg-overlay"></div>
                <div className="form-login-container formm-shadow form-registration-container flex flex-column bru-max bg-color-main txt-size-07">
                    <div className="form-registration-logo">
                        <div className="form-login-logo-img img"></div>
                    </div>
                    <div style={{ textAlign: 'center', color: '#fff', padding: '2vw' }}>
                        Проверка токена...
                    </div>
                </div>
            </section>
        );
    }
    
    // Показываем ошибку, если токен невалиден
    if (tokenValid === false) {
        return (
            <section className="entryes">
                <ContainerNotification />
                <div className="entryes-bg"></div>
                <div className="entryes-bg-overlay"></div>
                <div className="form-login-container formm-shadow form-registration-container flex flex-column bru-max bg-color-main txt-size-07">
                    <div className="form-registration-logo">
                        <div className="form-login-logo-img img"></div>
                    </div>
                    <div style={{ textAlign: 'center', color: '#ff6b6b', padding: '2vw' }}>
                        <h2 style={{ marginBottom: '1vw', fontSize: '1.2vw' }}>Токен недействителен</h2>
                        <p style={{ marginBottom: '2vw', fontSize: '0.8vw' }}>Ссылка для сброса пароля недействительна или истекла.</p>
                        <p style={{ marginBottom: '2vw', fontSize: '0.8vw' }}>Пожалуйста, запросите новую ссылку для сброса пароля.</p>
                        <div 
                            className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main" 
                            onClick={handleLogin}
                            style={{ cursor: 'pointer', marginTop: '1vw', width: '82%', height: '2vw', lineHeight: '2vw' }}
                        >
                            Перейти на страницу входа
                        </div>
                    </div>
                </div>
            </section>
        );
    }
    
    return (
      <section className="entryes">
        <ContainerNotification />
        <div className="entryes-bg"></div>
        <div className="entryes-bg-overlay"></div>
        <form 
          className="form-login-container formm-shadow flex flex-column bru-max bg-color-main txt-size-07" 
          autoComplete="on" 
          onSubmit={(e) => { e.preventDefault(); if (!loading) handlePasswordReset(e); }}
        >
          <div className="form-login-logo">
            <div className="form-login-logo-img img"></div>
          </div>
         
          <div className="form-password-inputs flex flex-column">
            <label className="txt-white" htmlFor="password-reset-password">Новый пароль</label>
            <input 
              className="txt-black bru-min" 
              type="password" 
              placeholder="Введите новый пароль" 
              id="password-reset-password" 
              name="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleInputChange}
              required 
              disabled={loading}
            />
          </div>
          
          <div className="form-password-inputs flex flex-column">
            <label className="txt-white" htmlFor="password-reset-password-repeat">Повторите пароль</label>
            <input 
              className="txt-black bru-min" 
              type="password" 
              placeholder="Повторите новый пароль" 
              id="password-reset-password-repeat" 
              name="passwordRepeat"
              autoComplete="new-password"
              value={formData.passwordRepeat}
              onChange={handleInputChange}
              required 
              disabled={loading}
            />
          </div>

          <div className="form-password-inputs-humanyly flex flex-row bru-min">
            <label className="txt-black" htmlFor="password-reset-humanyly-test">Пройдите тест на человечность</label>
            <input 
              type="checkbox" 
              id="password-reset-humanyly-test" 
              checked={captchaCompleted}
              onChange={handleCaptchaToggle}
              disabled={loading} 
            />
          </div>

          {/* Компонент капчи */}
          {showCaptcha && !captchaCompleted && (
            <div style={{ marginTop: '20px' }}>
              <Captcha 
                onVerified={handleCaptchaVerified}
                isVerified={captchaVerified}
              />
            </div>
          )}

          <div className="form-disclame flex flex-row">
            <label className="txt-gray" htmlFor="password-reset-disclame-checkbox">
              Я подтверждаю ознакомление и даю согласие на обработку моих персональных данных в порядке и на условиях, указанных в
              <a href="#" target="_blank" rel="noopener noreferrer">Политике обработки персональных данных</a>
            </label>
            <input className="bg-color-main" type="checkbox" id="password-reset-disclame-checkbox" required disabled={loading} />
          </div>

          <div className="form-login-buttons flex">
            <button
              className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
              type="submit"
              style={{
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1
              }}
              disabled={loading}
            >
              {loading ? 'Сброс пароля...' : 'Сбросить пароль'}
            </button>
          </div>

          <div className="form-login-redirect-registration flex flex-row txt-white">
            <span className="form-login-redirect-registration-text">
              Вспомнили пароль?
              <a href="#" className="form-login-redirect-registration-link" onClick={(e) => { e.preventDefault(); handleLogin(); }}>Войдите</a>
            </span>
          </div>

          <input type="hidden" name="captchaVerified" id="password-reset-captchaVerified" value={captchaCompleted ? "1" : "0"} />
        </form>
      </section>
    );
  }
  
  export default PasswordReset;

