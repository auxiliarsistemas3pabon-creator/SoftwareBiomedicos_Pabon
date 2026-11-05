import { Input } from "@/components/ui/Input";
import type { EquipmentSectionProps } from "@/types/equipment/props";

export function EquipmentMaintenanceSection({ form, setForm }: EquipmentSectionProps) {
  return (
    <>
        <div className="sm:col-span-2 mt-2">
          <h3 className="text-sm font-semibold text-app">
            Mantenimiento
          </h3>
          <p className="text-xs text-app-muted">
            Configuración y seguimiento del mantenimiento
          </p>
        </div>
        <Input
        label="Proveedor de mantenimiento"
        value={form.maintenance_provider}
        onChange={(e) =>
          setForm({
            ...form,
            maintenance_provider:e.target.value
          })
        }
        />
        <Input
        label="Frecuencia de mantenimiento (meses)"
        type="number"
        min="0"
        value={form.maintenance_frequency_months}
        onChange={(e) =>
          setForm({
            ...form,
            maintenance_frequency_months:e.target.value
          })
        }
        />
        <Input
        type="date"
        label="Último preventivo"
        value={form.last_preventive}
        onChange={(e) =>
            setForm({
              ...form,
              last_preventive:e.target.value
            })
        }
        />
        <Input
        type="date"
        label="Próximo preventivo"
        value={form.next_preventive}
        onChange={(e) =>
          setForm({
            ...form,
            next_preventive:e.target.value,
          })
        }
        />
    </>
  );
}
