/**
 * Утилиты для работы с часовыми поясами на фронтенде
 */

// Маппинг городов России на часовые пояса (такой же как в backend)
const RUSSIAN_CITIES_TIMEZONES = {
  // Московское время (UTC+3)
  'москва': 'Europe/Moscow',
  'санкт-петербург': 'Europe/Moscow',
  'нижний новгород': 'Europe/Moscow',
  'казань': 'Europe/Moscow',
  'ростов-на-дону': 'Europe/Moscow',
  'краснодар': 'Europe/Moscow',
  'сочи': 'Europe/Moscow',
  'воронеж': 'Europe/Moscow',
  'тула': 'Europe/Moscow',
  'брянск': 'Europe/Moscow',
  'калуга': 'Europe/Moscow',
  'орёл': 'Europe/Moscow',
  'курск': 'Europe/Moscow',
  'белгород': 'Europe/Moscow',
  'липецк': 'Europe/Moscow',
  'тамбов': 'Europe/Moscow',
  'рязань': 'Europe/Moscow',
  'владимир': 'Europe/Moscow',
  'иваново': 'Europe/Moscow',
  'кострома': 'Europe/Moscow',
  'ярославль': 'Europe/Moscow',
  'тверь': 'Europe/Moscow',
  'смоленск': 'Europe/Moscow',
  'калининград': 'Europe/Kaliningrad',
  
  // Самарское время (UTC+4)
  'самара': 'Europe/Samara',
  'саратов': 'Europe/Samara',
  'волгоград': 'Europe/Samara',
  'астрахань': 'Europe/Samara',
  'пенза': 'Europe/Samara',
  'ульяновск': 'Europe/Samara',
  'чебоксары': 'Europe/Samara',
  'йошкар-ола': 'Europe/Samara',
  'оренбург': 'Europe/Samara',
  
  // Екатеринбургское время (UTC+5)
  'екатеринбург': 'Asia/Yekaterinburg',
  'челябинск': 'Asia/Yekaterinburg',
  'пермь': 'Asia/Yekaterinburg',
  'уфа': 'Asia/Yekaterinburg',
  'курган': 'Asia/Yekaterinburg',
  'тюмень': 'Asia/Yekaterinburg',
  
  // Омское время (UTC+6)
  'омск': 'Asia/Omsk',
  'новосибирск': 'Asia/Omsk',
  'барнаул': 'Asia/Omsk',
  'кемерово': 'Asia/Omsk',
  'томск': 'Asia/Omsk',
  'новокузнецк': 'Asia/Omsk',
  
  // Красноярское время (UTC+7)
  'красноярск': 'Asia/Krasnoyarsk',
  'иркутск': 'Asia/Krasnoyarsk',
  'кызыл': 'Asia/Krasnoyarsk',
  'абакан': 'Asia/Krasnoyarsk',
  'братск': 'Asia/Krasnoyarsk',
  
  // Якутское время (UTC+9)
  'якутск': 'Asia/Yakutsk',
  'благовещенск': 'Asia/Yakutsk',
  'чита': 'Asia/Yakutsk',
  
  // Владивостокское время (UTC+10)
  'владивосток': 'Asia/Vladivostok',
  'хабаровск': 'Asia/Vladivostok',
  'южно-сахалинск': 'Asia/Vladivostok',
  'магадан': 'Asia/Vladivostok',
  
  // Магаданское время (UTC+11)
  'петропавловск-камчатский': 'Asia/Kamchatka',
  'анадырь': 'Asia/Kamchatka'
};

/**
 * Извлекает город из строки geography
 * @param {string} geography - Строка с местоположением (например, "Россия, Саратов")
 * @returns {string} - Название города в нижнем регистре
 */
export function extractCityFromGeography(geography) {
  if (!geography || typeof geography !== 'string') {
    return null;
  }
  
  // Убираем лишние пробелы и приводим к нижнему регистру
  const cleanGeography = geography.toLowerCase().trim();
  
  // Ищем город после запятой или в конце строки
  const parts = cleanGeography.split(',');
  
  if (parts.length >= 2) {
    // Если есть запятая, берем последнюю часть (город)
    const city = parts[parts.length - 1].trim();
    return city;
  } else {
    // Если нет запятой, возможно это просто город
    return cleanGeography;
  }
}

/**
 * Определяет часовой пояс по городу
 * @param {string} geography - Строка с местоположением
 * @returns {string} - Часовой пояс в формате IANA (например, "Europe/Moscow")
 */
export function getTimezoneByGeography(geography) {
  const city = extractCityFromGeography(geography);
  
  if (!city) {
    // По умолчанию используем московское время
    return 'Europe/Moscow';
  }
  
  // Ищем точное совпадение
  if (RUSSIAN_CITIES_TIMEZONES[city]) {
    return RUSSIAN_CITIES_TIMEZONES[city];
  }
  
  // Ищем частичное совпадение (для случаев типа "саратовская область, саратов")
  for (const [cityName, timezone] of Object.entries(RUSSIAN_CITIES_TIMEZONES)) {
    if (city.includes(cityName) || cityName.includes(city)) {
      return timezone;
    }
  }
  
  // Если не найдено, возвращаем московское время по умолчанию
  console.log(`⚠️ Часовой пояс для города "${city}" не найден, используется Москва`);
  return 'Europe/Moscow';
}

/**
 * Получает текущее время в указанном часовом поясе
 * @param {string} timezone - Часовой пояс в формате IANA
 * @returns {Date} - Текущая дата и время в указанном часовом поясе
 */
export function getCurrentTimeInTimezone(timezone) {
  const now = new Date();
  
  // Создаем объект Intl.DateTimeFormat для указанного часового пояса
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  // Получаем отформатированную дату
  const parts = formatter.formatToParts(now);
  
  // Собираем дату обратно
  const year = parts.find(part => part.type === 'year').value;
  const month = parts.find(part => part.type === 'month').value;
  const day = parts.find(part => part.type === 'day').value;
  const hour = parts.find(part => part.type === 'hour').value;
  const minute = parts.find(part => part.type === 'minute').value;
  const second = parts.find(part => part.type === 'second').value;
  
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
}

/**
 * Проверяет, истекла ли дата с учетом часового пояса менеджера
 * @param {Date} dueDate - Дата истечения задачи
 * @param {string} managerGeography - Местоположение менеджера
 * @returns {boolean} - true если задача просрочена
 */
export function isTaskOverdueInManagerTimezone(dueDate, managerGeography) {
  if (!dueDate) {
    return false;
  }
  
  const timezone = getTimezoneByGeography(managerGeography);
  const currentTimeInManagerTimezone = getCurrentTimeInTimezone(timezone);
  
  // Сравниваем даты
  const dueDateObj = new Date(dueDate);
  
  return dueDateObj < currentTimeInManagerTimezone;
}

export default {
  extractCityFromGeography,
  getTimezoneByGeography,
  getCurrentTimeInTimezone,
  isTaskOverdueInManagerTimezone,
  RUSSIAN_CITIES_TIMEZONES
};
