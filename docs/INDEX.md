# Grace Hub Frontend - Documentación

> **Última actualización:** 2026-04-18

## Índice

### Cambios Recientes
- [CHANGELOG.md](./CHANGELOG.md) - Registro de cambios y correcciones

### Producto
- [blueprint.md](./blueprint.md) - Visión del producto, features y estilo

### Arquitectura
- [FRONTEND_ARCHITECTURE.md](./architecture/FRONTEND_ARCHITECTURE.md) - Arquitectura completa del frontend
- [ARCHITECTURE_RULES.md](./architecture/ARCHITECTURE_RULES.md) - Reglas por capa

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

| Ruta | Página | Estado | Notas UX |
|------|--------|--------|----------|
| `/` | Dashboard | ✅ Completa | Gráficos de asistencia |
| `/members` | Directorio de Miembros | ✅ Completa | Paginación, filtros |
| `/members/bulk-add` | Agregar Múltiples | ✅ Completa | Staging flow, edición antes de guardar, breadcrumb |
| `/members/settings/role-types` | Administración de Etiquetas Eclesiásticas | ✅ Completa | CRUD de `role_types` |
| `/events` | Gestión de Eventos | ✅ Completa | |
| `/events/[meetingId]/attendance` | Tomar Asistencia | ✅ Completa | |
| `/groups` | Gestión de Grupos | ✅ Completa | |
| `/groups/gdis/[gdiId]/admin` | Admin GDI | ✅ Completa | |
| `/groups/ministry-areas/[areaId]/admin` | Admin Área | ✅ Completa | |
| `/tithes` | Tracker de Diezmos | ✅ Completa | KPIs con color, filtros avanzados, menús contextuales |
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
