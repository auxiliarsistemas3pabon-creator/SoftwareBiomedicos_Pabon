import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type RefreshControlProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { cn } from "@/lib/cn";

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  className?: string;
  contentClassName?: string;
  edges?: ("top" | "bottom" | "left" | "right")[];
  keyboardAvoiding?: boolean;
}

export function ScreenContainer({
  children,
  scroll = true,
  refreshControl,
  className,
  contentClassName,
  edges = ["top", "bottom", "left", "right"],
  keyboardAvoiding = false,
}: ScreenContainerProps) {
  const Body = scroll ? ScrollView : View;
  const bodyProps: any = scroll
    ? {
        contentContainerClassName: cn("p-4 gap-4", contentClassName),
        keyboardShouldPersistTaps: "handled",
        refreshControl,
      }
    : { className: cn("flex-1 p-4 gap-4", contentClassName) };

  const content = (
    <Body className={cn("flex-1", className)} {...bodyProps}>
      {children}
    </Body>
  );

  return (
    <SafeAreaView
      edges={edges}
      className="flex-1 bg-app-bg dark:bg-app-dark-bg"
    >
      {keyboardAvoiding ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
