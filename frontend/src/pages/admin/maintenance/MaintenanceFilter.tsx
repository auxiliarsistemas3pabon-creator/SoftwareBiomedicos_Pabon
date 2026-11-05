import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import { KIND_LABEL } from "@/utils/maintenance.utils";
import type { MaintenanceFilterProps } from "@/types/maintenance/props";

export function MaintenanceFilter({
  setSearch,
  setEquipmentFilter,
  equipmentOptions,
  searchOptions,
  kindFilter,
  setKindFilter,
}: MaintenanceFilterProps) {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-3">
      <Combobox
        options={searchOptions}
        onQueryChange={setSearch}
        onSelect={(opt) => setSearch(opt?.label ?? "")}
        placeholder="Buscar técnico..."
        ariaLabel="Buscar por técnico"
      />
      <Combobox
        placeholder="Buscar equipo..."
        ariaLabel="Filtrar por equipo"
        options={equipmentOptions}
        onQueryChange={setEquipmentFilter}
        onSelect={(opt) => setEquipmentFilter(opt?.label ?? "")}
      />
      <Select
        placeholder="Todos los tipos"
        value={kindFilter}
        onChange={(e) => setKindFilter(e.target.value)}
        options={Object.entries(KIND_LABEL).map(([value, label]) => ({
          value,
          label,
        }))}
      />
    </div>
  );
}
