export function SchedulingHeader({ role }: { role?: string }) {
  const title =
    role === "coordinador" || role === "ingeniero"
      ? "Solicitudes pendientes"
      : "Solicitudes";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-app">{title}</h1>
      </div>
    </div>
  );
}
