import { useCallback, useEffect, useMemo, useState, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../JS/auth/store/store";
import { API_CONFIG } from "../../config/api.js";
import axiosAPI from "../../JS/auth/http/axios";
import websocketService from "../../JS/websocket/websocket-service.js";
import defaultAvatarUrl from "../../IMG/male/ava.png";
import { CRMProvider } from "../../contexts/CRMContext.jsx";
import adminAuthService from "../../JS/services/admin-auth-service.js";
import securityService from "../../JS/services/security-service.js";
import adminService from "../../JS/services/admin-service.js";
import { initializeBehavioralBiometrics, getBehavioralBiometricsCollector } from "../../utils/behavioral-biometrics-collector.js";

// Ленивая загрузка пользовательских компонентов
const ProfileUser = lazy(() => import("../USER/profile/profile-user"));
const CorrectUserData = lazy(() => import("../USER/profile/correct-user-data/correct-user-data"));
const PartnerProgs = lazy(() => import("../USER/partner-progs/partner-progs"));
const AccountsRoom = lazy(() => import("../USER/accounts-room/accounts-room"));
const TransactionRoom = lazy(() => import("../USER/transaction-room/transaction-room.jsx"));
const ReportRoom = lazy(() => import("../USER/report-room/report-room.jsx"));
const DocsRoom = lazy(() => import("../USER/docs-room/docs-room.jsx"));
const ContainerNotification = lazy(() => import("../USER/accounts-room/modal-window-account-room/container-notification.jsx"));
const InfoModal = lazy(() => import("../USER/accounts-room/modal-window-account-room/info-modal.jsx"));
const MessagesModal = lazy(() => import("../USER/messages-modal/MessagesModal.jsx"));
const PublicationsModal = lazy(() => import("../USER/publications-modal/PublicationsModal.jsx"));

// Ленивая загрузка админских компонентов
const RunAdminPanelButton = lazy(() => import("../ADMIN/admBTN/admBTN.jsx"));
const NavPanelAdmin = lazy(() => import("../ADMIN/nav/nav.jsx"));
const UsersList = lazy(() => import("../ADMIN/users-list/users-list.jsx"));
const AdminLogin = lazy(() => import("../ADMIN/login/admin-login.jsx"));
const SecurityDashboard = lazy(() => import("../ADMIN/security-dashboard/security-dashboard.jsx"));
const UserRequests = lazy(() => import("../ADMIN/user-requests/user-requests.jsx"));
const AccountsMonitoring = lazy(() => import("../ADMIN/accounts-monitoring/accounts-monitoring.jsx"));
const ProfitabilityCalculation = lazy(() => import("../ADMIN/profitability-calculation/profitability-calculation.jsx"));
const CRMMain = lazy(() => import("../ADMIN/crm/crm-main.jsx"));
const EmailClient = lazy(() => import("../ADMIN/email/EmailClient.jsx"));

// Компонент загрузки для Suspense
const ComponentLoader = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '200px',
    fontSize: '16px',
    color: '#666'
  }}>
    Загрузка...
  </div>
);

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
  // Кнопки видимы сразу, не используем состояние для управления видимостью
  const [adminActiveView, setAdminActiveView] = useState('users');
  const [showMessagesModal, setShowMessagesModal] = useState(false);
  const [showPublicationsModal, setShowPublicationsModal] = useState(false);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [unviewedPublicationsCount, setUnviewedPublicationsCount] = useState(0);
  const [adminMenuAccess, setAdminMenuAccess] = useState(null);
  const [adminMenuConfig, setAdminMenuConfig] = useState([]);
  const [pendingDocumentsCount, setPendingDocumentsCount] = useState(0);
  const [supportUnreadCount, setSupportUnreadCount] = useState(0);
  const [emailUnreadCount, setEmailUnreadCount] = useState(0);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showNavigation, setShowNavigation] = useState(false); // Для мобильной навигации (как в миниапке)
  
  // Получаем методы стора
  const isAuth = useAuthStore(s => s.isAuth);
  const logout = useAuthStore(s => s.logout);
  const user = useAuthStore(s => s.user);
  
  // Массив кнопок навигации для мобильной версии (как в миниапке)
  const navigationButtons = [
    { id: 'profile', label: 'Профиль', iconClass: 'root-nav-icon-profile', path: '/personal-room' },
    { id: 'partners', label: 'Партнеры', iconClass: 'root-nav-icon-partners', path: '/personal-room/partners' },
    { id: 'accounts', label: 'Счета', iconClass: 'root-nav-icon-accounts', path: '/personal-room/accounts' },
    { id: 'transactions', label: 'Транзакции', iconClass: 'root-nav-icon-transactions', path: '/personal-room/transactions' },
    { id: 'reports', label: 'Отчеты', iconClass: 'root-nav-icon-reports', path: '/personal-room/reports' },
    { id: 'documents', label: 'Документы', iconClass: 'root-nav-icon-documents', path: '/personal-room/documents' },
  ];
  
  // Функция обработки навигации для мобильной версии (как в миниапке)
  const handleMobileNavigation = (path) => {
    navigate(path);
    setShowNavigation(false);
    // Обновляем activeView на основе пути
    if (path.includes('/partners')) setActiveView('partners');
    else if (path.includes('/accounts')) setActiveView('accounts');
    else if (path.includes('/transactions')) setActiveView('transactions');
    else if (path.includes('/reports')) setActiveView('reports');
    else if (path.includes('/documents')) setActiveView('documents');
    else if (path.includes('/admin')) setActiveView('admin');
    else {
      setActiveView('profile');
      setShowProfileSettings(false);
    }
  };
  
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
            // Проверяем наличие токена перед отправкой
            const token = localStorage.getItem('accessToken');
            if (isAuth && user?.id && token) {
              try {
                const result = await collector.sendDataForAnalysis(user.id);
                if (result?.analysis?.isSuspicious) {
                  console.warn('⚠️ Behavioral Biometrics: Обнаружена подозрительная активность', result.analysis);
                }
                // Очищаем данные после отправки
                collector.clearAllData();
              } catch (error) {
                // Игнорируем 401 ошибки - они обрабатываются axios interceptor'ом
                if (error.response?.status !== 401) {
                  console.error('Ошибка отправки Behavioral Biometrics данных:', error);
                }
              }
            }
          }, 5 * 60 * 1000); // 5 минут

          // Отправка данных при размонтировании компонента
          return () => {
            clearInterval(analysisInterval);
            const token = localStorage.getItem('accessToken');
            if (isAuth && user?.id && token) {
              collector.sendDataForAnalysis(user.id).catch((error) => {
                // Игнорируем 401 ошибки при размонтировании
                if (error.response?.status !== 401) {
                  console.error('Ошибка отправки Behavioral Biometrics данных при размонтировании:', error);
                }
              });
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

  // Единая загрузка всех начальных данных параллельно
  useEffect(() => {
    if (!isAuth || !user) {
      setIsInitialLoading(false);
      setAdminChecking(false);
      return;
    }

    const loadInitialData = async () => {
      try {
        console.log('Main: Начинаем параллельную загрузку всех данных...');
        
        // Загружаем все данные параллельно
        const [whitelistResult, unreadCountResult, unviewedPublicationsResult] = await Promise.allSettled([
          adminAuthService.checkWhitelist().catch(err => {
            console.error('Ошибка проверки whitelist:', err);
            return { isAdmin: false };
          }),
          axiosAPI.get('/profile/notifications/unread/count').catch(err => {
            if (err.response?.status === 401) {
              return { data: { total: 0 } };
            }
            console.error('Ошибка загрузки счетчика:', err);
            return { data: { total: 0 } };
          }),
          axiosAPI.get('/profile/publications/unviewed/count').catch(err => {
            if (err.response?.status === 401) {
              return { data: { count: 0 } };
            }
            console.error('Ошибка загрузки счетчика публикаций:', err);
            return { data: { count: 0 } };
          })
        ]);

        // Обрабатываем результаты
        if (whitelistResult.status === 'fulfilled') {
          const result = whitelistResult.value;
          setIsInWhitelist(result.isAdmin);
          console.log('Main: isInWhitelist установлен в:', result.isAdmin);
        } else {
          setIsInWhitelist(false);
        }

        if (unreadCountResult.status === 'fulfilled') {
          const result = unreadCountResult.value.data;
          const total = result?.data?.total || result?.total || 0;
          setUnreadMessagesCount(total);
          console.log('✅ Main: Обновляем бейдж клиентских сообщений на:', total);
        }

        if (unviewedPublicationsResult.status === 'fulfilled') {
          const result = unviewedPublicationsResult.value.data;
          const count = result?.data?.count || result?.count || 0;
          setUnviewedPublicationsCount(count);
          console.log('✅ Main: Обновляем бейдж публикаций на:', count);
        }

        setIsAdminAuthenticated(false);
        setIsAdminPanelActive(false);
        setAdminChecking(false);
        
        console.log('Main: Все начальные данные загружены');
      } catch (error) {
        console.error('Ошибка загрузки начальных данных:', error);
        setIsInWhitelist(false);
        setIsAdminAuthenticated(false);
        setAdminChecking(false);
      } finally {
        setIsInitialLoading(false);
        // Видимость кнопок устанавливается в отдельном useEffect для одновременной анимации
      }
    };

    loadInitialData();
  }, [isAuth, user]);

  // Функция для загрузки счетчика непросмотренных публикаций
  const loadUnviewedPublicationsCount = async () => {
    try {
      const response = await axiosAPI.get('/profile/publications/unviewed/count');
      const data = response.data;
      const count = data?.data?.count || data?.count || 0;
      setUnviewedPublicationsCount(count);
    } catch (error) {
      if (error.response?.status !== 401) {
        console.error('Ошибка загрузки счетчика публикаций:', error);
      }
      setUnviewedPublicationsCount(0);
    }
  };

  // Периодическое обновление счетчика непрочитанных (после начальной загрузки)
  useEffect(() => {
    if (!isAuth || isInitialLoading) return;

    const loadUnreadCount = async () => {
      try {
        const [notificationsResponse, publicationsResponse] = await Promise.all([
          axiosAPI.get('/profile/notifications/unread/count').catch(() => ({ data: { total: 0 } })),
          axiosAPI.get('/profile/publications/unviewed/count').catch(() => ({ data: { count: 0 } }))
        ]);
        
        const notificationsTotal = notificationsResponse.data?.data?.total || notificationsResponse.data?.total || 0;
        const publicationsCount = publicationsResponse.data?.data?.count || publicationsResponse.data?.count || 0;
        
        setUnreadMessagesCount(notificationsTotal);
        setUnviewedPublicationsCount(publicationsCount);
      } catch (error) {
        if (error.response?.status !== 401) {
          console.error('Ошибка загрузки счетчиков:', error);
        }
      }
    };

    // Первое обновление через 5 секунд после начальной загрузки
    const timeoutId = setTimeout(loadUnreadCount, 5000);

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

    // Обновляем счетчики при возврате на вкладку/в окно (чтобы бейдж публикаций загорался быстрее)
    const handleFocus = () => loadUnreadCount();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadUnreadCount();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('main-notify-info-refresh', handleRefresh);
      document.removeEventListener('main-notify-post-refresh', handleRefresh);
      document.removeEventListener('client-messages-read', handleRefresh);
      document.removeEventListener('support-new-message', handleRefresh);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
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

  // Кнопки видимы сразу, не ждем загрузки данных

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
        setIsInitialLoading(false);
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

  // WebSocket: обновляем бейдж публикаций у онлайн пользователя сразу после создания публикации
  useEffect(() => {
    if (!isAuth) return;
    let socket = null;
    let intervalId = null;
    const handler = () => {
      // Сразу обновляем счетчик непросмотренных публикаций
      loadUnviewedPublicationsCount();
    };

    const tryAttach = () => {
      socket = websocketService.getSocket();
      if (!socket || !socket.connected) return;
      // чтобы не навесить несколько раз
      socket.off('publications:new', handler);
      socket.on('publications:new', handler);
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    tryAttach();
    intervalId = setInterval(tryAttach, 500);

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (socket) socket.off('publications:new', handler);
    };
  }, [isAuth]);

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
    if (user && !isInitialLoading) {
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
  }, [user, isInitialLoading]);

  // Показываем индикатор загрузки до полной готовности
  if (isAuth && isInitialLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '18px',
        color: '#666',
        backgroundColor: 'var(--bg-color-main)'
      }}>
        Загрузка...
      </div>
    );
  }

  return (
    <section className="root bg-color-main flex flex-row">
    {/* Мобильный хедер (показывается только на мобильных через CSS) */}
    <header className="root-header-mobile">
      <div className="root-header-logo">
        <div className="root-header-logo-img img"></div>
      </div>
      <div className="root-header-icons flex flex-row">
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
        <div 
          className="root-publications-icon flex pointer"
          onClick={() => {
            // На всякий случай обновим бейдж перед открытием
            loadUnviewedPublicationsCount();
            setShowPublicationsModal(true);
          }}
          title="Публикации"
          style={{ position: 'relative' }}
        >
          <div className="root-publications-icon-img img"></div>
          {unviewedPublicationsCount > 0 && (
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
              {unviewedPublicationsCount > 99 ? '99+' : unviewedPublicationsCount}
            </span>
          )}
        </div>
        <button 
          className="root-burger-menu"
          onClick={() => {
            console.log('Burger clicked'); // Debug log
            setShowNavigation(!showNavigation);
          }}
          aria-label="Меню"
        >
          <span className={`burger-line ${showNavigation ? 'open' : ''}`}></span>
          <span className={`burger-line ${showNavigation ? 'open' : ''}`}></span>
          <span className={`burger-line ${showNavigation ? 'open' : ''}`}></span>
        </button>
      </div>
    </header>

    {/* Страница навигации для мобильных (показывается только на мобильных через CSS) */}
    {showNavigation && (
      <div className="root-navigation-page">
        <div className="root-navigation-grid">
          {navigationButtons.map((button) => (
            <button
              key={button.id}
              className="root-nav-button"
              onClick={() => handleMobileNavigation(button.path)}
            >
              <div className={`root-nav-button-icon img ${button.iconClass}`}></div>
              <div className="root-nav-button-label">{button.label}</div>
            </button>
          ))}
          {/* Кнопка АДМИН (только для админов) */}
          {!adminChecking && isInWhitelist && (
            <button
              className="root-nav-button root-admin-button-wrapper"
              onClick={() => {
                toggleAdminPanel();
                setShowNavigation(false);
              }}
            >
              <div className="root-admin-button-circle">
                <div className="root-admin-button-icons a img"></div>
                <div className="root-admin-button-icons d img"></div>
                <div className="root-admin-button-icons m img"></div>
                <div className="root-admin-button-icons i img"></div>
                <div className="root-admin-button-icons n img"></div>
              </div>
              <div className="root-nav-button-label">АДМИН</div>
            </button>
          )}
          {/* Кнопка выхода */}
          <button
            className="root-nav-button"
            onClick={() => {
              handleLogout();
              setShowNavigation(false);
            }}
          >
            <div className="root-nav-button-icon img root-nav-icon-exit"></div>
            <div className="root-nav-button-label">ВЫХОД</div>
          </button>
        </div>
      </div>
    )}

    <nav className="root-nav flex flex-column">
      <div className="root-nav-logo pointer">
        <div className="root-nav-logo-img img"></div>
      </div>

      <ul className="root-nav-list flex flex-column">
        <li className={`root-nav-item flex ${activeView === 'profile' ? 'active' : ''}`} onClick={() => { setActiveView('profile'); setShowProfileSettings(false); navigate('/personal-room'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-profile"></div>
        </li>

        <li className={`root-nav-item flex ${activeView === 'partners' ? 'active' : ''}`} onClick={() => { setActiveView('partners'); setShowProfileSettings(false); navigate('/personal-room/partners'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-partners"></div>
        </li>
        <li className={`root-nav-item flex ${activeView === 'accounts' ? 'active' : ''}`} onClick={() => { setActiveView('accounts'); setShowProfileSettings(false); navigate('/personal-room/accounts'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-accounts"></div>
        </li>

        <li className={`root-nav-item flex ${activeView === 'transactions' ? 'active' : ''}`} onClick={() => { setActiveView('transactions'); setShowProfileSettings(false); navigate('/personal-room/transactions'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-transactions"></div>
        </li>

        <li className={`root-nav-item flex ${activeView === 'reports' ? 'active' : ''}`} onClick={() => { setActiveView('reports'); setShowProfileSettings(false); navigate('/personal-room/reports'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-reports"></div>
        </li>

        <li className={`root-nav-item flex ${activeView === 'documents' ? 'active' : ''}`} onClick={() => { setActiveView('documents'); setShowProfileSettings(false); navigate('/personal-room/documents'); }}>
          <div className="root-nav-item-icon pointer img root-nav-item-documents"></div>
        </li>

        <div 
          className={`admin-button-container ${!adminChecking && isInWhitelist ? 'visible' : 'hidden'}`}
          onClick={toggleAdminPanel}
        >
          <Suspense fallback={null}>
            <RunAdminPanelButton isActive={isAdminPanelActive} />
          </Suspense>
        </div>

        {isAdminPanelActive && (
          <Suspense fallback={<ComponentLoader />}>
            <NavPanelAdmin 
              isActive={isAdminPanelActive} 
              activeView={adminActiveView}
              onViewChange={setAdminActiveView}
              menuAccess={adminMenuAccess || {}}
              pendingDocumentsCount={pendingDocumentsCount}
              supportUnreadCount={supportUnreadCount}
              emailUnreadCount={emailUnreadCount}
            />
          </Suspense>
        )}
      </ul>

      <div className="root-button-exit flex pointer" onClick={handleLogout}>
        <div className="root-button-exit-icon img root-button-exit-icon-img"></div>
      </div>
    </nav>

    <article className={`root-content flex flex-column bru-max ${showNavigation ? 'show-navigation' : ''}`}>
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
            <div 
              className="root-publications-icon flex pointer"
              onClick={() => {
                loadUnviewedPublicationsCount();
                setShowPublicationsModal(true);
              }}
              title="Публикации"
              style={{ position: 'relative' }}
            >
              <div className="root-publications-icon-img img"></div>
              {unviewedPublicationsCount > 0 && (
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
                  {unviewedPublicationsCount > 99 ? '99+' : unviewedPublicationsCount}
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
        <Suspense fallback={null}>
          <ContainerNotification />
          <InfoModal />
        </Suspense>

        <div className="main-content flex flex-column">
          <Suspense fallback={<ComponentLoader />}>
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
            {!isAdminPanelActive && activeView === 'profile' && !showProfileSettings && <ProfileUser onSettingsClick={() => setShowProfileSettings(true)} onOpenMessagesModal={(openNewMessageForm) => {
              setShowMessagesModal(true);
              // Сохраняем флаг для автоматического открытия формы нового обращения
              if (openNewMessageForm) {
                setTimeout(() => {
                  window.dispatchEvent(new CustomEvent('open-new-message-form'));
                }, 100);
              }
            }} />}
            {!isAdminPanelActive && activeView === 'profile' && showProfileSettings && <CorrectUserData onClose={() => setShowProfileSettings(false)} />}
            {!isAdminPanelActive && activeView === 'partners' && <PartnerProgs />}
            {!isAdminPanelActive && activeView === 'accounts' && <AccountsRoom />}
            {!isAdminPanelActive && activeView === 'transactions' && <TransactionRoom />}
            {!isAdminPanelActive && activeView === 'reports' && <ReportRoom />}
            {!isAdminPanelActive && activeView === 'documents' && <DocsRoom />}
          </Suspense>
        </div>
      </div>
    </article>

      {/* Модальное окно истории сообщений */}
      {showMessagesModal && (
        <Suspense fallback={<ComponentLoader />}>
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
        </Suspense>
      )}

      {/* Модальное окно публикаций */}
      {showPublicationsModal && (
        <Suspense fallback={<ComponentLoader />}>
          <PublicationsModal onClose={() => {
            setShowPublicationsModal(false);
            // Обновляем счетчик непросмотренных публикаций после закрытия модального окна
            loadUnviewedPublicationsCount();
          }} />
        </Suspense>
      )}
  </section>
  );
}

export default Main