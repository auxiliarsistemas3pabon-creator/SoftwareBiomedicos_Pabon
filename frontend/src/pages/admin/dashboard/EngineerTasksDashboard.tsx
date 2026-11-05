import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ClipboardList, Wrench } from "lucide-react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { DashboardSummary } from "@/types/dashboard/dashboard";
import { dateKey, inDateRange } from "@/utils/dashboard.utils";

export function EngineerTasksDashboard({
  tasks,
}: {
  tasks: NonNullable<DashboardSummary["engineer_tasks"]>;
}) {
  const typeLabel: Record<string, string> = {
    PREVENTIVE: "Preventivo",
    CORRECTIVE: "Correctivo",
    CALIBRATION: "Calibración",
    INSTALLATION: "Instalación",
    INSPECTION: "Inspección",
  };
  const statusLabel: Record<string, string> = {
    PENDING: "Pendiente",
    IN_PROGRESS: "En proceso",
    FINISHED: "Terminada",
    CANCELLED: "Cancelada",
  };
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const applyFilters = () => {
    let from = fromDraft;
    let to = toDraft;
    if (from && to && from > to) {
      const swap = from;
      from = to;
      to = swap;
      setFromDraft(from);
      setToDraft(to);
    }
    setFromDate(from);
    setToDate(to);
  };

  const filteredSeries = useMemo(() => {
    const series = tasks.series ?? [];
    if (!fromDate && !toDate) return series;
    return series.filter((row) => {
      const d =
        row.status === "FINISHED" && row.end_date
          ? row.end_date
          : row.start_date;
      return inDateRange(d, fromDate, toDate);
    });
  }, [tasks.series, fromDate, toDate]);

  const kpis = useMemo(() => {
    if (!tasks.series || (!fromDate && !toDate)) return tasks.kpis;
    return {
      assigned: filteredSeries.length,
      pending: filteredSeries.filter((row) => row.status === "PENDING").length,
      in_progress: filteredSeries.filter((row) => row.status === "IN_PROGRESS")
        .length,
      resolved: filteredSeries.filter((row) => row.status === "FINISHED")
        .length,
    };
  }, [tasks.kpis, tasks.series, filteredSeries, fromDate, toDate]);

  const scatterGroups = useMemo(() => {
    const yOf: Record<string, number> = {
      PENDING: 1,
      IN_PROGRESS: 2,
      FINISHED: 3,
    };
    const toPoint = (row: { status: string; start_date: string; end_date: string | null }) => {
      const d =
        row.status === "FINISHED" && row.end_date
          ? row.end_date
          : row.start_date;
      const key = dateKey(d);
      return {
        x: Date.parse(`${key}T12:00:00`),
        y: yOf[row.status] ?? 0,
        date: key,
        status:
          row.status === "PENDING"
            ? "Pendiente"
            : row.status === "IN_PROGRESS"
              ? "En proceso"
              : row.status === "FINISHED"
                ? "Resuelta"
                : row.status,
      };
    };
    return {
      pending: filteredSeries.filter((row) => row.status === "PENDING").map(toPoint),
      inProgress: filteredSeries
        .filter((row) => row.status === "IN_PROGRESS")
        .map(toPoint),
      resolved: filteredSeries
        .filter((row) => row.status === "FINISHED")
        .map(toPoint),
    };
  }, [filteredSeries]);

  const xDomain = useMemo((): [number, number] => {
    const fromTs = fromDate ? Date.parse(`${fromDate}T00:00:00`) : Number.NaN;
    const toTs = toDate ? Date.parse(`${toDate}T23:59:59`) : Number.NaN;
    if (Number.isFinite(fromTs) && Number.isFinite(toTs)) {
      return fromTs === toTs
        ? [fromTs - 12 * 3600000, toTs + 12 * 3600000]
        : [fromTs, toTs];
    }
    const xs = filteredSeries.map((row) => {
      const d =
        row.status === "FINISHED" && row.end_date
          ? row.end_date
          : row.start_date;
      return Date.parse(`${dateKey(d)}T12:00:00`);
    }).filter((n) => Number.isFinite(n));
    let min = Number.isFinite(fromTs) ? fromTs : (xs.length ? Math.min(...xs) : Date.now());
    let max = Number.isFinite(toTs) ? toTs : (xs.length ? Math.max(...xs) : Date.now());
    if (min === max) {
      min -= 12 * 3600000;
      max += 12 * 3600000;
    }
    return [min, max];
  }, [filteredSeries, fromDate, toDate]);

  const pie = [
    { name: "Pendientes", count: kpis.pending, fill: "#f59e0b" },
    { name: "En proceso", count: kpis.in_progress, fill: "#3b82f6" },
    { name: "Resueltas", count: kpis.resolved, fill: "#10b981" },
  ];
  const pieTotal = kpis.pending + kpis.in_progress + kpis.resolved;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-app-muted">Tareas asignadas</p>
              <p className="mt-1 text-2xl font-bold text-app">
                {kpis.assigned}
              </p>
              <p className="mt-1 text-xs text-app-muted">
                Órdenes de trabajo a tu cargo
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40">
              <ClipboardList size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-app-muted">Tareas pendientes</p>
              <p className="mt-1 text-2xl font-bold text-app">
                {kpis.pending}
              </p>
              <p className="mt-1 text-xs text-app-muted">
                Estado pendiente
              </p>
            </div>
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/40">
              <Wrench size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-app-muted">En proceso</p>
              <p className="mt-1 text-2xl font-bold text-app">
                {kpis.in_progress}
              </p>
              <p className="mt-1 text-xs text-app-muted">
                Mantenimiento en curso
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40">
              <Wrench size={20} />
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-app-muted">Tareas resueltas</p>
              <p className="mt-1 text-2xl font-bold text-app">
                {kpis.resolved}
              </p>
              <p className="mt-1 text-xs text-app-muted">
                Mantenimientos ya realizados
              </p>
            </div>
            <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          type="date"
          label="Desde"
          value={fromDraft}
          max={toDraft || undefined}
          onChange={(e) => {
            const value = e.target.value;
            setFromDraft(value);
            setFromDate(value);
          }}
        />
        <Input
          type="date"
          label="Hasta"
          value={toDraft}
          min={fromDraft || undefined}
          onChange={(e) => {
            const value = e.target.value;
            setToDraft(value);
            setToDate(value);
          }}
        />
        <div className="flex items-end">
          <Button
            type="button"
            variant="secondary"
            onClick={applyFilters}
            className="w-full"
          >
            Aplicar filtros
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader
          title="Tareas por fecha"
          subtitle={
            fromDate || toDate
              ? `Dispersión de tareas${fromDate ? ` desde ${fromDate}` : ""}${
                  toDate ? ` hasta ${toDate}` : ""
                }`
              : "Dispersión de tareas asignadas, pendientes, en proceso y resueltas"
          }
        />
        <div className="h-72">
          {filteredSeries.length === 0 && !fromDate && !toDate ? (
            <p className="py-8 text-center text-sm text-app-muted">
              No hay tareas para graficar.
            </p>
          ) : (
            <ResponsiveContainer
              key={`${fromDate}|${toDate}`}
              width="100%"
              height={256}
              minWidth={0}
            >
              <ScatterChart margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={xDomain}
                  allowDataOverflow
                  tickCount={6}
                  tickFormatter={(value: number) =>
                    new Date(value).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "short",
                    })
                  }
                  allowDecimals={false}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={[0.5, 3.5]}
                  ticks={[1, 2, 3]}
                  tickFormatter={(value: number) =>
                    value === 1
                      ? "Pendiente"
                      : value === 2
                        ? "En proceso"
                        : value === 3
                          ? "Resuelta"
                          : ""
                  }
                  width={90}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  formatter={(_value, _name, item) => {
                    const payload = item?.payload as
                      | { date?: string; status?: string }
                      | undefined;
                    return [payload?.status ?? "", payload?.date ?? ""];
                  }}
                  labelFormatter={() => ""}
                />
                <Legend />
                <Scatter
                  name="Pendientes"
                  data={scatterGroups.pending}
                  fill="#f59e0b"
                />
                <Scatter
                  name="En proceso"
                  data={scatterGroups.inProgress}
                  fill="#3b82f6"
                />
                <Scatter
                  name="Resueltas"
                  data={scatterGroups.resolved}
                  fill="#10b981"
                />
              </ScatterChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card padding="sm">
          <CardHeader
            compact
            title="Pendientes / en proceso / resueltas"
            subtitle="Estado de las tareas que tienes asignadas"
          />
          <div className="h-40">
            {pieTotal === 0 ? (
              <p className="py-6 text-center text-sm text-app-muted">
                Aún no tienes tareas asignadas.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={160} minWidth={0}>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={62}
                    paddingAngle={2}
                    label
                  >
                    {pie.map((row) => (
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
            title="Cola de trabajo"
            subtitle="Tareas pendientes por resolver"
            action={
              <Link
                to="/admin/ordenes-trabajo"
                className="text-sm text-primary hover:underline"
              >
                Ver todas →
              </Link>
            }
          />
          {tasks.recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-app-muted">
              <CheckCircle2
                size={24}
                className="mx-auto mb-2 text-emerald-500"
              />
              No hay tareas pendientes.
            </div>
          ) : (
            <ul className="divide-y divide-(--border)">
              {tasks.recent.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-app">{t.equipment_name}</p>
                    <p className="text-xs text-app-muted">
                      <span className="font-mono">{t.number}</span>
                      {" · "}
                      <span className="font-mono">{t.equipment_asset_tag}</span>
                      {" · "}
                      {typeLabel[t.service_type] ?? t.service_type}
                    </p>
                  </div>
                  <Badge tone={t.status === "IN_PROGRESS" ? "info" : "warning"}>
                    {statusLabel[t.status] ?? t.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
