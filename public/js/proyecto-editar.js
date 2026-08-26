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

// ═══════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════

let proyectoId = null;
let proyectoActual = null;      // último GET /admin/proyectos/:id
let estudiantesProyecto = [];   // alumnos inscritos en el proyecto

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

function formatNota(valor) {
    const n = Number(valor);
    if (Number.isNaN(n)) return '—';
    return n.toFixed(2);
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
        partes.push(`Nota: ${formatNota(proyecto.nota)}`);
        subEl.textContent = partes.join(' · ');
    }
}

/**
 * Actualiza el indicador de sincronización de la cabecera.
 * @param {boolean} pendiente - true = hay cambios sin guardar, false = todo al día.
 */
function renderEstadoSincronizacion(pendiente) {
    const estado = document.getElementById('estado-sincronizacion');
    if (!estado) return;

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

    form.querySelectorAll('input, select').forEach((campo) => {
        campo.addEventListener('input', () => renderEstadoSincronizacion(true));
        campo.addEventListener('change', () => renderEstadoSincronizacion(true));
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

        // Select de rúbricas (niveles de evaluación)
        const niveles = Array.isArray(nivelesData?.niveles)
            ? nivelesData.niveles
            : (Array.isArray(nivelesData) ? nivelesData : []);
        poblarSelect(
            'editar-proyecto-nivel',
            niveles.map((n) => ({ value: n.nivel_id, label: n.nombre })),
            'Selecciona una rúbrica',
        );

        // Select de grados (etiqueta legible igual que la lista de proyectos)
        const grados = gradosData?.grados || [];
        poblarSelect(
            'editar-proyecto-grado',
            grados.map((g) => ({
                value: g.grado_id,
                label: `${g.displayName || g.nombre}${g.anio ? ` (${g.anio})` : ''}`,
            })),
            'Selecciona un grado',
        );

        // Preseleccionar los valores actuales del proyecto
        establecerValorSelect('editar-proyecto-nivel', proyectoActual.nivel_id);
        establecerValorSelect('editar-proyecto-grado', proyectoActual.grado_id);

        initContadorNombre();
        await cargarAlumnos();
        renderEstadoSincronizacion(false);
        // Se registra al final: el preseteo de selects de arriba no debe
        // contar como "cambios sin guardar".
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
    const selGrado = document.getElementById('editar-proyecto-grado');

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    if (!nombre) {
        mostrarNotificacion('El nombre del proyecto es requerido', 'error');
        nombreInput?.focus();
        throw new Error('Campo vacío');
    }

    const nivel_id = Number(selNivel?.value || '');
    const grado_id = Number(selGrado?.value || '');
    if (!nivel_id || !grado_id) {
        mostrarNotificacion('Selecciona la rúbrica (nivel) y el grado del proyecto', 'error');
        throw new Error('Campos vacíos');
    }

    const data = await fetchJson(`/admin/proyectos/${proyectoId}`, {
        method: 'PUT',
        body: JSON.stringify({ nombre, nivel_id, grado_id }),
    });

    // Refrescar encabezado con los datos frescos
    if (data?.proyecto) {
        proyectoActual = { ...proyectoActual, ...data.proyecto };
        renderEncabezado(proyectoActual);
    } else {
        renderEncabezado({ ...proyectoActual, nombre });
    }

    return { success: true };
}

function onGuardarExito() {
    mostrarNotificacion('Proyecto actualizado', 'bien');
    renderEstadoSincronizacion(false);
}

/** Pide confirmación y elimina el proyecto, regresando a la lista. */
async function eliminarProyecto() {
    if (!proyectoId) return;

    let ok;
    try {
        ok = await confirmarAccion(
            '¿Eliminar este proyecto?',
            'Se eliminarán el proyecto y todo lo relacionado (evaluaciones y alumnos). Esta acción no se puede deshacer.',
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
        renderAlumnos();
    } catch (err) {
        console.error('Error al cargar los alumnos:', err);
        lista.innerHTML =
            '<p class="criterios-vacio">No se pudieron cargar los alumnos.</p>';
        mostrarNotificacion(err.message || 'Error al cargar los alumnos', 'error');
    } finally {
        hideLoaderAlumnos();
        await actualizarSelectAgregar();
    }
}

/** Pinta la lista de alumnos inscritos. */
function renderAlumnos() {
    const lista = document.getElementById('alumnos-lista');
    const contador = document.getElementById('contador-alumnos');
    if (!lista) return;

    lista.innerHTML = '';
    if (contador) contador.textContent = String(estudiantesProyecto.length);

    if (estudiantesProyecto.length === 0) {
        lista.innerHTML =
            '<p class="criterios-vacio">Aún no hay alumnos en este proyecto. Agrega alumnos del grado desde el selector de arriba.</p>';
        return;
    }

    estudiantesProyecto.forEach((alumno, index) => {
        const fila = document.createElement('div');
        fila.className = 'list-item list-item--evaluado alumno-item evaluacion-entrada';
        fila.style.animationDelay = `${Math.min(index * 40, 240)}ms`;
        fila.dataset.estudianteId = alumno.estudiante_id;

        const asistencia = alumno.asistencia === true;
        fila.innerHTML = `
            <div class="list-item__content">
                <span class="material-symbols-rounded alumno-item__icono" aria-hidden="true">person</span>
                <div class="list-item__text-block">
                    <p class="list-item__author alumno-item__nombre">${escapeHtml(alumno.nombre_completo)}</p>
                    ${alumno.nie ? `<p class="list-item__desc alumno-item__nie">NIE: ${escapeHtml(alumno.nie)}</p>` : ''}
                </div>
            </div>
            <div class="centrar gap-row">
                <button type="button" class="alumno-item__quitar" data-ripple
                        aria-label="Quitar a ${escapeHtml(alumno.nombre_completo)}" title="Quitar del proyecto">
                    <span class="material-symbols-rounded" aria-hidden="true">person_remove</span>
                </button>
            </div>
            <div class="proyecto-evaluado__resultado alumno-asistencia__resultado ${asistencia ? 'is-marcada' : 'is-pendiente'}"
                 title="${asistencia ? 'Asistencia ya registrada' : 'Falta registrar la asistencia de este alumno'}">
                <span class="material-symbols-rounded alumno-asistencia__icono" aria-hidden="true">${asistencia ? 'check_circle' : 'schedule'}</span>
                <span class="alumno-asistencia__estado">${asistencia ? 'Asistencia marcada' : 'Asistencia pendiente'}</span>
            </div>
        `;

        fila.querySelector('.alumno-item__quitar')?.addEventListener('click', () => {
            quitarAlumno(alumno.estudiante_id, alumno.nombre_completo);
        });
        fila.addEventListener(
            'animationend',
            () => fila.classList.remove('evaluacion-entrada'),
            { once: true },
        );

        lista.appendChild(fila);
    });
}

/** DELETE /admin/proyectos/:pid/estudiantes/:eid tras confirmación. */
async function quitarAlumno(estudianteId, nombre) {
    let ok;
    try {
        ok = await confirmarAccion(
            `¿Quitar a ${nombre}?`,
            'El alumno dejará de estar inscrito en este proyecto.',
            async () => {
                await fetchJson(
                    `/admin/proyectos/${proyectoId}/estudiantes/${estudianteId}`,
                    { method: 'DELETE' },
                );
            },
        );
    } catch (err) {
        mostrarNotificacion(err.message || 'Error al quitar al alumno', 'error');
        return;
    }
    if (!ok) return;

    mostrarNotificacion('Alumno quitado del proyecto', 'bien');
    await cargarAlumnos();
}

/**
 * Rellena el selector "Agregar alumno" con los estudiantes activos del grado
 * del proyecto que todavía no estén inscritos.
 */
async function actualizarSelectAgregar() {
    const sel = document.getElementById('select-agregar-alumno');
    const btn = document.getElementById('btn-agregar-alumno');
    if (!sel || !btn) return;

    const gradoId = Number(proyectoActual?.grado_id);
    if (!gradoId) {
        poblarSelect('select-agregar-alumno', [], 'Selecciona primero un grado');
        sel.disabled = true;
        btn.disabled = true;
        return;
    }

    try {
        const data = await fetchJson(`/admin/grados/${gradoId}/estudiantes`);
        const inscritos = new Set(estudiantesProyecto.map((e) => String(e.estudiante_id)));
        const disponibles = (data?.estudiantes || []).filter(
            (e) => !inscritos.has(String(e.estudiante_id)),
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

/** Habilita "Agregar" solo cuando hay un alumno elegido. */
function initSelectorAgregar() {
    const sel = document.getElementById('select-agregar-alumno');
    const btn = document.getElementById('btn-agregar-alumno');
    if (!sel || !btn || sel.dataset.init === 'true') return;
    sel.dataset.init = 'true';

    sel.addEventListener('change', () => {
        btn.disabled = !sel.value;
    });

    btn.addEventListener('click', async () => {
        const estudianteId = Number(sel.value);
        if (!estudianteId) {
            mostrarNotificacion('Selecciona un alumno para agregar', 'error');
            return;
        }

        btn.disabled = true;
        try {
            const data = await fetchJson(`/admin/proyectos/${proyectoId}/estudiantes`, {
                method: 'POST',
                body: JSON.stringify({ estudianteIds: [estudianteId] }),
            });
            mostrarNotificacion(data?.mensaje || 'Alumno agregado al proyecto', 'bien');
            await cargarAlumnos();
        } catch (err) {
            console.error('Error al agregar el alumno:', err);
            mostrarNotificacion(err.message || 'Error al agregar el alumno', 'error');
            btn.disabled = false;
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// PESTAÑAS (datos del proyecto / alumnos)
// ═══════════════════════════════════════════════════════════════

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
}

/** Vincula el clic de las pestañas (una sola vez por barra recreada). */
function initPestanas() {
    const bar = document.querySelector('.proyecto-tabs__bar');
    if (!bar || bar.dataset.init === 'true') return;
    bar.dataset.init = 'true';

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
    }

    proyectoId = getProyectoId();
    initPestanas();
    initFormEditar();
    initSelectorAgregar();
    cargarVista();
}

// Carga inicial y cada vez que el router reemplaza el contenido
document.addEventListener('DOMContentLoaded', initEditarProyecto);
document.addEventListener('contentUpdated', initEditarProyecto);
