// Используем глобальный объект axios из CDN
const axiosAPI = axios.create({
  baseURL: "http://localhost:3000",
  headers: {
    "Content-Type": "application/json",
  },
});

axiosAPI.interceptors.request.use(
  (config) => {
    console.log(`interceptors.request отработал`);
    console.log(`config`);console.log(config);

    const token = localStorage.getItem("token");

    console.log(`token`);console.log(token)
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
