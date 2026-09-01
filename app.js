const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET || 'insal-secret-2026',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false, httpOnly: true, maxAge: 8 * 60 * 60 * 1000 },
    }),
);

// EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || 'dbInsal',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const BACH_ABREV = {
    1: 'G',
    2: 'SBS',
    3: 'SE',
    4: 'LCG',
    5: 'AC',
    6: 'DS',
    7: 'DG',
};

function buildGradeName(nivelNombre, bachilleratoId, seccionLetra) {
    const año = (nivelNombre || '').replace(/\s+/g, '').replace('Año', '');
    const abrev = BACH_ABREV[bachilleratoId] || '?';
    return `${año}${abrev}-${seccionLetra}`;
}

// ─── DB init + seed ────────────────────────────────────────────────────────────
async function seedAdmin() {
    const { rows } = await pool.query('SELECT COUNT(*)::int AS cnt FROM principal.maestros');
    if (rows[0].cnt === 0) {
        const hash = await bcrypt.hash('1NS4L2026', 10);
        await pool.query(
            `INSERT INTO principal.maestros (nombre, contrasena, rol_id, activo)
            VALUES ('Director', $1, 1, true)`,
            [hash],
        );
        console.log('✅ Usuario director seed creado (contraseña: 1NS4L2026)');
    }
}

async function initDB() {
    try {
        const client = await pool.connect();
        console.log('✅ Conexión exitosa a PostgreSQL');
        client.release();
        await seedAdmin();
    } catch (err) {
        console.error('❌ Error al conectar a PostgreSQL:', err.message);
        console.log('   Reintentando en 3 segundos...');
        setTimeout(initDB, 3000);
    }
}
initDB();

// ─── Auth helpers ──────────────────────────────────────────────────────────────
function requireAuth(req, res, next) {
    if (!req.session.maestro) {
        return res.redirect('/login');
    }
    next();
}

// Solo el director (rol_id = 1) gestiona maestros/orientadores
function requireDirector(req, res, next) {
    if (!req.session.maestro) {
        return res.redirect('/login');
    }
    if (req.session.maestro.rolId !== 1) {
        return res.status(403).json({ mensaje: 'Acción reservada al director' });
    }
    next();
}

// ─── Protección contra submits repetidos (doble clic / reintentos rápidos) ───
const submitCooldown = new Map(); // clave → timestamp (ms)

function evitarSubmitDuplicado(tiempoMs = 3000) {
    return (req, res, next) => {
        const usuario = req.session?.maestro?.id || req.session?.datosEvaluador?.evaluador_id || req.ip || 'anon';
        const cuerpo =
            req.body && typeof req.body === 'object'
                ? JSON.stringify(Object.entries(req.body).sort())
                : String(req.body ?? '');
        const clave = `${req.method}:${req.originalUrl}:${usuario}:${cuerpo}`;
        const ahora = Date.now();

        const previo = submitCooldown.get(clave);
        if (previo && ahora - previo < tiempoMs) {
            return res.status(429).json({
                mensaje: 'Solicitud duplicada. La operación ya se está procesando, intenta de nuevo en unos segundos.',
            });
        }

        submitCooldown.set(clave, ahora);
        next();
    };
}

// Limpieza periódica para evitar que el mapa crezca sin límite
setInterval(() => {
    const limite = Date.now() - 5000;
    for (const [clave, ts] of submitCooldown) {
        if (ts < limite) submitCooldown.delete(clave);
    }
}, 10000).unref?.();

/**
 * Devuelve true si el maestro autenticado puede gestionar el grado dado.
 *  - rol_id 1 (director) y 2 (administrador) → acceso total
 *  - cualquier otro rol futuro → solo si es orientador activo del grado
 */
async function canAccessGrade(maestroId, rolId, gradoId) {
    if (rolId === 1 || rolId === 2) return true;
    const { rows } = await pool.query(
        `SELECT 1 FROM principal.orientadores
        WHERE maestro_id = $1 AND grado_id = $2 AND activo = true`,
        [maestroId, gradoId],
    );
    return rows.length > 0;
}

// ─── Página principal ─────────────────────────────────────────────────────────

// Login para profesores
app.get('/login', (req, res) => {
    if (req.session.maestro) {
        return res.redirect('/menu');
    }
    if (req.session.datosEvaluador) {
        return res.redirect('/seleccion');
    }
    res.render('login');
});

// Registrarse
app.get('/registrarse', (req, res) => {
    if (req.session.maestro) {
        return res.redirect('/menu');
    }
    if (req.session.datosEvaluador) {
        res.redirect('/seleccion');
    } else {
        res.render('registrarse');
    }
});

app.get('/dashboard', (req, res) => {
    if (!req.session.datosEvaluador) {
        return res.redirect('/login');
    }
    res.render('menu', {
        evaluador: req.session.datosEvaluador,
    });
});

// Pantalla de selección de evaluación del evaluador (tras registrarse).
// Los "tipos de evaluación" son las rúbricas de evaluaciones.niveles:
// cada nivel es a la vez el evento y su rúbrica (relación 1:1), por lo
// que las opciones se leen de la BD en lugar de hardcodearse en la vista.
app.get('/seleccion', async (req, res) => {
    if (!req.session.datosEvaluador) {
        return res.redirect('/login');
    }
    let niveles = [];
    try {
        const { rows } = await pool.query('SELECT nivel_id, nombre FROM evaluaciones.niveles ORDER BY nivel_id');
        niveles = rows;
    } catch (err) {
        console.error('Error GET /seleccion al obtener niveles:', err);
    }
    res.render('seleccion', {
        evaluador: req.session.datosEvaluador,
        niveles,
    });
});

// Vista de evaluación de proyecto (formulario)
app.get('/evaluacion', (req, res) => {
    if (!req.session.datosEvaluador) {
        return res.redirect('/login');
    }
    res.render('evaluacion', {
        evaluador: req.session.datosEvaluador,
    });
});

