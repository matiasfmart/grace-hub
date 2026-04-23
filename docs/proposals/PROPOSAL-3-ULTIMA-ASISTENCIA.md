# Propuesta 3 — Filtro "Última asistencia"

> **Estado**: Pendiente de aprobación — requiere decisión de arquitectura  
> **Costo**: Medio (Opción A: backend) / Bajo (Opción B: frontend)  
> **Riesgo**: Medio — presenta una decisión de diseño con dos caminos válidos  
> **Dependencias**: Ninguna (puede implementarse de forma independiente)

---

## 1. Problema que resuelve

El sistema ya computa la última asistencia de cada miembro (visible como badge de color en la tabla). Sin embargo, no existe un filtro que permita encontrar miembros según su actividad de asistencia:

- "¿Quiénes llevan más de 30 días sin venir?"
- "¿Quiénes asistieron esta semana?"
- "¿Quiénes nunca han asistido a ninguna reunión?"

Esta información existe en `allAttendanceRecords` + `allMeetings` y ya se usa para colorear las filas. La brecha es que no está expuesta como filtro navegable.

---

## 2. El problema de arquitectura central

El sistema usa **paginación server-side**: `members` (estado local) contiene solo los 10/20 miembros de la página actual. `allMembersForDropdowns` contiene todos los miembros vigentes sin paginar.

Un filtro client-side ingenuamente aplicado a `members` produciría resultados **activamente engañosos**:

```
Backend retorna: página 1 de 8 (10 miembros de 80 totales)
Filtro client-side "ausentes > 30 días" aplicado a los 10:
→ Muestra 3 miembros

Realidad:
→ Hay 35 miembros ausentes > 30 días en las páginas 2-8
→ El admin ve "3 ausentes" cuando son 35
→ Toma decisiones pastorales incorrectas
```

Por esto no se puede implementar como un filtro client-side simple sobre `members`.

---

## 3. Datos disponibles hoy (contexto técnico)

```typescript
// En members-list-view.tsx, ya disponibles:
const memberLastAttendance = useMemo(() => {
  // Computa Map<memberId, { date: Date; daysAgo: number }>
  // Usando: allAttendanceRecords (TODOS, no paginados) + allMeetings (TODOS)
  // ✅ Este mapa ya tiene datos COMPLETOS para todos los miembros
}, [allAttendanceRecords, allMeetings]);

const allMembersForDropdowns: Member[];  // TODOS los miembros vigentes (no paginados)
const members: Member[];                 // Solo la página actual (paginado, 10-20)
```

El mapa `memberLastAttendance` ya es correcto y completo. El problema es solo a qué conjunto de miembros aplicar el filtro.

---

## 4. Dos opciones válidas

### Opción A — Filtro en backend (arquitectónicamente correcto)

Agregar `last_attended_date` como subquery calculada en `MEMBER_WITH_ASSIGNMENTS_QUERY`, luego filtrar en `buildFilterConditions`.

**Ventajas**:
- Arquitectónicamente puro — el filtro va por la cadena correcta
- La paginación sigue funcionando naturalmente
- Permite ordenar por "última asistencia" desde el servidor
- Consistente con el resto de los filtros

**Desventajas**:
- Alto costo: ~10 archivos (query SQL + tipos + DTO + options + use case + service + controller + API types + service frontend + endpoint frontend)
- El subquery de `MAX(meeting_date)` JOIN attendance tiene complejidad SQL media
- Requiere deploy coordinado frontend + backend

**SQL a agregar en `MEMBER_WITH_ASSIGNMENTS_QUERY`**:
```sql
(SELECT MAX(me.meeting_date)
 FROM attendance a
 JOIN meetings me ON a.meeting_id = me.meeting_id
 WHERE a.member_id = m.member_id 
 AND a.was_present = true
) as last_attended_date
```

