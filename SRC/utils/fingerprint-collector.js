/**
 * Сервис для сбора цифрового отпечатка браузера
 */

/**
 * Сбор базовых параметров (не требуют разрешений)
 */
export function collectBasicFingerprint() {
  const fingerprint = {
    user_agent: navigator.userAgent || '',
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    color_depth: window.screen.colorDepth || null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    language: navigator.language || '',
    platform: navigator.platform || ''
  };

  return fingerprint;
}

/**
 * Сбор установленных шрифтов
 * 
 * ВАЖНО: Это НЕ системное разрешение браузера!
 * Браузер не запрашивает разрешение - мы просто используем Canvas API для определения шрифтов.
 * Функция вызывается только если пользователь дал согласие в нашей модалке.
 * 
 * Принцип работы:
 * - Создаем canvas элемент
 * - Пробуем отрисовать текст разными шрифтами
 * - Сравниваем размеры текста - если размер отличается, шрифт установлен
 */
export function collectFonts() {
  return new Promise((resolve) => {
    const baseFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New', 'Georgia',
      'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS', 'Trebuchet MS',
      'Impact', 'Monaco', 'Menlo', 'Consolas', 'Courier', 'Lucida Console',
      'Tahoma', 'Trebuchet', 'Arial Black', 'Arial Narrow'
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const detectedFonts = [];

    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const baselineFonts = ['monospace', 'sans-serif', 'serif'];

    baseFonts.forEach((font) => {
      let detected = false;
      baselineFonts.forEach((baseFont) => {
        const spec = `${testSize} "${font}", ${baseFont}`;
        ctx.font = spec;
        const metrics1 = ctx.measureText(testString);
        ctx.font = `${testSize} ${baseFont}`;
        const metrics2 = ctx.measureText(testString);
        if (metrics1.width !== metrics2.width) {
          detected = true;
        }
      });
      if (detected) {
        detectedFonts.push(font);
      }
    });

    resolve(detectedFonts);
  });
}

/**
 * Сбор плагинов и MIME-типов
 * 
 * ВАЖНО: Это НЕ системное разрешение браузера!
 * Используем стандартный JavaScript API navigator.plugins.
 * В современных браузерах (Chrome 88+, Firefox) этот API часто возвращает пустой массив
 * из-за политик приватности, но мы все равно пытаемся собрать данные.
 * 
 * Функция вызывается только если пользователь дал согласие в нашей модалке.
 */
export function collectPlugins() {
  const plugins = [];
  const mimeTypes = [];

  if (navigator.plugins && navigator.plugins.length > 0) {
    for (let i = 0; i < navigator.plugins.length; i++) {
      const plugin = navigator.plugins[i];
      plugins.push({
        name: plugin.name,
        description: plugin.description,
        filename: plugin.filename
      });

      if (plugin.length > 0) {
        for (let j = 0; j < plugin.length; j++) {
          const mimeType = plugin[j];
          mimeTypes.push({
            type: mimeType.type,
            description: mimeType.description,
            suffixes: mimeType.suffixes
          });
        }
      }
    }
  }

  return { plugins, mimeTypes };
}

/**
 * Сбор аппаратных характеристик
 * 
 * ВАЖНО: Это НЕ системное разрешение браузера!
 * Используем стандартные JavaScript API:
 * - navigator.hardwareConcurrency - количество ядер CPU (доступно без разрешения)
 * - navigator.deviceMemory - объем RAM (требует HTTPS, но не требует явного разрешения)
 * 
 * Функция вызывается только если пользователь дал согласие в нашей модалке.
 */
export function collectHardwareInfo() {
  return {
    hardware_concurrency: navigator.hardwareConcurrency || null,
    device_memory: navigator.deviceMemory || null
  };
}

/**
 * Canvas fingerprinting
 * 
 * ВАЖНО: Это НЕ системное разрешение браузера!
 * Canvas API доступен без явных разрешений - мы просто рисуем на canvas и получаем его данные.
 * Разные браузеры/ОС/видеокарты могут давать немного разные результаты рендеринга,
 * что создает уникальный отпечаток.
 * 
 * Функция вызывается только если пользователь дал согласие в нашей модалке.
 * 
 * Принцип работы:
 * - Создаем canvas элемент
 * - Рисуем текст с разными стилями
 * - Получаем dataURL (base64 изображение)
 * - Создаем хеш из данных
 */
