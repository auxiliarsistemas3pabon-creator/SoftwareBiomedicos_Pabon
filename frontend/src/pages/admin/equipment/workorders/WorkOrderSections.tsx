import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { workOrdersService } from "@/services/workorders.service";
import { getApiErrorMessage } from "@/lib/api";
import type { WorkOrderDetail } from "@/types/equipment/workorder";
import type { FieldDef } from "@/types/equipment/workorder-sections";

function draftDefaults(fields: FieldDef[]): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const f of fields) {
    if (f.type === "select" && f.options?.[0]) {
      draft[f.name] = f.options[0].value;
    }
  }
  return draft;
}

export function ChildSection<T extends { id: number }>({
  title,
  rows,
  columns,
  renderRow,
  canEdit,
  fields,
  onAdd,
  onRemove,
  onChanged,
}: {
  title: string;
  rows: T[] | undefined;
  columns: string[];
  renderRow: (r: T) => (string | number)[];
  canEdit: boolean;
  fields: FieldDef[];
  onAdd: (data: Record<string, string>) => Promise<unknown>;
  onRemove: (id: number) => Promise<unknown>;
  onChanged: () => Promise<void>;
}) {
  const list = rows ?? [];
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const submitAdd = async () => {
    setBusy(true);
    try {
      await onAdd({ ...draftDefaults(fields), ...draft });
      setDraft({});
      setAdding(false);
      await onChanged();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo agregar"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    setBusy(true);
    try {
      await onRemove(id);
      await onChanged();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo eliminar"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-app">
          {title}{" "}
          <span className="font-normal text-app-muted">({list.length})</span>
        </h3>
        {canEdit && !adding && (
          <Button
            size="sm"
            variant="secondary"
            leftIcon={<Plus size={14} />}
            onClick={() => {
              setDraft(draftDefaults(fields));
              setAdding(true);
            }}
          >
            Agregar
          </Button>
        )}
      </div>

      {list.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-app">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-app bg-app-muted text-left text-xs text-app-muted [&>th]:px-3 [&>th]:py-2">
                {columns.map((c) => (
                  <th key={c}>{c}</th>
                ))}
                {canEdit && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {list.map((r) => (
                <tr key={r.id} className="text-app [&>td]:px-3 [&>td]:py-2">
                  {renderRow(r).map((cell, i) => (
                    <td key={i}>{cell}</td>
                  ))}
                  {canEdit && (
                    <td>
                      <button
                        type="button"
                        onClick={() => void remove(r.id)}
                        disabled={busy}
                        className="text-app-muted hover:text-red-600"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <div className="grid gap-2 rounded-lg border border-app bg-app-muted p-3 sm:grid-cols-2">
          {fields.map((f) =>
            f.type === "select" ? (
              <Select
                key={f.name}
                label={f.label}
                value={draft[f.name] ?? f.options?.[0]?.value ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, [f.name]: e.target.value })
                }
                options={f.options ?? []}
              />
            ) : (
              <Input
                key={f.name}
                label={f.label}
                type={f.type ?? "text"}
                value={draft[f.name] ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, [f.name]: e.target.value })
                }
              />
            ),
          )}
          <div className="flex items-end justify-end gap-2 sm:col-span-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setAdding(false);
                setDraft({});
              }}
            >
              Cancelar
            </Button>
            <Button size="sm" loading={busy} onClick={() => void submitAdd()}>
              Agregar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

export function CostSection({
  detail,
  canEdit,
  onChanged,
}: {
  detail: WorkOrderDetail;
  canEdit: boolean;
  onChanged: () => Promise<void>;
}) {
  const c = detail.cost;
  const sparePartsTotal = (detail.spare_parts ?? []).reduce(
    (sum, part) => sum + Number(part.total_cost || 0),
    0,
  );
  const [form, setForm] = useState({
    labor_cost: c?.labor_cost ?? "0",
    transport_cost: c?.transport_cost ?? "0",
    other_cost: c?.other_cost ?? "0",
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setForm({
      labor_cost: c?.labor_cost ?? "0",
      transport_cost: c?.transport_cost ?? "0",
      other_cost: c?.other_cost ?? "0",
    });
  }, [c?.id, c?.labor_cost, c?.transport_cost, c?.other_cost]);

  const total =
    Number(form.labor_cost || 0) +
    sparePartsTotal +
    Number(form.transport_cost || 0) +
    Number(form.other_cost || 0);

  const save = async () => {
    setBusy(true);
    try {
      const payload = {
        labor_cost: form.labor_cost,
        transport_cost: form.transport_cost,
        other_cost: form.other_cost,
      };
      if (c) {
        await workOrdersService.cost.update(c.id, payload);
      } else {
        await workOrdersService.cost.create({
          work_order: detail.id,
          ...payload,
        });
      }
      await onChanged();
    } catch (err) {
      alert(getApiErrorMessage(err, "No se pudo guardar el costo"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-app">Costos</h3>
      <div className="grid gap-2 rounded-lg border border-app bg-app-muted p-3 sm:grid-cols-4">
        <Input
          label="Mano de obra"
          type="number"
          step="0.01"
          value={form.labor_cost}
          onChange={(e) => setForm({ ...form, labor_cost: e.target.value })}
          disabled={!canEdit}
        />
        <Input
          label="Repuestos"
          type="number"
          step="0.01"
          value={sparePartsTotal.toFixed(2)}
          disabled
          hint="Suma automática de las líneas de repuestos."
        />
        <Input
          label="Transporte"
          type="number"
          step="0.01"
          value={form.transport_cost}
          onChange={(e) => setForm({ ...form, transport_cost: e.target.value })}
          disabled={!canEdit}
        />
        <Input
          label="Otros"
          type="number"
          step="0.01"
          value={form.other_cost}
          onChange={(e) => setForm({ ...form, other_cost: e.target.value })}
          disabled={!canEdit}
        />
        <div className="flex items-end text-sm sm:col-span-2">
          <span className="text-app-muted">Total:&nbsp;</span>
          <span className="font-semibold text-app">
            ${total.toLocaleString("es-CO", { minimumFractionDigits: 2 })}
          </span>
        </div>
        {canEdit && (
          <div className="flex items-end justify-end sm:col-span-2">
            <Button size="sm" loading={busy} onClick={() => void save()}>
              {c ? "Actualizar costos" : "Guardar costos"}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
