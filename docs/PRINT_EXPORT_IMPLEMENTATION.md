# Plan de Implementación: Exportación PDF + Excel

> **Documento de referencia de implementación**
> Basado en el análisis de arquitectura de ambos repositorios.
> Última actualización: 2026-06-14

---

## 1. Análisis de Arquitectura — Diagnóstico

### 1.1 Frontend (grace-hub)

**Fortalezas confirmadas:**
- Capas bien definidas y respetadas: `Client → Endpoints → Mappers → Services → Pages/Components`
- `lib/types.ts` y `lib/api/types.ts` como únicas fuentes de verdad para tipos
- Server Components son "orquestadores de datos" puros; la lógica de UI queda en Client Components
- `cached-services.ts` resuelve correctamente el conflicto `force-dynamic` + cookie auth
- Server Actions como único canal de mutación (correctamente aisladas de la UI)

**Patrones detectados en Client Components relevantes para exportar:**
```
GdiAdminView        → recibe todos los datos como props, controla tabs
TithesTracker       → recibe members + tithes + filtros como props, tiene paginación cliente
AttendanceManagerView → recibe attendees + records como props
GroupAdminSummaryTab → recibe members + meetings + attendance como props
```

**Observación crítica:** todos los datos necesarios para los 6 reportes **ya llegan a los Client Components como props** desde los Server Components. Esto significa que la exportación es 100% client-side: leer las props, construir el documento, descargar. **No se necesita ningún nuevo endpoint de backend.**

### 1.2 Backend (grace-hub-service)

**Fortalezas confirmadas:**
- Clean Architecture estricta con flujo de dependencias hacia adentro
- Use cases con responsabilidad única e inyectables via DI
- Repository interfaces en Domain, implementaciones en Infrastructure
- Controllers solo manejan HTTP + DTOs

**Impacto para esta feature:** NINGUNO. El backend no requiere ningún cambio para la implementación inicial.

---

## 2. Principio Rector de la Implementación

> La exportación NO es una operación de red. Es una operación de presentación.
> Vive en la capa de Componentes, no en Services ni Endpoints.

```
INCORRECTO:
  Page (Server) → llama nuevo endpoint de export → devuelve archivo

CORRECTO:
  Client Component → tiene los datos en props → genera archivo con librería JS → descarga en browser
```

Esto respeta el principio de SoC del frontend: los Services orquestan datos de red, los Components presentan y operan sobre esos datos.

---

## 3. Librerías

| Librería | Uso | Tamaño | Riesgo |
|---|---|---|---|
| `jspdf` | Generación de PDF | ~300 KB gzip | Bajo — solo se carga al hacer click |
| `jspdf-autotable` | Tablas en jsPDF | ~50 KB gzip | Bajo — plugin de jsPDF |
| `xlsx` (SheetJS) | Generación de Excel | ~200 KB gzip | Bajo — ampliamente usado |

**Instalación:**
```bash
# En grace-hub/
npm install jspdf jspdf-autotable xlsx
npm install --save-dev @types/jspdf
```

> **Nota sobre bundle size:** Las tres librerías suman ~550 KB gzip. Dado que se importan SOLO en Client Components que usan exportar, y Next.js hace code splitting automático por componente, el impacto en el bundle inicial es cero. Se cargan on-demand.

---

## 4. Estructura de Archivos

```
src/lib/print/
├── index.ts                        # Re-exports públicos
├── pdf.ts                          # Wrapper base de jsPDF
├── excel.ts                        # Wrapper base de xlsx
└── templates/
    ├── attendance-list.template.ts  # REPORTE 1: Lista de asistencia
    ├── group-roster.template.ts     # REPORTE 2 y 3: Padrón GDI/Área
    ├── member-directory.template.ts # REPORTE 4: Directorio de miembros
    ├── attendance-history.template.ts # REPORTE 5: Historial de asistencia
    └── tithes-summary.template.ts  # REPORTE 6: Resumen de diezmos

src/components/ui/
└── export-button.tsx               # Botón reutilizable con dropdown PDF/Excel
```

**Regla arquitectónica:** `src/lib/print/` es una capa de utilidades puras. No hace `fetch()`, no usa React, no usa hooks. Recibe datos tipados del frontend y retorna `Blob | void`. Puede importarse desde cualquier Client Component sin violar ninguna regla.

---

## 5. Implementación por Reporte

---

### REPORTE 1 — Lista de Asistencia de Reunión

**Dónde se agrega:** `src/components/events/meeting-attendance-page-content.tsx`

**Datos disponibles en ese componente:**
- `meetingInstance: Meeting` (fecha, hora, lugar, nombre de serie)
- `attendees: AttendeeInfo[]` (id, firstName, lastName)
- `currentAttendance: AttendanceRecord[]` (attended boolean por miembro)

