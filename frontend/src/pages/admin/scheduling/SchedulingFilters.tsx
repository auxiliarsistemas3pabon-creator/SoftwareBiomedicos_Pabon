import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import type { SchedulingFiltersProps } from "@/types/scheduling/props";

export function SchedulingFilters({
  onSearchChange,
  equipmentOptions,
  completedFilter,
  onCompletedFilterChange,
  branchFilter,
  onBranchFilterChange,
  branchOptions,
  areaFilter,
  onAreaFilterChange,
  areaOptions,
}: SchedulingFiltersProps) {
  const field = "min-w-52 flex-1";
  return (
    <div className="flex w-full min-w-full flex-nowrap items-center gap-3 border-b border-app px-4 py-4">
      <div className={field}>
        <Combobox
          options={equipmentOptions}
          onQueryChange={onSearchChange}
          onSelect={(opt) => onSearchChange(opt?.label ?? "")}
          placeholder="Buscar equipo..."
          ariaLabel="Buscar solicitud por equipo"
        />
      </div>
      <div className={field}>
        <Select
          placeholder="Todas"
          value={completedFilter}
          onChange={(e) => onCompletedFilterChange(e.target.value)}
          options={[
            { value: "false", label: "Pendientes" },
            { value: "true", label: "Cumplidas" },
          ]}
        />
      </div>
      <div className={field}>
        <Select
          placeholder="Todas las sedes"
          value={branchFilter}
          onChange={(e) => onBranchFilterChange(e.target.value)}
          options={branchOptions}
        />
      </div>
      <div className={field}>
        <Select
          placeholder="Todos los servicios"
          value={areaFilter}
          onChange={(e) => onAreaFilterChange(e.target.value)}
          options={areaOptions}
        />
      </div>
    </div>
  );
}
