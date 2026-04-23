# Propuesta 2 — Filtro "Etiqueta" (roles eclesiásticos)

> **Estado**: Pendiente de aprobación  
> **Costo**: Medio — cambios en backend (5 archivos) + frontend (4 archivos)  
> **Riesgo**: Bajo — cambios quirúrgicos y aditivos, no modifican lógica existente  
> **Dependencias**: Ninguna (puede implementarse antes o después de Propuesta 1)

---

## 1. Problema que resuelve

Los miembros ya tienen "etiquetas eclesiásticas" asignadas (Pastor, Diácono, Evangelista, etc.) que se guardan en la tabla `member_roles` y se retornan en `ecclesiasticalRoles[]` de cada miembro. Sin embargo, **no existe ningún filtro en la vista de miembros que permita buscar por estas etiquetas**.

El admin no puede responder preguntas como:
- "¿Cuántos Pastores activos tenemos?"
- "¿Quiénes tienen el rol de Diácono?"
- "Dame todos los miembros etiquetados como Evangelistas"

Esta funcionalidad es especialmente valiosa porque las etiquetas son configurables (`role_types` table) y el admin las crea libremente.

---

## 2. Por qué no puede ser client-side

El sistema usa **paginación server-side**. La página 1 trae 10 miembros de 80 totales. Un filtro client-side solo evaluaría los 10 de la página actual y devolvería resultados incompletos sin ninguna advertencia al usuario. La información sería activamente engañosa.

El filtro **debe ir al backend** para evaluar el universo completo de miembros.

---

## 3. Solución propuesta

Agregar un nuevo parámetro de filtro `ecclesiasticalRoleTypeIds` que viaja por toda la cadena:

```
UI dropdown → URL param `label` → page.tsx → getAllMembers() → membersEndpoint.search() 
→ GET /members/search?label=1,3 → GetMembersFilteredDto → GetMembersFilteredOptions 
→ MemberFilterOptions → buildFilterConditions() → SQL EXISTS
```

---

## 4. Archivos a modificar — Backend (grace-hub-service)

### 4.1 `member-query.types.ts` — Agregar campo al domain type

**Archivo**: `src/modules/members/domain/read-models/member-query.types.ts`

**Cambio**: Agregar un campo opcional en `MemberFilterOptions`.

```typescript
export interface MemberFilterOptions {
  // ... campos existentes sin cambiar ...
  page: number;
  pageSize: number;
  offset: number;
  searchTerm?: string;
  statusFilters?: string[];
  roleFilters?: string[];
  gdiFilters?: string[];
  areaFilters?: string[];
  joinDateFrom?: string;
  joinDateTo?: string;
  ageMin?: number;
  ageMax?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // NUEVO — filtrar por ID(s) de rol eclesiástico (OR semántico)
  ecclesiasticalRoleTypeIds?: number[];
}
```

**Regla respetada**: El domain layer solo define la interfaz. No importa NestJS ni TypeORM.

---

### 4.2 `get-members-filtered.options.ts` — Agregar campo al use case options

**Archivo**: `src/modules/members/application/use-cases/get-members-filtered/get-members-filtered.options.ts`

**Cambio**: Agregar el campo en `GetMembersFilteredOptions` y pasarlo en la creación de `MemberFilterOptions`.

```typescript
export interface GetMembersFilteredOptions {
  // ... campos existentes sin cambiar ...
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  statusFilters?: string[];
  roleFilters?: string[];
  gdiFilters?: string[];
  areaFilters?: string[];
  joinDateFrom?: string;
  joinDateTo?: string;
  ageMin?: number;
  ageMax?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  // NUEVO
  ecclesiasticalRoleTypeIds?: number[];
}
```

**Regla respetada**: Application layer no contiene lógica de negocio. Solo orquesta.

---

### 4.3 `get-members-filtered.use-case.ts` — Pasar el nuevo campo al repository

**Archivo**: `src/modules/members/application/use-cases/get-members-filtered/get-members-filtered.use-case.ts`

**Cambio**: Agregar el campo en la llamada a `findAllWithAssignmentsFiltered`.

```typescript
return await this.memberRepository.findAllWithAssignmentsFiltered({
  page: pagination.page,
  pageSize: pagination.pageSize,
  offset: pagination.offset,
  searchTerm: options.searchTerm,
  statusFilters: options.statusFilters,
  roleFilters: options.roleFilters,
  gdiFilters: options.gdiFilters,
  areaFilters: options.areaFilters,
  joinDateFrom: options.joinDateFrom,
  joinDateTo: options.joinDateTo,
  ageMin: options.ageMin,
  ageMax: options.ageMax,
  sortBy: options.sortBy,
  sortOrder: options.sortOrder,
  // NUEVO
  ecclesiasticalRoleTypeIds: options.ecclesiasticalRoleTypeIds,
});
```