**SQL en `buildFilterConditions`**:
```sql
-- Para filtro "asistió en los últimos N días":
(SELECT MAX(me.meeting_date)
 FROM attendance a
 JOIN meetings me ON a.meeting_id = me.meeting_id
 WHERE a.member_id = m.member_id AND a.was_present = true
) >= NOW() - INTERVAL '$N days'

-- Para "nunca asistió":
NOT EXISTS(
  SELECT 1 FROM attendance a
  WHERE a.member_id = m.member_id AND a.was_present = true
)
```

**Cadena de cambios (Opción A)**:
| # | Archivo | Capa | Cambio |
|---|---|---|---|
| 1 | `member.repository.impl.ts` | Infrastructure | Agregar subquery `last_attended_date` en `MEMBER_WITH_ASSIGNMENTS_QUERY` + condición en `buildFilterConditions` |
| 2 | `member-with-assignments.read-model.ts` | Domain | Agregar `lastAttendedDate?: string \| null` |
| 3 | `member-query.types.ts` | Domain | Agregar `attendanceDaysAgoMax?: number`, `attendanceDaysAgoMin?: number`, `neverAttended?: boolean` en `MemberFilterOptions` |
| 4 | `get-members-filtered.options.ts` | Application | Idem en `GetMembersFilteredOptions` |
| 5 | `get-members-filtered.use-case.ts` | Application | Pasar los nuevos campos |
| 6 | `get-members-filtered.dto.ts` | Presentation | Agregar `attendancePreset?: string` o campos individuales |
| 7 | `members.controller.ts` | Presentation | Mapear DTO → options |
| 8 | `member-response.dto.ts` | Presentation | Agregar `lastAttendedDate` en la respuesta (opcional) |
| 9 | `types.ts` (frontend) | API types | Agregar `attendancePreset` en `ApiMembersFilterParams` |
| 10 | `membersEndpoint.ts` | Endpoints | Construir el query param |
| 11 | `membersService.ts` | Service | Pasar el param |
| 12 | `members/page.tsx` | Presentation | Leer URL param, pasar a `getAllMembers` |
| 13 | `members-list-view.tsx` | Component | Dropdown UI + state |

---

### Opción B — Modo "vista local" (pragmático, 100% frontend)

Cuando el filtro de asistencia está activo, cambiar el origen de datos del componente: en lugar de usar `members` (paginated), filtrar `allMembersForDropdowns` (todos) client-side y paginar localmente.

**Ventajas**:
- Cero cambios en backend
- Implementación en un solo archivo (`members-list-view.tsx`)
- El mapa `memberLastAttendance` ya tiene los datos correctos y completos
- Deployable de forma independiente y rápida

**Desventajas**:
- Cuando hay muchos miembros (>500), `allMembersForDropdowns` podría ser pesado en memoria del cliente
- La paginación "local" es diferente a la paginación "servidor" — se necesita gestionar dos modos
- Los controles de paginación deben mostrar el total filtrado, no el total del servidor
- El ordenamiento sería client-side (no preserva el sort del servidor)

**Costo estimado**: ~50-80 líneas en `members-list-view.tsx`

---

## 5. Diseño detallado de Opción B (recomendada para esta iteración)

### 5.1 Presets de filtro propuestos

| Preset UI | Lógica | Condición |
|---|---|---|
| Esta semana | `daysAgo <= 7` | Asistió en los últimos 7 días |
| Este mes | `daysAgo <= 30` | Asistió en los últimos 30 días |
| Más de 30 días | `daysAgo > 30` | Última asistencia hace más de 30 días |
| Más de 60 días | `daysAgo > 60` | Última asistencia hace más de 60 días |
| Sin registro | `daysAgo === -1` | No aparece en ningún registro de asistencia |

### 5.2 Lógica de doble fuente de datos

