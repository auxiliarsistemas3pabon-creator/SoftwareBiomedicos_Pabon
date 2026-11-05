import type { FailureSeverity, MaintenanceKind } from "@/types/dashboard/dashboard";
import type { EquipmentStatus } from "@/types/equipment/equipment";
import type { DateGrain, SolicitudesChartRow } from "@/types/dashboard/charts";

export const STATUS_LABEL: Record<EquipmentStatus, string> = {
  ACTIVE: "Operativo",
  IN_MAINTENANCE: "En mantenimiento",
  IN_REPAIR: "En reparación",
  INACTIVE: "Fuera de servicio",
};

export const STATUS_COLOR: Record<EquipmentStatus, string> = {
  ACTIVE: "#10b981",
  IN_MAINTENANCE: "#f59e0b",
  IN_REPAIR: "#ef4444",
  INACTIVE: "#94a3b8",
};

export const SEVERITY_LABEL: Record<FailureSeverity, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
  CRITICAL: "Crítica",
};


export const KIND_COLOR: Record<MaintenanceKind, string> = {
  PREVENTIVE: "#3b82f6",
  CORRECTIVE: "#f59e0b",
  REPAIR: "#ef4444",
  CALIBRATION: "#8b5cf6",
  INSPECTION: "#64748b",
};

const COP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatCost(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return COP.format(n);
}

export function formatHours(value: string | number | null | undefined): string {
  if (value == null || value === "") return "Sin datos";
  const hours = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(hours) || hours < 0) return "Sin datos";
  if (hours < 24) return `${hours.toFixed(1)} h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours - days * 24);
  return rem > 0 ? `${days} d ${rem} h` : `${days} d`;
}

export function formatWeekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
  });
}


export function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function inDateRange(iso: string, from: string, to: string): boolean {
  const d = dateKey(iso);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export function grainKey(iso: string, grain: DateGrain): string {
  const d = dateKey(iso);
  if (grain === "year") return d.slice(0, 4);
  if (grain === "month") return d.slice(0, 7);
  return d;
}

export function grainLabel(key: string, grain: DateGrain): string {
  if (grain === "year") return key;
  if (grain === "month") {
    const [y, m] = key.split("-").map(Number);
    if (!y || !m) return key;
    return new Date(y, m - 1, 1)
      .toLocaleString("es-CO", { month: "short", year: "2-digit" })
      .replace(/\./g, "");
  }
  const [y, mo, d] = key.split("-").map(Number);
  if (!y || !mo || !d) return key;
  return new Date(y, mo - 1, d).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
  });
}

export function MonthLabel({ month }: { month: string }): string {
  // "2026-05" → "May 26"
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return month;
  const d = new Date(y, m - 1, 1);
  return d
    .toLocaleString("es-CO", { month: "short", year: "2-digit" })
    .replace(/\./g, "");
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayIso(): string {
  return toIsoDate(new Date());
}

function periodKeys(from: string, to: string, grain: DateGrain): string[] {
  const start = from || "1970-01-01";
  const end = to || todayIso();
  if (start > end) return [];
  const keys: string[] = [];
  if (grain === "year") {
    let y = Number(start.slice(0, 4));
    const yEnd = Number(end.slice(0, 4));
    while (y <= yEnd) {
      keys.push(String(y));
      y += 1;
    }
    return keys;
  }
  if (grain === "month") {
    let y = Number(start.slice(0, 4));
    let m = Number(start.slice(5, 7));
    const yEnd = Number(end.slice(0, 4));
    const mEnd = Number(end.slice(5, 7));
    while (y < yEnd || (y === yEnd && m <= mEnd)) {
      keys.push(`${y}-${String(m).padStart(2, "0")}`);
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return keys;
  }
  const cursor = new Date(
    Number(start.slice(0, 4)),
    Number(start.slice(5, 7)) - 1,
    Number(start.slice(8, 10)),
  );
  const last = new Date(
    Number(end.slice(0, 4)),
    Number(end.slice(5, 7)) - 1,
    Number(end.slice(8, 10)),
  );
  while (cursor <= last) {
    keys.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

function orderedDateRange(from: string, to: string): { from: string; to: string } {
  const start = from || "1970-01-01";
  const end = to || todayIso();
  return start <= end ? { from: start, to: end } : { from: end, to: start };
}



export function buildCoordinatorChartData(
  series: { date: string; kind?: string }[],
  costs: { date: string; cost: string }[],
  from: string,
  to: string,
  grain: DateGrain,
): SolicitudesChartRow[] {
  const range =
    from && to ? orderedDateRange(from, to) : { from, to };
  const buckets = new Map<
    string,
    { Preventivo: number; Reparación: number; costo: number }
  >();
  if (range.from && range.to) {
    for (const key of periodKeys(range.from, range.to, grain)) {
      buckets.set(key, { Preventivo: 0, Reparación: 0, costo: 0 });
    }
  }
  const ensure = (key: string) => {
    let row = buckets.get(key);
    if (!row) {
      row = { Preventivo: 0, Reparación: 0, costo: 0 };
      buckets.set(key, row);
    }
    return row;
  };
  for (const p of series) {
    if (!inDateRange(p.date, range.from, range.to)) continue;
    const row = ensure(grainKey(p.date, grain));
    if (String(p.kind).toUpperCase() === "REPAIR") row.Reparación += 1;
    else row.Preventivo += 1;
  }
  for (const c of costs) {
    if (!inDateRange(c.date, range.from, range.to)) continue;
    const row = ensure(grainKey(c.date, grain));
    const n = Number(c.cost);
    if (Number.isFinite(n)) row.costo += n;
  }
  let rows = Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, row]) => ({
      key,
      label: grainLabel(key, grain),
      ...row,
    }));
  if (grain === "day" && rows.length > 45) {
    rows = rows.filter(
      (row) => row.Preventivo > 0 || row.Reparación > 0 || row.costo > 0,
    );
  }
  return rows;
}

export function buildAdministratorChartData(
  series: {date:string;kind?:string}[],
  costs: {date:string,cost?:string}[],
  from:string,
  to:string,
  grain:DateGrain
): SolicitudesChartRow[] {
  const range =
    from && to ? orderedDateRange(from,to) : {from,to};
  const buckets = new Map<
    string,
    {Preventivo: number; Reparación:number;costo:number}
    >();
    if (range.from && range.to) {
      for (const key of periodKeys(range.from,range.to,grain)) {
        buckets.set(key,{Preventivo:0,Reparación:0,costo:0});
      }
    }

    const ensure = (key:string) => {
      let row = buckets.get(key);
      if (!row) {
        row = {Preventivo:0,Reparación:0,costo:0};
        buckets.set(key,row);
      }
      return row;
    }
    for (const p of series) {
      if (!inDateRange(p.date, range.from,range.to)) continue;
      const row = ensure(grainKey(p.date,grain));
      if (String(p.kind).toUpperCase() === "REPAIR") row.Reparación +=1 
      else row.Preventivo += 1;
    }
    for (const c of costs) {
      if (!inDateRange(c.date,range.from,range.to)) continue;
      const row = ensure(grainKey(c.date,grain));
      const n = Number(c.cost);
      if (Number.isFinite(n)) row.costo += n;
    }
    let rows = Array.from(buckets.entries())
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([key,row]) => ({
        key,
        label:grainLabel(key,grain),
        ...row,
      }));

    if (grain === "day" && rows.length > 45) {
      rows = rows.filter(
        (row) => row.Preventivo > 0 || row.Reparación > 0 || row.costo > 0,
      )
    }
    return rows;
}
