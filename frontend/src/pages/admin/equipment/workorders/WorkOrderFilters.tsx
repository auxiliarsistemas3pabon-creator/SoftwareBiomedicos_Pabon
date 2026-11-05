import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import type { WorkOrderFiltersProps } from "@/types/equipment/workorder-props";
import { STATUS_LABEL, TYPE_LABEL } from "@/utils/workorder.utils";

export function WorkOrderFilters({
  onSearchChange,
  orderOptions,
  equipmentSearchOptions,
  onEquipmentFilterChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
}: WorkOrderFiltersProps) {
  const field = "min-w-52 flex-1";
  return (
    <div className="flex w-full min-w-full flex-nowrap items-center gap-3 border-b border-app px-4 py-4">
      <div className={field}>
        <Combobox
          options={orderOptions}
          onQueryChange={onSearchChange}
          onSelect={(opt) => onSearchChange(opt?.label ?? "")}
          placeholder="Buscar orden..."
          ariaLabel="Buscar orden por nombre"
        />
      </div>
      <div className={field}>
        <Combobox
          options={equipmentSearchOptions}
          onQueryChange={onEquipmentFilterChange}
          onSelect={(opt) => onEquipmentFilterChange(opt?.label ?? "")}
          placeholder="Buscar equipo..."
          ariaLabel="Buscar orden por equipo"
        />
      </div>
      <div className={field}>
        <Select
          placeholder="Todo estado"
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
          placeholder="Todo tipo"
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
          options={Object.entries(TYPE_LABEL).map(([value, label]) => ({
            value,
            label,
          }))}
        />
      </div>
    </div>
  );
}
