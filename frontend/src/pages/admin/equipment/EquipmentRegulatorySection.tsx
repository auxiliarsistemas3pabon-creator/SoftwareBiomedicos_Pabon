import { Input } from "@/components/ui/Input";
import type { EquipmentSectionProps } from "@/types/equipment/props";

export function EquipmentRegulatorySection({ form, setForm }: EquipmentSectionProps) {
  return (
    <>
        <div className="sm:col-span-2 mt-2">
          <h3 className="text-sm font-semibold text-app">
            Información regulatoria
          </h3>
        </div>
        <Input
        label="Registro INVIMA"
        value={form.invima_registration}
        onChange={(e) =>
          setForm({
            ...form,
            invima_registration:e.target.value,
          })
        }
        />
        <Input
        label="ECRI"
        value={form.ecri}
        onChange={(e) =>
          setForm({
            ...form,
            ecri:e.target.value,
          })
        }
        />
    </>
  );
}
