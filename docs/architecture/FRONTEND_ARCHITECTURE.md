# Grace Hub Frontend - Arquitectura

## 🏛️ Arquitectura Implementada

Este proyecto sigue una arquitectura de **capas con separación clara de responsabilidades**, optimizada para aplicaciones Next.js que consumen un backend REST.

---

## 📐 Principios Aplicados

### 1. **Separation of Concerns (SoC)**
Cada capa tiene una única responsabilidad:
- **Client**: Comunicación HTTP
- **Endpoints**: Definición de rutas API
- **Mappers**: Traducción de tipos
- **Services**: Orquestación
- **Components**: Presentación

### 2. **Single Source of Truth**
- Los tipos del backend se definen en UN solo lugar (`api/types.ts`)
- Los tipos del frontend se definen en UN solo lugar (`lib/types.ts`)
- La traducción ocurre en UN solo lugar (mappers)

### 3. **Dependency Inversion**
- Las capas superiores no conocen los detalles de las inferiores
- Pages no conocen cómo se hace fetch
- Services no conocen la estructura HTTP

### 4. **Fail Gracefully**
- Errores de red se manejan de forma centralizada
- Endpoints que no existen retornan datos mock
- La UI siempre puede renderizar

---

## 🎯 Capas de la Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION                              │
│  Pages (Server Components), Components, Server Actions           │
│  ↓ usa ↓                                                         │
├─────────────────────────────────────────────────────────────────┤
│                         SERVICES                                 │
│  Orquestación, funciones de conveniencia, manejo de casos edge   │
│  ↓ usa ↓                                                         │
├─────────────────────────────────────────────────────────────────┤
│                         MAPPERS                                  │
│  Traducción API ↔ Frontend, adaptación de tipos                  │
│  ↓ usa ↓                                                         │
├─────────────────────────────────────────────────────────────────┤
│                        ENDPOINTS                                 │
│  Definición de rutas, llamadas HTTP tipadas                      │
│  ↓ usa ↓                                                         │
├─────────────────────────────────────────────────────────────────┤
│                          CLIENT                                  │
│  Fetch wrapper, error handling, configuración                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ↓ HTTP
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (NestJS)                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura del Proyecto

```
src/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout (sin sidebar — solo html/body/Toaster)
│   ├── globals.css                   # Global styles
│   │
│   ├── (protected)/                  # Route group: páginas protegidas (requieren auth)
│   │   ├── layout.tsx                # Layout con MainLayout (sidebar)
│   │   ├── page.tsx                  # Dashboard (home page)
│   │   │
│   │   ├── actions/                  # Server Actions (mutaciones)
│   │   │   ├── memberActions.ts      # CRUD members
│   │   │   ├── eventActions.ts       # CRUD meetings
│   │   │   └── groupActions.ts       # CRUD GDIs/Areas
│   │   │
│   │   ├── members/                  # Feature: Members
│   │   ├── events/                   # Feature: Events/Meetings
│   │   ├── groups/                   # Feature: Groups
│   │   ├── tithes/                   # Feature: Tithes
│   │   └── resources/                # Feature: Resources
│   │
│   ├── login/                        # Página de login (pública, sin sidebar)
│   │   └── page.tsx
│   │
│   └── api/                          # Route Handlers de Next.js
│       └── auth/
│           ├── login/route.ts        # Proxy: llama al backend, setea cookie
│           ├── logout/route.ts       # Limpia la cookie
│           └── me/route.ts           # Proxy: lee cookie server-side, llama /auth/me
│
├── middleware.ts                      # Intercepta navegación: redirige a /login si no hay cookie
│       └── page.tsx
│
├── components/                       # React Components
│   ├── ui/                           # Primitivos UI (shadcn/ui)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   │
│   ├── layout/                       # Layout components
│   │   ├── app-sidebar.tsx
│   │   └── main-layout.tsx
│   │
│   ├── members/                      # Components de Members
│   │   ├── member-form.tsx
│   │   ├── member-table.tsx
│   │   └── ...
│   │
│   ├── events/                       # Components de Events
│   ├── groups/                       # Components de Groups
│   ├── tithes/                       # Components de Tithes
│   ├── prospects/                    # Components de Nuevos Ingresos
│   └── dashboard/                    # Components del Dashboard
│
├── lib/                              # Utilities & Core
│   ├── types.ts                      # ⭐ Tipos del FRONTEND
│   ├── utils.ts                      # Utilidades generales
│   │
│   └── api/                          # ⭐ CAPA DE API
│       ├── client.ts                 # HTTP Client (fetch wrapper, credentials:include, cookie SSR forwarding)
│       ├── types.ts                  # Tipos del BACKEND (Api*)
│       ├── index.ts                  # Re-exports principales
│       │
│       ├── endpoints/                # Llamadas HTTP
│       │   ├── index.ts
│       │   ├── authEndpoint.ts       # login (proxy), register, me, logout (proxy)
│       │   ├── membersEndpoint.ts
│       │   ├── gdisEndpoint.ts
│       │   ├── meetingsEndpoint.ts
│       │   ├── meetingSeriesEndpoint.ts
│       │   ├── attendanceEndpoint.ts
│       │   ├── areasEndpoint.ts
│       │   ├── tithesEndpoint.ts
│       │   ├── prospectsEndpoint.ts
│       │   ├── rolesEndpoint.ts
│       │   └── roleTypesEndpoint.ts
│       │
│       ├── mappers/                  # Traducción de tipos
│       │   ├── index.ts
│       │   ├── memberMapper.ts
│       │   ├── gdiMapper.ts
│       │   ├── meetingMapper.ts
│       │   ├── meetingSeriesMapper.ts
│       │   ├── attendanceMapper.ts
│       │   ├── areaMapper.ts
│       │   ├── titheMapper.ts
│       │   ├── prospectMapper.ts
│       │   ├── roleMapper.ts
│       │   └── roleTypesMapper.ts
│       │
│       └── services/                 # Orquestación
│           ├── index.ts              # Exporta todo
│           ├── membersService.ts
│           ├── gdisService.ts
│           ├── meetingsService.ts
│           ├── attendanceService.ts
│           ├── areasService.ts
│           ├── groupMeetingsService.ts
│           ├── tithesService.ts
│           ├── prospectsService.ts
│           ├── rolesService.ts
│           └── roleTypesService.ts
│
└── hooks/                            # Custom React Hooks
    ├── use-mobile.tsx
    └── use-toast.ts
```

