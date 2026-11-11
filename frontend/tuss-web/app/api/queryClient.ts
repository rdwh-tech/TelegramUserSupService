// app/api/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,        // Данные считаются свежими 30 секунд
      gcTime: 1000 * 60 * 5,       // Кэш удерживается в памяти 5 минут
      retry: 1,                    // 1 повторная попытка при сетевом сбое
      refetchOnWindowFocus: false, // Без лишних повторных запросов при смене окна
    },
    mutations: {
      retry: 0,                    // Мутации не повторять автоматически во избежание дубликатов
    },
  },
});
