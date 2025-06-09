import { isAuthenticated } from './AuthService.js';

// Проверка авторизации перед доступом к защищенным маршрутам
export async function canActivate(checkAuthFunction, clearAuthDataFunction) {
  try {
    // Проверяем, есть ли токен в localStorage
    if (!isAuthenticated()) {
      console.log('Пользователь не авторизован');
      return false;
    }

    // Проверяем валидность токена через API
    try {
      await checkAuthFunction();
      return true;
    } catch (error) {
      console.log('Токен недействителен, перенаправляем на логин');
      redirectToLogin(clearAuthDataFunction);
      return false;
    }
  } catch (error) {
    console.error('Ошибка в AuthGuard:', error);
    redirectToLogin(clearAuthDataFunction);
    return false;
  }
}

// Перенаправление на страницу входа
export function redirectToLogin(clearAuthDataFunction) {
  // Очищаем данные авторизации
  if (clearAuthDataFunction) {
    clearAuthDataFunction();
  }
  
  // Перенаправляем на страницу входа
  // В зависимости от вашей архитектуры, это может быть:
  // window.location.href = '/login';
  // или использование роутера
  console.log('Перенаправление на страницу входа');
}

// Проверка ролей пользователя
export function hasRole(currentUser, requiredRole) {
  if (!currentUser) return false;
  
  // Здесь можно добавить логику проверки ролей
  // Например: return currentUser.roles.includes(requiredRole);
  return true; // Пока возвращаем true для всех авторизованных пользователей
}

// Проверка прав доступа
export function hasPermission(currentUser, permission) {
  if (!currentUser) return false;
  
  // Здесь можно добавить логику проверки прав
  // Например: return currentUser.permissions.includes(permission);
  return true; // Пока возвращаем true для всех авторизованных пользователей
}

// Создание AuthGuard с зависимостями
export function createAuthGuard(checkAuthFunction, clearAuthDataFunction, getCurrentUserFunction) {
  return {
    canActivate: () => canActivate(checkAuthFunction, clearAuthDataFunction),
    redirectToLogin: () => redirectToLogin(clearAuthDataFunction),
    hasRole: (requiredRole) => hasRole(getCurrentUserFunction(), requiredRole),
    hasPermission: (permission) => hasPermission(getCurrentUserFunction(), permission)
  };
}

// Экспорт по умолчанию для обратной совместимости
export default {
  canActivate,
  redirectToLogin,
  hasRole,
  hasPermission,
  createAuthGuard
}; 