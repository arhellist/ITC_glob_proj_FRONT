import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "../../JS/auth/store/store";
import axios from "axios";
import { API_CONFIG } from "../../config/api.js";
import "./entryes.css";

function TelegramApproval() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = searchParams.get("token");
  const action = searchParams.get("action");

  useEffect(() => {
    const handleApproval = async () => {
      if (!token || !action) {
        setStatus("error");
        setError("Отсутствуют необходимые параметры");
        return;
      }

      try {
        if (action === "approve") {
          // Получаем ссылку на бота с токеном с бэкенда
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}/auth/telegram/approve`,
            { token },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (response.data.success && response.data.botUrl) {
            // Моментально перенаправляем в Telegram бот с токеном для автоматической синхронизации
            window.location.replace(response.data.botUrl);
            return; // Выходим, чтобы не показывать окно
          } else {
            setStatus("error");
            setError(response.data.message || "Ошибка подтверждения подключения");
          }
        } else if (action === "block") {
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}/auth/telegram/block`,
            { token },
            {
              headers: {
                "Content-Type": "application/json",
              },
            }
          );

          if (response.data.success) {
            setStatus("success");
            setMessage("Подключение Telegram аккаунта отменено");
          } else {
            setStatus("error");
            setError(response.data.message || "Ошибка отмены подключения");
          }
        }
      } catch (err) {
        console.error("Ошибка обработки подтверждения:", err);
        setStatus("error");
        setError(
          err.response?.data?.message ||
            "Произошла ошибка при обработке запроса"
        );
      }
    };

    handleApproval();
  }, [token, action]);

  const handleNavigation = () => {
    const isAuth = useAuthStore.getState().isAuth;
    if (isAuth) {
      navigate("/personal-room");
    } else {
      navigate("/login");
    }
  };

  // Если action === "approve", не показываем UI вообще - только редирект
  if (action === "approve") {
    return null; // Не рендерим ничего при подтверждении подключения
  }

  return (
    <div className="entry-container">
      <div className="entry-form gradient-border bru flex flex-column">
        <div className="entry-form-title">
          {status === "loading" && "Обработка запроса"}
          {status === "success" && "Результат"}
          {status === "error" && "Ошибка"}
        </div>

        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "2vw" }}>
            <div className="spinner"></div>
          </div>
        )}

        {status === "success" && (
          <>
            <div className="entry-form-message" style={{ textAlign: "center", padding: "1vw" }}>
              {message}
            </div>
            <div className="entry-form-buttons flex flex-row">
              <button
                className="entry-form-button gradient-border bru pointer"
                onClick={handleNavigation}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                OK
              </button>
              <button
                className="entry-form-button gradient-border bru pointer"
                onClick={handleNavigation}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Перейти на сайт
              </button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="entry-form-message" style={{ textAlign: "center", padding: "1vw", color: "#ff6b6b" }}>
              Ваш Telegram аккаунт не был подключен. Ошибка: {error}
            </div>
            <div className="entry-form-buttons flex flex-row">
              <button
                className="entry-form-button gradient-border bru pointer"
                onClick={handleNavigation}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                OK
              </button>
              <button
                className="entry-form-button gradient-border bru pointer"
                onClick={handleNavigation}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                Перейти на сайт
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TelegramApproval;

