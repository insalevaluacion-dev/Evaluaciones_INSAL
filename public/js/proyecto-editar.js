// ═══════════════════════════════════════════════════════════════
// MÓDULO: Editar proyecto (vista /menu/proyectos/:id)
//  Carga y edita los datos reales del proyecto y sus alumnos:
//   - GET    /admin/proyectos/:id                          → encabezado + datos
//   - PUT    /admin/proyectos/:id                          → guardar cambios
//   - DELETE /admin/proyectos/:id                          → eliminar proyecto
//   - GET    /admin/niveles-evaluacion                     → rúbricas (select)
//   - GET    /admin/grados                                 → grados (select)
//   - GET/POST/DELETE /admin/proyectos/:pid/estudiantes    → alumnos
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';
import { createSubmitHandler } from './submitHandler.js';
import { confirmarAccion } from './editar-criterios.js';
import { plural } from './texto.js';

// ═══════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════

let proyectoId = null;
let proyectoActual = null;      // último GET /admin/proyectos/:id
let estudiantesProyecto = [];   // alumnos inscritos en el proyecto (BD)
let pendientesAgregar = [];     // alumnos añadidos localmente (sin guardar)
// PK de evaluaciones.estudiantes → 'manual' | 'grado'
let pendientesQuitar = new Map();
let proyectoGradoPendiente = null; // grado nuevo seleccionado (aún sin guardar)
let gradosCacheEditar = [];       // catálogo de grados para la cascada
let formDirty = false;            // ¿algún campo del formulario fue editado?

/** Lee el id del proyecto desde el data-attribute de la vista (o de la URL). */
function getProyectoId() {
    const root = document.querySelector('.contenedor-criterios[data-proyecto-id]');
    if (root?.dataset?.proyectoId) return root.dataset.proyectoId;
    const m = location.pathname.match(/^\/menu\/proyectos\/(\d+)$/);
    return m ? m[1] : null;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

async function fetchJson(url, opciones = {}) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...opciones,
    });
    let data = null;
    try {
        data = await res.json();
    } catch {
        data = null;
    }
    if (!res.ok) {
        throw new Error(data?.mensaje || `Error ${res.status} al consultar el servidor`);
    }
    return data;
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Establece el valor de un <select> y dispara 'change' (sincroniza el custom-select). */
function establecerValorSelect(id, valor) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.value = String(valor);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Rellena un <select> con opciones {value, label, search?}. */
function poblarSelect(id, opciones, etiquetaVacia) {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    const vacia = document.createElement('option');
    vacia.value = '';
    vacia.textContent = etiquetaVacia;
    vacia.disabled = true;
    vacia.hidden = true;
    vacia.selected = true;
    sel.appendChild(vacia);
    opciones.forEach(({ value, label, search }) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = label;
        if (search) opt.dataset.search = search;
        sel.appendChild(opt);
    });
}

// ═══════════════════════════════════════════════════════════════
// CASCADA GRADO → ESPECIALIDAD → SECCIÓN
//  Misma mecánica que el dialog de crear/editar proyecto (proyectos.js):
//  tres selects dependientes cuyo resultado resuelve el grado_id real
//  que se guarda en el campo oculto #editar-proyecto-grado-id.
// ═══════════════════════════════════════════════════════════════

/** Etiqueta legible de una sección ("Sección A" / "Sección A (turno)" si hay ambigüedad). */
function etiquetaSeccionEditar(grado) {
    const base = `Sección ${grado.seccion}`;
    const coincidencias = gradosCacheEditar.filter(
        (g) => g.nivel_nombre === grado.nivel_nombre &&
            String(g.bachillerato_id) === String(grado.bachillerato_id) &&
            g.seccion === grado.seccion,
    );
    return coincidencias.length > 1 && grado.turno ? `${base} (${grado.turno})` : base;
}

/** Resuelve el grado_id real a partir de los tres selects ('' si falta alguno). */
function resolverGradoIdEditar() {
    const nivel = document.getElementById('editar-proyecto-grado-nivel')?.value || '';
    const esp = document.getElementById('editar-proyecto-grado-esp')?.value || '';
    const seccion = document.getElementById('editar-proyecto-grado')?.value || '';
    if (!nivel || !esp || !seccion) return '';
    const grado = gradosCacheEditar.find(
        (g) => g.nivel_nombre === nivel &&
            g.bachillerato_nombre === esp &&
            etiquetaSeccionEditar(g) === seccion,
    );
    return grado ? String(grado.grado_id) : '';
}

/** Guarda el grado_id resuelto en el campo oculto que espera el backend. */
function sincronizarGradoIdEditar() {
    const hidden = document.getElementById('editar-proyecto-grado-id');
    if (hidden) hidden.value = resolverGradoIdEditar();
}

