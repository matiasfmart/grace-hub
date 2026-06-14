# PROPOSAL-001 — Fecha y hora de visita + vínculo a serie de reunión en Prospectos

> **Estado:** ⏳ Aprobada — **pendiente de implementación**  
> **Fecha:** 2026-05-03  
> **Ámbito:** `grace-hub-service/` + `grace-hub/` + `grace-hub-welcome/`  
> **Prioridad:** Alta — problema operativo activo: la iglesia tiene múltiples reuniones por día y sin hora ni serie es imposible saber en cuál estuvo el visitante.

---

## 1. Problema

La columna `visit_date` en la tabla `prospects` es de tipo `DATE` (solo año-mes-día). Esto impide:

1. Saber **a qué hora** visitó el prospecto — la iglesia tiene cultos a las 10:00 y a las 18:00 el mismo domingo.
2. Saber **en qué reunión** estuvo — GDI, Área, culto general, etc.
3. Tomar acciones de seguimiento coherentes: si vino al culto de la tarde, invitarlo al GDI del turno tarde; si vino a una reunión de jóvenes, asignarlo a esa área.

---

## 2. Solución propuesta

Combinar dos cambios complementarios:

| Cambio | Propósito |
|---|---|
| **B: `visit_date DATE` → `visit_at TIMESTAMPTZ`** | Registrar día + hora exacta de la visita |
| **C: FK opcional `meeting_series_id`** | Vincular semánticamente el prospecto a la serie en la que estuvo |

Ambos campos son **opcionales** para no romper el flujo existente ni generar fricción innecesaria. El campo `meeting_series_id` es recomendado pero no requerido.

---

## 3. Análisis funcional y de UX

### 3.1 Flujo actual — PWA (Equipo de Bienvenida)

El voluntario del equipo de bienvenida:
1. Se loguea con el código de equipo → recibe JWT con `scope: 'welcome_team'`
2. Abre el formulario de registro
3. Selecciona quién está registrando (`addedBy` — no se resetea entre registros)
4. Completa nombre + apellido + contacto + notas del visitante
5. Envía → el backend recibe `visitDate: todayISO()` (solo la fecha del día)

El `addedBy` se preserva entre registros porque el mismo voluntario registra varios visitantes en un turno. La misma lógica aplica a la **serie de reunión**: si estamos en el culto dominical de la mañana, TODOS los visitantes de esa tanda pertenecen a la misma serie. No tiene sentido seleccionarla por cada visitante.

### 3.2 UX decision: selector "de tanda" pre-seleccionado

El selector de serie **no se muestra al login** (sería antinatural preguntarlo antes de ver el formulario) sino que aparece **dentro del formulario de registro**, con las siguientes propiedades:

- **No se resetea** después de cada submit exitoso — igual que `addedBy`.
- **Persiste en `localStorage`** entre registros: tanto en el admin desktop como en la PWA. Esto incluye sobrevivir un F5, a diferencia de `addedBy` en la PWA (que actualmente usa solo estado React y se pierde al recargar). La justificación es que la serie de reunión es más estable — el mismo culto dura horas y un voluntario podría recargar la página accidentalmente.
- **Es editable** por registro individual — si un visitante de la tarde llega tarde y se lo registra durante la tanda de la mañana, el voluntario puede cambiarlo.
- **Es opcional** — si no se selecciona, `meetingSeriesId` queda como `undefined` y no se envía.
- **Muestra un hint visual** ("Recomendado") para guiar al equipo sin obligarlo.

### 3.3 UX decision: `datetime-local` en el admin desktop

En el formulario de registro/edición del admin desktop (`register-prospect-dialog.tsx` y `edit-prospect-dialog.tsx`):
- El input cambia de `type="date"` a `type="datetime-local"`.
- El valor por defecto es `nowISO()` (momento actual, no solo la fecha).
- Al editar un prospecto existente cuyo `visit_at` tiene hora `00:00:00Z` (dato migrado), se muestra la fecha con nota "hora no disponible" y el campo se edita normalmente.

### 3.4 Display en las tres tablas

El campo `Fecha de visita` en Pendientes, Integrados y Archivados muestra:

| Caso | Display |
|---|---|
| Dato nuevo (hora real) | `jue, 10 abr · 10:32` |
| Dato migrado (hora 00:00 UTC) | `jue, 10 abr` (sin hora — no hay hora confiable) |
| Prospecto con serie | Badge `"Culto Domingo Mañana"` debajo de la fecha |
| Prospecto sin serie | Sin badge |

### 3.5 Sorting en las tablas

