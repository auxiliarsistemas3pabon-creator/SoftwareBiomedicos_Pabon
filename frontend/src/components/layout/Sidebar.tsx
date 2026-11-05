import { NavLink } from "react-router-dom";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  LayoutDashboard,
  QrCode,
  User,
  Users,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";
import { cn } from "@/lib/cn";
import { useAuth } from "@/context/AuthContext";
import { can, type Resource } from "@/lib/permissions";
import type { Rol } from "@/types/authentication/auth";

interface LinkDef {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  end?: boolean;
  resource?: Resource;
  /** Si se define, el enlace solo aparece para estos roles. */
  roles?: Rol[];
}

const allLinks: LinkDef[] = [
  {
    to: "/admin",
    label: "Dashboard",
    icon: LayoutDashboard,
    end: true,
    roles: [
      "superadmin",
      "admin",
      "coordinador",
      "ingeniero",
      "tecnico",
      "usuario",
    ],
  },
  { to: "/admin/sedes", label: "Sedes", icon: Building2, resource: "branches" },
  {
    to: "/admin/equipos",
    label: "Equipos",
    icon: ClipboardList,
    resource: "equipment",
    end: true,
    roles: ["superadmin", "admin", "coordinador", "ingeniero"],
  },
  {
    to: "/admin/equipos/etiquetas",
    label: "Etiquetas QR",
    icon: QrCode,
    resource: "equipment",
    roles: ["superadmin", "admin", "coordinador", "ingeniero"],
  },
  // Registrar/editar el historial de mantenimientos es exclusivo del
  // coordinador (el superadmin lo consulta). El resto de la gestión lo ve desde
  // la hoja de vida del equipo; el ingeniero trabaja desde "Órdenes de trabajo".
  {
    to: "/admin/mantenimientos",
    label: "Mantenimientos",
    icon: Wrench,
    resource: "maintenance",
    roles: ["superadmin", "coordinador"],
  },
  {
    to: "/admin/ordenes-trabajo",
    label: "Órdenes de trabajo",
    icon: FileText,
    resource: "work_orders",
    roles: ["superadmin", "admin", "coordinador"],
  },
  {
    to: "/admin/ordenes-trabajo",
    label: "Tareas asignadas",
    icon: FileText,
    resource: "work_orders",
    roles: ["ingeniero"],
  },
  {
    to: "/admin/agendamientos",
    label: "Solicitudes pendientes",
    icon: CalendarClock,
    resource: "scheduling",
    roles: ["coordinador", "ingeniero"],
  },
  {
    to: "/admin/agendamientos",
    label: "Solicitudes",
    icon: CalendarClock,
    resource: "scheduling",
    roles: ["superadmin", "admin", "tecnico", "usuario"],
  },
  {
    to: "/admin/fallas",
    label: "Reportes de falla",
    icon: AlertTriangle,
    resource: "failures",
    roles: ["superadmin", "admin", "coordinador", "ingeniero"],
  },
  { to: "/admin/usuarios", label: "Usuarios", icon: Users, resource: "users" },
  {
    to: "/admin/perfil",
    label: "Mi perfil",
    icon: User,
    roles: [
      "superadmin",
      "admin",
      "coordinador",
      "ingeniero",
      "tecnico",
      "usuario",
    ],
  },
];

function visibleLinks(role: Rol | undefined): LinkDef[] {
  return allLinks.filter(
    (l) =>
      (!l.resource || can(role, l.resource, "view")) &&
      (!l.roles || (role !== undefined && l.roles.includes(role))),
  );
}

export function Sidebar() {
  const { usuario } = useAuth();
  const links = visibleLinks(usuario?.role);

  return (
    <aside className="sticky top-16 z-20 flex max-h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col self-start overflow-y-auto border-r border-app bg-surface">
      <nav className="flex flex-col gap-1 p-3">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={`${to}-${label}`}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-app hover:bg-app-muted",
              )
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}