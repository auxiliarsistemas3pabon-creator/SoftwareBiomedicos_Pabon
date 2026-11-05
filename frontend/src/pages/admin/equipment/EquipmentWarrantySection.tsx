import { Input } from "@/components/ui/Input";
import type { EquipmentSectionProps } from "@/types/equipment/props";

export function EquipmentWarrantySection({ form, setForm }: EquipmentSectionProps) {
  return (
    <>
        <div className="sm:col-span-2 mt-2">
          <h3 className="text-sm font-semibold text-app">
            Garantía
          </h3>
        </div>

        <Input
        label="Inicio de garantía"
        type="date"
        value={form.warranty_start_date}
        onChange={(e) => 
          setForm({
            ...form,
            warranty_start_date: e.target.value,
          })
        }
        />
        <Input
        label="Finalización de garantía"
        type="date"
        value={form.warranty_end_date}
        onChange={(e) =>
          setForm({
            ...form,
            warranty_end_date: e.target.value,
          })
        }
        />
    </>
  );
}
