# Grace Hub Frontend - Changelog

> Registro de cambios significativos en el proyecto.

---

## [2026-06-14] - Exportación PDF + Excel (6 reportes) + Mejora de rendimiento

### ✨ Nuevas Funcionalidades

#### Sistema de exportación PDF + Excel

Nueva capa de utilidades puras en `src/lib/print/`:

**Infraestructura base:**
- `src/lib/print/pdf.ts`: wrapper de `jspdf` con estilo de marca. Expone `createPdfDoc()`, `drawDocHeader()`, `drawTable()`, `drawSummary()`, `downloadPdf()`.
- `src/lib/print/excel.ts`: wrapper de SheetJS `xlsx`. Expone `generateExcel(config, columns, rows, filename)`.
- `src/lib/print/index.ts`: re-exports de todos los templates.
- `src/components/ui/export-button.tsx`: componente `ExportButton` con dropdown PDF/Excel. Soporta opcionalmente `onPdfAll`/`onExcelAll` para mostrar dos secciones ("Filtrados" / "Todos") cuando hay paginación.

**6 reportes implementados:**

| Reporte | Template | Integración |
|---------|----------|-------------|
| R1 — Lista de Asistencia | `attendance-list.template.ts` | `meeting-attendance-page-content.tsx` |
| R2 — Padrón GDI | `group-roster.template.ts` | `group-admin-members-tab.tsx` |
| R3 — Padrón Área Ministerial | `group-roster.template.ts` | `group-admin-members-tab.tsx` |
| R4 — Directorio de Miembros | `member-directory.template.ts` | `members-list-view.tsx` |
| R5 — Historial de Asistencia | `attendance-history.template.ts` | `group-attendance-table.tsx` |
| R6 — Resumen de Diezmos | `tithes-summary.template.ts` | `TithesTracker.tsx` |

**Comportamiento de R4 (Directorio de Miembros):**
- El dropdown tiene dos secciones: "Filtrados (N)" y "Todos (N)".
- "Filtrados" aplica todos los filtros activos (búsqueda, rol, GDI, área, nivel operativo, fecha de ingreso, rango de edad) sobre la lista completa **no paginada** `allMembersForDropdowns` — nunca limitada por la página visible.
- "Todos" exporta absolutamente todos los miembros vigentes sin filtros.
- Función `applyMemberFilters()` en `members-list-view.tsx` replica client-side la lógica de filtrado del servidor.

**Padrón de grupo (R2/R3):**
- Export usa `exportMembers` (sin filtro de búsqueda local) — la barra de búsqueda dentro del tab no afecta el contenido exportado.

**Librerías:** `jspdf` + `jspdf-autotable` + `xlsx`. Importadas con `await import()` on-demand dentro de callbacks — impacto en bundle inicial = 0.

#### Capa de performance cache (`cached-services.ts`)

- `src/lib/api/services/cached-services.ts` reescrito: elimina `unstable_cache` (incompatible con `cookies()` en contexto de request) y usa un `Map<string, CacheEntry>` module-level con TTL de 5 minutos.
- `invalidateCacheByTag(tag: string)`: invalida todas las entradas asociadas a un tag. Llamado desde Server Actions después de mutaciones.
- Todos los Server Actions (`eventActions.ts`, `groupActions.ts`, `memberActions.ts`) reemplazaron `revalidateTag()` por `invalidateCacheByTag()`.
- **Fix de bug crítico:** `unstable_cache` ejecutaba los fetches fuera del contexto de request → `cookies()` lanzaba error → no se enviaba cookie de auth → backend retornaba 401. El nuevo cache corre dentro del ciclo de request y propaga correctamente las cookies.

### 🏗️ Arquitectura
- `lib/print/` es una capa de utilidades puras: no hace fetch, no usa hooks, no importa React. Recibe tipos frontend definidos en `lib/types.ts`, genera y descarga el archivo.
- `ExportButton` solo recibe callbacks, no datos — respeta la regla de separación de responsabilidades.
- Los handlers de export son funciones async que usan `await import()` para cargar el template solo cuando el usuario hace click.

---

## [2026-05-01] - Módulo Nuevos Ingresos (Prospects) — Full Stack completo

