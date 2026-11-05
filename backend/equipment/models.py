from typing import TYPE_CHECKING

from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from branches.models import Branch

from .managers import EquipmentManager


class EquipmentStatus(models.TextChoices):
    ACTIVE = "ACTIVE", _("Operativo")
    INACTIVE = "INACTIVE", _("Fuera de servicio")
    IN_MAINTENANCE = "IN_MAINTENANCE", _("En mantenimiento")
    IN_REPAIR = "IN_REPAIR", _("En reparación")

class RiskClass(models.TextChoices):
    I = "I", _("Clase I — riesgo bajo")  # noqa: E741
    IIA = "IIA", _("Clase IIA — riesgo moderado")
    IIB = "IIB", _("Clase IIB — riesgo moderado-alto")
    III = "III", _("Clase III — riesgo alto")

class TechnologyType(models.TextChoices):
    ELECTRONIC = "ELECTRONIC",_("Electrónico")
    ELECTROMEDICAL = "ELECTROMEDICAL",("Electromédico")
    MECHANICAL = "MECHANICAL",_("Mecánico")
    MIXED = "MIXED",_("Mixto")
    OTHER = "OTHER",_("Otro")

class ProviderType(models.TextChoices):
    IMPORMESAN = "IMPORMESAN",_("Impormesan")
    INVERMEDICA = "INVERMEDICA",_("Invermedica")
    SIEMENS = "SIEMENS",_("SIEMENS")
    GENERAL_ELECTRIC_HEALTHRARE = "GENERAL_ELECTRIC_HEALTHRARE",_("General electric healthare")
    TOP_MEDICAL_SYSTEMS = "TOP_MEDICAL_SYSTEMS",_("Top Medical Systems")
    STRYKER = "STRYKER",_("Stryker")
    BIOTRONITECH = "BIOTRONITECH",_("Biotronitech")
    C_MEDICAL = "C_MEDICAL",_("C Medical")
    MEDICAH = "MEDICAH",_("Medicah")
    RX_SAS = "RX_SAS",_("Rx S.A.S")
    DRAGER_COLOMBIA = "DRAGER_COLOMBIA",_("Drager Colombia")

class InstructionType(models.TextChoices):
    PREVENTIVE = "PREVENTIVE",_("Preventivo")
    CORRECTIVE = "CORRECTIVE",_("Correctivo")
    CALIBRATION = "CALIBRATION",_("Calibración")

class AttachmentType(models.TextChoices):
    LIFE_SHEET = "LIFE_SHEET",_("Hoja de Vida")
    MANUAL = "MANUAL",_("Manual")
    PHOTO = "PHOTO", _("Fotografía")
    CERTIFICATE = "CERTIFICATE", _("Certificado")
    WARRANTY = "WARRANTY", _("Garantía")
    PURCHASE = "PURCHASE", _("Compra")
    OTHER = "OTHER",_("Otro")

class WorkOrderType(models.TextChoices):
    PREVENTIVE = "PREVENTIVE", _("Preventivo")
    CORRECTIVE = "CORRECTIVE", _("Correctivo")
    CALIBRATION = "CALIBRATION",_("Calibración")
    INSTALLATION = "INSTALLATION",_("Instalación")
    INSPECTION = "INSPECTION",_("Inspección")

class WorkOrderStatus(models.TextChoices):
    PENDING = "PENDING",_("Pendiente")
    IN_PROGRESS = "IN_PROGRESS",_("En proceso")
    FINISHED = "FINISHED", _("Terminada")
    CANCELLED = "CANCELLED",_("Cancelada")

class EvidenceType(models.TextChoices):
    PHOTO = "PHOTO",_("Fotografía")
    VIDEO = "VIDEO",_("Video")
    DOCUMENT = "DOCUMENT",_("Documento")
    AUDIO = "AUDIO",_("Audio")

class SignatureRole(models.TextChoices):
    TECHNICIAN = "TECHNICIAN"
    ENGINEER = "ENGINEER"
    CLIENT = "CLIENT"
    SUPERVISOR = "SUPERVISOR"

