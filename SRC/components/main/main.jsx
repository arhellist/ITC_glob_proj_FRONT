import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../JS/auth/store/store";
import ProfileUser from "../USER/profile/profile-user";
import CorrectUserData from "../USER/profile/correct-user-data/correct-user-data";
import PartnerProgs from "../USER/partner-progs/partner-progs";
import AccountsRoom from "../USER/accounts-room/accounts-room";
import TransactionRoom from "../USER/transaction-room/transaction-room.jsx";
import ReportRoom from "../USER/report-room/report-room.jsx";
import DocsRoom from "../USER/docs-room/docs-room.jsx";
import ContainerNotification from "../USER/accounts-room/modal-window-account-room/container-notification.jsx";
import InfoModal from "../USER/accounts-room/modal-window-account-room/info-modal.jsx";
import websocketService from "../../JS/websocket/websocket-service.js";

function Main() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [activeView, setActiveView] = useState('profile'); // 'profile' | 'partners' | 'accounts' | 'transactions' | 'reports' | 'documents'
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  
  // Получаем методы стора
  const isAuth = useAuthStore(s => s.isAuth);
  const logout = useAuthStore(s => s.logout);
  const user = useAuthStore(s => s.user);

  // Функция для получения заголовка в зависимости от активного раздела
  const getHeaderTitle = () => {
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

  // Собираем корректный URL аватара
  const baseURL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ? import.meta.env.VITE_API_URL : 'http://localhost:3000';
  
  // Формируем URL аватара
  let avatarUrl = '';
  if (user?.avatar && user.avatar !== 'noAvatar') {
    avatarUrl = user.avatar.startsWith('http') ? user.avatar : `${baseURL}${user.avatar}`;
    console.log('Main: Используем аватар пользователя:', avatarUrl);
  } else if (user && !user.avatar) {
    // Если пользователь загружен, но аватар еще нет, показываем дефолтный
    avatarUrl = `${baseURL}/public/users/noAvatar.png`;
    console.log('Main: Используем дефолтный аватар:', avatarUrl);
  } else {
    console.log('Main: Пользователь не загружен или аватар отсутствует');
  }

  // Обработчик выхода
  const handleLogout = async () => {
    try {
      console.log('Выход из системы...');
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
        setIsChecking(false);
        
        // Инициализируем WebSocket соединение
        websocketService.connect().then(connected => {
          if (connected) {
            console.log('WebSocket connection established');
          } else {
            console.warn('WebSocket connection failed');
          }
        });
      } else {
        console.log('Main: Пользователь не аутентифицирован');
        // Отключаем WebSocket при выходе
        websocketService.disconnect();
        
        // Не перенаправляем, если мы на реферальной странице
        if (!location.pathname.startsWith('/ref/')) {
          console.log('Main: Перенаправляем на форму логина');
          navigate('/login');
        } else {
          console.log('Main: Находимся на реферальной странице, не перенаправляем');
        }
      }
    };

    checkUserAuth();
  }, [navigate, isAuth, location.pathname]);

  // Обработка отключения WebSocket при размонтировании
  useEffect(() => {
    return () => {
      websocketService.disconnect();
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
        let avatarUrl = user.avatar.startsWith('http') ? user.avatar : `${baseURL}${user.avatar}`;
        console.log('Main: Обновляем аватар пользователя в DOM:', avatarUrl);
        updateAvatarsInDOM(avatarUrl);
      } else {
        // Показываем дефолтный аватар
        const defaultAvatarUrl = `${baseURL}/public/users/noAvatar.png`;
        console.log('Main: Обновляем дефолтный аватар в DOM:', defaultAvatarUrl);
        updateAvatarsInDOM(defaultAvatarUrl);
      }
    }
  }, [user, isChecking, baseURL]);

  // Показываем загрузку пока проверяем аутентификацию
  if (isChecking) {
    return (
      <section className="root bg-color-main flex flex-row">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          width: '100%',
          color: 'white',
          fontSize: '18px'
        }}>
          Проверка доступа...
        </div>
      </section>
    );
  }

  return (
    <section className="root bg-color-main flex flex-row">
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
            <div className="root-messages-icon flex pointer">
              <div className="root-messages-icon-img img"></div>
            </div>

            <div className="root-avatarmini-icon flex pointer">
              <span className="root-avatarmini-icon-email">{user?.email || ''}</span>
              {avatarUrl && (
                <img
                  className="root-avatarmini-icon-img img"
                  src={avatarUrl}
                />
              )}
            </div>
          </div>
        </div>

{/* Notification */}
<ContainerNotification />
<InfoModal />

        <div className="main-content flex flex-column">
          {activeView === 'profile' && !showProfileSettings && <ProfileUser onSettingsClick={() => setShowProfileSettings(true)} />}
          {activeView === 'profile' && showProfileSettings && <CorrectUserData onClose={() => setShowProfileSettings(false)} />}
          {activeView === 'partners' && <PartnerProgs />}
          {activeView === 'accounts' && <AccountsRoom />}
          {activeView === 'transactions' && <TransactionRoom />}
          {activeView === 'reports' && <ReportRoom />}
          {activeView === 'documents' && <DocsRoom />}
        </div>
      </div>
    </article>
  </section>
  );
}

export default Main