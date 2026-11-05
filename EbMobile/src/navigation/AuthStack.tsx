import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegistroScreen } from "@/screens/auth/RegistroScreen";
import { RecuperarPasswordScreen } from "@/screens/auth/RecuperarPasswordScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Registro" component={RegistroScreen} />
      <Stack.Screen
        name="RecuperarPassword"
        component={RecuperarPasswordScreen}
      />
    </Stack.Navigator>
  );
}
