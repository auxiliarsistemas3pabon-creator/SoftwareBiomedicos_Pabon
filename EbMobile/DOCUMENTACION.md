# Sistema de Gestión de Equipos Biomédicos — Aplicación móvil

> Documento técnico para el trabajo de grado.
> Aplicación móvil (iOS / Android) desarrollada para Clínica Pabón.
> **Réplica funcional** del frontend web ([../equipos-biomedicos](../equipos-biomedicos)),
> consumiendo la **misma API** (`http://localhost:8010/api/v1`).

---

## 1. ¿Por qué React Native + Expo?

La versión móvil reusa el ecosistema React del frontend web, lo que permite compartir patrones, tipos, lógica de servicios y hasta la **paleta de colores y tokens** de Tailwind. La elección concreta es:

### 1.1 React Native
React Native es un framework de Facebook/Meta que permite construir aplicaciones móviles **nativas** para iOS y Android usando React. La diferencia clave con React web es que en lugar de generar HTML/CSS, los componentes JSX se compilan a **vistas nativas** (`UIView` en iOS, `View` en Android). Eso permite reutilizar el modelo mental de componentes, hooks y context que ya se usaba en la web.

### 1.2 Expo (SDK 54)
**Expo** es la plataforma estándar para desarrollar y empaquetar apps de React Native. Aporta:

- **Expo Go**: app de previsualización para correr el proyecto en un dispositivo físico sin compilar nada.
- **Configuración cero** para iOS Simulator y Android Emulator (`npm run ios` / `npm run android`).
- **Módulos nativos preempaquetados** para storage seguro, cámara, notificaciones, etc.
- **EAS Build / Submit** para generar binarios firmados y publicarlos en stores cuando llegue el momento.

