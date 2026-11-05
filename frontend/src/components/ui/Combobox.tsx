import { startsWithLetter } from "@/utils/equipment.names.utils";
import { X } from "lucide-react";
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

export interface ComboboxOption {value:string;label:string;hint?:string}
interface ComboboxProps {
    options:ComboboxOption[];
    /** Opcional: para precargar una selección ya hecha (p. ej. al editar).
     * Sin esta prop el componente sigue no-controlado, igual que antes. */
    value?: ComboboxOption | null;
    onSelect: (option: ComboboxOption | null) => void;
    /** Texto que se va escribiendo, para filtrar la lista de abajo. */
    onQueryChange?: (query: string) => void;
    placeholder?:string;
    ariaLabel?:string;
    autoFocus?:boolean;
    disabled?:boolean;
}

export function Combobox({options,value,onSelect,onQueryChange,placeholder,ariaLabel,autoFocus,disabled}:ComboboxProps) {
  const listId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  // Con autoFocus el campo queda listo para escribir, pero la lista solo se
  // abre al escribir o al pulsar la flecha abajo (no sola al cargar la página).
  const skipFocusOpen = useRef(!!autoFocus);
  const [query,setQuery] = useState("");
  const [open,setOpen] = useState(false);
  const [active,setActive] = useState(0);

  const [menuBox, setMenuBox] = useState<{ top: number; left: number; width: number } | null>(null);

  const shown = useMemo(() => {
    const q = query.trim();
    const list = q
      ? options.filter(
          (o) =>
            startsWithLetter(o.label, q) ||
            (o.hint ? startsWithLetter(o.hint, q) : false),
        )
      : options;
    return list.slice(0, 50);
  }, [options, query]);

  const placeMenu = () => {
    const input = boxRef.current?.querySelector("input");
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setMenuBox({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  useEffect(() => {
    const onDown = (e:MouseEvent) => {
        const target = e.target as Node;
        if (boxRef.current?.contains(target) || menuRef.current?.contains(target)) return;
        setOpen(false);
    }
    document.addEventListener("mousedown",onDown);
    return () => document.removeEventListener("mousedown",onDown);
  },[]);

  // Sincroniza el texto con `value` cuando lo controla el padre (p. ej. al
  // abrir "Editar" con una marca/modelo ya elegidos). Depende de los
  // primitivos, no del objeto, para no pisar lo que el usuario está
  // escribiendo cada vez que el padre re-renderiza con un `value` de igual
  // contenido pero distinta referencia.
  useEffect(() => {
    if (value === undefined) return;
    setQuery(value ? value.label : "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.value, value?.label]);

  // Mantiene visible la opción resaltada al navegar con las flechas.
  useEffect(() => {
    if (!open) return;
    placeMenu();
    const onMove = () => placeMenu();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [open, active, listId]);

  const choose = (o:ComboboxOption) => {
    setQuery(o.label);
    setOpen(false);
    onSelect(o);
  }
  
  const clear = () => {
    setQuery("");
    setOpen(false);
    onQueryChange?.("");
    onSelect(null);
  }

  const onKeyDown = (e:React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        setActive((i) => Math.min(i+1, shown.length -1));
    } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(i-1,0)); 
    } else if (e.key === "Enter" && open && shown[active]) {
        e.preventDefault();
        choose(shown[active]);
    } else if (e.key === "Escape") setOpen(false);
  }
  return (
    <div ref={boxRef} className="relative">
      <input
        role="combobox" aria-expanded={open} aria-controls={listId} aria-autocomplete="list"
        aria-activedescendant={open && shown[active] ? `${listId}-${active}` : undefined}
        aria-label={ariaLabel ?? placeholder} autoFocus={autoFocus} disabled={disabled}
        value={query} placeholder={placeholder} onKeyDown={onKeyDown}
        onFocus={() => { if (skipFocusOpen.current) { skipFocusOpen.current = false; return; } placeMenu(); setOpen(true); }}
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setActive(0);
          setOpen(true);
          onQueryChange?.(next);
          if (!next) onSelect(null);
        }}
        className="w-full rounded-lg border border-app bg-surface px-3 py-2.5 pr-9 text-sm text-app outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
        autoComplete="off"
      />
      {query && (
        <button type="button" onClick={clear} aria-label="Quitar selección" className="absolute inset-y-0 right-2 text-app-muted hover:text-app">
          <X size={16} />
        </button>
      )}
      {open && menuBox && createPortal(
        <ul
          ref={menuRef}
          id={listId}
          role="listbox"
          style={{ top: menuBox.top, left: menuBox.left, width: Math.max(menuBox.width, 256) }}
          className="fixed z-50 max-h-64 overflow-auto rounded-lg border border-app bg-surface py-1 shadow-lg"
        >
          {shown.length === 0 ? (
            <li className="bg-surface px-3 py-2 text-sm text-app-muted">Sin coincidencias</li>
          ) : shown.map((o, i) => (
            <li key={`${o.value}-${i}`} id={`${listId}-${i}`} role="option" aria-selected={i === active}
                onMouseDown={(e) => { e.preventDefault(); choose(o); }}
                className={`cursor-pointer whitespace-nowrap px-3 py-2 text-sm ${i === active ? "bg-primary/10" : "bg-surface"}`}>
              {o.label}{o.hint && <span className="ml-2 font-mono text-xs text-app-muted">{o.hint}</span>}
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  )
}