**Firma del template:**
```typescript
// src/lib/print/templates/attendance-list.template.ts

export interface AttendanceListData {
  meetingName: string;
  seriesName: string;
  date: string;          // YYYY-MM-DD
  time: string;
  location: string;
  attendees: Array<{
    firstName: string;
    lastName: string;
    attended?: boolean;  // undefined = no tomada aún (imprimir en blanco)
  }>;
}

export function generateAttendanceListPdf(data: AttendanceListData): void;
export function generateAttendanceListExcel(data: AttendanceListData): void;
```

**Integración:**
```typescript
// En MeetingAttendancePageContent (Client Component) — agregar botón:
<ExportButton
  label="Imprimir lista"
  onPdf={() => generateAttendanceListPdf(buildAttendanceListData(...))}
  onExcel={() => generateAttendanceListExcel(buildAttendanceListData(...))}
/>
```

**Complejidad:** BAJA. Los datos ya están en el componente. Solo construir el template.

**Riesgo de regresión:** MUY BAJO. Se agrega un botón; no se modifica lógica existente.

---

### REPORTE 2 — Padrón de GDI

**Dónde se agrega:** `src/components/groups/admin/group-admin-members-tab.tsx`

**Datos disponibles en ese componente (recibidos por props desde GdiAdminView):**
- `members: Member[]` (lista de miembros del GDI)
- `gdi: GDI` (nombre del GDI, guideId, mentorId)
- `allMembers: Member[]` (para resolver nombre del guía/mentor)

**Firma del template:**
```typescript
// src/lib/print/templates/group-roster.template.ts

export interface GroupRosterData {
  groupName: string;
  groupType: 'GDI' | 'Área Ministerial';
  leaderLabel: string;   // "Guía" o "Líder"
  leaderName: string;
  mentorName?: string;
  members: Array<{
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    churchJoinDate?: string;
    birthDate?: string;
    address?: string;
  }>;
  exportDate: string;    // fecha de emisión del reporte
}

export function generateGroupRosterPdf(data: GroupRosterData): void;
export function generateGroupRosterExcel(data: GroupRosterData): void;
```

**Complejidad:** BAJA.

**Riesgo de regresión:** MUY BAJO.

---

### REPORTE 3 — Padrón de Área Ministerial

**Dónde se agrega:** `src/components/groups/admin/group-admin-members-tab.tsx`

Reutiliza exactamente el mismo template `group-roster.template.ts` del Reporte 2. La única diferencia es `groupType: 'Área Ministerial'` y `leaderLabel: 'Líder'`.

**Complejidad:** MUY BAJA. Reutilización directa del template anterior.

**Riesgo de regresión:** MUY BAJO.

---

### REPORTE 4 — Directorio General de Miembros

**Dónde se agrega:** `src/components/members/members-list-view.tsx`

**Datos disponibles:**
- `members: Member[]` — la lista ya filtrada que ve el usuario
- `allGdis: GDI[]` — para resolver nombre del GDI de cada miembro
- `allAreas: MinistryArea[]` — para resolver nombre del Área

**Punto clave:** El botón exporta exactamente lo que está en pantalla (respeta filtros activos). No exporta todo — exporta la vista filtrada. Esto es correcto por UX y evita necesitar nuevos endpoints.

**Firma del template:**
```typescript
// src/lib/print/templates/member-directory.template.ts

export interface MemberDirectoryData {
  title: string;         // "Directorio de Miembros"
  filters: string[];     // ["Rol: Guía GDI", "GDI: Alfa"] para mostrar en header
  exportDate: string;
  members: Array<{
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    gdiName?: string;
    areaNames?: string[];
    roles?: string[];     // etiquetas legibles: ["Guía GDI", "Obrero"]
    status: string;
    churchJoinDate?: string;
    baptismDate?: string;
    birthDate?: string;
  }>;
}

export function generateMemberDirectoryPdf(data: MemberDirectoryData): void;
export function generateMemberDirectoryExcel(data: MemberDirectoryData): void;
```

**Complejidad:** MEDIA. Requiere mapear `roleId → nombre legible` y `gdiId → nombre de GDI` antes de pasar al template. Este mapping ya existe en la página (`roleDisplayMap`) — solo copiar la lógica al builder.

**Riesgo de regresión:** BAJO. El componente `members-list-view` tiene su propia lógica de filtro; el botón de export recibe la lista ya filtrada, no interfiere con esa lógica.

---

### REPORTE 5 — Historial de Asistencia de un GDI/Área

**Dónde se agrega:** `src/components/groups/admin/group-attendance-table.tsx`

**Datos disponibles en ese componente:**
- `meetings: Meeting[]` — reuniones del grupo
- `allAttendanceRecords: AttendanceRecord[]` — registros de asistencia
- `members: Member[]` — miembros del grupo

