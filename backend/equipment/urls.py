from rest_framework.routers import DefaultRouter

from workorders.views import (
    WorkOrderCostViewSet,
    WorkOrderEvidenceViewSet,
    WorkOrderMeasurementViewSet,
    WorkOrderSignatureViewSet,
    WorkOrderSparePartViewSet,
)

from .views import (
    EquipmentAttachmentViewSet,
    EquipmentCertificateViewSet,
    EquipmentInstructionViewSet,
    EquipmentViewSet,
    EquipmentWorkOrderViewSet,
)

app_name = "equipment"

router = DefaultRouter()
router.register(r"attachments", EquipmentAttachmentViewSet, basename="equipment-attachment")
router.register(r"certificates",EquipmentCertificateViewSet,basename="equipment-certificate")
router.register(r"instructions",EquipmentInstructionViewSet,basename="equipment-instruction")
router.register(r"work-orders",EquipmentWorkOrderViewSet,basename="equipment-work-order")
router.register(r"work-order-spare-parts",WorkOrderSparePartViewSet,basename="work-order-spare-part")
router.register(r"work-order-measurements",WorkOrderMeasurementViewSet,basename="work-order-measurement")
router.register(r"work-order-evidences",WorkOrderEvidenceViewSet,basename="work-order-evidence")
router.register(r"work-order-signatures",WorkOrderSignatureViewSet,basename="work-order-signature")
router.register(r"work-order-costs",WorkOrderCostViewSet,basename="work-order-cost")
router.register(r"",EquipmentViewSet,basename="equipment")

urlpatterns = router.urls
