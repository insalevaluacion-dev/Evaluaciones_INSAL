# Sistema de Evaluaciones INSAL

Plataforma web para la gestión y evaluación de proyectos académicos del Instituto Nacional San Luis (INSAL).

<p align="center">
  <img src="public/assets/svg/Logo_SV.svg" alt="Logo SV" width="120"/>
</p>

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Roles y flujos de trabajo](#roles-y-flujos-de-trabajo)
- [Funcionalidades](#funcionalidades)
- [Stack tecnológico](#stack-tecnológico)
- [Requisitos previos](#requisitos-previos)
- [Instalación y configuración](#instalación-y-configuración)
- [Ejecución](#ejecución)
- [Arquitectura de rutas (API)](#arquitectura-de-rutas-api)
- [Modelo de datos](#modelo-de-datos)
- [Autenticación y seguridad](#autenticación-y-seguridad)
- [Interfaz de usuario](#interfaz-de-usuario)
- [Credenciales por defecto](#credenciales-por-defecto)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Pruebas manuales](#pruebas-manuales)
- [Estado del proyecto](#estado-del-proyecto)
- [Contribución](#contribución)
- [Licencia](#licencia)

---

## Descripción general

El **Sistema de Evaluaciones INSAL** es una aplicación web que digitaliza y centraliza el proceso de evaluación de proyectos académicos. Permite a los docentes evaluadores registrar, puntuar y retroalimentar proyectos estudiantiles, mientras que el director y el personal administrativo gestionan grados, orientadores, criterios y rúbricas.

La plataforma separa dos flujos de trabajo principales, cada uno con su propio punto de acceso y conjunto de funcionalidades.

## Roles y flujos de trabajo

| Rol                               | Acceso                        | Funcionalidad principal                                            |
| --------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| Director / Administrador          | `/menu`                       | Gestión de maestros, orientadores, proyectos, criterios y rúbricas |
| Evaluador (invitado o registrado) | `/registrarse` a `/seleccion` | Registro, selección de proyecto y evaluación de estudiantes        |

### Control de acceso por rol

- **Director (rol_id = 1):** acceso total. Único rol con permisos para gestionar maestros y orientadores.
- **Administrador (rol_id = 2):** acceso total a la gestión de proyectos, grados, criterios y rúbricas.
- **Orientador:** acceso restringido únicamente a los grados a los que ha sido asignado y que se encuentran activos.

## Funcionalidades

### Director / Administrador

- **Gestión de maestros:** crear, editar y desactivar usuarios con roles (Director, Administrador, Orientador).
- **Asignación de orientadores:** vincular maestros a grados específicos por ciclo escolar.
- **CRUD de proyectos:** crear, consultar, actualizar y eliminar proyectos asociados a grados.
- **Rúbricas y criterios:** definir niveles de evaluación con criterios y ponderaciones personalizadas (1-100 %).
- **Gestión de estudiantes por proyecto:** asignar o remover estudiantes de un proyecto.
- **Reportes de evaluación:** consultar proyectos evaluados con su nota final o parcial, y el detalle por criterio.
- **Control de acceso por grado:** los orientadores solo ven los grados a los que están asignados.

### Evaluadores

- **Registro rápido:** ingreso con nombre y email, sin requerir cuenta previa.
- **Selección de proyecto:** elegir nivel, año, bachillerato y sección para visualizar proyectos disponibles.
- **Evaluación por criterios:** puntuar cada criterio con una escala definida; la nota final se calcula automáticamente mediante ponderación.
- **Control de asistencia:** registrar qué estudiantes asistieron a la presentación de su proyecto.
- **Resumen de evaluación:** visualizar la puntuación total y el detalle por criterio antes de confirmar.

## Stack tecnológico

| Capa                | Tecnología                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------- |
| Backend             | Node.js + Express 5                                                                               |
| Base de datos       | PostgreSQL (esquemas `principal` y `evaluaciones`)                                                |
| Motor de plantillas | EJS (Embedded JavaScript)                                                                         |
| Frontend            | HTML5, CSS3, JavaScript (ES6, módulos)                                                            |
| Autenticación       | Sesiones (`express-session`) + `bcrypt` para el hashing de contraseñas                            |
| UI                  | [Material Web](https://github.com/material-components/material-web) (componentes `@material/web`) |
| Desarrollo          | Nodemon (recarga automática)                                                                      |

### Dependencias

Las dependencias están definidas en `package.json`:

| Paquete           | Versión   |
| ----------------- | --------- |
| `bcrypt`          | `^6.0.0`  |
| `ejs`             | `^6.0.1`  |
| `express`         | `^5.2.1`  |
| `express-session` | `^1.19.0` |
| `pg`              | `^8.22.0` |

Dependencias de desarrollo:

| Paquete   | Versión   |
| --------- | --------- |
| `nodemon` | `^3.1.14` |

## Requisitos previos

- **Node.js** (v18+). El proyecto utiliza `process.loadEnvFile()` para cargar las variables de entorno, una función nativa de Node.js 18.
- **PostgreSQL** (v12+).
- **npm** o **yarn**.

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone https://github.com/tu-org/insal-evaluaciones.git
cd insal-evaluaciones
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto. El servidor lo carga automáticamente al iniciar.

```env
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=dbInsal
DB_USER=postgres
DB_PASSWORD=postgres

# Sesión
SESSION_SECRET=insal-secret-2026

# Puerto del servidor
PORT=3000
```

> **Nota:** si no se define `SESSION_SECRET`, se utiliza `insal-secret-2026` como valor por defecto. Para entornos de producción se recomienda usar un secreto único y seguro.

### 4. Importar la base de datos

El archivo `db/Principal y Evaluacion-railway-202608232153.sql` contiene el esquema y los datos iniciales de PostgreSQL.

```bash
psql -U postgres -d dbInsal -f "db/Principal y Evaluacion-railway-202608232153.sql"
```

> Los archivos `db/actualizar-nombres-niveles.sql` y `db/eliminar-rubrica-prueba.sql` son scripts auxiliares de migración/procedimientos y no forman parte de la instalación base.

## Ejecución

```bash
# Desarrollo (con recarga automática)
npm run dev

# Producción
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

Al iniciar, la aplicación se conecta a PostgreSQL y, si no existe ningún maestro registrado, crea automáticamente el usuario Director por defecto (ver [Credenciales por defecto](#credenciales-por-defecto)).

## Arquitectura de rutas (API)

### Vistas principales y páginas

| Método | Ruta             | Descripción                              |
| ------ | ---------------- | ---------------------------------------- |
| `GET`  | `/login`         | Página de inicio de sesión para docentes |
| `GET`  | `/registrarse`   | Registro como evaluador invitado         |
| `GET`  | `/dashboard`     | Página del evaluador                     |
| `GET`  | `/seleccion`     | Selección de nivel y proyecto            |
| `GET`  | `/evaluacion`    | Formulario de evaluación de proyecto     |
| `GET`  | `/resumen`       | Resumen de la evaluación del proyecto    |
| `GET`  | `/menu{/*splat}` | Dashboard administrativo (SPA)           |

### Vistas parciales del SPA (dashboard)

| Método | Ruta                          | Descripción                   |
| ------ | ----------------------------- | ----------------------------- |
| `GET`  | `/menu/inicio/html`           | Vista de inicio del panel     |
| `GET`  | `/menu/evaluaciones/html`     | Vista de evaluaciones         |
| `GET`  | `/menu/evaluaciones/:id/html` | Detalle de una evaluación     |
| `GET`  | `/menu/proyectos/html`        | Vista de proyectos            |
| `GET`  | `/menu/proyectos/:id/html`    | Vista de edición de proyecto  |
| `GET`  | `/menu/papelera/html`         | Vista de papelera             |
| `GET`  | `/menu/rubrica/html`          | Vista de criterios y rúbricas |
| `GET`  | `/menu/rubrica/:id/html`      | Vista de edición de rúbrica   |

### Autenticación

| Método | Ruta               | Descripción                                      |
| ------ | ------------------ | ------------------------------------------------ |
| `POST` | `/auth/login`      | Autenticación de maestro                         |
| `POST` | `/auth/logout`     | Cierre de sesión                                 |
| `GET`  | `/auth/me`         | Obtener usuario autenticado                      |
| `GET`  | `/admin/mi-perfil` | Obtener el perfil del maestro autenticado        |
| `PUT`  | `/admin/mi-perfil` | Actualizar nombre, email o contraseña del perfil |

### Flujo del evaluador

| Método | Ruta                                         | Descripción                                       |
| ------ | -------------------------------------------- | ------------------------------------------------- |
| `POST` | `/enviarEvaluador`                           | Registrar evaluador invitado                      |
| `POST` | `/guardar-nivel`                             | Guardar el nivel seleccionado                     |
| `GET`  | `/obtener-nivel`                             | Obtener el nivel seleccionado en sesión           |
| `GET`  | `/grados/anos/:numNivel`                     | Años escolares por nivel                          |
| `GET`  | `/grados/nombres/:numNivel/:ano`             | Bachilleratos por nivel y año                     |
| `GET`  | `/grados/secciones/:numNivel/:ano/:bachId`   | Secciones disponibles                             |
| `GET`  | `/proyectos/:numNivel/:ano/:bachId/:seccion` | Proyectos del grado (con menos de 3 evaluaciones) |
| `POST` | `/guardar-proyecto`                          | Seleccionar proyecto para evaluar                 |
| `GET`  | `/obtener-evaluador`                         | Obtener datos del evaluador en sesión             |
| `GET`  | `/criterios`                                 | Criterios del nivel seleccionado                  |
| `GET`  | `/estudiantes/:proyectoId`                   | Estudiantes pendientes de asistencia              |
| `POST` | `/guardar-asistencia`                        | Registrar asistencia                              |
| `POST` | `/guardar-evaluacion`                        | Guardar puntuaciones y calcular la nota           |

### Administración (Director / Administrador)

| Método   | Ruta                                                     | Descripción                                   |
| -------- | -------------------------------------------------------- | --------------------------------------------- |
| `GET`    | `/admin/grados`                                          | Lista de grados (filtrada por rol)            |
| `GET`    | `/admin/grados/:gradoId/estudiantes`                     | Estudiantes de un grado                       |
| `GET`    | `/admin/grados/:gradoId/proyectos`                       | Proyectos de un grado con conteos             |
| `GET`    | `/admin/evaluaciones/proyectos`                          | Proyectos evaluados (nota final y parciales)  |
| `GET`    | `/admin/evaluaciones/proyectos/:proyectoId/evaluaciones` | Detalle de evaluaciones de un proyecto        |
| `GET`    | `/admin/evaluaciones/grado/:gradoId`                     | Reporte de evaluaciones por grado             |
| `POST`   | `/admin/proyectos`                                       | Crear proyecto                                |
| `GET`    | `/admin/proyectos`                                       | Listar proyectos                              |
| `GET`    | `/admin/proyectos/:id`                                   | Obtener proyecto por ID                       |
| `PUT`    | `/admin/proyectos/:id`                                   | Actualizar proyecto                           |
| `DELETE` | `/admin/proyectos/:id`                                   | Eliminar proyecto (y datos relacionados)      |
| `GET`    | `/admin/proyectos/:proyectoId/estudiantes`               | Estudiantes asignados al proyecto             |
| `POST`   | `/admin/proyectos/:proyectoId/estudiantes`               | Asignar estudiantes al proyecto               |
| `DELETE` | `/admin/proyectos/:proyectoId/estudiantes/:estudianteId` | Remover estudiante del proyecto               |
| `GET`    | `/admin/maestros`                                        | Listar maestros (solo director)               |
| `POST`   | `/admin/maestros`                                        | Crear maestro (solo director)                 |
| `PUT`    | `/admin/maestros/:id`                                    | Actualizar maestro (solo director)            |
| `DELETE` | `/admin/maestros/:id`                                    | Desactivar maestro (solo director)            |
| `GET`    | `/admin/orientadores`                                    | Listar orientadores activos                   |
| `POST`   | `/admin/orientadores`                                    | Asignar orientador a un grado (solo director) |
| `DELETE` | `/admin/orientadores/:id`                                | Desactivar orientador (solo director)         |
| `GET`    | `/admin/niveles-evaluacion`                              | Listar niveles de evaluación                  |
| `POST`   | `/admin/niveles-evaluacion`                              | Crear nivel de evaluación                     |
| `PUT`    | `/admin/niveles-evaluacion/:id`                          | Actualizar nivel de evaluación                |
| `DELETE` | `/admin/niveles-evaluacion/:id`                          | Eliminar nivel de evaluación                  |
| `GET`    | `/admin/niveles/:id`                                     | Obtener una rúbrica por ID                    |
| `GET`    | `/admin/niveles/:id/criterios`                           | Listar criterios de una rúbrica               |
| `POST`   | `/admin/niveles/:id/criterios`                           | Crear criterio dentro de una rúbrica          |
| `PUT`    | `/admin/criterios/:id`                                   | Editar un criterio                            |
| `DELETE` | `/admin/criterios/:id`                                   | Eliminar un criterio                          |
| `GET`    | `/admin/roles`                                           | Catálogo de roles                             |
| `GET`    | `/admin/bachilleratos`                                   | Catálogo de bachilleratos                     |
| `GET`    | `/admin/turnos`                                          | Catálogo de turnos                            |

Cualquier ruta no definida es manejada por una ruta comodín (`GET /{*splat}`) que redirige al panel si hay sesión activa o a `/login` en caso contrario.

## Modelo de datos

La base de datos se organiza en dos esquemas PostgreSQL.

### Esquema `principal`

| Tabla          | Descripción                                                                 |
| -------------- | --------------------------------------------------------------------------- |
| `maestros`     | Usuarios del sistema (directores, administradores, orientadores)            |
| `roles`        | Tipos de rol (Director, Administrador, Orientador)                          |
| `grados`       | Grados escolares (combinación de nivel, bachillerato, sección, turno y año) |
| `estudiantes`  | Alumnos registrados                                                         |
| `orientadores` | Relación maestro-grado con año escolar                                      |

### Esquema `evaluaciones`

| Tabla                  | Descripción                                         |
| ---------------------- | --------------------------------------------------- |
| `proyectos`            | Proyectos académicos a evaluar                      |
| `niveles`              | Niveles / rúbricas de evaluación                    |
| `criterios`            | Criterios con ponderación por nivel                 |
| `evaluadores`          | Evaluadores invitados                               |
| `estudiantes`          | Tabla intermedia: estudiantes asignados a proyectos |
| `evaluaciones`         | Registro de evaluaciones (nota final)               |
| `evaluacion_criterios` | Detalle de puntuaciones por criterio                |

### Cálculo de notas

- Cada criterio tiene una ponderación (1-100 %).
- La nota de cada evaluación se calcula como el promedio ponderado de las puntuaciones de sus criterios, con un máximo de 10.
- Cuando un proyecto acumula 3 evaluaciones, la nota final del proyecto se calcula como el promedio de las tres notas y se guarda en `proyectos.nota`.

## Autenticación y seguridad

- **Sesiones:** `express-session` con cookie `httpOnly`. La sesión expira a las 8 horas (`maxAge`).
- **Hashing de contraseñas:** `bcrypt` con factor de coste 10.
- **Protección de rutas:** middleware `requireAuth` (requiere sesión de maestro) y `requireDirector` (restringe a rol Director).
- **Acceso por grado:** `canAccessGrade` verifica que el maestro (cuando no es Director/Administrador) esté asignado como orientador activo del grado.
- **Prevención de subidas duplicadas:** middleware `evitarSubmitDuplicado` bloquea solicitudes repetidas (doble clic) con código de respuesta `429`.

## Interfaz de usuario

### Características visuales

- **Diseño responsive:** adaptado a dispositivos móviles y de escritorio.
- **Material Design:** componentes de la librería Material Web.
- **Animaciones CSS:** transiciones suaves con efecto ripple.
- **Temas personalizables:** soporte para modo claro/oscuro.
- **Indicadores de progreso:** barras circulares y lineales para estados de carga.
- **Diálogos modales:** confirmaciones y formularios emergentes.
- **Notificaciones:** alertas y avisos dentro de la aplicación.

### SPA en el dashboard

El panel de administración (`/menu`) es una **Single Page Application** que carga vistas parciales vía `fetch` e intercambio de HTML, manejada por un router personalizado en `public/js/router.js`.

## Credenciales por defecto

| Usuario    | Contraseña  | Rol                   |
| ---------- | ----------- | --------------------- |
| `Director` | `1NS4L2026` | Director (rol_id = 1) |

> El usuario `Director` se crea automáticamente al inicializar la aplicación si no existe ningún maestro registrado en la base de datos.

> **Recomendación:** en entornos de producción, cambia la contraseña por defecto de los usuarios creados antes de su puesta en marcha.

## Estructura del proyecto

```
insal-evaluaciones/
├── app.js                          # Servidor Express + API REST
├── package.json
├── TO-DO.md
├── README.md                       # Este archivo
├── db/
│   ├── Principal y Evaluacion-railway-202608232153.sql  # Esquema y datos de PostgreSQL
│   ├── actualizar-nombres-niveles.sql                   # Script auxiliar de migración
│   └── eliminar-rubrica-prueba.sql                      # Script auxiliar de procedimiento
├── views/                          # Plantillas EJS
│   ├── login.ejs
│   ├── menu.ejs
│   ├── registrarse.ejs
│   ├── seleccion.ejs
│   ├── evaluacion.ejs
│   ├── resumen.ejs
│   └── partials/                   # Componentes SPA
│       ├── inicio.ejs
│       ├── evaluaciones.ejs
│       ├── evaluacion-detalle.ejs
│       ├── papelera.ejs
│       ├── proyecto-editar.ejs
│       ├── proyectos.ejs
│       ├── rubrica.ejs
│       └── rubrica-editar.ejs
└── public/
    ├── css/                        # Estilos modulares
    ├── js/                         # Scripts frontend (módulos ES6)
    │   ├── router.js               # Enrutador SPA
    │   ├── login.js
    │   ├── proyectos.js
    │   ├── evaluacion.js
    │   ├── criterios-rubrica.js
    │   └── ...                     # Otros módulos por vista
    ├── html/
    │   └── index.html
    └── assets/
        ├── img/
        └── svg/
```

## Pruebas manuales

Para probar las consultas de inserción, modificación y eliminación del panel administrativo:

1. **Inicia sesión** como director (`Director` / `1NS4L2026`).
2. Navega a `/menu/proyectos` para gestionar proyectos.
3. Crea un nuevo proyecto y verifica que aparezca en la lista.
4. Edita el proyecto y confirma los cambios.
5. Elimina el proyecto y verifica que desaparezca de la lista.
6. Repite el proceso para criterios y rúbricas en `/menu/rubrica`.

Para probar el flujo del evaluador:

1. Accede a `/registrarse` e ingresa nombre y email.
2. Selecciona nivel, año, bachillerato y sección en `/seleccion`.
3. Elige un proyecto disponible y evalúa cada criterio.
4. Registra la asistencia de los estudiantes y confirma la evaluación.
5. Verifica el resumen en `/resumen` y que el proyecto quede registrado en el panel administrativo.

## Estado del proyecto

### Completado

- Autenticación y sesiones de usuario.
- Registro de evaluadores invitados.
- Navegación y selección de proyectos.
- Sistema de evaluación con criterios y ponderaciones.
- Cálculo automático de notas (promedio de 3 evaluaciones).
- Gestión completa de proyectos (CRUD).
- Gestión de maestros y orientadores.
- Catálogo de niveles, criterios, roles, bachilleratos y turnos.
- Reportes de evaluación y detalle por criterio.

### Pendiente (TO-DO)

Consulta el archivo [TO-DO.md](./TO-DO.md) para la lista completa de tareas pendientes:

1. Actualizar consultas para insertar, modificar y eliminar evaluaciones.
2. Agregar espacio de creación, edición y eliminación de proyectos con dos tipos:
   - Feria de Logros
   - Expotecnia
3. Pruebas de funcionamiento del sistema completo.

## Contribución

1. Haz un _fork_ del repositorio.
2. Crea una rama para tu cambio (`git checkout -b feature/mi-cambio`).
3. Realiza los cambios y comprueba que la aplicación funciona correctamente.
4. Envía una _pull request_ describiendo el cambio y su alcance.

## Licencia

Desarrollado para el **Instituto Nacional San Luis**. Uso interno institucional.
