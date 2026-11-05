from rest_framework.routers import DefaultRouter

from .views import MaintenanceRecordViewSet

app_name = "maintenance"

router = DefaultRouter()
router.register(r"records", MaintenanceRecordViewSet, basename="record")

urlpatterns = router.urls
