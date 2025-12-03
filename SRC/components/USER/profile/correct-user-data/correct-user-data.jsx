import "./correct-user-data.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../../../../JS/auth/store/store";
import { API_CONFIG } from "../../../../config/api.js";
import defaultAvatarUrl from "../../../../IMG/male/ava.png";
import fingerprintIcon from "../../../../IMG/fingerprint.png";
import telegramIcon from "../../../../IMG/telegram.png";
import postIcon from "../../../../IMG/post.png";
import keyIcon from "../../../../IMG/key.png";
import * as webauthnService from "../../../../JS/services/webauthn-service.js";
import RevokeBiometricModal from "./revoke-biometric-modal.jsx"; // Импорт модального окна подтверждения удаления
import DeleteConfirmationModal from "./delete-confirmation-modal.jsx"; // Импорт универсального модального окна подтверждения удаления
import websocketService from "../../../../JS/websocket/websocket-service.js"; // Импорт WebSocket сервиса
import axios from "axios";

function CorrectUserData({ onClose }) {
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  // Получаем методы стора
  const isAuth = useAuthStore((s) => s.isAuth);
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile); // Метод обновления профиля из store
  
  const [gender, setGender] = useState(user?.gender || 'male');
  const [avatar, setAvatar] = useState(() => {
    // Если у пользователя есть аватар и он не равен 'noAvatar', формируем полный URL
    if (user?.avatar && user.avatar !== 'noAvatar') {
      return user.avatar.startsWith('http') ? user.avatar : `${API_CONFIG.BASE_URL}${user.avatar}`;
    }
    return defaultAvatarUrl; // Дефолтная картинка
  });
  const [avatarFile, setAvatarFile] = useState(null); // Файл для отправки на сервер
  const [biometricCredentials, setBiometricCredentials] = useState([]); // Биометрические ключи пользователя
  const [loadingBiometric, setLoadingBiometric] = useState(false); // Флаг загрузки биометрических ключей
  const [registeringBiometric, setRegisteringBiometric] = useState(false); // Флаг регистрации биометрического ключа
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false); // Поддержка WebAuthn
  const [isPlatformAuthenticatorAvailable, setIsPlatformAuthenticatorAvailable] = useState(false); // Доступность биометрии
  const [showRevokeModal, setShowRevokeModal] = useState(false); // Показать модальное окно удаления
  const [credentialToRevoke, setCredentialToRevoke] = useState(null); // ID ключа для удаления
  const [preloadedRegistrationOptions, setPreloadedRegistrationOptions] = useState(null); // Предзагруженные опции регистрации
  const [telegramAccount, setTelegramAccount] = useState(null); // Telegram аккаунт пользователя
  const [loadingTelegram, setLoadingTelegram] = useState(false); // Флаг загрузки Telegram аккаунта
  const [addingTelegram, setAddingTelegram] = useState(false); // Флаг добавления Telegram аккаунта
  const [backupEmails, setBackupEmails] = useState([]); // Резервные почты пользователя
  const [loadingBackupEmails, setLoadingBackupEmails] = useState(false); // Флаг загрузки резервных почт
  const [addingBackupEmail, setAddingBackupEmail] = useState(false); // Флаг добавления резервной почты
  const [newBackupEmail, setNewBackupEmail] = useState(""); // Новый email для добавления
  const [showDeleteTelegramModal, setShowDeleteTelegramModal] = useState(false); // Показать модальное окно удаления Telegram
  const [showDeleteBackupEmailModal, setShowDeleteBackupEmailModal] = useState(false); // Показать модальное окно удаления резервной почты
  const [backupEmailToDelete, setBackupEmailToDelete] = useState(null); // ID резервной почты для удаления
  const [preferredAuthMethod, setPreferredAuthMethod] = useState('password'); // Предпочтительный способ аутентификации
  const [loadingAuthMethod, setLoadingAuthMethod] = useState(false); // Флаг загрузки предпочтительного способа
  const [userDevices, setUserDevices] = useState([]); // Устройства пользователя
  const [loadingDevices, setLoadingDevices] = useState(false); // Флаг загрузки устройств
  const [showRejectDeviceModal, setShowRejectDeviceModal] = useState(false); // Показать модальное окно отклонения/запрета устройства
  const [deviceToReject, setDeviceToReject] = useState(null); // Устройство для отклонения/запрета
  const [rejectActionType, setRejectActionType] = useState('reject'); // Тип действия: 'reject' или 'ban'
  
  // Состояния для редактируемых полей
  const [formData, setFormData] = useState({
    surname: user?.surname || '',
    firstname: user?.firstname || '',
    patronymic: user?.patronymic || '',
    phone: user?.phone || '',
    telegram: user?.telegram || '',
    geography: user?.geography || '',
    dateborn: user?.dateborn || ''
  });

  // Данные пользователя для инпутов

  // Обработчик сохранения данных
  const handleSaveData = async () => {
    console.log('=== НАЧАЛО СОХРАНЕНИЯ ===');
    console.log('Функция handleSaveData вызвана!');
    try {
      console.log('Данные для отправки:');
      console.log('- Email (для поиска):', user?.email);
      console.log('- Текстовые поля:', {
        surname: formData.surname,
        firstname: formData.firstname,
        patronymic: formData.patronymic,
        phone: formData.phone,
        telegram: formData.telegram,
        geography: formData.geography,
        dateborn: formData.dateborn,
        gender: gender
      });
      console.log('- Файл аватарки:', avatarFile ? `${avatarFile.name} (${avatarFile.size} bytes)` : 'не выбран');
      
      // Подготавливаем данные для отправки
      const profileData = {
        ...formData,
        gender,
        avatarFile
      };
      
      // Отправляем данные через store
      const result = await updateProfile(profileData);
      
      console.log('Данные успешно сохранены:', result);
      
      // Данные пользователя будут обновлены автоматически через fetchUserProfile в store
      
    } catch (error) {
      console.error('Ошибка при сохранении данных:', error);
    }
    console.log('=== КОНЕЦ СОХРАНЕНИЯ ===');
  };

  // Обработчик изменения полей формы
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Обработчик выбора аватарки
  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    console.log('=== ВЫБОР ФАЙЛА ===');
    console.log('Выбранный файл:', file);
    if (file) {
      console.log('Файл детали:', {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      
      // Сохраняем файл для отправки на сервер
      setAvatarFile(file);
      console.log('Файл сохранен в state:', file);
      
      // Показываем превью локально
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatar(e.target.result);
        console.log('Превью загружено');
      };
      reader.readAsDataURL(file);
    } else {
      console.log('Файл не выбран');
    }
    console.log('=== КОНЕЦ ВЫБОРА ФАЙЛА ===');
  };

  // Обновляем форму при изменении данных пользователя
  useEffect(() => {
    if (user) {
      console.log('CorrectUserData: обновляем форму с данными пользователя:', user);
      setFormData({
        surname: user.surname || '',
        firstname: user.firstname || '',
        patronymic: user.patronymic || '',
        phone: user.phone || '',
        telegram: user.telegram || '',
        geography: user.geography || '',
        dateborn: user.dateBorn ? new Date(user.dateBorn).toISOString().split('T')[0] : ''
      });
      
      // Обновляем пол
      if (user.gender) {
        setGender(user.gender);
      }
      
      // КРИТИЧНО: Обновляем предпочтительный способ аутентификации из данных пользователя
      if (user.authway) {
        console.log('CorrectUserData: устанавливаем предпочтительный способ из user.authway:', user.authway);
        setPreferredAuthMethod(user.authway);
      }
    }
  }, [user]);

  // Обновляем аватар при изменении данных пользователя
  useEffect(() => {
    if (user?.avatar && user.avatar !== 'noAvatar') {
      const avatarUrl = user.avatar.startsWith('http') ? user.avatar : `${API_CONFIG.BASE_URL}${user.avatar}`;
      setAvatar(avatarUrl);
    } else {
      setAvatar(defaultAvatarUrl); // Дефолтная картинка
    }
  }, [user?.avatar]);

  // Обновляем аватар в DOM при изменении локального состояния
  useEffect(() => {
    const correctDataAvatar = document.querySelector('.correct-data-profile-avatar-item-img');
    if (correctDataAvatar) {
      correctDataAvatar.src = avatar;
      console.log('CorrectUserData: обновлен аватар в DOM:', avatar);
    }
  }, [avatar]);

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

  // Загрузка биометрических ключей пользователя
  const loadBiometricCredentials = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !isAuth) {
      return;
    }

    try {
      setLoadingBiometric(true);
      const credentials = await webauthnService.getUserCredentials();
      setBiometricCredentials(credentials);
    } catch (error) {
      console.error('Ошибка загрузки биометрических ключей:', error);
    } finally {
      setLoadingBiometric(false);
    }
  }, [isAuth]);

  // Предзагрузка опций регистрации для ускорения процесса
  const preloadRegistrationOptions = useCallback(async () => {
    if (!isAuth || !isWebAuthnSupported || !isPlatformAuthenticatorAvailable) {
      return;
    }
    
    try {
      // Запрашиваем опции заранее, чтобы при клике сразу вызывать startRegistration
      const optionsResponse = await webauthnService.getRegistrationOptions();
      if (optionsResponse?.success && optionsResponse?.options) {
        // Добавляем timestamp для проверки актуальности опций
        setPreloadedRegistrationOptions({
          ...optionsResponse,
          timestamp: Date.now()
        });
        console.log('Опции регистрации предзагружены');
      }
    } catch (error) {
      console.warn('Не удалось предзагрузить опции регистрации:', error);
      // Не критично, опции будут запрошены при клике
    }
  }, [isAuth, isWebAuthnSupported, isPlatformAuthenticatorAvailable]);

  // Загрузка Telegram аккаунта
  const loadTelegramAccount = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !isAuth) {
      return;
    }

    try {
      setLoadingTelegram(true);
      const response = await axios.get(`${API_CONFIG.BASE_URL}/profile/telegram/check`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Telegram Account Check Response:', response.data);
      
      if (response.data.success) {
        if (response.data.hasTelegram && response.data.telegramId) {
          // Если аккаунт существует в БД, показываем карточку
          setTelegramAccount({ telegramId: response.data.telegramId });
          console.log('Telegram аккаунт найден, ID:', response.data.telegramId);
        } else {
          // Если аккаунта нет, показываем кнопку добавления
          setTelegramAccount(null);
          console.log('Telegram аккаунт не найден');
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки Telegram аккаунта:', error);
      setTelegramAccount(null);
    } finally {
      setLoadingTelegram(false);
    }
  }, [isAuth]);

  // Добавление Telegram аккаунта
  const handleAddTelegram = async () => {
    try {
      setAddingTelegram(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await axios.post(`${API_CONFIG.BASE_URL}/profile/telegram/add`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        document.dispatchEvent(new CustomEvent('main-notify', { 
          detail: { type: 'success', text: 'Письмо с подтверждением отправлено на вашу почту. Проверьте почту и подтвердите подключение Telegram аккаунта' } 
        }));
      }
    } catch (error) {
      console.error('Ошибка добавления Telegram аккаунта:', error);
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'error', text: error.response?.data?.message || 'Ошибка добавления Telegram аккаунта' } 
      }));
    } finally {
      setAddingTelegram(false);
    }
  };

  // Инициирование удаления Telegram аккаунта
  const handleRevokeTelegram = () => {
    setShowDeleteTelegramModal(true);
  };

  // Подтверждение удаления Telegram аккаунта
  const handleConfirmRevokeTelegram = async () => {
    setShowDeleteTelegramModal(false);

    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await axios.post(`${API_CONFIG.BASE_URL}/profile/telegram/revoke`, {}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        document.dispatchEvent(new CustomEvent('main-notify', { 
          detail: { type: 'success', text: 'Письмо с подтверждением удаления отправлено на вашу почту' } 
        }));
      }
    } catch (error) {
      console.error('Ошибка удаления Telegram аккаунта:', error);
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'error', text: error.response?.data?.message || 'Ошибка удаления Telegram аккаунта' } 
      }));
    }
  };

  // Отмена удаления Telegram аккаунта
  const handleCancelRevokeTelegram = () => {
    setShowDeleteTelegramModal(false);
  };

  // Загрузка устройств пользователя
  const loadUserDevices = useCallback(async () => {
    if (!isAuth || !user) return;
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('CorrectUserData: Токен отсутствует, пропускаем загрузку устройств');
      return;
    }
    
    try {
      setLoadingDevices(true);
      const response = await axios.get(`${API_CONFIG.BASE_URL}/profile/devices`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('User Devices Response:', response.data);
      
      if (response.data.success && response.data.devices) {
        const devices = response.data.devices || [];
        console.log(`loadUserDevices: Загружено ${devices.length} устройств`);
        setUserDevices(devices);
      } else {
        console.log('loadUserDevices: Нет устройств в ответе или ошибка');
        setUserDevices([]);
      }
    } catch (error) {
      console.error('Ошибка загрузки устройств:', error);
      setUserDevices([]);
    } finally {
      setLoadingDevices(false);
    }
  }, [isAuth, user]);

  // Загрузка резервных почт
  const loadBackupEmails = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    if (!token || !isAuth) {
      return;
    }

    try {
      setLoadingBackupEmails(true);
      const response = await axios.get(`${API_CONFIG.BASE_URL}/profile/backup-emails`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('Backup Emails Response:', response.data);
      
      if (response.data.success) {
        setBackupEmails(response.data.backupEmails || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки резервных почт:', error);
      setBackupEmails([]);
    } finally {
      setLoadingBackupEmails(false);
    }
  }, [isAuth]);

  // Добавление резервной почты
  const handleAddBackupEmail = async () => {
    if (!newBackupEmail.trim()) {
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'error', text: 'Введите email адрес' } 
      }));
      return;
    }

    try {
      setAddingBackupEmail(true);
      const token = localStorage.getItem('accessToken');
      
      const response = await axios.post(`${API_CONFIG.BASE_URL}/profile/backup-emails/add`, {
        email: newBackupEmail.trim()
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setNewBackupEmail("");
        document.dispatchEvent(new CustomEvent('main-notify', { 
          detail: { type: 'success', text: 'Письмо с подтверждением отправлено на указанный email адрес' } 
        }));
        // Перезагружаем список резервных почт
        await loadBackupEmails();
      }
    } catch (error) {
      console.error('Ошибка добавления резервной почты:', error);
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'error', text: error.response?.data?.message || 'Ошибка добавления резервной почты' } 
      }));
    } finally {
      setAddingBackupEmail(false);
    }
  };

  // Инициирование удаления резервной почты
  const handleRemoveBackupEmail = (backupEmailId) => {
    setBackupEmailToDelete(backupEmailId);
    setShowDeleteBackupEmailModal(true);
  };

  // Подтверждение удаления резервной почты
  const handleConfirmRemoveBackupEmail = async () => {
    const backupEmailId = backupEmailToDelete;
    setShowDeleteBackupEmailModal(false);
    setBackupEmailToDelete(null);

    try {
      const token = localStorage.getItem('accessToken');
      
      const response = await axios.post(`${API_CONFIG.BASE_URL}/profile/backup-emails/remove`, {
        backupEmailId
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        document.dispatchEvent(new CustomEvent('main-notify', { 
          detail: { type: 'success', text: 'Письмо с подтверждением удаления отправлено на вашу основную почту' } 
        }));
        // Перезагружаем список резервных почт
        await loadBackupEmails();
      }
    } catch (error) {
      console.error('Ошибка удаления резервной почты:', error);
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'error', text: error.response?.data?.message || 'Ошибка удаления резервной почты' } 
      }));
    }
  };

  // Отмена удаления резервной почты
  const handleCancelRemoveBackupEmail = () => {
    setShowDeleteBackupEmailModal(false);
    setBackupEmailToDelete(null);
  };

  // Обработка отклонения устройства (отзыв разрешения)
  const handleRejectDevice = (device) => {
    setDeviceToReject(device);
    setRejectActionType('reject');
    setShowRejectDeviceModal(true);
  };

  // Обработка запрета устройства (удаление ожидающего разрешения)
  const handleBanDevice = (device) => {
    setDeviceToReject(device);
    setRejectActionType('ban');
    setShowRejectDeviceModal(true);
  };

  const handleConfirmRejectDevice = async () => {
    if (!deviceToReject) return;
    
    const deviceId = deviceToReject.device_id;
    const actionType = rejectActionType;
    setShowRejectDeviceModal(false);
    setDeviceToReject(null);
    setRejectActionType('reject');
    
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.error('Токен отсутствует');
      return;
    }
    
    try {
      const endpoint = actionType === 'ban' 
        ? `${API_CONFIG.BASE_URL}/profile/devices/ban`
        : `${API_CONFIG.BASE_URL}/profile/devices/reject`;
      
      const response = await axios.post(endpoint, {
        deviceId
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data.success) {
        // Перезагружаем список устройств
        await loadUserDevices();
        const message = actionType === 'ban' 
          ? 'Устройство успешно удалено'
          : 'Разрешение устройства успешно отозвано';
        document.dispatchEvent(new CustomEvent('main-notify', { 
          detail: { type: 'success', text: message } 
        }));
      }
    } catch (error) {
      console.error('Ошибка обработки устройства:', error);
      const errorMessage = actionType === 'ban' 
        ? 'Ошибка удаления устройства'
        : 'Ошибка отзыва разрешения устройства';
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'error', text: error.response?.data?.message || errorMessage } 
      }));
    }
  };

  const handleCancelRejectDevice = () => {
    setShowRejectDeviceModal(false);
    setDeviceToReject(null);
    setRejectActionType('reject');
  };

  // Загрузка предпочтительного способа аутентификации
  const loadPreferredAuthMethod = useCallback(async () => {
    // КРИТИЧНО: Используем данные из store, которые уже загружены
    // Это надежнее, чем делать отдельный запрос, который может вернуть HTML вместо JSON
    if (user && user.authway) {
      console.log('loadPreferredAuthMethod: устанавливаем предпочтительный способ из user.authway:', user.authway);
      setPreferredAuthMethod(user.authway);
      return;
    }
    
    // Fallback: если в store нет данных, пытаемся загрузить через API
    const token = localStorage.getItem('accessToken');
    if (!token || !isAuth) {
      console.log('loadPreferredAuthMethod: пропущено (нет токена или не авторизован)');
      return;
    }

    try {
      console.log('loadPreferredAuthMethod: начинаем загрузку через API...');
      setLoadingAuthMethod(true);
      const response = await axios.get(`${API_CONFIG.BASE_URL}/user/user-data`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log('loadPreferredAuthMethod: получен ответ от API:', response.data);
      
      // КРИТИЧНО: API возвращает данные в формате { user: {...} }, а не напрямую
      // Всегда устанавливаем значение из API, даже если это 'password' (значение по умолчанию)
      if (response.data && response.data.user) {
        const authway = response.data.user.authway || 'password';
        console.log('loadPreferredAuthMethod: устанавливаем предпочтительный способ:', authway);
        setPreferredAuthMethod(authway);
      } else {
        console.warn('loadPreferredAuthMethod: response.data.user отсутствует, response.data:', response.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки предпочтительного способа аутентификации:', error);
      console.error('Детали ошибки:', error.response?.data);
    } finally {
      setLoadingAuthMethod(false);
    }
  }, [isAuth, user]);

  // Обновление предпочтительного способа аутентификации
  const handleUpdateAuthMethod = async (authway) => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.put(`${API_CONFIG.BASE_URL}/profile/authway`, { authway }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (response.data.success) {
        setPreferredAuthMethod(authway);
        document.dispatchEvent(new CustomEvent('main-notify', { 
          detail: { type: 'success', text: 'Предпочтительный способ аутентификации обновлен' } 
        }));
      }
    } catch (error) {
      console.error('Ошибка обновления предпочтительного способа аутентификации:', error);
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'error', text: error.response?.data?.message || 'Ошибка обновления способа аутентификации' } 
      }));
    }
  };

  // Загружаем биометрические ключи, Telegram аккаунт, резервные почты, устройства и предпочтительный способ аутентификации при монтировании компонента
  useEffect(() => {
    if (isAuth) {
      loadBiometricCredentials();
      loadTelegramAccount();
      loadBackupEmails();
      loadUserDevices();
      loadPreferredAuthMethod();
      // Предзагружаем опции регистрации для ускорения процесса
      preloadRegistrationOptions();
    }
  }, [isAuth, loadBiometricCredentials, loadTelegramAccount, loadBackupEmails, loadPreferredAuthMethod, preloadRegistrationOptions]);

  // Регистрация нового биометрического ключа
  const handleRegisterBiometric = async () => {
    if (!isWebAuthnSupported || !isPlatformAuthenticatorAvailable) {
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'attention', text: 'Ваше устройство не поддерживает биометрическую аутентификацию' } 
      }));
      return;
    }

    try {
      setRegisteringBiometric(true);
      console.log('Начинаем регистрацию биометрического ключа...');
      
      const deviceName = `${navigator.platform || 'Unknown'} - ${navigator.userAgent.substring(0, 50)}`;
      console.log('Название устройства:', deviceName);
      
      // WebAuthn требует, чтобы вызов startRegistration происходил в рамках user gesture
      // Используем предзагруженные опции, если они есть, чтобы минимизировать время между кликом и вызовом
      console.log('Вызываем webauthnService.registerBiometricKey...');
      const result = await webauthnService.registerBiometricKey(deviceName, preloadedRegistrationOptions);
      console.log('Результат регистрации:', result);
      
      // Очищаем предзагруженные опции после использования
      setPreloadedRegistrationOptions(null);
      
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'success', text: 'Биометрический ключ успешно зарегистрирован' } 
      }));
      
      console.log('Перезагружаем список ключей...');
      await loadBiometricCredentials(); // Перезагружаем список ключей
      console.log('Регистрация завершена успешно');
      
      // Предзагружаем новые опции для следующей регистрации
      await preloadRegistrationOptions();
    } catch (error) {
      console.error('Ошибка регистрации биометрического ключа:', error);
      console.error('Детали ошибки:', {
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      let errorMessage = 'Ошибка регистрации биометрического ключа';
      
      // Обработка специфичных ошибок WebAuthn
      if (error.message) {
        errorMessage = error.message;
      } else if (error.name === 'NotAllowedError') {
        errorMessage = 'Регистрация отменена или истекло время ожидания. Убедитесь, что вы нажали кнопку напрямую и следуйте инструкциям на экране биометрии.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = 'Ваше устройство или браузер не поддерживает биометрическую аутентификацию';
      } else if (error.name === 'InvalidStateError') {
        errorMessage = 'Биометрический ключ уже зарегистрирован на этом устройстве';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'error', text: errorMessage } 
      }));
    } finally {
      setRegisteringBiometric(false);
      console.log('Состояние регистрации сброшено');
    }
  };

  // Отзыв биометрического ключа
  const handleRevokeBiometric = (credentialId) => {
    setCredentialToRevoke(credentialId);
    setShowRevokeModal(true);
  };

  const handleConfirmRevoke = async () => {
    if (!credentialToRevoke) return;

    setShowRevokeModal(false);
    const credentialId = credentialToRevoke;
    setCredentialToRevoke(null);

    try {
      await webauthnService.revokeCredential(credentialId);
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'success', text: 'Биометрический ключ отозван' } 
      }));
      await loadBiometricCredentials(); // Перезагружаем список ключей
    } catch (error) {
      console.error('Ошибка отзыва биометрического ключа:', error);
      document.dispatchEvent(new CustomEvent('main-notify', { 
        detail: { type: 'error', text: error.message || 'Ошибка отзыва биометрического ключа' } 
      }));
    }
  };

  const handleCancelRevoke = () => {
    setShowRevokeModal(false);
    setCredentialToRevoke(null);
  };

  // Обработка WebSocket событий для обновления статуса биометрических ключей
  useEffect(() => {
    if (!isAuth) return;

    const socket = websocketService.getSocket();
    if (!socket) return;

    // Обработчик события обновления биометрических ключей
    const handleWebAuthnUpdate = (data) => {
      console.log('WebAuthn Update Event:', data);
      
      if (data.type === 'webauthn_approved') {
        // Обновляем статус подтверждения ключа сразу
        setBiometricCredentials(prev => 
          prev.map(cred => 
            cred.id === data.credentialId 
              ? { ...cred, is_approved: true }
              : cred
          )
        );
        // Перезагружаем список через небольшую задержку для получения актуальных данных с сервера
        setTimeout(() => {
          loadBiometricCredentials();
        }, 500);
      } else if (data.type === 'webauthn_revoked') {
        // Удаляем ключ из списка
        setBiometricCredentials(prev => 
          prev.filter(cred => cred.id !== data.credentialId)
        );
      }
    };

    // Обработчик события обновления Telegram аккаунта
    const handleTelegramUpdate = (data) => {
      console.log('📱 Telegram Update Event:', data);
      
      if (data.type === 'telegram_added') {
        console.log('✅ Telegram аккаунт добавлен, обновляем интерфейс...');
        // Сразу обновляем состояние для мгновенного отображения карточки
        setTelegramAccount({ telegramId: data.telegramId });
        // Перезагружаем данные для получения полной информации (username и т.д.)
        setTimeout(() => {
          console.log('🔄 Перезагружаем данные Telegram аккаунта...');
          loadTelegramAccount();
        }, 500);
      } else if (data.type === 'telegram_removed') {
        console.log('❌ Telegram аккаунт удален, обновляем интерфейс...');
        // Удаляем Telegram аккаунт из состояния
        setTelegramAccount(null);
      }
    };

    socket.on('webauthn-update', handleWebAuthnUpdate);
    socket.on('telegram-update', handleTelegramUpdate);
    
    const handleBackupEmailUpdate = (data) => {
      console.log('📧 Backup Email Update Event:', data);
      
      if (data.type === 'backup_email_added') {
        console.log('✅ Резервная почта добавлена, обновляем интерфейс...');
        // Сразу добавляем новую почту в состояние для мгновенного отображения
        if (data.email) {
          setBackupEmails(prev => {
            // Проверяем, нет ли уже такой почты в списке
            const exists = prev.some(email => email.email === data.email);
            if (!exists) {
              return [...prev, { email: data.email, is_approved: true, isApproved: true }];
            }
            return prev;
          });
        }
        // Перезагружаем данные для получения полной информации
        setTimeout(() => {
          console.log('🔄 Перезагружаем данные резервных почт...');
          loadBackupEmails();
        }, 500);
      } else if (data.type === 'backup_email_removed') {
        console.log('❌ Резервная почта удалена, обновляем интерфейс...');
        // Удаляем почту из состояния
        if (data.email) {
          setBackupEmails(prev => prev.filter(email => email.email !== data.email));
        }
      }
    };
    
    socket.on('backup-email-update', handleBackupEmailUpdate);

    return () => {
      socket.off('webauthn-update', handleWebAuthnUpdate);
      socket.off('telegram-update', handleTelegramUpdate);
      socket.off('backup-email-update', handleBackupEmailUpdate);
    };
  }, [isAuth, loadBiometricCredentials, loadTelegramAccount, loadBackupEmails]);

  // Проверяем аутентификацию при загрузке компонента
  useEffect(() => {
    console.log("Main: Проверяем состояние аутентификации...");

    // Если пользователь аутентифицирован, показываем личный кабинет
    if (isAuth) {
      console.log(
        "Main: Пользователь аутентифицирован, показываем личный кабинет"
      );
      setIsChecking(false);
    } else {
      console.log(
        "Main: Пользователь не аутентифицирован, перенаправляем на форму логина"
      );
      navigate("/login");
    }
  }, [isAuth, navigate]); // Проверяем при изменении аутентификации

  // Показываем загрузку пока проверяем аутентификацию
  if (isChecking) {
    return (
      <section className="root bg-color-main flex flex-row">
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            width: "100%",
            color: "white",
            fontSize: "18px",
          }}
        >
          Проверка доступа...
        </div>
      </section>
    );
  }

  return (
    <div class="correct-data-profile-container flex flex-column">
      <div class="correct-data-profile-container-panel flex flex-row">
         <div class="correct-data-profile-avatar flex flex-column">
           <div class="correct-data-profile-avatar-item gradient-border  bru">
             <img
               class="correct-data-profile-avatar-item-img img bru"
               src={avatar}
               alt="user-avatar"
             />
           </div>
           <div class="correct-data-profile-avatar-item-button gradient-border bru flex pointer">
             <input
               type="file"
               accept="image/*"
               onChange={handleAvatarChange}
               style={{ display: 'none' }}
               id="avatar-upload"
             />
             <label htmlFor="avatar-upload" style={{ cursor: 'pointer', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               Изменить фото профиля
             </label>
           </div>
         </div>
        <div class="correct-data-profile-form flex flex-column">
          <div class="correct-data-profile-form-title">
            редактирование данных
          </div>
          <div class="correct-data-personal-info-panel gradient-border bru flex flex-row">
            <div class="flex flex-column">
              <label htmlFor="correct-data-name" class="correct-data-label">
                Фамилия
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="text"
                   id="correct-data-name"
                   class="correct-data-input bru"
                   placeholder="Фамилия"
                   value={formData.surname}
                   onChange={(e) => handleInputChange('surname', e.target.value)}
                 />
              </div>
            </div>

            <div class="flex flex-column">
              <label
                htmlFor="correct-data-firstname"
                class="correct-data-label"
              >
                Имя
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="text"
                   id="correct-data-firstname"
                   class="correct-data-input bru"
                   placeholder="Имя"
                   value={formData.firstname}
                   onChange={(e) => handleInputChange('firstname', e.target.value)}
                 />
              </div>
            </div>
            <div class="flex flex-column">
              <label
                htmlFor="correct-data-patronymic"
                class="correct-data-label"
              >
                Отчество
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="text"
                   id="correct-data-patronymic"
                   class="correct-data-input bru"
                   placeholder="Отчество"
                   value={formData.patronymic}
                   onChange={(e) => handleInputChange('patronymic', e.target.value)}
                 />
              </div>
            </div>
            <div class="flex flex-column">
              <label htmlFor="correct-data-phone" class="correct-data-label">
                Телефон
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="tel"
                   id="correct-data-phone"
                   class="correct-data-input bru"
                   placeholder="Телефон"
                   value={formData.phone}
                   onChange={(e) => handleInputChange('phone', e.target.value)}
                 />
              </div>
            </div>

            <div class="flex flex-column">
              <label htmlFor="correct-data-telegram" class="correct-data-label">
                Telegram
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="text"
                   id="correct-data-telegram"
                   class="correct-data-input bru"
                   placeholder="@Telegram"
                   value={formData.telegram}
                   onChange={(e) => handleInputChange('telegram', e.target.value)}
                 />
              </div>
            </div>

            <div class="flex flex-column">
               <label htmlFor="correct-dateborn" class="correct-data-label">
                Дата рождения
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="date"
                   id="correct-dateborn"
                   class="correct-data-input bru"
                   placeholder="Дата рождения"
                   value={formData.dateborn}
                   onChange={(e) => handleInputChange('dateborn', e.target.value)}
                 />
              </div>
            </div>

            <div class="flex flex-column">
              <label
                htmlFor="correct-data-geography"
                class="correct-data-label"
              >
                Местоположение
              </label>
              <div class="gradient-border wrapper bru">
                 <input
                   type="text"
                   id="correct-data-geography"
                   class="correct-data-input bru"
                   placeholder="Россия. Москва"
                   value={formData.geography}
                   onChange={(e) => handleInputChange('geography', e.target.value)}
                 />
              </div>
            </div>

             <div class="flex gender-container gradient-border flex-row bru">
               <input
                 type="radio"
                 id="correct-data-gender-male"
                 checked={gender === 'male'}
                 onChange={() => setGender('male')}
                 name="gender"
                 class="correct-data-input bru"
               />
               <input
                 type="radio"
                 id="correct-data-gender-female"
                 checked={gender === 'female'}
                 onChange={() => setGender('female')}
                 name="gender"
                 class="correct-data-input bru"
               />
               <label
                 htmlFor="correct-data-gender-male"
                 class="correct-data-label pointer"
               >
                 М
               </label>
               <label
                 htmlFor="correct-data-gender-female"
                 class="correct-data-label pointer"
               >
                 Ж
               </label>
               <div class="correct-data-gender-container-chked bru"></div>
             </div>
          </div>
          <div class="correct-data-profile-delete-form gradient-border bru flex flex-column">
            <div class="correct-data-profile-delete-form-title">
              действия с аккаунтом
            </div>
            <div class="correct-data-profile-delete-form-text">
              <span>Удаление и блокировка аккаунта</span>
              <p>
                Вы не можете полностью удалить аккаунт. Блокировка аккаунта
                возможна только через администратора
              </p>
            </div>
            <div class="correct-data-profile-delete-form-icon">
              <div class="correct-data-profile-delete-form-icon-img flex img"></div>
            </div>
          </div>
          
          {/* Блок предпочтительного способа аутентификации */}
          <div className="correct-data-biometric-form gradient-border bru flex flex-column">
            <div className="correct-data-biometric-form-title">
              ПРЕДПОЧТИТЕЛЬНЫЙ СПОСОБ АУТЕНТИФИКАЦИИ
            </div>
            <div style={{ fontSize: '0.85vw', color: '#666', marginTop: '0.3vw', marginBottom: '0.3vw', marginLeft: '2vw', marginRight: '2vw' }}>
              Выберите предпочтительный способ входа в приложение.
            </div>
            <div className="correct-data-biometric-info" style={{ padding: '1vw 2vw', marginLeft: 0, display: 'flex', justifyContent: 'center' }}>
              {loadingAuthMethod ? (
                <span>Загрузка...</span>
              ) : (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(2, 1fr)', 
                  gap: '1.5vw',
                  width: 'fit-content',
                  paddingBottom: '1vw'
                }}>
                  {/* Логин и Пароль - всегда доступен */}
                  <label 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.5vw',
                      background: preferredAuthMethod === 'password' 
                        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)' 
                        : 'linear-gradient(135deg, rgba(42, 42, 42, 0.8) 0%, rgba(30, 30, 30, 0.8) 100%)',
                      border: preferredAuthMethod === 'password' 
                        ? '2px solid rgba(76, 175, 80, 0.6)' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      minHeight: '8vw'
                    }}
                    onClick={() => handleUpdateAuthMethod('password')}
                    onMouseEnter={(e) => {
                      if (preferredAuthMethod !== 'password') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42, 42, 42, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (preferredAuthMethod !== 'password') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42, 42, 42, 0.8) 0%, rgba(30, 30, 30, 0.8) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {preferredAuthMethod === 'password' && (
                      <div style={{
                        position: 'absolute',
                        top: '0.8vw',
                        right: '0.8vw',
                        width: '2vw',
                        height: '2vw',
                        borderRadius: '50%',
                        background: 'rgba(76, 175, 80, 0.2)',
                        border: '2px solid rgba(76, 175, 80, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.3vw'
                      }}>
                        <img 
                          src={keyIcon} 
                          alt="selected" 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain'
                          }} 
                        />
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '2.5vw', 
                      marginBottom: '0.8vw',
                      opacity: 0.8
                    }}>🔐</div>
                    <span style={{ 
                      fontSize: '1vw', 
                      color: '#fff', 
                      fontWeight: 'bold', 
                      marginBottom: '0.5vw',
                      textAlign: 'center'
                    }}>Логин и Пароль</span>
                    <span style={{ 
                      fontSize: '0.75vw', 
                      color: '#999', 
                      textAlign: 'center',
                      lineHeight: '1.4'
                    }}>
                      Вход в аккаунт с использованием email и пароля
                    </span>
                  </label>
                  
                  {/* Ссылка на почту - всегда доступна */}
                  <label 
                    style={{ 
                      display: 'flex', 
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '1.5vw',
                      background: preferredAuthMethod === 'email_link' 
                        ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)' 
                        : 'linear-gradient(135deg, rgba(42, 42, 42, 0.8) 0%, rgba(30, 30, 30, 0.8) 100%)',
                      border: preferredAuthMethod === 'email_link' 
                        ? '2px solid rgba(76, 175, 80, 0.6)' 
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      minHeight: '8vw'
                    }}
                    onClick={() => handleUpdateAuthMethod('email_link')}
                    onMouseEnter={(e) => {
                      if (preferredAuthMethod !== 'email_link') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42, 42, 42, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (preferredAuthMethod !== 'email_link') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42, 42, 42, 0.8) 0%, rgba(30, 30, 30, 0.8) 100%)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {preferredAuthMethod === 'email_link' && (
                      <div style={{
                        position: 'absolute',
                        top: '0.8vw',
                        right: '0.8vw',
                        width: '2vw',
                        height: '2vw',
                        borderRadius: '50%',
                        background: 'rgba(76, 175, 80, 0.2)',
                        border: '2px solid rgba(76, 175, 80, 0.6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0.3vw'
                      }}>
                        <img 
                          src={keyIcon} 
                          alt="selected" 
                          style={{ 
                            width: '100%', 
                            height: '100%', 
                            objectFit: 'contain'
                          }} 
                        />
                      </div>
                    )}
                    <div style={{ 
                      fontSize: '2.5vw', 
                      marginBottom: '0.8vw',
                      opacity: 0.8
                    }}>📧</div>
                    <span style={{ 
                      fontSize: '1vw', 
                      color: '#fff', 
                      fontWeight: 'bold', 
                      marginBottom: '0.5vw',
                      textAlign: 'center'
                    }}>Ссылка на почту</span>
                    <span style={{ 
                      fontSize: '0.75vw', 
                      color: '#999', 
                      textAlign: 'center',
                      lineHeight: '1.4'
                    }}>
                      Вход через одноразовую ссылку, отправленную на вашу электронную почту
                    </span>
                  </label>
                  
                  {/* БИОМЕТРИЧЕСКИЙ КЛЮЧ - показываем только если есть подтвержденные биометрические ключи */}
                  {biometricCredentials.length > 0 && biometricCredentials.some(cred => cred.is_approved) && (
                    <label 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5vw',
                        background: preferredAuthMethod === 'biometric' 
                          ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)' 
                          : 'linear-gradient(135deg, rgba(42, 42, 42, 0.8) 0%, rgba(30, 30, 30, 0.8) 100%)',
                        border: preferredAuthMethod === 'biometric' 
                          ? '2px solid rgba(76, 175, 80, 0.6)' 
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        minHeight: '8vw'
                      }}
                      onClick={() => handleUpdateAuthMethod('biometric')}
                      onMouseEnter={(e) => {
                        if (preferredAuthMethod !== 'biometric') {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42, 42, 42, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (preferredAuthMethod !== 'biometric') {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42, 42, 42, 0.8) 0%, rgba(30, 30, 30, 0.8) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {preferredAuthMethod === 'biometric' && (
                        <div style={{
                          position: 'absolute',
                          top: '0.8vw',
                          right: '0.8vw',
                          width: '2vw',
                          height: '2vw',
                          borderRadius: '50%',
                          background: 'rgba(76, 175, 80, 0.2)',
                          border: '2px solid rgba(76, 175, 80, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.3vw'
                        }}>
                          <img 
                            src={keyIcon} 
                            alt="selected" 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'contain'
                            }} 
                          />
                        </div>
                      )}
                      <img 
                        src={fingerprintIcon} 
                        alt="biometric" 
                        style={{ 
                          width: '2.5vw', 
                          height: '2.5vw', 
                          marginBottom: '0.8vw',
                          opacity: 0.8
                        }} 
                      />
                      <span style={{ 
                        fontSize: '1vw', 
                        color: '#fff', 
                        fontWeight: 'bold', 
                        marginBottom: '0.5vw',
                        textAlign: 'center'
                      }}>БИОМЕТРИЧЕСКИЙ КЛЮЧ</span>
                      <span style={{ 
                        fontSize: '0.75vw', 
                        color: '#999', 
                        textAlign: 'center',
                        lineHeight: '1.4'
                      }}>
                        Вход с использованием биометрических данных (отпечаток пальца, Face ID и т.д.)
                      </span>
                    </label>
                  )}
                  
                  {/* TELEGRAM TOKEN - показываем только если есть Telegram аккаунт */}
                  {telegramAccount && (
                    <label 
                      style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '1.5vw',
                        background: preferredAuthMethod === 'telegram_token' 
                          ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%)' 
                          : 'linear-gradient(135deg, rgba(42, 42, 42, 0.8) 0%, rgba(30, 30, 30, 0.8) 100%)',
                        border: preferredAuthMethod === 'telegram_token' 
                          ? '2px solid rgba(76, 175, 80, 0.6)' 
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        minHeight: '8vw'
                      }}
                      onClick={() => handleUpdateAuthMethod('telegram_token')}
                      onMouseEnter={(e) => {
                        if (preferredAuthMethod !== 'telegram_token') {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42, 42, 42, 0.95) 0%, rgba(30, 30, 30, 0.95) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (preferredAuthMethod !== 'telegram_token') {
                          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(42, 42, 42, 0.8) 0%, rgba(30, 30, 30, 0.8) 100%)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {preferredAuthMethod === 'telegram_token' && (
                        <div style={{
                          position: 'absolute',
                          top: '0.8vw',
                          right: '0.8vw',
                          width: '2vw',
                          height: '2vw',
                          borderRadius: '50%',
                          background: 'rgba(76, 175, 80, 0.2)',
                          border: '2px solid rgba(76, 175, 80, 0.6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '0.3vw'
                        }}>
                          <img 
                            src={keyIcon} 
                            alt="selected" 
                            style={{ 
                              width: '100%', 
                              height: '100%', 
                              objectFit: 'contain'
                            }} 
                          />
                        </div>
                      )}
                      <img 
                        src={telegramIcon} 
                        alt="telegram" 
                        style={{ 
                          width: '2.5vw', 
                          height: '2.5vw', 
                          marginBottom: '0.8vw',
                          opacity: 0.8
                        }} 
                      />
                      <span style={{ 
                        fontSize: '1vw', 
                        color: '#fff', 
                        fontWeight: 'bold', 
                        marginBottom: '0.5vw',
                        textAlign: 'center'
                      }}>TELEGRAM TOKEN</span>
                      <span style={{ 
                        fontSize: '0.75vw', 
                        color: '#999', 
                        textAlign: 'center',
                        lineHeight: '1.4'
                      }}>
                        Вход через одноразовый токен, отправленный в ваш Telegram аккаунт
                      </span>
                    </label>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Блок биометрической аутентификации */}
          {isWebAuthnSupported && (
            <div className="correct-data-biometric-form gradient-border bru flex flex-column">
              <div className="correct-data-biometric-form-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5vw' }}>
                <img src={fingerprintIcon} alt="fingerprint" style={{ width: '1.5vw', height: '1.5vw' }} />
                биометрическая аутентификация
              </div>
              <div style={{ fontSize: '0.85vw', color: '#666', marginTop: '0.3vw', marginBottom: '0.3vw', marginLeft: '2vw', marginRight: '2vw' }}>
                При выборе этого способа аутентификации вы сможете осуществлять вход в аккаунт и подтверждать операции в приложении.
              </div>
              {isPlatformAuthenticatorAvailable ? (
                <>
                  <div className="correct-data-biometric-info">
                    {loadingBiometric ? (
                      <span>Загрузка...</span>
                    ) : biometricCredentials.length > 0 ? (
                      <div className="correct-data-biometric-credentials">
                        <span>Зарегистрировано ключей: {biometricCredentials.length}</span>
                        <div className="correct-data-biometric-credentials-list">
                          {biometricCredentials.map((cred) => {
                            // Извлекаем device_name без токена (если есть)
                            const deviceName = cred.device_name?.split('|TOKEN:')[0] || cred.device_name || 'Устройство';
                            const userAgent = cred.user_agent ? (cred.user_agent.length > 50 ? cred.user_agent.substring(0, 50) + '...' : cred.user_agent) : 'Не указан';
                            const platform = cred.platform || 'Не указана';
                            const createdDate = cred.created_at_device ? new Date(cred.created_at_device).toLocaleDateString('ru-RU') : (cred.created_at ? new Date(cred.created_at).toLocaleDateString('ru-RU') : 'Не указана');
                            
                            return (
                              <div key={cred.id} className="correct-data-biometric-credential-item gradient-border bru flex flex-column">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '0.5vw', minWidth: 0 }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0, maxWidth: '100%' }}>
                                    <span style={{ fontWeight: 'bold', marginBottom: '0.3vw', wordBreak: 'break-word' }}>{deviceName}</span>
                                    <span style={{ fontSize: '0.8vw', color: '#666', marginBottom: '0.2vw', wordBreak: 'break-word' }}>User Agent: {userAgent}</span>
                                    <span style={{ fontSize: '0.8vw', color: '#666', marginBottom: '0.2vw', wordBreak: 'break-word' }}>Платформа: {platform}</span>
                                    <span style={{ fontSize: '0.8vw', color: '#666', wordBreak: 'break-word' }}>Дата добавления: {createdDate}</span>
                                    {!cred.is_approved ? (
                                      <span style={{ fontSize: '0.8vw', color: '#ff6b6b', marginTop: '0.3vw', fontWeight: 'bold', wordBreak: 'break-word' }}>
                                        ⚠️ Подтвердите добавление вашего устройства через почту
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '0.8vw', color: '#4CAF50', marginTop: '0.3vw', fontWeight: 'bold', wordBreak: 'break-word' }}>
                                        ✓ Ключ успешно подтвержден
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    className="correct-data-biometric-revoke-btn gradient-border bru pointer"
                                    onClick={() => handleRevokeBiometric(cred.id)}
                                    style={{ marginLeft: '1vw', flexShrink: 0 }}
                                  >
                                    Удалить
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <span>Биометрия не настроена</span>
                    )}
                  </div>
                  <div 
                    className="correct-data-biometric-form-button gradient-border bru pointer"
                    onClick={handleRegisterBiometric}
                    style={{ opacity: registeringBiometric ? 0.6 : 1, cursor: registeringBiometric ? 'wait' : 'pointer' }}
                    disabled={registeringBiometric}
                  >
                    {registeringBiometric ? 'Регистрация...' : 'ДОБАВИТЬ БИОМЕТРИЮ'}
                  </div>
                </>
              ) : (
                <div className="correct-data-biometric-info" style={{ color: '#aaa', fontSize: '0.9vw' }}>
                  Биометрия недоступна на этом устройстве
                </div>
              )}
            </div>
          )}

          {/* Блок Telegram */}
          <div className="correct-data-biometric-form gradient-border bru flex flex-column">
            <div className="correct-data-biometric-form-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5vw' }}>
              <img src={telegramIcon} alt="telegram" style={{ width: '1.5vw', height: '1.5vw' }} />
              TELEGRAM
            </div>
            <div style={{ fontSize: '0.85vw', color: '#666', marginTop: '0.3vw', marginBottom: '0.3vw', marginLeft: '2vw', marginRight: '2vw' }}>
              При выборе этого способа аутентификации вы сможете осуществлять вход в аккаунт и подтверждать операции в приложении.
            </div>
            {loadingTelegram ? (
              <div className="correct-data-biometric-info">
                <span>Загрузка...</span>
              </div>
            ) : telegramAccount ? (
              <div className="correct-data-biometric-info">
                <div className="correct-data-biometric-credentials">
                  <div className="correct-data-biometric-credentials-list">
                    <div className="correct-data-biometric-credential-item gradient-border bru flex flex-column">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '0.5vw', minWidth: 0 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0, maxWidth: '100%' }}>
                          <span style={{ fontWeight: 'bold', marginBottom: '0.3vw', wordBreak: 'break-word' }}>Telegram ID: {telegramAccount.telegramId}</span>
                        </div>
                        <button
                          className="correct-data-biometric-revoke-btn gradient-border bru pointer"
                          onClick={handleRevokeTelegram}
                          style={{ marginLeft: '1vw', flexShrink: 0 }}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="correct-data-biometric-info">
                <span>Telegram аккаунт не подключен</span>
              </div>
            )}
            {!telegramAccount && (
              <div 
                className="correct-data-biometric-form-button gradient-border bru pointer"
                onClick={handleAddTelegram}
                style={{ opacity: addingTelegram ? 0.6 : 1, cursor: addingTelegram ? 'wait' : 'pointer' }}
                disabled={addingTelegram}
              >
                {addingTelegram ? 'Обработка...' : 'Добавить телеграм аккаунт'}
              </div>
            )}
          </div>

          {/* Блок Резервная почта */}
          <div className="correct-data-biometric-form gradient-border bru flex flex-column">
            <div className="correct-data-biometric-form-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5vw' }}>
              <img src={postIcon} alt="post" style={{ width: '1.5vw', height: '1.5vw' }} />
              РЕЗЕРВНАЯ ПОЧТА
            </div>
            {loadingBackupEmails ? (
              <div className="correct-data-biometric-info">
                <span>Загрузка...</span>
              </div>
            ) : backupEmails.length > 0 ? (
              <div className="correct-data-biometric-info">
                <div className="correct-data-biometric-credentials">
                  <div className="correct-data-biometric-credentials-list">
                    {backupEmails.map((email) => (
                      <div key={email.id} className="correct-data-biometric-credential-item gradient-border bru flex flex-column">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '0.5vw', minWidth: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0, maxWidth: '100%' }}>
                            <span style={{ fontWeight: 'bold', marginBottom: '0.3vw', wordBreak: 'break-word' }}>{email.email}</span>
                            <span style={{ fontSize: '0.8vw', color: '#666', wordBreak: 'break-word' }}>
                              Добавлена: {new Date(email.createdAt).toLocaleDateString('ru-RU')}
                            </span>
                          </div>
                          <button
                            className="correct-data-biometric-revoke-btn gradient-border bru pointer"
                            onClick={() => handleRemoveBackupEmail(email.id)}
                            style={{ marginLeft: '1vw', flexShrink: 0 }}
                          >
                            Удалить
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="correct-data-biometric-info">
                <span>Резервные почты не добавлены</span>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5vw', marginTop: '0.5vw', marginLeft: '2vw', marginRight: '2vw' }}>
              <input
                type="email"
                placeholder="Введите email адрес"
                value={newBackupEmail}
                onChange={(e) => setNewBackupEmail(e.target.value)}
                className="correct-data-input bru"
                style={{ width: '100%', padding: '0.5vw' }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddBackupEmail();
                  }
                }}
              />
              <div 
                className="correct-data-biometric-form-button gradient-border bru pointer"
                onClick={handleAddBackupEmail}
                style={{ opacity: addingBackupEmail ? 0.6 : 1, cursor: addingBackupEmail ? 'wait' : 'pointer' }}
                disabled={addingBackupEmail}
              >
                {addingBackupEmail ? 'Обработка...' : 'ДОБАВИТЬ ПОЧТУ'}
              </div>
            </div>
          </div>

          {/* Блок Мои устройства */}
          <div className="correct-data-biometric-form gradient-border bru flex flex-column">
            <div className="correct-data-biometric-form-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5vw' }}>
              <img src={keyIcon} alt="devices" style={{ width: '1.5vw', height: '1.5vw' }} />
              МОИ УСТРОЙСТВА
            </div>
            {loadingDevices ? (
              <div className="correct-data-biometric-info">
                <span>Загрузка...</span>
              </div>
            ) : userDevices.length > 0 ? (
              <div className="correct-data-biometric-info">
                <div className="correct-data-biometric-credentials">
                  <div className="correct-data-biometric-credentials-list">
                    {userDevices.map((device) => (
                      <div key={device.id} className="correct-data-biometric-credential-item gradient-border bru flex flex-column">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%', marginBottom: '0.5vw', minWidth: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minWidth: 0, maxWidth: '100%' }}>
                            {/* Лейбл текущего устройства */}
                            {device.is_current && (
                              <span style={{ 
                                fontSize: '0.7vw', 
                                color: '#2196F3', 
                                fontWeight: 'bold', 
                                marginBottom: '0.3vw',
                                padding: '0.2vw 0.5vw',
                                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                                borderRadius: '0.3vw',
                                display: 'inline-block',
                                width: 'fit-content'
                              }}>
                                ТЕКУЩЕЕ УСТРОЙСТВО
                              </span>
                            )}
                            
                            <span style={{ fontWeight: 'bold', marginBottom: '0.3vw', wordBreak: 'break-word' }}>
                              {device.device_name || `${device.browser || 'Браузер'} на ${device.os || 'ОС'}`}
                            </span>
                            
                            {/* Детальная информация об устройстве */}
                            <div style={{ fontSize: '0.75vw', color: '#666', wordBreak: 'break-word', marginBottom: '0.2vw', display: 'flex', flexDirection: 'column', gap: '0.1vw' }}>
                              {device.browser && (
                                <span>
                                  <strong>Браузер:</strong> {device.browser}{device.browser_version ? ` ${device.browser_version}` : ''}
                                </span>
                              )}
                              {device.os && (
                                <span>
                                  <strong>ОС:</strong> {device.os}{device.os_version ? ` ${device.os_version}` : ''}
                                </span>
                              )}
                              {device.device_type && (
                                <span>
                                  <strong>Тип:</strong> {device.device_type === 'desktop' ? 'Десктоп' : device.device_type === 'mobile' ? 'Мобильное' : device.device_type === 'tablet' ? 'Планшет' : device.device_type}
                                </span>
                              )}
                              {device.platform && (
                                <span>
                                  <strong>Платформа:</strong> {device.platform}
                                </span>
                              )}
                              {device.screen_resolution && (
                                <span>
                                  <strong>Разрешение:</strong> {device.screen_resolution}
                                </span>
                              )}
                              {device.timezone && (
                                <span>
                                  <strong>Часовой пояс:</strong> {device.timezone}
                                </span>
                              )}
                              {device.language && (
                                <span>
                                  <strong>Язык:</strong> {device.language}
                                </span>
                              )}
                              {device.ip_address && (
                                <span>
                                  <strong>IP:</strong> {device.ip_address}
                                </span>
                              )}
                              {device.location && (
                                <span>
                                  <strong>📍 Местоположение:</strong> {device.location}
                                </span>
                              )}
                              {device.first_used && (
                                <span>
                                  <strong>Первый вход:</strong> {new Date(device.first_used).toLocaleString('ru-RU')}
                                </span>
                              )}
                              {device.last_used && (
                                <span>
                                  <strong>Последний вход:</strong> {new Date(device.last_used).toLocaleString('ru-RU')}
                                </span>
                              )}
                              {device.approved_at && (
                                <span>
                                  <strong>Разрешено:</strong> {new Date(device.approved_at).toLocaleString('ru-RU')}
                                </span>
                              )}
                              {device.approval_requested_at && !device.is_approved && (
                                <span>
                                  <strong>Запрос разрешения:</strong> {new Date(device.approval_requested_at).toLocaleString('ru-RU')}
                                </span>
                              )}
                            </div>
                            
                            {/* Статус устройства - все устройства разрешены (показываем только разрешенные) */}
                            <div style={{ display: 'flex', gap: '0.5vw', marginTop: '0.3vw', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.75vw', color: '#4CAF50', fontWeight: 'bold' }}>
                                ✓ Разрешено
                              </span>
                            </div>
                          </div>
                          
                          {/* Кнопки действий - только для разрешенных устройств */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3vw', marginLeft: '1vw', flexShrink: 0 }}>
                            {/* Кнопка "ОТОЗВАТЬ РАЗРЕШЕНИЕ" - для всех разрешенных устройств */}
                            {device.is_approved && !device.blocked_at && (
                              <button
                                className="correct-data-biometric-revoke-btn gradient-border bru pointer"
                                onClick={() => handleRejectDevice(device)}
                                style={{ fontSize: '0.7vw', padding: '0.4vw 0.8vw' }}
                              >
                                ОТОЗВАТЬ РАЗРЕШЕНИЕ
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="correct-data-biometric-info">
                <span>Устройства не найдены</span>
              </div>
            )}
          </div>
        </div>
      </div>

       <div class="correct-data-profile-container-panel-button-container flex flex-row">
         <button 
           type="button"
           class="correct-data-profile-container-panel-button gradient-border flex bru pointer saveUserData"
           onClick={handleSaveData}
         >
           сохранить изменения
         </button>
         <div
           class="correct-data-profile-container-panel-button gradient-border flex bru pointer cancelUserData"
           onClick={onClose}
         >
           назад
         </div>
       </div>

       {/* Модальное окно подтверждения удаления биометрического ключа */}
       {showRevokeModal && credentialToRevoke && (
         <RevokeBiometricModal
           onConfirm={handleConfirmRevoke}
           onCancel={handleCancelRevoke}
           deviceName={biometricCredentials.find(cred => cred.id === credentialToRevoke)?.device_name?.split('|TOKEN:')[0] || 'Устройство'}
         />
       )}

       {/* Модальное окно подтверждения удаления Telegram аккаунта */}
       {showDeleteTelegramModal && (
         <DeleteConfirmationModal
           onConfirm={handleConfirmRevokeTelegram}
           onCancel={handleCancelRevokeTelegram}
           title="Подтверждение удаления"
           message="Вы уверены, что хотите отключить Telegram аккаунт?"
           itemName={`Telegram ID: ${telegramAccount?.telegramId || ''}`}
           warning="После отключения вы не сможете использовать его для входа и подтверждения операций."
         />
       )}

       {/* Модальное окно подтверждения удаления резервной почты */}
       {showDeleteBackupEmailModal && backupEmailToDelete && (
         <DeleteConfirmationModal
           onConfirm={handleConfirmRemoveBackupEmail}
           onCancel={handleCancelRemoveBackupEmail}
           title="Подтверждение удаления"
           message="Вы уверены, что хотите удалить эту резервную почту?"
           itemName={backupEmails.find(email => email.id === backupEmailToDelete)?.email || ''}
           warning="После удаления вы не сможете использовать эту почту для восстановления доступа к аккаунту."
         />
       )}

       {/* Модальное окно подтверждения отклонения/запрета устройства */}
       {showRejectDeviceModal && deviceToReject && (
         <DeleteConfirmationModal
           onConfirm={handleConfirmRejectDevice}
           onCancel={handleCancelRejectDevice}
           title={rejectActionType === 'ban' ? "Подтверждение запрета устройства" : "Подтверждение отзыва разрешения"}
           message={rejectActionType === 'ban' 
             ? "Вы уверены, что хотите запретить это устройство? Устройство будет удалено из списка."
             : "Вы уверены, что хотите отозвать разрешение для этого устройства?"}
           itemName={deviceToReject.device_name || `${deviceToReject.browser || 'Браузер'} на ${deviceToReject.os || 'ОС'}`}
           warning={rejectActionType === 'ban'
             ? "После запрета это устройство будет удалено и не сможет использоваться для входа в ваш аккаунт."
             : "После отзыва разрешения это устройство не сможет использоваться для входа в ваш аккаунт."}
         />
       )}
    </div>
  );
}

export default CorrectUserData;
