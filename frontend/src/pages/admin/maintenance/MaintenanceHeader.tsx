import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { MaintenanceHeaderProps } from "@/types/maintenance/props";

export function MaintenanceHeader({ canCreate, onCreate }: MaintenanceHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-app">
          Historial de mantenimientos
        </h1>
        <p className="text-sm text-app-muted">
          Mantenimientos preventivos, correctivos y reparaciones realizados.
        </p>
      </div>
      {canCreate && (
        <Button leftIcon={<Plus size={16} />} onClick={onCreate}>
          Nuevo mantenimiento
        </Button>
      )}
    </div>
  );
}
