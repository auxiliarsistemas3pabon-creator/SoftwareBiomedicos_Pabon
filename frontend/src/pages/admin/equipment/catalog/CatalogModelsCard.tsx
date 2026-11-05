import { Layers, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconHint } from "@/components/ui/IconHint";
import { Card } from "@/components/ui/Card";
import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import type { CatalogModelsCardProps } from "@/types/equipment/catalog-props";
import { CatalogActiveSelect } from "@/pages/admin/equipment/catalog/CatalogActiveSelect";
import { CatalogPager } from "@/pages/admin/equipment/catalog/CatalogPager";
import { PAGE_SIZE } from "@/utils/catalog.utils";

export function CatalogModelsCard({
  modelNameFilter,
  setModelNameFilter,
  modelBrandFilter,
  setModelBrandFilter,
  brandOptions,
  modelStatusFilter,
  setModelStatusFilter,
  modelError,
  modelLoading,
  models,
  modelColSpan,
  canEdit,
  canDelete,
  togglingModelId,
  changeModelStatus,
  openCreateModel,
  openEditModel,
  setModelToDelete,
  modelCount,
  modelPage,
  loadModels,
  modelOptions,
}: CatalogModelsCardProps) {
  return (
    <Card padding="none">
      <div className="border-b border-app px-4 py-3">
        <p className="text-sm font-semibold text-app">Modelos</p>
      </div>
      {modelError && (
        <div
          role="alert"
          className="m-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {modelError}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="flex w-full min-w-full flex-nowrap items-center gap-3 border-b border-app px-4 py-4">
          <div className="min-w-52 flex-1">
            <Combobox
              options={modelOptions}
              onQueryChange={setModelNameFilter}
              onSelect={(opt) => setModelNameFilter(opt?.label ?? "")}
              placeholder="Nombre del modelo"
              ariaLabel="Buscar modelo"
            />
          </div>
          <div className="min-w-52 flex-1">
            <Select
              placeholder="Todas las marcas"
              value={modelBrandFilter}
              onChange={(e) => setModelBrandFilter(e.target.value)}
              options={brandOptions}
            />
          </div>
          <div className="min-w-52 flex-1">
            <Select
              placeholder="Todos los estados"
              value={modelStatusFilter}
              onChange={(e) => setModelStatusFilter(e.target.value)}
              options={[
                { value: "true", label: "Activo" },
                { value: "false", label: "Inactivo" },
              ]}
            />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
              <th className="whitespace-nowrap px-4 py-3 pr-20 font-medium">Marca</th>
              <th className="min-w-48 whitespace-nowrap px-4 py-3 pl-10 pr-16 font-medium">Modelo</th>
              <th className="w-px whitespace-nowrap py-3 pl-10 pr-12 text-center font-medium">Estado</th>
              {(canEdit || canDelete) && (
                <th className="whitespace-nowrap px-6 py-3 pl-12 text-center font-medium">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border)">
            {modelLoading ? (
              <tr>
                <td colSpan={modelColSpan} className="py-10 text-center text-app-muted">
                  Cargando...
                </td>
              </tr>
            ) : models.length === 0 ? (
              <tr>
                <td colSpan={modelColSpan} className="py-10 text-center text-app-muted">
                  No se encontraron modelos con los filtros actuales.
                </td>
              </tr>
            ) : (
              models.map((m) => (
                <tr key={m.id} className="text-app">
                  <td className="whitespace-nowrap px-4 py-3 pr-20 font-medium">
                    {m.brand_name ?? `Marca #${m.brand}`}
                  </td>
                  <td className="min-w-48 whitespace-nowrap px-4 py-3 pl-10 pr-16">
                    <p className="font-medium">{m.name}</p>
                    {m.equipment_count != null && (
                      <p className="text-xs text-app-muted">
                        {m.equipment_count} equipos asociados
                      </p>
                    )}
                  </td>
                  <td className="w-px whitespace-nowrap py-3 pl-10 pr-12 text-center">
                    {canEdit ? (
                      <CatalogActiveSelect
                        value={m.is_active}
                        disabled={togglingModelId === m.id}
                        activeLabel="Activo"
                        inactiveLabel="Inactivo"
                        onChange={(next) => void changeModelStatus(m, next)}
                      />
                    ) : m.is_active ? (
                      <Badge tone="success">Activo</Badge>
                    ) : (
                      <Badge tone="neutral">Inactivo</Badge>
                    )}
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="whitespace-nowrap px-6 py-3 pl-12">
                      <div className="flex flex-nowrap items-center justify-center gap-2">
                        {canEdit && (
                          <IconHint label="Nuevo modelo">
                            <Button
                              size="sm"
                              className="h-8! w-8! px-0!"
                              aria-label="Nuevo modelo"
                              onClick={openCreateModel}
                            >
                              <Layers size={14} />
                            </Button>
                          </IconHint>
                        )}
                        {canEdit && (
                          <IconHint label="Editar">
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-8! w-8! px-0!"
                              aria-label="Editar"
                              onClick={() => openEditModel(m)}
                            >
                              <Pencil size={14} />
                            </Button>
                          </IconHint>
                        )}
                        {canDelete && (
                          <IconHint label="Eliminar">
                            <Button
                              size="sm"
                              variant="danger"
                              className="h-8! w-8! px-0!"
                              aria-label="Eliminar"
                              onClick={() => setModelToDelete(m)}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </IconHint>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <CatalogPager
        count={modelCount}
        page={modelPage}
        pageSize={PAGE_SIZE}
        loading={modelLoading}
        onPrev={() => void loadModels(Math.max(1, modelPage - 1))}
        onNext={() =>
          void loadModels(
            Math.min(Math.max(1, Math.ceil(modelCount / PAGE_SIZE)), modelPage + 1),
          )
        }
      />
    </Card>
  );
}
