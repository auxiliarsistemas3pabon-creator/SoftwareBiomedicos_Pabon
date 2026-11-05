import type { EquipmentSectionProps } from "@/types/equipment/props";

export function EquipmentObservationsSection({ form, setForm }: EquipmentSectionProps) {
  return (
    <>
          <div className="sm:col-span-2 mt-2">
            <h3 className="text-sm font-semibold text-app">
              Observaciones
            </h3>
          </div>
         
          <div className="sm:col-span-2">
            <textarea value={form.observations} onChange={(e) =>
              setForm({
                ...form,
                observations:e.target.value
              })
            }
            rows={4}
            placeholder="Observaciones adicionales del equipo..."
            className="w-full rounded-lg border border-app bg-app px-3 py-3 text-sm text-app outline-none transition placeholder:text-app-muted focus:border-primary focus:ring-primary/20 "
            />
          </div>
    </>
  );
}
