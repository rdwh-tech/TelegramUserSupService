// app/api/client.ts
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { authStorage } from "./authStorage";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000, // 10 сек
});

// Request Interceptor: Автоматически добавляем Bearer-токен
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authStorage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Обработка 401 Unauthorized и сетевых ошибок
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; error?: string }>) => {
    if (error.response) {
      const status = error.response.status;

      // 401 Unauthorized: Сессия истекла или недействительна
      if (status === 401) {
        authStorage.clearAuth();

        if (typeof window !== "undefined") {
          // Уведомляем приложение о разлогине
          window.dispatchEvent(new CustomEvent("tuss:unauthorized"));

          // Перенаправляем на страницу входа, если мы не на ней
          if (!window.location.pathname.startsWith("/login")) {
            window.location.href = "/login";
          }
        }
      }

      // Возвращаем понятный текст ошибки от сервера, если есть
      const serverMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        `Ошибка сервера (${status})`;

      return Promise.reject(new Error(serverMessage));
    }

    if (error.request) {
      // Запрос отправлен, но ответ не получен (сервер недоступен)
      return Promise.reject(
        new Error("Не удалось связаться с сервером. Проверьте подключение к сети.")
      );
    }

    return Promise.reject(error);
  }
);
