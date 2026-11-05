import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { Pencil, Plus, Trash2, Users } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ListItem } from "@/components/ui/ListItem";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ROLE_LABEL, ASSIGNABLE_ROLES, can, canAssignRole } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { usersService } from "@/services/users.service";
import type { Usuario, Rol } from "@/types/auth";
import type { CreateUserInput, UpdateUserInput } from "@/types/user";

export function UsuariosScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const myRole = usuario?.role;
  const canCreate = can(myRole, "users", "create");
  const canEdit = can(myRole, "users", "edit");
  const canDelete = can(myRole, "users", "delete");

  const [items, setItems] = useState<Usuario[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Usuario | "new" | null>(null);
  const [form, setForm] = useState<CreateForm>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Usuario | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await usersService.list({ ordering: "username" });
      setItems(data);
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const ROLE_OPTS: SelectOption<Rol>[] = ASSIGNABLE_ROLES.filter((r) =>
    canAssignRole(myRole, r),
  ).map((r) => ({ label: ROLE_LABEL[r], value: r }));

  const openNew = () => {
    setForm(emptyForm());
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (u: Usuario) => {
    setForm({
      username: u.username,
      email: u.email,
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      phone: u.phone ?? "",
      password: "",
      is_active: u.is_active,
    });
    setFormError(null);
    setEditing(u);
  };

  const submit = async () => {
    if (!form.username || !form.email || !form.first_name || !form.last_name) {
      setFormError("Completa los campos requeridos.");
      return;
    }
    if (editing === "new" && !form.password) {
      setFormError("La contraseña es requerida.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") {
        const payload: CreateUserInput = {
          username: form.username,
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          phone: form.phone || undefined,
          password: form.password,
        };
        await usersService.create(payload);
      } else if (editing) {
        const payload: UpdateUserInput = {
          username: form.username,
          email: form.email,
          first_name: form.first_name,
          last_name: form.last_name,
          role: form.role,
          phone: form.phone || undefined,
          is_active: form.is_active,
        };
        await usersService.update(editing.id, payload);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await usersService.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ScreenContainer scroll={false} contentClassName="gap-3">
      <View className="gap-3 px-4 pt-4">
        {canCreate && (
          <Button
            onPress={openNew}
            leftIcon={<Plus size={16} color="#fff" />}
            fullWidth
          >
            Nuevo usuario
          </Button>
        )}
      </View>

      <FlatList
        className="flex-1"
        contentContainerClassName="px-4 pb-6 gap-2"
        data={items}
        keyExtractor={(it) => String(it.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={28} color={colors.textMuted} />}
            title="Sin usuarios"
          />
        }
        renderItem={({ item }) => {
          const editable = canEdit && canAssignRole(myRole, item.role);
          const deletable =
            canDelete && canAssignRole(myRole, item.role) && item.id !== usuario?.id;
          const hasActions = editable || deletable;
          return (
            <ListItem
              title={
                `${item.first_name} ${item.last_name}`.trim() || item.username
              }
              subtitle={`${item.username} · ${item.email}`}
              meta={ROLE_LABEL[item.role]}
              trailing={
                <Badge tone={item.is_active ? "success" : "neutral"}>
                  {item.is_active ? "Activo" : "Inactivo"}
                </Badge>
              }
              actions={
                hasActions ? (
                  <>
                    {editable && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onPress={() => openEdit(item)}
                        leftIcon={<Pencil size={14} color={colors.text} />}
                        className="flex-1"
                      >
                        Editar
                      </Button>
                    )}
                    {deletable && (
                      <Button
                        variant="danger"
                        size="sm"
                        onPress={() => setToDelete(item)}
                        leftIcon={<Trash2 size={14} color="#fff" />}
                        className="flex-1"
                      >
                        Eliminar
                      </Button>
                    )}
                  </>
                ) : undefined
              }
            />
          );
        }}
      />

      <Modal
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nuevo usuario" : "Editar usuario"}
        footer={
          <>
            <Button variant="secondary" onPress={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onPress={submit} loading={saving}>
              Guardar
            </Button>
          </>
        }
      >
        <View className="gap-3">
          {formError && (
            <Text className="text-sm text-red-600">{formError}</Text>
          )}
          <Input
            label="Usuario *"
            value={form.username}
            onChangeText={(v) => setForm({ ...form, username: v })}
            autoCapitalize="none"
          />
          <Input
            label="Email *"
            value={form.email}
            onChangeText={(v) => setForm({ ...form, email: v })}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <Input
                label="Nombres *"
                value={form.first_name}
                onChangeText={(v) => setForm({ ...form, first_name: v })}
              />
            </View>
            <View className="flex-1">
              <Input
                label="Apellidos *"
                value={form.last_name}
                onChangeText={(v) => setForm({ ...form, last_name: v })}
              />
            </View>
          </View>
          <Input
            label="Teléfono"
            value={form.phone}
            onChangeText={(v) => setForm({ ...form, phone: v })}
            keyboardType="phone-pad"
          />
          <Select
            label="Rol *"
            value={form.role}
            options={ROLE_OPTS}
            onChange={(v) => setForm({ ...form, role: v })}
          />
          {editing === "new" && (
            <Input
              label="Contraseña *"
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
              secureTextEntry
            />
          )}
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!toDelete}
        title="Eliminar usuario"
        message={`¿Eliminar a ${toDelete?.username ?? ""}? Esta acción no se puede deshacer.`}
        destructive
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </ScreenContainer>
  );
}

interface CreateForm {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: Rol;
  phone: string;
  password: string;
  is_active: boolean;
}

function emptyForm(): CreateForm {
  return {
    username: "",
    email: "",
    first_name: "",
    last_name: "",
    role: "tecnico",
    phone: "",
    password: "",
    is_active: true,
  };
}