/**
 * Reacciona a un cambio completo de la cascada: si el grado resuelto es
 * distinto al del proyecto, recalcula los alumnos (mismo flujo que antes).
 * Los estados intermedios (grado sin sección, etc.) se ignoran.
 */
function onCambioGradoCascade() {
    const id = resolverGradoIdEditar();
    if (!id) return;
    if (Number(id) === Number(proyectoActual?.grado_id)) return;
    aplicarCambioGrado(id);
}

/** Configura los tres selects dependientes (una sola vez por DOM). */
function configurarCascadeEditar(grados) {
    const selGrado = document.getElementById('editar-proyecto-grado-nivel');
    const selEsp = document.getElementById('editar-proyecto-grado-esp');
    const selSeccion = document.getElementById('editar-proyecto-grado');
    if (!selGrado || !selEsp || !selSeccion) return;
    if (selGrado.dataset.cascadeInit === 'true') return;
    selGrado.dataset.cascadeInit = 'true';

    // Nivel 1: grados (niveles de estudio) disponibles
    poblarSelect(
        'editar-proyecto-grado-nivel',
        [...new Set(grados.map((g) => g.nivel_nombre).filter(Boolean))]
            .map((n) => ({ value: n, label: n })),
        'Selecciona un grado',
    );

    // Nivel 2: especialidades del grado elegido
    const repoblarEspecialidades = () => {
        const nivel = selGrado.value;
        const nombres = [...new Set(grados
            .filter((g) => g.nivel_nombre === nivel)
            .map((g) => g.bachillerato_nombre)
            .filter(Boolean))];
        poblarSelect(
            'editar-proyecto-grado-esp',
            nombres.map((n) => ({ value: n, label: n })),
            'Selecciona una especialidad',
        );
        selEsp.disabled = !nivel;
        if (!nombres.includes(selEsp.value)) {
            selEsp.value = '';
            poblarSelect('editar-proyecto-grado', [], 'Selecciona una sección');
            selSeccion.disabled = true;
        }
        sincronizarGradoIdEditar();
        onCambioGradoCascade();
    };

    // Nivel 3: secciones del grado + especialidad elegidos
    const repoblarSecciones = () => {
        const nivel = selGrado.value;
        const esp = selEsp.value;
        const etiquetas = nivel && esp
            ? [...new Set(grados
                .filter((g) => g.nivel_nombre === nivel && g.bachillerato_nombre === esp)
                .map((g) => etiquetaSeccionEditar(g)))]
            : [];
        poblarSelect(
            'editar-proyecto-grado',
            etiquetas.map((n) => ({ value: n, label: n })),
            'Selecciona una sección',
        );
        selSeccion.disabled = !esp;
        if (!etiquetas.includes(selSeccion.value)) selSeccion.value = '';
        sincronizarGradoIdEditar();
        onCambioGradoCascade();
    };

    selGrado.addEventListener('change', repoblarEspecialidades);
    selEsp.addEventListener('change', repoblarSecciones);
    selSeccion.addEventListener('change', () => {
        sincronizarGradoIdEditar();
        onCambioGradoCascade();
    });

    repoblarEspecialidades();
}

/** Preselecciona la cascada con el grado actual del proyecto. */
function preseleccionarGradoEditar(gradoId) {
    const grado = gradosCacheEditar.find((g) => String(g.grado_id) === String(gradoId));
    if (!grado) return;
    establecerValorSelect('editar-proyecto-grado-nivel', grado.nivel_nombre);
    establecerValorSelect('editar-proyecto-grado-esp', grado.bachillerato_nombre);
    establecerValorSelect('editar-proyecto-grado', etiquetaSeccionEditar(grado));
    sincronizarGradoIdEditar();
}

// ═══════════════════════════════════════════════════════════════
// CARGA INICIAL DE LA VISTA
// ═══════════════════════════════════════════════════════════════

/** Pinta el encabezado con los datos del proyecto. */
function renderEncabezado(proyecto) {
    const nombreEl = document.getElementById('detalle-proyecto-nombre');
    const subEl = document.getElementById('detalle-proyecto-sub');

    if (nombreEl) nombreEl.textContent = proyecto.nombre || 'Proyecto sin nombre';
    if (subEl) {
        const partes = [];
        if (proyecto.displayGrade) partes.push(proyecto.displayGrade);
        if (proyecto.anio) partes.push(`Año ${proyecto.anio}`);
        subEl.textContent = partes.join(' · ');
    }
}

