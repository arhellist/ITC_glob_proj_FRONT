import "./profile-user.css"; // Импорт CSS стилей для компонента профиля пользователя
import { useNavigate } from "react-router-dom"; // Импорт хука для программной навигации
import { useState, useEffect, useCallback, useRef } from "react"; // Импорт React хуков для состояния, эффектов и колбэков
import { useAuthStore } from "../../../JS/auth/store/store"; // Импорт Zustand store для управления аутентификацией
import { API_CONFIG } from "../../../config/api.js"; // Импорт конфигурации API
import CorrectUserData from "./correct-user-data/correct-user-data"; // Импорт компонента редактирования данных пользователя
import defaultAvatarUrl from "../../../IMG/male/ava.png"; // Импорт изображения аватара по умолчанию
import userService from "../../../JS/services/user-service.js";
import axiosAPI from "../../../JS/auth/http/axios.js"; // Импорт сервиса для работы с подписками

function ProfileUser({ onSettingsClick, onOpenMessagesModal }) { // Компонент профиля пользователя принимает колбэк для открытия настроек
    
  const navigate = useNavigate(); // Хук для программной навигации между страницами
  const [isChecking, setIsChecking] = useState(true); // Состояние проверки аутентификации
  const [isCorrectOpen, setIsCorrectOpen] = useState(false); // Состояние открытия формы редактирования данных
  const [loginHistory, setLoginHistory] = useState([]); // Массив истории входов пользователя
  const [isLoadingLogs, setIsLoadingLogs] = useState(false); // Флаг загрузки логов входа
  const [logsLoaded, setLogsLoaded] = useState(false); // Флаг успешной загрузки логов
  const [subscriptionsModalOpen, setSubscriptionsModalOpen] = useState(false); // Состояние модального окна подписок
  const [userSubscriptions, setUserSubscriptions] = useState([]); // Активные подписки пользователя
  const [availableSubscriptions, setAvailableSubscriptions] = useState([]); // Доступные подписки
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false); // Флаг загрузки подписок
  const [subscriptionsLoadedOnce, setSubscriptionsLoadedOnce] = useState(false); // Флаг первоначальной загрузки подписок для кнопки
  const loadingSubscriptionsRef = useRef(false); // Ref для проверки загрузки без перерендеринга
  const [subscriptionDetailModalOpen, setSubscriptionDetailModalOpen] = useState(false); // Состояние модального окна детализации подписки
  const [selectedSubscription, setSelectedSubscription] = useState(null); // Выбранная подписка для детализации
  const [promoSliderIndex, setPromoSliderIndex] = useState(0); // Индекс текущего промо-материала в слайдере
  const [subscriptionPaymentModalOpen, setSubscriptionPaymentModalOpen] = useState(false); // Состояние модального окна выбора счета для оплаты подписки
  const [userAccounts, setUserAccounts] = useState([]); // Счета пользователя
  const [selectedAccountId, setSelectedAccountId] = useState(null); // Выбранный счет для оплаты
  const [accountValidation, setAccountValidation] = useState(null); // Результат валидации счета
  const [validatingAccount, setValidatingAccount] = useState(false); // Флаг валидации счета

  // Получаем методы и данные из Zustand store
  const isAuth = useAuthStore((s) => s.isAuth); // Получаем состояние аутентификации
  const user = useAuthStore((s) => s.user); // Получаем данные пользователя
  const fetchUserLogs = useAuthStore((s) => s.fetchUserLogs); // Получаем функцию загрузки логов

  // Данные пользователя для инпутов
  const fullName = [user?.surname, user?.firstname, user?.patronymic]
    .filter(Boolean)
    .join(" ");
  const phone = user?.phone ?? "";
  const email = user?.email ?? "";
  // Очищаем telegram от токенов (REVOKE_TOKEN или TOKEN)
  const telegram = user?.telegram ? user.telegram.split('|REVOKE_TOKEN:')[0].split('|TOKEN:')[0].trim() : "";
  const geography = user?.geography ?? "";
  const dateBorn = user?.dateBorn ? new Date(user.dateBorn).toISOString().split('T')[0] : "";

  // Функция для загрузки истории входов
  const loadLoginHistory = useCallback(async () => {
    // Защита от множественных запросов
    if (isLoadingLogs || logsLoaded) {
      console.log('Пропускаем загрузку логов: isLoadingLogs =', isLoadingLogs, ', logsLoaded =', logsLoaded);
      return;
    }

    // Проверяем наличие токена перед запросом
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('ProfileUser: Токен отсутствует, пропускаем загрузку логов');
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
      // Игнорируем 401 ошибки, они обрабатываются axios interceptor
      if (error.response?.status === 401) {
        console.log('ProfileUser: 401 ошибка при загрузке логов, токен будет обновлен автоматически');
        return;
      }
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

  // Загрузка подписок пользователя
  const loadSubscriptions = useCallback(async (loadAvailable = true) => {
    if (!isAuth || !user) return;
    
    // Проверяем наличие токена перед запросом
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('ProfileUser: Токен отсутствует, пропускаем загрузку подписок');
      return;
    }
    
    // Проверяем флаг загрузки через ref, чтобы избежать перерендеринга
    if (loadingSubscriptionsRef.current) {
      console.log('ProfileUser: Загрузка подписок уже идет, пропускаем');
      return;
    }
    
    try {
      loadingSubscriptionsRef.current = true;
      setLoadingSubscriptions(true);
      
      const promises = [userService.getUserSubscriptions()];
      if (loadAvailable) {
        promises.push(userService.getAvailableSubscriptions());
      }
      
      const results = await Promise.all(promises);
      const activeSubs = results[0] || [];
      
      // Логируем данные для отладки
      console.log('ProfileUser: Загруженные активные подписки:', activeSubs);
      activeSubs.forEach((sub, index) => {
        console.log(`Подписка ${index + 1}:`, {
          id: sub.id,
          title_image: sub.subscription_title_image,
          promo_materials: sub.subscription_promo_materials,
          promo_materials_type: typeof sub.subscription_promo_materials
        });
      });
      
      setUserSubscriptions(activeSubs);
      if (loadAvailable) {
        const availableSubs = results[1] || [];
        console.log('ProfileUser: Загруженные доступные подписки:', availableSubs);
        availableSubs.forEach((sub, index) => {
          console.log(`Доступная подписка ${index + 1}:`, {
            id: sub.id,
            title_image: sub.subscription_title_image,
            promo_materials: sub.subscription_promo_materials,
            promo_materials_type: typeof sub.subscription_promo_materials
          });
        });
        setAvailableSubscriptions(availableSubs);
      }
      setSubscriptionsLoadedOnce(true);
    } catch (error) {
      // Игнорируем 401 ошибки, они обрабатываются axios interceptor
      if (error.response?.status === 401) {
        console.log('ProfileUser: 401 ошибка при загрузке подписок, токен будет обновлен автоматически');
        return;
      }
      console.error('ProfileUser: Ошибка загрузки подписок:', error);
      setUserSubscriptions([]);
      if (loadAvailable) {
        setAvailableSubscriptions([]);
      }
    } finally {
      loadingSubscriptionsRef.current = false;
      setLoadingSubscriptions(false);
    }
  }, [isAuth, user]); // Убираем loadingSubscriptions из зависимостей, чтобы избежать циклов

  // Загружаем активные подписки один раз при монтировании для правильного отображения кнопки
  useEffect(() => {
    if (isAuth && user && !subscriptionsLoadedOnce && !loadingSubscriptionsRef.current) {
      console.log('ProfileUser: Загружаем активные подписки при монтировании');
      loadSubscriptions(false); // Загружаем только активные подписки
    }
  }, [isAuth, user, subscriptionsLoadedOnce, loadSubscriptions]);

  // Загружаем все подписки при открытии модального окна
  useEffect(() => {
    if (subscriptionsModalOpen && isAuth && user && !loadingSubscriptionsRef.current) {
      console.log('ProfileUser: Загружаем все подписки при открытии модального окна');
      loadSubscriptions(true); // Загружаем все подписки
    }
  }, [subscriptionsModalOpen, isAuth, user, loadSubscriptions]);


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
    <div className="profile-container">
      {/* ВЕРХНЯЯ СТРОКА: Аватар | Данные клиента (1 столбец) */}
      <div className="profile-container-lineTop flex flex-row">
        {/* Фото */}
        <div className="profile-avatar gradient-border bru-max">
          <img
            className="profile-avatar-img img"
            src={user?.avatar && user.avatar !== 'noAvatar' 
              ? (user.avatar.startsWith('http') ? user.avatar : `${API_CONFIG.BASE_URL}${user.avatar}`)
              : defaultAvatarUrl
            }
            alt="user-avatar"
            onError={(e) => {
              e.target.src = defaultAvatarUrl;
            }}
          />
        </div>

        {/* Данные клиента (1 столбец) */}
        <div className="profile-personal-info gradient-border flex bru-max">
          <div className="profile-personal-info-header flex flex-row">
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
          <div className="profile-personal-info-panel flex flex-column">
            <div className="flex flex-column">
              <label htmlFor="profile-name" className="profile-label">
                Фамилия и Имя
              </label>
              <div className="gradient-border bru">
                <input
                  type="text"
                  id="profile-name"
                  className="profile-input bru"
                  placeholder="Фамилия и Имя"
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
        </div>
      </div>

      {/* НИЖНЯЯ СТРОКА: История входов | Служба поддержки | Подписки */}
      <div className="profile-container-lineDown flex flex-row">
        {/* История входов */}
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

        {/* Служба поддержки */}
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

          <div 
            className="profile-support-service-button gradient-border flex bru-min"
            onClick={() => {
              if (onOpenMessagesModal) {
                onOpenMessagesModal(true); // Передаем true для автоматического открытия формы нового обращения
              }
            }}
            style={{ cursor: 'pointer' }}
          >
            Задать вопрос
          </div>
          <div 
            className="profile-support-service-button gradient-border flex bru-min"
            onClick={() => {
              navigate('/personal-room/partners');
            }}
            style={{ cursor: 'pointer' }}
          >
            Партнерская программа
          </div>
        </div>

        {/* Блок подписок */}
        <div className="profile-itcclub-form bg-color-lilac flex flex-column bru-max">
          <div className="profile-itcclub-form-header flex flex-row">
            <div className="profile-itcclub-form-logo">
              <div className="profile-itcclub-form-logo-img img"></div>
            </div>
            <div className="profile-itcclub-form-title-wrapper flex flex-column">
              <span className="profile-itcclub-form-title-line1">ITC</span>
              <span className="profile-itcclub-form-title-line2">SUBSCRIPTIONS</span>
            </div>
          </div>
          <div 
            className="profile-itcclub-form-button gradient-border bg-color-lilac bru-min pointer"
            onClick={() => {
              setSubscriptionsModalOpen(true);
            }}
          >
            {subscriptionsLoadedOnce && userSubscriptions.length > 0 ? 'войти' : 'активировать'}
          </div>
        </div>
      </div>
    {isCorrectOpen && <CorrectUserData />}
    
    {/* Модальное окно подписок */}
    {subscriptionsModalOpen && (
      <div className="notification-withdrawl-modal-window flex flex-column" onClick={() => setSubscriptionsModalOpen(false)}>
        <div className="notification-withdrawl-modal-window-menu gradient-border flex flex-column bru-max" onClick={(e) => e.stopPropagation()}>
          <div className="notification-withdrawl-modal-window-menu-cancel flex pointer" onClick={() => setSubscriptionsModalOpen(false)}>
            <div className="notification-withdrawl-modal-window-menu-cancel-icon img"></div>
          </div>
          <div className="subscriptions-modal-header flex flex-row">
            <div className="subscriptions-modal-logo">
              <div className="subscriptions-modal-logo-img img"></div>
            </div>
            <h2 className="subscriptions-modal-title">ITC Subscriptions</h2>
          </div>
          <div className="subscriptions-modal-content flex flex-column">
            <div className="subscriptions-modal-columns flex flex-row">
              {/* Мои активные подписки */}
              <div className="subscriptions-column flex flex-column">
                <h4 className="subscriptions-column-title">Мои активные подписки</h4>
                <div className="subscriptions-list flex flex-column">
                  {loadingSubscriptions ? (
                    <div className="subscriptions-loading">Загрузка...</div>
                  ) : userSubscriptions.length > 0 ? (
                    userSubscriptions.map((subscription) => {
                      // Получаем URL для титульной картинки
                      // В dev режиме используем прокси для /subscriptions
                      const titleImageUrl = subscription.subscription_title_image
                        ? (subscription.subscription_title_image.startsWith('http') 
                            ? subscription.subscription_title_image 
                            : subscription.subscription_title_image.startsWith('/')
                            ? (API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}${subscription.subscription_title_image}` : subscription.subscription_title_image)
                            : (API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}/${subscription.subscription_title_image}` : `/${subscription.subscription_title_image}`))
                        : null;
                      console.log('ProfileUser: Формирование URL для карточки активной подписки:', {
                        raw: subscription.subscription_title_image,
                        BASE_URL: API_CONFIG.BASE_URL,
                        result: titleImageUrl
                      });
                      
                      // Получаем описание (из подписки или продукта)
                      const description = subscription.subscription_description 
                        ? subscription.subscription_description.substring(0, 100) + (subscription.subscription_description.length > 100 ? '...' : '')
                        : (subscription.Product?.description || 'Описание продукта');
                      
                      return (
                        <div 
                          key={subscription.id} 
                          className="subscription-card pointer"
                          onClick={() => {
                            console.log('ProfileUser: Открываем детали подписки:', subscription);
                            console.log('ProfileUser: subscription_title_image:', subscription.subscription_title_image);
                            console.log('ProfileUser: subscription_promo_materials:', subscription.subscription_promo_materials);
                            setSelectedSubscription(subscription);
                            setPromoSliderIndex(0);
                            setSubscriptionDetailModalOpen(true);
                          }}
                        >
                          <div className="subscription-card-image">
                            {titleImageUrl ? (
                              <img 
                                src={titleImageUrl}
                                alt="Титульная картинка"
                                className="subscription-card-image-content"
                                onError={(e) => {
                                  console.error('ProfileUser: Ошибка загрузки титульного изображения карточки:', titleImageUrl, e);
                                  e.target.style.display = 'none';
                                  if (e.target.nextElementSibling) {
                                    e.target.nextElementSibling.style.display = 'flex';
                                  }
                                }}
                                onLoad={() => {
                                  console.log('ProfileUser: Титульное изображение карточки загружено:', titleImageUrl);
                                }}
                              />
                            ) : null}
                            {!titleImageUrl && (
                              <div className="subscription-card-image-placeholder"></div>
                            )}
                          </div>
                          <div className="subscription-card-body">
                            <div className="subscription-card-header">
                              <div className="subscription-card-header-title-row">
                                <h5>{subscription.Product?.type || 'Продукт'}</h5>
                              </div>
                              <p className="subscription-description">
                                {description}
                              </p>
                            </div>
                            <div className="subscription-info">
                              <span className="subscription-plan">
                                {subscription.subscription_plan === 'monthly' ? 'Ежемесячно' : 
                                 subscription.subscription_plan === 'yearly' ? 'Ежегодно' : 'Одноразово'}
                              </span>
                              {subscription.subscription_price && (
                                <span className="subscription-price">
                                  {subscription.subscription_price} {subscription.Product?.currency || 'USD'}
                                </span>
                              )}
                            </div>
                            <div className="subscription-status">
                              <span className={`status-badge status-${subscription.status}`}>
                                {subscription.status === 'active' ? 'Активна' : subscription.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="subscriptions-empty">У вас нет активных подписок</div>
                  )}
                </div>
              </div>

              {/* Доступные подписки */}
              <div className="subscriptions-column flex flex-column">
                <h4 className="subscriptions-column-title">Доступные подписки</h4>
                <div className="subscriptions-list flex flex-column">
                  {loadingSubscriptions ? (
                    <div className="subscriptions-loading">Загрузка...</div>
                  ) : availableSubscriptions.length > 0 ? (
                    availableSubscriptions
                      .filter(subscription => !userSubscriptions.some(sub => sub.product_id === subscription.product_id))
                      .map((subscription) => {
                        // Получаем URL для титульной картинки
                        // В dev режиме используем прокси для /subscriptions
                        const titleImageUrl = subscription.subscription_title_image
                          ? (subscription.subscription_title_image.startsWith('http') 
                              ? subscription.subscription_title_image 
                              : subscription.subscription_title_image.startsWith('/')
                              ? (API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}${subscription.subscription_title_image}` : subscription.subscription_title_image)
                              : (API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}/${subscription.subscription_title_image}` : `/${subscription.subscription_title_image}`))
                          : null;
                        console.log('ProfileUser: Формирование URL для карточки доступной подписки:', {
                          raw: subscription.subscription_title_image,
                          BASE_URL: API_CONFIG.BASE_URL,
                          result: titleImageUrl
                        });
                        
                        // Получаем описание (из подписки или продукта)
                        const description = subscription.subscription_description 
                          ? subscription.subscription_description.substring(0, 100) + (subscription.subscription_description.length > 100 ? '...' : '')
                          : (subscription.Product?.description || 'Описание продукта');
                        
                        return (
                          <div 
                            key={subscription.id} 
                            className="subscription-card available pointer"
                            onClick={() => {
                              setSelectedSubscription(subscription);
                              setPromoSliderIndex(0);
                              setSubscriptionDetailModalOpen(true);
                            }}
                          >
                            <div className="subscription-card-image">
                              {titleImageUrl ? (
                                <img 
                                  src={titleImageUrl}
                                  alt="Титульная картинка"
                                  className="subscription-card-image-content"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextElementSibling) {
                                      e.target.nextElementSibling.style.display = 'flex';
                                    }
                                  }}
                                />
                              ) : null}
                              {!titleImageUrl && (
                                <div className="subscription-card-image-placeholder"></div>
                              )}
                            </div>
                            <div className="subscription-card-body">
                              <div className="subscription-card-header">
                                <div className="subscription-card-header-title-row">
                                  <h5>{subscription.Product?.type || subscription.type || 'Продукт'}</h5>
                                </div>
                                <p className="subscription-description">
                                  {description}
                                </p>
                              </div>
                              <div className="subscription-info">
                                <span className="subscription-plan">
                                  {subscription.subscription_plan === 'monthly' ? 'Ежемесячно' : 
                                   subscription.subscription_plan === 'yearly' ? 'Ежегодно' : 'Подписка'}
                                </span>
                                {subscription.subscription_price && (
                                  <span className="subscription-price">
                                    {subscription.subscription_price} {subscription.Product?.currency || subscription.currency || 'USD'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="subscriptions-empty">Нет доступных подписок</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="notification-withdrawl-modal-window-menu-button gradient-border flex flex-column bru pointer" onClick={() => setSubscriptionsModalOpen(false)}>
            ЗАКРЫТЬ
          </div>
        </div>
      </div>
    )}

    {/* Модальное окно детализации подписки */}
    {subscriptionDetailModalOpen && selectedSubscription && (
      <div className="notification-withdrawl-modal-window flex flex-column" onClick={() => setSubscriptionDetailModalOpen(false)}>
        <div className="notification-withdrawl-modal-window-menu flex flex-column bru-max subscription-detail-modal" onClick={(e) => e.stopPropagation()}>
          <div className="notification-withdrawl-modal-window-menu-cancel flex pointer" onClick={() => setSubscriptionDetailModalOpen(false)}>
            <div className="notification-withdrawl-modal-window-menu-cancel-icon img"></div>
          </div>
          
          {/* Заголовок - название продукта */}
          <h2 className="subscription-detail-title">
            {selectedSubscription.Product?.type || selectedSubscription.type || 'Подписка'}
          </h2>

          {/* Два столбца: картинка (30%) и описание */}
          <div className="subscription-detail-content flex flex-row">
            {/* Столбец с картинкой (30%) */}
            <div className="subscription-detail-image-column">
              {(() => {
                // В dev режиме используем прокси для /subscriptions
                const titleImageUrl = selectedSubscription.subscription_title_image
                  ? (selectedSubscription.subscription_title_image.startsWith('http') 
                      ? selectedSubscription.subscription_title_image 
                      : selectedSubscription.subscription_title_image.startsWith('/')
                      ? (API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}${selectedSubscription.subscription_title_image}` : selectedSubscription.subscription_title_image)
                      : (API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}/${selectedSubscription.subscription_title_image}` : `/${selectedSubscription.subscription_title_image}`))
                  : null;
                
                return titleImageUrl ? (
                  <img 
                    src={titleImageUrl} 
                    alt="Титульная картинка подписки"
                    className="subscription-detail-main-image"
                    onError={(e) => {
                      console.error('ProfileUser: Ошибка загрузки титульного изображения детализации:', titleImageUrl, e);
                      e.target.style.display = 'none';
                      if (e.target.nextElementSibling) {
                        e.target.nextElementSibling.style.display = 'flex';
                      }
                    }}
                    onLoad={() => {
                      console.log('ProfileUser: Титульное изображение детализации загружено:', titleImageUrl);
                    }}
                  />
                ) : (
                  <div className="subscription-detail-image-placeholder">
                    <span>Нет изображения</span>
                  </div>
                );
              })()}
            </div>

            {/* Столбец с описанием (70%) */}
            <div className="subscription-detail-description-column">
              <div className="subscription-detail-description">
                {selectedSubscription.subscription_description || selectedSubscription.Product?.description || 'Описание недоступно'}
              </div>
            </div>
          </div>

          {/* Платежная информация - на всю ширину */}
          <div className="subscription-detail-price-info">
            <div className="subscription-detail-price-info-columns">
              {/* Левая колонка */}
              <div className="subscription-detail-price-info-left">
                {selectedSubscription.subscription_price && (
                  <div className="subscription-detail-price">
                    <span className="subscription-detail-price-label">Стоимость:</span>
                    <span className="subscription-detail-price-value">
                      {selectedSubscription.subscription_price} {selectedSubscription.Product?.currency || 'USD'}
                    </span>
                  </div>
                )}
                {selectedSubscription.subscription_plan && (
                  <div className="subscription-detail-plan">
                    <span className="subscription-detail-plan-label">Периодичность:</span>
                    <span className="subscription-detail-plan-value">
                      {selectedSubscription.subscription_plan === 'monthly' ? 'Ежемесячно' : 
                       selectedSubscription.subscription_plan === 'yearly' ? 'Ежегодно' : 'Одноразово'}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Правая колонка */}
              <div className="subscription-detail-price-info-right">
                {selectedSubscription.initial_top_up_enabled && selectedSubscription.initial_top_up_amount ? (
                  <div className="subscription-detail-initial-top-up">
                    <span className="subscription-detail-price-label">Лимит первичного пополнения:</span>
                    <span className="subscription-detail-price-value">
                      {selectedSubscription.initial_top_up_amount} {selectedSubscription.Product?.currency || 'USD'}
                    </span>
                  </div>
                ) : null}
                {selectedSubscription.recurring_top_up_enabled && selectedSubscription.recurring_top_up_amount ? (
                  <div className="subscription-detail-recurring-top-up">
                    <span className="subscription-detail-price-label">Лимит последующих пополнений:</span>
                    <span className="subscription-detail-price-value">
                      {selectedSubscription.recurring_top_up_amount} {selectedSubscription.Product?.currency || 'USD'}
                    </span>
                  </div>
                ) : (
                  <div className="subscription-detail-recurring-top-up">
                    <span className="subscription-detail-price-label">Лимит последующих пополнений:</span>
                    <span className="subscription-detail-price-value">Без лимита</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Кнопка скачивания инвестиционных правил */}
            {selectedSubscription.Product?.investment_rules_path && (
              <div className="subscription-detail-investment-rules">
                <a
                  href={`${API_CONFIG.BASE_URL}/${selectedSubscription.Product.investment_rules_path}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="subscription-detail-download-btn"
                  onClick={(e) => e.stopPropagation()}
                >
                  Скачать инвестиционные правила
                </a>
              </div>
            )}
          </div>

          {/* Слайдер промо-материалов - под информацией о цене */}
          {(() => {
            // Парсим промо-материалы (могут быть строкой JSON или массивом)
            let promoMaterials = [];
            console.log('ProfileUser: Обработка промо-материалов:', {
              raw: selectedSubscription.subscription_promo_materials,
              type: typeof selectedSubscription.subscription_promo_materials,
              isArray: Array.isArray(selectedSubscription.subscription_promo_materials)
            });
            
            if (selectedSubscription.subscription_promo_materials) {
              if (typeof selectedSubscription.subscription_promo_materials === 'string') {
                try {
                  const parsed = JSON.parse(selectedSubscription.subscription_promo_materials);
                  promoMaterials = Array.isArray(parsed) ? parsed : [parsed];
                  console.log('ProfileUser: Парсинг JSON успешен:', promoMaterials);
                } catch (e) {
                  // Если не JSON, считаем это одним элементом массива
                  promoMaterials = [selectedSubscription.subscription_promo_materials];
                  console.log('ProfileUser: Не JSON, используем как строку:', promoMaterials);
                }
              } else if (Array.isArray(selectedSubscription.subscription_promo_materials)) {
                promoMaterials = selectedSubscription.subscription_promo_materials;
                console.log('ProfileUser: Уже массив, длина:', promoMaterials.length, 'Элементы:', promoMaterials);
              }
            }
            
            console.log('ProfileUser: Итоговые промо-материалы:', promoMaterials, 'Количество:', promoMaterials.length);
            
            return promoMaterials.length > 0 ? (
              <div className="subscription-detail-promo-slider">
                <div className="subscription-detail-promo-slider-content">
                  {(() => {
                    const promoMaterial = promoMaterials[promoSliderIndex];
                    console.log('ProfileUser: Текущий промо-материал:', promoMaterial);
                    // В dev режиме используем прокси для /subscriptions
                    const promoUrl = promoMaterial
                      ? (promoMaterial.startsWith('http') 
                          ? promoMaterial 
                          : promoMaterial.startsWith('/')
                          ? (API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}${promoMaterial}` : promoMaterial)
                          : (API_CONFIG.BASE_URL ? `${API_CONFIG.BASE_URL}/${promoMaterial}` : `/${promoMaterial}`))
                      : null;
                    
                    console.log('ProfileUser: Сформированный URL промо-материала:', promoUrl);
                    console.log('ProfileUser: API_CONFIG.BASE_URL:', API_CONFIG.BASE_URL);
                  
                  if (!promoUrl) {
                    console.log('ProfileUser: promoUrl пустой, не отображаем');
                    return null;
                  }
                  
                  const isVideo = promoMaterial.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i);
                  
                  return isVideo ? (
                    <video 
                      src={promoUrl} 
                      controls
                      className="subscription-detail-promo-media"
                      onError={(e) => {
                        console.error('Ошибка загрузки видео:', promoUrl);
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <img 
                      src={promoUrl} 
                      alt={`Промо материал ${promoSliderIndex + 1}`}
                      className="subscription-detail-promo-media"
                      onError={(e) => {
                        console.error('Ошибка загрузки изображения:', promoUrl);
                        e.target.style.display = 'none';
                      }}
                    />
                  );
                })()}
              </div>
              <div className="subscription-detail-promo-slider-controls">
                <button
                  className="subscription-detail-promo-slider-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPromoSliderIndex(prev => 
                      prev > 0 ? prev - 1 : promoMaterials.length - 1
                    );
                  }}
                  disabled={promoMaterials.length <= 1}
                >
                  ‹
                </button>
                <span className="subscription-detail-promo-slider-counter">
                  {promoSliderIndex + 1} / {promoMaterials.length}
                </span>
                <button
                  className="subscription-detail-promo-slider-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPromoSliderIndex(prev => 
                      prev < promoMaterials.length - 1 ? prev + 1 : 0
                    );
                  }}
                  disabled={promoMaterials.length <= 1}
                >
                  ›
                </button>
              </div>
            </div>
            ) : null;
          })()}

          {/* Кнопки внизу модалки */}
          <div className="subscription-detail-actions flex flex-row">
            <button
              className="subscription-detail-action-btn subscription-detail-action-btn-cancel gradient-border flex flex-column bru pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSubscriptionDetailModalOpen(false);
              }}
            >
              ОТМЕНИТЬ
            </button>
            <button
              className="subscription-detail-action-btn subscription-detail-action-btn-activate gradient-border flex flex-column bru pointer"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Загружаем счета пользователя и открываем модалку выбора счета
                try {
                  const { data } = await axiosAPI.get('/profile/accounts');
                  const accounts = Array.isArray(data?.accounts) ? data.accounts : [];
                  if (accounts.length === 0) {
                    document.dispatchEvent(new CustomEvent('main-notify', { 
                      detail: { type: 'attention', text: 'У вас нет счетов для оплаты подписки' } 
                    }));
                    return;
                  }
                  setUserAccounts(accounts);
                  setSelectedAccountId(accounts[0]?.id || null);
                  setAccountValidation(null);
                  setSubscriptionPaymentModalOpen(true);
                } catch (error) {
                  console.error('Ошибка загрузки счетов:', error);
                  document.dispatchEvent(new CustomEvent('main-notify', { 
                    detail: { type: 'error', text: 'Не удалось загрузить счета' } 
                  }));
                }
              }}
            >
              АКТИВИРОВАТЬ
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Модальное окно выбора счета для оплаты подписки */}
    {subscriptionPaymentModalOpen && selectedSubscription && (
      <div className="notification-withdrawl-modal-window flex flex-column" onClick={() => setSubscriptionPaymentModalOpen(false)}>
        <div className="notification-withdrawl-modal-window-menu gradient-border flex flex-column bru-max" onClick={(e) => e.stopPropagation()}>
          <div className="notification-withdrawl-modal-window-menu-cancel flex pointer" onClick={() => setSubscriptionPaymentModalOpen(false)}>
            <div className="notification-withdrawl-modal-window-menu-cancel-icon img"></div>
          </div>
          
          <h2 className="notification-withdrawl-modal-window-menu-title">Выберите счет для оплаты подписки</h2>
          
          <div className="notification-withdrawl-modal-window-menu-item flex flex-column">
            <label htmlFor="subscription-payment-select-account">Выберите счет</label>
            <div className="notification-withdrawl-modal-window-menu-item-inputwrapper gradient-border flex bru">
              <select 
                id="subscription-payment-select-account" 
                className="gradient-border bru" 
                value={selectedAccountId || ''} 
                onChange={async (e) => {
                  const accountId = Number(e.target.value);
                  setSelectedAccountId(accountId);
                  setAccountValidation(null);
                  
                  // Валидация счета на сервере
                  if (accountId && selectedSubscription) {
                    try {
                      setValidatingAccount(true);
                      const { data } = await axiosAPI.post('/profile/subscriptions/validate-payment', {
                        subscriptionId: selectedSubscription.id,
                        accountId: accountId
                      });
                      setAccountValidation(data);
                    } catch (error) {
                      console.error('Ошибка валидации счета:', error);
                      const errorMessage = error?.response?.data?.message || 'Ошибка проверки счета';
                      setAccountValidation({ 
                        canPay: false, 
                        message: errorMessage 
                      });
                      // Показываем ATTENTION-нотификацию
                      document.dispatchEvent(new CustomEvent('main-notify', { 
                        detail: { type: 'attention', text: errorMessage } 
                      }));
                    } finally {
                      setValidatingAccount(false);
                    }
                  }
                }}
              >
                {userAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    №{acc.id}, {acc.product || '-'}, {acc.currency || 'USD'}, {(acc.value ?? 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {validatingAccount && (
            <div className="notification-withdrawl-modal-window-menu-item-text">
              Проверка счета...
            </div>
          )}

          {accountValidation && !validatingAccount && (
            <div className="notification-withdrawl-modal-window-menu-item flex flex-column">
              <div className="notification-withdrawl-modal-window-menu-item-text">
                {accountValidation.message || ''}
              </div>
              {accountValidation.amountToDebit && (
                <div className="notification-withdrawl-modal-window-menu-item-text">
                  К списанию: {accountValidation.amountToDebit} {accountValidation.accountCurrency || 'USD'}
                </div>
              )}
              {accountValidation.conversionInfo && (
                <div className="notification-withdrawl-modal-window-menu-item-text">
                  {accountValidation.conversionInfo}
                </div>
              )}
            </div>
          )}

          <div className="notification-withdrawl-modal-window-menu-button-wrapper flex flex-row" style={{ gap: '1vw', marginTop: '2vw', flexWrap: 'wrap', justifyContent: 'center' }}>
            <div 
              className="notification-withdrawl-modal-window-menu-button gradient-border flex flex-column bru pointer" 
              onClick={() => setSubscriptionPaymentModalOpen(false)}
              style={{ flex: '1 1 45%', minWidth: '150px', maxWidth: '250px' }}
            >
              ОТМЕНИТЬ
            </div>
            <div 
              className={`notification-withdrawl-modal-window-menu-button gradient-border flex flex-column bru pointer ${(!accountValidation?.canPay || validatingAccount) ? 'disabled' : ''}`}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                if (!accountValidation?.canPay || validatingAccount || !selectedAccountId) {
                  return;
                }

                try {
                  const { data } = await axiosAPI.post('/profile/subscriptions/activate', {
                    subscriptionId: selectedSubscription.id,
                    accountId: selectedAccountId
                  });
                  
                  document.dispatchEvent(new CustomEvent('main-notify', { 
                    detail: { type: 'success', text: data.message || 'Подписка успешно активирована' } 
                  }));
                  
                  // Обновляем список подписок с принудительной перезагрузкой
                  setSubscriptionsLoadedOnce(false);
                  loadingSubscriptionsRef.current = false;
                  
                  // Закрываем модальные окна перед перезагрузкой
                  setSubscriptionPaymentModalOpen(false);
                  setSubscriptionDetailModalOpen(false);
                  
                  // Небольшая задержка перед перезагрузкой, чтобы модальные окна успели закрыться
                  setTimeout(async () => {
                    await loadSubscriptions(true);
                    // После загрузки обновляем выбранную подписку, если она была активирована
                    if (selectedSubscription) {
                      const updatedSubs = await userService.getUserSubscriptions();
                      const updatedSub = updatedSubs.find(sub => 
                        sub.subscription_id === selectedSubscription.id || 
                        sub.product_id === selectedSubscription.product_id
                      );
                      if (updatedSub) {
                        console.log('ProfileUser: Обновляем выбранную подписку после активации:', updatedSub);
                        setSelectedSubscription(updatedSub);
                      }
                    }
                  }, 300);
                } catch (error) {
                  console.error('Ошибка активации подписки:', error);
                  const errorMessage = error?.response?.data?.message || 'Ошибка активации подписки';
                  document.dispatchEvent(new CustomEvent('main-notify', { 
                    detail: { type: 'error', text: errorMessage } 
                  }));
                }
              }}
              style={{ 
                opacity: (!accountValidation?.canPay || validatingAccount || !selectedAccountId) ? 0.5 : 1,
                cursor: (!accountValidation?.canPay || validatingAccount || !selectedAccountId) ? 'not-allowed' : 'pointer',
                flex: '1 1 45%',
                minWidth: '150px',
                maxWidth: '250px'
              }}
            >
              ОПЛАТИТЬ ПОДПИСКУ
            </div>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}

export default ProfileUser;
