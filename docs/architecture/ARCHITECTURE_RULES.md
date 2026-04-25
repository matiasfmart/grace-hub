# Grace Hub Frontend - Reglas de Arquitectura

> **Documento de referencia rápida**
>
> Este documento contiene las reglas arquitectónicas que DEBEN respetarse en todo momento.
> Para prompts completos de IA, ver [prompts.md](../prompts/prompts.md)

---

## 🎯 Regla de Oro

**Las capas de API están ordenadas de menor a mayor abstracción:**

```
Pages/Components → Services → Mappers → Endpoints → Client
      ↓               ↓           ↓          ↓          ↓
   Usa datos      Orquesta    Traduce    Llama HTTP   Fetch
```

- **Pages/Components** solo usan Services (nunca Endpoints directamente)
- **Services** orquestan y pueden usar Mappers + Endpoints
- **Mappers** traducen tipos (API ↔ Frontend)
- **Endpoints** hacen llamadas HTTP via Client
- **Client** es el único que hace `fetch()`

---

## 📋 Reglas por Capa

### Client Layer (`src/lib/api/client.ts`)

#### ✅ DEBE:
- Ser el ÚNICO lugar donde se hace `fetch()`
- Manejar errores HTTP de forma centralizada
- Configurar headers comunes (Content-Type, Auth, etc.)
- Exponer métodos genéricos (get, post, put, patch, delete)

#### ❌ NO DEBE:
- Conocer entidades específicas del negocio
- Hacer transformaciones de datos
- Ser importado fuera de `/endpoints`

#### 📁 Archivo único:
```
lib/api/
└── client.ts
```

---

### Endpoints Layer (`src/lib/api/endpoints/`)

#### ✅ DEBE:
- Hacer llamadas HTTP usando el Client
- Retornar tipos `Api*Response` exactamente como vienen del backend
- Definir la URL del endpoint
- Tener un archivo por entidad (`membersEndpoint.ts`, etc.)
- Exportar en `index.ts`

#### ❌ NO DEBE:
- Transformar datos (eso es del Mapper)
- Usar tipos del frontend (`Member`, `GDI`, etc.)
- Contener lógica de negocio
- Ser importado directamente desde Pages/Components

#### 📁 Estructura:
```
lib/api/endpoints/
├── index.ts                    # Exporta todos los endpoints
├── membersEndpoint.ts
├── gdisEndpoint.ts
├── meetingsEndpoint.ts
├── attendanceEndpoint.ts
├── areasEndpoint.ts
├── tithesEndpoint.ts
└── rolesEndpoint.ts
```

---

### Mappers Layer (`src/lib/api/mappers/`)

#### ✅ DEBE:
- Traducir `Api*Response` → tipos frontend (`Member`, `GDI`, etc.)
- Traducir datos frontend → `Api*Request`
- Ser el ÚNICO lugar que conoce la estructura del backend
- Manejar diferencias entre backend y frontend (ej: `memberId` → `id`)
- Tener un archivo por entidad (`memberMapper.ts`, etc.)

#### ❌ NO DEBE:
- Hacer llamadas HTTP
- Contener lógica de negocio
- Modificar estado
- Acceder a APIs externas

#### 📁 Estructura:
```
lib/api/mappers/
├── index.ts                    # Exporta todos los mappers
├── memberMapper.ts
├── gdiMapper.ts
├── meetingMapper.ts
├── attendanceMapper.ts
├── areaMapper.ts
├── titheMapper.ts
└── roleMapper.ts
```

#### 📝 Convención de nombres:
```typescript
// De API a Frontend
mapApiMemberToMember(api: ApiMemberResponse): Member
mapApiMembersToMembers(api: ApiMemberResponse[]): Member[]

// De Frontend a API
mapMemberToApiCreateRequest(member: MemberWriteData): ApiCreateMemberRequest
mapMemberToApiUpdateRequest(member: Partial<MemberWriteData>): ApiUpdateMemberRequest
```

---

### Services Layer (`src/lib/api/services/`)

#### ✅ DEBE:
- Orquestar Endpoints + Mappers
- Retornar tipos frontend (`Member`, `GDI`, etc.)
- Proveer funciones de conveniencia para compatibilidad
- Manejar casos especiales (ej: endpoint no existe → retornar mock)
- Tener un archivo por entidad (`membersService.ts`, etc.)
- Exportar objeto `xxxService` + funciones individuales

