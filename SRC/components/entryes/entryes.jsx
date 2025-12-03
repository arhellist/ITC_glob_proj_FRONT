import { useLocation, useNavigate } from "react-router-dom"; // Импорт хуков React Router для навигации
import { useEffect, useState } from "react"; // Импорт React хуков для побочных эффектов и состояния
import { useAuthStore } from "../../JS/auth/store/store"; // Импорт Zustand store для управления аутентификацией
import ContainerNotification from "../USER/accounts-room/modal-window-account-room/container-notification.jsx"; // Импорт компонента уведомлений

import "./entryes.css"; // Импорт CSS стилей для компонента входа

import Login from "./forms/login"; // Импорт компонента формы входа
import Registration from "./forms/registration"; // Импорт компонента формы регистрации

function Entryes() { // Главный компонент страницы входа/регистрации
  const location = useLocation(); // Хук для получения текущего маршрута
  const navigate = useNavigate(); // Хук для программной навигации
  const [isChecking, setIsChecking] = useState(true); // Состояние проверки аутентификации пользователя
  const [csrfRequested, setCsrfRequested] = useState(false); // Флаг для предотвращения множественных запросов CSRF токена

  const showRegistration = location.pathname.endsWith("/registration"); // Определяем, показывать ли форму регистрации

  // Получаем методы стора для работы с аутентификацией
  const isAuth = useAuthStore((s) => s.isAuth); // Получаем состояние аутентификации из store
  const fetchCSRFToken = useAuthStore((s) => s.fetchCSRFToken); // Получаем функцию для запроса CSRF токена

  // Получаем CSRF токен при загрузке страницы логина/регистрации
  useEffect(() => {
    const initializeCSRF = async () => {
      console.log("Entryes: Инициализация CSRF токена для страницы логина/регистрации...");
      
      // Запрашиваем CSRF токен один раз для всей страницы
      if (!csrfRequested) {
        try {
          console.log("Entryes: Запрашиваем CSRF токен...");
          setCsrfRequested(true);
          await fetchCSRFToken();
          console.log("Entryes: CSRF токен получен успешно");
        } catch (error) {
          console.error("Entryes: Ошибка получения CSRF токена:", error);
          setCsrfRequested(false); // Сбрасываем флаг при ошибке
        }
      } else {
        console.log("Entryes: CSRF токен уже запрошен, пропускаем");
      }
      
      setIsChecking(false);
    };

    initializeCSRF();
  }, [fetchCSRFToken, csrfRequested]);

  if (isChecking) {
    return (
      <section className="entryes">
        <div className="entryes-bg"></div>
        <div className="entryes-bg-overlay"></div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            color: "white",
            fontSize: "18px",
          }}
        >
          Получение CSRF токена...
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="entryes">
        {/* ContainerNotification рендерится только для обработки событий, но не загружает уведомления на публичных страницах */}
        <ContainerNotification />
        <div className="entryes-bg"></div>
        <div className="entryes-bg-overlay"></div>
        {showRegistration ? <Registration /> : <Login />}
      </section>
    </>
  );
}

export default Entryes;
