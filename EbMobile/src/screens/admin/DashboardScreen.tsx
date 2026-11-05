import { useState, useCallback } from "react";
import { RefreshControl, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import Svg, { Circle } from "react-native-svg";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Wrench,
} from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ROLE_LABEL } from "@/lib/permissions";
import { fullNameOf } from "@/lib/users";
import { equipmentService } from "@/services/equipment.service";
import { failuresService } from "@/services/failures.service";
import { schedulingService } from "@/services/scheduling.service";
import { workOrdersService } from "@/services/workorders.service";
import type { Equipment } from "@/types/equipment";
import type { ScheduledMaintenance } from "@/types/scheduling";
import type { WorkOrder } from "@/types/workorder";

function grainKey(iso: string, grain: "day" | "month" | "year"): string {
  const d = iso.slice(0, 10);
  if (grain === "year") return d.slice(0, 4);
  if (grain === "month") return d.slice(0, 7);
  return d;
}

function grainLabel(key: string, grain: "day" | "month" | "year"): string {
  if (grain === "year") return key;
  if (grain === "month") {
    const [y, m] = key.split("-").map(Number);
    if (!y || !m) return key;
    return new Date(y, m - 1, 1).toLocaleDateString("es-CO", {
      month: "short",
      year: "2-digit",
    });
  }
  return weekdayLabel(key);
}

function weekdayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
  });
}

