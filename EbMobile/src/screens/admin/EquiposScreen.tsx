import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { Pencil, Plus, QrCode, Trash2 } from "lucide-react-native";
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
import { equipmentService } from "@/services/equipment.service";
import { branchesService } from "@/services/branches.service";
import { modelsService } from "@/services/models.service";
import type { Equipment, EquipmentInput } from "@/types/equipment";
import type { Branch } from "@/types/branch";
import type { EquipmentModel } from "@/types/brand";

const STATUS_OPTS: SelectOption<string>[] = [
  { label: "Operativo", value: "ACTIVE" },
  { label: "Inactivo", value: "INACTIVE" },
  { label: "Mantenimiento", value: "IN_MAINTENANCE" },
  { label: "Reparación", value: "IN_REPAIR" },
];

const RISK_OPTS: SelectOption<string>[] = [
  { label: "Clase I — riesgo bajo", value: "I" },
  { label: "Clase IIA", value: "IIA" },
  { label: "Clase IIB", value: "IIB" },
  { label: "Clase III — riesgo alto", value: "III" },
];

export function EquiposScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const role = usuario?.role;
  const canCreate = can(role, "equipment", "create");
  const canEdit = can(role, "equipment", "edit");
  const canDelete = can(role, "equipment", "delete");

  const [items, setItems] = useState<Equipment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterBranch, setFilterBranch] = useState<number | null>(null);

  const [branches, setBranches] = useState<Branch[]>([]);
  const [models, setModels] = useState<EquipmentModel[]>([]);

  const [editing, setEditing] = useState<Equipment | "new" | null>(null);
  const [form, setForm] = useState<EquipmentInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Equipment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      // listAll, no list: con más de una página de equipos (20), .list()
      // devolvía solo la primera y el resto desaparecía de la lista sin
      // ningún aviso.
      const eq = await equipmentService.listAll({
        search: search || undefined,
        status: filterStatus ?? undefined,
        branch: filterBranch ?? undefined,
        ordering: "name",
      });
      setItems(eq);
      // Sedes y modelos son para los <Select> de crear/editar. El técnico no
      // puede listar sedes (403) pero tampoco puede crear equipos: si falla,
      // la pantalla sigue viva con la lista. Misma razón para listAll acá:
      // el catálogo de modelos ya supera una página.
      branchesService.list({ is_active: true }).then(setBranches).catch(() => {});
      modelsService.listAll({ is_active: true }).then(setModels).catch(() => {});
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  }, [search, filterStatus, filterBranch]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openCreate = () => {
    setForm(emptyForm());
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (e: Equipment) => {
    setForm({
      name: e.name,
      asset_tag: e.asset_tag,
      equipment_model: e.equipment_model,
      branch: e.branch,
      location: e.location,
      purchase_date: e.purchase_date,
      status: e.status,
      risk_class: e.risk_class,
    });
    setFormError(null);
    setEditing(e);
  };

  const submit = async () => {
    if (
      !form.name ||
      !form.asset_tag ||
      !form.equipment_model ||
      !form.branch ||
      !form.purchase_date
    ) {
      setFormError("Completa los campos requeridos.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") {
        await equipmentService.create(form);
      } else if (editing) {
        await equipmentService.update(editing.id, form);
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
      await equipmentService.remove(toDelete.id);
      setToDelete(null);
      await load();
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const branchOpts: SelectOption<number>[] = useMemo(
    () => branches.map((b) => ({ label: b.name, value: b.id })),
    [branches],
  );
  const modelOpts: SelectOption<number>[] = useMemo(
    () =>
      models.map((m) => ({
        label: `${m.brand_name ?? ""} ${m.name}`.trim(),
        value: m.id,
      })),
    [models],
  );

  return (
    <ScreenContainer scroll={false} contentClassName="gap-3">
      <View className="gap-3 px-4 pt-4">
        <Input
          placeholder="Buscar por nombre o asset tag…"
          value={search}
          onChangeText={setSearch}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Select
              value={filterStatus}
              onChange={(v) => setFilterStatus(v || null)}
              options={[{ label: "Todos los estados", value: "" }, ...STATUS_OPTS]}
              placeholder="Estado"
            />
          </View>
          <View className="flex-1">
            <Select
              value={filterBranch}
              onChange={(v) => setFilterBranch(v ? Number(v) : null)}
              options={[
                { label: "Todas las sedes", value: 0 as number },
                ...branchOpts,
              ]}
              placeholder="Sede"
            />
          </View>
        </View>
        {canCreate && (
          <Button
            onPress={openCreate}
            leftIcon={<Plus size={16} color="#fff" />}
            fullWidth
          >
            Nuevo equipo
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
            icon={<QrCode size={28} color={colors.textMuted} />}
            title="Sin equipos"
            description="Aún no hay equipos que coincidan con los filtros."
          />
        }
        renderItem={({ item }) => {
          const hasActions = canEdit || canDelete;
          return (
            <ListItem
              title={item.name}
              subtitle={`${item.asset_tag} · ${item.brand_name ?? ""} ${item.equipment_model_name ?? ""}`.trim()}
              meta={`${item.branch_name ?? "Sin sede"} · ${item.location}`}
              trailing={
                <Badge tone={statusTone(item.status)}>
                  {statusLabel(item.status)}
                </Badge>
              }
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
        title={editing === "new" ? "Nuevo equipo" : "Editar equipo"}
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
            label="Asset tag *"
            value={form.asset_tag}
            onChangeText={(v) => setForm({ ...form, asset_tag: v })}
            autoCapitalize="characters"
          />
          <Select
            label="Modelo *"
            value={form.equipment_model || null}
            options={modelOpts}
            onChange={(v) => setForm({ ...form, equipment_model: v })}
          />
          <Select
            label="Sede *"
            value={form.branch || null}
            options={branchOpts}
            onChange={(v) => setForm({ ...form, branch: v })}
          />
          <Input
            label="Ubicación *"
            value={form.location}
            onChangeText={(v) => setForm({ ...form, location: v })}
          />
          <Input
            label="Fecha de compra * (YYYY-MM-DD)"
            value={form.purchase_date}
            onChangeText={(v) => setForm({ ...form, purchase_date: v })}
          />
          <Select
            label="Estado *"
            value={form.status}
            options={STATUS_OPTS}
            onChange={(v) => setForm({ ...form, status: v as any })}
          />
          <Select
            label="Clasificación de riesgo *"
            value={form.risk_class}
            options={RISK_OPTS}
            onChange={(v) => setForm({ ...form, risk_class: v as any })}
          />
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!toDelete}
        title="Eliminar equipo"
        message={`¿Eliminar definitivamente "${toDelete?.name ?? ""}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </ScreenContainer>
  );
}

function emptyForm(): EquipmentInput {
  return {
    name: "",
    asset_tag: "",
    equipment_model: 0,
    branch: 0,
    location: "",
    purchase_date: "",
    status: "ACTIVE",
    risk_class: "I",
  };
}

function statusLabel(s: Equipment["status"]) {
  return {
    ACTIVE: "Operativo",
    INACTIVE: "Inactivo",
    IN_MAINTENANCE: "Mantenimiento",
    IN_REPAIR: "Reparación",
  }[s];
}

function statusTone(s: Equipment["status"]) {
  return {
    ACTIVE: "success",
    INACTIVE: "neutral",
    IN_MAINTENANCE: "warning",
    IN_REPAIR: "danger",
  }[s] as any;
}
