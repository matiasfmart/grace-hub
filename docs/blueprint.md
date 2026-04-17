# Grace Hub - Product Blueprint

> **Última actualización:** 2026-04-16

## Visión del Producto

Grace Hub es un sistema de gestión de membresía y asistencia para iglesias, diseñado para facilitar el seguimiento de miembros, grupos de integración (GDIs), áreas ministeriales, reuniones y diezmos.

---

## Core Features

### ✅ Implementado

| Feature | Descripción | Estado |
|---------|-------------|--------|
| **Member Directory** | Directorio de miembros con búsqueda, filtros y paginación | ✅ Completo |
| **Groups Management** | Gestión de GDIs y Áreas Ministeriales con asignación de miembros | ✅ Completo |
| **Mentor Assignment** | Asignación de Mentores a GDIs/Áreas via formulario | ✅ Completo |
| **Meeting Series** | Definición de series de reuniones con recurrencia configurable | ✅ Completo |
| **Attendance Tracking** | Registro de asistencia por reunión con asistentes esperados | ✅ Completo |
| **Tithe Tracking** | Seguimiento mensual de diezmos por miembro | ✅ Completo |
| **Dashboard** | Vista general con gráficos de asistencia y distribución | ✅ Completo |

### ❌ No Implementado

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| **Authentication** | Login de usuarios y control de acceso | Alta |
| **Resources Section** | Recursos, artículos y anuncios | Baja |
| **Notifications** | Alertas y recordatorios | Baja |
| **Reports Export** | Exportación a Excel/PDF | Media |

---

## Style Guidelines

### Colores

| Rol | Color | Hex |
|-----|-------|-----|
| Primary | Calming blue | `#64B5F6` |
| Background | Light desaturated blue | `#E3F2FD` |
| Accent | Warm yellow | `#FFCA28` |

### Tipografía

- **Body & Headlines:** 'PT Sans' (sans-serif)
- Énfasis en legibilidad y estilo moderno

### Iconografía

- Iconos simples y claros de React Icons
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
│   ├── actions/         # Server Actions
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
| Reglas de Negocio | [/docs-grace-hub/REGLAS_DE_NEGOCIO.md](../../docs-grace-hub/REGLAS_DE_NEGOCIO.md) |
| Schema de BD | [/docs-grace-hub/DATABASE_SCHEMA.md](../../docs-grace-hub/DATABASE_SCHEMA.md) |
