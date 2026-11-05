import type { EquipmentHeaderProps } from "@/types/equipment/props";

export function EquipmentHeader({ role, area }: EquipmentHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-app">Inventario</h1>
        {role === "tecnico" && (
          <p className="text-sm text-app-muted">
            Equipos de tu área{area ? ` (${area})` : ""}. Consulta e informa fallas observadas.
          </p>
        )}
      </div>
    </div>
  );
}
