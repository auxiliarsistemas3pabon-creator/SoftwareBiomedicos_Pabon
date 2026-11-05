import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { Pencil, Plus, Trash2, Wrench } from "lucide-react-native";
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
import { maintenanceService } from "@/services/maintenance.service";
import { equipmentService } from "@/services/equipment.service";
import { usersService } from "@/services/users.service";
import {
  assignableUserOptions,
  assignedUserName,
  assignmentPayload,
} from "@/lib/users";
import type {
  MaintenanceInput,
  MaintenanceKind,
  MaintenanceRecord,
} from "@/types/maintenance";
import type { Equipment } from "@/types/equipment";
import type { Usuario } from "@/types/auth";

const KIND_OPTS: SelectOption<MaintenanceKind>[] = [
  { label: "Preventivo", value: "PREVENTIVE" },
  { label: "Correctivo", value: "CORRECTIVE" },
  { label: "Reparación", value: "REPAIR" },
  { label: "Calibración", value: "CALIBRATION" },
  { label: "Inspección", value: "INSPECTION" },
];

export function MantenimientosScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const role = usuario?.role;
  const canCreate = can(role, "maintenance", "create");
  const canEdit = can(role, "maintenance", "edit");
  const canDelete = can(role, "maintenance", "delete");

  const [items, setItems] = useState<MaintenanceRecord[]>([]);
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [filterKind, setFilterKind] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<MaintenanceInput>(emptyForm());
  const [toDelete, setToDelete] = useState<MaintenanceRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [m, eq] = await Promise.all([
        maintenanceService.list({
          kind: filterKind ?? undefined,
          ordering: "-date",
        }),
        // listAll: con más de una página de equipos, faltaban opciones en el
        // <Select> de "Equipo" sin ningún aviso.
        equipmentService.listAll({ ordering: "name" }),
      ]);
      setItems(m);
      setEquipos(eq);
      // El listado de usuarios solo lo permite el rol admin; si falla (403),
      // el selector de técnicos queda vacío pero la pantalla sigue viva.
      usersService
        .list({ is_active: true })
        .then(setTecnicos)
        .catch(() => setTecnicos([]));
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  }, [filterKind]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const eqOpts: SelectOption<number>[] = useMemo(
    () =>
      equipos.map((e) => ({
        label: `${e.asset_tag} · ${e.name}`,
        value: e.id,
      })),
    [equipos],
  );

  const tecOpts: SelectOption<number>[] = useMemo(
    () => assignableUserOptions(tecnicos),
    [tecnicos],
  );

  const responsableId =
    form.assigned_technician ?? form.assigned_engineer ?? null;

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (m: MaintenanceRecord) => {
    setForm({
      equipment: m.equipment,
      kind: m.kind,
      date: m.date,
      description: m.description,
      observations: m.observations ?? "",
      assigned_technician: m.assigned_technician ?? null,
      assigned_engineer: m.assigned_engineer ?? null,
      cost: m.cost ?? undefined,
    });
    setFormError(null);
    setEditing(m);
  };

  const submit = async () => {
    if (!form.equipment || !form.kind || !form.date || !form.description) {
      setFormError("Completa los campos requeridos.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") {
        await maintenanceService.create(form);
      } else if (editing) {
        await maintenanceService.update(editing.id, form);
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
      await maintenanceService.remove(toDelete.id);
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
          value={filterKind}
          onChange={(v) => setFilterKind(v || null)}
          options={[{ label: "Todos los tipos", value: "" }, ...KIND_OPTS]}
          placeholder="Filtrar por tipo"
        />
        {canCreate && (
          <Button
            onPress={openCreate}
            leftIcon={<Plus size={16} color="#fff" />}
            fullWidth
          >
            Registrar mantenimiento
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
            icon={<Wrench size={28} color={colors.textMuted} />}
            title="Sin registros"
            description="Aún no hay mantenimientos registrados."
          />
        }
        renderItem={({ item }) => {
          const hasActions = canEdit || canDelete;
          return (
            <ListItem
              title={`${item.equipment_asset_tag ?? ""} · ${item.equipment_name ?? ""}`.trim() ||
                "Equipo"}
              subtitle={
                item.observations
                  ? `${item.description}\nObservaciones: ${item.observations}`
                  : item.description
              }
              meta={`${item.date} · ${
                assignedUserName(item.assigned_technician_detail) ??
                assignedUserName(item.assigned_engineer_detail) ??
                item.technician?.trim() ??
                "Sin asignar"
              }`}
              trailing={<Badge tone={kindTone(item.kind)}>{kindLabel(item.kind)}</Badge>}
              actions={
                hasActions ? (
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
          );
        }}
      />

      <Modal
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Registrar mantenimiento" : "Editar mantenimiento"}
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
          <Select
            label="Equipo *"
            value={form.equipment || null}
            options={eqOpts}
            onChange={(v) => setForm({ ...form, equipment: v })}
          />
          <Select
            label="Tipo *"
            value={form.kind}
            options={KIND_OPTS}
            onChange={(v) => setForm({ ...form, kind: v })}
          />
          <Input
            label="Fecha * (YYYY-MM-DD)"
            value={form.date}
            onChangeText={(v) => setForm({ ...form, date: v })}
          />
          <Input
            label="Descripción *"
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
            multiline
            numberOfLines={3}
            className="h-24 py-2"
          />
          <Input
            label="Observaciones del técnico (opcional)"
            value={form.observations ?? ""}
            onChangeText={(v) => setForm({ ...form, observations: v })}
            placeholder="Hallazgos, trabajo realizado, recomendaciones..."
            multiline
            numberOfLines={3}
            className="h-24 py-2"
          />
          <Select
            label="Responsable (opcional)"
            value={responsableId}
            options={[{ label: "Sin asignar", value: 0 }, ...tecOpts]}
            onChange={(v) => {
              const user = tecnicos.find((u) => u.id === v);
              setForm({ ...form, ...assignmentPayload(v ? user : null) });
            }}
          />
          {tecOpts.length === 0 && (
            <Text className="-mt-1 text-xs text-app-text-muted dark:text-app-dark-text-muted">
              Tu rol no puede listar usuarios; la asignación se hace desde el
              panel web o por un administrador.
            </Text>
          )}
          <Input
            label="Costo (opcional)"
            value={form.cost ?? ""}
            onChangeText={(v) => setForm({ ...form, cost: v })}
            keyboardType="numeric"
          />
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!toDelete}
        title="Eliminar mantenimiento"
        message="¿Eliminar definitivamente este registro de mantenimiento? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </ScreenContainer>
  );
}

function emptyForm(): MaintenanceInput {
  return {
    equipment: 0,
    kind: "PREVENTIVE",
    date: new Date().toISOString().slice(0, 10),
    description: "",
    observations: "",
    assigned_technician: null,
    assigned_engineer: null,
  };
}

function kindLabel(k: MaintenanceKind) {
  return {
    PREVENTIVE: "Preventivo",
    CORRECTIVE: "Correctivo",
    REPAIR: "Reparación",
    CALIBRATION: "Calibración",
    INSPECTION: "Inspección",
  }[k];
}

function kindTone(k: MaintenanceKind) {
  return {
    PREVENTIVE: "success",
    CORRECTIVE: "warning",
    REPAIR: "danger",
    CALIBRATION: "info",
    INSPECTION: "neutral",
  }[k] as "success" | "warning" | "danger" | "info" | "neutral";
}
