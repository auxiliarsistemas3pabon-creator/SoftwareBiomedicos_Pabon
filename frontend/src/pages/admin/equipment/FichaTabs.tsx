import { CalendarClock, Wrench } from "lucide-react";
import type { FichaTabsProps } from "@/types/equipment/ficha";

export function FichaTabs({
  tab,
  setTab,
  canVerHistorial,
  canVerProgramados,
}: FichaTabsProps) {
  return (
    <div className="flex border-b border-app">
      <TabButton active={tab === "info"} onClick={() => setTab("info")}>
        Información
      </TabButton>
      {canVerHistorial && (
        <TabButton
          active={tab === "historial"}
          onClick={() => setTab("historial")}
        >
          <Wrench size={14} className="mr-1.5 inline" />
          Mantenimientos realizados
        </TabButton>
      )}
      {canVerProgramados && (
        <TabButton
          active={tab === "programados"}
          onClick={() => setTab("programados")}
        >
          <CalendarClock size={14} className="mr-1.5 inline" />
          Programados
        </TabButton>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
        active
          ? "border-primary text-primary"
          : "border-transparent text-app-muted hover:text-app"
      }`}
    >
      {children}
    </button>
  );
}
