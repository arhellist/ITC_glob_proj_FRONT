
import { useEffect, useState, useCallback } from "react"; // Импорт React хуков для состояния и побочных эффектов
import axiosAPI from "../../../../JS/auth/http/axios.js"; // Импорт настроенного HTTP клиента с авторизацией
import { useAuthStore } from "../../../../JS/auth/store/store.js"; // Импорт Zustand store для проверки аутентификации
import NotificationSuccess from "../../../notifications/notification-success.jsx"; // Импорт компонента уведомления об успехе
import NotificationError from "../../../notifications/notification-error.jsx"; // Импорт компонента уведомления об ошибке
import NotificationAttention from "../../../notifications/notification-attantion.jsx"; // Импорт компонента уведомления-внимания
import NotificationInfo from "../../../notifications/notification-info.jsx"; // Импорт компонента информационного уведомления
import NotificationPost from "../../../notifications/notification-post.jsx"; // Импорт компонента POST-уведомления

function ContainerNotification() { // Компонент контейнера для отображения всех типов уведомлений
  const [showSuccess, setShowSuccess] = useState(""); // Состояние для показа сообщения об успехе
  const [successMsgs, setSuccessMsgs] = useState([]); // Массив сообщений об успехе
  const [attentionMsgs, setAttentionMsgs] = useState([]); // Массив сообщений-внимания
  const [errorMsgs, setErrorMsgs] = useState([]); // Массив сообщений об ошибках
  const [infoNotifs, setInfoNotifs] = useState([]); // Массив информационных уведомлений [{id, header, description}]
  const [postNotifs, setPostNotifs] = useState([]); // Массив POST-уведомлений (отчеты) [{id, header, description}]
  
  // Получаем состояние аутентификации из store
  const isAuth = useAuthStore((s) => s.isAuth); // Получаем флаг аутентификации пользователя

  // Загрузка непрочитанных INFO из БД
  const refreshInfo = useCallback(async () => {
    // Проверяем, авторизован ли пользователь
    if (!isAuth) {
      console.log('ContainerNotification: Пользователь не авторизован, пропускаем загрузку уведомлений');
      return;
    }
    
    // Проверяем, находимся ли мы на публичных страницах (логин/регистрация)
    const isPublicPage = window.location.pathname === '/login' || 
                        window.location.pathname === '/registration' ||
                        window.location.pathname.startsWith('/profile/activate/') ||
                        window.location.pathname.startsWith('/ref/');
    
    if (isPublicPage) {
      console.log('ContainerNotification: Находимся на публичной странице, пропускаем загрузку уведомлений');
      return;
    }
    
    // Проверяем наличие токена перед запросом
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('ContainerNotification: Токен отсутствует, пропускаем загрузку INFO уведомлений');
      return;
    }

    try {
      console.log('ContainerNotification: Загружаем INFO уведомления из БД...');
      const { data } = await axiosAPI.get('/profile/notifications');
      const list = Array.isArray(data?.notifications) ? data.notifications : [];
      console.log('ContainerNotification: Получено уведомлений из БД:', list.length);
      setInfoNotifs(list.map(n => ({ id: n.id, header: n.header, description: n.description })));
    } catch (e) {
      // Игнорируем 401 ошибки, они обрабатываются axios interceptor
      if (e.response?.status === 401) {
        console.log('ContainerNotification: 401 ошибка при загрузке INFO уведомлений, токен будет обновлен автоматически');
        return;
      }
      console.error('ContainerNotification: Ошибка загрузки уведомлений:', e);
      // молча, не ломаем UI
    }
  }, [isAuth]);

  // Загрузка непрочитанных POST из БД
  const refreshPost = useCallback(async () => {
    if (!isAuth) {
      console.log('ContainerNotification: Пользователь не авторизован, пропускаем загрузку POST уведомлений');
      return;
    }
    
    // Проверяем, находимся ли мы на публичных страницах (логин/регистрация)
    const isPublicPage = window.location.pathname === '/login' || 
                        window.location.pathname === '/registration' ||
                        window.location.pathname.startsWith('/profile/activate/') ||
                        window.location.pathname.startsWith('/ref/');
    
    if (isPublicPage) {
      console.log('ContainerNotification: Находимся на публичной странице, пропускаем загрузку POST уведомлений');
      return;
    }
    
    // Проверяем наличие токена перед запросом
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.log('ContainerNotification: Токен отсутствует, пропускаем загрузку POST уведомлений');
      return;
    }

    try {
      console.log('ContainerNotification: Загружаем POST уведомления из БД...');
      const { data } = await axiosAPI.get('/profile/notifications');
      const list = Array.isArray(data?.notifications) ? data.notifications : [];
      // Фильтруем только POST-уведомления
      const postList = list.filter(n => n.type === 'POST');
      console.log('ContainerNotification: Получено POST уведомлений из БД:', postList.length);
      setPostNotifs(postList.map(n => ({ id: n.id, header: n.header, description: n.description })));
    } catch (e) {
      // Игнорируем 401 ошибки, они обрабатываются axios interceptor
      if (e.response?.status === 401) {
        console.log('ContainerNotification: 401 ошибка при загрузке POST уведомлений, токен будет обновлен автоматически');
        return;
      }
      console.error('ContainerNotification: Ошибка загрузки POST уведомлений:', e);
      // молча, не ломаем UI
    }
  }, [isAuth]);

  // Слушатель нотификаций
  useEffect(() => {
    const handler = (e) => {
      console.log('ContainerNotification: Получено событие main-notify:', e.detail);
      const { type, text } = e.detail || {};
      if (type === 'success') {
        if (text) setSuccessMsgs((prev) => [...prev, text]);
      } else if (type === 'attention') {
        if (text) setAttentionMsgs((prev) => [...prev, text]);
      } else if (type === 'error') {
        if (text) setErrorMsgs((prev) => [...prev, text]);
      } else if (type === 'info') {
        // Если есть текст - показываем локальное INFO-уведомление
        if (text) {
          console.log('ContainerNotification: Показываем локальное INFO-уведомление:', text);
          // Добавляем локальное INFO-уведомление в список
          const localNotifId = `local-info-${Date.now()}-${Math.random()}`;
          setInfoNotifs((prev) => [...prev, { 
            id: localNotifId, 
            header: 'Информация', 
            description: text,
            local: true // Помечаем как локальное, чтобы не удалять из БД
          }]);
        } else {
          // Если текста нет - тригерим подтяжку INFO из БД
          console.log('ContainerNotification: Обновляем INFO уведомления из БД');
          refreshInfo();
        }
      }
    };

    const refreshInfoHandler = () => {
      console.log('ContainerNotification: Получено событие main-notify-info-refresh');
      refreshInfo();
    };

    const refreshPostHandler = () => {
      console.log('ContainerNotification: Получено событие main-notify-post-refresh');
      refreshPost();
    };
    
    document.addEventListener('main-notify', handler);
    document.addEventListener('main-notify-info-refresh', refreshInfoHandler);
    document.addEventListener('main-notify-post-refresh', refreshPostHandler);
    return () => {
      document.removeEventListener('main-notify', handler);
      document.removeEventListener('main-notify-info-refresh', refreshInfoHandler);
      document.removeEventListener('main-notify-post-refresh', refreshPostHandler);
    };
  }, [refreshInfo, refreshPost]);

  // Обработка уведомлений из sessionStorage
  useEffect(() => {
    const note = sessionStorage.getItem('notify_success');
    if (note) {
      setTimeout(() => {
        setShowSuccess(note);
        sessionStorage.removeItem('notify_success');
      }, 0);
    }
  }, []);

  // Первая загрузка уведомлений - только если пользователь авторизован и не на публичных страницах
  useEffect(() => { 
    // Проверяем, находимся ли мы на публичных страницах (логин/регистрация)
    const isPublicPage = window.location.pathname === '/login' || 
                        window.location.pathname === '/registration' ||
                        window.location.pathname.startsWith('/profile/activate/') ||
                        window.location.pathname.startsWith('/ref/');
    
    if (isAuth && !isPublicPage) {
      console.log('ContainerNotification: useEffect - isAuth=true и не на публичной странице, загружаем уведомления');
      refreshInfo();
      refreshPost();
    } else {
      console.log('ContainerNotification: useEffect - пропускаем загрузку уведомлений (isAuth:', isAuth, ', isPublicPage:', isPublicPage, ')');
    }
  }, [isAuth, refreshInfo, refreshPost]);

  const openInfoModal = async (notif) => {
    // Удаляем карточку из списка
    setInfoNotifs(prev => prev.filter(n => n.id !== notif.id));
    // Помечаем прочитанным, если из БД
    if (!notif.local) {
      try { 
        await axiosAPI.put(`/profile/notifications/${notif.id}/read`); 
      } catch(error) {
        console.error('Ошибка пометки уведомления как прочитанного:', error);
      }
    }
    // Открываем модалку через глобальное событие
    document.dispatchEvent(new CustomEvent('main-open-info-modal', { detail: { header: notif.header || 'Информация', text: notif.description || '' } }));
  };

  // Закрытие POST-уведомления
  const closePostNotif = async (notifId) => {
    // Удаляем карточку из списка
    setPostNotifs(prev => prev.filter(n => n.id !== notifId));
    // Помечаем прочитанным в БД
    try { 
      await axiosAPI.put(`/profile/notifications/${notifId}/read`); 
      console.log(`POST-уведомление ${notifId} помечено прочитанным`);
    } catch(e) {
      console.error('Ошибка пометки POST-уведомления как прочитанного:', e);
    }
  };

  return (
    <div className="root-content-notification-container flex flex-column">
      {showSuccess && (
        <NotificationSuccess
          text={showSuccess}
          onClose={() => setShowSuccess("")}
        />
      )}
      {successMsgs.map((m, idx) => (
        <NotificationSuccess key={`s-${idx}`} text={m} onClose={() => {
          setSuccessMsgs((prev) => prev.filter((_, i) => i !== idx));
        }} />
      ))}
      {attentionMsgs.map((m, idx) => (
        <NotificationAttention key={`a-${idx}`} text={m} onClose={() => {
          setAttentionMsgs((prev) => prev.filter((_, i) => i !== idx));
        }} />
      ))}
      {errorMsgs.map((m, idx) => (
        <NotificationError key={`e-${idx}`} text={m} onClose={() => {
          setErrorMsgs((prev) => prev.filter((_, i) => i !== idx));
        }} />
      ))}

      {infoNotifs.map((n) => (
        <div key={`i-${n.id}`} onClick={() => openInfoModal(n)}>
          <NotificationInfo text={n.description} />
        </div>
      ))}

      {postNotifs.map((n) => (
        <NotificationPost 
          key={`p-${n.id}`} 
          id={n.id}
          header={n.header} 
          description={n.description}
          onClose={closePostNotif}
        />
      ))}
    </div>
  );
}

export default ContainerNotification;


