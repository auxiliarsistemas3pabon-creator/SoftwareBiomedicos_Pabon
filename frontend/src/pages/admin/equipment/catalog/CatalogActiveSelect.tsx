export function CatalogActiveSelect({
  value,
  disabled,
  activeLabel,
  inactiveLabel,
  onChange,
}: {
  value: boolean;
  disabled?: boolean;
  activeLabel: string;
  inactiveLabel: string;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!value)}
      aria-pressed={value}
      aria-label={value ? `Pasar a ${inactiveLabel}` : `Pasar a ${activeLabel}`}
      className={`inline-flex items-center gap-2 rounded-full border px-1 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
        value
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/40 dark:hover:border-emerald-800"
          : "border-app bg-app-muted text-app-muted hover:bg-app-muted/70 dark:hover:bg-white/10 dark:hover:text-app dark:hover:border-white/20"
      }`}
    >
      <span
        className={`relative inline-flex h-4 w-7 items-center rounded-full transition ${
          value ? "bg-emerald-500" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition ${
            value ? "translate-x-3.5" : "translate-x-0.5"
          }`}
        />
      </span>
      <span className="pr-2">{disabled ? "..." : value ? activeLabel : inactiveLabel}</span>
    </button>
  );
}
