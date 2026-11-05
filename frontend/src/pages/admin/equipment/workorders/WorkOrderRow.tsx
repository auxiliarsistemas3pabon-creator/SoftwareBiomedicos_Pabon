import { ClipboardList, ClipboardPlus, Pencil, Trash2, ListChecks, Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconHint } from "@/components/ui/IconHint";
import type { WorkOrderRowProps } from "@/types/equipment/workorder-props";
import { STATUS_LABEL, STATUS_TONE, TYPE_LABEL } from "@/utils/workorder.utils";

function OrderDateTime({ value }: { value?: string | null }) {
  if (!value) return <>—</>;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <>{value}</>;
  return (
    <div className="text-left">
      <span className="block whitespace-nowrap">{date.toLocaleDateString()}</span>
      <span className="mt-0.5 block whitespace-nowrap">{date.toLocaleTimeString()}</span>
    </div>
  );
}

export function WorkOrderRow({
  w,
  isEngineer,
  canEdit,
  canDelete,
  onComplete,
  onDetail,
  onEdit,
  onDelete,
  canCreate,
  onCreate,
}: WorkOrderRowProps) {
  return (
    <tr className="text-app">
      <td className="min-w-44 py-3 pr-6">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList size={14} />
          </span>
          <span className="min-w-30 font-medium">{w.number}</span>
        </div>
      </td>
      <td className="px-4 py-3 pr-8 text-center text-xs leading-snug text-app-muted">
        <div className="inline-block text-left">
          <span className="block whitespace-nowrap">
            {w.equipment_name ?? `Equipo #${w.equipment}`}
          </span>
          {w.equipment_asset_tag && (
            <span className="mt-0.5 block font-mono">{w.equipment_asset_tag}</span>
          )}
        </div>
      </td>
      <td className="px-8 py-3 text-center">
        <Badge tone="info" className="whitespace-nowrap">
          {w.service_type_display ?? TYPE_LABEL[w.service_type]}
        </Badge>
      </td>
      <td className="px-10 py-3 text-app-muted">
        <OrderDateTime value={w.start_date} />
      </td>
      <td className="px-10 py-3 text-app-muted">
        {w.status === "FINISHED" || w.end_date ? (
          <OrderDateTime value={w.end_date} />
        ) : (
          "—"
        )}
      </td>
      <td className="min-w-32 px-8 py-3 text-app-muted">
        {w.technician_name ?? (
          <span className="text-xs italic">Sin asignar</span>
        )}
      </td>
      <td className="py-3">
        <Badge tone={STATUS_TONE[w.status]}>
          {w.status_display ?? STATUS_LABEL[w.status]}
        </Badge>
      </td>
      <td className="py-3 pl-8 pr-4 text-center">
        <div className="flex flex-nowrap items-center justify-center gap-2">
          {canCreate && (
            <IconHint label="Nueva orden">
              <Button
                size="sm"
                className="h-8! w-8! px-0!"
                aria-label="Nueva orden"
                onClick={onCreate}
              >
                <ClipboardPlus size={14} />
              </Button>
            </IconHint>
          )}
          {canEdit &&
            (w.status === "PENDING" ||
              w.status === "IN_PROGRESS") && (
              <IconHint label="Enviar">
                <Button
                  size="sm"
                  className="h-8! w-8! px-0!"
                  aria-label="Enviar"
                  onClick={() => onComplete(w)}
                >
                  <Wrench size={14} />
                </Button>
              </IconHint>
            )}
          <IconHint label="Detalle">
            <Button
              size="sm"
              variant="secondary"
              className="h-8! w-8! px-0!"
              aria-label="Detalle"
              onClick={() => onDetail(w)}
            >
              <ListChecks size={14} />
            </Button>
          </IconHint>
          {canEdit && !isEngineer && (
            <IconHint label="Editar">
              <Button
                size="sm"
                variant="secondary"
                className="h-8! w-8! px-0!"
                aria-label="Editar"
                onClick={() => onEdit(w)}
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
                onClick={() => onDelete(w)}
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
