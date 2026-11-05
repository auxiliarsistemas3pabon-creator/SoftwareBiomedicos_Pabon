import type { Rol } from "@/types/authentication/auth";

export interface FormState {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Rol;
  phone: string;
  area: string;
  password: string;
  is_active: boolean;
}
