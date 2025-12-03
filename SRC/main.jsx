import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { API_CONFIG } from './config/api.js'
import './JS/utils/scrollbar-utils.js'

// Глобальная инициализация аутентификации при загрузке приложения
const initializeAuth = async () => {
  try {
    // Проверяем, находимся ли мы на реферальной странице
    if (window.location.pathname.startsWith('/ref/')) {
      console.log('Main: Находимся на реферальной странице, пропускаем глобальную инициализацию аутентификации');
      return;
    }
    
    console.log('Main: Глобальная инициализация аутентификации при загрузке приложения...');
    
    // Динамически импортируем store только когда он нужен
    const { useAuthStore } = await import('./JS/auth/store/store.js');
    const checkAuth = useAuthStore.getState().checkAuth;
    
    // Проверяем наличие токена в localStorage
    const token = localStorage.getItem('accessToken');
    console.log('Main: Токен в localStorage:', token);
    
    // Если мы на публичных страницах, не проверяем аутентификацию
    if (window.location.pathname === '/login' || 
        window.location.pathname === '/registration' ||
        window.location.pathname.startsWith('/profile/activate/')) {
      console.log('Main: Находимся на публичной странице, пропускаем проверку аутентификации');
      return;
    }
    
    // ВСЕГДА проверяем аутентификацию через API, если есть токен
    // НЕ полагаемся на isAuth из localStorage, так как его легко подделать
    if (token) {
      console.log('Main: Найден токен, проверяем аутентификацию через API...');
      await checkAuth();
    } else {
      console.log('Main: Токен не найден, пользователь не аутентифицирован');
    }
    
    // Обновляем аватары после аутентификации
    setTimeout(async () => {
      const user = useAuthStore.getState().user;
      const updateAvatarsInDOM = useAuthStore.getState().updateAvatarsInDOM;
      console.log('Main: проверяем пользователя для обновления аватаров после аутентификации:', user);
      
      if (user?.avatar) {
        console.log('Main: обновляем аватары после аутентификации');
        let avatarUrl = user.avatar;
        
        // Проверяем, является ли avatar уже полным URL или относительным путем
        if (avatarUrl !== 'noAvatar' && !avatarUrl.startsWith('http')) {
          // Если это относительный путь, добавляем базовый URL
          avatarUrl = `${API_CONFIG.BASE_URL}${avatarUrl}`;
        }
        
        updateAvatarsInDOM(avatarUrl);
      }
    }, 200);
    
    console.log('Main: Глобальная инициализация аутентификации завершена');
  } catch (error) {
    console.error('Main: Ошибка при глобальной инициализации аутентификации:', error);
  }
};

// Рендерим приложение сразу без ожидания аутентификации для мгновенной загрузки интерфейса
createRoot(document.getElementById('root')).render( // Создаем React root и рендерим приложение в DOM элемент
  <BrowserRouter> {/* Оборачиваем приложение в роутер для навигации */}
    <App /> {/* Рендерим главный компонент приложения */}
  </BrowserRouter>,
);

// Инициализируем аутентификацию только если мы не на публичных страницах
if (!window.location.pathname.includes('/login') && 
    !window.location.pathname.includes('/registration') && 
    !window.location.pathname.startsWith('/ref/') &&
    !window.location.pathname.startsWith('/profile/activate/')) {
  console.log('Main: Инициализируем аутентификацию для защищенных страниц');
  initializeAuth();
} else {
  console.log('Main: Пропускаем инициализацию аутентификации - находимся на публичной странице');
}
