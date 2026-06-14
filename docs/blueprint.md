# Grace Hub - Product Blueprint

> **Última actualización:** 2026-06-14

## Visión del Producto

Grace Hub es un sistema de gestión de membresía y asistencia para iglesias, diseñado para facilitar el seguimiento de miembros, grupos de integración (GDIs), áreas ministeriales, reuniones y diezmos.

---

## Core Features

### ✅ Implementado

| Feature | Descripción | Estado |
|---------|-------------|--------|
| **Member Directory** | Directorio de miembros con búsqueda, filtros, paginación, KPIs y nivel operativo | ✅ Completo |
| **Groups Management** | Gestión de GDIs y Áreas Ministeriales con asignación de miembros | ✅ Completo |
| **Mentor Assignment** | Asignación de Mentores a GDIs/Áreas via formulario | ✅ Completo |
| **Meeting Series** | Definición de series de reuniones con recurrencia configurable | ✅ Completo |
| **Audience Type Selector** | Selección de tipo de audiencia al crear/editar una serie (GDI, Área, todos, por nivel, por etiqueta) | ✅ Completo |
| **Attendance Tracking** | Registro de asistencia por reunión con asistentes esperados | ✅ Completo |
| **Tithe Tracking** | Seguimiento mensual de diezmos por miembro con KPIs y filtros avanzados | ✅ Completo |
| **Dashboard** | Vista general con gráficos de asistencia y distribución | ✅ Completo |
| **Ecclesiastical Labels** | Etiquetas eclesiales configurables (Pastor, Diácono, etc.) con CRUD y asignación por miembro | ✅ Completo |
| **Authentication** | Login con JWT en cookie httpOnly, guard global en backend, middleware en frontend | ✅ Completo |
| **Prospects / Nuevos Ingresos** | Registro de visitantes desde admin desktop y PWA, flujo de integración como miembro, edición, historial de integrados y archivados | ✅ Completo |
| **PWA Equipo de Bienvenida** | App web progresiva (`grace-hub-welcome`) para registrar visitantes desde celular. Auth por código de equipo + identidad voluntaria. | ✅ Completo |
| **Performance Cache** | Cache TTL en memoria (module-level Map) para evitar fetches duplicados en SSR. Invalida por tags via `invalidateCacheByTag()`. Resuelve conflicto `force-dynamic` + cookie auth. | ✅ Completo |
| **Reports Export (PDF + Excel)** | Exportación de 6 reportes: Lista de Asistencia, Padrón de Grupo (GDI/Área), Directorio de Miembros, Historial de Asistencia, Resumen de Diezmos. PDF con estilo de marca, Excel (.xlsx). Librerías cargadas on-demand (0 impacto en bundle inicial). La exportación de miembros soporta "filtrados" y "todos" independientemente de la paginación. | ✅ Completo |

### ⏳ Propuesto — pendiente de implementación

| Feature | Descripción | Referencia |
|---------|-------------|-----------|
| **Fecha/hora de visita en Prospects** | Migrar `visit_date DATE` → `visit_at TIMESTAMPTZ` + FK opcional `meeting_series_id`. Permite saber a qué culto/reunión asistió el visitante. | [PROPOSAL-001](./proposals/PROPOSAL-001-visit-datetime-and-meeting-series.md) |

### ❌ No implementado / Baja prioridad

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| **Resources Section** | Recursos, artículos y anuncios en `/resources` | Baja |
| **Notifications** | Alertas y recordatorios | Baja |
| **DELETE /tithes/:id** | Eliminar registro de diezmo individual | Media |
| **GET /tithes?memberId=:id** | Ver historial de diezmos de un miembro | Media |
| **PUT /role-types/:id** | Editar nombre de etiqueta eclesiástica | Baja |

---

## Style Guidelines

### Colores

| Rol | Color | Hex |
|-----|-------|-----|
| Primary | Calming blue | `#2563eb` |
| Background | Light desaturated blue | `#E3F2FD` |
| Accent | Warm yellow | `#FFCA28` |

### Tipografía

- **Body & Headlines:** 'Inter' (sans-serif)
- Énfasis en legibilidad y estilo moderno

### Iconografía

- Iconos simples y claros de `lucide-react`
- Representación visual de secciones y acciones

### Layout

- Grid-based layout con espaciado consistente
- Apariencia profesional y organizada
- Diseño responsivo (mobile-first)

---

## Arquitectura Frontend

```
src/
├── app/                 # Páginas (Next.js App Router)
│   ├── (protected)/
│   │   └── actions/     # Server Actions
│   └── [route]/         # Páginas por ruta
├── components/
│   ├── ui/              # Componentes base (shadcn/ui)
│   └── [module]/        # Componentes por módulo
├── hooks/               # Custom hooks
└── lib/
    ├── api/             # Capa de API
    │   ├── endpoints/   # Llamadas HTTP
    │   ├── mappers/     # Transformación de datos
    │   └── services/    # Lógica de negocio
    └── utils/           # Utilidades
```

---

## Documentación Relacionada

| Documento | Ubicación |
|-----------|-----------|
| Arquitectura Frontend | [FRONTEND_ARCHITECTURE.md](./architecture/FRONTEND_ARCHITECTURE.md) |
| Reglas de Arquitectura | [ARCHITECTURE_RULES.md](./architecture/ARCHITECTURE_RULES.md) |
| Prompts para IA | [prompts.md](./prompts/prompts.md) |
| Reglas de Negocio | `/docs-grace-hub/REGLAS_DE_NEGOCIO.md` *(directorio raíz del proyecto, externo a este workspace)* |
| Schema de BD | `/docs-grace-hub/DATABASE_SCHEMA.md` *(directorio raíz del proyecto, externo a este workspace)* |
