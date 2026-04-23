# PROPOSAL-4 — Mejoras UX Pendientes: Vista de Miembros

> **Fecha:** 2026-04-22  
> **Ámbito:** `grace-hub/` — Frontend only (todos los ítems)  
> **Archivo principal:** `grace-hub/src/components/members/members-list-view.tsx`  
> **Origen:** Migrado desde `docs-grace-hub/mejoras-lista-miembros/` (carpeta eliminada el 2026-04-22)  
> **Estado de análisis:** Completo — implementación pendiente de aprobación

---

## Resumen ejecutivo

Cuatro mejoras UX pendientes de la vista de miembros. Los ítems de alta y media prioridad originales (M-01 debounce, M-03 AlertDialog, M-05 nivel operativo, M-06 colores avatar, M-08 sort server-side) ya fueron implementados. Quedan 4 pendientes.

| ID | Prioridad | Título | Scope | Esfuerzo |
|----|-----------|--------|-------|----------|
| M-04 | 🔴 Alta | Tooltip en áreas truncadas | Frontend | Bajo |
| M-07 | 🟡 Media | Buscador en sección "Dados de baja" | Frontend | Bajo |
| M-09 | 🟢 Baja | Vista "tarjetas" alternativa | Frontend | Alto |
| M-10 | 🟢 Baja | Exportación a CSV/Excel | Frontend + Backend | Alto |

---

## M-04 — Tooltip en áreas truncadas

### Problema

La columna "Áreas" muestra máximo 2 badges. Si un miembro pertenece a 3 o más áreas, el resto se muestra como `+N` sin información adicional. El usuario no puede ver los nombres sin abrir el panel de detalle.

```tsx
// Código actual — members-list-view.tsx
{memberAreas.length > 2 && (
    <Badge variant="secondary" className="text-xs">
        +{memberAreas.length - 2}
    </Badge>
)}
```

### Cambios a realizar

**Archivo:** `grace-hub/src/components/members/members-list-view.tsx`

#### 1. Verificar imports de Tooltip

```tsx
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
```

#### 2. Envolver el badge `+N` en un Tooltip

```tsx
// Reemplazar:
{memberAreas.length > 2 && (
    <Badge variant="secondary" className="text-xs">
        +{memberAreas.length - 2}
    </Badge>
)}

// Por:
{memberAreas.length > 2 && (
    <Tooltip>
        <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-xs cursor-default">
                +{memberAreas.length - 2}
            </Badge>
        </TooltipTrigger>
        <TooltipContent>
            <div className="flex flex-col gap-0.5">
                {memberAreas.slice(2).map((area) => (
                    <span key={area.id} className="text-xs">{area.name}</span>
                ))}
            </div>
        </TooltipContent>
    </Tooltip>
)}
```

#### 3. Envolver la tabla en `<TooltipProvider>`

Si `TooltipProvider` no está ya en el árbol, envolver el retorno del componente:

```tsx
return (
    <TooltipProvider>
        {/* ... contenido actual del componente ... */}
    </TooltipProvider>
);
```

### Riesgos

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| `tooltip.tsx` no existe en `components/ui/` | Bajo | Instalar con `npx shadcn-ui@latest add tooltip` |
| TooltipProvider duplicado si ya existe en layout | Bajo | Radix permite providers anidados sin conflicto |

**Archivos afectados:** Solo `members-list-view.tsx`

---

## M-07 — Buscador en sección "Dados de baja"

### Problema

La sección colapsable "Dados de baja" no tiene campo de búsqueda. Si hay 20+ miembros dados de baja, el usuario debe hacer scroll para encontrar uno. El buscador principal solo filtra miembros activos (hace request al backend); los dados de baja se muestran client-side desde `allMembersForDropdowns`.

### Cambios a realizar

**Archivo:** `grace-hub/src/components/members/members-list-view.tsx`

#### 1. Agregar estado de búsqueda local para dados de baja

```tsx
const [inactiveMembersSearch, setInactiveMembersSearch] = useState("");
```

#### 2. Filtrar `inactiveMembers` con el buscador local

```tsx
// Existe ya: const inactiveMembers = allMembersForDropdowns.filter(m => m.status === 'eliminado')
// Agregar filtro:
const filteredInactiveMembers = useMemo(() => {
    if (!inactiveMembersSearch.trim()) return inactiveMembers;
    const query = inactiveMembersSearch.toLowerCase();
    return inactiveMembers.filter(
        m =>
            m.firstName.toLowerCase().includes(query) ||
            m.lastName.toLowerCase().includes(query)
    );
}, [inactiveMembers, inactiveMembersSearch]);
```

#### 3. Agregar Input de búsqueda en el header del collapsible

Localizar el header de la sección colapsable "Dados de baja" y agregar el input antes de la lista:

```tsx
<Input
    type="text"
    placeholder="Buscar en dados de baja..."
    value={inactiveMembersSearch}
    onChange={(e) => setInactiveMembersSearch(e.target.value)}
    className="h-8 w-full sm:w-56 text-sm mb-2"
/>
```

