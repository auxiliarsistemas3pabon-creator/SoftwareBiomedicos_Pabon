import type { UserTableProps } from "@/types/authentication/props";
import { UserRow } from "@/pages/admin/users/UserRow";

export function UserTable({
  items,
  loading,
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
}: UserTableProps) {
  return (
    <div className="w-full min-w-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
            <th className="whitespace-nowrap pb-2 pl-4 pr-10 text-center font-medium">Usuario</th>
            <th className="whitespace-nowrap pb-2 pl-10 pr-10 text-center font-medium">Rol</th>
            <th className="whitespace-nowrap pb-2 pl-10 pr-14 text-center font-medium">Estado</th>
            <th className="whitespace-nowrap pb-2 pl-14 pr-4 text-center font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border)">
          {loading ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-app-muted">
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-8 text-center text-app-muted">
                Sin usuarios.
              </td>
            </tr>
          ) : (
            items.map((u) => (
              <UserRow
                key={u.id}
                u={u}
                canEdit={canEdit}
                canDelete={canDelete}
                role={role}
                usuario={usuario}
                togglingId={togglingId}
                requestToggle={requestToggle}
                setPwdTarget={setPwdTarget}
                setNewPassword={setNewPassword}
                openEdit={openEdit}
                setToDelete={setToDelete}
                canCreate={canCreate}
                assignableRoles={assignableRoles}
                openCreate={openCreate}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
