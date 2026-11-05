import type { AssignedUser, Usuario } from "@/types/auth";
import { ROLE_LABEL } from "@/lib/permissions";

function compact(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

/** Nombre para UI. Si nombre+apellido son el rol partido, se muestra entero. */
export function fullNameOf(u: Usuario): string {
  const first = u.first_name?.trim() ?? "";
  const last = u.last_name?.trim() ?? "";
  const joined = [first, last].filter(Boolean).join(" ");
  const glued = compact(`${first}${last}`);
  const roleLabel = ROLE_LABEL[u.role];
  if (glued && roleLabel) {
    if (glued === compact(roleLabel) || glued === compact(u.role)) {
      return roleLabel;
    }
  }
  return joined || u.username;
}

/** Nombre mostrable de un usuario asignado anidado (`*_detail`) del backend. */
export function assignedUserName(u?: AssignedUser | null): string | null {
  if (!u) return null;
  return u.full_name?.trim() || u.username;
}

/**
 * El backend separa la asignación en dos FK según el rol —
 * `assigned_technician` (rol técnico) y `assigned_engineer` (rol ingeniero) —
 * y valida el rol estrictamente. Dado el usuario elegido, enruta su id al
 * campo correcto y deja el otro en null.
 */
export function assignmentPayload(user?: Usuario | null): {
  assigned_technician: number | null;
  assigned_engineer: number | null;
} {
  if (!user) return { assigned_technician: null, assigned_engineer: null };
  if (user.role === "ingeniero")
    return { assigned_technician: null, assigned_engineer: user.id };
  return { assigned_technician: user.id, assigned_engineer: null };
}

/** Opciones para un <Select> de responsable: solo técnicos e ingenieros activos. */
export function assignableUserOptions(users: Usuario[]) {
  return users
    .filter((u) => u.is_active && (u.role === "tecnico" || u.role === "ingeniero"))
    .map((u) => ({
      label: `${fullNameOf(u)} · ${
        u.role === "ingeniero" ? "Ingeniero" : "Usuario operativo"
      }`,
      value: u.id,
    }));
}