export function collectCanvasFingerprint() {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 50;
      const ctx = canvas.getContext('2d');
      
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Browser fingerprint test 🔒', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Browser fingerprint test 🔒', 4, 17);

      const dataURL = canvas.toDataURL();
      
      // Создаем простой хеш из данных
      let hash = 0;
      for (let i = 0; i < dataURL.length; i++) {
        const char = dataURL.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      resolve(hash.toString(16));
    } catch (error) {
      console.error('Ошибка Canvas fingerprinting:', error);
      resolve(null);
    }
  });
}

/**
 * WebGL fingerprinting
 * 
 * ВАЖНО: Это НЕ системное разрешение браузера!
 * WebGL API доступен без явных разрешений - мы просто запрашиваем контекст WebGL
 * и получаем информацию о видеокарте и драйверах.
 * 
 * Функция вызывается только если пользователь дал согласие в нашей модалке.
 * 
 * Принцип работы:
 * - Создаем canvas элемент
 * - Получаем WebGL контекст
 * - Запрашиваем параметры видеокарты (vendor, renderer)
 * - Создаем хеш из параметров
 */
export function collectWebGLFingerprint() {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      
      if (!gl) {
        resolve({ vendor: null, renderer: null, fingerprint: null });
        return;
      }

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : null;
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : null;

      // Создаем отпечаток из параметров WebGL
      const params = [
        gl.getParameter(gl.VERSION),
        gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        gl.getParameter(gl.VENDOR),
        gl.getParameter(gl.RENDERER),
        vendor,
        renderer
      ].filter(Boolean).join('|');

      let hash = 0;
      for (let i = 0; i < params.length; i++) {
        const char = params.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }

      resolve({
        vendor: vendor || null,
        renderer: renderer || null,
        fingerprint: hash.toString(16)
      });
    } catch (error) {
      console.error('Ошибка WebGL fingerprinting:', error);
      resolve({ vendor: null, renderer: null, fingerprint: null });
    }
  });
}

/**
 * Audio fingerprinting
 * 
 * ВАЖНО: Это НЕ системное разрешение браузера!
 * AudioContext API доступен без явных разрешений для создания беззвучного аудио.
 * Разные браузеры/ОС/аудиодрайверы могут давать немного разные результаты обработки,
 * что создает уникальный отпечаток.
 * 
 * Функция вызывается только если пользователь дал согласие в нашей модалке.
 * 
 * Принцип работы:
 * - Создаем AudioContext
 * - Генерируем беззвучный сигнал (gain = 0)
 * - Обрабатываем через ScriptProcessor
 * - Анализируем выходные данные
 * - Создаем хеш из данных
 */
export function collectAudioFingerprint() {
  return new Promise((resolve) => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        resolve(null);
        return;
      }

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0; // Mute output
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      scriptProcessor.onaudioprocess = (event) => {
        const output = event.inputBuffer.getChannelData(0);
        let hash = 0;
        for (let i = 0; i < output.length; i++) {
          hash += Math.abs(output[i]);
        }
        const fingerprint = hash.toString(16);
        resolve(fingerprint);
        oscillator.stop();
        context.close();
      };

      oscillator.start(0);
    } catch (error) {
      console.error('Ошибка Audio fingerprinting:', error);
      resolve(null);
    }
  });
}

/**
 * Сбор полного отпечатка с разрешениями
 * 
 * ВАЖНО: "Разрешения" здесь - это НЕ системные разрешения браузера!
 * Это наше внутреннее согласие пользователя, сохраненное в localStorage.
 * 
 * Как это работает:
 * 1. Пользователь выбирает разрешения в модальном окне
 * 2. Разрешения сохраняются в localStorage как JSON объект
 * 3. При входе мы читаем разрешения из localStorage
 * 4. Вызываем только те функции сбора данных, на которые пользователь дал согласие
 * 
 * Браузер НЕ знает о наших разрешениях - мы сами контролируем, какие функции вызывать.
 * Все эти API доступны без явных разрешений браузера, но мы уважаем выбор пользователя.
 */
