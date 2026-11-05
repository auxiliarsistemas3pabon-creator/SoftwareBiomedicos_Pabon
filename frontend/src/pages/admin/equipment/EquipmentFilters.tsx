import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import { RISK_LABEL, STATUS_LABEL } from "@/utils/equipment.utils";
import type { EquipmentFiltersProps } from "@/types/equipment/props";

export function EquipmentFilters({
  onSearchChange,
  branchFilter,
  onBranchFilterChange,
  brandFilter,
  onBrandFilterChange,
  statusFilter,
  onStatusFilterChange,
  riskFilter,
  onRiskFilterChange,
  branchOptions,
  brands,
  searchOptions,
}: EquipmentFiltersProps) {
  const field = "min-w-52 flex-1";
  return (
    <div className="flex w-full min-w-full flex-nowrap items-center gap-3 border-b border-app px-4 py-4">
        <div className={field}>
          <Combobox
            options={searchOptions}
            onQueryChange={onSearchChange}
            onSelect={(opt) => onSearchChange(opt?.label ?? "")}
            placeholder="Buscar nombre..."
            ariaLabel="Buscar equipo por nombre"
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
            placeholder="Todas las marcas"
            value={brandFilter}
            onChange={(e) => onBrandFilterChange(e.target.value)}
            options={brands.map((b) => ({
              value: String(b.id),
              label: b.name,
            }))}
          />
        </div>
        <div className={field}>
          <Select
            placeholder="Todos los estados"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
        <div className={field}>
          <Select
            placeholder="Todas las clases"
            value={riskFilter}
            onChange={(e) => onRiskFilterChange(e.target.value)}
            options={Object.entries(RISK_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
        </div>
    </div>
  );
}