El sort actual usa `localeCompare` sobre el string `visitDate`. Con el cambio a ISO datetime el sort sigue siendo correcto — los strings ISO 8601 ordenan lexicográficamente de forma consistente con el orden cronológico. Sin embargo, la comparación solo tiene sentido en los componentes que ordenan en el cliente; el backend ya ordena por `visit_at DESC` y es la fuente de verdad.

---

## 4. Reglas de arquitectura que aplican

> Este documento se rige por las reglas inviolables definidas en:
> - `grace-hub/docs/architecture/ARCHITECTURE_RULES.md`
> - `grace-hub-service/docs/architecture/ARCHITECTURE_RULES.md`
> - `grace-hub-service/docs/architecture/CLEAN_ARCHITECTURE.md`

### 4.1 Reglas del frontend (grace-hub)

| Regla | Aplicación en esta feature |
|---|---|
| **BFF** — Client Components nunca llaman al backend directamente | El selector de series en el dialog (Client Component) carga las series via **Server Action on-demand** al abrir el dialog (`prospectActions.ts`), no importando `meetingsService` directamente |
| **Regla P-2** — No cargar datos masivos en render inicial que solo se usan en flujos secundarios | Las series se cargan on-demand cuando se abre el dialog, no en el `page.tsx` de miembros |
| **Capas**: Pages/Components → Server Actions → Services → Endpoints → Client | El flujo de carga de series sigue exactamente este orden |
| **Server Actions** deben tener `"use server"`, retornar `{ success, message }`, llamar `revalidatePath` después de mutaciones | La nueva `getAllMeetingSeriesAction` sigue el patrón |
| **Mapper**: único lugar que conoce la estructura del backend | `visitDate` → `visitAt` se mapea en `prospectMapper.ts` |
| **Types**: `Api*` en `lib/api/types.ts`, tipos frontend en `lib/types.ts` | Se sigue esta separación |

### 4.2 Reglas del backend (grace-hub-service)

| Regla | Aplicación en esta feature |
|---|---|
| **Lógica de negocio solo en Domain** | La validación `meetingSeriesId es opcional` se define en `Prospect.create()` — el Use Case no valida esta regla |
| **Application NO importa Infrastructure** | El Use Case recibe `meetingSeriesId?: number` en el Command; no conoce la entidad TypeORM |
| **Domain no importa NestJS ni TypeORM** | El aggregate `Prospect` solo agrega `_meetingSeriesId?: number` como primitivo |
| **Presentation mapea DTO → Command** | El controller convierte `dto.meetingSeriesId` en el Command antes de pasarlo al Application Service |
| **Repository Interface en Domain** | `IProspectRepository.updateFields()` recibe `meetingSeriesId?: number` — la implementación concreta es transparente |
| **FK `ON DELETE SET NULL`** | Si se borra una serie, `meeting_series_id` queda `NULL` — el prospecto no se borra |

---

## 5. Mapa completo de archivos afectados

### 5.1 Base de datos — 1 migración SQL

```sql
-- 1. Renombrar columna y cambiar tipo
ALTER TABLE prospects RENAME COLUMN visit_date TO visit_at;
ALTER TABLE prospects
  ALTER COLUMN visit_at TYPE TIMESTAMPTZ
  USING (visit_at::date)::timestamptz AT TIME ZONE 'UTC';

-- 2. Nueva columna FK opcional
ALTER TABLE prospects
  ADD COLUMN meeting_series_id INTEGER
  REFERENCES meeting_series(series_id) ON DELETE SET NULL;

-- 3. Actualizar índices
DROP INDEX IF EXISTS idx_prospects_visit_date;
CREATE INDEX idx_prospects_visit_at ON prospects(visit_at);
CREATE INDEX idx_prospects_meeting_series ON prospects(meeting_series_id);
```

> **Nota de migración:** Los registros existentes tendrán `visit_at = YYYY-MM-DDT00:00:00Z`.
> La hora `00:00:00Z` se usa en el frontend como señal de "dato migrado sin hora disponible".
> `meeting_series_id` queda `NULL` en todos los registros existentes.

### 5.2 Backend `grace-hub-service` — 9 archivos

#### `src/modules/prospects/infrastructure/persistence/typeorm/prospect.typeorm.entity.ts`

```typescript
// ANTES
@Column({ name: 'visit_date', type: 'date', transformer: DateTransformer })
visitDate: Date;

// DESPUÉS
@Column({ name: 'visit_at', type: 'timestamptz' })
visitAt: Date;

@Column({ name: 'meeting_series_id', type: 'integer', nullable: true })
meetingSeriesId?: number;
```

