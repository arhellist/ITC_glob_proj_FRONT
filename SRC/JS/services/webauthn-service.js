import axiosAPI from '../auth/http/axios.js';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';

/**
 * Сервис для работы с WebAuthn (биометрическая аутентификация)
 * 
 * WebAuthn - это стандарт W3C для безопасной аутентификации без паролей
 * с использованием биометрии (отпечатки пальцев, Face ID, Windows Hello)
 * или аппаратных ключей (USB-ключи FIDO2).
 */

/**
 * Проверка поддержки WebAuthn в браузере
 * @returns {boolean} Поддерживается ли WebAuthn
 */
export function isWebAuthnSupported() {
  return typeof window !== 'undefined' && 
         typeof window.PublicKeyCredential !== 'undefined' &&
         typeof navigator.credentials !== 'undefined' &&
         typeof navigator.credentials.create !== 'undefined';
}

/**
 * Проверка поддержки биометрии на платформе
 * @returns {Promise<boolean>} Доступна ли биометрия
 */
export async function isPlatformAuthenticatorAvailable() {
  if (!isWebAuthnSupported()) {
    return false;
  }
  
  try {
    if (window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }
    return false;
  } catch (error) {
    console.error('Ошибка проверки поддержки биометрии:', error);
    return false;
  }
}

/**
 * Регистрация биометрического ключа
 * @param {string} deviceName - Название устройства
 * @returns {Promise<Object>} Результат регистрации
 */
/**
 * Получение опций регистрации без вызова startRegistration
 * Используется для предзагрузки опций перед кликом пользователя
 * @returns {Promise<Object>} Опции регистрации с challenge_id
 */
export async function getRegistrationOptions() {
  try {
    console.log('getRegistrationOptions: Запрос опций регистрации...');
    const optionsResponse = await axiosAPI.post('/auth/webauthn/register/options');
    console.log('getRegistrationOptions: Ответ опций:', optionsResponse.data);
    
    if (!optionsResponse.data.success) {
      throw new Error('Ошибка получения опций регистрации');
    }

    return {
      success: true,
      options: optionsResponse.data.options,
      challenge_id: optionsResponse.data.challenge_id
    };
  } catch (error) {
    console.error('getRegistrationOptions: Ошибка получения опций:', error);
    throw error;
  }
}

