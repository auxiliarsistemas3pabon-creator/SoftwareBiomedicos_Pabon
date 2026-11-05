import { api } from "@/lib/api";
import type { LoginRequest, LoginResponse, Usuario } from "@/types/auth";

export const authService = {
  async login(data: LoginRequest) {
    const res = await api.post<LoginResponse>("/auth/token/", data);
    return res.data;
  },
  async me() {
    const res = await api.get<Usuario>("/users/me/");
    return res.data;
  },
  /**
   * Invalida el refresh token en el backend (blacklist) para que no se
   * pueda seguir usando aunque alguien lo capture antes del logout. Se
   * ignora cualquier error: el logout local (borrar SecureStore) debe
   * funcionar igual aunque el request falle (p. ej. sin conexión).
   */
  async logout(refresh: string | null) {
    if (!refresh) return;
    await api.post("/auth/token/blacklist/", { refresh }).catch(() => undefined);
  },
};
