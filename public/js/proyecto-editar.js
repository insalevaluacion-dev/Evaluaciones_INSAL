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
import { puedeEliminarProyectos } from './permisos.js';
import { animarEntrada, animarSalida } from './listAnimations.js';

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
let nivelesCacheEditar = [];      // catálogo de rúbricas con ponderacion_total
let formDirty = false;            // ¿algún campo del formulario fue editado?
let alumnosDisponibles = [];      // alumnos del grado que aún se pueden inscribir
let alumnosSeleccionados = new Set();
let alumnosMultiReq = 0;
let alumnosMultiGlobalBound = false;
/** Promesa de la carga en curso de la vista (null hasta el primer fetch). */
let cargaProyectoEditar = null;
/** Evita abrir dos veces la modal si se pulsa Atrás muy seguido. */
let salidaProyectoEnCurso = false;

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

/**
 * Sale de la vista de edición de proyecto. Si el proyecto no tiene alumnos
 * inscritos (ni en BD ni pendientes de agregar), muestra la modal de
 * advertencia (dialogo-proyecto-sin-alumnos): el proyecto queda sin equipo
 * y no podrá evaluarse.
 * Se resuelve `true` si el usuario decide salir, `false` si se queda editando.
 */
export async function confirmarSalidaProyectoSinAlumnos() {
    // Esperar a la carga: si se pulsa Atrás antes de que lleguen los alumnos,
    // el total sería 0 y la modal saldría aunque el proyecto ya tenga equipo.
    if (!proyectoId) proyectoId = getProyectoId();
    const root = document.querySelector('.contenedor-criterios[data-proyecto-id]');
    if (root && root.dataset.iniciado !== 'true' && !cargaProyectoEditar) {
        cargaProyectoEditar = cargarVista();
    }
    const pendiente = cargaProyectoEditar;
    if (pendiente) {
        try { await pendiente; } catch { /* el total queda en lo que se haya cargado */ }
    }
    // El total en pantalla ya incluye altas pendientes y excluye bajas pendientes.
    const total = inscritosActivos().length + pendientesAgregar.length;
    if (total > 0) return true;
    const confirmar = await confirmarAccion(
        'Proyecto sin alumnos',
        'Este proyecto no tiene alumnos inscritos. Podrás guardarlo, pero no podrá evaluarse hasta agregar al menos un alumno. ¿Deseas salir?',
        async () => { },
        'dialogo-proyecto-sin-alumnos',
    );
    return confirmar;
}

function navegarSpaProyecto(destino) {
    if (typeof window.navigateTo === 'function') window.navigateTo(destino);
    else window.location.assign(destino);
}

/**
 * Intercepta "Atrás" en fase capture, en document, antes de que el clic
 * llegue al router SPA. Mismo patrón que #btn-atras-rubrica:
 * sin data-link en el enlace, este listener es el único que navega.
 */