/** Actualiza el indicador de sincronización de la cabecera. */
function renderEstadoSincronizacion() {
    const estado = document.getElementById('estado-sincronizacion');
    if (!estado) return;

    const pendiente = formDirty || hayCambiosAlumnos();
    const texto = estado.querySelector('.estado-sincronizacion__texto');
    const icono = estado.querySelector('.material-symbols-rounded');

    estado.classList.toggle('estado-sincronizacion--pendiente', pendiente);
    estado.classList.toggle('estado-sincronizacion--ok', !pendiente);
    estado.classList.remove('estado-sincronizacion--cargando');

    if (texto) texto.textContent = pendiente ? 'Cambios sin guardar' : 'Todo sincronizado';
    if (icono) icono.textContent = pendiente ? 'cloud_upload' : 'cloud_done';
}

/** Marca "Cambios sin guardar" cuando se edita cualquier campo del formulario. */
function initDetectorCambios() {
    const form = document.getElementById('form-editar-proyecto');
    if (!form || form.dataset.syncInit === 'true') return;
    form.dataset.syncInit = 'true';

    // Solo campos con name (los reales del proyecto): el select de alumnos y
    // los buscadores del custom-select no cuentan como edición de datos.
    form.querySelectorAll('input[name], select[name]').forEach((campo) => {
        campo.addEventListener('input', () => {
            formDirty = true;
            actualizarEstadoGlobal();
        });
        campo.addEventListener('change', () => {
            formDirty = true;
            actualizarEstadoGlobal();
        });
    });
}

/** Contador de caracteres del campo nombre (mismo patrón que proyectos.js). */
function initContadorNombre() {
    const input = document.getElementById('editar-proyecto-nombre');
    const counter = document.querySelector('.char-counter[data-for="editar-proyecto-nombre"]');
    if (!input || !counter || input.dataset.contadorInit === 'true') return;
    input.dataset.contadorInit = 'true';

    const max = parseInt(input.getAttribute('maxlength'), 10) || 0;
    counter.textContent = `${input.value.length}/${max}`;

    input.addEventListener('input', () => {
        const len = input.value.length;
        counter.textContent = `${len}/${max}`;
        counter.classList.toggle('char-counter--warn', len >= max * 0.8 && len < max);
        counter.classList.toggle('char-counter--limit', len >= max);
    });
}

