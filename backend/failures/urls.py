from rest_framework.routers import DefaultRouter

from .views import FailureRecordViewSet

app_name = "failures"

router = DefaultRouter()
router.register(r"", FailureRecordViewSet, basename="failure")

urlpatterns = router.urls
