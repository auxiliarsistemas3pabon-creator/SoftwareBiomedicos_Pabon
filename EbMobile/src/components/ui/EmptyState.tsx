import type { ReactNode } from "react";
import { Text, View } from "react-native";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <View className="items-center justify-center gap-2 py-12">
      {icon && <View className="mb-2">{icon}</View>}
      <Text className="text-base font-semibold text-app-text dark:text-app-dark-text">
        {title}
      </Text>
      {description && (
        <Text className="text-center text-sm text-app-text-muted dark:text-app-dark-text-muted">
          {description}
        </Text>
      )}
      {action && <View className="mt-2">{action}</View>}
    </View>
  );
}
