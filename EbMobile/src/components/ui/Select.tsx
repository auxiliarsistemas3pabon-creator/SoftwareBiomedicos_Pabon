import { useState } from "react";
import {
  FlatList,
  Modal as RNModal,
  Pressable,
  Text,
  View,
} from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { useTheme } from "@/context/ThemeContext";

export interface SelectOption<T extends string | number> {
  label: string;
  value: T;
}

interface SelectProps<T extends string | number> {
  label?: string;
  value?: T | null;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  placeholder = "Seleccionar…",
  error,
  disabled,
}: SelectProps<T>) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <View className="gap-1.5">
      {label && (
        <Text className="text-sm font-medium text-app-text dark:text-app-dark-text">
          {label}
        </Text>
      )}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        className={cn(
          "h-11 flex-row items-center justify-between rounded-lg border bg-app-surface dark:bg-app-dark-surface px-3",
          error
            ? "border-red-400"
            : "border-app-border dark:border-app-dark-border",
          disabled && "opacity-60",
        )}
      >
        <Text
          className={cn(
            "text-sm",
            current
              ? "text-app-text dark:text-app-dark-text"
              : "text-app-text-muted dark:text-app-dark-text-muted",
          )}
          numberOfLines={1}
        >
          {current?.label ?? placeholder}
        </Text>
        <ChevronDown size={16} color={colors.textMuted} />
      </Pressable>
      {error && <Text className="text-xs text-red-600">{error}</Text>}

      <RNModal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 items-center justify-center bg-black/50 px-4"
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border bg-app-surface dark:bg-app-dark-surface border-app-border dark:border-app-dark-border"
          >
            <View className="border-b border-app-border dark:border-app-dark-border px-4 py-3">
              <Text className="text-sm font-semibold text-app-text dark:text-app-dark-text">
                {label ?? "Seleccionar"}
              </Text>
            </View>
            <FlatList
              data={options}
              keyExtractor={(o) => String(o.value)}
              className="max-h-80"
              renderItem={({ item }) => {
                const selected = item.value === value;
                return (
                  <Pressable
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    className="flex-row items-center justify-between px-4 py-3 active:bg-app-bg-muted dark:active:bg-app-dark-bg-muted"
                  >
                    <Text className="text-sm text-app-text dark:text-app-dark-text">
                      {item.label}
                    </Text>
                    {selected && <Check size={16} color={colors.primary} />}
                  </Pressable>
                );
              }}
              ItemSeparatorComponent={() => (
                <View className="h-px bg-app-border dark:bg-app-dark-border" />
              )}
            />
          </Pressable>
        </Pressable>
      </RNModal>
    </View>
  );
}
