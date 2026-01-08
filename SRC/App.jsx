import "./App.css"; // Импорт глобальных CSS стилей приложения
import "./responsive.css"; // Импорт адаптивных стилей для мобильной и планшетной версии
import { Routes, Route } from "react-router-dom"; // Импорт компонентов React Router для маршрутизации
import { lazy, Suspense } from "react"; // Импорт lazy и Suspense для ленивой загрузки компонентов

// Ленивая загрузка компонентов для оптимизации производительности
const Landing = lazy(() => import("./components/landing/landing.jsx"));
const Entryes = lazy(() => import("./components/entryes/entryes.jsx"));
const Main = lazy(() => import("./components/main/main.jsx"));
const RefCapture = lazy(() => import("./components/entryes/ref-capture.jsx"));
const AccountActivation = lazy(() => import("./components/entryes/account-activation.jsx"));
const PasswordReset = lazy(() => import("./components/entryes/forms/password-reset.jsx"));
const DeviceApproval = lazy(() => import("./components/entryes/device-approval.jsx"));
const WebAuthnApproval = lazy(() => import("./components/entryes/webauthn-approval.jsx"));
const WebAuthnRevoke = lazy(() => import("./components/entryes/webauthn-revoke.jsx"));
const TelegramApproval = lazy(() => import("./components/entryes/telegram-approval.jsx"));
const TelegramRevoke = lazy(() => import("./components/entryes/telegram-revoke.jsx"));
const BackupEmailApproval = lazy(() => import("./components/entryes/backup-email-approval.jsx"));
const BackupEmailRevoke = lazy(() => import("./components/entryes/backup-email-revoke.jsx"));
const EmailLogin = lazy(() => import("./components/entryes/email-login.jsx"));

// Убираем SupportProvider - он нужен только для админского интерфейса
const writeDefault = "профиль пользователя" // Константа с названием по умолчанию для меню

// Компонент загрузки для Suspense
const LoadingFallback = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    fontSize: '18px',
    color: '#666'
  }}>
    Загрузка...
  </div>
);

function App() { // Главный компонент приложения, определяющий маршруты
  return ( // Возвращаем JSX с маршрутизацией
    <Suspense fallback={<LoadingFallback />}>
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
    </Suspense>
  );
}

export default App; // Экспорт главного компонента приложения по умолчанию
