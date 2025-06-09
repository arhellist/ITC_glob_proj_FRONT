import { logout } from "../store/store.js";

const axiosAPI = axios.create({
  baseURL: "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true // Добавляем по умолчанию
});

// Request interceptor
axiosAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
axiosAPI.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Проверяем, что это 401 ошибка и запрос еще не повторялся
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        console.log('Пробуем обновить токен...');
        const { data } = await axiosAPI.post('/auth/refresh', {});
        
        if (data.accessToken) {
          console.log('Токен успешно обновлен');
          localStorage.setItem('accessToken', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return axiosAPI(originalRequest);
        } else {
          throw new Error('Новый токен не получен');
        }
      } catch (refreshError) {
        console.error('Ошибка обновления токена:', refreshError);
        
        // Проверяем, является ли это ошибкой истечения refreshToken
        if (refreshError.response?.status === 401) {
          console.log('RefreshToken истек, выполняем выход из системы');
          // Выполняем выход из системы
          await logout();
          // Можно также перенаправить на страницу входа
          window.location.reload();
        } else if (refreshError.response?.status === 403) {
          console.log('RefreshToken недействителен, выполняем выход из системы');
          await logout();
          window.location.reload();
        } else {
          console.log('Неизвестная ошибка при обновлении токена');
          await logout();
          window.location.reload();
        }
        
        return Promise.reject(refreshError);
      }
    }
    
    // Если это не 401 ошибка или запрос уже повторялся, просто возвращаем ошибку
    return Promise.reject(error);
  }
);

export default axiosAPI;