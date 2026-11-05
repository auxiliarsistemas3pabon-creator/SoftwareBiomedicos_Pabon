import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import { ROLE_LABEL, ASSIGNABLE_ROLES } from "@/lib/permissions";
import type { UserFiltersProps } from "@/types/authentication/props";

export function UserFilters({
  setSearch,
  userOptions,
  roleFilter,
  setRoleFilter,
  activeFilter,
  setActiveFilter,
}: UserFiltersProps) {
  const field = "min-w-52 flex-1";
  return (
    <div className="mb-3 flex w-full min-w-full flex-nowrap items-center gap-3 border-b border-app px-4 pb-6 pt-4">
      <div className={field}>
        <Combobox
          options={userOptions}
          onQueryChange={setSearch}
          onSelect={(opt) => setSearch(opt?.label ?? "")}
          placeholder="Buscar usuario..."
          ariaLabel="Buscar usuario por nombre"
        />
      </div>
      <div className={field}>
        <Select
          placeholder="Todos los roles"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          options={ASSIGNABLE_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
        />
      </div>
      <div className={field}>
        <Select
          placeholder="Todos los estados"
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value)}
          options={[
            { value: "true", label: "Activo" },
            { value: "false", label: "Inactivo" },
          ]}
        />
      </div>
    </div>
  );
}
