import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ListItem } from "@/components/ui/ListItem";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { branchesService } from "@/services/branches.service";
import type { Branch, BranchInput } from "@/types/branch";

// Mismo formato que valida el backend (apps/branches/models.py): opcional
// "+", luego 7-20 dígitos / espacios / guiones / paréntesis. El teléfono es
// obligatorio ahí (solo el email es opcional) — si se manda vacío, el
// backend responde 400 "Este campo es requerido." sin decir cuál era.
const PHONE_RE = /^\+?[0-9\s\-()]{7,20}$/;

export function SedesScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const role = usuario?.role;
  const canCreate = can(role, "branches", "create");
  const canEdit = can(role, "branches", "edit");
  const canDelete = can(role, "branches", "delete");

  const [items, setItems] = useState<Branch[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
  const [form, setForm] = useState<BranchInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await branchesService.list({ ordering: "name" });
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

  const openNew = () => {
    setForm(emptyForm());
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (b: Branch) => {
    setForm({
      name: b.name,
      address: b.address,
      city: b.city,
      phone: b.phone ?? "",
      email: b.email ?? "",
      is_active: b.is_active,
    });
    setFormError(null);
    setEditing(b);
  };

  const submit = async () => {
    if (!form.name || !form.address || !form.city) {
      setFormError("Nombre, dirección y ciudad son requeridos.");
      return;
    }
    if (!form.phone?.trim()) {
      setFormError("El teléfono es obligatorio.");
      return;
    }
    if (!PHONE_RE.test(form.phone.trim())) {
      setFormError("El teléfono no tiene un formato válido. Ej.: +57 300 123 4567");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") {
        await branchesService.create(form);
      } else if (editing) {
        await branchesService.update(editing.id, form);
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
      await branchesService.remove(toDelete.id);
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
            Nueva sede
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
            icon={<Building2 size={28} color={colors.textMuted} />}
            title="Sin sedes"
          />
        }
        renderItem={({ item }) => (
          <ListItem
            title={item.name}
            subtitle={`${item.address} · ${item.city}`}
            meta={[item.phone, item.email].filter(Boolean).join(" · ") || undefined}
            trailing={
              <Badge tone={item.is_active ? "success" : "neutral"}>
                {item.is_active ? "Activa" : "Inactiva"}
              </Badge>
            }
            actions={
              canEdit || canDelete ? (
                <>
                  {canEdit && (
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
                  {canDelete && (
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
        )}
      />

      <Modal
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nueva sede" : "Editar sede"}
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
            label="Nombre *"
            value={form.name}
            onChangeText={(v) => setForm({ ...form, name: v })}
          />
          <Input
            label="Dirección *"
            value={form.address}
            onChangeText={(v) => setForm({ ...form, address: v })}
          />
          <Input
            label="Ciudad *"
            value={form.city}
            onChangeText={(v) => setForm({ ...form, city: v })}
          />
          <Input
            label="Teléfono *"
            value={form.phone ?? ""}
            onChangeText={(v) => setForm({ ...form, phone: v })}
            keyboardType="phone-pad"
            hint="Ej.: +57 300 123 4567"
          />
          <Input
            label="Email"
            value={form.email ?? ""}
            onChangeText={(v) => setForm({ ...form, email: v })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!toDelete}
        title="Eliminar sede"
        message={`¿Eliminar la sede "${toDelete?.name ?? ""}"?`}
        destructive
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </ScreenContainer>
  );
}

function emptyForm(): BranchInput {
  return {
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    is_active: true,
  };
}
