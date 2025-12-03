import axiosAPI from '../http/axios.js'
import { login as authLogin, registration as authRegistration, logout as authLogout, getCSRF, getWebSocketCSRF } from "../services/AuthService.js"
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { API_CONFIG } from '../../../config/api.js'
import defaultAvatarUrl from '../../../IMG/male/ava.png'

// Zustand store (с сохранением API совместимости)
export const useAuthStore = create()(
  devtools(
    persist(
      (set, get) => ({
        // state
        isAuth: false,
        user: null,
        token: null,
        isCaptcha: false,
        responseAxios: null,
        hydrated: false,
        isCheckingAuth: false,

        // basic setters
        setHydrated: () => {
          set({ hydrated: true });
          // Обновляем аватары при восстановлении состояния с задержкой для DOM
          setTimeout(async () => {
            const state = get();
            console.log('setHydrated: проверяем состояние после восстановления:', {
              isAuth: state.isAuth,
              user: state.user,
              avatar: state.user?.avatar
            });
            
            if (state.isAuth && state.user?.avatar) {
              console.log('setHydrated: обновляем аватары после восстановления состояния');
              let avatarUrl = state.user.avatar;
              
              // Проверяем, является ли avatar уже полным URL или относительным путем
              if (avatarUrl !== 'noAvatar' && !avatarUrl.startsWith('http')) {
                // Если это относительный путь, добавляем базовый URL
                avatarUrl = `${API_CONFIG.BASE_URL}${avatarUrl}`;
              }
              
              state.updateAvatarsInDOM(avatarUrl);
            }
          }, 100);
        },
        setAuth: (bool) => set({ isAuth: Boolean(bool) }),
        setUser: (newUser) => set({ user: newUser }),
        updateUser: (updatedUserData) => {
          set((state) => {
            const updatedUser = { ...state.user, ...updatedUserData };
            
            console.log('updateUser: Обновляем пользователя:', {
              oldUser: state.user,
              newData: updatedUserData,
              updatedUser,
              avatar: updatedUser?.avatar
            });
            
            // Обновляем аватары в DOM
            if (updatedUser?.avatar !== undefined) {
              let avatarUrl;
              if (updatedUser.avatar === 'noAvatar' || !updatedUser.avatar) {
                avatarUrl = 'noAvatar'; // Передаем 'noAvatar' для обработки в updateAvatarsInDOM
              } else {
                avatarUrl = updatedUser.avatar.startsWith('http') ? updatedUser.avatar : `${API_CONFIG.BASE_URL}${updatedUser.avatar}`;
              }
              // Используем setTimeout чтобы DOM обновился после setState
              setTimeout(() => {
                get().updateAvatarsInDOM(avatarUrl);
              }, 0);
            }
            
            return { user: updatedUser };
          });
        },
        setResponse: (resp) => set({ responseAxios: resp }),
        setIsCaptcha: (bool) => set({ isCaptcha: Boolean(bool) }),

        // CSRF management - получение токена для установки httpOnly куки
        fetchCSRFToken: async () => {
          try {
            console.log('Запрашиваем CSRF токен у сервера...');
            const response = await getCSRF();
            console.log('CSRF токен получен, сервер должен установить httpOnly куку');
            return response;
          } catch (error) {
            console.error('Ошибка получения CSRF токена:', error);
            throw error;
          }
        },

        // WebSocket CSRF management - получение специального токена для WebSocket
        fetchWebSocketCSRFToken: async () => {
          try {
            console.log('Запрашиваем WebSocket CSRF токен у сервера...');
            const response = await getWebSocketCSRF();
            console.log('WebSocket CSRF токен получен, сервер должен установить httpOnly куку');
            return response;
          } catch (error) {
            console.error('Ошибка получения WebSocket CSRF токена:', error);
            throw error;
          }
        },

        // Получение полных данных пользователя
        fetchUserProfile: async () => {
          try {
            console.log('=== FETCH USER PROFILE ===');
            console.log('Получаем полные данные пользователя...');
            
            const token = localStorage.getItem('accessToken');
            if (!token) {
              throw new Error('Токен не найден');
            }
            
            const response = await axiosAPI.get('/profile/user-data');
            
            console.log('fetchUserProfile: Получены данные пользователя:', response.data);
            console.log('fetchUserProfile: Аватар пользователя:', response.data?.user?.avatar);
            
            if (response.data?.user) {
              get().updateUser(response.data.user);
            }
            
            return response.data;
            
          } catch (error) {
            console.error('Ошибка при получении данных пользователя:', error);
            throw error;
          }
        },

        // Получение логов пользователя (только входы)
        fetchUserLogs: async () => {
          try {
            console.log('=== FETCH USER LOGS ===');
            console.log('Получаем логи пользователя...');
            
            const token = localStorage.getItem('accessToken');
            if (!token) {
              console.log('Токен не найден в localStorage');
              return { logs: [], total: 0 };
            }
            
            const response = await axiosAPI.get('/profile/logs', {
              params: {
                limit: 50,
                loginOnly: true
              }
            });
            
            console.log('=== FETCH USER LOGS RESPONSE ===');
            console.log('Response:', response);
            console.log('Response data:', response.data);
            
            return response.data;
            
          } catch (error) {
            console.error('Ошибка получения логов:', error);
            throw error;
          }
        },

        // Обновление профиля пользователя
        updateProfile: async (profileData) => {
          try {
            console.log('=== UPDATE PROFILE ===');
            console.log('Обновляем профиль пользователя...');
            
            // Проверяем токен перед отправкой
            const token = localStorage.getItem('accessToken');
            console.log('Токен в localStorage:', token ? 'ЕСТЬ' : 'НЕТ');
            console.log('Токен значение:', token);
            
            // Создаем FormData для отправки файла
            const formData = new FormData();
            
            // Добавляем текстовые данные
            formData.append('email', get().user?.email);
            formData.append('surname', profileData.surname);
            formData.append('firstname', profileData.firstname);
            formData.append('patronymic', profileData.patronymic);
            formData.append('phone', profileData.phone);
            formData.append('telegram', profileData.telegram);
            formData.append('geography', profileData.geography);
            formData.append('dateborn', profileData.dateborn);
            formData.append('gender', profileData.gender);
            
            // Добавляем файл аватарки, если есть
            if (profileData.avatarFile) {
              formData.append('avatar', profileData.avatarFile);
            }
            
            console.log('Отправляем запрос на /profile/correct-profileData');
            console.log('FormData содержимое:');
            for (let [key, value] of formData.entries()) {
              console.log(`${key}:`, value);
              if (value instanceof File) {
                console.log(`  - Файл: ${value.name}, размер: ${value.size}, тип: ${value.type}`);
              }
            }
            
            const response = await axiosAPI.put('/profile/correct-profileData', formData);
            
            console.log('Профиль успешно обновлен:', response.data);
            
            // После успешного сохранения перезагружаем полные данные пользователя
            console.log('Перезагружаем полные данные пользователя...');
            await get().fetchUserProfile();
            
            return response.data;
            
          } catch (error) {
            console.error('Ошибка при обновлении профиля:', error);
            throw error;
          }
        },

        // helpers
        updateAvatarsInDOM: (avatarUrl) => {
          try {
            console.log('updateAvatarsInDOM: обновляем аватары с URL:', avatarUrl);
            console.log('updateAvatarsInDOM: DOM готов?', document.readyState);
            console.log('updateAvatarsInDOM: Тип avatarUrl:', typeof avatarUrl);
            console.log('updateAvatarsInDOM: avatarUrl начинается с http?', avatarUrl?.startsWith('http'));
            
            // Проверяем, что аватар не равен 'noAvatar'
            if (avatarUrl === 'noAvatar' || !avatarUrl) {
              console.log('updateAvatarsInDOM: аватар равен noAvatar или пустой, используем дефолтную картинку');
              avatarUrl = defaultAvatarUrl; // Дефолтная картинка
            }
            
            // Обновляем аватар в профиле
            const profileAvatarImg = document.querySelector('.profile-avatar-img');
            console.log('updateAvatarsInDOM: найден profile-avatar-img?', !!profileAvatarImg);
            if (profileAvatarImg) {
              profileAvatarImg.src = avatarUrl;
              console.log('updateAvatarsInDOM: обновлен profile-avatar-img с URL:', avatarUrl);
            }
            
            // Обновляем мини-аватар в корне
            const rootAvatarMini = document.querySelector('.root-avatarmini-icon-img');
            console.log('updateAvatarsInDOM: найден root-avatarmini-icon-img?', !!rootAvatarMini);
            if (rootAvatarMini) {
              rootAvatarMini.src = avatarUrl;
              console.log('updateAvatarsInDOM: обновлен root-avatarmini-icon-img с URL:', avatarUrl);
            }
            
            // Обновляем аватар в форме редактирования
            const correctDataAvatar = document.querySelector('.correct-data-profile-avatar-item-img');
            console.log('updateAvatarsInDOM: найден correct-data-profile-avatar-item-img?', !!correctDataAvatar);
            if (correctDataAvatar) {
              correctDataAvatar.src = avatarUrl;
              console.log('updateAvatarsInDOM: обновлен correct-data-profile-avatar-item-img с URL:', avatarUrl);
            }
            
            console.log('updateAvatarsInDOM: все аватары обновлены');
          } catch (error) {
            console.error('updateAvatarsInDOM: ошибка при обновлении аватаров:', error);
          }
        },

        handleAuthResponse: (response) => {
          const token = response?.data?.token || response?.data?.accessToken
          const refreshToken = response?.data?.refreshToken
          const user = response?.data?.user ?? get().user
          if (!token) throw new Error('Invalid auth response')
          console.log('handleAuthResponse: обновляем токен в localStorage:', token)
          console.log('handleAuthResponse: пользователь из ответа:', user)
          console.log('handleAuthResponse: аватар пользователя:', user?.avatar)
          localStorage.setItem('accessToken', token)
          if (refreshToken) {
            localStorage.setItem('refreshToken', refreshToken)
            console.log('handleAuthResponse: обновлен refreshToken:', refreshToken)
          }
          axiosAPI.defaults.headers.Authorization = `Bearer ${token}`
          console.log('handleAuthResponse: установлен заголовок Authorization в axios:', axiosAPI.defaults.headers.Authorization)
          set({ isAuth: true, token, user })
          
          // Обновляем аватары в DOM
          if (user?.avatar) {
            let avatarUrl;
            if (user.avatar === 'noAvatar' || !user.avatar) {
              avatarUrl = 'noAvatar'; // Передаем 'noAvatar' для обработки в updateAvatarsInDOM
            } else {
              avatarUrl = user.avatar.startsWith('http') ? user.avatar : `${API_CONFIG.BASE_URL}${user.avatar}`;
            }
            get().updateAvatarsInDOM(avatarUrl);
          }
        },

        resetAuth: () => {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          delete axiosAPI.defaults.headers.Authorization
          set({ isAuth: false, token: null, user: null })
        },

        // actions
        login: async (email, password, deviceInfo = null) => {
          const response = await authLogin(email, password, null, deviceInfo)
          get().handleAuthResponse(response)
          await get().checkAuth()
          // После успешного логина загружаем полные данные пользователя
          await get().fetchUserProfile()
          return response
        },

        registration: async (email, password, name, surname, patronymic, phone, captcha) => {
          let referralCode = '';
          try { referralCode = localStorage.getItem('itc_ref_link_partner') || ''; } catch(error) {console.error('registration: ошибка при получении referralCode:', error)}
          const response = await authRegistration(email, password, name, surname, patronymic, phone, captcha, referralCode)
          get().handleAuthResponse(response)
          await get().checkAuth()
          // После успешной регистрации загружаем полные данные пользователя
          await get().fetchUserProfile()
          return response
        },

        logout: async () => {
          await authLogout()
          get().resetAuth()
        },

        checkAuth: async () => {
          // Защита от дублирующих запросов
          if (get().isCheckingAuth) {
            console.log('checkAuth: запрос уже выполняется, ждем завершения...')
            // Ждем завершения текущего запроса
            while (get().isCheckingAuth) {
              await new Promise(resolve => setTimeout(resolve, 100))
            }
            return get().isAuth
          }

          try {
            set({ isCheckingAuth: true })
            console.log('checkAuth: начинаем проверку аутентификации')
            
            const token = localStorage.getItem('accessToken')
            console.log('checkAuth: токен из localStorage:', token)
            
            // Если токена нет, сразу возвращаем false без API запроса для оптимизации
            if (!token) { // Проверяем наличие токена в localStorage
              console.log('checkAuth: токен не найден в localStorage, пропускаем API запрос') // Логируем отсутствие токена
              get().resetAuth() // Сбрасываем состояние аутентификации в store
              return false // Возвращаем false, так как пользователь не аутентифицирован
            }
            
            // Проверяем, не истек ли токен локально перед отправкой запроса
            try {
              const tokenPayload = JSON.parse(atob(token.split('.')[1]));
              const isExpired = tokenPayload.exp * 1000 < Date.now();
              if (isExpired) {
                console.log('checkAuth: токен истек локально, пропускаем API запрос');
                get().resetAuth();
                return false;
              }
            } catch (tokenError) {
              console.log('checkAuth: токен невалиден, пропускаем API запрос');
              get().resetAuth();
              return false;
            }
            
            axiosAPI.defaults.headers.Authorization = `Bearer ${token}`
            console.log('checkAuth: установлен заголовок Authorization')
            console.log('checkAuth: отправляем запрос на /auth/checkAuth')
            const response = await axiosAPI.get('/auth/checkAuth')
            console.log('checkAuth: получен ответ от сервера:', response.data)
            if (response?.data?.token) {
              console.log('checkAuth: получен новый токен от сервера:', response.data.token)
              console.log('checkAuth: пользователь из ответа checkAuth:', response.data.user)
              get().handleAuthResponse(response)
              // После успешной проверки аутентификации загружаем полные данные пользователя
              await get().fetchUserProfile()
              return true
            }
            console.log('checkAuth: токен не получен, сбрасываем аутентификацию')
            get().resetAuth()
            return false
          } catch (error) {
            console.error('checkAuth: ошибка при проверке аутентификации:', error)
            // Не сбрасываем аутентификацию при ошибке сети, только при ошибке токена
            if (error.response?.status === 401) {
              console.log('checkAuth: получена ошибка 401, сбрасываем аутентификацию');
              get().resetAuth();
            }
            return false
          } finally {
            set({ isCheckingAuth: false })
            console.log('checkAuth: проверка аутентификации завершена')
          }
        },
      }),
            {
              name: 'auth-store',
              version: 1,
              partialize: (state) => ({ isAuth: state.isAuth, token: state.token, user: state.user }),
              onRehydrateStorage: () => (state) => state?.setHydrated?.(),
            }
    ),
    { name: 'auth' }
  )
)