#### ❌ NO DEBE:
- Hacer `fetch()` directamente
- Conocer la estructura de las respuestas del backend (eso es del Mapper)
- Contener lógica de UI
- Manejar estado de React

#### 📁 Estructura:
```
lib/api/services/
├── index.ts                    # Exporta services + funciones
├── membersService.ts
├── gdisService.ts
├── meetingsService.ts
├── attendanceService.ts
├── areasService.ts
├── tithesService.ts
└── rolesService.ts
```

#### 📝 Patrón de Service:
```typescript
// Objeto Service (forma principal)
export const membersService = {
  async getAll(): Promise<Member[]> { ... },
  async getById(id: string): Promise<Member> { ... },
  async create(data: MemberWriteData): Promise<Member> { ... },
};

// Funciones de conveniencia (backward compatibility)
export async function getAllMembers(): Promise<Member[]> {
  return membersService.getAll();
}
```

---

### Types Layer (`src/lib/api/types.ts`)

#### ✅ DEBE:
- Definir tipos que COINCIDAN EXACTAMENTE con los DTOs del backend
- Usar prefijo `Api` para todos los tipos (`ApiMemberResponse`)
- Definir tipos de Request y Response
- Definir enums que coincidan con el backend

#### ❌ NO DEBE:
- Definir tipos del frontend (eso va en `src/lib/types.ts`)
- Ser modificado sin verificar el contrato del backend
- Contener lógica

#### 📝 Convención de nombres:
```typescript
// Responses (lo que devuelve el backend)
interface ApiMemberResponse { ... }
interface ApiGdiResponse { ... }

// Requests (lo que enviamos al backend)
interface ApiCreateMemberRequest { ... }
interface ApiUpdateMemberRequest { ... }

// Enums
type ApiMemberStatus = 'Active' | 'Inactive' | 'New';
```

---

### Pages/Components (`src/app/`, `src/components/`)

#### ✅ DEBE:
- Importar SOLO de `@/lib/api/services` o `@/lib/api`
- Usar tipos frontend de `@/lib/types`
- Usar Server Components cuando sea posible
- Usar Server Actions para mutaciones

#### ❌ NO DEBE:
- Importar de `endpoints/` directamente
- Importar de `mappers/` directamente
- Conocer tipos `Api*Response`
- Hacer `fetch()` directamente

---

### Server Actions (`src/app/actions/`)

#### ✅ DEBE:
- Usar `"use server"` directive
- Importar de `@/lib/api/services`
- Validar input con Zod
- Retornar tipos frontend
- Llamar `revalidatePath()` después de mutaciones

#### ❌ NO DEBE:
- Importar de `endpoints/` directamente
- Contener lógica de UI
- Retornar tipos API raw

---

## 🔒 Prohibiciones Absolutas

### 1. Pages/Components NO pueden importar endpoints:
```typescript
// ❌ PROHIBIDO
import { membersEndpoint } from '@/lib/api/endpoints';

// ✅ CORRECTO
import { getAllMembers } from '@/lib/api/services';
// o
import { membersService } from '@/lib/api/services';
```

### 2. Services NO pueden hacer fetch directamente:
```typescript
// ❌ PROHIBIDO
async getAll() {
  const res = await fetch('/api/v1/members');
  return res.json();
}

// ✅ CORRECTO
async getAll() {
  const apiMembers = await membersEndpoint.getAll();
  return mapApiMembersToMembers(apiMembers);
}
```

### 3. Mappers NO pueden importar client o endpoints:
```typescript
// ❌ PROHIBIDO
import { apiClient } from '../client';

// ✅ CORRECTO - Solo tipos
import type { ApiMemberResponse } from '../types';
import type { Member } from '@/lib/types';
```

### 4. Endpoints NO pueden transformar datos:
```typescript
// ❌ PROHIBIDO
async getAll() {
  const data = await apiClient.get<ApiMemberResponse[]>(ENDPOINT);
  return data.map(m => ({ id: m.memberId, name: m.fullName })); // ❌
}

// ✅ CORRECTO
async getAll() {
  return apiClient.get<ApiMemberResponse[]>(ENDPOINT);
}
```

---

## ⚡ Reglas de Rendimiento — Server Components