---

### 4.4 `get-members-filtered.dto.ts` — Recibir el param HTTP

**Archivo**: `src/modules/members/presentation/dtos/get-members-filtered.dto.ts`

**Cambio**: Agregar el campo `label` como query param. Se transforma de string CSV a `number[]`.

```typescript
/** Filter by ecclesiastical label IDs (comma-separated). OR semantics. */
@IsOptional()
@IsArray()
@Transform(({ value }) => {
  if (typeof value === 'string') {
    return value.split(',').map(Number).filter(n => !isNaN(n));
  }
  if (Array.isArray(value)) {
    return value.map(Number).filter(n => !isNaN(n));
  }
  return value;
})
label?: number[];
```

> **Nombre del param HTTP**: `label` (corto, legible en URL). El campo interno en DTOs y options usa el nombre semántico `ecclesiasticalRoleTypeIds`.

---

### 4.5 `members.controller.ts` — Mapear DTO → options

**Archivo**: `src/modules/members/presentation/controllers/members.controller.ts`

**Cambio**: En el método `findFiltered`, agregar el campo al construir `GetMembersFilteredOptions`.

```typescript
const options: GetMembersFilteredOptions = {
  page: queryDto.page,
  pageSize: queryDto.pageSize,
  searchTerm: queryDto.search,
  statusFilters: queryDto.status,
  roleFilters: queryDto.role,
  gdiFilters: queryDto.gdi?.map(String),
  areaFilters: queryDto.area?.map(String),
  joinDateFrom: queryDto.joinFrom,
  joinDateTo: queryDto.joinTo,
  ageMin: queryDto.ageMin,
  ageMax: queryDto.ageMax,
  sortBy: queryDto.sortBy,
  sortOrder: (queryDto.sortOrder === 'desc' ? 'desc' : 'asc') as 'asc' | 'desc',
  // NUEVO
  ecclesiasticalRoleTypeIds: queryDto.label,
};
```

---

### 4.6 `member.repository.impl.ts` — Agregar la condición SQL

**Archivo**: `src/modules/members/infrastructure/persistence/typeorm/member.repository.impl.ts`

**Cambio**: En el método `buildFilterConditions`, agregar el bloque para filtrar por etiquetas eclesiásticas.

Se agrega al final del método, antes del `return { conditions, params }`:

```typescript
// Ecclesiastical label filter — OR semantics: member has ANY of the selected role_type_ids
if (options.ecclesiasticalRoleTypeIds && options.ecclesiasticalRoleTypeIds.length > 0) {
  conditions.push(`EXISTS(
    SELECT 1 FROM member_roles mr
    WHERE mr.member_id = m.member_id
    AND mr.role_type_id = ANY($${paramIndex}::int[])
  )`);
  params.push(options.ecclesiasticalRoleTypeIds);
  paramIndex++;
}
```

**SQL explicado**:
- `member_roles` es la tabla que almacena las asignaciones de etiquetas eclesiásticas (`mr.member_id` → `mr.role_type_id`)
- `ANY($n::int[])` es la forma segura de PostgreSQL para filtrar contra un array, evitando SQL injection
- OR semántico: el `ANY` es un OR implícito — si el miembro tiene alguno de los IDs seleccionados, pasa el filtro
- Compatible con el sistema de `paramIndex` incremental existente

**Seguridad**: Los IDs llegan como `number[]` (ya transformados por el `@Transform` del DTO), por lo que el cast `::int[]` es redundantemente seguro. No hay interpolación de strings.

---

## 5. Archivos a modificar — Frontend (grace-hub)

### 5.1 `types.ts` (API types) — Agregar campo al params

**Archivo**: `src/lib/api/types.ts`

**Cambio**: Agregar `label` en `ApiMembersFilterParams`.

```typescript
export interface ApiMembersFilterParams {
  // ... campos existentes sin cambiar ...
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string[];
  role?: string[];
  gdi?: number[];
  area?: number[];
  joinFrom?: string;
  joinTo?: string;
  ageMin?: number;
  ageMax?: number;
  sortBy?: 'fullName' | 'churchJoinDate' | 'birthDate';
  sortOrder?: 'asc' | 'desc';
  // NUEVO — ecclesiastical label IDs (OR semantics)
  label?: number[];
}
```

---

### 5.2 `membersEndpoint.ts` — Construir el query param

