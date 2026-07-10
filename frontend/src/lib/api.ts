import axios from "axios";

const getBaseUrl = () => {
  const envBaseUrl =
    import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_BACKEND_URL;

  if (envBaseUrl) return envBaseUrl;

  // Dev default: backend runs separately on port 5000
  if (import.meta.env.DEV) return "http://localhost:5000/api";

  // Prod default: same origin (e.g. https://securesend.co.in/api)
  return `${window.location.origin}/api`;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to include JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default api;
