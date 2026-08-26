// ═══════════════════════════════════════════════════════════════
// MÓDULO: Proyectos Evaluados — lista y notas desde /admin/evaluaciones/proyectos
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';
import { animarEntrada, animarSalida } from './listAnimations.js';

// ═══════════════════════════════════════════════════════════════
// HELPERS — Estado de la lista
// ═══════════════════════════════════════════════════════════════

function getContainer() {
    return document.getElementById('proyectos-evaluados__container');
}

/** Determina si el contenedor está vacío (carga fría). */
function isContainerEmpty(container) {
    return container.querySelectorAll('.list-item').length === 0;
}

/** Oculta el loader lineal. */
function hideLoader(container) {
    const loader = container?.querySelector('.section-loader');
    if (loader) loader.style.display = 'none';
}

/** Muestra/oculta el estado vacío y la toolbar según si hay proyectos. */
function toggleEmptyState(container) {
    const emptyEl = container?.querySelector('.section-empty');
    const toolbar = container?.querySelector('.list-toolbar');
    if (!container || !emptyEl) return;
    const hasItems = container.querySelectorAll('.list-item').length > 0;
    emptyEl.style.display = hasItems ? 'none' : 'flex';
    if (toolbar) toolbar.style.display = hasItems ? '' : 'none';
}

/** Devuelve el botón refresh activo en pantalla. */
function getRefreshBtn() {
    return document.querySelector('.btn-refresh');
}

// ═══════════════════════════════════════════════════════════════
// CARGA DE PROYECTOS EVALUADOS
// ═══════════════════════════════════════════════════════════════

/**
 * Carga los proyectos evaluados (completos y parciales) desde el servidor.
 *
 * Dos modos de operación automáticos:
 * - Carga fría (contenedor vacío): progress bar → renderiza todo con entrada escalonada.
 * - Soft refresh (ya hay proyectos): shimmer overlay sobre existentes → diff inteligente
 *   (entradas/salidas animadas vía WAAPI desde listAnimations.js, persistentes con pulso).
 * @param {HTMLElement} [btn] - Botón de refresh (opcional).
 */
