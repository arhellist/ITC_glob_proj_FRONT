import { login, registration, logout, checkAuth, clearAuthData, isAuthenticated, currentUser } from '../store/store.js';
import { isAuthenticated as authIsAuthenticated, getUser } from '../services/AuthService.js';
import { canActivate, hasRole, hasPermission, createAuthGuard } from '../services/AuthGuard.js';
import axiosAPI from '../http/axios.js';

// Создаем AuthGuard с зависимостями
const authGuard = createAuthGuard(checkAuth, clearAuthData, currentUser);

// Пример входа в систему
export async function loginExample() {
  try {
    const email = 'user@example.com';
    const password = 'password123';
    
    console.log('Попытка входа...');
    const response = await login(email, password);
    
    console.log('Вход успешен:', response.data);
    console.log('Пользователь авторизован:', isAuthenticated());
    console.log('Данные пользователя:', currentUser());
    
    return response;
  } catch (error) {
    console.error('Ошибка входа:', error.response?.data?.message);
    throw error;
  }
}

// Пример регистрации
export async function registrationExample() {
  try {
    const email = 'newuser@example.com';
    const password = 'password123';
    const name = 'Новый Пользователь';
    const phone = '+7-999-123-45-67';
    
    console.log('Попытка регистрации...');
    const response = await registration(email, password, name, phone);
    
    console.log('Регистрация успешна:', response.data);
    return response;
  } catch (error) {
    console.error('Ошибка регистрации:', error.response?.data?.message);
    throw error;
  }
}

// Пример выхода из системы
export async function logoutExample() {
  try {
    console.log('Попытка выхода...');
    const response = await logout();
    
    console.log('Выход успешен');
    console.log('Пользователь авторизован:', isAuthenticated());
    
    return response;
  } catch (error) {
    console.error('Ошибка выхода:', error.response?.data?.message);
    throw error;
  }
}

// Пример проверки авторизации
export async function checkAuthExample() {
  try {
    console.log('Проверка авторизации...');
    const canAccess = await authGuard.canActivate();
    
    if (canAccess) {
      console.log('Доступ разрешен');
      console.log('Пользователь:', currentUser());
    } else {
      console.log('Доступ запрещен');
    }
    
    return canAccess;
  } catch (error) {
    console.error('Ошибка проверки авторизации:', error);
    return false;
  }
}

// Пример запроса к защищенному API
export async function protectedApiExample() {
  try {
    // Проверяем авторизацию
    const canAccess = await authGuard.canActivate();
    
    if (!canAccess) {
      console.log('Нет доступа к защищенному API');
      return null;
    }

    // Делаем запрос к защищенному эндпоинту
    console.log('Запрос к защищенному API...');
    const response = await axiosAPI.get('/auth/profile');
    
    console.log('Ответ от защищенного API:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка запроса к защищенному API:', error.response?.data?.message);
    throw error;
  }
}

// Пример обновления профиля
export async function updateProfileExample() {
  try {
    const canAccess = await authGuard.canActivate();
    
    if (!canAccess) {
      console.log('Нет доступа для обновления профиля');
      return null;
    }

    const updateData = {
      name: 'Обновленное Имя',
      phone: '+7-999-987-65-43'
    };

    console.log('Обновление профиля...');
    const response = await axiosAPI.put('/auth/profile', updateData);
    
    console.log('Профиль обновлен:', response.data);
    return response.data;
  } catch (error) {
    console.error('Ошибка обновления профиля:', error.response?.data?.message);
    throw error;
  }
}

// Пример автоматического обновления токенов
export async function tokenRefreshExample() {
  try {
    console.log('Проверка и обновление токенов...');
    const response = await checkAuth();
    
    console.log('Токены обновлены:', response.data);
    return response;
  } catch (error) {
    console.error('Ошибка обновления токенов:', error.response?.data?.message);
    throw error;
  }
}

// Пример проверки ролей
export function checkRoleExample() {
  const user = currentUser();
  const hasAdminRole = authGuard.hasRole('admin');
  const hasUserPermission = authGuard.hasPermission('read:users');
  
  console.log('Проверка ролей и прав:');
  console.log('Пользователь:', user);
  console.log('Имеет роль admin:', hasAdminRole);
  console.log('Имеет право read:users:', hasUserPermission);
  
  return { hasAdminRole, hasUserPermission };
}

// Экспортируем функции для использования в других модулях
export { 
  login, 
  registration, 
  logout, 
  checkAuth, 
  clearAuthData, 
  isAuthenticated, 
  currentUser,
  authGuard,
  authIsAuthenticated,
  getUser,
  axiosAPI 
}; 