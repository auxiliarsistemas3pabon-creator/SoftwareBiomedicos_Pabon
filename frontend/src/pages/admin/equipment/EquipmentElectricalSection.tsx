import { Input } from "@/components/ui/Input";
import type { EquipmentSectionProps } from "@/types/equipment/props";

export function EquipmentElectricalSection({ form, setForm }: EquipmentSectionProps) {
  return (
    <>
        <div className="sm:col-span-2 mt-2">
          <h3 className="text-sm font-semibold text-app">
            Seguridad eléctrica
          </h3>
        </div>
        <Input
        label="Clase de seguridad eléctrica"
        value={form.electrical_safety_class}
        onChange={(e) =>
          setForm({
            ...form,
            electrical_safety_class:e.target.value,
          })
        }
        />
        <Input
        label="Tipo de seguridad eléctrica"
        value={form.electrical_safety_type}
        onChange={(e) =>
          setForm({
            ...form,
            electrical_safety_type:e.target.value,
          })
        }
        />
    </>
  );
}
