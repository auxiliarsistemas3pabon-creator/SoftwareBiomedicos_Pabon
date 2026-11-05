import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { setOnSessionExpired, tokenStorage, USER_KEY } from "@/lib/api";
import { asyncStorage } from "@/lib/storage";
import { authService } from "@/services/auth.service";
import type { LoginRequest, Usuario } from "@/types/auth";

interface AuthContextValue {
  usuario: Usuario | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: LoginRequest) => Promise<Usuario>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    // Hidratación inicial: cargar tokens de SecureStore + perfil cacheado
    // de AsyncStorage. Si hay tokens pero no perfil, llamamos a /users/me/.
    (async () => {
      await tokenStorage.loadFromDisk();
      const cachedRaw = await asyncStorage.get(USER_KEY);
      let cachedUser: Usuario | null = null;
      if (cachedRaw) {
        try {
          cachedUser = JSON.parse(cachedRaw) as Usuario;
        } catch {
          cachedUser = null;
        }
      }
      if (!cancelled && cachedUser) setUsuario(cachedUser);

      const token = tokenStorage.getAccess();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const u = await authService.me();
        if (cancelled) return;
        setUsuario(u);
        await asyncStorage.set(USER_KEY, JSON.stringify(u));
      } catch {
        if (cancelled) return;
        // Si no había caché, limpiamos sesión. Si la había, conservamos
        // el usuario optimistamente y dejamos que un 401 posterior dispare
        // el refresh + logout.
        if (!cachedUser) {
          await tokenStorage.clear();
          setUsuario(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // Si el refresh falla en algún momento, el interceptor del API llama
    // a este handler — vaciamos el estado y la app vuelve a la pantalla
    // pública automáticamente (la navegación se reactiva al cambiar el
    // valor de `isAuthenticated`).
    setOnSessionExpired(() => setUsuario(null));

    return () => {
      cancelled = true;
      setOnSessionExpired(null);
    };
  }, []);

  const login = async (data: LoginRequest) => {
    const tokens = await authService.login(data);
    await tokenStorage.setTokens(tokens.access, tokens.refresh);
    const u = await authService.me();
    setUsuario(u);
    await asyncStorage.set(USER_KEY, JSON.stringify(u));
    return u;
  };

  const logout = async () => {
    // Invalida el refresh token en el backend antes de borrarlo localmente
    // (si el request falla, igual se limpia la sesión local).
    await authService.logout(tokenStorage.getRefresh());
    await tokenStorage.clear();
    setUsuario(null);
  };

  const refreshUser = async () => {
    const u = await authService.me();
    setUsuario(u);
    await asyncStorage.set(USER_KEY, JSON.stringify(u));
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

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}
