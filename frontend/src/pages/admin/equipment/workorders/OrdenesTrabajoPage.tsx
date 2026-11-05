import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { WorkOrderHeader } from "@/pages/admin/equipment/workorders/WorkOrderHeader";
import { WorkOrderFilters } from "@/pages/admin/equipment/workorders/WorkOrderFilters";
import { WorkOrderTable } from "@/pages/admin/equipment/workorders/WorkOrderTable";
import { WorkOrderPagination } from "@/pages/admin/equipment/workorders/WorkOrderPagination";
import { WorkOrderFormModal } from "@/pages/admin/equipment/workorders/WorkOrderFormModal";
import { WorkOrderDetailView } from "@/pages/admin/equipment/workorders/WorkOrderDetailView";
import { CompleteMaintenanceModal } from "@/pages/admin/equipment/workorders/CompleteMaintenanceModal";
import { useOrdenesTrabajo } from "@/pages/admin/equipment/workorders/useOrdenesTrabajo";

export function OrdenesTrabajoPage() {
  const {
    isEngineer,
    canCreate,
    canEdit,
    canDelete,
    items,
    count,
    page,
    equipmentError,
    loading,
    error,
    setSearch,
    orderOptions,
    equipmentSearchOptions,
    setEquipmentFilter,
    statusFilter,
    setStatusFilter,
    typeFilter,
    setTypeFilter,
    editing,
    creating,
    form,
    setForm,
    saving,
    toDelete,
    setToDelete,
    deleting,
    completing,
    setCompleting,
    completeObs,
    setCompleteObs,
    completeFailDesc,
    completeFailSev,
    setCompleteFailSev,
    completeSaving,
    completeStatus,
    setCompleteStatus,
    detail,
    setDetail,
    detailLoading,
    equipmentOptions,
    technicianOptions,
    load,
    openCreate,
    openEdit,
    closeModal,
    submit,
    confirmDelete,
    openComplete,
    maintenanceStatusOptions,
    submitComplete,
    openDetail,
    reloadDetail,
    totalPages,
    start,
    end,
  } = useOrdenesTrabajo();

  return (
    <div className="mx-auto flex max-w-screen-2xl flex-col gap-6">
      <WorkOrderHeader isEngineer={isEngineer} />

      <Card padding="none">
        {error && (
          <div
            role="alert"
            className="m-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
          >
            {error}
          </div>
        )}
        <div className="w-full min-w-0 overflow-x-auto">
        <WorkOrderFilters
          onSearchChange={setSearch}
          orderOptions={orderOptions}
          equipmentSearchOptions={equipmentSearchOptions}
          onEquipmentFilterChange={setEquipmentFilter}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
        />
        <WorkOrderTable
          items={items}
          loading={loading}
          isEngineer={isEngineer}
          canEdit={canEdit}
          canDelete={canDelete}
          onComplete={openComplete}
          onDetail={(w) => void openDetail(w)}
          onEdit={openEdit}
          onDelete={setToDelete}
          canCreate={canCreate}
          onCreate={openCreate}
        />
        </div>

        <WorkOrderPagination
          count={count}
          start={start}
          end={end}
          page={page}
          totalPages={totalPages}
          loading={loading}
          onPageChange={(targetPage) => void load(targetPage)}
        />
      </Card>

      <WorkOrderFormModal
        open={creating || !!editing}
        onClose={closeModal}
        editing={editing}
        form={form}
        setForm={setForm}
        onSubmit={submit}
        saving={saving}
        equipmentOptions={equipmentOptions}
        equipmentError={equipmentError}
        technicianOptions={technicianOptions}
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Eliminar orden de trabajo"
        description={`¿Eliminar la orden ${toDelete?.number}? Se borran también sus repuestos, mediciones, evidencias y firmas.`}
        confirmText="Eliminar"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Orden ${detail.number}` : ""}
        size="xl"
      >
        {detail && (
          <WorkOrderDetailView
            key={detail.id}
            detail={detail}
            loading={detailLoading}
            canEdit={canEdit && detail.status !== "FINISHED"}
            onChanged={reloadDetail}
            onRealizarMantenimiento={
              canEdit &&
              (detail.status === "PENDING" || detail.status === "IN_PROGRESS")
                ? () => {
                    const w = detail;
                    setDetail(null);
                    openComplete(w);
                  }
                : undefined
            }
          />
        )}
      </Modal>

      <CompleteMaintenanceModal
        completing={completing}
        onClose={() => setCompleting(null)}
        isEngineer={isEngineer}
        completeFailSev={completeFailSev}
        setCompleteFailSev={setCompleteFailSev}
        completeFailDesc={completeFailDesc}
        completeObs={completeObs}
        setCompleteObs={setCompleteObs}
        completeStatus={completeStatus}
        setCompleteStatus={setCompleteStatus}
        maintenanceStatusOptions={maintenanceStatusOptions}
        completeSaving={completeSaving}
        submitComplete={submitComplete}
      />
    </div>
  );
}