### ✨ Nuevas Funcionalidades

#### PWA `grace-hub-welcome` — Aplicación web progresiva para el equipo de bienvenida

Nueva aplicación Next.js 15 en `grace-hub-welcome/` (puerto 3001, `output: standalone`).

**Autenticación de equipo:**
- `POST /auth/team-login` (@Public): valida `WELCOME_TEAM_CODE` (env var) + `memberId`, firma JWT con `scope: 'welcome_team'`.
- `src/lib/api/auth.ts`: `teamLogin(teamCode, memberId)` → retorna token.
- `src/hooks/use-auth.ts`: lee token de `sessionStorage`, redirige a `/` si ausente.
- `src/lib/storage.ts`: token en `sessionStorage` (`ghw_token`), member en `localStorage` (`ghw_member_id`, `ghw_member_name`).

**Registro de visitantes:**
- `src/lib/api/prospects.ts`: `createProspect(token, payload)` → `POST /prospects` con `Authorization: Bearer`.
- `src/components/login-form.tsx`: combobox buscable de miembros + código de equipo. Pre-carga identidad desde localStorage.
- `src/components/register-form.tsx`: formulario de visitante + combobox "Agregado por" (no se resetea entre registros). Envía `addedBy: memberId`.
- `src/components/session-list.tsx`: lista de visitantes de la sesión actual, ordenada por `registeredAt` descendente.
- `src/app/register/page.tsx`: cliente — usa `useAuth()`, renderiza form + lista. Botón de logout limpia sesión.

**Guard dual en backend:**
- `AuthGuard` ahora acepta token desde cookie `auth` (admin) **o** `Authorization: Bearer` (PWA). El scope no restringe endpoints pero está disponible en el payload.

#### Admin desktop — Módulo Nuevos Ingresos completo

**Backend (grace-hub-service):**
- `CreateProspectDto`: campo `addedBy?: number` (FK a `members`, nullable).
- `ProspectResponseDto`: campos `addedBy?: number` y `addedByName?: string`.
- `ProspectEntity`: columna `added_by INTEGER NULL`.
- `ProspectRepositoryImpl`:
  - `findFiltered()` y `findById()` usan LEFT JOIN a `members` para poblar `addedByName`.
  - `updateFields()`: usa `findById()` (con JOIN) post-update para retornar `addedByName` completo.
- `UpdateProspectFieldsDto`: nuevo DTO (`firstName?`, `lastName?`, `contact?`, `notes?`, `visitDate?`).
- `UpdateProspectFieldsUseCase`: nuevo caso de uso. Valida existencia y estado `pending`.
- `GET /prospects/:id`: nuevo endpoint (retorna prospect por id con `addedByName`).
- `PATCH /prospects/:id`: nuevo endpoint (editar campos de un prospect pendiente).
- `ProspectApplicationService`: expone `getProspectById()` y `updateProspectFields()`.

**Frontend (grace-hub):**
- `src/lib/types.ts`: `Prospect` ampliado con `addedByName?: string`.
- `src/lib/api/types.ts`: `ApiProspectResponse` con `addedByName?`; nuevo `ApiUpdateProspectRequest`.
- `src/lib/api/mappers/prospectMapper.ts`: mapea `addedByName`.
- `src/lib/api/endpoints/prospectsEndpoint.ts`: `getById()` y `updateFields()`.
- `src/lib/api/services/prospectsService.ts`: `getById()` y `updateFields()`.
- `src/app/(protected)/actions/prospectActions.ts`: `getProspectByIdAction()` y `updateProspectAction()`.

**Componentes — tabla unificada para los 3 tabs:**
- `ProspectsTable` (pendientes): columnas Visitante | Teléfono | Fecha | Agregado por | Fuente | Acciones. Acciones: Integrar + Editar (✏️) + Archivar + Ver detalle (👁).
- `IntegratedProspectsTable` (integrados): mismas columnas base + columna Miembro (link a directorio) + Ver detalle (👁). Diseño visual en verde.
- `ArchivedProspectsTable` (archivados): mismas columnas base sin columna Miembro + Ver detalle (👁). Diseño visual atenuado (opacity).

