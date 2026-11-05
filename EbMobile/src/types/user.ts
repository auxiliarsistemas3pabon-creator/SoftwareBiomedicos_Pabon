import type { Rol, Usuario } from "./auth";

export interface CreateUserInput {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Rol;
  phone?: string;
  password: string;
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: Rol;
  phone?: string;
  is_active?: boolean;
}

export interface SetPasswordInput {
  current_password?: string;
  new_password: string;
}

export type { Usuario };
