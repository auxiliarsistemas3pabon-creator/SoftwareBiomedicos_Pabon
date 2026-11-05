import { useMemo } from "react";
import { AlertTriangle, CalendarClock, ClipboardList, Wrench } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  ComposedChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import type {
  DashboardSummary,
  FailureSeverityBucket,
  MaintenanceMonthBucket,
} from "@/types/dashboard/dashboard";
import type { EquipmentStatus } from "@/types/equipment/equipment";
import { KIND_COLOR, MonthLabel, SEVERITY_LABEL, STATUS_COLOR, STATUS_LABEL, formatCost } from "@/utils/dashboard.utils";

export function KpiRow({
  data,
  canViewEquipment,
  canViewFailures,
  canViewScheduling,
  canViewMaintenance,
  maintenanceCount,
  maintenanceCost,
}: {
  data: DashboardSummary;
  canViewEquipment: boolean;
  canViewFailures: boolean;
  canViewScheduling: boolean;
  canViewMaintenance: boolean;
  maintenanceCount?: number;
  maintenanceCost?: string;
}) {
  const { equipment, failures, scheduling, maintenance } = data.kpis;
  const monthCount = maintenanceCount ?? maintenance.this_month_count;
  const monthCost = maintenanceCost ?? maintenance.this_month_cost;
  const statusBuckets = data.distributions.equipment_by_status;
  const countOf = (status: EquipmentStatus) =>
    statusBuckets.find((row) => row.status === status)?.count ?? 0;
  const statusPie = statusBuckets
    .filter((row) => row.count > 0)
    .map((row) => ({
      status: row.status,
      count: row.count,
      name: STATUS_LABEL[row.status],
    }));
  const cards: Array<{
    label: string;
    value: string;
    delta: string;
    Icon: typeof ClipboardList;
    tone: string;
    show: boolean;
    alert?: boolean;
  }> = [
    {
      label: "Equipos operativos",
      value: String(equipment.active),
      delta: `${countOf("IN_MAINTENANCE")} en mant. · ${countOf("IN_REPAIR")} en repar. · ${countOf("INACTIVE")} fuera`,
      Icon: ClipboardList,
      tone: "text-blue-600 bg-blue-50 dark:bg-blue-950/40",
      show: canViewEquipment,
    },
    {
      label: "Fallas críticas abiertas",
      value: String(failures.critical_open),
      delta: `${failures.total_open} fallas pendientes en total`,
      Icon: AlertTriangle,
      tone:
        failures.critical_open > 0
          ? "text-red-600 bg-red-50 dark:bg-red-950/40"
          : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
      show: canViewFailures,
      alert: failures.critical_open > 0,
    },
    {
      label: "Vencidos",
      value: String(scheduling.overdue),
      delta:
        scheduling.overdue > 0
          ? "Pendientes con fecha de fin vencida"
          : "Sin vencidos",
      Icon: CalendarClock,
      tone:
        scheduling.overdue > 0
          ? "text-red-600 bg-red-50 dark:bg-red-950/40"
          : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40",
      show: canViewScheduling,
      alert: scheduling.overdue > 0,
    },
    {
      label: "Mantenimientos del mes",
      value: String(monthCount),
      delta: `Costo: ${formatCost(monthCost)}`,
      Icon: Wrench,
      tone: "text-violet-600 bg-violet-50 dark:bg-violet-950/40",
      show: canViewMaintenance,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards
        .filter((c) => c.show)
        .map(({ label, value, delta, Icon, tone, alert }) => (
          <Card key={label} className={alert ? "ring-2 ring-red-200 dark:ring-red-900/60" : ""}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className={
                    alert && label === "Vencidos"
                      ? "text-xs text-red-600 dark:text-red-400"
                      : "text-xs text-app-muted"
                  }
                >
                  {label}
                </p>
                <p
                  className={
                    alert && label === "Vencidos"
                      ? "mt-1 text-2xl font-bold text-red-600 dark:text-red-400"
                      : "mt-1 text-2xl font-bold text-app"
                  }
                >
                  {value}
                </p>
                <p
                  className={
                    alert && label === "Vencidos"
                      ? "mt-1 text-xs text-red-600 dark:text-red-400"
                      : "mt-1 text-xs text-app-muted"
                  }
                >
                  {delta}
                </p>
              </div>
              {label === "Equipos operativos" && statusPie.length > 0 ? (
                <div className="h-16 w-16 shrink-0">
                  <ResponsiveContainer width={64} height={64} minWidth={0}>
                    <PieChart>
                      <Pie
                        data={statusPie}
                        dataKey="count"
                        nameKey="name"
                        innerRadius={16}
                        outerRadius={28}
                        paddingAngle={1}
                        stroke="none"
                      >
                        {statusPie.map((row) => (
                          <Cell
                            key={row.status}
                            fill={STATUS_COLOR[row.status]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [
                          String(value ?? 0),
                          String(name ?? ""),
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className={`rounded-lg p-2.5 ${tone}`}>
                  <Icon size={20} />
                </div>
              )}
            </div>
          </Card>
        ))}
    </div>
  );
}

export function FailuresSeverityChart({ data }: { data: FailureSeverityBucket[] }) {
  const total = useMemo(
    () => data.reduce((s, d) => s + d.open + d.resolved, 0),
    [data],
  );
  if (total === 0)
    return (
      <Card>
        <CardHeader
          title="Fallas por severidad"
          subtitle="Abiertas vs resueltas"
        />
        <p className="py-8 text-center text-sm text-app-muted">
          Sin fallas reportadas.
        </p>
      </Card>
    );
  const chartData = data.map((d) => ({
    severity: SEVERITY_LABEL[d.severity],
    severityKey: d.severity,
    Abiertas: d.open,
    Resueltas: d.resolved,
  }));
  return (
    <Card>
      <CardHeader
        title="Fallas por severidad"
        subtitle="Abiertas vs resueltas"
      />
      <div className="h-64">
        <ResponsiveContainer width="100%" height={256} minWidth={0}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="severity" width={70} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Abiertas" stackId="a" fill="#ef4444">
              {chartData.map((d) => (
                <Cell key={d.severityKey}  />
              ))}
            </Bar>
            <Bar dataKey="Resueltas" stackId="a" fill="#f97316" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export function MaintenanceTimeSeriesChart({
  data,
}: {
  data: MaintenanceMonthBucket[];
}) {
  const chartData = data.map((d) => ({
    month: MonthLabel({ month: d.month }),
    Preventivo: d.PREVENTIVE,
    Correctivo: d.CORRECTIVE,
    Reparación: d.REPAIR,
    Calibración: d.CALIBRATION,
    Inspección: d.INSPECTION,
    costo: Number(d.cost),
  }));
  return (
    <Card>
      <CardHeader
        title="Mantenimientos últimos 6 meses"
        subtitle="Cantidad por tipo y costo total mensual"
      />
      <div className="h-72">
        <ResponsiveContainer width="100%" height={256} minWidth={0}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis
              yAxisId="count"
              allowDecimals={false}
              label={{
                value: "Cantidad",
                angle: -90,
                position: "insideLeft",
                fontSize: 12,
              }}
            />
            <YAxis
              yAxisId="cost"
              orientation="right"
              tickFormatter={(v: number) =>
                v >= 1_000_000
                  ? `${(v / 1_000_000).toFixed(1)}M`
                  : v >= 1000
                    ? `${(v / 1000).toFixed(0)}K`
                    : String(v)
              }
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === "costo")
                  return [formatCost(Number(value ?? 0)), "Costo"];
                return [String(value ?? 0), String(name ?? "")];
              }}
            />
            <Legend />
            <Bar
              yAxisId="count"
              dataKey="Preventivo"
              stackId="kind"
              fill={KIND_COLOR.PREVENTIVE}
            />
            <Bar
              yAxisId="count"
              dataKey="Correctivo"
              stackId="kind"
              fill={KIND_COLOR.CORRECTIVE}
            />
            <Bar
              yAxisId="count"
              dataKey="Reparación"
              stackId="kind"
              fill={KIND_COLOR.REPAIR}
            />
            <Bar
              yAxisId="count"
              dataKey="Calibración"
              stackId="kind"
              fill={KIND_COLOR.CALIBRATION}
            />
            <Bar
              yAxisId="count"
              dataKey="Inspección"
              stackId="kind"
              fill={KIND_COLOR.INSPECTION}
            />
            <Line
              yAxisId="cost"
              type="monotone"
              dataKey="costo"
              stroke="#7c3aed"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
