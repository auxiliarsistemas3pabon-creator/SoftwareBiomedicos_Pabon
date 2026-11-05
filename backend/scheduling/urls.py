from rest_framework.routers import DefaultRouter

from .views import MaintenanceScheduleViewSet

app_name = "scheduling"

router = DefaultRouter()
router.register(r"maintenances", MaintenanceScheduleViewSet, basename="maintenance")

urlpatterns = router.urls
