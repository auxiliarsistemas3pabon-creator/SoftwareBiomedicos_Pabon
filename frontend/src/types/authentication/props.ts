import type { Rol, Usuario } from "@/types/authentication/auth";
import type { Dispatch, SetStateAction, FormEvent } from "react";
import type { FormState } from "@/types/authentication/form";

export interface UserFiltersProps {
  setSearch: Dispatch<SetStateAction<string>>;
  userOptions: { value: string; label: string; hint?: string }[];
  roleFilter: string;
  setRoleFilter: Dispatch<SetStateAction<string>>;
  activeFilter: string;
  setActiveFilter: Dispatch<SetStateAction<string>>;
}

export interface UserRowProps {
  u: Usuario;
  canEdit: boolean;
  canDelete: boolean;
  role: Rol | undefined;
  usuario: Usuario | null;
  togglingId: number | null;
  requestToggle: (u: Usuario) => void;
  setPwdTarget: Dispatch<SetStateAction<Usuario | null>>;
  setNewPassword: Dispatch<SetStateAction<string>>;
  openEdit: (u: Usuario) => void;
  setToDelete: Dispatch<SetStateAction<Usuario | null>>;
  canCreate: boolean;
  assignableRoles: Rol[];
  openCreate: () => void;
}

export interface UserTableProps extends Omit<UserRowProps, "u"> {
  items: Usuario[];
  loading: boolean;
}

export interface UserPaginationProps {
  count: number;
  start: number;
  end: number;
  page: number;
  totalPages: number;
  loading: boolean;
  setPage: Dispatch<SetStateAction<number>>;
}

export interface UserFormModalProps {
  creating: boolean;
  editing: Usuario | null;
  closeModal: () => void;
  submit: (ev: FormEvent) => void;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  roleOptions: { value: Rol; label: string }[];
  role: Rol | undefined;
  saving: boolean;
}

export interface PasswordModalProps {
  pwdTarget: Usuario | null;
  setPwdTarget: Dispatch<SetStateAction<Usuario | null>>;
  newPassword: string;
  setNewPassword: Dispatch<SetStateAction<string>>;
  submitPassword: () => Promise<void>;
  pwdSaving: boolean;
}