// Vista de resumen de la evaluación del proyecto
app.get('/resumen', (req, res) => {
    if (!req.session.datosEvaluador) {
        return res.redirect('/login');
    }
    res.render('resumen', {
        evaluador: req.session.datosEvaluador,
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  SPA (rutas para vistas parciales, usadas por el router.js del frontend)
// ══════════════════════════════════════════════════════════════════════════════

// HTML parcial para la vista de inicio (usado por el SPA router)
app.get('/menu/inicio/html', requireAuth, async (req, res) => {
    try {
        res.render('partials/inicio', {
            rol: req.session.maestro.rolNombre || null,
            maestro: req.session.maestro,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error al cargar');
    }
});

/**
 * Resumen para el dashboard de Inicio: contadores de proyectos/evaluaciones,
 * promedio general y últimas evaluaciones registradas.
 * Director/Admin → todos los grados; Orientador → solo sus grados asignados.
 */
app.get('/admin/inicio/resumen', requireAuth, async (req, res) => {
    const { id: maestroId, rolId } = req.session.maestro;
    try {
        // Filtro por grados para orientadores (rol distinto de 1 y 2)
        let filtroGrado = '';
        const params = [];
        if (rolId !== 1 && rolId !== 2) {
            filtroGrado = ` WHERE p.grado_id IN (
                SELECT grado_id FROM principal.orientadores
                WHERE maestro_id = $1 AND activo = true
            )`;
            params.push(maestroId);
        }

        // ── Contadores generales ──
        const { rows: statsRows } = await pool.query(
            `SELECT
                COUNT(*)::int AS total_proyectos,
                COUNT(*) FILTER (WHERE total_evals >= 1)::int AS proyectos_evaluados,
                COUNT(*) FILTER (WHERE total_evals >= 3)::int AS proyectos_completos,
                AVG(nota_final) FILTER (WHERE total_evals >= 1)::numeric(4,2) AS promedio_general,
                COALESCE(SUM(total_evals), 0)::int AS total_evaluaciones,
                COUNT(DISTINCT p.grado_id)::int AS grados_con_proyectos
            FROM (
                SELECT p.proyecto_id, p.grado_id,
                       COUNT(ev.evaluacion_id)::int AS total_evals,
                       AVG(ev.nota_evaluacion)::numeric(4,2) AS nota_final
                FROM evaluaciones.proyectos p
                LEFT JOIN evaluaciones.evaluaciones ev ON ev.proyecto_id = p.proyecto_id
                ${filtroGrado}
                GROUP BY p.proyecto_id, p.grado_id
            ) p`,
            params,
        );

        // ── Últimas evaluaciones (máx. 5) ──
        const { rows: ultimasRows } = await pool.query(
            `SELECT ev.evaluacion_id,
                    ev.nota_evaluacion,
                    ev.fecha_evaluacion,
                    p.proyecto_id,
                    p.nombre AS proyecto_nombre,
                    g.anio,
                    ne.nombre AS grado_nivel,
                    b.bachillerato_id,
                    s.letra AS seccion,
                    e.nombre AS evaluador_nombre
            FROM evaluaciones.evaluaciones ev
            JOIN evaluaciones.proyectos p ON ev.proyecto_id = p.proyecto_id
            JOIN principal.grados g ON p.grado_id = g.grado_id
            JOIN principal.niveles_estudios ne ON g.niveles_estudio_id = ne.niveles_estudios_id
            LEFT JOIN principal.bachilleratos b ON g.bachillerato_id = b.bachillerato_id
            LEFT JOIN principal.secciones s ON g.seccion_id = s.seccion_id
            JOIN evaluaciones.evaluadores e ON ev.evaluador_id = e.evaluador_id
            ${filtroGrado}
            ORDER BY ev.fecha_evaluacion DESC
            LIMIT 5`,
            params,
        );

        const ultimas = ultimasRows.map((r) => {
            let grado = '';
            try {
                grado = buildGradeName(r.grado_nivel, r.bachillerato_id, r.seccion);
            } catch {
                grado = '';
            }
            return {
                ...r,
                grado,
                fecha: r.fecha_evaluacion,
            };
        });

        res.json({ stats: statsRows[0], ultimas });
    } catch (err) {
        console.error('Error /admin/inicio/resumen:', err);
        return res.status(500).json({
            mensaje: 'Error al obtener el resumen',
            detalle: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
});

// HTML parcial para la vista de evaluaciones (usado por el SPA router)
app.get('/menu/evaluaciones/html', requireAuth, async (req, res) => {
    try {
        res.render('partials/evaluaciones', {});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error al cargar');
    }
});

// HTML parcial para la vista de detalle de una evaluación (usado por el SPA router)
app.get('/menu/evaluaciones/:id/html', requireAuth, async (req, res) => {
    try {
        res.render('partials/evaluacion-detalle', {
            id: req.params.id,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error al cargar');
    }
});

// HTML parcial para la vista de proyectos (usado por el SPA router)
app.get('/menu/proyectos/html', requireAuth, async (req, res) => {
    try {
        res.render('partials/proyectos', {});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error al cargar');
    }
});

// HTML parcial para la vista de detalle de un proyecto (usado por el SPA router)
app.get('/menu/proyectos/:id/html', requireAuth, async (req, res) => {
    try {
        res.render('partials/proyecto-editar', {
            id: req.params.id,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error al cargar');
    }
});

// HTML parcial para la vista de papelera (usado por el SPA router)
app.get('/menu/papelera/html', requireAuth, async (req, res) => {
    try {
        res.render('partials/papelera', {});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error al cargar');
    }
});

// HTML parcial para la vista editando criterios (usado por el SPA router)
app.get('/menu/rubrica/:id/html', requireAuth, async (req, res) => {
    try {
        res.render('partials/rubrica-editar', {
            id: req.params.id,
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error al cargar');
    }
});

// HTML parcial para la vista de criterios (usado por el SPA router)
app.get('/menu/rubrica/html', requireAuth, async (req, res) => {
    try {
        res.render('partials/rubrica', {});
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error al cargar');
    }
});

// Dashboard principal
app.get('/menu{/*splat}', requireAuth, (req, res) => {
    res.render('menu', {
        maestro: req.session.maestro,
        user: req.session.maestro.nombre,
        icon: req.session.icon,
        rol: req.session.maestro.rolNombre || null,
    });
});

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════════════════════

app.post('/auth/login', async (req, res) => {
    const { nombre, contrasena } = req.body;
    if (!nombre || !contrasena) {
        return res.status(400).json({ mensaje: 'Nombre y contraseña son requeridos' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT m.maestro_id, m.nombre, m.contrasena, m.rol_id,
                    (SELECT r.nombre FROM principal.roles r WHERE r.rol_id = m.rol_id) AS rol_nombre
            FROM principal.maestros m
            WHERE m.nombre = $1 AND m.activo = true`,
            [nombre],
        );
        if (rows.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
        }
        const maestro = rows[0];
        const match = await bcrypt.compare(contrasena, maestro.contrasena);

        // Acordarme de restaurar el ! diferente al comparar la contraseña
        // Si la contraseña coincide dara error, only debugging
        if (match) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
        }
        req.session.maestro = {
            id: maestro.maestro_id,
            nombre: maestro.nombre,
            rolId: maestro.rol_id,
            rolNombre: maestro.rol_nombre,
        };
        return res.json({
            mensaje: 'Login exitoso',
            maestro: {
                id: maestro.maestro_id,
                nombre: maestro.nombre,
                rolId: maestro.rol_id,
                rolNombre: maestro.rol_nombre,
            },
        });
    } catch (err) {
        console.error('Error login:', err);
        return res.status(500).json({ mensaje: 'Error en el servidor' });
    }
});

app.post('/auth/logout', (req, res) => {
    req.session.destroy(() => res.json({ mensaje: 'Sesión cerrada' }));
});

app.get('/auth/me', requireAuth, (req, res) => {
    res.json({ maestro: req.session.maestro });
});

// ─── Perfil del maestro logueado (diálogo de configuración) ───────────────────

// GET: datos del perfil (nunca devuelve el hash de contraseña)
app.get('/admin/mi-perfil', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT maestro_id, nombre, email, rol_id,
                    (SELECT r.nombre FROM principal.roles r WHERE r.rol_id = m.rol_id) AS rol_nombre
             FROM principal.maestros m
             WHERE maestro_id = $1 AND activo = true`,
            [req.session.maestro.id],
        );
        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }
        const m = rows[0];
        res.json({
            maestro: {
                maestro_id: m.maestro_id,
                nombre: m.nombre,
                email: m.email || '',
                rol: m.rol_id,
                rolNombre: m.rol_nombre,
            },
        });
    } catch (err) {
        console.error('Error GET /admin/mi-perfil:', err);
        return res.status(500).json({ mensaje: 'Error al obtener el perfil' });
    }
});

// PUT: actualizar nombre / email / contraseña del maestro logueado.
// Si viene contrasena_nueva, se exige contrasena_actual y se verifica.
app.put('/admin/mi-perfil', requireAuth, async (req, res) => {
    const { nombre, email, contrasena_actual, contrasena_nueva } = req.body;
    const maestroId = req.session.maestro.id;

    if (nombre !== undefined && !String(nombre).trim()) {
        return res.status(400).json({ mensaje: 'El nombre no puede estar vacío' });
    }
    if (contrasena_nueva && String(contrasena_nueva).length < 6) {
        return res.status(400).json({
            mensaje: 'La nueva contraseña debe tener al menos 6 caracteres',
        });
    }

    try {
        // Si hay cambio de contraseña, verificar la actual primero
        if (contrasena_nueva) {
            if (!contrasena_actual) {
                return res.status(400).json({
                    mensaje: 'Se requiere la contraseña actual para cambiarla',
                });
            }
            const { rows } = await pool.query('SELECT contrasena FROM principal.maestros WHERE maestro_id = $1', [
                maestroId,
            ]);
            if (rows.length === 0) {
                return res.status(404).json({ mensaje: 'Usuario no encontrado' });
            }
            const match = await bcrypt.compare(contrasena_actual, rows[0].contrasena);
            if (!match) {
                return res.status(401).json({ mensaje: 'Contraseña actual incorrecta' });
            }
        }

        const { rows } = await pool.query(
            `UPDATE principal.maestros SET
                    nombre = COALESCE($2, nombre),
                    email = COALESCE($3, email),
                    contrasena = COALESCE($4, contrasena),
                    actualizado_en = now()
             WHERE maestro_id = $1 AND activo = true
             RETURNING maestro_id, nombre, email`,
            [
                maestroId,
                nombre !== undefined ? String(nombre).trim() : null,
                email !== undefined ? String(email).trim() || null : null,
                contrasena_nueva ? await bcrypt.hash(String(contrasena_nueva), 10) : null,
            ],
        );
        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        // Mantener la sesión coherente con la BD
        req.session.maestro.nombre = rows[0].nombre;

        res.json({
            mensaje: 'Perfil actualizado',
            maestro: {
                maestro_id: rows[0].maestro_id,
                nombre: rows[0].nombre,
                email: rows[0].email || '',
            },
        });
    } catch (err) {
        console.error('Error PUT /admin/mi-perfil:', err);
        return res.status(500).json({ mensaje: 'Error al actualizar el perfil' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  FLUJO EVALUADOR (rutas existentes — corregidas)
// ══════════════════════════════════════════════════════════════════════════════

app.post('/enviarEvaluador', async (req, res) => {
    const { nombreEvaluador, email } = req.body;
    if (!nombreEvaluador || !email) {
        return res.status(400).json({ mensaje: 'Nombre y email son requeridos' });
    }
    try {
        const result = await pool.query(
            `INSERT INTO evaluaciones.evaluadores (nombre, email)
            VALUES ($1, $2) RETURNING evaluador_id`,
            [nombreEvaluador, email],
        );
        req.session.datosEvaluador = {
            id: result.rows[0].evaluador_id,
            nombreEvaluador,
            email,
        };
        console.log(`Evaluador registrado: ${nombreEvaluador} (${email})`);
        res.json({ success: true, mensaje: 'Evaluador registrado correctamente', redirect: '/seleccion' });
    } catch (err) {
        console.error('Error enviarEvaluador:', err);
        if (err.code === '23505') {
            return res.status(400).json({ mensaje: 'El evaluador ya está registrado' });
        } else {
            return res.status(500).json({ mensaje: 'No se guardaron los datos' });
        }
    }
});

app.post('/guardar-nivel', async (req, res) => {
    const numNivel = Number(req.body.numNivel);
    if (!numNivel) {
        return res.status(400).json({ mensaje: 'Nivel no válido' });
    }
    try {
        // Validar contra la BD en lugar de una lista hardcodeada:
        // cualquier nivel creado desde el panel admin es aceptado.
        const { rows } = await pool.query('SELECT 1 FROM evaluaciones.niveles WHERE nivel_id = $1', [numNivel]);
        if (rows.length === 0) {
            return res.status(400).json({ mensaje: 'Nivel no válido' });
        }
        req.session.numNivel = numNivel;
        res.json({ mensaje: 'Nivel guardado correctamente' });
    } catch (err) {
        console.error('Error guardar-nivel:', err);
        return res.status(500).json({ mensaje: 'Error al guardar el nivel' });
    }
});

app.get('/obtener-nivel', (req, res) => {
    if (!req.session.numNivel) {
        return res.status(400).json({ mensaje: 'No se ha seleccionado un nivel' });
    }
    res.json({
        numNivel: req.session.numNivel,
        idProyecto: req.session.idProyecto,
        nombreProyecto: req.session.nombreProyecto,
        evaluacionId: req.session.evaluacionId,
    });
});

/**
 * Devuelve los años de estudio (1er/2do/3er año) que tienen proyectos
 * para un nivel de evaluación.
 * numNivel = evaluaciones.niveles.nivel_id
 * Responde: { años: [{ id, nombre }] } con id = principal.niveles_estudios_id
 */
app.get('/grados/anos/:numNivel', async (req, res) => {
    const numNivel = Number(req.params.numNivel);
    if (!numNivel) {
        return res.status(400).json({ mensaje: 'Nivel no válido' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT DISTINCT ne.niveles_estudios_id AS id,
                    ne.nombre
             FROM principal.grados g
             JOIN principal.niveles_estudios ne ON g.niveles_estudio_id = ne.niveles_estudios_id
             JOIN evaluaciones.proyectos     p  ON g.grado_id           = p.grado_id
             WHERE p.nivel_id = $1
             ORDER BY ne.niveles_estudios_id`,
            [numNivel],
        );
        res.json({ años: rows });
    } catch (err) {
        console.error('Error /grados/anos:', err);
        return res.status(500).json({ mensaje: 'Error al obtener años' });
    }
});

/**
 * Devuelve bachilleratos disponibles para un nivel + año de estudio.
 * :ano = principal.niveles_estudios_id (id del año de estudio)
 * Responde: { nombres: [{ id, abrev, label }] }
 */
app.get('/grados/nombres/:numNivel/:ano', async (req, res) => {
    const numNivel = Number(req.params.numNivel);
    const ano = Number(req.params.ano);
    if (!numNivel || !ano) {
        return res.status(400).json({ mensaje: 'Parámetros no válidos' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT DISTINCT b.bachillerato_id AS id,
                    b.nombre
             FROM principal.grados g
             JOIN principal.bachilleratos b ON g.bachillerato_id = b.bachillerato_id
             JOIN evaluaciones.proyectos  p ON g.grado_id        = p.grado_id
             WHERE p.nivel_id = $1 AND g.niveles_estudio_id = $2
             ORDER BY b.nombre`,
            [numNivel, ano],
        );
        const nombres = rows.map((r) => ({
            id: r.id,
            abrev: BACH_ABREV[r.id] || r.nombre,
            label: r.nombre,
        }));
        res.json({ nombres });
    } catch (err) {
        console.error('Error /grados/nombres:', err);
        return res.status(500).json({ mensaje: 'Error al obtener bachilleratos' });
    }
});

/**
 * Devuelve secciones para nivel + año de estudio + bachillerato_id.
 * :ano = principal.niveles_estudios_id (id del año de estudio)
 * :bachId = bachillerato_id (número)
 */
app.get('/grados/secciones/:numNivel/:ano/:bachId', async (req, res) => {
    const numNivel = Number(req.params.numNivel);
    const ano = Number(req.params.ano);
    const bachId = Number(req.params.bachId);
    if (!numNivel || !ano || !bachId) {
        return res.status(400).json({ mensaje: 'Parámetros no válidos' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT DISTINCT s.letra
             FROM principal.grados g
             JOIN principal.secciones s    ON g.seccion_id    = s.seccion_id
             JOIN evaluaciones.proyectos p ON g.grado_id      = p.grado_id
             WHERE p.nivel_id = $1
               AND g.niveles_estudio_id = $2
               AND g.bachillerato_id = $3
             ORDER BY s.letra`,
            [numNivel, ano, bachId],
        );
        res.json({ secciones: rows.map((r) => r.letra) });
    } catch (err) {
        console.error('Error /grados/secciones:', err);
        return res.status(500).json({ mensaje: 'Error al obtener secciones' });
    }
});

/**
 * Devuelve proyectos para nivel + año de estudio + bachillerato_id + sección.
 * :ano = principal.niveles_estudios_id (id del año de estudio)
 * Solo proyectos con menos de 3 evaluaciones.
 */
app.get('/proyectos/:numNivel/:ano/:bachId/:seccion', async (req, res) => {
    const numNivel = Number(req.params.numNivel);
    const ano = Number(req.params.ano);
    const bachId = Number(req.params.bachId);
    const seccion = req.params.seccion;
    if (!numNivel || !ano || !bachId || !seccion) {
        return res.status(400).json({ mensaje: 'Parámetros no válidos' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT p.proyecto_id,
                    p.nombre
             FROM evaluaciones.proyectos p
             JOIN principal.grados     g ON p.grado_id    = g.grado_id
             JOIN principal.secciones  s ON g.seccion_id = s.seccion_id
             LEFT JOIN (
                 SELECT proyecto_id,
                        COUNT(*) AS cnt
                 FROM evaluaciones.evaluaciones
                 GROUP BY proyecto_id
             ) e ON p.proyecto_id = e.proyecto_id
             WHERE p.nivel_id = $1
               AND g.niveles_estudio_id = $2
               AND g.bachillerato_id = $3
               AND s.letra = $4
               AND (e.cnt IS NULL OR e.cnt < 3)`,
            [numNivel, ano, bachId, seccion],
        );
        res.json({ proyectos: rows });
    } catch (err) {
        console.error('Error /proyectos:', err);
        return res.status(500).json({ mensaje: 'Error al obtener proyectos' });
    }
});

app.post('/guardar-proyecto', (req, res) => {
    const { idProyecto, nombreProyecto } = req.body;
    if (!idProyecto || !nombreProyecto) {
        return res.status(400).json({ mensaje: 'Proyecto no válido' });
    }
    req.session.idProyecto = idProyecto;
    req.session.nombreProyecto = nombreProyecto;
    delete req.session.evaluacionId;
    res.json({ mensaje: 'Proyecto guardado correctamente' });
});

/* app.get("/html/formulario.html", (req, res) => {
    if (
        !req.session.numNivel ||
        !req.session.datosEvaluador ||
        !req.session.idProyecto
    ) {
        return res.redirect("/html/seleccion2.html");
    }
    res.sendFile(path.join(__dirname, "public/html/formulario.html"));
});
 */

app.get('/obtener-evaluador', (req, res) => {
    const datos = req.session.datosEvaluador;
    if (!datos) {
        return res.status(400).json({ mensaje: 'No se ha registrado un evaluador' });
    }
    res.json({
        evaluadorId: datos.id,
        nombreEvaluador: datos.nombreEvaluador,
        email: datos.email,
    });
});

app.get('/criterios', async (req, res) => {
    const numNivel = req.session.numNivel;
    if (!numNivel) {
        return res.status(400).json({ mensaje: 'No se ha seleccionado un nivel' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT criterio_id, nombre, descripcion, porcentaje
             FROM evaluaciones.criterios
             WHERE nivel_id = $1
             ORDER BY criterio_id`,
            [numNivel],
        );
        res.json({ criterios: rows });
    } catch (err) {
        console.error('Error /criterios:', err);
        return res.status(500).json({ mensaje: 'Error al obtener criterios' });
    }
});

/**
 * Devuelve estudiantes del proyecto con asistencia pendiente.
 * evaluaciones.estudiantes.grado_id → principal.estudiantes.estudiante_id
 */
app.get('/estudiantes/:proyectoId', async (req, res) => {
    const proyectoId = Number(req.params.proyectoId);
    if (!proyectoId) {
        return res.status(400).json({ mensaje: 'proyectoId no válido' });
    }
    try {
        const { rows: cntRows } = await pool.query(
            `SELECT COUNT(*)::int AS cnt
             FROM evaluaciones.evaluaciones
             WHERE proyecto_id = $1`,
            [proyectoId],
        );
        if (cntRows[0].cnt >= 3) {
            return res.json({ estudiantes: [], evaluacionesCompletas: true });
        }
        const { rows } = await pool.query(
            `SELECT es.estudiante_id,
                    ps.nombre_completo AS nombre
             FROM evaluaciones.estudiantes es
             JOIN principal.estudiantes   ps ON es.grado_id = ps.estudiante_id
             -- asistencia IS DISTINCT FROM true cubre false Y null (sin registrar)
             WHERE es.proyecto_id = $1
               AND es.asistencia IS DISTINCT FROM true`,
            [proyectoId],
        );
        res.json({ estudiantes: rows, evaluacionesCompletas: false });
    } catch (err) {
        console.error('Error /estudiantes:', err);
        return res.status(500).json({ mensaje: 'Error al obtener estudiantes' });
    }
});

app.post('/guardar-asistencia', async (req, res) => {
    const { estudianteIds } = req.body;
    const proyectoId = req.session.idProyecto;
    if (!proyectoId || !Array.isArray(estudianteIds)) {
        return res.status(400).json({ mensaje: 'Datos incompletos' });
    }
    if (estudianteIds.length === 0) {
        return res.json({ mensaje: 'No se seleccionaron estudiantes' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const id of estudianteIds) {
            await client.query(
                `UPDATE evaluaciones.estudiantes
                 SET asistencia = true
                 WHERE estudiante_id = $1 AND proyecto_id = $2`,
                [id, proyectoId],
            );
        }
        await client.query('COMMIT');
        res.json({ mensaje: 'Asistencia guardada correctamente' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error guardar-asistencia:', err);
        return res.status(500).json({ mensaje: 'Error al guardar asistencia' });
    } finally {
        client.release();
    }
});

app.post('/guardar-evaluacion', async (req, res) => {
    const { evaluaciones } = req.body;
    const evaluadorId = req.session.datosEvaluador?.id;
    const proyectoId = req.session.idProyecto;

    if (!evaluadorId || !proyectoId || !Array.isArray(evaluaciones)) {
        return res.status(400).json({ mensaje: 'Datos incompletos' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Eliminar evaluación previa del mismo evaluador para el mismo proyecto
        await client.query(
            `DELETE FROM evaluaciones.evaluacion_criterios
             WHERE evaluacion_id IN (
                 SELECT evaluacion_id
                 FROM evaluaciones.evaluaciones
                 WHERE evaluador_id = $1 AND proyecto_id = $2
             )`,
            [evaluadorId, proyectoId],
        );
        await client.query(
            `DELETE FROM evaluaciones.evaluaciones
             WHERE evaluador_id = $1 AND proyecto_id = $2`,
            [evaluadorId, proyectoId],
        );

        // Calcular nota total ponderada
        const criterioIds = evaluaciones.map((e) => e.criterio_id);
        const { rows: criterioRows } = await client.query(
            `SELECT criterio_id, porcentaje
             FROM evaluaciones.criterios
             WHERE criterio_id = ANY($1::int[])`,
            [criterioIds],
        );

        let total = 0;
        evaluaciones.forEach((ev) => {
            const criterio = criterioRows.find((c) => c.criterio_id === ev.criterio_id);
            if (criterio) total += (ev.puntuacion * criterio.porcentaje) / 100;
        });
        total = Math.min(total, 10);

        // Insertar evaluación
        const { rows: evRows } = await client.query(
            `INSERT INTO evaluaciones.evaluaciones
             (evaluador_id, proyecto_id, fecha_evaluacion, nota_evaluacion)
             VALUES ($1, $2, NOW(), $3)
             RETURNING evaluacion_id`,
            [evaluadorId, proyectoId, total],
        );
        const evaluacionId = evRows[0].evaluacion_id;
        req.session.evaluacionId = evaluacionId;

        // Insertar detalle por criterio
        for (const { criterio_id, puntuacion } of evaluaciones) {
            await client.query(
                `INSERT INTO evaluaciones.evaluacion_criterios
                 (criterio_id, evaluacion_id, puntuacion)
                 VALUES ($1, $2, $3)`,
                [criterio_id, evaluacionId, puntuacion],
            );
        }

        // Si ya hay 3 evaluaciones, calcular promedio y actualizar proyecto
        const { rows: cntRows } = await client.query(
            `SELECT COUNT(*)::int AS cnt,
                    AVG(nota_evaluacion)::numeric(4,2) AS prom
             FROM evaluaciones.evaluaciones
             WHERE proyecto_id = $1`,
            [proyectoId],
        );
        if (cntRows[0].cnt >= 3) {
            await client.query(`UPDATE evaluaciones.proyectos SET nota = $1 WHERE proyecto_id = $2`, [
                cntRows[0].prom,
                proyectoId,
            ]);
        }

        await client.query('COMMIT');
        res.json({
            mensaje: 'Evaluación guardada correctamente',
            redirect: '/resumen',
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error guardar-evaluacion:', err);
        return res.status(500).json({ mensaje: 'Error al guardar evaluación' });
    } finally {
        client.release();
    }
});

app.get('/evaluacion-criterios/:evaluacionId', async (req, res) => {
    const evaluacionId = Number(req.params.evaluacionId);
    if (!evaluacionId) {
        return res.status(400).json({ mensaje: 'evaluacionId no válido' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT ec.criterio_id,
                    c.nombre,
                    c.descripcion,
                    ec.puntuacion,
                    c.porcentaje
             FROM evaluaciones.evaluacion_criterios ec
             JOIN evaluaciones.criterios            c  ON ec.criterio_id = c.criterio_id
             WHERE ec.evaluacion_id = $1`,
            [evaluacionId],
        );
        res.json({ criterios: rows });
    } catch (err) {
        console.error('Error /evaluacion-criterios:', err);
        return res.status(500).json({ mensaje: 'Error al obtener criterios evaluados' });
    }
});

app.post('/limpiar-sesion', (req, res) => {
    const datosEvaluador = req.session.datosEvaluador;
    Object.assign(req.session, {
        numNivel: null,
        idProyecto: null,
        nombreProyecto: null,
        evaluacionId: null,
        datosEvaluador,
    });
    res.json({ mensaje: 'Sesión limpiada correctamente' });
});

app.get('/proyecto/:id', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT nombre FROM evaluaciones.proyectos WHERE proyecto_id = $1', [
            req.params.id,
        ]);
        if (rows.length === 0) return res.status(404).json({ error: 'Proyecto no encontrado' });
        res.json({ nombre: rows[0].nombre });
    } catch (err) {
        console.error('Error /proyecto/:id:', err);
        return res.status(500).json({ error: 'Error en el servidor' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN — GRADOS (lectura)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Lista de grados.
 * Director/Admin → todos los grados.
 * Orientador      → solo los grados asignados.
 */
app.get('/admin/grados', requireAuth, async (req, res) => {
    const { id: maestroId, rolId } = req.session.maestro;
    try {
        const base = `
      SELECT g.grado_id,
             ne.nombre            AS nivel_nombre,
             b.bachillerato_id,
             b.nombre             AS bachillerato_nombre,
             s.letra              AS seccion,
             t.nombre             AS turno,
             g.anio
      FROM principal.grados           g
      JOIN principal.niveles_estudios  ne ON g.niveles_estudio_id = ne.niveles_estudios_id
      JOIN principal.bachilleratos     b  ON g.bachillerato_id    = b.bachillerato_id
      JOIN principal.secciones         s  ON g.seccion_id         = s.seccion_id
      JOIN principal.turnos            t  ON g.turno_id           = t.turno_id
    `;
        const query =
            rolId === 1 || rolId === 2
                ? `${base} ORDER BY g.anio, ne.nombre, b.nombre, s.letra`
                : `${base}
      JOIN principal.orientadores o ON g.grado_id = o.grado_id
      WHERE o.maestro_id = $1 AND o.activo = true
      ORDER BY g.anio, ne.nombre, b.nombre, s.letra`;

        const { rows } = await pool.query(query, rolId === 1 || rolId === 2 ? [] : [maestroId]);

        const grados = rows.map((r) => ({
            ...r,
            abrev: BACH_ABREV[r.bachillerato_id] || '?',
            displayName: buildGradeName(r.nivel_nombre, r.bachillerato_id, r.seccion),
        }));
        res.json({ grados });
    } catch (err) {
        console.error('Error /admin/grados:', err);
        return res.status(500).json({ mensaje: 'Error al obtener grados' });
    }
});

/**
 * Estudiantes de un grado (de principal.estudiantes).
 * Útil para saber qué estudiantes agregar a un proyecto.
 */
app.get('/admin/grados/:gradoId/estudiantes', requireAuth, async (req, res) => {
    const gradoId = Number(req.params.gradoId);
    const { id: maestroId, rolId } = req.session.maestro;
    if (!gradoId) return res.status(400).json({ mensaje: 'gradoId no válido' });
    try {
        if (!(await canAccessGrade(maestroId, rolId, gradoId))) {
            return res.status(403).json({ mensaje: 'Sin acceso a este grado' });
        }
        const { rows } = await pool.query(
            `SELECT estudiante_id, nombre_completo, nie
             FROM principal.estudiantes
             WHERE grado_id = $1 AND estado = true
             ORDER BY nombre_completo`,
            [gradoId],
        );
        res.json({ estudiantes: rows });
    } catch (err) {
        console.error('Error /admin/grados/:gradoId/estudiantes:', err);
        return res.status(500).json({ mensaje: 'Error al obtener estudiantes del grado' });
    }
});

/**
 * Proyectos de un grado con conteo de estudiantes y evaluaciones.
 */
app.get('/admin/grados/:gradoId/proyectos', requireAuth, async (req, res) => {
    const gradoId = Number(req.params.gradoId);
    const { id: maestroId, rolId } = req.session.maestro;
    if (!gradoId) return res.status(400).json({ mensaje: 'gradoId no válido' });
    try {
        if (!(await canAccessGrade(maestroId, rolId, gradoId))) {
            return res.status(403).json({ mensaje: 'Sin acceso a este grado' });
        }
        const { rows } = await pool.query(
            `SELECT p.proyecto_id,
                    p.nombre,
                    p.nota,
                    n.nivel_id,
                    n.nombre                         AS nivel_nombre,
                    COUNT(DISTINCT es.estudiante_id) AS total_estudiantes,
                    COUNT(DISTINCT ev.evaluacion_id) AS total_evaluaciones
             FROM evaluaciones.proyectos p
             JOIN evaluaciones.niveles   n  ON p.nivel_id    = n.nivel_id
             LEFT JOIN evaluaciones.estudiantes  es ON p.proyecto_id = es.proyecto_id
             LEFT JOIN evaluaciones.evaluaciones ev ON p.proyecto_id = ev.proyecto_id
             WHERE p.grado_id = $1
             GROUP BY p.proyecto_id, p.nombre, p.nota, n.nivel_id, n.nombre
             ORDER BY p.nombre`,
            [gradoId],
        );
        res.json({ proyectos: rows });
    } catch (err) {
        console.error('Error /admin/grados/:gradoId/proyectos:', err);
        return res.status(500).json({ mensaje: 'Error al obtener proyectos del grado' });
    }
});
// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN — EVALUACIONES (lectura para la vista Evaluaciones)
//  Endpoint 1: proyectos evaluados (completos con nota final y parciales).
//  Endpoint 2: detalle de las evaluaciones de un proyecto (quién, nota y hora).
//  ══════════════════════════════════════════════════════════════════════════════

/**
 * Proyectos evaluados. Solo proyectos que ya tienen al menos 1 evaluación.
 *  - completos (3 evaluaciones): nota = promedio ya guardado en proyectos.nota
 *  - parciales (1-2 evaluaciones): nota = promedio de las evaluaciones existentes
 * Director/Admin → todos; Orientador → solo sus grados asignados.
 */
app.get('/admin/evaluaciones/proyectos', requireAuth, async (req, res) => {
    // console.log("[evaluaciones/proyectos] petición recibida (cualquier maestro autenticado)");
    try {
        const base = `
      SELECT p.proyecto_id,
             p.nombre,
             p.nota,
             p.grado_id,
             g.anio,
             n.nivel_id,
             n.nombre            AS nivel_nombre,
             ne.nombre           AS grado_nivel,
             b.bachillerato_id,
             b.nombre            AS bachillerato,
             s.letra             AS seccion,
             COUNT(ev.evaluacion_id)::int          AS total_evaluaciones,
             AVG(ev.nota_evaluacion)::numeric(4,2) AS nota_promedio
      FROM evaluaciones.proyectos     p
      JOIN principal.grados           g  ON p.grado_id              = g.grado_id
      JOIN evaluaciones.niveles       n  ON p.nivel_id              = n.nivel_id
      LEFT JOIN principal.niveles_estudios ne ON g.niveles_estudio_id    = ne.niveles_estudios_id
      LEFT JOIN principal.bachilleratos    b  ON g.bachillerato_id       = b.bachillerato_id
      LEFT JOIN principal.secciones        s  ON g.seccion_id            = s.seccion_id
      LEFT JOIN evaluaciones.evaluaciones ev ON p.proyecto_id       = ev.proyecto_id
    `;
        const groupBy = `
      GROUP BY p.proyecto_id, p.nombre, p.nota, p.grado_id, g.anio,
               n.nivel_id, n.nombre, ne.nombre,
               b.bachillerato_id, b.nombre, s.letra
      HAVING COUNT(ev.evaluacion_id) >= 1
    `;
        const query = `${base}${groupBy} ORDER BY p.nombre`;

        const { rows } = await pool.query(query);
        // console.log("[evaluaciones/proyectos] SQL ejecutado:\n%s", query);
        // console.log("[evaluaciones/proyectos] filas crudas (%d): %s", rows.length, JSON.stringify(rows));

        const proyectos = rows.map((r) => {
            const total = Number(r.total_evaluaciones) || 0;
            const completa = total === 3;
            const notaProyecto = r.nota !== null && r.nota !== undefined ? Number(r.nota) : null;
            let displayName = '';
            try {
                displayName = buildGradeName(r.grado_nivel, r.bachillerato_id, r.seccion);
            } catch {
                displayName = r.nivel_nombre || '';
            }
            return {
                ...r,
                abrev: BACH_ABREV[r.bachillerato_id] || '?',
                displayName,
                estado: completa ? 'completa' : 'parcial',
                nota: completa && notaProyecto !== null ? notaProyecto : r.nota_promedio,
            };
        });
        // console.log("[evaluaciones/proyectos] proyectos mapeados (%d): %s", proyectos.length, JSON.stringify(proyectos));
        res.json({ proyectos });
    } catch (err) {
        // console.error("[evaluaciones/proyectos] ERROR al obtener proyectos evaluados:", err);
        return res.status(500).json({
            mensaje: 'Error al obtener proyectos evaluados',
            detalle: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }
});

/**
 * Detalle de las evaluaciones de un proyecto: quién evaluó, nota y hora.
 * Devuelve entre 1 y 3 evaluaciones según las registradas.
 */
app.get('/admin/evaluaciones/proyectos/:proyectoId/evaluaciones', requireAuth, async (req, res) => {
    const proyectoId = Number(req.params.proyectoId);
    if (!proyectoId) return res.status(400).json({ mensaje: 'proyectoId no válido' });
    try {
        const { rows: check } = await pool.query(
            'SELECT grado_id, nombre FROM evaluaciones.proyectos WHERE proyecto_id = $1',
            [proyectoId],
        );
        if (check.length === 0) return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
        const { rows } = await pool.query(
            `SELECT ev.evaluacion_id,
                    ev.nota_evaluacion AS nota,
                    ev.fecha_evaluacion,
                    e.evaluador_id,
                    e.nombre           AS evaluador_nombre,
                    e.email            AS evaluador_email
             FROM evaluaciones.evaluaciones ev
             JOIN evaluaciones.evaluadores  e ON ev.evaluador_id = e.evaluador_id
             WHERE ev.proyecto_id = $1
             ORDER BY ev.fecha_evaluacion`,
            [proyectoId],
        );
        res.json({
            proyecto: { id: proyectoId, nombre: check[0].nombre },
            evaluaciones: rows,
        });
    } catch (err) {
        console.error('Error GET /admin/evaluaciones/proyectos/:id/evaluaciones:', err);
        return res.status(500).json({ mensaje: 'Error al obtener las evaluaciones del proyecto' });
    }
});

/**
 * Reporte de un grado: todos sus proyectos con TODAS sus evaluaciones
 * (y el desglose de criterios de cada evaluación). Se usa para descargar
 * el reporte final por grado (PDF / Excel) desde la lista de evaluaciones.
 * Devuelve un grado con la lista de proyectos; cada proyecto lleva su
 * `evaluaciones` array y cada evaluación sus `criterios`.
 */
app.get('/admin/evaluaciones/grado/:gradoId', requireAuth, async (req, res) => {
    const gradoId = Number(req.params.gradoId);
    const { id: maestroId, rolId } = req.session.maestro;
    if (!gradoId) return res.status(400).json({ mensaje: 'gradoId no válido' });
    try {
        if (!(await canAccessGrade(maestroId, rolId, gradoId))) {
            return res.status(403).json({ mensaje: 'Sin acceso a este grado' });
        }

        // Datos del grado (para el encabezado del reporte).
        // ⚠️ principal.grados NO tiene "nivel_id": el nivel de evaluación
        // (evaluaciones.niveles) pertenece al PROYECTO (p.nivel_id), no al
        // grado. Aquí solo se juntan los datos propios del grado.
        const { rows: gradoRows } = await pool.query(
            `SELECT g.grado_id,
                    g.anio,
                    ne.nombre AS grado_nivel,
                    b.bachillerato_id,
                    b.nombre  AS bachillerato,
                    s.letra   AS seccion
             FROM principal.grados g
             JOIN principal.niveles_estudios ne ON g.niveles_estudio_id = ne.niveles_estudios_id
             LEFT JOIN principal.bachilleratos b ON g.bachillerato_id  = b.bachillerato_id
             LEFT JOIN principal.secciones     s ON g.seccion_id       = s.seccion_id
             WHERE g.grado_id = $1`,
            [gradoId],
        );
        if (gradoRows.length === 0) return res.status(404).json({ mensaje: 'Grado no encontrado' });

        const grado = gradoRows[0];
        const gradoNombre = buildGradeName(grado.grado_nivel, grado.bachillerato_id, grado.seccion);

        // Todos los proyectos de ese grado
        const { rows: proyectos } = await pool.query(
            `SELECT p.proyecto_id,
                    p.nombre,
                    p.nota,
                    p.grado_id,
                    COUNT(ev.evaluacion_id)::int                  AS total_evaluaciones,
                    AVG(ev.nota_evaluacion)::numeric(4,2)         AS nota_promedio
             FROM evaluaciones.proyectos p
             LEFT JOIN evaluaciones.evaluaciones ev ON p.proyecto_id = ev.proyecto_id
             WHERE p.grado_id = $1
             GROUP BY p.proyecto_id, p.nombre, p.nota, p.grado_id
             ORDER BY p.nombre`,
            [gradoId],
        );

        // Las evaluaciones de esos proyectos, de una vez (evita N+1)
        const ids = proyectos.map((p) => p.proyecto_id);
        let evaluaciones = [];
        if (ids.length > 0) {
            const { rows } = await pool.query(
                `SELECT ev.evaluacion_id,
                            ev.proyecto_id,
                            ev.nota_evaluacion  AS nota,
                            ev.fecha_evaluacion,
                            e.nombre             AS evaluador_nombre,
                            e.email              AS evaluador_email
                 FROM evaluaciones.evaluaciones ev
                 JOIN evaluaciones.evaluadores  e  ON ev.evaluador_id = e.evaluador_id
                 WHERE ev.proyecto_id = ANY($1::int[])
                 ORDER BY ev.proyecto_id, ev.fecha_evaluacion`,
                [ids],
            );
            evaluaciones = rows;
        }

        // Criterios de todas esas evaluaciones (una sola consulta)
        const evalIds = evaluaciones.map((ev) => ev.evaluacion_id);
        let criterios = [];
        if (evalIds.length > 0) {
            const { rows } = await pool.query(
                `SELECT ec.evaluacion_id,
                            c.nombre,
                            ec.puntuacion,
                            c.porcentaje
                 FROM evaluaciones.evaluacion_criterios ec
                 JOIN evaluaciones.criterios c ON ec.criterio_id = c.criterio_id
                 WHERE ec.evaluacion_id = ANY($1::int[])`,
                [evalIds],
            );
            criterios = rows;
        }

        // Mapear: proyecto → sus evaluaciones → sus criterios
        const proyectosConDatos = proyectos.map((p) => {
            const proyectoId = p.proyecto_id;
            const evaluacionesDeProyecto = evaluaciones
                .filter((ev) => ev.proyecto_id === proyectoId)
                .map((ev) => ({
                    evaluacion_id: ev.evaluacion_id,
                    nota: ev.nota,
                    fecha_evaluacion: ev.fecha_evaluacion,
                    evaluador_nombre: ev.evaluador_nombre,
                    evaluador_email: ev.evaluador_email,
                    criterios: criterios
                        .filter((c) => c.evaluacion_id === ev.evaluacion_id)
                        .map((c) => ({
                            nombre: c.nombre,
                            puntuacion: c.puntuacion,
                            porcentaje: c.porcentaje,
                        })),
                }));

            const total = Number(p.total_evaluaciones) || 0;
            const completa = total === 3;
            return {
                ...p,
                displayName: gradoNombre,
                abrev: BACH_ABREV[grado.bachillerato_id] || '?',
                estado: completa ? 'completa' : 'parcial',
                nota: completa && p.nota != null ? p.nota : p.nota_promedio,
                evaluaciones: evaluacionesDeProyecto,
            };
        });

        res.json({
            grado: {
                id: grado.grado_id,
                nombre: gradoNombre,
                anio: grado.anio,
                nivel: grado.grado_nivel,
                bachillerato: grado.bachillerato,
                seccion: grado.seccion,
            },
            proyectos: proyectosConDatos,
        });
    } catch (err) {
        console.error('Error GET /admin/evaluaciones/grado/:gradoId:', err);
        return res.status(500).json({ mensaje: 'Error al obtener el reporte del grado' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN — CRUD PROYECTOS
// ══════════════════════════════════════════════════════════════════════════════

/** Crear proyecto en un grado */
app.post('/admin/proyectos', requireAuth, async (req, res) => {
    const { nombre, grado_id, nivel_id } = req.body;
    const { id: maestroId, rolId } = req.session.maestro;

    if (!nombre || !grado_id || !nivel_id) {
        return res.status(400).json({ mensaje: 'nombre, grado_id y nivel_id son requeridos' });
    }
    try {
        if (!(await canAccessGrade(maestroId, rolId, Number(grado_id)))) {
            return res.status(403).json({ mensaje: 'Sin acceso a este grado' });
        }
        const { rows } = await pool.query(
            `INSERT INTO evaluaciones.proyectos (nombre, grado_id, nivel_id)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [nombre, grado_id, nivel_id],
        );
        res.status(201).json({ proyecto: rows[0] });
    } catch (err) {
        console.error('Error POST /admin/proyectos:', err);
        return res.status(500).json({ mensaje: 'Error al crear proyecto' });
    }
});

/** Listar todos los proyectos (con grado y nivel para su visualización) */
app.get('/admin/proyectos', requireAuth, async (req, res) => {
    const { id: maestroId, rolId } = req.session.maestro;
    try {
        const base = `
      SELECT p.proyecto_id,
             p.nombre,
             p.nota,
             p.grado_id,
             p.nivel_id,
             n.nombre            AS nivel_nombre,
             ne.nombre           AS grado_nivel,
             b.bachillerato_id,
             b.nombre            AS bachillerato,
             s.letra             AS seccion,
             g.anio
      FROM evaluaciones.proyectos      p
      JOIN evaluaciones.niveles        n  ON p.nivel_id    = n.nivel_id
      JOIN principal.grados            g  ON p.grado_id    = g.grado_id
      JOIN principal.niveles_estudios ne  ON g.niveles_estudio_id = ne.niveles_estudios_id
      JOIN principal.bachilleratos     b  ON g.bachillerato_id   = b.bachillerato_id
      JOIN principal.secciones         s  ON g.seccion_id        = s.seccion_id
    `;
        const query =
            rolId === 1 || rolId === 2
                ? `${base} ORDER BY p.proyecto_id DESC`
                : `${base}
      JOIN principal.orientadores o ON g.grado_id = o.grado_id
      WHERE o.maestro_id = $1 AND o.activo = true
      ORDER BY p.proyecto_id DESC`;

        const { rows } = await pool.query(query, rolId === 1 || rolId === 2 ? [] : [maestroId]);

        const proyectos = rows.map((r) => ({
            ...r,
            displayGrade: buildGradeName(r.grado_nivel, r.bachillerato_id, r.seccion),
        }));
        res.json({ proyectos });
    } catch (err) {
        console.error('Error GET /admin/proyectos:', err);
        return res.status(500).json({ mensaje: 'Error al obtener proyectos' });
    }
});

/** Obtener un proyecto por ID */
app.get('/admin/proyectos/:id', requireAuth, async (req, res) => {
    const proyectoId = Number(req.params.id);
    const { id: maestroId, rolId } = req.session.maestro;
    if (!proyectoId) return res.status(400).json({ mensaje: 'proyectoId no válido' });
    try {
        const { rows } = await pool.query(
            `SELECT p.*,
                    n.nombre  AS nivel_nombre,
                    ne.nombre AS grado_nivel,
                    b.nombre  AS bachillerato,
                    b.bachillerato_id,
                    s.letra   AS seccion,
                    g.anio
             FROM evaluaciones.proyectos p
             JOIN evaluaciones.niveles   n  ON p.nivel_id          = n.nivel_id
             JOIN principal.grados       g  ON p.grado_id          = g.grado_id
             JOIN principal.niveles_estudios ne ON g.niveles_estudio_id = ne.niveles_estudios_id
             JOIN principal.bachilleratos b  ON g.bachillerato_id  = b.bachillerato_id
             JOIN principal.secciones     s  ON g.seccion_id       = s.seccion_id
             WHERE p.proyecto_id = $1`,
            [proyectoId],
        );
        if (rows.length === 0) return res.status(404).json({ mensaje: 'Proyecto no encontrado' });

        const proyecto = rows[0];
        if (!(await canAccessGrade(maestroId, rolId, proyecto.grado_id))) {
            return res.status(403).json({ mensaje: 'Sin acceso a este proyecto' });
        }
        proyecto.displayGrade = buildGradeName(proyecto.grado_nivel, proyecto.bachillerato_id, proyecto.seccion);
        res.json({ proyecto });
    } catch (err) {
        console.error('Error GET /admin/proyectos/:id:', err);
        return res.status(500).json({ mensaje: 'Error al obtener proyecto' });
    }
});

/** Actualizar nombre, nivel y/o grado de un proyecto */
app.put('/admin/proyectos/:id', requireAuth, async (req, res) => {
    const proyectoId = Number(req.params.id);
    const { nombre, nivel_id, grado_id } = req.body;
    const { id: maestroId, rolId } = req.session.maestro;
    if (!proyectoId) return res.status(400).json({ mensaje: 'proyectoId no válido' });
    if (!nombre && !nivel_id && !grado_id) return res.status(400).json({ mensaje: 'Nada que actualizar' });

    try {
        const { rows: check } = await pool.query('SELECT grado_id FROM evaluaciones.proyectos WHERE proyecto_id = $1', [
            proyectoId,
        ]);
        if (check.length === 0) return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
        if (!(await canAccessGrade(maestroId, rolId, check[0].grado_id))) {
            return res.status(403).json({ mensaje: 'Sin acceso a este proyecto' });
        }
        // Si cambia el grado, el maestro también debe tener acceso al nuevo grado.
        if (grado_id && Number(grado_id) !== Number(check[0].grado_id)) {
            if (!(await canAccessGrade(maestroId, rolId, Number(grado_id)))) {
                return res.status(403).json({ mensaje: 'Sin acceso al nuevo grado' });
            }
        }

        const sets = [];
        const values = [];
        let idx = 1;
        if (nombre) {
            sets.push(`nombre   = $${idx++}`);
            values.push(nombre);
        }
        if (nivel_id) {
            sets.push(`nivel_id = $${idx++}`);
            values.push(nivel_id);
        }
        if (grado_id) {
            sets.push(`grado_id = $${idx++}`);
            values.push(grado_id);
        }
        values.push(proyectoId);

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { rows } = await client.query(
                `UPDATE evaluaciones.proyectos SET ${sets.join(', ')} WHERE proyecto_id = $${idx} RETURNING *`,
                values,
            );
            // Si cambió el grado, los alumnos inscritos que no pertenezcan al
            // nuevo grado dejan de estar en el proyecto (sus evaluaciones se
            // eliminan en cascada por la FK de evaluación → estudiante).
            let eliminados = 0;
            if (grado_id && Number(grado_id) !== Number(check[0].grado_id)) {
                const resDel = await client.query(
                    `DELETE FROM evaluaciones.estudiantes es
                     USING principal.estudiantes ps
                     WHERE es.grado_id = ps.estudiante_id
                       AND es.proyecto_id = $1
                       AND ps.grado_id <> $2`,
                    [proyectoId, grado_id],
                );
                eliminados = resDel.rowCount;
            }
            await client.query('COMMIT');
            res.json({ proyecto: rows[0], alumnosEliminados: eliminados });
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Error PUT /admin/proyectos/:id:', err);
        return res.status(500).json({ mensaje: 'Error al actualizar proyecto' });
    }
});

/** Eliminar proyecto y todo lo relacionado (evaluaciones, criterios, estudiantes del proyecto) */
app.delete('/admin/proyectos/:id', requireAuth, async (req, res) => {
    const proyectoId = Number(req.params.id);
    const { id: maestroId, rolId } = req.session.maestro;
    if (!proyectoId) return res.status(400).json({ mensaje: 'proyectoId no válido' });

    const client = await pool.connect();
    try {
        const { rows: check } = await client.query(
            'SELECT grado_id FROM evaluaciones.proyectos WHERE proyecto_id = $1',
            [proyectoId],
        );
        if (check.length === 0) return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
        if (!(await canAccessGrade(maestroId, rolId, check[0].grado_id))) {
            return res.status(403).json({ mensaje: 'Sin acceso a este proyecto' });
        }

        await client.query('BEGIN');
        // 1. Criterios de evaluaciones
        await client.query(
            `DELETE FROM evaluaciones.evaluacion_criterios
             WHERE evaluacion_id IN (
                 SELECT evaluacion_id
                 FROM evaluaciones.evaluaciones
                 WHERE proyecto_id = $1
             )`,
            [proyectoId],
        );
        // 2. Evaluaciones
        await client.query('DELETE FROM evaluaciones.evaluaciones WHERE proyecto_id = $1', [proyectoId]);
        // 3. Estudiantes del proyecto
        await client.query('DELETE FROM evaluaciones.estudiantes WHERE proyecto_id = $1', [proyectoId]);
        // 4. Proyecto
        await client.query('DELETE FROM evaluaciones.proyectos WHERE proyecto_id = $1', [proyectoId]);
        await client.query('COMMIT');
        res.json({ mensaje: 'Proyecto eliminado correctamente' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error DELETE /admin/proyectos/:id:', err);
        return res.status(500).json({ mensaje: 'Error al eliminar proyecto' });
    } finally {
        client.release();
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN — ESTUDIANTES EN PROYECTO
// ══════════════════════════════════════════════════════════════════════════════

/** Lista de estudiantes asignados al proyecto */
app.get('/admin/proyectos/:proyectoId/estudiantes', requireAuth, async (req, res) => {
    const proyectoId = Number(req.params.proyectoId);
    const { id: maestroId, rolId } = req.session.maestro;
    if (!proyectoId) return res.status(400).json({ mensaje: 'proyectoId no válido' });
    try {
        const { rows: check } = await pool.query('SELECT grado_id FROM evaluaciones.proyectos WHERE proyecto_id = $1', [
            proyectoId,
        ]);
        if (check.length === 0) return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
        if (!(await canAccessGrade(maestroId, rolId, check[0].grado_id))) {
            return res.status(403).json({ mensaje: 'Sin acceso' });
        }
        const { rows } = await pool.query(
            `SELECT es.estudiante_id,
                    es.asistencia,
                    ps.estudiante_id AS principal_estudiante_id,
                    ps.grado_id      AS grado_estudiante,
                    ps.nombre_completo,
                    ps.nie
             FROM evaluaciones.estudiantes es
             JOIN principal.estudiantes     ps ON es.grado_id = ps.estudiante_id
             WHERE es.proyecto_id = $1
             ORDER BY ps.nombre_completo`,
            [proyectoId],
        );
        res.json({ estudiantes: rows });
    } catch (err) {
        console.error('Error GET /admin/proyectos/:proyectoId/estudiantes:', err);
        return res.status(500).json({ mensaje: 'Error al obtener estudiantes del proyecto' });
    }
});

/**
 * Agregar estudiante(s) a un proyecto.
 * Body: { estudianteIds: [principal.estudiantes.estudiante_id, ...] }
 */
app.post('/admin/proyectos/:proyectoId/estudiantes', requireAuth, async (req, res) => {
    const proyectoId = Number(req.params.proyectoId);
    const { estudianteIds } = req.body;
    const { id: maestroId, rolId } = req.session.maestro;

    if (!proyectoId) return res.status(400).json({ mensaje: 'proyectoId no válido' });
    if (!Array.isArray(estudianteIds) || estudianteIds.length === 0) {
        return res.status(400).json({ mensaje: 'estudianteIds debe ser un arreglo no vacío' });
    }

    const client = await pool.connect();
    try {
        const { rows: check } = await client.query(
            'SELECT grado_id FROM evaluaciones.proyectos WHERE proyecto_id = $1',
            [proyectoId],
        );
        if (check.length === 0) return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
        if (!(await canAccessGrade(maestroId, rolId, check[0].grado_id))) {
            return res.status(403).json({ mensaje: 'Sin acceso' });
        }

        await client.query('BEGIN');
        let agregados = 0;
        for (const estId of estudianteIds) {
            // Verificar que el estudiante pertenezca al grado del proyecto
            const { rows: valid } = await client.query(
                `SELECT 1 FROM principal.estudiantes
                 WHERE estudiante_id = $1 AND grado_id = $2 AND estado = true`,
                [estId, check[0].grado_id],
            );
            if (valid.length === 0) continue; // no pertenece al grado → saltar

            // Evitar duplicados
            const { rows: dup } = await client.query(
                `SELECT 1 FROM evaluaciones.estudiantes
                 WHERE proyecto_id = $1 AND grado_id = $2`,
                [proyectoId, estId],
            );
            if (dup.length > 0) continue;

            await client.query(
                `INSERT INTO evaluaciones.estudiantes (proyecto_id, grado_id)
                 VALUES ($1, $2)`,
                [proyectoId, estId],
            );
            agregados++;
        }
        await client.query('COMMIT');
        res.status(201).json({ mensaje: `${agregados} estudiante(s) agregado(s)` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error POST /admin/proyectos/:proyectoId/estudiantes:', err);
        return res.status(500).json({ mensaje: 'Error al agregar estudiantes' });
    } finally {
        client.release();
    }
});

/**
 * Remover un estudiante de un proyecto.
 * :estudianteId = evaluaciones.estudiantes.estudiante_id (PK de esa tabla)
 */
app.delete('/admin/proyectos/:proyectoId/estudiantes/:estudianteId', requireAuth, async (req, res) => {
    const proyectoId = Number(req.params.proyectoId);
    const estudianteId = Number(req.params.estudianteId);
    const { id: maestroId, rolId } = req.session.maestro;

    if (!proyectoId || !estudianteId) {
        return res.status(400).json({ mensaje: 'IDs no válidos' });
    }
    try {
        const { rows: check } = await pool.query('SELECT grado_id FROM evaluaciones.proyectos WHERE proyecto_id = $1', [
            proyectoId,
        ]);
        if (check.length === 0) return res.status(404).json({ mensaje: 'Proyecto no encontrado' });
        if (!(await canAccessGrade(maestroId, rolId, check[0].grado_id))) {
            return res.status(403).json({ mensaje: 'Sin acceso' });
        }
        const { rowCount } = await pool.query(
            `DELETE FROM evaluaciones.estudiantes
             WHERE estudiante_id = $1 AND proyecto_id = $2`,
            [estudianteId, proyectoId],
        );
        if (rowCount === 0) return res.status(404).json({ mensaje: 'Estudiante no encontrado en el proyecto' });
        res.json({ mensaje: 'Estudiante removido del proyecto' });
    } catch (err) {
        console.error('Error DELETE /admin/proyectos/:proyectoId/estudiantes/:estudianteId:', err);
        return res.status(500).json({ mensaje: 'Error al remover estudiante' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN — CRUD MAESTROS  (solo director)
// ══════════════════════════════════════════════════════════════════════════════

/** Listar todos los maestros */
app.get('/admin/maestros', requireDirector, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT m.maestro_id,
                    m.nombre,
                    m.rol_id,
                    r.nombre         AS rol_nombre,
                    m.activo,
                    m.creado_en,
                    mat.nombre_materia,
                    t.nombre         AS turno_nombre
             FROM principal.maestros     m
             JOIN principal.roles        r   ON m.rol_id     = r.rol_id
             LEFT JOIN principal.materias mat ON m.materia_id = mat.materia_id
             LEFT JOIN principal.turnos  t   ON m.turno_id   = t.turno_id
             ORDER BY m.nombre`,
        );
        res.json({ maestros: rows });
    } catch (err) {
        console.error('Error GET /admin/maestros:', err);
        return res.status(500).json({ mensaje: 'Error al obtener maestros' });
    }
});

/** Crear maestro (contraseña por defecto: 1NS4L2026) */
app.post('/admin/maestros', requireDirector, async (req, res) => {
    const { nombre, contrasena, rol_id, materia_id, turno_id } = req.body;
    if (!nombre || !rol_id) {
        return res.status(400).json({ mensaje: 'nombre y rol_id son requeridos' });
    }
    try {
        const hash = await bcrypt.hash(contrasena || '1NS4L2026', 10);
        const { rows } = await pool.query(
            `INSERT INTO principal.maestros (nombre, contrasena, rol_id, materia_id, turno_id, activo)
             VALUES ($1, $2, $3, $4, $5, true)
             RETURNING maestro_id, nombre, rol_id, activo`,
            [nombre, hash, rol_id, materia_id || null, turno_id || null],
        );
        res.status(201).json({ maestro: rows[0] });
    } catch (err) {
        console.error('Error POST /admin/maestros:', err);
        return res.status(500).json({ mensaje: 'Error al crear maestro' });
    }
});

/** Actualizar datos de un maestro */
app.put('/admin/maestros/:id', requireDirector, async (req, res) => {
    const maestroId = Number(req.params.id);
    const { nombre, contrasena, rol_id, materia_id, turno_id, activo } = req.body;
    if (!maestroId) return res.status(400).json({ mensaje: 'maestroId no válido' });

    try {
        const sets = [];
        const values = [];
        let idx = 1;

        if (nombre !== undefined) {
            sets.push(`nombre     = $${idx++}`);
            values.push(nombre);
        }
        if (contrasena) {
            const hash = await bcrypt.hash(contrasena, 10);
            sets.push(`contrasena = $${idx++}`);
            values.push(hash);
        }
        if (rol_id !== undefined) {
            sets.push(`rol_id     = $${idx++}`);
            values.push(rol_id);
        }
        if (materia_id !== undefined) {
            sets.push(`materia_id = $${idx++}`);
            values.push(materia_id || null);
        }
        if (turno_id !== undefined) {
            sets.push(`turno_id   = $${idx++}`);
            values.push(turno_id || null);
        }
        if (activo !== undefined) {
            sets.push(`activo     = $${idx++}`);
            values.push(activo);
        }

        if (sets.length === 0) return res.status(400).json({ mensaje: 'Nada que actualizar' });

        values.push(maestroId);
        const { rows } = await pool.query(
            `UPDATE principal.maestros SET ${sets.join(', ')} WHERE maestro_id = $${idx}
             RETURNING maestro_id, nombre, rol_id, activo`,
            values,
        );
        if (rows.length === 0) return res.status(404).json({ mensaje: 'Maestro no encontrado' });
        res.json({ maestro: rows[0] });
    } catch (err) {
        console.error('Error PUT /admin/maestros/:id:', err);
        return res.status(500).json({ mensaje: 'Error al actualizar maestro' });
    }
});

/** Desactivar maestro (soft delete) */
app.delete('/admin/maestros/:id', requireDirector, async (req, res) => {
    const maestroId = Number(req.params.id);
    if (!maestroId) return res.status(400).json({ mensaje: 'maestroId no válido' });
    try {
        const { rows } = await pool.query(
            `UPDATE principal.maestros SET activo = false WHERE maestro_id = $1
             RETURNING maestro_id, nombre`,
            [maestroId],
        );
        if (rows.length === 0) return res.status(404).json({ mensaje: 'Maestro no encontrado' });
        res.json({ mensaje: 'Maestro desactivado', maestro: rows[0] });
    } catch (err) {
        console.error('Error DELETE /admin/maestros/:id:', err);
        return res.status(500).json({ mensaje: 'Error al desactivar maestro' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  ADMIN — ORIENTADORES  (solo director)
// ══════════════════════════════════════════════════════════════════════════════

/** Listar orientadores activos */
app.get('/admin/orientadores', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT o.orientador_id,
                    o.maestro_id,
                    m.nombre        AS maestro_nombre,
                    o.grado_id,
                    ne.nombre       AS nivel_nombre,
                    b.nombre        AS bachillerato,
                    b.bachillerato_id,
                    s.letra         AS seccion,
                    g.anio,
                    o.anio_escolar,
                    o.activo
             FROM principal.orientadores     o
             JOIN principal.maestros         m  ON o.maestro_id         = m.maestro_id
             JOIN principal.grados           g  ON o.grado_id           = g.grado_id
             JOIN principal.niveles_estudios ne ON g.niveles_estudio_id = ne.niveles_estudios_id
             JOIN principal.bachilleratos    b  ON g.bachillerato_id    = b.bachillerato_id
             JOIN principal.secciones        s  ON g.seccion_id         = s.seccion_id
             WHERE o.activo = true
             ORDER BY g.anio, ne.nombre, b.nombre, s.letra`,
        );
        const orientadores = rows.map((r) => ({
            ...r,
            displayGrade: buildGradeName(r.nivel_nombre, r.bachillerato_id, r.seccion),
        }));
        res.json({ orientadores });
    } catch (err) {
        console.error('Error GET /admin/orientadores:', err);
        return res.status(500).json({ mensaje: 'Error al obtener orientadores' });
    }
});

/** Asignar orientador a un grado (desactiva el anterior para ese grado/año) */
app.post('/admin/orientadores', requireDirector, async (req, res) => {
    const { maestro_id, grado_id, anio_escolar } = req.body;
    if (!maestro_id || !grado_id || !anio_escolar) {
        return res.status(400).json({ mensaje: 'maestro_id, grado_id y anio_escolar son requeridos' });
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Desactivar orientador previo del grado/año
        await client.query(
            `UPDATE principal.orientadores SET activo = false
             WHERE grado_id = $1 AND anio_escolar = $2`,
            [grado_id, anio_escolar],
        );
        const { rows } = await client.query(
            `INSERT INTO principal.orientadores (maestro_id, grado_id, anio_escolar, activo)
             VALUES ($1, $2, $3, true)
             RETURNING *`,
            [maestro_id, grado_id, anio_escolar],
        );
        await client.query('COMMIT');
        res.status(201).json({ orientador: rows[0] });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error POST /admin/orientadores:', err);
        return res.status(500).json({ mensaje: 'Error al asignar orientador' });
    } finally {
        client.release();
    }
});

/** Desactivar orientador */
app.delete('/admin/orientadores/:id', requireDirector, async (req, res) => {
    const orientadorId = Number(req.params.id);
    if (!orientadorId) return res.status(400).json({ mensaje: 'orientadorId no válido' });
    try {
        const { rows } = await pool.query(
            `UPDATE principal.orientadores SET activo = false WHERE orientador_id = $1
             RETURNING orientador_id`,
            [orientadorId],
        );
        if (rows.length === 0) return res.status(404).json({ mensaje: 'Orientador no encontrado' });
        res.json({ mensaje: 'Orientador desactivado' });
    } catch (err) {
        console.error('Error DELETE /admin/orientadores/:id:', err);
        return res.status(500).json({ mensaje: 'Error al desactivar orientador' });
    }
});

// ══════════════════════════════════════════════════════════════════════════════
//  UTILIDADES (catálogos)
// ══════════════════════════════════════════════════════════════════════════════

app.get('/admin/niveles-evaluacion', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT nivel_id, nombre, descripcion FROM evaluaciones.niveles ORDER BY nivel_id DESC',
        );
        res.json({ niveles: rows });
    } catch (err) {
        return res.status(500).json({ mensaje: 'Error al obtener niveles de evaluación' });
    }
});

/** Crear un nivel de evaluación */
app.post('/admin/niveles-evaluacion', requireAuth, evitarSubmitDuplicado(), async (req, res) => {
    const { nombre, descripcion } = req.body;
    if (!nombre) {
        return res.status(400).json({ mensaje: 'nombre es requerido' });
    }
    try {
        const { rows } = await pool.query(
            `INSERT INTO evaluaciones.niveles (nombre, descripcion)
             VALUES ($1, $2)
             RETURNING nivel_id, nombre, descripcion`,
            [nombre, descripcion || null],
        );
        res.status(201).json({ nivel: rows[0] });
    } catch (err) {
        console.error('Error POST /admin/niveles-evaluacion:', err);
        return res.status(500).json({ mensaje: 'Error al crear nivel' });
    }
});

/** Actualizar nombre y/o descripción de un nivel de evaluación */
app.put('/admin/niveles-evaluacion/:id', requireAuth, async (req, res) => {
    const nivelId = Number(req.params.id);
    const { nombre, descripcion } = req.body;
    if (!nivelId) {
        return res.status(400).json({ mensaje: 'nivelId no válido' });
    }
    try {
        const sets = [];
        const values = [];
        let idx = 1;
        if (nombre !== undefined) {
            sets.push(`nombre      = $${idx++}`);
            values.push(nombre);
        }
        if (descripcion !== undefined) {
            sets.push(`descripcion = $${idx++}`);
            values.push(descripcion);
        }
        if (sets.length === 0) {
            return res.status(400).json({ mensaje: 'Nada que actualizar' });
        }
        values.push(nivelId);
        const { rows } = await pool.query(
            `UPDATE evaluaciones.niveles
             SET ${sets.join(', ')}
             WHERE nivel_id = $${idx}
             RETURNING nivel_id, nombre, descripcion`,
            values,
        );
        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Nivel no encontrado' });
        }
        res.json({ nivel: rows[0] });
    } catch (err) {
        console.error('Error PUT /admin/niveles-evaluacion/:id:', err);
        return res.status(500).json({ mensaje: 'Error al actualizar nivel' });
    }
});

/** Eliminar un nivel de evaluación */
app.delete('/admin/niveles-evaluacion/:id', requireAuth, async (req, res) => {
    const nivelId = Number(req.params.id);
    if (!nivelId) {
        return res.status(400).json({ mensaje: 'nivelId no válido' });
    }
    try {
        const { rows } = await pool.query(
            `DELETE FROM evaluaciones.niveles
             WHERE nivel_id = $1
             RETURNING nivel_id`,
            [nivelId],
        );
        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Nivel no encontrado' });
        }
        res.json({ mensaje: 'Nivel eliminado correctamente' });
    } catch (err) {
        console.error('Error DELETE /admin/niveles-evaluacion/:id:', err);
        if (err.code === '23503') {
            return res.status(409).json({
                mensaje: 'No se puede eliminar: el nivel tiene datos relacionados',
            });
        }
        return res.status(500).json({ mensaje: 'Error al eliminar nivel' });
    }
});

// ══════════════════════════════════════════════════════════════
//  ADMIN — CRUD CRITERIOS
// ══════════════════════════════════════════════════════════════

/** Obtener una rúbrica (nivel) por ID para el encabezado del editor */
app.get('/admin/niveles/:id', requireAuth, async (req, res) => {
    const nivelId = Number(req.params.id);
    if (!nivelId) {
        return res.status(400).json({ mensaje: 'nivelId no válido' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT nivel_id, nombre, descripcion
             FROM evaluaciones.niveles
             WHERE nivel_id = $1`,
            [nivelId],
        );
        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Rúbrica no encontrada' });
        }
        res.json({ nivel: rows[0] });
    } catch (err) {
        console.error('Error GET /admin/niveles/:id:', err);
        return res.status(500).json({ mensaje: 'Error al obtener la rúbrica' });
    }
});

/** Listar criterios de una rúbrica (nivel) */
app.get('/admin/niveles/:id/criterios', requireAuth, async (req, res) => {
    const nivelId = Number(req.params.id);
    if (!nivelId) {
        return res.status(400).json({ mensaje: 'nivelId no válido' });
    }
    try {
        const { rows } = await pool.query(
            `SELECT criterio_id, nombre, descripcion, porcentaje
             FROM evaluaciones.criterios
             WHERE nivel_id = $1
             ORDER BY criterio_id`,
            [nivelId],
        );
        res.json({ criterios: rows });
    } catch (err) {
        console.error('Error GET /admin/niveles/:id/criterios:', err);
        return res.status(500).json({ mensaje: 'Error al obtener criterios' });
    }
});

/** Crear un criterio dentro de una rúbrica */
app.post('/admin/niveles/:id/criterios', requireAuth, evitarSubmitDuplicado(), async (req, res) => {
    const nivelId = Number(req.params.id);
    const { nombre, descripcion, porcentaje } = req.body;
    if (!nivelId) {
        return res.status(400).json({ mensaje: 'nivelId no válido' });
    }
    if (!nombre || String(nombre).trim() === '') {
        return res.status(400).json({ mensaje: 'El nombre del criterio es requerido' });
    }
    const porc = Number(porcentaje);
    if (!Number.isFinite(porc) || porc < 1 || porc > 100) {
        return res.status(400).json({ mensaje: 'La ponderación debe estar entre 1 y 100' });
    }
    try {
        const { rows } = await pool.query(
            `INSERT INTO evaluaciones.criterios (nivel_id, nombre, descripcion, porcentaje)
             VALUES ($1, $2, $3, $4)
             RETURNING criterio_id, nombre, descripcion, porcentaje`,
            [nivelId, String(nombre).trim(), descripcion || null, porc],
        );
        res.status(201).json({ criterio: rows[0] });
    } catch (err) {
        console.error('Error POST /admin/niveles/:id/criterios:', err);
        return res.status(500).json({ mensaje: 'Error al crear criterio' });
    }
});

/** Editar un criterio (nombre y/o descripción y/o ponderación) */
app.put('/admin/criterios/:id', requireAuth, async (req, res) => {
    const criterioId = Number(req.params.id);
    const { nombre, descripcion, porcentaje } = req.body;
    if (!criterioId) {
        return res.status(400).json({ mensaje: 'criterioId no válido' });
    }
    try {
        const sets = [];
        const values = [];
        let idx = 1;

        if (nombre !== undefined) {
            if (String(nombre).trim() === '') {
                return res.status(400).json({ mensaje: 'El nombre no puede estar vacío' });
            }
            sets.push(`nombre      = $${idx++}`);
            values.push(String(nombre).trim());
        }
        if (descripcion !== undefined) {
            sets.push(`descripcion = $${idx++}`);
            values.push(descripcion || null);
        }
        if (porcentaje !== undefined) {
            const porc = Number(porcentaje);
            if (!Number.isFinite(porc) || porc < 1 || porc > 100) {
                return res.status(400).json({ mensaje: 'La ponderación debe estar entre 1 y 100' });
            }
            sets.push(`porcentaje  = $${idx++}`);
            values.push(porc);
        }

        if (sets.length === 0) {
            return res.status(400).json({ mensaje: 'Nada que actualizar' });
        }

        values.push(criterioId);
        const { rows } = await pool.query(
            `UPDATE evaluaciones.criterios
             SET ${sets.join(', ')}
             WHERE criterio_id = $${idx}
             RETURNING criterio_id, nombre, descripcion, porcentaje`,
            values,
        );
        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Criterio no encontrado' });
        }
        res.json({ criterio: rows[0] });
    } catch (err) {
        console.error('Error PUT /admin/criterios/:id:', err);
        return res.status(500).json({ mensaje: 'Error al actualizar criterio' });
    }
});

/** Eliminar un criterio */
app.delete('/admin/criterios/:id', requireAuth, async (req, res) => {
    const criterioId = Number(req.params.id);
    if (!criterioId) {
        return res.status(400).json({ mensaje: 'criterioId no válido' });
    }
    try {
        const { rows } = await pool.query(
            `DELETE FROM evaluaciones.criterios
             WHERE criterio_id = $1
             RETURNING criterio_id`,
            [criterioId],
        );
        if (rows.length === 0) {
            return res.status(404).json({ mensaje: 'Criterio no encontrado' });
        }
        res.json({ mensaje: 'Criterio eliminado correctamente' });
    } catch (err) {
        console.error('Error DELETE /admin/criterios/:id:', err);
        if (err.code === '23503') {
            return res.status(409).json({
                mensaje: 'No se puede eliminar: el criterio tiene evaluaciones relacionadas',
            });
        }
        return res.status(500).json({ mensaje: 'Error al eliminar criterio' });
    }
});

app.get('/admin/roles', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT rol_id, nombre FROM principal.roles WHERE estado = true ORDER BY rol_id',
        );
        res.json({ roles: rows });
    } catch (err) {
        return res.status(500).json({ mensaje: 'Error al obtener roles' });
    }
});

app.get('/admin/bachilleratos', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT bachillerato_id, nombre FROM principal.bachilleratos ORDER BY bachillerato_id',
        );
        const bachilleratos = rows.map((r) => ({
            ...r,
            abrev: BACH_ABREV[r.bachillerato_id] || '?',
        }));
        res.json({ bachilleratos });
    } catch (err) {
        return res.status(500).json({ mensaje: 'Error al obtener bachilleratos' });
    }
});

app.get('/admin/turnos', requireAuth, async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT turno_id, nombre FROM principal.turnos ORDER BY turno_id');
        res.json({ turnos: rows });
    } catch (err) {
        return res.status(500).json({ mensaje: 'Error al obtener turnos' });
    }
});

// ruta para cualquier ruta no definida
app.get('/{*splat}', (req, res) => {
    if (req.session.maestro || req.session.datosEvaluador) {
        console.log('Sesión activa, redirigiendo a /menu');
        return res.redirect('/menu');
    } else {
        console.log('No hay sesión activa, redirigiendo a /login');
        res.redirect('/login');
    }
});

// ─── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor corriendo en http://0.0.0.0:${PORT}`);
});
