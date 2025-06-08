// Используем глобальный объект axios из CDN
export const API_URL = "http://localhost:3000";
const axiosAPI = axios.create({
  baseURL: "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosAPI.interceptors.request.use(
  (config) => {
    console.log(`interceptors.request отработал`);
    console.log(config);
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosAPI;
