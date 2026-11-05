import { EquipmentRow } from "@/pages/admin/equipment/EquipmentRow";
import type { EquipmentTableProps } from "@/types/equipment/props";

export function EquipmentTable({
  items,
  loading,
  brands,
  models,
  branchName,
  canEdit,
  canCreate,
  onCreate,
  canCreateMaintenance,
  statusUpdatingId,
  onSelect,
  onChangeStatus,
  onNewMaintenance,
}: EquipmentTableProps) {
  const cols = 6;
  return (
    <div className="w-full min-w-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
            <th className="whitespace-nowrap px-4 py-3 pr-16 text-center font-medium">Nombre del equipo</th>
            <th className="whitespace-nowrap px-4 py-3 pl-8 pr-16 text-center font-medium">Asset tag</th>
            <th className="whitespace-nowrap px-4 py-3 pl-8 pr-16 text-center font-medium">Ubicación del equipo</th>
            <th className="whitespace-nowrap py-3 pl-12 pr-14 font-medium">Riesgo</th>
            <th className="w-px whitespace-nowrap py-3 pl-10 pr-4 text-center font-medium">Estado</th>
            <th className="whitespace-nowrap px-4 py-3 pl-8 text-center font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border) [&>tr>td]:wrap-break-word">
          {loading ? (
            <tr>
              <td colSpan={cols} className="py-10 text-center text-app-muted">
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={cols} className="py-10 text-center text-app-muted">
                No se encontraron equipos con los filtros actuales.
              </td>
            </tr>
          ) : (
            items.map((eq) => (
              <EquipmentRow
                key={eq.id}
                eq={eq}
                brands={brands}
                models={models}
                branchName={branchName}
                canEdit={canEdit}
                canCreate={canCreate}
                onCreate={onCreate}
                canCreateMaintenance={canCreateMaintenance}
                statusUpdatingId={statusUpdatingId}
                onSelect={onSelect}
                onChangeStatus={onChangeStatus}
                onNewMaintenance={onNewMaintenance}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