document.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('#btn-atras-proyecto') : null;
    if (!btn) return;
    // Clic modificado: dejar que el navegador abra el href (nueva pestaña).
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
    e.preventDefault();
    e.stopPropagation();
    const destino = btn.getAttribute('href') || '/menu/proyectos';
    if (salidaProyectoEnCurso) return;
    // Fuera de la vista de edición: navegar directo.
    if (!document.querySelector('.contenedor-criterios[data-proyecto-id]')) {
        navegarSpaProyecto(destino);
        return;
    }
    salidaProyectoEnCurso = true;
    confirmarSalidaProyectoSinAlumnos()
        .catch(() => false)
        .then((salir) => {
            salidaProyectoEnCurso = false;
            if (salir) navegarSpaProyecto(destino);
        });
}, true);

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
        if (proyecto.materia_nombre) partes.push(proyecto.materia_nombre);
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
        const [proyectoData, nivelesData, gradosData, materiasData] = await Promise.all([
            fetchJson(`/admin/proyectos/${proyectoId}`),
            fetchJson('/admin/niveles-evaluacion').catch((err) => {
                console.error('Error al cargar las rúbricas:', err);
                return null;
            }),
            fetchJson('/admin/grados').catch((err) => {
                console.error('Error al cargar los grados:', err);
                return null;
            }),
            fetchJson('/admin/materias').catch((err) => {
                console.error('Error al cargar las materias:', err);
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

        // Select de rúbricas: SOLO las completas (100% de ponderación).
        // Si la rúbrica actual del proyecto quedó incompleta, se conserva como
        // opción marcada "(incompleta)" para no perder el dato, pero no se puede
        // elegir una incompleta nueva.
        const niveles = Array.isArray(nivelesData?.niveles)
            ? nivelesData.niveles
            : (Array.isArray(nivelesData) ? nivelesData : []);
        nivelesCacheEditar = niveles;
        const completasEditar = niveles.filter((n) => Number(n.ponderacion_total) === 100);
        const opcionesNivel = completasEditar.map((n) => ({ value: n.nivel_id, label: n.nombre }));
        const actualId = Number(proyectoActual?.nivel_id);
        const actual = niveles.find((n) => Number(n.nivel_id) === actualId);
        if (actual && Number(actual.ponderacion_total) !== 100) {
            opcionesNivel.unshift({ value: actual.nivel_id, label: `${actual.nombre} (incompleta ${actual.ponderacion_total}%)` });
        }
        poblarSelect(
            'editar-proyecto-nivel',
            opcionesNivel,
            'Selecciona un tipo de evaluación',
        );

        // Select de materias
        const materias = Array.isArray(materiasData?.materias)
            ? materiasData.materias
            : (Array.isArray(materiasData) ? materiasData : []);
        poblarSelect(
            'editar-proyecto-materia',
            materias.map((m) => ({ value: m.materia_id, label: m.nombre_materia })),
            'Selecciona una materia',
        );

        // Cascada Grado → Especialidad → Sección (mismos datos que el dialog)
        gradosCacheEditar = gradosData?.grados || [];
        configurarCascadeEditar(gradosCacheEditar);

        // Preseleccionar los valores actuales del proyecto
        establecerValorSelect('editar-proyecto-nivel', proyectoActual.nivel_id);
        establecerValorSelect('editar-proyecto-materia', proyectoActual.materia_id);
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
    const selMateria = document.getElementById('editar-proyecto-materia');
    const hiddenGrado = document.getElementById('editar-proyecto-grado-id');

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    if (!nombre) {
        mostrarNotificacion('El nombre del proyecto es requerido', 'error');
        nombreInput?.focus();
        throw new Error('Campo vacío');
    }

    const nivel_id = Number(selNivel?.value || '');
    const materia_id = Number(selMateria?.value || '');
    const grado_id = Number(hiddenGrado?.value || '');
    if (!nivel_id || !grado_id || !materia_id) {
        mostrarNotificacion(
            'Selecciona la materia, la rúbrica y completa grado, especialidad y sección',
            'error',
        );
        throw new Error('Campos vacíos');
    }

    // Si cambió la rúbrica, la nueva debe estar completa (100%).
    if (Number(nivel_id) !== Number(proyectoActual?.nivel_id)) {
        const elegida = (nivelesCacheEditar || []).find((n) => Number(n.nivel_id) === Number(nivel_id));
        if (elegida && Number(elegida.ponderacion_total) !== 100) {
            mostrarNotificacion(
                `La rúbrica "${elegida.nombre}" está incompleta (${elegida.ponderacion_total}%): debe sumar 100% para asignarla`,
                'error',
            );
            throw new Error('Rúbrica incompleta');
        }
    }

    const data = await fetchJson(`/admin/proyectos/${proyectoId}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre, nivel_id, grado_id, materia_id }),
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
    // Si el historial está a la vista, refrescarlo con los cambios recién guardados
    const panelActividad = document.getElementById('panel-actividad');
    if (panelActividad?.classList.contains('is-activa')) cargarActividad();
}

/** Pide confirmación y elimina el proyecto, regresando a la lista. */
async function eliminarProyecto() {
    if (!proyectoId) return;
    // El servidor exige el permiso 'eliminarProyectos' (Dirección y
    // Administración); aquí se corta antes de mostrar el diálogo.
    if (!puedeEliminarProyectos()) {
        mostrarNotificacion('No tienes permisos para eliminar proyectos', 'error');
        return;
    }
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

/** Pulso de confirmación. No usa {once:true}: animationend burbujea desde los hijos. */
function pulsarActualizado(el) {
    if (!el) return;
    el.classList.remove('list-item--refreshing');
    el.classList.remove('list-item--updated');
    void el.offsetWidth;
    el.classList.add('list-item--updated');
    const alTerminar = (ev) => {
        if (ev.target !== el || ev.animationName !== 'pulseUpdate') return;
        el.classList.remove('list-item--updated');
        el.removeEventListener('animationend', alTerminar);
    };
    el.addEventListener('animationend', alTerminar);
}

/**
 * Colapsa el nodo y lo quita al terminar. data-saliendo evita que un
 * entrante se ancle a un nodo que está saliendo.
 */
function marcarSalida(el) {
    if (!el) return Promise.resolve(false);
    el.classList.remove('list-item--refreshing');
    el.setAttribute('data-saliendo', '');
    return animarSalida(el).then((completo) => {
        if (completo !== false) el.remove();
        return completo;
    });
}

/** Inserta el nodo delante del siguiente id que sigue en la lista y no sale. */
function insertarPorOrden(lista, nodo, ids, index, atributo, selectorItem) {
    let ancla = null;
    for (let i = index + 1; i < ids.length; i++) {
        ancla = lista.querySelector(
            `${selectorItem}[${atributo}="${CSS.escape(String(ids[i]))}"]:not([data-saliendo])`,
        );
        if (ancla) break;
    }
    if (ancla) lista.insertBefore(nodo, ancla);
    else lista.appendChild(nodo);
}

function actualizarContadorAlumnos() {
    const contador = document.getElementById('contador-alumnos');
    if (contador) contador.textContent = String(totalAlumnos());
}

/** Actualiza nombre, NIE y asistencia sin reemplazar el nodo ni sus listeners. */
function actualizarAlumnoElement(fila, alumno) {
    fila.dataset.principalId = alumno?.principal_estudiante_id ?? alumno?.principal_id ?? '';
    const nombre = fila.querySelector('.alumno-item__nombre');
    if (nombre) nombre.textContent = alumno?.nombre_completo || '';

    const bloque = fila.querySelector('.list-item__text-block');
    let nie = fila.querySelector('.alumno-item__nie');
    if (alumno?.nie) {
        if (!nie && bloque) {
            nie = document.createElement('p');
            nie.className = 'list-item__desc alumno-item__nie';
            bloque.appendChild(nie);
        }
        if (nie) nie.textContent = `NIE: ${alumno.nie}`;
    } else {
        nie?.remove();
    }

    const resultado = fila.querySelector('.alumno-asistencia__resultado');
    if (!resultado) return;
    const asistencia = alumno?.asistencia === true;
    resultado.classList.remove('is-marcada', 'is-pendiente', 'is-nuevo', 'is-quitar');
    resultado.classList.add(asistencia ? 'is-marcada' : 'is-pendiente');
    resultado.title = asistencia
        ? 'Asistencia ya registrada'
        : 'Falta registrar la asistencia de este alumno';
    const icono = resultado.querySelector('.alumno-asistencia__icono');
    if (icono) icono.textContent = asistencia ? 'check_circle' : 'schedule';
    const estado = resultado.querySelector('.alumno-asistencia__estado');
    if (estado) estado.textContent = asistencia ? 'Asistencia marcada' : 'Asistencia pendiente';
}

/** GET /admin/proyectos/:id/estudiantes → lista de inscritos. */
async function cargarAlumnos() {
    if (!proyectoId) return;
    const lista = document.getElementById('alumnos-lista');
    if (!lista) return;
    if (lista.dataset.refrescando === 'true') return;

    const anteriores = [...lista.querySelectorAll('.alumno-item:not([data-saliendo])')];
    const vacio = lista.querySelector('.criterios-vacio');
    const coldLoad = anteriores.length === 0 && !vacio;
    if (!coldLoad) {
        lista.setAttribute('aria-busy', 'true');
        anteriores.forEach((el) => el.classList.add('list-item--refreshing'));
    }
    lista.dataset.refrescando = 'true';

    try {
        const data = await fetchJson(`/admin/proyectos/${proyectoId}/estudiantes`);
        if (hayCambiosAlumnos()) {
            anteriores.forEach(pulsarActualizado);
            return;
        }
        const estudiantesNuevos = (data?.estudiantes || []).filter((a) => a?.estudiante_id != null);
        estudiantesProyecto = estudiantesNuevos;
        pendientesAgregar = [];
        pendientesQuitar.clear();
        proyectoGradoPendiente = null;

        if (coldLoad) {
            renderAlumnos();
            lista.querySelectorAll('.alumno-item').forEach((el, index) => animarEntrada(el, index * 60));
            return;
        }

        const idsNuevos = estudiantesNuevos.map((a) => String(a.estudiante_id));
        const setNuevos = new Set(idsNuevos);
        const promesasSalida = anteriores
            .filter((el) => !setNuevos.has(el.dataset.estudianteId))
            .map(marcarSalida);

        if (estudiantesNuevos.length === 0) {
            await Promise.all(promesasSalida);
            if (!lista.querySelector('.criterios-vacio')) renderAlumnos();
            else actualizarContadorAlumnos();
            return;
        }

        lista.querySelectorAll('.criterios-vacio').forEach((el) => el.remove());
        const existentes = new Map(anteriores.map((el) => [el.dataset.estudianteId, el]));
        estudiantesNuevos.forEach((alumno, index) => {
            const id = String(alumno.estudiante_id);
            const filaExistente = existentes.get(id);
            if (filaExistente) {
                actualizarAlumnoElement(filaExistente, alumno);
                pulsarActualizado(filaExistente);
            } else {
                const fila = crearFilaAlumno(alumno, false);
                insertarPorOrden(lista, fila, idsNuevos, index, 'data-estudiante-id', '.alumno-item');
                animarEntrada(fila, index * 60);
            }
        });
        actualizarContadorAlumnos();
    } catch (err) {
        console.error('Error al cargar los alumnos:', err);
        if (coldLoad) {
            lista.innerHTML = '<p class="criterios-vacio">No se pudieron cargar los alumnos.</p>';
        } else {
            lista.querySelectorAll('.list-item--refreshing').forEach((el) => el.classList.remove('list-item--refreshing'));
        }
        mostrarNotificacion(err.message || 'Error al cargar los alumnos', 'error');
    } finally {
        delete lista.dataset.refrescando;
        lista.removeAttribute('aria-busy');
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
function renderAlumnos(targetLista = document.getElementById('alumnos-lista'), actualizarContador = true) {
    const lista = targetLista;
    const contador = document.getElementById('contador-alumnos');
    if (!lista) return;

    lista.innerHTML = '';
    if (actualizarContador && contador) contador.textContent = String(totalAlumnos());

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
            : 'Aún no hay alumnos en este proyecto. Ábrelo desde «Agregar alumnos» y marca los que quieras inscribir.';
        lista.appendChild(mensaje);
        return;
    }

    filas.forEach(({ alumno, esNuevo }) => {
        lista.appendChild(crearFilaAlumno(alumno, esNuevo));
    });
}

/** Fila de alumno. La entrada la dispara el llamador con animarEntrada(). */
function crearFilaAlumno(alumno, esNuevo) {
    const fila = document.createElement('div');
    fila.className = 'list-item list-item--evaluado alumno-item';
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

    return fila;
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

function setEstadoSelectorAlumnos(texto, { disabled = false, ayuda = '' } = {}) {
    const trigger = document.getElementById('alumnos-multi-trigger');
    const label = document.getElementById('alumnos-multi-label');
    const ayudaEl = document.getElementById('alumnos-multi-ayuda');
    const root = document.getElementById('alumnos-multi');
    if (!trigger || !label) return;

    const n = alumnosSeleccionados.size;
    const haySeleccion = n > 0 && !disabled;
    label.textContent = haySeleccion
        ? `${n} ${plural(n, 'alumno seleccionado', 'alumnos seleccionados')}`
        : texto;
    trigger.disabled = disabled;
    trigger.classList.toggle('has-value', haySeleccion);
    root?.classList.toggle('is-disabled', disabled);
    if (ayudaEl && ayuda) ayudaEl.textContent = ayuda;

    const badge = document.getElementById('alumnos-multi-badge');
    if (badge) {
        badge.hidden = !haySeleccion;
        badge.textContent = String(n);
    }
    actualizarResumenAlumnos();
}

function normalizarBusqueda(texto) {
    return String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function alumnosVisibles() {
    const q = normalizarBusqueda(document.getElementById('alumnos-multi-buscar')?.value);
    return alumnosDisponibles.filter((alumno) => {
        if (!q) return true;
        const texto = normalizarBusqueda(`${alumno.nombre_completo || ''} ${alumno.nie || ''}`);
        return texto.includes(q);
    });
}

function aplicarFiltroAlumnos() {
    const q = normalizarBusqueda(document.getElementById('alumnos-multi-buscar')?.value);
    const lista = document.getElementById('alumnos-multi-lista');
    const vacio = document.getElementById('alumnos-multi-vacio');
    if (!lista) return;

    let visibles = 0;
    lista.querySelectorAll('.alumnos-multi__item').forEach((item) => {
        const show = !q || (item.dataset.search || '').includes(q);
        item.hidden = !show;
        if (show) visibles += 1;
    });
    if (vacio) vacio.hidden = visibles > 0 || alumnosDisponibles.length === 0;
    lista.hidden = visibles === 0;
    actualizarResumenAlumnos();
}

function actualizarResumenAlumnos() {
    const resumen = document.getElementById('alumnos-multi-resumen');
    const todosBtn = document.getElementById('alumnos-multi-todos');
    const agregarBtn = document.getElementById('btn-agregar-alumno');
    const agregarTexto = document.getElementById('alumnos-multi-agregar-texto');
    const n = alumnosSeleccionados.size;

    if (resumen) {
        resumen.textContent = n === 0
            ? 'Ninguno seleccionado'
            : `${n} ${plural(n, 'seleccionado', 'seleccionados')}`;
    }
    if (todosBtn) {
        todosBtn.hidden = n === 0;
        todosBtn.textContent = 'Quitar selección';
    }
    if (agregarBtn) agregarBtn.disabled = n === 0;
    if (agregarTexto) {
        agregarTexto.textContent = n === 0
            ? 'Agregar'
            : `Agregar ${n} ${plural(n, 'alumno', 'alumnos')}`;
    }
}

function renderListaAlumnos() {
    const lista = document.getElementById('alumnos-multi-lista');
    if (!lista) return;
    lista.innerHTML = '';

    alumnosDisponibles.forEach((alumno) => {
        const id = String(alumno.estudiante_id);
        const marcado = alumnosSeleccionados.has(id);
        const item = document.createElement('li');
        item.className = 'alumnos-multi__item' + (marcado ? ' is-checked' : '');
        item.dataset.id = id;
        item.dataset.search = normalizarBusqueda(`${alumno.nombre_completo || ''} ${alumno.nie || ''}`);
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', String(marcado));
        item.innerHTML = `
            <label class="alumnos-multi__fila">
                <md-checkbox touch-target="wrapper" aria-label="${escapeHtml(alumno.nombre_completo)}"${marcado ? ' checked' : ''}></md-checkbox>
                <span class="alumnos-multi__texto">
                    <span class="alumnos-multi__nombre">${escapeHtml(alumno.nombre_completo)}</span>
                    ${alumno.nie ? `<span class="alumnos-multi__nie">NIE ${escapeHtml(alumno.nie)}</span>` : ''}
                </span>
            </label>
        `;
        item.querySelector('md-checkbox')?.addEventListener('change', (e) => {
            establecerAlumnoSeleccionado(id, e.target.checked);
        });
        lista.appendChild(item);
    });
    aplicarFiltroAlumnos();
}

function establecerAlumnoSeleccionado(id, marcado) {
    const clave = String(id);
    if (marcado) alumnosSeleccionados.add(clave);
    else alumnosSeleccionados.delete(clave);

    const item = document.querySelector(`.alumnos-multi__item[data-id="${CSS.escape(clave)}"]`);
    const checkbox = item?.querySelector('md-checkbox');
    if (checkbox && checkbox.checked !== marcado) checkbox.checked = marcado;
    item?.classList.toggle('is-checked', marcado);
    item?.setAttribute('aria-selected', String(marcado));
    setEstadoSelectorAlumnos(
        alumnosDisponibles.length === 0
            ? 'Todos los alumnos ya están inscritos'
            : 'Agregar alumnos',
        {
            disabled: alumnosDisponibles.length === 0,
            ayuda: alumnosDisponibles.length === 0
                ? 'Todos los alumnos de este grado ya están en el proyecto.'
                : 'Marca uno o varios alumnos del grado. Entran a la lista y se guardan con «Guardar cambios».',
        },
    );
}

function limpiarSeleccionAlumnos() {
    if (alumnosSeleccionados.size === 0) return;
    alumnosSeleccionados.clear();
    renderListaAlumnos();
    setEstadoSelectorAlumnos('Agregar alumnos', {
        disabled: false,
        ayuda: 'Marca uno o varios alumnos del grado. Entran a la lista y se guardan con «Guardar cambios».',
    });
}

function posicionarPanelAlumnos() {
    const trigger = document.getElementById('alumnos-multi-trigger');
    const panel = document.getElementById('alumnos-multi-panel');
    if (!trigger || !panel || !panel.classList.contains('is-open')) return;

    const mobile = window.matchMedia('(max-width: 640px)').matches;
    if (mobile) {
        const vv = window.visualViewport;
        const vh = vv ? vv.height : window.innerHeight;
        const top = vv ? vv.offsetTop : 0;
        panel.classList.add('is-mobile');
        panel.style.position = 'fixed';
        panel.style.top = `${top}px`;
        panel.style.left = '0';
        panel.style.width = '100%';
        panel.style.height = `${vh}px`;
        panel.style.maxHeight = `${vh}px`;
        panel.style.bottom = 'auto';
        return;
    }

    panel.classList.remove('is-mobile');
    const rect = trigger.getBoundingClientRect();
    const gap = 8;
    const preferred = 460;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < 280 && spaceAbove > spaceBelow;
    const available = Math.max(220, Math.min(preferred, openUp ? spaceAbove : spaceBelow));
    const width = rect.width;
    panel.style.position = 'fixed';
    panel.style.width = `${width}px`;
    panel.style.left = `${Math.max(gap, Math.min(rect.left, window.innerWidth - width - gap))}px`;
    panel.style.height = `${available}px`;
    panel.style.maxHeight = `${available}px`;
    if (openUp) {
        panel.style.top = 'auto';
        panel.style.bottom = `${window.innerHeight - rect.top + gap}px`;
    } else {
        panel.style.bottom = 'auto';
        panel.style.top = `${rect.bottom + gap}px`;
    }
}

function abrirPanelAlumnos() {
    const trigger = document.getElementById('alumnos-multi-trigger');
    const panel = document.getElementById('alumnos-multi-panel');
    if (!trigger || !panel || trigger.disabled || alumnosDisponibles.length === 0) return;
    panel.hidden = false;
    panel.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('alumnos-multi-locked');
    posicionarPanelAlumnos();
    const buscar = document.getElementById('alumnos-multi-buscar');
    requestAnimationFrame(() => buscar?.focus());
}

function cerrarPanelAlumnos() {
    const trigger = document.getElementById('alumnos-multi-trigger');
    const panel = document.getElementById('alumnos-multi-panel');
    if (panel?.classList.contains('is-open')) {
        panel.classList.remove('is-open', 'is-mobile');
        panel.hidden = true;
    }
    trigger?.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('alumnos-multi-locked');
    if (alumnosSeleccionados.size > 0) {
        alumnosSeleccionados.clear();
        renderListaAlumnos();
    }
}

function agregarSeleccionados() {
    if (alumnosSeleccionados.size === 0) {
        mostrarNotificacion('Selecciona al menos un alumno para agregar', 'error');
        return;
    }

    alumnosDisponibles
        .filter((alumno) => alumnosSeleccionados.has(String(alumno.estudiante_id)))
        .forEach((alumno) => {
            pendientesAgregar.push({
                principal_id: Number(alumno.estudiante_id),
                nombre_completo: alumno.nombre_completo,
                nie: alumno.nie || null,
            });
        });

    alumnosSeleccionados.clear();
    const buscar = document.getElementById('alumnos-multi-buscar');
    if (buscar) buscar.value = '';
    cerrarPanelAlumnos();
    renderAlumnos();
    actualizarSelectAgregar();
    actualizarEstadoGlobal();
}

function bindAlumnosMultiGlobal() {
    if (alumnosMultiGlobalBound) return;
    alumnosMultiGlobalBound = true;

    document.addEventListener('click', (e) => {
        const root = document.getElementById('alumnos-multi');
        if (!root || root.contains(e.target)) return;
        cerrarPanelAlumnos();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const panel = document.getElementById('alumnos-multi-panel');
        if (!panel?.classList.contains('is-open')) return;
        const buscar = document.getElementById('alumnos-multi-buscar');
        if (buscar && document.activeElement === buscar && buscar.value) {
            buscar.value = '';
            aplicarFiltroAlumnos();
            return;
        }
        cerrarPanelAlumnos();
    });

    window.addEventListener('resize', posicionarPanelAlumnos);
    window.visualViewport?.addEventListener('resize', posicionarPanelAlumnos);
}

/**
 * Rellena el menú "Agregar alumnos" con los estudiantes activos del grado
 * que todavía no están en el proyecto (ni inscritos ni pendientes).
 */
async function actualizarSelectAgregar(gradoIdOverride) {
    const trigger = document.getElementById('alumnos-multi-trigger');
    if (!trigger) return;

    const req = ++alumnosMultiReq;
    const gradoId = Number(
        gradoIdOverride ?? proyectoGradoPendiente ?? proyectoActual?.grado_id,
    );
    if (!gradoId) {
        alumnosDisponibles = [];
        alumnosSeleccionados.clear();
        cerrarPanelAlumnos();
        renderListaAlumnos();
        setEstadoSelectorAlumnos('Selecciona primero un grado', {
            disabled: true,
            ayuda: 'Elige el grado en Datos del proyecto para ver sus alumnos.',
        });
        return;
    }

    setEstadoSelectorAlumnos('Cargando alumnos…', {
        disabled: true,
        ayuda: 'Buscando alumnos del grado…',
    });

    try {
        const data = await fetchJson(`/admin/grados/${gradoId}/estudiantes`);
        if (req !== alumnosMultiReq) return;

        const enProyecto = new Set([
            ...estudiantesProyecto.map((e) => String(e.principal_estudiante_id)),
            ...pendientesAgregar.map((e) => String(e.principal_id ?? e.principal_estudiante_id)),
        ]);
        alumnosDisponibles = (data?.estudiantes || []).filter(
            (e) => !enProyecto.has(String(e.estudiante_id)),
        );
        const validos = new Set(alumnosDisponibles.map((e) => String(e.estudiante_id)));
        for (const id of [...alumnosSeleccionados]) {
            if (!validos.has(id)) alumnosSeleccionados.delete(id);
        }

        renderListaAlumnos();
        if (alumnosDisponibles.length === 0) {
            cerrarPanelAlumnos();
            setEstadoSelectorAlumnos('Todos los alumnos ya están inscritos', {
                disabled: true,
                ayuda: 'Todos los alumnos de este grado ya están en el proyecto.',
            });
            return;
        }
        setEstadoSelectorAlumnos('Agregar alumnos', {
            disabled: false,
            ayuda: 'Marca uno o varios alumnos del grado. Entran a la lista y se guardan con «Guardar cambios».',
        });
        if (document.getElementById('alumnos-multi-panel')?.classList.contains('is-open')) {
            posicionarPanelAlumnos();
        }
    } catch (err) {
        if (req !== alumnosMultiReq) return;
        console.error('Error al cargar los alumnos del grado:', err);
        alumnosDisponibles = [];
        alumnosSeleccionados.clear();
        cerrarPanelAlumnos();
        renderListaAlumnos();
        setEstadoSelectorAlumnos('No se pudieron cargar los alumnos', {
            disabled: true,
            ayuda: 'Vuelve a abrir esta pestaña si el problema continúa.',
        });
    }
}

/** Vincula el menú de selección múltiple para agregar alumnos. */
function initSelectorAgregar() {
    const root = document.getElementById('alumnos-multi');
    const trigger = document.getElementById('alumnos-multi-trigger');
    const btn = document.getElementById('btn-agregar-alumno');
    if (!root || !trigger || !btn || root.dataset.init === 'true') return;
    root.dataset.init = 'true';
    bindAlumnosMultiGlobal();

    trigger.addEventListener('click', () => {
        const panel = document.getElementById('alumnos-multi-panel');
        if (panel?.classList.contains('is-open')) cerrarPanelAlumnos();
        else abrirPanelAlumnos();
    });

    const buscar = document.getElementById('alumnos-multi-buscar');
    buscar?.addEventListener('input', aplicarFiltroAlumnos);
    buscar?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') e.preventDefault();
    });
    document.getElementById('alumnos-multi-todos')?.addEventListener('click', limpiarSeleccionAlumnos);
    document.getElementById('alumnos-multi-cerrar')?.addEventListener('click', (e) => {
        e.stopPropagation();
        cerrarPanelAlumnos();
    });
    btn.addEventListener('click', agregarSeleccionados);

    document.querySelector('#panel-alumnos .proyecto-panel__scroll')?.addEventListener('scroll', () => {
        if (document.getElementById('alumnos-multi-panel')?.classList.contains('is-open')) {
            cerrarPanelAlumnos();
        }
    }, { passive: true });
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

    if (bar.scrollWidth > bar.clientWidth + 1) {
        const destino = activo.offsetLeft - (bar.clientWidth - activo.offsetWidth) / 2;
        bar.scrollTo({
            left: Math.max(0, destino),
            behavior: indicador.classList.contains('is-animado') ? 'smooth' : 'auto',
        });
    }

    if (!indicador.classList.contains('is-animado')) {
        requestAnimationFrame(() => indicador.classList.add('is-animado'));
    }
}

/** Activa una pestaña y muestra su panel correspondiente. */
function activarPestana(nombre) {
    cerrarPanelAlumnos();
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

    // Al abrir la pestaña de actividad se refresca el historial
    if (nombre === 'datos') refrescarDatosProyecto();
    if (nombre === 'alumnos') cargarAlumnos();
    if (nombre === 'actividad') cargarActividad();

    posicionarIndicadorProyecto();
}

/** Solo el valor del campo: ni la cabecera, ni el <label>, ni el contador. */
function superficiesDatos(panel) {
    const nodos = [];
    const nombre = panel.querySelector('#editar-proyecto-nombre');
    if (nombre) nodos.push(nombre);
    panel.querySelectorAll('select[data-custom]').forEach((select) => {
        const contenedor = select.nextElementSibling;
        const trigger = contenedor?.classList?.contains('custom-select')
            ? contenedor.querySelector('.custom-select__trigger')
            : null;
        if (trigger) nodos.push(trigger);
    });
    return nodos;
}

/** Actualiza datos del proyecto al abrir la pestaña, sin pisar el formulario editado. */
async function refrescarDatosProyecto() {
    const panel = document.getElementById('panel-datos');
    if (!proyectoId || !proyectoActual || !panel || panel.dataset.refrescando === 'true') return;
    panel.dataset.refrescando = 'true';
    panel.setAttribute('aria-busy', 'true');
    const controles = superficiesDatos(panel);
    controles.forEach((el) => el.classList.add('list-item--refreshing'));
    try {
        const data = await fetchJson(`/admin/proyectos/${proyectoId}`);
        const actualizado = data?.proyecto;
        if (!actualizado) return;
        if (!formDirty && !hayCambiosAlumnos()) {
            proyectoActual = actualizado;
            renderEncabezado(actualizado);
            const nombre = document.getElementById('editar-proyecto-nombre');
            if (nombre) {
                nombre.value = actualizado.nombre || '';
                nombre.dispatchEvent(new Event('input', { bubbles: true }));
            }
            establecerValorSelect('editar-proyecto-nivel', actualizado.nivel_id);
            establecerValorSelect('editar-proyecto-materia', actualizado.materia_id);
            preseleccionarGradoEditar(actualizado.grado_id);
            formDirty = false;
            renderEstadoSincronizacion();
        }
        controles.forEach((el) => pulsarActualizado(el));
    } catch (err) {
        console.error('Error al refrescar los datos del proyecto:', err);
        mostrarNotificacion(err.message || 'Error al actualizar los datos del proyecto', 'error');
    } finally {
        controles.forEach((el) => el.classList.remove('list-item--refreshing'));
        delete panel.dataset.refrescando;
        panel.removeAttribute('aria-busy');
    }
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
// ACTIVIDAD / HISTORIAL DE CAMBIOS DEL PROYECTO
// ═══════════════════════════════════════════════════════════════

/** Formatea un timestamp ISO → "día mes año · hh:mm" (12h a.m./p.m.). */
function formatoFechaActividad(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return String(fecha);
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mes = meses[d.getMonth()];
    const yy = d.getFullYear();
    const horas24 = d.getHours();
    const periodo = horas24 >= 12 ? 'p.m.' : 'a.m.';
    const horas12 = horas24 % 12 === 0 ? 12 : horas24 % 12;
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd} ${mes} ${yy} · ${horas12}:${mi} ${periodo}`;
}

/** Icono y color del punto del timeline según el tipo de cambio. */
function iconoActividad(tipo) {
    switch (tipo) {
        case 'creacion': return { icono: 'add_circle', clase: 'is-creacion' };
        case 'nombre': return { icono: 'edit', clase: 'is-nombre' };
        case 'nivel': return { icono: 'rule', clase: 'is-nivel' };
        case 'grado': return { icono: 'school', clase: 'is-grado' };
        case 'materia': return { icono: 'menu_book', clase: 'is-materia' };
        case 'alumno_agregado': return { icono: 'person_add', clase: 'is-agrega' };
        case 'alumno_quitado': return { icono: 'person_remove', clase: 'is-quita' };
        default: return { icono: 'change_history', clase: '' };
    }
}

const CLASES_TIPO_ACTIVIDAD = ['is-creacion', 'is-nombre', 'is-nivel', 'is-grado', 'is-materia', 'is-agrega', 'is-quita'];

/** El shimmer va en la tarjeta: el icono y el riel viven fuera de .actividad-item. */
function superficieActividad(el) {
    return el?.querySelector('.actividad-item__card') || null;
}

function scrollActividadAlFinal(lista) {
    const contenedorScroll = lista.closest('.proyecto-panel__scroll');
    if (!contenedorScroll) return;
    requestAnimationFrame(() => {
        contenedorScroll.scrollTop = contenedorScroll.scrollHeight;
    });
}

/** Actualiza textos y tipo sin sustituir className ni el nodo raíz. */
function actualizarActividadElement(el, ev) {
    const { icono, clase } = iconoActividad(ev.tipo);
    CLASES_TIPO_ACTIVIDAD.forEach((c) => el.classList.remove(c));
    if (clase) el.classList.add(clase);

    const iconoEl = el.querySelector('.actividad-item__icono');
    if (iconoEl) iconoEl.textContent = icono;

    const texto = el.querySelector('.actividad-item__texto');
    if (texto) {
        const strong = document.createElement('strong');
        strong.textContent = ev.usuario_nombre || 'Sistema';
        texto.replaceChildren(strong, document.createTextNode(ev.descripcion ? ` ${ev.descripcion}` : ''));
    }

    const fecha = el.querySelector('.actividad-item__fecha');
    if (fecha) {
        fecha.dateTime = ev.creado_en || '';
        fecha.textContent = formatoFechaActividad(ev.creado_en);
    }

    const contenido = el.querySelector('.actividad-item__contenido');
    let cambios = el.querySelector('.actividad-item__cambios');
    if (!ev.valor_anterior && !ev.valor_nuevo) {
        cambios?.remove();
        return;
    }
    if (!cambios && contenido) {
        cambios = document.createElement('div');
        cambios.className = 'actividad-item__cambios';
        contenido.appendChild(cambios);
    }
    if (!cambios) return;
    cambios.replaceChildren();
    if (ev.valor_anterior) {
        const antes = document.createElement('span');
        antes.className = 'actividad-chip actividad-chip--antes';
        antes.textContent = ev.valor_anterior;
        cambios.appendChild(antes);
    }
    if (ev.valor_anterior && ev.valor_nuevo) {
        const flecha = document.createElement('span');
        flecha.className = 'material-symbols-rounded actividad-flecha';
        flecha.setAttribute('aria-hidden', 'true');
        flecha.textContent = 'arrow_forward';
        cambios.appendChild(flecha);
    }
    if (ev.valor_nuevo) {
        const nuevo = document.createElement('span');
        nuevo.className = 'actividad-chip actividad-chip--nuevo';
        nuevo.textContent = ev.valor_nuevo;
        cambios.appendChild(nuevo);
    }
}

/** GET /admin/proyectos/:id/actividad y pinta el timeline. */
async function cargarActividad() {
    if (!proyectoId) return;
    const lista = document.getElementById('actividad-lista');
    if (!lista) return;
    if (lista.dataset.refrescando === 'true') return;
    lista.dataset.refrescando = 'true';

    const loader = document.getElementById('actividad-loader');
    const anteriores = [...lista.querySelectorAll('.actividad-item:not([data-saliendo])')];
    const coldLoad = anteriores.length === 0 && !lista.querySelector('.criterios-vacio');
    if (loader && coldLoad) loader.style.display = '';
    if (!coldLoad) {
        anteriores.forEach((el) => superficieActividad(el)?.classList.add('list-item--refreshing'));
    }

    try {
        const data = await fetchJson(`/admin/proyectos/${proyectoId}/actividad`);
        const eventos = (data?.actividad || []).filter((ev) => ev?.actividad_id != null);

        if (coldLoad) {
            renderActividad(eventos, lista);
            lista.querySelectorAll('.actividad-item').forEach((el, index) => animarEntrada(el, index * 40));
            scrollActividadAlFinal(lista);
            return;
        }

        const idsNuevos = eventos.map((ev) => String(ev.actividad_id));
        const setNuevos = new Set(idsNuevos);
        const promesasSalida = anteriores
            .filter((el) => !setNuevos.has(el.dataset.eventId))
            .map((el) => {
                superficieActividad(el)?.classList.remove('list-item--refreshing');
                return marcarSalida(el);
            });

        if (eventos.length === 0) {
            await Promise.all(promesasSalida);
            if (!lista.querySelector('.criterios-vacio')) renderActividad([], lista);
            return;
        }

        lista.querySelectorAll('.criterios-vacio').forEach((el) => el.remove());
        const existentes = new Map(anteriores.map((el) => [el.dataset.eventId, el]));
        eventos.forEach((ev, index) => {
            const id = String(ev.actividad_id);
            const existente = existentes.get(id);
            if (existente) {
                actualizarActividadElement(existente, ev);
                pulsarActualizado(superficieActividad(existente));
            } else {
                const item = crearItemActividad(ev);
                insertarPorOrden(lista, item, idsNuevos, index, 'data-event-id', '.actividad-item');
                animarEntrada(item, index * 60);
            }
        });
    } catch (err) {
        console.error('Error al cargar la actividad:', err);
        if (coldLoad) {
            lista.innerHTML = '<p class="criterios-vacio">No se pudo cargar el historial. Si acabas de crear la tabla, revisa haber ejecutado el SQL.</p>';
        } else {
            lista.querySelectorAll('.list-item--refreshing').forEach((el) => el.classList.remove('list-item--refreshing'));
        }
    } finally {
        delete lista.dataset.refrescando;
        lista.querySelectorAll('.list-item--refreshing').forEach((el) => el.classList.remove('list-item--refreshing'));
        if (loader) loader.style.display = 'none';
    }
}

/** Pinta la lista de eventos del historial en el orden entregado por el backend (cronológico). */
function renderActividad(eventos, targetLista = document.getElementById('actividad-lista')) {
    const lista = targetLista;
    if (!lista) return;
    lista.innerHTML = '';

    if (eventos.length === 0) {
        const vacio = document.createElement('p');
        vacio.className = 'criterios-vacio';
        vacio.textContent = 'Todavía no hay actividad registrada en este proyecto.';
        lista.appendChild(vacio);
        return;
    }

    eventos.forEach((ev) => lista.appendChild(crearItemActividad(ev)));
}

function crearItemActividad(ev) {
    const { icono, clase } = iconoActividad(ev.tipo);
    const item = document.createElement('div');
    item.className = `actividad-item${clase ? ` ${clase}` : ''}`;
    item.dataset.eventId = String(ev.actividad_id);

    const anterior = ev.valor_anterior
        ? `<span class="actividad-chip actividad-chip--antes">${escapeHtml(ev.valor_anterior)}</span>`
        : '';
    const flecha = (anterior && ev.valor_nuevo)
        ? '<span class="material-symbols-rounded actividad-flecha" aria-hidden="true">arrow_forward</span>'
        : '';
    const nuevo = ev.valor_nuevo
        ? `<span class="actividad-chip actividad-chip--nuevo">${escapeHtml(ev.valor_nuevo)}</span>`
        : '';

    item.innerHTML = `
            <span class="material-symbols-rounded actividad-item__icono" aria-hidden="true">${icono}</span>
            <div class="actividad-item__card">
                <div class="actividad-item__contenido">
                    <div class="actividad-item__fila">
                        <p class="actividad-item__texto">
                            <strong>${escapeHtml(ev.usuario_nombre || 'Sistema')}</strong>
                            ${escapeHtml(ev.descripcion || '')}
                        </p>
                        <time class="actividad-item__fecha" datetime="${escapeHtml(ev.creado_en || '')}">${formatoFechaActividad(ev.creado_en)}</time>
                    </div>
                    ${(anterior || nuevo) ? `<div class="actividad-item__cambios">${anterior}${flecha}${nuevo}</div>` : ''}
                </div>
            </div>
        `;
    return item;
}

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

function initEditarProyecto() {
    // Reiniciar estado por navegación SPA (la vista se recrea)
    const root = document.querySelector('.contenedor-criterios[data-proyecto-id]');
    if (!root) {
        alumnosSeleccionados.clear();
        document.body.classList.remove('alumnos-multi-locked');
        return;
    }
    if (root.dataset.proyectoId !== String(proyectoId)) {
        proyectoActual = null;
        estudiantesProyecto = [];
        pendientesAgregar = [];
        pendientesQuitar.clear();
        proyectoGradoPendiente = null;
        formDirty = false;
        alumnosDisponibles = [];
        alumnosSeleccionados = new Set();
        cargaProyectoEditar = null;
        salidaProyectoEnCurso = false;
    }

    proyectoId = getProyectoId();
    initPestanas();
    initFormEditar();
    initSelectorAgregar();
    cargaProyectoEditar = cargarVista();
}

document.addEventListener('routeChanging', (event) => {
    const root = document.querySelector('.contenedor-criterios[data-proyecto-id]');
    const rutaActual = root
        ? `/menu/proyectos/${root.dataset.proyectoId}`
        : null;
    if (event.detail?.route !== rutaActual) cerrarPanelAlumnos();
});

// Mantener la burbuja alineada si cambia el ancho o terminan de cargar las fuentes
window.addEventListener('resize', posicionarIndicadorProyecto);

document.fonts?.ready?.then(() => posicionarIndicadorProyecto());

// Carga inicial y cada vez que el router reemplaza el contenido
document.addEventListener('DOMContentLoaded', initEditarProyecto);
document.addEventListener('contentUpdated', initEditarProyecto);
