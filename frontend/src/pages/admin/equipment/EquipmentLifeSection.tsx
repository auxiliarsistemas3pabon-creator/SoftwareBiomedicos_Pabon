import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { STATUS_LABEL } from "@/utils/equipment.utils";
import type { EquipmentStatus } from "@/types/equipment/equipment";
import type { EquipmentSectionProps } from "@/types/equipment/props";

export function EquipmentLifeSection({ form, setForm }: EquipmentSectionProps) {
  return (
    <>
        <div className="sm:col-span-2 mt-2">
          <h3 className="text-sm font-semibold text-app">
            Vida útil
          </h3>
        </div>

        <Input
        label="Vida útil (años)"
        type="number"
        min="0"
        value={form.life_use_years}
        onChange={(e) =>
          setForm({
            ...form,
            life_use_years:e.target.value,
          })
        }
        />
        <Select
            label="Estado"
            value={form.status}
            onChange={(e) =>
              setForm({ ...form, status: e.target.value as EquipmentStatus })
            }
            options={Object.entries(STATUS_LABEL).map(([value, label]) => ({
              value,
              label,
            }))}
          />
    </>
  );
}
