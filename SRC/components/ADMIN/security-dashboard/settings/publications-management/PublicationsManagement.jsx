import React, { useState, useEffect, useRef, useCallback } from 'react';
import securityService from '../../../../../JS/services/security-service';
import axiosAPI from '../../../../../JS/auth/http/axios';
import { API_CONFIG } from '../../../../../config/api.js';
import './PublicationsManagement.css';

/**
 * Компонент управления публикациями
 */
const PublicationsManagement = () => {
  const [publications, setPublications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingPublication, setEditingPublication] = useState(null);
  const [uploadingFiles, setUploadingFiles] = useState({}); // Состояние загрузки файлов для каждого слайда
  const [uploadingPreviewImage, setUploadingPreviewImage] = useState(false); // Состояние загрузки главного фото
  const [previewImageLocalBlob, setPreviewImageLocalBlob] = useState(null); // Локальный blob URL для превью до загрузки на сервер
  const [viewingPublication, setViewingPublication] = useState(null); // Публикация для просмотра в модалке
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [mediaBlobs, setMediaBlobs] = useState({}); // Кэш blob URLs для медиа-файлов
  const slideIntervalRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const slideDuration = 5000; // 5 секунд на слайд
  const videoRef = useRef(null);
  const [isPaused, setIsPaused] = useState(false);
  const [slideProgress, setSlideProgress] = useState(0);
  const slideStartRef = useRef(0);
  const slideTotalMsRef = useRef(slideDuration);
  const slideRemainingMsRef = useRef(slideDuration);
  const [formData, setFormData] = useState({
    title: '',
    preview_image: '',
    content: [],
    is_active: true
  });

  useEffect(() => {
    loadPublications();
  }, []);

  const loadPublications = async () => {
    try {
      setLoading(true);
      setError('');
      const pubs = await securityService.getPublications();
      setPublications(pubs || []);
    } catch (err) {
      console.error('Ошибка загрузки публикаций:', err);
      setError('Не удалось загрузить публикации');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');

      if (!formData.title || formData.title.trim() === '') {
        setError('Название публикации обязательно');
        setLoading(false);
        return;
      }

      if (!formData.content || formData.content.length === 0) {
        setError('Добавьте хотя бы один слайд');
        setLoading(false);
        return;
      }

      // Валидация слайдов перед отправкой
      for (let i = 0; i < formData.content.length; i++) {
        const slide = formData.content[i];
        if (slide.type === 'text' && (!slide.text || slide.text.trim() === '')) {
          setError(`Слайд ${i + 1}: для текстового слайда обязателен текст`);
          setLoading(false);
          return;
        }
        if ((slide.type === 'image' || slide.type === 'video' || slide.type === 'document') && (!slide.url || slide.url.trim() === '')) {
          setError(`Слайд ${i + 1}: для слайда типа "${slide.type}" необходимо загрузить файл`);
          setLoading(false);
          return;
        }
      }

      // Отладочное логирование перед отправкой
      console.log('PublicationsManagement: Отправка публикации:', {
        title: formData.title,
        preview_image: formData.preview_image,
        contentLength: formData.content.length,
        content: formData.content.map((slide, idx) => ({
          index: idx,
          type: slide.type,
          url: slide.url,
          text: slide.text?.substring(0, 30),
          hasUrl: !!slide.url
        }))
      });

      if (editingPublication) {
        await securityService.updatePublication(editingPublication.id, formData);
      } else {
        await securityService.createPublication(formData);
      }

      resetForm();
      await loadPublications();
    } catch (err) {
      console.error('Ошибка сохранения публикации:', err);
      setError(err.response?.data?.message || err.message || 'Не удалось сохранить публикацию');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (publication) => {
    setEditingPublication(publication);
    // Очищаем локальный blob URL при редактировании (будет использоваться blob с сервера)
    if (previewImageLocalBlob) {
      URL.revokeObjectURL(previewImageLocalBlob);
      setPreviewImageLocalBlob(null);
    }
    setFormData({
      title: publication.title || '',
      preview_image: publication.preview_image || '',
      content: publication.content || [],
      is_active: publication.is_active !== false
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Вы уверены, что хотите удалить эту публикацию?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      await securityService.deletePublication(id);
      await loadPublications();
    } catch (err) {
      console.error('Ошибка удаления публикации:', err);
      setError(err.response?.data?.message || err.message || 'Не удалось удалить публикацию');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingPublication(null);
    setFormData({
      title: '',
      preview_image: '',
      content: [],
      is_active: true
    });
    setUploadingPreviewImage(false);
    // Очищаем локальный blob URL при сбросе формы
    if (previewImageLocalBlob) {
      URL.revokeObjectURL(previewImageLocalBlob);
      setPreviewImageLocalBlob(null);
    }
  };

  const addSlide = () => {
    setFormData(prev => ({
      ...prev,
      content: [...prev.content, { type: 'text', text: '', url: '', caption: '', filename: '' }]
    }));
  };

  const updateSlide = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content.map((slide, i) => 
        i === index ? { ...slide, [field]: value } : slide
      )
    }));
  };

  const removeSlide = (index) => {
    setFormData(prev => ({
      ...prev,
      content: prev.content.filter((_, i) => i !== index)
    }));
    // Удаляем состояние загрузки для этого слайда
    setUploadingFiles(prev => {
      const newState = { ...prev };
      delete newState[index];
      return newState;
    });
  };

  const handleFileUpload = async (index, file) => {
    if (!file) return;

    try {
      setUploadingFiles(prev => ({ ...prev, [index]: true }));
      setError('');

      const result = await securityService.uploadPublicationFile(file);
      
      // Обновляем слайд с URL загруженного файла
      // result может быть объектом {url, filename, ...} или просто строкой URL
      const fileUrl = result?.url || result;
      
      console.log('PublicationsManagement: Файл загружен для слайда', index, {
        originalName: file.name,
        result,
        fileUrl,
        slideType: formData.content[index]?.type
      });
      
      if (!fileUrl || fileUrl.trim() === '') {
        throw new Error('Не удалось получить URL загруженного файла');
      }
      
      // Обновляем URL в слайде
      updateSlide(index, 'url', fileUrl);
      
      // Если это документ и не указано имя файла, используем оригинальное имя
      const slide = formData.content[index];
      if (slide.type === 'document' && !slide.filename && result?.filename) {
        updateSlide(index, 'filename', result.filename);
      }
      
      // Проверяем, что URL действительно обновился (с небольшой задержкой для обновления состояния)
      setTimeout(() => {
        setFormData(prev => {
          const updatedSlide = prev.content[index];
          console.log('PublicationsManagement: Проверка обновления URL для слайда', index, {
            url: updatedSlide?.url,
            expectedUrl: fileUrl,
            updated: updatedSlide?.url === fileUrl
          });
          return prev;
        });
      }, 100);
    } catch (err) {
      console.error('Ошибка загрузки файла:', err);
      setError(err.response?.data?.message || err.message || 'Не удалось загрузить файл');
    } finally {
      setUploadingFiles(prev => ({ ...prev, [index]: false }));
    }
  };

  const handlePreviewImageUpload = async (file) => {
    if (!file) return;

    try {
      setUploadingPreviewImage(true);
      setError('');

      // Создаем локальный blob URL для немедленного превью
      const localBlobUrl = URL.createObjectURL(file);
      setPreviewImageLocalBlob(localBlobUrl);

      // Загружаем файл на сервер
      const result = await securityService.uploadPublicationFile(file);
      const fileUrl = result?.url || result;
      setFormData(prev => ({ ...prev, preview_image: fileUrl }));
      
      // Очищаем локальный blob URL после успешной загрузки (будет использоваться blob из сервера)
      // Но оставляем его до тех пор, пока не загрузится blob с сервера
    } catch (err) {
      console.error('Ошибка загрузки главного фото:', err);
      setError(err.response?.data?.message || err.message || 'Не удалось загрузить главное фото');
      // Очищаем локальный blob URL при ошибке
      if (previewImageLocalBlob) {
        URL.revokeObjectURL(previewImageLocalBlob);
        setPreviewImageLocalBlob(null);
      }
    } finally {
      setUploadingPreviewImage(false);
    }
  };

  // Обработчик клика на строку таблицы для просмотра публикации
  const handleViewPublication = (publication) => {
    setViewingPublication(publication);
    setCurrentSlideIndex(0);
    setIsPaused(false);
    setSlideProgress(0);
  };

  // Закрытие модалки просмотра
  const handleCloseViewModal = () => {
    setViewingPublication(null);
    setCurrentSlideIndex(0);
    clearSlideTimers();
    // Очищаем blob URLs
    setMediaBlobs(prev => {
      Object.values(prev).forEach(blobUrl => {
        if (blobUrl) {
          try {
            URL.revokeObjectURL(blobUrl);
          } catch {}
        }
      });
      return {};
    });
  };

  // Загрузка медиа-файлов для публикации
  const loadPublicationMedia = useCallback(async (publication) => {
    if (!publication || !publication.content) return;

    // Очищаем старые blob URLs
    setMediaBlobs(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        if (key.startsWith(`${publication.id}_`)) {
          try {
            URL.revokeObjectURL(updated[key]);
          } catch {}
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
          const fileUrl = slide.url.startsWith('storage/publications/')
            ? `/admin/publications/${encodeURIComponent(filename)}`
            : slide.url;
          
          const response = await axiosAPI.get(fileUrl, { responseType: 'blob' });
          const blob = new Blob([response.data]);
          const blobUrl = URL.createObjectURL(blob);
          newBlobs[blobKey] = blobUrl;
        } catch (error) {
          console.error(`Ошибка загрузки медиа-файла ${filename}:`, error);
        }
      }
    }

    if (Object.keys(newBlobs).length > 0) {
      setMediaBlobs(prev => ({ ...prev, ...newBlobs }));
    }
  }, []);

  // Загрузка медиа при открытии модалки
  useEffect(() => {
    if (viewingPublication) {
      loadPublicationMedia(viewingPublication);
    }
  }, [viewingPublication, loadPublicationMedia]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      clearSlideTimers();
      setMediaBlobs(prev => {
        Object.values(prev).forEach(blobUrl => {
          if (blobUrl) {
            try {
              URL.revokeObjectURL(blobUrl);
            } catch {}
          }
        });
        return {};
      });
    };
  }, []);

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

  const getCurrentSlide = () => {
    return viewingPublication?.content?.[currentSlideIndex];
  };

  const handleNextSlide = () => {
    if (!viewingPublication) return;
    const slides = viewingPublication.content || [];
    if (currentSlideIndex < slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    }
  };

  const handlePrevSlide = () => {
    if (!viewingPublication) return;
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    }
  };

  const pauseSlide = () => {
    const slide = getCurrentSlide();
    if (!slide || slide.type === 'video') return;
    if (isPaused) return;
    setIsPaused(true);
    const elapsed = Date.now() - slideStartRef.current;
    slideRemainingMsRef.current = Math.max(0, slideTotalMsRef.current - elapsed);
    clearSlideTimers();
  };

  const resumeSlide = () => {
    const slide = getCurrentSlide();
    if (!slide || slide.type === 'video') return;
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

  function startSlideShow() {
    clearSlideTimers();
    setSlideProgress(0);
    setIsPaused(false);

    const slide = getCurrentSlide();
    if (!slide) return;

    if (slide.type === 'video') {
      return;
    }

    slideStartRef.current = Date.now();
    slideIntervalRef.current = setTimeout(() => {
      handleNextSlide();
    }, slideDuration);
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - slideStartRef.current;
      const progress = Math.min(1, elapsed / slideDuration);
      setSlideProgress(progress);
    }, 100);
  }

  useEffect(() => {
    if (viewingPublication) {
      startSlideShow();
    }
    return () => clearSlideTimers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingPublication, currentSlideIndex]);

  // Получение blob URL для медиа-файла
  const getMediaBlobUrl = (publicationId, url) => {
    if (!url || url.startsWith('http')) return '';
    const filename = url.split('/').pop();
    const blobKey = `${publicationId}_${filename}`;
    return mediaBlobs[blobKey] || '';
  };

  // --- Превью файлов в редакторе (форма) через blob, чтобы избежать 401 ---
  const getEditMediaBlobKey = (index, url) => {
    if (!url) return '';
    const filename = url.split('/').pop();
    return `edit_${index}_${filename}`;
  };

  const getEditMediaBlobUrl = (index, url) => {
    const key = getEditMediaBlobKey(index, url);
    return key ? (mediaBlobs[key] || '') : '';
  };

  // Превью главного фото (preview_image) через blob
  const getPreviewBlobKey = (url) => {
    if (!url) return '';
    const filename = String(url).split('/').pop();
    return `preview_${filename}`;
  };

  const getPreviewBlobUrl = (url) => {
    const key = getPreviewBlobKey(url);
    return key ? (mediaBlobs[key] || '') : '';
  };

  const loadPreviewBlob = useCallback(async (url) => {
    if (!url || url.startsWith('http')) return; // внешние URL можно показывать напрямую
    try {
      const filename = String(url).split('/').pop();
      const key = getPreviewBlobKey(url);
      if (mediaBlobs[key]) return; // уже есть
      const fileUrl = url.startsWith('storage/publications/')
        ? `/admin/publications/${encodeURIComponent(filename)}`
        : url;
      const response = await axiosAPI.get(fileUrl, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(new Blob([response.data]));
      setMediaBlobs(prev => ({ ...prev, [key]: blobUrl }));
      return true; // Успешная загрузка
    } catch (e) {
      console.error('Ошибка загрузки превью главного фото:', url, e);
      return false; // Ошибка загрузки
    }
  }, [mediaBlobs]);

  const loadEditMediaBlobs = useCallback(async (content) => {
    if (!Array.isArray(content) || content.length === 0) return;
    const newBlobs = {};
    for (let i = 0; i < content.length; i++) {
      const slide = content[i];
      if ((slide?.type === 'image' || slide?.type === 'video') && slide?.url) {
        const filename = String(slide.url).split('/').pop();
        const key = `edit_${i}_${filename}`;
        if (mediaBlobs[key]) continue; // уже загружено
        try {
          const fileUrl = slide.url.startsWith('storage/publications/')
            ? `/admin/publications/${encodeURIComponent(filename)}`
            : slide.url;
          const response = await axiosAPI.get(fileUrl, { responseType: 'blob' });
          const blobUrl = URL.createObjectURL(new Blob([response.data]));
          newBlobs[key] = blobUrl;
        } catch (e) {
          console.error('Ошибка загрузки превью редактора:', filename, e);
        }
      }
    }
    if (Object.keys(newBlobs).length > 0) {
      setMediaBlobs(prev => ({ ...prev, ...newBlobs }));
    }
  }, [mediaBlobs]);

  // Автозагрузка превью для текущих слайдов формы
  useEffect(() => {
    loadEditMediaBlobs(formData.content);
  }, [formData.content, loadEditMediaBlobs]);

  // Автозагрузка превью главного фото при изменении
  useEffect(() => {
    if (formData.preview_image) {
      // Если есть локальный blob, загружаем blob с сервера в фоне и затем очищаем локальный
      if (previewImageLocalBlob) {
        loadPreviewBlob(formData.preview_image).then(() => {
          // После успешной загрузки blob с сервера очищаем локальный blob
          URL.revokeObjectURL(previewImageLocalBlob);
          setPreviewImageLocalBlob(null);
        }).catch(() => {
          // Если не удалось загрузить с сервера, оставляем локальный blob
        });
      } else {
        // Если локального blob нет, просто загружаем с сервера
        loadPreviewBlob(formData.preview_image);
      }
    }
  }, [formData.preview_image, previewImageLocalBlob, loadPreviewBlob]);
  
  // Очистка локального blob URL при размонтировании или сбросе формы
  useEffect(() => {
    return () => {
      if (previewImageLocalBlob) {
        URL.revokeObjectURL(previewImageLocalBlob);
      }
    };
  }, [previewImageLocalBlob]);

  // Получение полного URL для файла
  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    if (url.startsWith('storage/publications/')) {
      const filename = url.split('/').pop();
      // Добавляем токен в query параметр для img/video тегов
      const token = localStorage.getItem('accessToken');
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
      if (API_CONFIG.BASE_URL === '') {
        return `/admin/publications/${encodeURIComponent(filename)}${tokenParam}`;
      }
      return `${API_CONFIG.BASE_URL}/admin/publications/${encodeURIComponent(filename)}${tokenParam}`;
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

  // Рендеринг слайда для модалки просмотра
  const renderSlideContent = () => {
    const slide = getCurrentSlide();
    if (!slide) return null;

    switch (slide.type) {
      case 'text':
        return (
          <div className="publication-slide-text">
            <p>{slide.text}</p>
          </div>
        );
      case 'image':
        if (!slide.url) {
          return (
            <div className="publication-slide-image">
              <div style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>
                ⚠️ Изображение не загружено
              </div>
              {slide.caption && <div className="publication-slide-caption">{slide.caption}</div>}
            </div>
          );
        }
        const imageBlobUrl = getMediaBlobUrl(viewingPublication?.id, slide.url);
        const imageUrl = imageBlobUrl || getFullUrl(slide.url);
        return (
          <div className="publication-slide-image">
            <img src={imageUrl} alt={slide.caption || ''} onError={(e) => {
              console.error('Ошибка загрузки изображения:', imageUrl, e);
            }} />
            {slide.caption && <div className="publication-slide-caption">{slide.caption}</div>}
          </div>
        );
      case 'video':
        if (!slide.url) {
          return (
            <div className="publication-slide-video">
              <div style={{ color: '#fff', textAlign: 'center', padding: '40px' }}>
                ⚠️ Видео не загружено
              </div>
              {slide.caption && <div className="publication-slide-caption">{slide.caption}</div>}
            </div>
          );
        }
        const videoBlobUrl = getMediaBlobUrl(viewingPublication?.id, slide.url);
        const videoUrl = videoBlobUrl || getFullUrl(slide.url);
        const handleVideoClick = (e) => {
          const video = e.currentTarget;
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        };
        const handleLoadedMetadata = () => {
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
                console.error('Ошибка загрузки видео:', videoUrl, e);
              }}
              style={{ cursor: 'pointer' }}
            />
            {slide.caption && <div className="publication-slide-caption">{slide.caption}</div>}
          </div>
        );
      case 'document':
        const handleDocumentClick = () => {
          const url = getFullUrl(slide.url);
          if (!url) return;
          const link = document.createElement('a');
          link.href = url;
          link.download = slide.filename || 'document';
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          document.body.appendChild(link);
          link.click();
          link.remove();
        };
        return (
          <div className="publication-slide-document" onClick={handleDocumentClick}>
            <a href={getFullUrl(slide.url)} download={slide.filename || 'document'} target="_blank" rel="noopener noreferrer" onClick={(e) => e.preventDefault()}>
              <div className="publication-document-link">
                📄 {slide.filename || 'Документ'}
              </div>
            </a>
            {slide.caption && <div className="publication-slide-caption">{slide.caption}</div>}
          </div>
        );
      default:
        return null;
    }
  };

  // Показываем состояние загрузки только при первой загрузке
  if (loading && publications.length === 0 && !error) {
    return (
      <div className="publications-management">
        <div className="publications-management-loading">Загрузка публикаций...</div>
      </div>
    );
  }

  return (
    <div className="publications-management">
      {error && (
        <div className="publications-management-error">
          {error}
          <button onClick={() => setError('')}>×</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="publications-management-form">
        <div className="publications-management-form-header">
          <h3>{editingPublication ? 'Редактировать публикацию' : 'Создать публикацию'}</h3>
          {editingPublication && (
            <button type="button" onClick={resetForm} className="publications-management-cancel-btn">
              Отмена
            </button>
          )}
        </div>

        <div className="publications-management-form-field">
          <label>
            Название публикации *
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
              placeholder="Введите название публикации"
            />
          </label>
        </div>

        <div className="publications-management-form-field">
          <label>
            Главное фото публикации (для кружочка)
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handlePreviewImageUpload(file);
                }
              }}
              disabled={uploadingPreviewImage}
            />
            {uploadingPreviewImage && (
              <span style={{ color: '#90c5ff', fontSize: '12px', marginLeft: '8px' }}>Загрузка...</span>
            )}
            {formData.preview_image && !uploadingPreviewImage && (
              <>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#90ee90' }}>
                  Главное фото загружено: {formData.preview_image.split('/').pop()}
                </div>
                {/* Кружковая визуализация (чуть больше, чем в пользовательской ленте) */}
                <div className="publications-management-preview-circle-wrapper">
                  {(() => {
                    // Приоритет: локальный blob URL (если есть) > blob URL с сервера > прямой URL
                    const url = formData.preview_image;
                    let blobUrl = previewImageLocalBlob; // Сначала используем локальный blob
                    
                    if (!blobUrl) {
                      // Если локального blob нет, пытаемся загрузить с сервера
                      blobUrl = String(url).startsWith('http') ? url : getPreviewBlobUrl(url);
                    }
                    
                    if (!blobUrl) {
                      return (
                        <div className="publications-management-preview-circle">
                          <div className="publications-management-preview-circle-inner">
                            <div className="publications-management-preview-circle-placeholder">🖼️</div>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div className="publications-management-preview-circle">
                        <div className="publications-management-preview-circle-inner">
                          <img
                            src={blobUrl}
                            alt="Главное фото"
                            onError={(e) => {
                              // Если локальный blob не загрузился, пытаемся использовать blob с сервера
                              if (previewImageLocalBlob && previewImageLocalBlob === blobUrl) {
                                const serverBlobUrl = String(url).startsWith('http') ? url : getPreviewBlobUrl(url);
                                if (serverBlobUrl && serverBlobUrl !== blobUrl) {
                                  e.currentTarget.src = serverBlobUrl;
                                } else {
                                  e.currentTarget.style.display = 'none';
                                }
                              } else {
                                e.currentTarget.style.display = 'none';
                              }
                            }}
                          />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </label>
        </div>

        <div className="publications-management-form-field">
          <label>
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleInputChange}
            />
            Активна (видна пользователям)
          </label>
        </div>

        <div className="publications-management-slides">
          <div className="publications-management-slides-header">
            <h4>Слайды публикации</h4>
            <button type="button" onClick={addSlide} className="publications-management-add-slide-btn">
              + Добавить слайд
            </button>
          </div>

          {formData.content.map((slide, index) => (
            <div key={index} className="publications-management-slide">
              <div className="publications-management-slide-header">
                <span>Слайд {index + 1}</span>
                <button type="button" onClick={() => removeSlide(index)} className="publications-management-remove-slide-btn">
                  Удалить
                </button>
              </div>

              <div className="publications-management-slide-field">
                <label>
                  Тип слайда
                  <select
                    value={slide.type || 'text'}
                    onChange={(e) => updateSlide(index, 'type', e.target.value)}
                  >
                    <option value="text">Текст</option>
                    <option value="image">Изображение</option>
                    <option value="video">Видео</option>
                    <option value="document">Документ</option>
                  </select>
                </label>
              </div>

              {slide.type === 'text' && (
                <div className="publications-management-slide-field">
                  <label>
                    Текст
                    <textarea
                      value={slide.text || ''}
                      onChange={(e) => updateSlide(index, 'text', e.target.value)}
                      rows="4"
                      placeholder="Введите текст"
                    />
                  </label>
                </div>
              )}

              {(slide.type === 'image' || slide.type === 'video' || slide.type === 'document') && (
                <>
                  <div className="publications-management-slide-field">
                    <label>
                      {slide.type === 'image' && 'Изображение'}
                      {slide.type === 'video' && 'Видео'}
                      {slide.type === 'document' && 'Документ'}
                      <input
                        type="file"
                        accept={slide.type === 'image' ? 'image/*' : slide.type === 'video' ? 'video/*' : '*'}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleFileUpload(index, file);
                          }
                        }}
                        disabled={uploadingFiles[index]}
                      />
                      {uploadingFiles[index] && (
                        <span style={{ color: '#90c5ff', fontSize: '12px', marginLeft: '8px' }}>Загрузка...</span>
                      )}
                      {slide.url && !uploadingFiles[index] && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#90ee90' }}>
                          Файл загружен: {slide.url.split('/').pop()}
                        </div>
                      )}
                    </label>
                    {/* Превью файла (через blob URL, чтобы не было 401) */}
                    {slide.url && !uploadingFiles[index] && (
                      <div className="publications-management-file-preview" style={{ marginTop: '12px' }}>
                        {slide.type === 'image' && (() => {
                          const blobUrl = getEditMediaBlobUrl(index, slide.url);
                          if (!blobUrl) {
                            return <div style={{ padding: '12px', color: '#999' }}>Загрузка превью изображения…</div>;
                          }
                          return (
                            <div style={{ width: '100%', height: '300px', overflow: 'hidden', borderRadius: '4px', border: '1px solid #444', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111' }}>
                              <img 
                                src={blobUrl} 
                                alt="Preview" 
                                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          );
                        })()}
                        {slide.type === 'video' && (() => {
                          const blobUrl = getEditMediaBlobUrl(index, slide.url);
                          if (!blobUrl) {
                            return <div style={{ padding: '12px', color: '#999' }}>Загрузка превью видео…</div>;
                          }
                          return (
                            <div style={{ width: '100%', height: '300px', overflow: 'hidden', borderRadius: '4px', border: '1px solid #444', background: '#111' }}>
                              <video 
                                src={blobUrl} 
                                controls 
                                style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          );
                        })()}
                        {slide.type === 'document' && (() => {
                          const handleDownload = async (e) => {
                            e.preventDefault();
                            try {
                              const filename = String(slide.url).split('/').pop();
                              const fileUrl = slide.url.startsWith('storage/publications/')
                                ? `/admin/publications/${encodeURIComponent(filename)}`
                                : slide.url;
                              const response = await axiosAPI.get(fileUrl, { responseType: 'blob' });
                              const blobUrl = URL.createObjectURL(new Blob([response.data]));
                              const a = document.createElement('a');
                              a.href = blobUrl;
                              a.download = slide.filename || (filename || 'document');
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              setTimeout(() => URL.revokeObjectURL(blobUrl), 0);
                            } catch (err) {
                              console.error('Не удалось скачать документ', err);
                            }
                          };
                          return (
                            <div style={{ padding: '12px', background: '#1a1a1a', borderRadius: '4px', border: '1px solid #444' }}>
                              <a 
                                href="#"
                                onClick={handleDownload}
                                style={{ color: '#90c5ff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                              >
                                📄 {slide.filename || slide.url.split('/').pop() || 'Документ'}
                              </a>
                              <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                                Нажмите для скачивания
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  {slide.type === 'document' && (
                    <div className="publications-management-slide-field">
                      <label>
                        Имя файла (для отображения)
                        <input
                          type="text"
                          value={slide.filename || ''}
                          onChange={(e) => updateSlide(index, 'filename', e.target.value)}
                          placeholder="Введите имя файла"
                        />
                      </label>
                    </div>
                  )}
                </>
              )}

              {(slide.type === 'image' || slide.type === 'video' || slide.type === 'document') && (
                <div className="publications-management-slide-field">
                  <label>
                    Подпись (опционально)
                    <input
                      type="text"
                      value={slide.caption || ''}
                      onChange={(e) => updateSlide(index, 'caption', e.target.value)}
                      placeholder="Введите подпись"
                    />
                  </label>
                </div>
              )}
            </div>
          ))}

          {formData.content.length === 0 && (
            <div className="publications-management-no-slides">
              Нет слайдов. Нажмите "Добавить слайд" чтобы создать публикацию.
            </div>
          )}
        </div>

        <div className="publications-management-form-actions">
          <button type="submit" className="publications-management-save-btn" disabled={loading}>
            {loading ? 'Сохранение...' : editingPublication ? 'Сохранить изменения' : 'Создать публикацию'}
          </button>
        </div>
      </form>

      <div className="publications-management-list">
        <h3>Список публикаций ({publications.length})</h3>
        {publications.length === 0 ? (
          <div className="publications-management-empty">Нет публикаций</div>
        ) : (
          <div className="publications-management-table">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Слайдов</th>
                  <th>Статус</th>
                  <th>Дата публикации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {publications.map((pub) => (
                  <tr 
                    key={pub.id}
                    onClick={() => handleViewPublication(pub)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>{pub.id}</td>
                    <td>{pub.title}</td>
                    <td>{pub.content?.length || 0}</td>
                    <td>
                      <span className={`publications-management-status ${pub.is_active ? 'active' : 'inactive'}`}>
                        {pub.is_active ? 'Активна' : 'Неактивна'}
                      </span>
                    </td>
                    <td>{pub.published_at ? new Date(pub.published_at).toLocaleDateString('ru-RU') : '-'}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleEdit(pub)}
                        className="publications-management-edit-btn"
                      >
                        Редактировать
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(pub.id)}
                        className="publications-management-delete-btn"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Модалка просмотра публикации */}
      {viewingPublication && (
        <div className="publications-modal-overlay" onClick={handleCloseViewModal}>
          <div className="publications-detail-view" onClick={(e) => e.stopPropagation()}>
            <button className="publications-close-btn" onClick={handleCloseViewModal}>×</button>
            
            {/* Прогресс-бары для слайдов */}
            {viewingPublication.content && viewingPublication.content.length > 0 && (
              <div className="publications-progress-bar-container">
                {viewingPublication.content.map((_, index) => (
                  <div key={index} className="publication-progress-bar-wrapper">
                    <div 
                      className="publication-progress-bar"
                      style={{
                        width: index === currentSlideIndex 
                          ? `${slideProgress * 100}%` 
                          : index < currentSlideIndex 
                            ? '100%' 
                            : '0%'
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Контент слайда */}
            <div className="publications-slide-content">
              {renderSlideContent()}
            </div>

            {/* Навигация */}
            {currentSlideIndex > 0 && (
              <div 
                className="publications-nav-left" 
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevSlide();
                }}
              >
                ←
              </div>
            )}
            {currentSlideIndex < (viewingPublication.content?.length || 0) - 1 && (
              <div 
                className="publications-nav-right" 
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextSlide();
                }}
              >
                →
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicationsManagement;