**Componentes — dialogs:**
- `RegisterProspectDialog`: campo "Agregado por" con combobox buscable de miembros activos (requerido). Enriquece el objeto retornado con `addedByName` local para evitar re-fetch.
- `EditProspectDialog`: dialog dual con prop `readOnly?: boolean`.
  - Modo edición (pendientes): edita firstName, lastName, visitDate, contact, notes. Preserva `addedByName` local.
  - Modo detalle (integrados/archivados): todos los campos en texto estático. `addedByName` + badge de fuente siempre visibles como metadata.

**`ProspectsTabContent`:**
- Estado `viewTarget` para el dialog de detalle en modo readOnly.
- Tres tablas reciben sus handlers correctamente: `onEdit` → pendientes, `onView` → integrados y archivados.
- Import de `updateProspectAction` incorporado.

### 🐛 Bugs corregidos

- **`addedByName` mostraba "—" al crear**: el mapper de respuesta del servidor no incluía el nombre porque `save()` no hace JOIN. Resuelto enriqueciendo el prospect con el `addedByName` del estado local del combobox antes de pasarlo al parent.
- **`addedByName` se perdía al editar**: `updateFields()` en backend llamaba `findOneOrFail()` sin JOIN. Corregido para usar `findById()` (con LEFT JOIN a `members`).
- **`onView is not a function`**: `ProspectsTabContent` no pasaba la prop `onView` a `IntegratedProspectsTable` ni `ArchivedProspectsTable`. Corregido.

### 🏗️ Arquitectura

- **`addedByName` como campo transient**: es un campo de lectura en el agregado de dominio (`public addedByName?: string`), no parte del estado inmutable. Se puebla por el repositorio via JOIN, no por la lógica de dominio.
- **PWA auth**: el JWT de equipo usa `scope: 'welcome_team'` + `memberId`. El `AuthGuard` acepta tanto cookie como Bearer, permitiendo que ambas apps compartan el mismo backend sin conflicto.
- **Sin fila clickeable**: por decisión de UX, la fila no es clickeable para evitar aperturas accidentales del dialog. La acción de detalle está exclusivamente en el botón 👁.

---

## [2026-04-22] - Sistema de Autenticación JWT (cookie httpOnly)

### ✨ Nuevas Funcionalidades

#### Autenticación — Full Stack

**Backend (grace-hub-service):**
- **`src/modules/auth/`**: Nuevo módulo completo de autenticación.
  - **`UserEntity`**: Entidad TypeORM → tabla `users` (id, email, password_hash). Creada automáticamente por `synchronize: true`.
  - **`AuthService`**: Lógica de register (bcrypt 12 rounds), login (comparación de tiempo constante), getMe.
  - **`AuthGuard`**: Guard global registrado en `AppModule` via `APP_GUARD`. Protege todos los endpoints por defecto.
  - **`@Public()`**: Decorador para marcar endpoints que no requieren autenticación.
  - **`AuthController`**: Endpoints `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`.
- **`main.ts`**: Agregado `app.use(cookieParser())`.
- **`app.module.ts`**: Registrados `AuthModule` y guard global `{ provide: APP_GUARD, useClass: AuthGuard }`.
- **`.env`**: Variables `JWT_SECRET` y `JWT_EXPIRES_IN=1d`.

**Frontend (grace-hub):**
- **`src/app/(protected)/`**: Nuevo route group para páginas protegidas (sidebar). Las URLs no cambian.
- **`src/app/(protected)/layout.tsx`**: Layout con `MainLayout` (sidebar).
- **`src/app/login/page.tsx`**: Nueva página de login standalone (sin sidebar). Formulario con email/password, manejo de errores.
- **`src/app/api/auth/login/route.ts`**: Route Handler proxy — llama al backend, extrae el JWT del `Set-Cookie`, reescribe la cookie en el dominio del frontend (`localhost:3000` / `app.tudominio.com`).
- **`src/app/api/auth/logout/route.ts`**: Route Handler que limpia la cookie `auth`.
- **`src/middleware.ts`**: Nuevo archivo. Intercepta todas las navegaciones; redirige a `/login` si no existe la cookie `auth`.
- **`src/lib/api/endpoints/authEndpoint.ts`**: Nuevo archivo. Funciones `login`, `register`, `me`, `logout`.
- **`src/lib/api/client.ts`**: Agregado `credentials: 'include'` en todos los métodos. Agregado reenvío de cookie para Server Components (`next/headers`).
- **`src/lib/api/client.ts`**: Root layout simplificado (sin `MainLayout`).
- **`src/lib/contexts/user-context.tsx`**: Reemplazado mock user por llamada real a `GET /auth/me`. Agregado `isLoading` y `logout()`.
- **`src/components/layout/app-sidebar.tsx`**: Botón "Cerrar Sesión" conectado a `logout()` del contexto.