> **Referencia:** [https://docs.expo.dev/](https://docs.expo.dev/)
> **Referencia:** [https://reactnative.dev/](https://reactnative.dev/)

### 1.3 Reuso de conocimiento del web
Los hooks (`useState`, `useEffect`, `useContext`), Context API, Axios y la estructura por servicios son **idénticos** al frontend web. Lo único que cambia son las primitivas visuales: en lugar de `<div>` / `<button>` / `<input>`, se usan `<View>` / `<Pressable>` / `<TextInput>`. Esto reduce la curva de aprendizaje del equipo y mantiene una única fuente de verdad para las reglas de negocio (permisos, normalización de errores, refresco de tokens, etc.).

---

## 2. Lenguaje: TypeScript

Toda la app está escrita en **TypeScript** (igual que el web). La carpeta [src/types/](src/types/) es prácticamente una copia 1:1 de la del web — las interfaces de `Equipment`, `Branch`, `MaintenanceRecord`, `FailureReport`, `Usuario`, etc. se comparten conceptualmente.

> **Referencia:** [https://www.typescriptlang.org/](https://www.typescriptlang.org/)

---

## 3. Componentes principales utilizados de React Native

### 3.1 Componentes funcionales
Toda la UI son componentes funcionales que reciben props y retornan JSX, igual que en el web.

### 3.2 Hooks
Mismo set de hooks que el web (`useState`, `useEffect`, `useContext`, `useCallback`, `useMemo`, `forwardRef`).

### 3.3 Primitivas RN clave

| Primitiva | Equivalente web | Uso |
|---|---|---|
| `<View>` | `<div>` | Contenedor de layout |
| `<Text>` | `<span>`, `<p>`, `<h1>` | **Único** lugar donde puede renderizarse texto |
| `<Pressable>` | `<button>` (o `onClick`) | Cualquier interacción táctil con feedback |
| `<TextInput>` | `<input type="text">` | Entrada de texto |
| `<ScrollView>` / `<FlatList>` | scroll vertical del navegador | Listas largas; `FlatList` virtualiza |
| `<Modal>` | `dialog` + portal | Diálogos modales nativos |
| `<RefreshControl>` | — | Pull-to-refresh nativo |
| `<KeyboardAvoidingView>` | — | Evita que el teclado tape inputs |
| `<SafeAreaView>` | — | Respeta notch / home indicator de iOS |
| `<ActivityIndicator>` | spinner CSS | Loader nativo |

> **Referencia:** [https://reactnative.dev/docs/components-and-apis](https://reactnative.dev/docs/components-and-apis)

### 3.4 Context API
Mismos dos contextos que el web:

- [`ThemeContext`](src/context/ThemeContext.tsx) — modo claro/oscuro, sincronizado con `Appearance` del sistema y persistido en `AsyncStorage`.
- [`AuthContext`](src/context/AuthContext.tsx) — usuario autenticado, `login` / `logout` / `refreshUser`. La hidratación al abrir la app combina **SecureStore** (tokens) + **AsyncStorage** (perfil cacheado).

---

## 4. Librerías externas instaladas

### 4.1 React Navigation (`@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/drawer`)
Estándar de facto para navegación en RN. La app usa:
- **Native Stack** para el flujo público (Login, Registro, Recuperar contraseña).
- **Drawer** (cajón lateral) para el área autenticada con todas las secciones del admin (Dashboard, Equipos, Mantenimientos, Agendamientos, Fallas, Sedes, Usuarios, Perfil).
- El cajón se renderiza con un componente custom ([CustomDrawerContent](src/navigation/CustomDrawerContent.tsx)) que **filtra los ítems por rol** consultando `can()` de [permissions.ts](src/lib/permissions.ts), idéntico al `Sidebar` del web.

> **Referencia:** [https://reactnavigation.org/](https://reactnavigation.org/)

### 4.2 NativeWind (`nativewind`, `tailwindcss`)
**Tailwind CSS adaptado a React Native.** Permite escribir `className="bg-primary px-4 rounded-lg"` directamente sobre componentes RN. El plugin transforma esas clases en `StyleSheet` nativo.

- Se reusa la **misma paleta de Clínica Pabón** del web (`#d71920`, `#b2141a`, `#7a0d12`).
- Se replican los **tokens semánticos** light/dark (`bg-app-bg`, `bg-app-dark-bg`, `text-app-text`, etc.) en [tailwind.config.js](tailwind.config.js).
- El modo oscuro se sincroniza con el `ThemeContext` mediante `colorScheme.set(theme)` de NativeWind.

> **Referencia:** [https://www.nativewind.dev/](https://www.nativewind.dev/)
> **Referencia:** [https://tailwindcss.com/](https://tailwindcss.com/)

### 4.3 Axios (`axios`)
Cliente HTTP idéntico al del web. La instancia configurada en [src/lib/api.ts](src/lib/api.ts) tiene:
- Interceptor de petición que adjunta `Authorization: Bearer <access>`.
- Interceptor de respuesta que **refresca** el token con `POST /auth/token/refresh/` cuando el backend responde 401, encolando peticiones concurrentes.
- Helper `getApiErrorMessage(err)` para extraer mensajes legibles de respuestas DRF.

> **Referencia:** [https://axios-http.com/](https://axios-http.com/)

### 4.4 expo-secure-store (`expo-secure-store`)
Almacenamiento seguro nativo:
- **iOS:** Keychain
- **Android:** EncryptedSharedPreferences

Aquí se guardan **únicamente los tokens** (`biometric_access_token`, `biometric_refresh_token`). El equivalente web es `localStorage`, pero en móvil esto es inseguro por dos motivos: el storage normal de RN no está cifrado y los tokens en disco son un objetivo común en apps clínicas.

> **Referencia:** [https://docs.expo.dev/versions/latest/sdk/securestore/](https://docs.expo.dev/versions/latest/sdk/securestore/)

### 4.5 AsyncStorage (`@react-native-async-storage/async-storage`)
Storage no sensible (perfil cacheado del usuario, preferencia de tema). Es asíncrono — wrapper unificado en [src/lib/storage.ts](src/lib/storage.ts).

### 4.6 Lucide React Native (`lucide-react-native`)
Mismos iconos que en el web (`Mail`, `Lock`, `Eye`, `EyeOff`, `Sun`, `Moon`, `Plus`, `Trash2`, `Check`, `User`, `Wrench`, `TriangleAlert`, etc.) pero como componentes nativos basados en `react-native-svg`.

> **Referencia:** [https://lucide.dev/](https://lucide.dev/)

### 4.7 react-native-reanimated, react-native-gesture-handler, react-native-screens, react-native-safe-area-context
Dependencias nativas que React Navigation y el Drawer requieren para animaciones, gestos y manejo de áreas seguras (notch, status bar, home indicator).

---

## 5. Estructura de carpetas

```
equipos-biomedicos-mobile/
├── App.tsx                        → Entry point: providers + StatusBar + RootNavigator
├── app.json                       → Configuración de Expo (nombre, slug, plugins, extra.apiBaseUrl)
├── babel.config.js                → babel-preset-expo + nativewind/babel + reanimated/plugin
├── metro.config.js                → withNativeWind para que Metro procese global.css
├── tailwind.config.js             → Paleta y tokens semánticos (réplica del web)
├── global.css                     → @tailwind base/components/utilities
├── nativewind-env.d.ts            → Tipos de NativeWind
├── tsconfig.json                  → strict + alias @/* a src/*
└── src/
    ├── components/
    │   ├── ui/                    → Button, Input, Card, Badge, Modal, Select,
    │   │                            ConfirmDialog, Tabs, ThemeToggle,
    │   │                            ScreenContainer, ListItem, EmptyState
    │   ├── layout/                → (reservado para layouts adicionales)
    │   └── equipment/             → (reservado para EquipoFicha si se porta)
    ├── context/
    │   ├── AuthContext.tsx        → Mismo contrato que el web; SecureStore + /users/me/
    │   └── ThemeContext.tsx       → Sincroniza con NativeWind y Appearance
    ├── lib/
    │   ├── api.ts                 → axios + refresh JWT + onSessionExpired hook
    │   ├── storage.ts             → SecureStore + AsyncStorage wrappers
    │   ├── permissions.ts         → Matriz de permisos (idéntica al web)
    │   └── cn.ts                  → Helper minimalista para concatenar clases
    ├── navigation/
    │   ├── RootNavigator.tsx      → Decide AuthStack vs AppDrawer según isAuthenticated
    │   ├── AuthStack.tsx          → Login → Registro → RecuperarPassword
    │   ├── AppDrawer.tsx          → Drawer + filtro de pantallas por permisos
    │   ├── CustomDrawerContent.tsx→ Header con avatar + items + logout
    │   └── types.ts               → ParamList tipados
    ├── screens/
    │   ├── auth/                  → LoginScreen, RegistroScreen, RecuperarPasswordScreen
    │   └── admin/                 → DashboardScreen, EquiposScreen, MantenimientosScreen,
    │                                AgendamientosScreen, FallasScreen, SedesScreen,
    │                                UsuariosScreen, PerfilScreen
    ├── services/                  → auth, users, branches, brands, models,
    │                                equipment, maintenance, scheduling, failures
    └── types/                     → auth, api (paginación), branch, brand,
                                     equipment, failure, maintenance, scheduling, user
```

### 5.1 Componentes UI replicados del web

| Componente | Equivalente web | Notas |
|---|---|---|
| `<Button>` | Igual | Variantes primary, secondary, ghost, danger / sm, md, lg |
| `<Input>` | Igual | Toggle automático para `secureTextEntry` (contraseña) |
| `<Select>` | Igual | Modal nativo en lugar de `<select>` HTML |
| `<Card>` | Igual | Borde, fondo y radio idénticos |
| `<Modal>` | Igual | Sobre `<RNModal>` con scroll interno |
| `<ConfirmDialog>` | Igual | Diálogo de confirmación con botón destructivo |
| `<Badge>` | Igual | Tonos neutral, success, warning, danger, info, primary |
| `<Tabs>` | Igual | Pill-tabs deslizables (horizontal scroll) |
| `<ThemeToggle>` | Igual | Sun/Moon icon |
| `<ScreenContainer>` | (web no la necesita) | Envuelve cada pantalla con SafeArea + ScrollView + KeyboardAvoiding |
| `<ListItem>` | Filas de tablas | Reemplazo amigable a táctil de filas de tabla del web |
| `<EmptyState>` | Igual | Estado vacío con icono + título + descripción |

---

## 6. Modo oscuro

Implementado mediante:

1. `Appearance.getColorScheme()` para leer el modo del sistema operativo al iniciar.
2. La preferencia explícita del usuario se persiste en `AsyncStorage` con la clave `theme` y prevalece sobre el sistema.
3. `nativewind/colorScheme.set('dark' | 'light')` activa la variante `dark:` de Tailwind en todos los componentes.
4. `ThemeContext` también expone un objeto `colors` con valores resueltos (hex) para casos donde `className` no aplica (por ejemplo, `tintColor` del `RefreshControl` o el color de los iconos `lucide-react-native`).

La paleta y los tokens semánticos son **idénticos** a los del web (mismas variables traducidas a `tailwind.config.js`).

---

## 7. Autenticación (integración real con Biometric API)

Idéntico al flujo del web:

1. `POST /api/v1/auth/token/` con `username` y `password`.
2. Backend devuelve `{ access, refresh }` (JWT).
3. La app guarda los tokens en **SecureStore** (no en el storage normal) y consulta `GET /api/v1/users/me/` para obtener el perfil.
4. El perfil se cachea en `AsyncStorage` para hidratar la UI al instante en arranques posteriores.
5. Cuando una petición devuelve 401, el interceptor de axios pide un nuevo access token con el refresh y reintenta. Si el refresh falla, se llama al hook `onSessionExpired` registrado por `AuthContext`, que pone `usuario = null` y el `RootNavigator` cambia automáticamente al `AuthStack` (no hay `window.location` en RN).

### 7.1 AuthContext

Misma API que el web:

| Propiedad | Descripción |
|---|---|
| `usuario` | `Usuario` autenticado o `null`. |
| `isAuthenticated` | `true` cuando hay `usuario`. |
| `loading` | `true` durante la hidratación inicial. |
| `login(data)` | Persiste tokens en SecureStore + carga perfil de `/users/me/`. |
| `logout()` | Limpia SecureStore + AsyncStorage. |
| `refreshUser()` | Recarga `/users/me/` (útil tras editar el propio perfil). |

### 7.2 Roles y matriz de permisos

Igual que el web. Cinco roles: `superadmin`, `admin`, `coordinador`, `ingeniero`, `tecnico`. La función `can(role, resource, action)` de [src/lib/permissions.ts](src/lib/permissions.ts) decide:

- Qué pantallas montar en el Drawer (`AppDrawer.tsx` filtra `<Drawer.Screen>` según permisos).
- Qué botones renderizar dentro de cada pantalla (Crear, Editar, Eliminar, Resolver, Notificar, Completar, etc.).

`canAssignRole(actor, target)` evita que un `admin` cree un `superadmin` u otro `admin`.

---

## 8. Pantallas y funcionalidades

### 8.1 Pantallas públicas (sin autenticación)

| Pantalla | Equivalente web | Descripción |
|---|---|---|
| **Login** ([LoginScreen.tsx](src/screens/auth/LoginScreen.tsx)) | `LoginPage` | Formulario `username` + `password`. Llama a `login()` del `AuthContext`. Botón de tema en el header, logo de la clínica, enlaces a registro y recuperación. |
| **Registro** ([RegistroScreen.tsx](src/screens/auth/RegistroScreen.tsx)) | `RegistroPage` | Pantalla informativa: las cuentas se crean internamente desde el panel admin. Muestra el correo de contacto. |
| **Recuperar contraseña** ([RecuperarPasswordScreen.tsx](src/screens/auth/RecuperarPasswordScreen.tsx)) | `RecuperarPasswordPage` | Formulario de correo con confirmación visual de envío (sin endpoint real aún en backend). |

> **No hay landing page** en móvil (no aplica el concepto de "página pública con marketing"); la app se abre directamente en Login si no hay sesión.

### 8.2 Pantallas autenticadas (Drawer)

| Pantalla | Equivalente web | Funciones móviles |
|---|---|---|
| **Dashboard** ([DashboardScreen.tsx](src/screens/admin/DashboardScreen.tsx)) | `DashboardPage` | Saludo + 4 KPIs reales (total equipos, operativos, agendamientos pendientes, fallas abiertas). Lista de últimos equipos. Pull-to-refresh. |
| **Equipos** ([EquiposScreen.tsx](src/screens/admin/EquiposScreen.tsx)) | `EquiposPage` | Listado con búsqueda por texto, filtro por estado y por sede. Crear equipo (con selects de modelo y sede). Eliminar (si el rol lo permite). |
| **Mantenimientos** ([MantenimientosScreen.tsx](src/screens/admin/MantenimientosScreen.tsx)) | `MantenimientosPage` | Listado filtrable por tipo (preventivo/correctivo/reparación). Registro de mantenimientos asociando equipo, técnico y costo. |
| **Agendamientos** ([AgendamientosScreen.tsx](src/screens/admin/AgendamientosScreen.tsx)) | `AgendamientosPage` | Listado con filtro pendiente/completado/todos. Programar mantenimiento. Acciones: **Notificar** (envía correo al técnico) y **Completar**. |
| **Fallas** ([FallasScreen.tsx](src/screens/admin/FallasScreen.tsx)) | `FallasPage` | Reportar falla con severidad (Baja/Media/Alta/Crítica). Marcar como resuelta con notas de resolución. |
| **Sedes** ([SedesScreen.tsx](src/screens/admin/SedesScreen.tsx)) | `SedesPage` | CRUD completo de sedes (nombre, dirección, ciudad, teléfono, email). |
| **Usuarios** ([UsuariosScreen.tsx](src/screens/admin/UsuariosScreen.tsx)) | `UsuariosPage` | CRUD de usuarios (solo `admin`/`superadmin`). El select de rol oculta `superadmin`/`admin` cuando el actor no es `superadmin` (vía `canAssignRole`). |
| **Perfil** ([PerfilScreen.tsx](src/screens/admin/PerfilScreen.tsx)) | `PerfilPage` | Editar datos personales y cambiar contraseña. Botón de cerrar sesión. |

### 8.3 Decisiones de diseño móvil

- **Listados**: se reemplazan las **tablas** del web por `FlatList` de `<ListItem>` táctiles, con pull-to-refresh y vacío gestionado por `<EmptyState>`.
- **Formularios**: se abren en **`<Modal>`** desplegable en lugar del slide-over del web. Cada formulario respeta los mismos campos que el web; los selects usan un modal nativo en lugar de `<select>` HTML.
- **Filtros**: en lugar de barras horizontales con muchos filtros, se priorizan 1–2 filtros + búsqueda por texto para que la pantalla quede legible en móvil.
- **Navegación**: el header del Drawer (botón menú a la izquierda) sigue siendo la única forma de cambiar de sección, igual que el sidebar colapsable del web en mobile.
- **Acciones por fila**: los botones (Editar, Eliminar, Resolver, Completar, Notificar) viven debajo de cada `<ListItem>` para que sean cómodos al pulgar, en lugar de un menú contextual.

---

## 9. Conexión con el backend

La app móvil consume **exactamente la misma API** que el frontend web. La URL base se resuelve en este orden de prioridad:

1. Variable de entorno `EXPO_PUBLIC_API_BASE_URL` (archivo `.env` local).
2. `expo.extra.apiBaseUrl` definido en [app.json](app.json).
3. Fallback `http://localhost:8010/api/v1`.

| Entorno de desarrollo | URL recomendada |
|---|---|
| **Simulador iOS** | `http://localhost:8010/api/v1` (el simulador comparte red con el Mac) |
| **Emulador Android** | `http://10.0.2.2:8000/api/v1` (`10.0.2.2` es el alias del host del emulador Android) |
| **Dispositivo físico (Expo Go)** | `http://<IP-LAN-del-Mac>:8000/api/v1` (ambos en la misma WiFi) |

El backend (Django) ya tiene CORS configurado y JWT vía SimpleJWT, por lo que **no se requieren cambios en el API** para soportar la versión móvil.

---

## 10. Cómo ejecutar el proyecto

```bash
# 1) Levantar el backend (en otra terminal)
cd ../backend
docker compose up -d
# El API queda en http://localhost:8010

# 2) Instalar y arrancar la app móvil
cd equipos-biomedicos-mobile
npm install
npm run ios       # Simulador iOS (requiere Xcode)
# o
npm run android   # Emulador Android (requiere Android Studio)
# o
npm start         # Abre el menú de Expo (Expo Go)
```

### Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm start` | Servidor de Expo + QR para abrir en Expo Go. |
| `npm run ios` | Compila y abre en el simulador iOS. |
| `npm run android` | Compila y abre en el emulador Android. |
| `npm run web` | Versión web experimental (no es el frontend principal). |

### Configuración inicial

Si vas a probar en dispositivo físico, copia `.env.example` a `.env` y ajusta `EXPO_PUBLIC_API_BASE_URL` con la IP LAN del Mac:

```bash
cp .env.example .env
# Edita EXPO_PUBLIC_API_BASE_URL=http://192.168.1.23:8000/api/v1
```

---

## 11. Diferencias clave respecto al web

| Tema | Web | Móvil |
|---|---|---|
| **Routing** | `react-router-dom` (URLs) | `react-navigation` (Stack + Drawer, sin URLs) |
| **Storage de tokens** | `localStorage` | `expo-secure-store` (Keychain / EncryptedSharedPreferences) |
| **Storage de perfil** | `localStorage` | `AsyncStorage` |
| **Layout** | Sidebar + topbar responsive | Drawer (cajón lateral) |
| **Tablas** | `<table>` con scroll horizontal | `FlatList` de `<ListItem>` táctiles |
| **Formularios** | Slide-over a la derecha | `<Modal>` centrado |
| **Tema** | Clase `dark` en `<html>` | `Appearance` + `nativewind/colorScheme.set` |
| **Iconos** | `lucide-react` | `lucide-react-native` |
| **Landing pública** | Existe (`HomePage`) | **Eliminada** — la app abre en Login |
| **Subida de archivos** | `File` del navegador | Objeto `{ uri, name, type }` (Expo Document Picker) |
| **Redirect en sesión expirada** | `window.location` | Hook `onSessionExpired` que limpia `AuthContext` |

---

## 12. Próximos pasos

- **Cámara y código QR**: usar `expo-camera` + `expo-barcode-scanner` para que el técnico escanee el QR de un equipo en planta y abra su ficha sin buscar.
- **Notificaciones push**: integrar `expo-notifications` con el backend para avisar al técnico cuando se le asigne un mantenimiento (hoy se hace por email vía endpoint `/notify/`).
- **Modo offline**: cachear listados de equipos y sedes para consulta sin red, con cola de mutaciones (mantenimientos, fallas) que se sincronicen al reconectar.
- **Adjuntar PDFs**: integrar `expo-document-picker` en `MantenimientosScreen` para usar el endpoint `createWithFile` del servicio (el contrato ya está implementado).
- **Selector de fecha nativo**: reemplazar los inputs de fecha en formato YYYY-MM-DD por `@react-native-community/datetimepicker`.
- **Selector de técnico avanzado**: portar el `<TechnicianSelect>` del web para pre-filtrar por sede.
- **EAS Build**: configurar `eas.json` para generar binarios firmados de iOS y Android (ipa/aab) y subirlos a TestFlight / Play Internal Testing.
- **Tests**: Jest + React Native Testing Library para cubrir los servicios y los flujos críticos (login, refresh, CRUD de equipos).

---

## 13. Referencias rápidas

- **Expo:** https://docs.expo.dev/
- **React Native:** https://reactnative.dev/docs/getting-started
- **React Navigation:** https://reactnavigation.org/
- **NativeWind:** https://www.nativewind.dev/
- **Tailwind CSS:** https://tailwindcss.com/
- **Axios:** https://axios-http.com/
- **expo-secure-store:** https://docs.expo.dev/versions/latest/sdk/securestore/
- **AsyncStorage:** https://react-native-async-storage.github.io/async-storage/
- **Lucide:** https://lucide.dev/

---

## 14. Mapa de equivalencias web → móvil

```
equipos-biomedicos/                    equipos-biomedicos-mobile/
├── src/App.tsx                  ──→   App.tsx + src/navigation/RootNavigator.tsx
├── src/main.tsx                 ──→   index.ts (entry de Expo)
├── src/index.css                ──→   global.css + tailwind.config.js
├── src/lib/api.ts               ──→   src/lib/api.ts (con SecureStore)
├── src/lib/cn.ts                ──→   src/lib/cn.ts (idéntico)
├── src/lib/permissions.ts       ──→   src/lib/permissions.ts (idéntico)
├── src/types/*                  ──→   src/types/*               (idénticos)
├── src/services/*               ──→   src/services/*            (idénticos en lógica)
├── src/context/AuthContext      ──→   src/context/AuthContext   (con SecureStore + hook)
├── src/context/ThemeContext     ──→   src/context/ThemeContext  (con Appearance + NW)
├── src/components/ui/*          ──→   src/components/ui/*       (RN primitives)
├── src/components/layout/*      ──→   src/navigation/AppDrawer + CustomDrawerContent
├── src/pages/Login              ──→   src/screens/auth/LoginScreen
├── src/pages/admin/Dashboard    ──→   src/screens/admin/DashboardScreen
├── src/pages/admin/Equipos      ──→   src/screens/admin/EquiposScreen
├── src/pages/admin/...          ──→   src/screens/admin/...
└── src/routes/ProtectedRoute    ──→   RootNavigator (decide stack vs drawer)
```
