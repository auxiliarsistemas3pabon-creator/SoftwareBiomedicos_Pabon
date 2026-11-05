import { Input } from "@/components/ui/Input";
import type { EquipmentSectionProps } from "@/types/equipment/props";

export function EquipmentAcquisitionSection({ form, setForm }: EquipmentSectionProps) {
  return (
    <>
          <div className="sm:col-span-2 mt-2">
            <h3 className="text-sm font-semibold text-app">
              Adquisición
            </h3>
            <p className="text-xs text-app-muted">
              Información relacionada con la adquisición y puesta en funcionamiento.
            </p>
          </div>
           <Input
            label="Fecha de compra"
            type="date"
            value={form.purchase_date}
            onChange={(e) =>
              setForm({ ...form, purchase_date: e.target.value })
            }
            required
            className="sm:col-span-2"
          />
          <Input
          label="Fecha de fabricación"
          type="date"
          value={form.manufacture_date}
          onChange={(e) =>
            setForm({
              ...form,
              manufacture_date:e.target.value,
            })
          }
          />
        <Input
        label="Fecha inicio funcionamiento"
        type="date"
        value={form.start_use_date}
        onChange={(e) =>
          setForm({
            ...form,
            start_use_date: e.target.value,
          })
        }
        />
        <Input
        label="Proveedor de adquisición"
        value={form.supplier_acquisition}
        onChange={(e) =>
          setForm({
            ...form,
            supplier_acquisition:e.target.value,
          })
        }
        />
        <Input
        label="Costo del equipo"
        type="number"
        min="0"
        step="0.01"
        value={form.equipment_cost}
        onChange={(e) =>
          setForm({
            ...form,
            equipment_cost:e.target.value,
          })
        }
        />
    </>
  );
}