### 🏗️ Arquitectura
La cookie la setea el Route Handler de Next.js (no el backend directamente) para garantizar que pertenezca al dominio del frontend y sea visible para el middleware. Ver [ADR-006](../../../docs-grace-hub/decisions/006-autenticacion-jwt.md) para los trade-offs.

---

## [2026-04-19] - Filtros de Ingreso y Edad en Módulo Miembros

### ✨ Nuevas Funcionalidades

#### Filtros servidor: fecha de ingreso + edad — Full Stack

**Backend (grace-hub-service):**
- **`member-query.types.ts`**: Campos `joinDateFrom?`, `joinDateTo?`, `ageMin?`, `ageMax?` en `MemberFilterOptions`.
- **`get-members-filtered.options.ts`**: Mismos 4 campos en `GetMembersFilteredOptions`.
- **`get-members-filtered.use-case.ts`**: Pasa los 4 campos al repositorio.
- **`get-members-filtered.dto.ts`**: Params `joinFrom`, `joinTo`, `ageMin`, `ageMax` con validadores `@IsDateString()` / `@IsInt() @Min(0)`.
- **`members.controller.ts`**: Mapeo `queryDto.joinFrom → joinDateFrom`, etc.
- **`member.repository.impl.ts`** (`buildFilterConditions`): SQL para `m.join_date >= $n::date`, `m.join_date <= $n::date`, y `EXTRACT(YEAR FROM AGE(m.birth_date))` con guard `birth_date IS NOT NULL`.

**Frontend (grace-hub):**
- **`src/lib/api/types.ts`**: `ApiMembersFilterParams` ampliado con `joinFrom?`, `joinTo?`, `ageMin?`, `ageMax?`.
- **`src/lib/api/endpoints/membersEndpoint.ts`**: Los 4 nuevos params se incluyen en el query string.
- **`src/lib/api/services/membersService.ts`**: `getAllMembers()` acepta y propaga `joinDateFrom`, `joinDateTo`, `ageMin`, `ageMax`.
- **`src/app/members/page.tsx`**: Helpers `getJoinDateRange(preset)` y `getAgeRange(preset)` para convertir presets en valores reales. Lee `joinPreset` y `agePreset` de URL params; convierte y pasa al servicio.
- **`src/components/members/members-list-view.tsx`**:
  - Constantes `JOIN_PRESETS` (Este mes / 3m / 6m / Este año) y `AGE_PRESETS` (Niños / Adolescentes / Jóvenes / Adultos / Adultos mayores).
  - Estado `selectedJoinPreset` y `selectedAgePreset` inicializado desde props.
  - Nuevos dropdowns "Ingreso" y "Edad" en la barra de filtros.
  - Chips activos para presets seleccionados con botón X.
  - `hasActiveFilters` y `handleClearAllFilters` actualizados.
  - Los filtros se guardan en la URL como `?joinPreset=3m&agePreset=teen`.

### 🏗️ Arquitectura
Los filtros de fecha/edad son **server-side** (se componen con paginación en la BD). El preset se pasa por URL; la conversión a fechas/rangos reales ocurre en `page.tsx` en servidor para evitar lógica duplicada entre cliente y servidor.

---


## [2026-04-18] - Módulo Etiquetas Eclesiásticas + Rediseño UX Forms de Reuniones

### ✨ Nuevas Funcionalidades

#### Módulo Etiquetas Eclesiásticas (Roles) — Full Stack

