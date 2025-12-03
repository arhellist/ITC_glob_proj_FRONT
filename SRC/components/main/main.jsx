import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../JS/auth/store/store";
import { API_CONFIG } from "../../config/api.js";
import axiosAPI from "../../JS/auth/http/axios";
// Убираем импорт useSupport - это админский интерфейс
import ProfileUser from "../USER/profile/profile-user";
import CorrectUserData from "../USER/profile/correct-user-data/correct-user-data";
import PartnerProgs from "../USER/partner-progs/partner-progs";
import AccountsRoom from "../USER/accounts-room/accounts-room";
import TransactionRoom from "../USER/transaction-room/transaction-room.jsx";
import ReportRoom from "../USER/report-room/report-room.jsx";
import DocsRoom from "../USER/docs-room/docs-room.jsx";
import ContainerNotification from "../USER/accounts-room/modal-window-account-room/container-notification.jsx";
import InfoModal from "../USER/accounts-room/modal-window-account-room/info-modal.jsx";
import MessagesModal from "../USER/messages-modal/MessagesModal.jsx";
import websocketService from "../../JS/websocket/websocket-service.js";
import defaultAvatarUrl from "../../IMG/male/ava.png";
import RunAdminPanelButton from "../ADMIN/admBTN/admBTN.jsx";
import NavPanelAdmin from "../ADMIN/nav/nav.jsx";
import UsersList from "../ADMIN/users-list/users-list.jsx";
import AdminLogin from "../ADMIN/login/admin-login.jsx";
import SecurityDashboard from "../ADMIN/security-dashboard/security-dashboard.jsx";
import UserRequests from "../ADMIN/user-requests/user-requests.jsx"; // Импорт компонента заявок
import AccountsMonitoring from "../ADMIN/accounts-monitoring/accounts-monitoring.jsx"; // Импорт компонента мониторинга счетов
import ProfitabilityCalculation from "../ADMIN/profitability-calculation/profitability-calculation.jsx"; // Импорт компонента расчета доходности
import CRMMain from "../ADMIN/crm/crm-main.jsx"; // Импорт CRM-модуля
import EmailClient from "../ADMIN/email/EmailClient.jsx"; // Импорт Email клиента
import { CRMProvider } from "../../contexts/CRMContext.jsx";
import adminAuthService from "../../JS/services/admin-auth-service.js";
import securityService from "../../JS/services/security-service.js";
import adminService from "../../JS/services/admin-service.js";
import { initializeBehavioralBiometrics, getBehavioralBiometricsCollector } from "../../utils/behavioral-biometrics-collector.js";

const ADMIN_MENU_CONFIG = [
  { key: 'users', permission: 'viewUsers' },
  { key: 'requests', permission: 'manageTransactions' },
  { key: 'security', permission: 'manageSecuritySettings' },
  { key: 'monitoring', permission: 'manageAccounts' },
  { key: 'profitability', permission: 'exportFinancialReports' },
  { key: 'crm', permission: 'crmAccess' },
  { key: 'email', permission: 'emailAccess' }
];

