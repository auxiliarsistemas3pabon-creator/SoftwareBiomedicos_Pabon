from unittest.mock import patch

import pytest

from equipment.tasks import _send_alert


@pytest.mark.parametrize(
    ("configured_recipients", "expected_recipients"),
    [
        ("alerts@example.com, maintenance@example.com", [
            "alerts@example.com",
            "maintenance@example.com",
        ]),
        (["alerts@example.com"], ["alerts@example.com"]),
        (("alerts@example.com",), ["alerts@example.com"]),
    ],
)
def test_send_alert_passes_recipients_as_list(
    settings, configured_recipients, expected_recipients
):
    settings.EXPIRED_NOTIFICATION_EMAILS = configured_recipients

    with patch("equipment.tasks.send_mail") as send_mail:
        _send_alert({"days_to_expiration": 30, "name": "Equipo de prueba"})

    assert send_mail.call_args.args[3] == expected_recipients


def test_send_alert_rejects_invalid_recipient_configuration(settings):
    settings.EXPIRED_NOTIFICATION_EMAILS = 42

    with pytest.raises(TypeError, match="EXPIRED_NOTIFICATION_EMAILS"):
        _send_alert({"days_to_expiration": 30, "name": "Equipo de prueba"})
