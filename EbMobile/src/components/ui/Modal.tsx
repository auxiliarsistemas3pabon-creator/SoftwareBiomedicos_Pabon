import type { ReactNode } from "react";
import {
  Modal as RNModal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { X } from "lucide-react-native";
import { useTheme } from "@/context/ThemeContext";

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ visible, onClose, title, children, footer }: ModalProps) {
  const { colors } = useTheme();
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        className="flex-1 items-center justify-center bg-black/50 px-4"
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-2xl border bg-app-surface dark:bg-app-dark-surface border-app-border dark:border-app-dark-border"
        >
          {title && (
            <View className="flex-row items-center justify-between border-b border-app-border dark:border-app-dark-border px-5 py-4">
              <Text className="text-base font-semibold text-app-text dark:text-app-dark-text">
                {title}
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <X size={20} color={colors.textMuted} />
              </Pressable>
            </View>
          )}
          <ScrollView
            className="max-h-[70vh]"
            contentContainerClassName="px-5 py-4"
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
          {footer && (
            <View className="flex-row justify-end gap-2 border-t border-app-border dark:border-app-dark-border px-5 py-3">
              {footer}
            </View>
          )}
        </Pressable>
      </Pressable>
    </RNModal>
  );
}
