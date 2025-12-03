/**
 * Модалка для управления очередью отправки писем
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axiosAPI from '../../../../JS/auth/http/axios';
import { ErrorNotification, SuccessNotification } from '../../../../JS/utils/notifications';
import './EmailQueueModal.css';
import EmailViewer from '../email-viewer/EmailViewer';
import EmailModal from '../email-modal/EmailModal';
import { getSocket } from '../../../../JS/websocket/websocket-service';

const EmailQueueModal = ({ isOpen, onClose }) => {
    // Состояние очередей рассылок
    const [broadcasts, setBroadcasts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedBroadcast, setSelectedBroadcast] = useState(null);
    const [broadcastItems, setBroadcastItems] = useState([]);
    const [loadingItems, setLoadingItems] = useState(false);
    
    // Состояние управления очередью
    const [activeBroadcastId, setActiveBroadcastId] = useState(null);
    
    // Детальная карточка клиента
    const [selectedRecipient, setSelectedRecipient] = useState(null);
    const [clientDetails, setClientDetails] = useState(null);
    const [loadingClientDetails, setLoadingClientDetails] = useState(false);

    // Модалка подтверждения отмены
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [broadcastToCancel, setBroadcastToCancel] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [broadcastToDelete, setBroadcastToDelete] = useState(null);

    // Модалка просмотра письма
    const [showEmailViewer, setShowEmailViewer] = useState(false);
    const [emailToView, setEmailToView] = useState(null);

    // Аккордеон для завершенных рассылок
    const [showCompletedAccordion, setShowCompletedAccordion] = useState(false);
    
    // WebSocket для обновлений статуса
    const [socket, setSocket] = useState(null);
    
    // Состояние фильтрации
    const [isFiltered, setIsFiltered] = useState(false);
    const [filteredItems, setFilteredItems] = useState([]);
    const [readyBroadcastId, setReadyBroadcastId] = useState(null); // ID рассылки, которая готова к отправке
    
    // Состояние для живого отсчета времени
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Принудительное обновление для отладки
    const [forceUpdate, setForceUpdate] = useState(0);
    
    // Время когда была нажата кнопка ГОТОВО (для пересчета таймеров после паузы)
    const [readyTime, setReadyTime] = useState(null);
    
    // Состояние синхронизации таймеров с сервером
    const [timerSyncState, setTimerSyncState] = useState({
        isActive: false,        // Активна ли синхронизация
        lastSentTime: null,    // Время отправки последнего письма
        nextSendTime: null,    // Время следующей отправки
        currentPosition: 0     // Текущая позиция в очереди
    });
    
    // Константа для интервала между письмами
    const delayPerEmail = 6667; // 6.67 секунд между письмами (9 писем в минуту)

    /**
     * Загрузка всех очередей рассылок
     */
    const loadBroadcasts = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await axiosAPI.get('/admin/email/broadcast/queues');
            console.log('📊 Получены очереди рассылок:', data);
            
            if (data && data.length > 0) {
                setBroadcasts(data);
                // Определяем активную очередь
                const active = data.find(b => b.status === 'in_progress' || b.status === 'sending');
                setActiveBroadcastId(active?.id || null);
                
                // Проверяем, не завершилась ли рассылка, которая была готова
                if (readyBroadcastId) {
                    const readyBroadcast = data.find(b => b.id === readyBroadcastId);
                    if (readyBroadcast && (readyBroadcast.status === 'completed' || readyBroadcast.status === 'cancelled')) {
                        console.log('📧 Готовая рассылка завершена, сбрасываем readyBroadcastId');
                        setReadyBroadcastId(null);
                        setIsFiltered(false);
                        setFilteredItems([]);
                    }
                }
            } else {
                setBroadcasts([]);
                setActiveBroadcastId(null);
            }
        } catch (error) {
            console.error('Ошибка загрузки очередей:', error);
            setBroadcasts([]);
        } finally {
            setLoading(false);
        }
    }, [readyBroadcastId]);

    /**
     * Загрузка элементов конкретной очереди
     */
    const loadBroadcastItems = useCallback(async (broadcastId) => {
        try {
            setLoadingItems(true);
            const { data } = await axiosAPI.get(`/admin/email/broadcast/queues/${broadcastId}/items`);
            console.log('📋 Получены элементы очереди:', data);
            
            if (data && data.length > 0) {
                setBroadcastItems(data);
            } else {
                setBroadcastItems([]);
            }
        } catch (error) {
            console.error('Ошибка загрузки элементов очереди:', error);
            setBroadcastItems([]);
        } finally {
            setLoadingItems(false);
        }
    }, []);

    /**
     * Отмена рассылки (перевод в статус cancelled)
     */
    const cancelBroadcast = async (broadcastId) => {
        // Показываем модалку подтверждения
        setBroadcastToCancel(broadcastId);
        setShowCancelConfirm(true);
    };


    /**
     * Подтверждение удаления рассылки
     */
    const confirmDeleteBroadcast = async () => {
        if (!broadcastToDelete) return;
        
        try {
            console.log(`🗑️ Удаление рассылки ${broadcastToDelete}`);
            
            const response = await axiosAPI.delete(`/admin/email/broadcast/queues/${broadcastToDelete}`);
            
            if (response.data.success) {
                console.log('✅ Рассылка успешно удалена');
                
                // Обновляем список рассылок
                await loadBroadcasts();
                
                // Если удаляемая рассылка была выбрана - сбрасываем выбор
                if (selectedBroadcast?.id === broadcastToDelete) {
                    setSelectedBroadcast(null);
                    setBroadcastItems([]);
                    setIsFiltered(false);
                    setFilteredItems([]);
                }
                
                // Показываем уведомление
                SuccessNotification(document.querySelector('.root-content-notification-container'), 'Рассылка успешно удалена!');
            } else {
                console.error('❌ Ошибка удаления рассылки:', response.data.error);
                ErrorNotification(document.querySelector('.root-content-notification-container'), `Ошибка удаления рассылки: ${response.data.error}`);
            }
        } catch (error) {
            console.error('❌ Ошибка удаления рассылки:', error);
            ErrorNotification(document.querySelector('.root-content-notification-container'), `Ошибка удаления рассылки: ${error.response?.data?.error || error.message}`);
        } finally {
            // Закрываем модалку
            setShowDeleteConfirm(false);
            setBroadcastToDelete(null);
        }
    };

    /**
     * Повторение рассылки
     */
    const repeatBroadcast = async (broadcastId) => {
        try {
            console.log(`🔄 Повторение рассылки ${broadcastId}`);
            
            const response = await axiosAPI.post(`/admin/email/broadcast/queues/${broadcastId}/repeat`);
            
            if (response.data.success) {
                console.log('✅ Рассылка успешно повторена');
                
                // Обновляем список рассылок
                await loadBroadcasts();
                
                // Показываем уведомление
                SuccessNotification(document.querySelector('.root-content-notification-container'), 'Рассылка успешно повторена!');
            } else {
                console.error('❌ Ошибка повторения рассылки:', response.data.error);
                ErrorNotification(document.querySelector('.root-content-notification-container'), `Ошибка повторения рассылки: ${response.data.error}`);
            }
        } catch (error) {
            console.error('❌ Ошибка повторения рассылки:', error);
            ErrorNotification(document.querySelector('.root-content-notification-container'), `Ошибка повторения рассылки: ${error.response?.data?.error || error.message}`);
        }
    };

    /**
     * Запуск рассылки
     */
    const startBroadcast = async (broadcastId) => {
        console.log('🔍 startBroadcast вызвана', {
            broadcastId,
            readyBroadcastId,
            isFiltered,
            shouldBeBlocked: readyBroadcastId !== broadcastId
        });
        
        // Проверяем, что рассылка готова
        if (readyBroadcastId !== broadcastId) {
            console.error('❌ Попытка запуска неготовой рассылки!', {
                broadcastId,
                readyBroadcastId,
                isFiltered
            });
            ErrorNotification(document.querySelector('.root-content-notification-container'), 'Сначала нажмите ГОТОВО для фильтрации получателей');
            return;
        }
        
        try {
            const response = await axiosAPI.post(`/admin/email/broadcast/queues/${broadcastId}/start`, {
                adminId: 1
            });
            
            if (response.data.success) {
                SuccessNotification(document.querySelector('.root-content-notification-container'), 'Рассылка запущена');
                
                // Инициализируем синхронизацию таймеров
                initializeTimerSync(broadcastId);
                
                // Обновляем только статус рассылки локально, без полной перезагрузки
                setBroadcasts(prev => prev.map(b => 
                    b.id === broadcastId ? { ...b, status: 'sending', started_at: new Date().toISOString() } : b
                ));
                
                // Обновляем activeBroadcastId
                setActiveBroadcastId(broadcastId);
                
                // Обновляем selectedBroadcast локально
                if (selectedBroadcast?.id === broadcastId) {
                    setSelectedBroadcast(prev => ({
                        ...prev,
                        status: 'sending',
                        started_at: new Date().toISOString()
                    }));
                }
                
                console.log('🔄 Рассылка запущена, таймеры инициализированы, состояние обновлено локально');
            }
        } catch (error) {
            console.error('Ошибка запуска рассылки:', error);
            ErrorNotification(document.querySelector('.root-content-notification-container'), 'Ошибка запуска рассылки');
        }
    };

    /**
     * Пауза рассылки
     */
    const pauseBroadcast = async (broadcastId) => {
        try {
            const response = await axiosAPI.post(`/admin/email/broadcast/queues/${broadcastId}/pause`, {
                adminId: 1
            });
            
            if (response.data.success) {
                SuccessNotification(document.querySelector('.root-content-notification-container'), 'Рассылка приостановлена');
                
                // Обновляем только статус рассылки локально, без полной перезагрузки
                setBroadcasts(prev => prev.map(b => 
                    b.id === broadcastId ? { ...b, status: 'paused', paused_at: new Date().toISOString() } : b
                ));
                
                // Сбрасываем activeBroadcastId
                setActiveBroadcastId(null);
                
                // Обновляем selectedBroadcast локально
                if (selectedBroadcast?.id === broadcastId) {
                    setSelectedBroadcast(prev => ({
                        ...prev,
                        status: 'paused',
                        paused_at: new Date().toISOString()
                    }));
                }
                
                // При паузе сбрасываем только фильтрацию, но сохраняем readyBroadcastId для таймеров
                if (readyBroadcastId === broadcastId) {
                    console.log('🔄 Сбрасываем фильтрацию при паузе рассылки, но сохраняем readyBroadcastId для таймеров', {
                        broadcastId,
                        currentReadyBroadcastId: readyBroadcastId,
                        currentIsFiltered: isFiltered,
                        currentFilteredItemsLength: filteredItems.length
                    });
                    setIsFiltered(false);
                    setFilteredItems([]);
                    // НЕ сбрасываем readyBroadcastId - он нужен для таймеров
                    setForceUpdate(prev => prev + 1); // Принудительное обновление
                    console.log('🔄 Фильтрация сброшена, readyBroadcastId сохранен для таймеров');
                } else {
                    console.log('🔄 Рассылка не была готова, состояние не сбрасываем', {
                        broadcastId,
                        currentReadyBroadcastId: readyBroadcastId
                    });
                }
                
                console.log('🔄 Рассылка приостановлена, состояние обновлено локально');
            }
        } catch (error) {
            console.error('Ошибка паузы рассылки:', error);
            ErrorNotification(document.querySelector('.root-content-notification-container'), 'Ошибка приостановки рассылки');
        }
    };


    /**
     * Подтверждение отмены рассылки
     */
    const confirmCancelBroadcast = async () => {
        if (!broadcastToCancel) return;
        
        try {
            const response = await axiosAPI.post(`/admin/email/broadcast/queues/${broadcastToCancel}/cancel`, {
                adminId: 1
            });
            
            if (response.data.success) {
                SuccessNotification(document.querySelector('.root-content-notification-container'), 'Рассылка отменена');
                
                // Обновляем только статус рассылки локально, без полной перезагрузки
                setBroadcasts(prev => prev.map(b => 
                    b.id === broadcastToCancel ? { ...b, status: 'cancelled', cancelled_at: new Date().toISOString() } : b
                ));
                
                // Сбрасываем activeBroadcastId если это была активная рассылка
                if (activeBroadcastId === broadcastToCancel) {
                    setActiveBroadcastId(null);
                }
                
                // Обновляем selectedBroadcast локально
                if (selectedBroadcast?.id === broadcastToCancel) {
                    setSelectedBroadcast(prev => ({
                        ...prev,
                        status: 'cancelled',
                        cancelled_at: new Date().toISOString()
                    }));
                }
                
                console.log('🔄 Рассылка отменена, состояние обновлено локально');
            }
        } catch (error) {
            console.error('Ошибка отмены рассылки:', error);
            ErrorNotification(document.querySelector('.root-content-notification-container'), 'Ошибка отмены рассылки');
        } finally {
            setShowCancelConfirm(false);
            setBroadcastToCancel(null);
        }
    };

    /**
     * Отмена подтверждения отмены рассылки
     */
    const cancelCancelBroadcast = () => {
        setShowCancelConfirm(false);
        setBroadcastToCancel(null);
    };

    /**
     * Просмотр письма рассылки
     */
    const viewBroadcastEmail = async (broadcast) => {
        console.log('🔍 Просмотр письма рассылки:', broadcast);
        console.log('🔍 Доступные поля broadcast:', Object.keys(broadcast));
        
        try {
            // Получаем полные данные рассылки из API
            const response = await axiosAPI.get(`/admin/email/broadcast/queues/${broadcast.id}`);
            const broadcastDetails = response.data;
            
            console.log('🔍 Полные данные рассылки:', broadcastDetails);
            
            // Создаем объект письма в формате, который ожидает EmailModal
            const emailData = {
                id: `broadcast_${broadcast.id}`,
                subject: broadcastDetails.subject || broadcast.subject || 'Без темы',
                body_html: broadcastDetails.body_html || (broadcastDetails.body_text ? `<pre>${broadcastDetails.body_text}</pre>` : '<p>Содержимое письма недоступно</p>'),
                body_text: broadcastDetails.body_text || broadcastDetails.body || 'Содержимое письма недоступно',
                from: broadcastDetails.from_email || broadcastDetails.from || 'noreply@company.com',
                to: 'Массовая рассылка',
                date: broadcastDetails.created_at || broadcast.createdAt || new Date().toISOString(),
                is_broadcast: true,
                broadcast_id: broadcast.id
            };
            
            console.log('🔍 Данные письма для просмотра:', emailData);
            setEmailToView(emailData);
            setShowEmailViewer(true);
            console.log('🔍 Устанавливаем showEmailViewer = true');
            
        } catch (error) {
            console.error('❌ Ошибка получения данных рассылки:', error);
            
            // Fallback - используем данные из объекта broadcast
            const emailData = {
                id: `broadcast_${broadcast.id}`,
                subject: broadcast.subject || 'Без темы',
                body_html: '<p>Ошибка загрузки содержимого письма</p>',
                body_text: 'Ошибка загрузки содержимого письма',
                from: 'noreply@company.com',
                to: 'Массовая рассылка',
                date: broadcast.createdAt || new Date().toISOString(),
                is_broadcast: true,
                broadcast_id: broadcast.id
            };
            
            setEmailToView(emailData);
            setShowEmailViewer(true);
        }
    };

    /**
     * Закрытие просмотра письма
     */
    const closeEmailViewer = () => {
        setShowEmailViewer(false);
        setEmailToView(null);
    };

    /**
     * Разделение рассылок на активные и завершенные (мемоизированно)
     */
    const { activeBroadcasts, completedBroadcasts } = useMemo(() => {
        const active = broadcasts.filter(broadcast => 
            broadcast.status === 'queued' || broadcast.status === 'running' || broadcast.status === 'paused' || broadcast.status === 'sending'
        );
        
        const completed = broadcasts.filter(broadcast => 
            broadcast.status === 'completed' || broadcast.status === 'cancelled' || broadcast.status === 'failed'
        );
        
        return { activeBroadcasts: active, completedBroadcasts: completed };
    }, [broadcasts]);

    /**
     * Обновление статуса элемента очереди
     */
    const updateItemStatus = async (broadcastId, itemId, enabled) => {
        try {
            const response = await axiosAPI.put(`/admin/email/broadcast/queues/${broadcastId}/items/${itemId}`, {
                enabled
            });
            
            if (response.data.success) {
                // Обновляем локальное состояние
                setBroadcastItems(prev => prev.map(item => 
                    item.id === itemId ? { ...item, enabled } : item
                ));
            }
        } catch (error) {
            console.error('Ошибка обновления статуса элемента:', error);
            ErrorNotification(document.querySelector('.root-content-notification-container'), 'Ошибка обновления статуса элемента');
        }
    };

    /**
     * Загрузка деталей клиента из CRM
     */
    const loadClientDetails = useCallback(async (userId) => {
        try {
            setLoadingClientDetails(true);
            const { data } = await axiosAPI.get('/admin/crm/deals/clients');
            console.log('🔍 Данные клиентов из CRM:', data);
            
            // Проверяем различные возможные структуры данных
            let clientsArray = null;
            
            if (Array.isArray(data)) {
                clientsArray = data;
            } else if (data && Array.isArray(data.data)) {
                clientsArray = data.data;
            } else if (data && Array.isArray(data.clients)) {
                clientsArray = data.clients;
            } else {
                console.error('❌ Не удалось найти массив клиентов в ответе:', data);
                setClientDetails(null);
                return;
            }
            
            const client = clientsArray.find(c => c.id === userId);
            setClientDetails(client || null);
            
        } catch (error) {
            console.error('Ошибка загрузки деталей клиента:', error);
            setClientDetails(null);
        } finally {
            setLoadingClientDetails(false);
        }
    }, []);

    /**
     * Клик по карточке клиента — открываем модалку деталей (CRM-подобная)
     */
    const handleRecipientClick = (recipient) => {
        setSelectedRecipient(recipient);
        if (recipient.user_id) {
            loadClientDetails(recipient.user_id);
        }
    };

    /**
     * Получение цвета статуса
     */
    const getStatusColor = (status) => {
        switch (status) {
            case 'queued': return '#ffa500';
            case 'sent': return '#2196F3';
            case 'delivered': return '#4CAF50';
            case 'failed': return '#f44336';
            case 'cancelled': return '#9E9E9E';
            default: return '#666';
        }
    };

    /**
     * Получение текста статуса
     */
    const getStatusText = (status) => {
        switch (status) {
            case 'queued': return 'Ожидает';
            case 'sent': return 'Отправлено';
            case 'delivered': return 'Доставлено';
            case 'failed': return 'Ошибка';
            case 'cancelled': return 'Отменено';
            default: return status;
        }
    };

    /**
     * Обновление статуса получателя через WebSocket
     */
    const updateRecipientStatus = useCallback((broadcastId, itemId, newStatus, deliveryResult = null) => {
        console.log(`📧 WebSocket: Обновление статуса получателя ${itemId} на ${newStatus}`, deliveryResult);
        
        setBroadcastItems(prev => prev.map(item => {
            if (item.id === itemId) {
                const updatedItem = { ...item, status: newStatus };
                
                // Если есть результат доставки, сохраняем его
                if (deliveryResult) {
                    updatedItem.deliveryResult = deliveryResult;
                }
                
                return updatedItem;
            }
            return item;
        }));
    }, []);

    /**
     * Фильтрация получателей по выбранным
     */
    const filterSelectedRecipients = useCallback((broadcastId) => {
        // Если уже есть готовая рассылка и это не та же рассылка
        if (readyBroadcastId && readyBroadcastId !== broadcastId) {
            return; // Не позволяем активировать другую рассылку
        }

        if (isFiltered && readyBroadcastId === broadcastId) {
            // Отменяем фильтрацию, но НЕ сбрасываем readyBroadcastId для таймеров
            setIsFiltered(false);
            setFilteredItems([]);
            setReadyTime(null); // Сбрасываем время готовности
            // НЕ сбрасываем readyBroadcastId - он нужен для таймеров
            setForceUpdate(prev => prev + 1); // Принудительное обновление
            console.log('📧 Фильтрация отменена, readyBroadcastId сохранен для таймеров');
        } else {
            // Применяем фильтрацию
            const selected = broadcastItems.filter(item => item.enabled);
            setFilteredItems(selected);
            setIsFiltered(true);
            setReadyBroadcastId(broadcastId);
            setReadyTime(new Date()); // Устанавливаем время готовности
            
            // Сбрасываем состояние синхронизации таймеров
            setTimerSyncState({
                isActive: false,
                lastSentTime: null,
                nextSendTime: null,
                currentPosition: 0
            });
            
            setForceUpdate(prev => prev + 1); // Принудительное обновление
            console.log(`📧 Отфильтровано ${selected.length} получателей из ${broadcastItems.length} для рассылки ${broadcastId}, readyTime установлено, синхронизация сброшена`);
        }
    }, [broadcastItems, isFiltered, readyBroadcastId]);

    /**
     * Инициализация синхронизации таймеров при запуске рассылки
     */
    const initializeTimerSync = useCallback((broadcastId) => {
        console.log('🔄 Инициализация синхронизации таймеров для рассылки', broadcastId);
        
        // Используем отфильтрованный список для поиска первого неотправленного элемента
        const firstUnsentIndex = filteredItems.findIndex(item => 
            item.status !== 'sent' && 
            item.status !== 'delivered' && 
            item.status !== 'failed'
        );
        
        if (firstUnsentIndex === -1) {
            console.log('🔍 Все элементы уже отправлены');
            return;
        }
        
        const now = new Date();
        setTimerSyncState({
            isActive: true,
            lastSentTime: now,
            nextSendTime: new Date(now.getTime() + delayPerEmail),
            currentPosition: firstUnsentIndex
        });
        
        console.log('🔄 Синхронизация таймеров инициализирована', {
            firstUnsentIndex,
            currentPosition: firstUnsentIndex,
            nextSendTime: new Date(now.getTime() + delayPerEmail).toISOString(),
            filteredItemsLength: filteredItems.length,
            filteredItems: filteredItems.map((item, index) => ({
                index,
                id: item.id,
                name: item.full_name,
                status: item.status
            }))
        });
    }, [filteredItems]);

    /**
     * Обновление синхронизации таймеров при получении события отправки
     */
    const updateTimerSync = useCallback((sentItemId) => {
        console.log('🔄 Обновление синхронизации таймеров для отправленного элемента', sentItemId);
        
        setTimerSyncState(prev => {
            const newPosition = prev.currentPosition + 1;
            const now = new Date();
            
            console.log('🔄 Обновляем позицию синхронизации', {
                oldPosition: prev.currentPosition,
                newPosition,
                nextSendTime: new Date(now.getTime() + delayPerEmail).toISOString()
            });
            
            return {
                ...prev,
                lastSentTime: now,
                nextSendTime: new Date(now.getTime() + delayPerEmail),
                currentPosition: newPosition
            };
        });
    }, []);

    /**
     * Расчет времени до отправки письма с синхронизацией с сервером
     */
    const getTimeToSend = useCallback((item, filteredList) => {
        console.log('🔍 getTimeToSend вызвана', {
            itemName: item.full_name,
            isFiltered,
            filteredListLength: filteredList?.length,
            readyBroadcastId,
            selectedBroadcastStatus: selectedBroadcast?.status,
            currentTime: currentTime.toISOString()
        });
        
        // Не показываем таймер если:
        // 1. Фильтрация не применена
        // 2. Нет данных о рассылке
        if (!isFiltered || !filteredList) {
            console.log('🔍 getTimeToSend: Фильтрация не применена или нет filteredList', { 
                isFiltered, 
                filteredList
            });
            return null;
        }
        
        const delayPerEmail = 6667; // 6.67 секунд между письмами (9 писем в минуту)
        const itemIndex = filteredList.findIndex(filteredItem => filteredItem.id === item.id);
        
        console.log('🔍 getTimeToSend: Поиск элемента', { 
            itemId: item.id, 
            itemName: item.full_name,
            itemStatus: item.status,
            filteredListLength: filteredList.length,
            itemIndex 
        });
        
        if (itemIndex === -1) {
            console.log('🔍 getTimeToSend: Элемент не найден в отфильтрованном списке');
            return null;
        }
        
        // Если элемент уже отправлен - показываем статус
        if (item.status === 'sent' || item.status === 'delivered') {
            console.log('🔍 getTimeToSend: Элемент уже отправлен', { itemName: item.full_name, status: item.status });
            return 'Отправлено';
        } else if (item.status === 'failed') {
            console.log('🔍 getTimeToSend: Элемент с ошибкой', { itemName: item.full_name, status: item.status });
            return 'Ошибка';
        }
        
        // Находим первый неотправленный элемент в очереди
        const firstUnsentIndex = filteredList.findIndex(filteredItem => 
            filteredItem.status !== 'sent' && 
            filteredItem.status !== 'delivered' && 
            filteredItem.status !== 'failed'
        );
        
        console.log('🔍 getTimeToSend: Первый неотправленный элемент', { 
            firstUnsentIndex,
            currentItemIndex: itemIndex,
            firstUnsentName: firstUnsentIndex !== -1 ? filteredList[firstUnsentIndex].full_name : 'не найден'
        });
        
        if (firstUnsentIndex === -1) {
            // Все элементы отправлены
            return 'Завершено';
        }
        
        // Рассчитываем время относительно первого неотправленного элемента
        const relativeIndex = itemIndex - firstUnsentIndex;
        
        if (relativeIndex < 0) {
            // Элемент уже должен был быть отправлен
            return 'Пропущен';
        }
        
        // Если рассылка запущена (sending) - показываем синхронизированный отсчет
        if (selectedBroadcast?.status === 'sending' && timerSyncState.isActive) {
            console.log('🔍 getTimeToSend: Рассылка запущена, синхронизированный отсчет', {
                status: selectedBroadcast.status,
                timerSyncState,
                currentTime: currentTime.toISOString()
            });
            
            // Если элемент уже отправлен - показываем статус
            if (item.status === 'sent' || item.status === 'delivered') {
                return 'Отправлено';
            } else if (item.status === 'failed') {
                return 'Ошибка';
            }
            
            // Рассчитываем время относительно текущей позиции в синхронизации
            const positionFromCurrent = itemIndex - timerSyncState.currentPosition;
            
            console.log('🔍 getTimeToSend: Детальный расчет позиции', {
                itemName: item.full_name,
                itemId: item.id,
                itemIndex,
                currentPosition: timerSyncState.currentPosition,
                positionFromCurrent,
                itemStatus: item.status,
                timerSyncState: {
                    isActive: timerSyncState.isActive,
                    currentPosition: timerSyncState.currentPosition
                }
            });
            
            if (positionFromCurrent <= 0) {
                // Элемент должен быть отправлен сейчас или уже отправлен
                console.log('🔍 getTimeToSend: Элемент должен быть отправлен сейчас', {
                    itemName: item.full_name,
                    positionFromCurrent
                });
                return '00:00';
            }
            
            // Рассчитываем время до отправки этого элемента с учетом текущего времени
            const plannedSendTime = new Date(timerSyncState.lastSentTime.getTime() + (positionFromCurrent * delayPerEmail));
            const timeDiff = plannedSendTime.getTime() - currentTime.getTime();
            
            console.log('🔍 getTimeToSend: Живой отсчет времени', {
                itemName: item.full_name,
                positionFromCurrent,
                plannedSendTime: plannedSendTime.toISOString(),
                currentTime: currentTime.toISOString(),
                timeDiff
            });
            
            if (timeDiff <= 0) {
                // Время отправки уже прошло
                return '00:00';
            }
            
            const totalSeconds = Math.ceil(timeDiff / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const result = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            console.log('🔍 getTimeToSend: Синхронизированный отсчет', {
                itemName: item.full_name,
                positionFromCurrent,
                timeDiff,
                totalSeconds,
                minutes,
                seconds,
                result
            });
            
            return result;
        }
        
        // Если рассылка на паузе (paused) - показываем планируемое время для продолжения
        if (selectedBroadcast?.status === 'paused') {
            console.log('🔍 getTimeToSend: Рассылка на паузе, показываем планируемое время для продолжения', {
                status: selectedBroadcast.status,
                relativeIndex,
                timerSyncState: timerSyncState.isActive ? 'active' : 'inactive'
            });
            
            // Если синхронизация активна (после нажатия ПРОДОЛЖИТЬ) - показываем живой отсчет
            if (timerSyncState.isActive) {
                console.log('🔍 getTimeToSend: Рассылка на паузе, но синхронизация активна - живой отсчет');
                
                // Если элемент уже отправлен - показываем статус
                if (item.status === 'sent' || item.status === 'delivered') {
                    return 'Отправлено';
                } else if (item.status === 'failed') {
                    return 'Ошибка';
                }
                
                // Рассчитываем время относительно текущей позиции в синхронизации
                const positionFromCurrent = itemIndex - timerSyncState.currentPosition;
                
                console.log('🔍 getTimeToSend: Детальный расчет позиции для паузы', {
                    itemName: item.full_name,
                    itemId: item.id,
                    itemIndex,
                    currentPosition: timerSyncState.currentPosition,
                    positionFromCurrent,
                    itemStatus: item.status
                });
                
                if (positionFromCurrent <= 0) {
                    // Элемент должен быть отправлен сейчас или уже отправлен
                    console.log('🔍 getTimeToSend: Элемент должен быть отправлен сейчас (пауза)', {
                        itemName: item.full_name,
                        positionFromCurrent
                    });
                    return '00:00';
                }
                
                // Рассчитываем время до отправки этого элемента с учетом текущего времени
                const plannedSendTime = new Date(timerSyncState.lastSentTime.getTime() + (positionFromCurrent * delayPerEmail));
                const timeDiff = plannedSendTime.getTime() - currentTime.getTime();
                
                console.log('🔍 getTimeToSend: Живой отсчет времени для паузы', {
                    itemName: item.full_name,
                    positionFromCurrent,
                    plannedSendTime: plannedSendTime.toISOString(),
                    currentTime: currentTime.toISOString(),
                    timeDiff
                });
                
                if (timeDiff <= 0) {
                    // Время отправки уже прошло
                    return '00:00';
                }
                
                const totalSeconds = Math.ceil(timeDiff / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                const result = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                
                console.log('🔍 getTimeToSend: Синхронизированный отсчет для паузы', {
                    itemName: item.full_name,
                    positionFromCurrent,
                    timeDiff,
                    totalSeconds,
                    minutes,
                    seconds,
                    result
                });
                
                return result;
            }
            
            // Если синхронизация не активна - показываем планируемое время
            // Первый неотправленный элемент показываем как "00:00"
            if (relativeIndex === 0) {
                console.log('🔍 getTimeToSend: Первый элемент после паузы - показываем 00:00');
                return '00:00';
            }
            
            // Остальные элементы показываем с интервалом 7 секунд
            const timeToSend = relativeIndex * delayPerEmail;
            const totalSeconds = Math.ceil(timeToSend / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            const result = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            
            console.log('🔍 getTimeToSend: Планируемое время для продолжения', {
                itemName: item.full_name,
                relativeIndex,
                timeToSend,
                totalSeconds,
                result
            });
            
            return result;
        }
        
        console.log('🔍 getTimeToSend: Рассылка не запущена, показываем планируемое время', {
            status: selectedBroadcast?.status,
            started_at: selectedBroadcast?.started_at
        });
        
        // Если рассылка не запущена - показываем планируемое время
        const totalSeconds = relativeIndex * delayPerEmail / 1000;
        
        if (totalSeconds === 0) {
            console.log('🔍 getTimeToSend: Возвращаем "Сейчас" для первого неотправленного');
            return '00:00';
        }
        
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const result = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        console.log('🔍 getTimeToSend: Возвращаем планируемое время', result);
        return result;
    }, [isFiltered, readyBroadcastId, selectedBroadcast?.status, selectedBroadcast?.started_at, timerSyncState, currentTime]);

    // Обновление времени каждую секунду для синхронизированного отсчета
    useEffect(() => {
        // Таймер работает если синхронизация активна и рассылка запущена или на паузе
        const shouldRunTimer = timerSyncState.isActive && (selectedBroadcast?.status === 'sending' || selectedBroadcast?.status === 'paused');
        
        if (!shouldRunTimer) {
            console.log('🔍 Таймер остановлен - синхронизация не активна', { 
                status: selectedBroadcast?.status,
                isActive: timerSyncState.isActive
            });
            return;
        }
        
        console.log('🔍 Таймер запущен - синхронизация активна', { 
            status: selectedBroadcast?.status,
            isActive: timerSyncState.isActive
        });
        
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => {
            console.log('🔍 Таймер очищен');
            clearInterval(timer);
        };
    }, [timerSyncState.isActive, selectedBroadcast?.status]);

    // Отслеживание изменений состояния для отладки
    useEffect(() => {
        console.log('🔍 Состояние изменилось:', {
            readyBroadcastId,
            isFiltered,
            activeBroadcastId,
            selectedBroadcastId: selectedBroadcast?.id,
            selectedBroadcastStatus: selectedBroadcast?.status,
            readyTime: readyTime?.toISOString(),
            timerSyncState,
            forceUpdate
        });
    }, [readyBroadcastId, isFiltered, activeBroadcastId, selectedBroadcast?.id, selectedBroadcast?.status, readyTime, timerSyncState, forceUpdate]);

    // WebSocket подключение и обработчики
    useEffect(() => {
        if (isOpen) {
            const wsSocket = getSocket();
            setSocket(wsSocket);
            
            if (wsSocket) {
                // Подписываемся на обновления статуса рассылки
                wsSocket.on('email:broadcast_item_sent', (data) => {
                    console.log('📧 WebSocket: Письмо отправлено', data);
                    updateRecipientStatus(data.broadcastId, data.itemId, 'sent');
                    
                    // Обновляем синхронизацию таймеров
                    if (selectedBroadcast?.id === data.broadcastId) {
                        updateTimerSync(data.itemId);
                    }
                });
                
                wsSocket.on('email:broadcast_item_delivered', (data) => {
                    console.log('📧 WebSocket: Письмо доставлено', data);
                    updateRecipientStatus(data.broadcastId, data.itemId, 'delivered', data.deliveryResult);
                });
                
                wsSocket.on('email:broadcast_item_failed', (data) => {
                    console.log('📧 WebSocket: Ошибка отправки письма', data);
                    updateRecipientStatus(data.broadcastId, data.itemId, 'failed', data.error);
                });
                
                wsSocket.on('email:broadcast_sync_completed', (data) => {
                    console.log('📧 WebSocket: Синхронизация после рассылки завершена', data);
                    // Обновляем только статистику рассылки локально, без полной перезагрузки
                    if (data.broadcastId) {
                        setBroadcasts(prev => prev.map(b => 
                            b.id === data.broadcastId ? { 
                                ...b, 
                                status: 'completed',
                                completed_at: new Date().toISOString()
                            } : b
                        ));
                        
                        // Если это была активная рассылка - сбрасываем activeBroadcastId
                        if (activeBroadcastId === data.broadcastId) {
                            setActiveBroadcastId(null);
                        }
                        
                        // Обновляем selectedBroadcast локально
                        if (selectedBroadcast?.id === data.broadcastId) {
                            setSelectedBroadcast(prev => ({
                                ...prev,
                                status: 'completed',
                                completed_at: new Date().toISOString()
                            }));
                        }
                    }
                });

                // Подписываемся на обновления статуса рассылки (старт/пауза/ошибки)
                wsSocket.on('email:broadcast_status_updated', (data) => {
                    console.log('📧 WebSocket: Статус рассылки обновлен', data);
                    
                    // Обновляем статус рассылки локально
                    setBroadcasts(prev => prev.map(b => 
                        b.id === data.broadcastId ? { ...b, status: data.status } : b
                    ));
                    
                    // Обновляем selectedBroadcast локально
                    if (selectedBroadcast?.id === data.broadcastId) {
                        setSelectedBroadcast(prev => ({
                            ...prev,
                            status: data.status
                        }));
                    }
                    
                    // Если рассылка остановлена или завершена - скрываем таймеры и сбрасываем готовность
                    if (data.status === 'paused' || data.status === 'completed' || data.status === 'cancelled') {
                        console.log('📧 Рассылка остановлена, скрываем таймеры и сбрасываем готовность');
                        setIsFiltered(false);
                        setFilteredItems([]);
                        
                        // Если завершилась рассылка, которая была готова - сбрасываем readyBroadcastId
                        if ((data.status === 'completed' || data.status === 'cancelled') && readyBroadcastId === data.broadcastId) {
                            console.log('📧 Рассылка завершена, сбрасываем readyBroadcastId');
                            setReadyBroadcastId(null);
                        }
                        
                        // Сбрасываем activeBroadcastId если рассылка завершена или отменена
                        if ((data.status === 'completed' || data.status === 'cancelled') && activeBroadcastId === data.broadcastId) {
                            setActiveBroadcastId(null);
                        }
                    }
                });
            }
            
            loadBroadcasts();
        }
        
        return () => {
            if (socket) {
                socket.off('email:broadcast_item_sent');
                socket.off('email:broadcast_item_delivered');
                socket.off('email:broadcast_item_failed');
                socket.off('email:broadcast_sync_completed');
                socket.off('email:broadcast_status_updated');
            }
        };
    }, [isOpen, loadBroadcasts, updateRecipientStatus, socket, selectedBroadcast?.id, readyBroadcastId, updateTimerSync, activeBroadcastId]);

    // Загружаем элементы при выборе очереди
    useEffect(() => {
        if (selectedBroadcast) {
            loadBroadcastItems(selectedBroadcast.id);
        }
    }, [selectedBroadcast, loadBroadcastItems]);

    if (!isOpen) return null;

    return (
        <div className="email-queue-modal-overlay">
            <div className="email-queue-modal">
                <div className="email-queue-modal-header">
                    <h3>Очередь отправки писем</h3>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>
                
                <div className="email-queue-modal-content">
                    {loading ? (
                        <div className="loading">Загрузка очередей...</div>
                    ) : broadcasts.length === 0 ? (
                        <div className="empty-queue">Очереди рассылок не найдены</div>
                    ) : (
                        <div className="broadcasts-container">
                            {/* Список активных очередей */}
                            <div className="broadcasts-list">
                                <>
                                    <h4>Активные рассылки ({activeBroadcasts.length})</h4>
                                    {activeBroadcasts.map(broadcast => (
                                    <div 
                                        key={broadcast.id} 
                                        className={`broadcast-item ${selectedBroadcast?.id === broadcast.id ? 'selected' : ''}`}
                                        onClick={() => setSelectedBroadcast(broadcast)}
                                    >
                                        <div className="broadcast-info">
                                            <div className="broadcast-subject">{broadcast.subject}</div>
                                            <div className="broadcast-stats">
                                                Всего: {broadcast.enabled_recipients || broadcast.total_recipients} | 
                                                Отправлено: {broadcast.sent_count} | 
                                                Ошибки: {broadcast.failed_count}
                                            </div>
                                            <div className="broadcast-actions">
                                                <button 
                                                    className="view-email-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        viewBroadcastEmail(broadcast);
                                                    }}
                                                    title="Просмотр письма"
                                                >
                                                    📧 Просмотр письма
                                                </button>
                                            </div>
                                            <div className="broadcast-status">
                                                <span 
                                                    className="status-badge"
                                                    style={{ backgroundColor: getStatusColor(broadcast.status) }}
                                                >
                                                    {getStatusText(broadcast.status)}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="broadcast-controls">
                                            {broadcast.status === 'queued' && (
                                                <button 
                                                    className="control-btn start"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        startBroadcast(broadcast.id);
                                                    }}
                                                    disabled={
                                                        activeBroadcastId !== null || 
                                                        !isFiltered || 
                                                        readyBroadcastId !== broadcast.id
                                                    }
                                                    title={
                                                        !isFiltered || readyBroadcastId !== broadcast.id
                                                            ? "Сначала нажмите ГОТОВО для фильтрации получателей" 
                                                            : ""
                                                    }
                                                >
                                                    ▶️ Запустить
                                                </button>
                                            )}
                                            
                                            {(broadcast.status === 'in_progress' || broadcast.status === 'sending') && (
                                                <button 
                                                    className="control-btn pause"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        pauseBroadcast(broadcast.id);
                                                    }}
                                                >
                                                    ⏸️ Пауза
                                                </button>
                                            )}
                                            
                                            {broadcast.status === 'paused' && (
                                                <button 
                                                    className="control-btn start"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        console.log('🔍 Кнопка ПРОДОЛЖИТЬ нажата', {
                                                            broadcastId: broadcast.id,
                                                            readyBroadcastId,
                                                            activeBroadcastId,
                                                            isFiltered,
                                                            isDisabled: activeBroadcastId !== null || readyBroadcastId !== broadcast.id,
                                                            disabledCondition: `activeBroadcastId !== null (${activeBroadcastId !== null}) || readyBroadcastId !== broadcast.id (${readyBroadcastId !== broadcast.id})`
                                                        });
                                                        startBroadcast(broadcast.id);
                                                    }}
                                                    disabled={(() => {
                                                        const isDisabled = activeBroadcastId !== null || !isFiltered || readyBroadcastId !== broadcast.id;
                                                        console.log('🔍 Кнопка ПРОДОЛЖИТЬ рендер', {
                                                            broadcastId: broadcast.id,
                                                            readyBroadcastId,
                                                            activeBroadcastId,
                                                            isFiltered,
                                                            isDisabled,
                                                            disabledCondition: `activeBroadcastId !== null (${activeBroadcastId !== null}) || !isFiltered (${!isFiltered}) || readyBroadcastId !== broadcast.id (${readyBroadcastId !== broadcast.id})`
                                                        });
                                                        return isDisabled;
                                                    })()}
                                                    title={
                                                        (!isFiltered || readyBroadcastId !== broadcast.id)
                                                            ? "Сначала нажмите ГОТОВО для фильтрации получателей" 
                                                            : ""
                                                    }
                                                >
                                                    ▶️ Продолжить
                                                </button>
                                            )}
                                            
                                            {(broadcast.status === 'queued' || broadcast.status === 'paused' || broadcast.status === 'sending') && (
                                                <button 
                                                    className="control-btn cancel"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        cancelBroadcast(broadcast.id);
                                                    }}
                                                >
                                                    ❌ Отменить
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                            
                                            {/* Аккордеон для завершенных рассылок */}
                                            {completedBroadcasts.length > 0 && (
                                                <div className="completed-broadcasts-accordion">
                                                    <div 
                                                        className="accordion-header"
                                                        onClick={() => setShowCompletedAccordion(!showCompletedAccordion)}
                                                    >
                                                        <h4>
                                                            Завершенные рассылки ({completedBroadcasts.length})
                                                            <span className={`accordion-icon ${showCompletedAccordion ? 'expanded' : ''}`}>
                                                                ▼
                                                            </span>
                                                        </h4>
                                                    </div>
                                                    
                                                    {showCompletedAccordion && (
                                                        <div className="accordion-content">
                                                            {completedBroadcasts.map(broadcast => (
                                                                <div 
                                                                    key={broadcast.id} 
                                                                    className={`broadcast-item completed ${selectedBroadcast?.id === broadcast.id ? 'selected' : ''}`}
                                                                    onClick={() => setSelectedBroadcast(broadcast)}
                                                                >
                                                                    <div className="broadcast-info">
                                                                        <div className="broadcast-subject">{broadcast.subject}</div>
                                                                        <div className="broadcast-stats">
                                                                            Всего: {broadcast.enabled_recipients || broadcast.total_recipients} | 
                                                                            Отправлено: {broadcast.sent_count} | 
                                                                            Ошибки: {broadcast.failed_count}
                                                                        </div>
                                                                        <div className="broadcast-actions">
                                                                            <button 
                                                                                className="view-email-btn"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    viewBroadcastEmail(broadcast);
                                                                                }}
                                                                                title="Просмотр письма"
                                                                            >
                                                                                📧 Просмотр письма
                                                                            </button>
                                                                            
                                                                            <button 
                                                                                className="control-btn repeat"
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    repeatBroadcast(broadcast.id);
                                                                                }}
                                                                                title="Повторить рассылку"
                                                                            >
                                                                                🔄 Повторить
                                                                            </button>
                                                                        </div>
                                                                        <div className="broadcast-status">
                                                                            <span 
                                                                                className="status-badge"
                                                                                style={{ backgroundColor: getStatusColor(broadcast.status) }}
                                                                            >
                                                                                {getStatusText(broadcast.status)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                </>
                            </div>
                            
                            {/* Детали выбранной очереди */}
                            {selectedBroadcast && (
                                <div className="broadcast-details">
                                    <h4>Получатели: {selectedBroadcast.subject}</h4>
                                    
                                    {loadingItems ? (
                                        <div className="loading">Загрузка получателей...</div>
                                    ) : broadcastItems.length === 0 ? (
                                        <div className="empty-items">Получатели не найдены</div>
                                    ) : (
                                        <div className={`recipients-container ${isFiltered ? 'filtered' : ''}`}>
                                            {/* Общий чекбокс */}
                                            <div className="recipients-header">
                                                {/* Чекбокс "Выбрать всех" только для активных рассылок */}
                                                {!completedBroadcasts.some(b => b.id === selectedBroadcast.id) && (
                                                    <label className="select-all-checkbox">
                                                        <input 
                                                            type="checkbox"
                                                            checked={broadcastItems.every(item => item.enabled)}
                                                            onChange={(e) => {
                                                                const enabled = e.target.checked;
                                                                broadcastItems.forEach(item => {
                                                                    updateItemStatus(selectedBroadcast.id, item.id, enabled);
                                                                });
                                                            }}
                                                        />
                                                        <span>Выбрать всех / Снять всех</span>
                                                    </label>
                                                )}
                                                
                                                {/* Кнопка ГОТОВО только для активных рассылок */}
                                                {!completedBroadcasts.some(b => b.id === selectedBroadcast.id) && (
                                                    <label 
                                                        className={`ready-button ${isFiltered && readyBroadcastId === selectedBroadcast.id ? 'active' : ''} ${
                                                            readyBroadcastId && readyBroadcastId !== selectedBroadcast.id ? 'ready-button-tooltip' : ''
                                                        }`}
                                                        data-tooltip={
                                                            readyBroadcastId && readyBroadcastId !== selectedBroadcast.id 
                                                                ? "Уже есть подготовленная к отправке очередь рассылки" 
                                                                : ""
                                                        }
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={isFiltered && readyBroadcastId === selectedBroadcast.id}
                                                            onChange={() => filterSelectedRecipients(selectedBroadcast.id)}
                                                            disabled={
                                                                (!isFiltered && broadcastItems.filter(item => item.enabled).length === 0) ||
                                                                (readyBroadcastId && readyBroadcastId !== selectedBroadcast.id)
                                                            }
                                                        />
                                                        <span className="ready-button-text">
                                                            ГОТОВО
                                                        </span>
                                                    </label>
                                                )}
                                            </div>
                                            
                                            {/* Список получателей в горизонтальной прокрутке */}
                                            <div className="recipients-scroll">
                                                {broadcastItems
                                                    .filter(item => {
                                                        // Если фильтрация применена - показываем только отфильтрованных
                                                        if (isFiltered) {
                                                            return filteredItems.some(filteredItem => filteredItem.id === item.id);
                                                        }
                                                        // Если рассылка запущена - показываем только выбранных получателей
                                                        if (selectedBroadcast?.status === 'sending' || selectedBroadcast?.status === 'in_progress') {
                                                            return item.enabled;
                                                        }
                                                        // Если рассылка не запущена - показываем всех
                                                        return true;
                                                    })
                                                    .map(item => (
                                                    <div 
                                                        key={item.id} 
                                                        className={`recipient-card ${!item.enabled ? 'disabled' : ''}`}
                                                        onClick={() => handleRecipientClick(item)}
                                                    >
                                                        {/* Чекбокс только для активных рассылок */}
                                                        {!completedBroadcasts.some(b => b.id === selectedBroadcast.id) && (
                                                            <div 
                                                                className="recipient-checkbox"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={item.enabled}
                                                                    onChange={(e) => updateItemStatus(selectedBroadcast.id, item.id, e.target.checked)}
                                                                />
                                                            </div>
                                                        )}
                                                        
                                                        <div className="recipient-avatar">
                                                            <div className="avatar-circle">
                                                                <span style={{color: 'white', fontSize: '16px', fontWeight: 'bold'}}>
                                                                    {(item.full_name || item.email || '?').charAt(0).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="recipient-info">
                                                            <div className="recipient-name">
                                                                {item.full_name || 'Без имени'}
                                                                {/* Таймер отправки рядом с ФИО - показываем только когда фильтрация активна */}
                                                                {isFiltered && getTimeToSend(item, filteredItems) && (
                                                                    <span className="timer-text">
                                                                        {getTimeToSend(item, filteredItems)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="recipient-email">{item.email}</div>
                                                            <div className="recipient-position">Позиция: {item.position}</div>
                                                        </div>
                                                        
                                                        <div className="recipient-status">
                                                            <div className="status-indicators">
                                                                {/* Левый индикатор - отправка */}
                                                                <div 
                                                                    className="status-indicator-left"
                                                                    title={`Отправка: ${getStatusText(item.status)}`}
                                                                >
                                                                    {item.status === 'sent' || item.status === 'delivered' ? '✓' : 
                                                                     item.status === 'failed' ? '✗' : ''}
                                                                </div>
                                                                {/* Правый индикатор - доставка */}
                                                                <div 
                                                                    className="status-indicator-right"
                                                                    title={`Доставка: ${item.status === 'delivered' ? 'Доставлено' : 
                                                                           item.status === 'failed' ? 'Ошибка' : 'Ожидание'}`}
                                                                >
                                                                    {item.status === 'delivered' ? '✓' : 
                                                                     item.status === 'failed' ? '✗' : ''}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Детальная модалка клиента */}
            {selectedRecipient && (
                <div className="recipient-detail-overlay" onClick={() => setSelectedRecipient(null)}>
                    <div className="recipient-detail-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="recipient-detail-header">
                            <h4 className="recipient-detail-title">Карточка клиента</h4>
                            <button className="recipient-detail-close" onClick={() => setSelectedRecipient(null)}>Закрыть</button>
                        </div>
                        <div className="recipient-detail-body">
                            {loadingClientDetails ? (
                                <div>Загрузка деталей клиента...</div>
                            ) : (
                                <>
                                               <div className="client-avatar-section">
                                                   <div className="client-avatar-large">
                                                       <span style={{color: 'white', fontSize: '24px', fontWeight: 'bold'}}>
                                                           {(selectedRecipient.full_name || selectedRecipient.email || '?').charAt(0).toUpperCase()}
                                                       </span>
                                                   </div>
                                        <div className="client-name-large">
                                            {selectedRecipient.full_name || 'Без имени'}
                                        </div>
                                        <div className="client-email-large">
                                            {selectedRecipient.email}
                                        </div>
                                    </div>
                                    
                                    <div className="client-details-section">
                                        <h5>Информация о рассылке</h5>
                                        <p><strong>Позиция в очереди:</strong> {selectedRecipient.position}</p>
                                        <p><strong>Статус отправки:</strong> {selectedRecipient.status}</p>
                                        <p><strong>Включен в рассылку:</strong> {selectedRecipient.enabled ? 'Да' : 'Нет'}</p>
                                        
                                        {clientDetails && (
                                            <>
                                                <h5>Данные из CRM</h5>
                                                <p><strong>ID клиента:</strong> {clientDetails.id}</p>
                                                <p><strong>Телефон:</strong> {clientDetails.phone || 'Не указан'}</p>
                                                <p><strong>Дата регистрации:</strong> {clientDetails.createdAt ? new Date(clientDetails.createdAt).toLocaleDateString() : 'Не указана'}</p>
                                                {clientDetails.description && (
                                                    <p><strong>Описание:</strong> {clientDetails.description}</p>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка подтверждения отмены рассылки */}
            {showCancelConfirm && (
                <div className="cancel-confirm-overlay" onClick={cancelCancelBroadcast}>
                    <div className="cancel-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="cancel-confirm-header">
                            <h3>Подтверждение отмены</h3>
                        </div>
                        <div className="cancel-confirm-body">
                            <p>Вы уверены, что хотите отменить рассылку?</p>
                            <p className="warning-text">Это действие нельзя будет отменить.</p>
                        </div>
                        <div className="cancel-confirm-actions">
                            <button 
                                className="cancel-confirm-btn cancel-btn" 
                                onClick={cancelCancelBroadcast}
                            >
                                Отмена
                            </button>
                            <button 
                                className="cancel-confirm-btn confirm-btn" 
                                onClick={confirmCancelBroadcast}
                            >
                                Да, отменить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка подтверждения удаления рассылки */}
            {showDeleteConfirm && (
                <div className="delete-confirm-overlay" onClick={() => { setShowDeleteConfirm(false); setBroadcastToDelete(null); }}>
                    <div className="delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="delete-confirm-header">
                            <h3>🗑️ Подтверждение удаления</h3>
                        </div>
                        <div className="delete-confirm-body">
                            <p>Вы уверены, что хотите <strong>полностью удалить</strong> эту рассылку?</p>
                            <p className="warning-text">Это действие <strong>нельзя будет отменить</strong>.</p>
                            <p className="info-text">Будут удалены:</p>
                            <ul className="delete-list">
                                <li>• Сама рассылка</li>
                                <li>• Все элементы очереди</li>
                                <li>• Все логи рассылки</li>
                            </ul>
                        </div>
                        <div className="delete-confirm-actions">
                            <button 
                                className="btn-cancel"
                                onClick={() => { setShowDeleteConfirm(false); setBroadcastToDelete(null); }}
                            >
                                Отмена
                            </button>
                            <button 
                                className="btn-delete"
                                onClick={confirmDeleteBroadcast}
                            >
                                🗑️ Удалить навсегда
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка просмотра письма */}
            {console.log('🔍 Состояние модалки:', { showEmailViewer, emailToView })}
            {showEmailViewer && emailToView && (
                <>
                    {console.log('🔍 Рендерим EmailViewer с данными:', emailToView)}
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.8)',
                        zIndex: 99999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            background: '#1a1a1a',
                            color: 'white',
                            width: '80%',
                            height: '80%',
                            borderRadius: '12px',
                            padding: '20px',
                            overflow: 'auto'
                        }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginBottom: '20px',
                                borderBottom: '1px solid #333',
                                paddingBottom: '10px'
                            }}>
                                <h2 style={{ margin: 0 }}>{emailToView.subject}</h2>
                                <button 
                                    onClick={closeEmailViewer}
                                    style={{
                                        background: '#ff6b6b',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Закрыть
                                </button>
                            </div>
                            
                            <div style={{ marginBottom: '15px' }}>
                                <strong>От:</strong> {emailToView.from}<br/>
                                <strong>Кому:</strong> {emailToView.to}<br/>
                                <strong>Дата:</strong> {new Date(emailToView.date).toLocaleString()}
                            </div>
                            
                            <div style={{
                                border: '1px solid #333',
                                borderRadius: '8px',
                                padding: '15px',
                                background: '#222'
                            }}>
                                <h4>Содержимое письма:</h4>
                                {emailToView.body_html ? (
                                    <div dangerouslySetInnerHTML={{ __html: emailToView.body_html }} />
                                ) : (
                                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                                        {emailToView.body_text}
                                    </pre>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default EmailQueueModal;
