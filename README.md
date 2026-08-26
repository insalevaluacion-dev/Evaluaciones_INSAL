# Sistema de Evaluaciones INSAL

> **Plataforma web para la gestión y evaluación de proyectos académicos del Instituto Nacional San Luis.**

---

## 📸 Captura

![Login](public/assets/svg/Logo_SV.svg)

---

## 🧩 Descripción

El **Sistema de Evaluaciones INSAL** es una aplicación web diseñada para digitalizar y gestionar el proceso de evaluación de proyectos académicos en el Instituto Nacional San Luis (INSAL). Permite a los docentes evaluadores registrar, puntuar y retroalimentar proyectos estudiantiles, mientras que el director y el personal administrativo gestionan grados, orientadores, criterios y rúbricas.

La plataforma separa claramente dos flujos de trabajo:

| Rol                                   | Acceso                        | Funcionalidad principal                                            |
| ------------------------------------- | ----------------------------- | ------------------------------------------------------------------ |
| **Director / Administrador**          | `/menu`                       | Gestión de maestros, orientadores, proyectos, criterios y rúbricas |
| **Evaluador (invitado o registrado)** | `/registrarse` → `/seleccion` | Registro, selección de proyecto y evaluación de estudiantes        |

---

## ✨ Características principales

### Para el Director / Administrador

- **Gestión de maestros** — Crear, editar, desactivar usuarios con roles (Director, Administrador, Orientador).
- **Asignación de orientadores** — Vincular maestros a grados específicos por ciclo escolar.
- **CRUD de proyectos** — Crear, leer, actualizar y eliminar proyectos asociados a grados.
- **Rúbricas y criterios** — Definir niveles de evaluación con criterios y ponderaciones personalizadas (1–100%).
- **Control de acceso por grado** — Los orientadores solo ven los grados a los que están asignados.

### Para los Evaluadores

- **Registro rápido** — Ingresar con nombre y email sin necesidad de cuenta previa.
- **Selección de proyecto** — Elegir nivel, año, bachillerato y sección para visualizar proyectos disponibles.
- **Evaluación por criterios** — Puntuar cada criterio con una escala definida; la nota final se calcula automáticamente con ponderación.
- **Control de asistencia** — Registrar qué estudiantes asistieron al presentar su proyecto.
- **Resumen de evaluación** — Visualizar la puntuación total y el detalle por criterio antes de confirmar.

---

## 🛠️ Tecnologías

