import pytest

from branches.tests.factories import BranchFactory
from users.tests.factories import TecnicoFactory

from ..models import AuditAction, AuditLog
from ..utils import log_audit_event

pytestmark = pytest.mark.django_db


class FakeRequest:
    def __init__(self, ip: str):
        self.META = {"REMOTE_ADDR": ip}


class TestLogAuditEvent:
    def test_creates_record_with_actor_and_ip(self):
        actor = TecnicoFactory()
        branch = BranchFactory()

        log = log_audit_event(
            actor, AuditAction.DELETE, branch, request=FakeRequest("10.0.0.5")
        )

        assert AuditLog.objects.count() == 1
        assert log.actor_id == actor.id
        assert log.action == AuditAction.DELETE
        assert log.model_label == "branches.branch"
        assert log.object_id == str(branch.id)
        assert log.ip_address == "10.0.0.5"

    def test_anonymous_actor_is_stored_as_null(self):
        branch = BranchFactory()

        log = log_audit_event(None, AuditAction.UPDATE, branch)

        assert log.actor is None

    def test_uses_x_forwarded_for_when_present(self):
        actor = TecnicoFactory()
        branch = BranchFactory()
        request = FakeRequest("10.0.0.5")
        request.META["HTTP_X_FORWARDED_FOR"] = "203.0.113.9, 10.0.0.5"

        log = log_audit_event(actor, AuditAction.DELETE, branch, request=request)

        assert log.ip_address == "203.0.113.9"