> **Regla ARCH-BE:** Infrastructure puede importar TypeORM. Solo cambian detalles de persistencia — el dominio no cambia de semántica.

#### `src/modules/prospects/domain/prospect.aggregate.ts`

Agregar campo y getter:

```typescript
// En el constructor privado — nuevo parámetro
private _meetingSeriesId: number | undefined,

// Getter
get meetingSeriesId(): number | undefined { return this._meetingSeriesId; }

// Read-model (igual que addedByName — no es estado de dominio)
public meetingSeriesName?: string;

// En Prospect.create() — nuevo parámetro opcional al final
public static create(
  firstName: string,
  lastName: string,
  visitAt: Date,        // ← renombrado
  contact?: string,
  source: ProspectSource = ProspectSource.MANUAL,
  addedBy?: number,
  notes?: string,
  meetingSeriesId?: number,  // ← nuevo, al final, opcional
): Prospect { ... }

// En Prospect.reconstitute() — nuevo parámetro antes de createdAt
public static reconstitute(
  ...,
  meetingSeriesId: number | undefined,
  createdAt: Date,
  updatedAt: Date,
): Prospect { ... }
```

> **Regla ARCH-BE:** `_meetingSeriesId` es un primitivo `number`, no una entidad. El Domain no conoce la entidad `MeetingSeries` — solo almacena su ID como FK. La validación de existencia de la serie es responsabilidad de la Infrastructure (FK en DB).

#### `src/modules/prospects/application/commands/create-prospect.command.ts`

```typescript
export class CreateProspectCommand {
  constructor(
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly visitAt: Date,          // ← renombrado
    public readonly contact?: string,
    public readonly source: ProspectSource = ProspectSource.MANUAL,
    public readonly addedBy?: number,
    public readonly notes?: string,
    public readonly meetingSeriesId?: number,  // ← nuevo
  ) {}
}
```

#### `src/modules/prospects/presentation/dtos/create-prospect.dto.ts`

```typescript
@IsDateString()
visitDate: string;  // ← mantiene nombre "visitDate" en el contrato HTTP para no romper la PWA antigua

@IsOptional()
@IsInt()
meetingSeriesId?: number;  // ← nuevo
```

> **Decisión de compatibilidad:** El campo HTTP se mantiene como `visitDate` aunque la columna en DB se llama `visit_at`. El DTO es el contrato externo — cambiarlo obligaría a actualizar la PWA simultáneamente. Esto desacopla el deploy.

#### `src/modules/prospects/presentation/controllers/prospects.controller.ts`

```typescript
// En el método create():
const command = new CreateProspectCommand(
  dto.firstName,
  dto.lastName,
  new Date(dto.visitDate),    // ← new Date() ya maneja ISO datetime
  dto.contact,
  dto.source ?? ProspectSource.MANUAL,
  dto.addedBy,
  dto.notes,
  dto.meetingSeriesId,        // ← nuevo
);

// En el método updateFields():
// El DTO ya tiene visitDate como @IsDateString() — soporta datetime sin cambio
```

#### `src/modules/prospects/presentation/dtos/prospect-response.dto.ts`

```typescript
visitDate: string;  // ← mantiene nombre en API response (compatibilidad)
meetingSeriesId?: number;   // ← nuevo
meetingSeriesName?: string; // ← nuevo (JOIN read-model)

static fromDomain(prospect: Prospect): ProspectResponseDto {
  // ...
  // ANTES:
  dto.visitDate = prospect.visitDate instanceof Date
    ? prospect.visitDate.toISOString().split('T')[0]
    : String(prospect.visitDate);

  // DESPUÉS — no truncar; enviar ISO completo con hora:
  dto.visitDate = prospect.visitAt instanceof Date
    ? prospect.visitAt.toISOString()
    : String(prospect.visitAt);

  dto.meetingSeriesId = prospect.meetingSeriesId;
  dto.meetingSeriesName = prospect.meetingSeriesName;
}
```

> **Nota:** El campo API sigue llamándose `visitDate` para no romper clientes existentes.
> El valor ahora es ISO 8601 datetime completo en lugar de `YYYY-MM-DD`.

#### `src/modules/prospects/presentation/dtos/update-prospect-fields.dto.ts`

```typescript
@IsOptional()
@IsInt()
meetingSeriesId?: number;  // ← nuevo
```

#### `src/modules/prospects/infrastructure/persistence/typeorm/prospect.repository.impl.ts`

