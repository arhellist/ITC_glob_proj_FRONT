/**
 * Утилита для сбора Behavioral Biometrics данных
 * 
 * Behavioral Biometrics - это анализ поведения пользователя для выявления подозрительной активности:
 * - Keystroke Dynamics (анализ нажатий клавиш: время между нажатиями, длительность нажатия)
 * - Mouse Dynamics (анализ движения мыши: скорость, ускорение, траектория)
 * - Scroll Dynamics (анализ скорости прокрутки)
 * - Session Timing (анализ времени сессии: время между действиями)
 * - Navigation Patterns (анализ паттернов навигации: последовательность кликов, переходов)
 */

import axiosAPI from '../JS/auth/http/axios.js';

/**
 * Сбор данных о нажатиях клавиш (Keystroke Dynamics)
 */
class KeystrokeCollector {
  constructor() {
    this.samples = [];
    this.lastKeyTime = null;
    this.currentKeyDownTime = null;
    this.isEnabled = true;
  }

  enable() {
    this.isEnabled = true;
    this.attachListeners();
  }

  disable() {
    this.isEnabled = false;
    this.removeListeners();
  }

  attachListeners() {
    if (typeof window === 'undefined') return;
    
    this.keyDownHandler = (e) => {
      if (!this.isEnabled) return;
      this.currentKeyDownTime = Date.now();
    };

    this.keyUpHandler = (e) => {
      if (!this.isEnabled || !this.currentKeyDownTime) return;
      
      // Проверяем, что e.key существует перед проверкой длины
      if (!e || !e.key) return;
      
      const keyUpTime = Date.now();
      const keyDownTime = this.currentKeyDownTime;
      const duration = keyUpTime - keyDownTime; // Длительность нажатия
      const latency = this.lastKeyTime ? keyDownTime - this.lastKeyTime : null; // Время между нажатиями

      // Сохраняем только для обычных клавиш (не служебных)
      if (e.key.length === 1 || ['Backspace', 'Enter', 'Space', 'Tab'].includes(e.key)) {
        this.samples.push({
          key: e.key,
          duration: duration,
          latency: latency,
          timestamp: keyDownTime
        });
      }

      this.lastKeyTime = keyDownTime;
      this.currentKeyDownTime = null;
    };

    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  removeListeners() {
    if (typeof window === 'undefined') return;
    
    if (this.keyDownHandler) {
      window.removeEventListener('keydown', this.keyDownHandler);
    }
    if (this.keyUpHandler) {
      window.removeEventListener('keyup', this.keyUpHandler);
    }
  }

  getSamples() {
    return [...this.samples];
  }

  clearSamples() {
    this.samples = [];
    this.lastKeyTime = null;
    this.currentKeyDownTime = null;
  }
}

/**
 * Сбор данных о движении мыши (Mouse Dynamics)
 */
class MouseCollector {
  constructor() {
    this.samples = [];
    this.lastMouseTime = null;
    this.lastMouseX = null;
    this.lastMouseY = null;
    this.isEnabled = true;
  }

  enable() {
    this.isEnabled = true;
    this.attachListeners();
  }

  disable() {
    this.isEnabled = false;
    this.removeListeners();
  }

  attachListeners() {
    if (typeof window === 'undefined') return;
    
    this.mouseMoveHandler = (e) => {
      if (!this.isEnabled) return;
      
      const currentTime = Date.now();
      const currentX = e.clientX;
      const currentY = e.clientY;

      if (this.lastMouseTime && this.lastMouseX !== null && this.lastMouseY !== null) {
        const timeDelta = currentTime - this.lastMouseTime;
        const distance = Math.sqrt(
          Math.pow(currentX - this.lastMouseX, 2) + 
          Math.pow(currentY - this.lastMouseY, 2)
        );
        const speed = timeDelta > 0 ? distance / timeDelta : 0; // пикселей в миллисекунду

        this.samples.push({
          x: currentX,
          y: currentY,
          distance: distance,
          speed: speed,
          timeDelta: timeDelta,
          timestamp: currentTime
        });
      }

      this.lastMouseX = currentX;
      this.lastMouseY = currentY;
      this.lastMouseTime = currentTime;
    };

    this.mouseClickHandler = (e) => {
      if (!this.isEnabled) return;
      
      this.samples.push({
        type: 'click',
        button: e.button,
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now()
      });
    };

    window.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('click', this.mouseClickHandler);
  }

  removeListeners() {
    if (typeof window === 'undefined') return;
    
    if (this.mouseMoveHandler) {
      window.removeEventListener('mousemove', this.mouseMoveHandler);
    }
    if (this.mouseClickHandler) {
      window.removeEventListener('click', this.mouseClickHandler);
    }
  }

