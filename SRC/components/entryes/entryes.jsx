import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuthStore } from "../../JS/auth/store/store";
import ContainerNotification from "../USER/accounts-room/modal-window-account-room/container-notification.jsx";

import "./entryes.css";

import Login from "./forms/login";
import Registration from "./forms/registration";

function Entryes() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(true);

  const showRegistration = location.pathname.endsWith("/registration");

  // Получаем методы стора
  const isAuth = useAuthStore((s) => s.isAuth);

  // Проверяем аутентификацию при загрузке компонента
  useEffect(() => {
    const checkUserAuth = () => {
      console.log("Entryes: Проверяем состояние аутентификации...");

      if (isAuth) {
        console.log(
          "Entryes: Пользователь аутентифицирован, перенаправляем в личный кабинет"
        );
        navigate("/personal-room");
      } else {
        console.log(
          "Entryes: Пользователь не аутентифицирован, показываем форму"
        );
        setIsChecking(false);
      }
    };

    checkUserAuth();
  }, [navigate, isAuth]);

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
          Проверка аутентификации...
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="entryes">
        <ContainerNotification />
        <div className="entryes-bg"></div>
        <div className="entryes-bg-overlay"></div>
        {showRegistration ? <Registration /> : <Login />}
      </section>
    </>
  );
}

export default Entryes;
