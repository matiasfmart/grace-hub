
# Grace Hub - Gestión Integral para Comunidades Eclesiales

Bienvenido a Grace Hub, una aplicación web diseñada para facilitar la administración y conexión dentro de las comunidades eclesiales. Construida con tecnologías modernas, Grace Hub busca ofrecer una plataforma intuitiva y eficiente para miembros, líderes y administradores.

## Propósito

Grace Hub tiene como objetivo principal centralizar y simplificar las diversas actividades y la gestión de información de una iglesia, permitiendo:

*   Una comunicación más fluida entre los miembros.
*   Una organización eficiente de grupos, ministerios y eventos.
*   Un seguimiento detallado de la participación y el crecimiento de la comunidad.

## Características Principales

La aplicación se organiza en varias secciones clave:

### 1. Dashboard (Inicio)
Página principal que ofrece una visión general de la actividad y participación de la iglesia a través de diversos gráficos y tablas:
*   Gráfico de línea de las asistencias generales del último mes.
*   Gráfico de línea de asistencia a GDIs.
*   Gráfico de barras de asistencias vs. inasistencias del último mes.
*   Gráfico de pastel de distribución de roles de miembros (Líderes, Obreros, Otros).
*   Tabla de miembros ausentes en reuniones generales recientes.

### 2. Miembros (Members)
*   **Directorio de Miembros**: Visualiza, busca y filtra la lista de todos los miembros de la iglesia. Permite filtrar por estado, rol (incluyendo "Sin Rol Asignado") y guía de GDI (incluyendo "No Asignado a GDI"). Muestra el total de miembros filtrados y el total absoluto de miembros.
*   **Agregar Miembros**: Permite añadir nuevos miembros individualmente o mediante una herramienta de carga masiva. El campo email es opcional.
*   **Detalles del Miembro**: Muestra información completa de cada miembro, incluyendo datos de contacto, fechas importantes (nacimiento, ingreso, bautismo), estado, roles, GDI y áreas de ministerio asignadas. Incluye una pestaña de "Historial de Asistencia" con filtros por serie y rango de fechas, mostrando un resumen y una tendencia mensual de asistencia del miembro a las reuniones a las que fue convocado. Permite imprimir el historial de asistencia.
*   **Edición de Miembros**: Facilita la actualización de la información de los miembros.
*   **Gestión de Roles**: Los roles (Asistente General, Obrero, Líder, Mentor) se calculan y asignan automáticamente basados en la participación en GDIs y Áreas:
    *   **Guía de GDI**: Asignado en formulario de GDI
    *   **Líder de Área**: Asignado en formulario de Área
    *   **Mentor**: Asignado en formulario de GDI o Área
    *   **Obrero**: Cualquier Guía, Líder, Integrante de Área, o Mentor

### 3. Grupos (Groups)
Esta sección permite administrar dos tipos principales de agrupaciones:
*   **Áreas de Ministerio (Ministry Areas)**:
    *   Crea y gestiona áreas de servicio o ministerio (ej. Alabanza, Jóvenes, Misiones).
    *   Desde la página principal de "Grupos", se pueden agregar o eliminar áreas.
    *   **Página de Administración del Área (`/groups/ministry-areas/[areaId]/admin`)**:
        *   **Detalles del Área**: Edita el nombre, descripción, líder, mentor y miembros del área.
        *   **Gestión de Reuniones del Área**:
            *   Define series de reuniones específicas para el área (recurrentes o de única vez).
            *   Programa instancias adicionales para las series del área.
            *   Gestiona (edita/elimina) las series e instancias de reunión del área.
            *   Visualiza la asistencia a las reuniones del área mediante una tabla y un gráfico de progresión.
            *   Registra la asistencia y toma minutas para las instancias de reunión del área (navegando a la página de gestión de asistencia de la instancia).
*   **GDIs (Grupos de Integración)**:
    *   Crea y gestiona grupos pequeños de integración y discipulado.
    *   Desde la página principal de "Grupos", se pueden agregar o eliminar GDIs.
    *   **Página de Administración del GDI (`/groups/gdis/[gdiId]/admin`)**:
        *   **Detalles del GDI**: Edita el nombre, guía, mentor y miembros del GDI.
        *   **Gestión de Reuniones del GDI**:
            *   Define series de reuniones específicas para el GDI (recurrentes o de única vez).
            *   Programa instancias adicionales para las series del GDI.
            *   Gestiona (edita/elimina) las series e instancias de reunión del GDI.
            *   Visualiza la asistencia a las reuniones del GDI mediante una tabla y un gráfico de progresión.
            *   Registra la asistencia y toma minutas para las instancias de reunión del GDI (navegando a la página de gestión de asistencia de la instancia).

### 4. Eventos (Events)
Esta sección está dedicada a la gestión de **reuniones generales** de la iglesia (no específicas de un GDI o Área Ministerial).
*   **Definición de Series de Reuniones Generales**: Permite crear "tipos" o series de reuniones recurrentes (ej. Servicio Dominical General, Estudio Bíblico Semanal General) o de única vez.
    *   Configura nombre, descripción, hora, lugar e imagen predeterminados.
    *   Define la frecuencia (Única Vez, Semanal, Mensual) y las reglas de recurrencia.
    *   Especifica los grupos de asistentes objetivo (Asistentes Generales, Obreros, Líderes).
*   **Generación de Instancias (Justo a Tiempo)**: Las instancias se generan automáticamente para series recurrentes (un buffer de 4 futuras para semanales, 2 para mensuales) cuando se accede a la información de la serie. Si un usuario elimina manualmente una instancia recurrente, esta *no* se regenerará automáticamente para esa fecha específica (se registra como "cancelada" para la serie).
*   **Gestión de Instancias de Reunión General**:
    *   Visualiza todas las instancias de reunión programadas, filtrables por serie y rango de fechas.
    *   Agrega instancias ocasionales a una serie existente.
    *   La edición o eliminación de instancias individuales se realiza a través de la página de gestión de asistencia de dicha instancia.
