from datetime import date

import pytest
from django.core.management import call_command

from equipment.models import EquipmentStatus
from equipment.tests.factories import EquipmentFactory
from scheduling.models import MaintenanceSchedule, ScheduledMaintenanceKind

pytestmark = pytest.mark.django_db


def test_importa_hoja_con_punto_y_coma_y_fecha_con_hora(tmp_path):
    equipment = EquipmentFactory(name="Monitor de prueba", asset_tag="EQ-100")
    path = tmp_path / "datos_convertidos.csv"
    path.write_text(
        "Equipo;Tipo de solicitud;Fecha de solicitud;Fecha inicia orden;Ubicación;"
        "Recibido a satisfacción\n"
        "Monitor de prueba;Correctivo;01/02/2024 8:30:00;02/02/2024;UCI;SI\n",
        encoding="utf-8-sig",
    )

    call_command("import_schedules", str(path))

    schedule = MaintenanceSchedule.objects.get()
    assert schedule.equipment_id == equipment.id
    assert schedule.kind == ScheduledMaintenanceKind.REPAIR
    assert schedule.requested_date == date(2024, 2, 1)
    assert schedule.scheduled_date == date(2024, 2, 2)
    assert schedule.is_completed is True
    assert "UCI" in schedule.notes


def test_codigo_equipo_tiene_prioridad_y_no_invierte_el_mes(tmp_path):
    equipment = EquipmentFactory(asset_tag="PLACA-9", name="Nombre largo")
    path = tmp_path / "ordenes.csv"
    path.write_text(
        "Código equipo,Equipo,Tipo de solicitud,Fecha de solicitud\n"
        "PLACA-9,Nombre largo,Mantenimiento preventivo,2024-06-01 00:00:00\n",
        encoding="utf-8",
    )

    call_command("import_schedules", str(path))

    schedule = MaintenanceSchedule.objects.get()
    assert schedule.equipment_id == equipment.id
    assert schedule.kind == ScheduledMaintenanceKind.PREVENTIVE
    assert schedule.requested_date == date(2024, 6, 1)
    assert "Nombre largo" in schedule.notes


def test_fecha_vacia_usa_inicio_de_orden_y_omite_tipo_desconocido(tmp_path):
    EquipmentFactory(asset_tag="EQ-200", name="Bomba de prueba")
    path = tmp_path / "ordenes.csv"
    path.write_text(
        "Equipo,Tipo de solicitud,Fecha de solicitud,Fecha inicia orden\n"
        "EQ-200,Preventivo,,15/03/2024\n"
        "EQ-200,Calibración,01/01/2024,\n"
        "EQ-200,Correctivo,,\n",
        encoding="utf-8",
    )

    call_command("import_schedules", str(path))

    schedule = MaintenanceSchedule.objects.get()
    assert schedule.kind == ScheduledMaintenanceKind.PREVENTIVE
    assert schedule.requested_date == date(2024, 3, 15)
    assert MaintenanceSchedule.objects.count() == 1


def test_ignora_nt_y_toma_la_placa_del_texto(tmp_path):
    equipment = EquipmentFactory(asset_tag="004282", name="Lampara de prueba", serial="SN-OTRA")
    path = tmp_path / "ordenes.csv"
    path.write_text(
        "Codigo equipo,Equipo,Tipo de solicitud,Fecha de solicitud\n"
        'N.T.,"LAMPARA DE PRUEBA Serial: SN-9 Placa: 004282",Correctivo,01/02/2024\n'
        "N.T.,N.T.,Correctivo,02/02/2024\n",
        encoding="utf-8",
    )

    call_command("import_schedules", str(path))

    schedule = MaintenanceSchedule.objects.get()
    assert schedule.equipment_id == equipment.id
    assert schedule.requested_date == date(2024, 2, 1)


def test_placa_con_ceros_coincide_con_la_placa_guardada(tmp_path):
    equipment = EquipmentFactory(asset_tag="4282", name="Otro equipo")
    path = tmp_path / "ordenes.csv"
    path.write_text(
        "Codigo equipo,Equipo,Tipo de solicitud,Fecha de solicitud\n"
        'N.T.,"EQUIPO DE PRUEBA Serial: SN-1 Placa: 004282",Preventivo,03/03/2024\n',
        encoding="utf-8",
    )

    call_command("import_schedules", str(path))

    schedule = MaintenanceSchedule.objects.get()
    assert schedule.equipment_id == equipment.id


def test_no_importa_equipo_inactivo(tmp_path):
    EquipmentFactory(asset_tag="EQ-OFF", status=EquipmentStatus.INACTIVE)
    path = tmp_path / "ordenes.csv"
    path.write_text(
        "asset_tag,kind,requested_date\nEQ-OFF,REPAIR,2024-01-15\n",
        encoding="utf-8",
    )

    call_command("import_schedules", str(path))

    assert MaintenanceSchedule.objects.count() == 0