**Firma del template:**
```typescript
// src/lib/print/templates/attendance-history.template.ts

export interface AttendanceHistoryData {
  groupName: string;
  groupType: 'GDI' | 'Área Ministerial';
  periodFrom?: string;
  periodTo?: string;
  exportDate: string;
  meetings: Array<{ id: string; date: string; name: string }>;
  rows: Array<{
    memberName: string;
    attendanceByMeeting: Record<string, boolean | null>; // meetingId → attended | null
    totalPresent: number;
    totalExpected: number;
    pct: number;
  }>;
  groupAvgPct: number;
}

export function generateAttendanceHistoryPdf(data: AttendanceHistoryData): void;
export function generateAttendanceHistoryExcel(data: AttendanceHistoryData): void;
```

**Complejidad:** ALTA. El pivot de datos (miembro × reunión) requiere construir una matriz. La lógica de cálculo ya existe parcialmente en `GroupAdminSummaryTab` — reutilizar. El PDF con muchas columnas (una por reunión) puede ser ancho — usar orientación landscape.

**Riesgo de regresión:** BAJO. Se agrega funcionalidad al componente de tabla existente sin modificar su render principal.

---

### REPORTE 6 — Resumen de Diezmos

**Dónde se agrega:** `src/components/tithes/TithesTracker.tsx`

**Datos disponibles:**
- `members: Member[]` — miembros visibles con filtros activos
- `titheRecords: TitheRecord[]` — registros (memberId, year, month)
- filtros activos de fecha (desde/hasta)

**Firma del template:**
```typescript
// src/lib/print/templates/tithes-summary.template.ts

export interface TithesSummaryData {
  title: string;
  periodLabel: string;   // "Enero 2026 — Junio 2026"
  exportDate: string;
  months: Array<{ year: number; month: number; label: string }>;
  rows: Array<{
    memberName: string;
    titheByMonth: Record<string, boolean>; // "YYYY-MM" → boolean
    totalMonths: number;
    totalPaid: number;
  }>;
}

export function generateTithesSummaryPdf(data: TithesSummaryData): void;
export function generateTithesSummaryExcel(data: TithesSummaryData): void;
```

**Complejidad:** ALTA. Similar al Reporte 5: pivot mes × miembro. TithesTracker ya tiene lógica de filtrado compleja — el botón debe usar los mismos datos ya calculados, no recalcular.

**Riesgo de regresión:** MEDIO. TithesTracker es el componente más complejo del proyecto (tiene filtros, paginación, edición inline). Al agregar el botón se debe tener cuidado de no tocar ningún estado existente.

---

## 6. Componente Reutilizable `ExportButton`

```typescript
// src/components/ui/export-button.tsx
// "use client"

interface ExportButtonProps {
  label?: string;                    // Default: "Exportar"
  onPdf: () => void;
  onExcel: () => void;
  disabled?: boolean;
  size?: "sm" | "default";
}
```

Renderiza un `DropdownMenu` de shadcn/ui con dos opciones: "PDF" y "Excel (.xlsx)". Cada opción llama al callback correspondiente con `try/catch` y muestra toast de error si falla.

**Regla:** este componente NO recibe datos. Solo recibe callbacks. La lógica de construcción de datos queda en el componente que lo usa.

---

## 7. Orden de Implementación

| Paso | Tarea | Complejidad | Riesgo | Horas estimadas |
|---|---|---|---|---|
| 1 | Instalar librerías (`jspdf`, `jspdf-autotable`, `xlsx`) | MUY BAJA | MUY BAJO | 0.25h |
| 2 | Crear `src/lib/print/pdf.ts` — wrapper base | BAJA | MUY BAJO | 1h |
| 3 | Crear `src/lib/print/excel.ts` — wrapper base | BAJA | MUY BAJO | 0.5h |
| 4 | Crear `src/components/ui/export-button.tsx` | BAJA | MUY BAJO | 0.5h |
| 5 | Template + integración REPORTE 1 (Lista asistencia) | BAJA | MUY BAJO | 1.5h |
| 6 | Template + integración REPORTE 2+3 (Padrón grupo) | BAJA | MUY BAJO | 1.5h |
| 7 | Template + integración REPORTE 4 (Directorio) | MEDIA | BAJO | 2h |
| 8 | Template + integración REPORTE 5 (Historial) | ALTA | BAJO | 3h |
| 9 | Template + integración REPORTE 6 (Diezmos) | ALTA | MEDIO | 3h |
| 10 | Pruebas manuales end-to-end en todos los reportes | — | — | 1h |

**Total estimado:** ~14.25h

---

## 8. Riesgos de Regresión — Análisis Detallado

