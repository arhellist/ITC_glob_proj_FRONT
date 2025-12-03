import React, { useState, useEffect, useCallback, useRef } from "react";
import axiosAPI from "../../../../JS/auth/http/axios";
import adminService from "../../../../JS/services/admin-service";
import { API_CONFIG } from "../../../../config/api";
import CreateAccountModal from "./create-account-modal";
import { useCRM } from "../../../../contexts/CRMContext.jsx";
import { useSupport } from "../../../../hooks/useSupport.js";
import "./client-details-modal.css";
import "./create-account-modal.css";
import "./conversation-modal.css";

const ClientDetailsModal = ({ client, onClose }) => {
  const { resetClientUnread, resetDealsCount } = useCRM();
  const { 
    getClientConversations, 
    getClientUnreadCount, 
    loadMessages, 
    sendMessage, 
    createConversation,
    markMessagesAsRead 
  } = useSupport();
  const [activeTab, setActiveTab] = useState("personal");
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [documentViewer, setDocumentViewer] = useState(null);
  const [dealDocumentViewer, setDealDocumentViewer] = useState(null);
  const [dealDocumentPreviews, setDealDocumentPreviews] = useState({}); // Хранилище blob URL для превью
  const dealDocumentPreviewsRef = useRef({}); // Ref для отслеживания загруженных превью
  const [taskDocumentViewer, setTaskDocumentViewer] = useState(null);
  const [taskDocumentPreviews, setTaskDocumentPreviews] = useState({}); // Хранилище blob URL для превью документов задач
  const taskDocumentPreviewsRef = useRef({}); // Ref для отслеживания загруженных превью документов задач
  const [documentActionLoading, setDocumentActionLoading] = useState(null);
  const [showUploadDocument, setShowUploadDocument] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: "",
    description: "",
    file: null,
  });
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");
  
  // Состояние для задач
  const [tasks, setTasks] = useState([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    reminderDate: '',
    dueDate: ''
  });
  const [showUploadTaskDocument, setShowUploadTaskDocument] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [newTaskDocument, setNewTaskDocument] = useState({
    title: '',
    description: '',
    file: null
  });

  // Состояние для общения (используем SupportContext)
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateConversationModal, setShowCreateConversationModal] = useState(false);
  const [newConversation, setNewConversation] = useState({
    subject: '',
    message: '',
    channel: 'email' // По умолчанию EMAIL
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Получаем данные из SupportContext
  const supportContext = useSupport();
  const conversations = getClientConversations(client.userId);
  const unreadMessagesCount = getClientUnreadCount(client.userId);
  const messages = selectedConversation ? (supportContext.messages[selectedConversation.id] || []) : [];
  
  // Отслеживаем изменения счетчика непрочитанных сообщений
  useEffect(() => {
    console.log(`🔍 ClientDetailsModal: Счетчик непрочитанных для клиента ${client.userId}: ${unreadMessagesCount}`);
  }, [unreadMessagesCount, client.userId]);

  // Состояние для сделок
  const [deals, setDeals] = useState([]);
  const [showCreateDeal, setShowCreateDeal] = useState(false);
  const [newDeal, setNewDeal] = useState({
    dealTypeId: '',
    amountCurrency: '',
    currency: 'USD',
    amountRub: '',
    exchangeRate: '',
    dealDate: '',
    description: ''
  });
  const [dealsLoading, setDealsLoading] = useState(false);
  const [currencyRates, setCurrencyRates] = useState({});
  const [dealDocuments, setDealDocuments] = useState([]);
  const [dealTypes, setDealTypes] = useState([]);

  const loadClientDetails = useCallback(async () => {
    try {
      setLoading(true);

      // Загружаем детальную информацию о клиенте с обработкой ошибок для каждого запроса
      const promises = [
        axiosAPI
          .get(`/admin/crm/deals/clients/${client.id}/details`)
          .catch((err) => {
            console.error("Ошибка загрузки деталей клиента:", err);
            return { data: { client: null } };
          }),
        axiosAPI
          .get(`/admin/crm/deals/clients/${client.id}/accounts`)
          .catch((err) => {
            console.error("Ошибка загрузки счетов клиента:", err);
            return { data: { accounts: [] } };
          }),
        axiosAPI
          .get(`/admin/crm/deals/clients/${client.id}/referrals`)
          .catch((err) => {
            console.error("Ошибка загрузки рефералов клиента:", err);
            return { data: { referrals: [] } };
          }),
        axiosAPI
          .get(`/admin/crm/deals/clients/${client.id}/documents`)
          .catch((err) => {
            console.error("Ошибка загрузки документов клиента:", err);
            return { data: { documents: [] } };
          }),
      ];

      const [
        clientResponse,
        accountsResponse,
        referralsResponse,
        documentsResponse,
      ] = await Promise.all(promises);

      console.log('🔍 Получены данные клиента:', clientResponse.data.client);
      console.log('🔍 Получены счета:', accountsResponse.data.accounts);
      console.log('🔍 Получены рефералы:', referralsResponse.data.referrals);
      console.log('🔍 Получены документы:', documentsResponse.data.documents);
      
      // Подробное логирование данных клиента
      if (clientResponse.data.client) {
        console.log('🔍 Подробные данные клиента:', {
          id: clientResponse.data.client.id,
          firstname: clientResponse.data.client.firstname,
          surname: clientResponse.data.client.surname,
          patronymic: clientResponse.data.client.patronymic,
          phone: clientResponse.data.client.phone,
          email: clientResponse.data.client.email,
          gender: clientResponse.data.client.gender,
          dateBorn: clientResponse.data.client.dateBorn,
          geography: clientResponse.data.client.geography,
          statusPerson: clientResponse.data.client.statusPerson,
          dateReg: clientResponse.data.client.dateReg,
          description: clientResponse.data.client.description,
          avatar: clientResponse.data.client.avatar,
          userAvatar: clientResponse.data.client.User?.avatar,
          User: clientResponse.data.client.User
        });
      }
      
      setClientData(clientResponse.data.client);
      setAccounts(accountsResponse.data.accounts || []);
      setReferrals(referralsResponse.data.referrals || []);
      setDocuments(documentsResponse.data.documents || []);
    } catch (error) {
      console.error("Общая ошибка загрузки деталей клиента:", error);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    if (client) {
      loadClientDetails();
    }
  }, [client, loadClientDetails]);



  const handleUploadDocument = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("title", newDocument.title);
      formData.append("description", newDocument.description);
      formData.append("file", newDocument.file);

      await axiosAPI.post(
        `/admin/crm/deals/clients/${client.id}/documents`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setShowUploadDocument(false);
      setNewDocument({ title: "", description: "", file: null });
      loadClientDetails(); // Перезагружаем данные
    } catch (error) {
      console.error("Ошибка загрузки документа:", error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: "Ошибка загрузки документа"
        }
      }));
    }
  };

  const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];

  const isImageDocument = (doc) => {
    if (!doc) return false;
    const mime = doc.mimeType?.toLowerCase() || "";
    if (mime.startsWith("image/")) {
      return true;
    }
    const name = `${doc.originalName || doc.title || ""}`.toLowerCase();
    return IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
  };

  const resolveDocumentIcon = (doc) => {
    if (isImageDocument(doc)) {
      return "🖼️";
    }
    if (doc?.source === "manager") {
      return "📁";
    }
    switch (doc?.kind) {
      case "PASPORT":
      case "passport":
        return "🛂";
      case "selfie":
        return "📸";
      case "bank-information":
        return "🏦";
      case "investmentrules-crypto":
        return "₿";
      case "investmentrules-ETF":
        return "📈";
      default:
        return "📄";
    }
  };

  const resolveDocumentTitle = (doc) => {
    if (doc?.source === "manager") {
      return doc.title || doc.originalName || "Документ менеджера";
    }
    switch (doc?.kind) {
      case "PASPORT":
      case "passport":
        return "Паспорт";
      case "selfie":
        return "Селфи";
      case "bank-information":
        return "Банковская информация";
      case "investmentrules-crypto":
        return "Правила инвестирования (Крипто)";
      case "investmentrules-ETF":
        return "Правила инвестирования (ETF)";
      default:
        return doc?.kind || doc?.title || doc?.originalName || "Документ";
    }
  };

  const resolveDocumentStatusLabel = (doc) => {
    if (doc?.source === "manager") {
      return null;
    }
    switch (doc?.status) {
      case "approve":
      case "approved":
        return "✅ Утвержден";
      case "not approve":
      case "rejected":
        return "❌ Отклонен";
      default:
        return "⏳ На рассмотрении";
    }
  };

  const getDocumentStatusMeta = (doc) => {
    const status = (doc?.status || "").toLowerCase();
    if (status.includes("approve") && !status.includes("not")) {
      return { state: "approved", icon: "✔", label: "Утвержден" };
    }
    if (status.includes("not") || status.includes("reject")) {
      return { state: "rejected", icon: "✕", label: "Отклонен" };
    }
    return { state: "pending", icon: "⏳", label: "На рассмотрении" };
  };

  const getDocumentExtension = (doc) => {
    const name = (doc?.originalName || doc?.title || "").trim();
    if (name.includes(".")) {
      return name.split(".").pop().toUpperCase();
    }
    if (doc?.mimeType?.includes("/")) {
      return doc.mimeType.split("/").pop().toUpperCase();
    }
    return "FILE";
  };

  const formatDocumentDate = (date) => {
    if (!date) {
      return "—";
    }
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const closeDocumentViewer = () => {
    if (documentViewerUrlRef.current) {
      URL.revokeObjectURL(documentViewerUrlRef.current);
      documentViewerUrlRef.current = null;
    }
    setDocumentViewer(null);
  };

  const openDocumentViewer = async (doc) => {
    try {
      const { path, params } = buildDocumentRequestConfig(doc, {
        inline: true,
        forPreview: doc?.source !== "manager" && doc?.isEncrypted
      });
      if (!path) {
        notify("error", "Не удалось определить путь к документу");
        return;
      }
      const response = await axiosAPI.get(path, {
        responseType: "blob",
        params
      });
      const blobUrl = URL.createObjectURL(response.data);
      if (documentViewerUrlRef.current) {
        URL.revokeObjectURL(documentViewerUrlRef.current);
      }
      documentViewerUrlRef.current = blobUrl;
      const extension = getDocumentExtension(doc);
      const mime = (doc?.mimeType || "").toLowerCase();
      const isPdf = mime.includes("pdf") || extension.toLowerCase() === "pdf";
      const isImage = isImageDocument(doc);
      setDocumentViewer({
        url: blobUrl,
        title: resolveDocumentTitle(doc),
        doc,
        isPdf,
        isImage,
        extension
      });
    } catch (error) {
      console.error("Ошибка открытия документа:", error);
      notify("error", "Ошибка открытия документа: " + (error.message || "Неизвестная ошибка"));
    }
  };

  const getDocumentIdForStatusUpdate = (doc) => {
    if (doc?.fileId) {
      return doc.fileId;
    }
    if (typeof doc?.id === "string" && doc.id.includes("_")) {
      const maybeId = parseInt(doc.id.split("_").pop(), 10);
      return Number.isNaN(maybeId) ? null : maybeId;
    }
    return doc?.id || null;
  };

  const handleDocumentStatusChange = async (doc, action) => {
    if (!client?.userId) {
      notify("error", "Не удалось определить пользователя");
      return;
    }
    const documentId = getDocumentIdForStatusUpdate(doc);
    if (!documentId) {
      notify("error", "Не удалось определить документ");
      return;
    }
    const status = action === "approve" ? "approve" : "not approve";
    const loadingKey = `${doc.id}-${action}`;
    setDocumentActionLoading(loadingKey);
    try {
      await adminService.updateDocumentStatus(client.userId, documentId, status);
      notify("success", action === "approve" ? "Документ утвержден" : "Документ отклонен");
      await loadClientDetails();
    } catch (error) {
      console.error("Ошибка обновления статуса документа:", error);
      notify("error", "Ошибка обновления статуса: " + (error.response?.data?.message || error.message || "Неизвестная ошибка"));
    } finally {
      setDocumentActionLoading(null);
    }
  };

  const clientDocumentsList = documents.filter((doc) => doc.source !== "manager");
  const managerDocumentsList = documents.filter((doc) => doc.source === "manager");

  // Функции для редактирования описания
  const handleEditDescription = () => {
    setEditedDescription(clientData?.description || "");
    setIsEditingDescription(true);
  };

  const handleSaveDescription = async () => {
    try {
      await axiosAPI.put(`/admin/users/${client.userId}/notes`, {
        description: editedDescription,
      });

      // Обновляем локальные данные
      setClientData((prev) => ({
        ...prev,
        description: editedDescription,
      }));

      setIsEditingDescription(false);
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Описание успешно сохранено'
        }
      }));
    } catch (error) {
      console.error("Ошибка сохранения описания:", error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка сохранения описания: ' + error.message
        }
      }));
    }
  };

  const handleCancelEdit = () => {
    setIsEditingDescription(false);
    setEditedDescription("");
  };

  // Загружаем задачи при смене клиента
  useEffect(() => {
    if (client) {
      // Загружаем задачи асинхронно
      const loadTasksAsync = async () => {
        try {
          // Используем userId для задач, если он есть, иначе id
          const clientIdForTasks = client.userId || client.id;
          console.log(`🔍 Загружаем задачи для клиента ID: ${clientIdForTasks} (CRM ID: ${client.id}, User ID: ${client.userId})`);
          const response = await axiosAPI.get(`/admin/crm/deals/clients/${clientIdForTasks}/tasks`);
          console.log('🔍 Ответ сервера для задач:', response.data);
          
          // Фильтруем просроченные задачи
          const allTasks = response.data.data || [];
          const filteredTasks = allTasks.filter(task => task.status !== 'overdue');
          console.log(`🔍 Загружено задач: ${allTasks.length}, после фильтрации просроченных: ${filteredTasks.length}`);
          
          setTasks(filteredTasks);
        } catch (error) {
          console.error('Ошибка загрузки задач:', error);
        }
      };
      loadTasksAsync();
    }
  }, [client]);

  // Функции для работы с задачами
  const loadTasks = useCallback(async () => {
    try {
      // Используем userId для задач, если он есть, иначе id
      const clientIdForTasks = client.userId || client.id;
      console.log(`🔍 loadTasks: загружаем задачи для клиента ID: ${clientIdForTasks} (CRM ID: ${client.id}, User ID: ${client.userId})`);
      const response = await axiosAPI.get(`/admin/crm/deals/clients/${clientIdForTasks}/tasks`);
      console.log('🔍 loadTasks: ответ сервера:', response.data);
      
      // Фильтруем просроченные задачи
      const allTasks = response.data.data || [];
      const filteredTasks = allTasks.filter(task => task.status !== 'overdue');
      console.log(`🔍 Загружено задач: ${allTasks.length}, после фильтрации просроченных: ${filteredTasks.length}`);
      
      setTasks(filteredTasks);
    } catch (error) {
      console.error('Ошибка загрузки задач:', error);
    }
  }, [client?.id, client?.userId]);

  // Функции для работы со сделками
  const loadDeals = useCallback(async () => {
    try {
      if (!client?.id) return;
      
      // Используем userId из карточки клиента, а не id
      const clientUserId = client.userId || client.User?.id;
      if (!clientUserId) return;
      
      setDealsLoading(true);
      console.log(`🔍 Загружаем сделки для клиента userId: ${clientUserId} (DealClient ID: ${client.id})`);
      const response = await axiosAPI.get(`/admin/deals/client/${clientUserId}`);
      console.log('🔍 loadDeals: ответ сервера:', response.data);
      
      const clientDeals = response.data.data || [];
      console.log(`🔍 Загружено сделок: ${clientDeals.length}`);
      
      setDeals(clientDeals);
    } catch (error) {
      console.error('Ошибка загрузки сделок:', error);
    } finally {
      setDealsLoading(false);
    }
  }, [client?.id, client?.userId, client?.User?.id]);

  // Функция для загрузки курсов валют
  const loadCurrencyRates = useCallback(async () => {
    try {
      console.log('🔍 Загружаем курсы валют...');
      const response = await axiosAPI.get('/admin/deals/currency-rates');
      console.log('🔍 Курсы валют загружены:', response.data);
      setCurrencyRates(response.data.data || {});
    } catch (error) {
      console.error('Ошибка загрузки курсов валют:', error);
      // Устанавливаем дефолтные курсы на случай ошибки
      setCurrencyRates({
        USD: { spot: 75.0, deposit: 75.5, withdraw: 74.5 },
        USDT: { spot: 75.0, deposit: 75.5, withdraw: 74.5 }
      });
    }
  }, []);

  // Функция для загрузки типов сделок
  const loadDealTypes = useCallback(async () => {
    try {
      console.log('🔍 Загружаем типы сделок...');
      const response = await axiosAPI.get('/admin/deals/types');
      console.log('🔍 Типы сделок загружены:', response.data);
      setDealTypes(response.data.data || []);
    } catch (error) {
      console.error('Ошибка загрузки типов сделок:', error);
      // Устанавливаем дефолтные типы на случай ошибки
      setDealTypes([
        { id: 1, name: 'Пополнение счета', description: 'Пополнение счета клиента' },
        { id: 2, name: 'Оплата продуктов компании', description: 'Оплата за продукты или услуги компании' },
        { id: 3, name: 'Обучение', description: 'Оплата за обучение и курсы' },
        { id: 4, name: 'Членство клуба', description: 'Оплата за членство в клубе' }
      ]);
    }
  }, []);

  // Функции для работы с общением
  // Функции для работы с общением (теперь используем SupportContext)
  const loadClientConversations = useCallback(() => {
    // SupportContext автоматически загружает беседы, нам нужно только логировать
    console.log(`🔍 Загружено бесед для клиента ${client.userId}: ${conversations.length}`);
  }, [client.userId, conversations]);

  const loadConversationMessages = useCallback(async (conversationId, loadMore = false) => {
    // Используем SupportContext для загрузки сообщений
    const newMessages = await loadMessages(conversationId, loadMore);
    
    // Автоматически отмечаем сообщения как прочитанные при загрузке
    if (!loadMore) {
      await markMessagesAsRead(conversationId);
    }
    
    // Автопрокрутка к последнему сообщению при первой загрузке
    if (!loadMore) {
      setTimeout(() => {
        const messagesList = document.querySelector('.messages-list');
        if (messagesList) {
          messagesList.scrollTop = messagesList.scrollHeight;
        }
      }, 100);
    }
    
    return newMessages;
  }, [loadMessages, markMessagesAsRead]);

  // WebSocket обработчик для новых сообщений
  // WebSocket подписка больше не нужна - слушаем события от deals.jsx

  // Обработчики событий больше не нужны - используется контекст

  // Функция для сброса счетчика непрочитанных сообщений (теперь используем SupportContext)
  const markMessagesAsReadLocal = useCallback(async () => {
    if (selectedConversation) {
      await markMessagesAsRead(selectedConversation.id);
      
      // Сбрасываем счетчики в CRM контексте
      resetClientUnread(client.userId);
      resetDealsCount();
      
      // Очищаем localStorage для этого клиента
      localStorage.removeItem(`lastProcessedMessage_${client.userId}`);
      
      console.log('✅ Сообщения отмечены как прочитанные для беседы:', selectedConversation.id);
    }
  }, [selectedConversation, markMessagesAsRead, client.userId, resetClientUnread, resetDealsCount]);

  // Функция для загрузки дополнительных сообщений теперь в SupportContext

  // Обработчик прокрутки для автоматического сброса бейджа
  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px от низа
    
    // Отмечаем сообщения как прочитанные при прокрутке вниз
    if (isNearBottom && unreadMessagesCount > 0) {
      markMessagesAsReadLocal();
    }
  }, [unreadMessagesCount, markMessagesAsReadLocal]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      setSendingMessage(true);
      
      // Используем SupportContext для отправки сообщения
      const success = await sendMessage(selectedConversation.id, newMessage.trim());
      
      if (success) {
        setNewMessage('');
        // SupportContext автоматически обновит сообщения
      } else {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Ошибка отправки сообщения'
          }
        }));
      }
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка отправки сообщения'
        }
      }));
    } finally {
      setSendingMessage(false);
    }
  };

  // Функции для создания новой беседы (теперь используем SupportContext)
  const handleCreateConversation = async () => {
    if (!newConversation.subject.trim() || !newConversation.message.trim()) {
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Заполните все поля'
        }
      }));
      return;
    }

    try {
      const success = await createConversation(
        client.userId || client.id,
        newConversation.subject.trim(),
        newConversation.message.trim(),
        newConversation.channel
      );
      
      if (success) {
        setShowCreateConversationModal(false);
        setNewConversation({ subject: '', message: '', channel: 'email' });
        // Показываем SUCCESS-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'success',
            text: 'Беседа успешно создана'
          }
        }));
      } else {
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Ошибка создания беседы'
          }
        }));
      }
    } catch (error) {
      console.error('Ошибка создания беседы:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка создания беседы: ' + error.message
        }
      }));
    }
  };

  const handleCancelCreateConversation = () => {
    setShowCreateConversationModal(false);
    setNewConversation({ subject: '', message: '', channel: 'email' });
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    // Не сбрасываем счетчик и lastReadMessageId при выборе беседы
    // Это позволит корректно подсчитать непрочитанные сообщения
    loadConversationMessages(conversation.id);
  };

  // WebSocket обработчики теперь в SupportContext - они автоматически обновляют состояние

  // Функция для перевода статусов на русский
  const getStatusText = (status) => {
    const statusMap = {
      'open': 'Открыто',
      'in_progress': 'В работе',
      'resolved': 'Решено',
      'closed': 'Закрыто'
    };
    return statusMap[status] || status;
  };

  // Функция для получения иконки приоритета
  const getPriorityIcon = (priority) => {
    const priorityMap = {
      'urgent': '🔴',
      'high': '🟠',
      'normal': '🟡',
      'low': '🟢'
    };
    return priorityMap[priority] || '🟡';
  };

  // Функция для сортировки бесед по приоритету
  const sortConversationsByPriority = (conversations) => {
    const priorityOrder = { 'urgent': 0, 'high': 1, 'normal': 2, 'low': 3 };
    const closedStatuses = ['resolved', 'closed'];
    
    return [...conversations].sort((a, b) => {
      const aIsClosed = closedStatuses.includes(a.status);
      const bIsClosed = closedStatuses.includes(b.status);
      
      // Если одна беседа закрыта, а другая нет - закрытая идет вниз
      if (aIsClosed && !bIsClosed) return 1;
      if (!aIsClosed && bIsClosed) return -1;
      
      // Если обе закрыты - сортируем по дате (новые сверху)
      if (aIsClosed && bIsClosed) {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      
      // Если обе активные - сортируем по приоритету
      const priorityA = priorityOrder[a.priority] ?? 2; // default to normal
      const priorityB = priorityOrder[b.priority] ?? 2; // default to normal
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // Если приоритеты одинаковые, сортируем по дате создания (новые сверху)
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  };

  // Функция для изменения статуса беседы
  const handleChangeConversationStatus = async (status) => {
    if (!selectedConversation) return;
    
    try {
      await axiosAPI.put(`/admin/support/conversations/${selectedConversation.id}`, { status });
      
      // Обновляем статус в selectedConversation
      setSelectedConversation({ ...selectedConversation, status });
      
      // Обновляем статус в списке бесед через SupportContext
      supportContext.setConversations(conversations.map(conv => 
        conv.id === selectedConversation.id 
          ? { ...conv, status }
          : conv
      ));
    } catch (error) {
      console.error('Ошибка изменения статуса:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка изменения статуса беседы'
        }
      }));
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      // Используем userId для задач, если он есть, иначе id
      const clientIdForTasks = client.userId || client.id;
      console.log(`🔍 Создаем задачу для клиента ID: ${clientIdForTasks} (CRM ID: ${client.id}, User ID: ${client.userId})`);
      
      await axiosAPI.post('/admin/tasks', {
        ...newTask,
        clientId: clientIdForTasks
      });
      
      setShowCreateTask(false);
      setNewTask({ title: '', description: '', priority: 'medium', reminderDate: '', dueDate: '' });
      loadTasks();
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Задача успешно создана'
        }
      }));
    } catch (error) {
      console.error('Ошибка создания задачи:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка создания задачи: ' + error.message
        }
      }));
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await axiosAPI.put(`/admin/tasks/${taskId}`, {
        status: newStatus
      });
      loadTasks();
    } catch (error) {
      console.error('Ошибка обновления статуса задачи:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка обновления статуса задачи'
        }
      }));
    }
  };

  const handleDeleteTask = async (taskId) => {
    // Показываем модальное окно подтверждения
    const shouldDelete = window.confirm('Вы уверены, что хотите удалить эту задачу?');
    if (shouldDelete) {
      try {
        await axiosAPI.delete(`/admin/tasks/${taskId}`);
        loadTasks();
        // Показываем SUCCESS-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'success',
            text: 'Задача успешно удалена'
          }
        }));
      } catch (error) {
        console.error('Ошибка удаления задачи:', error);
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Ошибка удаления задачи'
          }
        }));
      }
    }
  };

  const handleUploadTaskDocument = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('title', newTaskDocument.title);
      formData.append('description', newTaskDocument.description);
      formData.append('file', newTaskDocument.file);

      const response = await axiosAPI.post(`/admin/tasks/${selectedTaskId}/documents`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      // Получаем данные о загруженном документе из ответа
      const uploadedDocument = response.data?.data || response.data?.document;
      
      if (uploadedDocument) {
        // Обновляем задачу в состоянии, добавляя новый документ
        setTasks(prevTasks => {
          return prevTasks.map(task => {
            // Сравниваем ID как числа для надежности
            if (parseInt(task.id) === parseInt(selectedTaskId)) {
              const updatedDocuments = [...(task.documents || []), uploadedDocument];
              return { ...task, documents: updatedDocuments };
            }
            return task;
          });
        });

        // Загружаем превью для нового документа
        const fileName = uploadedDocument.originalFileName || uploadedDocument.title || 'document';
        const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
        const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExt);
        const isPdf = fileExt === 'pdf';

        if (isImage || isVideo || isPdf) {
          const previewKey = `task-${selectedTaskId}-doc-${uploadedDocument.id}`;
          
          // Загружаем превью асинхронно
          (async () => {
            try {
              const url = `/admin/task-documents/${uploadedDocument.id}/download${isPdf ? '?preview=true' : ''}`;
              const previewResponse = await axiosAPI.get(url, {
                responseType: 'blob'
              });
              const blobUrl = URL.createObjectURL(previewResponse.data);
              
              if (!taskDocumentPreviewsRef.current[previewKey]) {
                taskDocumentPreviewsRef.current[previewKey] = blobUrl;
                setTaskDocumentPreviews(prev => ({
                  ...prev,
                  [previewKey]: blobUrl
                }));
              }
            } catch (previewError) {
              console.error(`❌ Ошибка загрузки превью для нового документа:`, previewError);
            }
          })();
        }
      } else {
        // Если документ не пришел в ответе, перезагружаем задачи
        await loadTasks();
      }

      setShowUploadTaskDocument(false);
      setSelectedTaskId(null);
      setNewTaskDocument({ title: '', description: '', file: null });
      
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Документ успешно добавлен к задаче'
        }
      }));
    } catch (error) {
      console.error('Ошибка загрузки документа:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка загрузки документа'
        }
      }));
    }
  };

  // Функции для работы со сделками
  const handleCreateDeal = async (e) => {
    e.preventDefault();
    try {
      console.log(`🔍 Создаем сделку для клиента ID: ${client.id}`);
      console.log(`🔍 Данные клиента:`, client);
      console.log(`🔍 Данные сделки:`, newDeal);
      
      // Используем userId из карточки клиента, а не id
      const clientUserId = client.userId || client.User?.id;
      console.log(`🔍 Используем userId клиента: ${clientUserId} (вместо DealClient ID: ${client.id})`);
      
      // Создаем FormData для отправки с файлами
      const formData = new FormData();
      
      // Добавляем все данные сделки
      formData.append('dealTypeId', newDeal.dealTypeId);
      formData.append('amountCurrency', newDeal.amountCurrency);
      formData.append('currency', newDeal.currency);
      formData.append('amountRub', newDeal.amountRub);
      formData.append('exchangeRate', newDeal.exchangeRate);
      formData.append('dealDate', newDeal.dealDate);
      formData.append('description', newDeal.description);
      formData.append('clientId', clientUserId);
      
      // Добавляем файлы
      dealDocuments.forEach((doc) => {
        formData.append(`documents`, doc.file);
      });
      
      console.log(`🔍 Отправляем данные сделки с файлами:`, {
        dealTypeId: newDeal.dealTypeId,
        amountCurrency: newDeal.amountCurrency,
        currency: newDeal.currency,
        clientId: clientUserId,
        filesCount: dealDocuments.length
      });
      
      await axiosAPI.post('/admin/deals', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      setShowCreateDeal(false);
      setNewDeal({
        dealTypeId: '',
        amountCurrency: '',
        currency: 'USD',
        amountRub: '',
        exchangeRate: '',
        dealDate: '',
        description: ''
      });
      setDealDocuments([]);
      loadDeals();
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Сделка успешно создана и отправлена на рассмотрение'
        }
      }));
    } catch (error) {
      console.error('Ошибка создания сделки:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка создания сделки: ' + (error.response?.data?.message || error.message)
        }
      }));
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'status-approved';
      case 'rejected':
        return 'status-rejected';
      case 'pending':
      default:
        return 'status-pending';
    }
  };

  const getDealStatusText = (status) => {
    switch (status) {
      case 'approved':
        return '✅ Утверждена';
      case 'rejected':
        return '❌ Отклонена';
      case 'pending':
      default:
        return '⏳ На рассмотрении';
    }
  };

  // Функции для автоматического пересчета сумм
  const handleCurrencyChange = (currency) => {
    const currentRate = currencyRates[currency]?.dealRate || 75.0;
    setNewDeal(prev => ({
      ...prev,
      currency,
      exchangeRate: currentRate.toString()
    }));
  };

  const handleAmountCurrencyChange = (amount) => {
    const rate = parseFloat(newDeal.exchangeRate) || 75.0;
    const amountRub = (parseFloat(amount) * rate).toFixed(2);
    
    setNewDeal(prev => ({
      ...prev,
      amountCurrency: amount,
      amountRub: amountRub
    }));
  };

  const handleAmountRubChange = (amount) => {
    const rate = parseFloat(newDeal.exchangeRate) || 75.0;
    const amountCurrency = (parseFloat(amount) / rate).toFixed(2);
    
    setNewDeal(prev => ({
      ...prev,
      amountRub: amount,
      amountCurrency: amountCurrency
    }));
  };

  const handleExchangeRateChange = (rate) => {
    if (newDeal.amountCurrency && newDeal.amountCurrency !== '') {
      const amountRub = (parseFloat(newDeal.amountCurrency) * parseFloat(rate)).toFixed(2);
      setNewDeal(prev => ({
        ...prev,
        exchangeRate: rate,
        amountRub: amountRub
      }));
    } else {
      setNewDeal(prev => ({
        ...prev,
        exchangeRate: rate
      }));
    }
  };

  // Функции для работы с документами сделки
  const handleAddDealDocument = (e) => {
    const files = Array.from(e.target.files);
    const newDocuments = files.map(file => ({
      name: file.name,
      file: file
    }));
    setDealDocuments(prev => [...prev, ...newDocuments]);
  };

  const handleRemoveDealDocument = (index) => {
    setDealDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const handleDocumentUploadModal = async (e, dealId) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('document', file);

      console.log(`🔍 Загружаем документ для сделки ID: ${dealId}, файл: ${file.name}`);

      const { data } = await axiosAPI.post(`/admin/deals/${dealId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (data.success) {
        console.log('✅ Документ успешно загружен');
        // Перезагружаем сделки клиента
        loadDeals();
      } else {
        console.error('❌ Ошибка загрузки документа:', data.message);
        // Показываем ERROR-уведомление
        document.dispatchEvent(new CustomEvent('main-notify', {
          detail: {
            type: 'error',
            text: 'Ошибка загрузки документа: ' + (data.message || 'Неизвестная ошибка')
          }
        }));
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки документа:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка загрузки документа: ' + (error.response?.data?.message || 'Неизвестная ошибка')
        }
      }));
    }

    // Очищаем input
    e.target.value = '';
  };

  // Функция для открытия вьювера документа сделки
  const handleOpenDealDocumentViewer = async (docObj) => {
    try {
      const { dealId, documentIndex, filePath, originalName, mimeType } = docObj;
      
      console.log('🔍 handleOpenDealDocumentViewer вызван с:', { dealId, documentIndex, originalName });
      
      if (!dealId || documentIndex === undefined) {
        console.error('❌ Не указаны dealId или documentIndex');
        return;
      }

      // Получаем документ через API
      const response = await axiosAPI.get(`/admin/deals/${dealId}/documents/${documentIndex}/download`, {
        responseType: 'blob'
      });

      console.log('✅ Документ получен, создаем blob URL');

      const blobUrl = URL.createObjectURL(response.data);
      const fileExt = originalName.split('.').pop()?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
      const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExt);
      const isPdf = fileExt === 'pdf';

      const viewerData = {
        url: blobUrl,
        title: originalName,
        mimeType: mimeType || response.headers['content-type'],
        isImage,
        isVideo,
        isPdf,
        extension: fileExt,
        dealId,
        documentIndex
      };

      console.log('📄 Устанавливаем dealDocumentViewer:', viewerData);
      setDealDocumentViewer(viewerData);
    } catch (error) {
      console.error('❌ Ошибка открытия документа сделки:', error);
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка открытия документа: ' + (error.response?.data?.message || error.message)
        }
      }));
    }
  };

  // Функция для закрытия вьювера документа сделки
  const handleCloseDealDocumentViewer = () => {
    if (dealDocumentViewer?.url) {
      URL.revokeObjectURL(dealDocumentViewer.url);
    }
    setDealDocumentViewer(null);
  };

  // Загрузка превью для документов сделок
  useEffect(() => {
    const loadDealDocumentPreviews = async () => {
      const previewsToLoad = [];
      
      // Собираем все документы, для которых нужно загрузить превью
      deals.forEach(deal => {
        if (deal.documents && deal.documents.length > 0) {
          deal.documents.forEach((doc, idx) => {
            const fileName = doc.split('/').pop();
            const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
            const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExt);
            
            if (isImage || isVideo) {
              const previewKey = `deal-${deal.id}-doc-${idx}`;
              // Проверяем через ref, чтобы избежать проблем с асинхронностью
              if (!dealDocumentPreviewsRef.current[previewKey]) {
                previewsToLoad.push({ dealId: deal.id, documentIndex: idx, previewKey });
              }
            }
          });
        }
      });

      // Загружаем превью параллельно
      if (previewsToLoad.length > 0) {
        console.log(`🔍 Загружаем ${previewsToLoad.length} превью для документов сделок`);
        const loadPromises = previewsToLoad.map(async ({ dealId, documentIndex, previewKey }) => {
          try {
            console.log(`📥 Загрузка превью: ${previewKey}`);
            const response = await axiosAPI.get(`/admin/deals/${dealId}/documents/${documentIndex}/download`, {
              responseType: 'blob'
            });
            const blobUrl = URL.createObjectURL(response.data);
            console.log(`✅ Превью загружено: ${previewKey}`, blobUrl);
            
            // Обновляем ref и состояние
            if (!dealDocumentPreviewsRef.current[previewKey]) {
              dealDocumentPreviewsRef.current[previewKey] = blobUrl;
              setDealDocumentPreviews(prev => ({
                ...prev,
                [previewKey]: blobUrl
              }));
            } else {
              // Уже загружено, освобождаем память
              URL.revokeObjectURL(blobUrl);
            }
          } catch (error) {
            console.error(`❌ Ошибка загрузки превью для ${previewKey}:`, error);
          }
        });

        await Promise.all(loadPromises);
      }
    };

    if (deals.length > 0) {
      loadDealDocumentPreviews();
    }

    // Очистка при размонтировании или изменении deals
    return () => {
      // Очистка будет выполнена при следующем рендере через setDealDocumentPreviews
    };
  }, [deals]);

  // Очистка blob URL при размонтировании компонента
  useEffect(() => {
    return () => {
      // Очищаем все blob URL для превью при размонтировании
      Object.values(dealDocumentPreviewsRef.current).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
      dealDocumentPreviewsRef.current = {};
      setDealDocumentPreviews({});
    };
  }, []);

  const handleDownloadDocumentModal = async (documentPath, dealId, documentIndex) => {
    try {
      console.log(`🔍 Скачиваем документ: ${documentPath}, dealId: ${dealId}, index: ${documentIndex}`);
      
      // Если путь начинается с http, используем его напрямую
      if (documentPath.startsWith('http')) {
        window.open(documentPath, '_blank');
        return;
      }

      // Используем API endpoint для скачивания документа сделки
      if (dealId !== undefined && documentIndex !== undefined) {
        const response = await axiosAPI.get(`/admin/deals/${dealId}/documents/${documentIndex}/download`, {
          responseType: 'blob'
        });
        
        // Получаем имя файла из заголовка Content-Disposition или из пути
        const contentDisposition = response.headers['content-disposition'];
        let filename = documentPath.split('/').pop() || 'document';
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/);
          if (filenameMatch) {
            filename = decodeURIComponent(filenameMatch[1]);
          }
        }
        
        // Получаем MIME-тип из заголовка Content-Type
        const contentType = response.headers['content-type'] || 'application/octet-stream';
        const blob = new Blob([response.data], { type: contentType });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        // Освобождаем память
        window.URL.revokeObjectURL(url);
        
        console.log(`✅ Документ скачан: ${filename}`);
        return;
      }

      // Fallback: старая логика для обратной совместимости
      let fullUrl;
      if (documentPath.startsWith('/uploads/')) {
        fullUrl = documentPath;
      } else if (documentPath.startsWith('/')) {
        fullUrl = documentPath;
      } else {
        fullUrl = `/uploads/deals/${documentPath}`;
      }

      console.log(`🔍 Полный URL для скачивания: ${fullUrl}`);

      const link = document.createElement('a');
      link.href = fullUrl;
      link.download = documentPath.split('/').pop();
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('❌ Ошибка скачивания документа:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка скачивания документа: ' + (error.response?.data?.message || error.message)
        }
      }));
    }
  };

  // Функция для открытия вьювера документа задачи
  const handleOpenTaskDocumentViewer = async (docObj) => {
    try {
      const { documentId, originalName, mimeType } = docObj;
      
      console.log('🔍 handleOpenTaskDocumentViewer вызван с:', { documentId, originalName });
      
      if (!documentId) {
        console.error('❌ Не указан documentId');
        return;
      }

      // Получаем документ через API
      const response = await axiosAPI.get(`/admin/task-documents/${documentId}/download`, {
        responseType: 'blob'
      });

      console.log('✅ Документ получен, создаем blob URL');

      const blobUrl = URL.createObjectURL(response.data);
      const fileExt = originalName.split('.').pop()?.toLowerCase() || '';
      const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
      const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExt);
      const isPdf = fileExt === 'pdf';

      const viewerData = {
        url: blobUrl,
        title: originalName,
        mimeType: mimeType || response.headers['content-type'],
        isImage,
        isVideo,
        isPdf,
        extension: fileExt,
        documentId
      };

      console.log('📄 Устанавливаем taskDocumentViewer:', viewerData);
      setTaskDocumentViewer(viewerData);
    } catch (error) {
      console.error('❌ Ошибка открытия документа задачи:', error);
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка открытия документа: ' + (error.response?.data?.message || error.message)
        }
      }));
    }
  };

  // Функция для закрытия вьювера документа задачи
  const handleCloseTaskDocumentViewer = () => {
    if (taskDocumentViewer?.url) {
      URL.revokeObjectURL(taskDocumentViewer.url);
    }
    setTaskDocumentViewer(null);
  };

  const handleDownloadTaskDocument = async (documentId) => {
    try {
      const response = await axiosAPI.get(`/admin/task-documents/${documentId}/download`, {
        responseType: 'blob'
      });
      
      // Получаем имя файла из заголовка Content-Disposition
      const contentDisposition = response.headers['content-disposition'];
      let filename = 'document';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";]+)['"]?/);
        if (filenameMatch) {
          filename = decodeURIComponent(filenameMatch[1]);
        }
      }
      
      // Получаем MIME-тип из заголовка Content-Type
      const contentType = response.headers['content-type'];
      const blob = new Blob([response.data], { type: contentType });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Освобождаем память
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка скачивания документа:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка скачивания документа'
        }
      }));
    }
  };

  const handleDeleteTaskDocument = async (documentId, taskId) => {
    // Показываем модальное окно подтверждения
    const shouldDelete = window.confirm('Вы уверены, что хотите удалить этот документ?');
    if (!shouldDelete) return;
    
    try {
      await axiosAPI.delete(`/admin/task-documents/${documentId}`);
      
      // Удаляем превью из состояния
      const previewKey = `task-${taskId}-doc-${documentId}`;
      if (taskDocumentPreviewsRef.current[previewKey]) {
        URL.revokeObjectURL(taskDocumentPreviewsRef.current[previewKey]);
        delete taskDocumentPreviewsRef.current[previewKey];
        setTaskDocumentPreviews(prev => {
          const updated = { ...prev };
          delete updated[previewKey];
          return updated;
        });
      }
      
      // Обновляем список задач
      await loadTasks();
      
      // Показываем SUCCESS-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'success',
          text: 'Документ успешно удален'
        }
      }));
    } catch (error) {
      console.error('Ошибка удаления документа:', error);
      // Показываем ERROR-уведомление
      document.dispatchEvent(new CustomEvent('main-notify', {
        detail: {
          type: 'error',
          text: 'Ошибка удаления документа: ' + (error.response?.data?.message || error.message)
        }
      }));
    }
  };

  // Загрузка превью для документов задач
  useEffect(() => {
    const loadTaskDocumentPreviews = async () => {
      const previewsToLoad = [];
      
      // Собираем все документы, для которых нужно загрузить превью
      tasks.forEach(task => {
        if (task.documents && task.documents.length > 0) {
          task.documents.forEach((doc) => {
            const fileName = doc.originalFileName || doc.title || 'document';
            const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
            const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExt);
            const isPdf = fileExt === 'pdf';
            
            // Загружаем превью для изображений, видео и PDF
            if (isImage || isVideo || isPdf) {
              const previewKey = `task-${task.id}-doc-${doc.id}`;
              // Проверяем через ref, чтобы избежать проблем с асинхронностью
              if (!taskDocumentPreviewsRef.current[previewKey]) {
                previewsToLoad.push({ documentId: doc.id, previewKey, isPdf });
              }
            }
          });
        }
      });

      // Загружаем превью параллельно
      if (previewsToLoad.length > 0) {
        console.log(`🔍 Загружаем ${previewsToLoad.length} превью для документов задач`);
        const loadPromises = previewsToLoad.map(async ({ documentId, previewKey, isPdf }) => {
          try {
            console.log(`📥 Загрузка превью: ${previewKey}${isPdf ? ' (PDF)' : ''}`);
            // Для PDF добавляем параметр preview=true для конвертации в изображение
            const url = `/admin/task-documents/${documentId}/download${isPdf ? '?preview=true' : ''}`;
            const response = await axiosAPI.get(url, {
              responseType: 'blob'
            });
            const blobUrl = URL.createObjectURL(response.data);
            console.log(`✅ Превью загружено: ${previewKey}`, blobUrl);
            
            // Обновляем ref и состояние
            if (!taskDocumentPreviewsRef.current[previewKey]) {
              taskDocumentPreviewsRef.current[previewKey] = blobUrl;
              setTaskDocumentPreviews(prev => ({
                ...prev,
                [previewKey]: blobUrl
              }));
            } else {
              // Уже загружено, освобождаем память
              URL.revokeObjectURL(blobUrl);
            }
          } catch (error) {
            console.error(`❌ Ошибка загрузки превью для ${previewKey}:`, error);
          }
        });

        await Promise.all(loadPromises);
      }
    };

    if (tasks.length > 0) {
      loadTaskDocumentPreviews();
    }

    // Очистка при размонтировании или изменении tasks
    return () => {
      // Очистка будет выполнена при следующем рендере через setTaskDocumentPreviews
    };
  }, [tasks]);

  // Очистка blob URL для документов задач при размонтировании компонента
  useEffect(() => {
    return () => {
      // Очищаем все blob URL для превью при размонтировании
      Object.values(taskDocumentPreviewsRef.current).forEach(url => {
        if (url) URL.revokeObjectURL(url);
      });
      taskDocumentPreviewsRef.current = {};
      setTaskDocumentPreviews({});
    };
  }, []);

  // Загрузка бесед при открытии карточки клиента
  useEffect(() => {
    if (client && client.userId) {
      loadClientConversations();
    }
  }, [client, loadClientConversations]);

  // Загрузка сделок при переключении на вкладку "deals"
  useEffect(() => {
    if (activeTab === 'deals' && client) {
      loadDeals();
    }
  }, [activeTab, client, loadDeals]);

  // Загрузка курсов валют и типов сделок при открытии формы создания сделки
  useEffect(() => {
    if (showCreateDeal) {
      loadCurrencyRates();
      loadDealTypes();
      
      // Устанавливаем курс USD по умолчанию
      if (currencyRates.USD?.dealRate) {
        setNewDeal(prev => ({
          ...prev,
          exchangeRate: currencyRates.USD.dealRate.toString()
        }));
      }
    }
  }, [showCreateDeal, loadCurrencyRates, loadDealTypes, currencyRates.USD?.dealRate]);

  const previewUrlsRef = useRef({});
  const documentViewerUrlRef = useRef(null);
  const [previewUrls, setPreviewUrls] = useState({});

  const buildDocumentRequestConfig = (doc, { inline = false, forPreview = false, forDownload = false } = {}) => {
    let path = "";
    if (doc?.source === "manager") {
      if (!client?.id || !doc?.fileId) {
        return { path: "", params: {} };
      }
      path = `/admin/crm/deals/clients/${client.id}/files/${doc.fileId}/download`;
    } else {
      path = doc.viewUrl;
    }

    const params = {};

    // Добавляем токен для запросов к /admin/documents/*
    if (path && path.includes('/admin/documents/')) {
      const token = localStorage.getItem('accessToken');
      if (token) {
        params.token = token;
      }
    }

    if (inline) {
      params.inline = "true";
    }

    if (forPreview && doc?.source !== "manager" && doc?.isEncrypted) {
      params.preview = "true";
    }

    if (forDownload && doc?.source !== "manager") {
      params.download = "true";
    }

    return { path, params };
  };

  const notify = (type, text) => {
    document.dispatchEvent(
      new CustomEvent("main-notify", {
        detail: { type, text }
      })
    );
  };

  const openDocumentInNewTab = async (doc) => {
    await openDocumentViewer(doc);
  };

  const downloadDocument = async (doc) => {
    try {
      const { path, params } = buildDocumentRequestConfig(doc, {
        forDownload: true
      });
      if (!path) {
        notify("error", "Не удалось определить путь к документу");
        return;
      }
      const response = await axiosAPI.get(path, {
        responseType: "blob",
        params
      });
      const blobUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = doc.title || doc.originalName || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    } catch (error) {
      console.error("Ошибка скачивания документа:", error);
      notify("error", "Ошибка скачивания документа: " + (error.message || "Неизвестная ошибка"));
    }
  };

  useEffect(() => {
    if (!client) {
      return;
    }

    const imageDocs = documents.filter(isImageDocument);

    setPreviewUrls((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        if (!imageDocs.some((doc) => doc.id === id)) {
          URL.revokeObjectURL(updated[id]);
          delete updated[id];
        }
      });
      previewUrlsRef.current = updated;
      return updated;
    });

    let cancelled = false;

    const loadPreviews = async () => {
      for (const doc of imageDocs) {
        if (previewUrlsRef.current[doc.id]) {
          continue;
        }
        try {
          const { path, params } = buildDocumentRequestConfig(doc, {
            inline: true,
            forPreview: true
          });
          if (!path) {
            continue;
          }
          const response = await axiosAPI.get(path, {
            responseType: "blob",
            params
          });
          const blobUrl = URL.createObjectURL(response.data);
          if (cancelled) {
            URL.revokeObjectURL(blobUrl);
            continue;
          }
          setPreviewUrls((prev) => {
            if (prev[doc.id]) {
              URL.revokeObjectURL(blobUrl);
              previewUrlsRef.current = prev;
              return prev;
            }
            const next = { ...prev, [doc.id]: blobUrl };
            previewUrlsRef.current = next;
            return next;
          });
        } catch (error) {
          console.error("Ошибка загрузки превью документа:", error);
        }
      }
    };

    loadPreviews();

    return () => {
      cancelled = true;
    };
  }, [documents, client]);

  useEffect(() => () => {
    Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current = {};
  }, []);

  useEffect(() => () => {
    if (documentViewerUrlRef.current) {
      URL.revokeObjectURL(documentViewerUrlRef.current);
      documentViewerUrlRef.current = null;
    }
  }, []);

  const renderDocumentCard = (doc) => {
    const isManager = doc?.source === "manager";
    const statusMeta = getDocumentStatusMeta(doc);
    const isImage = isImageDocument(doc);
    const previewUrl = isImage ? previewUrls[doc.id] : null;
    const extension = getDocumentExtension(doc);
    const statusLabel = resolveDocumentStatusLabel(doc);
    const loadingApprove = documentActionLoading === `${doc.id}-approve`;
    const loadingReject = documentActionLoading === `${doc.id}-reject`;

    const handleDeleteManagerDoc = async (event) => {
      event.stopPropagation();
      if (!isManager) {
        return;
      }
      if (!window.confirm("Удалить документ менеджера?")) {
        return;
      }
      try {
        await axiosAPI.delete(`/admin/crm/deals/clients/${client.id}/files/${doc.fileId}`);
        notify("success", "Документ удален");
        await loadClientDetails();
      } catch (error) {
        console.error("Ошибка удаления документа:", error);
        notify("error", "Ошибка удаления документа: " + (error.message || "Неизвестная ошибка"));
      }
    };

    return (
      <div
        key={`document-${doc.id}`}
        className={`doc-card ${isManager ? "doc-card--manager" : `doc-card--${statusMeta.state}`}`}
      >
        <div
          className={`doc-card__preview${previewUrl ? " has-preview" : ""}`}
          onClick={() => openDocumentViewer(doc)}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={resolveDocumentTitle(doc)} />
          ) : (
            <div className="doc-card__file-badge">{extension}</div>
          )}
          {!isManager && (
            <div className="doc-card__status-icon" title={statusLabel || statusMeta.label}>
              {statusMeta.icon}
            </div>
          )}
        </div>
        <div className="doc-card__body" onClick={() => openDocumentViewer(doc)}>
          <div className="doc-card__title">{resolveDocumentTitle(doc)}</div>
          <div className="doc-card__meta">
            <span>{formatDocumentDate(doc.createdAt)}</span>
            {doc.kind && <span>{doc.kind}</span>}
          </div>
          {!isManager && (
            <div className={`doc-card__status-pill doc-card__status-pill--${statusMeta.state}`}>
              {statusMeta.icon} {statusMeta.label}
            </div>
          )}
          {isManager && doc.description && (
            <p className="doc-card__description">{doc.description}</p>
          )}
          {doc.originalName && (
            <p className="doc-card__filename">{doc.originalName}</p>
          )}
        </div>
        <div className="doc-card__actions" onClick={(e) => e.stopPropagation()}>
          {!isManager && (
            <>
              <button
                className="doc-btn doc-btn--approve"
                onClick={() => handleDocumentStatusChange(doc, "approve")}
                disabled={statusMeta.state === "approved" || loadingApprove}
              >
                {loadingApprove ? "..." : "Утвердить"}
              </button>
              <button
                className="doc-btn doc-btn--reject"
                onClick={() => handleDocumentStatusChange(doc, "reject")}
                disabled={statusMeta.state === "rejected" || loadingReject}
              >
                {loadingReject ? "..." : "Отклонить"}
              </button>
            </>
          )}
          <button
            className="doc-btn doc-btn--ghost"
            onClick={() => downloadDocument(doc)}
          >
            Скачать
          </button>
          {isManager && (
            <button className="doc-btn doc-btn--danger" onClick={handleDeleteManagerDoc}>
              Удалить
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!client) return null;

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content client-details-modal">
          <div className="loading">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content client-details-modal">
        <div className="modal-header">
          <h3>Информация о клиенте</h3>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="client-details-content">
          {/* Фиксированная шапка */}
          <div className="client-details-header">
            <div className="client-summary">
              <div className="client-avatar">
                {(() => {
                  const avatar = clientData?.avatar || clientData?.User?.avatar;
                  return avatar && avatar !== "noAvatar" ? (
                    <img
                      src={
                        avatar.startsWith("http")
                          ? avatar
                          : `${API_CONFIG.BASE_URL}${avatar}`
                      }
                      alt="Avatar"
                    />
                  ) : (
                  <div className="avatar-placeholder">
                    {(clientData?.User?.firstname?.[0] || clientData?.firstName?.[0] || "К").toUpperCase()}
                  </div>
                  );
                })()}
              </div>
              <div className="client-basic-info">
                <h4 className="client-name">
                  {clientData?.User?.surname || clientData?.lastName || ""} {clientData?.User?.firstname || clientData?.firstName || ""}{" "}
                  {clientData?.User?.patronymic || clientData?.middleName || ""}
                </h4>
                <p className="client-email">{clientData?.email || ""}</p>
                <p className="client-phone">{clientData?.User?.phone || clientData?.phone || ""}</p>
              </div>
            </div>

            {/* Вкладки в фиксированной шапке */}
            <div className="client-tabs">
              <button
                className={`tab-button ${
                  activeTab === "personal" ? "active" : ""
                }`}
                onClick={() => setActiveTab("personal")}
              >
                👤 Личная информация
              </button>
              <button
                className={`tab-button ${
                  activeTab === "accounts" ? "active" : ""
                }`}
                onClick={() => setActiveTab("accounts")}
              >
                💰 Счета
              </button>
              <button
                className={`tab-button ${
                  activeTab === "referrals" ? "active" : ""
                }`}
                onClick={() => setActiveTab("referrals")}
              >
                🌐 Реферальная структура
              </button>
              <button
                className={`tab-button ${
                  activeTab === "documents" ? "active" : ""
                }`}
                onClick={() => setActiveTab("documents")}
              >
                📄 Документы
              </button>
              <button
                className={`tab-button ${
                  activeTab === "tasks" ? "active" : ""
                }`}
                onClick={() => setActiveTab("tasks")}
              >
                ✅ Задачи
              </button>
              <button
                className={`tab-button ${
                  activeTab === "deals" ? "active" : ""
                }`}
                onClick={() => setActiveTab("deals")}
              >
                💼 Сделки
              </button>
              <button
                className={`tab-button ${
                  activeTab === "communication" ? "active" : ""
                }`}
                onClick={() => setActiveTab("communication")}
              >
                💬 Общение
                {/* Бейдж непрочитанных сообщений на кнопке вкладки */}
                {unreadMessagesCount > 0 && (
                  <div className="tab-unread-badge">
                    {unreadMessagesCount}
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* Прокручиваемая контентная область */}
          <div className="client-details-body">
            {/* Содержимое вкладок */}
            {activeTab === "personal" && (
              <div className="personal-info">
                <h4>Личная информация</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <label>Фамилия:</label>
                    <span>{clientData?.User?.surname || clientData?.lastName || "Не указано"}</span>
                  </div>
                  <div className="info-item">
                    <label>Имя:</label>
                    <span>{clientData?.User?.firstname || clientData?.firstName || "Не указано"}</span>
                  </div>
                  <div className="info-item">
                    <label>Отчество:</label>
                    <span>{clientData?.User?.patronymic || clientData?.middleName || "Не указано"}</span>
                  </div>
                  <div className="info-item">
                    <label>Email:</label>
                    <span>{clientData?.email || "Не указано"}</span>
                  </div>
                  <div className="info-item">
                    <label>Телефон:</label>
                    <span>{clientData?.User?.phone || clientData?.phone || "Не указано"}</span>
                  </div>
                  <div className="info-item">
                    <label>Пол:</label>
                    <span>
                      {clientData?.User?.gender === 'male' ? 'Мужской' : 
                       clientData?.User?.gender === 'female' ? 'Женский' : 
                       "Не указано"}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Дата рождения:</label>
                    <span>
                      {clientData?.User?.dateBorn
                        ? new Date(clientData.User.dateBorn).toLocaleDateString(
                            "ru-RU"
                          )
                        : "Не указано"}
                    </span>
                  </div>
                  <div className="info-item">
                    <label>Местоположение:</label>
                    <span>{clientData?.User?.geography || "Не указано"}</span>
                  </div>
                  <div className="info-item">
                    <label>Статус:</label>
                    <span>{clientData?.User?.statusPerson || "Не указано"}</span>
                  </div>
                  <div className="info-item">
                    <label>Дата регистрации:</label>
                    <span>
                      {clientData?.User?.dateReg
                        ? new Date(clientData.User.dateReg).toLocaleDateString(
                            "ru-RU"
                          )
                        : "Не указано"}
                    </span>
                  </div>
                  <div className="info-item full-width">
                    <label>Описание:</label>
                    {isEditingDescription ? (
                      <div className="description-edit">
                        <textarea
                          value={editedDescription}
                          onChange={(e) => setEditedDescription(e.target.value)}
                          placeholder="Введите описание клиента"
                          rows="3"
                          className="description-textarea"
                        />
                        <div className="description-actions">
                          <button
                            onClick={handleSaveDescription}
                            className="btn-save"
                          >
                            💾 Сохранить
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="btn-cancel"
                          >
                            ✕ Отменить
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="description-display">
                        <span className="description-text">
                          {clientData?.description || "Не указано"}
                        </span>
                        <button
                          onClick={handleEditDescription}
                          className="btn-edit"
                          title="Редактировать описание"
                        >
                          ✏️
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "accounts" && (
              <div className="accounts-info">
                <div className="section-header">
                  <h4>Счета клиента</h4>
                  <button
                    className="btn-add"
                    onClick={() => setShowCreateAccountModal(true)}
                  >
                    + Создать счет
                  </button>
                </div>

                {accounts.length === 0 ? (
                  <p className="no-data">У клиента нет счетов</p>
                ) : (
                  <div className="accounts-list">
                    {accounts.map((account) => (
                      <div key={`account-${account.id}`} className="account-card">
                        <div className="account-header">
                          <h5>
                            {account.accountName || `Счет #${account.id}`}
                          </h5>
                          <span className="account-balance">
                            {account.balance !== undefined
                              ? `${account.balance} ${
                                  account.currency || "USD"
                                }`
                              : "0 USD"}
                          </span>
                        </div>
                        <div className="account-details">
                          <p>
                            <strong>Продукт:</strong>{" "}
                            {account.productName || "Не указан"}
                          </p>
                          <p>
                            <strong>Создан:</strong>{" "}
                            {new Date(account.createdAt).toLocaleDateString(
                              "ru-RU"
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "referrals" && (
              <div className="referrals-info">
                <h4>Реферальная структура</h4>
                {referrals.length === 0 ? (
                  <p className="no-data">У клиента нет рефералов</p>
                ) : (
                  <div className="referrals-list">
                    {referrals.map((referral) => (
                      <div key={`referral-${referral.id}`} className="referral-card">
                        <div className="referral-info">
                          <h5>
                            {referral.surname} {referral.firstname}{" "}
                            {referral.patronymic}
                          </h5>
                          <p>{referral.email}</p>
                          <p>
                            Зарегистрирован:{" "}
                            {new Date(referral.dateReg).toLocaleDateString(
                              "ru-RU"
                            )}
                          </p>
                        </div>
                        <div className="referral-status">
                          <span className={`status-badge ${referral.status}`}>
                            {referral.status === "active"
                              ? "Активен"
                              : "Неактивен"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "documents" && (
              <div className="documents-info">
                <div className="section-header">
                  <h4>Документы клиента</h4>
                  <button
                    className="btn-add"
                    onClick={() => setShowUploadDocument(true)}
                  >
                    + Добавить документ
                  </button>
                </div>

                {documents.length === 0 ? (
                  <p className="no-data">У клиента нет документов</p>
                ) : (
                  <div className="client-docs-scroll">
                    {clientDocumentsList.length > 0 && (
                      <div className="client-docs-section">
                        <h5>Документы клиента (личный кабинет)</h5>
                        <div className="documents-list documents-gallery">
                          {clientDocumentsList.map((doc) => renderDocumentCard(doc))}
                        </div>
                      </div>
                    )}

                    {managerDocumentsList.length > 0 && (
                      <div className="client-docs-section">
                        <h5>Документы менеджера</h5>
                        <div className="documents-list documents-gallery">
                          {managerDocumentsList.map((doc) => renderDocumentCard(doc))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "tasks" && (
              <div className="tasks-info">
                <div className="section-header">
                  <h4>Задачи клиента</h4>
                  <button 
                    className="btn-add"
                    onClick={() => setShowCreateTask(true)}
                  >
                    + Создать задачу
                  </button>
                </div>

                {tasks.length === 0 ? (
                  <div className="no-data">
                    <p>У клиента пока нет задач</p>
                  </div>
                ) : (
                  <div className="tasks-list">
                    {tasks.map(task => (
                      <div key={`task-${task.id}`} className="task-card">
                        <div className="task-header">
                          <h5>{task.title}</h5>
                          <div className="task-actions">
                            <select 
                              value={task.status}
                              onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                              className="status-select"
                            >
                              <option value="pending">⏳ В ожидании</option>
                              <option value="in_progress">🔄 В работе</option>
                              <option value="completed">✅ Завершена</option>
                              <option value="cancelled">❌ Отменена</option>
                            </select>
                            <button 
                              className="btn-upload-doc"
                              onClick={() => {
                                setSelectedTaskId(task.id);
                                setShowUploadTaskDocument(true);
                              }}
                              title="Добавить документ"
                            >
                              📎
                            </button>
                            <button 
                              className="btn-delete"
                              onClick={() => handleDeleteTask(task.id)}
                              title="Удалить задачу"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        
                        {task.description && (
                          <p className="task-description">{task.description}</p>
                        )}
                        
                        <div className="task-meta">
                          <span className={`priority priority-${task.priority}`}>
                            {task.priority === 'low' && '🟢 Низкий'}
                            {task.priority === 'medium' && '🟡 Средний'}
                            {task.priority === 'high' && '🟠 Высокий'}
                            {task.priority === 'urgent' && '🔴 Срочный'}
                          </span>
                          
                          {task.dueDate && (
                            <span className="due-date">
                              📅 До: {new Date(task.dueDate).toLocaleDateString('ru-RU')}
                            </span>
                          )}
                          
                          {task.reminderDate && (
                            <span className="reminder-date">
                              ⏰ Напоминание: {new Date(task.reminderDate).toLocaleString('ru-RU')}
                            </span>
                          )}
                          
                          <span className="created-date">
                            📝 Создана: {new Date(task.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>

                        {task.documents && task.documents.length > 0 && (
                          <div className="task-documents">
                            <h6>Документы:</h6>
                            <div className="task-documents-grid">
                              {task.documents.map(doc => {
                                const fileName = doc.originalFileName || doc.title || 'document';
                                const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
                                const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExt);
                                const isPdf = fileExt === 'pdf';
                                
                                // Превью показываем для изображений, видео и PDF
                                const showPreview = isImage || isVideo || isPdf;
                                const previewKey = `task-${task.id}-doc-${doc.id}`;
                                const previewUrl = showPreview ? (taskDocumentPreviews[previewKey] || null) : null;
                                
                                const handlePreviewClick = () => {
                                  // Открываем полноэкранный вьювер при клике на превью
                                  const docObj = {
                                    documentId: doc.id,
                                    originalName: fileName,
                                    mimeType: isImage ? `image/${fileExt}` : 
                                              isVideo ? `video/${fileExt}` :
                                              isPdf ? 'application/pdf' : 
                                              'application/octet-stream'
                                  };
                                  console.log('🔍 Открываем вьювер документа задачи:', docObj);
                                  handleOpenTaskDocumentViewer(docObj);
                                };
                                
                                const handleDownloadClick = (e) => {
                                  // Останавливаем всплытие события, чтобы не открывался вьювер
                                  e.stopPropagation();
                                  console.log('📥 Скачиваем документ задачи:', doc.id);
                                  handleDownloadTaskDocument(doc.id);
                                };
                                
                                return (
                                  <div 
                                    key={`task-${task.id}-doc-${doc.id}`} 
                                    className="task-document-card"
                                  >
                                    <div 
                                      className="task-document-preview"
                                      onClick={handlePreviewClick}
                                      style={{ cursor: 'pointer' }}
                                    >
                                      {showPreview && previewUrl ? (
                                        isImage || isPdf ? (
                                          <img 
                                            src={previewUrl} 
                                            alt={fileName}
                                            onError={(e) => {
                                              console.error('❌ Ошибка загрузки изображения/PDF:', e);
                                              e.target.style.display = 'none';
                                              const fallback = e.target.parentElement.querySelector('.document-icon-fallback');
                                              if (fallback) fallback.style.display = 'flex';
                                            }}
                                          />
                                        ) : isVideo ? (
                                          <video 
                                            src={previewUrl}
                                            preload="metadata"
                                            onError={(e) => {
                                              console.error('❌ Ошибка загрузки видео:', e);
                                              e.target.style.display = 'none';
                                              const fallback = e.target.parentElement.querySelector('.document-icon-fallback');
                                              if (fallback) fallback.style.display = 'flex';
                                            }}
                                          />
                                        ) : null
                                      ) : null}
                                      <div className="document-icon-fallback" style={{ display: showPreview && previewUrl ? 'none' : 'flex' }}>
                                        <span className="file-icon">
                                          {fileExt === 'pdf' ? '📄' : 
                                           fileExt === 'doc' || fileExt === 'docx' ? '📝' :
                                           fileExt === 'xls' || fileExt === 'xlsx' ? '📊' :
                                           isVideo ? '🎥' :
                                           '📎'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="task-document-info">
                                      <span className="task-document-name" title={fileName}>
                                        {fileName}
                                      </span>
                                      <div className="task-document-actions">
                                        <button 
                                          className="btn-download"
                                          onClick={handleDownloadClick}
                                        >
                                          📥 Скачать
                                        </button>
                                        <button 
                                          className="btn-delete"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteTaskDocument(doc.id, task.id);
                                          }}
                                        >
                                          🗑️ Удалить
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Вкладка СДЕЛКИ */}
            {activeTab === "deals" && (
              <div className="deals-info">
                <div className="section-header">
                  <h4>Сделки с клиентом</h4>
                  <button 
                    className="btn-add"
                    onClick={() => setShowCreateDeal(true)}
                  >
                    + Создать сделку
                  </button>
                </div>

                {dealsLoading ? (
                  <div className="loading">Загрузка сделок...</div>
                ) : deals.length === 0 ? (
                  <div className="no-data">
                    <p>У клиента пока нет сделок</p>
                  </div>
                ) : (
                  <div className="deals-list">
                    {deals.map(deal => (
                      <div key={`deal-${deal.id}`} className="deal-card">
                        <div className="deal-header">
                          <h5>Сделка #{deal.id}</h5>
                          <span className={`status-badge ${getStatusBadgeClass(deal.status)}`}>
                            {getDealStatusText(deal.status)}
                          </span>
                        </div>
                        
                        <div className="deal-amounts">
                          <div className="amount-item">
                            <span className="amount-label">Сумма:</span>
                            <span className="amount-value">
                              {parseFloat(deal.amountCurrency).toLocaleString('ru-RU')} {deal.currency}
                            </span>
                          </div>
                          <div className="amount-item">
                            <span className="amount-label">В рублях:</span>
                            <span className="amount-value">
                              {parseFloat(deal.amountRub).toLocaleString('ru-RU')} ₽
                            </span>
                          </div>
                          <div className="amount-item">
                            <span className="amount-label">Курс:</span>
                            <span className="amount-value">
                              {parseFloat(deal.exchangeRate).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {deal.description && (
                          <p className="deal-description">{deal.description}</p>
                        )}
                        
                        <div className="deal-meta">
                          <span className="deal-date">
                            📅 Дата сделки: {new Date(deal.dealDate).toLocaleDateString('ru-RU')}
                          </span>
                          <span className="created-date">
                            📝 Создана: {new Date(deal.createdAt).toLocaleDateString('ru-RU')}
                          </span>
                        </div>

                        {deal.status === 'approved' && deal.approvedAt && (
                          <div className="deal-approval">
                            ✅ Утверждена: {new Date(deal.approvedAt).toLocaleString('ru-RU')}
                          </div>
                        )}

                        {deal.status === 'rejected' && (
                          <div className="deal-rejection">
                            <div>❌ Отклонена: {new Date(deal.rejectedAt).toLocaleString('ru-RU')}</div>
                            {deal.rejectionReason && (
                              <div className="rejection-reason">
                                Причина: {deal.rejectionReason}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="deal-documents">
                          <h6>Документы:</h6>
                          {deal.documents && deal.documents.length > 0 ? (
                            <div className="deal-documents-grid">
                              {deal.documents.map((doc, idx) => {
                                const fileName = doc.split('/').pop();
                                const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
                                const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt);
                                const isVideo = ['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(fileExt);
                                const isPdf = fileExt === 'pdf';
                                
                                // Превью показываем только для изображений и видео
                                const showPreview = isImage || isVideo;
                                const previewKey = `deal-${deal.id}-doc-${idx}`;
                                const previewUrl = showPreview ? (dealDocumentPreviews[previewKey] || null) : null;
                                
                                const handleCardClick = () => {
                                  // Открываем полноэкранный вьювер
                                  const docObj = {
                                    filePath: doc,
                                    originalName: fileName,
                                    mimeType: isImage ? `image/${fileExt}` : 
                                              isVideo ? `video/${fileExt}` :
                                              isPdf ? 'application/pdf' : 
                                              'application/octet-stream',
                                    dealId: deal.id,
                                    documentIndex: idx
                                  };
                                  console.log('🔍 Открываем вьювер документа:', docObj);
                                  handleOpenDealDocumentViewer(docObj);
                                };
                                
                                return (
                                  <div 
                                    key={`deal-${deal.id}-doc-${idx}`} 
                                    className="deal-document-card"
                                    onClick={handleCardClick}
                                  >
                                    <div className="deal-document-preview">
                                      {showPreview && previewUrl ? (
                                        isImage ? (
                                          <img 
                                            src={previewUrl} 
                                            alt={fileName}
                                            onError={(e) => {
                                              console.error('❌ Ошибка загрузки изображения:', e);
                                              e.target.style.display = 'none';
                                              const fallback = e.target.parentElement.querySelector('.document-icon-fallback');
                                              if (fallback) fallback.style.display = 'flex';
                                            }}
                                          />
                                        ) : isVideo ? (
                                          <video 
                                            src={previewUrl}
                                            preload="metadata"
                                            onError={(e) => {
                                              console.error('❌ Ошибка загрузки видео:', e);
                                              e.target.style.display = 'none';
                                              const fallback = e.target.parentElement.querySelector('.document-icon-fallback');
                                              if (fallback) fallback.style.display = 'flex';
                                            }}
                                          />
                                        ) : null
                                      ) : null}
                                      <div className="document-icon-fallback" style={{ display: showPreview && previewUrl ? 'none' : 'flex' }}>
                                        <span className="file-icon">
                                          {fileExt === 'pdf' ? '📄' : 
                                           fileExt === 'doc' || fileExt === 'docx' ? '📝' :
                                           fileExt === 'xls' || fileExt === 'xlsx' ? '📊' :
                                           isVideo ? '🎥' :
                                           '📎'}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="deal-document-info">
                                      <span className="deal-document-name" title={fileName}>
                                        {fileName}
                                      </span>
                                      <div className="deal-document-actions">
                                        <button 
                                          className="btn-download"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDownloadDocumentModal(doc, deal.id, idx);
                                          }}
                                        >
                                          📥 Скачать
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="no-documents">Документы не загружены</p>
                          )}
                          
                          {/* Кнопка для загрузки дополнительных документов */}
                          <div className="upload-document-section">
                            <input
                              type="file"
                              id={`document-upload-modal-${deal.id}`}
                              className="document-upload-input"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                              onChange={(e) => handleDocumentUploadModal(e, deal.id)}
                            />
                            <label htmlFor={`document-upload-modal-${deal.id}`} className="btn-upload-document">
                              📎 Загрузить документ
                            </label>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Вкладка ОБЩЕНИЕ */}
            {activeTab === "communication" && (
              <div className="communication-info">
                <div className="section-header">
                  <h4>Общение с клиентом</h4>
                  <button 
                    className="btn-add"
                    onClick={() => setShowCreateConversationModal(true)}
                  >
                    💬 БЕСЕДА
                  </button>
                </div>

                {conversations.length === 0 ? (
                  <div className="no-data">
                    <p>Нет бесед с клиентом</p>
                  </div>
                ) : (
                  <div className="communication-layout">
                    {/* Список бесед */}
                    <div className="conversations-list">
                      <h5>Беседы</h5>
                      {sortConversationsByPriority(conversations).map(conversation => (
                        <div 
                          key={`conversation-${conversation.id}`}
                          className={`conversation-item ${selectedConversation?.id === conversation.id ? 'active' : ''}`}
                          onClick={() => handleSelectConversation(conversation)}
                        >
                          <div className="conversation-header">
                            <div className="conversation-title">
                              <span className="priority-indicator">{getPriorityIcon(conversation.priority)}</span>
                              <span className="conversation-subject">{conversation.subject}</span>
                            </div>
                            <span className="conversation-status">{getStatusText(conversation.status)}</span>
                          </div>
                          <div className="conversation-meta">
                            <span className="conversation-date">
                              {new Date(conversation.createdAt).toLocaleDateString('ru-RU')}
                            </span>
                            {conversation.unread_count_admin > 0 && (
                              <span className="unread-badge">{conversation.unread_count_admin}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Область сообщений */}
                    <div className="messages-area">
                      {selectedConversation ? (
                        <>
                          <div className="messages-header">
                            <h5>{selectedConversation.subject}</h5>
                            <div className="conversation-controls">
                              <select 
                                value={selectedConversation.status}
                                onChange={(e) => handleChangeConversationStatus(e.target.value)}
                                className="status-select"
                              >
                                <option value="open">Открыто</option>
                                <option value="in_progress">В работе</option>
                                <option value="resolved">Решено</option>
                                <option value="closed">Закрыто</option>
                              </select>
                            </div>
                          </div>
                          
                          <div className="messages-list" onScroll={handleScroll}>
                            
                            {/* Бейдж для непрочитанных сообщений */}
                            {unreadMessagesCount > 0 && (
                              <div className="unread-messages-badge">
                                {unreadMessagesCount} нов{unreadMessagesCount === 1 ? 'ое' : unreadMessagesCount < 5 ? 'ых' : 'ых'} сообщени{unreadMessagesCount === 1 ? 'е' : unreadMessagesCount < 5 ? 'я' : 'й'}
                              </div>
                            )}
                            {/* Отладочная информация */}
                            {console.log(`🎯 Рендер бейджа в сообщениях: unreadMessagesCount = ${unreadMessagesCount}`)}
                            {messages.map((message, index) => (
          <div
            key={`message-${message.id}-${index}`}
            className={`message ${message.sender_type === 'admin' ? 'admin-message' : 'user-message'}`}
          >
            <div className="message-header">
              <span className="message-sender">
                {message.sender_type === 'admin' ? '👤 ' : '💼 '}
                {message.sender_type === 'admin' 
                  ? (message.sender_name || 'Администратор')
                  : (clientData?.User?.surname && clientData?.User?.firstname 
                      ? `${clientData.User.surname} ${clientData.User.firstname}`
                      : 'Клиент')
                }
                {/* Показываем источник сообщения */}
                {message.source && message.source !== 'admin_panel' && (
                  <span className="message-source">
                    {' '}({message.source === 'telegram' ? '📱 Telegram' : message.source === 'email' ? '📧 Email' : message.source})
                  </span>
                )}
              </span>
              <span className="message-time">
                {new Date(message.createdAt).toLocaleString('ru-RU')}
              </span>
            </div>
            <div className="message-text">{message.message_text}</div>
          </div>
                            ))}
                          </div>

                          <div className="message-input">
                            <textarea
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Введите сообщение..."
                              rows="3"
                            />
                            <button 
                              onClick={handleSendMessage}
                              disabled={sendingMessage || !newMessage.trim()}
                              className="send-button"
                            >
                              {sendingMessage ? 'Отправка...' : 'Отправить'}
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="no-conversation-selected">
                          <p>Выберите беседу для просмотра сообщений</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Вьювер документов сделок */}
      {dealDocumentViewer && (
        <div className="client-doc-viewer-overlay" onClick={handleCloseDealDocumentViewer}>
          <div className="client-doc-viewer-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="client-doc-viewer-header">
              <div>
                <div className="client-doc-viewer-title">{dealDocumentViewer.title}</div>
                <div className="client-doc-viewer-subtitle">
                  {dealDocumentViewer.extension.toUpperCase()} · Документ сделки
                </div>
              </div>
              <div className="client-doc-viewer-actions">
                <button
                  className="client-doc-viewer-btn"
                  onClick={() => handleDownloadDocumentModal(
                    dealDocumentViewer.url, 
                    dealDocumentViewer.dealId, 
                    dealDocumentViewer.documentIndex
                  )}
                >
                  Скачать
                </button>
                <button
                  className="client-doc-viewer-btn client-doc-viewer-btn--ghost"
                  onClick={handleCloseDealDocumentViewer}
                >
                  Закрыть
                </button>
              </div>
            </div>
            <div className="client-doc-viewer-body">
              {dealDocumentViewer.isImage && (
                <img src={dealDocumentViewer.url} alt={dealDocumentViewer.title} />
              )}
              {dealDocumentViewer.isVideo && (
                <video src={dealDocumentViewer.url} controls autoPlay>
                  Ваш браузер не поддерживает воспроизведение видео.
                </video>
              )}
              {!dealDocumentViewer.isImage && !dealDocumentViewer.isVideo && dealDocumentViewer.isPdf && (
                <iframe src={dealDocumentViewer.url} title={dealDocumentViewer.title} />
              )}
              {!dealDocumentViewer.isImage && !dealDocumentViewer.isVideo && !dealDocumentViewer.isPdf && (
                <div className="client-doc-viewer-fallback">
                  <div className="client-doc-viewer-ext">{dealDocumentViewer.extension.toUpperCase()}</div>
                  <p>Предпросмотр недоступен для этого формата. Скачайте файл для просмотра.</p>
                  <button
                    className="client-doc-viewer-btn"
                    onClick={() => handleDownloadDocumentModal(
                      dealDocumentViewer.url, 
                      dealDocumentViewer.dealId, 
                      dealDocumentViewer.documentIndex
                    )}
                  >
                    Скачать файл
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {documentViewer && (
        <div className="client-doc-viewer-overlay" onClick={closeDocumentViewer}>
          <div className="client-doc-viewer-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="client-doc-viewer-header">
              <div>
                <div className="client-doc-viewer-title">{documentViewer.title}</div>
                <div className="client-doc-viewer-subtitle">
                  {documentViewer.extension} · {formatDocumentDate(documentViewer.doc?.createdAt)}
                </div>
              </div>
              <div className="client-doc-viewer-actions">
                <button
                  className="client-doc-viewer-btn"
                  onClick={() => downloadDocument(documentViewer.doc)}
                >
                  Скачать
                </button>
                <button
                  className="client-doc-viewer-btn client-doc-viewer-btn--ghost"
                  onClick={closeDocumentViewer}
                >
                  Закрыть
                </button>
              </div>
            </div>
            <div className="client-doc-viewer-body">
              {documentViewer.isImage && (
                <img src={documentViewer.url} alt={documentViewer.title} />
              )}
              {!documentViewer.isImage && documentViewer.isPdf && (
                <iframe src={documentViewer.url} title={documentViewer.title} />
              )}
              {!documentViewer.isImage && !documentViewer.isPdf && (
                <div className="client-doc-viewer-fallback">
                  <div className="client-doc-viewer-ext">{documentViewer.extension}</div>
                  <p>Предпросмотр недоступен для этого формата. Скачайте файл для просмотра.</p>
                  <button
                    className="client-doc-viewer-btn"
                    onClick={() => downloadDocument(documentViewer.doc)}
                  >
                    Скачать файл
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно создания задачи */}
      {showCreateTask && (
        <div className="modal-overlay">
          <div className="modal-content create-task-modal">
            <div className="modal-header">
              <h3>Создать задачу</h3>
              <button onClick={() => setShowCreateTask(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Название задачи:</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Описание:</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Приоритет:</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                >
                  <option value="low">🟢 Низкий</option>
                  <option value="medium">🟡 Средний</option>
                  <option value="high">🟠 Высокий</option>
                  <option value="urgent">🔴 Срочный</option>
                </select>
              </div>
              <div className="form-group">
                <label>Дата выполнения:</label>
                <input
                  type="date"
                  value={newTask.dueDate}
                  onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Напоминание:</label>
                <input
                  type="datetime-local"
                  value={newTask.reminderDate}
                  onChange={(e) => setNewTask({...newTask, reminderDate: e.target.value})}
                />
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-save">Создать задачу</button>
                <button type="button" onClick={() => setShowCreateTask(false)} className="btn-cancel">Отменить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно загрузки документа к задаче */}
      {showUploadTaskDocument && (
        <div className="modal-overlay">
          <div className="modal-content upload-document-modal">
            <div className="modal-header">
              <h3>Добавить документ к задаче</h3>
              <button onClick={() => setShowUploadTaskDocument(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={handleUploadTaskDocument}>
              <div className="form-group">
                <label>Название документа:</label>
                <input
                  type="text"
                  value={newTaskDocument.title}
                  onChange={(e) => setNewTaskDocument({...newTaskDocument, title: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Описание:</label>
                <textarea
                  value={newTaskDocument.description}
                  onChange={(e) => setNewTaskDocument({...newTaskDocument, description: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="form-group">
                <label>Файл:</label>
                <input
                  type="file"
                  onChange={(e) => setNewTaskDocument({...newTaskDocument, file: e.target.files[0]})}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.jpg,.jpeg,.png,.gif,.webp,.json,.xml"
                  required
                />
                <small style={{color: '#999', fontSize: '12px'}}>
                  Разрешены: PDF, Word, Excel, PowerPoint, изображения, архивы, текстовые файлы
                </small>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-save">Загрузить документ</button>
                <button type="button" onClick={() => setShowUploadTaskDocument(false)} className="btn-cancel">Отменить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модальное окно создания сделки */}
      {showCreateDeal && (
        <div className="modal-overlay">
          <div className="modal-content create-deal-modal">
            <div className="modal-header">
              <h3>Создать сделку</h3>
              <button onClick={() => setShowCreateDeal(false)} className="close-btn">×</button>
            </div>
            <form onSubmit={handleCreateDeal}>
              <div className="form-group">
                <label>Тип сделки:</label>
                <select
                  value={newDeal.dealTypeId}
                  onChange={(e) => setNewDeal({...newDeal, dealTypeId: e.target.value})}
                  required
                >
                  <option value="">Выберите тип сделки</option>
                  {dealTypes.map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Валюта:</label>
                <select
                  value={newDeal.currency}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  required
                >
                  <option value="USD">USD (Доллар США)</option>
                  <option value="USDT">USDT (Tether)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Курс валюты:</label>
                <input
                  type="number"
                  step="0.0001"
                  value={newDeal.exchangeRate}
                  onChange={(e) => handleExchangeRateChange(e.target.value)}
                  required
                  placeholder="75.0000"
                />
                <small style={{color: '#999', fontSize: '12px'}}>
                  Курс {newDeal.currency} (с комиссией): {currencyRates[newDeal.currency]?.dealRate || 'не загружен'}
                </small>
              </div>
              <div className="form-group">
                <label>Сумма сделки (в валюте):</label>
                <input
                  type="number"
                  step="0.01"
                  value={newDeal.amountCurrency}
                  onChange={(e) => handleAmountCurrencyChange(e.target.value)}
                  required
                  placeholder="1000.00"
                />
              </div>
              <div className="form-group">
                <label>Сумма сделки (в рублях):</label>
                <input
                  type="number"
                  step="0.01"
                  value={newDeal.amountRub}
                  onChange={(e) => handleAmountRubChange(e.target.value)}
                  required
                  placeholder="75000.00"
                />
              </div>
              <div className="form-group">
                <label>Дата проведения сделки:</label>
                <input
                  type="date"
                  value={newDeal.dealDate}
                  onChange={(e) => setNewDeal({...newDeal, dealDate: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Описание сделки:</label>
                <textarea
                  value={newDeal.description}
                  onChange={(e) => setNewDeal({...newDeal, description: e.target.value})}
                  rows="2"
                  placeholder="Опишите детали сделки..."
                  style={{resize: 'vertical', minHeight: '60px', maxHeight: '120px'}}
                />
              </div>
              <div className="form-group">
                <label>Закрывающие документы:</label>
                <input
                  type="file"
                  onChange={handleAddDealDocument}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                  multiple
                />
                <small style={{color: '#999', fontSize: '12px'}}>
                  Разрешены: PDF, Word, Excel, изображения
                </small>
                {dealDocuments.length > 0 && (
                  <div className="deal-documents-preview">
                    <h6>Прикрепленные файлы:</h6>
                    {dealDocuments.map((doc, index) => (
                      <div key={index} className="document-preview-item">
                        <span>{doc.name}</span>
                        <button 
                          type="button"
                          onClick={() => handleRemoveDealDocument(index)}
                          className="btn-remove-doc"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-save">Отправить на рассмотрение</button>
                <button type="button" onClick={() => setShowCreateDeal(false)} className="btn-cancel">Отменить</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Модалка создания счета */}
      {showCreateAccountModal && (
        <CreateAccountModal
          client={client}
          onClose={() => setShowCreateAccountModal(false)}
          onAccountCreated={loadClientDetails}
        />
      )}

      {/* Модальное окно создания беседы */}
      {showCreateConversationModal && (
        <div className="modal-overlay">
          <div className="modal-content conversation-modal">
            <div className="modal-header">
              <h3>Создать новую беседу</h3>
              <button 
                className="modal-close"
                onClick={handleCancelCreateConversation}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Тема беседы:</label>
                <input
                  type="text"
                  value={newConversation.subject}
                  onChange={(e) => setNewConversation({...newConversation, subject: e.target.value})}
                  placeholder="Введите тему беседы..."
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Способ передачи сообщений (канал):</label>
                <select
                  value={newConversation.channel}
                  onChange={(e) => setNewConversation({...newConversation, channel: e.target.value})}
                  className="form-input"
                >
                  <option value="email">📧 Email</option>
                  <option value="telegram">📱 Telegram</option>
                  <option value="itc">💬 ITC (внутренняя система)</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Текст сообщения:</label>
                <textarea
                  value={newConversation.message}
                  onChange={(e) => setNewConversation({...newConversation, message: e.target.value})}
                  rows="4"
                  placeholder="Введите текст сообщения..."
                  className="form-textarea"
                />
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-cancel"
                onClick={handleCancelCreateConversation}
              >
                Отменить
              </button>
              <button 
                className="btn-primary"
                onClick={handleCreateConversation}
              >
                Отправить
              </button>
            </div>
            </div>
          </div>
        )}

      {/* Вьювер для документов задач */}
      {taskDocumentViewer && (
        <div className="client-doc-viewer-overlay" onClick={handleCloseTaskDocumentViewer}>
          <div className="client-doc-viewer-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="client-doc-viewer-header">
              <div>
                <div className="client-doc-viewer-title">{taskDocumentViewer.title}</div>
                <div className="client-doc-viewer-subtitle">
                  {taskDocumentViewer.extension.toUpperCase()} · Документ задачи
                </div>
              </div>
              <div className="client-doc-viewer-actions">
                <button
                  className="client-doc-viewer-btn"
                  onClick={() => handleDownloadTaskDocument(taskDocumentViewer.documentId)}
                >
                  Скачать
                </button>
                <button
                  className="client-doc-viewer-btn client-doc-viewer-btn--ghost"
                  onClick={handleCloseTaskDocumentViewer}
                >
                  Закрыть
                </button>
              </div>
            </div>
            <div className="client-doc-viewer-body">
              {taskDocumentViewer.isImage && (
                <img src={taskDocumentViewer.url} alt={taskDocumentViewer.title} />
              )}
              {taskDocumentViewer.isVideo && (
                <video src={taskDocumentViewer.url} controls autoPlay>
                  Ваш браузер не поддерживает воспроизведение видео.
                </video>
              )}
              {!taskDocumentViewer.isImage && !taskDocumentViewer.isVideo && taskDocumentViewer.isPdf && (
                <iframe src={taskDocumentViewer.url} title={taskDocumentViewer.title} />
              )}
              {!taskDocumentViewer.isImage && !taskDocumentViewer.isVideo && !taskDocumentViewer.isPdf && (
                <div className="client-doc-viewer-fallback">
                  <div className="client-doc-viewer-ext">{taskDocumentViewer.extension.toUpperCase()}</div>
                  <p>Предпросмотр недоступен для этого формата. Скачайте файл для просмотра.</p>
                  <button
                    className="client-doc-viewer-btn"
                    onClick={() => handleDownloadTaskDocument(taskDocumentViewer.documentId)}
                  >
                    Скачать файл
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetailsModal;
