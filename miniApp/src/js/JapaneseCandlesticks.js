// Конфигурация
const API_KEY = 'UWUBU4TP23E69XEF';
const SYMBOL = 'USD';
const CANDLES_TO_DISPLAY = 120; // Количество отображаемых свечей

// Элементы DOM
const canvas = document.getElementById('candlesCanvas');
const ctx = canvas.getContext('2d');
const symbolElement = document.getElementById('symbol');

// Настройки графика
const config = {
    candleWidth: 12,
    wickWidth: 2,
    gap: 4,
    speed: 0.6,
    colors: {
        up: '#A3CEC2',
        down: '#001F1D',
        wick: '#1C8475',
        grid: 'rgba(0, 0, 0, 0)',
        bg: 'rgb(255, 255, 255)'
    }
};

// Данные
let candles = [];
let historicalData = [];
let animationFrameId = null;
let minPrice = Infinity;
let maxPrice = -Infinity;
let scale = 1;
let offsetY = 0;
const padding = 40; // Отступ от краев канваса

// Инициализация
function init() {
    resizeCanvas();
    fetchDataAndAnimate();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('beforeunload', cleanup);
}

// Получение данных
async function fetchDataAndAnimate() {
    try {
        const data = await fetchStockData();
        if (!data || data.length === 0) {
            generateRandomData();
        } else {
            historicalData = data;
            processHistoricalData();
        }
        animate();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        generateRandomData();
        animate();
    }
}

// Загрузка данных с API
async function fetchStockData() {
    console.log(`fetchStockData to start`)
    try {
        const response = await fetch(
            `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${SYMBOL}&apikey=${API_KEY}`
        );
        
        if (!response.ok) throw new Error('Network error');
        
        console.log(`response`);console.log(response);


        const data = await response.json();
        console.log('Raw API Response:', data);


        const timeSeries = data['Time Series (Daily)'];
        
        if (!timeSeries) return null;
        
        // Сортировка данных по дате (от старых к новым)
        return Object.keys(timeSeries)
            .sort()
            .map(date => ({
                date,
                open: parseFloat(timeSeries[date]['1. open']),
                high: parseFloat(timeSeries[date]['2. high']),
                low: parseFloat(timeSeries[date]['3. low']),
                close: parseFloat(timeSeries[date]['4. close'])
            }));
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        return null;
    }
}

// Обработка исторических данных
function processHistoricalData() {
    candles = [];
    minPrice = Infinity;
    maxPrice = -Infinity;
    
    // Берем последние N свечей для отображения
    const startIndex = Math.max(0, historicalData.length - CANDLES_TO_DISPLAY);
    const displayData = historicalData.slice(startIndex);
    
    // Рассчитываем min/max для масштабирования
    displayData.forEach(day => {
        if (day.low < minPrice) minPrice = day.low;
        if (day.high > maxPrice) maxPrice = day.high;
    });
    
    // Создаем свечи для отображения
    displayData.forEach((day, index) => {
        candles.push({
            x: index * (config.candleWidth + config.gap),
            open: day.open,
            close: day.close,
            high: day.high,
            low: day.low,
            width: config.candleWidth,
            date: day.date
        });
    });
    
    
}

// Генерация случайных данных
function generateRandomData() {
    candles = [];
    minPrice = 10000;
    maxPrice = 30000;
    let currentPrice = 20000;
    
    for (let i = 0; i < CANDLES_TO_DISPLAY; i++) {
        const changePercent = (Math.random() - 0.5) * 0.03;
        const newPrice = currentPrice * (1 + changePercent);
        const high = Math.max(currentPrice, newPrice) * (1 + Math.random() * 0.01);
        const low = Math.min(currentPrice, newPrice) * (1 - Math.random() * 0.01);
        
        candles.push({
            x: i * (config.candleWidth + config.gap),
            open: currentPrice,
            close: newPrice,
            high: high,
            low: low,
            width: config.candleWidth,
            date: `Day ${i+1}`
        });
        
        currentPrice = newPrice;
    }
    
    
}

// Размеры canvas
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

