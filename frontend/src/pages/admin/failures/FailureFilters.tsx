import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import type { FailureFiltersProps } from "@/types/failure/props";
import { SEV_LABEL } from "@/utils/failure.utils";

export function FailureFilters({
  setSearch,
  equipmentOptions,
  severityFilter,
  setSeverityFilter,
  resolvedFilter,
  setResolvedFilter,
  branchFilter,
  setBranchFilter,
  branchOptions,
  areaFilter,
  setAreaFilter,
  areaOptions,
}: FailureFiltersProps) {
  const field = "min-w-52 flex-1";
  return (
    <div className="flex w-full min-w-full flex-nowrap items-center gap-3 border-b border-app px-4 py-4">
      <div className={field}>
        <Combobox
          options={equipmentOptions}
          onQueryChange={setSearch}
          onSelect={(opt) => setSearch(opt?.label ?? "")}
          placeholder="Buscar equipo..."
          ariaLabel="Buscar reporte por equipo"
        />
      </div>
      <div className={field}>
        <Select
          placeholder="Toda severidad"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          options={Object.entries(SEV_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>
      <div className={field}>
        <Select
          placeholder="Todos"
          value={resolvedFilter}
          onChange={(e) => setResolvedFilter(e.target.value)}
          options={[
            { value: "false", label: "Sin resolver" },
            { value: "true", label: "Resueltas" },
          ]}
        />
      </div>
      <div className={field}>
        <Select
          placeholder="Todas las sedes"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
          options={branchOptions}
        />
      </div>
      <div className={field}>
        <Select
          placeholder="Todos los servicios"
          value={areaFilter}
          onChange={(e) => setAreaFilter(e.target.value)}
          options={areaOptions}
        />
      </div>
    </div>
  );
}
