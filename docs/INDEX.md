# Grace Hub Frontend - Documentación

> **Última actualización:** 2026-06-14

## Índice

### Cambios Recientes
- [CHANGELOG.md](./CHANGELOG.md) - Registro de cambios y correcciones

### Producto
- [blueprint.md](./blueprint.md) - Visión del producto, features y estilo

### Arquitectura
- [FRONTEND_ARCHITECTURE.md](./architecture/FRONTEND_ARCHITECTURE.md) - Arquitectura completa del frontend (incluye sección de autenticación)
- [ARCHITECTURE_RULES.md](./architecture/ARCHITECTURE_RULES.md) - Reglas por capa

### Propuestas
- [PROPOSAL-001 — Fecha/hora de visita + serie de reunión en Prospectos](./proposals/PROPOSAL-001-visit-datetime-and-meeting-series.md) — **⏳ Pendiente de implementación.** Migración `visit_date DATE` → `visit_at TIMESTAMPTZ` + FK opcional `meeting_series_id`

### Implementación
- [PRINT_EXPORT_IMPLEMENTATION.md](./PRINT_EXPORT_IMPLEMENTATION.md) — Plan y estado de implementación del sistema de exportación PDF/Excel (✅ implementado)

### Prompts
- [prompts.md](./prompts/prompts.md) - Prompts para desarrollo con IA

---

## Documentación Centralizada

Para documentación funcional y de negocio, ver:

| Documento | Ubicación |
|-----------|-----------|
| Reglas de Negocio | [/docs-grace-hub/REGLAS_DE_NEGOCIO.md](../../docs-grace-hub/REGLAS_DE_NEGOCIO.md) |
| Schema de BD | [/docs-grace-hub/DATABASE_SCHEMA.md](../../docs-grace-hub/DATABASE_SCHEMA.md) |
| Estado del Sistema | [/docs-grace-hub/SYSTEM_STATUS.md](../../docs-grace-hub/SYSTEM_STATUS.md) |
| Casos de Uso | [/docs-grace-hub/casos-de-uso/](../../docs-grace-hub/casos-de-uso/) |

---

## Vistas Implementadas

| Ruta | Página | Estado | Notas |
|------|--------|--------|-------|
| `/` | Dashboard | ✅ Completa | Gráficos de asistencia y distribución |
| `/login` | Login | ✅ Completa | Sin sidebar, cookie httpOnly |
| `/members` | Directorio de Miembros | ✅ Completa | Paginación, filtros, KPIs, exportar PDF/Excel (filtrados + todos) |
| `/members/bulk-add` | Agregar Múltiples | ✅ Completa | Staging flow, edición antes de guardar, breadcrumb |
| `/members/settings/role-types` | Administración de Etiquetas Eclesiásticas | ✅ Completa | CRUD de `role_types` |
| `/events` | Gestión de Eventos | ✅ Completa | |
| `/events/[meetingId]/attendance` | Tomar Asistencia | ✅ Completa | Exportar lista PDF/Excel |
| `/groups` | Gestión de Grupos | ✅ Completa | |
| `/groups/gdis/[gdiId]/admin` | Admin GDI | ✅ Completa | Exportar padrón + historial de asistencia PDF/Excel |
| `/groups/ministry-areas/[areaId]/admin` | Admin Área | ✅ Completa | Exportar padrón + historial de asistencia PDF/Excel |
| `/tithes` | Tracker de Diezmos | ✅ Completa | KPIs con color, filtros avanzados, exportar resumen PDF/Excel |
| `/members` (tab Nuevos Ingresos) | Gestión de Prospects | ✅ Completa | 3 subtabs: Pendientes / Integrados / Archivados |
| `/resources` | Recursos | 🚧 Placeholder | |
| `/about` | About | ⚪ Estática | |

---

## Estructura de Carpetas

```
src/
├── app/                    # Páginas (Next.js App Router)
├── components/
│   ├── dashboard/          # Componentes de dashboard
│   ├── events/             # Componentes de reuniones
│   ├── groups/             # Componentes de grupos
│   ├── members/            # Componentes de miembros
│   ├── prospects/          # Componentes de nuevos ingresos (prospects)
│   ├── tithes/             # Componentes de diezmos
│   └── ui/                 # Componentes base (shadcn/ui)
├── hooks/                  # Custom hooks
└── lib/
    ├── api/
    │   ├── endpoints/      # Llamadas HTTP al backend
    │   ├── mappers/        # Transformación de tipos
    │   └── services/       # Lógica de negocio frontend
    └── utils/              # Utilidades
```

---

## Componentes UI (shadcn/ui)

Componentes de shadcn/ui instalados:

- `button`, `card`, `dialog`, `input`, `label`, `select`
- `table`, `tabs`, `tooltip`, `avatar`, `badge`
- `popover`, `dropdown-menu`, `command` (para combobox)
- `alert-dialog` - Para confirmaciones destructivas
- `collapsible` - Para secciones colapsables
- `calendar`, `date-picker` - Para selección de fechas
- `radio-group` - Para selector de tipo de audiencia en forms