#### 4. Usar `filteredInactiveMembers` en lugar de `inactiveMembers` en el render

```tsx
// Reemplazar el map de inactiveMembers por filteredInactiveMembers
{filteredInactiveMembers.map((member) => ( ... ))}
```

**Archivos afectados:** Solo `members-list-view.tsx`

---

## M-09 — Vista "tarjetas" alternativa a la tabla

### Problema

La vista de miembros solo tiene una tabla. En pantallas pequeñas o para uso más visual, una vista de tarjetas por miembro sería más escaneable para el pastor.

### Cambios a realizar

**Archivo:** `grace-hub/src/components/members/members-list-view.tsx`

#### 1. Agregar estado de vista

```tsx
type ViewMode = "table" | "cards";
const [viewMode, setViewMode] = useState<ViewMode>("table");
```

#### 2. Agregar toggle en la toolbar

```tsx
// Junto a los botones de acción existentes, agregar toggle:
<div className="flex border rounded-md overflow-hidden">
    <Button
        variant={viewMode === "table" ? "default" : "ghost"}
        size="sm"
        onClick={() => setViewMode("table")}
        className="rounded-none"
    >
        <TableIcon className="h-4 w-4" />
    </Button>
    <Button
        variant={viewMode === "cards" ? "default" : "ghost"}
        size="sm"
        onClick={() => setViewMode("cards")}
        className="rounded-none"
    >
        <LayoutGridIcon className="h-4 w-4" />
    </Button>
</div>
```

#### 3. Renderizar condicionalmente tabla o cards

```tsx
{viewMode === "table" ? (
    // ... tabla existente ...
) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {processedMembers.map((member) => {
            const level = calculateOperativeLevel(member);
            const config = operativeLevelConfig[level];
            return (
                <Card key={member.id} className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedMember(member)}>
                    <CardContent className="p-4 flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarFallback className={cn("text-xs", config.avatarClass)}>
                                {member.firstName[0]}{member.lastName[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                                {member.firstName} {member.lastName}
                            </p>
                            <div className="flex items-center gap-1.5 mt-1">
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotClass)} />
                                <span className="text-xs text-muted-foreground">{config.label}</span>
                            </div>
                            {member.assignedGDIName && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">
                                    {member.assignedGDIName}
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>
            );
        })}
    </div>
)}
```

### Riesgos

| Riesgo | Nivel | Mitigación |
|--------|-------|------------|
| `Card`, `CardContent` de shadcn deben estar disponibles | Bajo | Ya están en el proyecto |
| `LayoutGridIcon`, `TableIcon` de lucide-react | Bajo | Ya están disponibles |
| La paginación sigue siendo por filas, no por cards | Medio | No es necesario cambiar — el conteo es el mismo |

**Archivos afectados:** Solo `members-list-view.tsx`

---

## M-10 — Exportación a CSV/Excel

### Problema

No existe forma de exportar la lista de miembros. Es útil para informes, comunicados o cruce con otras herramientas de la iglesia.

### Opciones de implementación

**Opción A (Frontend only — CSV):** Exportar directamente en el browser usando los datos ya cargados en `allMembersForDropdowns`.

```typescript
// Función pura de exportación — puede ser una utilidad en lib/utils/
export function exportMembersToCSV(members: Member[]): void {
    const headers = [
        "Nombre", "Apellido", "Contacto", "Nivel", "GDI", "Áreas",
        "Fecha ingreso", "Fecha bautismo"
    ];

    const rows = members.map(m => [
        m.firstName,
        m.lastName,
        m.contact ?? "",
        getOperativeLevelLabel(calculateOperativeLevel(m)),
        m.assignedGDIName ?? "",
        m.assignedAreas?.map(a => a.name).join("; ") ?? "",
        m.churchJoinDate ?? "",
        m.baptismDate ?? "",
    ]);

    const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `miembros-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
```

**Opción B (Backend — Excel):** Endpoint `GET /members/export` que retorna un stream `.xlsx` usando `exceljs`. Requiere cambios en backend (nueva capa de presentación, use case de exportación).

### Recomendación

**Opción A** para el corto plazo — cero cambios en backend, exporta los datos ya disponibles en memoria. Opción B si se requiere exportación de grandes volúmenes con filtros server-side o formato Excel enriquecido.

**Archivos afectados (Opción A):**
- `grace-hub/src/lib/utils/exportUtils.ts` — función nueva
- `grace-hub/src/components/members/members-list-view.tsx` — botón de exportar + llamada a la función

---

## Notas de implementación

- M-04 y M-07 son mejoras independientes y de bajo riesgo. Pueden implementarse en cualquier orden.
- M-09 y M-10 son independientes entre sí y de M-04/M-07.
- Todos los cambios son en `members-list-view.tsx` excepto M-10 Opción A que agrega un archivo utilitario nuevo.
- Ninguno requiere cambios en el backend (excepto M-10 Opción B).
- Verificar con `npx tsc --noEmit` después de cada ítem.
