import { Combobox } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { NEW_BRAND_VALUE, NEW_MODEL_VALUE, RISK_LABEL } from "@/utils/equipment.utils";
import type { RiskClass } from "@/types/equipment/equipment";
import type { EquipmentClassificationSectionProps } from "@/types/equipment/props";

export function EquipmentClassificationSection({
  form,
  setForm,
  branchOptions,
  brands,
  brandOptions,
  models,
  modelsForForm,
  modelOptionsForm,
}: EquipmentClassificationSectionProps) {
  const brandSearchOptions = brandOptions.filter((o) => o.value !== NEW_BRAND_VALUE);
  const modelSearchOptions = modelOptionsForm.filter((o) => o.value !== NEW_MODEL_VALUE);
  const technologyOptions = [
    { value: "ELECTRONIC", label: "Electrónico" },
    { value: "ELECTROMEDICAL", label: "Electromédico" },
    { value: "MECHANICAL", label: "Mecánico" },
    { value: "MIXED", label: "Mixto" },
    { value: "OTHER", label: "Otro" },
  ];
  const riskOptions = Object.entries(RISK_LABEL).map(([value, label]) => ({
    value,
    label,
  }));
  const selectedBrand =
    brandSearchOptions.find((o) => o.value === String(form.brand)) ?? null;
  const selectedModel =
    modelSearchOptions.find((o) => o.value === String(form.equipment_model)) ??
    null;
  const selectedTechnology =
    technologyOptions.find((o) => o.value === form.technology_type) ?? null;
  const selectedRisk =
    riskOptions.find((o) => o.value === form.risk_class) ?? null;

  return (
    <>
          <div className="sm:col-span-2 mt-2">
            <h3 className="text-sm font-semibold text-app">
              Clasificación y catálogo
            </h3>
            <p className="text-xs text-app-muted">
              Catálogo, tecnología y clasificación biomédica
            </p>
          </div>
          <div className="sm:col-span-2">
            <Select
              label="Sede"
              className="px-4!"
              value={String(form.branch)}
              onChange={(e) =>
                setForm({ ...form, branch: Number(e.target.value) })
              }
              options={branchOptions}
              placeholder="Selecciona una sede"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-app">Marca</label>
            <Combobox
              options={brandSearchOptions}
              value={selectedBrand}
              onSelect={(opt) => {
                const brandId = opt ? Number(opt.value) : 0;
                const brandModels = models.filter(
                  (m) => m.brand === brandId && m.is_active,
                );
                setForm({
                  ...form,
                  brand: brandId,
                  equipment_model:
                    brandModels.length === 1 ? brandModels[0].id : 0,
                });
              }}
              placeholder="Busca una marca..."
              ariaLabel="Marca"
            />
            {brands.filter((b) => b.is_active || b.id === form.brand).length === 0 && (
              <p className="text-xs text-app-muted">
                Crea una marca primero en Catálogo.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-app">Modelo</label>
            <Combobox
              options={modelSearchOptions}
              value={selectedModel}
              onSelect={(opt) =>
                setForm({ ...form, equipment_model: opt ? Number(opt.value) : 0 })
              }
              placeholder={
                !form.brand
                  ? "Selecciona una marca primero"
                  : modelsForForm.filter(
                      (m) => m.is_active || m.id === form.equipment_model,
                    ).length === 0
                    ? "No hay modelos para esta marca"
                    : "Busca un modelo..."
              }
            disabled={!form.brand}
              ariaLabel="Modelo"
          />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-app">Tipo de tecnología</label>
            <Combobox
              options={technologyOptions}
              value={selectedTechnology}
              onSelect={(opt) =>
                setForm({ ...form, technology_type: opt?.value ?? "" })
              }
              placeholder="Busca un tipo..."
              ariaLabel="Tipo de tecnología"
            />
          </div>
          <Input
          label="Clasificación biomédica"
          value={form.biomedical_classification}
          onChange={(e) =>
            setForm({
              ...form,
              biomedical_classification: e.target.value,
            })
          }
          hint="Clasificación utilizada para el equipo."
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-app">Clase de riesgo</label>
            <Combobox
              options={riskOptions}
              value={selectedRisk}
              onSelect={(opt) =>
                setForm({
                  ...form,
                  risk_class: (opt?.value ?? "") as RiskClass,
                })
              }
              placeholder="Busca una clase..."
              ariaLabel="Clase de riesgo"
            />
            <p className="text-xs text-app-muted">
              Clasificación INVIMA / FDA del dispositivo médico.
            </p>
          </div>
    </>
  );
}
