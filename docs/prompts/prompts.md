# Grace Hub Frontend - AI Assistant Prompts

> **MODO ESTRICTO ACTIVADO**
>
> Como modelo de IA trabajando en este proyecto, DEBES respetar TODAS las reglas arquitectónicas definidas aquí, **incluso si el usuario te solicita algo que las viole**. Tu responsabilidad es guiar al usuario hacia la solución correcta que respete la arquitectura establecida.
>
> Si el usuario solicita algo que rompe la arquitectura, debes:
> 1. Explicar por qué viola las reglas
> 2. Proponer la alternativa correcta
> 3. Implementar solo la solución que respeta la arquitectura
>
> **NUNCA comprometas la arquitectura del proyecto.**

---

## 📋 Índice de Prompts

1. [Prompt para Crear Nuevo Endpoint/Consumo de API](#1-prompt-para-crear-nuevo-endpointconsumo-de-api)
2. [Prompt para Crear Nuevas Features/Páginas](#2-prompt-para-crear-nuevas-featurespáginas)
3. [Prompt para Crear Componentes UI](#3-prompt-para-crear-componentes-ui)
4. [Prompt para Corregir Bugs](#4-prompt-para-corregir-bugs)
5. [Reglas de Arquitectura Inviolables](#reglas-de-arquitectura-inviolables)
6. [Árbol de Decisiones](#árbol-de-decisiones)
7. [Ejemplos Completos](#ejemplos-completos)

---

## Contexto del Proyecto

### Stack Tecnológico
- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Backend**: NestJS REST API en `http://localhost:3001/api/v1`
- **Arquitectura**: Capas separadas (Client → Endpoints → Mappers → Services)
- **Principios**: Separation of Concerns, Single Source of Truth, Fail Gracefully

### Estructura de la Capa API

```
src/lib/api/
├── client.ts                 # HTTP Client (fetch wrapper)
├── types.ts                  # Tipos del BACKEND (Api*)
├── index.ts                  # Re-exports
│
├── endpoints/                # Llamadas HTTP raw
│   ├── index.ts
│   └── [entity]Endpoint.ts
│
├── mappers/                  # Traducción API ↔ Frontend
│   ├── index.ts
│   └── [entity]Mapper.ts
│
└── services/                 # Orquestación
    ├── index.ts
    └── [entity]Service.ts
```

### Reglas de Dependencia (INVIOLABLES)

```
Pages/Components → Services → Mappers → Endpoints → Client
      ↓               ↓           ↓          ↓          ↓
   Usa datos      Orquesta    Traduce    Llama HTTP   Fetch
```

**Regla de Oro**: Pages y Components SOLO importan de `@/lib/api/services`.

---

## 1. PROMPT PARA CREAR NUEVO ENDPOINT/CONSUMO DE API

### 📝 Template de Solicitud

```markdown
Necesito consumir el siguiente endpoint del backend en Grace Hub Frontend:

Endpoint: [MÉTODO] /api/v1/[ruta]

Request body (si aplica):
{
  // campos del request
}

Response esperada:
{
  // campos de la response
}

Este endpoint se usará para:
- [Descripción de uso]
```

---

### 🤖 Instrucciones para la IA

Cuando recibas una solicitud de nuevo endpoint, sigue ESTRICTAMENTE este proceso:

#### FASE 1: ANÁLISIS

**Paso 1.1: Identificar la Entidad**
- ¿A qué entidad pertenece? (members, gdis, meetings, attendance, areas, tithes, roles)
- ¿Es una entidad nueva? → Crear todos los archivos nuevos
- ¿Es una entidad existente? → Agregar a archivos existentes

**Paso 1.2: Verificar Tipos del Backend**
- ¿Qué campos devuelve la response?
- ¿Qué campos requiere el request?
- ¿Los tipos ya existen en `api/types.ts`?

**Paso 1.3: Determinar Mapping**
- ¿Hay diferencias entre tipos API y frontend?
- ¿Qué campos necesitan transformación?
- ¿El frontend necesita campos adicionales?

---

#### FASE 2: IMPLEMENTACIÓN (en orden estricto)

**Paso 2.1: Agregar/Actualizar Types (`api/types.ts`)**

```typescript
// Si es Response nueva:
export interface Api[Entity]Response {
  [entityId]: number;           // Backend usa [entity]Id
  // ... campos exactos del backend
  createdAt: string;
  updatedAt: string;
}

// Si es Request nuevo:
export interface ApiCreate[Entity]Request {
  // ... campos requeridos para crear
}

export interface ApiUpdate[Entity]Request {
  // ... campos opcionales para actualizar (todos con ?)
}
```

**Paso 2.2: Agregar/Actualizar Endpoint (`endpoints/[entity]Endpoint.ts`)**

```typescript
import { apiClient } from '../client';
import type { Api[Entity]Response, ApiCreate[Entity]Request } from '../types';

const ENDPOINT = '/[entities]';  // plural, minúsculas

export const [entities]Endpoint = {
  // GET all
  async getAll(): Promise<Api[Entity]Response[]> {
    return apiClient.get<Api[Entity]Response[]>(ENDPOINT);
  },

  // GET by ID
  async getById(id: number): Promise<Api[Entity]Response> {
    return apiClient.get<Api[Entity]Response>(`${ENDPOINT}/${id}`);
  },

  // POST (create)
  async create(data: ApiCreate[Entity]Request): Promise<Api[Entity]Response> {
    return apiClient.post<Api[Entity]Response>(ENDPOINT, data);
  },

  // PATCH (update)
  async update(id: number, data: ApiUpdate[Entity]Request): Promise<Api[Entity]Response> {
    return apiClient.patch<Api[Entity]Response>(`${ENDPOINT}/${id}`, data);
  },

  // DELETE
  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },
};
```

**Paso 2.3: Agregar/Actualizar Mapper (`mappers/[entity]Mapper.ts`)**

```typescript
import type { Api[Entity]Response, ApiCreate[Entity]Request } from '../types';
import type { [Entity], [Entity]WriteData } from '@/lib/types';

/**
 * API → Frontend
 */
export function mapApi[Entity]To[Entity](api: Api[Entity]Response): [Entity] {
  return {
    id: String(api.[entityId]),    // SIEMPRE convertir ID a string
    // ... mapear campos
    // Manejar diferencias de nombres:
    // phone: api.contact || '',
    // Manejar campos que no existen en backend:
    // extraField: defaultValue,
  };
}

export function mapApi[Entities]To[Entities](api: Api[Entity]Response[]): [Entity][] {
  return api.map(mapApi[Entity]To[Entity]);
}

/**
 * Frontend → API (para create)
 */
export function map[Entity]ToApiCreateRequest(data: [Entity]WriteData): ApiCreate[Entity]Request {
  return {
    // ... mapear campos frontend a backend
    // contact: data.phone || data.email,
  };
}

/**
 * Frontend → API (para update)
 */
export function map[Entity]ToApiUpdateRequest(data: Partial<[Entity]WriteData>): ApiUpdate[Entity]Request {
  const request: ApiUpdate[Entity]Request = {};
  
  // Solo incluir campos que están presentes
  if (data.fieldName !== undefined) request.fieldName = data.fieldName;
  // ...
  
  return request;
}
```

**Paso 2.4: Agregar/Actualizar Service (`services/[entity]Service.ts`)**

```typescript
import { [entities]Endpoint } from '../endpoints';
import {
  mapApi[Entity]To[Entity],
  mapApi[Entities]To[Entities],
  map[Entity]ToApiCreateRequest,
  map[Entity]ToApiUpdateRequest,
} from '../mappers';
import type { [Entity], [Entity]WriteData } from '@/lib/types';

export const [entities]Service = {
  async getAll(): Promise<[Entity][]> {
    const apiData = await [entities]Endpoint.getAll();
    return mapApi[Entities]To[Entities](apiData);
  },

  async getById(id: string): Promise<[Entity]> {
    const apiData = await [entities]Endpoint.getById(Number(id));
    return mapApi[Entity]To[Entity](apiData);
  },

  async create(data: [Entity]WriteData): Promise<[Entity]> {
    const request = map[Entity]ToApiCreateRequest(data);
    const apiData = await [entities]Endpoint.create(request);
    return mapApi[Entity]To[Entity](apiData);
  },

  async update(id: string, data: Partial<[Entity]WriteData>): Promise<[Entity]> {
    const request = map[Entity]ToApiUpdateRequest(data);
    const apiData = await [entities]Endpoint.update(Number(id), request);
    return mapApi[Entity]To[Entity](apiData);
  },

  async delete(id: string): Promise<void> {
    await [entities]Endpoint.delete(Number(id));
  },
};

// ==============================================
// FUNCIONES DE CONVENIENCIA
// ==============================================

export async function getAll[Entities](): Promise<[Entity][]> {
  return [entities]Service.getAll();
}

export async function get[Entity]ById(id: string): Promise<[Entity] | null> {
  try {
    return await [entities]Service.getById(id);
  } catch {
    return null;
  }
}

export async function create[Entity](data: [Entity]WriteData): Promise<[Entity]> {
  return [entities]Service.create(data);
}

export async function update[Entity](id: string, data: Partial<[Entity]WriteData>): Promise<[Entity]> {
  return [entities]Service.update(id, data);
}

export async function delete[Entity](id: string): Promise<void> {
  return [entities]Service.delete(id);
}
```

**Paso 2.5: Exportar en los index.ts**

```typescript
// endpoints/index.ts
export { [entities]Endpoint } from './[entity]Endpoint';

// mappers/index.ts
export {
  mapApi[Entity]To[Entity],
  mapApi[Entities]To[Entities],
  map[Entity]ToApiCreateRequest,
  map[Entity]ToApiUpdateRequest,
} from './[entity]Mapper';

// services/index.ts
export { [entities]Service } from './[entity]Service';
export {
  getAll[Entities],
  get[Entity]ById,
  create[Entity],
  update[Entity],
  delete[Entity],
} from './[entity]Service';
```

---

#### FASE 3: VALIDACIÓN

**Paso 3.1: Verificar TypeScript**
```bash
npx tsc --noEmit
```

**Paso 3.2: Verificar Build**
```bash
npm run build
```

---

## 2. PROMPT PARA CREAR NUEVAS FEATURES/PÁGINAS

### 📝 Template de Solicitud

```markdown
Necesito crear una nueva feature/página en Grace Hub:

Feature: [Nombre de la feature]

Descripción:
[Qué debe hacer la feature]

Datos necesarios:
- [Tipo de dato 1]
- [Tipo de dato 2]

Acciones del usuario:
- [Acción 1]
- [Acción 2]

Mockup/wireframe (si existe):
[Descripción o link]
```

---

### 🤖 Instrucciones para la IA

#### FASE 1: ANÁLISIS

**Paso 1.1: Identificar Datos Necesarios**
- ¿Qué entidades necesita mostrar?
- ¿Existen los services para esos datos?
- ¿Necesito crear nuevos endpoints?

**Paso 1.2: Identificar Acciones**
- ¿Qué puede hacer el usuario?
- ¿Qué Server Actions necesito?
- ¿Qué validaciones aplican?

**Paso 1.3: Identificar Componentes**
- ¿Qué componentes UI necesito?
- ¿Existen o debo crearlos?
- ¿Qué componentes de shadcn/ui puedo usar?

---

#### FASE 2: IMPLEMENTACIÓN

**Paso 2.1: Crear/Verificar API Layer**
- Si faltan endpoints → seguir Prompt #1

**Paso 2.2: Crear Server Actions (si hay mutaciones)**

```typescript
// src/app/actions/[feature]Actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { [entityService] } from "@/lib/api/services";
import type { [EntityWriteData] } from "@/lib/types";

export async function create[Entity]Action(data: [EntityWriteData]) {
  try {
    const result = await create[Entity](data);
    revalidatePath("/[feature]");
    return { success: true as const, data: result };
  } catch (error) {
    return { 
      success: false as const, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

export async function update[Entity]Action(id: string, data: Partial<[EntityWriteData]>) {
  try {
    const result = await update[Entity](id, data);
    revalidatePath("/[feature]");
    return { success: true as const, data: result };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function delete[Entity]Action(id: string) {
  try {
    await delete[Entity](id);
    revalidatePath("/[feature]");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}
```

**Paso 2.3: Crear Page (Server Component)**

```tsx
// src/app/[feature]/page.tsx
import { getAll[Entities] } from "@/lib/api/services";
import { [Feature]Table } from "@/components/[feature]/[feature]-table";
import { Add[Entity]Dialog } from "@/components/[feature]/add-[entity]-dialog";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function [Feature]Page() {
  const data = await getAll[Entities]();

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">[Feature Title]</h1>
        <Add[Entity]Dialog />
      </div>
      
      <[Feature]Table data={data} />
    </div>
  );
}
```

**Paso 2.4: Crear Componentes**

```tsx
// src/components/[feature]/[feature]-table.tsx
"use client";

import { [Entity] } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface [Feature]TableProps {
  data: [Entity][];
}

export function [Feature]Table({ data }: [Feature]TableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Column 1</TableHead>
          {/* ... */}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            <TableCell>{item.field}</TableCell>
            {/* ... */}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## 3. PROMPT PARA CREAR COMPONENTES UI

### 📝 Template de Solicitud

```markdown
Necesito crear un componente UI:

Nombre: [NombreComponente]

Propósito:
[Qué hace el componente]

Props:
- prop1: tipo - descripción
- prop2: tipo - descripción

Comportamiento:
- [Interacción 1]
- [Interacción 2]

Estilo/diseño:
[Descripción del diseño esperado]
```

---

### 🤖 Instrucciones para la IA

#### REGLAS PARA COMPONENTES

1. **Ubicación correcta**:
   - Primitivos reutilizables → `components/ui/`
   - Específicos de feature → `components/[feature]/`
   - Layout → `components/layout/`

2. **Client vs Server**:
   - ¿Tiene interactividad (onClick, useState)? → `"use client"`
   - ¿Solo muestra datos? → Server Component (default)

3. **Imports de datos**:
   ```typescript
   // ✅ CORRECTO: Recibir datos como props
   interface Props {
     members: Member[];
   }
   export function MemberList({ members }: Props) { ... }

   // ❌ INCORRECTO: Importar services en client component
   import { getAllMembers } from "@/lib/api/services";
   ```

4. **Usar shadcn/ui**:
   ```typescript
   import { Button } from "@/components/ui/button";
   import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
   import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
   ```

---

## 4. PROMPT PARA CORREGIR BUGS

### 📝 Template de Solicitud

```markdown
Tengo un bug en Grace Hub Frontend:

Síntoma:
[Qué está pasando]

Comportamiento esperado:
[Qué debería pasar]

Pasos para reproducir:
1. [Paso 1]
2. [Paso 2]

Error en consola (si hay):
[Copiar error]

Archivo(s) afectado(s):
[Lista de archivos]
```

---

### 🤖 Instrucciones para la IA

#### PROCESO DE DEBUG

**Paso 1: Identificar la capa del problema**

| Síntoma | Capa probable |
|---------|---------------|
| Datos incorrectos/faltan campos | Mapper |
| Error de red / CORS / 404 | Endpoint o Client |
| UI no actualiza | Component (useState/revalidate) |
| Tipos incorrectos | types.ts (API o frontend) |
| Lógica incorrecta | Service o Action |

**Paso 2: Verificar de abajo hacia arriba**

1. ¿El backend responde correctamente? (verificar con Postman/curl)
2. ¿El endpoint está bien definido?
3. ¿El mapper traduce correctamente?
4. ¿El service orquesta bien?
5. ¿El componente usa los datos correctamente?

**Paso 3: Aplicar fix en la capa correcta**

NUNCA hacer workarounds en capas incorrectas:

```typescript
// ❌ INCORRECTO: Fix en el componente
function MemberList({ members }) {
  // Workaround porque el mapper no traduce bien
  const fixedMembers = members.map(m => ({
    ...m,
    id: String(m.memberId)  // ❌ Esto debería estar en el mapper
  }));
}

// ✅ CORRECTO: Fix en el mapper
export function mapApiMemberToMember(api: ApiMemberResponse): Member {
  return {
    id: String(api.memberId),  // ✅ Aquí es donde va
    // ...
  };
}
```

---

## Reglas de Arquitectura Inviolables

### ❌ PROHIBICIONES ABSOLUTAS

#### 1. Pages/Components NO importan de endpoints
```typescript
// ❌ PROHIBIDO
import { membersEndpoint } from '@/lib/api/endpoints';

// ✅ CORRECTO
import { getAllMembers } from '@/lib/api/services';
```

#### 2. Services NO hacen fetch directo
```typescript
// ❌ PROHIBIDO
async getAll() {
  const res = await fetch('/api/v1/members');
  return res.json();
}

// ✅ CORRECTO
async getAll() {
  const apiData = await membersEndpoint.getAll();
  return mapApiMembersToMembers(apiData);
}
```

#### 3. Mappers NO importan client o endpoints
```typescript
// ❌ PROHIBIDO
import { apiClient } from '../client';

// ✅ CORRECTO
import type { ApiMemberResponse } from '../types';
```

#### 4. Client Components NO llaman services directamente
```typescript
// ❌ PROHIBIDO (en client component)
"use client";
import { getAllMembers } from '@/lib/api/services';

export function MemberList() {
  useEffect(() => {
    getAllMembers().then(setMembers);  // ❌
  }, []);
}

// ✅ CORRECTO: Pasar datos desde Server Component
// page.tsx (server)
const members = await getAllMembers();
return <MemberList members={members} />;

// member-list.tsx (client)
"use client";
export function MemberList({ members }: { members: Member[] }) {
  // Usar los datos recibidos
}
```

#### 5. NO mezclar tipos API con tipos Frontend
```typescript
// ❌ PROHIBIDO
interface Props {
  member: ApiMemberResponse;  // Tipo del backend en UI
}

// ✅ CORRECTO
interface Props {
  member: Member;  // Tipo del frontend
}
```

---

## Árbol de Decisiones

### ¿Dónde va mi código?

```
¿Es una llamada HTTP al backend?
├── Sí → endpoints/[entity]Endpoint.ts
└── No ↓

¿Es traducción entre tipos API ↔ Frontend?
├── Sí → mappers/[entity]Mapper.ts
└── No ↓

¿Es orquestación de endpoint + mapper?
├── Sí → services/[entity]Service.ts
└── No ↓

¿Es una mutación desde el frontend?
├── Sí → app/actions/[feature]Actions.ts
└── No ↓

¿Es una página que muestra datos?
├── Sí → app/[feature]/page.tsx (Server Component)
└── No ↓

¿Es UI con interactividad?
├── Sí → components/[feature]/[name].tsx ("use client")
└── No → components/[feature]/[name].tsx (Server Component)
```

### ¿Qué tipo usar?

```
¿Viene del backend (response)?
├── Sí → Api[Entity]Response (en api/types.ts)
└── No ↓

¿Va hacia el backend (request)?
├── Sí → ApiCreate[Entity]Request o ApiUpdate[Entity]Request
└── No ↓

¿Es para usar en componentes/pages?
└── Sí → [Entity] o [Entity]WriteData (en lib/types.ts)
```

---

## Ejemplos Completos

### Ejemplo: Agregar endpoint GET /api/v1/members/:id/attendance

**1. Types (api/types.ts)**
```typescript
// Ya existe ApiAttendanceResponse, no necesita cambios
```

**2. Endpoint (endpoints/membersEndpoint.ts)**
```typescript
// Agregar al objeto existente:
async getAttendance(memberId: number): Promise<ApiAttendanceResponse[]> {
  return apiClient.get<ApiAttendanceResponse[]>(`${ENDPOINT}/${memberId}/attendance`);
},
```

**3. Service (services/membersService.ts)**
```typescript
// Agregar al objeto existente:
async getAttendance(memberId: string): Promise<Attendance[]> {
  const apiData = await membersEndpoint.getAttendance(Number(memberId));
  return mapApiAttendancesToAttendances(apiData);
},

// Función de conveniencia:
export async function getMemberAttendance(memberId: string): Promise<Attendance[]> {
  return membersService.getAttendance(memberId);
}
```

**4. Export (services/index.ts)**
```typescript
export { getMemberAttendance } from './membersService';
```

**5. Uso en Page**
```tsx
import { getMemberAttendance } from "@/lib/api/services";

export default async function MemberDetailPage({ params }) {
  const attendance = await getMemberAttendance(params.id);
  return <AttendanceList records={attendance} />;
}
```

---

### Ejemplo: Crear nueva entidad "Announcements"

**1. Types (api/types.ts)**
```typescript
export interface ApiAnnouncementResponse {
  announcementId: number;
  title: string;
  content: string;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiCreateAnnouncementRequest {
  title: string;
  content: string;
  publishedAt?: string;
}

export interface ApiUpdateAnnouncementRequest {
  title?: string;
  content?: string;
  publishedAt?: string;
}
```

**2. Frontend Types (lib/types.ts)**
```typescript
export interface Announcement {
  id: string;
  title: string;
  content: string;
  publishedAt: string | null;
  createdAt: string;
}

export interface AnnouncementWriteData {
  title: string;
  content: string;
  publishedAt?: string;
}
```

**3. Endpoint (endpoints/announcementsEndpoint.ts)**
```typescript
import { apiClient } from '../client';
import type { 
  ApiAnnouncementResponse, 
  ApiCreateAnnouncementRequest,
  ApiUpdateAnnouncementRequest 
} from '../types';

const ENDPOINT = '/announcements';

export const announcementsEndpoint = {
  async getAll(): Promise<ApiAnnouncementResponse[]> {
    return apiClient.get<ApiAnnouncementResponse[]>(ENDPOINT);
  },

  async getById(id: number): Promise<ApiAnnouncementResponse> {
    return apiClient.get<ApiAnnouncementResponse>(`${ENDPOINT}/${id}`);
  },

  async create(data: ApiCreateAnnouncementRequest): Promise<ApiAnnouncementResponse> {
    return apiClient.post<ApiAnnouncementResponse>(ENDPOINT, data);
  },

  async update(id: number, data: ApiUpdateAnnouncementRequest): Promise<ApiAnnouncementResponse> {
    return apiClient.patch<ApiAnnouncementResponse>(`${ENDPOINT}/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },
};
```

**4. Mapper (mappers/announcementMapper.ts)**
```typescript
import type { ApiAnnouncementResponse, ApiCreateAnnouncementRequest } from '../types';
import type { Announcement, AnnouncementWriteData } from '@/lib/types';

export function mapApiAnnouncementToAnnouncement(api: ApiAnnouncementResponse): Announcement {
  return {
    id: String(api.announcementId),
    title: api.title,
    content: api.content,
    publishedAt: api.publishedAt || null,
    createdAt: api.createdAt,
  };
}

export function mapApiAnnouncementsToAnnouncements(api: ApiAnnouncementResponse[]): Announcement[] {
  return api.map(mapApiAnnouncementToAnnouncement);
}

export function mapAnnouncementToApiCreateRequest(data: AnnouncementWriteData): ApiCreateAnnouncementRequest {
  return {
    title: data.title,
    content: data.content,
    publishedAt: data.publishedAt,
  };
}
```

**5. Service (services/announcementsService.ts)**
```typescript
import { announcementsEndpoint } from '../endpoints';
import {
  mapApiAnnouncementToAnnouncement,
  mapApiAnnouncementsToAnnouncements,
  mapAnnouncementToApiCreateRequest,
} from '../mappers';
import type { Announcement, AnnouncementWriteData } from '@/lib/types';

export const announcementsService = {
  async getAll(): Promise<Announcement[]> {
    const apiData = await announcementsEndpoint.getAll();
    return mapApiAnnouncementsToAnnouncements(apiData);
  },

  async getById(id: string): Promise<Announcement> {
    const apiData = await announcementsEndpoint.getById(Number(id));
    return mapApiAnnouncementToAnnouncement(apiData);
  },

  async create(data: AnnouncementWriteData): Promise<Announcement> {
    const request = mapAnnouncementToApiCreateRequest(data);
    const apiData = await announcementsEndpoint.create(request);
    return mapApiAnnouncementToAnnouncement(apiData);
  },

  async delete(id: string): Promise<void> {
    await announcementsEndpoint.delete(Number(id));
  },
};

// Funciones de conveniencia
export async function getAllAnnouncements(): Promise<Announcement[]> {
  return announcementsService.getAll();
}

export async function createAnnouncement(data: AnnouncementWriteData): Promise<Announcement> {
  return announcementsService.create(data);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  return announcementsService.delete(id);
}
```

**6. Exports en index.ts de cada carpeta**

```typescript
// endpoints/index.ts
export { announcementsEndpoint } from './announcementsEndpoint';

// mappers/index.ts
export { 
  mapApiAnnouncementToAnnouncement,
  mapApiAnnouncementsToAnnouncements,
  mapAnnouncementToApiCreateRequest,
} from './announcementMapper';

// services/index.ts
export { announcementsService } from './announcementsService';
export { getAllAnnouncements, createAnnouncement, deleteAnnouncement } from './announcementsService';
```

---

## Checklist Final

### Antes de hacer commit:

- [ ] ¿Ejecuté `npx tsc --noEmit` sin errores?
- [ ] ¿Ejecuté `npm run build` sin errores?
- [ ] ¿Los tipos Api* coinciden con el backend?
- [ ] ¿Exporté todo en los index.ts?
- [ ] ¿Seguí las convenciones de nombres?
- [ ] ¿Las dependencias van en la dirección correcta?
- [ ] ¿Los componentes usan tipos frontend, no Api*?
- [ ] ¿Las mutaciones usan Server Actions?
- [ ] ¿Llamé revalidatePath después de mutar?