Cambios:
1. En `findFiltered()` y `findById()`: agregar JOIN con `meeting_series` para traer `name` como `meetingSeriesName`.
2. En `toDomain()`: mapear `visitAt` (antes `visitDate`) y `meetingSeriesId`.
3. En `toEntity()`: mapear `visitAt` y `meetingSeriesId`.
4. En `updateFields()`: aceptar `meetingSeriesId` en el objeto de actualización.
5. Actualizar sort: `qb.orderBy('prospect.visit_at', 'DESC')`.

```typescript
// JOIN en findFiltered() y findById():
.leftJoin('meeting_series', 'ms', 'ms.series_id = prospect.meeting_series_id')
.addSelect('ms.name', 'meetingSeriesName')

// En toDomain():
const name: string | null = raw[i]['meetingSeriesName'] as string | null;
prospect.meetingSeriesName = name ?? undefined;
```

#### `src/modules/prospects/application/use-cases/integrate-prospect/integrate-prospect.use-case.ts`

> **Dependencia oculta — no listada en la propuesta original.** Este archivo usa el getter `prospect.visitDate` que se renombra a `prospect.visitAt` en el aggregate. Si no se actualiza junto con el aggregate, falla en compilación TypeScript.

```typescript
// ANTES — línea 37
prospect.visitDate,  // pasado como joinDate al crear el Member

// DESPUÉS
prospect.visitAt,
```

Solo cambia esa referencia. El resto del use case no tiene dependencias en `visitDate` ni en `meetingSeriesId`.

#### `src/modules/prospects/application/use-cases/update-prospect-fields/update-prospect-fields.use-case.ts`

```typescript
export interface UpdateProspectFieldsInput {
  firstName?: string;
  lastName?: string;
  contact?: string;
  notes?: string;
  visitDate?: string;         // ← sin cambio en la interfaz pública
  meetingSeriesId?: number;   // ← nuevo
}

// En execute():
return this.prospectRepository.updateFields(id, {
  ...,
  visitDate: input.visitDate ? new Date(input.visitDate) : undefined,
  meetingSeriesId: input.meetingSeriesId,  // ← nuevo
});
```

### 5.3 Frontend admin `grace-hub` — 10 archivos

#### `src/lib/api/types.ts`

```typescript
export interface ApiProspectResponse {
  // ...
  visitDate: string;          // ISO 8601 datetime (antes era YYYY-MM-DD)
  meetingSeriesId?: number;   // ← nuevo
  meetingSeriesName?: string; // ← nuevo
  // ...
}

export interface ApiCreateProspectRequest {
  // ...
  visitDate: string;          // ISO 8601 datetime o YYYY-MM-DD (ambos aceptados)
  meetingSeriesId?: number;   // ← nuevo
}

export interface ApiUpdateProspectRequest {
  // ...
  meetingSeriesId?: number;   // ← nuevo
}
```

#### `src/lib/types.ts`

```typescript
export interface Prospect {
  // ...
  visitDate: string;          // ISO 8601 datetime (antes era YYYY-MM-DD)
  meetingSeriesId?: string;   // ← nuevo (string como todos los IDs en frontend)
  meetingSeriesName?: string; // ← nuevo
  // ...
}
```

#### `src/lib/api/mappers/prospectMapper.ts`

```typescript
export function mapApiProspectToProspect(api: ApiProspectResponse): Prospect {
  return {
    // ...
    visitDate: api.visitDate,   // pass-through (ya es ISO datetime desde backend)
    meetingSeriesId: api.meetingSeriesId !== undefined
      ? String(api.meetingSeriesId)
      : undefined,
    meetingSeriesName: api.meetingSeriesName,
    // ...
  };
}
```

> **Regla ARCH-FE:** El mapper es el único lugar que convierte `number` → `string` para IDs. No hacerlo en el Service ni en el Component.

#### `src/app/(protected)/actions/prospectActions.ts`

Cambios:

1. Agregar `meetingSeriesId?: string` a `CreateProspectInput` y `UpdateProspectInput`.
2. Pasar `meetingSeriesId: data.meetingSeriesId ? Number(data.meetingSeriesId) : undefined` al service.
3. **Nueva Server Action** para cargar series on-demand (usada por los dialogs):

```typescript
"use server";
import { getAllMeetingSeries } from "@/lib/api/services/meetingsService";
import type { MeetingSeries } from "@/lib/types";

export async function getMeetingSeriesForProspectAction(): Promise<{
  success: boolean;
  series: MeetingSeries[];
  message?: string;
}> {
  try {
    const series = await getAllMeetingSeries();
    return { success: true, series };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error al cargar series";
    return { success: false, series: [], message: msg };
  }
}
```