  getSamples() {
    return [...this.samples];
  }

  clearSamples() {
    this.samples = [];
    this.lastMouseTime = null;
    this.lastMouseX = null;
    this.lastMouseY = null;
  }
}

/**
 * Сбор данных о прокрутке (Scroll Dynamics)
 */
class ScrollCollector {
  constructor() {
    this.samples = [];
    this.lastScrollTime = null;
    this.lastScrollY = null;
    this.isEnabled = true;
  }

  enable() {
    this.isEnabled = true;
    this.attachListeners();
  }

  disable() {
    this.isEnabled = false;
    this.removeListeners();
  }

  attachListeners() {
    if (typeof window === 'undefined') return;
    
    this.scrollHandler = (e) => {
      if (!this.isEnabled) return;
      
      const currentTime = Date.now();
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;

      if (this.lastScrollTime && this.lastScrollY !== null) {
        const timeDelta = currentTime - this.lastScrollTime;
        const distance = Math.abs(currentScrollY - this.lastScrollY);
        const speed = timeDelta > 0 ? distance / timeDelta : 0; // пикселей в миллисекунду

        this.samples.push({
          scrollY: currentScrollY,
          distance: distance,
          speed: speed,
          timeDelta: timeDelta,
          timestamp: currentTime
        });
      }

      this.lastScrollY = currentScrollY;
      this.lastScrollTime = currentTime;
    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  removeListeners() {
    if (typeof window === 'undefined') return;
    
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
  }

  getSamples() {
    return [...this.samples];
  }

  clearSamples() {
    this.samples = [];
    this.lastScrollTime = null;
    this.lastScrollY = null;
  }
}

/**
 * Сбор данных о времени сессии (Session Timing)
 */
class TimingCollector {
  constructor() {
    this.samples = [];
    this.lastActionTime = Date.now();
    this.isEnabled = true;
  }

  enable() {
    this.isEnabled = true;
    this.attachListeners();
  }

  disable() {
    this.isEnabled = false;
    this.removeListeners();
  }

  attachListeners() {
    if (typeof window === 'undefined') return;
    
    this.actionHandler = () => {
      if (!this.isEnabled) return;
      
      const currentTime = Date.now();
      const timeSinceLastAction = currentTime - this.lastActionTime;

      this.samples.push({
        timeSinceLastAction: timeSinceLastAction,
        timestamp: currentTime
      });

      this.lastActionTime = currentTime;
    };

    // Отслеживаем различные действия пользователя
    const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, this.actionHandler, { passive: true });
    });
  }

  removeListeners() {
    if (typeof window === 'undefined') return;
    
    if (this.actionHandler) {
      const events = ['click', 'keydown', 'scroll', 'mousemove', 'touchstart'];
      events.forEach(event => {
        window.removeEventListener(event, this.actionHandler);
      });
    }
  }

  getSamples() {
    return [...this.samples];
  }

  clearSamples() {
    this.samples = [];
    this.lastActionTime = Date.now();
  }
}

/**
 * Сбор данных о паттернах навигации (Navigation Patterns)
 */
class NavigationCollector {
  constructor() {
    this.samples = [];
    this.navigationHistory = [];
    this.isEnabled = true;
  }

  enable() {
    this.isEnabled = true;
    this.attachListeners();
  }

  disable() {
    this.isEnabled = false;
    this.removeListeners();
  }

  attachListeners() {
    if (typeof window === 'undefined') return;
    
    this.clickHandler = (e) => {
      if (!this.isEnabled) return;
      
      const target = e.target;
      const tagName = target.tagName;
      const className = target.className || '';
      const id = target.id || '';
      const href = target.href || '';

      this.samples.push({
        type: 'click',
        tagName: tagName,
        className: className.substring(0, 50), // Ограничиваем длину
        id: id.substring(0, 50),
        href: href.substring(0, 100),
        timestamp: Date.now()
      });
    };

    this.navigationHandler = () => {
      if (!this.isEnabled) return;
      
      const path = window.location.pathname;
      this.navigationHistory.push({
        path: path,
        timestamp: Date.now()
      });
    };

    window.addEventListener('click', this.clickHandler);
    window.addEventListener('popstate', this.navigationHandler);
    
    // Отслеживаем изменения пути через History API
    const originalPushState = history.pushState;
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.navigationHandler();
    };
  }

  removeListeners() {
    if (typeof window === 'undefined') return;
    
    if (this.clickHandler) {
      window.removeEventListener('click', this.clickHandler);
    }
    if (this.navigationHandler) {
      window.removeEventListener('popstate', this.navigationHandler);
    }
  }

  getSamples() {
    return [...this.samples];
  }

  getNavigationHistory() {
    return [...this.navigationHistory];
  }

  clearSamples() {
    this.samples = [];
    this.navigationHistory = [];
  }
}

