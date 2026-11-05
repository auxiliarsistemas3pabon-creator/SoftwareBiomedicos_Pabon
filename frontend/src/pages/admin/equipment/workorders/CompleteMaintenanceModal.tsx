import { Wrench } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import type { FailureSeverity } from "@/types/failure/failure";
import type { WorkOrderStatus } from "@/types/equipment/workorder";
import type { CompleteMaintenanceModalProps } from "@/types/equipment/workorder-props";
import { WorkOrderInfo } from "@/pages/admin/equipment/workorders/WorkOrderInfo";
import { FAIL_SEV_LABEL } from "@/utils/workorder.utils";

export function CompleteMaintenanceModal({
  completing,
  onClose,
  isEngineer,
  completeFailSev,
  setCompleteFailSev,
  completeFailDesc,
  completeObs,
  setCompleteObs,
  completeStatus,
  setCompleteStatus,
  maintenanceStatusOptions,
  completeSaving,
  submitComplete,
}: CompleteMaintenanceModalProps) {
  return (
    <Modal
      open={!!completing}
      onClose={onClose}
      title={
        completing ? `Realizar mantenimiento — ${completing.number}` : ""
      }
      size="lg"
    >
      {completing && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(ev) => {
            ev.preventDefault();
            void submitComplete();
          }}
        >
          <WorkOrderInfo w={completing} />
          {isEngineer && (
            <div className="grid gap-3 rounded-lg border border-app p-3">
              <p className="text-sm font-medium text-app">
                Reporte de falla
              </p>
              <Select
                label="Severidad"
                value={completeFailSev}
                onChange={(e) =>
                  setCompleteFailSev(e.target.value as FailureSeverity)
                }
                options={Object.entries(FAIL_SEV_LABEL).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-app">
                  Descripción de la falla
                </label>
                <textarea
                  value={completeFailDesc}
                  readOnly
                  disabled
                  rows={3}
                  className="w-full cursor-not-allowed rounded-lg border border-app bg-app-muted px-3 py-2.5 text-sm text-app-muted"
                />
              </div>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-app">
              {isEngineer
                ? "Nota de resolución / trabajo realizado *"
                : "Observaciones / trabajo realizado *"}
            </label>
            <textarea
              value={completeObs}
              onChange={(e) => setCompleteObs(e.target.value)}
              rows={4}
              required
              placeholder="Hallazgos, repuestos cambiados, recomendaciones…"
              className="w-full rounded-lg border border-app bg-surface px-3 py-2.5 text-sm text-app outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Select
            label="Estado del mantenimiento"
            value={completeStatus}
            onChange={(e) =>
              setCompleteStatus(e.target.value as WorkOrderStatus)
            }
            options={maintenanceStatusOptions(completing.status)}
          />
          <p className="text-xs text-app-muted">
            {completeStatus === "FINISHED" ? (
              <>
                Al finalizar, la orden queda como <strong>Terminada</strong> y
                el mantenimiento se registra en la hoja de vida del equipo
                {isEngineer
                  ? ". El reporte de falla queda registrado y resuelto."
                  : "."}
              </>
            ) : (
              <>
                Con estado <strong>Pendiente</strong> o{" "}
                <strong>En proceso</strong> se mantiene el botón{" "}
                <strong>Realizar mantenimiento</strong>. El ingeniero no puede
                finalizar de una.
              </>
            )}
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              leftIcon={<Wrench size={16} />}
              loading={completeSaving}
            >
              {completeStatus === "FINISHED"
                ? "Finalizar mantenimiento"
                : "Enviar"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
