import {
  CalendarClock,
  ClipboardPlus,
  Check,
  Eye,
  Pencil,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconHint } from "@/components/ui/IconHint";
import {
  KIND_LABEL,
  formatDateTime,
  labelForRequester,
  labelForScheduleTechnician,
  scheduleEstado,
} from "@/utils/scheduling.utils";
import type { SchedulingRowProps } from "@/types/scheduling/props";

export function SchedulingRow({
  s,
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
}: SchedulingRowProps) {
  const editLabel = s.scheduled_date ? "Editar" : "Programar";
  return (
    <tr className="text-app">
      <td className="py-3 pl-4 pr-16 text-center">
        <div className="inline-flex items-center gap-2 text-left">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock size={14} />
          </span>
          <div>
            <p className="whitespace-nowrap font-medium">
              {s.equipment_name ?? equipmentLabel(s.equipment)}
            </p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap py-3 pl-14 pr-8 text-center text-app-muted">
        {s.branch_name || <span className="text-xs italic">Sin sede</span>}
      </td>
      {showRequestingArea && (
        <td className="whitespace-nowrap py-3 pl-8 pr-8 text-center text-app-muted">
          {s.requesting_area || (
            <span className="text-xs italic">Sin área</span>
          )}
        </td>
      )}
      <td className="whitespace-nowrap py-3 pl-8 pr-8 text-center">
        <Badge tone={s.kind === "PREVENTIVE" ? "info" : "danger"}>
          {KIND_LABEL[s.kind]}
        </Badge>
      </td>
      <td className="py-3 pl-8 pr-8 text-center text-app-muted">
        <div className="whitespace-nowrap">
          {s.requested_date}
        </div>
        {s.work_order?.status === "FINISHED" && (
          <div className="text-xs">
            <span className="text-xs uppercase tracking-wide">
              Fin
            </span>{" "}
            {formatDateTime(s.work_order.end_date)}
          </div>
        )}
      </td>
      <td className="whitespace-nowrap py-3 pl-8 pr-10 text-center text-app-muted">
        {labelForRequester(s) || <span className="text-xs italic">Sin designar</span>}
      </td>
      <td className="whitespace-nowrap py-3 pl-10 pr-8 text-center text-app-muted">
        {labelForScheduleTechnician(s) ? (
          <span className="inline-flex items-center gap-1.5">
            <User size={12} className="text-app-muted" />
            <span className="text-app">
              {labelForScheduleTechnician(s)}
            </span>
          </span>
        ) : (
          <span className="text-xs italic">Sin asignar</span>
        )}
      </td>
      <td className="whitespace-nowrap py-3 pl-8 pr-12 text-center">
        <Badge tone={scheduleEstado(s).tone}>
          {scheduleEstado(s).label}
        </Badge>
      </td>
      <td className="py-3 pl-12 pr-4 text-center">
        <div className="flex flex-nowrap items-center justify-center gap-2">
          {canCreate && (
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
          )}
          <IconHint label="Detalle">
            <Button
              size="sm"
              variant="secondary"
              className="h-8! w-8! px-0!"
              aria-label="Detalle"
              onClick={() => onView(s)}
            >
              <Eye size={14} />
            </Button>
          </IconHint>
          {s.work_order ? (
            canOpenWorkOrder && (
              <IconHint label="Ver orden de trabajo">
                <Button
                  size="sm"
                  className="h-8! w-8! px-0!"
                  aria-label="Ver orden de trabajo"
                  onClick={() => onOpenWorkOrders()}
                >
                  <Wrench size={14} />
                </Button>
              </IconHint>
            )
          ) : (
            canRegisterMaintenance &&
            !canOpenWorkOrder &&
            !s.is_completed && (
              <IconHint label="Realizar mantenimiento">
                <Button
                  size="sm"
                  className="h-8! w-8! px-0!"
                  aria-label="Realizar mantenimiento"
                  onClick={() => onRegisterMaintenance(s)}
                >
                  <Wrench size={14} />
                </Button>
              </IconHint>
            )
          )}
          {canEdit && !s.is_completed && (
            <IconHint label="Cumplir">
              <Button
                size="sm"
                variant="secondary"
                className="h-8! w-8! px-0!"
                aria-label="Cumplir"
                onClick={() => onComplete(s)}
              >
                <Check size={14} />
              </Button>
            </IconHint>
          )}
          {canEdit && (
            <IconHint label={editLabel}>
              <Button
                size="sm"
                variant="secondary"
                className="h-8! w-8! px-0!"
                aria-label={editLabel}
                onClick={() => onEdit(s)}
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
                onClick={() => onDelete(s)}
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