### Riesgo 1 — TithesTracker (MEDIO)
- **Causa:** Componente más complejo del proyecto. Tiene estado local de filtros, paginación, edición inline y transiciones. Cualquier modificación mal colocada puede romper el flujo existente.
- **Mitigación:** Agregar el botón de exportar como bloque independiente en el header del componente. Nunca tocar el estado existente. El botón solo lee datos ya calculados.

### Riesgo 2 — Bundle size en producción (BAJO)
- **Causa:** `jspdf` + `xlsx` son librerías grandes.
- **Mitigación:** Importar dinámicamente en el callback del botón (no en el top-level del módulo):
  ```typescript
  // En el callback onPdf:
  const { generateAttendanceListPdf } = await import('@/lib/print/templates/attendance-list.template');
  generateAttendanceListPdf(data);
  ```
  Esto garantiza que las librerías se carguen solo cuando el usuario hace click.

### Riesgo 3 — Datos insuficientes para exportar (BAJO)
- **Causa:** En algunos componentes los datos están parcialmente cargados o paginados.
- **Análisis por reporte:**
  - R1 (Asistencia): `attendees` son los esperados, siempre completos ✅
  - R2/R3 (Padrón): `members` del grupo, siempre completos ✅
  - R4 (Directorio): `members` es la lista paginada — exportar SOLO la página visible o hacer fetch no-paginated. **Decisión necesaria.**
  - R5 (Historial): `allAttendanceRecords` es global desde caché ✅
  - R6 (Diezmos): `titheRecords` incluye todos los del rango visible ✅
- **Mitigación para R4:** La página de miembros ya tiene `getCachedAllMembersNonPaginated()` cargado como prop; pasar esa lista al componente de export (no la paginada).

### Riesgo 4 — Formato de fechas (MUY BAJO)
- **Causa:** Las fechas en el sistema son strings `YYYY-MM-DD`. Los templates deben formatearlas para display en PDF/Excel.
- **Mitigación:** Reutilizar `formatDisplayDate()` y `formatShortDate()` de `lib/utils/date.ts` (ya existe).

### Riesgo 5 — Nombres de archivo de descarga (MUY BAJO)
- **Causa:** Deben ser únicos y descriptivos por defecto.
- **Convención:**
  ```
  gracehub_asistencia_GDI-Alfa_2026-06-14.pdf
  gracehub_directorio_miembros_2026-06-14.xlsx
  ```

---

## 9. Reglas de Arquitectura — Checklist de Cumplimiento

| Regla | Cumplimiento | Justificación |
|---|---|---|
| Pages/Components solo usan Services | ✅ | Los templates reciben datos tipados; no llaman a Services |
| Client es el único que hace fetch() | ✅ | No hay fetch() en ningún template ni ExportButton |
| Mappers son el único puente API↔Frontend | ✅ | Los templates usan tipos frontend (no Api*) |
| Services no contienen lógica de UI | ✅ | Las librerías de print están en `lib/print/`, no en `services/` |
| Domain no depende de nada externo | ✅ | No hay cambios en backend |
| No modificar código existente sin razón | ✅ | Solo se agregan botones y se importan templates |
| No crear helpers para operaciones de una sola vez | ✅ | Cada template es reutilizable (PDF + Excel comparten misma firma) |

---

## 10. Estructura Final — Árbol de Archivos Nuevos

```
grace-hub/
└── src/
    ├── lib/
    │   └── print/
    │       ├── index.ts
    │       ├── pdf.ts
    │       ├── excel.ts
    │       └── templates/
    │           ├── attendance-list.template.ts    (+R1)
    │           ├── group-roster.template.ts       (+R2, R3)
    │           ├── member-directory.template.ts   (+R4)
    │           ├── attendance-history.template.ts (+R5)
    │           └── tithes-summary.template.ts     (+R6)
    └── components/
        └── ui/
            └── export-button.tsx                  (nuevo)
```

**Archivos existentes modificados:**

| Archivo | Cambio | Líneas modificadas aprox. |
|---|---|---|
| `components/events/meeting-attendance-page-content.tsx` | Agregar `<ExportButton>` + builder de data | +30 |
| `components/groups/admin/group-admin-members-tab.tsx` | Agregar `<ExportButton>` + builder de data | +40 |
| `components/groups/admin/group-attendance-table.tsx` | Agregar `<ExportButton>` + builder de data | +50 |
| `components/members/members-list-view.tsx` | Agregar `<ExportButton>` + builder de data | +40 |
| `components/tithes/TithesTracker.tsx` | Agregar `<ExportButton>` + builder de data | +50 |
| `package.json` | Nuevas dependencias | +3 |

**Total:** ~210 líneas nuevas, ~5 archivos modificados, ~8 archivos creados.
