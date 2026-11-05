import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Lock, User as UserIcon } from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { getApiErrorMessage } from "@/lib/api";
import type { AuthStackScreenProps } from "@/navigation/types";

const features = [
  "Hojas de vida de cada equipo biomédico",
  "Mantenimientos preventivos y correctivos",
  "Reportes y trazabilidad en tiempo real",
  "Usuarios y roles dentro de la clínica",
];

export function LoginScreen({ navigation }: AuthStackScreenProps<"Login">) {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!username || !password) {
      setError("Ingresa usuario y contraseña.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login({ username, password });
      // El RootNavigator detecta isAuthenticated y monta el Drawer.
    } catch (err) {
      // Diagnóstico explícito desde el call site del login (complementa el
      // interceptor de api.ts y permite identificar el origen en la consola).
      // Solo se loguea el mensaje/status, nunca el error crudo: err.config.data
      // trae el body del request, que incluye la contraseña en texto plano,
      // y console.* no se elimina en builds de producción (queda en Logcat).
      console.warn(
        "[LOGIN] error:",
        err instanceof Error ? err.message : "error desconocido",
      );
      setError(getApiErrorMessage(err, "Credenciales inválidas"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer keyboardAvoiding contentClassName="gap-6 pb-12">
      {/* Header */}
      <View className="flex-row items-center justify-end">
        <ThemeToggle />
      </View>

      {/* Branding */}
      <View className="items-center gap-3 py-2">
        <View className="h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow">
          <Text className="text-2xl font-extrabold text-white">CP</Text>
        </View>
        <Text className="text-xl font-bold text-app-text dark:text-app-dark-text">
          Clínica Pabón
        </Text>
        <Text className="text-center text-sm text-app-text-muted dark:text-app-dark-text-muted">
          Gestión de Equipos Biomédicos
        </Text>
      </View>

      <View>
        <Text className="text-3xl font-bold text-app-text dark:text-app-dark-text">
          Bienvenido
        </Text>
        <Text className="mt-1 text-sm text-app-text-muted dark:text-app-dark-text-muted">
          Ingresa tus credenciales para acceder al sistema.
        </Text>
      </View>

      {error && (
        <View className="rounded-lg border border-red-300 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/40">
          <Text className="text-sm text-red-700 dark:text-red-300">{error}</Text>
        </View>
      )}

      <View className="gap-4">
        <Input
          label="Usuario"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="username"
          textContentType="username"
          placeholder="usuario"
          value={username}
          onChangeText={setUsername}
          leftIcon={<UserIcon size={16} color={colors.textMuted} />}
        />
        <Input
          label="Contraseña"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="password"
          textContentType="password"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          leftIcon={<Lock size={16} color={colors.textMuted} />}
        />
        <Button onPress={onSubmit} loading={loading} fullWidth size="lg">
          {loading ? "Ingresando…" : "Iniciar sesión"}
        </Button>
      </View>

      <View className="gap-2">
        <Pressable onPress={() => navigation.navigate("RecuperarPassword")}>
          <Text className="text-sm font-medium text-primary">
            ¿Olvidaste tu contraseña?
          </Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("Registro")}>
          <Text className="text-sm font-medium text-primary">
            ¿No tienes cuenta? Solicitar registro
          </Text>
        </Pressable>
      </View>

      <View className="mt-2 gap-2 rounded-xl border border-app-border dark:border-app-dark-border bg-app-bg-muted dark:bg-app-dark-bg-muted p-4">
        <Text className="text-xs font-semibold uppercase text-app-text-muted dark:text-app-dark-text-muted">
          Plataforma interna
        </Text>
        {features.map((f) => (
          <Text key={f} className="text-sm text-app-text dark:text-app-dark-text">
            ✓ {f}
          </Text>
        ))}
      </View>
    </ScreenContainer>
  );
}
