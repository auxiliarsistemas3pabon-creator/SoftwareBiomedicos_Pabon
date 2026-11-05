import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABEL, can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { fullNameOf } from "@/lib/users";
import { dashboardService } from "@/services/dashboard.service";
import type { DashboardSummary } from "@/types/dashboard/dashboard";
import { AreaOpsDashboard } from "@/pages/admin/dashboard/AreaOpsDashboard";
import { EngineerTasksDashboard } from "@/pages/admin/dashboard/EngineerTasksDashboard";
import { MyTasksSection, OperativoWeekSection, OverdueSchedulesList, WorstMtbfList } from "@/pages/admin/dashboard/DashboardSections";
import { AdminOverview } from "@/pages/admin/dashboard/AdminOverview";

export function DashboardPage() {
  const { usuario } = useAuth();
  const role = usuario?.role;

  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    dashboardService
      .summary()
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled)
          setError(getApiErrorMessage(err, "No se pudo cargar el dashboard"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fullName = usuario ? fullNameOf(usuario) : "";

  const canViewEquipment = can(role, "equipment", "view");
  const canViewFailures = can(role, "failures", "view");
  const canViewScheduling = can(role, "scheduling", "view");
  const canViewMaintenance = can(role, "maintenance", "view");
  const isOperativo = role === "tecnico";

  const greeting = isOperativo
    ? `Tus reportes de falla${usuario?.area ? ` · ${usuario.area}` : ""}.`
    : role === "usuario"
      ? "Monitorea las solicitudes que has creado: pendientes y cumplidas."
      : role === "ingeniero"
        ? "Tus tareas asignadas: pendientes por resolver y ya resueltas."
        : "Resumen general del estado de los equipos biomédicos.";

  const myTasksCount =
    (data?.my_tasks?.schedules?.length ?? 0) +
    (data?.my_tasks?.failures?.length ?? 0);

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-app sm:text-3xl">
          Hola, {fullName} 👋
        </h1>
        <p className="text-sm text-app-muted">
          {usuario && (
            <>
              Tu perfil:{" "}
              <span className="font-medium text-app">
                {ROLE_LABEL[usuario.role]}
              </span>
              . {greeting}
            </>
          )}
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {loading && !data ? (
        <p className="py-12 text-center text-app-muted">Cargando dashboard…</p>
      ) : data ? (
        <>
          {role === "usuario" ? (
            data.area_ops ? (
              <AreaOpsDashboard ops={data.area_ops} />
            ) : (
              <p className="py-12 text-center text-app-muted">
                Aún no hay solicitudes para monitorear.
              </p>
            )
          ) : role === "ingeniero" ? (
            <EngineerTasksDashboard
              tasks={
                data.engineer_tasks ?? {
                  kpis: { assigned: 0, pending: 0, in_progress: 0, resolved: 0 },
                  recent: [],
                }
              }
            />
          ) : isOperativo && data.area_ops ? (
            <AreaOpsDashboard ops={data.area_ops} />
          ) : (
            <>
          {role === "tecnico" && data.my_week && (
            <OperativoWeekSection week={data.my_week} />
          )}

          {myTasksCount > 0 && canViewScheduling && (
            <MyTasksSection schedules={data.my_tasks?.schedules ?? []} />
          )}

          {canViewScheduling && data.kpis.scheduling.overdue > 0 && (
            <div
              role="alert"
              className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
            >
              Hay {data.kpis.scheduling.overdue} solicitud
              {data.kpis.scheduling.overdue === 1 ? "" : "es"} vencida
              {data.kpis.scheduling.overdue === 1 ? "" : "s"}: pendientes cuya
              fecha de fin ya llegó o ya pasó.
            </div>
          )}

          <AdminOverview
            data={data}
            role={role}
            canViewEquipment={canViewEquipment}
            canViewFailures={canViewFailures}
            canViewScheduling={canViewScheduling}
            canViewMaintenance={canViewMaintenance}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            {canViewScheduling && (
              <OverdueSchedulesList items={data.lists.overdue_schedules} />
            )}
            {canViewEquipment && (
              <WorstMtbfList items={data.lists.worst_mtbf} />
            )}
          </div>
            </>
          )}
        </>
      ) : null}
    </div>
  );
}