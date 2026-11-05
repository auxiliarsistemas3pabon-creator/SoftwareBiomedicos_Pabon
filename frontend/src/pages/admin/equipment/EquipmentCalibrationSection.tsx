import { Input } from "@/components/ui/Input";
import type { EquipmentSectionProps } from "@/types/equipment/props";

export function EquipmentCalibrationSection({ form, setForm }: EquipmentSectionProps) {
  return (
    <>
        <div className="sm:col-span-2 mt-2">
          <h3 className="text-sm font-semibold text-app">
            Calibración
          </h3>
        </div>
        <Input
        label="Frecuencia de calibración (meses)"
        type="number"
        min="0"
        value={form.calibration_frequency_months}
        onChange={(e) =>
          setForm({
            ...form,
            calibration_frequency_months:e.target.value
          })
        }
        />
        <Input
        type="date"
        label="Última calibración"
        value={form.last_calibration}
        onChange={(e) => 
          setForm({
            ...form,
            last_calibration:e.target.value,
          })
        }
        />
        <Input
        type="date"
        label="Próxima Calibración"
        value={form.next_calibration}
        onChange={(e) =>
          setForm({
            ...form,
            next_calibration: e.target.value
          })
        }
        />
    </>
  );
}