| Capa                 | Tecnología                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| **Backend**          | Node.js + Express 5                                                                               |
| **Base de datos**    | PostgreSQL (esquemas `principal` y `evaluaciones`)                                                |
| **Motor de plantas** | EJS (Embedded JavaScript)                                                                         |
| **Frontend**         | HTML5, CSS3, JavaScript (ES6 módulos)                                                             |
| **Auth**             | Sessions (`express-session`) + `bcrypt` para hashing de contraseñas                               |
| **UI**               | [Material Web](https://github.com/material-components/material-web) (componentes `@material/web`) |
| **Desarrollo**       | Nodemon (recarga automática)                                                                      |

### Dependencias

```json
{
  "bcrypt": "^6.0.0",
  "ejs": "^6.0.1",
  "express": "^5.2.1",
  "express-session": "^1.19.0",
  "pg": "^8.22.0"
}
```

---

## 🚀 Instalación y ejecución

### Prerrequisitos

- **Node.js** (v18+)
- **PostgreSQL** (v12+)
- **npm** o **yarn**

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

Crea un archivo `.env` en la raíz del proyecto:

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

### 4. Importar la base de datos

```bash
psql -U postgres -d dbInsal -f "db/Principal y Evaluacion-railway-202608232153.sql"
```

### 5. Iniciar el servidor

```bash
# Desarrollo (con recarga automática)
npm run dev

# Producción
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🗺️ Arquitectura de rutas

### Autenticación

| Método | Ruta           | Descripción                              |
| ------ | -------------- | ---------------------------------------- |
| `GET`  | `/login`       | Página de inicio de sesión para docentes |
| `GET`  | `/registrarse` | Registro como evaluador invitado         |
| `POST` | `/auth/login`  | Autenticación de maestro                 |
| `POST` | `/auth/logout` | Cierre de sesión                         |
| `GET`  | `/auth/me`     | Ver usuario autenticado                  |

### Flujo del Evaluador

| Método | Ruta                                         | Descripción                       |
| ------ | -------------------------------------------- | --------------------------------- |
| `POST` | `/enviarEvaluador`                           | Registrar evaluador invitado      |
| `POST` | `/guardar-nivel`                             | Guardar nivel seleccionado        |
| `GET`  | `/grados/anos/:numNivel`                     | Años escolares por nivel          |
| `GET`  | `/grados/nombres/:numNivel/:ano`             | Bachilleratos por nivel y año     |
| `GET`  | `/grados/secciones/:numNivel/:ano/:bachId`   | Secciones disponibles             |
| `GET`  | `/proyectos/:numNivel/:ano/:bachId/:seccion` | Proyectos del grado               |
| `POST` | `/guardar-proyecto`                          | Seleccionar proyecto para evaluar |
| `GET`  | `/criterios`                                 | Criterios del nivel seleccionado  |
| `GET`  | `/estudiantes/:proyectoId`                   | Estudiantes pendientes            |
| `POST` | `/guardar-asistencia`                        | Registrar asistencia              |
| `POST` | `/guardar-evaluacion`                        | Guardar puntuaciones              |

### Administración (Director/Admin)

| Método                | Ruta                                      | Descripción                        |
| --------------------- | ----------------------------------------- | ---------------------------------- |
| `GET`                 | `/admin/grados`                           | Lista de grados (filtrada por rol) |
| `GET`                 | `/admin/grados/:id/estudiantes`           | Estudiantes de un grado            |
| `GET`                 | `/admin/grados/:id/proyectos`             | Proyectos de un grado              |
| `GET/POST`            | `/admin/proyectos`                        | Listar y crear proyectos           |
| `GET/PUT/DELETE`      | `/admin/proyectos/:id`                    | Operaciones CRUD de proyecto       |
| `GET/POST`            | `/admin/proyectos/:id/estudiantes`        | Gestionar estudiantes en proyecto  |
| `DELETE`              | `/admin/proyectos/:id/estudiantes/:estId` | Remover estudiante                 |
| `GET/POST/PUT/DELETE` | `/admin/maestros`                         | CRUD de maestros (Director solo)   |
| `GET/POST/DELETE`     | `/admin/orientadores`                     | Asignar/desactivar orientadores    |
| `GET/POST/PUT/DELETE` | `/admin/niveles-evaluacion`               | CRUD de niveles/rúbricas           |
| `GET/POST/PUT/DELETE` | `/admin/criterios/:id`                    | CRUD de criterios                  |
| `GET`                 | `/admin/roles`                            | Catálogo de roles                  |
| `GET`                 | `/admin/bachilleratos`                    | Catálogo de bachilleratos          |
| `GET`                 | `/admin/turnos`                           | Catálogo de turnos                 |

---

## 🗄️ Modelo de datos

### Esquema `principal`

- **`maestros`** — Usuarios del sistema (directores, admins, orientadores)
- **`roles`** — Tipos de rol (Director, Administrador, Orientador)
- **`grados`** — Grados escolares (acombinación de nivel, bachillerato, sección, turno y año)
- **`estudiantes`** — Alumnos registrados
- **`orientadores`** — Relación maestro-grado con año escolar

### Esquema `evaluaciones`

- **`proyectos`** — Proyectos académicos a evaluar
- **`niveles`** — Niveles/Rúbricas de evaluación
- **`criterios`** — Criterios con ponderación por nivel
- **`evaluadores`** — Evaluadores invitados
- **`estudiantes`** (table intermedia) — Estudiantes asignados a proyectos
- **`evaluaciones`** — Registro de evaluaciones (nota final)
- **`evaluacion_criterios`** — Detalle de puntuaciones por criterio

---

## 🔐 Credenciales por defecto

| Usuario    | Contraseña  | Rol                   |
| ---------- | ----------- | --------------------- |
| `Director` | `1NS4L2026` | Director (rol_id = 1) |

> El usuario `Director` se crea automáticamente al inicializar la base de datos si no existe ningún maestro registrado.

---

## 🎨 Interfaz de usuario

### Características visuales

- **Diseño responsive** — Adaptado a dispositivos móviles y escritorio
- **Material Design** — Componentes de la librería Material Web
- **Animaciones CSS** — Transiciones suaves con efecto _ripple_
- **Temas personalizables** — Soporte para modo claro/oscuro
- **Progress indicators** — Barras circulares y lineales para estados de carga
- **Diálogos modales** — Confirmaciones y formularios emergentes

### SPA en el dashboard

El panel de administración (`/menu`) es una **Single Page Application** que carga vistas parciales vía `fetch` e intercambio de HTML, manejada por un router personalizado en `public/js/router.js`.

---

## 🚦 Estado del proyecto

### ✅ Completado

- Autenticación y sesiones de usuario
- Registro de evaluadores invitados
- Navegación y selección de proyectos
- Sistema de evaluación con criterios y ponderaciones
- Cálculo automático de notas (promedio de 3 evaluaciones)
- Gestión completa de proyectos (CRUD)
- Gestión de maestros y orientadores
- Catálogo de niveles, criterios, roles, bachilleratos y turnos

### 📋 Pendiente (TO-DO)

Ver [`TO-DO.md`](./TO-DO.md) para la lista completa de tareas pendientes:

1. Actualizar consultas para insertar/modificar/eliminar evaluaciones
2. Agregar espacio de creación/edición/eliminación de proyectos con dos tipos:
   - Feria de Logros
   - Expotecnia
3. Pruebas de funcionamiento del sistema completo

---

## 📁 Estructura del proyecto

```
insal-evaluaciones/
├── app.js                          # Servidor Express + API REST
├── package.json
├── TO-DO.md
├── README.md                       # ← Este archivo
├── db/
│   └── Principal_y_Evaluacion.sql  # Esquema y datos de PostgreSQL
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
│       ├── proyecto-editar.ejs
│       ├── proyectos.ejs
│       ├── rubrica.ejs
│       ├── rubrica-editar.ejs
│       └── ...
└── public/
    ├── css/                        # Estilos modulares
    ├── js/                         # Scripts frontend (ES6 módulos)
    │   ├── router.js               # Enrutador SPA
    │   ├── login.js
    │   ├── proyectos.js
    │   ├── evaluacion.js
    │   ├── criterios-rubrica.js
    │   └── ...
    ├── html/
    │   └── index.html
    └── assets/
        ├── img/
        └── svg/
```

---

## 🧪 Pruebas

Para probar las consultas de inserción, modificación y eliminación:

1. **Inicia sesión** como director (`Director` / `1NS4L2026`)
2. Navega a `/menu/proyectos` para gestionar proyectos
3. Crea un nuevo proyecto y verifica que aparezca en la lista
4. Edita el proyecto y confirma los cambios
5. Elimina el proyecto y verifica que desaparezca
6. Repite el proceso para criterios y rúbricas en `/menu/rubrica`

---

## 📜 Licencia

Desarrollado para el **Instituto Nacional San Luis** — Uso interno institucional.

---

## 🧑‍💻 Desarrollado con

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/)
- [EJS](https://ejs.co/)
- [Material Web](https://m2.material.io/)
- [Nodemon](https://nodemon.io/)

---

<div align="center">

**INSAL - Instituto Nacional San Luis**

</div>