function sixMonthsAgoIso(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function DashboardScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const isUsuario = usuario?.role === "usuario";
  const isIngeniero = usuario?.role === "ingeniero";
  const isCoordinador = usuario?.role === "coordinador";
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    equipos: 0,
    operativos: 0,
    pendientes: 0,
    alertas: 0,
  });
  const [recientes, setRecientes] = useState<Equipment[]>([]);
  const [myRequests, setMyRequests] = useState<ScheduledMaintenance[]>([]);
  const [myOrders, setMyOrders] = useState<WorkOrder[]>([]);
  const [coordSchedules, setCoordSchedules] = useState<ScheduledMaintenance[]>(
    [],
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [grain, setGrain] = useState<"day" | "month" | "year">("month");
  const [fromDraft, setFromDraft] = useState(sixMonthsAgoIso);
  const [toDraft, setToDraft] = useState(todayIso);
  const [grainDraft, setGrainDraft] = useState<"day" | "month" | "year">(
    "month",
  );
  const [coordFrom, setCoordFrom] = useState(sixMonthsAgoIso);
  const [coordTo, setCoordTo] = useState(todayIso);
  const [coordGrain, setCoordGrain] = useState<"day" | "month" | "year">(
    "month",
  );

  const load = useCallback(async () => {
    try {
      if (isUsuario) {
        const rows = await schedulingService.listAll().catch(() => []);
        setMyRequests(rows);
        return;
      }
      if (isIngeniero) {
        const rows = await workOrdersService.listAll().catch(() => []);
        setMyOrders(rows);
        return;
      }
      // listAll (no list): con más equipos/fallas/solicitudes que una página
      // (20), .list() los trunca en silencio y los contadores quedan mal —
      // aquí es justo donde más se nota, son las cifras que se muestran primero.
      // Cada métrica atrapa su propio error: el ingeniero ya no tiene acceso
      // a "scheduling" (403), y eso no debe apagar también equipos/fallas.
      const [equipos, fallasAbiertas, agendaPendiente, todasSolicitudes] =
        await Promise.all([
        equipmentService.listAll({ ordering: "-created_at" }).catch(() => []),
        failuresService.listAll({ resolved: false }).catch(() => []),
        schedulingService.listAll({ is_completed: false }).catch(() => []),
        isCoordinador
          ? schedulingService.listAll().catch(() => [])
          : Promise.resolve([]),
      ]);
      const operativos = equipos.filter((e) => e.status === "ACTIVE").length;
      setStats({
        equipos: equipos.length,
        operativos,
        pendientes: agendaPendiente.length,
        alertas: fallasAbiertas.length,
      });
      setRecientes(equipos.slice(0, 5));
      setCoordSchedules(todasSolicitudes);
    } catch {
      // Silencioso: el dashboard nunca debe romper si una métrica falla.
    }
  }, [isUsuario, isIngeniero, isCoordinador]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const fullName = usuario ? fullNameOf(usuario) : "";
  const usuarioFiltered = myRequests.filter((r) => {
    const d = r.requested_date.slice(0, 10);
    if (fromDate && d < fromDate) return false;
    if (toDate && d > toDate) return false;
    return true;
  });
  const pending = usuarioFiltered.filter((r) => !r.is_completed).length;
  const done = usuarioFiltered.filter((r) => r.is_completed).length;
  const usuarioBars = (() => {
    const buckets = new Map<string, number>();
    for (const r of usuarioFiltered) {
      const key = grainKey(r.requested_date, grain);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        count,
        label: grainLabel(date, grain),
      }));
  })();
  const coordFiltered = coordSchedules.filter((r) => {
    const d = r.requested_date.slice(0, 10);
    if (coordFrom && d < coordFrom) return false;
    if (coordTo && d > coordTo) return false;
    return true;
  });
  const coordPending = coordFiltered.filter((r) => !r.is_completed).length;
  const coordDone = coordFiltered.filter((r) => r.is_completed).length;
  const coordBars = (() => {
    const buckets = new Map<string, number>();
    for (const r of coordFiltered) {
      const key = grainKey(r.requested_date, coordGrain);
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        count,
        label: grainLabel(date, coordGrain),
      }));
  })();
  const assignedOrders = myOrders.filter((o) => o.status !== "CANCELLED");
  const pendingOrders = myOrders.filter((o) => o.status === "PENDING");
  const inProgressOrders = myOrders.filter((o) => o.status === "IN_PROGRESS");
  const resolvedOrders = myOrders.filter((o) => o.status === "FINISHED");
  const queueOrders = [...pendingOrders, ...inProgressOrders];

  const cards = [
    {
      label: "Equipos registrados",
      value: stats.equipos,
      icon: <ClipboardList size={20} color="#2563eb" />,
      bg: "bg-blue-50 dark:bg-blue-950/40",
    },
    {
      label: "Operativos",
      value: stats.operativos,
      icon: <CheckCircle2 size={20} color="#059669" />,
      bg: "bg-emerald-50 dark:bg-emerald-950/40",
    },
    {
      label: "Pendientes",
      value: stats.pendientes,
      icon: <Wrench size={20} color="#d97706" />,
      bg: "bg-amber-50 dark:bg-amber-950/40",
    },
    {
      label: "En alerta",
      value: stats.alertas,
      icon: <AlertTriangle size={20} color="#dc2626" />,
      bg: "bg-red-50 dark:bg-red-950/40",
    },
  ];

  return (
    <ScreenContainer
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <View>
        <Text className="text-2xl font-bold text-app-text dark:text-app-dark-text">
          Hola, {fullName} 👋
        </Text>
        {usuario && (
          <Text className="mt-1 text-sm text-app-text-muted dark:text-app-dark-text-muted">
            Tu perfil:{" "}
            <Text className="font-medium text-app-text dark:text-app-dark-text">
              {ROLE_LABEL[usuario.role]}
            </Text>
            .{" "}
            {isUsuario
              ? "Monitorea las solicitudes que has creado."
              : isIngeniero
                ? "Tus tareas asignadas: pendientes y resueltas."
                : "Resumen general del estado de los equipos biomédicos."}
          </Text>
        )}
      </View>

      {isUsuario ? (
        <>
          <View className="flex-row flex-wrap gap-3">
            <Card className="min-w-[47%] flex-1">
              <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                Solicitudes
              </Text>
              <Text className="mt-1 text-2xl font-bold text-app-text dark:text-app-dark-text">
                {usuarioFiltered.length}
              </Text>
            </Card>
            <Card className="min-w-[47%] flex-1">
              <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                Estado
              </Text>
              <Text className="mt-1 text-2xl font-bold text-app-text dark:text-app-dark-text">
                {pending} pendientes
              </Text>
              <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                {done} cumplidas
              </Text>
            </Card>
          </View>

          <Card>
            <Input
              label="Desde"
              value={fromDate}
              onChangeText={setFromDate}
              placeholder="AAAA-MM-DD"
            />
            <Input
              label="Hasta"
              value={toDate}
              onChangeText={setToDate}
              placeholder="AAAA-MM-DD"
              containerClassName="mt-2"
            />
            <View className="mt-2">
              <Select
                label="Fechas"
                value={grain}
                onChange={setGrain}
                options={[
                  { label: "Día", value: "day" },
                  { label: "Mes", value: "month" },
                  { label: "Año", value: "year" },
                ]}
              />
            </View>
          </Card>

          <Card>
            <Text className="text-base font-semibold text-app-text dark:text-app-dark-text">
              Estado de solicitudes
            </Text>
            <Text className="mb-3 text-xs text-app-text-muted dark:text-app-dark-text-muted">
              Pendientes vs cumplidas
            </Text>
            <WeekDonut pending={pending} done={done} />
          </Card>

          <Card>
            <Text className="text-base font-semibold text-app-text dark:text-app-dark-text">
              Fecha de solicitud
            </Text>
            <Text className="mb-3 text-xs text-app-text-muted dark:text-app-dark-text-muted">
              {grain === "year"
                ? "Barras por año"
                : grain === "month"
                  ? "Barras por mes"
                  : "Barras por día"}
            </Text>
            <WeekBars rows={usuarioBars} />
          </Card>
        </>
      ) : isIngeniero ? (
        <>
          <View className="flex-row flex-wrap gap-3">
            <Card className="min-w-[47%] flex-1">
              <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                Tareas asignadas
              </Text>
              <Text className="mt-1 text-2xl font-bold text-app-text dark:text-app-dark-text">
                {assignedOrders.length}
              </Text>
            </Card>
            <Card className="min-w-[47%] flex-1">
              <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                Tareas pendientes
              </Text>
              <Text className="mt-1 text-2xl font-bold text-app-text dark:text-app-dark-text">
                {pendingOrders.length}
              </Text>
            </Card>
            <Card className="min-w-[47%] flex-1">
              <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                En proceso
              </Text>
              <Text className="mt-1 text-2xl font-bold text-app-text dark:text-app-dark-text">
                {inProgressOrders.length}
              </Text>
            </Card>
            <Card className="min-w-[47%] flex-1">
              <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                Tareas resueltas
              </Text>
              <Text className="mt-1 text-2xl font-bold text-app-text dark:text-app-dark-text">
                {resolvedOrders.length}
              </Text>
            </Card>
          </View>

          <Card>
            <Text className="text-base font-semibold text-app-text dark:text-app-dark-text">
              Cola de trabajo
            </Text>
            <Text className="mb-3 text-xs text-app-text-muted dark:text-app-dark-text-muted">
              Pendientes por resolver
            </Text>
            {queueOrders.length === 0 ? (
              <Text className="text-sm text-app-text-muted dark:text-app-dark-text-muted">
                No hay tareas pendientes.
              </Text>
            ) : (
              <View className="gap-3">
                {queueOrders.slice(0, 8).map((wo, idx) => (
                  <View
                    key={wo.id}
                    className={
                      idx === Math.min(queueOrders.length, 8) - 1
                        ? "flex-row items-center justify-between"
                        : "flex-row items-center justify-between border-b border-app-border dark:border-app-dark-border pb-2"
                    }
                  >
                    <View className="flex-1 pr-2">
                      <Text
                        className="text-sm font-medium text-app-text dark:text-app-dark-text"
                        numberOfLines={1}
                      >
                        {wo.equipment_name ?? wo.number}
                      </Text>
                      <Text
                        className="text-xs text-app-text-muted dark:text-app-dark-text-muted"
                        numberOfLines={1}
                      >
                        {wo.number} · {wo.equipment_asset_tag ?? ""}
                      </Text>
                    </View>
                    <Badge tone={wo.status === "IN_PROGRESS" ? "info" : "warning"}>
                      {wo.status_display ?? wo.status}
                    </Badge>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </>
      ) : (
        <>
      <View className="flex-row flex-wrap gap-3">
        {cards.map((c) => (
          <Card key={c.label} className="min-w-[47%] flex-1">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                  {c.label}
                </Text>
                <Text className="mt-1 text-2xl font-bold text-app-text dark:text-app-dark-text">
                  {c.value}
                </Text>
              </View>
              <View className={`rounded-lg p-2 ${c.bg}`}>{c.icon}</View>
            </View>
          </Card>
        ))}
      </View>

      {isCoordinador && (
        <>
          <Card>
            <Text className="text-base font-semibold text-app-text dark:text-app-dark-text">
              Solicitudes
            </Text>
            <Text className="mb-3 text-xs text-app-text-muted dark:text-app-dark-text-muted">
              {coordFiltered.length} solicitudes en el rango
            </Text>
            <Input
              label="Desde"
              value={fromDraft}
              onChangeText={setFromDraft}
              placeholder="AAAA-MM-DD"
            />
            <Input
              label="Hasta"
              value={toDraft}
              onChangeText={setToDraft}
              placeholder="AAAA-MM-DD"
              containerClassName="mt-2"
            />
            <View className="mt-2">
              <Select
                label="Fechas"
                value={grainDraft}
                onChange={setGrainDraft}
                options={[
                  { label: "Día", value: "day" },
                  { label: "Mes", value: "month" },
                  { label: "Año", value: "year" },
                ]}
              />
            </View>
            <View className="mt-3">
              <Button
                variant="secondary"
                onPress={() => {
                  setCoordFrom(fromDraft);
                  setCoordTo(toDraft);
                  setCoordGrain(grainDraft);
                }}
              >
                Aplicar filtros
              </Button>
            </View>
          </Card>
          <Card>
            <Text className="text-base font-semibold text-app-text dark:text-app-dark-text">
              Estado de solicitudes
            </Text>
            <WeekDonut pending={coordPending} done={coordDone} />
          </Card>
          <Card>
            <Text className="text-base font-semibold text-app-text dark:text-app-dark-text">
              Fecha de solicitud
            </Text>
            <WeekBars rows={coordBars} />
          </Card>
        </>
      )}

      <Card>
        <View className="mb-3 flex-row items-center justify-between">
          <View>
            <Text className="text-base font-semibold text-app-text dark:text-app-dark-text">
              Equipos recientes
            </Text>
            <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
              Últimos creados
            </Text>
          </View>
          <Activity size={16} color={colors.textMuted} />
        </View>
        {recientes.length === 0 ? (
          <Text className="text-sm text-app-text-muted dark:text-app-dark-text-muted">
            Aún no hay equipos registrados.
          </Text>
        ) : (
          <View className="gap-3">
            {recientes.map((eq, idx) => (
              <View
                key={eq.id}
                className={
                  idx === recientes.length - 1
                    ? "flex-row items-center justify-between"
                    : "flex-row items-center justify-between border-b border-app-border dark:border-app-dark-border pb-2"
                }
              >
                <View className="flex-1 pr-2">
                  <Text
                    className="text-sm font-medium text-app-text dark:text-app-dark-text"
                    numberOfLines={1}
                  >
                    {eq.name}
                  </Text>
                  <Text
                    className="text-xs text-app-text-muted dark:text-app-dark-text-muted"
                    numberOfLines={1}
                  >
                    {eq.asset_tag} · {eq.branch_name ?? "Sin sede"}
                  </Text>
                </View>
                <Badge
                  tone={
                    eq.status === "ACTIVE"
                      ? "success"
                      : eq.status === "IN_MAINTENANCE"
                        ? "warning"
                        : eq.status === "IN_REPAIR"
                          ? "danger"
                          : "neutral"
                  }
                >
                  {labelStatus(eq.status)}
                </Badge>
              </View>
            ))}
          </View>
        )}
      </Card>
        </>
      )}
    </ScreenContainer>
  );
}

function WeekDonut({ pending, done }: { pending: number; done: number }) {
  const total = pending + done;
  const size = 140;
  const r = 42;
  const c = 2 * Math.PI * r;
  const pendingLen = total === 0 ? 0 : (pending / total) * c;
  return (
    <View className="items-center gap-3">
      {total === 0 ? (
        <Text className="py-6 text-sm text-app-text-muted dark:text-app-dark-text-muted">
          No hay solicitudes en el rango seleccionado.
        </Text>
      ) : (
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#10b981"
            strokeWidth={16}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="#f59e0b"
            strokeWidth={16}
            fill="none"
            strokeDasharray={`${pendingLen} ${c}`}
            strokeLinecap="butt"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
      )}
      <View className="flex-row gap-4">
        <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
          Pendientes: {pending}
        </Text>
        <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
          Cumplidas: {done}
        </Text>
      </View>
    </View>
  );
}

function WeekBars({
  rows,
}: {
  rows: { date: string; count: number; label?: string }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (rows.length === 0) {
    return (
      <Text className="py-6 text-sm text-app-text-muted dark:text-app-dark-text-muted">
        No hay solicitudes para graficar en este rango.
      </Text>
    );
  }
  return (
    <View className="h-36 flex-row items-end justify-between gap-1">
      {rows.map((row) => (
        <View key={row.date} className="flex-1 items-center">
          <View
            className="w-full rounded-t bg-sky-500"
            style={{ height: Math.max(4, (row.count / max) * 96) }}
          />
          <Text
            className="mt-1 text-[10px] text-app-text-muted dark:text-app-dark-text-muted"
            numberOfLines={1}
          >
            {row.label ?? weekdayLabel(row.date)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function labelStatus(s: Equipment["status"]) {
  switch (s) {
    case "ACTIVE":
      return "Operativo";
    case "INACTIVE":
      return "Inactivo";
    case "IN_MAINTENANCE":
      return "Mantenimiento";
    case "IN_REPAIR":
      return "Reparación";
  }
}
