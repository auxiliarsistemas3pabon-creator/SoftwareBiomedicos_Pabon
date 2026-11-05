import { Pressable, ScrollView, Text, View } from "react-native";
import { cn } from "@/lib/cn";

export interface TabItem<T extends string> {
  key: T;
  label: string;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  active: T;
  onChange: (key: T) => void;
}

export function Tabs<T extends string>({ items, active, onChange }: TabsProps<T>) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-1 px-1"
    >
      <View className="flex-row rounded-lg bg-app-bg-muted dark:bg-app-dark-bg-muted p-1">
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <Pressable
              key={it.key}
              onPress={() => onChange(it.key)}
              className={cn(
                "rounded-md px-3 py-1.5",
                isActive && "bg-app-surface dark:bg-app-dark-surface shadow-sm",
              )}
            >
              <Text
                className={cn(
                  "text-sm font-medium",
                  isActive
                    ? "text-app-text dark:text-app-dark-text"
                    : "text-app-text-muted dark:text-app-dark-text-muted",
                )}
              >
                {it.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}