async function loadProyectosEvaluados(btn) {
    const container = getContainer();
    if (!container) return;

    const refreshBtn = btn || getRefreshBtn();
    // Mostrar spinner siempre que se cargue
    if (refreshBtn) refreshBtn.classList.add('is-loading');

    try {
        const coldLoad = isContainerEmpty(container);
        if (coldLoad) {
            const toolbar = container.querySelector('.list-toolbar');
            if (toolbar) toolbar.style.display = 'none';
        }

        // ── PRE-FETCH: preparar UI según modo ──
        let oldIds = new Set();
        if (!coldLoad) {
            // Soft refresh: guardar IDs actuales + shimmer overlay en existentes
            oldIds = new Set(
                [...container.querySelectorAll('.list-item')].map(
                    (el) => el.dataset.itemId,
                ),
            );
            container.querySelectorAll('.list-item').forEach((el) => {
                el.classList.add('list-item--refreshing');
            });
        }

        // ── FETCH ──
        const response = await fetch('/admin/evaluaciones/proyectos', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }
        console.log('[proyectos-evaluados] status:', response.status, 'data:', data);

        if (!response.ok || !data || !Array.isArray(data.proyectos)) {
            // No marcar como "vacío": es un error del servidor.
            console.error('Respuesta del endpoint:', response.status, data);
            hideLoader(container);
            container.querySelectorAll('.list-item--refreshing').forEach((el) => {
                el.classList.remove('list-item--refreshing');
            });
            if (refreshBtn) refreshBtn.classList.remove('is-loading');
            mostrarNotificacion(
                data?.mensaje || 'Error al cargar los proyectos evaluados',
                'error',
            );
            return;
        }

        // ── POST-FETCH: aplicar cambios según modo ──
        if (coldLoad) {
            // Carga fría: renderizar todo con entrada escalonada, en el orden
            // del selector de orden (searchList no los vuelve a reordenar).
            const sortSelect = container.querySelector('select[data-sort]');
            const items = [...data.proyectos]
                .sort((a, b) => {
                    const diff =
                        Number(a.proyecto_id) - Number(b.proyecto_id);
                    return sortSelect && sortSelect.value === 'id-asc'
                        ? diff
                        : -diff;
                })
                .map((p) => createProyectoElement(p));

            items.forEach((el, index) => {
                container.appendChild(el);
                animarEntrada(el, index * 80);
            });

            hideLoader(container);
            toggleEmptyState(container);
            if (refreshBtn) refreshBtn.classList.remove('is-loading');
        } else {
            // Soft refresh: diff inteligente
            const newIds = new Set(data.proyectos.map((p) => String(p.proyecto_id)));

            // Quitar shimmer overlay a todos
            container.querySelectorAll('.list-item--refreshing').forEach((el) => {
                el.classList.remove('list-item--refreshing');
            });

            // Salientes: animar salida (WAAPI) y eliminar del DOM al terminar.
            // data-saliendo marca al nodo moribundo para que los entrantes
            // no se inserten antes de él.
            const toRemove = [...oldIds].filter((id) => !newIds.has(id));
            toRemove.forEach((id) => {
                const el = container.querySelector(`.list-item[data-item-id="${id}"]`);
                if (el) {
                    el.setAttribute('data-saliendo', '');
                    animarSalida(el).then(() => el.remove());
                }
            });

            const proyectoMap = new Map(
                data.proyectos.map((p) => [String(p.proyecto_id), p]),
            );

            // Persistentes: refrescar contenido con datos frescos (la nota o
            // el nombre pueden haber cambiado aunque el ID no) y pulso.
            const keptIds = [...oldIds].filter((id) => newIds.has(id));
            keptIds.forEach((id) => {
                const el = container.querySelector(
                    `.list-item[data-item-id="${id}"]:not([data-saliendo])`,
                );
                if (el) {
                    updateProyectoEvaluadoElement(el, proyectoMap.get(id));
                    el.classList.add('list-item--updated');
                    el.addEventListener(
                        'animationend',
                        () => el.classList.remove('list-item--updated'),
                        { once: true },
                    );
                }
            });

            // Entrantes: insertar en la posición correcta según el orden
            // del selector de orden (id-desc por defecto)
            const sortSelect = container.querySelector('select[data-sort]');
            const asc = sortSelect && sortSelect.value === 'id-asc';
            const allOrdered = [...data.proyectos]
                .map((p) => String(p.proyecto_id))
                .sort((a, b) => (asc ? Number(a) - Number(b) : Number(b) - Number(a)));
            const enteringIds = [...newIds].filter((id) => !oldIds.has(id));

            enteringIds.forEach((id) => {
                const proyecto = proyectoMap.get(id);
                if (!proyecto) return;

                const elemento = createProyectoElement(proyecto);

                // Buscar el siguiente item persistente en el orden objetivo
                let insertBeforeEl = null;
                const idx = allOrdered.indexOf(id);
                for (let i = idx + 1; i < allOrdered.length; i++) {
                    const nextId = allOrdered[i];
                    if (oldIds.has(nextId)) {
                        insertBeforeEl = container.querySelector(
                            `.list-item[data-item-id="${nextId}"]:not([data-saliendo])`,
                        );
                        if (insertBeforeEl) break;
                    }
                }

                if (insertBeforeEl) {
                    container.insertBefore(elemento, insertBeforeEl);
                } else {
                    const loader = container.querySelector('.section-loader');
                    if (loader && loader.parentNode === container) {
                        container.insertBefore(elemento, loader);
                    } else {
                        container.appendChild(elemento);
                    }
                }

                animarEntrada(elemento, 0);
            });

            hideLoader(container);
            toggleEmptyState(container);
            // Re-aplicar búsqueda/filtros/orden tras el refresh (los data-*
            // de los persistentes pueden haber cambiado y el MutationObserver
            // de searchList no se dispara por cambios de atributos).
            if (typeof window.aplicarEstadoLista === 'function') {
                window.aplicarEstadoLista(container);
            }
            if (refreshBtn) refreshBtn.classList.remove('is-loading');
        }
    } catch (error) {
        console.error('Error al cargar proyectos evaluados:', error);
        hideLoader(container);
        toggleEmptyState(container);
        container.querySelectorAll('.list-item--refreshing').forEach((el) => {
            el.classList.remove('list-item--refreshing');
        });
        if (refreshBtn) refreshBtn.classList.remove('is-loading');
        mostrarNotificacion('Error al cargar los proyectos evaluados', 'error');
    }
}
// ═══════════════════════════════════════════════════════════════
// CREACIÓN DE ELEMENTOS
// ═══════════════════════════════════════════════════════════════

/**
 * Formatea un valor numérico con 2 decimales.
 */
function formatNota(valor) {
    const n = Number(valor);
    if (Number.isNaN(n)) return '—';
    return n.toFixed(2);
}

/**
 * Crea el elemento DOM de un proyecto evaluado.
 * @param {Object} proyecto - Datos desde la API.
 */
