from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from equipment.reliability import recompute_for

from .models import FailureRecord


@receiver(post_save, sender=FailureRecord)
def recompute_on_save(sender, instance: FailureRecord, **kwargs) -> None:
    recompute_for(instance.equipment)


@receiver(post_delete, sender=FailureRecord)
def recompute_on_delete(sender, instance: FailureRecord, **kwargs) -> None:
    # instance.equipment puede levantar Equipment.DoesNotExist si el equipo se
    # borra en cascada — defensivo: usar equipment_id si existe el equipo aún.
    try:
        equipment = instance.equipment
    except sender._meta.get_field("equipment").related_model.DoesNotExist:
        return
    recompute_for(equipment)