**Tipos y Mappers:**
- **`src/lib/types.ts`**: Nuevos tipos `EcclesiasticalRole { roleTypeId, name }` y campo `ecclesiasticalRoles?: EcclesiasticalRole[]` en `Member`. Tipo `AudienceType` completo con `"by_categories"`.
- **`src/lib/api/types.ts`**: Nuevos tipos API `ApiEcclesiasticalRole` y `ApiRoleTypeResponse`.
- **`src/lib/api/mappers/roleTypesMapper.ts`**: Nuevo archivo. Mapper `mapApiRoleTypeToRoleType()` y tipo `RoleType`.
- **`src/lib/api/mappers/memberMapper.ts`**: Actualizado para mapear `ecclesiasticalRoles` desde `ApiMemberResponse`.

**API Layer:**
- **`src/lib/api/endpoints/roleTypesEndpoint.ts`**: Nuevo archivo. `getAll()`, `getById()`, `create()`, `delete()`.
- **`src/lib/api/endpoints/membersEndpoint.ts`**: Nuevas funciones `assignRoleType(memberId, roleTypeId)` y `removeRoleType(memberId, roleTypeId)`.
- **`src/lib/api/services/roleTypesService.ts`**: Nuevo archivo. Servicio completo para CRUD de etiquetas.
- **`src/lib/api/services/membersService.ts`**: Nuevas funciones `assignRoleType()` y `removeRoleType()`.

**UI — Member Details:**
- **`src/components/members/member-details-dialog.tsx`**: Nueva sección "Participación Eclesial" (card) con:
  - Popover + Command multiselect para asignar/quitar etiquetas
  - Badges de etiquetas actuales con botón X para quitar
  - Actualizaciones optimistas (UI responde inmediatamente antes de confirmar API)
  - Carga lazy de `roleTypesService.getAll()` al abrir el Popover

**UI — Settings Page:**
- **`src/app/members/settings/role-types/page.tsx`**: Nueva página en `/members/settings/role-types`.
  - Lista todas las etiquetas de la congregación
  - Dialog para crear nueva etiqueta (nombre)
  - AlertDialog de confirmación para eliminar
  - Uses `roleTypesService` para todas las operaciones

#### Audience Type `by_categories` — Funcional de Extremo a Extremo

- **`src/components/events/add-meeting-form.tsx`**: Nuevo RadioGroup card para `by_categories` que carga etiquetas disponibles via `roleTypesService.getAll()` (lazy) y permite selección múltiple de `roleTypeIds`.
- **`src/app/events/page.tsx`**: `getExpectedMembersForSeries()` actualizada: filtra `by_categories` comparando `member.ecclesiasticalRoles` contra `roleTypeIds` de `audience_config`.
- **`src/app/actions/eventActions.ts`**: Corregido bug donde `audience_type` siempre se guardaba como `"all_active"` ignorando el valor seleccionado.

#### Filtros Client-Side para Niveles Operativos

- **`src/app/events/page.tsx`**: `getExpectedMembersForSeries()` implementa filtros client-side para todos los tipos de audiencia basándose en `member.roles[]`:
  - `integrated`: miembros en GDI o Área (nivel >= 1)
  - `workers`: integrantes de Área o líderes (nivel >= 2)
  - `leaders`: Guías GDI y Líderes/Mentores de Área (nivel >= 3)
  - `mentors`: solo GdiMentor y AreaMentor (nivel = 4)

---

### 🔧 Refactoring — Formulario "Crear/Editar Serie de Reuniones"

#### `src/components/events/add-meeting-form.tsx` — Rediseño Completo

- **Estructura visual**: Secciones con separadores y headers (Información General, Recurrencia, Audiencia)
- **Control de frecuencia**: Reemplazado `<Select>` por botones toggle (`"Una vez" | "Semanal" | "Mensual"`)
- **Selector de días**: Reemplazado checkboxes por pills clickeables con highlight activo
- **Selector de audiencia**: Reemplazado `<Select>` por cards RadioGroup con iconos descriptivos
- **Layout scroll**: Cadena flex correcta (`form → flex flex-1 min-h-0 flex-col`, body → `min-h-0 flex-1 overflow-y-auto`, footer → `flex-shrink-0`) para scroll dentro del modal

#### `src/components/events/manage-meeting-series-dialog.tsx` — Reescritura

