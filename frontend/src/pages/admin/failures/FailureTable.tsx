import type { FailureTableProps } from "@/types/failure/props";
import { FailureRow } from "@/pages/admin/failures/FailureRow";

export function FailureTable({
  items,
  loading,
  tableCols,
  canEdit,
  canDelete,
  equipmentLabel,
  setResolveTarget,
  setResolveNotes,
  openEdit,
  setToDelete,
  canCreate,
  openCreate,
}: FailureTableProps) {
  const showActions = canCreate || canEdit || canDelete;
  return (
    <div className="w-full min-w-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted [&>th]:pb-2 [&>th]:align-bottom [&>th]:font-medium">
            <th className="whitespace-nowrap py-3 pl-4 pr-8 text-center font-medium">Equipo</th>
            <th className="whitespace-nowrap py-3 pl-8 pr-8 text-center font-medium">Sede</th>
            <th className="whitespace-nowrap py-3 pl-8 pr-8 text-center font-medium">Servicio</th>
            <th className="whitespace-nowrap py-3 pl-8 pr-8 text-center font-medium">Severidad</th>
            <th className="whitespace-nowrap py-3 pl-8 pr-8 text-center font-medium">Reportada</th>
            <th className="whitespace-nowrap py-3 pl-8 pr-12 text-center font-medium">Estado</th>
            {showActions && (
              <th className="whitespace-nowrap py-3 pl-12 pr-4 text-center font-medium">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border) [&>tr>td]:align-top [&>tr>td]:wrap-break-word">
          {loading ? (
            <tr>
              <td colSpan={tableCols} className="py-8 text-center text-app-muted">
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={tableCols} className="py-8 text-center text-app-muted">
                Sin reportes.
              </td>
            </tr>
          ) : (
            items.map((f) => (
              <FailureRow
                key={f.id}
                f={f}
                canEdit={canEdit}
                canDelete={canDelete}
                equipmentLabel={equipmentLabel}
                setResolveTarget={setResolveTarget}
                setResolveNotes={setResolveNotes}
                openEdit={openEdit}
                setToDelete={setToDelete}
                canCreate={canCreate}
                openCreate={openCreate}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
