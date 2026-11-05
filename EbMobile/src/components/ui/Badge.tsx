import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "primary";

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

const tones: Record<Tone, { bg: string; text: string }> = {
  neutral: {
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-200",
  },
  success: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  warning: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    text: "text-amber-700 dark:text-amber-300",
  },
  danger: {
    bg: "bg-red-100 dark:bg-red-900/40",
    text: "text-red-700 dark:text-red-300",
  },
  info: {
    bg: "bg-sky-100 dark:bg-sky-900/40",
    text: "text-sky-700 dark:text-sky-300",
  },
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
  },
};

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  const t = tones[tone];
  return (
    <View
      className={cn(
        "self-start rounded-full px-2.5 py-1",
        t.bg,
        className,
      )}
    >
      <Text className={cn("text-xs font-medium", t.text)}>
        {children as any}
      </Text>
    </View>
  );
}
