import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/cn";

interface ListItemProps {
  title: string;
  subtitle?: string;
  meta?: string;
  trailing?: ReactNode;
  actions?: ReactNode;
  onPress?: () => void;
  className?: string;
}

export function ListItem({
  title,
  subtitle,
  meta,
  trailing,
  actions,
  onPress,
  className,
}: ListItemProps) {
  const { colors } = useTheme();

  const header = (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <View className="flex-1">
        <Text
          className="text-sm font-medium text-app-text dark:text-app-dark-text"
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            className="text-xs text-app-text-muted dark:text-app-dark-text-muted"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
        {meta && (
          <Text className="mt-0.5 text-[11px] text-app-text-muted dark:text-app-dark-text-muted">
            {meta}
          </Text>
        )}
      </View>
      {trailing}
      {onPress && <ChevronRight size={16} color={colors.textMuted} />}
    </View>
  );

  return (
    <View
      className={cn(
        "overflow-hidden rounded-lg border border-app-border dark:border-app-dark-border bg-app-surface dark:bg-app-dark-surface",
        className,
      )}
    >
      {onPress ? <Pressable onPress={onPress}>{header}</Pressable> : header}
      {actions && (
        <View className="flex-row gap-2 border-t border-app-border dark:border-app-dark-border bg-app-bg-muted/60 dark:bg-app-dark-bg-muted/60 px-3 py-2">
          {actions}
        </View>
      )}
    </View>
  );
}
