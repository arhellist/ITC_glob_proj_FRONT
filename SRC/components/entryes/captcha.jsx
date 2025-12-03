import React, { useState, useEffect, useRef, useCallback } from 'react'; // Импорт React хуков для состояния, эффектов, рефов и колбэков
import './entryes.css'; // Импорт CSS стилей для компонента капчи

const Captcha = ({ onVerified, isVerified = false }) => { // Компонент капчи принимает колбэк верификации и состояние проверки
  const [isPuzzleSolved, setIsPuzzleSolved] = useState(false); // Состояние решения головоломки
  const [isDragging, setIsDragging] = useState(false); // Состояние перетаскивания элемента
  const [currentLeft, setCurrentLeft] = useState(0); // Текущая позиция по горизонтали
  const [currentTop, setCurrentTop] = useState(0); // Текущая позиция по вертикали
  const [targetPosition, setTargetPosition] = useState({ left: 0, top: 0 }); // Целевая позиция для размещения
  const [sliderValue, setSliderValue] = useState(0); // Значение слайдера для альтернативной капчи
  
  const puzzlePieceRef = useRef(null); // Реф для элемента головоломки
  const puzzleContainerRef = useRef(null); // Реф для контейнера головоломки
  const puzzleHoleRef = useRef(null); // Реф для отверстия в головоломке
  const startPosRef = useRef({ x: 0, y: 0 }); // Реф для начальной позиции перетаскивания
  const checkTimeoutRef = useRef(null); // Реф для таймаута проверки

  // Константы для размеров и параметров капчи
  const CONTAINER_WIDTH = 300; // Ширина контейнера капчи в пикселях
  const CONTAINER_HEIGHT = 150; // Высота контейнера капчи в пикселях
  const PIECE_SIZE = 40; // Размер элемента головоломки в пикселях
  const TOLERANCE = 15; // Допустимое отклонение для успешного размещения элемента

  // Генерируем случайную позицию для цели при монтировании
  useEffect(() => {
    const targetLeft = Math.floor(Math.random() * (CONTAINER_WIDTH - PIECE_SIZE));
    const targetTop = Math.floor(Math.random() * (CONTAINER_HEIGHT - PIECE_SIZE));
    setTargetPosition({ left: targetLeft, top: targetTop });
  }, []);

  // Проверка позиции пазла
  const checkPuzzlePosition = useCallback(() => {
    const pieceRect = puzzlePieceRef.current?.getBoundingClientRect();
    const holeRect = puzzleHoleRef.current?.getBoundingClientRect();
    
    if (!pieceRect || !holeRect) return;

    // Проверяем, находится ли пазл в целевой области
    const distance = Math.sqrt(
      Math.pow(pieceRect.left - holeRect.left, 2) + 
      Math.pow(pieceRect.top - holeRect.top, 2)
    );

    const isInTarget = distance <= TOLERANCE;
    
    if (isInTarget && !isPuzzleSolved) {
      setIsPuzzleSolved(true);
    } else if (!isInTarget && isPuzzleSolved) {
      setIsPuzzleSolved(false);
    }
  }, [isPuzzleSolved]);

  // Обработчики мыши
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = puzzlePieceRef.current.getBoundingClientRect();
    startPosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e) => {
    if (!isDragging) return;
    
    const containerRect = puzzleContainerRef.current.getBoundingClientRect();
    const newLeft = e.clientX - containerRect.left - startPosRef.current.x;
    const newTop = e.clientY - containerRect.top - startPosRef.current.y;
    
    // Ограничиваем движение в пределах контейнера
    const clampedLeft = Math.max(0, Math.min(newLeft, CONTAINER_WIDTH - PIECE_SIZE));
    const clampedTop = Math.max(0, Math.min(newTop, CONTAINER_HEIGHT - PIECE_SIZE));
    
    setCurrentLeft(clampedLeft);
    setCurrentTop(clampedTop);
    
    // Обновляем слайдер
    const sliderPos = (clampedLeft / (CONTAINER_WIDTH - PIECE_SIZE)) * 200;
    setSliderValue(sliderPos);
    
    // Отложенная проверка позиции
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(checkPuzzlePosition, 50);
  }, [isDragging, checkPuzzlePosition]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
      checkPuzzlePosition();
    }
  }, [isDragging, checkPuzzlePosition]);

  // Обработчик слайдера
  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value);
    const maxLeft = CONTAINER_WIDTH - PIECE_SIZE;
    const leftPosition = (value / 200) * maxLeft;
    
    setCurrentLeft(leftPosition);
    setSliderValue(value);
    
    // Отложенная проверка позиции
    if (checkTimeoutRef.current) clearTimeout(checkTimeoutRef.current);
    checkTimeoutRef.current = setTimeout(checkPuzzlePosition, 50);
  };

  // Обработчик кнопки проверки
  const handleVerify = () => {
    if (isPuzzleSolved && onVerified) {
      onVerified(true);
    }
  };

  // Добавляем глобальные обработчики мыши
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Очистка таймера при размонтировании
  useEffect(() => {
    return () => {
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current);
      }
    };
  }, []);

  if (isVerified) {
    return (
      <div className="captcha-container" style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: '16px' }}>
          ✓ Проверка пройдена!
        </div>
        <div style={{ color: '#666', marginTop: '10px' }}>
          Обнаружены признаки человечности!
        </div>
      </div>
    );
  }

  return (
    <div className="captcha-container">
      <h2>Пройдите тест на человечность</h2>
      <p>Перетащите кубик в выделенную область</p>
      
      <div className="puzzle-container" ref={puzzleContainerRef}>
        {/* Фоновое изображение */}
        <div className="puzzle-background gradient-border">
          <div 
            className="puzzle-hole" 
            ref={puzzleHoleRef}
            style={{
              left: `${targetPosition.left}px`,
              top: `${targetPosition.top}px`
            }}
          />
        </div>
        
        {/* Перетаскиваемый пазл */}
        <div 
          className={`puzzle-piece ${isPuzzleSolved ? 'puzzle-success' : ''} ${isDragging ? 'dragging' : ''}`}
          ref={puzzlePieceRef}
          style={{
            left: `${currentLeft}px`,
            top: `${currentTop}px`,
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
          onMouseDown={handleMouseDown}
        >
          <div className="puzzle-indicator">
            {isPuzzleSolved ? '✓' : '↔'}
          </div>
        </div>
        
        {/* Слайдер для точного позиционирования */}
        <div className="puzzle-slider-container">
          <input 
            type="range" 
            min="0" 
            max="200" 
            value={sliderValue}
            onChange={handleSliderChange}
            className="puzzle-slider"
          />
          <div className="slider-track" />
        </div>
      </div>
      
      {/* Кнопка проверки */}
      <button 
        className="verify-button button txt-white gradient-effect-bg gradient-effect-border bg-color-main"
        onClick={handleVerify}
        disabled={!isPuzzleSolved}
        
      >
        {isPuzzleSolved ? 'Проверить' : 'Перетащите кубик'}
      </button>
    </div>
  );
};

export default Captcha;