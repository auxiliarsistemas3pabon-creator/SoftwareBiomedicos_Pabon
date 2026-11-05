import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { DrawerScreenProps } from "@react-navigation/drawer";
import type { CompositeScreenProps } from "@react-navigation/native";

export type AuthStackParamList = {
  Login: undefined;
  Registro: undefined;
  RecuperarPassword: undefined;
};

export type AppDrawerParamList = {
  Dashboard: undefined;
  Equipos: undefined;
  Mantenimientos: undefined;
  OrdenesTrabajo: undefined;
  Agendamientos: undefined;
  Fallas: undefined;
  Sedes: undefined;
  Usuarios: undefined;
  Perfil: undefined;
};

export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type AppDrawerScreenProps<T extends keyof AppDrawerParamList> =
  CompositeScreenProps<
    DrawerScreenProps<AppDrawerParamList, T>,
    NativeStackScreenProps<AuthStackParamList>
  >;
