import "../entryes.css"; // Импорт CSS стилей для формы входа
import { useNavigate } from "react-router-dom"; // Импорт хука для программной навигации
import { useAuthStore } from "../../../JS/auth/store/store"; // Импорт Zustand store для управления аутентификацией
import { useState, useEffect, useRef, useMemo } from "react"; // Импорт React хуков для состояния и побочных эффектов
import Captcha from "../captcha.jsx"; // Импорт компонента капчи для защиты от ботов
import { collectBasicFingerprint, collectFullFingerprint, parseUserAgent } from "../../../utils/fingerprint-collector.js"; // Импорт утилит для сбора отпечатка
import FingerprintPermissionsModal from "../fingerprint-permissions-modal.jsx"; // Импорт модального окна для разрешений
import * as webauthnService from "../../../JS/services/webauthn-service.js"; // Импорт сервиса для работы с WebAuthn
import fingerprintIcon from "../../../IMG/fingerprint.png"; // Импорт иконки отпечатка
import telegramIcon from "../../../IMG/telegram.png"; // Импорт иконки Telegram
import axios from "axios";
import { API_CONFIG } from "../../../config/api.js";

function Login() { // Компонент формы входа пользователя
  const navigate = useNavigate(); // Хук для программной навигации между страницами
  const [email, setEmail] = useState(""); // Состояние для хранения email пользователя
  const [password, setPassword] = useState(""); // Состояние для хранения пароля пользователя
  const [loading, setLoading] = useState(false); // Состояние загрузки при отправке формы
  const [showCaptcha, setShowCaptcha] = useState(false); // Состояние показа капчи
  const [captchaVerified, setCaptchaVerified] = useState(false); // Состояние проверки капчи
  const [captchaCompleted, setCaptchaCompleted] = useState(false); // Состояние завершения капчи
  const [showFingerprintModal, setShowFingerprintModal] = useState(false); // Состояние показа модального окна разрешений
  const [, setFingerprintPermissions] = useState(null); // Состояние разрешений для отпечатка (используется в onPermissionsGranted)
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false); // Поддержка WebAuthn
  const [isPlatformAuthenticatorAvailable, setIsPlatformAuthenticatorAvailable] = useState(false); // Доступность биометрии
  const [hasBiometricCredentials, setHasBiometricCredentials] = useState(false); // Наличие зарегистрированных биометрических ключей
  const [checkingBiometric, setCheckingBiometric] = useState(false); // Флаг проверки наличия биометрических ключей
  const [biometricLoginLoading, setBiometricLoginLoading] = useState(false); // Флаг входа через биометрию
  const [canUseBiometric, setCanUseBiometric] = useState(false); // Можно ли использовать биометрию для этого устройства
  const [hasTelegram, setHasTelegram] = useState(false); // Наличие Telegram аккаунта
  const [checkingTelegram, setCheckingTelegram] = useState(false); // Флаг проверки Telegram
  const [requestingToken, setRequestingToken] = useState(false); // Флаг запроса токена
  const [tokenSent, setTokenSent] = useState(false); // Флаг отправки токена
  const [token, setToken] = useState(""); // Токен для входа
  const [tokenLoginLoading, setTokenLoginLoading] = useState(false); // Флаг входа по токену
  const [emailLinkRequesting, setEmailLinkRequesting] = useState(false); // Флаг запроса email-ссылки
  const [emailLinkSent, setEmailLinkSent] = useState(false); // Флаг отправки email-ссылки
  const [preferredAuthMethod, setPreferredAuthMethod] = useState(null); // Предпочтительный способ аутентификации
  const [showMoreAuthMethods, setShowMoreAuthMethods] = useState(false); // Показать дополнительные способы входа
  const [selectedAuthMethod, setSelectedAuthMethod] = useState(null); // Выбранный способ входа (если отличается от предпочтительного)
  // КРИТИЧНО: Используем useRef для сохранения явного выбора 'password', чтобы он не терялся при изменении email
  const userExplicitlyChosePasswordRef = useRef(false);

  // Получаем методы стора для аутентификации
  const login = useAuthStore((s) => s.login); // Получаем функцию входа из store
  const checkAuth = useAuthStore((s) => s.checkAuth); // Получаем функцию проверки аутентификации из store

  // Функция для генерации deviceId (аналогично бэкенду)
  const generateDeviceId = async (userAgent, ipAddress, screenResolution) => {
    // Используем crypto API для создания хеша
    const data = `${userAgent}|${ipAddress || ''}|${screenResolution || ''}`;
    try {
      // Простая реализация SHA-256 через Web Crypto API
      const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
      const hashArray = Array.from(new Uint8Array(buffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      console.log(error);
      // Fallback: простой хеш если crypto API недоступен
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }
  };

  // Проверка авторизации при монтировании компонента
  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        // Если есть токен, проверяем его на сервере
        console.log('Login: Найден токен, проверяем аутентификацию через API...');
        const isAuthenticated = await checkAuth();
        if (isAuthenticated) {
          // Если пользователь авторизован, перенаправляем его
          console.log('Login: Пользователь уже авторизован, перенаправляем...');
          navigate('/personal-room');
        }
      }
    };
    
    verifyAuth();
  }, [checkAuth, navigate]);

  // Проверка поддержки WebAuthn и биометрии
  useEffect(() => {
    const checkWebAuthnSupport = async () => {
      const supported = webauthnService.isWebAuthnSupported();
      setIsWebAuthnSupported(supported);
      
      if (supported) {
        const available = await webauthnService.isPlatformAuthenticatorAvailable();
        setIsPlatformAuthenticatorAvailable(available);
      }
    };
    
    checkWebAuthnSupport();
  }, []);

  // Проверка наличия биометрических ключей и Telegram аккаунта при изменении email
  useEffect(() => {
    const checkCredentials = async () => {
      // КРИТИЧНО: Проверяем явный выбор password в самом начале, до любых операций
      // Это предотвращает установку preferredAuthMethod, если пользователь явно выбрал password
      const userExplicitlyChosePassword = userExplicitlyChosePasswordRef.current || selectedAuthMethod === 'password';
      
      if (!email.trim()) {
        setHasBiometricCredentials(false);
        setCanUseBiometric(false);
        setHasTelegram(false);
        // КРИТИЧНО: НЕ сбрасываем preferredAuthMethod, если пользователь явно выбрал password
        if (!userExplicitlyChosePassword) {
          setPreferredAuthMethod(null);
        }
        // КРИТИЧНО: НЕ сбрасываем selectedAuthMethod, если пользователь явно выбрал password
        if (!userExplicitlyChosePassword) {
          setSelectedAuthMethod(null);
        }
        // КРИТИЧНО: Сбрасываем флаг явного выбора password только если email пустой
        userExplicitlyChosePasswordRef.current = false;
        setShowMoreAuthMethods(false);
        setTokenSent(false);
        setToken("");
        setEmailLinkSent(false);
        return;
      }

      // Проверяем формат email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setHasBiometricCredentials(false);
        setCanUseBiometric(false);
        setHasTelegram(false);
        // КРИТИЧНО: НЕ сбрасываем preferredAuthMethod, если пользователь явно выбрал password
        if (!userExplicitlyChosePassword) {
          setPreferredAuthMethod(null);
        }
        // КРИТИЧНО: НЕ сбрасываем selectedAuthMethod если email невалидный, 
        // чтобы пользователь мог продолжить ввод email без потери выбранного способа
        // setSelectedAuthMethod(null);
        setShowMoreAuthMethods(false);
        setEmailLinkSent(false);
        return;
      }
      
      // КРИТИЧНО: Если пользователь явно выбрал password, НЕ выполняем проверку и НЕ устанавливаем preferredAuthMethod
      if (userExplicitlyChosePassword) {
        // Убеждаемся, что selectedAuthMethod установлен в 'password'
        if (selectedAuthMethod !== 'password') {
          setSelectedAuthMethod('password');
        }
        // Принудительно сбрасываем preferredAuthMethod
        setPreferredAuthMethod(null);
        // НЕ выполняем проверку биометрии и Telegram, чтобы не перезаписать выбор пользователя
        setCheckingBiometric(false);
        setCheckingTelegram(false);
        return;
      }

      try {
        setCheckingBiometric(true);
        setCheckingTelegram(true);
        
        // Проверяем биометрию (если поддерживается)
        if (isWebAuthnSupported && isPlatformAuthenticatorAvailable) {
          // Собираем базовый отпечаток для генерации deviceId
          const basicFingerprint = collectBasicFingerprint();
          const deviceId = await generateDeviceId(
            basicFingerprint.user_agent,
            '', // IP будет определен на сервере
            basicFingerprint.screen_resolution
          );

          // Проверяем наличие биометрических ключей и устройства через специальный эндпоинт
          const baseUrl = API_CONFIG.BASE_URL || '';
          const checkUrl = `${baseUrl}/auth/webauthn/check-credentials?email=${encodeURIComponent(email.trim())}&deviceId=${encodeURIComponent(deviceId)}&userAgent=${encodeURIComponent(basicFingerprint.user_agent)}`;
          
          const checkResponse = await fetch(checkUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include'
          });

          if (checkResponse.ok) {
            const data = await checkResponse.json();
            setHasBiometricCredentials(data.success && data.hasCredentials === true);
            setCanUseBiometric(data.success && data.canUseBiometric === true);
          } else {
            setHasBiometricCredentials(false);
            setCanUseBiometric(false);
          }
        } else {
          setHasBiometricCredentials(false);
          setCanUseBiometric(false);
        }

        // Проверяем наличие Telegram аккаунта
        const baseUrlForTelegram = API_CONFIG.BASE_URL || '';
        const telegramCheckUrl = `${baseUrlForTelegram}/auth/user-token/check-telegram?email=${encodeURIComponent(email.trim())}`;
        
        const telegramResponse = await fetch(telegramCheckUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (telegramResponse.ok) {
          const telegramData = await telegramResponse.json();
          setHasTelegram(telegramData.success && telegramData.hasTelegram === true);
          // Получаем предпочтительный способ аутентификации
          // КРИТИЧНО: Если пользователь явно выбрал 'password', НЕ меняем preferredAuthMethod
          // и НЕ сбрасываем selectedAuthMethod - это позволяет пользователю выбрать 'password' 
          // из "Больше способов входа" даже если есть предпочтительный способ
          if (userExplicitlyChosePassword) {
            // Пользователь явно выбрал password - сохраняем его выбор
            // КРИТИЧНО: НЕ меняем preferredAuthMethod и НЕ сбрасываем selectedAuthMethod
            // Также убеждаемся, что selectedAuthMethod установлен в 'password'
            if (selectedAuthMethod !== 'password') {
              setSelectedAuthMethod('password');
            }
            // КРИТИЧНО: Принудительно сбрасываем preferredAuthMethod, чтобы не показывать предпочтительный способ
            setPreferredAuthMethod(null);
          } else {
            // Пользователь не выбрал password явно - обновляем preferredAuthMethod как обычно
            if (telegramData.authway) {
              setPreferredAuthMethod(telegramData.authway);
            } else {
              setPreferredAuthMethod(null);
            }
          }
        } else {
          setHasTelegram(false);
          // Если нет данных - форма остается в исходном состоянии
          // Но если пользователь выбрал 'password', не сбрасываем preferredAuthMethod
          if (!userExplicitlyChosePassword) {
            setPreferredAuthMethod(null);
          }
        }
      } catch (error) {
        console.warn('Ошибка проверки учетных данных:', error);
        setHasBiometricCredentials(false);
        setCanUseBiometric(false);
        setHasTelegram(false);
        // КРИТИЧНО: При ошибке не сбрасываем preferredAuthMethod, если пользователь явно выбрал 'password'
        if (!userExplicitlyChosePassword) {
          setPreferredAuthMethod(null);
        }
      } finally {
        setCheckingBiometric(false);
        setCheckingTelegram(false);
      }
    };

    // Дебаунс для проверки
    const timeoutId = setTimeout(() => {
      checkCredentials();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [email, isWebAuthnSupported, isPlatformAuthenticatorAvailable, selectedAuthMethod]);

  // КРИТИЧНО: useEffect для принудительного сохранения выбора 'password'
  // Если пользователь явно выбрал 'password', но selectedAuthMethod не равен 'password',
  // принудительно устанавливаем его в 'password'
  useEffect(() => {
    if (userExplicitlyChosePasswordRef.current && selectedAuthMethod !== 'password') {
      console.log('🔧 Принудительно устанавливаем selectedAuthMethod = password, так как ref установлен');
      setSelectedAuthMethod('password');
    }
  }, [selectedAuthMethod]);

  // Запрос email-ссылки для входа
  const handleRequestEmailLink = async () => {
    if (!email.trim()) {
      emitEntryError('Введите адрес электронной почты');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      emitEntryError('Введите корректный адрес электронной почты');
      return;
    }

    try {
      setEmailLinkRequesting(true);
      const baseUrl = API_CONFIG.BASE_URL || '';
      const requestUrl = `${baseUrl}/auth/email-link/request`;
      
      // КРИТИЧНО: Получаем московское время на фронтенде
      // Формируем строку в формате, который PostgreSQL поймет как московское время
      const getMoscowTime = () => {
        const now = new Date();
        // Получаем компоненты московского времени
        const formatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Europe/Moscow',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3,
          hour12: false
        });
        
        const parts = formatter.formatToParts(now);
        const year = parts.find(p => p.type === 'year').value;
        const month = parts.find(p => p.type === 'month').value;
        const day = parts.find(p => p.type === 'day').value;
        const hour = parts.find(p => p.type === 'hour').value;
        const minute = parts.find(p => p.type === 'minute').value;
        const second = parts.find(p => p.type === 'second').value;
        const fractionalSecond = parts.find(p => p.type === 'fractionalSecond')?.value || '000';
        
        // Формируем строку БЕЗ 'Z' - PostgreSQL интерпретирует это как локальное время
        // Формат: YYYY-MM-DDTHH:mm:ss.sss (без Z, чтобы PostgreSQL интерпретировал как московское)
        const moscowTimeStr = `${year}-${month}-${day}T${hour}:${minute}:${second}.${fractionalSecond}`;
        
        console.log('Frontend: Московское время:', {
          nowUTC: now.toISOString(),
          moscowTimeStr: moscowTimeStr,
          moscowTimeParts: { year, month, day, hour, minute, second, fractionalSecond }
        });
        
        return moscowTimeStr;
      };
      
      const moscowTime = getMoscowTime();
      
      const response = await axios.post(requestUrl, { 
        email: email.trim(),
        moscowTime: moscowTime
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });

      if (response.data.success) {
        setEmailLinkSent(true);
        document.dispatchEvent(new CustomEvent('main-notify', { 
          detail: { type: 'success', text: 'Ссылка для входа отправлена на вашу почту. Проверьте почту и перейдите по ссылке.' } 
        }));
      } else {
        emitEntryError(response.data.message || 'Ошибка запроса ссылки');
      }
    } catch (error) {
      console.error('Ошибка запроса email-ссылки:', error);
      emitEntryError(error.response?.data?.message || 'Ошибка запроса ссылки для входа');
    } finally {
      setEmailLinkRequesting(false);
    }
  };

  // Запрос токена через Telegram
  const handleRequestToken = async () => {
    if (!email.trim()) {
      emitEntryError('Введите адрес электронной почты');
      return;
    }

    try {
      setRequestingToken(true);
      const baseUrl = API_CONFIG.BASE_URL || '';
      const requestUrl = `${baseUrl}/auth/user-token/generate`;
      
      const response = await axios.post(requestUrl, { email: email.trim() }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });

      if (response.data.success) {
        setTokenSent(true);
        document.dispatchEvent(new CustomEvent('main-notify', { 
          detail: { type: 'success', text: 'Токен отправлен в Telegram. Проверьте ваш Telegram аккаунт.' } 
        }));
      } else {
        emitEntryError(response.data.message || 'Ошибка запроса токена');
        if (response.data.needsTelegramRegistration) {
          document.dispatchEvent(new CustomEvent('main-notify', { 
            detail: { type: 'attention', text: 'Подключите Telegram аккаунт в настройках профиля' } 
          }));
        }
      }
    } catch (error) {
      console.error('Ошибка запроса токена:', error);
      emitEntryError(error.response?.data?.message || 'Ошибка запроса токена');
    } finally {
      setRequestingToken(false);
    }
  };

  // Вход по токену
  const handleTokenLogin = async () => {
    if (!token.trim()) {
      emitEntryError('Введите токен');
      return;
    }

    try {
      setTokenLoginLoading(true);
      const baseUrl = API_CONFIG.BASE_URL || '';
      const loginUrl = `${baseUrl}/auth/user-token/login`;
      
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
        // handleAuthResponse ожидает структуру с data: { token/accessToken, refreshToken, user }
        const { handleAuthResponse } = useAuthStore.getState();
        // Используем response.data.data если есть, иначе формируем структуру из response.data
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
        
        // Проверяем fingerprint_permissions после успешной авторизации
        const shouldShowModal = checkFingerprintPermissionsAfterAuth();
        if (!shouldShowModal) {
          navigate('/personal-room');
        }
      } else {
        emitEntryError(response.data.message || 'Ошибка входа по токену');
      }
    } catch (error) {
      console.error('Ошибка входа по токену:', error);
      emitEntryError(error.response?.data?.message || 'Недействительный или истекший токен');
    } finally {
      setTokenLoginLoading(false);
    }
  };

  // Вход через биометрию
  const handleBiometricLogin = async () => {
    if (!email.trim()) {
      emitEntryError('Введите адрес электронной почты');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      emitEntryError('Введите корректный адрес электронной почты');
      return;
    }

    if (!hasBiometricCredentials) {
      emitEntryError('У вас нет зарегистрированных биометрических ключей. Сначала войдите с паролем и настройте биометрию в профиле.');
      return;
    }

    setBiometricLoginLoading(true);

    try {
      // Собираем базовый отпечаток для deviceInfo
      const basicFingerprint = collectBasicFingerprint();
      const browserInfo = parseUserAgent(basicFingerprint.user_agent);

      const deviceInfo = {
        userAgent: basicFingerprint.user_agent,
        ipAddress: '',
        screenResolution: basicFingerprint.screen_resolution,
        deviceName: `${browserInfo.browser} на ${browserInfo.os}`,
        browser: browserInfo.browser,
        os: browserInfo.os,
        platform: basicFingerprint.platform || '',
        timezone: basicFingerprint.timezone || '',
        language: basicFingerprint.language || '',
        location: '',
        fingerprintData: basicFingerprint
      };

      // Выполняем вход через биометрию
      const result = await webauthnService.authenticateWithBiometric(email.trim(), deviceInfo);

      if (result.success && result.token) {
        // Используем handleAuthResponse из store для правильной обработки ответа
        // Это установит токен, обновит состояние и загрузит данные пользователя
        const handleAuthResponse = useAuthStore.getState().handleAuthResponse;
        const checkAuth = useAuthStore.getState().checkAuth;
        const fetchUserProfile = useAuthStore.getState().fetchUserProfile;
        
        // Формируем ответ в формате, который ожидает handleAuthResponse
        const authResponse = {
          data: {
            token: result.token,
            user: result.user
          }
        };
        
        // Обрабатываем ответ (устанавливает токен, isAuth, user)
        handleAuthResponse(authResponse);
        
        // Проверяем аутентификацию и загружаем профиль
        await checkAuth();
        await fetchUserProfile();

        document.dispatchEvent(new CustomEvent('main-notify', { 
          detail: { type: 'success', text: 'Вход выполнен через биометрию' } 
        }));
        
        // Проверяем fingerprint_permissions после успешной авторизации
        const shouldShowModal = checkFingerprintPermissionsAfterAuth();
        if (!shouldShowModal) {
          navigate("/personal-room");
        }
      }
    } catch (error) {
      console.error('Ошибка входа через биометрию:', error);
      
      if (error.message?.includes('не найден')) {
        emitEntryError('Биометрический ключ не найден. Войдите с паролем и настройте биометрию в профиле.');
      } else if (error.message?.includes('отменена')) {
        // Пользователь отменил - не показываем ошибку
      } else {
        emitEntryError(error.message || 'Ошибка входа через биометрию');
      }
    } finally {
      setBiometricLoginLoading(false);
    }
  };

  // Исправление автозаполнения браузером (Chrome/Edge): синхронизация DOM -> state
  useEffect(() => {
    const emailEl = document.getElementById('user-login-email');
    const passEl = document.getElementById('user-login-password');

    // 1) Считать значения, если автозаполнение произошло до монтирования обработчиков
    if (emailEl && emailEl.value && !email) setEmail(emailEl.value);
    if (passEl && passEl.value && !password) setPassword(passEl.value);

    // 2) Триггерим input для -webkit-autofill, чтобы onChange сработал
    const trigger = (el) => {
      try {
        if (!el) return;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } catch(e) {
        console.error("Ошибка при триггере input:", e);
      }
    };
    const timer = setTimeout(() => {
      trigger(emailEl);
      trigger(passEl);
    }, 80);

    // Доп. попытка через rAF (некоторые браузеры применяют автозаполнение после layout)
    let raf1 = requestAnimationFrame(() => {
      sync();
      let raf2 = requestAnimationFrame(() => {
        sync();
        cancelAnimationFrame(raf2);
      });
      cancelAnimationFrame(raf1);
    });

    // 3) Слушаем изменения от автозаполнения
    const sync = () => {
      if (emailEl) setEmail(emailEl.value);
      if (passEl) setPassword(passEl.value);
    };
    emailEl?.addEventListener('change', sync);
    passEl?.addEventListener('change', sync);
    emailEl?.addEventListener('input', sync);
    passEl?.addEventListener('input', sync);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf1);
      emailEl?.removeEventListener('change', sync);
      passEl?.removeEventListener('change', sync);
      emailEl?.removeEventListener('input', sync);
      passEl?.removeEventListener('input', sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // один раз при монтировании - email и password не нужны в зависимостях, так как sync использует их через замыкание из DOM элементов

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
    const code = err?.response?.data?.code;
    
    // Обработка ошибки нового устройства - НЕ должна обрабатываться здесь,
    // так как она обрабатывается в performLogin отдельно
    // Но на всякий случай проверяем, чтобы не показать "Ошибка входа"
    if (code === 'DEVICE_APPROVAL_REQUIRED' || msg.includes("подтверждение нового устройства")) {
      return "Попытка входа с нового устройства. Проверьте вашу почту";
    }
    
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
      // Собираем базовый отпечаток (без разрешений)
      const basicFingerprint = collectBasicFingerprint();
      const browserInfo = parseUserAgent(basicFingerprint.user_agent);
      
      // Проверяем, были ли уже запрошены разрешения
      let permissions = null;
      try {
        const storedPermissions = localStorage.getItem('fingerprint_permissions');
        if (storedPermissions) {
          permissions = JSON.parse(storedPermissions);
        }
      } catch (e) {
        console.warn('Ошибка чтения разрешений из localStorage:', e);
      }
      
      // Если разрешения не были запрошены - показываем модальное окно
      if (!permissions) {
        setLoading(false);
        setShowFingerprintModal(true);
        return; // Прерываем выполнение, ждем разрешений
      }
      
      // Формируем deviceInfo для отправки на сервер
      const deviceInfo = {
        userAgent: basicFingerprint.user_agent,
        ipAddress: '', // IP будет определен на сервере
        screenResolution: basicFingerprint.screen_resolution,
        deviceName: `${browserInfo.browser} на ${browserInfo.os}`,
        browser: browserInfo.browser,
        os: browserInfo.os,
        platform: basicFingerprint.platform || '',
        timezone: basicFingerprint.timezone || '',
        language: basicFingerprint.language || '',
        location: '', // Будет определено на сервере
        fingerprintData: basicFingerprint // Базовый отпечаток
      };
      
      // Пытаемся собрать расширенный отпечаток (если разрешения были даны)
      try {
        if (Object.values(permissions).some(p => p === true)) {
          const fullFingerprint = await collectFullFingerprint(permissions);
          deviceInfo.fingerprintData = fullFingerprint;
        }
      } catch (fingerprintError) {
        console.warn('Ошибка сбора расширенного отпечатка:', fingerprintError);
        // Продолжаем с базовым отпечатком
      }
      
      await performLogin(email, password, deviceInfo);
    } catch (err) {
      console.error("Ошибка входа в handleLogin:", err);
      console.error("Код ошибки:", err?.response?.data?.code);
      console.error("Статус ошибки:", err?.response?.status);
      console.error("Сообщение ошибки:", err?.response?.data?.message);
      
      // Обработка ошибки DEVICE_APPROVAL_REQUIRED уже выполнена в performLogin
      // Здесь обрабатываем только другие ошибки
      // Проверяем как по коду, так и по сообщению
      const isDeviceApprovalError = err?.response?.data?.code === 'DEVICE_APPROVAL_REQUIRED' ||
        (err?.response?.data?.message && 
         (err.response.data.message.toLowerCase().includes("подтверждение нового устройства") ||
          err.response.data.message.toLowerCase().includes("требуется подтверждение")));
      
      if (!isDeviceApprovalError) {
        console.log("Обрабатываем другую ошибку в handleLogin");
        emitEntryError(mapLoginError(err));
      } else {
        console.log("Пропускаем обработку DEVICE_APPROVAL_REQUIRED в handleLogin, так как она уже обработана в performLogin");
      }
    } finally {
      setLoading(false);
    }
  };

  // Функция для проверки fingerprint_permissions после успешной авторизации
  const checkFingerprintPermissionsAfterAuth = () => {
    try {
      const storedPermissions = localStorage.getItem('fingerprint_permissions');
      if (!storedPermissions) {
        // Если разрешения не были запрошены - показываем модальное окно
        setShowFingerprintModal(true);
        return true; // Возвращаем true, если нужно показать модальное окно
      }
      return false; // Разрешения уже есть
    } catch (e) {
      console.warn('Ошибка чтения разрешений из localStorage:', e);
      return false;
    }
  };

  // Функция для выполнения входа (вынесена отдельно для переиспользования)
  const performLogin = async (email, password, deviceInfo) => {
    setLoading(true);
    try {
      await login(email, password, null, deviceInfo);
      // Отправляем SUCCESS уведомление напрямую через событие
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'success', text: 'Вход выполнен' } 
      }));
      
      // Проверяем fingerprint_permissions после успешной авторизации
      const shouldShowModal = checkFingerprintPermissionsAfterAuth();
      if (!shouldShowModal) {
        navigate("/personal-room");
      }
    } catch (err) {
      console.error("=== ОШИБКА ВХОДА В performLogin ===");
      console.error("Полный объект ошибки:", err);
      console.error("err.response:", err?.response);
      console.error("err.response.data:", err?.response?.data);
      console.error("Код ошибки:", err?.response?.data?.code);
      console.error("Статус ошибки:", err?.response?.status);
      console.error("Сообщение ошибки:", err?.response?.data?.message);
      console.error("===================================");
      
      // Обработка ошибки DEVICE_APPROVAL_REQUIRED
      // Проверяем как по коду, так и по сообщению, так как ошибка 500 может не иметь кода
      const isDeviceApprovalError = err?.response?.data?.code === 'DEVICE_APPROVAL_REQUIRED' ||
        (err?.response?.data?.message && 
         (err.response.data.message.toLowerCase().includes("подтверждение нового устройства") ||
          err.response.data.message.toLowerCase().includes("требуется подтверждение")));
      
      console.log("isDeviceApprovalError:", isDeviceApprovalError);
      
      if (isDeviceApprovalError) {
        console.log("✅ Обрабатываем DEVICE_APPROVAL_REQUIRED в performLogin");
        // Отправляем только ERROR-уведомление на новом устройстве
        // INFO-уведомление владельцу аккаунта отправляется через WebSocket на бэкенде
        document.dispatchEvent(new CustomEvent('main-notify', { 
          detail: { type: 'error', text: 'Попытка входа с нового устройства. Проверьте вашу почту' } 
        }));
        // НЕ пробрасываем ошибку дальше, чтобы она не обрабатывалась повторно
        return;
      } else {
        console.log("❌ Обрабатываем другую ошибку в performLogin");
        const errorText = mapLoginError(err);
        console.log("Текст ошибки из mapLoginError:", errorText);
        emitEntryError(errorText);
        throw err; // Пробрасываем ошибку дальше только для других ошибок
      }
    } finally {
      setLoading(false);
    }
  };

  // Обработчик подтверждения разрешений (после успешной авторизации)
  const handlePermissionsGranted = async (grantedPermissions) => {
    setShowFingerprintModal(false);
    setFingerprintPermissions(grantedPermissions);
    
    // Сохраняем разрешения в localStorage
    try {
      localStorage.setItem('fingerprint_permissions', JSON.stringify(grantedPermissions));
    } catch (e) {
      console.warn('Ошибка сохранения разрешений в localStorage:', e);
    }
    
    // Авторизация уже выполнена, просто переходим в личный кабинет
    navigate('/personal-room');
  };

  // Обработчик отказа от разрешений (после успешной авторизации)
  const handlePermissionsDenied = () => {
    setShowFingerprintModal(false);
    // Авторизация уже выполнена, просто переходим в личный кабинет
    navigate('/personal-room');
  };

  // КРИТИЧНО: Мемоизируем список доступных способов, чтобы избежать лишних перерендеров
  const availableMethods = useMemo(() => {
    const methods = ['password', 'email_link']; // Всегда доступны
    // Биометрия доступна, если есть биометрические ключи (canUseBiometric проверяется при попытке входа)
    if (hasBiometricCredentials) {
      methods.push('biometric');
    }
    if (hasTelegram) {
      methods.push('telegram_token');
    }
    return methods;
  }, [hasBiometricCredentials, hasTelegram]);
  
  // Функция для выбора способа входа
  const handleSelectAuthMethod = (method) => {
    if (method === 'password') {
      // При выборе пароля показываем стандартную форму
      setSelectedAuthMethod('password');
      // КРИТИЧНО: Сохраняем явный выбор password в ref, чтобы он не терялся при изменении email
      userExplicitlyChosePasswordRef.current = true;
      // КРИТИЧНО: Сбрасываем preferredAuthMethod, чтобы не показывать предпочтительный способ
      setPreferredAuthMethod(null);
      setShowMoreAuthMethods(false);
    } else {
      setSelectedAuthMethod(method);
      // Если выбран другой способ, сбрасываем флаг явного выбора password
      userExplicitlyChosePasswordRef.current = false;
      setShowMoreAuthMethods(false);
    }
  };
  
  // Обработчик переключения "Больше способов входа"
  const handleToggleMoreMethods = () => {
    const newValue = !showMoreAuthMethods;
    setShowMoreAuthMethods(newValue);
    // КРИТИЧНО: При открытии меню НЕ сбрасываем выбранный способ, если пользователь явно выбрал 'password'
    // Это позволяет пользователю открыть меню и выбрать другой способ, не теряя выбор password
    if (newValue && !userExplicitlyChosePasswordRef.current) {
      setSelectedAuthMethod(null);
    }
  };

  // Упрощенная форма для биометрии (старая логика - оставляем для обратной совместимости)
  if (canUseBiometric && !checkingBiometric && !preferredAuthMethod && !selectedAuthMethod) {
    return (
      <>
        <form className="form-login-container formm-shadow flex flex-column bru-max bg-color-main txt-size-07" autoComplete="on">
          <div className="form-login-logo">
            <div className="form-login-logo-img img"></div>
          </div>

          <div className="form-email-inputs flex flex-column" style={{ width: '80%' }}>
            <label className="txt-white" htmlFor="user-login-email">
              Адрес эл. почты
            </label>
            <input
              className="txt-black bru-min"
              type="email"
              placeholder="Введите ваш адрес электропочты"
              id="user-login-email"
              name="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={biometricLoginLoading}
            />
          </div>

          <div className="form-login-buttons flex flex-column" style={{ gap: '1vw', marginTop: '2vw', width: '80%' }}>
            <button
              className="button-biometric txt-white gradient-effect-bg gradient-effect-border bg-color-main bru-min"
              type="button"
              onClick={handleBiometricLogin}
              disabled={biometricLoginLoading || !email.trim()}
              style={{
                cursor: (biometricLoginLoading || !email.trim()) ? "not-allowed" : "pointer",
                opacity: (biometricLoginLoading || !email.trim()) ? 0.5 : 1,
                minHeight: '80px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1vw',
                padding: '1.5vw 2vw',
                fontSize: '1.4em',
                fontWeight: 'bold',
                width: '100%'
              }}
            >
              <img 
                src={fingerprintIcon}
                alt="Биометрия" 
                style={{ 
                  width: '60px', 
                  height: '60px',
                  objectFit: 'contain'
                }} 
              />
              <span style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center',
                lineHeight: '1.4',
                textAlign: 'center'
              }}>
                <span>ПРЕДЪЯВИТЬ</span>
                <span>БИОМЕТРИЧЕСКИЙ КЛЮЧ</span>
              </span>
            </button>

            {/* Кнопка запроса токена через Telegram */}
            {hasTelegram && !checkingTelegram && (
              <>
                <button
                  className="button-biometric txt-white gradient-effect-bg gradient-effect-border bg-color-main bru-min"
                  type="button"
                  onClick={handleRequestToken}
                  disabled={requestingToken || !email.trim() || tokenSent}
                  style={{
                    cursor: (requestingToken || !email.trim() || tokenSent) ? "not-allowed" : "pointer",
                    opacity: (requestingToken || !email.trim() || tokenSent) ? 0.5 : 1,
                    minHeight: '60px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.8vw',
                    padding: '1vw 2vw',
                    fontSize: '1.2em',
                    fontWeight: 'bold',
                    width: '100%',
                    background: tokenSent ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' : undefined
                  }}
                >
                  <img 
                    src={telegramIcon}
                    alt="Telegram" 
                    style={{ 
                      width: '30px', 
                      height: '30px',
                      objectFit: 'contain'
                    }} 
                  />
                  <span>
                    {tokenSent ? 'ТОКЕН ОТПРАВЛЕН' : 'ЗАПРОСИТЬ ТОКЕН'}
                  </span>
                </button>

                {/* Инпут для ввода токена */}
                {tokenSent && (
                  <>
                    <div className="form-email-inputs flex flex-column" style={{ marginTop: '1vw' }}>
                      <label className="txt-white" htmlFor="user-login-token">
                        Введите токен из Telegram
                      </label>
                      <input
                        className="txt-black bru-min"
                        type="text"
                        placeholder="Вставьте токен из Telegram"
                        id="user-login-token"
                        name="token"
                        autoComplete="off"
                        spellCheck={false}
                        autoCapitalize="none"
                        autoCorrect="off"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        disabled={tokenLoginLoading}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '1.1em',
                          letterSpacing: '0.1em'
                        }}
                      />
                    </div>
                    <div className="form-login-buttons flex flex-column" style={{ gap: '1vw', marginTop: '1vw' }}>
                      <button
                        className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
                        type="button"
                        onClick={handleTokenLogin}
                        disabled={tokenLoginLoading || !token.trim()}
                        style={{
                          cursor: (tokenLoginLoading || !token.trim()) ? "not-allowed" : "pointer",
                          opacity: (tokenLoginLoading || !token.trim()) ? 0.7 : 1,
                        }}
                      >
                        {tokenLoginLoading ? "Вход..." : "войти"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </form>
      </>
    );
  }

  // Функция для рендеринга способа входа
  const renderAuthMethod = (method) => {
    switch (method) {
      case 'biometric':
        // Показываем биометрию, если есть биометрические ключи (canUseBiometric проверяется при попытке входа)
        if (!hasBiometricCredentials) return null;
        return (
          <button
            className="button-biometric txt-white gradient-effect-bg gradient-effect-border bg-color-main bru-min"
            type="button"
            onClick={handleBiometricLogin}
            disabled={biometricLoginLoading || !email.trim()}
            style={{
              cursor: (biometricLoginLoading || !email.trim()) ? "not-allowed" : "pointer",
              opacity: (biometricLoginLoading || !email.trim()) ? 0.5 : 1,
              minHeight: '80px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1vw',
              padding: '1.5vw 2vw',
              fontSize: '1.4em',
              fontWeight: 'bold',
              width: '100%'
            }}
          >
            <img 
              src={fingerprintIcon}
              alt="Биометрия" 
              style={{ 
                width: '40px', 
                height: '40px',
                objectFit: 'contain'
              }} 
            />
            <span style={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              lineHeight: '1.4',
              textAlign: 'center'
            }}>
              <span>ПРЕДЪЯВИТЬ</span>
              <span>БИОМЕТРИЧЕСКИЙ КЛЮЧ</span>
            </span>
          </button>
        );
      
      case 'telegram_token':
        if (!hasTelegram) return null;
        return (
          <>
            <button
              className="button-biometric txt-white gradient-effect-bg gradient-effect-border bg-color-main bru-min"
              type="button"
              onClick={handleRequestToken}
              disabled={requestingToken || !email.trim() || tokenSent}
              style={{
                cursor: (requestingToken || !email.trim() || tokenSent) ? "not-allowed" : "pointer",
                opacity: (requestingToken || !email.trim() || tokenSent) ? 0.5 : 1,
                minHeight: '60px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.8vw',
                padding: '1vw 2vw',
                fontSize: '1.2em',
                fontWeight: 'bold',
                width: '100%',
                background: tokenSent ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' : undefined
              }}
            >
              <img 
                src={telegramIcon}
                alt="Telegram" 
                style={{ 
                  width: '30px', 
                  height: '30px',
                  objectFit: 'contain'
                }} 
              />
              <span>
                {tokenSent ? 'ТОКЕН ОТПРАВЛЕН' : 'ЗАПРОСИТЬ ТОКЕН'}
              </span>
            </button>
            {tokenSent && (
                  <>
                    <div className="form-email-inputs flex flex-column" style={{ marginTop: '1vw' }}>
                      <label className="txt-white" htmlFor="user-login-token">
                        Введите токен из Telegram
                      </label>
                      <input
                        className="txt-black bru-min"
                        type="text"
                        placeholder="Вставьте токен из Telegram"
                        id="user-login-token"
                        name="token"
                        autoComplete="off"
                        spellCheck={false}
                        autoCapitalize="none"
                        autoCorrect="off"
                        value={token}
                        onChange={(e) => setToken(e.target.value)}
                        disabled={tokenLoginLoading}
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '1.1em',
                          letterSpacing: '0.1em'
                        }}
                      />
                    </div>
                    <div className="form-login-buttons flex flex-column" style={{ gap: '1vw', marginTop: '1vw' }}>
                      <button
                        className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
                        type="button"
                        onClick={handleTokenLogin}
                        disabled={tokenLoginLoading || !token.trim()}
                        style={{
                          cursor: (tokenLoginLoading || !token.trim()) ? "not-allowed" : "pointer",
                          opacity: (tokenLoginLoading || !token.trim()) ? 0.7 : 1,
                        }}
                      >
                        {tokenLoginLoading ? "Вход..." : "войти"}
                      </button>
                    </div>
                  </>
            )}
          </>
        );
      
      case 'email_link':
        return (
          <>
            <button
              className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main bru-min"
              type="button"
              onClick={handleRequestEmailLink}
              disabled={emailLinkRequesting || !email.trim() || emailLinkSent}
              style={{
                padding: '1.5vw 2vw',
                fontSize: '1.2em',
                fontWeight: 'bold',
                width: '100%',
                cursor: (emailLinkRequesting || !email.trim() || emailLinkSent) ? "not-allowed" : "pointer",
                opacity: (emailLinkRequesting || !email.trim() || emailLinkSent) ? 0.7 : 1,
                background: emailLinkSent ? 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' : undefined
              }}
            >
              {emailLinkRequesting ? 'Отправка...' : emailLinkSent ? 'Ссылка отправлена' : 'ВОЙТИ'}
            </button>
            {emailLinkSent && (
              <div style={{ 
                marginTop: '1vw', 
                padding: '1vw', 
                backgroundColor: 'rgba(76, 175, 80, 0.1)', 
                borderRadius: '0.5vw',
                textAlign: 'center',
                fontSize: '0.9vw',
                color: '#4CAF50'
              }}>
                Ссылка для входа отправлена на {email.trim()}. Проверьте почту и перейдите по ссылке.
              </div>
            )}
          </>
        );
      
      case 'password':
      default:
        return (
          <>
            <div className="form-password-inputs flex flex-column">
              <label className="txt-white" htmlFor="user-login-password">
                Пароль
              </label>
              <input
                className="txt-black bru-min"
                type="password"
                placeholder="Введите ваш пароль"
                id="user-login-password"
                name="password"
                autoComplete="current-password"
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

            <div className="form-login-buttons flex flex-column" style={{ gap: '1vw', width: '80%' }}>
              <button
                className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
                type="submit"
                style={{
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  width: '100%'
                }}
              >
                {loading ? "Вход..." : "ВОЙТИ"}
              </button>
            </div>
          </>
        );
    }
  };

  // Обычная форма входа
  return (
    <>
      <form 
        className="form-login-container formm-shadow flex flex-column bru-max bg-color-main txt-size-07" 
        autoComplete="on" 
        onSubmit={(e)=>{
          e.preventDefault(); 
          // Разрешаем отправку формы, если показывается стандартная форма (пароль, капча, согласие)
          const isStandardFormVisible = !showMoreAuthMethods && 
            (!selectedAuthMethod || selectedAuthMethod === 'password') &&
            (!preferredAuthMethod || preferredAuthMethod === 'password' || preferredAuthMethod === 'biometric' || preferredAuthMethod === null);
          
          if (!loading && isStandardFormVisible) {
            handleLogin();
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const isStandardFormVisible = !showMoreAuthMethods && 
              (!selectedAuthMethod || selectedAuthMethod === 'password') &&
              (!preferredAuthMethod || preferredAuthMethod === 'password' || preferredAuthMethod === 'biometric' || preferredAuthMethod === null);
            
            if (!loading && isStandardFormVisible) {
              e.preventDefault();
              handleLogin();
            }
          }
        }}
      >
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
            name="email"
            autoComplete="email"
            inputMode="email"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || biometricLoginLoading || tokenLoginLoading}
          />
        </div>

        {/* Показываем предпочтительный способ входа, если email введен и способ определен (но НЕ показываем если выбран password или способ = password) */}
        {/* КРИТИЧНО: НЕ показываем предпочтительный способ, если пользователь явно выбрал 'password' */}
        {!userExplicitlyChosePasswordRef.current && selectedAuthMethod !== 'password' && email.trim() && preferredAuthMethod && preferredAuthMethod !== 'password' && preferredAuthMethod !== null && preferredAuthMethod !== 'biometric' && !checkingBiometric && !checkingTelegram && !selectedAuthMethod && (
          <div className="form-login-buttons flex flex-column" style={{ gap: '1vw', marginTop: '2vw', width: '80%' }}>
            {renderAuthMethod(preferredAuthMethod)}
            
            {/* Текст "Больше способов входа" - показываем всегда, если есть другие способы */}
            {availableMethods.length > 1 && !showMoreAuthMethods && (
              <div 
                style={{ 
                  textAlign: 'center', 
                  marginTop: '0.5vw',
                  cursor: 'pointer',
                  fontSize: '0.75vw',
                  color: '#999',
                  textDecoration: 'underline'
                }}
                onClick={handleToggleMoreMethods}
              >
                {showMoreAuthMethods ? 'Скрыть' : 'Больше способов входа'}
              </div>
            )}
          </div>
        )}
        
        {/* Показываем предпочтительный способ БИОМЕТРИЯ отдельно */}
        {/* КРИТИЧНО: НЕ показываем предпочтительный способ биометрии, если пользователь явно выбрал 'password' */}
        {!userExplicitlyChosePasswordRef.current && selectedAuthMethod !== 'password' && email.trim() && preferredAuthMethod === 'biometric' && !checkingBiometric && !checkingTelegram && !selectedAuthMethod && (
          <div className="form-login-buttons flex flex-column" style={{ gap: '1vw', marginTop: '2vw', width: '80%' }}>
            {renderAuthMethod('biometric')}
            
            {/* Текст "Больше способов входа" - показываем всегда, если есть другие способы */}
            {availableMethods.length > 1 && !showMoreAuthMethods && (
              <div 
                style={{ 
                  textAlign: 'center', 
                  marginTop: '0.5vw',
                  cursor: 'pointer',
                  fontSize: '0.75vw',
                  color: '#999',
                  textDecoration: 'underline'
                }}
                onClick={handleToggleMoreMethods}
              >
                {showMoreAuthMethods ? 'Скрыть' : 'Больше способов входа'}
              </div>
            )}
          </div>
        )}

        {/* Список способов входа - показываем когда открыто меню "Больше способов входа" (только если нет предпочтительного способа или он = password) */}
        {showMoreAuthMethods && email.trim() && availableMethods.length > 1 && (!preferredAuthMethod || preferredAuthMethod === 'password') && (() => {
          // Показываем все доступные способы, кроме password (он уже показан в стандартной форме)
          const methodsToShow = availableMethods.filter(method => method !== 'password');
          
          if (methodsToShow.length === 0) {
            console.warn('⚠️ Список способов пустой после фильтрации!');
            return null;
          }
          
          return (
            <div className="form-login-buttons flex flex-column" style={{ gap: '0.5vw', marginTop: '0.5vw', width: '80%' }}>
              <div 
                style={{ 
                  textAlign: 'center', 
                  marginBottom: '0.5vw',
                  cursor: 'pointer',
                  fontSize: '0.75vw',
                  color: '#999',
                  textDecoration: 'underline'
                }}
                onClick={handleToggleMoreMethods}
              >
                Скрыть
              </div>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5vw',
                paddingTop: '0.5vw',
                alignItems: 'center'
              }}>
                {methodsToShow.map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      handleSelectAuthMethod(method);
                      setShowMoreAuthMethods(false);
                    }}
                    style={{
                      padding: '0.8vw 1.5vw',
                      fontSize: '0.9vw',
                      color: '#fff',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '0.5vw',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'background 0.2s ease-in-out',
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    {method === 'email_link' && 'Ссылка на почту'}
                    {method === 'biometric' && 'Биометрия'}
                    {method === 'telegram_token' && 'Telegram токен'}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}
        
        {/* Список способов входа для предпочтительного способа - показываем когда открыто меню "Больше способов входа" */}
        {showMoreAuthMethods && email.trim() && availableMethods.length > 1 && preferredAuthMethod && preferredAuthMethod !== 'password' && preferredAuthMethod !== null && (() => {
          // Показываем все доступные способы, кроме предпочтительного
          const methodsToShow = availableMethods.filter(method => method !== preferredAuthMethod);
          
          return (
            <div className="form-login-buttons flex flex-column" style={{ gap: '0', marginTop: '0.5vw', width: '80%' }}>
              <div 
                style={{ 
                  textAlign: 'center', 
                  marginBottom: '0',
                  cursor: 'pointer',
                  fontSize: '0.75vw',
                  color: '#999',
                  textDecoration: 'underline'
                }}
                onClick={handleToggleMoreMethods}
              >
                Скрыть
              </div>
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.5vw',
                paddingTop: '0',
                marginTop: '0.2vw',
                alignItems: 'center'
              }}>
                {/* Другие доступные способы */}
                {methodsToShow.map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      handleSelectAuthMethod(method);
                      setShowMoreAuthMethods(false);
                    }}
                    style={{
                      padding: '0.8vw 1.5vw',
                      fontSize: '0.9vw',
                      color: '#fff',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.3)',
                      borderRadius: '0.5vw',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'background 0.2s ease-in-out',
                    }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={(e) => e.target.style.background = 'transparent'}
                  >
                    {method === 'password' && 'Логин и Пароль'}
                    {method === 'email_link' && 'Ссылка на почту'}
                    {method === 'biometric' && 'Биометрия'}
                    {method === 'telegram_token' && 'Telegram токен'}
                  </button>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Показываем выбранный способ (если отличается от предпочтительного) */}
        {email.trim() && selectedAuthMethod && selectedAuthMethod !== preferredAuthMethod && selectedAuthMethod !== 'password' && !checkingBiometric && !checkingTelegram && (
          <div className="form-login-buttons flex flex-column" style={{ gap: '1vw', marginTop: '2vw', width: '80%' }}>
            {renderAuthMethod(selectedAuthMethod)}
            <div
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                fontSize: '0.75vw',
                color: '#999',
                textDecoration: 'underline',
                marginTop: '0.5vw'
              }}
              onClick={() => {
                setSelectedAuthMethod(null);
                setShowMoreAuthMethods(false);
              }}
            >
              {preferredAuthMethod ? 'Вернуться к предпочтительному способу' : 'Вернуться к стандартной форме'}
            </div>
          </div>
        )}
        
        {/* Показываем выбранный способ биометрии, если он выбран из списка (даже если preferredAuthMethod = 'biometric') */}
        {email.trim() && selectedAuthMethod === 'biometric' && preferredAuthMethod === 'biometric' && !checkingBiometric && !checkingTelegram && (
          <div className="form-login-buttons flex flex-column" style={{ gap: '1vw', marginTop: '2vw', width: '80%' }}>
            {renderAuthMethod('biometric')}
            <div
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                fontSize: '0.75vw',
                color: '#999',
                textDecoration: 'underline',
                marginTop: '0.5vw'
              }}
              onClick={() => {
                setSelectedAuthMethod(null);
                setShowMoreAuthMethods(false);
              }}
            >
              Вернуться к стандартной форме
            </div>
          </div>
        )}

        {/* Показываем стандартную форму (пароль, капча, согласие) */}
        {(() => {
          // КРИТИЧНО: Если пользователь явно выбрал password, показываем форму ВСЕГДА
          const userChosePassword = userExplicitlyChosePasswordRef.current || selectedAuthMethod === 'password';
          
          // НЕ показываем если открыто меню "Больше способов входа"
          if (showMoreAuthMethods) {
            return false;
          }
          
          // НЕ показываем если выбран другой способ (не password)
          if (selectedAuthMethod && selectedAuthMethod !== 'password') {
            return false;
          }
          
          // КРИТИЧНО: Если пользователь явно выбрал password, показываем форму ВСЕГДА
          if (userChosePassword) {
            return true;
          }
          
          // Если email не введен, показываем форму
          if (!email.trim()) {
            return true;
          }
          
          // Если нет предпочтительного способа, показываем форму
          if (!preferredAuthMethod || preferredAuthMethod === 'password' || preferredAuthMethod === null) {
            return true;
          }
          
          // Если идет проверка биометрии/телеграма, показываем форму
          if (checkingBiometric || checkingTelegram) {
            return true;
          }
          
          // Во всех остальных случаях НЕ показываем форму
          return false;
        })() && (
          <>
            <div className="form-password-inputs flex flex-column">
              <label className="txt-white" htmlFor="user-login-password">
                Пароль
              </label>
              <input
                className="txt-black bru-min"
                type="password"
                placeholder="Введите ваш пароль"
                id="user-login-password"
                name="password"
                autoComplete="current-password"
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

            <div className="form-login-buttons flex flex-column" style={{ gap: '1vw', width: '80%' }}>
              <button
                className="button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
                type="submit"
                style={{
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  width: '100%'
                }}
              >
                {loading ? "Вход..." : "ВОЙТИ"}
              </button>
              
              {/* Кнопка "Больше способов входа" для стандартной формы - показываем только если НЕ выбран способ из списка */}
              {email.trim() && availableMethods.length > 1 && !showMoreAuthMethods && !selectedAuthMethod && (
                <div 
                  style={{ 
                    textAlign: 'center', 
                    marginTop: '0.5vw',
                    cursor: 'pointer',
                    fontSize: '0.75vw',
                    color: '#999',
                    textDecoration: 'underline'
                  }}
                  onClick={handleToggleMoreMethods}
                >
                  {showMoreAuthMethods ? 'Скрыть' : 'Больше способов входа'}
                </div>
              )}
              
              {/* Кнопка "Вернуться к предпочтительному способу" когда выбран password из списка */}
              {selectedAuthMethod === 'password' && preferredAuthMethod && preferredAuthMethod !== 'password' && preferredAuthMethod !== null && (
                <div
                  style={{
                    textAlign: 'center',
                    cursor: 'pointer',
                    fontSize: '0.75vw',
                    color: '#999',
                    textDecoration: 'underline',
                    marginTop: '0.5vw'
                  }}
                  onClick={() => {
                    setSelectedAuthMethod(null);
                    setShowMoreAuthMethods(false);
                  }}
                >
                  Вернуться к предпочтительному способу
                </div>
              )}
              
            </div>
          </>
        )}

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
      </form>

      {/* Модальное окно для запроса разрешений на сбор отпечатка */}
      {showFingerprintModal && (
        <FingerprintPermissionsModal
          onPermissionsGranted={handlePermissionsGranted}
          onPermissionsDenied={handlePermissionsDenied}
        />
      )}
    </>
  );
}

export default Login;
