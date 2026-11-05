import type { FailureHeaderProps } from "@/types/failure/props";

export function FailureHeader({ role, usuario }: FailureHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-app">
          Reportes de falla
        </h1>
        <p className="text-sm text-app-muted">
          {role === "tecnico"
            ? `Consultas el estado de los reportes que has generado${usuario?.area ? ` · ${usuario.area}` : ""}. Informa lo que observas; no registres diagnóstico ni reparación.`
            : role === "ingeniero"
              ? "Resuelve los reportes de falla. Cada resolución queda en el dashboard (abiertas vs resueltas)."
              : "Registra y resuelve fallas reportadas en los equipos biomédicos."}
        </p>
      </div>
    </div>
  );
}