/** Carga proyecto + rúbricas + grados y pinta la vista completa. */
async function cargarVista() {
    if (!proyectoId) return;

    // Evitar doble carga (DOMContentLoaded + contentUpdated)
    const root = document.querySelector('.contenedor-criterios[data-proyecto-id]');
    if (!root || root.dataset.iniciado === 'true') return;
    root.dataset.iniciado = 'true';

    try {
        const [proyectoData, nivelesData, gradosData] = await Promise.all([
            fetchJson(`/admin/proyectos/${proyectoId}`),
            fetchJson('/admin/niveles-evaluacion').catch((err) => {
                console.error('Error al cargar las rúbricas:', err);
                return null;
            }),
            fetchJson('/admin/grados').catch((err) => {
                console.error('Error al cargar los grados:', err);
                return null;
            }),
        ]);

        proyectoActual = proyectoData.proyecto;
        renderEncabezado(proyectoActual);

        // Prerrellenar el nombre del proyecto (campo de texto)
        const nombreInput = document.getElementById('editar-proyecto-nombre');
        if (nombreInput) {
            nombreInput.value = proyectoActual.nombre || '';
            nombreInput.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Select de rúbricas (niveles de evaluación)
        const niveles = Array.isArray(nivelesData?.niveles)
            ? nivelesData.niveles
            : (Array.isArray(nivelesData) ? nivelesData : []);
        poblarSelect(
            'editar-proyecto-nivel',
            niveles.map((n) => ({ value: n.nivel_id, label: n.nombre })),
            'Selecciona un tipo de evaluación',
        );

        // Cascada Grado → Especialidad → Sección (mismos datos que el dialog)
        gradosCacheEditar = gradosData?.grados || [];
        configurarCascadeEditar(gradosCacheEditar);

        // Preseleccionar los valores actuales del proyecto
        establecerValorSelect('editar-proyecto-nivel', proyectoActual.nivel_id);
        preseleccionarGradoEditar(proyectoActual.grado_id);

        initContadorNombre();
        await cargarAlumnos();
        actualizarEstadoGlobal();
        // Se registra al final: el prerrellenado de arriba (nombre + selects)
        // no debe contar como "cambios sin guardar".
        initDetectorCambios();
    } catch (err) {
        console.error('Error al cargar el proyecto:', err);
        const nombreEl = document.getElementById('detalle-proyecto-nombre');
        if (nombreEl) nombreEl.textContent = 'No se pudo cargar';
        const subEl = document.getElementById('detalle-proyecto-sub');
        if (subEl) subEl.textContent = err.message || 'Error al consultar el proyecto';
        mostrarNotificacion(err.message || 'Error al cargar el proyecto', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// GUARDAR / ELIMINAR PROYECTO
// ═══════════════════════════════════════════════════════════════

/** PUT /admin/proyectos/:id con los valores del formulario. */
async function guardarCambios() {
    const nombreInput = document.getElementById('editar-proyecto-nombre');
    const selNivel = document.getElementById('editar-proyecto-nivel');
    const hiddenGrado = document.getElementById('editar-proyecto-grado-id');

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    if (!nombre) {
        mostrarNotificacion('El nombre del proyecto es requerido', 'error');
        nombreInput?.focus();
        throw new Error('Campo vacío');
    }

    const nivel_id = Number(selNivel?.value || '');
    const grado_id = Number(hiddenGrado?.value || '');
    if (!nivel_id || !grado_id) {
        mostrarNotificacion(
            'Selecciona la rúbrica y completa grado, especialidad y sección',
            'error',
        );
        throw new Error('Campos vacíos');
    }

    const data = await fetchJson(`/admin/proyectos/${proyectoId}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre, nivel_id, grado_id }),
    });

    const gradoCambio = Number(grado_id) !== Number(proyectoActual?.grado_id);
    const habiaCambiosAlumnos = hayCambiosAlumnos();

    // Refrescar encabezado con los datos frescos
    if (data?.proyecto) {
        proyectoActual = { ...proyectoActual, ...data.proyecto };
        renderEncabezado(proyectoActual);
    } else {
        renderEncabezado({ ...proyectoActual, nombre, grado_id });
    }

    // Botón universal: persiste también los alumnos pendientes (agregar/quitar)
    if (habiaCambiosAlumnos) {
        await persistirAlumnos();
    }

    // Si cambió el grado, el backend eliminó a los alumnos ajenos al nuevo
    // grado: recargar la lista para reflejarlo y limpiar pendientes.
    if (gradoCambio || habiaCambiosAlumnos) {
        if (gradoCambio && data?.alumnosEliminados > 0) {
            const n = data.alumnosEliminados;
            mostrarNotificacion(
                n === 1
                    ? '1 alumno fuera del nuevo grado fue quitado del proyecto'
                    : `${n} alumnos fuera del nuevo grado fueron quitados del proyecto`,
                'info',
            );
        }
        await cargarAlumnos();
    }

    formDirty = false;
    actualizarEstadoGlobal();

    return { success: true };
}

function onGuardarExito() {
    mostrarNotificacion('Cambios guardados', 'bien');
    actualizarEstadoGlobal();
}

/** Pide confirmación y elimina el proyecto, regresando a la lista. */
async function eliminarProyecto() {
    if (!proyectoId) return;

    let ok;
    try {
        ok = await confirmarAccion(
            '¿Eliminar este proyecto?',
            'Se eliminarán de forma permanente el proyecto, sus evaluaciones y los criterios evaluados, así como la inscripción de los alumnos en él. Esta acción no se puede deshacer.',
            async () => {
                await fetchJson(`/admin/proyectos/${proyectoId}`, { method: 'DELETE' });
            },
        );
    } catch (err) {
        mostrarNotificacion(err.message || 'Error al eliminar el proyecto', 'error');
        return;
    }
    if (!ok) return;

    mostrarNotificacion('Proyecto eliminado', 'bien');
    if (typeof window.navigateTo === 'function') {
        window.navigateTo('/menu/proyectos');
    } else {
        location.href = '/menu/proyectos';
    }
}

/** Inicializa el formulario de edición (una sola vez por elemento form). */
function initFormEditar() {
    const form = document.getElementById('form-editar-proyecto');
    if (!form || form.dataset.submitInitialized) return;
    form.dataset.submitInitialized = 'true';

    createSubmitHandler(form, {
        onSubmit: guardarCambios,
        onSuccess: onGuardarExito,
        onError: (error) => {
            if (error.message === 'Campo vacío' || error.message === 'Campos vacíos') return;
            mostrarNotificacion(error.message || 'Error al actualizar el proyecto', 'error');
        },
    });

    document.getElementById('btn-eliminar-proyecto')
        ?.addEventListener('click', eliminarProyecto);

    // El cambio de grado (cascada) recalcula alumnos vía onCambioGradoCascade.
}

// ═══════════════════════════════════════════════════════════════
// ALUMNOS DEL PROYECTO
// ═══════════════════════════════════════════════════════════════

function hideLoaderAlumnos() {
    const loader = document.getElementById('alumnos-loader');
    if (loader) loader.style.display = 'none';
}

/** GET /admin/proyectos/:id/estudiantes → lista de inscritos. */
async function cargarAlumnos() {
    if (!proyectoId) return;
    const lista = document.getElementById('alumnos-lista');
    if (!lista) return;

    try {
        const data = await fetchJson(`/admin/proyectos/${proyectoId}/estudiantes`);
        estudiantesProyecto = data?.estudiantes || [];
        // Tras recargar desde la BD ya no hay nada pendiente de guardar
        pendientesAgregar = [];
        pendientesQuitar.clear();
        proyectoGradoPendiente = null;
        renderAlumnos();
    } catch (err) {
        console.error('Error al cargar los alumnos:', err);
        lista.innerHTML =
            '<p class="criterios-vacio">No se pudieron cargar los alumnos.</p>';
        mostrarNotificacion(err.message || 'Error al cargar los alumnos', 'error');
    } finally {
        hideLoaderAlumnos();
        await actualizarSelectAgregar();
        actualizarEstadoGlobal();
    }
}

/** Inscritos que siguen en el proyecto (sin pendiente de salida). */
function inscritosActivos() {
    return estudiantesProyecto.filter((a) => !pendientesQuitar.has(a.estudiante_id));
}

/** Total para el badge de la pestaña: activos + por agregar. */
function totalAlumnos() {
    return inscritosActivos().length + pendientesAgregar.length;
}

/**
 * Pinta la lista de alumnos. Los marcados para quitar DESAPARECEN de la
 * vista de inmediato (solo visual: se borran de BD al pulsar guardar);
 * se muestra una píldora para deshacer las salidas manuales.
 */
function renderAlumnos() {
    const lista = document.getElementById('alumnos-lista');
    const contador = document.getElementById('contador-alumnos');
    if (!lista) return;

    lista.innerHTML = '';
    if (contador) contador.textContent = String(totalAlumnos());

    // Píldora de deshacer: solo para salidas manuales (las de grado no son reversibles)
    const quitadosManuales = [...pendientesQuitar.entries()].filter(([, r]) => r === 'manual');
    if (quitadosManuales.length > 0) {
        const pildora = document.createElement('div');
        pildora.className = 'alumnos-deshacer';
        pildora.innerHTML = `
            <span class="material-symbols-rounded" aria-hidden="true">restore</span>
            <span class="alumnos-deshacer__texto">${quitadosManuales.length} ${plural(quitadosManuales.length, 'alumno', 'alumnos')} ${plural(quitadosManuales.length, 'marcado', 'marcados')} para quitar</span>
            <button type="button" class="alumnos-deshacer__btn" data-ripple>Deshacer</button>
        `;
        pildora.querySelector('.alumnos-deshacer__btn').addEventListener('click', () => {
            deshacerSalidasManuales();
        });
        lista.appendChild(pildora);
    }

    const filas = [];

    // 1) Inscritos activos (los marcados para quitar no se pintan)
    inscritosActivos().forEach((alumno) => {
        filas.push({ alumno, esNuevo: false });
    });

    // 2) Pendientes de agregar (aún no existen en BD)
    pendientesAgregar.forEach((alumno) => {
        filas.push({ alumno, esNuevo: true });
    });

    if (filas.length === 0) {
        const mensaje = document.createElement('p');
        mensaje.className = 'criterios-vacio';
        mensaje.textContent = pendientesQuitar.size > 0
            ? 'Los alumnos marcados se quitarán del proyecto al pulsar «Guardar cambios».'
            : 'Aún no hay alumnos en este proyecto. Agrega alumnos del grado desde el selector de arriba.';
        lista.appendChild(mensaje);
        return;
    }

    filas.forEach(({ alumno, esNuevo }, index) => {
        const fila = document.createElement('div');
        fila.className = 'list-item list-item--evaluado alumno-item evaluacion-entrada';
        fila.style.animationDelay = `${Math.min(index * 40, 240)}ms`;
        // PK de evaluaciones.estudiantes (undefined en los pendientes de agregar)
        fila.dataset.estudianteId = alumno.estudiante_id ?? '';
        fila.dataset.principalId = alumno.principal_estudiante_id ?? alumno.principal_id ?? '';

        const asistencia = alumno.asistencia === true;
        const nombre = alumno.nombre_completo;
        const nie = alumno.nie;

        let estadoHtml;
        let btnHtml;
        if (esNuevo) {
            estadoHtml = `
            <div class="proyecto-evaluado__resultado alumno-asistencia__resultado is-nuevo"
                 title="Se guardará al pulsar «Guardar cambios»">
                <span class="material-symbols-rounded alumno-asistencia__icono" aria-hidden="true">add_circle</span>
                <span class="alumno-asistencia__estado">Nuevo — pendiente de guardar</span>
            </div>`;
            btnHtml = `
            <button type="button" class="alumno-item__quitar" data-ripple
                    aria-label="Quitar a ${escapeHtml(nombre)}" title="Descartar">
                <span class="material-symbols-rounded" aria-hidden="true">person_remove</span>
            </button>`;
        } else {
            estadoHtml = `
            <div class="proyecto-evaluado__resultado alumno-asistencia__resultado ${asistencia ? 'is-marcada' : 'is-pendiente'}"
                 title="${asistencia ? 'Asistencia ya registrada' : 'Falta registrar la asistencia de este alumno'}">
                <span class="material-symbols-rounded alumno-asistencia__icono" aria-hidden="true">${asistencia ? 'check_circle' : 'schedule'}</span>
                <span class="alumno-asistencia__estado">${asistencia ? 'Asistencia marcada' : 'Asistencia pendiente'}</span>
            </div>`;
            btnHtml = `
            <button type="button" class="alumno-item__quitar" data-ripple
                    aria-label="Quitar a ${escapeHtml(nombre)}" title="Quitar del proyecto">
                <span class="material-symbols-rounded" aria-hidden="true">person_remove</span>
            </button>`;
        }

        fila.innerHTML = `
            <div class="list-item__content">
                <span class="material-symbols-rounded alumno-item__icono" aria-hidden="true">person</span>
                <div class="list-item__text-block">
                    <p class="list-item__author alumno-item__nombre">${escapeHtml(nombre)}</p>
                    ${nie ? `<p class="list-item__desc alumno-item__nie">NIE: ${escapeHtml(nie)}</p>` : ''}
                </div>
            </div>
            <div class="centrar gap-row">
                ${btnHtml}
            </div>
            ${estadoHtml}
        `;

        fila.querySelector('.alumno-item__quitar')?.addEventListener('click', () => {
            quitarAlumnoLocal(alumno, esNuevo);
        });
        fila.addEventListener(
            'animationend',
            () => fila.classList.remove('evaluacion-entrada'),
            { once: true },
        );

        lista.appendChild(fila);
    });
}

/**
 * Quita un alumno SOLO localmente (se persiste con «Guardar alumnos»).
 * - Pendiente de agregar → se descarta de la lista local.
 * - Inscrito en BD → se marca en pendientesQuitar (reversible con undo).
 */
function quitarAlumnoLocal(alumno, esNuevo) {
    if (esNuevo) {
        pendientesAgregar = pendientesAgregar.filter(
            (a) => (a.principal_id ?? a.principal_estudiante_id) !==
                (alumno.principal_id ?? alumno.principal_estudiante_id),
        );
    } else {
        pendientesQuitar.set(alumno.estudiante_id, 'manual');
    }
    renderAlumnos();
    actualizarSelectAgregar();
    actualizarEstadoGlobal();
}

/** Deshace TODAS las salidas manuales marcadas (restaura en la vista). */
function deshacerSalidasManuales() {
    for (const [id, razon] of [...pendientesQuitar]) {
        if (razon === 'manual') pendientesQuitar.delete(id);
    }
    renderAlumnos();
    actualizarEstadoGlobal();
}

/** ¿Hay cambios de alumnos sin guardar? */
function hayCambiosAlumnos() {
    return pendientesAgregar.length > 0 || pendientesQuitar.size > 0;
}

/**
 * Persiste en BD los cambios de alumnos pendientes (sin tocar UI):
 *  - POST  /admin/proyectos/:pid/estudiantes  (acepta array)
 *  - DELETE /admin/proyectos/:pid/estudiantes/:eid (uno por marcado)
 * Los errores se propagan al flujo de guardado universal.
 */
async function persistirAlumnos() {
    const aAgregar = [...pendientesAgregar];
    const aQuitar = [...pendientesQuitar.keys()];

    if (aAgregar.length > 0) {
        await fetchJson(`/admin/proyectos/${proyectoId}/estudiantes`, {
            method: 'POST',
            body: JSON.stringify({
                estudianteIds: aAgregar.map((a) => a.principal_id ?? a.principal_estudiante_id),
            }),
        });
    }
    for (const estudianteId of aQuitar) {
        await fetchJson(
            `/admin/proyectos/${proyectoId}/estudiantes/${estudianteId}`,
            { method: 'DELETE' },
        );
    }
}

/** Refresca el indicador de sincronización de la cabecera (único estado). */
function actualizarEstadoGlobal() {
    renderEstadoSincronizacion();
}

/**
 * Rellena el selector "Agregar alumno" con los estudiantes activos del grado
 * indicado (o el del proyecto) que no estén ya en el proyecto —ni inscritos
 * ni pendientes de agregar—.
 */
async function actualizarSelectAgregar(gradoIdOverride) {
    const sel = document.getElementById('select-agregar-alumno');
    const btn = document.getElementById('btn-agregar-alumno');
    if (!sel || !btn) return;

    // Prioridad: grado pedido explícito → grado nuevo pendiente → grado actual
    const gradoId = Number(
        gradoIdOverride ?? proyectoGradoPendiente ?? proyectoActual?.grado_id,
    );
    if (!gradoId) {
        poblarSelect('select-agregar-alumno', [], 'Selecciona primero un grado');
        sel.disabled = true;
        btn.disabled = true;
        return;
    }

    try {
        const data = await fetchJson(`/admin/grados/${gradoId}/estudiantes`);
        // IDs de principal.estudiantes: los inscritos llegan como
        // principal_estudiante_id y los pendientes como principal_id.
        const enProyecto = new Set([
            ...estudiantesProyecto.map((e) => String(e.principal_estudiante_id)),
            ...pendientesAgregar.map((e) => String(e.principal_id ?? e.principal_estudiante_id)),
        ]);
        const disponibles = (data?.estudiantes || []).filter(
            (e) => !enProyecto.has(String(e.estudiante_id)),
        );

        poblarSelect(
            'select-agregar-alumno',
            disponibles.map((e) => ({
                value: e.estudiante_id,
                label: e.nombre_completo,
                // El NIE queda oculto pero se incluye en la búsqueda del selector.
                search: e.nie ? `${e.nombre_completo} ${e.nie}` : e.nombre_completo,
            })),
            disponibles.length === 0 ? 'Todos los alumnos ya están inscritos' : 'Selecciona un alumno',
        );
        sel.disabled = disponibles.length === 0;
        btn.disabled = true; // se habilita al elegir un alumno
    } catch (err) {
        console.error('Error al cargar los alumnos del grado:', err);
        poblarSelect('select-agregar-alumno', [], 'No se pudieron cargar los alumnos');
        sel.disabled = true;
        btn.disabled = true;
    }
}

/**
 * Agrega el alumno elegido SOLO localmente (se persiste con
 * «Guardar alumnos») y refresca el selector para que no vuelva a aparecer.
 */
function initSelectorAgregar() {
    const sel = document.getElementById('select-agregar-alumno');
    const btn = document.getElementById('btn-agregar-alumno');
    if (!sel || !btn || sel.dataset.init === 'true') return;
    sel.dataset.init = 'true';

    sel.addEventListener('change', () => {
        btn.disabled = !sel.value;
    });

    btn.addEventListener('click', () => {
        const principalId = Number(sel.value);
        if (!principalId) {
            mostrarNotificacion('Selecciona un alumno para agregar', 'error');
            return;
        }

        const opcion = sel.selectedOptions[0];
        pendientesAgregar.push({
            principal_id: principalId,
            nombre_completo: opcion?.textContent.trim() || 'Alumno',
            nie: null,
        });

        // Resetear el selector y refrescar lista/estado
        poblarSelect('select-agregar-alumno', [], 'Selecciona un alumno');
        // Repoblar sin el recién agregado (mantiene el resto de disponibles)
        actualizarSelectAgregar();
        renderAlumnos();
        actualizarEstadoGlobal();
    });
}

/**
 * Recalcula los pendientes cuando cambia el grado del proyecto:
 *  - Los inscritos cuyo alumno no pertenece al nuevo grado se marcan
 *    para quitar (razón 'grado'); los que vuelven a pertenecer se restauran.
 *  - Los pendientes de agregar de otro grado se descartan.
 *  - El selector se recarga con los alumnos del nuevo grado.
 */
async function aplicarCambioGrado(nuevoGradoId) {
    nuevoGradoId = Number(nuevoGradoId);
    if (!nuevoGradoId) return;
    proyectoGradoPendiente = nuevoGradoId;

    // 1) Inscritos: marcar/desmarcar según pertenezcan al nuevo grado
    estudiantesProyecto.forEach((alumno) => {
        const pertenece = Number(alumno.grado_estudiante) === nuevoGradoId;
        if (!pertenece) {
            pendientesQuitar.set(alumno.estudiante_id, 'grado');
        } else if (pendientesQuitar.get(alumno.estudiante_id) === 'grado') {
            pendientesQuitar.delete(alumno.estudiante_id);
        }
    });

    // 2) Pendientes de agregar: descartar los que no sean del nuevo grado.
    //    (Se validan contra la lista del grado al recargar el selector.)
    try {
        const data = await fetchJson(`/admin/grados/${nuevoGradoId}/estudiantes`);
        const delGrado = new Set((data?.estudiantes || []).map((e) => String(e.estudiante_id)));
        pendientesAgregar = pendientesAgregar.filter((a) =>
            delGrado.has(String(a.principal_id ?? a.principal_estudiante_id)),
        );
    } catch (err) {
        console.error('Error al validar alumnos del nuevo grado:', err);
        pendientesAgregar = [];
    }

    renderAlumnos();
    await actualizarSelectAgregar(nuevoGradoId);
    actualizarEstadoGlobal();

    const fuera = [...pendientesQuitar.values()].filter((r) => r === 'grado').length;
    if (fuera > 0) {
        mostrarNotificacion(
            fuera === 1
                ? '1 alumno dejará el proyecto al guardar: no pertenece al grado seleccionado'
                : `${fuera} alumnos dejarán el proyecto al guardar: no pertenecen al grado seleccionado`,
            'info',
        );
    }
}

// ═══════════════════════════════════════════════════════════════
// PESTAÑAS (datos del proyecto / alumnos)
// ═══════════════════════════════════════════════════════════════

/**
 * Coloca la burbuja del tablist bajo la pestaña activa.
 * La transición se habilita después del primer posicionamiento para que
 * la burbuja no se vea deslizarse al cargar la vista.
 */
function posicionarIndicadorProyecto() {
    const bar = document.querySelector('.proyecto-tabs__bar');
    const indicador = bar?.querySelector('.proyecto-tab-indicador');
    const activo = bar?.querySelector('.proyecto-tab.is-activa');
    if (!bar || !indicador || !activo) return;

    indicador.style.width = `${activo.offsetWidth}px`;
    indicador.style.transform = `translateX(${activo.offsetLeft}px)`;

    if (!indicador.classList.contains('is-animado')) {
        requestAnimationFrame(() => indicador.classList.add('is-animado'));
    }
}

/** Activa una pestaña y muestra su panel correspondiente. */
function activarPestana(nombre) {
    const tabs = document.querySelectorAll('.proyecto-tab');
    const panels = document.querySelectorAll('.proyecto-panel');

    tabs.forEach((tab) => {
        const activo = tab.dataset.tab === nombre;
        tab.classList.toggle('is-activa', activo);
        tab.setAttribute('aria-selected', String(activo));
        tab.tabIndex = activo ? 0 : -1;
    });

    panels.forEach((panel) => {
        panel.classList.toggle('is-activa', panel.dataset.panel === nombre);
    });

    posicionarIndicadorProyecto();
}

/** Vincula el clic de las pestañas (una sola vez por barra recreada). */
function initPestanas() {
    const bar = document.querySelector('.proyecto-tabs__bar');
    if (!bar || bar.dataset.init === 'true') return;
    bar.dataset.init = 'true';

    // Burbuja que se desliza bajo la pestaña activa
    const indicador = document.createElement('span');
    indicador.className = 'proyecto-tab-indicador';
    indicador.setAttribute('aria-hidden', 'true');
    bar.prepend(indicador);

    bar.querySelectorAll('.proyecto-tab').forEach((tab) => {
        tab.addEventListener('click', () => activarPestana(tab.dataset.tab));
    });

    // Navegación por teclado (flechas izquierda/derecha)
    bar.addEventListener('keydown', (e) => {
        const tabs = Array.from(bar.querySelectorAll('.proyecto-tab'));
        const idx = tabs.indexOf(document.activeElement);
        if (idx === -1) return;

        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            const dir = e.key === 'ArrowRight' ? 1 : -1;
            const next = tabs[(idx + dir + tabs.length) % tabs.length];
            next.focus();
            activarPestana(next.dataset.tab);
        }
    });

    // Coloca la burbuja cuando la barra ya está en el DOM
    requestAnimationFrame(() => posicionarIndicadorProyecto());
}

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

function initEditarProyecto() {
    // Reiniciar estado por navegación SPA (la vista se recrea)
    const root = document.querySelector('.contenedor-criterios[data-proyecto-id]');
    if (!root) return;
    if (root.dataset.proyectoId !== String(proyectoId)) {
        proyectoActual = null;
        estudiantesProyecto = [];
        pendientesAgregar = [];
        pendientesQuitar.clear();
        proyectoGradoPendiente = null;
        formDirty = false;
    }

    proyectoId = getProyectoId();
    initPestanas();
    initFormEditar();
    initSelectorAgregar();
    cargarVista();
}

// Mantener la burbuja alineada si cambia el ancho o terminan de cargar las fuentes
window.addEventListener('resize', posicionarIndicadorProyecto);

document.fonts?.ready?.then(() => posicionarIndicadorProyecto());

// Carga inicial y cada vez que el router reemplaza el contenido
document.addEventListener('DOMContentLoaded', initEditarProyecto);
document.addEventListener('contentUpdated', initEditarProyecto);
