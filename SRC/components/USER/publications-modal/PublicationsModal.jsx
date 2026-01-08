import React, { useState, useEffect, useRef, useCallback } from 'react';
import axiosAPI from '../../../JS/auth/http/axios';
import { API_CONFIG } from '../../../config/api.js';
import './PublicationsModal.css';

/**
 * Модальное окно публикаций (как в Telegram Stories)
 */
const PublicationsModal = ({ onClose }) => {
  const [publications, setPublications] = useState([]);
  const [selectedPublication, setSelectedPublication] = useState(null);
  const [selectedPublicationIndex, setSelectedPublicationIndex] = useState(0);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mediaBlobs, setMediaBlobs] = useState({}); // Кэш blob URLs для медиа-файлов
  const storiesBarRef = useRef(null);
  const storiesDragRef = useRef({ isDown: false, startX: 0, scrollLeft: 0, hasMoved: false, startTime: 0 });
  const loadingBlobsRef = useRef(new Set()); // Отслеживание загружаемых blob URLs
  const [isStoriesDragging, setIsStoriesDragging] = useState(false);
  const [canScrollStoriesLeft, setCanScrollStoriesLeft] = useState(false);
  const [canScrollStoriesRight, setCanScrollStoriesRight] = useState(false);
  const slideIntervalRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const slideDuration = 5000; // 5 секунд на слайд
  const videoRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0); // 0..1 для активного слайда
  const slideStartRef = useRef(0);
  const slideTotalMsRef = useRef(slideDuration);
  const slideRemainingMsRef = useRef(slideDuration);
  const slideTouchRef = useRef({ x: 0, y: 0, t: 0, moved: false, consumed: false });

  // Загрузка медиа-файлов для публикации через axios с токеном
  const loadPublicationMedia = useCallback(async (publication) => {
    if (!publication || !publication.content) return;

    // Сначала очищаем старые blob URLs для этой публикации
    setMediaBlobs(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (key.startsWith(`${publication.id}_`)) {
          try {
            URL.revokeObjectURL(updated[key]);
          } catch {
            // Игнорируем ошибки
          }
          delete updated[key];
        }
      });
      return updated;
    });

    // Загружаем все изображения и видео из слайдов
    const newBlobs = {};
    for (const slide of publication.content) {
      if ((slide.type === 'image' || slide.type === 'video') && slide.url) {
        const filename = slide.url.split('/').pop();
        const blobKey = `${publication.id}_${filename}`;

        try {
          // Формируем URL для запроса (используем пользовательский маршрут)
          const fileUrl = slide.url.startsWith('storage/publications/')
            ? `/profile/publications/${encodeURIComponent(filename)}`
            : slide.url;
          
          // Загружаем файл через axios с токеном
          const response = await axiosAPI.get(fileUrl, { responseType: 'blob' });
          const blob = new Blob([response.data]);
          const blobUrl = URL.createObjectURL(blob);
          newBlobs[blobKey] = blobUrl;
        } catch (error) {
          console.error(`Ошибка загрузки медиа-файла ${filename}:`, error);
        }
      }
    }

    // Обновляем кэш blob URLs
    if (Object.keys(newBlobs).length > 0) {
      setMediaBlobs(prev => ({ ...prev, ...newBlobs }));
    }
  }, []);

  useEffect(() => {
    loadPublications();

    // Очистка интервалов при размонтировании
    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      // Отзываем все blob URLs при размонтировании компонента
      setMediaBlobs(prev => {
        Object.values(prev).forEach(blobUrl => {
          if (blobUrl) {
            try {
              URL.revokeObjectURL(blobUrl);
            } catch {
              // Игнорируем ошибки при отзыве
            }
          }
        });
        return {};
      });
    };
  }, []);

  // Загрузка медиа-файлов для выбранной публикации
  useEffect(() => {
    if (selectedPublication) {
      loadPublicationMedia(selectedPublication);
    }
  }, [selectedPublication, loadPublicationMedia]);

  const updateStoriesScrollState = useCallback(() => {
    const el = storiesBarRef.current;
    if (!el) return;
    const maxScrollLeft = el.scrollWidth - el.clientWidth;
    setCanScrollStoriesLeft(el.scrollLeft > 2);
    setCanScrollStoriesRight(el.scrollLeft < maxScrollLeft - 2);
  }, []);

  const scrollStoriesBy = (dx) => {
    const el = storiesBarRef.current;
    if (!el) return;
    el.scrollBy({ left: dx, behavior: 'smooth' });
  };

  const handleStoriesPointerDown = (e) => {
    // Drag только мышью (touch оставляем нативный свайп)
    if (e.pointerType !== 'mouse') return;
    // Если клик на иконке публикации, не начинаем drag
    if (e.target.closest('.publication-story-circle')) return;
    
    const el = storiesBarRef.current;
    if (!el) return;
    storiesDragRef.current.isDown = true;
    storiesDragRef.current.startX = e.clientX;
    storiesDragRef.current.scrollLeft = el.scrollLeft;
    storiesDragRef.current.hasMoved = false;
    storiesDragRef.current.startTime = Date.now();
    // Не устанавливаем isStoriesDragging сразу - только после движения
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleStoriesPointerMove = (e) => {
    if (!storiesDragRef.current.isDown) return;
    const el = storiesBarRef.current;
    if (!el) return;
    const dx = Math.abs(e.clientX - storiesDragRef.current.startX);
    
    // Если движение больше 5px, считаем это перетаскиванием
    if (dx > 5) {
      if (!storiesDragRef.current.hasMoved) {
        storiesDragRef.current.hasMoved = true;
        setIsStoriesDragging(true);
      }
      el.scrollLeft = storiesDragRef.current.scrollLeft - (e.clientX - storiesDragRef.current.startX);
      updateStoriesScrollState();
    }
  };

  const handleStoriesPointerUp = () => {
    if (!storiesDragRef.current.isDown) return;
    const wasDragging = storiesDragRef.current.hasMoved;
    storiesDragRef.current.isDown = false;
    storiesDragRef.current.hasMoved = false;
    setIsStoriesDragging(false);
    updateStoriesScrollState();
  };

  useEffect(() => {
    updateStoriesScrollState();
    const onResize = () => updateStoriesScrollState();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publications.length, selectedPublicationIndex]);

  // (перенесено ниже, после объявления startSlideShow)

  const getCurrentSlide = () => {
    return selectedPublication?.content?.[currentSlideIndex];
  };

  const clearSlideTimers = () => {
    if (slideIntervalRef.current) {
      clearTimeout(slideIntervalRef.current);
      slideIntervalRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Навигационные функции должны быть объявлены до их использования
  const handlePublicationClick = (publication, index) => {
    console.log('PublicationsModal: handlePublicationClick вызван', { publicationId: publication.id, index });
    // Сбрасываем флаг перетаскивания перед переключением
    storiesDragRef.current.hasMoved = false;
    clearSlideTimers();
    setSelectedPublication(publication);
    setSelectedPublicationIndex(index);
    setCurrentSlideIndex(0);
    markPublicationAsViewed(publication.id);
    // Перезапуск слайдшоу будет выполнен в useEffect при изменении selectedPublication
  };

  const handleSwipePrevPublication = () => {
    if (!selectedPublication) return;
    // свайп вправо -> предыдущая публикация (или перезапуск первой)
    if (selectedPublicationIndex > 0) {
      const prevPublication = publications[selectedPublicationIndex - 1];
      handlePublicationClick(prevPublication, selectedPublicationIndex - 1);
    } else {
      // уже первая — перезапускаем ее с начала
      handlePublicationClick(selectedPublication, 0);
    }
  };

  const handleSwipeNextPublication = () => {
    if (!selectedPublication) return;
    // свайп влево -> следующая публикация (или перезапуск последней)
    if (selectedPublicationIndex < publications.length - 1) {
      const nextPublication = publications[selectedPublicationIndex + 1];
      handlePublicationClick(nextPublication, selectedPublicationIndex + 1);
    } else {
      // уже последняя — перезапускаем ее с начала
      handlePublicationClick(selectedPublication, selectedPublicationIndex);
    }
  };

  // Свайпы по слайду: переключение публикаций (мобильные)
  const handleSlideTouchStartCapture = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    slideTouchRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      t: Date.now(),
      moved: false,
      consumed: false
    };
  };

  const handleSlideTouchMoveCapture = (e) => {
    const touch = e.touches?.[0];
    if (!touch) return;
    const dx = touch.clientX - slideTouchRef.current.x;
    const dy = touch.clientY - slideTouchRef.current.y;
    // Если движение достаточно большое, считаем что пользователь делает жест
    if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
      slideTouchRef.current.moved = true;
    }
    // Если горизонтальный свайп доминирует — помечаем как "consumed", чтобы не триггерить клик по видео/документу
    if (Math.abs(dx) > 20 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      slideTouchRef.current.consumed = true;
      // Prevent scrolling "резиновым" скроллом страницы
      // (может быть проигнорировано браузером без touch-action, но все равно полезно)
      try {
        e.preventDefault();
      } catch {
        // ignore
      }
    }
  };

  const handleSlideTouchEndCapture = (e) => {
    const touch = e.changedTouches?.[0];
    if (!touch) return;
    const dx = touch.clientX - slideTouchRef.current.x;
    const dy = touch.clientY - slideTouchRef.current.y;
    const dt = Date.now() - slideTouchRef.current.t;

    const isHorizontal = Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2;
    const isFastEnough = dt < 800;

    if (isHorizontal && isFastEnough) {
      // Если это был свайп — блокируем возможный click
      if (slideTouchRef.current.consumed) {
        try {
          e.preventDefault();
        } catch {
          // ignore
        }
        try {
          e.stopPropagation();
        } catch {
          // ignore
        }
      }
      if (dx > 0) {
        // свайп вправо
        handleSwipePrevPublication();
      } else {
        // свайп влево
        handleSwipeNextPublication();
      }
    }
  };

  const handleSlideTouchCancelCapture = () => {
    slideTouchRef.current = { x: 0, y: 0, t: 0, moved: false, consumed: false };
  };

  const handleCloseDetail = () => {
    setSelectedPublication(null);
    setSelectedPublicationIndex(0);
    setCurrentSlideIndex(0);
    if (slideIntervalRef.current) {
      clearInterval(slideIntervalRef.current);
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    onClose();
  };

  const handleNextSlide = () => {
    if (!selectedPublication) return;
    const slides = selectedPublication.content || [];
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    } else {
      // Переход к следующей публикации или закрытие
      if (selectedPublicationIndex < publications.length - 1) {
        const nextPublication = publications[selectedPublicationIndex + 1];
        handlePublicationClick(nextPublication, selectedPublicationIndex + 1);
      } else {
        handleCloseDetail();
      }
    }
  };

  const handlePrevSlide = () => {
    if (!selectedPublication) return;
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    } else {
      // Переход к предыдущей публикации
      if (selectedPublicationIndex > 0) {
        const prevPublication = publications[selectedPublicationIndex - 1];
        handlePublicationClick(prevPublication, selectedPublicationIndex - 1);
        // Устанавливаем последний слайд предыдущей публикации
        const prevSlides = prevPublication.content || [];
        setCurrentSlideIndex(prevSlides.length - 1);
      }
    }
  };

  const pauseSlide = () => {
    const slide = getCurrentSlide();
    if (!slide) return;
    // Для видео — пауза/воспроизведение только одним кликом, удержание не влияет
    if (slide.type === 'video') return;
    if (isPaused) return;
    setIsPaused(true);
    const elapsed = Date.now() - slideStartRef.current;
    slideRemainingMsRef.current = Math.max(0, slideTotalMsRef.current - elapsed);
    clearSlideTimers();
  };

  const resumeSlide = () => {
    const slide = getCurrentSlide();
    if (!slide) return;
    if (slide.type === 'video') return;
    if (!isPaused) return;
    setIsPaused(false);
    slideStartRef.current = Date.now();
    slideIntervalRef.current = setTimeout(() => {
      handleNextSlide();
    }, slideRemainingMsRef.current);
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - slideStartRef.current;
      const progress = Math.min(1, (slideTotalMsRef.current - (slideRemainingMsRef.current - elapsed)) / slideTotalMsRef.current);
      setSlideProgress(progress);
    }, 100);
  };

  const loadPublications = async () => {
    try {
      setLoading(true);
      const { data } = await axiosAPI.get('/profile/publications');
      const pubs = data.publications || [];
      
      // Отладочное логирование для проверки структуры данных
      console.log('PublicationsModal: Загружены публикации:', pubs.length);
      if (pubs.length > 0) {
        console.log('PublicationsModal: Первая публикация:', {
          id: pubs[0].id,
          title: pubs[0].title,
          contentLength: pubs[0].content?.length || 0,
          firstSlide: pubs[0].content?.[0]
        });
      }
      
      // Сортируем: непросмотренные сначала, затем по дате публикации
      const sortedPubs = pubs.sort((a, b) => {
        if (a.is_viewed === b.is_viewed) {
          const dateA = new Date(a.published_at || a.createdAt || 0);
          const dateB = new Date(b.published_at || b.createdAt || 0);
          return dateB - dateA;
        }
        return a.is_viewed ? 1 : -1;
      });
      
      setPublications(sortedPubs);

      // Загружаем preview изображения для всех публикаций (асинхронно, не блокируя рендеринг)
      // Предпочитаем preview_image, при его отсутствии используем первое изображение из контента
      (async () => {
        const newBlobs = {};
        for (const pub of sortedPubs) {
          // Главное превью или первая картинка из контента
          const previewImage =
            pub.preview_image ||
            (Array.isArray(pub.content)
              ? (pub.content.find(s => s && s.type === 'image' && s.url)?.url || null)
              : null);
          
          if (previewImage && previewImage.startsWith('storage/publications/')) {
            const filename = previewImage.split('/').pop();
            const blobKey = `${pub.id}_${filename}`;
            
            console.log(`PublicationsModal: Загрузка preview для публикации ${pub.id}, ключ: ${blobKey}, файл: ${filename}`);
            
            try {
              // Добавляем токен в query параметр для надежности
              const token = localStorage.getItem('accessToken');
              const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
              const fileUrl = `/profile/publications/${encodeURIComponent(filename)}${tokenParam}`;
              console.log(`📥 [Frontend] Загрузка preview: ${fileUrl}`);
              const response = await axiosAPI.get(fileUrl, { responseType: 'blob' });
              const blob = new Blob([response.data]);
              const blobUrl = URL.createObjectURL(blob);
              newBlobs[blobKey] = blobUrl;
              console.log(`PublicationsModal: Preview загружен для публикации ${pub.id}, blob URL: ${blobUrl}`);
            } catch (error) {
              console.error(`❌ [Frontend] Ошибка загрузки preview изображения для публикации ${pub.id}:`, error);
              console.error(`❌ [Frontend] URL был: ${fileUrl}`);
              console.error(`❌ [Frontend] Статус ошибки:`, error.response?.status, error.response?.statusText);
              console.error(`❌ [Frontend] Данные ошибки:`, error.response?.data);
            }
          } else {
            console.log(`PublicationsModal: Публикация ${pub.id} не имеет preview_image; fallback на первый image-слайд ${Array.isArray(pub.content) ? 'попытка' : 'не доступен'}`);
          }
        }
        
        // Обновляем состояние один раз после загрузки всех preview изображений
        if (Object.keys(newBlobs).length > 0) {
          console.log(`PublicationsModal: Обновляем mediaBlobs с ${Object.keys(newBlobs).length} preview изображениями`);
          setMediaBlobs(prev => {
            const updated = { ...prev, ...newBlobs };
            console.log(`PublicationsModal: Всего blob URLs в кэше: ${Object.keys(updated).length}`);
            return updated;
          });
        } else {
          console.log('PublicationsModal: Нет preview изображений для загрузки');
        }
      })();

      // Автоматически открываем первую непросмотренную или последнюю публикацию
      if (sortedPubs.length > 0) {
        const firstUnviewed = sortedPubs.find(p => !p.is_viewed);
        const publicationToOpen = firstUnviewed || sortedPubs[0];
        const indexToOpen = sortedPubs.findIndex(p => p.id === publicationToOpen.id);
        setSelectedPublication(publicationToOpen);
        setSelectedPublicationIndex(indexToOpen);
        setCurrentSlideIndex(0);
      }
    } catch (error) {
      console.error('Ошибка загрузки публикаций:', error);
    } finally {
      setLoading(false);
    }
  };

  const markPublicationAsViewed = async (publicationId) => {
    try {
      await axiosAPI.post(`/profile/publications/${publicationId}/view`);
      setPublications(prev => prev.map(p => 
        p.id === publicationId ? { ...p, is_viewed: true } : p
      ));
    } catch (error) {
      console.error('Ошибка отметки публикации как просмотренной:', error);
    }
  };

  // Получение blob URL для медиа-файла
  const getMediaBlobUrl = (publicationId, url) => {
    if (!url) {
      console.log(`PublicationsModal: getMediaBlobUrl получил пустой url для публикации ${publicationId}`);
      return '';
    }
    if (url.startsWith('http')) return url; // Внешние URL не требуют blob
    
    const filename = url.split('/').pop();
    const blobKey = `${publicationId}_${filename}`;
    const blobUrl = mediaBlobs[blobKey] || '';
    
    if (!blobUrl) {
      console.log(`PublicationsModal: getMediaBlobUrl не нашел blob URL для ключа ${blobKey}, доступные ключи:`, Object.keys(mediaBlobs));
    } else {
      console.log(`PublicationsModal: getMediaBlobUrl нашел blob URL для ключа ${blobKey}`);
    }
    
    return blobUrl;
  };

  function startSlideShow() {
    clearSlideTimers();
    setSlideProgress(0);
    setIsPaused(false);

    const slide = getCurrentSlide();
    if (!slide) return;

    // Для видео не используем таймер перелистывания — перелистываем по событию ended.
    if (slide.type === 'video') {
      // Прогресс обновляется по timeupdate, здесь ничего не запускаем
      return;
    }

    // Для изображения/текста/документа запускаем таймеры
    slideTotalMsRef.current = slideDuration;
    slideRemainingMsRef.current = slideDuration;
    slideStartRef.current = Date.now();

    slideIntervalRef.current = setTimeout(() => {
      handleNextSlide();
    }, slideRemainingMsRef.current);

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - slideStartRef.current;
      const progress = Math.min(1, elapsed / slideTotalMsRef.current);
      setSlideProgress(progress);
    }, 100);
  }

  // Автопереключение слайдов и настройка прогресса
  useEffect(() => {
    if (selectedPublication) {
      startSlideShow();
      markPublicationAsViewed(selectedPublication.id);
    }

    return () => {
      if (slideIntervalRef.current) {
        clearInterval(slideIntervalRef.current);
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPublication, currentSlideIndex]);

  const getSlideContent = (slide) => {
    if (!slide) {
      console.warn('PublicationsModal: getSlideContent получил null/undefined slide');
      return null;
    }

    // Получаем полный URL для файлов
    const getFullUrl = (url) => {
      if (!url) {
        console.warn('PublicationsModal: getFullUrl получил пустой url');
        return '';
      }
      if (url.startsWith('http')) return url;
      // Если это путь к файлу в storage, используем API endpoint (пользовательский маршрут)
      if (url.startsWith('storage/publications/')) {
        const filename = url.split('/').pop();
        // Добавляем токен в query параметр для img/video тегов
        const token = localStorage.getItem('accessToken');
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
        // В development используем относительный путь для работы через прокси
        if (API_CONFIG.BASE_URL === '') {
          return `/profile/publications/${encodeURIComponent(filename)}${tokenParam}`;
        }
        return `${API_CONFIG.BASE_URL}/profile/publications/${encodeURIComponent(filename)}${tokenParam}`;
      }
      if (url.startsWith('/')) {
        if (API_CONFIG.BASE_URL === '') {
          return url;
        }
        return `${API_CONFIG.BASE_URL}${url}`;
      }
      if (API_CONFIG.BASE_URL === '') {
        return `/${url}`;
      }
      return `${API_CONFIG.BASE_URL}/${url}`;
    };

    switch (slide.type) {
      case 'text': {
        return (
          <div
            className="publication-slide-text"
            onMouseDown={pauseSlide}
            onMouseUp={resumeSlide}
            onMouseLeave={resumeSlide}
            onTouchStart={pauseSlide}
            onTouchEnd={resumeSlide}
            onTouchCancel={resumeSlide}
          >
            <p>{slide.text}</p>
          </div>
        );
      }
      case 'image': {
        if (!slide.url) {
          console.warn('PublicationsModal: Слайд типа image не имеет URL:', slide);
          return (
            <div className="publication-slide-image">
              <div style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>
                ⚠️ Изображение не загружено
              </div>
              {slide.caption && <div className="publication-slide-caption">{slide.caption}</div>}
            </div>
          );
        }
        // Используем blob URL, если доступен, иначе обычный URL
        const imageBlobUrl = getMediaBlobUrl(selectedPublication?.id, slide.url);
        const imageUrl = imageBlobUrl || getFullUrl(slide.url);
        return (
          <div
            className="publication-slide-image"
            onMouseDown={pauseSlide}
            onMouseUp={resumeSlide}
            onMouseLeave={resumeSlide}
            onTouchStart={pauseSlide}
            onTouchEnd={resumeSlide}
            onTouchCancel={resumeSlide}
          >
            <img src={imageUrl} alt={slide.caption || ''} onError={(e) => {
              console.error('PublicationsModal: Ошибка загрузки изображения:', imageUrl, e);
            }} />
            {slide.caption && <div className="publication-slide-caption">{slide.caption}</div>}
          </div>
        );
      }
      case 'video': {
        if (!slide.url) {
          console.warn('PublicationsModal: Слайд типа video не имеет URL:', slide);
          return (
            <div className="publication-slide-video">
              <div style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>
                ⚠️ Видео не загружено
              </div>
              {slide.caption && <div className="publication-slide-caption">{slide.caption}</div>}
            </div>
          );
        }
        // Используем blob URL, если доступен, иначе обычный URL
        const videoBlobUrl = getMediaBlobUrl(selectedPublication?.id, slide.url);
        const videoUrl = videoBlobUrl || getFullUrl(slide.url);
        
        // Обработчик клика для паузы/воспроизведения видео
        const handleVideoClick = (e) => {
          const video = e.currentTarget;
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        };
        
        const handleLoadedMetadata = () => {
          // Прогресс и перелистывание зависят от окончания видео
          setSlideProgress(0);
        };

        const handleTimeUpdate = (e) => {
          const v = e.currentTarget;
          if (v.duration && isFinite(v.duration) && v.duration > 0) {
            setSlideProgress(Math.min(1, v.currentTime / v.duration));
          }
        };

        const handlePlay = () => setIsPaused(false);
        const handlePause = () => setIsPaused(true);
        const handleEnded = () => {
          setSlideProgress(1);
          handleNextSlide();
        };

        return (
          <div className="publication-slide-video">
            <video 
              src={videoUrl} 
              autoPlay
              ref={videoRef}
              onClick={handleVideoClick}
              onLoadedMetadata={handleLoadedMetadata}
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlay}
              onPause={handlePause}
              onEnded={handleEnded}
              onError={(e) => {
                console.error('PublicationsModal: Ошибка загрузки видео:', videoUrl, e);
              }}
              style={{ cursor: 'pointer' }}
            />
            {slide.caption && <div className="publication-slide-caption">{slide.caption}</div>}
          </div>
        );
      }
      case 'document': {
        const handleDocumentClick = async () => {
          // Важно: браузерный <a href> не отправляет Authorization -> 401.
          // Поэтому качаем через axios (с токеном) как blob и сохраняем как файл.
          const url = getFullUrl(slide.url);
          if (!url) return;
          try {
            const response = await axiosAPI.get(url, { responseType: 'blob' });
            const blobUrl = URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download =
              slide.filename ||
              (typeof slide.url === 'string' && slide.url.split('/').pop()) ||
              'document';
            document.body.appendChild(link);
            link.click();
            link.remove();
            // освобождаем URL в следующем тике, чтобы не ломать скачивание
            setTimeout(() => {
              try {
                URL.revokeObjectURL(blobUrl);
              } catch {
                // ignore
              }
            }, 0);
          } catch (error) {
            console.error('PublicationsModal: Ошибка скачивания документа:', url, error);
          }
        };
        return (
          <div
            className="publication-slide-document"
            onClick={handleDocumentClick}
            onMouseDown={pauseSlide}
            onMouseUp={resumeSlide}
            onMouseLeave={resumeSlide}
            onTouchStart={pauseSlide}
            onTouchEnd={resumeSlide}
            onTouchCancel={resumeSlide}
          >
            <a href={getFullUrl(slide.url)} download={slide.filename || 'document'} target="_blank" rel="noopener noreferrer" onClick={(e) => e.preventDefault()}>
              <div className="publication-document-link">
                📄 {slide.filename || 'Документ'}
              </div>
            </a>
            {slide.caption && <div className="publication-slide-caption">{slide.caption}</div>}
          </div>
        );
      }
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="publications-modal-overlay" onClick={onClose}>
        <div className="publications-detail-view" onClick={(e) => e.stopPropagation()}>
          <div className="publications-loading">Загрузка публикаций...</div>
        </div>
      </div>
    );
  }

  if (publications.length === 0) {
    return (
      <div className="publications-modal-overlay" onClick={onClose}>
        <div className="publications-detail-view" onClick={(e) => e.stopPropagation()}>
          <button className="publications-close-btn" onClick={onClose}>×</button>
          <div className="publications-empty-detail">Нет публикаций</div>
        </div>
      </div>
    );
  }

  // Если публикация не выбрана (не должно происходить, но на всякий случай)
  if (!selectedPublication) {
    const firstPub = publications[0];
    setSelectedPublication(firstPub);
    setSelectedPublicationIndex(0);
    return null;
  }

  const currentSlide = selectedPublication.content?.[currentSlideIndex];
  const slides = selectedPublication.content || [];

  // Отладочное логирование
  if (currentSlide) {
    console.log('PublicationsModal: Текущий слайд:', {
      type: currentSlide.type,
      url: currentSlide.url,
      text: currentSlide.text?.substring(0, 50),
      hasCaption: !!currentSlide.caption
    });
  } else {
    console.warn('PublicationsModal: currentSlide is null/undefined', {
      currentSlideIndex,
      slidesCount: slides.length,
      publicationContent: selectedPublication.content
    });
  }

  return (
    <div className="publications-modal-overlay" onClick={handleCloseDetail}>
      <div className="publications-detail-view" onClick={(e) => e.stopPropagation()}>
        {/* Лента публикаций сверху (кружочки) */}
        <div className="publications-stories-bar-wrapper">
          {canScrollStoriesLeft && (
            <button
              type="button"
              className="publications-stories-scroll-btn left"
              onClick={(e) => {
                e.stopPropagation();
                scrollStoriesBy(-220);
              }}
              aria-label="Прокрутить ленту влево"
            >
              ‹
            </button>
          )}
          {canScrollStoriesRight && (
            <button
              type="button"
              className="publications-stories-scroll-btn right"
              onClick={(e) => {
                e.stopPropagation();
                scrollStoriesBy(220);
              }}
              aria-label="Прокрутить ленту вправо"
            >
              ›
            </button>
          )}

          <div
            className={`publications-stories-bar ${isStoriesDragging ? 'dragging' : ''}`}
            ref={storiesBarRef}
            onScroll={updateStoriesScrollState}
            onPointerDown={handleStoriesPointerDown}
            onPointerMove={handleStoriesPointerMove}
            onPointerUp={handleStoriesPointerUp}
            onPointerCancel={handleStoriesPointerUp}
            onPointerLeave={handleStoriesPointerUp}
          >
            {publications.map((pub, index) => {
            const isActive = index === selectedPublicationIndex;
            // Предпочитаем preview_image, при его отсутствии используем первую картинку из контента
            const previewImage =
              pub.preview_image ||
              (Array.isArray(pub.content)
                ? (pub.content.find(s => s && s.type === 'image' && s.url)?.url || null)
                : null);
            const getFullUrl = (url) => {
              if (!url) return '';
              if (url.startsWith('http')) return url;
              // Если это путь к файлу в storage, используем API endpoint (пользовательский маршрут)
              if (url.startsWith('storage/publications/')) {
                const filename = url.split('/').pop();
                // Добавляем токен в query параметр для img/video тегов
                const token = localStorage.getItem('accessToken');
                const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
                // В development используем относительный путь для работы через прокси
                if (API_CONFIG.BASE_URL === '') {
                  return `/profile/publications/${encodeURIComponent(filename)}${tokenParam}`;
                }
                return `${API_CONFIG.BASE_URL}/profile/publications/${encodeURIComponent(filename)}${tokenParam}`;
              }
              if (url.startsWith('/')) {
                if (API_CONFIG.BASE_URL === '') {
                  return url;
                }
                return `${API_CONFIG.BASE_URL}${url}`;
              }
              if (API_CONFIG.BASE_URL === '') {
                return `/${url}`;
              }
              return `${API_CONFIG.BASE_URL}/${url}`;
            };

            return (
              <div
                key={pub.id}
                data-publication-id={pub.id}
                className={`publication-story-circle ${isActive ? 'active' : ''} ${!pub.is_viewed ? 'unviewed' : ''}`}
                onPointerDown={(e) => {
                  // Останавливаем всплытие, чтобы не начался drag на ленте
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  // Проверяем, что это был клик, а не завершение drag
                  if (!storiesDragRef.current.hasMoved) {
                    handlePublicationClick(pub, index);
                  }
                }}
              >
                {!pub.is_viewed && <div className="publication-new-pill">NEW</div>}
                <div 
                  className="publication-story-circle-inner"
                  onPointerDown={(e) => {
                    // Останавливаем всплытие, чтобы не начался drag на ленте
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Проверяем, что это был клик, а не завершение drag
                    if (!storiesDragRef.current.hasMoved) {
                      console.log('PublicationsModal: Клик на publication-story-circle-inner', { publicationId: pub.id, index });
                      handlePublicationClick(pub, index);
                    }
                  }}
                >
                  {previewImage ? (() => {
                    const blobUrl = getMediaBlobUrl(pub.id, previewImage);
                    // Используем blob URL если есть, иначе прямой URL
                    const imageUrl = blobUrl || getFullUrl(previewImage);
                    console.log(`PublicationsModal: Рендерим preview для публикации ${pub.id}, previewImage: ${previewImage}, blobUrl: ${blobUrl ? 'есть' : 'нет'}, imageUrl: ${imageUrl}`);
                    
                    // Если blob URL еще не загружен, пытаемся загрузить его немедленно
                    if (!blobUrl && previewImage && previewImage.startsWith('storage/publications/')) {
                      const filename = previewImage.split('/').pop();
                      const blobKey = `${pub.id}_${filename}`;
                      
                      // Проверяем, не загружается ли уже этот blob
                      if (!mediaBlobs[blobKey] && !loadingBlobsRef.current.has(blobKey)) {
                        loadingBlobsRef.current.add(blobKey);
                        // Добавляем токен в query параметр для надежности
                        const token = localStorage.getItem('accessToken');
                        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
                        const fileUrl = `/profile/publications/${encodeURIComponent(filename)}${tokenParam}`;
                        console.log(`PublicationsModal: Blob URL не найден, загружаем немедленно для публикации ${pub.id}, URL: ${fileUrl}`);
                        axiosAPI.get(fileUrl, { responseType: 'blob' })
                          .then(response => {
                            const blob = new Blob([response.data]);
                            const newBlobUrl = URL.createObjectURL(blob);
                            setMediaBlobs(prev => ({
                              ...prev,
                              [blobKey]: newBlobUrl
                            }));
                            loadingBlobsRef.current.delete(blobKey);
                            console.log(`PublicationsModal: Preview загружен немедленно для публикации ${pub.id}, blob URL: ${newBlobUrl}`);
                          })
                          .catch(err => {
                            loadingBlobsRef.current.delete(blobKey);
                            console.error(`Ошибка загрузки preview изображения для публикации ${pub.id}:`, err);
                          });
                      }
                    }
                    
                    console.log(`🖼️ [Frontend] Рендерим <img> для preview публикации ${pub.id}, src=${imageUrl}`);
                    return (
                      <img 
                        src={imageUrl}
                        alt={pub.title}
                        onPointerDown={(e) => {
                          // Останавливаем всплытие, чтобы не начался drag на ленте
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Проверяем, что это был клик, а не завершение drag
                          if (!storiesDragRef.current.hasMoved) {
                            console.log('PublicationsModal: Клик на preview изображении', { publicationId: pub.id, index });
                            handlePublicationClick(pub, index);
                          }
                        }}
                        onError={(e) => {
                          console.error(`PublicationsModal: Ошибка загрузки preview изображения для публикации ${pub.id}, URL: ${imageUrl}`);
                          // Если прямой URL не работает, пытаемся загрузить через blob
                          if (!blobUrl && previewImage.startsWith('storage/publications/')) {
                            const filename = previewImage.split('/').pop();
                            const blobKey = `${pub.id}_${filename}`;
                            // Добавляем токен в query параметр для надежности
                            const token = localStorage.getItem('accessToken');
                            const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
                            const fileUrl = `/profile/publications/${encodeURIComponent(filename)}${tokenParam}`;
                            console.log(`PublicationsModal: Пытаемся загрузить preview через fallback, URL: ${fileUrl}`);
                            axiosAPI.get(fileUrl, { responseType: 'blob' })
                              .then(response => {
                                const blob = new Blob([response.data]);
                                const newBlobUrl = URL.createObjectURL(blob);
                                setMediaBlobs(prev => ({
                                  ...prev,
                                  [blobKey]: newBlobUrl
                                }));
                                e.target.src = newBlobUrl;
                                console.log(`PublicationsModal: Preview загружен через fallback для публикации ${pub.id}`);
                              })
                              .catch(err => {
                                console.error('Ошибка загрузки preview изображения через fallback:', err);
                                // Если и fallback не работает, показываем placeholder
                                e.target.style.display = 'none';
                                const placeholder = document.createElement('div');
                                placeholder.className = 'publication-story-circle-placeholder';
                                placeholder.textContent = '📰';
                                e.target.parentElement.appendChild(placeholder);
                              });
                          }
                        }}
                        onLoad={() => {
                          console.log(`PublicationsModal: Preview изображение успешно загружено для публикации ${pub.id}`);
                        }}
                      />
                    );
                  })() : (
                    <div className="publication-story-circle-placeholder">📰</div>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        </div>

        {/* Прогресс-бар слайдов */}
        <div className="publications-progress-bar-container">
          {slides.map((_, index) => (
            <div key={index} className="publications-progress-bar-item">
              <div
                       className="publications-progress-bar-fill"
                       style={{
                         width:
                           index < currentSlideIndex
                             ? '100%'
                             : index === currentSlideIndex
                             ? `${Math.round(slideProgress * 100)}%`
                             : '0%'
                       }}
              />
            </div>
          ))}
        </div>

        {/* Кнопка закрытия */}
        <button className="publications-close-btn" onClick={handleCloseDetail}>×</button>

        {/* Контент слайда */}
        <div
          className="publications-slide-content"
          onTouchStartCapture={handleSlideTouchStartCapture}
          onTouchMoveCapture={handleSlideTouchMoveCapture}
          onTouchEndCapture={handleSlideTouchEndCapture}
          onTouchCancelCapture={handleSlideTouchCancelCapture}
        >
          {getSlideContent(currentSlide)}
        </div>

        {/* Навигация (зоны клика остаются, добавляем визуальные стрелки) */}
        <div className="publications-nav-left" onClick={handlePrevSlide}>
          <div className="publications-slide-nav-chevron left">‹</div>
        </div>
        <div className="publications-nav-right" onClick={handleNextSlide}>
          <div className="publications-slide-nav-chevron right">›</div>
        </div>
      </div>
    </div>
  );
};

export default PublicationsModal;