**Archivo**: `src/lib/api/endpoints/membersEndpoint.ts`

**Cambio**: En el método `search`, agregar la construcción del param `label`.

```typescript
// Agregar junto a los otros params:
if (params.label?.length) queryParams.set('label', params.label.join(','));
```

---

### 5.3 `membersService.ts` — Recibir y pasar el nuevo filtro

**Archivo**: `src/lib/api/services/membersService.ts`

**Cambio**: Agregar `ecclesiasticalRoleTypeIds` como parámetro de `getAllMembers()` y mapearlo a `params.label`.

```typescript
export async function getAllMembers(
  page: number = 1,
  pageSize: number = 10,
  searchTerm?: string,
  memberStatusFilters?: string[],
  roleFilters?: string[],
  gdiFilters?: string[],
  areaFilters?: string[],
  joinDateFrom?: string,
  joinDateTo?: string,
  ageMin?: number,
  ageMax?: number,
  sortBy?: 'fullName' | 'churchJoinDate' | 'birthDate',
  sortOrder?: 'asc' | 'desc',
  ecclesiasticalRoleTypeIds?: number[],  // NUEVO parámetro al final
): Promise<{ members: Member[]; totalMembers: number; totalPages: number }> {
  const params: import('../types').ApiMembersFilterParams = {
    // ... params existentes sin cambiar ...
    page,
    pageSize,
    search: searchTerm?.trim() || undefined,
    status: memberStatusFilters?.length ? memberStatusFilters : undefined,
    role: roleFilters?.length ? roleFilters : undefined,
    gdi: gdiFilters?.length ? gdiFilters.map(g => Number(g)).filter(n => !isNaN(n)) : undefined,
    area: areaFilters?.length ? areaFilters.map(a => Number(a)).filter(n => !isNaN(n)) : undefined,
    joinFrom: joinDateFrom || undefined,
    joinTo: joinDateTo || undefined,
    ageMin: ageMin !== undefined ? ageMin : undefined,
    ageMax: ageMax !== undefined ? ageMax : undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
    // NUEVO
    label: ecclesiasticalRoleTypeIds?.length ? ecclesiasticalRoleTypeIds : undefined,
  };

  const response = await membersEndpoint.search(params);
  // ... resto sin cambios
}
```

---

### 5.4 `members/page.tsx` — Leer URL param y pasar a getAllMembers

**Archivo**: `src/app/(protected)/members/page.tsx`

**Cambio**: Leer el nuevo URL param `label`, parsearlo a `number[]`, y pasarlo a `getAllMembers()`.

En `getMembersPageData`, agregar parámetro y lectura:

```typescript
async function getMembersPageData(
  // ... params existentes sin cambiar ...
  ecclesiasticalRoleTypeIds?: number[],  // NUEVO
) {
  // ... cálculos existentes sin cambiar ...

  const { members, totalMembers, totalPages } = await getAllMembers(
    currentPageParam,
    pageSizeParam,
    searchTermParam,
    memberStatusFiltersParam,
    roleFiltersParam,
    guideFiltersParam,
    areaFiltersParam,
    joinDateFrom,
    joinDateTo,
    ageMin,
    ageMax,
    sortBy,
    sortOrder,
    ecclesiasticalRoleTypeIds,  // NUEVO
  );
  // ...
}
```

En el componente principal `Page`, leer del searchParams:
```typescript
const labelParam = searchParams.label;
const ecclesiasticalRoleTypeIds = labelParam
  ? String(labelParam).split(',').map(Number).filter(n => !isNaN(n))
  : undefined;
```

Y pasar a `MembersListView` como nueva prop `currentLabelFilters`.

---

### 5.5 `members-list-view.tsx` — UI del filtro "Etiqueta"

**Archivo**: `src/components/members/members-list-view.tsx`

**Cambio**: Agregar el dropdown de filtro por etiqueta.

#### Props nuevas a agregar en `MembersListViewProps`:
```typescript
currentLabelFilters?: number[];
```

#### State nuevo:
```typescript
const [selectedLabels, setSelectedLabels] = useState<number[]>(currentLabelFilters || []);
```

#### En `applyFiltersWithValues`, agregar el param:
```typescript
if (expandedLabelIds.length > 0) params.set("label", expandedLabelIds.join(","));
```