- **Vista**: Rediseñada con cards de detalles claros (audiencia, recurrencia, fechas)
- **Estructura JSX**: Corregido — el contenido de view/edit mode está correctamente dentro de `DialogContent`
- **Estado muerto removido**: Eliminados `isLoadingDelete` y otros estados no usados
- **`initialFormValues`**: Movido a `useMemo` para evitar recálculos innecesarios
- **Constantes**: Movidas a nivel de módulo (`WEEKDAY_LABELS`, `AUDIENCE_TYPE_LABELS`)

#### Dialogs — Fix de Scroll

Cuatro archivos corregidos para que el modal tenga scroll interno correcto:
- **`src/components/events/page-specific-add-meeting-dialog.tsx`**: `overflow-y-auto` → `flex-grow flex-col min-h-0`
- **`src/components/events/global-add-meeting-trigger.tsx`**: Mismo fix
- Todos los `DialogContent`: `overflow-hidden` para clampear height
- `SheetContent` en manage-dialog: `flex flex-col`

---

### 🐛 Bugs Corregidos

#### `audience_type` siempre guardado como `"all_active"`
- **Archivo:** `src/app/actions/eventActions.ts`
- **Problema:** El valor de `audienceType` del formulario era ignorado; siempre se enviaba `"all_active"` al backend.
- **Solución:** Pasar el campo `audienceType` correctamente al payload del endpoint.

#### Error 404 en asignación de roles desde member details
- **Archivos:** `membersEndpoint.ts`, `membersService.ts`
- **Problema:** Ruta incorrecta para `POST /members/:id/role-types`.
- **Solución:** Corregida la ruta del endpoint.

---

## [2026-04-17] - Correcciones de Tipos y Mejoras UX

### 🐛 Bugs Corregidos

#### Error: `handleOpenEditDialog` no definido
- **Archivo:** `src/components/members/members-list-view.tsx`
- **Problema:** Las funciones `handleOpenEditDialog` y `handleDeleteMember` no estaban implementadas, causando error al hacer clic en "Editar" o "Eliminar" en el dropdown de acciones.
- **Solución:** Implementadas ambas funciones:
  - `handleOpenEditDialog`: Abre el diálogo de detalles del miembro (que tiene modo edición interno)
  - `handleDeleteMember`: Elimina miembro con confirmación via `window.confirm()`

#### Error: Propiedad `wasPresent` vs `attended`
- **Archivos afectados:** 
  - `group-admin-summary-tab.tsx`
  - `events/page.tsx`
  - `members-list-view.tsx`
- **Problema:** El mapper convierte `wasPresent` (API) a `attended` (frontend), pero los componentes usaban `wasPresent`.
- **Solución:** Corregido a usar `attended` en todos los componentes.

#### Error: `attendeeUids` vacío en reuniones de grupo
- **Archivos:** `groupMeetingsService.ts`, páginas admin de GDI/Área
- **Problema:** `getAllMeetings()` no popula `attendeeUids`, causando que las tablas de asistencia muestren 0 esperados.
- **Solución:** Nueva función `getMeetingsForGroupWithAttendees()` que enriquece los meetings con los attendees esperados.

### 🔧 Correcciones de TypeScript

#### statusDisplayMap desactualizado
- **Archivos:** 
  - `src/app/events/page.tsx`
  - `src/app/tithes/page.tsx`
  - `src/components/groups/admin/group-admin-members-tab.tsx`
  - `src/components/groups/manage-single-gdi-view.tsx`
  - `src/components/groups/manage-single-ministry-area-view.tsx`
- **Problema:** Usaban valores obsoletos `Active`, `Inactive`, `New` que ya no existen en el tipo.
- **Solución:** Actualizado a solo `vigente` y `eliminado`.

#### groupType "ministryArea" inválido
- **Archivo:** `src/app/groups/ministry-areas/[areaId]/admin/page.tsx`
- **Problema:** Pasaba `"ministryArea"` pero el tipo solo acepta `"gdi" | "area"`.
- **Solución:** Cambiado a `"area"`.

