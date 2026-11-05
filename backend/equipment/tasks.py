from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail

from .models import Equipment
from .serializers import EquipmentSerializer


def _notification_recipients() -> list[str]:
    recipients = settings.EXPIRED_NOTIFICATION_EMAILS
    if isinstance(recipients, str):
        return [address.strip() for address in recipients.split(",") if address.strip()]
    if isinstance(recipients, (list, tuple)) and all(
        isinstance(address, str) for address in recipients
    ):
        return [address.strip() for address in recipients if address.strip()]
    raise TypeError(
        "EXPIRED_NOTIFICATION_EMAILS must be a comma-separated string, list, or tuple"
    )


def _send_alert(equipment:dict) -> None:
    """
        Envia una notificacion cuando la fecha de garantia
        del equipo expiro

    """
    days_to_expiration = equipment['days_to_expiration']
    if days_to_expiration is None:
        return

    if days_to_expiration <= 30:
        print(f"Equipo {equipment["name"]} expira en {days_to_expiration} dias.")
        send_mail(
            'Expiration Alert',
            f'Equipo  {equipment['name']} expirara en {days_to_expiration} dias.',
            'pabonsoftware2026@gmail.com',
            _notification_recipients(),
            fail_silently=False
        )
    elif days_to_expiration <= 15:
        send_mail(
            'Expiration Alert',
            f'Equipo {equipment["name"]} proximo a vencer en {days_to_expiration} dias!!!.',
            'pabonsoftware2026@gmail.com',
            _notification_recipients(),
            fail_silently=False
        )
    elif days_to_expiration == 0:
        send_mail(
            'Expiration Alert!',
            f'Equipo {equipment["name"]} vencido, renovar garantia',
            'pabonsoftware2026@gmail.com',
            _notification_recipients(),
            fail_silently=False
        )
    else:
        return None


@shared_task
def verify_equipment_expiry():
    """
    Valida si un equipo
    expiro.
    """
    print('Task running')
    equipments = Equipment.objects.all()
    print(equipments)
    serializer = EquipmentSerializer(equipments,many=True)
    for equipment in serializer.data:
        _send_alert(equipment)


@shared_task
def check_equipment_expiry(equipment_id:int):
    eq = Equipment.objects.get(pk=equipment_id)
    _send_alert(EquipmentSerializer(eq).data)