class Equipment(models.Model):
    if TYPE_CHECKING:
        id: int
        failures: models.Manager
        failures_count: int

    # Identificación
    name = models.CharField(_("Nombre"), max_length=150)
    asset_tag = models.CharField(
        _("Placa / código de inventario"), max_length=50, unique=True, db_index=True
    )
    serial = models.CharField(_("Serie"),max_length=80,blank=True,db_index=True)
    internal_code = models.CharField(_("Código N.T."),max_length=50,blank=True)
    software_identifier = models.CharField(
        _("Identificador Software (Id)"),max_length=50,blank=True,db_index=True
    )
    equipment_model = models.ForeignKey(
        "catalog.EquipmentModel",
        on_delete=models.PROTECT,
        related_name="equipment",
        verbose_name=_("Modelo"),
    )
    branch_text = models.CharField(
        _("Marca (texto)"),
        max_length=120,
        blank=True,
        help_text=_("Útil si la marca no existe en catálogo."),
    )

    # null=True is intentional: "" is not a valid TechnologyType choice, so
    # null represents "sin clasificar" and is part of the published API
    # contract (see docs/openapi-schema.yaml, nullable: true).
    technology_type = models.CharField(  # noqa: DJ001
        _("Tipo tecnología"),
        max_length=30,
        choices=TechnologyType.choices,
        null=True,
        blank=True,
    )

    biomedical_classification = models.CharField(
        _("Clasificación biomédica"),
        max_length=50,
        blank=True,
    )
    # null=True is intentional: "" is not a valid RiskClass choice, so null
    # represents "pendiente de clasificar" and drives the `risk_class__isnull`
    # filter (see api/v1/equipment/filters.py) and API tests/docs.
    risk_class = models.CharField(  # noqa: DJ001
        _("Clasificación de riesgo INVIMA"),
        max_length=4,
        choices=RiskClass.choices,
        null=True,
        blank=True,
        db_index=True,
    )

    life_use_years = models.PositiveIntegerField(_("Vida útil (años)"),null=True)
    manufacture_date = models.DateField(_("Fecha de fabricación"),null=True,blank=True)
    owner = models.CharField(_("Propietario"),max_length=150,blank=True)
    manufacturer = models.CharField(_("Fabricante"),max_length=150,blank=True)
    calibration_date = models.CharField(_("Código de calibración"),max_length=50,blank=True)

    client_name = models.CharField(_("Cliente"),max_length=180,blank=True)
    branch = models.ForeignKey(
        Branch,
        on_delete=models.PROTECT,
        related_name="equipment",
        verbose_name=_("Sede"),
    )
    department = models.CharField(_("Departamento"),max_length=80,blank=True)
    city = models.CharField(_("Ciudad"),max_length=80,blank=True)
    area = models.CharField(_("Área"),max_length=120,blank=True)
    location = models.CharField(_("Ubicación"), max_length=120, blank=True)
    observations = models.TextField(_("Observaciones"),blank=True)
    purchase_date = models.DateField(_("Fecha de compra"), null=True, blank=True)
    supplier_acquisition = models.CharField(
        _("Proveedor de acquisión"),
        choices=ProviderType.choices,
        max_length=150,
        blank=True
    )
    start_use_date = models.DateField(_("Fecha inicia funcionamiento"),null=True,blank=True)
    equipment_cost = models.DecimalField(
        _("Costo equipo"),
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
    )
    maintenance_provider = models.CharField(_("Proveedor de mantenimiento"),max_length=150,blank=True)
    warranty_start_date = models.DateTimeField(_("Fecha inicia garantía"),null=True,blank=True)
    warranty_end_date = models.DateTimeField(_("Fecha finaliza garantía"),null=True,blank=True)
    calibration_frequency_months = models.PositiveIntegerField(
        _("Frecuencia calibración (meses)"),
        null=True,
        blank=True,
    )
    maintenance_frequency_months = models.PositiveIntegerField(
        _("Frecuencia mantenimiento (meses)"),
        null=True,
        blank=True,
    )

    ecri = models.CharField(_("ECRI"),max_length=80,blank=True)
    invima_registration = models.CharField(_("Registro Invima"),max_length=80,blank=True)
    electrical_safety_class = models.CharField(_("Clase seguridad eléctrica"),max_length=80,blank=True)
    electrical_safety_type = models.CharField(_("Tipo seguridad eléctrica"),max_length=80,blank=True)
    status = models.CharField(
        _("Estado"),
        max_length=20,
        choices=EquipmentStatus.choices,
        default=EquipmentStatus.ACTIVE,
        db_index=True,
    )

    last_calibration = models.DateTimeField(_("Última calibración"),max_length=120,blank=True,null=True)
    last_preventive = models.DateTimeField(_("Último preventivo"),max_length=120,blank=True,null=True)
    next_preventive = models.DateTimeField(_("Próximo preventivo"),max_length=120,blank=True,null=True)
    next_calibration = models.DateTimeField(_("Próxima calibración"),max_length=120,blank=True,null=True)
    corrective_count = models.PositiveIntegerField(_("Número de correctivos."),default=0)

    qr_code = models.FileField(_("Código QR"), upload_to="equipment/qr/", blank=True)
    equipment_image = models.ImageField(_("Imagen del equipo"),upload_to="equipment/image",blank=True,null=True)
    life_sheet_pdf = models.FileField(_("Hoja Vida PDF"),upload_to="equipment/life_sheet",blank=True)
    mtbf_hours = models.DecimalField(
        _("MTBF (horas)"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_(
            "Tiempo promedio entre fallas consecutivas. Recalculado automáticamente."
        ),
    )
    mttr_hours = models.DecimalField(
        _("MTTR (horas)"),
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_(
            "Tiempo promedio para resolver una falla. Recalculado automáticamente."
        ),
    )
    created_at = models.DateTimeField(_("Creado"), auto_now_add=True)
    updated_at = models.DateTimeField(_("Actualizado"), auto_now=True)

    objects = EquipmentManager()

    # field temp
    _warranty_changed:bool = False

    class Meta:
        verbose_name = _("Equipo biomédico")
        verbose_name_plural = _("Equipos biomédicos")
        ordering = ["name"]
        indexes = [
            models.Index(fields=["asset_tag"], name="equipment_asset_tag_idx"),
            models.Index(fields=["branch"], name="equipment_branch_idx"),
            models.Index(fields=["status"], name="equipment_status_idx"),
            models.Index(fields=["equipment_model"], name="equipment_model_idx"),
            models.Index(fields=["risk_class"], name="equipment_risk_class_idx"),
            models.Index(fields=["serial"],name="equipment_serial_idx"),
            models.Index(fields=["software_identifier"],name="equipment_sw_id_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.name} ({self.asset_tag})"

    def estado_garantia(self):

        if self.warranty_end_date is None:
            return None

        today = timezone.now()

        days_to_expiration = (self.warranty_end_date - today).days

        if days_to_expiration <= 0:
            return 'Fecha de garantia vencida'
        elif days_to_expiration <= 10:
            return 'Por vencer (renovar garantia)'
        elif days_to_expiration == 30:
            return 'Cerca de vencimiento'
        else:
            pass


class EquipmentInstruction(models.Model):

    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name="instructions",
    )

    instruction_type = models.CharField(
        max_length=20,
        choices=InstructionType.choices,
        default=InstructionType.PREVENTIVE,
    )

    sequence = models.PositiveIntegerField()

    activity = models.TextField()

    class Meta:

        ordering = ["instruction_type","sequence"]

    def __str__(self):

        return f"{self.equipment.name} - {self.sequence}"

class EquipmentCertificate(models.Model):

    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name="certificates",
    )

    certificate_number = models.CharField(
        max_length=80,
        db_index=True,
    )

    certificate_date = models.DateField()

    responsible = models.CharField(
        max_length=150,
    )

    observations = models.TextField(
        blank=True,
    )

    file = models.FileField(
        upload_to="equipment/certificates/",
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:

        ordering = ["-certificate_date"]

    def __str__(self):
        return self.certificate_number

class EquipmentAttachment(models.Model):

    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name="attachments",
    )

    attachment_type = models.CharField(
        max_length=30,
        choices=AttachmentType.choices,
    )

    title = models.CharField(
        max_length=150,
    )

    file = models.FileField(
        upload_to="equipment/files/",
    )

    uploaded_at = models.DateTimeField(
        auto_now_add=True,
    )

    uploaded_by = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="equipment_attachments"
    )

    def __str__(self):

        return self.title


