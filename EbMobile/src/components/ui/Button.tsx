import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  children?: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

const variantBg: Record<Variant, string> = {
  primary: "bg-primary active:bg-primary-dark",
  secondary:
    "bg-app-bg-muted dark:bg-app-dark-bg-muted border border-app-border dark:border-app-dark-border active:opacity-80",
  ghost: "bg-transparent active:bg-app-bg-muted dark:active:bg-app-dark-bg-muted",
  danger: "bg-red-600 active:bg-red-700",
};

const variantText: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-app-text dark:text-app-dark-text",
  ghost: "text-app-text dark:text-app-dark-text",
  danger: "text-white",
};

const sizeContainer: Record<Size, string> = {
  sm: "h-9 px-3",
  md: "h-11 px-4",
  lg: "h-12 px-6",
};

const sizeText: Record<Size, string> = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  leftIcon,
  rightIcon,
  fullWidth,
  className,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      className={cn(
        "flex-row items-center justify-center gap-2 rounded-lg",
        sizeContainer[size],
        variantBg[variant],
        fullWidth && "w-full",
        isDisabled && "opacity-60",
        className,
      )}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" || variant === "danger" ? "#fff" : "#d71920"} />
      ) : (
        leftIcon && <View>{leftIcon}</View>
      )}
      {children !== undefined && children !== null && (
        <Text className={cn("font-semibold", variantText[variant], sizeText[size])}>
          {children as any}
        </Text>
      )}
      {!loading && rightIcon && <View>{rightIcon}</View>}
    </Pressable>
  );
}