#### PageHeader breadcrumbs no existe
- **Archivo:** `src/app/members/bulk-add/page.tsx`
- **Problema:** Se usaba prop `breadcrumbs` que no existe en `PageHeaderProps`.
- **Solución:** Reemplazado por `description`.

#### VacantSlot onClick type mismatch
- **Archivo:** `src/components/ui/vacant-slot.tsx`
- **Problema:** Type mismatch entre button y div onClick handlers.
- **Solución:** Refactorizado para renderizar explícitamente `<button>` o `<div>` según el caso.

#### ApiRoleType desalineado
- **Archivo:** `src/lib/api/types.ts`
- **Problema:** Definía roles obsoletos (`'Leader' | 'Worker' | 'GeneralAttendee'`) que no coinciden con el frontend.
- **Solución:** Actualizado a `'GdiGuide' | 'GdiMentor' | 'AreaLeader' | 'AreaMentor' | 'Worker'`.

#### rolesService.getLeaders() usaba 'Leader'
- **Archivo:** `src/lib/api/services/rolesService.ts`
- **Problema:** Llamaba `getByRoleType('Leader')` que ya no existe.
- **Solución:** Actualizado para agregar todos los roles de liderazgo (GdiGuide, GdiMentor, AreaLeader, AreaMentor).

### ✨ Mejoras UX

#### Contraste mejorado en tablas de asistencia
- **Archivos:**
  - `src/components/groups/admin/group-attendance-table.tsx`
  - `src/components/events/meeting-type-attendance-table.tsx`
  - `src/components/groups/admin/group-admin-members-tab.tsx`
- **Cambios:**
  - Contenedor: `border-2 border-border/60 rounded-xl shadow-lg`
  - Headers con gradiente: `bg-gradient-to-r from-primary/10 to-primary/5`
  - Zebra striping: filas alternas con `bg-muted/20`
  - Columna sticky con sombra

#### Nueva columna "Última Asistencia"
- **Archivos:** Tablas de asistencia
- **Descripción:** Muestra días desde última asistencia con código de colores:
  - Verde: ≤7 días
  - Amarillo: 8-14 días
  - Naranja: 15-30 días
  - Rojo: >30 días

#### Indicador de tendencia en KPIs
- **Archivo:** `src/app/events/page.tsx`
- **Descripción:** El KPI "Asistencia Promedio" ahora muestra flecha ↑/↓ con porcentaje de cambio comparando mitad reciente vs mitad antigua de reuniones.

#### Selector de series mejorado
- **Archivos:** 
  - `src/components/events/events-toolbar.tsx`
  - `src/app/events/page.tsx`
- **Cambios:**
  - Muestra conteo de reuniones por serie
  - Ancho aumentado a 320px
  - Badge de frecuencia (Única/Sem./Mens.)

---

## Tipos Actualizados

### Member.status
```typescript
// ANTES (obsoleto)
type status = "Active" | "Inactive" | "New" | "vigente" | "eliminado";

// AHORA (correcto)
type status = "vigente" | "eliminado";
```

### ApiRoleType
```typescript
// ANTES (obsoleto)
type ApiRoleType = 'Leader' | 'Worker' | 'GeneralAttendee';

// AHORA (alineado con MemberRoleType)
type ApiRoleType = 'GdiGuide' | 'GdiMentor' | 'AreaLeader' | 'AreaMentor' | 'Worker';
```

### groupType en componentes de grupo
```typescript
// ANTES (algunos usaban)
groupType: "gdi" | "area" | "ministryArea";

// AHORA (correcto)
groupType: "gdi" | "area";
```

---

## Funciones Nuevas

### getMeetingsForGroupWithAttendees
```typescript
// src/lib/api/services/groupMeetingsService.ts
export async function getMeetingsForGroupWithAttendees(
  groupType: 'gdi' | 'area',
  groupId: string
): Promise<Meeting[]>
```
Obtiene reuniones de un grupo con los `attendeeUids` correctamente populados.

### handleOpenEditDialog / handleDeleteMember
```typescript
// src/components/members/members-list-view.tsx
const handleOpenEditDialog = (member: Member) => { ... }
const handleDeleteMember = async (memberId: string) => { ... }
```
Handlers para acciones de edición y eliminación en la tabla de miembros.
