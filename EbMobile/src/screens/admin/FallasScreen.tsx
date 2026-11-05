import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { Check, Pencil, Plus, Trash2, TriangleAlert } from "lucide-react-native";
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
import { can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { failuresService } from "@/services/failures.service";
import { equipmentService } from "@/services/equipment.service";
import type {
  FailureInput,
  FailureReport,
  FailureSeverity,
} from "@/types/failure";
import type { Equipment } from "@/types/equipment";
import { useNavigation } from "@react-navigation/native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import type { AppDrawerParamList } from "@/navigation/types";

const SEVERITY_OPTS: SelectOption<FailureSeverity>[] = [
  { label: "Baja", value: "LOW" },
  { label: "Media", value: "MEDIUM" },
  { label: "Alta", value: "HIGH" },
  { label: "Crítica", value: "CRITICAL" },
];

export function FallasScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const navigation = useNavigation<DrawerNavigationProp<AppDrawerParamList>>();
  const role = usuario?.role;
  const canCreate = can(role, "failures", "create");
  const canEdit = can(role, "failures", "edit");
  const canDelete = can(role, "failures", "delete");

  const [items, setItems] = useState<FailureReport[]>([]);
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<FailureReport | "new" | null>(null);
  const [form, setForm] = useState<FailureInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [resolving, setResolving] = useState<FailureReport | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolvingLoading, setResolvingLoading] = useState(false);
  const [toDelete, setToDelete] = useState<FailureReport | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [fs, eq] = await Promise.all([
        failuresService.list({
          resolved: filter === "all" ? undefined : filter === "resolved",
          ordering: "-reported_at",
        }),
        // listAll: con más de una página de equipos, faltaban opciones en el
        // <Select> de "Equipo" sin ningún aviso.
        equipmentService.listAll({ ordering: "name" }),
      ]);
      setItems(fs);
      setEquipos(eq);
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const eqOpts: SelectOption<number>[] = useMemo(
    () => equipos.map((e) => ({ label: `${e.asset_tag} · ${e.name}`, value: e.id })),
    [equipos],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (f: FailureReport) => {
    setForm({
      equipment: f.equipment,
      description: f.description,
      severity: f.severity,
    });
    setFormError(null);
    setEditing(f);
  };

  const submit = async () => {
    if (!form.equipment || !form.description) {
      setFormError("Selecciona el equipo y describe la falla.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") {
        await failuresService.create(form);
      } else if (editing) {
        await failuresService.update(editing.id, form);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  };

  const submitResolution = async () => {
    if (!resolving) return;
    setResolvingLoading(true);
    try {
      await failuresService.resolve(resolving.id, resolutionNotes || undefined);
      setResolving(null);
      setResolutionNotes("");
      if (role === "ingeniero") {
        navigation.navigate("Dashboard");
        return;
      }
      await load();
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    } finally {
      setResolvingLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await failuresService.remove(toDelete.id);
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
        <Select
          value={filter}
          options={[
            { label: "Abiertas", value: "open" },
            { label: "Resueltas", value: "resolved" },
            { label: "Todas", value: "all" },
          ]}
          onChange={(v) => setFilter(v as any)}
        />
        {canCreate && (
          <Button
            onPress={openCreate}
            leftIcon={<Plus size={16} color="#fff" />}
            fullWidth
          >
            Reportar falla
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
            icon={<TriangleAlert size={28} color={colors.textMuted} />}
            title="Sin reportes"
            description="No hay fallas con este filtro."
          />
        }
        renderItem={({ item }) => {
          const showResolve = !item.resolved && canEdit;
          const showEdit = !item.resolved && canEdit;
          const showDelete = canDelete;
          const hasActions = showResolve || showEdit || showDelete;
          return (
            <ListItem
              title={item.equipment_asset_tag ?? `Equipo #${item.equipment}`}
              subtitle={item.description}
              meta={`${item.reported_at?.slice(0, 10)} · ${item.branch_name ?? ""}`}
              trailing={
                <View className="items-end gap-1">
                  <Badge tone={severityTone(item.severity)} className="self-end">
                    {severityLabel(item.severity)}
                  </Badge>
                  <Badge
                    tone={item.resolved ? "success" : "danger"}
                    className="self-end"
                  >
                    {item.resolved ? "Resuelta" : "Abierta"}
                  </Badge>
                </View>
              }
              actions={
                hasActions ? (
                  <>
                    {showResolve && (
                      <Button
                        size="sm"
                        onPress={() => {
                          setResolving(item);
                          setResolutionNotes("");
                        }}
                        leftIcon={<Check size={14} color="#fff" />}
                        className="flex-1"
                      >
                        Resolver
                      </Button>
                    )}
                    {showEdit && (
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
                    {showDelete && (
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
        title={editing === "new" ? "Reportar falla" : "Editar falla"}
        footer={
          <>
            <Button variant="secondary" onPress={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onPress={submit} loading={saving}>
              {editing === "new" ? "Reportar" : "Guardar"}
            </Button>
          </>
        }
      >
        <View className="gap-3">
          {formError && (
            <Text className="text-sm text-red-600">{formError}</Text>
          )}
          <Select
            label="Equipo *"
            value={form.equipment || null}
            options={eqOpts}
            onChange={(v) => setForm({ ...form, equipment: v })}
          />
          <Select
            label="Severidad *"
            value={form.severity}
            options={SEVERITY_OPTS}
            onChange={(v) => setForm({ ...form, severity: v })}
          />
          <Input
            label="Descripción *"
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
            multiline
            numberOfLines={4}
            className="h-28 py-2"
          />
        </View>
      </Modal>

      <Modal
        visible={!!resolving}
        onClose={() => setResolving(null)}
        title="Marcar como resuelta"
        footer={
          <>
            <Button variant="secondary" onPress={() => setResolving(null)}>
              Cancelar
            </Button>
            <Button onPress={submitResolution} loading={resolvingLoading}>
              Resolver
            </Button>
          </>
        }
      >
        <View className="gap-3">
          <Text className="text-sm text-app-text-muted dark:text-app-dark-text-muted">
            Describe brevemente cómo se resolvió.
          </Text>
          <Input
            label="Notas de resolución"
            value={resolutionNotes}
            onChangeText={setResolutionNotes}
            multiline
            numberOfLines={4}
            className="h-28 py-2"
          />
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!toDelete}
        title="Eliminar reporte"
        message="¿Eliminar definitivamente este reporte de falla? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </ScreenContainer>
  );
}

function emptyForm(): FailureInput {
  return {
    equipment: 0,
    description: "",
    severity: "MEDIUM",
  };
}

function severityLabel(s: FailureSeverity) {
  return { LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", CRITICAL: "Crítica" }[s];
}

function severityTone(s: FailureSeverity) {
  return ({ LOW: "info", MEDIUM: "warning", HIGH: "warning", CRITICAL: "danger" } as const)[s];
}
