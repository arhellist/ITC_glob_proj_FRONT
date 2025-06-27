import DOMPurify from "dompurify";
import { checkAuth, login, registration, logout, getUser, getIsAuth  } from "./auth/store/store";

export const reCaptchaKeyAPI = `0x4AAAAAABhPbLKOR0CTGSnV`
// Очистка ROOT элемента
export const cleanRoot = (root) =>{
  const children = root.children;
  if (children.length > 0) {
    Array.from(children).forEach((child) => {
      child.classList.add("blur-active");

      setTimeout(() => {
        child.remove();
      }, 400);
    });
  } else {
    console.log(`root пустой, удалять нечего`)
  }
}
// функция закрытия меню
export const closeMenu = (root) => {
  if (root.classList.contains("blur-blur")) {
    root.classList.remove("blur-blur");
    root.classList.add("blur-active");

    const children = root.children;

    if (children.length > 0) {
      Array.from(children).forEach((child) => {
        child.classList.add("blur-active");

        setTimeout(() => {
          child.remove();
        }, 400);
      });
    }
  } else if (
    !root.classList.contains("blur-active") &&
    !root.classList.contains("blur-blur")
  ) {
    root.classList.add("blur-active");

    const children = root.children;

    if (children.length > 0) {
      Array.from(children).forEach((child) => {
        child.classList.add("blur-active");

        setTimeout(() => {
          child.remove();
        }, 400);
      });
    }
  }
};

// функция открытия меню
export const openMenu = (root) => {
  if (root.classList.contains("blur-active")) {
    root.classList.remove("blur-active");
    root.classList.add("blur-blur");
  } else if (
    !root.classList.contains("blur-blur") &&
    !root.classList.contains("blur-active")
  ) {
    root.classList.add("blur-blur");
  } else {
    console.log(`Ничего не произошло при открытии окна. Нет допустимых условий`);
  }
};

// Санитизация контегта
export const clearDOMPurify = (template) => {
  const clean = DOMPurify.sanitize(template, {
    ADD_ATTR: ["target", "class"], // Разрешенные дополнительные атрибуты
    ADD_TAGS: ["iframe"], // Разрешенные дополнительные теги
    FORBID_TAGS: ["style", "iframe"], // Запрещенные теги
    FORBID_ATTR: ["style", "onerror", "onclick", "form"], // Запрещенные атрибуты
    ALLOW_DATA_ATTR: true, // разрешение data-атрибутов
    SANITIZE_DOM: true, //дополнительная очистка DOM
    //RETURN_DOM: true,
  });
  return clean;
};

// Проверка авторизации
export const getAuth = async () => {
  console.log(`WELCOME getAuth`)
  try {
    await checkAuth();
  } catch (error) {
    console.error('Ошибка в checkAuth:', error.message);
  }
  
  const isAuth = getIsAuth();
  const user = getUser();
  
  return { isAuth, user };
};


// проверка QUERY параметров в запросе
export const getAllQueryParams = (url = window.location.href) => {
  const params = {};
  const searchParams = new URL(url).searchParams;
  
    // Проверка на наличие хотя бы одного параметра
    if (searchParams.toString().length === 0) {
      return null; // или return { isEmpty: true }
    }

  for (const [key, value] of searchParams.entries()) {
    if (params[key]) {
      params[key] = Array.isArray(params[key]) 
        ? [...params[key], value]
        : [params[key], value];
    } else {
      params[key] = value;
    }
  }
  
  return params;
}

