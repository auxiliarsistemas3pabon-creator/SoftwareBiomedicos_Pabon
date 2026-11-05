import { ClipboardList, Eye, PackagePlus, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { IconHint } from "@/components/ui/IconHint";
import { StatusSelect } from "@/pages/admin/equipment/StatusSelect";
import { RISK_TONE, STATUS_LABEL, STATUS_TONE } from "@/utils/equipment.utils";
import type { EquipmentRowProps } from "@/types/equipment/props";

export function EquipmentRow({
  eq,
  brands,
  models,
  branchName,
  canEdit,
  canCreate,
  onCreate,
  canCreateMaintenance,
  statusUpdatingId,
  onSelect,
  onChangeStatus,
  onNewMaintenance,
}: EquipmentRowProps) {
  const brandText =
    eq.brand_name ??
    brands.find((b) => b.id === eq.brand)?.name ??
    brands.find(
      (b) =>
        b.id ===
        models.find((m) => m.id === eq.equipment_model)?.brand,
    )?.name ??
    "—";
  const modelText =
    eq.equipment_model_name ??
    models.find((m) => m.id === eq.equipment_model)?.name ??
    `#${eq.equipment_model}`;
  return (
    <tr className="text-app transition hover:bg-app-muted/50">
      <td className="px-4 py-3 pr-16">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList size={16} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{eq.name}</p>
            <p className="truncate text-xs text-app-muted">
              {brandText} · {modelText}
            </p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 pl-8 pr-16 text-center font-mono text-xs text-app-muted">
        {eq.asset_tag}
      </td>
      <td className="whitespace-nowrap px-4 py-3 pl-8 pr-16 text-left text-app-muted">
        <p>{eq.branch_name ?? branchName(eq.branch)}</p>
        <p className="text-xs">{eq.location}</p>
      </td>
      <td className="whitespace-nowrap py-3 pl-12 pr-14">
        {eq.risk_class && RISK_TONE[eq.risk_class] ? (
          <Badge tone={RISK_TONE[eq.risk_class]}>{eq.risk_class}</Badge>
        ) : (
          <span className="text-sm text-app-muted">Sin clase</span>
        )}
      </td>
      <td
        className="w-px whitespace-nowrap py-3 pl-10 pr-4 text-center"
        onClick={(ev) => ev.stopPropagation()}
      >
        {canEdit ? (
          <StatusSelect
            value={eq.status}
            disabled={statusUpdatingId === eq.id}
            onChange={(s) => onChangeStatus(eq, s)}
          />
        ) : (
          <Badge tone={STATUS_TONE[eq.status]}>
            {STATUS_LABEL[eq.status]}
          </Badge>
        )}
      </td>
      <td
        className="whitespace-nowrap px-4 py-3 pl-8"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-center gap-2">
          {canCreate && (
            <IconHint label="Registrar equipo">
              <Button
                size="sm"
                className="h-8! w-8! px-0!"
                aria-label="Registrar equipo"
                onClick={onCreate}
              >
                <PackagePlus size={14} />
              </Button>
            </IconHint>
          )}
          <IconHint label="Detalle">
            <Button
              size="sm"
              variant="secondary"
              className="h-8! w-8! px-0!"
              aria-label="Detalle"
              onClick={() => onSelect(eq)}
            >
              <Eye size={14} />
            </Button>
          </IconHint>
          {canCreateMaintenance && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<Wrench size={14} />}
              onClick={() => onNewMaintenance(eq)}
            >
              Nuevo mantenimiento
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
