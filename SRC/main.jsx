import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

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
    const isAuth = useAuthStore.getState().isAuth;
    
    // Проверяем наличие токена в localStorage
    const token = localStorage.getItem('accessToken');
    console.log('Main: Токен в localStorage:', token);
    
    // Если пользователь уже аутентифицирован в store И есть токен, не делаем API запрос
    if (isAuth && token) {
      console.log('Main: Пользователь уже аутентифицирован в store и токен есть, пропускаем API запрос');
      
      // Обновляем аватары сразу при загрузке с задержкой для DOM
      setTimeout(() => {
        const user = useAuthStore.getState().user;
        const updateAvatarsInDOM = useAuthStore.getState().updateAvatarsInDOM;
        console.log('Main: проверяем пользователя для обновления аватаров:', user);
        
        if (user?.avatar) {
          console.log('Main: обновляем аватары при загрузке приложения');
          let avatarUrl = user.avatar;
          
          // Проверяем, является ли avatar уже полным URL или относительным путем
          if (avatarUrl !== 'noAvatar' && !avatarUrl.startsWith('http')) {
            // Если это относительный путь, добавляем базовый URL
            avatarUrl = `http://localhost:3000${avatarUrl}`;
          }
          
          updateAvatarsInDOM(avatarUrl);
        }
      }, 200);
      
      return;
    }
    
    // Если нет токена или пользователь не аутентифицирован, проверяем через API
    console.log('Main: Проверяем аутентификацию через API...');
    await checkAuth();
    
    // Обновляем аватары после аутентификации
    setTimeout(() => {
      const user = useAuthStore.getState().user;
      const updateAvatarsInDOM = useAuthStore.getState().updateAvatarsInDOM;
      console.log('Main: проверяем пользователя для обновления аватаров после аутентификации:', user);
      
      if (user?.avatar) {
        console.log('Main: обновляем аватары после аутентификации');
        let avatarUrl = user.avatar;
        
        // Проверяем, является ли avatar уже полным URL или относительным путем
        if (avatarUrl !== 'noAvatar' && !avatarUrl.startsWith('http')) {
          // Если это относительный путь, добавляем базовый URL
          avatarUrl = `http://localhost:3000${avatarUrl}`;
        }
        
        updateAvatarsInDOM(avatarUrl);
      }
    }, 200);
    
    console.log('Main: Глобальная инициализация аутентификации завершена');
  } catch (error) {
    console.error('Main: Ошибка при глобальной инициализации аутентификации:', error);
  }
};

// Инициализируем аутентификацию перед рендерингом приложения
initializeAuth().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
});
