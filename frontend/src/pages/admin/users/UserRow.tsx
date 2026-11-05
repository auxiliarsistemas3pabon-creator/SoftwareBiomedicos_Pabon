import { Key, Pencil, Trash2, UserCog, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconHint } from "@/components/ui/IconHint";
import { ROLE_LABEL, canAssignRole } from "@/lib/permissions";
import { fullNameOf } from "@/lib/users";
import type { UserRowProps } from "@/types/authentication/props";

export function UserRow({
  u,
  canEdit,
  canDelete,
  role,
  usuario,
  togglingId,
  requestToggle,
  setPwdTarget,
  setNewPassword,
  openEdit,
  setToDelete,
  canCreate,
  assignableRoles,
  openCreate,
}: UserRowProps) {
  const editable = canEdit && canAssignRole(role, u.role);
  const deletable =
    canDelete && canAssignRole(role, u.role) && u.id !== usuario?.id;
  const canToggle = editable && u.id !== usuario?.id;
  const isToggling = togglingId === u.id;
  return (
    <tr className="text-app">
      <td className="whitespace-nowrap py-3 pl-4 pr-10 text-left">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UserCog size={14} />
          </span>
          <div>
            <p className="whitespace-nowrap font-medium">
              {fullNameOf(u)}
            </p>
            <p className="whitespace-nowrap text-xs text-app-muted">
              @{u.username} · {u.email}
            </p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap py-3 pl-10 pr-10 text-center">
        <Badge tone="primary">{ROLE_LABEL[u.role]}</Badge>
      </td>
      <td className="whitespace-nowrap py-3 pl-10 pr-14 text-center">
        {canToggle ? (
          <button
            type="button"
            disabled={isToggling}
            onClick={() => requestToggle(u)}
            aria-pressed={u.is_active}
            aria-label={u.is_active ? "Desactivar usuario" : "Activar usuario"}
            title={u.is_active ? "Click para desactivar" : "Click para activar"}
            className={`group inline-flex items-center gap-2 rounded-full border px-1 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
              u.is_active
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40 dark:hover:border-emerald-800"
                : "border-app bg-app-muted text-app-muted hover:bg-app-muted/70 dark:hover:bg-white/10 dark:hover:text-app dark:hover:border-white/20"
            }`}
          >
            <span
              className={`relative inline-flex h-4 w-7 items-center rounded-full transition ${
                u.is_active ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${
                  u.is_active ? "translate-x-3.5" : "translate-x-0.5"
                }`}
              />
            </span>
            <span className="pr-2">
              {isToggling
                ? "..."
                : u.is_active
                  ? "Activo"
                  : "Inactivo"}
            </span>
          </button>
        ) : (
          <Badge tone={u.is_active ? "success" : "neutral"}>
            {u.is_active ? "Activo" : "Inactivo"}
          </Badge>
        )}
      </td>
      <td className="py-3 pl-14 pr-4 text-center">
        <div className="flex flex-nowrap items-center justify-center gap-2">
          {canCreate && assignableRoles.length > 0 && (
            <IconHint label="Nuevo usuario">
              <Button
                size="sm"
                className="h-8! w-8! px-0!"
                aria-label="Nuevo usuario"
                onClick={openCreate}
              >
                <UserPlus size={14} />
              </Button>
            </IconHint>
          )}
          {editable && (
            <IconHint label="Contraseña">
              <Button
                size="sm"
                variant="secondary"
                className="h-8! w-8! px-0!"
                aria-label="Contraseña"
                onClick={() => {
                  setPwdTarget(u);
                  setNewPassword("");
                }}
              >
                <Key size={14} />
              </Button>
            </IconHint>
          )}
          {editable && (
            <IconHint label="Editar">
              <Button
                size="sm"
                variant="secondary"
                className="h-8! w-8! px-0!"
                aria-label="Editar"
                onClick={() => openEdit(u)}
              >
                <Pencil size={14} />
              </Button>
            </IconHint>
          )}
          {deletable && (
            <IconHint label="Eliminar">
              <Button
                size="sm"
                variant="danger"
                className="h-8! w-8! px-0!"
                aria-label="Eliminar"
                onClick={() => setToDelete(u)}
              >
                <Trash2 size={14} />
              </Button>
            </IconHint>
          )}
        </div>
      </td>
    </tr>
  );
}
