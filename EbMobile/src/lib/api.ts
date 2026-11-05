import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import { secureStorage, asyncStorage } from "./storage";

// Resolución del baseURL en orden de prioridad:
//   1. Variable de entorno EXPO_PUBLIC_API_BASE_URL (.env)
//   2. expo.extra.apiBaseUrl en app.json
//   3. Fallback a http://localhost:8010/api/v1
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  (Constants.expoConfig?.extra as { apiBaseUrl?: string } | undefined)?.apiBaseUrl ??
  "http://localhost:8010/api/v1";

// Log de diagnóstico: ver en la consola de Metro qué URL realmente quedó
// resuelta para la build actual (útil cuando el .env no se cargó o la
// caché de Metro está sirviendo un valor viejo).
console.log("[API] baseURL =", API_BASE_URL);

export const ACCESS_TOKEN_KEY = "biometric_access_token";
export const REFRESH_TOKEN_KEY = "biometric_refresh_token";
export const USER_KEY = "biometric_user";

// SecureStore para tokens (Keychain en iOS, EncryptedSharedPreferences en Android).
// Cache en memoria para evitar el coste async en cada request.
let cachedAccess: string | null = null;
let cachedRefresh: string | null = null;

export const tokenStorage = {
  async loadFromDisk(): Promise<void> {
    cachedAccess = await secureStorage.get(ACCESS_TOKEN_KEY);
    cachedRefresh = await secureStorage.get(REFRESH_TOKEN_KEY);
  },
  getAccess(): string | null {
    return cachedAccess;
  },
  getRefresh(): string | null {
    return cachedRefresh;
  },
  async setTokens(access: string, refresh?: string): Promise<void> {
    cachedAccess = access;
    await secureStorage.set(ACCESS_TOKEN_KEY, access);
    if (refresh) {
      cachedRefresh = refresh;
      await secureStorage.set(REFRESH_TOKEN_KEY, refresh);
    }
  },
  async clear(): Promise<void> {
    cachedAccess = null;
    cachedRefresh = null;
    await secureStorage.remove(ACCESS_TOKEN_KEY);
    await secureStorage.remove(REFRESH_TOKEN_KEY);
    await asyncStorage.remove(USER_KEY);
  },
};

const REQUEST_TIMEOUT_MS = 15000;

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

// Cliente "raw" para refresh — sin interceptores para no entrar en bucles.
const rawClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pending: ((token: string | null) => void)[] = [];

function notifyAll(token: string | null) {
  pending.forEach((cb) => cb(token));
  pending = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh();
  if (!refresh) return null;
  try {
    const { data } = await rawClient.post<{ access: string; refresh?: string }>(
      "/auth/token/refresh/",
      { refresh },
    );
    // El backend tiene ROTATE_REFRESH_TOKENS + BLACKLIST_AFTER_ROTATION: cada
    // refresh devuelve un refresh token nuevo y anula el anterior. Hay que
    // persistir el nuevo o el siguiente refresh fallará con el token en la
    // blacklist (y forzaría un logout ~1h después de entrar).
    await tokenStorage.setTokens(data.access, data.refresh);
    return data.access;
  } catch {
    return null;
  }
}

// Hook que la app registra para forzar logout cuando el refresh falla.
// Evita acoplar este módulo a la navegación o al AuthContext.
let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(handler: (() => void) | null) {
  onSessionExpired = handler;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    const url = original?.url ?? "";

    // Log de diagnóstico para CUALQUIER error que pase por axios. El "Network
    // Error" típico no trae response → status undefined y error.code = ERR_NETWORK.
    // No se loguea el body de la respuesta (`error.response?.data`): puede
    // traer datos sensibles/PII devueltos por el backend en un 400, y esto
    // queda en Logcat/logs del sistema también en builds de producción.
    console.warn("[API ERROR]", {
      fullUrl: `${original?.baseURL ?? ""}${url}`,
      method: original?.method?.toUpperCase(),
      code: error.code,
      status,
      message: error.message,
    });

    const isAuthEndpoint =
      url.includes("/auth/token/") || url.includes("/auth/token/refresh/");

    if (status !== 401 || original?._retry || isAuthEndpoint) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pending.push((token) => {
          if (!token) {
            reject(error);
            return;
          }
          original._retry = true;
          original.headers = {
            ...(original.headers ?? {}),
            Authorization: `Bearer ${token}`,
          };
          resolve(api(original));
        });
      });
    }

    original._retry = true;
    isRefreshing = true;
    const newToken = await refreshAccessToken();
    isRefreshing = false;
    notifyAll(newToken);

    if (!newToken) {
      await tokenStorage.clear();
      if (onSessionExpired) onSessionExpired();
      return Promise.reject(error);
    }

    original.headers = {
      ...(original.headers ?? {}),
      Authorization: `Bearer ${newToken}`,
    };
    return api(original);
  },
);

export function getApiErrorMessage(error: unknown, fallback = "Ocurrió un error"): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const detail = (data as { detail?: unknown }).detail;
      if (typeof detail === "string") return detail;
      const firstField = Object.values(data as Record<string, unknown>)[0];
      if (Array.isArray(firstField) && typeof firstField[0] === "string") {
        return firstField[0];
      }
      if (typeof firstField === "string") return firstField;
    }
    if (error.message) return error.message;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
