import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  Legend,
  Line,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { DashboardSummary } from "@/types/dashboard/dashboard";
import type { DateGrain } from "@/types/dashboard/charts";
import { KIND_COLOR, buildAdministratorChartData, buildCoordinatorChartData, formatCost, grainLabel, inDateRange } from "@/utils/dashboard.utils";
import { FailuresSeverityChart, KpiRow, MaintenanceTimeSeriesChart } from "@/pages/admin/dashboard/OverviewWidgets";

export function AdminOverview({
  data,
  role,
  canViewEquipment,
  canViewFailures,
  canViewScheduling,
  canViewMaintenance,
}: {
  data: DashboardSummary;
  role: string | undefined;
  canViewEquipment: boolean;
  canViewFailures: boolean;
  canViewScheduling: boolean;
  canViewMaintenance: boolean;
}) {
  const showDateFilter =
    canViewMaintenance && (role === "coordinador" || role === "superadmin");
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [grainDraft, setGrainDraft] = useState<DateGrain>("month");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [grain, setGrain] = useState<DateGrain>("month");
  const [chartKey, setChartKey] = useState(0);

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
    setGrain(grainDraft);
    setChartKey((k) => k + 1);
  };

  const maintenanceFiltered = useMemo(() => {
    if (!showDateFilter || (!fromDate && !toDate)) return null;
    const costs = data.time_series.maintenance_costs ?? [];
    const rows = costs.filter((c) => inDateRange(c.date, fromDate, toDate));
    const total = rows.reduce((sum, c) => {
      const n = Number(c.cost);
      return Number.isFinite(n) ? sum + n : sum;
    }, 0);
    return { count: rows.length, cost: String(total) };
  }, [showDateFilter, data.time_series.maintenance_costs, fromDate, toDate]);

  return (
    <>
      <KpiRow
        data={data}
        canViewEquipment={canViewEquipment}
        canViewFailures={canViewFailures}
        canViewScheduling={canViewScheduling}
        canViewMaintenance={canViewMaintenance}
        maintenanceCount={maintenanceFiltered?.count}
        maintenanceCost={maintenanceFiltered?.cost}
      />

      {showDateFilter && (
        <div className="grid gap-3 sm:grid-cols-4">
          <Input
            type="date"
            label="Desde"
            value={fromDraft}
            max={toDraft || undefined}
            onChange={(e) => setFromDraft(e.target.value)}
          />
          <Input
            type="date"
            label="Hasta"
            value={toDraft}
            min={fromDraft || undefined}
            onChange={(e) => setToDraft(e.target.value)}
          />
          <Select
            label="Fechas"
            value={grainDraft}
            onChange={(e) => setGrainDraft(e.target.value as DateGrain)}
            options={[
              { value: "day", label: "Día" },
              { value: "month", label: "Mes" },
              { value: "year", label: "Año" },
            ]}
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
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {canViewFailures && (
          <FailuresSeverityChart
            data={data.distributions.failures_by_severity}
          />
        )}
      </div>

      {canViewMaintenance &&
        (role === "coordinador" || role === "superadmin") && (
          <CoordinatorSolicitudesChart
            series={data.time_series.schedules ?? []}
            costs={data.time_series.maintenance_costs ?? []}
            fromDate={fromDate}
            toDate={toDate}
            grain={grain}
            chartKey={chartKey}
          />
        )}
      {canViewMaintenance &&
        role !== "coordinador" &&
        role !== "superadmin" && (
          <MaintenanceTimeSeriesChart
            data={data.time_series.maintenance_by_month}
          />
        )}
    </>
  );
}

function CoordinatorSolicitudesChart({
  series,
  costs,
  fromDate,
  toDate,
  grain,
  chartKey,
}: {
  series: { date: string; kind?: string; resolved: boolean }[];
  costs: { date: string; cost: string }[];
  fromDate: string;
  toDate: string;
  grain: DateGrain;
  chartKey: number;
}) {
  const chartData = useMemo(
    () => buildCoordinatorChartData(series, costs, fromDate, toDate, grain),
    [series, costs, fromDate, toDate, grain],
  );

  const hasData = chartData.some(
    (row) => row.Preventivo > 0 || row.Reparación > 0 || row.costo > 0,
  );
  const grainText =
    grain === "year" ? "por año" : grain === "month" ? "por mes" : "por día";

  return (
    <>
      <Card>
        <CardHeader
          title="Solicitudes"
          subtitle={`Cantidad por tipo vs costo de mantenimiento, ${grainText}`}
        />
        <div className="h-72">
          {!hasData ? (
            <p className="py-8 text-center text-sm text-app-muted">
              No hay solicitudes en el rango de fechas.
            </p>
          ) : (
            <ResponsiveContainer
              key={`${fromDate}|${toDate}|${grain}|${chartKey}`}
              width="100%"
              height={256}
              minWidth={0}
            >
              <ComposedChart
                data={chartData}
                barCategoryGap="28%"
                margin={{ top: 8, right: 8, left: 0, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="key"
                  tickFormatter={(value: string) => grainLabel(value, grain)}
                  interval={chartData.length > 14 ? "preserveStartEnd" : 0}
                  minTickGap={8}
                />
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
                  labelFormatter={(value) => grainLabel(String(value), grain)}
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
                  maxBarSize={56}
                />
                <Bar
                  yAxisId="count"
                  dataKey="Reparación"
                  stackId="kind"
                  fill={KIND_COLOR.REPAIR}
                  maxBarSize={56}
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
          )}
        </div>
      </Card>
    </>
  );
}

function BuildAdminChart({
  series,
  costs,
}: {
  series: {date:string; kind?:string; resolved:boolean}[];
  costs: {date:string;cost:string}[];
}) {
  const [fromDate,setFromDate] = useState("");
  const [toDate,setToDate] = useState("");
  const [grain,setGrain] = useState<DateGrain>("month");
  const [chartKey,setChartKey] = useState(0);

  const applyFilters = () => {
    if (!fromDate && fromDate > toDate) {
      setFromDate(toDate);
      setToDate(fromDate);
    }
    setChartKey((k) => k + 1);
  };
  
  const chartData = useMemo(
    () => buildAdministratorChartData(series,costs,fromDate,toDate,grain),
    [series,costs,fromDate,toDate,grain],
  );

  const hasData = chartData.some(
    (row) => row.Preventivo > 0 || row.Reparación > 0 || row.costo > 0,
  );
  const grainText =
    grain === "year" ? "por año" : grain === "month" ? "por mes" : "por día";

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-4">
        <Input
        type="date"
        value="Desde"
        max={toDate || undefined}
        onChange={(e) => setFromDate(e.target.value)}
        />
        <Input
        type="date"
        label="Hasta"
        value={toDate}
        min={fromDate || undefined}
        onChange={(e) => setToDate(e.target.value)}
        />
        <Select 
        label="Fechas"
        value={grain}
        onChange={(e) => setGrain(e.target.value as DateGrain)}
        options={[
          {value:"day",label:"Día"},
          {value:"month",label:"Mes"},
          {value:"year",label:"Año"},
        ]}
        />
        <div className="flex items-end">
          <Button
          type="button"
          variant="secondary"
          onClick={applyFilters}
          className="w-full"
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader 
        title="Solicitudes"
        subtitle={`Cantidad por tipo vs costo de mantenimiento, ${grainText}`}
        />
        <div className="h-72">
          {!hasData ? (
            <p className="py-8 text-center text-sm text-app-muted">
              No hay solicitudes en el rango de fechas.
            </p>
          ): (
            <ResponsiveContainer
            key={`${fromDate}|${toDate}|${grain}|${chartKey}`}
            width="100%"
            height={256}
            minWidth={0}
            >
              <ComposedChart
              data={chartData}
              barCategoryGap="28%"
              margin={{top:8,right:8,left:0,bottom:4}}
              >
                <CartesianGrid strokeDasharray="3 3"/>
                <XAxis
                dataKey="key"
                tickFormatter={(value:string) => grainLabel(value,grain)}
                interval={chartData.length > 14 ? "preserveStartEnd" :0}
                minTickGap={8}
                />
                <YAxis
                yAxisId="count"
                allowDecimals={false}
                label={{
                  value:"Cantidad",
                  angle:90,
                  position:"insideLeft",
                  fontSize:12,
                }}
                />
                <YAxis
                yAxisId="cost"
                orientation="right"
                tickFormatter={(v:number) =>
                  v >= 1_000_000
                    ? `${(v/1_000_000).toFixed(1)}M`
                    : v >= 1000
                      ? `${(v/1000)}.toFixed(0)|K`
                      : String(v)
                }
                />
                <Tooltip
                labelFormatter={(value) => grainLabel(String(value),grain)}
                formatter={(value,name) => {
                  if (name === "costo")
                    return [formatCost(Number(value ?? 0)),"Costo"];
                  return [String(value ?? 0),String(name ?? "")];
                }}
                />
                <Legend/>
                <Bar
                yAxisId="count"
                dataKey="Preventivo"
                stackId="kind"
                fill={KIND_COLOR.PREVENTIVE}
                maxBarSize={56}
                />
                <Bar
                yAxisId="count"
                dataKey="Reparación"
                stackId="kind"
                fill={KIND_COLOR.REPAIR}
                maxBarSize={56}
                />
                <Line
                yAxisId="cost"
                type="monotone"
                dataKey="costo"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{r:3}}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>
    </>
  )
} 
