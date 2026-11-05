import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search, User as UserIcon, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { fullNameOf } from "@/lib/users";
import { ROLE_LABEL } from "@/lib/permissions";
import type { Usuario } from "@/types/authentication/auth";

interface Props {
  label?: string;
  value: number | null;
  onChange: (id: number | null, user?: Usuario) => void;
  technicians: Usuario[];
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  error?: string;
}

export function TechnicianSelect({
  label,
  value,
  onChange,
  technicians,
  required,
  disabled,
  placeholder = "Buscar técnico por nombre, usuario o correo...",
  hint,
  error,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => (value != null ? technicians.find((u) => u.id === value) ?? null : null),
    [value, technicians],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return technicians;
    return technicians.filter((u) => {
      const name = fullNameOf(u).toLowerCase();
      return (
        name.includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)
      );
    });
  }, [query, technicians]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  // Cierra al click fuera
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const choose = (u: Usuario) => {
    onChange(u.id, u);
    setOpen(false);
    setQuery("");
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const u = filtered[highlight];
      if (u) choose(u);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5" ref={wrapRef}>
      {label && (
        <label className="text-sm font-medium text-app">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      <div
        className={cn(
          "relative rounded-lg border bg-surface transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
          error ? "border-red-400" : "border-app",
          disabled && "opacity-60",
        )}
      >
        {selected && !open ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setOpen(true);
              setTimeout(() => inputRef.current?.focus(), 0);
            }}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-app"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserIcon size={12} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {fullNameOf(selected)}
                </span>
                <span className="block truncate text-xs text-app-muted">
                  @{selected.username}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-1">
              <span
                role="button"
                tabIndex={-1}
                onClick={(ev) => {
                  ev.stopPropagation();
                  clear();
                }}
                aria-label="Limpiar"
                className="inline-flex h-6 w-6 items-center justify-center rounded text-app-muted hover:bg-app-muted hover:text-app"
              >
                <X size={14} />
              </span>
              <ChevronDown size={14} className="text-app-muted" />
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-2 px-3">
            <Search size={14} className="text-app-muted" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              disabled={disabled}
              placeholder={placeholder}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={onKeyDown}
              className="w-full bg-transparent py-2.5 text-sm text-app outline-none placeholder:text-app-muted"
            />
            <ChevronDown
              size={14}
              className="text-app-muted"
              onClick={() => setOpen((o) => !o)}
            />
          </div>
        )}

        {open && (
          <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-app bg-surface shadow-lg">
            {filtered.length === 0 ? (
              <p className="p-3 text-center text-xs text-app-muted">
                Sin coincidencias.
              </p>
            ) : (
              filtered.map((u, i) => (
                <button
                  key={u.id}
                  type="button"
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => choose(u)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm",
                    i === highlight
                      ? "bg-primary/10 text-primary"
                      : "text-app hover:bg-app-muted",
                  )}
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <UserIcon size={12} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {fullNameOf(u)}
                    </span>
                    <span className="block truncate text-xs text-app-muted">
                      @{u.username} · {u.email}
                    </span>
                  </span>
                  <span className="rounded-full border border-app bg-app-muted px-2 py-0.5 text-xs uppercase tracking-wider text-app-muted">
                    {ROLE_LABEL[u.role]}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-app-muted">{hint}</p>
      ) : null}
    </div>
  );
}
