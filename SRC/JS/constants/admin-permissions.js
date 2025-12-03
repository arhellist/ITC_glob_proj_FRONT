/**
 * Константы разрешений администраторов для фронтенда
 * Должны совпадать с BACKEND/config/permissions.config.js
 */

export const PERMISSIONS = {
  // Уведомления
  SEND_NOTIFICATIONS: 'sendNotifications',
  VIEW_NOTIFICATIONS: 'viewNotifications',
  
  // Логи
  VIEW_LOGS: 'viewLogs',
  EXPORT_LOGS: 'exportLogs',
  
  // Пользователи
  VIEW_USERS: 'viewUsers',
  CREATE_USERS: 'createUsers',
  EDIT_USERS: 'editUsers',
  DELETE_USERS: 'deleteUsers',
  BAN_USERS: 'banUsers',
  
  // Документы
  VIEW_DOCUMENTS: 'viewDocuments',
  APPROVE_DOCUMENTS: 'approveDocuments',
  REJECT_DOCUMENTS: 'rejectDocuments',
  
  // Администраторы
  MANAGE_ADMINS: 'manageAdmins',
  CREATE_ADMINS: 'createAdmins',
  EDIT_ADMINS: 'editAdmins',
  DELETE_ADMINS: 'deleteAdmins',
  
  // Система
  SYSTEM_SETTINGS: 'systemSettings',
  VIEW_SYSTEM_INFO: 'viewSystemInfo',
  MANAGE_CURRENCY: 'manageCurrency',
  MANAGE_PRODUCTS: 'manageProducts',
  
  // Финансы
  VIEW_FINANCIAL_DATA: 'viewFinancialData',
  MANAGE_ACCOUNTS: 'manageAccounts', // Разрешение на управление счетами пользователей
  MANAGE_DEPOSITS: 'manageDeposits',
  MANAGE_WITHDRAWALS: 'manageWithdrawals',
  VIEW_TRANSACTIONS: 'viewTransactions',
  
  // Отчеты
  VIEW_REPORTS: 'viewReports',
  EXPORT_REPORTS: 'exportReports',
  CREATE_REPORTS: 'createReports',
  
  // Безопасность
  VIEW_SECURITY_LOGS: 'viewSecurityLogs',
  MANAGE_SESSIONS: 'manageSessions',
  RESET_PASSWORDS: 'resetPasswords'
};

export const ROLES = {
  ROOT: 'ROOT',
  ADMIN: 'ADMIN',
  MODERATOR: 'MODERATOR',
  SUPPORT: 'SUPPORT',
  VIEWER: 'VIEWER'
};

// Уровни доступа ролей
export const ROLE_LEVELS = {
  [ROLES.ROOT]: 5,
  [ROLES.ADMIN]: 4,
  [ROLES.MODERATOR]: 3,
  [ROLES.SUPPORT]: 2,
  [ROLES.VIEWER]: 1
};

// Проверка разрешения
export function hasPermission(adminPermissions, permission) {
  return adminPermissions && adminPermissions[permission] === true;
}

// Получение уровня доступа роли
export function getRoleLevel(role) {
  return ROLE_LEVELS[role] || 0;
}

// Проверка, может ли одна роль управлять другой
export function canManageRole(managerRole, targetRole) {
  const managerLevel = getRoleLevel(managerRole);
  const targetLevel = getRoleLevel(targetRole);
  return managerLevel > targetLevel;
}