---

## 🔑 Conceptos Clave

### 1. **API Client**

El cliente HTTP centralizado que maneja todas las comunicaciones:

```typescript
// src/lib/api/client.ts

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_PREFIX = '/api/v1';

export const apiClient = {
  async get<T>(endpoint: string, params?: RequestParams): Promise<T> {
    const url = buildUrl(endpoint, params);
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    return handleResponse<T>(response);
  },
  
  async post<T>(endpoint: string, body?: unknown): Promise<T> { ... },
  async put<T>(endpoint: string, body?: unknown): Promise<T> { ... },
  async patch<T>(endpoint: string, body?: unknown): Promise<T> { ... },
  async delete<T>(endpoint: string): Promise<T> { ... },
};
```

**Beneficios**:
- ✅ Configuración centralizada (URL, headers)
- ✅ Manejo de errores uniforme
- ✅ Fácil de mockear en tests
- ✅ Un solo lugar para cambios de autenticación

---

### 2. **Endpoints**

Definen las rutas del API y retornan tipos raw del backend:

```typescript
// src/lib/api/endpoints/membersEndpoint.ts

const ENDPOINT = '/members';

export const membersEndpoint = {
  async getAll(): Promise<ApiMemberResponse[]> {
    return apiClient.get<ApiMemberResponse[]>(ENDPOINT);
  },

  async getById(id: number): Promise<ApiMemberResponse> {
    return apiClient.get<ApiMemberResponse>(`${ENDPOINT}/${id}`);
  },

  async create(data: ApiCreateMemberRequest): Promise<ApiMemberResponse> {
    return apiClient.post<ApiMemberResponse>(ENDPOINT, data);
  },

  async update(id: number, data: ApiUpdateMemberRequest): Promise<ApiMemberResponse> {
    return apiClient.patch<ApiMemberResponse>(`${ENDPOINT}/${id}`, data);
  },

  async delete(id: number): Promise<void> {
    return apiClient.delete(`${ENDPOINT}/${id}`);
  },
};
```

**Beneficios**:
- ✅ Rutas definidas en un solo lugar
- ✅ Tipos estrictos con el contrato del backend
- ✅ Fácil de ver todos los endpoints disponibles

---

### 3. **Mappers**

Traducen entre tipos del backend y frontend:

```typescript
// src/lib/api/mappers/memberMapper.ts

/**
 * Convierte respuesta del API a tipo frontend
 */
export function mapApiMemberToMember(apiMember: ApiMemberResponse): Member {
  return {
    id: String(apiMember.memberId),           // Backend usa number, frontend usa string
    firstName: apiMember.firstName,
    lastName: apiMember.lastName,
    email: '',                                 // Backend no tiene email
    phone: apiMember.contact || '',           // Backend usa 'contact'
    birthDate: apiMember.birthDate,
    status: apiMember.status,
    // ... más campos
  };
}

/**
 * Convierte datos del frontend a request del API
 */
export function mapMemberToApiCreateRequest(member: MemberWriteData): ApiCreateMemberRequest {
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    contact: member.phone || member.email,    // Frontend tiene phone/email separados
    status: member.status,
    // ... más campos
  };
}
```

**Beneficios**:
- ✅ Aísla diferencias entre backend y frontend
- ✅ Si el backend cambia, solo se modifica el mapper
- ✅ El frontend trabaja con sus propios tipos

---

### 4. **Services**

Orquestan endpoints y mappers, exponen API limpia:

```typescript
// src/lib/api/services/membersService.ts

export const membersService = {
  /**
   * Obtiene todos los miembros
   */
  async getAll(): Promise<Member[]> {
    const apiMembers = await membersEndpoint.getAll();
    return mapApiMembersToMembers(apiMembers);
  },

  /**
   * Crea un nuevo miembro
   */
  async create(data: MemberWriteData): Promise<Member> {
    const request = mapMemberToApiCreateRequest(data);
    const apiMember = await membersEndpoint.create(request);
    return mapApiMemberToMember(apiMember);
  },
};

// Funciones de conveniencia para imports más simples
export async function getAllMembers(): Promise<Member[]> {
  return membersService.getAll();
}
```

**Beneficios**:
- ✅ API limpia para los consumidores
- ✅ Oculta detalles de implementación
- ✅ Lugar para agregar lógica adicional (cache, retry, etc.)
- ✅ Funciones de conveniencia para compatibilidad

---

### 5. **Server Actions**

Mutaciones desde el servidor con validación:

```typescript
// src/app/actions/memberActions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createMember, updateMember, deleteMember } from "@/lib/api/services";
import type { MemberWriteData } from "@/lib/types";

export async function addMemberAction(data: MemberWriteData) {
  try {
    const member = await createMember(data);
    revalidatePath("/members");
    return { success: true, data: member };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function deleteMemberAction(id: string) {
  try {
    await deleteMember(id);
    revalidatePath("/members");
    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
```

**Beneficios**:
- ✅ Ejecución en el servidor (seguro)
- ✅ Revalidación automática del cache
- ✅ Manejo de errores uniforme
- ✅ Tipado end-to-end

---

## 🔄 Flujos de Datos

### Lectura de Datos (Server Component)

```tsx
// src/app/members/page.tsx

import { getAllMembers } from "@/lib/api/services";

export default async function MembersPage() {
  // 1. Llama al service (Server Component puede ser async)
  const members = await getAllMembers();
  
  // 2. Renderiza con los datos
  return (
    <MemberTable members={members} />
  );
}
```

**Flujo interno**:
```
MembersPage
    ↓ await getAllMembers()
membersService.getAll()
    ↓ await membersEndpoint.getAll()
membersEndpoint.getAll()
    ↓ await apiClient.get('/members')
apiClient.get()
    ↓ fetch('http://localhost:3001/api/v1/members')
Backend responde: ApiMemberResponse[]
    ↓ retorna
apiClient retorna: ApiMemberResponse[]
    ↓ retorna
membersEndpoint retorna: ApiMemberResponse[]
    ↓ mapApiMembersToMembers(apiMembers)
membersService retorna: Member[]
    ↓ retorna
MembersPage recibe: Member[]
```

---

### Escritura de Datos (Server Action)

```tsx
// src/components/members/member-form.tsx
"use client";

import { addMemberAction } from "@/app/actions/memberActions";

export function MemberForm() {
  async function handleSubmit(formData: FormData) {
    const data = {
      firstName: formData.get("firstName") as string,
      lastName: formData.get("lastName") as string,
      // ...
    };
    
    const result = await addMemberAction(data);
    
    if (result.success) {
      // La página ya se revalidó, redirigir o mostrar éxito
    } else {
      // Mostrar error
    }
  }

  return (
    <form action={handleSubmit}>
      {/* campos */}
    </form>
  );
}
```

