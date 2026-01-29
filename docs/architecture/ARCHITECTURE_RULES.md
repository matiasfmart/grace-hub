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

## ✅ Patrones Obligatorios

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