export async function collectFullFingerprint(permissions = {}) {
  const fingerprint = collectBasicFingerprint();

  // Собираем данные только если пользователь дал согласие (не системное разрешение браузера!)
  if (permissions.fonts) {
    try {
      fingerprint.installed_fonts = await collectFonts();
    } catch (error) {
      console.error('Ошибка сбора шрифтов:', error);
    }
  }

  if (permissions.plugins) {
    try {
      const pluginsData = collectPlugins();
      fingerprint.plugins = pluginsData;
    } catch (error) {
      console.error('Ошибка сбора плагинов:', error);
    }
  }

  if (permissions.hardware) {
    try {
      const hardwareInfo = collectHardwareInfo();
      fingerprint.hardware_concurrency = hardwareInfo.hardware_concurrency;
      fingerprint.device_memory = hardwareInfo.device_memory;
    } catch (error) {
      console.error('Ошибка сбора аппаратных данных:', error);
    }
  }

  if (permissions.canvas) {
    try {
      fingerprint.canvas_fingerprint = await collectCanvasFingerprint();
    } catch (error) {
      console.error('Ошибка Canvas fingerprinting:', error);
    }
  }

  if (permissions.webgl) {
    try {
      const webglData = await collectWebGLFingerprint();
      fingerprint.webgl_vendor = webglData.vendor;
      fingerprint.webgl_renderer = webglData.renderer;
      fingerprint.webgl_fingerprint = webglData.fingerprint;
    } catch (error) {
      console.error('Ошибка WebGL fingerprinting:', error);
    }
  }

  if (permissions.audio) {
    try {
      fingerprint.audio_fingerprint = await collectAudioFingerprint();
    } catch (error) {
      console.error('Ошибка Audio fingerprinting:', error);
    }
  }

  return fingerprint;
}

/**
 * Парсинг User Agent для получения информации о браузере и ОС
 */
export function parseUserAgent(userAgent) {
  const ua = userAgent || navigator.userAgent;
  
  const browserInfo = {
    browser: 'Unknown',
    browserVersion: 'Unknown',
    os: 'Unknown',
    osVersion: 'Unknown'
  };

  // Определение браузера
  if (ua.includes('Chrome') && !ua.includes('Edg')) {
    browserInfo.browser = 'Chrome';
    const match = ua.match(/Chrome\/([0-9.]+)/);
    if (match) browserInfo.browserVersion = match[1];
  } else if (ua.includes('Firefox')) {
    browserInfo.browser = 'Firefox';
    const match = ua.match(/Firefox\/([0-9.]+)/);
    if (match) browserInfo.browserVersion = match[1];
  } else if (ua.includes('Safari') && !ua.includes('Chrome')) {
    browserInfo.browser = 'Safari';
    const match = ua.match(/Version\/([0-9.]+)/);
    if (match) browserInfo.browserVersion = match[1];
  } else if (ua.includes('Edg')) {
    browserInfo.browser = 'Edge';
    const match = ua.match(/Edg\/([0-9.]+)/);
    if (match) browserInfo.browserVersion = match[1];
  }

  // Определение ОС
  if (ua.includes('Windows NT')) {
    browserInfo.os = 'Windows';
    const match = ua.match(/Windows NT ([0-9.]+)/);
    if (match) {
      const version = match[1];
      if (version === '10.0') browserInfo.osVersion = '10';
      else if (version === '6.3') browserInfo.osVersion = '8.1';
      else if (version === '6.2') browserInfo.osVersion = '8';
      else if (version === '6.1') browserInfo.osVersion = '7';
      else browserInfo.osVersion = version;
    }
  } else if (ua.includes('Mac OS X')) {
    browserInfo.os = 'macOS';
    const match = ua.match(/Mac OS X ([0-9_]+)/);
    if (match) browserInfo.osVersion = match[1].replace(/_/g, '.');
  } else if (ua.includes('Linux')) {
    browserInfo.os = 'Linux';
  } else if (ua.includes('Android')) {
    browserInfo.os = 'Android';
    const match = ua.match(/Android ([0-9.]+)/);
    if (match) browserInfo.osVersion = match[1];
  } else if (ua.includes('iPhone OS') || ua.includes('iOS')) {
    browserInfo.os = 'iOS';
    const match = ua.match(/OS ([0-9_]+)/);
    if (match) browserInfo.osVersion = match[1].replace(/_/g, '.');
  }

  return browserInfo;
}

