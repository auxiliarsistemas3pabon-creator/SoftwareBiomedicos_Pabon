import type { MaintenanceTableProps } from "@/types/maintenance/props";
import { MaintenanceRow } from "@/pages/admin/maintenance/MaintenanceRow";

export function MaintenanceTable({
  items,
  loading,
  equipmentLabel,
  canEdit,
  canDelete,
  openEdit,
  setToDelete,
}: MaintenanceTableProps) {
  // La columna se deja armada, pero oculta. Poner en true si vuelve a hacer falta.
  const showActions = false;
  const cols = showActions ? 4 : 3;
  return (
    <div className="w-full min-w-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
            <th className="min-w-56 pb-2 pr-10 text-center font-medium">Equipo</th>
            <th className="whitespace-nowrap px-4 pb-2 pl-8 font-medium">Tipo</th>
            <th className="whitespace-nowrap px-4 pb-2 pr-10 font-medium">Fecha</th>
            {showActions && (
              <th className="pb-2 pl-8 font-medium text-right">Acciones</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border)">
          {loading ? (
            <tr>
              <td colSpan={cols} className="py-8 text-center text-app-muted">
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={cols} className="py-8 text-center text-app-muted">
                Sin registros.
              </td>
            </tr>
          ) : (
            items.map((m) => (
              <MaintenanceRow
                key={m.id}
                m={m}
                equipmentLabel={equipmentLabel}
                canEdit={canEdit}
                canDelete={canDelete}
                openEdit={openEdit}
                setToDelete={setToDelete}
                showActions={showActions}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
