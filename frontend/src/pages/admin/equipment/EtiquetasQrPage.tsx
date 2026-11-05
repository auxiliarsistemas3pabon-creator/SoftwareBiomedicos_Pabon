import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { IconHint } from "@/components/ui/IconHint";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/context/AuthContext";
import { can } from "@/lib/permissions";
import { equipmentService } from "@/services/equipment.service";
import { branchesService } from "@/services/branches.service";
import { getApiErrorMessage } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import type { Equipment } from "@/types/equipment/equipment";
import type { Branch } from "@/types/equipment/branch";
import { startsWithLetter } from '../../../utils/equipment.names.utils';
import { Combobox } from "@/components/ui/Combobox";

const COLUMN_OPTIONS = [
  { value: "2", label: "2 por fila (grandes)" },
  { value: "3", label: "3 por fila" },
  { value: "4", label: "4 por fila (pequeñas)" },
];

// Cuántas etiquetas se muestran en pantalla por página (la selección y la
// impresión siguen abarcando todos los equipos, no solo la página visible).
const PAGE_SIZE = 20;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

function buildPrintHtml(items: Equipment[], columns: number): string {
  const labels = items
    .map((eq) => {
      const sede = [eq.branch_name, eq.location].filter(Boolean).join(" · ");
      const modelo = [eq.brand_name, eq.equipment_model_name]
        .filter(Boolean)
        .join(" ");
      const qrUrl = resolveMediaUrl(eq.qr_code_url);
      const qr = qrUrl
        ? `<img src="${escapeHtml(qrUrl)}" alt="QR ${escapeHtml(eq.asset_tag)}" />`
        : `<div class="noqr">Sin QR</div>`;
      return `
        <div class="label">
          <div class="qr">${qr}</div>
          <div class="meta">
            <p class="name">${escapeHtml(eq.name)}</p>
            <p class="tag">${escapeHtml(eq.asset_tag)}</p>
            ${modelo ? `<p class="sub">${escapeHtml(modelo)}</p>` : ""}
            ${sede ? `<p class="sub">${escapeHtml(sede)}</p>` : ""}
          </div>
        </div>`;
    })
    .join("");

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Etiquetas QR de equipos</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700&display=swap" rel="stylesheet" />
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  .sheet {
    display: grid;
    grid-template-columns: repeat(${columns}, 1fr);
    gap: 8px;
    padding: 10mm;
  }
  .label {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid #111;
    border-radius: 6px;
    padding: 8px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .qr { flex: 0 0 auto; }
  .qr img { display: block; width: ${columns >= 4 ? 70 : columns === 3 ? 90 : 120}px; height: auto; }
  .noqr {
    width: ${columns >= 4 ? 70 : columns === 3 ? 90 : 120}px; height: ${columns >= 4 ? 70 : columns === 3 ? 90 : 120}px;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; color: #999; border: 1px dashed #ccc;
  }
  .meta { min-width: 0; }
  .name { margin: 0; font-size: ${columns >= 4 ? 10 : 12}px; font-weight: 700; line-height: 1.2; }
  .tag { margin: 2px 0 0; font-size: ${columns >= 4 ? 12 : 15}px; font-weight: 700; }
  .sub { margin: 1px 0 0; font-size: ${columns >= 4 ? 8 : 9}px; color: #444; line-height: 1.2; }
  @page { margin: 8mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
  <div class="sheet">${labels}</div>
  <script>
    window.addEventListener("load", function () {
      setTimeout(function () { window.focus(); window.print(); }, 300);
    });
  </script>
</body>
</html>`;
}

export function printEquipmentLabels(items: Equipment[], columns: number): boolean {
  if (items.length === 0) return false;
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return false;
  win.document.write(buildPrintHtml(items, columns));
  win.document.close();
  return true;
}

export function EtiquetasQrPage() {
  const { usuario } = useAuth();
  const canRegenerate = can(usuario?.role, "equipment", "edit");

  const [items, setItems] = useState<Equipment[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameQuery, setNameQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [columns, setColumns] = useState("3");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async (opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setLoading(true);
    setError(null);
    try {
      // El filtro por sede es opcional: si el rol no puede listar sedes
      // (técnico), no se rompe la página.
      const [eq, brs] = await Promise.all([
        equipmentService.listAll({ ordering: "name" }),
        branchesService.list({ ordering: "name" }).catch(() => [] as Branch[]),
      ]);
      setBranches(brs);
      setItems((prev) => {
        if (opts.silent) {
          // Refresco en segundo plano: respetamos lo que el usuario deseleccionó
          // y marcamos por defecto los equipos nuevos (recién creados) para que
          // aparezcan listos para imprimir.
          const knownIds = new Set(prev.map((e) => e.id));
          const newIds = eq.filter((e) => !knownIds.has(e.id)).map((e) => e.id);
          if (newIds.length) {
            setSelected((sel) => new Set([...sel, ...newIds]));
            setNotice(
              `${newIds.length} equipo(s) nuevo(s) agregado(s) al panel.`,
            );
          }
        } else {
          setSelected(new Set(eq.map((e) => e.id)));
        }
        return eq;
      });
    } catch (err) {
      if (!opts.silent) {
        setError(getApiErrorMessage(err, "No se pudieron cargar los equipos"));
      }
    } finally {
      if (!opts.silent) setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  // Al volver a la pestaña, refrescamos en silencio: si se creó un equipo
  // en otra vista, su etiqueta QR aparece sin recargar la página.
  useEffect(() => {
    const onFocus = () => void load({ silent: true });
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  // Cada equipo es una opción: al escribir se filtran las coincidencias
  // (igual que marca y modelo), sin juntar los nombres repetidos.
  const nameOptions = useMemo(() => {
    return items
      .filter((eq) => !branchFilter || String(eq.branch) === branchFilter)
      .map((eq) => ({
        value: String(eq.id),
        label: eq.name,
        hint: eq.asset_tag,
      }))
      .sort(
        (a, b) =>
          a.label.localeCompare(b.label, "es") ||
          a.hint.localeCompare(b.hint, "es"),
      );
  }, [items, branchFilter]);

  const filtered = useMemo(() => {
    const query = nameQuery.trim();
    const list = items.filter((eq) => {
      if (branchFilter && String(eq.branch) !== branchFilter) return false;
      if (query && !startsWithLetter(eq.name, query)) return false;
      return true;
    });
    if (!query) return list;
    return list.sort(
      (a, b) =>
        (a.branch_name ?? "").localeCompare(b.branch_name ?? "", "es") ||
        a.asset_tag.localeCompare(b.asset_tag, "es"),
    );
  }, [items, branchFilter, nameQuery]);

  // Cuántas etiquetas tiene cada sede (para el título de cada grupo).
  const sedeCounts = useMemo(() => {
    const counts = new Map<number, number>();
    if (nameQuery.trim()) {
      for (const eq of filtered) counts.set(eq.branch, (counts.get(eq.branch) ?? 0) + 1);
    }
    return counts;
  }, [filtered, nameQuery]);

  // Volver a la página 1 cuando cambian los filtros.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [branchFilter, nameQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const paged = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((eq) => selected.has(eq.id));

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((eq) => next.delete(eq.id));
      else filtered.forEach((eq) => next.add(eq.id));
      return next;
    });
  };

  const regenerateAll = async () => {
    setRegenerating(true);
    setNotice(null);
    setError(null);
    try {
      const { regenerated } = await equipmentService.regenerateQrAll();
      await load();
      setNotice(`Se regeneraron ${regenerated} códigos QR.`);
    } catch (err) {
      setError(getApiErrorMessage(err, "No se pudieron regenerar los QR"));
    } finally {
      setRegenerating(false);
    }
  };

  const gridCols =
    columns === "2"
      ? "sm:grid-cols-2"
      : columns === "4"
        ? "sm:grid-cols-3 lg:grid-cols-4"
        : "sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className="mx-auto flex min-w-0 max-w-screen-2xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-app">Etiquetas QR</h1>
          <p className="text-sm text-app-muted">
            Genera e imprime los códigos QR de los equipos. Al escanearlos se
            abre la hoja de vida del equipo (previo inicio de sesión).
          </p>
        </div>
        <div className="flex flex-nowrap items-center gap-2">
          <IconHint label="Actualizar">
            <Button
              variant="secondary"
              className="h-8! w-8! px-0!"
              aria-label="Actualizar"
              onClick={() => void load({ silent: true })}
            >
              <RotateCw size={14} />
            </Button>
          </IconHint>
          {canRegenerate && (
            <IconHint label="Regenerar QR de todos">
              <Button
                variant="secondary"
                className="h-8! w-8! px-0!"
                aria-label="Regenerar QR de todos"
                loading={regenerating}
                onClick={() => void regenerateAll()}
              >
                <RefreshCw size={14} />
              </Button>
            </IconHint>
          )}
        </div>
      </div>

      {notice && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          {notice}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
        </div>
      )}

      <Card padding="none" className="min-w-0 overflow-x-clip">
        <div className="flex w-full min-w-0 flex-nowrap items-center gap-3 border-b border-app px-4 py-4">
          <div className="min-w-0 flex-1 basis-0">
            <Combobox
              options={nameOptions}
              onQueryChange={setNameQuery}
              onSelect={(opt) => setNameQuery(opt?.label ?? "")}
              placeholder="Escribe el nombre del equipo..."
              ariaLabel="Buscar equipo por nombre"
            />
          </div>
          <div className="min-w-0 flex-1 basis-0 overflow-hidden">
            <Select
              className="px-4!"
              placeholder="Todas las sedes"
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
            />
          </div>
          <div className="min-w-0 flex-1 basis-0 overflow-hidden">
            <Select
              className="px-4!"
              value={columns}
              onChange={(e) => setColumns(e.target.value)}
              options={COLUMN_OPTIONS}
            />
          </div>
          <Button
            variant="secondary"
            className="shrink-0 whitespace-nowrap px-4!"
            onClick={toggleAllFiltered}
          >
            {allFilteredSelected ? "Quitar selección" : "Seleccionar todos"}
          </Button>
        </div>

      {loading ? (
          <p className="py-10 text-center text-sm text-app-muted">Cargando...</p>
      ) : filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-app-muted">
            No hay equipos con los filtros actuales.
          </p>
      ) : (
        <div className={`grid grid-cols-1 gap-3 p-4 ${gridCols}`}>
          {paged.map((eq, idx) => {
            const isSelected = selected.has(eq.id);
            const startsSede =
              !!nameQuery.trim() && (idx === 0 || paged[idx - 1].branch !== eq.branch);
            return (
              <Fragment key={eq.id}>
              {startsSede && (
                <h2 className="col-span-full flex items-baseline gap-2 border-b border-app pb-1 pt-2 text-sm font-semibold text-app">
                  {eq.branch_name ?? `Sede #${eq.branch}`}{" "}
                  <span className="text-xs font-normal text-app-muted">
                    {sedeCounts.get(eq.branch)}{" "}
                    {sedeCounts.get(eq.branch) === 1 ? "etiqueta" : "etiquetas"}
                  </span>
                </h2>
              )}
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-app bg-surface hover:bg-app-muted/50"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isSelected}
                  onChange={() => toggle(eq.id)}
                />
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-app bg-white p-1">
                  {(() => {
                    const qrSrc = resolveMediaUrl(eq.qr_code_url);
                    return qrSrc ? (
                    <img
                      src={qrSrc}
                      alt={`QR ${eq.asset_tag}`}
                      className="h-full w-full object-contain"
                    />
                    ) : (
                    <span className="text-center text-[10px] text-app-muted">
                      Sin QR
                    </span>
                    );
                  })()}
                </div>
                <div className="min-w-0 flex-1 pr-2">
                  <p className="wrap-break-word text-sm font-semibold text-app">
                    {eq.name}
                  </p>
                  <p className="wrap-break-word font-mono text-sm font-bold text-app">
                    {eq.asset_tag}
                  </p>
                  <p className="wrap-break-word text-xs text-app-muted">
                    {[eq.branch_name, eq.location].filter(Boolean).join(" · ")}
                  </p>
                  <Link
                    to={`/admin/equipos/${eq.id}`}
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Ver hoja de vida
                  </Link>
                </div>
              </label>
              </Fragment>
            );
          })}
        </div>
      )}
        {filtered.length > 0 && !loading && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-app px-4 py-3 text-xs text-app-muted">
          <p>
            Mostrando {pageStart + 1}–{pageStart + paged.length} de{" "}
            {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="secondary"
              leftIcon={<ChevronLeft size={14} />}
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="px-2 text-app">
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="secondary"
              rightIcon={<ChevronRight size={14} />}
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </Button>
          </div>
        </div>
        )}
      </Card>
    </div>
  );
}
