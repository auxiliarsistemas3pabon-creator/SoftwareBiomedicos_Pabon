# PBioSoft

Sistema de Gestión de Equipos Biomédicos: inventario de equipos, mantenimiento
preventivo/correctivo, fallas, agendamiento y usuarios por sede, para una
clínica. El repo tiene tres proyectos independientes que comparten una misma
API:

| Carpeta | Qué es | Stack |
|---|---|---|
| [`backend/`](backend) | Backend / API REST | Django + DRF + Postgres + Redis/Celery |
| [`frontend/`](frontend) | Frontend web (panel admin) | React + Vite + TypeScript |
| [`EbMobile/`](EbMobile) | App móvil (réplica funcional del web) | React Native + Expo |

Este README es la guía común del repositorio. La documentación se irá
ampliando aquí por módulos para facilitar la continuidad del desarrollo.

## Arquitectura

```
                      ┌─────────────────────┐
                      │   backend      │
                      │   Django + DRF        │
                      │   :8000               │
                      └─────┬──────────┬─────┘
                            │          │
                 cookies httpOnly   Bearer token
                    (mismo origen)   (header Authorization)
                            │          │
              ┌─────────────┘          └─────────────┐
              ▼                                       ▼
  ┌───────────────────────┐              ┌───────────────────────┐
  │ frontend│              │       EbMobile         │
  │  React + Vite (web)    │              │  React Native + Expo   │
  │  :5173 (proxy /api)    │              │                        │
  └───────────────────────┘              └───────────────────────┘
```

El backend expone una única API en `/api/v1/`, pero autentica a cada cliente
de forma distinta (ver [`backend/common/authentication.py`](backend/common/authentication.py)):

- **Web**: login devuelve el JWT como cookies `httpOnly` (no accesibles desde
  JS, protección contra robo por XSS). En dev, el proxy de Vite hace que
  frontend y backend compartan origen; en prod, nginx cumple ese mismo rol.
- **Móvil**: login clásico, el JWT viaja en el header `Authorization: Bearer`
  y se guarda en `expo-secure-store` (Keychain/EncryptedSharedPreferences).