class EquipmentWorkOrder(models.Model):
    if TYPE_CHECKING:
        id: int
        equipment_id: int
        technician_id: int | None
        schedule_id: int | None
        maintenance_record_id: int | None

    equipment = models.ForeignKey(
        Equipment,
        on_delete=models.CASCADE,
        related_name="work_orders",
    )

    number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True
    )

    service_type = models.CharField(
        max_length=20,
        choices=WorkOrderType.choices,
    )

    start_date = models.DateTimeField()

    end_date = models.DateTimeField(
        null=True,
        blank=True,
    )

    description = models.TextField()

    technician = models.ForeignKey(
        "users.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    # Origen de la orden: se crea sola cuando la gestión asigna un responsable
    # a una solicitud (schedule) o registra un mantenimiento con responsable
    # (maintenance_record). Solo uno de los dos está poblado.
    schedule = models.OneToOneField(
        "scheduling.MaintenanceSchedule",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="work_order",
        verbose_name=_("Solicitud de origen"),
    )
    maintenance_record = models.OneToOneField(
        "maintenance.MaintenanceRecord",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="work_order",
        verbose_name=_("Mantenimiento de origen"),
    )

    status = models.CharField(
        max_length=20,
        choices=WorkOrderStatus.choices,
        default=WorkOrderStatus.PENDING,
    )
    # La columna ya existía en Postgres (NOT NULL, sin default) sin este campo
    # en el modelo: al crear una OT desde un mantenimiento Django no la enviaba
    # y el INSERT fallaba. Default "" para órdenes nuevas / no canceladas.
    cancel_reason = models.TextField(
        _("Motivo de cancelación"),
        blank=True,
        default="",
    )

    report = models.FileField(
        upload_to="equipment/orders/",
        blank=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):

        return self.number
