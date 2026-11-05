import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import {
  Check,
  ClipboardCheck,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react-native";
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
import { schedulingService } from "@/services/scheduling.service";
import { equipmentService } from "@/services/equipment.service";
import { usersService } from "@/services/users.service";
import { workOrdersService } from "@/services/workorders.service";
import {
  assignableUserOptions,
  assignedUserName,
  assignmentPayload,
} from "@/lib/users";
import type { ScheduleKind, ScheduledMaintenance } from "@/types/scheduling";
import type { Equipment } from "@/types/equipment";
import type { Usuario } from "@/types/auth";
import type { WorkOrderDetail } from "@/types/workorder";

const KIND_OPTS: SelectOption<ScheduleKind>[] = [
  { label: "Preventivo", value: "PREVENTIVE" },
  { label: "Reparación", value: "REPAIR" },
];

const today = () => new Date().toISOString().slice(0, 10);

interface FormState {
  equipment: number;
  kind: ScheduleKind;
  requested_date: string;
  scheduled_date: string;
  notes: string;
  assigned_technician: number | null;
  assigned_engineer: number | null;
}

function emptyForm(): FormState {
  return {
    equipment: 0,
    kind: "PREVENTIVE",
    requested_date: today(),
    scheduled_date: "",
    notes: "",
    assigned_technician: null,
    assigned_engineer: null,
  };
}

export function AgendamientosScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const role = usuario?.role;
  const canCreate = can(role, "scheduling", "create");
  const canEdit = can(role, "scheduling", "edit");
  const canDelete = can(role, "scheduling", "delete");
  const showRequestingArea = role === "superadmin" || role === "ingeniero";
  const isEngineer = role === "ingeniero";
  const isCoordinatorOrSuperadmin =
    role === "coordinador" || role === "superadmin";

  const [items, setItems] = useState<ScheduledMaintenance[]>([]);
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [filter, setFilter] = useState<"pending" | "completed" | "all">(
    "pending",
  );
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<ScheduledMaintenance | "new" | null>(
    null,
  );
  const [viewing, setViewing] = useState<ScheduledMaintenance | null>(null);
  const [woDetail, setWoDetail] = useState<WorkOrderDetail | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [toDelete, setToDelete] = useState<ScheduledMaintenance | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [list, eq] = await Promise.all([
        schedulingService.list({
          is_completed:
            filter === "all" ? undefined : filter === "completed",
          ordering: "-requested_date",
        }),
        // listAll: con más de una página de equipos, faltaban opciones en el
        // <Select> de "Equipo" sin ningún aviso.
        equipmentService.listAll({ ordering: "name" }),
      ]);
      setItems(list);
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
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const workOrderId = viewing?.work_order?.id;
  useEffect(() => {
    if (!isEngineer || !workOrderId) {
      setWoDetail(null);
      return;
    }
    let cancelled = false;
    workOrdersService
      .details(workOrderId)
      .then((d) => {
        if (!cancelled) setWoDetail(d);
      })
      .catch(() => {
        if (!cancelled) setWoDetail(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isEngineer, workOrderId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const eqOpts: SelectOption<number>[] = useMemo(
    () => equipos.map((e) => ({ label: `${e.asset_tag} · ${e.name}`, value: e.id })),
    [equipos],
  );
  const tecOpts: SelectOption<number>[] = useMemo(
    () => assignableUserOptions(tecnicos),
    [tecnicos],
  );

  const responsableId =
    form.assigned_technician ?? form.assigned_engineer ?? null;

  const openCreate = () => {
    setForm({
      ...emptyForm(),
      equipment: equipos[0]?.id ?? 0,
      requested_date: today(),
    });
    setFormError(null);
    setEditing("new");
  };

  const openEdit = (s: ScheduledMaintenance) => {
    setForm({
      equipment: s.equipment,
      kind: s.kind,
      requested_date: s.requested_date,
      scheduled_date: s.scheduled_date ?? "",
      notes: s.notes ?? "",
      assigned_technician: s.assigned_technician ?? null,
      assigned_engineer: s.assigned_engineer ?? null,
    });
    setFormError(null);
    setEditing(s);
  };

  const submit = async () => {
    if (!form.equipment) {
      setFormError("El equipo es requerido.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing === "new") {
        await schedulingService.create({
          equipment: form.equipment,
          kind: form.kind,
          requested_date: form.requested_date || today(),
          notes: form.notes,
        });
      } else if (editing) {
        await schedulingService.update(editing.id, {
          scheduled_date: form.scheduled_date || null,
          notes: form.notes,
          assigned_technician: form.assigned_technician,
          assigned_engineer: form.assigned_engineer,
        });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  };

  const complete = async (it: ScheduledMaintenance) => {
    try {
      await schedulingService.complete(it.id);
      await load();
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await schedulingService.remove(toDelete.id);
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
            { label: "Pendientes", value: "pending" },
            { label: "Completadas", value: "completed" },
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
            Nueva solicitud
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
            icon={<ClipboardCheck size={28} color={colors.textMuted} />}
            title="Sin solicitudes"
            description="No hay solicitudes de mantenimiento con este filtro."
          />
        }
        renderItem={({ item }) => {
          const showActive = !item.is_completed && canEdit;
          const showEdit = !item.is_completed && canEdit;
          const showDelete = canDelete;
          const hasActions = showActive || showEdit || showDelete;
          const solicitante =
            item.requested_by_detail?.full_name ||
            item.requested_by_detail?.username;
          const responsable =
            assignedUserName(item.assigned_technician_detail) ??
            assignedUserName(item.assigned_engineer_detail);
          const woStatus = item.work_order?.status;
          const estado =
            item.is_completed || woStatus === "FINISHED"
              ? "Cumplida"
              : woStatus === "IN_PROGRESS"
                ? "En proceso"
                : "Pendiente";
          return (
            <ListItem
              title={`${item.equipment_asset_tag ?? ""} · ${item.equipment_name ?? ""}`.trim() ||
                "Equipo"}
              subtitle={solicitante}
              meta={[
                item.requested_date,
                showRequestingArea && item.requesting_area
                  ? `Área: ${item.requesting_area}`
                  : null,
                responsable ? `Resp.: ${responsable}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              onPress={() => setViewing(item)}
              trailing={
              <Badge
                tone={
                  item.is_completed
                    ? "success"
                    : woStatus === "IN_PROGRESS"
                      ? "info"
                      : "warning"
                }
              >
                {estado}
              </Badge>
              }
              actions={
                hasActions ? (
                  <>
                    {showActive && (
                      <Button
                        size="sm"
                        onPress={() => complete(item)}
                        leftIcon={<Check size={14} color="#fff" />}
                        className="flex-1"
                      >
                        Completar
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
                        {item.scheduled_date ? "Editar" : "Programar"}
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
        visible={!!viewing}
        onClose={() => setViewing(null)}
        title="Detalle de la solicitud"
        footer={
          <Button variant="secondary" onPress={() => setViewing(null)}>
            Cerrar
          </Button>
        }
      >
        {viewing && (
          <View className="gap-3">
            <View>
              <Text className="text-xs font-medium uppercase text-app-text-muted dark:text-app-dark-text-muted">
                Equipo
              </Text>
              <Text className="mt-0.5 text-sm text-app-text dark:text-app-dark-text">
                {`${viewing.equipment_name ?? "Equipo"}${
                  viewing.equipment_asset_tag
                    ? ` (${viewing.equipment_asset_tag})`
                    : ""
                }`}
              </Text>
            </View>
            <View>
              <Text className="text-xs font-medium uppercase text-app-text-muted dark:text-app-dark-text-muted">
                Solicitante
              </Text>
              <Text className="mt-0.5 text-sm text-app-text dark:text-app-dark-text">
                {viewing.requested_by_detail?.full_name ||
                  viewing.requested_by_detail?.username ||
                  "—"}
              </Text>
            </View>
            {showRequestingArea && (
              <View>
                <Text className="text-xs font-medium uppercase text-app-text-muted dark:text-app-dark-text-muted">
                  Área solicitante
                </Text>
                <Text className="mt-0.5 text-sm text-app-text dark:text-app-dark-text">
                  {viewing.requesting_area ?? "—"}
                </Text>
              </View>
            )}
            <View>
              <Text className="text-xs font-medium uppercase text-app-text-muted dark:text-app-dark-text-muted">
                Descripción
              </Text>
              <Text className="mt-0.5 text-sm text-app-text dark:text-app-dark-text">
                {viewing.notes?.trim() ? viewing.notes : "Sin descripción"}
              </Text>
            </View>
            {viewing.work_order?.status === "FINISHED" && (
              <View>
                <Text className="text-xs font-medium uppercase text-app-text-muted dark:text-app-dark-text-muted">
                  Fecha fin
                </Text>
                <Text className="mt-0.5 text-sm text-app-text dark:text-app-dark-text">
                  {viewing.work_order.end_date
                    ? new Date(viewing.work_order.end_date).toLocaleString()
                    : "—"}
                </Text>
              </View>
            )}
            {isEngineer && woDetail && (
              <View className="gap-3 border-t border-app pt-3">
                <Text className="text-xs font-medium uppercase text-app-text-muted dark:text-app-dark-text-muted">
                  Intervención · Orden {woDetail.number}
                </Text>
                <View>
                  <Text className="text-sm font-semibold text-app-text dark:text-app-dark-text">
                    Repuestos
                  </Text>
                  {(woDetail.spare_parts ?? []).length === 0 ? (
                    <Text className="mt-0.5 text-xs text-app-text-muted dark:text-app-dark-text-muted">
                      Sin registros.
                    </Text>
                  ) : (
                    (woDetail.spare_parts ?? []).map((r) => (
                      <Text
                        key={r.id}
                        className="mt-0.5 text-sm text-app-text dark:text-app-dark-text"
                      >
                        {r.name} · {r.reference} · x{r.quantity} · ${r.total_cost}
                      </Text>
                    ))
                  )}
                </View>
                <View>
                  <Text className="text-sm font-semibold text-app-text dark:text-app-dark-text">
                    Mediciones
                  </Text>
                  {(woDetail.measurements ?? []).length === 0 ? (
                    <Text className="mt-0.5 text-xs text-app-text-muted dark:text-app-dark-text-muted">
                      Sin registros.
                    </Text>
                  ) : (
                    (woDetail.measurements ?? []).map((r) => (
                      <Text
                        key={r.id}
                        className="mt-0.5 text-sm text-app-text dark:text-app-dark-text"
                      >
                        {r.parameter}: {r.measured_value} {r.unit} (esp.{" "}
                        {r.expected_value}) {r.passed ? "OK" : "No"}
                      </Text>
                    ))
                  )}
                </View>
                <View>
                  <Text className="text-sm font-semibold text-app-text dark:text-app-dark-text">
                    Evidencias
                  </Text>
                  {(woDetail.evidences ?? []).length === 0 ? (
                    <Text className="mt-0.5 text-xs text-app-text-muted dark:text-app-dark-text-muted">
                      Sin registros.
                    </Text>
                  ) : (
                    (woDetail.evidences ?? []).map((r) => (
                      <Text
                        key={r.id}
                        className="mt-0.5 text-sm text-app-text dark:text-app-dark-text"
                      >
                        {r.evidence_type}: {r.description}
                      </Text>
                    ))
                  )}
                </View>
                <View>
                  <Text className="text-sm font-semibold text-app-text dark:text-app-dark-text">
                    Firmas
                  </Text>
                  {(woDetail.signatures ?? []).length === 0 ? (
                    <Text className="mt-0.5 text-xs text-app-text-muted dark:text-app-dark-text-muted">
                      Sin registros.
                    </Text>
                  ) : (
                    (woDetail.signatures ?? []).map((r) => (
                      <Text
                        key={r.id}
                        className="mt-0.5 text-sm text-app-text dark:text-app-dark-text"
                      >
                        {r.signed_by}
                        {r.signed_at
                          ? ` · ${new Date(r.signed_at).toLocaleString()}`
                          : ""}
                      </Text>
                    ))
                  )}
                </View>
                <View>
                  <Text className="text-sm font-semibold text-app-text dark:text-app-dark-text">
                    Costos
                  </Text>
                  {woDetail.cost ? (
                    <Text className="mt-0.5 text-sm text-app-text dark:text-app-dark-text">
                      Mano de obra ${woDetail.cost.labor_cost} · Repuestos $
                      {woDetail.cost.spare_parts_cost} · Transporte $
                      {woDetail.cost.transport_cost} · Otros $
                      {woDetail.cost.other_cost} · Total $
                      {woDetail.cost.total ?? "—"}
                    </Text>
                  ) : (
                    <Text className="mt-0.5 text-xs text-app-text-muted dark:text-app-dark-text-muted">
                      Sin costos registrados.
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        )}
      </Modal>

      <Modal
        visible={!!editing}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nueva solicitud" : "Programar solicitud"}
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
          {editing === "new" ? (
            <>
              {isCoordinatorOrSuperadmin ? (
                <>
                  <Input
                    label="Equipo"
                    value={
                      eqOpts.find((o) => o.value === form.equipment)?.label ??
                      ""
                    }
                    editable={false}
                  />
                  <Input
                    label="Tipo"
                    value={
                      KIND_OPTS.find((o) => o.value === form.kind)?.label ??
                      form.kind
                    }
                    editable={false}
                  />
                </>
              ) : (
                <>
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
                </>
              )}
              <Input
                label="Fecha de solicitud"
                value={form.requested_date}
                onChangeText={(v) => setForm({ ...form, requested_date: v })}
              />
            </>
          ) : (
            <>
              <Input
                label="Equipo"
                value={
                  editing && editing !== "new"
                    ? editing.equipment_name
                      ? `${editing.equipment_name}${
                          editing.equipment_asset_tag
                            ? ` (${editing.equipment_asset_tag})`
                            : ""
                        }`
                      : `Equipo #${editing.equipment}`
                    : ""
                }
                editable={false}
              />
              <Input
                label="Tipo"
                value={
                  KIND_OPTS.find((o) => o.value === form.kind)?.label ?? form.kind
                }
                editable={false}
              />
              <Input
                label="Fecha programada (YYYY-MM-DD)"
                value={form.scheduled_date}
                onChangeText={(v) => setForm({ ...form, scheduled_date: v })}
              />
              <Select
                label="Responsable"
                value={responsableId}
                options={[{ label: "Sin asignar", value: 0 }, ...tecOpts]}
                onChange={(v) => {
                  const user = tecnicos.find((u) => u.id === v);
                  setForm({ ...form, ...assignmentPayload(v ? user : null) });
                }}
              />
              {tecOpts.length === 0 && (
                <Text className="-mt-1 text-xs text-app-text-muted dark:text-app-dark-text-muted">
                  Tu rol no puede listar usuarios; asigna desde el panel web o
                  pide a un administrador.
                </Text>
              )}
            </>
          )}
          <Input
            label="Notas"
            value={form.notes ?? ""}
            onChangeText={(v) => setForm({ ...form, notes: v })}
            multiline
            numberOfLines={3}
            className="h-24 py-2"
          />
        </View>
      </Modal>

      <ConfirmDialog
        visible={!!toDelete}
        title="Eliminar solicitud"
        message="¿Eliminar definitivamente esta solicitud? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        destructive
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </ScreenContainer>
  );
}
