import { forwardRef, useState, type ReactNode } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { useTheme } from "@/context/ThemeContext";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    error,
    hint,
    leftIcon,
    secureTextEntry,
    className,
    containerClassName,
    ...props
  },
  ref,
) {
  const { colors } = useTheme();
  const [show, setShow] = useState(false);
  const isPassword = !!secureTextEntry;
  const realSecure = isPassword && !show;

  return (
    <View className={cn("gap-1.5", containerClassName)}>
      {label && (
        <Text className="text-sm font-medium text-app-text dark:text-app-dark-text">
          {label}
        </Text>
      )}
      <View className="relative justify-center">
        {leftIcon && (
          <View className="absolute left-3 z-10">{leftIcon}</View>
        )}
        <TextInput
          ref={ref}
          secureTextEntry={realSecure}
          placeholderTextColor={colors.textMuted}
          className={cn(
            "h-11 rounded-lg border bg-app-surface dark:bg-app-dark-surface px-3 text-sm text-app-text dark:text-app-dark-text",
            error
              ? "border-red-400"
              : "border-app-border dark:border-app-dark-border",
            leftIcon && "pl-10",
            isPassword && "pr-10",
            className,
          )}
          {...props}
        />
        {isPassword && (
          <Pressable
            onPress={() => setShow((v) => !v)}
            hitSlop={8}
            className="absolute right-3"
          >
            {show ? (
              <EyeOff size={18} color={colors.textMuted} />
            ) : (
              <Eye size={18} color={colors.textMuted} />
            )}
          </Pressable>
        )}
      </View>
      {error ? (
        <Text className="text-xs text-red-600">{error}</Text>
      ) : hint ? (
        <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
