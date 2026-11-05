import { useEffect, useState } from "react";
import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { WorkOrderIntervention } from "@/pages/admin/scheduling/WorkOrderIntervention";
import { maintenanceService } from "@/services/maintenance.service";
import { getApiErrorMessage } from "@/lib/api";
import {
  KIND_LABEL,
  formatDateTime,
  labelForRequester,
  labelForScheduleTechnician,
  scheduleEstado,
} from "@/utils/scheduling.utils";
import type { SchedulingDetailModalProps } from "@/types/scheduling/props";

export function SchedulingDetailModal({
  viewing,
  onClose,
  canOpenWorkOrder,
  workOrderId,
  woLoading,
  woDetail,
  showRequestingArea,
  equipmentLabel,
}: SchedulingDetailModalProps) {
  return (
    <Modal
      open={!!viewing}
      onClose={onClose}
      title="Detalle de la solicitud"
      size={canOpenWorkOrder && workOrderId ? "xl" : "lg"}
    >
      {viewing && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
              Equipo
            </p>
            <p className="mt-0.5 text-sm font-medium text-app">
              {viewing.equipment_name ?? equipmentLabel(viewing.equipment)}
              {viewing.equipment_asset_tag
                ? ` (${viewing.equipment_asset_tag})`
                : ""}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
              Solicitante
            </p>
            <p className="mt-0.5 text-sm text-app">
              {labelForRequester(viewing) ?? "—"}
            </p>
          </div>
          {showRequestingArea && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Área solicitante
              </p>
              <p className="mt-0.5 text-sm text-app">
                {viewing.requesting_area ?? "—"}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
              Tipo
            </p>
            <p className="mt-0.5 text-sm text-app">
              {KIND_LABEL[viewing.kind]}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
              Estado
            </p>
            <p className="mt-0.5 text-sm text-app">
              {scheduleEstado(viewing).label}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
              Fecha de solicitud
            </p>
            <p className="mt-0.5 text-sm text-app">{viewing.requested_date}</p>
          </div>
          {viewing.scheduled_date && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
              Fecha programada
            </p>
            <p className="mt-0.5 text-sm text-app">
              {viewing.scheduled_date}
            </p>
          </div>
          )}
          {viewing.work_order?.status === "FINISHED" && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Fecha fin
              </p>
              <p className="mt-0.5 text-sm text-app">
                {formatDateTime(viewing.work_order.end_date)}
              </p>
            </div>
          )}
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
              Asignado a
            </p>
            <p className="mt-0.5 text-sm text-app">
              {labelForScheduleTechnician(viewing) ?? "Sin asignar"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
              Descripción
            </p>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-app">
              {viewing.notes?.trim() ? viewing.notes : "Sin descripción"}
            </p>
          </div>
          {viewing.work_order?.status === "FINISHED" && (
            <div className="sm:col-span-2">
              <p className="text-xs font-medium uppercase tracking-wide text-app-muted">
                Trabajo realizado
              </p>
              {viewing.maintenance_record_detail?.id ? (
                <WorkPerformedDescription
                  maintenanceRecordId={viewing.maintenance_record_detail.id}
                />
              ) : (
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-app">
                  {woDetail?.report?.trim() ||
                    "Sin detalle del trabajo realizado."}
                </p>
              )}
            </div>
          )}
          {viewing.maintenance_record_detail && (
            <p className="inline-flex items-center gap-1 text-xs text-app-muted sm:col-span-2">
              <Wrench size={11} />
              Cumplida por mantenimiento #{viewing.maintenance_record_detail.id}{" "}
              · {viewing.maintenance_record_detail.date}
            </p>
          )}
          {canOpenWorkOrder && workOrderId && (
            <WorkOrderIntervention woLoading={woLoading} woDetail={woDetail} />
          )}
          <div className="flex justify-end sm:col-span-2">
            <Button variant="secondary" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function WorkPerformedDescription({
  maintenanceRecordId,
}: {
  maintenanceRecordId: number;
}) {
  const [description, setDescription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    maintenanceService
      .retrieve(maintenanceRecordId)
      .then((record) => {
        if (!cancelled) {
          setDescription(
            record.observations?.trim() || record.description?.trim() || null,
          );
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            getApiErrorMessage(err, "No se pudo cargar el trabajo realizado."),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [maintenanceRecordId]);

  if (error) {
    return (
      <p role="alert" className="mt-0.5 text-sm text-red-600 dark:text-red-400">
        {error}
      </p>
    );
  }

  return (
    <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-app">
      {description ?? "Cargando detalle del trabajo realizado..."}
    </p>
  );
}