---

## 📋 Tipos y Contratos

### Tipos del Backend (`src/lib/api/types.ts`)

```typescript
// EXACTAMENTE como los define el backend
export interface ApiMemberResponse {
  memberId: number;           // Backend usa number
  firstName: string;
  lastName: string;
  fullName: string;
  contact?: string;           // Backend usa 'contact', no 'phone'/'email'
  status: ApiMemberStatus;
  // ...
}

export interface ApiCreateMemberRequest {
  firstName: string;
  lastName: string;
  contact?: string;
  status?: ApiMemberStatus;
  // ...
}
```

### Tipos del Frontend (`src/lib/types.ts`)

```typescript
// Como los necesita el frontend
export interface Member {
  id: string;                 // Frontend usa string IDs
  firstName: string;
  lastName: string;
  email: string;              // Frontend separa email/phone
  phone: string;
  status: MemberStatus;
  // ...
}

export interface MemberWriteData {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  status: MemberStatus;
  // ...
}
```

---

## 🔐 Autenticación

### Flujo general

La autenticación usa JWT almacenado en cookie `httpOnly`. El middleware de Next.js protege todas las páginas del grupo `(protected)` antes de renderizar cualquier componente.

```
Navegación a cualquier página
  ↓
middleware.ts — ¿existe cookie 'auth'?
  ├─ Sí → renderiza normalmente
  └─ No → redirect a /login
```

### Login: por qué usa un Route Handler y no llama al backend directo

El login NO usa `apiClient` directamente. Pasa por un Route Handler de Next.js (`/api/auth/login`):

```
Browser
  ↓ POST /api/auth/login
Next.js Route Handler (mismo dominio que el frontend)
  ↓ fetch al backend (NestJS)
NestJS → valida credenciales → devuelve JWT en Set-Cookie
Route Handler extrae el JWT y lo reescribe como cookie del dominio frontend
  ↓ Set-Cookie: auth=<JWT>; HttpOnly; SameSite=Lax (en localhost:3000 o app.tudominio.com)
Browser → window.location.href = '/'
Middleware ve la cookie → pasa ✔
```

Si el backend seteara la cookie directamente, quedaría en el dominio del backend. El middleware de Next.js no tendría acceso a ella en producción.

### Por qué el browser NUNCA llama directamente al backend

La cookie `auth` es `httpOnly` — el browser la envía automáticamente solo a requests del **mismo dominio** donde fue creada (el frontend). Si un componente client-side (`"use client"`) intentara llamar al backend directamente, el browser no enviaría la cookie y el backend devolvería 401.

**Esto aplica a todos los ambientes donde frontend y backend tienen dominios distintos** (ej: `app.gracehub.com` vs `api.gracehub.com`). En desarrollo local no se nota porque ambos corren en `localhost`.

**Regla:** El browser solo llama a rutas de Next.js (`/api/*` o páginas). El servidor de Next.js hace el fetch al backend. Esta es la arquitectura BFF (Backend For Frontend).

### Patrón Server Component / Client Component

Todo fetching de datos ocurre en Server Components. Los Client Components solo manejan interactividad UI.

```
page.tsx (Server Component — async)
  ↓ fetchea datos via apiClient (corre en el servidor, tiene acceso a la cookie)
  ↓ pasa datos como props
FeatureView.tsx (Client Component — "use client")
  ↓ recibe initialData como props
  ↓ maneja estado interactivo (useState, useTransition)
  ↓ llama Server Actions para mutations
actions.ts ("use server")
  ↓ corren en el servidor, tienen acceso a la cookie via apiClient
  ↓ llaman al backend y ejecutan revalidatePath()
```

**Ejemplo concreto** (`role-types`):

```typescript
// page.tsx — Server Component
export default async function RoleTypesSettingsPage() {
  const roleTypes = await roleTypesService.getAll(); // ← server-side, cookie incluida automáticamente
  return <RoleTypesView initialRoleTypes={roleTypes} />;
}

// RoleTypesView.tsx — Client Component
"use client";
export function RoleTypesView({ initialRoleTypes }: { initialRoleTypes: RoleType[] }) {
  const [roleTypes, setRoleTypes] = useState(initialRoleTypes);
  // mutations llaman Server Actions — nunca apiClient directamente
}

// actions.ts — Server Actions
"use server";
export async function createRoleTypeAction(name: string) {
  const roleType = await roleTypesService.create(name); // ← server-side
  revalidatePath("/members/settings/role-types");
  return { success: true, roleType };
}
```

