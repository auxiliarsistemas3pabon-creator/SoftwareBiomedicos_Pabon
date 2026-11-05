import { AlertTriangle, CheckCheck, FileWarning, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { IconHint } from "@/components/ui/IconHint";
import type { FailureRowProps } from "@/types/failure/props";
import { SEV_LABEL, SEV_TONE } from "@/utils/failure.utils";

export function FailureRow({
  f,
  canEdit,
  canDelete,
  equipmentLabel,
  setResolveTarget,
  setResolveNotes,
  openEdit,
  setToDelete,
  canCreate,
  openCreate,
}: FailureRowProps) {
  const showActions = canCreate || canEdit || canDelete;
  return (
    <tr className="text-app">
      <td className="py-3 pl-4 pr-8 text-center">
        <div className="inline-flex items-center gap-2 text-left">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <AlertTriangle size={14} />
          </span>
          <div>
            <p className="font-medium">
              {f.equipment_asset_tag
                ? f.equipment_asset_tag
                : equipmentLabel(f.equipment)}
            </p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap py-3 pl-8 pr-8 text-center">
         {f.branch_name && (
              <p className="text-xs">{f.branch_name}</p>
            )}
      </td>
      <td className="whitespace-nowrap py-3 pl-8 pr-8 text-center">
         {f.equipment_area && (
              <p className="text-xs">{f.equipment_area}</p>
            )}
      </td>
      <td className="whitespace-nowrap py-3 pl-8 pr-8 text-center">
        <Badge tone={SEV_TONE[f.severity]}>
          {SEV_LABEL[f.severity]}
        </Badge>
      </td>
      <td className="whitespace-nowrap py-3 pl-8 pr-8 text-center text-app-muted">
        {new Date(f.reported_at).toLocaleString()}
      </td>
      <td className="whitespace-nowrap py-3 pl-8 pr-12 text-center">
        <Badge tone={f.resolved ? "warning" : "danger"}>
          {f.resolved ? "Resuelta" : "Abierta"}
        </Badge>
      </td>
      {showActions && (
      <td className="py-3 pl-12 pr-4 text-center">
        <div className="flex flex-nowrap items-center justify-center gap-2">
          {canCreate && (
            <IconHint label="Nuevo reporte">
              <Button
                size="sm"
                className="h-8! w-8! px-0!"
                aria-label="Nuevo reporte"
                onClick={openCreate}
              >
                <FileWarning size={14} />
              </Button>
            </IconHint>
          )}
          {canEdit && !f.resolved && (
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<CheckCheck size={14} />}
              onClick={() => {
                setResolveTarget(f);
                setResolveNotes("");
              }}
            >
              Resolver
            </Button>
          )}
          {canEdit && (
            <IconHint label="Editar">
              <Button
                size="sm"
                variant="secondary"
                className="h-8! w-8! px-0!"
                aria-label="Editar"
                onClick={() => openEdit(f)}
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
                onClick={() => setToDelete(f)}
              >
                <Trash2 size={14} />
              </Button>
            </IconHint>
          )}
        </div>
      </td>
      )}
    </tr>
  );
}
