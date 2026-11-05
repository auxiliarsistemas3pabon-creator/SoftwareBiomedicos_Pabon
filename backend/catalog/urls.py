from rest_framework.routers import DefaultRouter

from .views import BrandViewSet, EquipmentModelViewSet

app_name = "catalog"

router = DefaultRouter()
router.register(r"brands", BrandViewSet, basename="brand")
router.register(r"equipment-models", EquipmentModelViewSet, basename="equipment-model")

urlpatterns = router.urls