*   **Registro de Asistencia y Minutas (para Instancias Generales)**:
    *   Desde la página de gestión de asistencia de una instancia (`/events/[meetingId]/attendance`):
        *   Permite marcar la asistencia de los miembros esperados.
        *   Guarda un historial de asistencia.
        *   Permite registrar y guardar minutas para la reunión.
        *   Permite editar o eliminar la instancia.

### 5. Acerca de (About)
Proporciona información sobre la misión, visión y valores detrás de Grace Hub.

## Tecnologías Utilizadas

*   **Frontend**: Next.js 15 (con App Router), React 18, TypeScript.
*   **UI**: ShadCN UI Components, Tailwind CSS.
*   **Gestión de Estado (Cliente)**: React Hooks (`useState`, `useEffect`, `useContext`), `useRouter`, `useSearchParams`.
*   **Backend**: NestJS 10 + TypeORM 0.3.20 + PostgreSQL (Neon Cloud)
*   **Comunicación**: REST API via fetch wrapper

## Cómo Empezar

### Prerrequisitos

*   Node.js (versión 18.x o superior recomendada)
*   npm o yarn

### Instalación

1.  Clona este repositorio:
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd <NOMBRE_DEL_DIRECTORIO>
    ```

2.  Instala las dependencias:
    ```bash
    npm install
    # o
    # yarn install
    ```

### Ejecutar la Aplicación

1.  Para iniciar el servidor de desarrollo de Next.js:
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:9002` (o el puerto que se indique).

2.  (Opcional) Si se utilizan funcionalidades de Genkit para IA, se puede iniciar el servidor de desarrollo de Genkit:
    ```bash
    npm run genkit:dev
    # o para auto-recarga
    # npm run genkit:watch
    ```

### Scripts Disponibles

*   `npm run dev`: Inicia la aplicación en modo de desarrollo.
*   `npm run build`: Compila la aplicación para producción.
*   `npm run start`: Inicia la aplicación en modo de producción (después de `build`).
*   `npm run lint`: Ejecuta el linter de Next.js.
*   `npm run typecheck`: Verifica los tipos de TypeScript.

## Estructura del Proyecto (Simplificada)

*   `src/app/`: Contiene las rutas y páginas principales de la aplicación (usando Next.js App Router).
    *   `src/app/members/`: Páginas para el directorio y carga masiva de miembros.
    *   `src/app/groups/`: Página principal de grupos y subdirectorios para administración específica:
        *   `src/app/groups/gdis/[gdiId]/admin/`: Página de administración para un GDI específico (detalles y reuniones del GDI).
            *   `actions.ts`: Server Actions para GDI (detalles, series de reuniones, instancias).
        *   `src/app/groups/ministry-areas/[areaId]/admin/`: Página de administración para un Área Ministerial específica (detalles y reuniones del Área).
            *   `actions.ts`: Server Actions para Área Ministerial (detalles, series de reuniones, instancias).
    *   `src/app/events/`: Página principal para reuniones generales y subdirectorios para gestión de asistencia de instancias.
*   `src/components/`: Componentes reutilizables de React.
    *   `src/components/ui/`: Componentes de UI de ShadCN.
    *   `src/components/layout/`: Componentes de la estructura principal (Header, Footer).
    *   Subdirectorios para componentes específicos: `members`, `groups`, `events`, `dashboard`.
*   `src/lib/`: Lógica de negocio, tipos, utilidades y capa de API.
    *   `types.ts`: Definiciones de tipos e interfaces TypeScript, y esquemas Zod para validación.
    *   `api/`: Capa de comunicación con el backend NestJS.
        *   `client.ts`: Wrapper de fetch con manejo de errores.
        *   `endpoints/`: Definiciones de llamadas HTTP por entidad.
        *   `mappers/`: Transformación de datos API ↔ Frontend.
        *   `services/`: Orquestación y lógica de negocio frontend.
    *   `roleUtils.ts`: Lógica para calcular roles de miembros.
*   `src/services/`: Funciones de "servicio" que interactúan con los archivos JSON.
    *   `memberService.ts`: Lógica para miembros.
    *   `gdiService.ts`: Lógica para GDIs.
    *   `ministryAreaService.ts`: Lógica para Áreas Ministeriales.
    *   `meetingService.ts`: Lógica principal para series de reuniones e instancias (usado por Eventos generales y por `groupMeetingService`). Incluye la lógica de `ensureFutureInstances` y el manejo de `cancelledDates`.
    *   `attendanceService.ts`: Lógica para registros de asistencia.
    *   `groupMeetingService.ts`: Lógica para gestionar series de reuniones e instancias específicas de GDIs y Áreas Ministeriales, utilizando y adaptando `meetingService`.
*   `src/ai/`: (Opcional) Configuración y flujos de Genkit para funcionalidades de IA.
*   `public/`: Archivos estáticos.

## Próximos Pasos y Mejoras Potenciales

*   Integración con una base de datos real (Firebase Firestore, PostgreSQL, etc.) para una mejor escalabilidad y gestión de datos.
*   Autenticación y autorización de usuarios.
*   Notificaciones en tiempo real.
*   Mejoras en la interfaz de usuario y experiencia de usuario (UX/UI).
*   Funcionalidades de IA más avanzadas con Genkit (ej. sugerencias inteligentes, análisis de participación).
*   Despliegue en una plataforma de hosting (Firebase App Hosting, Vercel, etc.).

¡Gracias por explorar Grace Hub!