function createProyectoElement(proyecto) {
    const div = document.createElement('div');
    div.className = 'list-item list-item--evaluado';
    div.setAttribute('data-item-id', proyecto.proyecto_id);

    const nota = formatNota(proyecto.nota);
    const esCompleta = proyecto.estado === 'completa';
    const notaClase = esCompleta ? 'proyecto-nota--completa' : 'proyecto-nota--parcial';

    const detalleGrado = [
        proyecto.displayName,
        proyecto.bachillerato,
        `${proyecto.total_evaluaciones} eval.`,
    ]
        .filter(Boolean)
        .join(' · ');

    div.innerHTML = `
    <div class="list-item__content">
        <span class="material-symbols-rounded">school</span>
        <div class="list-item__text-block">
            <p class="list-item__author proyecto-evaluado__nombre"></p>
            <p class="list-item__desc proyecto-evaluado__grado"></p>
        </div>
    </div>
    <div class="centrar gap-row">
        <a href="/menu/evaluaciones/${proyecto.proyecto_id}" data-link class="centrar boton btn-small btn-mas">
            <p>Detalles</p>
            <span class="material-symbols-rounded">arrow_outward</span>
        </a>
    </div>
    <div class="proyecto-evaluado__resultado ${notaClase}">
        <span class="proyecto-evaluado__nota">${nota}</span>
    </div>
    `;

    div.querySelector('.proyecto-evaluado__nombre').textContent =
        proyecto.nombre || 'Sin nombre';
    div.querySelector('.proyecto-evaluado__grado').textContent = detalleGrado;

    // Datos en data-* para ordenar/filtrar sin leer el DOM
    div.dataset.nombre = (proyecto.nombre || '').trim();
    div.dataset.grado = (proyecto.displayName || '').trim();
    div.dataset.estado = esCompleta ? 'completa' : 'parcial';

    return div;
}

/**
 * Actualiza el contenido y los data-* de un .list-item--evaluado existente
 * con datos frescos del servidor, SIN reemplazar el nodo raíz (preserva
 * referencias y animaciones). Permite que el soft refresh refleje cambios
 * de nota/nombre aunque el proyecto_id no cambie.
 * @param {HTMLElement} el - Nodo .list-item--evaluado existente.
 * @param {Object} proyecto - Datos del proyecto evaluado desde la API.
 */
function updateProyectoEvaluadoElement(el, proyecto) {
    if (!el || !proyecto) return;

    const nota = formatNota(proyecto.nota);
    const esCompleta = proyecto.estado === 'completa';
    const notaClase = esCompleta ? 'proyecto-nota--completa' : 'proyecto-nota--parcial';

    const detalleGrado = [
        proyecto.displayName,
        proyecto.bachillerato,
        `${proyecto.total_evaluaciones} eval.`,
    ]
        .filter(Boolean)
        .join(' · ');

    // Textos
    const nombreEl = el.querySelector('.proyecto-evaluado__nombre');
    if (nombreEl) nombreEl.textContent = proyecto.nombre || 'Sin nombre';
    const gradoEl = el.querySelector('.proyecto-evaluado__grado');
    if (gradoEl) gradoEl.textContent = detalleGrado;

    // Nota (texto + clase de estado)
    const notaEl = el.querySelector('.proyecto-evaluado__nota');
    if (notaEl) notaEl.textContent = nota;
    const resultadoEl = el.querySelector('.proyecto-evaluado__resultado');
    if (resultadoEl) {
        resultadoEl.classList.remove('proyecto-nota--completa', 'proyecto-nota--parcial');
        resultadoEl.classList.add(notaClase);
    }

    // Enlace "Detalles"
    const link = el.querySelector('a.btn-mas');
    if (link) link.href = `/menu/evaluaciones/${proyecto.proyecto_id}`;

    // data-* para ordenar/filtrar
    el.dataset.itemId = String(proyecto.proyecto_id);
    el.dataset.nombre = (proyecto.nombre || '').trim();
    el.dataset.grado = (proyecto.displayName || '').trim();
    el.dataset.estado = esCompleta ? 'completa' : 'parcial';
}

// ═══════════════════════════════════════════════════════════════
// EXPONER FUNCIONES GLOBALMENTE (para onclick en HTML)
// ═══════════════════════════════════════════════════════════════

window.loadProyectosEvaluados = loadProyectosEvaluados;

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

function initEvaluacionesDialog() {
    const dialog = document.getElementById('dialogo-info-evaluaciones');
    if (!dialog || dialog.dataset.handlerInitialized) return;
    dialog.dataset.handlerInitialized = 'true';

    // Cerrar el diálogo con su animación (reutiliza la utilidad de menu.js)
    const cerrar = () => {
        if (typeof window.toggleDialog === 'function') {
            window.toggleDialog('dialogo-info-evaluaciones');
        } else {
            dialog.close();
        }
    };

    const botones = [
        document.getElementById('btn-cerrar-info-evaluaciones'),
        document.getElementById('btn-cerrar-info-evaluaciones-inferior'),
    ];
    botones.forEach((btn) => btn?.addEventListener('click', cerrar));
}

// Carga inicial y cada vez que el router reemplaza el contenido
document.addEventListener('DOMContentLoaded', () => {
    initEvaluacionesDialog();
    loadProyectosEvaluados();
});
document.addEventListener('contentUpdated', () => {
    initEvaluacionesDialog();
    loadProyectosEvaluados();
});