// Инициализация axios Authorization из localStorage при загрузке модуля
;(() => {
  const token = localStorage.getItem('accessToken')
  if (token) axiosAPI.defaults.headers.Authorization = `Bearer ${token}`
})()

// Совместимость со старым API (геттеры/сеттеры/экшены)
export const getUser = () => useAuthStore.getState().user
export const getIsAuth = () => useAuthStore.getState().isAuth
export const getResponse = () => useAuthStore.getState().responseAxios
export const getIsCaptcha = () => useAuthStore.getState().isCaptcha

export const setAuth = (bool) => useAuthStore.getState().setAuth(bool)
export const setUser = (newUser) => useAuthStore.getState().setUser(newUser)
export const setResponse = (resp) => useAuthStore.getState().setResponse(resp)
export const setIsCaptcha = (bool) => useAuthStore.getState().setIsCaptcha(bool)

export const login = async (email, password) => useAuthStore.getState().login(email, password)
export const registration = async (email, password, name, surname, patronymic, phone, captcha) => useAuthStore.getState().registration(email, password, name, surname, patronymic, phone, captcha)
export const logout = async () => useAuthStore.getState().logout()
export const checkAuth = async () => useAuthStore.getState().checkAuth()
export const fetchCSRFToken = async () => useAuthStore.getState().fetchCSRFToken
export const fetchWebSocketCSRFToken = async () => useAuthStore.getState().fetchWebSocketCSRFToken

// Default export совместимый с прежним импортом
export default {
  user: getUser,
  isAuth: getIsAuth,
  setAuth,
  setUser,
  setResponse,
  login,
  registration,
  logout,
  checkAuth,
  fetchCSRFToken,
  fetchWebSocketCSRFToken,
}