export async function registerBiometricKey(deviceName = null, preloadedOptions = null) {
  try {
    console.log('registerBiometricKey: Начало функции');
    
    if (!isWebAuthnSupported()) {
      console.error('registerBiometricKey: WebAuthn не поддерживается');
      throw new Error('Ваш браузер не поддерживает WebAuthn');
    }
    console.log('registerBiometricKey: WebAuthn поддерживается');

    const isAvailable = await isPlatformAuthenticatorAvailable();
    console.log('registerBiometricKey: Проверка биометрии:', isAvailable);
    if (!isAvailable) {
      throw new Error('Биометрическая аутентификация недоступна на вашем устройстве');
    }

    let options, challenge_id;
    
    // Используем предзагруженные опции или запрашиваем новые
    // Проверяем, что предзагруженные опции не слишком старые (не более 8 минут)
    const MAX_PRELOAD_AGE = 8 * 60 * 1000; // 8 минут (challenge живет 10 минут)
    const now = Date.now();
    const preloadAge = preloadedOptions?.timestamp ? (now - preloadedOptions.timestamp) : Infinity;
    
    if (preloadedOptions && preloadedOptions.options && preloadedOptions.challenge_id && preloadAge < MAX_PRELOAD_AGE) {
      console.log(`registerBiometricKey: Используем предзагруженные опции (возраст: ${Math.round(preloadAge / 1000)}с)`);
      options = preloadedOptions.options;
      challenge_id = preloadedOptions.challenge_id;
    } else {
      if (preloadedOptions && preloadAge >= MAX_PRELOAD_AGE) {
        console.log(`registerBiometricKey: Предзагруженные опции устарели (возраст: ${Math.round(preloadAge / 1000)}с), запрашиваем новые`);
      }
      // Получаем опции регистрации с сервера
      console.log('registerBiometricKey: Запрос опций регистрации...');
      const optionsResponse = await axiosAPI.post('/auth/webauthn/register/options');
      console.log('registerBiometricKey: Ответ опций:', optionsResponse.data);
      
      if (!optionsResponse.data.success) {
        throw new Error('Ошибка получения опций регистрации');
      }

      options = optionsResponse.data.options;
      challenge_id = optionsResponse.data.challenge_id; // ID challenge из БД
    }
    
    console.log('registerBiometricKey: Получены опции и challenge_id:', challenge_id);
    
    // Библиотека @simplewebauthn/browser ожидает опции в том формате, который возвращает
    // @simplewebauthn/server. Опции уже должны быть в правильном формате (строки Base64URL).
    // Мы просто удаляем внутренние поля (challenge_id) и передаем опции напрямую.
    
    // Создаем копию опций без внутренних полей
    // Важно: создаем новый объект, чтобы не модифицировать оригинальный
    const registrationOptions = { ...options };
    delete registrationOptions.challenge_id;
    
    // Логируем детальную структуру опций для диагностики
    console.log('registerBiometricKey: Детальная структура опций:', {
      challenge: registrationOptions.challenge ? (typeof registrationOptions.challenge === 'string' ? registrationOptions.challenge.substring(0, 30) + '...' : `[${typeof registrationOptions.challenge}]`) : 'ОТСУТСТВУЕТ',
      rp: registrationOptions.rp ? {
        id: registrationOptions.rp.id,
        name: registrationOptions.rp.name
      } : 'ОТСУТСТВУЕТ',
      user: registrationOptions.user ? {
        id: typeof registrationOptions.user.id === 'string' 
          ? registrationOptions.user.id.substring(0, 30) + '...' 
          : `[${typeof registrationOptions.user.id}]`,
        name: registrationOptions.user.name,
        displayName: registrationOptions.user.displayName
      } : 'ОТСУТСТВУЕТ',
      pubKeyCredParams: registrationOptions.pubKeyCredParams?.length || 0,
      timeout: registrationOptions.timeout,
      attestation: registrationOptions.attestation,
      excludeCredentials: registrationOptions.excludeCredentials?.length || 0,
      authenticatorSelection: registrationOptions.authenticatorSelection
    });
    
    // Логируем полную структуру опций для отладки предупреждения
    console.log('registerBiometricKey: Полная структура опций для startRegistration:', JSON.stringify(registrationOptions, null, 2));
    
    // Проверяем, что все обязательные поля присутствуют
    if (!registrationOptions.challenge) {
      throw new Error('Отсутствует обязательное поле challenge в опциях регистрации');
    }
    if (!registrationOptions.rp || !registrationOptions.rp.id) {
      throw new Error('Отсутствует обязательное поле rp.id в опциях регистрации');
    }
    if (!registrationOptions.user || !registrationOptions.user.id) {
      throw new Error('Отсутствует обязательное поле user.id в опциях регистрации');
    }
    
    // Дополнительная проверка доступности Windows Hello перед вызовом
    console.log('registerBiometricKey: Проверка Windows Hello перед вызовом...');
    const isAvailableNow = await isPlatformAuthenticatorAvailable();
    console.log('registerBiometricKey: Windows Hello доступен:', isAvailableNow);
    
    if (!isAvailableNow) {
      throw new Error('Windows Hello недоступен. Убедитесь, что:\n1. Windows Hello настроен в Параметрах Windows\n2. PIN или биометрия активны\n3. Браузер имеет разрешение на использование Windows Hello');
    }

    // Запускаем регистрацию через WebAuthn API (синхронно в рамках user gesture)
    console.log('registerBiometricKey: Запуск startRegistration...');
    console.log('registerBiometricKey: Контекст выполнения -', {
      isSecureContext: window.isSecureContext,
      location: window.location.href,
      userAgent: navigator.userAgent.substring(0, 50)
    });
    
    let credential;
    const startTime = Date.now(); // Засекаем время начала
    
    try {
      // Вызываем startRegistration синхронно после получения опций
      // Важно: вызов должен происходить в контексте прямого user gesture (клик пользователя)
      // Если между кликом и вызовом проходит слишком много времени (из-за асинхронных операций),
      // браузер может заблокировать операцию
      console.log('registerBiometricKey: Вызов startRegistration...');
      console.log('registerBiometricKey: Ожидаем появления окна Windows Hello...');
      
      credential = await startRegistration(registrationOptions);
      
      const elapsedTime = Date.now() - startTime;
      console.log(`registerBiometricKey: Получен credential от браузера за ${elapsedTime}ms`);
    } catch (startError) {
      const elapsedTime = Date.now() - startTime;
      console.error(`registerBiometricKey: Ошибка при startRegistration (через ${elapsedTime}ms):`, startError);
      console.error('registerBiometricKey: Детали startRegistration ошибки:', {
        name: startError.name,
        message: startError.message,
        stack: startError.stack
      });
      
      // Специальная обработка для NotAllowedError
      if (startError.name === 'NotAllowedError') {
        // Проверяем, используется ли HTTPS
        const isHTTPS = window.location.protocol === 'https:';
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

        // Если ошибка произошла очень быстро (< 100ms), скорее всего Windows Hello не настроен
        if (elapsedTime < 100) {
          throw new Error('Windows Hello не настроен или не работает.\n\nЧто делать:\n1. Откройте "Параметры Windows" (Win + I)\n2. Перейдите в "Учетные записи" → "Параметры входа"\n3. Убедитесь, что Windows Hello включен и настроен (PIN, отпечаток пальца или распознавание лица)\n4. Если не настроен, нажмите "Настроить" и следуйте инструкциям\n5. После настройки перезагрузите страницу и попробуйте снова');
        }
        
        // Может быть timeout или пользователь не дал разрешение
        if (startError.message && startError.message.includes('timeout')) {
          throw new Error('Время ожидания регистрации истекло. При появлении окна Windows Hello подтвердите операцию в течение 60 секунд.');
        } else if (!isHTTPS && !isLocalhost) {
          throw new Error('WebAuthn требует HTTPS соединение. Пожалуйста, используйте HTTPS для работы с биометрической аутентификацией.');
        } else {
          // Более детальное сообщение об ошибке
          let errorMessage = 'Регистрация биометрического ключа не разрешена.\n\n';
          errorMessage += 'Возможные причины:\n';
          errorMessage += '1. Windows Hello не настроен - настройте PIN или биометрию в Параметрах Windows (Параметры → Учетные записи → Параметры входа)\n';
          errorMessage += '2. Операция была отменена - при появлении окна Windows Hello подтвердите операцию (введите PIN или используйте биометрию)\n';
          errorMessage += '3. Браузер блокирует WebAuthn - проверьте настройки безопасности браузера\n\n';
          errorMessage += 'Что делать:\n';
          errorMessage += '• Убедитесь, что Windows Hello настроен и работает\n';
          errorMessage += '• При появлении окна Windows Hello подтвердите операцию\n';
          errorMessage += '• Попробуйте использовать браузер Chrome или Edge\n';
          errorMessage += '• Перезагрузите страницу и попробуйте снова';
          throw new Error(errorMessage);
        }
      }
      throw startError;
    }

    // Отправляем credential на сервер для верификации (challenge проверяется из БД по challenge_id)
    console.log('registerBiometricKey: Отправка credential на сервер для верификации...');
    const verifyResponse = await axiosAPI.post('/auth/webauthn/register/verify', {
      response: credential,
      deviceName: deviceName || navigator.userAgent,
      challenge_id: challenge_id // Передаем challenge_id для проверки в БД
    });
    console.log('registerBiometricKey: Ответ верификации:', verifyResponse.data);

    if (!verifyResponse.data.success) {
      throw new Error('Ошибка верификации биометрического ключа');
    }

    console.log('registerBiometricKey: Регистрация завершена успешно');
    return {
      success: true,
      credential: verifyResponse.data.credential
    };
  } catch (error) {
    console.error('registerBiometricKey: Ошибка регистрации биометрического ключа:', error);
    console.error('registerBiometricKey: Детали ошибки:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    if (error.name === 'NotAllowedError') {
      throw new Error('Регистрация биометрического ключа отменена пользователем');
    } else if (error.name === 'NotSupportedError') {
      throw new Error('Ваше устройство не поддерживает биометрическую аутентификацию');
    } else if (error.name === 'InvalidStateError') {
      throw new Error('Биометрический ключ уже зарегистрирован на этом устройстве');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw error;
  }
}

/**
 * Аутентификация через биометрию
 * @param {string} email - Email пользователя
 * @param {Object} deviceInfo - Информация об устройстве
 * @returns {Promise<Object>} Результат аутентификации (JWT токены и данные пользователя)
 */
export async function authenticateWithBiometric(email, deviceInfo = {}) {
  try {
    if (!isWebAuthnSupported()) {
      throw new Error('Ваш браузер не поддерживает WebAuthn');
    }

    // Получаем опции аутентификации с сервера
    const optionsResponse = await axiosAPI.post('/auth/webauthn/authenticate/options', {
      email: email
    });

    if (!optionsResponse.data.success) {
      throw new Error('Ошибка получения опций аутентификации');
    }

    const options = optionsResponse.data.options;
    const challenge_id = optionsResponse.data.challenge_id; // ID challenge из БД

    // Запускаем аутентификацию через WebAuthn API
    const assertion = await startAuthentication(options);

    // Собираем информацию об устройстве
    const fullDeviceInfo = {
      userAgent: navigator.userAgent,
      ipAddress: null, // IP будет получен на сервере
      deviceName: deviceInfo.deviceName || navigator.userAgent,
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      ...deviceInfo
    };

    // Отправляем assertion на сервер для верификации и входа (challenge проверяется из БД по challenge_id)
    const verifyResponse = await axiosAPI.post('/auth/webauthn/authenticate/verify', {
      email: email,
      response: assertion,
      deviceInfo: fullDeviceInfo,
      challenge_id: challenge_id // Передаем challenge_id для проверки в БД
    });

    if (!verifyResponse.data.success) {
      throw new Error('Ошибка верификации биометрического ключа');
    }

    return {
      success: true,
      token: verifyResponse.data.token,
      user: verifyResponse.data.user,
      email: verifyResponse.data.email,
      device: verifyResponse.data.device
    };
  } catch (error) {
    console.error('Ошибка аутентификации через биометрию:', error);
    
    if (error.name === 'NotAllowedError') {
      throw new Error('Аутентификация отменена пользователем');
    } else if (error.name === 'NotFoundError') {
      throw new Error('Биометрический ключ не найден. Зарегистрируйте ключ для входа через биометрию.');
    } else if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw error;
  }
}

/**
 * Получение списка зарегистрированных биометрических ключей пользователя
 * @returns {Promise<Array>} Список credentials
 */
export async function getUserCredentials() {
  try {
    const response = await axiosAPI.get('/auth/webauthn/credentials');
    
    if (!response.data.success) {
      throw new Error('Ошибка получения списка ключей');
    }

    return response.data.credentials;
  } catch (error) {
    console.error('Ошибка получения списка биометрических ключей:', error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

/**
 * Отзыв (деактивация) биометрического ключа
 * @param {number} credentialId - ID credential для отзыва
 * @returns {Promise<boolean>} Результат отзыва
 */
export async function revokeCredential(credentialId) {
  try {
    const response = await axiosAPI.delete(`/auth/webauthn/credentials/${credentialId}`);
    
    if (!response.data.success) {
      throw new Error('Ошибка отзыва биометрического ключа');
    }

    return true;
  } catch (error) {
    console.error('Ошибка отзыва биометрического ключа:', error);
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw error;
  }
}