**Después de una mutation**, el Client Component puede actualizar estado local optimísticamente o llamar `router.refresh()` para que el Server Component re-ejecute y pase datos actualizados. Las páginas complejas (GDI admin, Area admin) usan `router.refresh()`.

### Server Components: reenvío de cookie

Cuando un Server Component llama al backend vía `apiClient`, la cookie del browser no se envía automáticamente (el fetch del servidor no tiene contexto del browser). `client.ts` la reenvía explícitamente:

```typescript
// client.ts — solo en contexto de servidor
const cookieStore = await cookies();
const authCookie = cookieStore.get('auth');
// se incluye como header Cookie en el fetch al backend
```

### UserContext

`UserProvider` (en `main-layout.tsx`) llama a `GET /api/auth/me` al montar y expone el usuario autenticado via `useUser()`. También expone `logout()` que limpia la cookie y redirige a `/login`.

La llamada usa el Route Handler proxy `/api/auth/me` — el browser llama a su propio dominio, y el Route Handler reenvía al backend con la cookie. Esto resuelve el problema de cross-domain en producción.

### Agregar una nueva ruta pública (sin auth)

1. Crear la página **fuera** del grupo `(protected)/` (ej: `app/verify-email/page.tsx`)
2. Agregar el path a `PUBLIC_PATHS` en `src/middleware.ts`:

```typescript
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout', '/verify-email'];
```

---

## ⚠️ Manejo de Errores

### En el Client

```typescript
// src/lib/api/client.ts

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly errorMessage: string | string[],
    public readonly errorType?: string
  ) {
    super(Array.isArray(errorMessage) ? errorMessage.join(', ') : errorMessage);
    this.name = 'ApiError';
  }

  get isNotFound(): boolean { return this.statusCode === 404; }
  get isValidationError(): boolean { return this.statusCode === 400; }
}
```

### En los Services

```typescript
// Opción 1: Propagar el error
async getById(id: string): Promise<Member> {
  const apiMember = await membersEndpoint.getById(Number(id));
  return mapApiMemberToMember(apiMember);
  // Si falla, el error se propaga
}

// Opción 2: Retornar null
async getById(id: string): Promise<Member | null> {
  try {
    const apiMember = await membersEndpoint.getById(Number(id));
    return mapApiMemberToMember(apiMember);
  } catch {
    return null;
  }
}

// Opción 3: Retornar mock (para endpoints que no existen)
async getAllSeries(): Promise<MeetingSeries[]> {
  console.warn('getAllSeries: Backend does not support this yet');
  return [];
}
```

### En Server Actions

```typescript
export async function addMemberAction(data: MemberWriteData) {
  try {
    const member = await createMember(data);
    revalidatePath("/members");
    return { success: true as const, data: member };
  } catch (error) {
    const message = error instanceof ApiError 
      ? error.message 
      : 'Error desconocido';
    return { success: false as const, error: message };
  }
}
```

---

## 🧪 Testing

### Estructura de Tests

```
__tests__/
├── lib/
│   └── api/
│       ├── mappers/
│       │   └── memberMapper.test.ts
│       └── services/
│           └── membersService.test.ts
└── components/
    └── members/
        └── member-form.test.tsx
```

### Testing de Mappers

```typescript
// __tests__/lib/api/mappers/memberMapper.test.ts

describe('memberMapper', () => {
  describe('mapApiMemberToMember', () => {
    it('should map memberId to string id', () => {
      const apiMember: ApiMemberResponse = {
        memberId: 123,
        firstName: 'John',
        // ...
      };
      
      const member = mapApiMemberToMember(apiMember);
      
      expect(member.id).toBe('123');
      expect(typeof member.id).toBe('string');
    });
  });
});
```

### Testing de Services (con mocks)

```typescript
// __tests__/lib/api/services/membersService.test.ts

jest.mock('../endpoints/membersEndpoint');

describe('membersService', () => {
  it('should return mapped members', async () => {
    const mockApiMembers = [{ memberId: 1, firstName: 'John' }];
    (membersEndpoint.getAll as jest.Mock).mockResolvedValue(mockApiMembers);
    
    const members = await membersService.getAll();
    
    expect(members[0].id).toBe('1');
  });
});
```
