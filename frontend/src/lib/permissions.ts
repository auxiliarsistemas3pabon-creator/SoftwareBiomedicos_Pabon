import type { Rol } from "@/types/authentication/auth";

export type Resource =
  | "users"
  | "branches"
  | "equipment"
  | "maintenance"
  | "scheduling"
  | "failures"
  | "work_orders";

export type Action = "view" | "create" | "edit" | "delete";

type Matrix = Record<Rol, Partial<Record<Resource, Action[]>>>;

const matrix: Matrix = {
  superadmin: {
    users: ["view", "create", "edit", "delete"],
    branches: ["view", "create", "edit", "delete"],
    equipment: ["view", "create", "edit", "delete"],
    maintenance: ["view", "edit", "delete"],
    scheduling: ["view", "create", "edit", "delete"],
    failures: ["view", "create", "edit", "delete"],
    work_orders: ["view", "create", "edit", "delete"],
  },
  admin: {
    users: ["view", "create", "edit", "delete"],
    branches: ["view", "create", "edit", "delete"],
    equipment: ["view", "create", "edit", "delete"],
    // Registrar/editar/borrar en el historial de mantenimientos es exclusivo
    // del coordinador; el resto de la gestión solo lo consulta.
    maintenance: ["view"],
    scheduling: ["view", "create", "edit", "delete"],
    failures: ["view", "create", "edit", "delete"],
    work_orders: ["view", "create", "edit", "delete"],
  },
  coordinador: {
    branches: ["view"],
    equipment: ["view", "create", "edit"],
    maintenance: ["view", "create", "edit", "delete"],
    scheduling: ["view", "create", "edit", "delete"],
    failures: ["view", "create", "edit"],
    work_orders: ["view", "create", "edit", "delete"],
  },
  ingeniero: {
    branches: ["view"],
    equipment: ["view"],
    // Consulta solicitudes asignadas (área solicitante); no las gestiona.
    scheduling: ["view"],
    failures: ["view", "create", "edit"],
    work_orders: ["view", "create", "edit"],
  },
  tecnico: {
    equipment: ["view"],
    failures: ["view", "create"],
    scheduling: ["view", "create"],
  },
  usuario: {
    equipment: ["view"],
    scheduling: ["view", "create"],
  },
};

export function can(
  role: Rol | undefined,
  resource: Resource,
  action: Action,
): boolean {
  if (!role) return false;
  const actions = matrix[role]?.[resource];
  return Array.isArray(actions) && actions.includes(action);
}

/** Roles que se pueden asignar al crear/editar usuarios (el superadmin no se da de alta). */
export const ASSIGNABLE_ROLES: Rol[] = [
  "admin",
  "coordinador",
  "ingeniero",
  "tecnico",
  "usuario",
];

/**
 * Nadie asigna superadmin desde la app. El superadmin de plataforma puede
 * crear admin/coordinador/ingeniero/usuario operativo. El admin de sede, los tres últimos.
 */
export function canAssignRole(actorRole: Rol | undefined, targetRole: Rol): boolean {
  if (!actorRole) return false;
  if (targetRole === "superadmin") return false;
  if (actorRole === "superadmin") return ASSIGNABLE_ROLES.includes(targetRole);
  if (actorRole === "admin") {
    return targetRole !== "admin" && ASSIGNABLE_ROLES.includes(targetRole);
  }
  return false;
}

export const ROLE_LABEL: Record<Rol, string> = {
  superadmin: "Super administrador",
  admin: "Administrador",
  coordinador: "Coordinador",
  ingeniero: "Ingeniero biomédico",
  tecnico: "Usuario operativo",
  usuario: "Usuario",
};

/** Ruta de entrada al panel: el dashboard personal o el general. */
export function panelHome(_role: Rol | undefined): string {
  return "/admin";
}
