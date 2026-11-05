import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { DashboardSummary } from "@/types/dashboard/dashboard";
import type { DateGrain } from "@/types/dashboard/charts";
import { formatHours, formatWeekday, grainKey, grainLabel, inDateRange } from "@/utils/dashboard.utils";

export function AreaOpsDashboard({
  ops,
}: {
  ops: NonNullable<DashboardSummary["area_ops"]>;
}) {
  const isRequests = ops.source === "schedules";
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [grain, setGrain] = useState<DateGrain>("month");

  const series = useMemo(() => {
    if (ops.series && ops.series.length > 0) return ops.series;
    return ops.recent.map((r) => ({
      date: r.reported_at,
      resolved: r.resolved,
    }));
  }, [ops.series, ops.recent]);

  const filtered = useMemo(
    () =>
      isRequests
        ? series.filter((p) => inDateRange(p.date, fromDate, toDate))
        : series,
    [series, isRequests, fromDate, toDate],
  );

  const recentFiltered = useMemo(
    () =>
      isRequests
        ? ops.recent.filter((r) => inDateRange(r.reported_at, fromDate, toDate))
        : ops.recent,
    [ops.recent, isRequests, fromDate, toDate],
  );

  const statusChart = isRequests
    ? [
        {
          name: "Pendientes",
          count: filtered.filter((p) => !p.resolved).length,
          fill: "#f59e0b",
        },
        {
          name: "Cumplidas",
          count: filtered.filter((p) => p.resolved).length,
          fill: "#10b981",
        },
      ]
    : [
        {
          name: "Abiertas",
          count: ops.kpis.this_week_open ?? 0,
          fill: "#ef4444",
        },
        {
          name: "Resueltas",
          count: ops.kpis.this_week_resolved ?? 0,
          fill: "#f97316",
        },
      ];
  const statusTotal = statusChart.reduce((s, r) => s + r.count, 0);

  const requestBars = useMemo(() => {
    const buckets = new Map<string, number>();
    for (const p of filtered) {
      const key = grainKey(p.date, grain);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, count]) => ({
        key,
        label: grainLabel(key, grain),
        count,
      }));
  }, [filtered, grain]);

  const weekBars = ops.this_week_by_day.map((row) => ({
    key: row.date,
    label: formatWeekday(row.date),
    count: row.count,
  }));
  const barData = isRequests ? requestBars : weekBars;

  return (
    <>
      <div
        className={
          isRequests
            ? "grid gap-4 sm:grid-cols-3"
            : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        <Card>
          <p className="text-xs text-app-muted">
            {isRequests
              ? "Solicitudes"
              : "Cantidad de fallas reportadas"}
          </p>
          <p className="mt-1 text-2xl font-bold text-app">
            {isRequests ? filtered.length : ops.kpis.total}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-app-muted">
            {isRequests
              ? "Estado de tus solicitudes"
              : "Estado de fallas reportadas"}
          </p>
          <p className="mt-1 text-2xl font-bold text-app">
            {isRequests
              ? `${filtered.filter((p) => !p.resolved).length} pendientes`
              : `${ops.kpis.open} abiertas`}
          </p>
          <p className="text-xs text-app-muted">
            {isRequests
              ? `${filtered.filter((p) => p.resolved).length} cumplidas`
              : `${ops.kpis.resolved} resueltas`}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-app-muted">
            {isRequests ? "Monitoreo" : "Área"}
          </p>
          <p className="mt-1 text-2xl font-bold text-app">
            {isRequests
              ? "Solicitudes"
              : ops.area || "Sin área asignada"}
          </p>
        </Card>
        {!isRequests && (
          <Card>
            <p className="text-xs text-app-muted">Reportes esta semana</p>
            <p className="mt-1 text-2xl font-bold text-app">
              {ops.kpis.this_week}
            </p>
          </Card>
        )}
      </div>

      {!isRequests && !ops.area && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          Un administrador debe asignarte un área (ej. Radiología) para ver
          equipos y reportar fallas.
        </p>
      )}

      {isRequests && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            type="date"
            label="Desde"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <Input
            type="date"
            label="Hasta"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <Select
            label="Fechas"
            value={grain}
            onChange={(e) => setGrain(e.target.value as DateGrain)}
            options={[
              { value: "day", label: "Día" },
              { value: "month", label: "Mes" },
              { value: "year", label: "Año" },
            ]}
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title={isRequests ? "Estado de solicitudes" : "Reportes de la semana"}
            subtitle={
              isRequests
                ? "Pendientes vs cumplidas"
                : "Gráfico de pastel: abiertas vs resueltas en tus reportes"
            }
          />
          <div className="h-64">
            {statusTotal === 0 ? (
              <p className="py-8 text-center text-sm text-app-muted">
                {isRequests
                  ? fromDate || toDate
                    ? "No hay solicitudes en el rango de fechas."
                    : "No has creado solicitudes todavía."
                  : "Esta semana no has generado reportes."}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={256} minWidth={0}>
                <PieChart>
                  <Pie
                    data={statusChart}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    label
                  >
                    {statusChart.map((row) => (
                      <Cell key={row.name} fill={row.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
        <Card>
          <CardHeader
            title={isRequests ? "Fecha de solicitud" : "Fecha de reporte"}
            subtitle={
              isRequests
                ? grain === "year"
                  ? "Barras por año"
                  : grain === "month"
                    ? "Barras por mes"
                    : "Barras por día"
                : "Barras: reportes que realizaste cada día de esta semana"
            }
          />
          <div className="h-64">
            {barData.length === 0 ? (
              <p className="py-8 text-center text-sm text-app-muted">
                {isRequests
                  ? "No hay solicitudes para graficar en este rango."
                  : "Esta semana no has generado reportes."}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={256} minWidth={0}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name={isRequests ? "Solicitudes" : "Reportes"}
                    fill="#0ea5e9"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={isRequests ? "Mis solicitudes" : "Mis reportes"}
          subtitle={
            isRequests
              ? "Estado y nota de las solicitudes que tú creaste"
              : "Estado, fecha, oportunidad y solución de lo que tú reportaste"
          }
        />
        {recentFiltered.length === 0 ? (
          <p className="py-6 text-center text-sm text-app-muted">
            {isRequests
              ? fromDate || toDate
                ? "No hay solicitudes en el rango de fechas."
                : "No has creado solicitudes todavía."
              : "No has generado reportes todavía."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
                  <th className="pb-2 font-medium">Equipo</th>
                  <th className="pb-2 font-medium">
                    {isRequests ? "Fecha de solicitud" : "Fecha de reporte"}
                  </th>
                  <th className="pb-2 font-medium">Estado</th>
                  {!isRequests && (
                    <th className="pb-2 font-medium">Oportunidad</th>
                  )}
                  <th className="pb-2 font-medium">
                    {isRequests ? "Nota" : "Solución del reporte"}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {recentFiltered.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2">
                      <p className="font-medium text-app">{r.equipment_name}</p>
                      <p className="text-xs text-app-muted">
                        <span className="font-mono">{r.equipment_asset_tag}</span>
                      </p>
                    </td>
                    <td className="py-2 text-app-muted">
                      {r.reported_at.slice(0, 10)}
                    </td>
                    <td className="py-2">
                      <Badge tone={r.resolved ? "success" : "warning"}>
                        {r.resolved
                          ? isRequests
                            ? "Cumplida"
                            : "Resuelta"
                          : isRequests
                            ? "Pendiente"
                            : "Abierta"}
                      </Badge>
                    </td>
                    {!isRequests && (
                      <td className="py-2 text-app-muted">
                        {r.resolved
                          ? formatHours(r.opportunity_hours)
                          : "En espera"}
                      </td>
                    )}
                    <td className="py-2 text-app-muted">
                      {r.resolution_notes?.trim()
                        ? r.resolution_notes
                        : r.resolved
                          ? "Sin notas"
                          : "Pendiente"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-4">
          {!isRequests && (
            <Link
              to="/admin/fallas"
              className="text-sm text-primary hover:underline"
            >
              Reportar o ver mis fallas →
            </Link>
          )}
          <Link
            to="/admin/agendamientos"
            className="text-sm text-primary hover:underline"
          >
            Ver solicitudes →
          </Link>
        </div>
      </Card>
    </>
  );
}
