import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, FlatList, RefreshControl, Text, View } from "react-native";
import { FileText, Plus } from "lucide-react-native";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { ListItem } from "@/components/ui/ListItem";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { can } from "@/lib/permissions";
import { getApiErrorMessage } from "@/lib/api";
import { workOrdersService } from "@/services/workorders.service";
import { equipmentService } from "@/services/equipment.service";
import { assignableUserOptions } from "@/lib/users";
import { usersService } from "@/services/users.service";
import type { Equipment } from "@/types/equipment";
import type { Usuario } from "@/types/auth";
import type { FailureSeverity } from "@/types/failure";
import type {
  WorkOrder,
  WorkOrderDetail,
  WorkOrderInput,
  WorkOrderServiceType,
  WorkOrderStatus,
} from "@/types/workorder";

const TYPE_OPTS: SelectOption<WorkOrderServiceType>[] = [
  { label: "Preventivo", value: "PREVENTIVE" },
  { label: "Correctivo", value: "CORRECTIVE" },
  { label: "Calibración", value: "CALIBRATION" },
  { label: "Instalación", value: "INSTALLATION" },
  { label: "Inspección", value: "INSPECTION" },
];

const STATUS_OPTS: SelectOption<WorkOrderStatus>[] = [
  { label: "Pendiente", value: "PENDING" },
  { label: "En proceso", value: "IN_PROGRESS" },
  { label: "Terminada", value: "FINISHED" },
  { label: "Cancelada", value: "CANCELLED" },
];

const SEVERITY_OPTS: SelectOption<FailureSeverity>[] = [
  { label: "Baja", value: "LOW" },
  { label: "Media", value: "MEDIUM" },
  { label: "Alta", value: "HIGH" },
  { label: "Crítica", value: "CRITICAL" },
];

function statusTone(
  s: WorkOrderStatus,
): "neutral" | "info" | "success" | "danger" {
  const map = {
    PENDING: "neutral",
    IN_PROGRESS: "info",
    FINISHED: "success",
    CANCELLED: "danger",
  } as const;
  return map[s];
}

const today = () => new Date().toISOString().slice(0, 16);

function emptyForm(): WorkOrderInput {
  return {
    equipment: 0,
    number: "",
    service_type: "PREVENTIVE",
    start_date: today(),
    description: "",
    status: "PENDING",
    technician: null,
  };
}

