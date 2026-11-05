import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { LogOut, Save } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ROLE_LABEL } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { usersService } from "@/services/users.service";
import { fullNameOf } from "@/lib/users";

export function PerfilScreen() {
  const { usuario, logout, refreshUser } = useAuth();
  const { colors } = useTheme();

  const [first_name, setFirstName] = useState(usuario?.first_name ?? "");
  const [last_name, setLastName] = useState(usuario?.last_name ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [phone, setPhone] = useState(usuario?.phone ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  if (!usuario) return null;

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      await usersService.update(usuario.id, {
        first_name,
        last_name,
        email,
        phone: phone || undefined,
      });
      await refreshUser();
      Alert.alert("Listo", "Perfil actualizado.");
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const changePassword = async () => {
    if (!newPassword) {
      Alert.alert("Error", "La nueva contraseña es requerida.");
      return;
    }
    setSavingPassword(true);
    try {
      await usersService.setPassword(usuario.id, {
        current_password: currentPassword || undefined,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("Listo", "Contraseña actualizada.");
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <ScreenContainer keyboardAvoiding contentClassName="gap-4">
      <Card>
        <View className="flex-row items-center gap-4">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-primary">
            <Text className="text-2xl font-bold text-white">
              {(usuario.first_name?.[0] ?? usuario.username[0]).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-app-text dark:text-app-dark-text">
              {fullNameOf(usuario)}
            </Text>
            <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
              @{usuario.username}
            </Text>
            <View className="mt-2">
              <Badge tone="primary">{ROLE_LABEL[usuario.role]}</Badge>
            </View>
          </View>
        </View>
      </Card>

      <Card>
        <Text className="mb-3 text-base font-semibold text-app-text dark:text-app-dark-text">
          Datos personales
        </Text>
        <View className="gap-3">
          <Input
            label="Nombres"
            value={first_name}
            onChangeText={setFirstName}
          />
          <Input label="Apellidos" value={last_name} onChangeText={setLastName} />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Teléfono"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Button
            onPress={saveProfile}
            loading={savingProfile}
            leftIcon={<Save size={16} color="#fff" />}
          >
            Guardar cambios
          </Button>
        </View>
      </Card>

      <Card>
        <Text className="mb-3 text-base font-semibold text-app-text dark:text-app-dark-text">
          Cambiar contraseña
        </Text>
        <View className="gap-3">
          <Input
            label="Contraseña actual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
          />
          <Input
            label="Nueva contraseña"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
          />
          <Button onPress={changePassword} loading={savingPassword}>
            Actualizar contraseña
          </Button>
        </View>
      </Card>

      <Button
        variant="secondary"
        onPress={logout}
        leftIcon={<LogOut size={16} color={colors.text} />}
      >
        Cerrar sesión
      </Button>
    </ScreenContainer>
  );
}
