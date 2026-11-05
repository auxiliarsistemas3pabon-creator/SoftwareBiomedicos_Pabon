import type { WorkOrder } from "@/types/equipment/workorder";
import { STATUS_LABEL, TYPE_LABEL, formatDateTime } from "@/utils/workorder.utils";

export function WorkOrderInfo({ w }: { w: WorkOrder }) {
  return (
    <div className="grid gap-2 rounded-lg border border-app bg-app-muted p-3 text-sm sm:grid-cols-2">
      <p className="sm:col-span-2 text-xs font-medium uppercase tracking-wide text-app-muted">
        Datos de la orden
      </p>
      <div>
        <span className="text-app-muted">Número: </span>
        {w.number}
      </div>
      <div>
        <span className="text-app-muted">Equipo: </span>
        {w.equipment_name ?? `Equipo #${w.equipment}`}{" "}
        {w.equipment_asset_tag && (
          <span className="font-mono text-xs">{w.equipment_asset_tag}</span>
        )}
      </div>
      <div>
        <span className="text-app-muted">Tipo: </span>
        {w.service_type_display ?? TYPE_LABEL[w.service_type]}
      </div>
      <div>
        <span className="text-app-muted">Estado: </span>
        {w.status_display ?? STATUS_LABEL[w.status]}
      </div>
      <div>
        <span className="text-app-muted">Inicio: </span>
        {formatDateTime(w.start_date)}
      </div>
      {(w.status === "FINISHED" || w.end_date) && (
        <div>
          <span className="text-app-muted">Fecha fin: </span>
          {formatDateTime(w.end_date)}
        </div>
      )}
      <div>
        <span className="text-app-muted">Asignado: </span>
        {w.technician_name ?? "Sin asignar"}
      </div>
      <div className="sm:col-span-2">
        <span className="text-app-muted">Descripción: </span>
        {w.description || "—"}
      </div>
    </div>
  );
}
