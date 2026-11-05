import type { FormState } from "@/types/authentication/form";

export const PAGE_SIZE = 20;

export const empty: FormState = {
  username: "",
  email: "",
  first_name: "",
  last_name: "",
  role: "tecnico",
  phone: "",
  area: "",
  password: "",
  is_active: true,
};