> **Regla BFF:** El dialog es un Client Component (`"use client"`). No puede importar `getAllMeetingSeries` directamente. La Server Action es el puente obligatorio.  
> **Regla P-2:** Las series NO se cargan en el `page.tsx` de miembros — solo se cargan al abrir el dialog.  
> **Regla P-5:** Fetch on-demand en Client Component → Server Action.

#### `src/components/prospects/register-prospect-dialog.tsx`

Cambios en el formulario:

```tsx
// Estado nuevo — persiste en localStorage igual que addedBy
const [meetingSeriesId, setMeetingSeriesId] = useState<string>("");
const [meetingSeriesName, setMeetingSeriesName] = useState<string>("");
const [allSeries, setAllSeries] = useState<MeetingSeries[]>([]);
const [seriesLoading, setSeriesLoading] = useState(false);

// Cargar series on-demand cuando el dialog se abre (primera vez)
useEffect(() => {
  if (!isOpen || allSeries.length > 0) return; // no recargar si ya se cargaron
  setSeriesLoading(true);
  getMeetingSeriesForProspectAction()
    .then(({ series }) => setAllSeries(series))
    .finally(() => setSeriesLoading(false));
}, [isOpen]);

// Restaurar meetingSeriesId desde localStorage al montar
useEffect(() => {
  const stored = localStorage.getItem("ghw_meeting_series_id");
  const storedName = localStorage.getItem("ghw_meeting_series_name");
  if (stored) setMeetingSeriesId(stored);
  if (storedName) setMeetingSeriesName(storedName);
}, []);

// Al seleccionar una serie — persiste en localStorage
const handleSelectSeries = (id: string, name: string) => {
  setMeetingSeriesId(id);
  setMeetingSeriesName(name);
  localStorage.setItem("ghw_meeting_series_id", id);
  localStorage.setItem("ghw_meeting_series_name", name);
};
```

Input de fecha/hora:

```tsx
// ANTES
<Input type="date" value={visitDate} max={todayISO()} ... />

// DESPUÉS
<Input type="datetime-local" value={visitDate} max={nowISO()} ... />
// nowISO() → new Date().toISOString().slice(0, 16)  →  "YYYY-MM-DDTHH:MM"
```

Selector de serie (campo opcional con hint visual):