`frontend` y `EbMobile` son intencionalmente una "réplica
funcional" el uno del otro (mismas reglas de negocio, permisos por rol y
normalización de errores) — ver el porqué en
[`EbMobile/DOCUMENTACION.md`](EbMobile/DOCUMENTACION.md#13-reuso-de-conocimiento-del-web).
Como consecuencia, `src/types/` y `src/services/` están duplicados a mano
entre ambos proyectos. Para que esa duplicación no se desincronice con el
contrato real de la API, el backend expone su schema OpenAPI y ambos
frontends pueden regenerar sus tipos desde ahí — ver
["Tipos generados desde el schema OpenAPI"](#tipos-generados-desde-el-schema-openapi).

## Levantar todo en local

```bash
# 1. Backend (Postgres + Redis + Django)
cd backend
cp .env.example .env
docker compose --profile autoheal up -d
# -> API en http://localhost:8010, docs en http://localhost:8010/api/docs/

# 2. Frontend web
cd ../frontend
cp .env.example .env
pnpm install && pnpm dev
# -> http://127.0.0.1:5173 (el proxy de Vite habla con :8000)

# 3. App móvil (en otra terminal, opcional)
cd ../EbMobile
cp .env.example .env   # ajustar la IP según simulador/emulador/dispositivo físico
npm install && npm start
```

El perfil `autoheal` reinicia el contenedor del API si su health check falla.
Usa acceso al socket de Docker, que concede control elevado sobre el daemon;
actívalo solo en entornos locales de confianza. El compose de producción no
activa este perfil.

Cada subproyecto documenta sus variables de entorno en su propio
`.env.example`; la única realmente distinta entre web y móvil es la URL base
de la API (relativa + proxy en web, absoluta en móvil — ver el `.env.example`
de `EbMobile` para las variantes según simulador/emulador/dispositivo físico).

## Referencias del proyecto

- **Backend**: [`backend/docs/postman/`](backend/docs/postman) (colección Postman) y Swagger/Redoc en
  `/api/docs/` y `/api/redoc/` con el servidor corriendo.
- **Móvil**: [`EbMobile/DOCUMENTACION.md`](EbMobile/DOCUMENTACION.md) (documento técnico extendido, incluye el porqué de cada decisión de stack)

La documentación general y de módulos se mantiene en este README raíz; los
README secundarios de `backend/` y `frontend/` se conservan vacíos.

## Tipos generados desde el schema OpenAPI

`backend` expone su schema OpenAPI (drf-spectacular). En vez de que
cada frontend le pegue a un backend corriendo para generar tipos, el schema
queda **versionado como archivo** en
[`backend/docs/openapi-schema.yaml`](backend/docs/openapi-schema.yaml)
— así regenerar tipos en el frontend no depende de tener Docker levantado, y
el propio `openapi-schema.yaml` sirve como diff legible del contrato de la
API en cada PR que toque el backend.

Cuando cambias algo en `backend` (un modelo, un serializer, una vista),
regeneras ese archivo:

```bash
cd backend
docker compose --profile autoheal up -d  # o cualquier entorno con el venv activo
docker compose exec web python manage.py spectacular \
  --file docs/openapi-schema.yaml --settings=config.settings.dev
```

Y luego, en cada frontend, regeneras sus tipos a partir de ese archivo (no
necesita el backend corriendo, solo el `.yaml` actualizado):

```bash
cd frontend && npm run generate:api-types
cd EbMobile && npm run generate:api-types
```

Esto produce `src/types/api-schema.d.ts` en cada proyecto (versionado en git,
igual que el schema). Los tipos escritos a mano en `src/types/*.ts` **no se
reemplazaron** por esto — es una herramienta para ir migrando gradualmente y,
mientras tanto, para detectar en revisión de código cuándo un cambio del
backend afecta a los frontends, sin depender de acordarse de actualizar los
dos a mano.

## Módulos documentados

La API Django agrupa modelos, vistas, serializers, filtros y pruebas dentro
de cada aplicación. Las rutas se exponen bajo `/api/v1/`.

### `branches` — sedes

Administra las sedes donde se ubican los equipos. El modelo `Branch` guarda
nombre, dirección, ciudad, teléfono, correo opcional y estado activo. Su API
está en `/api/v1/branches/`.

Los equipos referencian su sede y la protegen contra borrado: una sede con
equipos asociados no se puede eliminar. Para dejar de ofrecerla, se puede
marcar como inactiva. Modelo, API y pruebas están en `backend/branches/`.
En el frontend web se administra desde **Sedes** (`/admin/sedes`),
implementada en [`SedesPage.tsx`](frontend/src/pages/admin/equipment/SedesPage.tsx).

### `catalog` — marcas y modelos

Mantiene `Brand` y `EquipmentModel`, usados para clasificar el inventario.
Cada modelo pertenece a una marca; el nombre del modelo debe ser único dentro
de esa marca. Un nombre igual sí puede existir para otra marca. La API está
en `/api/v1/catalog/brands/` y `/api/v1/catalog/equipment-models/`.

Las marcas y modelos tienen estado activo. Los equipos no pueden seleccionar
un modelo inactivo ni uno cuya marca esté inactiva. Si están relacionados con
modelos o equipos, respectivamente, no se pueden borrar: se pueden desactivar.
Código y pruebas están en `backend/catalog/`.
En el frontend web, marcas y modelos se gestionan dentro de **Equipos**
mediante [`MarcasModelosPanel.tsx`](frontend/src/pages/admin/equipment/catalog/MarcasModelosPanel.tsx);
no tienen una ruta independiente.

### `equipment` — inventario biomédico

Administra equipos identificados por una placa (`asset_tag`) única, con datos
de modelo, sede, ubicación, estado, compra, garantía, mantenimiento y
clasificación. La API principal está en `/api/v1/equipment/`; incluye
búsqueda, filtros, consulta por placa y el historial de mantenimientos.

También contiene los documentos de la hoja de vida (instrucciones,
certificados y adjuntos) y las órdenes de trabajo con sus repuestos,
mediciones, evidencias, firmas y costos. Al crear un equipo se genera un QR;
los archivos se guardan fuera de PostgreSQL. Los técnicos solo consultan
equipos de su área. La importación inicial o actualización por placa se hace
con `python manage.py import_equipment archivo.csv`.
El frontend web ofrece **Equipos** (`/admin/equipos`), la ficha y su historial
en `/admin/equipos/:id`, y **Etiquetas QR** (`/admin/equipos/etiquetas`).
Las vistas principales son [`EquiposPage.tsx`](frontend/src/pages/admin/equipment/EquiposPage.tsx),
[`EquipoDetallePage.tsx`](frontend/src/pages/admin/equipment/EquipoDetallePage.tsx)
y [`EtiquetasQrPage.tsx`](frontend/src/pages/admin/equipment/EtiquetasQrPage.tsx).

### `workorders` — órdenes de trabajo

Gestiona la ejecución de trabajos sobre los equipos. La orden (`EquipmentWorkOrder`)
incluye número único, equipo, tipo de servicio (preventivo, correctivo,
calibración, instalación o inspección), fechas, descripción, responsable,
estado (pendiente, en proceso, terminada o cancelada) y un informe opcional.
Las rutas están bajo `/api/v1/equipment/`: órdenes en `work-orders/` y
acciones de detalle en `work-orders/{id}/details/` y
`work-orders/{id}/complete/`. Las entidades relacionadas tienen endpoints para
repuestos (`work-order-spare-parts/`), mediciones (`work-order-measurements/`),
evidencias (`work-order-evidences/`), firmas (`work-order-signatures/`) y
costos (`work-order-costs/`).

Superadmin, admin y coordinador tienen acceso completo; ingenieros pueden
consultar, crear y editar sus propias órdenes, pero no borrarlas. El permiso
`work_orders` no está habilitado actualmente para el rol técnico, aunque una
solicitud o mantenimiento puede generar una orden asignada a un técnico.
Repuestos, mediciones, evidencias, firmas y costos se pueden administrar
mientras la orden no esté terminada; sus detalles quedan de solo lectura al
cerrarse. El total del repuesto se calcula a partir de cantidad y costo
unitario, y los costos registran mano de obra, repuestos, transporte y otros.

Al completar una orden se requiere una nota de observaciones y se establece
la fecha de fin. Si está vinculada a una solicitud de mantenimiento, esta se
marca cumplida; también se crea o actualiza el registro del mantenimiento del
equipo. Opcionalmente, al completar se puede registrar una falla resuelta.
Las órdenes asignadas desde `scheduling` o `maintenance` se crean
automáticamente; las órdenes independientes generan su registro histórico al
terminarse.

El comando `python manage.py import_workorders archivo.csv` importa órdenes
por número (identificador único, sin distinguir mayúsculas/minúsculas) y
admite `--dry-run`. No importa los adjuntos ni los datos relacionados de
repuestos, mediciones, evidencias, firmas o costos. El modelo de la orden y
sus endpoints están en `backend/equipment/`; los modelos y endpoints de sus
detalles están en `backend/workorders/`. Las pruebas de órdenes están en
`backend/equipment/tests/test_work_orders.py`.
En el frontend web, la vista **Órdenes de trabajo** (`/admin/ordenes-trabajo`)
está en [`OrdenesTrabajoPage.tsx`](frontend/src/pages/admin/equipment/workorders/OrdenesTrabajoPage.tsx);
incluye el detalle, registro de intervención y cierre.

### `failures` — reportes de fallas

Registra fallas asociadas a equipos, con descripción, severidad (baja, media,
alta o crítica), fecha, reportante y estado de resolución. La API está en
`/api/v1/failures/`; incluye operaciones CRUD y `POST /{id}/resolve/` para
resolver un reporte con notas opcionales. Se puede filtrar por equipo, sede,
área, severidad, estado y rango de fechas.

Superadmin y admin tienen acceso completo; coordinador e ingeniero pueden
consultar, crear y editar, pero no borrar; técnico puede consultar y crear.
Un técnico solo ve sus propios reportes de equipos de su área y no puede
marcarlos resueltos ni agregar notas de resolución. Las fechas de reporte no
pueden ser futuras y la fecha de resolución no puede ser anterior a la del
reporte.

La importación CSV se hace con `python manage.py import_failures archivo.csv`;
acepta `--dry-run` y actualiza registros por equipo y fecha/hora de reporte.
Modelo, API, comando y pruebas están en `backend/failures/`.
En el frontend web se gestionan desde **Reportes de falla**
(`/admin/fallas`), en [`FallasPage.tsx`](frontend/src/pages/admin/failures/FallasPage.tsx),
con formularios y una acción para registrar la resolución.

### `maintenance` — historial de mantenimientos

Registra el mantenimiento realizado a cada equipo en `MaintenanceRecord`.
Cada registro incluye tipo (preventivo, correctivo, reparación, calibración o
inspección), fecha, descripción, observaciones, costo opcional, responsables y
PDF opcional. La API CRUD está en `/api/v1/maintenance/records/`; permite
filtrar por equipo, sede, tipo, rango de fechas y responsable. No se admiten
fechas futuras ni costos negativos.

El coordinador puede crear, editar y eliminar registros; admin y
superadmin pueden consultarlos. Técnicos e ingenieros ejecutan el trabajo
desde órdenes de trabajo: los registros vinculados a órdenes abiertas no se
muestran en el historial para estos roles. Al asignar un responsable a un
registro se genera una orden de trabajo; al terminarla se actualizan la fecha
y el costo del historial. Una orden creada directamente también genera un
registro cuando se termina.

Un registro puede vincularse con un agendamiento; al crearlo o enlazarlo, el
agendamiento queda cumplido y, al borrar el registro, se vuelve a abrir. Los
PDF se validan y almacenan como archivos, no dentro de PostgreSQL. Para cargar
registros desde CSV se usa `python manage.py import_maintenance archivo.csv`;
el comando actualiza por equipo, fecha y tipo, y admite `--dry-run`. Modelo,
API, importación y pruebas están en `backend/maintenance/`.
La vista web **Mantenimientos** (`/admin/mantenimientos`) está implementada en
[`MantenimientosPage.tsx`](frontend/src/pages/admin/maintenance/MantenimientosPage.tsx).
El detalle histórico también se consulta desde las pestañas de la ficha del
equipo.

### `users` — usuarios y roles

Administra las cuentas que acceden al sistema. El modelo `User` guarda nombre
de usuario, correo único, nombres, teléfono, rol y área. La contraseña se
almacena con hash y nunca se devuelve en las respuestas de la API.

Los roles disponibles son `superadmin`, `admin`, `coordinador`, `ingeniero`,
`tecnico` y `usuario`. El área se usa para limitar los equipos que puede
consultar un usuario con rol `tecnico`.

La API está en `/api/v1/users/`: permite listar y gestionar cuentas según el
rol, consultar el perfil propio (`me`) y cambiar contraseña
(`{id}/set_password/`). Solo un superadministrador puede crear, promover o
modificar otra cuenta de superadministrador. Un usuario no puede cambiar su
propio rol/estado ni eliminar su propia cuenta; los cambios sensibles se
registran en auditoría.

El comando `python manage.py import_users archivo.csv` permite importar o
actualizar cuentas por nombre de usuario; acepta `--dry-run` para validar sin
guardar. El modelo, API, comando y pruebas están en `backend/users/`.
La administración de cuentas está en **Usuarios** (`/admin/usuarios`),
[`UsuariosPage.tsx`](frontend/src/pages/admin/users/UsuariosPage.tsx); el
perfil de la sesión actual está en **Mi perfil** (`/admin/perfil`),
[`PerfilPage.tsx`](frontend/src/pages/admin/PerfilPage.tsx).

### `dashboard` — resumen operativo

Expone `GET /api/v1/dashboard/summary/`, disponible para usuarios
autenticados. Devuelve KPIs de equipos, fallas, agendamientos y mantenimientos;
distribuciones por estado y severidad, series temporales, mantenimientos
vencidos, equipos con menor MTBF y tareas del usuario. Incluye datos
complementarios para operación por área y tareas de ingeniería; algunas
series de costos y programación se entregan solo a coordinación y
superadministración. Para técnicos, varias métricas de mantenimiento y
agendamiento se limitan a sus asignaciones. Si existen agendamientos vencidos,
el endpoint encola las alertas en tiempo real. Implementación y pruebas están
en `backend/dashboard/`.
La vista web del panel es [`DashboardPage.tsx`](frontend/src/pages/admin/dashboard/DashboardPage.tsx)
en `/admin`; presenta widgets y secciones adaptados al rol, incluidas las
vistas de operación por área y tareas de ingeniería.

### `scheduling` — solicitudes y programación

Administra solicitudes preventivas y de reparación para equipos. Cada
solicitud registra equipo, solicitante, fecha de solicitud, fecha programada
(opcional), notas, responsable y estado de cumplimiento. La API está en
`/api/v1/scheduling/maintenances/`; permite filtrar por equipo, sede, área,
tipo, fechas, solicitante, asignado y estado, y ofrece las acciones
`POST /{id}/complete/` y `POST /{id}/notify/`.

Superadmin, admin y coordinador pueden gestionar todas las solicitudes. El
ingeniero solo puede consultarlas; el técnico y el usuario pueden consultar
y crear. Técnicos ven las que solicitaron o tienen asignadas; ingenieros, las
que solicitaron o tienen asignadas; usuarios, solo las que solicitaron. Al
editar una solicitud, equipo y tipo quedan fijos; al crearla, el equipo debe
estar activo y la fecha programada no puede ser pasada.

Al crear una solicitud o asignar un responsable se encola una notificación por
correo. Asignar un responsable también crea una orden de trabajo; al terminar
esa orden, la solicitud queda cumplida y se genera el registro del
mantenimiento. Las solicitudes abiertas actualizan el estado del equipo a
«En mantenimiento» o «En reparación». El panel encola avisos en tiempo real
para las solicitudes vencidas que siguen abiertas.

Se pueden importar solicitudes con `python manage.py import_schedules
archivo.csv`; acepta cabeceras en inglés y algunos nombres habituales de las
hojas de órdenes, y `--dry-run` para procesar sin guardar. El upsert se hace
por equipo, fecha de solicitud y tipo. Modelo, API, importación, tareas y
pruebas están en `backend/scheduling/`.
En el frontend web, **Solicitudes** y **Solicitudes pendientes** comparten la
vista [`AgendamientosPage.tsx`](frontend/src/pages/admin/scheduling/AgendamientosPage.tsx)
en `/admin/agendamientos`; las acciones disponibles dependen del rol.

### `common` — utilidades compartidas de la API

No representa un módulo de negocio; concentra funciones usadas por las
aplicaciones del backend. Incluye autenticación JWT
por header o cookie `httpOnly` (con verificación CSRF para mutaciones por
cookie), permisos por rol y recurso, alcance por área para técnicos,
paginación y validación de archivos subidos (extensión, tamaño y firma del
contenido). También contiene vistas de autenticación y
`GET /api/v1/health/`, que informa el estado de PostgreSQL y Redis.
Sus cambios pueden afectar endpoints de varias aplicaciones; el código está
en `backend/common/`.
No tiene una pantalla propia: lo utilizan las vistas de autenticación
[`LoginPage.tsx`](frontend/src/pages/LoginPage.tsx),
[`RecuperarPasswordPage.tsx`](frontend/src/pages/RecuperarPasswordPage.tsx)
y las páginas protegidas del panel.

### `audit` — registro de auditoría

Proporciona `AuditLog` para registrar acciones sensibles con actor, acción
(creación, actualización o eliminación), modelo y objeto afectados, cambios,
IP y fecha. No expone una API propia; los eventos se generan cuando las vistas
invocan explícitamente `log_audit_event` o usan `AuditLogMixin`, y se pueden
consultar desde Django Admin. No todas las modificaciones se registran
automáticamente. Implementación y pruebas están en `backend/audit/`.
No hay una vista de auditoría en el frontend web; los registros se consultan
desde Django Admin.

### `realtime` — notificaciones en tiempo real

Usa Django Channels y Redis para el WebSocket `/ws/notifications/`. El
handshake autentica mediante JWT en cookie o header; el canal es de solo
lectura y entrega eventos a grupos individuales por usuario autorizado.
Actualmente se emiten eventos por notificación de correo de agendamiento y
por mantenimientos vencidos. No tiene modelos propios; el consumer,
autenticación ASGI y publicación de eventos están en `backend/realtime/`.
No tiene una página independiente en el frontend: los eventos recibidos se
muestran como notificaciones toast globales desde
[`NotificationContext.tsx`](frontend/src/context/NotificationContext.tsx).

Al cambiar estos módulos, revisar conjuntamente modelos, serializers, vistas,
filtros y pruebas; crear las migraciones necesarias y mantener actualizado el
schema OpenAPI. Las pruebas de estos módulos se ejecutan desde `backend/`:

```bash
docker compose exec web pytest audit/tests branches/tests catalog/tests dashboard/tests equipment/tests failures/tests maintenance/tests realtime/tests scheduling/tests users/tests -q
```

> Nota: 3 endpoints basados en `APIView` sin `serializer_class`
> (`CookieTokenLogoutView`, `CookieTokenRefreshView`, `DashboardSummaryView`)
> no tienen tipado fino en el schema todavía — drf-spectacular hace fallback
> genérico para esos. Se puede refinar con `@extend_schema` si en algún
> momento hace falta el tipo exacto ahí.
