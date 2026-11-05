import { Pressable, Text, View } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/context/ThemeContext";
import type { AuthStackScreenProps } from "@/navigation/types";

export function RegistroScreen({ navigation }: AuthStackScreenProps<"Registro">) {
  const { colors } = useTheme();
  return (
    <ScreenContainer contentClassName="gap-6">
      <Pressable
        onPress={() => navigation.goBack()}
        className="flex-row items-center gap-1.5"
      >
        <ArrowLeft size={16} color={colors.textMuted} />
        <Text className="text-sm font-medium text-app-text-muted dark:text-app-dark-text-muted">
          Volver
        </Text>
      </Pressable>

      <View>
        <Text className="text-3xl font-bold text-app-text dark:text-app-dark-text">
          Solicitar registro
        </Text>
        <Text className="mt-1 text-sm text-app-text-muted dark:text-app-dark-text-muted">
          La creación de cuentas se gestiona internamente.
        </Text>
      </View>

      <Card>
        <Text className="text-sm leading-6 text-app-text dark:text-app-dark-text">
          Por seguridad institucional, las cuentas en el sistema de gestión
          de equipos biomédicos son creadas únicamente por el área
          administrativa de Clínica Pabón.{"\n\n"}
          Si necesitas acceso, comunícate con el coordinador de tu área o
          escribe a{" "}
          <Text className="font-semibold text-primary">
            sistemas@clinicapabon.co
          </Text>
          .
        </Text>
      </Card>
    </ScreenContainer>
  );
}
