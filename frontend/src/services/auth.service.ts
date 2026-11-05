import { api } from "@/lib/api";
import type { LoginRequest, Usuario } from "@/types/authentication/auth";

export const authService = {
  async login(data: LoginRequest) {
    // /auth/token/cookie/ (no /auth/token/): esa otra ruta es la que usa la
    // app móvil y devuelve los tokens en el body. El frontend web necesita
    // la variante que los entrega como cookies httpOnly — el body de la
    // respuesta queda vacío, por eso no hay tipo de retorno útil acá.
    await api.post("/auth/token/cookie/", data);
  },
  async me() {
    const res = await api.get<Usuario>("/users/me/");
    return res.data;
  },
  async logout() {
    // Invalida el refresh token en el backend (blacklist) y borra las
    // cookies de sesión. Se ignora cualquier error: el logout local
    // (limpiar estado en memoria) debe funcionar igual aunque el request
    // falle (p. ej. sin conexión).
    await api.post("/auth/token/cookie/logout/").catch(() => undefined);
  },
};
