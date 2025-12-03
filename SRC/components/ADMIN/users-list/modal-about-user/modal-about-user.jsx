import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import './modal-about-user.css';
import UserProfile from './components/UserProfile';
import UserPartner from './components/UserPartner';
import UserAccounts from './components/UserAccounts';
import UserDocs from './components/UserDocs';
import adminService from '../../../../JS/services/admin-service.js'; // Импорт сервиса администратора для API вызовов

const AboutUserModal = ({ user, products = [], onClose, onUserUpdate }) => {
  const [activeTab, setActiveTab] = useState('user-profile');
  const [documentViewer, setDocumentViewer] = useState(null);
  const [currentUser, setCurrentUser] = useState(user);
  const [rejectModal, setRejectModal] = useState(null); // Модальное окно для причины отклонения {documentId, docKind}
  const [rejectReason, setRejectReason] = useState(''); // Причина отклонения
  const [deleteModal, setDeleteModal] = useState(null); // Модальное окно для подтверждения удаления {documentId, docKind}
  const [passwordResetModal, setPasswordResetModal] = useState(false); // Модальное окно для подтверждения сброса пароля
  const [passwordResetReason, setPasswordResetReason] = useState(''); // Причина сброса пароля
  const [passwordResetLoading, setPasswordResetLoading] = useState(false); // Состояние загрузки при сбросе пароля
  const [accountBlockLoading, setAccountBlockLoading] = useState(false); // Состояние загрузки при блокировке/разблокировке аккаунта
  const [localProducts, setLocalProducts] = useState(products); // Локальное состояние продуктов для модалки

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  useEffect(() => {
    setLocalProducts(products);
  }, [products]);

  // Обработчик обновления файла инвестиционных правил продукта
  useEffect(() => {
    const handleProductRulesUpdated = async (event) => {
      const { productType, productTicker, updatedAt } = event.detail;
      console.log('📄 ModalAboutUser: Получено событие обновления правил продукта:', { productType, productTicker, updatedAt });
      
      try {
        // Перезагружаем список продуктов в модалке
        console.log('📄 ModalAboutUser: Перезагружаем список продуктов после обновления правил');
        const productList = await adminService.getProductsList();
        if (Array.isArray(productList)) {
          setLocalProducts(productList);
          console.log('📄 ModalAboutUser: Продукты обновлены в модалке:', productList.length);
          
          // Также перезагружаем данные пользователя, чтобы обновить документы
          console.log('📄 ModalAboutUser: Перезагружаем данные пользователя после обновления правил продукта');
          const updatedUser = await adminService.getUserById(currentUser.id);
          if (updatedUser) {
            setCurrentUser(updatedUser);
            if (onUserUpdate) {
              onUserUpdate(updatedUser);
            }
          }
        }
      } catch (error) {
        console.error('📄 ModalAboutUser: Ошибка при обновлении продуктов/пользователя после обновления правил продукта:', error);
      }
    };

    document.addEventListener('admin-product-investment-rules-updated', handleProductRulesUpdated);
    console.log('📄 ModalAboutUser: Зарегистрирован обработчик admin-product-investment-rules-updated');
    
    return () => {
      document.removeEventListener('admin-product-investment-rules-updated', handleProductRulesUpdated);
      console.log('📄 ModalAboutUser: Удален обработчик admin-product-investment-rules-updated');
    };
  }, [currentUser, onUserUpdate]);

  // Обработчик WebSocket события о загрузке нового документа
  useEffect(() => {
    const handleDocumentUploaded = (event) => {
      const payload = event.detail;
      if (!payload || !payload.userId || !payload.document) {
        return;
      }

      // Если это документ для текущего пользователя, обновляем его данные
      if (currentUser && currentUser.id === payload.userId) {
        const documents = Array.isArray(currentUser.documents) ? [...currentUser.documents] : [];
        const newDoc = payload.document;
        
        // Проверяем, нет ли уже такого документа
        const existingIndex = documents.findIndex((doc) => doc.id === newDoc.id);
        if (existingIndex >= 0) {
          // Если документ уже есть, обновляем его
          documents[existingIndex] = { ...documents[existingIndex], ...newDoc };
        } else {
          // Если документа нет, добавляем новый
          documents.push(newDoc);
        }

        setCurrentUser({ ...currentUser, documents });
        // Также обновляем родительский компонент
        if (onUserUpdate) {
          onUserUpdate({ ...currentUser, documents });
        }
      }
    };

    document.addEventListener('admin-document-uploaded', handleDocumentUploaded);
    return () => {
      document.removeEventListener('admin-document-uploaded', handleDocumentUploaded);
    };
  }, [currentUser, onUserUpdate]);

  // Обработчик WebSocket события об обновлении статуса документа
  useEffect(() => {
    const handleDocumentStatusUpdate = (event) => {
      const payload = event.detail;
      if (!payload || !payload.userId) {
        return;
      }

      // Если это обновление для текущего пользователя
      if (currentUser && currentUser.id === payload.userId) {
        const documentId = payload.documentId;
        const status = payload.status;

        if (!documentId || !status) {
          return;
        }

        const documents = Array.isArray(currentUser.documents) ? [...currentUser.documents] : [];
        const targetIndex = documents.findIndex((doc) => doc.id === documentId);

        if (targetIndex >= 0) {
          documents[targetIndex] = {
            ...documents[targetIndex],
            status: status,
            updatedAt: payload.document?.updatedAt || payload.updatedAt || new Date().toISOString(),
            notApproveDescription: payload.document?.notApproveDescription || null,
          };

          setCurrentUser({ ...currentUser, documents });
          // Также обновляем родительский компонент
          if (onUserUpdate) {
            onUserUpdate({ ...currentUser, documents });
          }
        }
      }
    };

    document.addEventListener('admin-document-status-updated', handleDocumentStatusUpdate);
    return () => {
      document.removeEventListener('admin-document-status-updated', handleDocumentStatusUpdate);
    };
  }, [currentUser, onUserUpdate]);
  
  // Функция для обработки клика по навигации
  const handleNavClick = (tabName) => {
    setActiveTab(tabName);
  };

  // Функция для просмотра документа
  const handleDocumentView = (docType, imageUrl, fileType = 'image') => { // Добавляем параметр fileType
    setDocumentViewer({ docType, imageUrl, fileType }); // Сохраняем тип файла
  };

  // Функция для закрытия просмотра документа
  const handleCloseDocumentViewer = () => {
    setDocumentViewer(null);
  };

  // Функция для утверждения/отклонения документа
  const handleDocumentAction = async (documentId, docKind, action, notApproveDescription = null) => { // Принимаем ID документа, тип, действие и причину отклонения
    console.log('=== HANDLE DOCUMENT ACTION ==='); // Логируем начало действия
    console.log(`  documentId: ${documentId}`); // Логируем ID документа
    console.log(`  docType: ${docKind}`); // Логируем тип документа
    console.log(`  action: ${action}`); // Логируем действие (approve/reject)
    console.log(`  currentUser.id: ${currentUser.id}`); // Логируем ID пользователя
    console.log(`  notApproveDescription: ${notApproveDescription}`); // Логируем причину отклонения
    
    // Если действие - отклонение и причина не указана, показываем модальное окно для ввода причины
    if (action === 'reject' && !notApproveDescription) {
      setRejectModal({ documentId, docKind });
      return;
    }
    
    try { // Начинаем блок обработки ошибок
      // Определяем новый статус на основе действия (используем статусы из БД)
      const newStatus = action === 'approve' ? 'approve' : 'not approve'; // Преобразуем действие в статус БД
      
      console.log(`  Обновляем статус документа ${documentId} на ${newStatus}`); // Логируем обновление
      console.log(`  Отправляем причину отклонения: "${notApproveDescription}"`); // Логируем причину отклонения
      
      // Вызываем API для обновления статуса документа
      const result = await adminService.updateDocumentStatus(currentUser.id, documentId, newStatus, docKind, notApproveDescription || null); // Отправляем запрос с причиной отклонения
      console.log('  Результат обновления статуса:', result); // Логируем результат
      
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: `Документ ${docKind || 'документ'} #${documentId} ${action === 'approve' ? 'утверждён' : 'отклонён'}`
        }
      }));
      
      // Перезагружаем данные пользователя для обновления UI
      console.log('  Перезагружаем данные пользователя по ID:', currentUser.id); // Логируем перезагрузку
      const updatedUser = await adminService.getUserById(currentUser.id); // Запрашиваем обновлённые данные конкретного пользователя
      
      console.log('  Получены обновлённые данные пользователя:', updatedUser); // Логируем данные
      console.log('  Документы обновлённого пользователя:', updatedUser.documents); // Логируем документы
      console.log('  Документ который обновляли (ID=' + documentId + '):', updatedUser.documents?.find(d => d.id === documentId)); // Логируем обновлённый документ
      console.log('  Обновляем UI с новыми данными пользователя'); // Логируем обновление UI
      handleUserUpdate(updatedUser); // Обновляем данные пользователя в UI
      
    } catch (error) { // Обработка ошибок
      console.error('=== ОШИБКА ОБНОВЛЕНИЯ СТАТУСА ДОКУМЕНТА ==='); // Логируем ошибку
      console.error('  Error:', error); // Логируем объект ошибки
      console.error('  Error message:', error.message); // Логируем сообщение ошибки
      console.error('  Error response:', error.response); // Логируем ответ сервера
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: `Ошибка при обновлении статуса документа: ${error.response?.data?.message || error.message}`
        }
      }));
    }
  };
  
  // Функция подтверждения отклонения с причиной
  const handleConfirmReject = async () => {
    if (!rejectModal || !rejectReason.trim()) {
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Укажите причину отклонения документа'
        }
      }));
      return;
    }
    
    const { documentId, docKind } = rejectModal;
    setRejectModal(null);
    const reason = rejectReason.trim();
    setRejectReason('');
    
    // Вызываем handleDocumentAction с причиной отклонения
    await handleDocumentAction(documentId, docKind, 'reject', reason);
  };
  
  // Функция отмены отклонения
  const handleCancelReject = () => {
    setRejectModal(null);
    setRejectReason('');
  };

  // Функция для удаления документа
  const handleDocumentDelete = (documentId, docKind) => {
    setDeleteModal({ documentId, docKind });
  };

  // Функция подтверждения удаления
  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    
    const { documentId, docKind } = deleteModal;
    setDeleteModal(null);
    
    try {
      console.log('=== HANDLE DOCUMENT DELETE ===');
      console.log(`  documentId: ${documentId}`);
      console.log(`  docKind: ${docKind}`);
      console.log(`  currentUser.id: ${currentUser.id}`);
      
      const result = await adminService.deleteDocument(currentUser.id, documentId, docKind);
      console.log('  Результат удаления:', result);
      
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: `Документ ${docKind || 'документ'} #${documentId} успешно удалён`
        }
      }));
      
      // Перезагружаем данные пользователя для обновления UI
      console.log('  Перезагружаем данные пользователя по ID:', currentUser.id);
      const updatedUser = await adminService.getUserById(currentUser.id);
      
      console.log('  Получены обновлённые данные пользователя:', updatedUser);
      console.log('  Обновляем UI с новыми данными пользователя');
      handleUserUpdate(updatedUser);
      
    } catch (error) {
      console.error('=== ОШИБКА УДАЛЕНИЯ ДОКУМЕНТА ===');
      console.error('  Error:', error);
      console.error('  Error message:', error.message);
      console.error('  Error response:', error.response);
      
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: `Ошибка при удалении документа: ${error.response?.data?.message || error.message}`
        }
      }));
    }
  };

  // Функция отмены удаления
  const handleCancelDelete = () => {
    setDeleteModal(null);
  };
  
  // Функция для обновления данных пользователя
  const handleUserUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    if (onUserUpdate) {
      onUserUpdate(updatedUser);
    }
  };

  // Функция для открытия модалки сброса пароля
  const handleOpenPasswordResetModal = () => {
    setPasswordResetModal(true);
    setPasswordResetReason('');
  };

  // Функция для закрытия модалки сброса пароля
  const handleClosePasswordResetModal = () => {
    setPasswordResetModal(false);
    setPasswordResetReason('');
  };

  // Функция для блокировки/разблокировки аккаунта
  const handleAccountBlockToggle = async () => {
    if (!currentUser) return;
    
    const isBlocked = currentUser.isBlocked || false;
    const action = isBlocked ? 'разблокировать' : 'заблокировать';
    
    if (!window.confirm(`Вы уверены, что хотите ${action} аккаунт пользователя ${currentUser.fullName}?`)) {
      return;
    }
    
    setAccountBlockLoading(true);
    
    try {
      console.log(`=== ${action.toUpperCase()} АККАУНТА ===`);
      console.log('  userId:', currentUser.id);
      console.log('  current status:', isBlocked ? 'заблокирован' : 'разблокирован');
      
      const result = await adminService.toggleAccountBlock(currentUser.id, !isBlocked);
      
      console.log('  Результат:', result);
      
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: `Аккаунт успешно ${isBlocked ? 'разблокирован' : 'заблокирован'}`
        }
      }));
      
      // Перезагружаем данные пользователя для обновления UI
      const updatedUser = await adminService.getUserById(currentUser.id);
      handleUserUpdate(updatedUser);
      
    } catch (error) {
      console.error(`=== ОШИБКА ${action.toUpperCase()} АККАУНТА ===`);
      console.error('  Error:', error);
      
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: `Ошибка при ${action} аккаунта: ${error.response?.data?.message || error.message}`
        }
      }));
    } finally {
      setAccountBlockLoading(false);
    }
  };

  // Функция для подтверждения сброса пароля
  const handleConfirmPasswordReset = async () => {
    if (!currentUser) return;
    
    setPasswordResetLoading(true);
    
    try {
      console.log('=== ПРИНУДИТЕЛЬНЫЙ СБРОС ПАРОЛЯ ===');
      console.log('  userId:', currentUser.id);
      console.log('  reason:', passwordResetReason || 'Принудительный сброс пароля администратором');
      
      const result = await adminService.forcePasswordReset(
        currentUser.id,
        passwordResetReason || 'Принудительный сброс пароля администратором'
      );
      
      console.log('  Результат сброса пароля:', result);
      
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Пароль успешно сброшен. Пользователю отправлено уведомление на email.'
        }
      }));
      
      // Закрываем модалку
      handleClosePasswordResetModal();
      
    } catch (error) {
      console.error('=== ОШИБКА СБРОСА ПАРОЛЯ ===');
      console.error('  Error:', error);
      console.error('  Error message:', error.message);
      console.error('  Error response:', error.response);
      
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: `Ошибка при сбросе пароля: ${error.response?.data?.message || error.message}`
        }
      }));
    } finally {
      setPasswordResetLoading(false);
    }
  };
  
  if (!currentUser) return null;

  const rootEl = typeof document !== 'undefined' ? document.querySelector('.root') : null;
  if (!rootEl) return null;
  return createPortal(
    <div className="admin-modal-window admin-user-portfolio flex flex-column" onClick={onClose}>
      <div className="admin-user-portfolio-bg gradient-border bru-max flex flex-column" onClick={(e) => e.stopPropagation()}>
        <div className="admin-user-portfolio-close flex pointer" onClick={onClose}>
          <div className="admin-user-portfolio-close-icon img"></div>
        </div>
        <div className="admin-user-portfolio-header flex flex-row">
          <div className="admin-user-portfolio-header-name">{currentUser.fullName}</div>
          <div className="admin-user-portfolio-header-email">{currentUser.email}</div>
        </div>
        <div className="admin-user-portfolio-list bg-color-main bru-max gradient-border flex flex-column">
          
          <nav className="admin-user-portfolio-list-nav flex flex-row">
            <div 
              className={`admin-user-portfolio-list-nav-item flex pointer ${activeTab === 'user-profile' ? 'btnActive' : ''}`}
              onClick={() => handleNavClick('user-profile')}
            >
              <div className="admin-user-portfolio-list-nav-item-icon img user-profile"></div>
            </div>
            <div 
              className={`admin-user-portfolio-list-nav-item flex pointer ${activeTab === 'user-partner' ? 'btnActive' : ''}`}
              onClick={() => handleNavClick('user-partner')}
            >
              <div className="admin-user-portfolio-list-nav-item-icon img user-partner"></div>
            </div>
            <div 
              className={`admin-user-portfolio-list-nav-item flex pointer ${activeTab === 'user-accouns' ? 'btnActive' : ''}`}
              onClick={() => handleNavClick('user-accouns')}
            >
              <div className="admin-user-portfolio-list-nav-item-icon img user-accouns"></div>
            </div>
   
            <div 
              className={`admin-user-portfolio-list-nav-item flex pointer ${activeTab === 'user-docs' ? 'btnActive' : ''}`}
              onClick={() => handleNavClick('user-docs')}
            >
              <div className="admin-user-portfolio-list-nav-item-icon img user-docs"></div>
            </div>
          </nav>

          {activeTab === 'user-profile' && (
            <UserProfile 
              user={currentUser} 
              onUserUpdate={handleUserUpdate}
              onPasswordReset={handleOpenPasswordResetModal}
              onAccountBlock={handleAccountBlockToggle}
            />
          )}

          {activeTab === 'user-partner' && <UserPartner user={currentUser} />}

          {activeTab === 'user-accouns' && <UserAccounts user={currentUser} />}

          {activeTab === 'user-docs' && (
            <UserDocs 
              user={currentUser} 
              products={localProducts}
              onDocumentView={handleDocumentView}
              onDocumentAction={handleDocumentAction}
              onDocumentDelete={handleDocumentDelete}
            />
          )}





        </div>

      </div>

      {/* Модальное окно для ввода причины отклонения документа */}
      {rejectModal && (
        <div className="admin-modal-window admin-reject-document-modal" onClick={handleCancelReject}>
          <div className="admin-modal-content admin-reject-modal-content bg-color-main bru-max gradient-border" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header admin-reject-modal-header">
              <h3>Причина отклонения документа</h3>
              <button className="admin-modal-close admin-reject-modal-close" onClick={handleCancelReject}>×</button>
            </div>
            <div className="admin-modal-body admin-reject-modal-body">
              <p>Укажите причину отклонения документа:</p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Введите причину отклонения..."
                className="admin-reject-reason-input"
                rows={5}
              />
            </div>
            <div className="admin-modal-footer admin-reject-modal-footer">
              <button
                className="admin-reject-modal-btn admin-reject-modal-btn--cancel"
                onClick={handleCancelReject}
              >
                Отмена
              </button>
              <button
                className="admin-reject-modal-btn admin-reject-modal-btn--submit"
                onClick={handleConfirmReject}
                disabled={!rejectReason.trim()}
              >
                Отклонить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для подтверждения удаления документа */}
      {deleteModal && (
        <div className="admin-modal-window admin-delete-document-modal" onClick={handleCancelDelete}>
          <div className="admin-modal-content admin-delete-modal-content bg-color-main bru-max gradient-border" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header admin-delete-modal-header">
              <h3>Подтверждение удаления</h3>
              <button className="admin-modal-close admin-delete-modal-close" onClick={handleCancelDelete}>×</button>
            </div>
            <div className="admin-modal-body admin-delete-modal-body">
              <p>Вы уверены, что хотите удалить этот документ?</p>
              <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
                Документ будет удалён из базы данных и файловой системы. Это действие нельзя отменить.
              </p>
            </div>
            <div className="admin-modal-footer admin-delete-modal-footer">
              <button
                className="admin-delete-modal-btn admin-delete-modal-btn--cancel"
                onClick={handleCancelDelete}
              >
                Отмена
              </button>
              <button
                className="admin-delete-modal-btn admin-delete-modal-btn--submit"
                onClick={handleConfirmDelete}
                style={{
                  backgroundColor: '#f44336',
                  color: 'white'
                }}
              >
                🗑️ Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для подтверждения сброса пароля */}
      {passwordResetModal && (
        <div className="admin-modal-window admin-password-reset-modal" onClick={handleClosePasswordResetModal}>
          <div className="admin-modal-content admin-password-reset-modal-content bg-color-main bru-max gradient-border" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header admin-password-reset-modal-header">
              <h3>Подтверждение сброса пароля</h3>
              <button className="admin-modal-close admin-password-reset-modal-close" onClick={handleClosePasswordResetModal}>×</button>
            </div>
            <div className="admin-modal-body admin-password-reset-modal-body">
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ marginBottom: '1rem', fontSize: '1rem', color: '#fff' }}>
                  <strong>Внимание!</strong> Вы собираетесь принудительно сбросить пароль для пользователя:
                </p>
                <div style={{ 
                  padding: '1rem', 
                  backgroundColor: 'rgba(255, 255, 255, 0.05)', 
                  borderRadius: '8px',
                  marginBottom: '1rem'
                }}>
                  <p style={{ margin: '0.5rem 0', color: '#fff' }}>
                    <strong>Имя:</strong> {currentUser?.fullName || 'Не указано'}
                  </p>
                  <p style={{ margin: '0.5rem 0', color: '#fff' }}>
                    <strong>Email:</strong> {currentUser?.email || 'Не указано'}
                  </p>
                </div>
              </div>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ marginBottom: '0.5rem', fontSize: '0.95rem', color: '#ffa726' }}>
                  <strong>Что произойдет после сброса пароля:</strong>
                </p>
                <ul style={{ 
                  margin: '0.5rem 0', 
                  paddingLeft: '1.5rem', 
                  color: '#ccc',
                  fontSize: '0.9rem',
                  lineHeight: '1.6'
                }}>
                  <li>Пользователю будет установлен флаг принудительного сброса пароля</li>
                  <li>Все активные сессии пользователя будут завершены</li>
                  <li>Пользователь не сможет войти в систему со старым паролем</li>
                  <li>На email пользователя будет отправлено письмо с инструкцией по сбросу пароля</li>
                  <li>Пользователю потребуется установить новый пароль через форму восстановления</li>
                </ul>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '0.5rem', 
                  fontSize: '0.95rem', 
                  color: '#fff' 
                }}>
                  Причина сброса пароля (необязательно):
                </label>
                <textarea
                  value={passwordResetReason}
                  onChange={(e) => setPasswordResetReason(e.target.value)}
                  placeholder="Укажите причину сброса пароля (например: подозрительная активность, запрос пользователя и т.д.)"
                  className="admin-password-reset-reason-input"
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ 
                padding: '1rem', 
                backgroundColor: 'rgba(255, 152, 0, 0.1)', 
                borderRadius: '8px',
                border: '1px solid rgba(255, 152, 0, 0.3)'
              }}>
                <p style={{ margin: 0, fontSize: '0.9rem', color: '#ffa726' }}>
                  ⚠️ <strong>Это действие нельзя отменить.</strong> Убедитесь, что вы действительно хотите сбросить пароль пользователя.
                </p>
              </div>
            </div>
            <div className="admin-modal-footer admin-password-reset-modal-footer">
              <button
                className="admin-password-reset-modal-btn admin-password-reset-modal-btn--cancel"
                onClick={handleClosePasswordResetModal}
                disabled={passwordResetLoading}
              >
                Отмена
              </button>
              <button
                className="admin-password-reset-modal-btn admin-password-reset-modal-btn--submit"
                onClick={handleConfirmPasswordReset}
                disabled={passwordResetLoading}
                style={{
                  backgroundColor: '#ff6b6b',
                  color: 'white'
                }}
              >
                {passwordResetLoading ? 'Сброс пароля...' : 'СБРОСИТЬ ПАРОЛЬ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра документа */}
      {documentViewer && (
        <div className="document-viewer-modal" onClick={handleCloseDocumentViewer}>
          <div className="document-viewer-content" onClick={(e) => e.stopPropagation()}>
            <div className="document-viewer-close" onClick={handleCloseDocumentViewer}>
              <span>×</span>
            </div>
            <div className="document-viewer-title">{documentViewer.docType.toUpperCase()}</div>
            <div className="document-viewer-image-container">
              {/* Проверяем тип файла - сначала по явному параметру fileType, затем по URL */}
              {(documentViewer.fileType === 'pdf' || (documentViewer.imageUrl && documentViewer.imageUrl.toLowerCase().includes('.pdf'))) ? (
                // Для PDF документов используем iframe с полным функционалом
                <iframe 
                  src={documentViewer.imageUrl} // URL PDF документа
                  style={{ // Стили для iframe
                    width: '90vw', // Ширина 90% от viewport
                    height: '90vh', // Высота 90% от viewport
                    border: 'none', // Без рамки
                    borderRadius: '8px' // Скруглённые углы
                  }}
                  title={`PDF viewer - ${documentViewer.docType}`} // Заголовок для доступности
                />
              ) : (
                // Для изображений используем img с zoom функционалом
                <img 
                  src={documentViewer.imageUrl} 
                  alt={documentViewer.docType}
                  className="document-viewer-image"
                  style={{ 
                    maxWidth: '90vw', 
                    maxHeight: '90vh', 
                    objectFit: 'contain',
                    cursor: 'zoom-in'
                  }}
                  onClick={(e) => {
                    if (e.target.style.transform === 'scale(2)') {
                      e.target.style.transform = 'scale(1)';
                      e.target.style.cursor = 'zoom-in';
                    } else {
                      e.target.style.transform = 'scale(2)';
                      e.target.style.cursor = 'zoom-out';
                    }
                  }}
                  draggable={false}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    , rootEl
  );
};

export default AboutUserModal;