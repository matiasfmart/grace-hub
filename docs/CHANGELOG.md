# Grace Hub Frontend - Changelog

> Registro de cambios significativos en el proyecto.

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
