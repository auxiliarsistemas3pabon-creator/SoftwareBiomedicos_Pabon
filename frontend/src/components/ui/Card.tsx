import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddings = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({ children, padding = "md", className, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={cn(
        "rounded-xl",
        paddings[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", compact ? "mb-2" : "mb-4")}>
      <div>
        <h3 className={cn("font-semibold text-app", compact ? "text-sm" : "text-base")}>
          {title}
        </h3>
        {subtitle && <p className="mt-0.5 text-xs text-app-muted sm:text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
