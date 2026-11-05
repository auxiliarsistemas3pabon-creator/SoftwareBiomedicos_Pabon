import { Link } from "react-router-dom";
import { Activity, CheckCircle2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { DashboardSummary } from "@/types/dashboard/dashboard";
import { formatHours } from "@/utils/dashboard.utils";

export function MyTasksSection({
  schedules,
}: {
  schedules: DashboardSummary["my_tasks"]["schedules"];
}) {
  if (schedules.length === 0) return null;
  return (
    <Card>
      <CardHeader
        title="Mis tareas próximas"
        subtitle="Solicitudes asignadas a ti en los próximos 7 días"
      />
      <ul className="divide-y divide-(--border)">
        {schedules.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between gap-3 py-3 text-sm"
          >
            <div>
              <p className="font-medium text-app">{s.equipment_name}</p>
              <p className="text-xs text-app-muted">
                <span className="font-mono">{s.equipment_asset_tag}</span> ·{" "}
                {s.scheduled_date}
              </p>
            </div>
            <Badge tone={s.kind === "PREVENTIVE" ? "info" : "danger"}>
              {s.kind === "PREVENTIVE" ? "Preventivo" : "Reparación"}
            </Badge>
          </li>
        ))}
      </ul>
      <Link
        to="/admin/agendamientos"
        className="mt-3 inline-block text-sm text-primary hover:underline"
      >
        Ver todos →
      </Link>
    </Card>
  );
}

export function OperativoWeekSection({
  week,
}: {
  week: NonNullable<DashboardSummary["my_week"]>;
}) {
  const kindLabel: Record<string, string> = {
    PREVENTIVE: "Preventivo",
    CORRECTIVE: "Correctivo",
    REPAIR: "Reparación",
    CALIBRATION: "Calibración",
    INSPECTION: "Inspección",
  };
  return (
    <Card>
      <CardHeader
        title="Tus reportes de la semana"
        subtitle={`${week.week_start} → ${week.week_end} · mantenimientos que realizaste, por área`}
      />
      {week.by_area.length === 0 ? (
        <p className="py-6 text-center text-sm text-app-muted">
          Esta semana no hay mantenimientos asignados a ti.
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {week.by_area.map((row) => (
              <Badge key={row.area} tone="info">
                {row.area}: {row.count}
              </Badge>
            ))}
          </div>
          <ul className="divide-y divide-(--border)">
            {week.records.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-app">{r.equipment_name}</p>
                  <p className="text-xs text-app-muted">
                    <span className="font-mono">{r.equipment_asset_tag}</span> ·{" "}
                    {r.area} · {r.date}
                  </p>
                </div>
                <Badge tone="neutral">
                  {kindLabel[r.kind] ?? r.kind}
                </Badge>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

export function OverdueSchedulesList({
  items,
}: {
  items: DashboardSummary["lists"]["overdue_schedules"];
}) {
  return (
    <Card>
      <CardHeader
        title="Solicitudes vencidas"
        subtitle="Programadas cuya fecha ya pasó"
        action={
          items.length > 0 ? (
            <Link
              to="/admin/agendamientos"
              className="text-sm text-primary hover:underline"
            >
              Ver todos →
            </Link>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <div className="py-8 text-center text-sm text-app-muted">
          <CheckCircle2
            size={28}
            className="mx-auto mb-2 text-emerald-500"
          />
          No hay solicitudes vencidas.
        </div>
      ) : (
        <ul className="divide-y divide-(--border)">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-app">{it.equipment_name}</p>
                <p className="text-xs text-app-muted">
                  <span className="font-mono">{it.equipment_asset_tag}</span> ·
                  Programado para {it.scheduled_date}
                </p>
              </div>
              <Badge tone="danger">{it.days_overdue} d</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function WorstMtbfList({
  items,
}: {
  items: DashboardSummary["lists"]["worst_mtbf"];
}) {
  return (
    <Card>
      <CardHeader
        title="Equipos con peor confiabilidad"
        subtitle="Menor MTBF entre los que tienen 2+ fallas"
      />
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-app-muted">
          Aún no hay suficientes datos.
        </p>
      ) : (
        <ul className="divide-y divide-(--border)">
          {items.map((it) => (
            <li
              key={it.id}
              className="flex items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <p className="flex items-center gap-1.5 font-medium text-app">
                  <Activity size={14} className="text-amber-500" />
                  {it.name}
                </p>
                <p className="text-xs text-app-muted">
                  <span className="font-mono">{it.asset_tag}</span> ·{" "}
                  {it.branch_name} · {it.failures_count} fallas
                </p>
              </div>
              <span className="text-sm font-semibold text-app">
                {formatHours(it.mtbf_hours)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
