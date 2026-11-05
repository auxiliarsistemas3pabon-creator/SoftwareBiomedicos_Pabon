import { CalendarClock, Pencil, Trash2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconHint } from "@/components/ui/IconHint";
import { KIND_LABEL, KIND_TONE } from "@/utils/maintenance.utils";
import type { MaintenanceRowProps } from "@/types/maintenance/props";

export function MaintenanceRow({
  m,
  equipmentLabel,
  canEdit,
  canDelete,
  openEdit,
  setToDelete,
  showActions = false,
}: MaintenanceRowProps) {
  return (
    <tr className="text-app">
      <td className="min-w-56 py-3 pr-10">
        <div className="flex items-start gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wrench size={14} />
          </span>
          <div className="min-w-40">
            <p className="whitespace-nowrap font-medium">
              {m.equipment_name ?? equipmentLabel(m.equipment)}
            </p>
            {m.equipment_asset_tag && (
              <p className="text-xs text-app-muted">
                <span className="font-mono">{m.equipment_asset_tag}</span>
              </p>
            )}
            {m.scheduled_maintenance_detail && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-app-muted">
                <CalendarClock size={11} />
                Programado para{" "}
                {m.scheduled_maintenance_detail.scheduled_date}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 pl-8">
        <Badge tone={KIND_TONE[m.kind]}>{KIND_LABEL[m.kind]}</Badge>
      </td>
      <td className="whitespace-nowrap px-4 py-3 pr-10 text-app-muted">{m.date}</td>
      {showActions && (
      <td className="py-3 pl-8">
        <div className="flex items-center justify-end gap-2">
          {m.work_order && (
            <span className="text-xs text-app-muted">
              Orden {m.work_order.number}
            </span>
          )}
          {canEdit && (
            <IconHint label="Editar">
              <Button
                size="sm"
                variant="secondary"
                className="h-8! w-8! px-0!"
                aria-label="Editar"
                onClick={() => openEdit(m)}
              >
                <Pencil size={14} />
              </Button>
            </IconHint>
          )}
          {canDelete && (
            <IconHint label="Eliminar">
              <Button
                size="sm"
                variant="danger"
                className="h-8! w-8! px-0!"
                aria-label="Eliminar"
                onClick={() => setToDelete(m)}
              >
                <Trash2 size={14} />
              </Button>
            </IconHint>
          )}
        </div>
      </td>
      )}
    </tr>
  );
}