#### Dropdown de UI usando `allRoleTypes` (prop ya existente en `MembersListViewProps`):
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="outline" size="sm" className={cn(selectedLabels.length > 0 && "border-primary")}>
      Etiqueta
      {selectedLabels.length > 0 && (
        <Badge className="ml-1">{selectedLabels.length}</Badge>
      )}
      <ChevronDown className="ml-1 h-4 w-4" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start">
    <DropdownMenuLabel>Etiqueta eclesiástica</DropdownMenuLabel>
    <DropdownMenuSeparator />
    {allRoleTypes.map(rt => (
      <DropdownMenuCheckboxItem
        key={rt.roleTypeId}
        checked={selectedLabels.includes(rt.roleTypeId)}
        onCheckedChange={() => toggleLabelFilter(rt.roleTypeId)}
      >
        {rt.name}
      </DropdownMenuCheckboxItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

> `allRoleTypes` ya es una prop existente de tipo `RoleType[]` con `{ roleTypeId: number; name: string }`. No se necesita ninguna nueva llamada al backend.

---

## 6. Flujo completo de datos verificado

```
UI: Usuario selecciona "Pastor" (roleTypeId=2) y "Diácono" (roleTypeId=5)
  → state: selectedLabels = [2, 5]
  → URL: ?label=2,5
  → page.tsx: ecclesiasticalRoleTypeIds = [2, 5]
  → getAllMembers(..., [2, 5])
  → params.label = [2, 5]
  → membersEndpoint.search({ label: [2, 5] })
  → queryParams: "label=2,5"
  → GET /api/v1/members/search?label=2,5
  → GetMembersFilteredDto.label = [2, 5] (transformado por @Transform)
  → options.ecclesiasticalRoleTypeIds = [2, 5]
  → MemberFilterOptions.ecclesiasticalRoleTypeIds = [2, 5]
  → SQL: WHERE ... AND EXISTS(SELECT 1 FROM member_roles mr WHERE mr.member_id = m.member_id AND mr.role_type_id = ANY($n::int[]))
  → params[$n] = [2, 5]
  → Retorna solo miembros con etiqueta "Pastor" OR "Diácono"
```

---

## 7. No se modifica

- `IMemberRepository` (interfaz) — el campo `ecclesiasticalRoleTypeIds` se agrega en `MemberFilterOptions` que ya es parte del contrato. No se necesita cambiar la firma del método `findAllWithAssignmentsFiltered`.
- `MemberApplicationService` — orquesta sin lógica, ya pasa todo desde options al use case
- La query base `MEMBER_WITH_ASSIGNMENTS_QUERY` — no se toca (los datos eclesiásticos ya se retornan)
- `MemberResponseDto` — no se toca (ya retorna `ecclesiasticalRoles`)
- Ningún otro módulo del backend

---

## 8. Verificación post-implementación

| Escenario | Resultado esperado |
|---|---|
| Sin filtro de etiqueta activo | Comportamiento idéntico al actual |
| Seleccionar 1 etiqueta | URL: `label=N`. Solo miembros con esa etiqueta, en cualquier página. |
| Seleccionar 2 etiquetas | URL: `label=N,M`. Miembros con etiqueta N OR etiqueta M. |
| Combinar con filtro "Nivel" | URL: `role=Worker&label=3`. Obreros que también son Diáconos. |
| Dropdown vacío | Si no hay role_types configurados, el dropdown aparece vacío. No crashea. |
| Sin label en URL | `ecclesiasticalRoleTypeIds` es `undefined`, no se agrega condición SQL. |

---

## 9. Restricciones y reglas inviolables respetadas

**Backend (Clean Architecture)**:
- ✅ Domain layer: `MemberFilterOptions` solo agrega un campo primitivo `number[]`. Sin importar NestJS/TypeORM.
- ✅ Application layer: `GetMembersFilteredOptions` y el use case solo pasan el campo sin lógica.
- ✅ Presentation layer: El DTO valida y transforma el input HTTP antes de que llegue al domain.
- ✅ Infrastructure layer: Solo `member.repository.impl.ts` conoce el SQL. La condición usa `ANY($n::int[])` — parametrizada, sin interpolación de strings.
- ✅ `IMemberRepository` interface no necesita cambio de firma (el campo nuevo va dentro de `MemberFilterOptions`).

**Frontend (BFF + Layered Architecture)**:
- ✅ `page.tsx` es Server Component con `force-dynamic` — lee URL params, llama service, pasa props.
- ✅ `members-list-view.tsx` es Client Component — solo manipula URL params, no hace fetch.
- ✅ El client component importa Server Actions o lee props, nunca services directamente.
- ✅ `membersEndpoint.ts` es la única capa que construye la URL de la API.
- ✅ `membersService.ts` orquesta endpoint + mapper, no hace fetch.
- ✅ `ApiMembersFilterParams` en `types.ts` es el único lugar donde se documenta el contrato API.
