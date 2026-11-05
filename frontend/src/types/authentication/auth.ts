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
  area?: string | null;
  is_active: boolean;
  branch?: number | null;
  branch_name?: string | null;
  date_joined?: string;
  last_login?: string | null;
}

/**
 * Representación mínima de un usuario asignado, tal como la devuelve el
 * backend en los campos anidados `*_detail` (read-only).
 */
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
