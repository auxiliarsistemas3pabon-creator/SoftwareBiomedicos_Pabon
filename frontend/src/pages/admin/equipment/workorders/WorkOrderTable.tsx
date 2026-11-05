import type { WorkOrderTableProps } from "@/types/equipment/workorder-props";
import { WorkOrderRow } from "@/pages/admin/equipment/workorders/WorkOrderRow";

export function WorkOrderTable({
  items,
  loading,
  isEngineer,
  canEdit,
  canDelete,
  onComplete,
  onDetail,
  onEdit,
  onDelete,
  canCreate,
  onCreate,
}: WorkOrderTableProps) {
  return (
    <div className="w-full min-w-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted [&>th]:pb-2 [&>th]:align-bottom [&>th]:font-medium">
            <th className="px-4 py-3 font-medium">Orden</th>
            <th className="px-4 py-3 text-center font-medium">Equipo</th>
            <th className="px-8 py-3 text-center font-medium">Tipo</th>
            <th className="whitespace-nowrap px-10 py-3 font-medium">Fecha de inicio</th>
            <th className="whitespace-nowrap px-10 py-3 font-medium">{isEngineer ? "Fecha fin" : "Fecha de realización"}</th>
            <th className="px-8 py-3 font-medium">Técnico</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 text-center font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border) [&>tr>td]:align-top [&>tr>td]:wrap-break-word">
          {loading ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-app-muted">
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={8} className="py-8 text-center text-app-muted">
                Sin órdenes de trabajo.
              </td>
            </tr>
          ) : (
            items.map((w) => (
              <WorkOrderRow
                key={w.id}
                w={w}
                isEngineer={isEngineer}
                canEdit={canEdit}
                canDelete={canDelete}
                onComplete={onComplete}
                onDetail={onDetail}
                onEdit={onEdit}
                onDelete={onDelete}
                canCreate={canCreate}
                onCreate={onCreate}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
