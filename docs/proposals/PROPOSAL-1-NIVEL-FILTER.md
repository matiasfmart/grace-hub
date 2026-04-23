# Propuesta 1 — Filtro "Nivel" (reemplaza "Rol")

> **Estado**: Implementado — 2026-04-22  
> **Costo**: Bajo — 100% cambios frontend  
> **Riesgo**: Mínimo — zero cambios en backend  
> **Dependencias**: Ninguna (independiente)

---

## 1. Problema que resuelve

El filtro actual llamado **"Rol"** expone los nombres técnicos del sistema estructural:
`Guía GDI`, `Mentor GDI`, `Líder Área`, `Mentor Área`, `Obrero`, `Sin Rol Asignado`.

Estos nombres son internos a la arquitectura de GDIs y Áreas. El pastor o admin que usa la app piensa en términos pastorales: "¿quiénes son mis mentores?", "¿cuántos no están integrados?". La brecha entre vocabulario del sistema y vocabulario pastoral genera fricción y errores de filtrado.

**Caso concreto de confusión reportado**: "Sin GDI Asignado" en el filtro de GDI devuelve tanto "No integrados" (Level 0) como "Mentores sin GDI" (Level 4). El usuario busca los "no integrados" en el dropdown de GDI en vez de ir al dropdown de Rol → "Sin Rol Asignado".

---

## 2. Solución propuesta

Renombrar el filtro **"Rol" → "Nivel"** y reemplazar las opciones individuales técnicas por los 4 niveles pastorales operativos, más corregir el KPI "Sin GDI" para que sea semánticamente preciso.

### Mapeo de opciones

| UI nuevo ("Nivel") | Valor(es) enviados al backend | Lógica |
|---|---|---|
| **No integrado** | `no-role-assigned` | Sin membresía en GDI, sin membresía en Área, sin rol estructural. Idéntico al actual `Sin Rol Asignado`. |
| **Obrero** | `Worker` | En Área sin rol de liderazgo. Idéntico al actual `Obrero`. |
| **Líder** | `GdiGuide,AreaLeader` | Guide de GDI OR Líder de Área. OR semántico — ya soportado por el backend. |
| **Mentor** | `GdiMentor,AreaMentor` | Mentor de GDI OR Mentor de Área. OR semántico — ya soportado por el backend. |

**Level 1 "Miembro"** (en GDI sin rol estructural) **se omite deliberadamente** de las opciones del filtro. Razón funcional: el caso de uso pastoral de aislar únicamente miembros en GDI sin ningún otro rol es muy bajo, y no existe un sentinel backend para este nivel sin cambio de backend. Se puede agregar en Propuesta 2 junto con el backend.

### Corrección KPI "Sin GDI"

El KPI actual:
```typescript
// ❌ ACTUAL — semánticamente incorrecto
const withoutGdi = activeMembers.filter(m => !m.assignedGDIId);
// Incluye: Level 0 + Level 4 (Mentor sin GDI) + Level 2 (Worker sin GDI)
```

Se corrige para usar `calculateOperativeLevel`:
```typescript
// ✅ PROPUESTO — correcto pastoralmente
const withoutGdi = activeMembers.filter(m => calculateOperativeLevel(m) === 0);
// Incluye solo: Level 0 — sin integración de ningún tipo
```

---

## 3. Archivos a modificar

Un único archivo. **Cero cambios en backend**.

### `grace-hub/src/components/members/members-list-view.tsx`

#### 3.1 Reemplazar `roleFilterOptions` (líneas ~300)

**ACTUAL:**
```typescript
const roleFilterOptions: {
  value: MemberRoleType | typeof NO_ROLE_FILTER_VALUE;
  label: string;
}[] = [
  ...Object.entries(roleDisplayMap).map(([value, label]) => ({
    value: value as MemberRoleType,
    label,
  })),
  { value: NO_ROLE_FILTER_VALUE, label: "Sin Rol Asignado" },
];
```

**PROPUESTO:**
```typescript
// Nivel filter options — maps pastoral vocabulary to backend role sentinel values.
// Multiple backend values for a single UI level use OR semantics (already supported
// by buildFilterConditions in member.repository.impl.ts).
// Level 1 "Miembro" (GDI sin rol) omitted: no backend sentinel exists yet.
const nivelFilterOptions: {
  value: string;        // sent as the `role` URL param value(s)
  label: string;
  backendValues: string[]; // actual values to include in the role[] array
}[] = [
  { value: "no-role-assigned", label: "No integrado",  backendValues: ["no-role-assigned"] },
  { value: "Worker",           label: "Obrero",        backendValues: ["Worker"] },
  { value: "Lider",            label: "Líder",         backendValues: ["GdiGuide", "AreaLeader"] },
  { value: "Mentor",           label: "Mentor",        backendValues: ["GdiMentor", "AreaMentor"] },
];
```

> **Nota sobre OR semántico**: El backend `buildFilterConditions` acepta múltiples valores en `roleFilters[]` y los combina con OR. Enviar `["GdiGuide", "AreaLeader"]` ya funciona hoy. No se requiere ningún cambio en backend.

#### 3.2 Actualizar `stats.withoutGdi` en el `useMemo` (línea ~415)

**ACTUAL:**
```typescript
const withoutGdi = activeMembers.filter(m => !m.assignedGDIId);
```

