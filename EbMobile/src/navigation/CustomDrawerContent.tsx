import { Pressable, Text, View } from "react-native";
import {
  DrawerContentScrollView,
  type DrawerContentComponentProps,
} from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Building2,
  ClipboardCheck,
  FileText,
  Gauge,
  LogOut,
  Stethoscope,
  TriangleAlert,
  User,
  Users,
  Wrench,
} from "lucide-react-native";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ROLE_LABEL, can } from "@/lib/permissions";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/cn";
import { fullNameOf } from "@/lib/users";
import type { Rol } from "@/types/auth";
import type { AppDrawerParamList } from "./types";

interface NavItem {
  key: keyof AppDrawerParamList;
  label: string;
  icon: (color: string) => React.ReactNode;
  visible: (role: Rol | undefined) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "Dashboard",
    label: "Dashboard",
    icon: (c) => <Gauge size={18} color={c} />,
    visible: () => true,
  },
  {
    key: "Equipos",
    label: "Equipos",
    icon: (c) => <Stethoscope size={18} color={c} />,
    visible: (r) =>
      can(r, "equipment", "view") && r !== "tecnico" && r !== "usuario",
  },
  {
    key: "Mantenimientos",
    label: "Mantenimientos",
    icon: (c) => <Wrench size={18} color={c} />,
    // Registrar/editar el historial es exclusivo del superadmin. El resto
    // trabaja desde "Órdenes de trabajo".
    visible: (r) => r === "superadmin",
  },
  {
    key: "OrdenesTrabajo",
    label: "Órdenes de trabajo",
    icon: (c) => <FileText size={18} color={c} />,
    visible: (r) =>
      r === "superadmin" ||
      r === "admin" ||
      r === "coordinador" ||
      r === "ingeniero",
  },
  {
    key: "Agendamientos",
    label: "Solicitudes",
    icon: (c) => <ClipboardCheck size={18} color={c} />,
    visible: (r) => can(r, "scheduling", "view"),
  },
  {
    key: "Fallas",
    label: "Fallas",
    icon: (c) => <TriangleAlert size={18} color={c} />,
    visible: (r) => can(r, "failures", "view") && r !== "tecnico",
  },
  {
    key: "Sedes",
    label: "Sedes",
    icon: (c) => <Building2 size={18} color={c} />,
    visible: (r) => can(r, "branches", "view"),
  },
  {
    key: "Usuarios",
    label: "Usuarios",
    icon: (c) => <Users size={18} color={c} />,
    visible: (r) => can(r, "users", "view"),
  },
  {
    key: "Perfil",
    label: "Mi perfil",
    icon: (c) => <User size={18} color={c} />,
    visible: () => true,
  },
];

export function CustomDrawerContent(props: DrawerContentComponentProps) {
  const { usuario, logout } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const role = usuario?.role;
  const activeKey = props.state.routeNames[
    props.state.index
  ] as keyof AppDrawerParamList;

  const visibleItems = NAV_ITEMS.filter((it) => it.visible(role));

  return (
    <View className="flex-1 bg-app-surface dark:bg-app-dark-surface">
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: insets.top }}
      >
        {/* Cabecera */}
        <View className="flex-row items-center justify-between border-b border-app-border dark:border-app-dark-border px-4 py-5">
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-primary">
              <Text className="text-base font-bold text-white">
                {(usuario?.first_name?.[0] ?? usuario?.username?.[0] ?? "?").toUpperCase()}
              </Text>
            </View>
            <View className="flex-shrink">
              <Text
                className="text-sm font-semibold text-app-text dark:text-app-dark-text"
                numberOfLines={1}
              >
                {usuario ? fullNameOf(usuario) : "Invitado"}
              </Text>
              {usuario && (
                <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                  {ROLE_LABEL[usuario.role]}
                </Text>
              )}
            </View>
          </View>
          <ThemeToggle />
        </View>

        {/* Items */}
        <View className="px-2 py-3">
          {visibleItems.map((it) => {
            const isActive = it.key === activeKey;
            return (
              <Pressable
                key={it.key}
                onPress={() => props.navigation.navigate(it.key)}
                className={cn(
                  "flex-row items-center gap-3 rounded-lg px-3 py-2.5 my-0.5",
                  isActive
                    ? "bg-primary/10"
                    : "active:bg-app-bg-muted dark:active:bg-app-dark-bg-muted",
                )}
              >
                {it.icon(isActive ? colors.primary : colors.textMuted)}
                <Text
                  className={cn(
                    "text-sm font-medium",
                    isActive
                      ? "text-primary"
                      : "text-app-text dark:text-app-dark-text",
                  )}
                >
                  {it.key === "OrdenesTrabajo" && role === "ingeniero"
                    ? "Tareas asignadas"
                    : it.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </DrawerContentScrollView>

      {/* Logout */}
      <View
        className="border-t border-app-border dark:border-app-dark-border p-3"
        style={{ paddingBottom: 12 + insets.bottom }}
      >
        <Pressable
          onPress={logout}
          className="flex-row items-center gap-3 rounded-lg px-3 py-2.5 active:bg-app-bg-muted dark:active:bg-app-dark-bg-muted"
        >
          <LogOut size={18} color={colors.textMuted} />
          <Text className="text-sm font-medium text-app-text dark:text-app-dark-text">
            Cerrar sesión
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
