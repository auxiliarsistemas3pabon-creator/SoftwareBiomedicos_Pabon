export type Rol =
  | "superadmin"
  | "admin"
  | "coordinador"
  | "ingeniero"
  | "tecnico"
  | "usuario";

export interface Usuario {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Rol;
  phone?: string | null;
  is_active: boolean;
  branch?: number | null;
  branch_name?: string | null;
  date_joined?: string;
  last_login?: string | null;
}

/** Representación mínima del usuario asignado que anida el backend (`*_detail`). */
export interface AssignedUser {
  id: number;
  username: string;
  full_name: string;
  role: Rol;
  role_display: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
}

export interface RefreshResponse {
  access: string;
  /** Presente cuando el backend rota el refresh token (ROTATE_REFRESH_TOKENS). */
  refresh?: string;
}
