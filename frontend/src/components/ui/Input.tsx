import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, className, id, type = "text", ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const isPassword = type === "password";
  const [show, setShow] = useState(false);
  const realType = isPassword && show ? "text" : type;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="text-sm font-medium text-app"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-app-muted">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          type={realType}
          className={cn(
            "w-full rounded-lg border bg-surface px-3 py-2.5 text-sm text-app outline-none transition",
            "placeholder:text-app-muted",
            "focus:border-primary focus:ring-2 focus:ring-primary/20",
            error
              ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
              : "border-app",
            leftIcon && "pl-10",
            isPassword && "pr-10",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute inset-y-0 right-3 flex items-center text-app-muted hover:text-app"
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="text-xs text-app-muted">{hint}</p>
      ) : null}
    </div>
  );
});
