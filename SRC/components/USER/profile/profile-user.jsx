import "./profile-user.css";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "../../../JS/auth/store/store";
import CorrectUserData from "./correct-user-data/correct-user-data";

function ProfileUser({ onSettingsClick }) {
    
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);
  const [isCorrectOpen, setIsCorrectOpen] = useState(false);
  const [loginHistory, setLoginHistory] = useState([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logsLoaded, setLogsLoaded] = useState(false);

  // Получаем методы стора
  const isAuth = useAuthStore((s) => s.isAuth);
  const user = useAuthStore((s) => s.user);
  const fetchUserLogs = useAuthStore((s) => s.fetchUserLogs);

  // Данные пользователя для инпутов
  const fullName = [user?.surname, user?.firstname, user?.patronymic]
    .filter(Boolean)
    .join(" ");
  const phone = user?.phone ?? "";
  const email = user?.email ?? "";
  const telegram = user?.telegram ?? "";
  const geography = user?.geography ?? "";
  const dateBorn = user?.dateBorn ? new Date(user.dateBorn).toISOString().split('T')[0] : "";

  // Функция для загрузки истории входов
  const loadLoginHistory = useCallback(async () => {
    // Защита от множественных запросов
    if (isLoadingLogs || logsLoaded) {
      console.log('Пропускаем загрузку логов: isLoadingLogs =', isLoadingLogs, ', logsLoaded =', logsLoaded);
      return;
    }

    try {
      setIsLoadingLogs(true);
      console.log('=== НАЧАЛО ЗАГРУЗКИ ЛОГОВ ===');
      
      const response = await fetchUserLogs();
      console.log('Ответ от fetchUserLogs:', response);
      
      if (response?.logs && Array.isArray(response.logs)) {
        // Бэкенд уже отфильтровал логи входов, просто форматируем данные
        console.log('=== FORMATTING LOGS ===');
        console.log('All logs from backend:', response.logs);
        console.log('Total logs count:', response.logs.length);
        
        const loginLogs = response.logs.map(log => ({
          date: new Date(log.createdAt).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          }),
          time: new Date(log.createdAt).toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          userAgent: (log.userAgent || 'Unknown').substring(0, 10)
        }));
        
        console.log('Formatted login logs:', loginLogs);
        console.log('Login logs count:', loginLogs.length);
        
        setLoginHistory(loginLogs);
        setLogsLoaded(true); // Отмечаем, что логи загружены
      } else {
        console.log('Нет логов в ответе или неверный формат:', response);
        setLoginHistory([]);
        setLogsLoaded(true);
      }
    } catch (error) {
      console.error('Ошибка загрузки истории входов:', error);
      setLoginHistory([]);
      setLogsLoaded(true);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [isLoadingLogs, logsLoaded, fetchUserLogs]);


  // Проверяем аутентификацию при загрузке компонента
  useEffect(() => {
    const checkUserAuth = () => {

      // Если пользователь аутентифицирован, показываем личный кабинет
      if (isAuth) {
        setIsChecking(false);
      } else {
        navigate("/login");
      }
    };

    checkUserAuth();
  }, [navigate, isAuth]);

  // Загружаем историю входов после аутентификации
  useEffect(() => {
    console.log('=== EFFECT ЗАГРУЗКИ ЛОГОВ ===');
    console.log('isAuth:', isAuth);
    console.log('user:', user);
    console.log('logsLoaded:', logsLoaded);
    console.log('isLoadingLogs:', isLoadingLogs);
        
    if (isAuth && user) {
      // Проверяем наличие токена перед загрузкой логов
      const token = localStorage.getItem('accessToken');
      console.log('Токен в localStorage:', token ? 'найден' : 'не найден');
      
      if (token && !logsLoaded && !isLoadingLogs) {
        console.log('Запускаем загрузку логов...');
        loadLoginHistory();
      } else {
        console.log('Пропускаем загрузку логов:');
        console.log('- Токен:', token ? 'есть' : 'нет');
        console.log('- Логи загружены:', logsLoaded);
        console.log('- Загрузка в процессе:', isLoadingLogs);
      }
    }
  }, [isAuth, user, logsLoaded, isLoadingLogs, loadLoginHistory]);


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

  // Если открыта форма корректировки - показываем её вместо профиля
  if (isCorrectOpen) {
    return <CorrectUserData onClose={() => setIsCorrectOpen(false)} />
  }

  return (
    <div className="profile-container flex flex-column">
      <div className="profile-container-lineTop flex flex-row">
        <div className="profile-avatar gradient-border  bru-max">
          <img
            className="profile-avatar-img img"
            src={user?.avatar && user.avatar !== 'noAvatar' 
              ? (user.avatar.startsWith('http') ? user.avatar : `http://localhost:3000${user.avatar}`)
              : './SRC/IMG/male/ava.png'
            }
            alt="user-avatar"
          />
        </div>
        <div className="profile-personal-info gradient-border flex bru-max">
          <div className="profile-personal-info-panel flex flex-row">
            <div className="flex flex-column">
              <label htmlFor="profile-name" className="profile-label">
                Фамилия Имя Отчество
              </label>
              <div className="gradient-border bru">
                <input
                  type="text"
                  id="profile-name"
                  className="profile-input bru"
                  placeholder="Фамилия Имя Отчество"
                  value={fullName}
                  readOnly
                />
              </div>
            </div>

            <div className="flex flex-column">
              <label htmlFor="profile-phone" className="profile-label">
                Телефон
              </label>
              <div className="gradient-border bru">
                <input
                  type="tel"
                  id="profile-phone"
                  className="profile-input bru"
                  placeholder="Телефон"
                  value={phone}
                  readOnly
                />
              </div>
            </div>
            <div className="flex flex-column">
              <label htmlFor="profile-email" className="profile-label">
                Email
              </label>
              <div className="gradient-border bru">
                <input
                  type="email"
                  id="profile-email"
                  className="profile-input bru"
                  placeholder="Email"
                  value={email}
                  readOnly
                />
              </div>
            </div>
            <div className="flex flex-column">
              <label htmlFor="profile-telegram" className="profile-label">
                Telegram
              </label>
              <div className="gradient-border bru">
                <input
                  type="text"
                  id="profile-telegram"
                  className="profile-input bru"
                  placeholder="@Telegram"
                  value={telegram}
                  readOnly
                />
              </div>
            </div>
            <div className="flex flex-column">
              <label htmlFor="profile-geography" className="profile-label">
                Местоположение
              </label>
              <div className="gradient-border bru">
                <input
                  type="text"
                  id="profile-geography"
                  className="profile-input bru"
                  placeholder="Россия. Москва"
                  value={geography}
                  readOnly
                />
              </div>
            </div>
            <div className="flex flex-column">
              <label htmlFor="profile-dateborn" className="profile-label">
                Дата рождения
              </label>
              <div className="gradient-border bru">
                <input
                  type="date"
                  id="profile-dateborn"
                  className="profile-input bru"
                  placeholder="Дата рождения"
                  value={dateBorn}
                  readOnly
                />
              </div>
            </div>
          </div>
          <div className="profile-settenings-button flex bru" onClick={() => {
            if (onSettingsClick) {
              onSettingsClick();
            } else {
              setIsCorrectOpen(true);
            }
          }}>
            <div className="profile-settenings-button-img img"></div>
          </div>
        </div>
      </div>

      <div className="profile-container-lineDown flex flex-row">
        <div className="profile-history-entries flex flex-column gradient-border bru-max">
          <span className="profile-history-entries-title">История входов</span>
          <div className="profile-history-entries-list flex flex-column">
            {isLoadingLogs ? (
              <span className="">Загрузка...</span>
            ) : loginHistory.length > 0 ? (
              loginHistory.map((log, index) => (
                <span key={index} className="">
                  {log.date} в {log.time} {log.userAgent}
                </span>
              ))
            ) : (
              <span className="">Нет данных о входах (logsLoaded: {logsLoaded.toString()}, loginHistory.length: {loginHistory.length})</span>
            )}
          </div>
        </div>
        <div className="profile-support-service gradient-border flex flex-column bru-max">
          <span className="profile-support-service-title">
            Служба
            <br />
            поддержки ITC
          </span>
          <span className="profile-support-service-text">
            Мы всегда готовы помочь вам с любыми вопросами и проблемами.
            <br />
            <br />
            Вы можете связаться с нашей командой поддержки, получить
            консультацию или найти ответы на часто задаваемые вопросы.
          </span>

          <div className="profile-support-service-button gradient-border flex bru-min">
            Задать вопрос
          </div>
          <div className="profile-support-service-button gradient-border flex bru-min">
            Партнерская программа
          </div>
        </div>
        <div className="profile-itcclub-form bg-color-lilac flex flex-column bru-max">
          <div className="profile-itcclub-form-logo">
            <div className="profile-itcclub-form-logo-img img"></div>
          </div>
          <div className="profile-itcclub-form-button gradient-border bg-color-lilac bru-min">
            активиировать
          </div>
        </div>
      </div>
    {isCorrectOpen && <CorrectUserData />}
    </div>
  );
}

export default ProfileUser;
