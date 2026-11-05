import { Pressable, Text, View } from "react-native";
import { ArrowLeft, KeyRound, Mail } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { useTheme } from "@/context/ThemeContext";
import type { AuthStackScreenProps } from "@/navigation/types";

// El backend no tiene endpoint de recuperación por correo (ni envía nada):
// esta pantalla antes simulaba un envío falso ("recibirás un correo…") sin
// que llegara nada de verdad. Se reemplaza por el proceso real, igual que
// RegistroScreen: el restablecimiento lo hace un administrador desde el
// panel web (Admin → Usuarios → "Contraseña").
export function RecuperarPasswordScreen({
  navigation,
}: AuthStackScreenProps<"RecuperarPassword">) {
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

      <View className="items-center gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <KeyRound size={26} color={colors.primary} />
        </View>
        <Text className="text-center text-3xl font-bold text-app-text dark:text-app-dark-text">
          ¿Olvidaste tu contraseña?
        </Text>
        <Text className="text-center text-sm text-app-text-muted dark:text-app-dark-text-muted">
          El restablecimiento lo gestiona un administrador del sistema.
        </Text>
      </View>

      <Card>
        <Text className="text-sm leading-6 text-app-text dark:text-app-dark-text">
          Por seguridad, la app no envía enlaces de recuperación por correo.
          {"\n\n"}
          1. Contacta a un administrador (super administrador o
          administrador) de la clínica.{"\n"}
          2. Desde el panel web, entra a{" "}
          <Text className="font-semibold">Admin → Usuarios</Text>, busca tu
          cuenta y usa el botón{" "}
          <Text className="font-semibold">&ldquo;Contraseña&rdquo;</Text> para
          asignarte una nueva.{"\n"}
          3. Inicia sesión con esa contraseña y cámbiala desde{" "}
          <Text className="font-semibold">Mi perfil</Text>.
        </Text>
      </Card>

      <Pressable
        onPress={() =>
          navigation.goBack()
        }
        className="flex-row items-center justify-center gap-2 rounded-lg border border-app-border dark:border-app-dark-border py-3"
      >
        <Mail size={16} color={colors.textMuted} />
        <Text className="text-sm font-medium text-app-text dark:text-app-dark-text">
          Volver a iniciar sesión
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}