```typescript
// En members-list-view.tsx

// Nuevo state
const [attendancePreset, setAttendancePreset] = useState<string>("");

// Miembros filtrados por asistencia (sobre allMembersForDropdowns completo)
const attendanceFilteredMembers = useMemo(() => {
  if (!attendancePreset) return null; // null = "no filter active, use server pagination"
  
  return allMembersForDropdowns
    .filter(m => m.status === "vigente")
    .filter(m => {
      const status = getAttendanceStatus(m.id);
      switch (attendancePreset) {
        case "week":      return status.daysAgo >= 0 && status.daysAgo <= 7;
        case "month":     return status.daysAgo >= 0 && status.daysAgo <= 30;
        case "over30":    return status.daysAgo > 30;
        case "over60":    return status.daysAgo > 60;
        case "never":     return status.daysAgo === -1;
        default:          return true;
      }
    });
}, [attendancePreset, allMembersForDropdowns, getAttendanceStatus]);

// Paginación local cuando el filtro está activo
const [localPage, setLocalPage] = useState(1);
const LOCAL_PAGE_SIZE = pageSize; // reutiliza el pageSize del servidor

const localPaginatedMembers = useMemo(() => {
  if (!attendanceFilteredMembers) return null;
  const start = (localPage - 1) * LOCAL_PAGE_SIZE;
  return attendanceFilteredMembers.slice(start, start + LOCAL_PAGE_SIZE);
}, [attendanceFilteredMembers, localPage, LOCAL_PAGE_SIZE]);

// Fuente final de datos para la tabla — switchea según el filtro activo
const displayMembers = localPaginatedMembers ?? processedMembers;
const displayTotalPages = attendanceFilteredMembers
  ? Math.ceil(attendanceFilteredMembers.length / LOCAL_PAGE_SIZE)
  : totalPages;
const displayTotalMembers = attendanceFilteredMembers?.length ?? totalMembers;
const displayCurrentPage = attendanceFilteredMembers ? localPage : currentPage;
```

### 5.3 Controles de paginación

Los controles de paginación actuales usan `currentPage`, `totalPages`, `totalMembers` del servidor. Se necesita parametrizarlos para que usen los valores de display:

```tsx
// Reemplazar en el JSX de paginación:
// currentPage → displayCurrentPage
// totalPages → displayTotalPages
// totalMembers → displayTotalMembers

// Botón "anterior":
onClick={() => {
  if (attendanceFilteredMembers) {
    setLocalPage(p => Math.max(1, p - 1));
  } else {
    // lógica server pagination existente
  }
}}
```

### 5.4 Integración con `applyFiltersWithValues`

Cuando se activa el filtro de asistencia, el preset se guarda en state local pero **NO se envía a la URL** (no tiene parámetro backend). Los otros filtros (rol, GDI, área) siguen yendo a la URL.

```typescript
const toggleAttendancePreset = (value: string) => {
  const newPreset = attendancePreset === value ? "" : value;
  setAttendancePreset(newPreset);
  setLocalPage(1); // resetear paginación local
};

// Cuando se cambia otro filtro, resetear el filtro de asistencia local
// (porque el conjunto de miembros del servidor cambia)
const toggleRoleFilter = (value: string) => {
  setAttendancePreset(""); // reset asistencia
  setLocalPage(1);
  // ... lógica existente
};
```

### 5.5 Indicador de "modo local"

Para que el usuario sepa que está en modo filtrado local, agregar un indicador:

```tsx
{attendanceFilteredMembers && (
  <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded px-2 py-1">
    Filtrando por asistencia sobre {allMembersForDropdowns.filter(m => m.status === "vigente").length} miembros activos
  </div>
)}
```