function Main() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking] = useState(false); // Состояние проверки аутентификации (изменено на false для мгновенной загрузки интерфейса, setIsChecking не используется)
  const [activeView, setActiveView] = useState('profile'); // 'profile' | 'partners' | 'accounts' | 'transactions' | 'reports' | 'documents'
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [isAdminPanelActive, setIsAdminPanelActive] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminChecking, setAdminChecking] = useState(true);
  const [isInWhitelist, setIsInWhitelist] = useState(false);
  const [navItemsVisible, setNavItemsVisible] = useState({});
  const [adminActiveView, setAdminActiveView] = useState('users');
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [adminMenuAccess, setAdminMenuAccess] = useState(null);
  const [adminMenuConfig, setAdminMenuConfig] = useState([]);
  const [pendingDocumentsCount, setPendingDocumentsCount] = useState(0);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [emailUnreadCount, setEmailUnreadCount] = useState(0);
  
  // Получаем методы стора
  const isAuth = useAuthStore(s => s.isAuth);
  const logout = useAuthStore(s => s.logout);
  const user = useAuthStore(s => s.user);
  
  // НЕ ИСПОЛЬЗУЕМ SupportContext в клиентском интерфейсе
  // Клиентский интерфейс должен работать только с клиентскими сообщениями

  // Инициализация Behavioral Biometrics
  useEffect(() => {
    if (isAuth && user?.id) {
      const initBehavioralBiometrics = async () => {
        try {
          const collector = await initializeBehavioralBiometrics();
          console.log('✅ Behavioral Biometrics инициализирован');
          
          // Периодическая отправка данных на анализ (каждые 5 минут)
          const analysisInterval = setInterval(async () => {
            if (isAuth && user?.id) {
              try {
                const result = await collector.sendDataForAnalysis(user.id);
                if (result?.analysis?.isSuspicious) {
                  console.warn('⚠️ Behavioral Biometrics: Обнаружена подозрительная активность', result.analysis);
                }
                // Очищаем данные после отправки
                collector.clearAllData();
              } catch (error) {
                console.error('Ошибка отправки Behavioral Biometrics данных:', error);
              }
            }
          }, 5 * 60 * 1000); // 5 минут

          // Отправка данных при размонтировании компонента
          return () => {
            clearInterval(analysisInterval);
            if (isAuth && user?.id) {
              collector.sendDataForAnalysis(user.id).catch(console.error);
            }
            collector.disable();
          };
        } catch (error) {
          console.error('Ошибка инициализации Behavioral Biometrics:', error);
        }
      };

      initBehavioralBiometrics();
    } else {
      // Отключаем коллектор при выходе
      const collector = getBehavioralBiometricsCollector();
      collector.disable();
      collector.clearAllData();
    }
  }, [isAuth, user?.id]);

  // Функция для получения заголовка в зависимости от активного раздела
  const getHeaderTitle = () => {
    if (isAdminPanelActive) return 'ADMIN DASHBOARD';
    if (showProfileSettings) return 'Управление аккаунтом';
    
    switch (activeView) {
      case 'profile': return 'Профиль пользователя';
      case 'partners': return 'Партнерская программа';
      case 'accounts': return 'Счета';
      case 'transactions': return 'Транзакции';
      case 'reports': return 'Отчеты';
      case 'documents': return 'Документы KYC';
      default: return 'Профиль пользователя';
    }
  };

  // Проверка whitelist администратора (без проверки аутентификации)
  useEffect(() => {
    console.log('Main: useEffect checkAdminStatus triggered', { isAuth, user: user?.email });
    
    const checkAdminStatus = async () => {
      try {
        console.log('Main: Начинаем проверку whitelist для пользователя:', user?.email);
        
        // Проверяем только whitelist
        const whitelistResult = await adminAuthService.checkWhitelist();
        console.log('Main: Результат проверки whitelist:', whitelistResult);
        
        setIsInWhitelist(whitelistResult.isAdmin);
        
        // Всегда сбрасываем аутентификацию при загрузке
        setIsAdminAuthenticated(false);
        setIsAdminPanelActive(false);
        
        console.log('Main: isInWhitelist установлен в:', whitelistResult.isAdmin);
      } catch (error) {
        console.error('Ошибка проверки админ-статуса:', error);
        setIsInWhitelist(false);
        setIsAdminAuthenticated(false);
      } finally {
        setAdminChecking(false);
        console.log('Main: Проверка whitelist завершена, adminChecking = false');
      }
    };

    if (isAuth && user) {
      console.log('Main: Пользователь авторизован, запускаем проверку whitelist');
      checkAdminStatus();
    } else {
      console.log('Main: Пользователь не авторизован, сбрасываем adminChecking');
      setAdminChecking(false);
    }
  }, [isAuth, user]);

  // Загрузка счетчика непрочитанных сообщений
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!isAuth) {
        console.log('⚠️ Main: Пропускаем загрузку счетчика - пользователь не авторизован');
        return;
      }
      
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.log('⚠️ Main: Пропускаем загрузку счетчика - токен отсутствует');
        return;
      }
      
      // Дополнительная проверка токена
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = tokenPayload.exp * 1000 < Date.now();
        if (isExpired) {
          console.log('⚠️ Main: Пропускаем загрузку счетчика - токен истек');
          return;
        }
      } catch {
        console.log('⚠️ Main: Пропускаем загрузку счетчика - токен невалиден');
        return;
      }
      
      // КЛИЕНТСКИЙ ИНТЕРФЕЙС: используем только API для клиентских сообщений
      // НЕ используем SupportContext (это админский интерфейс)
      try {
        console.log('🔄 Main: Запрос счетчика клиентских непрочитанных через API...');
        // Проверяем наличие токена перед запросом
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.log('Main: Токен отсутствует, пропускаем загрузку счетчика непрочитанных');
          return;
        }

        const response = await axiosAPI.get('/profile/notifications/unread/count');
        const result = response.data;
        console.log('📊 Main: Ответ от API (клиентские сообщения):', result);
        const total = result?.data?.total || result?.total || 0;
        
        console.log('✅ Main: Обновляем бейдж клиентских сообщений на:', total);
        setUnreadMessagesCount(total);
      } catch (error) {
        // Игнорируем 401 ошибки, они обрабатываются axios interceptor
        if (error.response?.status === 401) {
          console.log('Main: 401 ошибка при загрузке счетчика непрочитанных, токен будет обновлен автоматически');
          return;
        }
        console.error('❌ Main: Ошибка загрузки счетчика клиентских непрочитанных:', error);
      }
    };

    // Задержка для полной инициализации токена
    const timeoutId = setTimeout(() => {
      loadUnreadCount();
    }, 1000);

    // WebSocket слушатели для обновления счетчика КЛИЕНТСКИХ сообщений
    const handleRefresh = (event) => {
      console.log('📨 Main: Получено событие для обновления клиентского бейджа:', event.type);
      loadUnreadCount();
    };

    // Клиентские события
    document.addEventListener('main-notify-info-refresh', handleRefresh);
    document.addEventListener('main-notify-post-refresh', handleRefresh);
    document.addEventListener('client-messages-read', handleRefresh); // Клиентские сообщения прочитаны
    document.addEventListener('support-new-message', handleRefresh); // Новое сообщение от админа клиенту
    
    console.log('✅ Main: Слушатели установлены для обновления КЛИЕНТСКОГО бейджа');

    // Polling каждые 60 секунд (на случай если WS пропустит)
    const interval = setInterval(loadUnreadCount, 60000);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('main-notify-info-refresh', handleRefresh);
      document.removeEventListener('main-notify-post-refresh', handleRefresh);
      document.removeEventListener('client-messages-read', handleRefresh);
      document.removeEventListener('support-new-message', handleRefresh);
      clearInterval(interval);
    };
  }, [isAuth]); // Убираем зависимость от supportContext - это админский интерфейс

  // Загрузка количества непроверенных документов
  useEffect(() => {
    const loadPendingDocumentsCount = async () => {
      if (!isAdminPanelActive || !isAdminAuthenticated) {
        return;
      }
      
      // Добавляем небольшую задержку, чтобы убедиться, что админ полностью аутентифицирован
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const count = await adminService.getPendingDocumentsCount();
        console.log('Main: Получено количество непроверенных документов:', count);
        setPendingDocumentsCount(count);
      } catch (error) {
        console.error('Main: Ошибка загрузки количества непроверенных документов:', error);
        // При ошибке 401 (неавторизован) просто не показываем бейдж, не обновляем счетчик
        if (error?.response?.status !== 401) {
          // Для других ошибок устанавливаем 0
          setPendingDocumentsCount(0);
        }
      }
    };

    // Запускаем загрузку с небольшой задержкой после того, как админ аутентифицирован
    const timeoutId = setTimeout(() => {
      loadPendingDocumentsCount();
    }, 1000);

    // WebSocket слушатели для обновления количества непроверенных документов
    const handleDocumentUploaded = () => {
      console.log('📄 Main: Получено событие о загрузке документа, обновляем количество');
      loadPendingDocumentsCount();
    };

    const handleDocumentStatusUpdate = () => {
      console.log('📄 Main: Получено событие об обновлении статуса документа, обновляем количество');
      loadPendingDocumentsCount();
    };

    document.addEventListener('admin-document-uploaded', handleDocumentUploaded);
    document.addEventListener('admin-document-status-updated', handleDocumentStatusUpdate);

    // Polling каждые 30 секунд
    const interval = setInterval(loadPendingDocumentsCount, 30000);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('admin-document-uploaded', handleDocumentUploaded);
      document.removeEventListener('admin-document-status-updated', handleDocumentStatusUpdate);
      clearInterval(interval);
    };
  }, [isAdminPanelActive, isAdminAuthenticated]);
  
  // Загрузка счетчиков для админки (только если админ аутентифицирован)
  useEffect(() => {
    const loadAdminCounters = async () => {
      if (!isAdminPanelActive || !isAdminAuthenticated) {
        setSupportUnreadCount(0);
        setEmailUnreadCount(0);
        return;
      }
      
      try {
        // Загружаем счетчик непрочитанных сообщений в поддержке
        const supportResponse = await axiosAPI.get('/admin/support/conversations');
        const supportConversations = supportResponse.data.conversations || [];
        const supportTotal = supportConversations.reduce((sum, conv) => sum + (conv.unread_count_admin || 0), 0);
        setSupportUnreadCount(supportTotal);
        console.log('📊 Main: Обновлен счетчик непрочитанных сообщений в поддержке:', supportTotal);
      } catch (error) {
        console.error('❌ Main: Ошибка загрузки счетчика поддержки:', error);
        setSupportUnreadCount(0);
      }
      
      // Загружаем счетчик непрочитанных писем email
      try {
        const emailResponse = await axiosAPI.get('/admin/email/unread/count');
        const emailCount = emailResponse.data.count || 0;
        setEmailUnreadCount(emailCount);
        console.log('📊 Main: Обновлен счетчик непрочитанных писем:', emailCount);
      } catch (error) {
        console.error('❌ Main: Ошибка загрузки счетчика email:', error);
        setEmailUnreadCount(0);
      }
    };
    
    // Загружаем счетчики при входе в админку
    loadAdminCounters();
    
    // Polling каждые 30 секунд
    const interval = setInterval(loadAdminCounters, 30000);
    
    return () => {
      clearInterval(interval);
    };
  }, [isAdminPanelActive, isAdminAuthenticated]);

  // Эффект "грибов на поляне" - случайное появление кнопок навигации
  useEffect(() => {
    if (isAuth && user && !isChecking) {
      console.log('Main: Запускаем эффект "грибов на поляне"');
      
      // Создаем массив кнопок навигации
      const navItems = [
        'profile', 'partners', 'accounts', 
        'transactions', 'reports', 'documents'
      ];
      
      // Перемешиваем массив случайным образом
      const shuffledItems = [...navItems].sort(() => Math.random() - 0.5);
      console.log('Main: Случайный порядок кнопок:', shuffledItems);
      
      // Сбрасываем видимость всех кнопок
      setNavItemsVisible({});
      
      // Показываем кнопки по очереди с случайными задержками
      shuffledItems.forEach((item, index) => {
        const delay = Math.random() * 1000 + 200; // 200-1200ms
        const totalDelay = index * 300 + delay; // базовая задержка + случайная
        
        setTimeout(() => {
          //console.log(`Main: Показываем кнопку ${item} через ${totalDelay}ms`);
          setNavItemsVisible(prev => ({
            ...prev,
            [item]: true
          }));
        }, totalDelay);
      });
    }
  }, [isAuth, user, isChecking]);

  // Функция для переключения админ-панели
  const toggleAdminPanel = () => {
    if (isAdminPanelActive) {
      // Если панель активна - выходим из админки
      adminAuthService.logout();
      setIsAdminAuthenticated(false);
      setIsAdminPanelActive(false);
      setAdminMenuAccess(null);
      
      // Уведомляем WebSocket о переключении на пользовательскую роль
      websocketService.switchToUserRole();
      
     // console.log('Admin: Выход из админ-панели, переключаемся на пользовательскую роль');
    } else {
      // Если панель неактивна - всегда показываем форму входа
      adminAuthService.logout(); // Очищаем предыдущую сессию
      setIsAdminAuthenticated(false);
      setIsAdminPanelActive(true);
     // console.log('Admin: Показываем форму входа в админ-панель');
    }
  };

  // Обработчик успешного входа администратора
  const handleAdminLoginSuccess = async () => {
    setIsAdminAuthenticated(true);
    setIsAdminPanelActive(true);
    
    // Уведомляем WebSocket о переключении на административную роль
    websocketService.switchToAdminRole();
    
   // console.log('Admin: Успешный вход в админ-панель, переключаемся на административную роль');
    const adminDataRaw = sessionStorage.getItem('adminData');
    let roleKey = null;
    if (adminDataRaw) {
      try {
        const adminData = JSON.parse(adminDataRaw);
        roleKey = adminData?.role || null;
      } catch {
        roleKey = null;
      }
    }
    await loadAdminMenuAccess(roleKey);
  };

  const getCurrentAdminData = useCallback(() => {
    try {
      const adminDataRaw = sessionStorage.getItem('adminData');
      if (!adminDataRaw) return null;
      return JSON.parse(adminDataRaw);
    } catch (error) {
      console.error('Main: Ошибка чтения adminData', error);
      return null;
    }
  }, []);

  const computeMenuAccessFromPermissions = useCallback((permissionsObj = {}, roleKey = null) => {
    const result = {};
    ADMIN_MENU_CONFIG.forEach(item => {
      const permKey = item.permission;
      result[item.key] = permissionsObj[permKey] === true;
    });
    if (roleKey && !['ROOT', 'ADMIN'].includes(roleKey)) {
      result.security = false;
    }
    return result;
  }, []);

  const normalizeMenuAccess = useCallback((menu = [], access = {}, roleKey = null, permissionsObj = {}) => {
    const normalized = {};
    if (!menu || menu.length === 0) {
      return computeMenuAccessFromPermissions(permissionsObj, roleKey);
    }
    menu.forEach(item => {
      if (Object.prototype.hasOwnProperty.call(access, item.key)) {
        normalized[item.key] = access[item.key] === true;
      } else {
        const fallback = computeMenuAccessFromPermissions(permissionsObj, roleKey);
        normalized[item.key] = fallback[item.key];
      }
    });
    if (roleKey && !['ROOT', 'ADMIN'].includes(roleKey)) {
      normalized.security = false;
    }
    return normalized;
  }, [computeMenuAccessFromPermissions]);

  const loadAdminMenuAccess = useCallback(async (roleKey = null) => {
    try {
      const adminData = getCurrentAdminData();
      const currentRole = roleKey || adminData?.role || null;
      const permissionsObj = adminData?.permissions || {};

      let menu = [];
      let accessMap = {};

      try {
        const response = await securityService.getMenuAccess(currentRole);
        menu = response.menu || [];
        accessMap = response.menuAccess || {};
        console.log('Main: Меню роли', currentRole, menu);
        console.log('Main: Доступ к меню из БД', currentRole, accessMap);
      } catch (error) {
        console.warn('Main: Не удалось получить меню через API, используем локальные разрешения', error.message);
      }

      if (!menu.length) {
        menu = ADMIN_MENU_CONFIG;
      }

      setAdminMenuConfig(menu);
      const normalizedAccess = normalizeMenuAccess(menu, accessMap, currentRole, permissionsObj);
      console.log('Main: Итоговый доступ к меню', normalizedAccess);
      setAdminMenuAccess(normalizedAccess);
    } catch (error) {
      console.error('Main: Не удалось загрузить доступ к меню для роли', roleKey, error);
      const adminData = getCurrentAdminData();
      const currentRole = roleKey || adminData?.role || null;
      const permissionsObj = adminData?.permissions || {};
      setAdminMenuAccess(computeMenuAccessFromPermissions(permissionsObj, currentRole));
    }
  }, [getCurrentAdminData, normalizeMenuAccess]);

  useEffect(() => {
    const handler = async () => {
      try {
        const adminData = getCurrentAdminData();
        const currentRole = adminData?.role;
        if (!currentRole) return;
        await loadAdminMenuAccess(currentRole);
      } catch (error) {
        console.error('Main: Ошибка обработки admin-menu-access-updated', error);
      }
    };

    document.addEventListener('admin-menu-access-updated', handler);
    return () => {
      document.removeEventListener('admin-menu-access-updated', handler);
    };
  }, [getCurrentAdminData, loadAdminMenuAccess]);

  useEffect(() => {
    if (!adminMenuAccess) {
      return;
    }

    const firstAllowedItem = ADMIN_MENU_CONFIG.find(item => adminMenuAccess[item.key] === true);
    if (!firstAllowedItem) {
      return;
    }

    setAdminActiveView(prev => {
      if (prev && adminMenuAccess[prev] === true) {
        return prev;
      }
      return firstAllowedItem.key;
    });
  }, [adminMenuAccess]);

  // Формируем URL аватара
  let avatarUrl = '';
  if (user?.avatar && user.avatar !== 'noAvatar') {
    avatarUrl = user.avatar.startsWith('http') ? user.avatar : `${API_CONFIG.BASE_URL}${user.avatar}`;
   // console.log('Main: Используем аватар пользователя:', avatarUrl);
  } else if (user && !user.avatar) {
    // Если пользователь загружен, но аватар еще нет, показываем дефолтный
    avatarUrl = defaultAvatarUrl;
   // console.log('Main: Используем дефолтный аватар (нет аватара):', avatarUrl);
  } else {
   // console.log('Main: Пользователь не загружен или аватар отсутствует');
  }

  // Обработчик выхода
  const handleLogout = async () => {
    try {
     // console.log('Выход из системы...');
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };

  // Проверяем аутентификацию при загрузке компонента
  useEffect(() => {
    const checkUserAuth = () => {
      console.log('Main: Проверяем состояние аутентификации...');
      
      if (isAuth) {
        console.log('Main: Пользователь аутентифицирован, показываем личный кабинет');
        // setIsChecking уже false, не нужно устанавливать
        
        // Инициализируем WebSocket соединение только если не подключены
        console.log('🔌 Main: Проверяем статус WebSocket подключения...');
        const connectionStatus = websocketService.getConnectionStatus();
        console.log('🔌 Main: Статус подключения:', connectionStatus);
        
        if (!connectionStatus.isConnected) {
          console.log('🔌 Main: WebSocket не подключен, пытаемся подключиться...');
          websocketService.connect().then(connected => {
            if (connected) {
              console.log('🔌 Main: WebSocket connection established');
            } else {
              console.warn('🔌 Main: WebSocket connection failed');
            }
          });
        } else {
          console.log('🔌 Main: WebSocket уже подключен, пропускаем подключение');
        }
      } else {
        console.log('Main: Пользователь не аутентифицирован');
        // Отключаем WebSocket при выходе
        websocketService.disconnect();
        
        // Перенаправляем на логин только если мы НЕ на странице логина/регистрации
        if (!location.pathname.startsWith('/ref/') && 
            !location.pathname.includes('/login') && 
            !location.pathname.includes('/registration')) {
          console.log('Main: Перенаправляем на форму логина');
          navigate('/login');
        } else {
          console.log('Main: Находимся на странице логина/регистрации или реферальной, не перенаправляем');
        }
      }
    };

    // Запускаем проверку только если store готов и состояние аутентификации определено
    if (isAuth !== undefined) { // Проверяем, что состояние аутентификации инициализировано
      checkUserAuth(); // Вызываем функцию проверки аутентификации пользователя
    }
  }, [navigate, isAuth, location.pathname]); // Добавлена зависимость location.pathname для отслеживания изменений URL

  // Отдельный useEffect для обработки изменений URL
  useEffect(() => {
    // Логика для обработки изменений URL (если нужна)
    // Например, проверка реферальных ссылок или другие действия при смене роута
    console.log('Main: URL изменился на:', location.pathname);
  }, [location.pathname]);

  // Обработка отключения WebSocket при размонтировании
  useEffect(() => {
    return () => {
      websocketService.disconnect();
    };
  }, []);
  
  // WebSocket слушатели для обновления счетчиков админки
  useEffect(() => {
    if (!isAdminPanelActive || !isAdminAuthenticated) {
      return;
    }
    
    const socket = websocketService.getSocket();
    if (!socket) {
      return;
    }
    
    // Обработчик новых сообщений в поддержке
    const handleSupportNewMessage = (data) => {
      console.log('📨 Main: Получено WebSocket уведомление о новом сообщении в поддержке:', data);
      // Обновляем счетчик через API
      axiosAPI.get('/admin/support/conversations')
        .then(response => {
          const conversations = response.data.conversations || [];
          const total = conversations.reduce((sum, conv) => sum + (conv.unread_count_admin || 0), 0);
          setSupportUnreadCount(total);
          console.log('📊 Main: Обновлен счетчик непрочитанных сообщений в поддержке:', total);
        })
        .catch(error => {
          console.error('❌ Main: Ошибка обновления счетчика поддержки:', error);
        });
    };
    
    // Обработчик новых бесед в поддержке
    const handleSupportNewConversation = (data) => {
      console.log('📬 Main: Получено WebSocket уведомление о новой беседе:', data);
      // Обновляем счетчик через API
      axiosAPI.get('/admin/support/conversations')
        .then(response => {
          const conversations = response.data.conversations || [];
          const total = conversations.reduce((sum, conv) => sum + (conv.unread_count_admin || 0), 0);
          setSupportUnreadCount(total);
          console.log('📊 Main: Обновлен счетчик непрочитанных сообщений в поддержке:', total);
        })
        .catch(error => {
          console.error('❌ Main: Ошибка обновления счетчика поддержки:', error);
        });
    };
    
    // Обработчик обновления счетчиков email
    const handleEmailUnreadCounts = (data) => {
      console.log('📧 Main: Получено WebSocket уведомление о счетчиках email:', data);
      
      // Если есть totalUnread, используем его
      if (data.totalUnread !== undefined) {
        setEmailUnreadCount(data.totalUnread);
        console.log('📊 Main: Обновлен счетчик непрочитанных писем (из totalUnread):', data.totalUnread);
      } else if (data.action === 'recalculate') {
        // Если action = 'recalculate', пересчитываем счетчик на фронтенде
        console.log('📊 Main: Получен запрос на пересчет счетчика, загружаем данные с сервера...');
        axiosAPI.get('/admin/email/unread/count')
          .then(response => {
            const emailCount = response.data.count || 0;
            setEmailUnreadCount(emailCount);
            console.log('📊 Main: Пересчитан счетчик непрочитанных писем:', emailCount);
          })
          .catch(error => {
            console.error('❌ Main: Ошибка пересчета счетчика email:', error);
          });
      }
    };
    
    // Подписываемся на события
    socket.on('support_new_message', handleSupportNewMessage);
    socket.on('support_new_conversation', handleSupportNewConversation);
    socket.on('email:unread_counts_update', handleEmailUnreadCounts);
    
    console.log('✅ Main: WebSocket слушатели для админских счетчиков установлены');
    
    return () => {
      socket.off('support_new_message', handleSupportNewMessage);
      socket.off('support_new_conversation', handleSupportNewConversation);
      socket.off('email:unread_counts_update', handleEmailUnreadCounts);
    };
  }, [isAdminPanelActive, isAdminAuthenticated]);

       // Обработка принудительного завершения сессии
       useEffect(() => {
         const handleSessionTerminated = (event) => {
           console.log('Main: Сессия принудительно завершена:', event.detail);
           
           // Принудительно очищаем все состояния
           localStorage.clear();
           sessionStorage.clear();
           
           // Обновляем страницу для полной очистки состояния
           window.location.href = '/login';
         };

         document.addEventListener('session-terminated', handleSessionTerminated);

         return () => {
           document.removeEventListener('session-terminated', handleSessionTerminated);
         };
       }, []);

  // Синхронизируем активный раздел с URL
  useEffect(() => {
    const path = location.pathname || '';
    if (path.endsWith('/partners')) setActiveView('partners');
    else if (path.endsWith('/accounts')) setActiveView('accounts');
    else if (path.endsWith('/transactions')) setActiveView('transactions');
    else if (path.endsWith('/reports')) setActiveView('reports');
    else if (path.endsWith('/documents')) setActiveView('documents');
    else setActiveView('profile');
  }, [location.pathname]);

  // Обновляем аватары в DOM при изменении пользователя
  useEffect(() => {
    if (user && !isChecking) {
      console.log('Main: Пользователь загружен, обновляем аватары в DOM:', user);
      
      // Получаем функцию обновления аватаров из стора
      const updateAvatarsInDOM = useAuthStore.getState().updateAvatarsInDOM;
      
          if (user.avatar && user.avatar !== 'noAvatar') {
            let avatarUrl = user.avatar.startsWith('http') ? user.avatar : `${API_CONFIG.BASE_URL}${user.avatar}`;
            console.log('Main: Обновляем аватар пользователя в DOM:', avatarUrl);
            updateAvatarsInDOM(avatarUrl);
          } else {
            // Показываем дефолтный аватар
            const defaultAvatarUrlLocal = defaultAvatarUrl;
            console.log('Main: Обновляем дефолтный аватар в DOM:', defaultAvatarUrl);
            updateAvatarsInDOM(defaultAvatarUrlLocal);
          }
    }
  }, [user, isChecking]);

  // Убираем блокирующий экран загрузки - показываем интерфейс сразу

  return (
    <section className="root bg-color-main flex flex-row">
    <nav className="root-nav flex flex-column">
      <div className="root-nav-logo pointer">
        <div className="root-nav-logo-img img"></div>
      </div>

      <ul className="root-nav-list flex flex-column">
        <li className={`root-nav-item flex mushroom-grow ${navItemsVisible.profile ? 'visible' : 'hidden'} ${activeView === 'profile' ? 'active' : ''}`} onClick={() => { setActiveView('profile'); setShowProfileSettings(false); navigate('/personal-room'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-profile"></div>
        </li>

        <li className={`root-nav-item flex mushroom-grow ${navItemsVisible.partners ? 'visible' : 'hidden'} ${activeView === 'partners' ? 'active' : ''}`} onClick={() => { setActiveView('partners'); setShowProfileSettings(false); navigate('/personal-room/partners'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-partners"></div>
        </li>
        <li className={`root-nav-item flex mushroom-grow ${navItemsVisible.accounts ? 'visible' : 'hidden'} ${activeView === 'accounts' ? 'active' : ''}`} onClick={() => { setActiveView('accounts'); setShowProfileSettings(false); navigate('/personal-room/accounts'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-accounts"></div>
        </li>

        <li className={`root-nav-item flex mushroom-grow ${navItemsVisible.transactions ? 'visible' : 'hidden'} ${activeView === 'transactions' ? 'active' : ''}`} onClick={() => { setActiveView('transactions'); setShowProfileSettings(false); navigate('/personal-room/transactions'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-transactions"></div>
        </li>

        <li className={`root-nav-item flex mushroom-grow ${navItemsVisible.reports ? 'visible' : 'hidden'} ${activeView === 'reports' ? 'active' : ''}`} onClick={() => { setActiveView('reports'); setShowProfileSettings(false); navigate('/personal-room/reports'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-reports"></div>
        </li>

        <li className={`root-nav-item flex mushroom-grow ${navItemsVisible.documents ? 'visible' : 'hidden'} ${activeView === 'documents' ? 'active' : ''}`} onClick={() => { setActiveView('documents'); setShowProfileSettings(false); navigate('/personal-room/documents'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-documents"></div>
        </li>

        <div 
          className={`admin-button-container ${!adminChecking && isInWhitelist ? 'visible' : 'hidden'}`}
          onClick={toggleAdminPanel}
        >
          <RunAdminPanelButton isActive={isAdminPanelActive} />
        </div>

        {isAdminPanelActive && (
          <NavPanelAdmin 
            isActive={isAdminPanelActive} 
            activeView={adminActiveView}
            onViewChange={setAdminActiveView}
            menuAccess={adminMenuAccess || {}}
            pendingDocumentsCount={pendingDocumentsCount}
            supportUnreadCount={supportUnreadCount}
            emailUnreadCount={emailUnreadCount}
          />
        )}
      </ul>

      <div className="root-button-exit flex pointer" onClick={handleLogout}>
        <div className="root-button-exit-icon img root-button-exit-icon-img"></div>
      </div>
    </nav>

    <article className="root-content flex flex-column bru-max">
      <div className="root-content-container flex flex-column">
        <div className="root-header flex flex-row">
          <h1>{getHeaderTitle()}</h1>
          <div className="root-settings flex flex-row">
            <div 
              className="root-messages-icon flex pointer"
              onClick={() => setShowMessagesModal(true)}
              title="История сообщений"
              style={{ position: 'relative' }}
            >
              <div className="root-messages-icon-img img"></div>
              {unreadMessagesCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-5px',
                  right: '-5px',
                  background: '#f44336',
                  color: 'white',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  border: '2px solid #141414'
                }}>
                  {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
                </span>
              )}
            </div>

            <div className="root-avatarmini-icon flex pointer">
              <span className="root-avatarmini-icon-email">{user?.email || ''}</span>
              {avatarUrl && (
                <img
                  className="root-avatarmini-icon-img img"
                  src={avatarUrl}
                  onError={(e) => {
                    e.target.src = defaultAvatarUrl;
                  }}
                />
              )}
            </div>
          </div>
        </div>

{/* Notification */}
<ContainerNotification />
<InfoModal />

        <div className="main-content flex flex-column">
          {isAdminPanelActive && !isAdminAuthenticated && <AdminLogin onLoginSuccess={handleAdminLoginSuccess} />}
          {isAdminPanelActive && isAdminAuthenticated && adminActiveView === 'users' && <UsersList />}
          {isAdminPanelActive && isAdminAuthenticated && adminActiveView === 'security' && <SecurityDashboard />}
          {isAdminPanelActive && isAdminAuthenticated && adminActiveView === 'requests' && <UserRequests />}
          {isAdminPanelActive && isAdminAuthenticated && adminActiveView === 'monitoring' && <AccountsMonitoring />}
          {isAdminPanelActive && isAdminAuthenticated && adminActiveView === 'profitability' && <ProfitabilityCalculation />}
          {isAdminPanelActive && isAdminAuthenticated && adminActiveView === 'crm' && (
            <CRMProvider>
              <CRMMain />
            </CRMProvider>
          )}
          {isAdminPanelActive && isAdminAuthenticated && adminActiveView === 'email' && <EmailClient />}
          {!isAdminPanelActive && activeView === 'profile' && !showProfileSettings && <ProfileUser onSettingsClick={() => setShowProfileSettings(true)} />}
          {!isAdminPanelActive && activeView === 'profile' && showProfileSettings && <CorrectUserData onClose={() => setShowProfileSettings(false)} />}
          {!isAdminPanelActive && activeView === 'partners' && <PartnerProgs />}
          {!isAdminPanelActive && activeView === 'accounts' && <AccountsRoom />}
          {!isAdminPanelActive && activeView === 'transactions' && <TransactionRoom />}
          {!isAdminPanelActive && activeView === 'reports' && <ReportRoom />}
          {!isAdminPanelActive && activeView === 'documents' && <DocsRoom />}
        </div>
      </div>
    </article>

      {/* Модальное окно истории сообщений */}
      {showMessagesModal && (
        <MessagesModal onClose={() => {
          setShowMessagesModal(false);
          // Обновляем счетчик после закрытия модального окна
          const token = localStorage.getItem('accessToken');
          if (token) {
            axiosAPI.get('/profile/notifications/unread/count')
              .then(response => {
                const data = response.data;
                setUnreadMessagesCount(data?.total || 0);
              })
              .catch(err => {
                // Игнорируем 401 ошибки, они обрабатываются axios interceptor
                if (err.response?.status === 401) {
                  console.log('Main: 401 ошибка при обновлении счетчика, токен будет обновлен автоматически');
                  return;
                }
                console.error('Ошибка обновления счетчика:', err);
                setUnreadMessagesCount(0);
              });
          }
        }} />
      )}
  </section>
  );
}

export default Main