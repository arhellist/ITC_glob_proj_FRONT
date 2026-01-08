import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import securityService from '../../../../JS/services/security-service';
import { API_CONFIG } from '../../../../config/api.js';
import PaymentMethodsManagement from './payment-methods-management/PaymentMethodsManagement';
import DealTypesManagement from './deal-types-management/DealTypesManagement';
import PublicationsManagement from './publications-management/PublicationsManagement';
import './security-settings.css';

const CATEGORY_LABELS = {
  notifications: 'Уведомления',
  crm: 'CRM',
  logs: 'Логи',
  users: 'Клиенты',
  documents: 'Документы',
  tasks: 'Задачи',
  finance: 'Финансы',
  system: 'Система',
  security: 'Безопасность',
  email: 'Email',
  deals: 'Сделки',
  general: 'Общее'
};

const DEFAULT_OPTIONS_FORM = {
  comission_Currency_Widthdrawl: '3',
  comission_Currency_Deposit: '3',
  comission_Widthdrawl: '1',
  min_commission_withdrawal_lockup_expired: '50',
  min_commission_withdrawal_lockup_active: '100',
  comission_company_withdrawal_lockup_expired: '1',
  comission_company_withdrawal_lockup_active: '2'
};

// Функция для загрузки данных подписки из product_subscriptions
const loadSubscriptionTemplate = async (productId) => {
  try {
    console.log('🔍 loadSubscriptionTemplate: Загружаем шаблон подписки для продукта', productId);
    const response = await securityService.getSubscriptionTemplate(productId);
    console.log('🔍 loadSubscriptionTemplate: Получен ответ от API:', response);
    if (response) {
      console.log('✅ loadSubscriptionTemplate: Шаблон подписки загружен:', {
        id: response.id,
        product_id: response.product_id,
        hasTitleImage: !!response.subscription_title_image,
        hasDescription: !!response.subscription_description,
        promoMaterialsCount: Array.isArray(response.subscription_promo_materials) ? response.subscription_promo_materials.length : 0,
        initialTopUpEnabled: response.initial_top_up_enabled,
        initialTopUpAmount: response.initial_top_up_amount
      });
    } else {
      console.log('⚠️ loadSubscriptionTemplate: Шаблон подписки не найден для продукта', productId);
    }
    return response || null;
  } catch (error) {
    console.error('❌ loadSubscriptionTemplate: Ошибка загрузки шаблона подписки:', error);
    return null;
  }
};

const buildDefaultProductSettings = async (product, subscriptionTemplate, optionsData = DEFAULT_OPTIONS_FORM) => {
  // Данные подписки теперь берутся из product_subscriptions (subscriptionTemplate)
  
  let subscriptionTitleImage = null;
  let subscriptionDescription = '';
  let subscriptionPromoMaterials = [];
  let subscriptionPlan = 'monthly';
  let subscriptionPrice = '';
  let subscriptionCurrency = 'USD';
  let subscriptionEnabled = false;

  if (subscriptionTemplate) {
    // Обрабатываем subscription_title_image из шаблона подписки
    if (subscriptionTemplate.subscription_title_image) {
      const imgValue = subscriptionTemplate.subscription_title_image;
      if (typeof imgValue === 'string' && imgValue !== '[object Object]' && imgValue.trim() !== '') {
        subscriptionTitleImage = imgValue;
      }
    }

    // Обрабатываем subscription_description из шаблона подписки
    if (subscriptionTemplate.subscription_description) {
      subscriptionDescription = String(subscriptionTemplate.subscription_description);
    }

    // Обрабатываем subscription_promo_materials из шаблона подписки
    if (Array.isArray(subscriptionTemplate.subscription_promo_materials)) {
      subscriptionPromoMaterials = subscriptionTemplate.subscription_promo_materials
        .filter(item => item && typeof item === 'string' && item.trim() !== '' && item !== '[object Object]');
    }

    subscriptionPlan = subscriptionTemplate.subscription_plan || 'monthly';
    subscriptionPrice = subscriptionTemplate.subscription_price ? String(subscriptionTemplate.subscription_price) : '';
    // Валюта берется из продукта, а не из шаблона подписки
    subscriptionCurrency = subscriptionTemplate.Product?.currency || product?.currency || 'USD';
    subscriptionEnabled = true; // Если есть шаблон, значит подписка включена
  }

  // Обрабатываем initialTopUp и recurringTopUp из шаблона подписки
  let initialTopUp = {
    enabled: false,
    amount: ''
  };
  let recurringTopUp = {
    enabled: false,
    amount: ''
  };

  if (subscriptionTemplate) {
    if (subscriptionTemplate.initial_top_up_enabled !== undefined) {
      initialTopUp.enabled = Boolean(subscriptionTemplate.initial_top_up_enabled);
    }
    if (subscriptionTemplate.initial_top_up_amount !== undefined && subscriptionTemplate.initial_top_up_amount !== null) {
      initialTopUp.amount = String(subscriptionTemplate.initial_top_up_amount);
    }

    if (subscriptionTemplate.recurring_top_up_enabled !== undefined) {
      recurringTopUp.enabled = Boolean(subscriptionTemplate.recurring_top_up_enabled);
    }
    if (subscriptionTemplate.recurring_top_up_amount !== undefined && subscriptionTemplate.recurring_top_up_amount !== null) {
      recurringTopUp.amount = String(subscriptionTemplate.recurring_top_up_amount);
    }
  }

  console.log('✅ buildDefaultProductSettings: Обработанные данные:', {
    productId: product?.id,
    hasSubscriptionTemplate: !!subscriptionTemplate,
    subscription_title_image: subscriptionTitleImage,
    subscription_description_length: subscriptionDescription.length,
    subscription_promo_materials_count: subscriptionPromoMaterials.length,
    subscription_plan: subscriptionPlan,
    subscription_price: subscriptionPrice,
    subscription_currency: subscriptionCurrency,
    initial_top_up_enabled: initialTopUp.enabled,
    initial_top_up_amount: initialTopUp.amount,
    recurring_top_up_enabled: recurringTopUp.enabled,
    recurring_top_up_amount: recurringTopUp.amount
  });

  return {
    commissionDeposit: `${optionsData.comission_Currency_Deposit ?? DEFAULT_OPTIONS_FORM.comission_Currency_Deposit}`,
    commissionWithdraw: `${optionsData.comission_Currency_Widthdrawl ?? DEFAULT_OPTIONS_FORM.comission_Currency_Widthdrawl}`,
    // Данные подписки из product_subscriptions (subscriptionTemplate)
    subscriptionEnabled: subscriptionEnabled,
    subscriptionPlan: subscriptionPlan,
    subscriptionPrice: subscriptionPrice,
    subscriptionCurrency: subscriptionCurrency,
    subscriptionTitleImage: subscriptionTitleImage,
    subscriptionDescription: subscriptionDescription,
    subscriptionPromoMaterials: subscriptionPromoMaterials,
    ticker: product?.ticker || '',
    investmentRulesRequired:
      typeof product?.investment_rules_required === 'boolean'
        ? product.investment_rules_required
        : true,
    lockupPeriod: '12',
    initialTopUp: initialTopUp,
    recurringTopUp: recurringTopUp,
    minWithdrawalAmount: product?.min_withdrawal_amount ? String(product.min_withdrawal_amount) : '100'
  };
};

const SecuritySettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [menuConfig, setMenuConfig] = useState([]);
  const [selectedRoleKey, setSelectedRoleKey] = useState(null);
  const [rolePermissions, setRolePermissions] = useState({});
  const [roleMenuAccess, setRoleMenuAccess] = useState({});
  const [error, setError] = useState('');
  const [currentRole, setCurrentRole] = useState(null);
  // Состояние для вьювера файлов
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerSrc, setViewerSrc] = useState(null);
  const [viewerType, setViewerType] = useState(null); // 'image' или 'video'
  // Кэш для blob URL, чтобы не создавать их заново
  const blobUrlCacheRef = useRef(new Map());

  const [sectionsOpen, setSectionsOpen] = useState({
    roles: true,
    products: false,
    options: false,
    referral: false,
    paymentMethods: false,
    dealTypes: false,
    publications: false
  });

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [newProduct, setNewProduct] = useState({ type: '', currency: '', ticker: '', description: '' });

  const [optionsForm, setOptionsForm] = useState(DEFAULT_OPTIONS_FORM);
  const [optionsSaving, setOptionsSaving] = useState(false);
  const [productSettings, setProductSettings] = useState({});
  const [productModalState, setProductModalState] = useState({
    open: false,
    product: null,
    draft: null
  });
  const [productModalSaving, setProductModalSaving] = useState(false);
  const [uploadingInvestmentRules, setUploadingInvestmentRules] = useState(false);
  const investmentRulesInputRef = useRef(null);

  useEffect(() => {
    try {
      const adminDataRaw = sessionStorage.getItem('adminData');
      if (adminDataRaw) {
        const adminData = JSON.parse(adminDataRaw);
        setCurrentRole(adminData?.role || null);
      } else {
        setCurrentRole(null);
      }
    } catch (err) {
      console.error('SecuritySettings: Ошибка чтения adminData', err);
      setCurrentRole(null);
    }
  }, []);

  const normalizeMenuAccess = useCallback((menu, access = {}) => {
    const normalized = {};
    menu.forEach(item => {
      normalized[item.key] = access[item.key] === true;
    });
    return normalized;
  }, []);

  const mapOptionsToForm = useCallback((options) => {
    if (!options) {
      return { ...DEFAULT_OPTIONS_FORM };
    }
    return {
      comission_Currency_Widthdrawl: options.comission_Currency_Widthdrawl ?? DEFAULT_OPTIONS_FORM.comission_Currency_Widthdrawl,
      comission_Currency_Deposit: options.comission_Currency_Deposit ?? DEFAULT_OPTIONS_FORM.comission_Currency_Deposit,
      comission_Widthdrawl: options.comission_Widthdrawl ?? DEFAULT_OPTIONS_FORM.comission_Widthdrawl,
      min_commission_withdrawal_lockup_expired: options.min_commission_withdrawal_lockup_expired ?? DEFAULT_OPTIONS_FORM.min_commission_withdrawal_lockup_expired,
      min_commission_withdrawal_lockup_active: options.min_commission_withdrawal_lockup_active ?? DEFAULT_OPTIONS_FORM.min_commission_withdrawal_lockup_active,
      comission_company_withdrawal_lockup_expired: options.comission_company_withdrawal_lockup_expired ?? DEFAULT_OPTIONS_FORM.comission_company_withdrawal_lockup_expired,
      comission_company_withdrawal_lockup_active: options.comission_company_withdrawal_lockup_active ?? DEFAULT_OPTIONS_FORM.comission_company_withdrawal_lockup_active
    };
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      if (!currentRole) {
        setRoles([]);
        setPermissions([]);
        setMenuConfig([]);
        setSelectedRoleKey(null);
        setProducts([]);
        setOptionsForm({ ...DEFAULT_OPTIONS_FORM });
        setLoading(false);
        return;
      }

      console.log('🔍 SecuritySettings: Загружаем данные ролей, продуктов и опций...');
      const [rolesData, productsData, optionsData] = await Promise.all([
        securityService.getRolesPermissionsConfig(),
        securityService.getProducts(),
        securityService.getOptionsConfig()
      ]);

      console.log('🔍 SecuritySettings: Данные получены:', {
        rolesData: {
          hasRoles: !!rolesData?.roles,
          rolesCount: rolesData?.roles?.length || 0,
          roles: rolesData?.roles?.map(r => r.key) || [],
          hasPermissions: !!rolesData?.permissions,
          permissionsCount: rolesData?.permissions?.length || 0,
          hasMenu: !!rolesData?.menu,
          menuCount: rolesData?.menu?.length || 0
        },
        productsData: {
          isArray: Array.isArray(productsData),
          count: Array.isArray(productsData) ? productsData.length : 0
        },
        optionsData: !!optionsData
      });

      const fetchedRoles = rolesData.roles || [];
      console.log('🔍 SecuritySettings: Получено ролей из данных:', fetchedRoles.length);
      console.log('🔍 SecuritySettings: Ключи ролей:', fetchedRoles.map(r => r.key));
      
      const filteredRoles = fetchedRoles
        .filter(role => role.key !== 'ROOT')
        .filter(role => currentRole === 'ROOT' || role.key !== 'ADMIN');

      console.log('🔍 SecuritySettings: После фильтрации ролей:', filteredRoles.length);
      console.log('🔍 SecuritySettings: Отфильтрованные ключи ролей:', filteredRoles.map(r => r.key));
      console.log('🔍 SecuritySettings: Текущая роль пользователя:', currentRole);

      const fetchedPermissions = rolesData.permissions || [];
      const fetchedMenu = rolesData.menu || [];

      console.log('🔍 SecuritySettings: Разрешений:', fetchedPermissions.length, 'Элементов меню:', fetchedMenu.length);

      const permMap = {};
      const menuMap = {};
      filteredRoles.forEach(role => {
        permMap[role.key] = new Set(role.permissions || []);
        menuMap[role.key] = normalizeMenuAccess(fetchedMenu, role.menuAccess || {});
        console.log(`🔍 SecuritySettings: Роль ${role.key} - разрешений: ${role.permissions?.length || 0}, menuAccess ключей: ${Object.keys(menuMap[role.key] || {}).length}`);
      });

      setRoles(filteredRoles);
      setPermissions(fetchedPermissions);
      setMenuConfig(fetchedMenu);
      setRolePermissions(permMap);
      setRoleMenuAccess(menuMap);
      
      console.log('🔍 SecuritySettings: Состояние установлено:', {
        rolesCount: filteredRoles.length,
        permissionsCount: fetchedPermissions.length,
        menuConfigCount: fetchedMenu.length,
        rolePermissionsKeys: Object.keys(permMap),
        roleMenuAccessKeys: Object.keys(menuMap)
      });

      const nextSelectedRoleKey = filteredRoles.some(role => role.key === selectedRoleKey)
        ? selectedRoleKey
        : (filteredRoles[0]?.key || null);
      setSelectedRoleKey(nextSelectedRoleKey);

      const normalizedProducts = Array.isArray(productsData) ? productsData : [];
      const nextOptionsForm = mapOptionsToForm(optionsData);
      setProducts(normalizedProducts);
      setOptionsForm(nextOptionsForm);
      
      // Загружаем шаблоны подписок для всех продуктов
      const productSettingsWithSubscriptions = { ...productSettings };
      await Promise.all(normalizedProducts.map(async (product) => {
        if (!productSettingsWithSubscriptions[product.id] && product && product.id) {
          try {
            const subscriptionTemplate = await loadSubscriptionTemplate(product.id);
            productSettingsWithSubscriptions[product.id] = await buildDefaultProductSettings(product, subscriptionTemplate, nextOptionsForm);
          } catch (error) {
            console.error(`SecuritySettings: Ошибка загрузки шаблона подписки для продукта ${product.id}:`, error);
            productSettingsWithSubscriptions[product.id] = await buildDefaultProductSettings(product, null, nextOptionsForm);
          }
        }
      }));
      
      setProductSettings(productSettingsWithSubscriptions);
    } catch (err) {
      console.error('SecuritySettings: Ошибка загрузки данных', err);
      setError('Не удалось загрузить данные. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [currentRole, normalizeMenuAccess, mapOptionsToForm, selectedRoleKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Логирование данных в модалке для отладки
  useEffect(() => {
    if (productModalState.open && productModalState.draft) {
      console.log('🔍 SecuritySettings: Данные в модалке (productModalState.draft):', {
        subscriptionEnabled: productModalState.draft.subscriptionEnabled,
        subscriptionTitleImage: productModalState.draft.subscriptionTitleImage,
        subscriptionDescription: productModalState.draft.subscriptionDescription?.substring(0, 50),
        subscriptionPromoMaterials: productModalState.draft.subscriptionPromoMaterials,
        subscriptionPromoMaterialsLength: productModalState.draft.subscriptionPromoMaterials?.length,
        subscriptionPrice: productModalState.draft.subscriptionPrice,
        subscriptionPlan: productModalState.draft.subscriptionPlan,
        subscriptionCurrency: productModalState.draft.subscriptionCurrency,
        initialTopUp: productModalState.draft.initialTopUp,
        recurringTopUp: productModalState.draft.recurringTopUp,
        productId: productModalState.product?.id
      });
    }
  }, [productModalState]);

  const groupedPermissions = useMemo(() => {
    const groups = {};
    permissions.forEach(permission => {
      const category = permission.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(permission);
    });
    Object.keys(groups).forEach(category => {
      groups[category].sort((a, b) => (a.name || a.code).localeCompare(b.name || b.code, 'ru'));
    });
    return groups;
  }, [permissions]);

  const notify = useCallback((type, text) => {
    document.dispatchEvent(new CustomEvent('main-notify', {
      detail: { type, text }
    }));
  }, []);

  const toggleSection = (sectionKey) => {
    setSectionsOpen(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  const handlePermissionToggle = (code) => {
    if (!selectedRoleKey) return;
    setRolePermissions(prev => {
      const current = new Set(prev[selectedRoleKey] || []);
      if (current.has(code)) {
        current.delete(code);
      } else {
        current.add(code);
      }
      return {
        ...prev,
        [selectedRoleKey]: current
      };
    });
  };

  const handleMenuToggle = (menuKey) => {
    if (!selectedRoleKey) return;
    setRoleMenuAccess(prev => {
      const current = { ...(prev[selectedRoleKey] || {}) };
      current[menuKey] = !current[menuKey];
      return {
        ...prev,
        [selectedRoleKey]: current
      };
    });
  };

  const handleRolesSave = async () => {
    if (!selectedRoleKey) return;
    try {
      setSaving(true);
      const permissionsArray = Array.from(rolePermissions[selectedRoleKey] || []);
      const menuAccess = roleMenuAccess[selectedRoleKey] || {};

      const response = await securityService.updateRolePermissions(selectedRoleKey, {
        permissions: permissionsArray,
        menuAccess
      });

      if (response?.success === false) {
        throw new Error(response.error || 'Ошибка сохранения');
      }

      if (response?.data?.role) {
        document.dispatchEvent(new CustomEvent('admin-menu-access-updated', {
          detail: {
            role: response.data.role.key,
            menuAccess: response.data.role.menuAccess || {}
          }
        }));
      }

      notify('success', 'Настройки роли сохранены');
      await loadData();
    } catch (err) {
      console.error('SecuritySettings: Ошибка сохранения роли', err);
      notify('error', err.message || 'Не удалось сохранить настройки роли');
    } finally {
      setSaving(false);
    }
  };

  const handleProductInputChange = (field, value) => {
    setNewProduct(prev => ({ ...prev, [field]: value }));
  };

  const handleProductCreate = async (event) => {
    event.preventDefault();
    const type = newProduct.type.trim();
    const currency = newProduct.currency.trim();
    const ticker = newProduct.ticker.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
    const description = newProduct.description.trim();

    if (!type || !currency) {
      notify('error', 'Заполните поля "Название/Тип" и "Тикер/Валюта"');
      return;
    }
    if (ticker.length !== 2) {
      notify('error', 'Тикер продукта должен содержать 2 символа (буквы или цифры)');
      return;
    }

    try {
      setProductsLoading(true);
      const created = await securityService.createProduct({ type, currency, description, ticker, investmentRulesRequired: true });
      if (!created || created.success === false) {
        throw new Error(created?.error || 'Не удалось создать продукт');
      }
      setProducts(prev => [...prev, created]);
      setNewProduct({ type: '', currency: '', ticker: '', description: '' });
      notify('success', 'Продукт добавлен');
    } catch (err) {
      console.error('SecuritySettings: Ошибка создания продукта', err);
      notify('error', err.message || 'Не удалось создать продукт');
    } finally {
      setProductsLoading(false);
    }
  };

  const handleProductDelete = async (productId) => {
    if (!productId) return;
    if (!window.confirm('Удалить продукт?')) return;

    try {
      setProductsLoading(true);
      const result = await securityService.deleteProduct(productId);
      if (result?.success === false) {
        throw new Error(result.error || 'Не удалось удалить продукт');
      }
      setProducts(prev => prev.filter(product => product.id !== productId));
      notify('success', 'Продукт удалён');
    } catch (err) {
      console.error('SecuritySettings: Ошибка удаления продукта', err);
      notify('error', err.message || 'Не удалось удалить продукт');
    } finally {
      setProductsLoading(false);
    }
  };

  const handleOptionsChange = (field, value) => {
    setOptionsForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleOptionsSave = async (event) => {
    event.preventDefault();
    try {
      setOptionsSaving(true);
      const updated = await securityService.updateOptionsConfig(optionsForm);
      if (!updated || updated.success === false) {
        throw new Error(updated?.error || 'Не удалось сохранить настройки опций');
      }
      setOptionsForm(mapOptionsToForm(updated));
      notify('success', 'Настройки опций сохранены');
    } catch (err) {
      console.error('SecuritySettings: Ошибка сохранения опций', err);
      notify('error', err.message || 'Не удалось сохранить настройки опций');
    } finally {
      setOptionsSaving(false);
    }
  };

  const isAuthorized = currentRole === 'ROOT' || currentRole === 'ADMIN';
  const handleOpenProductModal = async (product) => {
    if (!product) return;
    console.log('📄 SecuritySettings: Открываем модалку продукта:', product);
    
    try {
      // Загружаем шаблон подписки для продукта
      const subscriptionTemplate = await loadSubscriptionTemplate(product.id);
      console.log('📄 SecuritySettings: Загружен шаблон подписки:', subscriptionTemplate);
      
      // Строим базовые настройки из данных продукта и шаблона подписки
      const baseSettings = await buildDefaultProductSettings(product, subscriptionTemplate, optionsForm);
      
      // Используем сохраненные настройки из состояния только для UI-only полей (commission, lockup)
      // Данные подписки (subscription*) всегда берутся из БД (baseSettings)
      const storedSettings = productSettings[product.id];
      
      // Создаем fallbackSettings: сначала все данные из БД (baseSettings), затем добавляем только UI-only поля из storedSettings
      // ВАЖНО: subscriptionEnabled, subscription*, initialTopUp, recurringTopUp всегда из БД (baseSettings)
      const fallbackSettings = {
        ...baseSettings, // Все данные из БД (приоритет)
        ...(storedSettings ? {
          // Добавляем только UI-only поля из storedSettings (которые не хранятся в БД)
          commissionDeposit: storedSettings.commissionDeposit,
          commissionWithdraw: storedSettings.commissionWithdraw,
          lockupPeriod: storedSettings.lockupPeriod
        } : {})
      };
      
      console.log('📄 SecuritySettings: Настройки для модалки:', {
        baseSettings: {
          subscriptionEnabled: baseSettings.subscriptionEnabled,
          subscriptionTitleImage: baseSettings.subscriptionTitleImage,
          subscriptionDescription: baseSettings.subscriptionDescription?.substring(0, 50),
          subscriptionPromoMaterialsCount: baseSettings.subscriptionPromoMaterials?.length,
          subscriptionPrice: baseSettings.subscriptionPrice,
          subscriptionPlan: baseSettings.subscriptionPlan,
          initialTopUp: baseSettings.initialTopUp,
          recurringTopUp: baseSettings.recurringTopUp
        },
        storedSettings: storedSettings ? {
          subscriptionEnabled: storedSettings.subscriptionEnabled,
          subscriptionTitleImage: storedSettings.subscriptionTitleImage,
          commissionDeposit: storedSettings.commissionDeposit
        } : null,
        fallbackSettings: {
          subscriptionEnabled: fallbackSettings.subscriptionEnabled,
          subscriptionTitleImage: fallbackSettings.subscriptionTitleImage,
          subscriptionDescription: fallbackSettings.subscriptionDescription?.substring(0, 50),
          subscriptionPromoMaterialsCount: fallbackSettings.subscriptionPromoMaterials?.length,
          subscriptionPrice: fallbackSettings.subscriptionPrice,
          subscriptionPlan: fallbackSettings.subscriptionPlan,
          initialTopUp: fallbackSettings.initialTopUp,
          recurringTopUp: fallbackSettings.recurringTopUp
        }
      });
      
      console.log('📄 SecuritySettings: Устанавливаем draft в модалку:', {
        subscriptionEnabled: fallbackSettings.subscriptionEnabled,
        subscriptionTitleImage: fallbackSettings.subscriptionTitleImage,
        subscriptionDescription: fallbackSettings.subscriptionDescription?.substring(0, 50),
        subscriptionPromoMaterials: fallbackSettings.subscriptionPromoMaterials,
        subscriptionPrice: fallbackSettings.subscriptionPrice,
        subscriptionPlan: fallbackSettings.subscriptionPlan,
        initialTopUp: fallbackSettings.initialTopUp,
        recurringTopUp: fallbackSettings.recurringTopUp
      });
      
      setProductModalState({
        open: true,
        product,
        draft: { ...fallbackSettings }
      });
    } catch (error) {
      console.error('SecuritySettings: Ошибка загрузки шаблона подписки:', error);
      // Открываем модалку с пустыми данными подписки
      const baseSettings = await buildDefaultProductSettings(product, null, optionsForm);
      setProductModalState({
        open: true,
        product,
        draft: { ...baseSettings }
      });
    }
  };

  const handleProductDraftChange = (field, value) => {
    setProductModalState(prev => ({
      ...prev,
      draft: {
        ...prev.draft,
        [field]: value
      }
    }));
  };

  const handleTickerDraftChange = (value) => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2);
    handleProductDraftChange('ticker', normalized);
  };

  const handleProductDraftNestedChange = (section, key, value) => {
    setProductModalState(prev => ({
      ...prev,
      draft: {
        ...prev.draft,
        [section]: {
          ...(prev.draft?.[section] || {}),
          [key]: value
        }
      }
    }));
  };

  const handleInvestmentRulesFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !productModalState.product) {
      return;
    }

    try {
      setUploadingInvestmentRules(true);
      const updatedProduct = await securityService.uploadProductInvestmentRules(productModalState.product.id, file);
      if (!updatedProduct || updatedProduct.success === false) {
        throw new Error(updatedProduct?.error || 'Не удалось загрузить инвестиционные правила');
      }

      setProducts(prev =>
        prev.map(item => (item.id === updatedProduct.id ? updatedProduct : item))
      );
      setProductModalState(prev => ({
        ...prev,
        product: updatedProduct,
        draft: {
          ...prev.draft,
          investment_rules_path: updatedProduct.investment_rules_path || prev.draft?.investment_rules_path
        }
      }));
      notify('success', 'Инвестиционные правила обновлены');
    } catch (error) {
      console.error('SecuritySettings: Ошибка загрузки инвестправил', error);
      notify('error', error.message || 'Не удалось загрузить инвестиционные правила');
    } finally {
      setUploadingInvestmentRules(false);
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  const resolveRulesLink = useCallback((pathValue) => {
    if (!pathValue) {
      return '';
    }
    if (/^https?:\/\//i.test(pathValue)) {
      return pathValue;
    }
    
    // Если путь начинается с /, используем его напрямую (работает через прокси)
    if (pathValue.startsWith('/')) {
      return pathValue;
    }
    
    // Если BASE_URL пустой (development с HTTPS через прокси), добавляем / перед путем
    const baseUrl = API_CONFIG.BASE_URL;
    return baseUrl ? `${baseUrl}/${pathValue}` : `/${pathValue}`;
  }, []);

  // Определить тип файла
  const getFileType = useCallback((file) => {
    if (!file) return 'image';
    
    if (file instanceof File) {
      return file.type.startsWith('video/') ? 'video' : 'image';
    }
    
    if (typeof file === 'string') {
      if (file.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) return 'image';
      if (file.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i)) return 'video';
    }
    
    // Если это объект с путем к файлу
    if (typeof file === 'object' && file !== null) {
      const path = file.path || file.url || file.src || file.subscription_title_image || file;
      if (typeof path === 'string') {
        if (path.match(/\.(jpg|jpeg|png|gif|webp|bmp)$/i)) return 'image';
        if (path.match(/\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv)$/i)) return 'video';
      }
    }
    
    return 'image';
  }, []);

  // Получить URL для файла (File объект или строка)
  const getFileUrl = useCallback((file) => {
    if (!file) {
      console.warn('⚠️ getFileUrl: file is null or undefined');
      return '';
    }

    // Если это объект File, создаем или используем кэшированный blob URL
    if (file instanceof File) {
      // Проверяем кэш
      const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
      if (blobUrlCacheRef.current.has(fileKey)) {
        const cachedUrl = blobUrlCacheRef.current.get(fileKey);
        console.log('✅ getFileUrl: Используем кэшированный blob URL:', cachedUrl);
        return cachedUrl;
      }
      // Создаем новый blob URL
      const blobUrl = URL.createObjectURL(file);
      blobUrlCacheRef.current.set(fileKey, blobUrl);
      console.log('✅ getFileUrl: Создан новый blob URL для File:', {
        file: file.name,
        type: file.type,
        size: file.size,
        blobUrl: blobUrl
      });
      return blobUrl;
    }

    // Если это строка (путь к файлу), добавляем BASE_URL если это относительный путь
    if (typeof file === 'string') {
      // Проверяем, не является ли это строковым представлением объекта
      if (file === '[object Object]' || file.trim() === '') {
        console.warn('⚠️ getFileUrl: Получена некорректная строка (возможно, объект преобразован в строку):', file);
        return '';
      }
      
      if (file.startsWith('http') || file.startsWith('blob:') || file.startsWith('data:')) {
        console.log('✅ getFileUrl: Используем абсолютный URL:', file);
        return file;
      }
      
      // Если путь начинается с /, используем его напрямую (работает через прокси)
      if (file.startsWith('/')) {
        return file;
      }
      
      // Если BASE_URL пустой (development с HTTPS через прокси), добавляем / перед путем
      const baseUrl = API_CONFIG.BASE_URL;
      const fullUrl = baseUrl ? `${baseUrl}${file.startsWith('/') ? '' : '/'}${file}` : `/${file}`;
      
      console.log('✅ getFileUrl: Сформирован полный URL:', {
        original: file,
        fullUrl: fullUrl,
        baseUrl: baseUrl || '(пустой - используем прокси)'
      });
      return fullUrl;
    }

    // Если это объект, пытаемся извлечь путь к файлу
    if (typeof file === 'object' && file !== null) {
      // Проверяем, не пустой ли это объект
      const keys = Object.keys(file);
      if (keys.length === 0) {
        console.warn('⚠️ getFileUrl: Получен пустой объект {}');
        return '';
      }
      
      // Пытаемся извлечь путь из различных возможных полей
      const path = file.path || file.url || file.src || file.subscription_title_image || 
                   (Array.isArray(file) && file.length > 0 ? file[0] : null);
      
      if (typeof path === 'string' && path !== '[object Object]' && path.trim() !== '') {
        console.log('✅ getFileUrl: Извлечен путь из объекта:', {
          originalObject: file,
          extractedPath: path
        });
        return getFileUrl(path); // Рекурсивно вызываем для строки
      }
      
      if (path instanceof File) {
        console.log('✅ getFileUrl: Извлечен File из объекта');
        return getFileUrl(path); // Рекурсивно вызываем для File
      }
      
      // Если ничего не помогло, логируем структуру объекта для отладки
      console.warn('⚠️ getFileUrl: Не удалось извлечь путь из объекта:', {
        object: file,
        keys: keys,
        path: path,
        pathType: typeof path
      });
      return '';
    }

    console.warn('⚠️ getFileUrl: Неизвестный тип файла:', {
      type: typeof file,
      value: file,
      constructor: file?.constructor?.name
    });
    return '';
  }, []);

  // Обработчик закрытия вьювера
  const handleCloseViewer = useCallback(() => {
    // НЕ освобождаем blob URL здесь, так как они могут использоваться в превью
    // Освобождение происходит при размонтировании компонента
    console.log('🔍 handleCloseViewer: Закрываем вьювер, viewerSrc:', viewerSrc);
    setViewerOpen(false);
    setViewerSrc(null);
    setViewerType(null);
  }, [viewerSrc]);

  // Обработчик открытия вьювера
  const handleOpenViewer = useCallback((src, type = 'image') => {
    if (!src) {
      console.error('❌ handleOpenViewer: src is null or undefined');
      return;
    }
    
    console.log('🔍 handleOpenViewer вызван:', { 
      src, 
      type, 
      isFile: src instanceof File,
      srcType: typeof src,
      srcValue: src instanceof File ? `${src.name} (${src.type}, ${src.size} bytes)` : src
    });
    
    // Используем getFileUrl для получения правильного URL (работает и с File, и со строками)
    const url = getFileUrl(src);
    console.log('🔍 handleOpenViewer: Получен URL:', url);
    
    if (!url) {
      console.error('❌ handleOpenViewer: Не удалось получить URL для файла');
      return;
    }
    
    // Определяем тип файла
    let detectedType = type;
    if (src instanceof File) {
      detectedType = src.type.startsWith('video/') ? 'video' : 'image';
    } else if (!type || type === 'image') {
      detectedType = getFileType(src);
    }
    
    console.log('🔍 handleOpenViewer: Тип файла:', detectedType);
    
    setViewerSrc(url);
    setViewerType(detectedType);
    setViewerOpen(true);
    
    console.log('✅ handleOpenViewer: Вьювер открыт, viewerSrc:', url, 'viewerType:', detectedType);
  }, [getFileUrl, getFileType]);

  const handleCloseProductModal = () => {
    setProductModalState({
      open: false,
      product: null,
      draft: null
    });
    // Закрываем вьювер при закрытии модалки продукта
    if (viewerOpen) {
      handleCloseViewer();
    }
  };

  // Очистка blob URL при размонтировании компонента
  useEffect(() => {
    return () => {
      // Освобождаем все blob URL из кэша при размонтировании
      blobUrlCacheRef.current.forEach((url) => {
        if (url && typeof url === 'string' && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
      blobUrlCacheRef.current.clear();
    };
  }, []);

  const handleProductModalSave = async () => {
    if (!productModalState.product || !productModalState.draft) {
      handleCloseProductModal();
      return;
    }

    try {
      setProductModalSaving(true);
      
      // Формируем payload для обновления продукта (без полей подписок)
      const productPayload = {
        ticker: productModalState.draft.ticker,
        investmentRulesRequired: productModalState.draft.investmentRulesRequired,
        minWithdrawalAmount: productModalState.draft.minWithdrawalAmount || null,
        // Поля комиссий (если нужны на уровне продукта, иначе можно убрать)
        commissionDeposit: productModalState.draft.commissionDeposit,
        commissionWithdraw: productModalState.draft.commissionWithdraw,
        // Период локапа
        lockupPeriod: productModalState.draft.lockupPeriod,
        // Первичное пополнение
        initialTopUp: {
          enabled: productModalState.draft.initialTopUp?.enabled || false,
          amount: productModalState.draft.initialTopUp?.amount || ''
        },
        // Постоянные пополнения
        recurringTopUp: {
          enabled: productModalState.draft.recurringTopUp?.enabled || false,
          amount: productModalState.draft.recurringTopUp?.amount || ''
        }
      };
      
      console.log('📄 SecuritySettings: Отправляем payload для обновления продукта:', productPayload);
      
      // Обновляем продукт (без полей подписок)
      const updatedProduct = await securityService.updateProduct(productModalState.product.id, productPayload);
      if (!updatedProduct || updatedProduct.success === false) {
        throw new Error(updatedProduct?.error || 'Не удалось сохранить настройки продукта');
      }

      console.log('📄 SecuritySettings: Продукт обновлен, получены данные:', updatedProduct);

      // Если включена подписка - сохраняем/обновляем шаблон подписки в product_subscriptions
      if (productModalState.draft.subscriptionEnabled) {
        let titleImagePath = null;
        let promoMaterialsPaths = [];

        // Сначала загружаем файлы, если они File объекты
        // Загружаем титульную картинку
        if (productModalState.draft.subscriptionTitleImage instanceof File) {
          console.log('📄 SecuritySettings: Загружаем титульную картинку...');
          const uploadResult = await securityService.uploadSubscriptionTitleImage(productModalState.product.id, productModalState.draft.subscriptionTitleImage);
          if (uploadResult && uploadResult.titleImage) {
            titleImagePath = uploadResult.titleImage;
            console.log('✅ SecuritySettings: Титульная картинка загружена:', titleImagePath);
          } else {
            throw new Error('Не удалось загрузить титульную картинку');
          }
        } else if (typeof productModalState.draft.subscriptionTitleImage === 'string') {
          // Если это уже путь к файлу, используем его
          titleImagePath = productModalState.draft.subscriptionTitleImage;
        }

        // Загружаем промо материалы (только новые File объекты)
        const existingPromoMaterials = Array.isArray(productModalState.draft.subscriptionPromoMaterials) 
          ? productModalState.draft.subscriptionPromoMaterials
              .filter(item => typeof item === 'string') // Уже загруженные (пути)
              .map(item => item.trim())
              .filter(item => item !== '')
          : [];

        const newPromoFiles = Array.isArray(productModalState.draft.subscriptionPromoMaterials)
          ? productModalState.draft.subscriptionPromoMaterials.filter(item => item instanceof File)
          : [];

        if (newPromoFiles.length > 0) {
          console.log('📄 SecuritySettings: Загружаем промо материалы...', newPromoFiles.length, 'файлов');
          const uploadResult = await securityService.uploadSubscriptionPromoMaterials(productModalState.product.id, newPromoFiles);
          if (uploadResult && uploadResult.uploadedPaths) {
            promoMaterialsPaths = [...existingPromoMaterials, ...uploadResult.uploadedPaths].slice(0, 5);
            console.log('✅ SecuritySettings: Промо материалы загружены:', uploadResult.uploadedPaths);
          } else {
            throw new Error('Не удалось загрузить промо материалы');
          }
        } else {
          // Используем только существующие пути
          promoMaterialsPaths = existingPromoMaterials;
        }

        // Формируем payload для обновления шаблона подписки
        const subscriptionPayload = {
          subscriptionPrice: productModalState.draft.subscriptionPrice ? Number(productModalState.draft.subscriptionPrice) : null,
          subscriptionCurrency: productModalState.draft.subscriptionCurrency || null,
          subscriptionPlan: productModalState.draft.subscriptionPlan || null,
          subscriptionTitleImage: titleImagePath,
          subscriptionDescription: productModalState.draft.subscriptionDescription || null,
          subscriptionPromoMaterials: promoMaterialsPaths,
          initialTopUp: productModalState.draft.initialTopUp || { enabled: false, amount: null },
          recurringTopUp: productModalState.draft.recurringTopUp || { enabled: false, amount: null }
        };

        console.log('📄 SecuritySettings: Отправляем payload для обновления шаблона подписки:', subscriptionPayload);

        const updatedTemplate = await securityService.createOrUpdateSubscriptionTemplate(productModalState.product.id, subscriptionPayload);
        if (!updatedTemplate) {
          throw new Error('Не удалось сохранить шаблон подписки');
        }

        console.log('📄 SecuritySettings: Шаблон подписки обновлен:', updatedTemplate);
      }

      // Обновляем список продуктов с новыми данными из БД
      setProducts(prev =>
        prev.map(item => (item.id === updatedProduct.id ? updatedProduct : item))
      );
      
      // Обновляем настройки продукта, загружая шаблон подписки заново
      const subscriptionTemplate = await loadSubscriptionTemplate(updatedProduct.id);
      const newSettings = await buildDefaultProductSettings(updatedProduct, subscriptionTemplate, optionsForm);
      // Сохраняем те настройки из draft, которые не хранятся в БД (commission, lockup, topUp)
      const draftOnlySettings = {
        commissionDeposit: productModalState.draft.commissionDeposit,
        commissionWithdraw: productModalState.draft.commissionWithdraw,
        lockupPeriod: productModalState.draft.lockupPeriod,
        initialTopUp: productModalState.draft.initialTopUp,
        recurringTopUp: productModalState.draft.recurringTopUp
      };
      setProductSettings(prev => ({
        ...prev,
        [updatedProduct.id]: { ...newSettings, ...draftOnlySettings }
      }));
      
      notify('success', 'Настройки продукта сохранены');
      handleCloseProductModal();
    } catch (error) {
      console.error('SecuritySettings: Ошибка сохранения продукта', error);
      notify('error', error.message || 'Не удалось сохранить настройки продукта');
    } finally {
      setProductModalSaving(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="security-settings-error">
        Недостаточно прав для просмотра настроек ролей.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="security-settings-loading">
        Загрузка настроек...
      </div>
    );
  }

  if (error) {
    return (
      <div className="security-settings-error">
        {error}
      </div>
    );
  }

  const selectedRole = roles.find(role => role.key === selectedRoleKey);
  const selectedPermissionsSet = selectedRoleKey ? rolePermissions[selectedRoleKey] || new Set() : new Set();
  const selectedMenuAccess = selectedRoleKey ? roleMenuAccess[selectedRoleKey] || {} : {};

  return (
    <div className="security-settings">
      <div className="security-settings-accordion">
        <div className="security-settings-accordion-item">
          <button
            className={`security-settings-accordion-button ${sectionsOpen.roles ? 'open' : ''}`}
            onClick={() => toggleSection('roles')}
          >
            Роли
          </button>
          {sectionsOpen.roles && (
            <div className="security-settings-accordion-panel">
              {roles.length > 0 ? (
                <div className="security-settings-layout">
                  <div className="security-settings-sidebar">
                    <h3>Роли</h3>
                    <div className="security-settings-role-list">
                      {roles.map(role => (
                        <button
                          key={role.key}
                          className={`security-settings-role-button ${role.key === selectedRoleKey ? 'active' : ''}`}
                          onClick={() => setSelectedRoleKey(role.key)}
                        >
                          <span className="role-name">{role.name || role.key}</span>
                          <span className="role-key">{role.key}</span>
                          {role.isSystem && <span className="role-tag">system</span>}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="security-settings-content">
                    {selectedRole ? (
                      <>
                        <div className="security-settings-header">
                          <div>
                            <h3>{selectedRole.name || selectedRole.key}</h3>
                            {selectedRole.description && (
                              <p className="security-settings-description">{selectedRole.description}</p>
                            )}
                          </div>
                          <button
                            className="security-settings-save-btn"
                            onClick={handleRolesSave}
                            disabled={saving}
                          >
                            {saving ? 'Сохранение...' : 'Сохранить'}
                          </button>
                        </div>

                        <div className="security-settings-section">
                          <h4>Доступ к меню</h4>
                          <div className="security-settings-menu-grid">
                            {menuConfig.map(menuItem => (
                              <label key={menuItem.key} className="security-settings-menu-item">
                                <input
                                  type="checkbox"
                                  checked={selectedMenuAccess[menuItem.key] !== false}
                                  onChange={() => handleMenuToggle(menuItem.key)}
                                />
                                <div className="menu-item-info">
                                  <span className="menu-item-title">{menuItem.label}</span>
                                  <span className="menu-item-description">{menuItem.description}</span>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="security-settings-section">
                          <h4>Разрешения</h4>
                          <div className="security-settings-permissions">
                            {Object.keys(groupedPermissions).map(category => (
                              <div key={category} className="security-settings-permission-group">
                                <h5>{CATEGORY_LABELS[category] || CATEGORY_LABELS.general}</h5>
                                <div className="security-settings-permission-list">
                                  {groupedPermissions[category].map(permission => (
                                    <label key={permission.code} className="security-settings-permission-item">
                                      <input
                                        type="checkbox"
                                        checked={selectedPermissionsSet.has(permission.code)}
                                        onChange={() => handlePermissionToggle(permission.code)}
                                      />
                                      <div className="permission-item-info">
                                        <span className="permission-item-title">{permission.name || permission.code}</span>
                                        {permission.description && (
                                          <span className="permission-item-description">{permission.description}</span>
                                        )}
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="security-settings-empty">
                        Выберите роль для настройки
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="security-settings-empty">
                  Нет доступных ролей для отображения
                </div>
              )}
            </div>
          )}
        </div>

        <div className="security-settings-accordion-item">
          <button
            className={`security-settings-accordion-button ${sectionsOpen.products ? 'open' : ''}`}
            onClick={() => toggleSection('products')}
          >
            Продукты
          </button>
          {sectionsOpen.products && (
            <div className="security-settings-accordion-panel">
              <form className="security-settings-form" onSubmit={handleProductCreate}>
                <div className="security-settings-form-grid">
                  <div className="security-settings-form-field">
                    <label>Название / Тип</label>
                    <input
                      type="text"
                      className="security-settings-input"
                      value={newProduct.type}
                      onChange={(e) => handleProductInputChange('type', e.target.value)}
                      placeholder="Classic"
                    />
                  </div>
                  <div className="security-settings-form-field">
                    <label>Тикер продукта (2 символа)</label>
                    <input
                      type="text"
                      className="security-settings-input"
                      value={newProduct.ticker}
                      onChange={(e) =>
                        handleProductInputChange('ticker', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 2))
                      }
                      placeholder="CL"
                      maxLength={2}
                    />
                  </div>
                  <div className="security-settings-form-field">
                    <label>Тикер / Валюта</label>
                    <input
                      type="text"
                      className="security-settings-input"
                      value={newProduct.currency}
                      onChange={(e) => handleProductInputChange('currency', e.target.value)}
                      placeholder="USD"
                    />
                  </div>
                  <div className="security-settings-form-field full-width">
                    <label>Описание</label>
                    <input
                      type="text"
                      className="security-settings-input"
                      value={newProduct.description}
                      onChange={(e) => handleProductInputChange('description', e.target.value)}
                      placeholder="Описание продукта"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="security-settings-save-btn"
                  disabled={productsLoading}
                >
                  {productsLoading ? 'Добавление...' : 'Добавить продукт'}
                </button>
              </form>

              <div className="security-settings-products-list">
                {products.length === 0 ? (
                  <div className="security-settings-empty">
                    Продукты не добавлены
                  </div>
                ) : (
                  products.map(product => (
                    <div
                      key={product.id}
                      className="security-settings-product-card"
                      onClick={() => handleOpenProductModal(product)}
                    >
                      <div className="security-settings-product-info">
                        <div className="security-settings-product-header">
                          <h4>{product.type}</h4>
                          {product.ticker && (
                            <span className="security-settings-product-ticker">{product.ticker}</span>
                          )}
                        </div>
                        <p className="security-settings-product-meta">Валюта: {product.currency}</p>
                        <p className="security-settings-product-meta">
                          Мин. сумма вывода: {product.min_withdrawal_amount 
                            ? `${parseFloat(product.min_withdrawal_amount).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${product.currency}`
                            : 'Не задано'}
                        </p>
                        {product.description && (
                          <p className="security-settings-product-description">{product.description}</p>
                        )}
                      </div>
                      <div className="security-settings-product-actions">
                        <button
                          type="button"
                          className="security-settings-delete-btn"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleProductDelete(product.id);
                          }}
                          disabled={productsLoading}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="security-settings-accordion-item">
          <button
            className={`security-settings-accordion-button ${sectionsOpen.options ? 'open' : ''}`}
            onClick={() => toggleSection('options')}
          >
            Опции
          </button>
          {sectionsOpen.options && (
            <div className="security-settings-accordion-panel">
              <form className="security-settings-form" onSubmit={handleOptionsSave}>
                <div className="security-settings-form-grid">
                  <div className="security-settings-form-field">
                    <label>Комиссия валюты за вывод (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="security-settings-input"
                      value={optionsForm.comission_Currency_Widthdrawl}
                      onChange={(e) => handleOptionsChange('comission_Currency_Widthdrawl', e.target.value)}
                    />
                  </div>
                  <div className="security-settings-form-field">
                    <label>Комиссия за депозит (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="security-settings-input"
                      value={optionsForm.comission_Currency_Deposit}
                      onChange={(e) => handleOptionsChange('comission_Currency_Deposit', e.target.value)}
                    />
                  </div>
                  <div className="security-settings-form-field">
                    <label>Комиссия компании за вывод (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="security-settings-input"
                      value={optionsForm.comission_Widthdrawl}
                      onChange={(e) => handleOptionsChange('comission_Widthdrawl', e.target.value)}
                    />
                  </div>
                  <div className="security-settings-form-field">
                    <label>Мин. комиссия (локап истёк)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="security-settings-input"
                      value={optionsForm.min_commission_withdrawal_lockup_expired}
                      onChange={(e) => handleOptionsChange('min_commission_withdrawal_lockup_expired', e.target.value)}
                    />
                  </div>
                  <div className="security-settings-form-field">
                    <label>Мин. комиссия (локап активен)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="security-settings-input"
                      value={optionsForm.min_commission_withdrawal_lockup_active}
                      onChange={(e) => handleOptionsChange('min_commission_withdrawal_lockup_active', e.target.value)}
                    />
                  </div>
                  <div className="security-settings-form-field">
                    <label>Комиссия компании за вывод (локап истёк) %</label>
                    <input
                      type="number"
                      step="0.01"
                      className="security-settings-input"
                      value={optionsForm.comission_company_withdrawal_lockup_expired}
                      onChange={(e) => handleOptionsChange('comission_company_withdrawal_lockup_expired', e.target.value)}
                    />
                  </div>
                  <div className="security-settings-form-field">
                    <label>Комиссия компании за вывод (локап активен) %</label>
                    <input
                      type="number"
                      step="0.01"
                      className="security-settings-input"
                      value={optionsForm.comission_company_withdrawal_lockup_active}
                      onChange={(e) => handleOptionsChange('comission_company_withdrawal_lockup_active', e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="security-settings-save-btn"
                  disabled={optionsSaving}
                >
                  {optionsSaving ? 'Сохранение...' : 'Сохранить настройки'}
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="security-settings-accordion-item">
          <button
            className={`security-settings-accordion-button ${sectionsOpen.referral ? 'open' : ''}`}
            onClick={() => toggleSection('referral')}
          >
            Реферальная программа
          </button>
          {sectionsOpen.referral && (
            <div className="security-settings-accordion-panel">
              <ReferralProgramSettings />
            </div>
          )}
        </div>

        <div className="security-settings-accordion-item">
          <button
            className={`security-settings-accordion-button ${sectionsOpen.paymentMethods ? 'open' : ''}`}
            onClick={() => toggleSection('paymentMethods')}
          >
            Способы пополнения
          </button>
          {sectionsOpen.paymentMethods && (
            <div className="security-settings-accordion-panel">
              <PaymentMethodsManagement />
            </div>
          )}
        </div>

        <div className="security-settings-accordion-item">
          <button
            className={`security-settings-accordion-button ${sectionsOpen.dealTypes ? 'open' : ''}`}
            onClick={() => toggleSection('dealTypes')}
          >
            Типы сделок
          </button>
          {sectionsOpen.dealTypes && (
            <div className="security-settings-accordion-panel">
              <DealTypesManagement />
            </div>
          )}
        </div>

        <div className="security-settings-accordion-item">
          <button
            className={`security-settings-accordion-button ${sectionsOpen.publications ? 'open' : ''}`}
            onClick={() => toggleSection('publications')}
          >
            Публикации
          </button>
          {sectionsOpen.publications && (
            <div className="security-settings-accordion-panel">
              <PublicationsManagement />
            </div>
          )}
        </div>

      </div>

      {productModalState.open && productModalState.product && (
        <div className="security-settings-modal-overlay" onClick={handleCloseProductModal}>
          <div className="security-settings-modal" onClick={(event) => event.stopPropagation()}>
            <div className="security-settings-modal-header">
              <div>
                <h3>{productModalState.product.type}</h3>
                <p>Индивидуальные настройки продукта</p>
              </div>
              <button
                type="button"
                className="security-settings-modal-close"
                onClick={handleCloseProductModal}
              >
                ✕
              </button>
            </div>

            {productModalState.draft && (
              <div className="security-settings-modal-body">
                <section className="security-settings-modal-section">
                  <h4>Комиссии валюты</h4>
                  <div className="security-settings-modal-grid two-columns">
                    <label className="security-settings-modal-field">
                      <span>Пополнение (%)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productModalState.draft.commissionDeposit}
                        onChange={(e) => handleProductDraftChange('commissionDeposit', e.target.value)}
                      />
                    </label>
                    <label className="security-settings-modal-field">
                      <span>Вывод (%)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productModalState.draft.commissionWithdraw}
                        onChange={(e) => handleProductDraftChange('commissionWithdraw', e.target.value)}
                      />
                    </label>
                  </div>
                </section>

                <section className="security-settings-modal-section">
                  <h4>Базовые параметры</h4>
                  <div className="security-settings-modal-grid two-columns">
                    <label className="security-settings-modal-field">
                      <span>Минимальная сумма вывода</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productModalState.draft.minWithdrawalAmount || productModalState.product?.min_withdrawal_amount || ''}
                        onChange={(e) => handleProductDraftChange('minWithdrawalAmount', e.target.value)}
                        placeholder="0.00"
                      />
                    </label>
                    <label className="security-settings-modal-field">
                      <span>Тикер продукта (2 символа)</span>
                      <input
                        type="text"
                        maxLength={2}
                        value={productModalState.draft.ticker || ''}
                        onChange={(e) => handleTickerDraftChange(e.target.value)}
                      />
                    </label>
                    <label className="security-settings-modal-field">
                      <span>Инвест. правила обязательны</span>
                      <select
                        value={productModalState.draft.investmentRulesRequired ? 'required' : 'optional'}
                        onChange={(e) =>
                          handleProductDraftChange('investmentRulesRequired', e.target.value === 'required')
                        }
                      >
                        <option value="required">Обязательны</option>
                        <option value="optional">Не требуются</option>
                      </select>
                    </label>
                  </div>
                </section>

                <section className="security-settings-modal-section">
                  <h4>Файл инвестиционных правил</h4>
                  <div className="security-settings-modal-grid single-column">
                    <div className="security-settings-modal-field file-upload">
                      <span>Файл</span>
                      <div className="security-settings-modal-file-actions">
                        {(productModalState.product.investment_rules_path ||
                          productModalState.draft?.investment_rules_path) && (
                          <a
                            href={resolveRulesLink(
                              productModalState.draft?.investment_rules_path ||
                                productModalState.product.investment_rules_path
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Скачать
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => investmentRulesInputRef.current?.click()}
                          disabled={uploadingInvestmentRules}
                        >
                          {uploadingInvestmentRules ? 'Загрузка...' : 'Загрузить файл'}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="security-settings-modal-section">
                  <div className="security-settings-modal-grid stacked two-columns">
                    <label className="security-settings-modal-field">
                      <span>Подписка активна</span>
                      <select
                        value={productModalState.draft.subscriptionEnabled ? 'enabled' : 'disabled'}
                        onChange={(e) =>
                          handleProductDraftChange('subscriptionEnabled', e.target.value === 'enabled')
                        }
                      >
                        <option value="enabled">Включена</option>
                        <option value="disabled">Отключена</option>
                      </select>
                    </label>
                    <label className="security-settings-modal-field">
                      <span>Период оплаты</span>
                      <select
                        value={productModalState.draft.subscriptionPlan}
                        onChange={(e) => handleProductDraftChange('subscriptionPlan', e.target.value)}
                      >
                        <option value="monthly">Месяц</option>
                        <option value="yearly">Год</option>
                      </select>
                    </label>
                    <label className="security-settings-modal-field">
                      <span>Стоимость</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productModalState.draft.subscriptionPrice}
                        onChange={(e) => handleProductDraftChange('subscriptionPrice', e.target.value)}
                      />
                    </label>
                  </div>
                </section>

                {productModalState.draft.subscriptionEnabled && (
                  <section className="security-settings-modal-section">
                    <h4 className="security-settings-modal-subsection-title">Дополнительные настройки подписки</h4>
                    <div className="security-settings-modal-grid stacked">
                      <div className="security-settings-modal-field">
                        <span>Титульная картинка</span>
                        <div className="security-settings-file-upload">
                          <input
                            type="file"
                            accept="image/*"
                            id="subscription-title-image-input"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Если файл уже выбран, сразу загружаем его на сервер
                                if (productModalState.product?.id) {
                                  try {
                                    console.log('📄 SecuritySettings: Автоматическая загрузка титульной картинки...');
                                    const uploadResult = await securityService.uploadSubscriptionTitleImage(productModalState.product.id, file);
                                    if (uploadResult && uploadResult.titleImage) {
                                      // Сохраняем путь к загруженному файлу вместо File объекта
                                      handleProductDraftChange('subscriptionTitleImage', uploadResult.titleImage);
                                      notify('success', 'Титульная картинка загружена');
                                    } else {
                                      throw new Error('Не удалось загрузить файл');
                                    }
                                  } catch (error) {
                                    console.error('SecuritySettings: Ошибка загрузки титульной картинки:', error);
                                    notify('error', error.message || 'Не удалось загрузить титульную картинку');
                                    // Не сохраняем файл, если не удалось загрузить
                                  }
                                } else {
                                  // Если продукт еще не выбран, сохраняем File объект для последующей загрузки
                                  handleProductDraftChange('subscriptionTitleImage', file);
                                }
                              }
                              // Сбрасываем input
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              document.getElementById('subscription-title-image-input')?.click();
                            }}
                            className="security-settings-upload-button"
                          >
                            Выбрать файл
                          </button>
                          {productModalState.draft.subscriptionTitleImage && (
                            <div className="security-settings-file-card-grid">
                              <div 
                                className="security-settings-file-card"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleOpenViewer(
                                    productModalState.draft.subscriptionTitleImage,
                                    getFileType(productModalState.draft.subscriptionTitleImage)
                                  );
                                }}
                              >
                                {(() => {
                                  const titleImage = productModalState.draft.subscriptionTitleImage;
                                  const imageType = getFileType(titleImage);
                                  const imageUrl = getFileUrl(titleImage);
                                  console.log('🔍 Титульная картинка:', { titleImage, imageType, imageUrl, isFile: titleImage instanceof File, type: typeof titleImage });
                                  
                                  return imageType === 'image' ? (
                                    <img 
                                      src={imageUrl} 
                                      alt="Титульная картинка"
                                      className="security-settings-file-card-preview"
                                      onLoad={() => {
                                        console.log('✅ Превью титульной картинки загружено:', imageUrl);
                                      }}
                                      onError={(e) => {
                                        console.error('❌ Ошибка загрузки превью титульной картинки:', {
                                          url: imageUrl,
                                          original: titleImage,
                                          type: typeof titleImage,
                                          isFile: titleImage instanceof File
                                        });
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  ) : (
                                    <div className="security-settings-file-card-placeholder">
                                      <span>
                                        {titleImage instanceof File 
                                          ? titleImage.name 
                                          : typeof titleImage === 'string'
                                          ? 'Титульная картинка'
                                          : 'Титульная картинка (неподдерживаемый тип)'}
                                      </span>
                                    </div>
                                  );
                                })()}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleProductDraftChange('subscriptionTitleImage', null);
                                  }}
                                  className="security-settings-file-card-remove"
                                  title="Удалить"
                                >
                                  ×
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      <label className="security-settings-modal-field">
                        <span>Подробное описание</span>
                        <textarea
                          rows="5"
                          value={productModalState.draft.subscriptionDescription || ''}
                          onChange={(e) => handleProductDraftChange('subscriptionDescription', e.target.value)}
                          placeholder="Введите подробное описание подписки..."
                        />
                      </label>

                      <div className="security-settings-modal-field">
                        <span>Промо материалы (до 5 файлов: фото и/или видео)</span>
                        <div className="security-settings-file-upload-multiple">
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            id="subscription-promo-materials-input"
                            style={{ display: 'none' }}
                            onChange={async (e) => {
                              const files = Array.from(e.target.files || []);
                              if (files.length === 0) return;

                              const currentFiles = productModalState.draft.subscriptionPromoMaterials || [];
                              const existingPaths = currentFiles.filter(item => typeof item === 'string');
                              const totalFiles = existingPaths.length + files.length;
                              
                              if (totalFiles > 5) {
                                notify('error', 'Можно загрузить максимум 5 файлов. Удалите существующие файлы перед загрузкой новых.');
                                e.target.value = '';
                                return;
                              }

                              // Если продукт выбран, сразу загружаем файлы на сервер
                              if (productModalState.product?.id) {
                                try {
                                  console.log('📄 SecuritySettings: Автоматическая загрузка промо материалов...', files.length, 'файлов');
                                  const uploadResult = await securityService.uploadSubscriptionPromoMaterials(productModalState.product.id, files);
                                  if (uploadResult && uploadResult.promoMaterials) {
                                    // Сохраняем пути к загруженным файлам вместо File объектов
                                    handleProductDraftChange('subscriptionPromoMaterials', uploadResult.promoMaterials);
                                    notify('success', `Загружено ${uploadResult.uploadedPaths?.length || files.length} файлов`);
                                  } else {
                                    throw new Error('Не удалось загрузить файлы');
                                  }
                                } catch (error) {
                                  console.error('SecuritySettings: Ошибка загрузки промо материалов:', error);
                                  notify('error', error.message || 'Не удалось загрузить промо материалы');
                                  // Не сохраняем файлы, если не удалось загрузить
                                }
                              } else {
                                // Если продукт еще не выбран, сохраняем File объекты для последующей загрузки
                                const newFiles = [...currentFiles, ...files];
                                handleProductDraftChange('subscriptionPromoMaterials', newFiles);
                              }
                              // Сбрасываем input для возможности загрузить те же файлы снова
                              e.target.value = '';
                            }}
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              document.getElementById('subscription-promo-materials-input')?.click();
                            }}
                            className="security-settings-upload-button"
                            disabled={(productModalState.draft.subscriptionPromoMaterials || []).length >= 5}
                          >
                            {(productModalState.draft.subscriptionPromoMaterials || []).length >= 5 
                              ? 'Достигнут лимит (5 файлов)' 
                              : 'Добавить файлы'}
                          </button>
                          {(productModalState.draft.subscriptionPromoMaterials || []).length > 0 && (
                            <div className="security-settings-file-card-grid">
                              {(productModalState.draft.subscriptionPromoMaterials || []).map((file, index) => {
                                const fileType = getFileType(file);
                                const fileUrl = getFileUrl(file);
                                console.log(`🔍 Промо материал ${index + 1}:`, { 
                                  file, 
                                  fileType, 
                                  fileUrl, 
                                  isFile: file instanceof File, 
                                  type: typeof file 
                                });
                                
                                return (
                                  <div 
                                    key={index} 
                                    className="security-settings-file-card"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      console.log('🔍 Клик на карточку промо материала:', { file, fileType, fileUrl });
                                      handleOpenViewer(file, fileType);
                                    }}
                                  >
                                    {fileUrl && fileType === 'image' ? (
                                      <img 
                                        src={fileUrl} 
                                        alt={`Промо материал ${index + 1}`}
                                        className="security-settings-file-card-preview"
                                        onLoad={() => {
                                          console.log('✅ Превью изображения загружено:', fileUrl);
                                        }}
                                        onError={(e) => {
                                          console.error('❌ Ошибка загрузки превью изображения:', {
                                            url: fileUrl,
                                            original: file,
                                            type: typeof file,
                                            isFile: file instanceof File,
                                            error: e
                                          });
                                          e.target.style.display = 'none';
                                        }}
                                      />
                                    ) : fileUrl && fileType === 'video' ? (
                                      <div className="security-settings-file-card-video-wrapper">
                                        <video 
                                          src={fileUrl} 
                                          muted
                                          preload="metadata"
                                          className="security-settings-file-card-preview"
                                          onLoadedMetadata={() => {
                                            console.log('✅ Превью видео загружено:', fileUrl);
                                          }}
                                          onError={(e) => {
                                            console.error('❌ Ошибка загрузки превью видео:', {
                                              url: fileUrl,
                                              original: file,
                                              type: typeof file,
                                              isFile: file instanceof File,
                                              error: e
                                            });
                                            e.target.style.display = 'none';
                                          }}
                                        />
                                        <div className="security-settings-file-card-play-icon">▶</div>
                                      </div>
                                    ) : (
                                      <div className="security-settings-file-card-placeholder">
                                        <span>
                                          {file instanceof File 
                                            ? file.name 
                                            : typeof file === 'string' 
                                            ? `Файл ${index + 1}` 
                                            : `Файл ${index + 1} (неподдерживаемый тип)`}
                                        </span>
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        const updatedFiles = (productModalState.draft.subscriptionPromoMaterials || []).filter((_, i) => i !== index);
                                        handleProductDraftChange('subscriptionPromoMaterials', updatedFiles);
                                      }}
                                      className="security-settings-file-card-remove"
                                      title="Удалить"
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                <section className="security-settings-modal-section">
                  <div className="security-settings-modal-grid two-columns">
                    <label className="security-settings-modal-field">
                      <span>Локап активен</span>
                      <select
                        value={Number(productModalState.draft.lockupPeriod) > 0 ? 'enabled' : 'disabled'}
                        onChange={(e) =>
                          handleProductDraftChange(
                            'lockupPeriod',
                            e.target.value === 'enabled' ? productModalState.draft.lockupPeriod || '12' : '0'
                          )
                        }
                      >
                        <option value="enabled">Включен</option>
                        <option value="disabled">Отключен</option>
                      </select>
                    </label>
                    <label className="security-settings-modal-field">
                      <span>Минимальный срок блокировки (мес.)</span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={productModalState.draft.lockupPeriod}
                        onChange={(e) => handleProductDraftChange('lockupPeriod', e.target.value)}
                      />
                    </label>
                  </div>
                </section>

                <section className="security-settings-modal-section">
                  <div className="security-settings-modal-grid two-columns">
                    <label className="security-settings-modal-field">
                      <span>Первичное пополнение</span>
                      <select
                        value={productModalState.draft.initialTopUp.enabled ? 'enabled' : 'disabled'}
                        onChange={(e) =>
                          handleProductDraftNestedChange('initialTopUp', 'enabled', e.target.value === 'enabled')
                        }
                      >
                        <option value="enabled">Есть лимит</option>
                        <option value="disabled">Без лимита</option>
                      </select>
                    </label>
                    <label className="security-settings-modal-field">
                      <span>Сумма</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productModalState.draft.initialTopUp.amount}
                        onChange={(e) => handleProductDraftNestedChange('initialTopUp', 'amount', e.target.value)}
                      />
                    </label>
                  </div>
                </section>

                <section className="security-settings-modal-section">
                  <div className="security-settings-modal-grid two-columns">
                    <label className="security-settings-modal-field">
                      <span>Постоянные пополнения</span>
                      <select
                        value={productModalState.draft.recurringTopUp.enabled ? 'enabled' : 'disabled'}
                        onChange={(e) =>
                          handleProductDraftNestedChange('recurringTopUp', 'enabled', e.target.value === 'enabled')
                        }
                      >
                        <option value="enabled">Есть лимит</option>
                        <option value="disabled">Без лимита</option>
                      </select>
                    </label>
                    <label className="security-settings-modal-field">
                      <span>Сумма</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={productModalState.draft.recurringTopUp.amount}
                        onChange={(e) => handleProductDraftNestedChange('recurringTopUp', 'amount', e.target.value)}
                      />
                    </label>
                  </div>
                </section>
              </div>
            )}

            <input
              ref={investmentRulesInputRef}
              type="file"
              accept=".pdf,image/*"
              style={{ display: 'none' }}
              onChange={handleInvestmentRulesFileChange}
            />

            <div className="security-settings-modal-footer">
              <button type="button" className="security-settings-modal-button ghost" onClick={handleCloseProductModal}>
                Отмена
              </button>
              <button type="button" className="security-settings-modal-button primary" onClick={handleProductModalSave} disabled={productModalSaving}>
                {productModalSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно просмотра файлов */}
      {viewerOpen && viewerSrc && (
        <div 
          className="security-settings-viewer-overlay" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseViewer();
            }
          }}
        >
          <button 
            className="security-settings-viewer-close" 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCloseViewer();
            }}
            type="button"
            title="Закрыть"
          >
            ×
          </button>
          <div className="security-settings-viewer-container" onClick={(e) => e.stopPropagation()}>
            {viewerType === 'image' && viewerSrc && (
              <img 
                src={typeof viewerSrc === 'string' ? viewerSrc : getFileUrl(viewerSrc)} 
                alt="Просмотр" 
                className="security-settings-viewer-content"
                onLoad={() => {
                  console.log('✅ Изображение вьювера загружено:', viewerSrc);
                }}
                onError={(e) => {
                  console.error('❌ Ошибка загрузки изображения вьювера:', viewerSrc);
                  e.target.style.display = 'none';
                }}
              />
            )}
            {viewerType === 'video' && viewerSrc && (
              <video 
                src={typeof viewerSrc === 'string' ? viewerSrc : getFileUrl(viewerSrc)} 
                controls 
                autoPlay
                className="security-settings-viewer-content"
                onLoadedData={() => {
                  console.log('✅ Видео вьювера загружено:', viewerSrc);
                }}
                onError={(e) => {
                  console.error('❌ Ошибка загрузки видео вьювера:', viewerSrc);
                  e.target.style.display = 'none';
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Компонент настройки реферальной программы
const ReferralProgramSettings = () => {
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingLevel, setEditingLevel] = useState(null);
  const [formData, setFormData] = useState({
    min_amount: '',
    max_amount: '',
    reward_amount: '',
    currency: 'USDT',
    is_custom: false,
    description: ''
  });

  useEffect(() => {
    loadMatrix();
  }, []);

  const loadMatrix = async () => {
    try {
      setLoading(true);
      const response = await securityService.getReferralMatrix();
      if (response.success) {
        setMatrix(response.data || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки матрицы:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLevel = async () => {
    try {
      setSaving(true);
      const payload = {
        ...(editingLevel ? { id: editingLevel.id } : {}),
        min_amount: parseFloat(formData.min_amount),
        max_amount: formData.max_amount ? parseFloat(formData.max_amount) : null,
        reward_amount: parseFloat(formData.reward_amount),
        currency: formData.currency,
        is_custom: formData.is_custom,
        order: editingLevel ? editingLevel.order : matrix.length + 1,
        description: formData.description || null
      };

      await securityService.createOrUpdateReferralMatrixLevel(payload);
      await loadMatrix();
      setEditingLevel(null);
      setFormData({
        min_amount: '',
        max_amount: '',
        reward_amount: '',
        currency: 'USDT',
        is_custom: false,
        description: ''
      });
    } catch (error) {
      console.error('Ошибка сохранения уровня:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleEditLevel = (level) => {
    setEditingLevel(level);
    setFormData({
      min_amount: level.min_amount?.toString() || '',
      max_amount: level.max_amount?.toString() || '',
      reward_amount: level.reward_amount?.toString() || '',
      currency: level.currency || 'USDT',
      is_custom: level.is_custom || false,
      description: level.description || ''
    });
  };

  const handleDeleteLevel = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот уровень?')) return;
    try {
      await securityService.deleteReferralMatrixLevel(id);
      await loadMatrix();
    } catch (error) {
      console.error('Ошибка удаления уровня:', error);
    }
  };

  if (loading) {
    return <div className="security-settings-loading">Загрузка...</div>;
  }

  return (
    <div className="referral-program-settings">
      <div className="referral-program-header">
        <h3>Матрица реферальных вознаграждений</h3>
        <button
          type="button"
          className="security-settings-add-btn"
          onClick={() => {
            setEditingLevel(null);
            setFormData({
              min_amount: '',
              max_amount: '',
              reward_amount: '',
              currency: 'USDT',
              is_custom: false,
              description: ''
            });
          }}
        >
          + Добавить уровень
        </button>
      </div>

      {(editingLevel !== null || (!editingLevel && formData.min_amount)) && (
        <div className="referral-program-form">
          <h4>{editingLevel ? 'Редактирование уровня' : 'Новый уровень'}</h4>
          <div className="security-settings-form-grid">
            <div className="security-settings-form-field">
              <label>Минимальная сумма депозита</label>
              <input
                type="number"
                step="0.01"
                value={formData.min_amount}
                onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                placeholder="5000"
              />
            </div>
            <div className="security-settings-form-field">
              <label>Максимальная сумма депозита (необязательно)</label>
              <input
                type="number"
                step="0.01"
                value={formData.max_amount}
                onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                placeholder="10000"
              />
            </div>
            <div className="security-settings-form-field">
              <label>Размер вознаграждения</label>
              <input
                type="number"
                step="0.01"
                value={formData.reward_amount}
                onChange={(e) => setFormData({ ...formData, reward_amount: e.target.value })}
                placeholder="50"
              />
            </div>
            <div className="security-settings-form-field">
              <label>Валюта</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USDT">USDT</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div className="security-settings-form-field">
              <label>
                <input
                  type="checkbox"
                  checked={formData.is_custom}
                  onChange={(e) => setFormData({ ...formData, is_custom: e.target.checked })}
                />
                Индивидуальные условия (от 100000)
              </label>
            </div>
            <div className="security-settings-form-field">
              <label>Описание</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание уровня"
              />
            </div>
          </div>
          <div className="referral-program-form-actions">
            <button
              type="button"
              className="security-settings-save-btn"
              onClick={handleSaveLevel}
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <button
              type="button"
              className="security-settings-cancel-btn"
              onClick={() => {
                setEditingLevel(null);
                setFormData({
                  min_amount: '',
                  max_amount: '',
                  reward_amount: '',
                  currency: 'USDT',
                  is_custom: false,
                  description: ''
                });
              }}
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      <div className="referral-program-matrix">
        {matrix.length === 0 ? (
          <div className="security-settings-empty">Уровни матрицы не добавлены</div>
        ) : (
          <table className="referral-matrix-table">
            <thead>
              <tr>
                <th>Мин. сумма</th>
                <th>Макс. сумма</th>
                <th>Вознаграждение</th>
                <th>Валюта</th>
                <th>Индивидуальные</th>
                <th>Активен</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {matrix.map((level) => (
                <tr key={level.id}>
                  <td>{level.min_amount}</td>
                  <td>{level.max_amount || '∞'}</td>
                  <td>{level.reward_amount}</td>
                  <td>{level.currency}</td>
                  <td>{level.is_custom ? 'Да' : 'Нет'}</td>
                  <td>{level.is_active ? 'Да' : 'Нет'}</td>
                  <td>
                    <button
                      type="button"
                      className="security-settings-edit-btn"
                      onClick={() => handleEditLevel(level)}
                    >
                      Редактировать
                    </button>
                    <button
                      type="button"
                      className="security-settings-delete-btn"
                      onClick={() => handleDeleteLevel(level.id)}
                    >
                      Удалить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SecuritySettings;

