// ═══════════════════════════════════════════════════════════════
// MÓDULO: Detalle de evaluación (vista /menu/evaluaciones/:id)
//  Muestra los datos reales del proyecto y sus evaluaciones:
//   - GET /admin/proyectos/:id                              → encabezado
//   - GET /admin/evaluaciones/proyectos/:id/evaluaciones    → lista
//   - GET /evaluacion-criterios/:evaluacionId               → desglose (lazy)
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';

// ═══════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════

let proyectoId = null;
let ultimaCargaId = null;

/** Lee el id del proyecto desde el data-attribute de la vista (o de la URL). */
function getProyectoId() {
    const root = document.querySelector('.contenedor-criterios[data-proyecto-id]');
    if (root?.dataset?.proyectoId) return root.dataset.proyectoId;
    const m = location.pathname.match(/^\/menu\/evaluaciones\/(\d+)$/);
    return m ? m[1] : null;
}

async function fetchJson(url) {
    const res = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
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

/** Formatea un timestamp ISO → "día mes año · hh:mm". */
function formatFecha(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return String(fecha);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} · ${hh}:${mi}`;
}

// ═══════════════════════════════════════════════════════════════
// CARGA DE EVALUACIONES
// ═══════════════════════════════════════════════════════════════

function hideLoader() {
    const loader = document.getElementById('evaluaciones-loader');
    if (loader) loader.style.display = 'none';
}

/** Carga el detalle del proyecto y sus evaluaciones desde el backend. */
async function cargarDetalle() {
    if (!proyectoId) return;
    const lista = document.getElementById('evaluaciones-lista');
    if (!lista) return;

    // Evitar doble carga (DOMContentLoaded + contentUpdated)
    if (ultimaCargaId === proyectoId && lista.children.length > 0) return;
    ultimaCargaId = proyectoId;

    try {
        // Encabezado del proyecto + evaluaciones, en paralelo
        const [proyectoData, evaluacionesData] = await Promise.all([
            fetchJson(`/admin/proyectos/${proyectoId}`).catch((err) => {
                console.error('Error al cargar el proyecto:', err);
                return null; // el encabezado no debe romper la lista
            }),
            fetchJson(`/admin/evaluaciones/proyectos/${proyectoId}/evaluaciones`),
        ]);

        renderEncabezado(proyectoData?.proyecto || null);

        const evaluaciones = Array.isArray(evaluacionesData?.evaluaciones)
            ? evaluacionesData.evaluaciones
            : [];

        const contador = document.getElementById('contador-evaluaciones');
        if (contador) contador.textContent = evaluaciones.length;

        renderEvaluaciones(evaluaciones);
    } catch (err) {
        console.error('Error al cargar detalle de evaluación:', err);
        hideLoader();
        const nombreEl = document.getElementById('detalle-proyecto-nombre');
        if (nombreEl) nombreEl.textContent = 'No se pudo cargar';
        const subEl = document.getElementById('detalle-proyecto-sub');
        if (subEl) subEl.textContent = 'Inténtalo de nuevo más tarde.';
        mostrarNotificacion(
            err?.message || 'No se pudo cargar el detalle de la evaluación',
            'error',
        );
    }
}

/**
 * Pinta el encabezado del proyecto con los datos reales de
 * GET /admin/proyectos/:id (nombre, grado, año, nota final).
 */
function renderEncabezado(proyecto) {
    const nombreEl = document.getElementById('detalle-proyecto-nombre');
    const subEl = document.getElementById('detalle-proyecto-sub');

    if (nombreEl) {
        nombreEl.textContent = proyecto?.nombre || 'Proyecto';
    }

    if (!subEl) return;

    if (!proyecto) {
        subEl.textContent = 'No se pudo cargar la información del proyecto.';
        return;
    }

    const partes = [
        proyecto.displayGrade,
        proyecto.nivel_nombre,
        proyecto.anio ? `Año ${proyecto.anio}` : '',
    ].filter(Boolean);

    const nota = Number(proyecto.nota);
    if (!Number.isNaN(nota)) {
        partes.push(`Nota: ${nota.toFixed(2)}`);
    }

    subEl.textContent =
        partes.length > 0 ? partes.join(' · ') : 'Proyecto sin información de grado.';
}
// ═══════════════════════════════════════════════════════════════
// RENDER DE EVALUACIONES
// ═══════════════════════════════════════════════════════════════

/**
 * Carga y pinta el desglose de criterios de una evaluación usando
 * GET /evaluacion-criterios/:evaluacionId (carga diferida).
 */
async function cargarCriteriosEvaluacion(evaluacionId, panel) {
    const contenido = panel.querySelector('.evaluacion-detalle__criterios-contenido');
    if (!contenido) return;

    try {
        const data = await fetchJson(`/evaluacion-criterios/${evaluacionId}`);
        const criterios = Array.isArray(data?.criterios) ? data.criterios : [];

        if (criterios.length === 0) {
            contenido.innerHTML =
                '<p class="evaluacion-detalle__criterios-vacio">Sin criterios registrados.</p>';
            return;
        }

        contenido.innerHTML = criterios
            .map((c) => {
                const ponderado = (Number(c.puntuacion) * Number(c.porcentaje)) / 100;
                return `
                <div class="evaluacion-detalle__criterio">
                    <p class="evaluacion-detalle__criterio-nombre">${escapeHtml(c.nombre || 'Criterio')}</p>
                    <span class="evaluacion-detalle__criterio-porc">${Number(c.porcentaje)}%</span>
                    <span class="evaluacion-detalle__criterio-puntos">${formatNota(c.puntuacion)} p</span>
                    <span class="evaluacion-detalle__criterio-pond" title="Aporte ponderado">+${formatNota(ponderado)}</span>
                </div>`;
            })
            .join('');
    } catch (err) {
        console.error('Error al cargar criterios de la evaluación:', err);
        contenido.innerHTML =
            '<p class="evaluacion-detalle__criterios-vacio">No se pudieron cargar los criterios.</p>';
        mostrarNotificacion(
            err?.message || 'Error al cargar los criterios de la evaluación',
            'error',
        );
    }
}


/** Crea la tarjeta de una evaluación (quién evaluó, nota y fecha). */
function createEvaluacionCard(ev, index) {
    const card = document.createElement('div');
    card.className = 'evaluacion-detalle__card evaluacion-entrada';
    card.style.animationDelay = `${index * 80}ms`;

    const nota = formatNota(ev.nota);
    const fecha = formatFecha(ev.fecha_evaluacion);

    card.innerHTML = `
        <button type="button" class="evaluacion-detalle__resumen"
            aria-expanded="false" aria-label="Ver criterios de esta evaluación">
            <div class="evaluacion-detalle__num">
                <span class="material-symbols-rounded" aria-hidden="true">badge</span>
            </div>
            <div class="evaluacion-detalle__info">
                <p class="evaluacion-detalle__evaluador">${escapeHtml(ev.evaluador_nombre || 'Evaluador')}
                    <span class="evaluacion-detalle__grupo">#${Number(ev.evaluador_id) || index + 1}</span>
                </p>
                <p class="evaluacion-detalle__meta">
                    <span class="material-symbols-rounded" aria-hidden="true">schedule</span>
                    ${escapeHtml(fecha)}
                </p>
                <p class="evaluacion-detalle__meta">
                    <span class="material-symbols-rounded" aria-hidden="true">mail</span>
                    ${escapeHtml(ev.evaluador_email || '—')}
                </p>
            </div>
            <div class="evaluacion-detalle__nota">
                <span class="evaluacion-detalle__nota-valor">${nota}</span>
                <span class="material-symbols-rounded evaluacion-detalle__chevron" aria-hidden="true">expand_more</span>
            </div>
        </button>
        <div class="evaluacion-detalle__criterios" hidden>
            <p class="evaluacion-detalle__criterios-titulo">Criterios evaluados</p>
            <div class="evaluacion-detalle__criterios-contenido"></div>
        </div>
    `;
    const resumenBtn = card.querySelector('.evaluacion-detalle__resumen');
    const panel = card.querySelector('.evaluacion-detalle__criterios');

    resumenBtn.addEventListener('click', () => {
        const abierto = card.classList.toggle('is-abierto');
        resumenBtn.setAttribute('aria-expanded', String(abierto));

        if (abierto) {
            panel.hidden = false;
            requestAnimationFrame(() => panel.classList.add('is-visible'));
        } else {
            panel.classList.remove('is-visible');
            setTimeout(() => {
                panel.hidden = true;
            }, 200);
        }

        // Carga diferida: solo la primera vez que se expande
        if (abierto && !panel.dataset.cargado) {
            panel.dataset.cargado = 'true';
            panel.querySelector('.evaluacion-detalle__criterios-contenido').innerHTML =
                '<div class="progreso-lineal indeterminado"><div class="progreso-indicador"></div></div>';
            cargarCriteriosEvaluacion(Number(ev.evaluacion_id), panel);
        }
    });

    card.addEventListener(
        'animationend',
        () => {
            card.classList.remove('evaluacion-entrada');
            card.style.animationDelay = '';
        },
        { once: true },
    );

    return card;
}

function renderEvaluaciones(evaluaciones) {
    const lista = document.getElementById('evaluaciones-lista');
    if (!lista) return;

    lista.innerHTML = '';

    const subEl = document.getElementById('detalle-proyecto-sub');

    if (evaluaciones.length === 0) {
        lista.innerHTML =
            '<p class="criterios-vacio">Aún no hay evaluaciones para este proyecto.</p>';
        if (subEl) subEl.textContent = 'Este proyecto no tiene evaluaciones registradas.';
    } else {
        evaluaciones.forEach((ev, index) => {
            lista.appendChild(createEvaluacionCard(ev, index));
        });
        // Si el encabezado ya trae la nota final, solo añadimos el conteo
        if (subEl && !subEl.textContent.includes('Nota:') && !subEl.textContent.includes('evaluación')) {
            subEl.textContent = `${subEl.textContent ? subEl.textContent + ' · ' : ''}${evaluaciones.length} evaluación(es)`;
        }
    }

    hideLoader();
}

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

function initDetalle() {
    proyectoId = getProyectoId();
    cargarDetalle();
}

// Carga inicial y cada vez que el router reemplaza el contenido
document.addEventListener('DOMContentLoaded', initDetalle);
document.addEventListener('contentUpdated', initDetalle);