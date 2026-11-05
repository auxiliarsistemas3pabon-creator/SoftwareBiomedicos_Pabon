import { Input } from "@/components/ui/Input";
import type { EquipmentSectionProps } from "@/types/equipment/props";

export function EquipmentIdentificationSection({ form, setForm }: EquipmentSectionProps) {
  return (
    <>
          <div className="sm:col-span-2">
            <h3 className="text-sm font-semibold text-app">
              Identificación del equipo
            </h3>
            <p className="text-xs text-app-muted">
              Información básica para identificar el equipo biomédico
            </p>
          </div>
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="sm:col-span-2"
          />
          <Input
            label="Asset tag"
            value={form.asset_tag}
            onChange={(e) => setForm({ ...form, asset_tag: e.target.value })}
            required
            hint="Código único del equipo (ej. EQ-0001)"
          />
          <Input 
          label="Código N.T."
          value={form.internal_code}
          onChange={(e) => 
            setForm({...form, internal_code:e.target.value})
          }
          hint="Código interno o número técnico."
          />
          <Input
          label="Serie"
          value={form.serial}
          onChange={(e) => 
            setForm({...form,serial:e.target.value})
          }
          />
          <Input
          label="Identificador Software"
          value={form.software_identifier}
          onChange={(e) =>
            setForm({
              ...form,
              software_identifier: e.target.value,
            })
          }
          />
    </>
  );
}
