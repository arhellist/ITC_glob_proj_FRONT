# ITC Ecosystem Frontend

Современное фронтенд приложение для ITC Ecosystem, построенное с использованием Vite и современных веб-технологий.

## 🚀 Реализованный функционал

### 🔐 Система аутентификации
- **Регистрация пользователей** с валидацией данных
- **Вход в систему** с проверкой учетных данных
- **JWT токены** для безопасной аутентификации
- **CSRF защита** для предотвращения межсайтовых запросов
- **Автоматическое обновление токенов** через refresh token
- **Защита от несанкционированного доступа**

### 🧩 Капча и безопасность
- **Кастомная капча-пазл** с перетаскиванием элементов
- **Cloudflare Turnstile** для дополнительной защиты
- **Валидация на стороне клиента** и сервера
- **Защита от ботов** и автоматизированных атак

### 🎨 Пользовательский интерфейс
- **Адаптивный дизайн** для всех устройств
- **Анимированные переходы** и эффекты
- **Интерактивные элементы** с плавными анимациями
- **Современный UI/UX** с использованием CSS Grid и Flexbox
- **Темная тема** с градиентными эффектами

### 📊 Визуализация данных
- **Японские свечи (Candlesticks)** для отображения финансовых данных
- **Интерактивный график** с возможностью масштабирования
- **Реальные данные** через Alpha Vantage API
- **Анимация в реальном времени**

## 🛡️ Анализ безопасности

### ✅ Реализованные меры безопасности

#### 1. **Защита от XSS атак**
- Использование **DOMPurify** для санитизации HTML
- Запрет опасных тегов и атрибутов
- Валидация всех пользовательских данных

#### 2. **CSRF защита**
- Генерация уникальных CSRF токенов
- Проверка токенов на сервере
- Автоматическое добавление токенов в запросы

#### 3. **JWT токены**
- Безопасное хранение в localStorage
- Автоматическое обновление через refresh token
- Защита от кражи токенов

#### 4. **Валидация данных**
- Проверка на стороне клиента и сервера
- Санитизация всех входных данных
- Защита от инъекций

#### 5. **Капча и защита от ботов**
- Кастомная капча-пазл
- Cloudflare Turnstile
- Множественные уровни защиты

### 🔍 Аудит безопасности

#### ✅ **Безопасные элементы:**
- Отсутствие открытых API ключей в коде
- Нет логирования паролей или чувствительных данных
- Отсутствие опасных функций (eval, Function, atob)
- Использование только доверенных внешних сервисов
- HTTPS протокол для всех запросов

## 📦 Установка и запуск

### Установка зависимостей
```bash
npm install
```

### Разработка
```bash
npm run dev
```

### Сборка для продакшена
```bash
npm run build
npm run build:prod
```

### Предварительный просмотр
```bash
npm run preview
npm run preview:prod
```

## 🏗️ Архитектура проекта

```
├── SRC/
│   ├── JAVASCRIPT/
│   │   ├── MODULES/
│   │   │   ├── auth/                    # Модуль аутентификации
│   │   │   │   ├── http/               # HTTP клиенты
│   │   │   │   ├── services/           # Сервисы аутентификации
│   │   │   │   └── store/              # Управление состоянием
│   │   │   ├── pages/                  # Страницы приложения
│   │   │   ├── utils.js                # Утилиты и хелперы
│   │   │   └── JapaneseCandlesticks.js # Визуализация графиков
│   │   └── index.js                    # Точка входа
│   └── CSS/
│       ├── index.css                   # Основные стили
│       └── notifications.css           # Стили уведомлений
├── dist/                               # Собранные файлы
├── index.html                          # Главная страница
├── vite.config.js                      # Конфигурация Vite (dev)
├── vite.config.prod.js                 # Конфигурация Vite (prod)
└── package.json                        # Зависимости и скрипты
```

## ⚙️ Конфигурация

### Переменные окружения
```bash
__API_URL__=https://arhellist.ru
__IS_PRODUCTION__=true
__ALPHA_VANTAGE_API_KEY__=your_api_key
__RECAPTCHA_API_KEY__=your_recaptcha_key
```

## 📚 Зависимости

- **Vite** - современный сборщик
- **Axios** - HTTP клиент
- **DOMPurify** - санитизация HTML
- **ESLint** - линтер для качества кода

## 🚀 Скрипты

```bash
npm run dev              # Запуск сервера разработки
npm run build            # Сборка для продакшена
npm run build:prod       # Сборка с production настройками
npm run preview          # Предварительный просмотр
npm run preview:prod     # Просмотр production сборки
```

## 🔧 Технические особенности

### Производительность
- **Code splitting** - разделение кода на чанки
- **Tree shaking** - удаление неиспользуемого кода
- **Minification** - минификация CSS и JS
- **Lazy loading** - отложенная загрузка модулей

### Безопасность
- **Content Security Policy** - политика безопасности контента
- **HTTPS only** - принудительное использование HTTPS
- **Secure headers** - безопасные HTTP заголовки
- **Input validation** - валидация всех входных данных

---

**Версия:** 1.0.0  
**Последнее обновление:** Июль 2025  
**Статус безопасности:** ✅ Безопасен 