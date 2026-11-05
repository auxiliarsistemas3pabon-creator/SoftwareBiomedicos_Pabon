import type { WorkOrderHeaderProps } from "@/types/equipment/workorder-props";

export function WorkOrderHeader({ isEngineer }: WorkOrderHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-app">
          {isEngineer ? "Tareas asignadas" : "Órdenes de trabajo"}
        </h1>
        <p className="text-sm text-app-muted">
          {isEngineer
            ? "Órdenes de trabajo que te asignaron. Realiza el mantenimiento para cerrarlas."
            : "Registro de intervenciones en equipos: repuestos, mediciones, evidencias, firmas y costos."}
        </p>
      </div>
    </div>
  );
}
