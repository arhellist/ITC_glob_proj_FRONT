import "./App.css"; // Импорт глобальных CSS стилей приложения
import { Routes, Route } from "react-router-dom"; // Импорт компонентов React Router для маршрутизации
import Landing from "./components/landing/landing.jsx"; // Импорт компонента главной страницы
import Entryes from "./components/entryes/entryes.jsx"; // Импорт компонента страницы входа/регистрации
import Main from "./components/main/main.jsx"; // Импорт главного компонента личного кабинета
import RefCapture from "./components/entryes/ref-capture.jsx"; // Импорт компонента для обработки реферальных ссылок
import AccountActivation from "./components/entryes/account-activation.jsx"; // Импорт компонента активации аккаунта
import PasswordReset from "./components/entryes/forms/password-reset.jsx"; // Импорт компонента сброса пароля
import DeviceApproval from "./components/entryes/device-approval.jsx"; // Импорт компонента разрешения устройства
import WebAuthnApproval from "./components/entryes/webauthn-approval.jsx"; // Импорт компонента подтверждения биометрического устройства
import WebAuthnRevoke from "./components/entryes/webauthn-revoke.jsx"; // Импорт компонента подтверждения удаления биометрического устройства
import TelegramApproval from "./components/entryes/telegram-approval.jsx"; // Импорт компонента подтверждения Telegram аккаунта
import TelegramRevoke from "./components/entryes/telegram-revoke.jsx"; // Импорт компонента подтверждения удаления Telegram аккаунта
import BackupEmailApproval from "./components/entryes/backup-email-approval.jsx"; // Импорт компонента подтверждения резервной почты
import BackupEmailRevoke from "./components/entryes/backup-email-revoke.jsx"; // Импорт компонента подтверждения удаления резервной почты
import EmailLogin from "./components/entryes/email-login.jsx"; // Импорт компонента входа по email-ссылке
// Убираем SupportProvider - он нужен только для админского интерфейса
const writeDefault = "профиль пользователя" // Константа с названием по умолчанию для меню

function App() { // Главный компонент приложения, определяющий маршруты
  return ( // Возвращаем JSX с маршрутизацией
    <Routes> {/* Контейнер для всех маршрутов приложения */}
      <Route path="/" element={<Landing />} /> {/* Маршрут для главной страницы */}
      <Route path="/login" element={<Entryes />} /> {/* Маршрут для страницы входа */}
      <Route path="/registration" element={<Entryes />} /> {/* Маршрут для страницы регистрации */}
      <Route path="/reset-password" element={<PasswordReset />} /> {/* Маршрут для страницы сброса пароля */}
      <Route path="/email-login" element={<EmailLogin />} /> {/* Маршрут для входа по email-ссылке */}
      <Route path="/device-approval" element={<DeviceApproval />} /> {/* Маршрут для разрешения устройства */}
      <Route path="/webauthn-approval" element={<WebAuthnApproval />} /> {/* Маршрут для подтверждения биометрического устройства */}
      <Route path="/webauthn-revoke" element={<WebAuthnRevoke />} /> {/* Маршрут для подтверждения удаления биометрического устройства */}
      <Route path="/telegram-approval" element={<TelegramApproval />} /> {/* Маршрут для подтверждения Telegram аккаунта */}
      <Route path="/telegram-revoke" element={<TelegramRevoke />} /> {/* Маршрут для подтверждения удаления Telegram аккаунта */}
      <Route path="/backup-email-approval" element={<BackupEmailApproval />} /> {/* Маршрут для подтверждения резервной почты */}
      <Route path="/backup-email-revoke" element={<BackupEmailRevoke />} /> {/* Маршрут для подтверждения удаления резервной почты */}
      <Route path="/profile/activate/:activationLink" element={<AccountActivation />} /> {/* Маршрут для активации аккаунта */}
      <Route path="/ref/:refCode" element={<RefCapture />} /> {/* Маршрут для реферальных ссылок с параметром */}
      <Route path="/personal-room" element={<Main menuName={writeDefault} />} /> {/* Маршрут для главной страницы личного кабинета */}
      <Route path="/personal-room/partners" element={<Main menuName={writeDefault} />} /> {/* Маршрут для страницы партнерской программы */}
      <Route path="/personal-room/accounts" element={<Main menuName={writeDefault} />} /> {/* Маршрут для страницы счетов */}
      <Route path="/personal-room/transactions" element={<Main menuName={writeDefault} />} /> {/* Маршрут для страницы транзакций */}
      <Route path="/personal-room/reports" element={<Main menuName={writeDefault} />} /> {/* Маршрут для страницы отчетов */}
      <Route path="/personal-room/documents" element={<Main menuName={writeDefault} />} /> {/* Маршрут для страницы документов */}
    </Routes>
  );
}

export default App; // Экспорт главного компонента приложения по умолчанию
