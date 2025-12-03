import "../entryes.css"; // Импорт CSS стилей для формы регистрации
import { useNavigate } from "react-router-dom"; // Импорт хука для программной навигации
import { useAuthStore } from "../../../JS/auth/store/store"; // Импорт Zustand store для управления аутентификацией
import { useState, useEffect } from "react"; // Импорт React хуков для состояния и побочных эффектов
import Captcha from "../captcha.jsx"; // Импорт компонента капчи для защиты от ботов

function Registration() { // Компонент формы регистрации нового пользователя
    console.log('Registration: Компонент регистрации загружен'); // Логирование загрузки компонента
    const navigate = useNavigate(); // Хук для программной навигации между страницами
    const [formData, setFormData] = useState({ // Состояние для хранения данных формы регистрации
        lastName: '', // Фамилия пользователя
        name: '', // Имя пользователя
        patronymic: '', // Отчество пользователя
        phone: '', // Номер телефона пользователя
        email: '', // Email адрес пользователя
        referralCode: '', // Реферальный код для регистрации
        password: '', // Пароль пользователя
        passwordRepeat: '' // Повтор пароля для проверки
    });
    const [loading, setLoading] = useState(false); // Состояние загрузки при отправке формы
    const [showCaptcha, setShowCaptcha] = useState(false); // Состояние показа капчи
    const [captchaVerified, setCaptchaVerified] = useState(false); // Состояние проверки капчи
    const [captchaCompleted, setCaptchaCompleted] = useState(false); // Состояние завершения капчи
    
    // Получаем методы стора для регистрации
    const registration = useAuthStore(s => s.registration); // Получаем функцию регистрации из store
    const fetchCSRFToken = useAuthStore(s => s.fetchCSRFToken); // Получаем функцию получения CSRF токена из store

    // Получаем CSRF токен при загрузке формы
    useEffect(() => {
        console.log('Registration: Форма регистрации загружена, запрашиваем CSRF токен...');
        fetchCSRFToken().catch(err => {
            console.error('Registration: Ошибка получения CSRF токена:', err);
        });
    }, [fetchCSRFToken]);

    // Подставляем реф-код из localStorage, если есть
    useEffect(() => {
        try {
            const ref = typeof window !== 'undefined' ? localStorage.getItem('itc_ref_link_partner') : '';
            if (ref) {
                setFormData(prev => ({ ...prev, referralCode: ref }));
            }
        } catch (e) {
            console.log(e)
        }
    }, []);
    
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    const handleLogin = () => {
        console.log('Registration: handleLogin вызван - переходим на страницу входа');
        navigate('/login');
    }

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
    
    const handleRegistration = async (e) => {
        e.preventDefault();
        
        // Валидация обязательных полей (кроме referralCode)
        if (!formData.lastName.trim()) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Введите фамилию' } }));
            return;
        }
        
        if (!formData.name.trim()) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Введите имя' } }));
            return;
        }
        
        if (!formData.patronymic.trim()) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Введите отчество' } }));
            return;
        }
        
        if (!formData.phone.trim()) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Введите номер телефона' } }));
            return;
        }
        
        if (!formData.email.trim()) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Введите адрес электронной почты' } }));
            return;
        }
        
        // Проверка формата email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Введите корректный адрес электронной почты' } }));
            return;
        }
        
        if (!formData.password.trim()) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Введите пароль' } }));
            return;
        }
        
        // Проверка минимальной длины пароля
        if (formData.password.length < 6) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Пароль должен содержать минимум 6 символов' } }));
            return;
        }
        
        if (!formData.passwordRepeat.trim()) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Повторите пароль' } }));
            return;
        }
        
        // Проверка совпадения паролей
        if (formData.password !== formData.passwordRepeat) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Пароли не совпадают' } }));
            return;
        }

        // Проверка чекбокса "тест на человечность"
        const humanTestCheckbox = document.getElementById('user-login-humanyly-test');
        if (!humanTestCheckbox.checked) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Необходимо пройти тест на человечность' } }));
            return;
        }

        // Проверка чекбокса согласия на обработку данных
        const disclameCheckbox = document.getElementById('form-disclame-checkbox');
        if (!disclameCheckbox.checked) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Необходимо согласиться на обработку персональных данных' } }));
            return;
        }

        // Проверяем капчу если она была показана
        if (showCaptcha && !captchaVerified && !captchaCompleted) {
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: 'Необходимо пройти проверку капчи' } }));
            return;
        }
        
        setLoading(true);
        
        try {
            await registration(
                formData.email, 
                formData.password, 
                formData.name, 
                formData.lastName, 
                formData.patronymic, 
                formData.phone, 
                captchaCompleted ? 'captcha_verified' : 'no_captcha',
                formData.referralCode
            );
            // Отправляем SUCCESS уведомление напрямую через событие
            document.dispatchEvent(new CustomEvent('main-notify', { 
                detail: { type: 'success', text: 'Регистрация успешна' } 
            }));
            navigate('/personal-room'); // Успешная регистрация
        } catch (err) {
            console.error('Ошибка регистрации:', err);
            const msg = err?.response?.data?.message || 'Ошибка регистрации';
            document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text: msg } }));
        } finally {
            setLoading(false);
        }
    }
    return (
      <>
      <div 
        className="form-login-container formm-shadow form-registration-container flex flex-column bru-max bg-color-main txt-size-07"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !loading) {
            e.preventDefault();
            handleRegistration();
          }
        }}
      >
        <div className="form-registration-logo">
          <div className="form-login-logo-img img"></div>
        </div>
       
        <div className="form-email-inputs flex flex-column">
            <label className="txt-white" htmlFor="user-login-last-name">Фамилия</label>
            <input 
              className="txt-black bru-min" 
              type="text" 
              placeholder="Фамилия" 
              id="user-login-last-name" 
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required 
              disabled={loading}
            />
          </div>
          <div className="form-email-inputs flex flex-column">
            <label className="txt-white" htmlFor="user-login-name">Имя</label>
            <input 
              className="txt-black bru-min" 
              type="text" 
              placeholder="Имя" 
              id="user-login-name" 
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required 
              disabled={loading}
            />
          </div>
          <div className="form-email-inputs flex flex-column">
            <label className="txt-white" htmlFor="user-login-patronymic">Отчество</label>
            <input 
              className="txt-black bru-min" 
              type="text" 
              placeholder="Отчество" 
              id="user-login-patronymic" 
              name="patronymic"
              value={formData.patronymic}
              onChange={handleInputChange}
              required 
              disabled={loading}
            />
          </div>

          <div className="form-email-inputs flex flex-column">
            <label className="txt-white" htmlFor="user-login-phone">Телефон</label>
            <input 
              className="txt-black bru-min" 
              type="tel" 
              placeholder="+7 (999) 999-99-99" 
              id="user-login-phone" 
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              required 
              disabled={loading}
            />
          </div>

        <div className="form-email-inputs flex flex-column">
          <label className="txt-white" htmlFor="user-login-email">Адрес эл. почты</label>
          <input 
            className="txt-black bru-min" 
            type="email" 
            placeholder="investtimecapita@gmail.com" 
            id="user-login-email" 
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            required 
            disabled={loading}
          />
        </div>

        <div className="form-email-inputs flex flex-column">
            <label className="txt-white" htmlFor="user-login-referral-code">Реферальный код</label>
            <input 
              className="txt-black bru-min" 
              type="text" 
              placeholder="Реферальный код" 
              id="user-login-referral-code" 
              name="referralCode"
              value={formData.referralCode}
              onChange={handleInputChange}
              disabled={loading}
            />
          </div>

        <div className="form-password-inputs flex flex-column">
          <label className="txt-white" htmlFor="user-login-password">Пароль</label>
          <input 
            className="txt-black bru-min" 
            type="password" 
            placeholder="Введите ваш пароль" 
            id="user-login-password" 
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            required 
            disabled={loading}
          />
        </div>
        <div className="form-password-inputs flex flex-column">
            <label className="txt-white" htmlFor="user-login-password-repeat">Повторите пароль</label>
            <input 
              className="txt-black bru-min" 
              type="password" 
              placeholder="Повторите ваш пароль" 
              id="user-login-password-repeat" 
              name="passwordRepeat"
              value={formData.passwordRepeat}
              onChange={handleInputChange}
              required 
              disabled={loading}
            />
          </div>

        <div className="form-password-inputs-humanyly flex flex-row bru-min">
          <label className="txt-black" htmlFor="user-login-humanyly-test">Пройдите тест на человечность</label>
          <input 
            type="checkbox" 
            id="user-login-humanyly-test" 
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
          <label className="txt-gray" htmlFor="form-disclame-checkbox">
            Я подтверждаю ознакомление и дою согласие на обработку моих персональных данных в порядке и на условиях, указанных в
            <a href="#" target="_blank" rel="noopener noreferrer">Политике обработки персональных данных</a>
          </label>
          <input className="bg-color-main" type="checkbox" id="form-disclame-checkbox" required disabled={loading} />
        </div>

        <div className="form-login-buttons flex">
          <div 
            className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main" 
            onClick={handleRegistration}
            style={{cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1}}
          >
            {loading ? 'Регистрация...' : 'зарегистрироваться'}
          </div>
        </div>

        <div className="form-login-redirect-registration flex flex-row txt-white">
          <span className="form-login-redirect-registration-text">
            Уже есть аккаунт?
            <a href="#" className="form-login-redirect-registration-link" onClick={(e) => { e.preventDefault(); handleLogin(); }}>Войдите</a>
          </span>
        </div>

        <input type="hidden" name="captchaVerified" id="captchaVerified" value={captchaCompleted ? "1" : "0"} />
      </div>
      </>
    );
  }
  
  export default Registration;