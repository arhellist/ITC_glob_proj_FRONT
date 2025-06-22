# ITC Ecosystem Frontend

Фронтенд приложение для ITC Ecosystem, построенное с использованием Vite.

## Установка

1. Установите зависимости:
```bash
npm install
```

## Разработка

Запустите сервер разработки:
```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:5173

## Сборка

Для сборки проекта для продакшена:
```bash
npm run build
```

Собранные файлы будут в папке `dist/`.

## Предварительный просмотр сборки

Для просмотра собранного проекта:
```bash
npm run preview
```

## Структура проекта

```
├── SRC/
│   ├── JAVASCRIPT/
│   │   ├── MODULES/
│   │   │   ├── auth/
│   │   │   │   ├── http/
│   │   │   │   ├── services/
│   │   │   │   └── store/
│   │   │   ├── pages/
│   │   │   └── utils.js
│   │   └── index.js
│   └── CSS/
│       └── index.css
├── index.html
├── vite.config.js
├── package.json
└── README.md
```

## Настройки

### Проксирование API

В `vite.config.js` настроено проксирование API запросов на бэкенд:
- `/auth/*` → `http://localhost:3000`
- `/api/*` → `http://localhost:3000`

### Алиасы путей

Настроены алиасы для удобства импортов:
- `@` → `/SRC/JAVASCRIPT`
- `@modules` → `/SRC/JAVASCRIPT/MODULES`
- `@auth` → `/SRC/JAVASCRIPT/MODULES/auth`
- `@pages` → `/SRC/JAVASCRIPT/MODULES/pages`
- `@utils` → `/SRC/JAVASCRIPT/MODULES/utils`

## Зависимости

- **Vite** - сборщик и сервер разработки
- **Axios** - HTTP клиент для API запросов

## Скрипты

- `npm run dev` - запуск сервера разработки
- `npm run build` - сборка для продакшена
- `npm run preview` - предварительный просмотр сборки
- `npm run serve` - запуск сервера для просмотра сборки на порту 4173 