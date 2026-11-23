// app/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { authApi } from "~/api/auth";
import { authStorage } from "~/api/authStorage";
import type { User, LoginPayload, RegisterPayload } from "~/types/user";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => authStorage.getUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Синхронизация профиля с сервера при загрузке страницы
  const refreshUser = useCallback(async (): Promise<User | null> => {
    if (!authStorage.getToken()) {
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const freshUser = await authApi.getMe();
      setUser(freshUser);
      return freshUser;
    } catch (error) {
      // Если запрос упал (например, оффлайн), берем кэшированного из storage
      const cached = authStorage.getUser();
      setUser(cached);
      return cached;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();

    // Слушатель глобального события 401 Unauthorized от axios interceptor
    const handleUnauthorized = () => {
      setUser(null);
    };

    window.addEventListener("tuss:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("tuss:unauthorized", handleUnauthorized);
    };
  }, [refreshUser]);

  const login = useCallback(
    async (credentials: LoginPayload): Promise<User> => {
      setIsLoading(true);
      try {
        const response = await authApi.login(credentials);
        setUser(response.user);
        return response.user;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<User> => {
      setIsLoading(true);
      try {
        const response = await authApi.register(payload);
        setUser(response.user);
        return response.user;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: !!user && authStorage.isAuthenticated(),
      isLoading,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
