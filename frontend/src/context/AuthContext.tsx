import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { userCache } from "@/lib/api";
import { authService } from "@/services/auth.service";
import type { LoginRequest, Usuario } from "@/types/authentication/auth";

interface AuthContextValue {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: LoginRequest) => Promise<Usuario>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadCachedUser(): Usuario | null {
  return (userCache.get() as Usuario | null) ?? null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const cachedUser = loadCachedUser();
  const [usuario, setUsuario] = useState<Usuario | null>(cachedUser);
  // Sólo bloqueamos la app si NO hay caché de usuario: como el token ahora
  // vive en una cookie httpOnly que JS no puede leer, no hay forma de saber
  // de antemano si hay sesión sin preguntarle al backend.
  const [loading, setLoading] = useState<boolean>(!cachedUser);

  useEffect(() => {
    let cancelled = false;

    // Hidratación: intentamos /users/me/. La cookie de sesión (si existe)
    // viaja sola gracias a withCredentials. Si no hay sesión, el backend
    // responde 401 y el catch limpia la caché.
    authService
      .me()
      .then((u) => {
        if (cancelled) return;
        setUsuario(u);
        userCache.set(u);
      })
      .catch(() => {
        if (cancelled) return;
        // Sin cookie válida el 401 de /users/me/ es definitivo (el interceptor
        // ya intentó refresh). Si dejamos el perfil cacheado, NotificationContext
        // abre el WebSocket y el server cierra con 4401.
        userCache.clear();
        setUsuario(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (data: LoginRequest) => {
    await authService.login(data);
    const u = await authService.me();
    setUsuario(u);
    userCache.set(u);
    return u;
  };

  const logout = () => {
    // Fire-and-forget: no bloqueamos la UI a que el backend confirme el
    // blacklist del refresh token para limpiar el estado local.
    void authService.logout();
    userCache.clear();
    setUsuario(null);
  };

  const refreshUser = async () => {
    const u = await authService.me();
    setUsuario(u);
    userCache.set(u);
  };

  return (
    <AuthContext.Provider
      value={{
        usuario,
        isAuthenticated: !!usuario,
        loading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