Estas reglas aplican a TODA página o función de data-fetching en `src/app/(protected)/`.
Son tan inviolables como las reglas de capas. Un código funcionalmente correcto que viole
estas reglas tiene un bug de rendimiento y DEBE corregirse.

### Regla P-1: Llamadas independientes SIEMPRE en paralelo con `Promise.all`

Cuando una función de data-fetching necesita múltiples recursos que NO dependen entre sí,
DEBEN ejecutarse en paralelo. Nunca con `await` secuencial.

```typescript
// ❌ PROHIBIDO — cada await bloquea al siguiente
// Con N=9 calls de 300ms cada una, total = 2.7s
const members = await getAllMembers(...);
const allGDIs = await getAllGdis();
const allAreas = await getAllMinistryAreas();
const allMeetings = await getAllMeetings();
// ... etc

// ✅ CORRECTO — todas las calls independientes en paralelo
// Total = tiempo del request más lento (~300ms)
const [members, allGDIs, allAreas, allMeetings] = await Promise.all([
  getAllMembers(...),
  getAllGdis(),
  getAllMinistryAreas(),
  getAllMeetings(),
]);
```

> **Por qué importa:** `force-dynamic` desactiva todo cache. Cada navegación y cada filtro
> ejecuta el Server Component desde cero. Con 9 awaits secuenciales de 300ms cada uno,
> la página tarda mínimo 2.7s antes de enviar cualquier HTML al browser.

### Regla P-2: No cargar datos masivos que no se necesitan en el render inicial

Los datos que solo se usan en un flujo secundario (dialog al click, modal, panel que se abre)
NO deben cargarse en el Server Component. Deben diferirse al momento en que realmente se necesitan.

```typescript
// ❌ PROHIBIDO — se cargan todos los registros históricos en cada render de la página
// aunque el usuario solo esté viendo la lista
const allAttendanceRecords = await getAllAttendanceRecords(); // puede ser miles de registros
const allTitheRecords = await getAllTitheRecords();           // crece con el tiempo
// ...se pasan como props a un dialog que el 99% de los renders nunca abre

// ✅ CORRECTO — datos diferidos: se cargan cuando se abren en el dialog (on-demand)
// En memberActions.ts (Server Action):
export async function getMemberAttendanceAction(memberId: string) {
  const data = await attendanceService.getByMember(memberId);
  return { success: true, data };
}
// En el Client Component (MemberDetailsDialog):
useEffect(() => {
  if (!isOpen || !member) return;
  Promise.all([
    getMemberAttendanceAction(member.id),
    getMemberTithesAction(member.id),
  ]).then(([attendance, tithes]) => { ... });
}, [isOpen, member?.id]);
```

> **Por qué importa:** `getAllAttendanceRecords()` trae TODOS los registros de asistencia
> de la historia de la app. Con el tiempo puede ser decenas de miles de filas. Cargarlo
> en cada filtro de miembros es un problema que se agrava con el uso.

### Regla P-3: Datos no paginados no deben cargarse más de una vez por render

Si una página usa datos no paginados (ej: `getAllMembersNonPaginated()` para dropdowns),
deben cargarse UNA sola vez en el Server Component y pasarse por props. Nunca llamarlos
en múltiples lugares del mismo render.

### Regla P-4: El `Promise.all` es el patrón estándar — aplicar siempre

No es una optimización opcional. Es el patrón correcto para cualquier función que fetche
más de un recurso. La excepción es cuando el resultado del request A es necesario como
input del request B (dependencia real). En ese caso el await secuencial es correcto y
debe estar comentado explicando la dependencia:

```typescript
// ✅ Secuencial justificado — B necesita el ID retornado por A
const newMember = await membersService.create(data);
await gdisService.assignMember(gdiId, newMember.id); // necesita newMember.id
```

### Regla P-5: Datos on-demand via Server Actions para Client Components

Cuando un Client Component necesita datos que no estaban disponibles en el render inicial
(lazy load, on-demand fetch), el flujo correcto es:

```
Client Component → Server Action → Service → Endpoint → Backend
```

Nunca un Client Component puede llamar a un service directamente. La regla BFF aplica
también a los fetches on-demand.

---

## 📋 Checklist de rendimiento (agregar al code review)

### Al revisar una función de data-fetching en un Server Component:

- [ ] ¿Todas las llamadas independientes usan `Promise.all`?
- [ ] ¿No se están cargando datasets masivos que solo se usan en flujos secundarios?
- [ ] ¿Los datos no paginados se cargan una sola vez y se pasan por props?
- [ ] ¿Los fetches on-demand van via Server Action (no service directo en Client Component)?

---



### 1. Crear nuevo endpoint

Siempre seguir el orden:
1. **Types** (`types.ts`) - Agregar `Api*Response` y `Api*Request`
2. **Endpoint** (`xxxEndpoint.ts`) - Llamadas HTTP
3. **Mapper** (`xxxMapper.ts`) - Traducción
4. **Service** (`xxxService.ts`) - Orquestación
5. **Export** (`index.ts` en cada carpeta)

### 2. Manejar endpoints que no existen

```typescript
// En el service, cuando el backend no tiene el endpoint:
export async function getAllMeetingSeries(): Promise<MeetingSeries[]> {
  console.warn('getAllMeetingSeries: Backend does not support this. Returning []');
  return [];
}
```

### 3. Error handling en Services

```typescript
// Opción A: Propagar el error
async getById(id: string): Promise<Member> {
  const apiMember = await membersEndpoint.getById(Number(id));
  return mapApiMemberToMember(apiMember);
}

// Opción B: Retornar null (para búsquedas)
async getById(id: string): Promise<Member | null> {
  try {
    const apiMember = await membersEndpoint.getById(Number(id));
    return mapApiMemberToMember(apiMember);
  } catch {
    return null;
  }
}
```

---

## 📋 Checklist para Code Review

### Al revisar código de API Layer:

- [ ] ¿Los tipos `Api*` coinciden con el backend?
- [ ] ¿El Mapper traduce correctamente todos los campos?
- [ ] ¿El Service usa Endpoint + Mapper (no fetch directo)?
- [ ] ¿Todo está exportado en los `index.ts`?
- [ ] ¿Los nombres siguen las convenciones?

### Al revisar código de Pages/Components:

- [ ] ¿Importa de `@/lib/api/services` (no endpoints)?
- [ ] ¿Usa tipos de `@/lib/types` (no Api types)?
- [ ] ¿Las mutaciones usan Server Actions?
- [ ] ¿Llama `revalidatePath` después de mutar?

---

## 🔄 Flujo de Datos

```
┌──────────────────────────────────────────────────────────────────┐
│                         FLUJO DE LECTURA                          │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Page/Component                                                   │
│       │                                                           │
│       ▼ llama                                                     │
│  membersService.getAll()                                         │
│       │                                                           │
│       ▼ llama                                                     │
│  membersEndpoint.getAll()                                        │
│       │                                                           │
│       ▼ llama                                                     │
│  apiClient.get('/members')                                       │
│       │                                                           │
│       ▼ HTTP GET                                                  │
│  Backend: GET /api/v1/members                                    │
│       │                                                           │
│       ▼ responde                                                  │
│  ApiMemberResponse[]                                             │
│       │                                                           │
│       ▼ mapea (en service)                                       │
│  mapApiMembersToMembers(apiMembers)                              │
│       │                                                           │
│       ▼ retorna                                                   │
│  Member[] (tipo frontend)                                        │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        FLUJO DE ESCRITURA                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Page/Component (form submit)                                    │
│       │                                                           │
│       ▼ llama                                                     │
│  Server Action: createMember(data)                               │
│       │                                                           │
│       ▼ valida con Zod                                           │
│  MemberWriteData                                                 │
│       │                                                           │
│       ▼ llama                                                     │
│  membersService.create(data)                                     │
│       │                                                           │
│       ▼ mapea                                                     │
│  mapMemberToApiCreateRequest(data)                               │
│       │                                                           │
│       ▼ llama                                                     │
│  membersEndpoint.create(request)                                 │
│       │                                                           │
│       ▼ HTTP POST                                                 │
│  Backend: POST /api/v1/members                                   │
│       │                                                           │
│       ▼ responde                                                  │
│  ApiMemberResponse                                               │
│       │                                                           │
│       ▼ mapea                                                     │
│  mapApiMemberToMember(apiMember)                                 │
│       │                                                           │
│       ▼ revalida                                                  │
│  revalidatePath('/members')                                      │
│       │                                                           │
│       ▼ retorna                                                   │
│  Member (tipo frontend)                                          │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```
