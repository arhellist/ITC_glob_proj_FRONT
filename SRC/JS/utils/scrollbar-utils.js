/**
 * Утилиты для улучшения функциональности скролл-баров
 */

// Добавляет обработчики для улучшения взаимодействия со скролл-барами
export function enhanceScrollbars() {
  // Добавляем обработчики для всех элементов с скроллом
  const scrollableElements = document.querySelectorAll(
    '[style*="overflow"], .admin-scrollable, .user-scrollable, .admin-dashboard-users-list-container-table-items'
  );
  
  scrollableElements.forEach(element => {
    enhanceScrollbarElement(element);
  });
}

// Улучшает конкретный элемент со скроллом
function enhanceScrollbarElement(element) {
  // Добавляем плавную прокрутку
  element.style.scrollBehavior = 'smooth';
  
  // Проверяем, не является ли это админ-панелью
  const isAdminPanel = element.classList.contains('admin-dashboard-users-list-container-table-items');
  
  // Для админ-панели не добавляем обработчики wheel, чтобы не мешать скролл-бару
  if (!isAdminPanel) {
    // Добавляем обработчики для мыши (колесо) только для не-админ элементов
    element.addEventListener('wheel', handleWheelScroll, { passive: false });
  }
  
  // Добавляем обработчики для клавиатуры (всегда)
  element.addEventListener('keydown', handleKeyboardScroll);
  
  // Добавляем обработчики для тач-событий (мобильные устройства)
  element.addEventListener('touchstart', handleTouchStart, { passive: true });
  element.addEventListener('touchmove', handleTouchMove, { passive: false });
  
  // Добавляем класс для стилизации
  if (!element.classList.contains('admin-scrollable') && !element.classList.contains('user-scrollable')) {
    element.classList.add('user-scrollable');
  }
}

// Обработчик клавиатуры для прокрутки
function handleKeyboardScroll(event) {
  const element = event.target;
  const scrollAmount = 50; // пикселей за раз
  
  switch(event.key) {
    case 'ArrowUp':
      event.preventDefault();
      element.scrollBy(0, -scrollAmount);
      break;
    case 'ArrowDown':
      event.preventDefault();
      element.scrollBy(0, scrollAmount);
      break;
    case 'ArrowLeft':
      event.preventDefault();
      element.scrollBy(-scrollAmount, 0);
      break;
    case 'ArrowRight':
      event.preventDefault();
      element.scrollBy(scrollAmount, 0);
      break;
    case 'Home':
      event.preventDefault();
      element.scrollTo(0, 0);
      break;
    case 'End':
      event.preventDefault();
      element.scrollTo(0, element.scrollHeight);
      break;
    case 'PageUp':
      event.preventDefault();
      element.scrollBy(0, -element.clientHeight * 0.8);
      break;
    case 'PageDown':
      event.preventDefault();
      element.scrollBy(0, element.clientHeight * 0.8);
      break;
  }
}

// Обработчик колеса мыши с улучшенной прокруткой
function handleWheelScroll(event) {
  const element = event.target;
  
  // Увеличиваем скорость прокрутки
  const scrollMultiplier = 2;
  
  // Прокрутка по горизонтали при зажатом Shift
  if (event.shiftKey) {
    event.preventDefault();
    element.scrollBy(event.deltaY * scrollMultiplier, 0);
  } else {
    // Обычная вертикальная прокрутка
    element.scrollBy(0, event.deltaY * scrollMultiplier);
  }
}

// Обработчики для тач-событий
let touchStartY = 0;
let touchStartX = 0;

function handleTouchStart(event) {
  touchStartY = event.touches[0].clientY;
  touchStartX = event.touches[0].clientX;
}

function handleTouchMove(event) {
  const element = event.target;
  const touchY = event.touches[0].clientY;
  const touchX = event.touches[0].clientX;
  
  const deltaY = touchStartY - touchY;
  const deltaX = touchStartX - touchX;
  
  // Если движение больше по вертикали, прокручиваем вертикально
  if (Math.abs(deltaY) > Math.abs(deltaX)) {
    event.preventDefault();
    element.scrollBy(0, deltaY * 2);
  } else {
    // Иначе прокручиваем горизонтально
    event.preventDefault();
    element.scrollBy(deltaX * 2, 0);
  }
  
  touchStartY = touchY;
  touchStartX = touchX;
}

// Функция для программной прокрутки к элементу
export function scrollToElement(container, targetElement, offset = 0) {
  if (!container || !targetElement) return;
  
  const containerRect = container.getBoundingClientRect();
  const targetRect = targetElement.getBoundingClientRect();
  
  const scrollTop = container.scrollTop + (targetRect.top - containerRect.top) - offset;
  
  container.scrollTo({
    top: scrollTop,
    behavior: 'smooth'
  });
}

// Функция для прокрутки к началу
export function scrollToTop(element) {
  if (!element) return;
  
  element.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

// Функция для прокрутки к концу
export function scrollToBottom(element) {
  if (!element) return;
  
  element.scrollTo({
    top: element.scrollHeight,
    behavior: 'smooth'
  });
}

// Функция для проверки, находится ли элемент в видимой области
export function isElementVisible(element) {
  if (!element) return false;
  
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
}

// Функция для принудительного включения стандартного поведения скролл-бара
function forceNativeScrollbar(element) {
  if (!element) return;
  
  // Убираем все кастомные обработчики
  element.removeEventListener('wheel', handleWheelScroll);
  element.removeEventListener('keydown', handleKeyboardScroll);
  element.removeEventListener('touchstart', handleTouchStart);
  element.removeEventListener('touchmove', handleTouchMove);
  
  // Устанавливаем стандартное поведение
  element.style.scrollBehavior = 'auto';
  
  // Добавляем класс для нативного скролл-бара
  element.classList.add('native-scrollbar');
  
  console.log('Принудительно включен нативный скролл-бар для элемента:', element.className);
}

// Автоматическая инициализация при загрузке DOM
if (typeof window !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    enhanceScrollbars();
    
    // Принудительно включаем нативный скролл-бар для админ-панели
    setTimeout(() => {
      const adminScrollable = document.querySelector('.admin-dashboard-users-list-container-table-items');
      if (adminScrollable) {
        forceNativeScrollbar(adminScrollable);
      }
    }, 500);
  });
  
  // Также применяем при изменении содержимого (для динамических элементов)
  const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const scrollableElements = node.querySelectorAll(
                  '[style*="overflow"], .admin-scrollable, .user-scrollable, .admin-dashboard-users-list-container-table-items'
                );
                scrollableElements.forEach(enhanceScrollbarElement);
                
                // Если сам узел скроллируемый
                if (node.style.overflow || 
                    node.classList.contains('admin-scrollable') || 
                    node.classList.contains('user-scrollable') ||
                    node.classList.contains('admin-dashboard-users-list-container-table-items')) {
                  enhanceScrollbarElement(node);
                }
              }
            });
          }
        });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
