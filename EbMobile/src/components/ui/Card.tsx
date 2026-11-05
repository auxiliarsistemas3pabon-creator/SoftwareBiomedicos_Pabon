import type { ReactNode } from "react";
import { View } from "react-native";
import { cn } from "@/lib/cn";

interface CardProps {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function Card({ children, className, padded = true }: CardProps) {
  return (
    <View
      className={cn(
        "rounded-xl border bg-app-surface dark:bg-app-dark-surface border-app-border dark:border-app-dark-border",
        padded && "p-4",
        className,
      )}
    >
      {children}
    </View>
  );
}