```tsx
<Label className="...">
  Serie de reunión
  <span className="ml-1 text-xs text-muted-foreground font-normal">(recomendado)</span>
</Label>
<Select
  value={meetingSeriesId}
  onValueChange={(val) => {
    const found = allSeries.find(s => s.id === val);
    handleSelectSeries(val, found?.name ?? "");
  }}
  disabled={seriesLoading || isPending}
>
  <SelectTrigger>
    <SelectValue placeholder={seriesLoading ? "Cargando series…" : "Seleccionar reunión"} />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="">Sin especificar</SelectItem>
    {allSeries.map(s => (
      <SelectItem key={s.id} value={s.id}>
        {s.name}
        {s.defaultTime && (
          <span className="ml-1 text-xs text-muted-foreground">· {s.defaultTime}</span>
        )}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

> **Comportamiento de reset:** `visitDate` se resetea en cada submit (como hoy). `meetingSeriesId` **NO** se resetea — persiste para la próxima entrada, igual que `addedBy`.

#### `src/components/prospects/edit-prospect-dialog.tsx`

Cambios análogos al `register-prospect-dialog.tsx`:
- `type="date"` → `type="datetime-local"` en el input de fecha.
- Agregar selector de serie con las mismas opciones.
- Al abrir el dialog en modo edición, pre-cargar `meetingSeriesId` del prospecto existente.
- Al abrir en modo read-only, mostrar `meetingSeriesName` como texto plano.
- Las series se cargan on-demand al abrir el dialog (igual que en el de registro).

#### `src/components/prospects/prospects-table.tsx` (y las otras 2 tablas)

Función `formatVisitDate()` actualizada:

```typescript
function formatVisitDate(dateStr: string): string {
  const date = new Date(dateStr);
  const isLegacy = date.getUTCHours() === 0 &&
                   date.getUTCMinutes() === 0 &&
                   date.getUTCSeconds() === 0 &&
                   !dateStr.includes('T');
  // Para strings YYYY-MM-DD (PWA vieja) o T00:00:00Z (datos migrados sin hora real)
  // no mostrar la hora ya que no es confiable.
  if (isLegacy) {
    const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
    const localDate = new Date(year, month - 1, day);
    return localDate.toLocaleDateString('es-ES', {
      weekday: 'short', day: 'numeric', month: 'short',
      year: localDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
    });
  }
  // Datos nuevos con hora real
  return date.toLocaleString('es-ES', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
    year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
}
```

Columna fecha en la tabla:

```tsx
<div className="flex flex-col gap-0.5">
  <span>{formatVisitDate(prospect.visitDate)}</span>
  {prospect.meetingSeriesName && (
    <span className="text-xs text-muted-foreground truncate max-w-[180px]">
      {prospect.meetingSeriesName}
    </span>
  )}
</div>
```

> **Nota de deduplicación:** La función `formatVisitDate` está actualmente copiada en los 3 archivos de tabla. Como parte de esta tarea se debe mover a `src/lib/utils.ts` (o a un archivo `src/lib/utils/prospects.ts`) y exportarla desde ahí. Esto elimina la duplicación y asegura comportamiento consistente. Esta es la única refactorización permitida fuera del alcance estricto de la feature.

### 5.4 PWA `grace-hub-welcome` — 5 archivos

#### `src/lib/storage.ts`

Agregar persistencia de serie:

```typescript
const KEYS = {
  TOKEN: 'ghw_token',
  TOKEN_EXP: 'ghw_token_exp',
  MEMBER_ID: 'ghw_member_id',
  MEMBER_NAME: 'ghw_member_name',
  MEETING_SERIES_ID: 'ghw_meeting_series_id',    // ← nuevo
  MEETING_SERIES_NAME: 'ghw_meeting_series_name', // ← nuevo
} as const;

// En local:
setMeetingSeries: (id: number, name: string): void => {
  localStorage.setItem(KEYS.MEETING_SERIES_ID, String(id));
  localStorage.setItem(KEYS.MEETING_SERIES_NAME, name);
},
getMeetingSeriesId: (): number | null => {
  const val = localStorage.getItem(KEYS.MEETING_SERIES_ID);
  return val ? Number(val) : null;
},
getMeetingSeriesName: (): string | null => {
  return localStorage.getItem(KEYS.MEETING_SERIES_NAME);
},
clearMeetingSeries: (): void => {
  localStorage.removeItem(KEYS.MEETING_SERIES_ID);
  localStorage.removeItem(KEYS.MEETING_SERIES_NAME);
},
```

#### `src/lib/types.ts`

```typescript
export interface MeetingSeries {
  id: number;
  name: string;
  defaultTime?: string;
}

export interface Visitor {
  // ...
  meetingSeriesId?: number;   // ← nuevo
  meetingSeriesName?: string; // ← nuevo
}
```

#### `src/lib/api/meeting-series.ts` — archivo nuevo

```typescript
const API = process.env.NEXT_PUBLIC_API_URL;

export async function getMeetingSeries(
  token: string,
): Promise<MeetingSeries[]> {
  const res = await fetch(`${API}/meeting-series`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json() as Promise<MeetingSeries[]>;
}
```

> **Nota PWA:** La PWA llama al backend directamente con `Authorization: Bearer`. No usa el BFF pattern del admin desktop — tiene su propio esquema de auth y su propio `fetch`. Esta es la arquitectura existente de la PWA y no viola reglas; el BFF rule aplica solo al proyecto `grace-hub`.

#### `src/lib/api/prospects.ts`

```typescript
export interface CreateVisitorPayload {
  firstName: string;
  lastName: string;
  visitDate: string;      // ISO datetime (nowISO()) o YYYY-MM-DD (backward compat)
  contact?: string;
  notes?: string;
  source: 'pwa';
  addedBy: number;
  meetingSeriesId?: number;  // ← nuevo, opcional
}
```

#### `src/components/register-form.tsx`

```typescript
// nowISO() reemplaza a todayISO()
function nowISO(): string {
  return new Date().toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
}

// Estado nuevo — NO se resetea entre registros
const [meetingSeriesId, setMeetingSeriesId] = useState<number | null>(null);
const [meetingSeriesName, setMeetingSeriesName] = useState<string>('');
const [allSeries, setAllSeries] = useState<MeetingSeries[]>([]);

// Restaurar del localStorage al montar
useEffect(() => {
  const storedId = local.getMeetingSeriesId();
  const storedName = local.getMeetingSeriesName();
  if (storedId) { setMeetingSeriesId(storedId); setMeetingSeriesName(storedName ?? ''); }
}, []);

// Cargar series al montar (una vez por sesión es suficiente)
useEffect(() => {
  getMeetingSeries(token)
    .then(setAllSeries)
    .catch(() => {}); // silencioso — campo es opcional
}, [token]);

// Al seleccionar
const handleSelectSeries = (id: number, name: string) => {
  setMeetingSeriesId(id);
  setMeetingSeriesName(name);
  local.setMeetingSeries(id, name);
};

// En handleSubmit:
await createProspect(token, {
  firstName: firstName.trim(),
  lastName: lastName.trim(),
  visitDate: nowISO(),           // ← hora incluida
  source: 'pwa',
  addedBy,
  contact: contact.trim() || undefined,
  notes: notes.trim() || undefined,
  meetingSeriesId: meetingSeriesId ?? undefined,  // ← nuevo
});

// La serie NO se resetea en el post-submit cleanup (igual que addedBy).
```

Selector en el JSX:

```tsx
{/* Serie de reunión — persiste entre registros, no se resetea */}
<div className="flex flex-col gap-1">
  <label className="text-sm font-medium">
    Reunión
    <span className="ml-1 text-xs text-muted-foreground font-normal">(recomendado)</span>
  </label>
  <select
    value={meetingSeriesId ?? ''}
    onChange={(e) => {
      const val = Number(e.target.value);
      const found = allSeries.find(s => s.id === val);
      if (found) handleSelectSeries(found.id, found.name);
      else { setMeetingSeriesId(null); setMeetingSeriesName(''); local.clearMeetingSeries(); }
    }}
    className="..."
    disabled={isPending}
  >
    <option value="">Sin especificar</option>
    {allSeries.map(s => (
      <option key={s.id} value={s.id}>
        {s.name}{s.defaultTime ? ` · ${s.defaultTime}` : ''}
      </option>
    ))}
  </select>
  {meetingSeriesName && (
    <p className="text-xs text-muted-foreground">Seleccionada: {meetingSeriesName}</p>
  )}
</div>
```

---

## 6. Orden de implementación (plan de deploy seguro)

El backend acepta `visitDate` como ISO datetime **o** `YYYY-MM-DD` (ambos son strings válidos para `@IsDateString()`). Esto permite un deploy desacoplado sin ventana de quiebre.

```
PASO 1 — DB (Neon — ejecución manual)
  Ejecutar el SQL de migración.
  Verificar que los datos existentes tienen visit_at = YYYY-MM-DDT00:00:00Z.
  Verificar que meeting_series_id = NULL en todos.

PASO 2 — Backend (grace-hub-service)
  Commit único con los 9 archivos.
  Deploy en Render.
  Verificar con curl:
    - POST /prospects con visitDate datetime → retorna visitDate con hora
    - POST /prospects con visitDate date-only → retorna visitDate con T00:00:00Z
    - POST /prospects con meetingSeriesId → retorna meetingSeriesId + meetingSeriesName
    - GET /prospects → retorna visitDate como ISO datetime

PASO 3 — Frontend admin (grace-hub)
  Commit con los 10 archivos.
  Deploy.
  Verificar:
    - Prospectos existentes (T00:00:00Z) muestran solo fecha sin hora.
    - Prospectos nuevos muestran fecha + hora.
    - Selector de serie funciona en register y edit dialog.
    - Serie pre-seleccionada persiste entre aperturas del dialog.
    - Serie se muestra en las 3 tablas (badge debajo de la fecha).

PASO 4 — PWA (grace-hub-welcome)
  Commit con los 5 archivos.
  Deploy.
  Verificar:
    - nowISO() genera datetime completo.
    - Selector de serie aparece y persiste entre registros.
    - Registro POST incluye meetingSeriesId cuando se seleccionó.
    - Si el voluntario no selecciona serie, el campo no se envía.
```

---

## 7. Riesgos y mitigaciones

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| `ALTER COLUMN TYPE` falla si hay valores no casteables | Baja (todos son `DATE` válidos) | Alto | Hacer backup antes; probar en Neon branch si está disponible |
| PWA vieja (caché de service worker) sigue enviando `YYYY-MM-DD` | Media-Alta | Bajo | Backend acepta ambos formatos; fecha se almacena como `T00:00:00Z` — el frontend lo muestra como dato migrado sin hora |
| Voluntario no selecciona serie → dato sin vincular | Alta (campo es opcional) | Bajo | Hint visual "recomendado"; el admin puede editar el prospecto desde el desktop |
| La serie referenciada se borra → `ON DELETE SET NULL` | Baja | Bajo | `meetingSeriesId` queda `NULL`, `meetingSeriesName` queda vacío en el display |
| `datetime-local` produce valores con zona horaria inconsistente entre browsers | Media | Medio | Usar siempre `new Date(dto.visitDate)` en el backend — normalize a UTC en DB; en el frontend parsear con `new Date(string)` para display local |
| `formatVisitDate` duplicada — una tabla muestra diferente al resto durante la implementación | Alta si no se migra en 1 commit | Bajo | Mover a `utils.ts` en el mismo commit que las tablas |

---

## 8. Checklist de implementación

### Backend
- [ ] SQL de migración ejecutado y verificado en Neon
- [ ] `prospect.typeorm.entity.ts`: `visit_at TIMESTAMPTZ`, `meeting_series_id nullable`
- [ ] `prospect.aggregate.ts`: campo `_meetingSeriesId`, getter, `meetingSeriesName` read-model; `_visitDate` → `_visitAt`
- [ ] `create-prospect.command.ts`: campo `meetingSeriesId?`
- [ ] `create-prospect.dto.ts`: campo `@IsOptional @IsInt meetingSeriesId?`
- [ ] `update-prospect-fields.dto.ts`: campo `@IsOptional @IsInt meetingSeriesId?`
- [ ] `update-prospect-fields.use-case.ts`: campo `meetingSeriesId?` en interfaz y repositorio
- [ ] `prospect-response.dto.ts`: `toISOString()` sin `.split('T')[0]`; campos `meetingSeriesId?`, `meetingSeriesName?`
- [ ] `prospects.controller.ts`: pasar `meetingSeriesId` al Command
- [ ] `prospect.repository.impl.ts`: JOIN con `meeting_series`; `visit_at` en sort; `updateFields` acepta `meetingSeriesId`
- [ ] **`integrate-prospect.use-case.ts`**: línea 37 — `prospect.visitDate` → `prospect.visitAt`
- [ ] Verificar: `ARCHITECTURE_RULES.md` — no hay lógica de negocio en Use Case ni Controller
- [ ] Verificar: Domain no importa NestJS ni TypeORM

### Frontend admin (grace-hub)
- [ ] `lib/api/types.ts`: `visitDate` comentado como ISO datetime; `meetingSeriesId?`, `meetingSeriesName?` en response y requests
- [ ] `lib/types.ts`: `visitDate` comentado como ISO datetime; `meetingSeriesId?`, `meetingSeriesName?` en `Prospect`
- [ ] `lib/api/mappers/prospectMapper.ts`: mapear `meetingSeriesId` (number→string), `meetingSeriesName`
- [ ] `lib/api/services/prospectsService.ts`: pasar `meetingSeriesId` en `create()` y `updateFields()`
- [ ] `app/(protected)/actions/prospectActions.ts`: `meetingSeriesId?` en inputs; nueva `getMeetingSeriesForProspectAction()`
- [ ] `register-prospect-dialog.tsx`: `datetime-local`, selector de serie, persistencia localStorage, carga on-demand
- [ ] `edit-prospect-dialog.tsx`: `datetime-local`, selector de serie, pre-carga del valor existente
- [ ] `lib/utils.ts`: mover `formatVisitDate()` aquí con la lógica nueva (legacy vs. datetime)
- [ ] `prospects-table.tsx`: usar `formatVisitDate` de utils, badge `meetingSeriesName`
- [ ] `integrated-prospects-table.tsx`: idem
- [ ] `archived-prospects-table.tsx`: idem
- [ ] Verificar: ningún Client Component importa `meetingsService` directamente
- [ ] Verificar: `getMeetingSeriesForProspectAction` tiene `"use server"`
- [ ] Verificar: series no se cargan en `page.tsx` de miembros (Regla P-2)

### PWA (grace-hub-welcome)
- [ ] `lib/storage.ts`: claves `MEETING_SERIES_ID`, `MEETING_SERIES_NAME` + métodos
- [ ] `lib/types.ts`: interfaz `MeetingSeries`, campo `meetingSeriesId?` en `Visitor`
- [ ] `lib/api/meeting-series.ts`: nuevo archivo con `getMeetingSeries(token)`
- [ ] `lib/api/prospects.ts`: `meetingSeriesId?` en `CreateVisitorPayload`; comentario en `visitDate`
- [ ] `components/register-form.tsx`: `nowISO()`, selector de serie, persistencia, no resetear serie en submit

### Verificación cruzada
- [ ] Con la PWA antigua (caché): `visitDate` llega como `YYYY-MM-DD` → backend lo almacena como `T00:00:00Z` → frontend muestra fecha sin hora (no confunde)
- [ ] Con PWA nueva: `visitDate` llega como ISO datetime → se almacena con hora real → frontend muestra hora
- [ ] Prospecto editado desde admin desktop: `datetime-local` envía datetime completo → hora se preserva
- [ ] Sorting por `visitDate.localeCompare()` sigue siendo correcto con ISO datetime strings
