# Production Build Instructions

## Конфигурация для Production

Создан отдельный файл конфигурации `vite.config.prod.js` для production сборки с доменом `https://arhellist.ru`.

## Команды для сборки

### Development (локальная разработка)
```bash
npm run dev
```
- Использует `vite.config.js`
- API URL: `http://localhost:3000`
- Порт: `5173`
- Переменные окружения: `__IS_PRODUCTION__: false`

### Production Build
```bash
npm run build:prod
```
- Использует `vite.config.prod.js`
- API URL: `https://arhellist.ru`
- Оптимизированная сборка
- Переменные окружения: `__IS_PRODUCTION__: true`

### Production Preview
```bash
npm run preview:prod
```
- Предварительный просмотр production сборки
- Порт: `4173`
- API URL: `https://arhellist.ru`

## Переменные окружения

### Development
- `__API_URL__`: `http://localhost:3000`
- `__IS_PRODUCTION__`: `false`
- `__DOMAIN__`: `localhost`

### Production
- `__API_URL__`: `https://arhellist.ru`
- `__IS_PRODUCTION__`: `true`
- `__DOMAIN__`: `arhellist.ru`

## Конфигурация axios

Axios автоматически определяет правильный API URL на основе переменных окружения:

```javascript
const url = typeof __API_URL__ !== 'undefined' ? __API_URL__ : 
           (typeof __IS_PRODUCTION__ !== 'undefined' && __IS_PRODUCTION__ ? 'https://arhellist.ru' : 'http://localhost:3000');
```

## Особенности Production сборки

1. **Console.log сохранены** - для отладки в production
2. **Оптимизированная минификация** - с сохранением важных функций
3. **HTTPS прокси** - для безопасного соединения с API
4. **Отключены source maps** - для безопасности

## Развертывание

1. Выполните сборку: `npm run build:prod`
2. Загрузите содержимое папки `dist/` на ваш сервер
3. Настройте сервер для обработки SPA (Single Page Application)

## Проверка

После развертывания проверьте:
- Консоль браузера на наличие ошибок
- Работу API запросов к `https://arhellist.ru`
- Сохранение console.log в production
- Логи конфигурации axios в консоли 