**PROPUESTO:**
```typescript
const withoutGdi = activeMembers.filter(m => calculateOperativeLevel(m) === 0);
```

#### 3.3 Actualizar el label del dropdown de nivel

Buscar en el JSX donde dice `"Rol"` como label del dropdown y reemplazar por `"Nivel"`.

Localización aproximada: dentro del bloque de filtros, el `<DropdownMenuTrigger>` que contiene el label. Buscar:
```tsx
// Texto a encontrar:
>Rol<   // o  label="Rol"
```

Cambiar a:
```tsx
>Nivel<
```

#### 3.4 Actualizar la lógica `toggleRoleFilter` y `applyFiltersWithValues`

El cambio principal es que al seleccionar un nivel, se deben expandir los `backendValues` antes de enviar el parámetro `role` a la URL.

**ACTUAL** (conceptualmente):
```typescript
// Al seleccionar "GdiGuide", envía role=GdiGuide
params.set("role", roles.join(","));
```

**PROPUESTO** — expandir los backend values de cada nivel seleccionado:
```typescript
// Al seleccionar nivel "Líder", envía role=GdiGuide,AreaLeader
const expandedRoleValues = selectedNiveles.flatMap(
  nivel => nivelFilterOptions.find(o => o.value === nivel)?.backendValues ?? [nivel]
);
if (expandedRoleValues.length > 0) params.set("role", expandedRoleValues.join(","));
```

#### 3.5 Actualizar el state inicial `selectedRoles`

El URL param `currentRoleFilters` viene del backend con los valores expandidos (ej: `["GdiGuide", "AreaLeader"]`). Para que los checkboxes del dropdown muestren "Líder" como activo, se necesita mapear de backendValues → nivel UI al inicializar el state.

**Función de utilidad a agregar:**
```typescript
// Converts an array of backend role values (from URL params) to nivel UI keys.
// Example: ["GdiGuide", "AreaLeader"] → ["Lider"]
// Example: ["Worker", "GdiMentor"]   → ["Worker", "Mentor"]
function backendRolesToNivelKeys(backendRoles: string[]): string[] {
  const nivelKeys = new Set<string>();
  for (const nivel of nivelFilterOptions) {
    const hasAll = nivel.backendValues.some(bv => backendRoles.includes(bv));
    if (hasAll) nivelKeys.add(nivel.value);
  }
  return Array.from(nivelKeys);
}
```

El `useState` inicial cambia:
```typescript
// ACTUAL
const [selectedRoles, setSelectedRoles] = useState<string[]>(currentRoleFilters || []);

// PROPUESTO
const [selectedNiveles, setSelectedNiveles] = useState<string[]>(
  backendRolesToNivelKeys(currentRoleFilters || [])
);
```

#### 3.6 Actualizar el chip/badge de filtro activo

Cuando hay roles activos, actualmente aparece un badge que muestra el nombre del rol. Actualizar para mostrar el nombre del nivel:

```typescript
// ACTUAL — muestra "GdiGuide"
roleDisplayMap[role as MemberRoleType] ?? role

// PROPUESTO — muestra "Líder"
nivelFilterOptions.find(o => o.value === role)?.label ?? role
```

---

## 4. No se modifica

- `applyFiltersWithValues` sigue enviando el parámetro `role` a la URL
- El backend `GET /members/search?role=GdiGuide,AreaLeader` ya funciona con OR semántico
- `getAllMembers()` en el service ya acepta `roleFilters?: string[]`
- `membersEndpoint.search()` ya construye el query param `role`
- `members/page.tsx` ya pasa `currentRoleFilters` como prop
- `GetMembersFilteredDto` en el backend no necesita cambios
- `buildFilterConditions` en el backend no necesita cambios

---

## 5. Verificación post-implementación

| Escenario | Resultado esperado |
|---|---|
| Seleccionar "No integrado" | URL: `role=no-role-assigned`. Solo miembros sin GDI, sin Área, sin rol estructural. |
| Seleccionar "Obrero" | URL: `role=Worker`. Miembros en Área sin liderazgo. |
| Seleccionar "Líder" | URL: `role=GdiGuide,AreaLeader`. Guías de GDI + Líderes de Área combinados. |
| Seleccionar "Mentor" | URL: `role=GdiMentor,AreaMentor`. Mentores de GDI + Mentores de Área combinados. |
| Seleccionar "Líder" + "Mentor" | URL: `role=GdiGuide,AreaLeader,GdiMentor,AreaMentor`. Todos los niveles de liderazgo. |
| KPI "Sin GDI" | Muestra solo Level 0 (no integrados reales, sin contar mentores sin GDI). |
| Recargar página con filtro activo | El dropdown muestra los niveles correctos como checked. |

---

## 6. Restricciones y reglas inviolables respetadas

- ✅ No se importa desde `endpoints/` directamente en ningún componente
- ✅ No se hace `fetch()` en el client component
- ✅ No se modifica `page.tsx` (Server Component) — sigue siendo Server Component con `force-dynamic`
- ✅ La comunicación sigue siendo: UI → URL params → page.tsx → getAllMembers() → membersEndpoint.search() → backend
- ✅ Cero cambios en backend — se respetan las capas de Clean Architecture del service
