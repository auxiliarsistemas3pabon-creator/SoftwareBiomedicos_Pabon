import { Text, View } from "react-native";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  destructive,
  loading,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      onClose={onCancel}
      title={title}
      footer={
        <View className="flex-row gap-2">
          <Button variant="secondary" onPress={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? "danger" : "primary"}
            onPress={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </View>
      }
    >
      {message && (
        <Text className="text-sm text-app-text-muted dark:text-app-dark-text-muted">
          {message}
        </Text>
      )}
    </Modal>
  );
}
