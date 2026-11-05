import { Boxes, Pencil, Tag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconHint } from "@/components/ui/IconHint";
import { Card } from "@/components/ui/Card";
import { Combobox } from "@/components/ui/Combobox";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import type { CatalogBrandsCardProps } from "@/types/equipment/catalog-props";
import { CatalogActiveSelect } from "@/pages/admin/equipment/catalog/CatalogActiveSelect";
import { CatalogPager } from "@/pages/admin/equipment/catalog/CatalogPager";
import { PAGE_SIZE } from "@/utils/catalog.utils";

export function CatalogBrandsCard({
  brandNameFilter,
  setBrandNameFilter,
  brandStatusFilter,
  setBrandStatusFilter,
  brandError,
  brandLoading,
  brands,
  brandColSpan,
  canEdit,
  canDelete,
  togglingBrandId,
  changeBrandStatus,
  openCreateBrand,
  openEditBrand,
  setBrandToDelete,
  brandCount,
  brandPage,
  loadBrands,
  brandOptions,
}: CatalogBrandsCardProps) {
  return (
    <Card padding="none">
      <div className="border-b border-app px-4 py-3">
        <p className="text-sm font-semibold text-app">Marcas</p>
      </div>
      {brandError && (
        <div
          role="alert"
          className="m-3 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {brandError}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="flex w-full min-w-full flex-nowrap items-center gap-3 border-b border-app px-4 py-4">
          <div className="min-w-52 flex-1">
            <Combobox
              options={brandOptions}
              onQueryChange={setBrandNameFilter}
              onSelect={(opt) => setBrandNameFilter(opt?.label ?? "")}
              placeholder="Nombre de la marca"
              ariaLabel="Buscar marca"
            />
          </div>
          <div className="min-w-52 flex-1">
            <Select
              placeholder="Todos los estados"
              value={brandStatusFilter}
              onChange={(e) => setBrandStatusFilter(e.target.value)}
              options={[
                { value: "true", label: "Activa" },
                { value: "false", label: "Inactiva" },
              ]}
            />
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app text-left text-xs uppercase tracking-wider text-app-muted">
              <th className="whitespace-nowrap px-4 py-3 pr-20 font-medium">Marca</th>
              <th className="w-px whitespace-nowrap py-3 pl-10 pr-12 text-center font-medium">Estado</th>
              {(canEdit || canDelete) && (
                <th className="whitespace-nowrap px-6 py-3 pl-12 text-center font-medium">Acciones</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border)">
            {brandLoading ? (
              <tr>
                <td colSpan={brandColSpan} className="py-10 text-center text-app-muted">
                  Cargando...
                </td>
              </tr>
            ) : brands.length === 0 ? (
              <tr>
                <td colSpan={brandColSpan} className="py-10 text-center text-app-muted">
                  <div className="flex flex-col items-center gap-2">
                    <Boxes size={28} className="opacity-50" />
                    <p>No se encontraron marcas con los filtros actuales.</p>
                  </div>
                </td>
              </tr>
            ) : (
              brands.map((b) => (
                <tr key={b.id} className="text-app">
                  <td className="whitespace-nowrap px-4 py-3 pr-20">
                    <p className="whitespace-nowrap font-medium">{b.name}</p>
                    {b.models_count != null && (
                      <p className="text-xs text-app-muted">
                        {b.models_count} modelos
                      </p>
                    )}
                  </td>
                  <td className="w-px whitespace-nowrap py-3 pl-10 pr-12 text-center">
                    {canEdit ? (
                      <CatalogActiveSelect
                        value={b.is_active}
                        disabled={togglingBrandId === b.id}
                        activeLabel="Activa"
                        inactiveLabel="Inactiva"
                        onChange={(next) => void changeBrandStatus(b, next)}
                      />
                    ) : b.is_active ? (
                      <Badge tone="success">Activa</Badge>
                    ) : (
                      <Badge tone="neutral">Inactiva</Badge>
                    )}
                  </td>
                  {(canEdit || canDelete) && (
                    <td className="whitespace-nowrap px-6 py-3 pl-12">
                      <div className="flex flex-nowrap items-center justify-center gap-2">
                        {canEdit && (
                          <IconHint label="Nueva marca">
                            <Button
                              size="sm"
                              className="h-8! w-8! px-0!"
                              aria-label="Nueva marca"
                              onClick={openCreateBrand}
                            >
                              <Tag size={14} />
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
                              onClick={() => openEditBrand(b)}
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
                              onClick={() => setBrandToDelete(b)}
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
        count={brandCount}
        page={brandPage}
        pageSize={PAGE_SIZE}
        loading={brandLoading}
        onPrev={() => void loadBrands(Math.max(1, brandPage - 1))}
        onNext={() =>
          void loadBrands(
            Math.min(Math.max(1, Math.ceil(brandCount / PAGE_SIZE)), brandPage + 1),
          )
        }
      />
    </Card>
  );
}