export function OrdenesTrabajoScreen() {
  const { usuario } = useAuth();
  const { colors } = useTheme();
  const role = usuario?.role;
  const isEngineer = role === "ingeniero";
  const canCreate = can(role, "work_orders", "create");
  const canEdit = can(role, "work_orders", "edit");

  const [items, setItems] = useState<WorkOrder[]>([]);
  const [equipos, setEquipos] = useState<Equipment[]>([]);
  const [tecnicos, setTecnicos] = useState<Usuario[]>([]);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [editing, setEditing] = useState<"new" | null>(null);
  const [form, setForm] = useState<WorkOrderInput>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [detail, setDetail] = useState<WorkOrderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [completing, setCompleting] = useState<WorkOrder | null>(null);
  const [completeObs, setCompleteObs] = useState("");
  const [completeFailDesc, setCompleteFailDesc] = useState("");
  const [completeFailSev, setCompleteFailSev] =
    useState<FailureSeverity>("MEDIUM");
  const [completeSaving, setCompleteSaving] = useState(false);
  const [completeStatus, setCompleteStatus] =
    useState<WorkOrderStatus>("IN_PROGRESS");

  const load = useCallback(async () => {
    try {
      const [list, eq] = await Promise.all([
        workOrdersService.list({
          ordering: "-start_date",
          status: statusFilter ?? undefined,
        }),
        // listAll: con más de una página de equipos, faltaban opciones en el
        // <Select> de "Equipo" sin ningún aviso.
        equipmentService.listAll({ ordering: "name" }),
      ]);
      setItems(list);
      setEquipos(eq);
      usersService
        .list({ is_active: true })
        .then(setTecnicos)
        .catch(() => setTecnicos([]));
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const eqOpts: SelectOption<number>[] = useMemo(
    () => equipos.map((e) => ({ label: `${e.asset_tag} · ${e.name}`, value: e.id })),
    [equipos],
  );
  const tecOpts = useMemo(() => assignableUserOptions(tecnicos), [tecnicos]);

  const openCreate = () => {
    setForm({ ...emptyForm(), equipment: equipos[0]?.id ?? 0 });
    setFormError(null);
    setEditing("new");
  };

  const submit = async () => {
    if (!form.equipment || !form.number || !form.description) {
      setFormError("Equipo, número y descripción son obligatorios.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await workOrdersService.create({
        ...form,
        technician: form.technician || null,
      });
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "No se pudo guardar."));
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (w: WorkOrder) => {
    setDetail(w as WorkOrderDetail);
    setDetailLoading(true);
    try {
      setDetail(await workOrdersService.details(w.id));
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
      setDetail(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const changeStatus = async (status: WorkOrderStatus) => {
    if (!detail) return;
    if (isEngineer && status === "FINISHED") {
      setCompleting(detail);
      setCompleteFailDesc(detail.description ?? "");
      setCompleteFailSev("MEDIUM");
      setCompleteObs("");
      setCompleteStatus(
        detail.status === "PENDING" ? "IN_PROGRESS" : detail.status,
      );
      setDetail(null);
      return;
    }
    setStatusSaving(true);
    try {
      await workOrdersService.update(detail.id, { status });
      setDetail({ ...detail, status });
      await load();
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err));
    } finally {
      setStatusSaving(false);
    }
  };

  const submitComplete = async () => {
    if (!completing) return;
    const notes = completeObs.trim();
    if (!notes) {
      Alert.alert("Falta la nota", "La nota de resolución es obligatoria.");
      return;
    }
    if (
      isEngineer &&
      completing.status === "PENDING" &&
      completeStatus === "FINISHED"
    ) {
      Alert.alert(
        "No se puede finalizar de una",
        "Primero pasa la orden a En proceso.",
      );
      return;
    }
    setCompleteSaving(true);
    try {
      if (completeStatus === "FINISHED") {
        await workOrdersService.complete(completing.id, {
          observations: notes,
          status: "FINISHED",
          failure_description: completeFailDesc.trim() || completing.description,
          failure_severity: completeFailSev,
          failure_resolution_notes: notes,
        });
      } else {
        await workOrdersService.complete(completing.id, {
          observations: notes,
          status: completeStatus,
        });
      }
      setCompleting(null);
      await load();
    } catch (err) {
      Alert.alert("Error", getApiErrorMessage(err, "No se pudo registrar el mantenimiento"));
    } finally {
      setCompleteSaving(false);
    }
  };

  return (
    <ScreenContainer scroll={false} contentClassName="gap-3">
      <View className="gap-3 px-4 pt-4">
        {isEngineer && (
          <Text className="text-sm text-app-text-muted dark:text-app-dark-text-muted">
            Órdenes que te asignaron. Ábrelas para realizar el mantenimiento.
          </Text>
        )}
        <Select
          value={statusFilter}
          onChange={(v) => setStatusFilter(v || null)}
          options={[{ label: "Todo estado", value: "" }, ...STATUS_OPTS]}
          placeholder="Filtrar por estado"
        />
        {canCreate && (
          <Button
            onPress={openCreate}
            leftIcon={<Plus size={16} color="#fff" />}
            fullWidth
          >
            Nueva orden
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
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<FileText size={28} color={colors.textMuted} />}
            title={isEngineer ? "Sin tareas asignadas" : "Sin órdenes"}
            description={
              isEngineer
                ? "No tienes órdenes de trabajo con este filtro."
                : "No hay órdenes de trabajo con este filtro."
            }
          />
        }
        renderItem={({ item }) => (
          <ListItem
            title={`${item.number} · ${item.service_type_display ?? item.service_type}`}
            subtitle={`${item.equipment_asset_tag ?? ""} ${item.equipment_name ?? ""}`.trim()}
            meta={`${new Date(item.start_date).toLocaleDateString()} · ${
              item.technician_name ?? "Sin asignar"
            }${
              item.status === "FINISHED"
                ? ` · Fin ${
                    item.end_date
                      ? new Date(item.end_date).toLocaleString()
                      : "—"
                  }`
                : ""
            }`}
            trailing={
              <Badge tone={statusTone(item.status)}>
                {item.status_display ?? item.status}
              </Badge>
            }
            onPress={() => openDetail(item)}
          />
        )}
      />

      <Modal
        visible={editing === "new"}
        onClose={() => setEditing(null)}
        title="Nueva orden de trabajo"
        footer={
          <>
            <Button variant="secondary" onPress={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onPress={submit} loading={saving}>
              Crear
            </Button>
          </>
        }
      >
        <View className="gap-3">
          {formError && <Text className="text-sm text-red-600">{formError}</Text>}
          <Select
            label="Equipo *"
            value={form.equipment || null}
            options={eqOpts}
            onChange={(v) => setForm({ ...form, equipment: v })}
          />
          <Input
            label="Número de orden *"
            value={form.number}
            onChangeText={(v) => setForm({ ...form, number: v })}
          />
          <Select
            label="Tipo *"
            value={form.service_type}
            options={TYPE_OPTS}
            onChange={(v) => setForm({ ...form, service_type: v })}
          />
          <Input
            label="Inicio (YYYY-MM-DDTHH:mm)"
            value={form.start_date}
            onChangeText={(v) => setForm({ ...form, start_date: v })}
          />
          <Select
            label="Técnico responsable"
            value={form.technician ?? null}
            options={[{ label: "Sin asignar", value: 0 }, ...tecOpts]}
            onChange={(v) =>
              setForm({ ...form, technician: v ? Number(v) : null })
            }
          />
          <Select
            label="Estado"
            value={form.status}
            options={STATUS_OPTS}
            onChange={(v) => setForm({ ...form, status: v })}
          />
          <Input
            label="Descripción *"
            value={form.description}
            onChangeText={(v) => setForm({ ...form, description: v })}
            multiline
            numberOfLines={3}
            className="h-24 py-2"
          />
        </View>
      </Modal>

      <Modal
        visible={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? `Orden ${detail.number}` : ""}
        footer={
          <Button variant="secondary" onPress={() => setDetail(null)}>
            Cerrar
          </Button>
        }
      >
        {detail && (
          <View className="gap-3">
            <Text className="text-sm text-app-text dark:text-app-dark-text">
              Número: {detail.number}
            </Text>
            <Text className="text-sm text-app-text dark:text-app-dark-text">
              Equipo: {detail.equipment_asset_tag} · {detail.equipment_name}
            </Text>
            <Text className="text-sm text-app-text dark:text-app-dark-text">
              Tipo: {detail.service_type_display ?? detail.service_type}
            </Text>
            <Text className="text-sm text-app-text dark:text-app-dark-text">
              Estado: {detail.status_display ?? detail.status}
            </Text>
            <Text className="text-sm text-app-text dark:text-app-dark-text">
              Inicio: {new Date(detail.start_date).toLocaleString()}
            </Text>
            {(detail.status === "FINISHED" || detail.end_date) && (
              <Text className="text-sm text-app-text dark:text-app-dark-text">
                Fecha fin:{" "}
                {detail.end_date
                  ? new Date(detail.end_date).toLocaleString()
                  : "—"}
              </Text>
            )}
            <Text className="text-sm text-app-text dark:text-app-dark-text">
              Asignado: {detail.technician_name ?? "Sin asignar"}
            </Text>
            <Text className="text-sm text-app-text-muted dark:text-app-dark-text-muted">
              Descripción: {detail.description}
            </Text>
            {canEdit && detail.status !== "FINISHED" && (
              <Select
                label="Estado"
                value={detail.status}
                options={STATUS_OPTS}
                onChange={(v) => changeStatus(v)}
              />
            )}
            {isEngineer &&
              (detail.status === "PENDING" ||
                detail.status === "IN_PROGRESS") && (
                <Button
                  onPress={() => changeStatus("FINISHED")}
                  loading={statusSaving}
                >
                  Realizar mantenimiento
                </Button>
              )}
            {statusSaving && (
              <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                Guardando...
              </Text>
            )}
            {detailLoading ? (
              <Text className="text-sm text-app-text-muted dark:text-app-dark-text-muted">
                Cargando elementos...
              </Text>
            ) : (
              <View className="gap-1">
                <Text className="text-sm text-app-text dark:text-app-dark-text">
                  Repuestos: {detail.spare_parts?.length ?? 0}
                </Text>
                <Text className="text-sm text-app-text dark:text-app-dark-text">
                  Mediciones: {detail.measurements?.length ?? 0}
                </Text>
                <Text className="text-sm text-app-text dark:text-app-dark-text">
                  Evidencias: {detail.evidences?.length ?? 0}
                </Text>
                <Text className="text-sm text-app-text dark:text-app-dark-text">
                  Firmas: {detail.signatures?.length ?? 0}
                </Text>
                <Text className="text-xs text-app-text-muted dark:text-app-dark-text-muted">
                  El detalle completo (repuestos, mediciones, evidencias,
                  firmas, costos) se gestiona desde el panel web.
                </Text>
              </View>
            )}
          </View>
        )}
      </Modal>

      <Modal
        visible={!!completing}
        onClose={() => setCompleting(null)}
        title={
          completing
            ? `Realizar mantenimiento — ${completing.number}`
            : ""
        }
        footer={
          <>
            <Button variant="secondary" onPress={() => setCompleting(null)}>
              Cancelar
            </Button>
            <Button onPress={() => void submitComplete()} loading={completeSaving}>
              {completeStatus === "FINISHED"
                ? "Enviar"
                : "Realizar mantenimiento"}
            </Button>
          </>
        }
      >
        {completing && (
          <View className="gap-3">
            <Text className="text-sm text-app-text dark:text-app-dark-text">
              {completing.equipment_asset_tag} · {completing.equipment_name}
            </Text>
            <Text className="text-sm font-medium text-app-text dark:text-app-dark-text">
              Reporte de falla
            </Text>
            <Select
              label="Severidad"
              value={completeFailSev}
              options={SEVERITY_OPTS}
              onChange={(v) => setCompleteFailSev(v)}
            />
            <Input
              label="Descripción de la falla"
              value={completeFailDesc}
              editable={false}
              multiline
              numberOfLines={3}
              className="h-24 py-2"
            />
            <Input
              label="Nota de resolución *"
              value={completeObs}
              onChangeText={setCompleteObs}
              multiline
              numberOfLines={3}
              className="h-24 py-2"
            />
            <Select
              label="Estado del mantenimiento"
              value={completeStatus}
              options={
                completing.status === "IN_PROGRESS" || !isEngineer
                  ? [
                      { label: "Pendiente", value: "PENDING" },
                      { label: "En proceso", value: "IN_PROGRESS" },
                      { label: "Finalizar", value: "FINISHED" },
                    ]
                  : [
                      { label: "Pendiente", value: "PENDING" },
                      { label: "En proceso", value: "IN_PROGRESS" },
                    ]
              }
              onChange={(v) => setCompleteStatus(v)}
            />
          </View>
        )}
      </Modal>
    </ScreenContainer>
  );
}