/**
 * Сбор данных о событиях браузера, особенно с isTrusted: false
 * События с isTrusted: false могут указывать на автоматизированные действия или вредоносные скрипты
 */
class BrowserEventsCollector {
  constructor() {
    this.samples = [];
    this.untrustedEvents = [];
    this.isEnabled = true;
  }

  enable() {
    this.isEnabled = true;
    this.attachListeners();
  }

  disable() {
    this.isEnabled = false;
    this.removeListeners();
  }

  attachListeners() {
    if (typeof window === 'undefined') return;
    
    // Отслеживаем различные типы событий
    const eventTypes = ['click', 'keydown', 'keyup', 'mousedown', 'mouseup', 'mousemove', 'scroll', 'touchstart', 'touchend', 'focus', 'blur'];
    
    this.eventHandler = (e) => {
      if (!this.isEnabled) return;
      
      // Проверяем isTrusted - критически важно для безопасности
      const isTrusted = e.isTrusted !== undefined ? e.isTrusted : true;
      
      // Собираем информацию о событии
      const eventData = {
        type: e.type,
        isTrusted: isTrusted,
        timestamp: Date.now(),
        target: {
          tagName: e.target?.tagName || null,
          id: e.target?.id || null,
          className: e.target?.className?.substring(0, 50) || null
        },
        // Дополнительная информация в зависимости от типа события
        key: e.key || null,
        button: e.button !== undefined ? e.button : null,
        clientX: e.clientX || null,
        clientY: e.clientY || null
      };

      // Сохраняем все события
      this.samples.push(eventData);
      
      // Особое внимание к событиям с isTrusted: false
      if (!isTrusted) {
        this.untrustedEvents.push(eventData);
      }
    };

    // Добавляем слушатели для всех типов событий
    eventTypes.forEach(eventType => {
      window.addEventListener(eventType, this.eventHandler, { passive: true, capture: true });
    });
  }

  removeListeners() {
    if (typeof window === 'undefined') return;
    
    if (this.eventHandler) {
      const eventTypes = ['click', 'keydown', 'keyup', 'mousedown', 'mouseup', 'mousemove', 'scroll', 'touchstart', 'touchend', 'focus', 'blur'];
      eventTypes.forEach(eventType => {
        window.removeEventListener(eventType, this.eventHandler, { capture: true });
      });
    }
  }

  getSamples() {
    return [...this.samples];
  }

  getUntrustedEvents() {
    return [...this.untrustedEvents];
  }

  clearSamples() {
    this.samples = [];
    this.untrustedEvents = [];
  }
}

/**
 * Главный класс для сбора Behavioral Biometrics данных
 */
class BehavioralBiometricsCollector {
  constructor() {
    this.keystrokeCollector = new KeystrokeCollector();
    this.mouseCollector = new MouseCollector();
    this.scrollCollector = new ScrollCollector();
    this.timingCollector = new TimingCollector();
    this.navigationCollector = new NavigationCollector();
    this.browserEventsCollector = new BrowserEventsCollector();
    this.isEnabled = false;
    this.settings = null;
  }

  /**
   * Инициализация коллектора с настройками
   * @param {Object} settings - Настройки Behavioral Biometrics
   */
  async initialize(settings = null) {
    if (!settings) {
      // Загружаем настройки с сервера
      try {
        // Используем axiosAPI для правильной работы через прокси
        const axiosAPI = (await import('../JS/auth/http/axios.js')).default;
        const response = await axiosAPI.get('/security/behavioral-biometrics/settings');
        if (response.data && response.data.settings) {
          settings = response.data.settings;
        }
      } catch (error) {
        console.warn('Не удалось загрузить настройки Behavioral Biometrics:', error);
      }
    }

    this.settings = settings || {
      enabled: true,
      keystroke_enabled: true,
      mouse_enabled: true,
      scroll_enabled: true,
      timing_enabled: true,
      navigation_enabled: true,
      browser_events_enabled: true
    };

    if (this.settings.enabled) {
      this.enable();
    }
  }

  enable() {
    this.isEnabled = true;
    
    if (this.settings?.keystroke_enabled) {
      this.keystrokeCollector.enable();
    }
    if (this.settings?.mouse_enabled) {
      this.mouseCollector.enable();
    }
    if (this.settings?.scroll_enabled) {
      this.scrollCollector.enable();
    }
    if (this.settings?.timing_enabled) {
      this.timingCollector.enable();
    }
    if (this.settings?.navigation_enabled) {
      this.navigationCollector.enable();
    }
    if (this.settings?.browser_events_enabled !== false) {
      this.browserEventsCollector.enable();
    }
  }