### 5.6 UI del dropdown de asistencia

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm" className={cn(attendancePreset && "border-primary")}>
      <Calendar className="mr-1 h-4 w-4" />
      Asistencia
      {attendancePreset && <Badge className="ml-1">1</Badge>}
      <ChevronDown className="ml-1 h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start">
    <DropdownMenuLabel>Última asistencia</DropdownMenuLabel>
    <DropdownMenuSeparator />
    {[
      { value: "week",   label: "Esta semana (≤ 7 días)" },
      { value: "month",  label: "Este mes (≤ 30 días)" },
      { value: "over30", label: "Más de 30 días" },
      { value: "over60", label: "Más de 60 días" },
      { value: "never",  label: "Sin registro de asistencia" },
    ].map(opt => (
      <DropdownMenuCheckboxItem
        key={opt.value}
        checked={attendancePreset === opt.value}
        onCheckedChange={() => toggleAttendancePreset(opt.value)}
      >
        {opt.label}
      </DropdownMenuCheckboxItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

---

## 6. Restricciones del modo local y cómo mitigarlas

| Restricción | Mitigación |
|---|---|
| Solo funciona sobre `allMembersForDropdowns` (vigentes), no filtra eliminados | El filtro de asistencia es solo para activos — comportamiento correcto |
| No se puede combinar con filtros de rol/GDI/área del servidor | Al activar el filtro de asistencia, los otros filtros se limpian. Se agrega un mensaje visual indicando esto. |
| El sort del servidor no aplica en modo local | En modo local, el sort se hace client-side por `fullName` (simple, suficiente para el caso de uso) |
| Con >500 miembros la lista filtrada podría ser lenta | El `useMemo` tiene buen rendimiento hasta ~1000 miembros. Para congregaciones grandes, la Opción A es necesaria. |

---

## 7. Archivos a modificar — Opción B (solo frontend)

Un único archivo: `grace-hub/src/components/members/members-list-view.tsx`

| Cambio | Descripción |
|---|---|
| Nuevo state `attendancePreset` | Controla el preset activo |
| Nuevo state `localPage` | Paginación local cuando filtro activo |
| Nuevo `useMemo` `attendanceFilteredMembers` | Filtra `allMembersForDropdowns` con `getAttendanceStatus` |
| Nuevo `useMemo` `localPaginatedMembers` | Pagina el resultado local |
| Variables `displayMembers`, `displayTotalPages`, etc. | Switch entre fuentes de datos |
| Función `toggleAttendancePreset` | Toggle con reset de localPage |
| Actualizar `toggleRoleFilter`, `toggleGdiFilter`, `toggleAreaFilter` | Resetean attendancePreset al activarse |
| Actualizar controles de paginación | Usan display vars en lugar de server vars |
| Nuevo dropdown UI de asistencia | Con los 5 presets |
| Badge en filtros activos | Incluir chip de asistencia activa |
| Botón "limpiar filtros" | Incluye reset de attendancePreset y localPage |

---

## 8. Decisión requerida

Antes de implementar esta propuesta, se necesita elegir entre:

**Opción A (Backend)**: 
- Correcto arquitectónicamente
- Combina con otros filtros server-side (AND lógico)
- Mayor costo de implementación (~13 archivos)
- Requiere deploy coordinado de backend + frontend

**Opción B (Frontend/Local)**:
- Implementable en un solo archivo frontend
- No combina con filtros de rol/GDI (limitación por diseño)
- Funciona correctamente para el caso de uso principal
- Costo bajo, deploy solo frontend
- Adecuado para congregaciones < 500 miembros

**Recomendación**: Implementar **Opción B** ahora como solución funcional, con un ticket técnico para migrar a Opción A cuando la congregación crezca o se requiera combinación con otros filtros.

---

## 9. Restricciones y reglas inviolables respetadas (Opción B)

- ✅ No se hace `fetch()` en el client component
- ✅ No se importa de `endpoints/` directamente
- ✅ `page.tsx` no se modifica (Server Component con `force-dynamic` intacto)
- ✅ La arquitectura BFF se respeta — el filtro local usa datos ya recibidos como props
- ✅ El usuario recibe feedback visual claro sobre el modo de filtrado activo
- ✅ No se rompe la paginación server-side cuando el filtro NO está activo
- ✅ Cero cambios en backend para la Opción B
