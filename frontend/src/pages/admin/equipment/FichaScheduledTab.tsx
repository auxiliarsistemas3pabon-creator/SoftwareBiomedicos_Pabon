import { CalendarClock } from "lucide-react";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import type { FichaScheduledTabProps } from "@/types/equipment/ficha";
import { kindLabelScheduled, kindToneScheduled } from "@/utils/ficha.utils";

export function FichaScheduledTab({
  scheduledKind,
  setScheduledKind,
  loadingS,
  scheduled,
}: FichaScheduledTabProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-app-muted">Filtrar por tipo:</span>
        <div className="w-44">
          <Select
            placeholder="Todos"
            value={scheduledKind}
            onChange={(e) => setScheduledKind(e.target.value)}
            options={[
              { value: "PREVENTIVE", label: "Preventivo" },
              { value: "REPAIR", label: "Reparación" },
            ]}
          />
        </div>
      </div>
      {loadingS ? (
        <p className="py-6 text-center text-sm text-app-muted">Cargando...</p>
      ) : scheduled.length === 0 ? (
        <p className="py-6 text-center text-sm text-app-muted">
          No hay mantenimientos programados con los filtros actuales.
        </p>
      ) : (
        scheduled.map((s) => (
          <div
            key={s.id}
            className="flex flex-col gap-2 rounded-lg border border-app bg-app-muted p-3 sm:flex-row sm:items-start sm:gap-4"
          >
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarClock size={16} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={kindToneScheduled(s.kind)}>
                  {kindLabelScheduled(s.kind)}
                </Badge>
                <span className="text-xs text-app-muted">
                  {s.scheduled_date || s.requested_date}
                </span>
                <Badge tone={s.is_completed ? "success" : "warning"}>
                  {s.is_completed ? "Cumplido" : "Pendiente"}
                </Badge>
              </div>
              {s.notes && (
                <p className="mt-1 text-sm text-app">{s.notes}</p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