  disable() {
    this.isEnabled = false;
    
    this.keystrokeCollector.disable();
    this.mouseCollector.disable();
    this.scrollCollector.disable();
    this.timingCollector.disable();
    this.navigationCollector.disable();
    this.browserEventsCollector.disable();
  }

  /**
   * Получение всех собранных данных
   * @returns {Object} Объект с данными всех коллекторов
   */
  getAllData() {
    return {
      keystroke: this.keystrokeCollector.getSamples(),
      mouse: this.mouseCollector.getSamples(),
      scroll: this.scrollCollector.getSamples(),
      timing: this.timingCollector.getSamples(),
      navigation: {
        clicks: this.navigationCollector.getSamples(),
        history: this.navigationCollector.getNavigationHistory()
      },
      browserEvents: {
        all: this.browserEventsCollector.getSamples(),
        untrusted: this.browserEventsCollector.getUntrustedEvents()
      },
      timestamp: Date.now()
    };
  }

  /**
   * Очистка всех собранных данных
   */
  clearAllData() {
    this.keystrokeCollector.clearSamples();
    this.mouseCollector.clearSamples();
    this.scrollCollector.clearSamples();
    this.timingCollector.clearSamples();
    this.navigationCollector.clearSamples();
    this.browserEventsCollector.clearSamples();
  }

  /**
   * Отправка данных на сервер для анализа
   * @param {number} userId - ID пользователя
   */
  async sendDataForAnalysis(userId) {
    if (!this.isEnabled || !this.settings?.enabled) {
      return null;
    }

    // Проверяем наличие токена перед отправкой запроса
    const token = localStorage.getItem('accessToken');
    if (!token) {
      console.warn('Behavioral Biometrics: Токен отсутствует, пропускаем отправку данных');
      return null;
    }

    const data = this.getAllData();
    
    // Проверяем, что есть данные для отправки
    if (!data || Object.keys(data).length === 0) {
      console.log('Behavioral Biometrics: Нет данных для отправки');
      return null;
    }
    
    try {
      // Дополнительная проверка токена перед отправкой
      const token = localStorage.getItem('accessToken');
      if (!token) {
        console.warn('Behavioral Biometrics: Токен отсутствует перед отправкой запроса');
        return null;
      }

      console.log('📊 Behavioral Biometrics: Отправка данных на анализ, userId:', userId);
      console.log('📊 Behavioral Biometrics: Токен присутствует:', token.substring(0, 20) + '...');
      
      const response = await axiosAPI.post('/profile/behavioral-biometrics/analyze', {
        userId: userId,
        data: data
      });

      if (response.data && response.data.success) {
        console.log('✅ Behavioral Biometrics: Данные успешно отправлены и проанализированы');
        return response.data;
      } else {
        console.error('Ошибка отправки данных Behavioral Biometrics: неверный формат ответа');
        return null;
      }
    } catch (error) {
      // Игнорируем 401 ошибки - они обрабатываются axios interceptor'ом
      if (error.response?.status === 401) {
        console.warn('⚠️ Behavioral Biometrics: Пользователь не авторизован (401), пропускаем отправку данных');
        console.warn('⚠️ Behavioral Biometrics: URL запроса:', error.config?.url);
        console.warn('⚠️ Behavioral Biometrics: Headers запроса:', error.config?.headers);
        return null;
      }
      console.error('❌ Ошибка отправки данных Behavioral Biometrics:', error.response?.statusText || error.message);
      console.error('❌ Детали ошибки:', error.response?.data);
      return null;
    }
  }
}

// Создаем глобальный экземпляр коллектора
let globalCollector = null;

/**
 * Получение или создание глобального экземпляра коллектора
 * @returns {BehavioralBiometricsCollector}
 */
export function getBehavioralBiometricsCollector() {
  if (!globalCollector) {
    globalCollector = new BehavioralBiometricsCollector();
  }
  return globalCollector;
}

/**
 * Инициализация Behavioral Biometrics коллектора
 * @param {Object} settings - Настройки (опционально)
 */
export async function initializeBehavioralBiometrics(settings = null) {
  const collector = getBehavioralBiometricsCollector();
  await collector.initialize(settings);
  return collector;
}

export default {
  getBehavioralBiometricsCollector,
  initializeBehavioralBiometrics,
  KeystrokeCollector,
  MouseCollector,
  ScrollCollector,
  TimingCollector,
  NavigationCollector,
  BehavioralBiometricsCollector
};

