import "../entryes.css";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../../JS/auth/store/store";
import { useState, useEffect } from "react";
import Captcha from "../captcha.jsx";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaCompleted, setCaptchaCompleted] = useState(false);

  // Получаем методы стора
  const login = useAuthStore((s) => s.login);
  const fetchCSRFToken = useAuthStore((s) => s.fetchCSRFToken);

  // Получаем CSRF токен при загрузке формы
  useEffect(() => {
    console.log("Форма логина загружена, запрашиваем CSRF токен...");
    fetchCSRFToken().catch((err) => {
      console.error("Ошибка получения CSRF токена:", err);
    });
  }, [fetchCSRFToken]);

  const handleRegistration = () => {
    navigate("/registration");
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

  const mapLoginError = (err) => {
    const status = err?.response?.status;
    const msg = (err?.response?.data?.message || err?.message || "").toLowerCase();
    if (status === 401 || msg.includes("invalid") || msg.includes("не вер")) return "Неверный логин/пароль";
    if (status === 400 && msg.includes("csrf")) return "Нет CSRF токена";
    if (status === 403) return "Доступ запрещен";
    return "Ошибка входа";
  };

  const emitEntryError = (text) => {
    try {
      document.dispatchEvent(new CustomEvent('main-notify', { detail: { type: 'error', text } }));
    } catch(err) {
      console.error("Ошибка при отправке уведомления:", err);
    }
  };

  const handleLogin = async () => {
    // Валидация полей формы
    if (!email.trim()) {
      emitEntryError('Введите адрес электронной почты');
      return;
    }
    
    // Проверка формата email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      emitEntryError('Введите корректный адрес электронной почты');
      return;
    }
    
    if (!password.trim()) {
      emitEntryError('Введите пароль');
      return;
    }

    // Проверка чекбокса "тест на человечность"
    const humanTestCheckbox = document.getElementById('user-login-humanyly-test');
    if (!humanTestCheckbox.checked) {
      emitEntryError('Необходимо пройти тест на человечность');
      return;
    }

    // Проверка чекбокса согласия на обработку данных
    const disclameCheckbox = document.getElementById('form-disclame-checkbox');
    if (!disclameCheckbox.checked) {
      emitEntryError('Необходимо согласиться на обработку персональных данных');
      return;
    }

    if (showCaptcha && !captchaVerified && !captchaCompleted) {
      emitEntryError('Пройдите капчу');
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      // Отправляем SUCCESS уведомление напрямую через событие
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'success', text: 'Вход выполнен' } 
      }));
      navigate("/personal-room");
    } catch (err) {
      console.error("Ошибка входа:", err);
      emitEntryError(mapLoginError(err));
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div className="form-login-container formm-shadow flex flex-column bru-max bg-color-main txt-size-07">
        <div className="form-login-logo">
          <div className="form-login-logo-img img"></div>
        </div>

        <div className="form-email-inputs flex flex-column">
          <label className="txt-white" htmlFor="user-login-email">
            Адрес эл. почты
          </label>
          <input
            className="txt-black bru-min"
            type="email"
            placeholder="Введите ваш адрес электропочты"
            id="user-login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-password-inputs flex flex-column">
          <label className="txt-white" htmlFor="user-login-password">
            Пароль
          </label>
          <input
            className="txt-black bru-min"
            type="password"
            placeholder="Введите ваш пароль"
            id="user-login-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div className="form-password-inputs-humanyly flex flex-row bru-min">
          <label className="txt-black" htmlFor="user-login-humanyly-test">
            Пройдите тест на человечность
          </label>
          <input
            type="checkbox"
            id="user-login-humanyly-test"
            checked={captchaCompleted}
            onChange={handleCaptchaToggle}
            disabled={loading}
          />
        </div>

        {showCaptcha && !captchaCompleted && (
          <Captcha
            onVerified={handleCaptchaVerified}
            isVerified={captchaVerified}
          />
        )}

        <div className="form-disclame flex flex-row">
          <label className="txt-gray" htmlFor="form-disclame-checkbox">
            Я подтверждаю ознакомление и дою согласие на обработку моих
            персональных данных в порядке и на условиях, указанных в
            <a href="#" target="_blank" rel="noopener noreferrer">
              Политике обработки персональных данных
            </a>
          </label>
          <input
            className="bg-color-main"
            type="checkbox"
            id="form-disclame-checkbox"
            required
            disabled={loading}
          />
        </div>

        <div className="form-login-buttons flex">
          <div
            className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
            onClick={handleLogin}
            style={{
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Вход..." : "войти"}
          </div>
        </div>

        <div className="form-login-redirect-registration flex flex-row txt-white">
          <span className="form-login-redirect-registration-text">
            Нет аккаунта?
            <a
              onClick={handleRegistration}
              className="form-login-redirect-registration-link"
            >
              Зарегистрируйтесь
            </a>
          </span>
        </div>

        <input
          type="hidden"
          name="captchaVerified"
          id="captchaVerified"
          value={captchaCompleted ? "1" : "0"}
        />
      </div>
    </>
  );
}

export default Login;