// установка капчи
export const setCaptcha = (root) => {
const template = `
                  <div class="captcha-container">
                    <h2>Пройдите тест на человечность</h2>
                    <p>Перетащите кубик в выделенную область</p>
                    
                    <!-- Контейнер с изображением и пазлом -->
                    <div class="puzzle-container">
                      <!-- Фоновое изображение -->
                      <div class="puzzle-background">
                        <div class="puzzle-hole"></div>
                      </div>
                      
                      <!-- Перетаскиваемый пазл -->
                      <div class="puzzle-piece" draggable="true" id="puzzlePiece">
                        <div class="puzzle-indicator">↔</div>
                      </div>
                      
                      <!-- Слайдер для точного позиционирования -->
                      <div class="puzzle-slider-container">
                        <input type="range" id="puzzleSlider" min="0" max="200" value="0" class="puzzle-slider">
                        <div class="slider-track"></div>
                      </div>
                    </div>
                    
                    <!-- Кнопка проверки -->
                    <button id="verifyPuzzle" class="verify-button" disabled>Проверить</button>
                  </div>
`
const clean = clearDOMPurify(template);
root.insertAdjacentHTML('beforeend', clean);


  const puzzlePiece = document.getElementById('puzzlePiece');
  const puzzleSlider = document.getElementById('puzzleSlider');
  const verifyButton = document.getElementById('verifyPuzzle');
  const captchaVerified = document.getElementById('captchaVerified');
  const puzzleContainer = document.querySelector('.puzzle-container');
  const puzzleHole = document.querySelector('.puzzle-hole');
  
  let isPuzzleSolved = false;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let currentLeft = 0;
  let currentTop = 0;
  let checkTimeout = null;
  
  // Генерируем случайную позицию для ячейки по всему полю
  const containerWidth = 300;
  const containerHeight = 150;
  const holeWidth = 40;
  const holeHeight = 40;
  
  const targetLeft = Math.floor(Math.random() * (containerWidth - holeWidth));
  const targetTop = Math.floor(Math.random() * (containerHeight - holeHeight));
  
  // Устанавливаем случайную позицию ячейки
  puzzleHole.style.left = `${targetLeft}px`;
  puzzleHole.style.top = `${targetTop}px`;
  
  // Устанавливаем начальную позицию пазла (в левом верхнем углу)
  updatePuzzlePosition(0, 0);
  
  // Обработчик начала перетаскивания
  puzzlePiece.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = puzzlePiece.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    puzzlePiece.style.cursor = 'grabbing';
    puzzlePiece.classList.add('dragging');
    e.preventDefault();
  });
  
  // Оптимизированный обработчик движения мыши с throttling
  let lastMoveTime = 0;
  const throttleDelay = 16; // ~60fps
  
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    
    const now = Date.now();
    if (now - lastMoveTime < throttleDelay) return;
    lastMoveTime = now;
    
    const containerRect = puzzleContainer.getBoundingClientRect();
    const newLeft = e.clientX - containerRect.left - startX;
    const newTop = e.clientY - containerRect.top - startY;
    
    // Ограничиваем движение в пределах контейнера
    currentLeft = Math.max(0, Math.min(newLeft, containerWidth - 40));
    currentTop = Math.max(0, Math.min(newTop, containerHeight - 40));
    
    // Обновляем позицию пазла без проверки
    puzzlePiece.style.left = `${currentLeft}px`;
    puzzlePiece.style.top = `${currentTop}px`;
    
    // Отложенная проверка позиции
    if (checkTimeout) clearTimeout(checkTimeout);
    checkTimeout = setTimeout(checkPuzzlePosition, 50);
  });
  
  // Обработчик окончания перетаскивания
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      puzzlePiece.style.cursor = 'grab';
      puzzlePiece.classList.remove('dragging');
      
      // Финальная проверка позиции
      if (checkTimeout) clearTimeout(checkTimeout);
      checkPuzzlePosition();
    }
  });
  
  // Обработчик слайдера (теперь только для горизонтального движения)
  puzzleSlider.addEventListener('input', (e) => {
    const value = parseInt(e.target.value);
    const maxLeft = containerWidth - 40;
    const leftPosition = (value / 200) * maxLeft;
    
    currentLeft = leftPosition;
    puzzlePiece.style.left = `${leftPosition}px`;
    
    // Отложенная проверка позиции
    if (checkTimeout) clearTimeout(checkTimeout);
    checkTimeout = setTimeout(checkPuzzlePosition, 50);
  });
  
  // Оптимизированная функция проверки позиции пазла
  function checkPuzzlePosition() {
    const pieceRect = puzzlePiece.getBoundingClientRect();
    const holeRect = puzzleHole.getBoundingClientRect();
    
    // Проверяем, пересекаются ли пазл и ячейка
    const isOverlapping = !(pieceRect.right < holeRect.left || 
                           pieceRect.left > holeRect.right || 
                           pieceRect.bottom < holeRect.top || 
                           pieceRect.top > holeRect.bottom);
    
    if (isOverlapping) {
      if (!isPuzzleSolved) {
        isPuzzleSolved = true;
        verifyButton.disabled = false;
        puzzlePiece.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        puzzlePiece.classList.add('puzzle-success');
        
        // Показываем успешное сообщение
        setTimeout(() => {
          puzzlePiece.innerHTML = '<div class="puzzle-indicator">✓</div>';
        }, 300);
      }
    } else {
      if (isPuzzleSolved) {
        isPuzzleSolved = false;
        verifyButton.disabled = true;
        puzzlePiece.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        puzzlePiece.classList.remove('puzzle-success');
        puzzlePiece.innerHTML = '<div class="puzzle-indicator">↔</div>';
      }
    }
  }
  
  // Обработчик кнопки проверки
  verifyButton.addEventListener('click', () => {
    if (isPuzzleSolved) {
      captchaVerified.value = '1';
      verifyButton.textContent = '✓ Проверено';
      verifyButton.style.background = '#4CAF50';
      verifyButton.disabled = true;
      
      // Скрываем контейнер капчи
      setTimeout(() => {
        document.querySelector('.captcha-container').style.display = 'none';
      }, 1500);

      // Показываем успешное сообщение
      const container = document.querySelector('.captcha-container');
      const successMsg = document.createElement('div');
      successMsg.style.cssText = `
        color: #4CAF50;
        font-weight: bold;
        margin-top: 10px;
        animation: fadeIn 0.5s ease-in;
      `;
      successMsg.textContent = 'Обнаружены признаки человечности!';
      container.appendChild(successMsg);
    }
  });
  
  // Функция обновления позиции пазла
  function updatePuzzlePosition(left, top) {
    currentLeft = left;
    currentTop = top;
    puzzlePiece.style.left = `${left}px`;
    puzzlePiece.style.top = `${top}px`;
  }
  
  // Добавляем CSS анимацию
  const style = document.createElement('style');
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
};