// Функция обновления масштаба и смещения
function updateScaleAndOffset() {
    if (candles.length === 0) return;
    
    // Находим минимальную и максимальную цены
    minPrice = Math.min(...candles.map(c => c.low));
    maxPrice = Math.max(...candles.map(c => c.high));
    
    // Добавляем небольшой отступ сверху и снизу
    const priceRange = maxPrice - minPrice;
    const paddedMin = minPrice - priceRange * 0.1;
    const paddedMax = maxPrice + priceRange * 0.1;
    
    // Вычисляем масштаб с учетом высоты канваса и отступов
    const availableHeight = canvas.height - (2 * padding);
    scale = availableHeight / (paddedMax - paddedMin);
    
    // Вычисляем смещение по вертикали
    offsetY = canvas.height - padding;
}

// Отрисовка свечи
function drawCandle(candle) {
    // Масштабирование цен с учетом смещения
    const openY = offsetY - (candle.open - minPrice) * scale;
    const closeY = offsetY - (candle.close - minPrice) * scale;
    const highY = offsetY - (candle.high - minPrice) * scale;
    const lowY = offsetY - (candle.low - minPrice) * scale;
    
    // Фитиль
    ctx.strokeStyle = config.colors.wick;
    ctx.lineWidth = config.wickWidth;
    ctx.beginPath();
    ctx.moveTo(candle.x + candle.width/2, highY);
    ctx.lineTo(candle.x + candle.width/2, lowY);
    ctx.stroke();
    
    // Тело свечи
    const isUp = candle.close >= candle.open;
    ctx.fillStyle = isUp ? config.colors.up : config.colors.down;
    
    const candleTop = Math.min(openY, closeY);
    const candleHeight = Math.max(1, Math.abs(openY - closeY));
    
    ctx.fillRect(
        candle.x,
        candleTop,
        candle.width,
        candleHeight
    );
}

// Анимация
function animate() {
    try {
        // Очистка с прозрачностью
        ctx.fillStyle = config.colors.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Обновляем масштаб перед отрисовкой
        updateScaleAndOffset();
        
        // Отрисовка сетки
        ctx.strokeStyle = config.colors.grid;
        ctx.lineWidth = 1;
        
        // Горизонтальные линии с учетом масштаба
        const levels = 5;
        const priceStep = (maxPrice - minPrice) / levels;
        
        for (let i = 0; i <= levels; i++) {
            const price = minPrice + priceStep * i;
            const y = offsetY - (price - minPrice) * scale;
            
            // Рисуем линию
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
            
            // Удаляем отображение цен
            // ctx.fillStyle = '#666';
            // ctx.font = '10px Arial';
            // ctx.fillText(price.toFixed(2), 5, y - 5);
        }
        
        // Обновление и отрисовка свечей
        candles.forEach(candle => {
            candle.x -= config.speed;
            drawCandle(candle);
        });
        
        // Удаление вышедших за границу свечей
        if (candles.length > 0 && candles[0].x + config.candleWidth < 0) {
            candles.shift();
            
            // Добавление новой свечи справа
            const lastCandle = candles[candles.length - 1];
            const newX = lastCandle.x + config.candleWidth + config.gap;
            
            // Если есть исторические данные, берем следующую
            if (historicalData.length > 0) {
                const nextIndex = (historicalData.findIndex(d => d.date === lastCandle.date) + 1) % historicalData.length;
                const nextDay = historicalData[nextIndex];
                
                candles.push({
                    x: newX,
                    open: nextDay.open,
                    close: nextDay.close,
                    high: nextDay.high,
                    low: nextDay.low,
                    width: config.candleWidth,
                    date: nextDay.date
                });
            } else {
                // Генерация случайной свечи
                const lastPrice = lastCandle.close;
                const changePercent = (Math.random() - 0.5) * 0.03;
                const newPrice = lastPrice * (1 + changePercent);
                const high = Math.max(lastPrice, newPrice) * (1 + Math.random() * 0.01);
                const low = Math.min(lastPrice, newPrice) * (1 - Math.random() * 0.01);
                
                candles.push({
                    x: newX,
                    open: lastPrice,
                    close: newPrice,
                    high: high,
                    low: low,
                    width: config.candleWidth,
                    
                });
            }
        }
        
        animationFrameId = requestAnimationFrame(animate);
    } catch (error) {
        console.error('Ошибка анимации:', error);
        cancelAnimation();
    }
}

// Очистка
function cleanup() {
    cancelAnimation();
    window.removeEventListener('resize', resizeCanvas);
}

function cancelAnimation() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
}

// Запуск приложения
init();