import { ClipboardPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconHint } from "@/components/ui/IconHint";
import { SchedulingRow } from "@/pages/admin/scheduling/SchedulingRow";
import type { SchedulingTableProps } from "@/types/scheduling/props";

export function SchedulingTable({
  items,
  loading,
  tableColSpan,
  showRequestingArea,
  equipmentLabel,
  canOpenWorkOrder,
  canRegisterMaintenance,
  canEdit,
  canDelete,
  onView,
  onOpenWorkOrders,
  onRegisterMaintenance,
  onComplete,
  onEdit,
  onDelete,
  canCreate,
  onCreate,
}: SchedulingTableProps) {
  return (
    <div className="w-full min-w-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted [&>th]:pb-2 [&>th]:align-bottom [&>th]:font-medium">
            <th className="whitespace-nowrap py-3 pl-4 pr-16 text-center font-medium">Equipo</th>
            <th className="whitespace-nowrap py-3 pl-14 pr-8 text-center font-medium">Sede</th>
            {showRequestingArea && (
              <th className="whitespace-nowrap py-3 pl-8 pr-8 text-center font-medium">Área solicitante</th>
            )}
            <th className="whitespace-nowrap py-3 pl-8 pr-8 text-center font-medium">Tipo</th>
            <th className="whitespace-nowrap py-3 pl-8 pr-8 text-center font-medium">Fecha de Solicitud</th>
            <th className="whitespace-nowrap py-3 pl-8 pr-10 text-center font-medium">Designado por</th>
            <th className="whitespace-nowrap py-3 pl-10 pr-8 text-center font-medium">Asignado a</th>
            <th className="whitespace-nowrap py-3 pl-8 pr-12 text-center font-medium">Estado</th>
            <th className="whitespace-nowrap py-3 pl-12 pr-4 text-center font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-(--border) [&>tr>td]:align-top [&>tr>td]:wrap-break-word">
          {loading ? (
            <tr>
              <td
                colSpan={tableColSpan}
                className="py-8 text-center text-app-muted"
              >
                Cargando...
              </td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td
                colSpan={canCreate ? tableColSpan - 1 : tableColSpan}
                className="py-8 text-center text-app-muted"
              >
                Sin solicitudes.
              </td>
              {canCreate && (
                <td className="py-3 pl-12 pr-4 text-center">
                  <div className="flex items-center justify-center">
                    <IconHint label="Crear">
                      <Button
                        size="sm"
                        className="h-8! w-8! px-0!"
                        aria-label="Crear solicitud"
                        onClick={onCreate}
                      >
                        <ClipboardPlus size={14} />
                      </Button>
                    </IconHint>
                  </div>
                </td>
              )}
            </tr>
          ) : (
            items.map((s) => (
              <SchedulingRow
                key={s.id}
                s={s}
                showRequestingArea={showRequestingArea}
                equipmentLabel={equipmentLabel}
                canOpenWorkOrder={canOpenWorkOrder}
                canRegisterMaintenance={canRegisterMaintenance}
                canEdit={canEdit}
                canDelete={canDelete}
                onView={onView}
                onOpenWorkOrders={onOpenWorkOrders}
                onRegisterMaintenance={onRegisterMaintenance}
                onComplete={onComplete}
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
