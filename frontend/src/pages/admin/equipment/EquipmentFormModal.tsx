import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EquipmentIdentificationSection } from "@/pages/admin/equipment/EquipmentIdentificationSection";
import { EquipmentClassificationSection } from "@/pages/admin/equipment/EquipmentClassificationSection";
import { EquipmentLocationSection } from "@/pages/admin/equipment/EquipmentLocationSection";
import { EquipmentAcquisitionSection } from "@/pages/admin/equipment/EquipmentAcquisitionSection";
import { EquipmentWarrantySection } from "@/pages/admin/equipment/EquipmentWarrantySection";
import { EquipmentMaintenanceSection } from "@/pages/admin/equipment/EquipmentMaintenanceSection";
import { EquipmentCalibrationSection } from "@/pages/admin/equipment/EquipmentCalibrationSection";
import { EquipmentElectricalSection } from "@/pages/admin/equipment/EquipmentElectricalSection";
import { EquipmentRegulatorySection } from "@/pages/admin/equipment/EquipmentRegulatorySection";
import { EquipmentLifeSection } from "@/pages/admin/equipment/EquipmentLifeSection";
import { EquipmentObservationsSection } from "@/pages/admin/equipment/EquipmentObservationsSection";
import type { EquipmentFormModalProps } from "@/types/equipment/props";

export function EquipmentFormModal({
  open,
  onClose,
  editing,
  formError,
  formErrorRef,
  onSubmit,
  saving,
  form,
  setForm,
  branchOptions,
  brands,
  brandOptions,
  models,
  modelsForForm,
  modelOptionsForm,
  openCatalogForm,
  onBack,
}: EquipmentFormModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Editar equipo" : "Nuevo equipo"}
      size="lg"
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
        {formError && (
          <div
            ref={formErrorRef}
            role="alert"
            className="sm:col-span-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {formError}
          </div>
        )}
        <EquipmentIdentificationSection form={form} setForm={setForm} />
        <EquipmentClassificationSection
          form={form}
          setForm={setForm}
          branchOptions={branchOptions}
          brands={brands}
          brandOptions={brandOptions}
          models={models}
          modelsForForm={modelsForForm}
          modelOptionsForm={modelOptionsForm}
          openCatalogForm={openCatalogForm}
        />
        <EquipmentLocationSection form={form} setForm={setForm} />
        <EquipmentAcquisitionSection form={form} setForm={setForm} />
        <EquipmentWarrantySection form={form} setForm={setForm} />
        <EquipmentMaintenanceSection form={form} setForm={setForm} />
        <EquipmentCalibrationSection form={form} setForm={setForm} />
        <EquipmentElectricalSection form={form} setForm={setForm} />
        <EquipmentRegulatorySection form={form} setForm={setForm} />
        <EquipmentLifeSection form={form} setForm={setForm} />
        <EquipmentObservationsSection form={form} setForm={setForm} />
        <div className="flex justify-end gap-2 sm:col-span-2">
          {onBack && (
            <Button variant="secondary" onClick={onBack} type="button">
              Regresar
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {editing ? "Guardar" : "Crear"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
