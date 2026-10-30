// ═══════════════════════════════════════════════════════════════
// MÓDULO: Proyectos Evaluados — lista y notas desde /admin/evaluaciones/proyectos
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';
import { animarEntrada, animarSalida } from './listAnimations.js';
import { cerrarDialogoAnimado } from './menu.js';

// ═══════════════════════════════════════════════════════════════
// FILTROS (mismos que Proyectos, más el estado de la evaluación)
// ═══════════════════════════════════════════════════════════════

const CLAVE_FILTROS_EVALUACIONES = 'insal.filtrosEvaluaciones';
const CLAVES_FILTRO_EVALUACIONES = {
    'filtro-anio-evaluaciones': 'anio',
    'filtro-grado-evaluaciones': 'gradoKey',
    'filtro-seccion-evaluaciones': 'seccion',
    'filtro-rubrica-evaluaciones': 'rubrica',
    'filtro-materia-evaluaciones': 'materia',
    'estado-proyectos-evaluados': 'estado',
};
let estadoFiltros = {
    anio: '',
    gradoKey: '',
    seccion: '',
    rubrica: '',
    materia: '',
    estado: '',
    sort: 'id-desc',
    query: '',
};
let nivelesCache = null;
let materiasCache = null;

function hidratarEstadoFiltros() {
    try {
        const crudo = sessionStorage.getItem(CLAVE_FILTROS_EVALUACIONES);
        if (!crudo) return;
        const datos = JSON.parse(crudo);
        if (!datos || typeof datos !== 'object') return;
        if (datos.rubrica === 'id-desc' || datos.rubrica === 'id-asc') datos.rubrica = '';
        if (datos.sort !== 'id-desc' && datos.sort !== 'id-asc' && datos.sort !== 'rubrica') {
            datos.sort = 'id-desc';
        }
        estadoFiltros = { ...estadoFiltros, ...datos };
    } catch {
        // Sin sessionStorage o dato corrupto: se usan los valores por defecto.
    }
}

function persistirEstadoFiltros() {
    try {
        sessionStorage.setItem(CLAVE_FILTROS_EVALUACIONES, JSON.stringify(estadoFiltros));
    } catch {
        // El estado sigue vigente en memoria.
    }
}

hidratarEstadoFiltros();

function selectFiltroSinOpciones(sel) {
    return sel.options.length <= 1;
}

function vincularGuardadoFiltros() {
    Object.entries(CLAVES_FILTRO_EVALUACIONES).forEach(([id, clave]) => {
        const sel = document.getElementById(id);
        if (!sel || sel.dataset.guardadoFiltrosInit === 'true') return;
        sel.dataset.guardadoFiltrosInit = 'true';
        sel.addEventListener('change', () => {
            if (sel.value === '' && estadoFiltros[clave] && selectFiltroSinOpciones(sel)) return;
            if (clave === 'rubrica' && sel.value !== estadoFiltros.rubrica) {
                estadoFiltros.sort = 'rubrica';
            }
            estadoFiltros[clave] = sel.value;
            persistirEstadoFiltros();
        });
    });

    const selOrden = document.getElementById('orden-proyectos-evaluados');
    if (selOrden && selOrden.dataset.guardadoFiltrosInit !== 'true') {
        selOrden.dataset.guardadoFiltrosInit = 'true';
        selOrden.addEventListener('change', () => {
            const orden = selOrden.value || 'id-desc';
            if (orden !== 'id-desc' && orden !== 'id-asc') return;
            estadoFiltros.sort = orden;
            persistirEstadoFiltros();
        });
    }

    const busqueda = document.getElementById('search-proyectos-evaluados');
    if (!busqueda || busqueda.dataset.guardadoFiltrosInit === 'true') return;
    busqueda.dataset.guardadoFiltrosInit = 'true';
    busqueda.addEventListener('input', () => {
        estadoFiltros.query = busqueda.value;
        persistirEstadoFiltros();
    });
}

function restaurarOrdenLista() {
    const selOrden = document.getElementById('orden-proyectos-evaluados');
    if (!selOrden) return;
    if (estadoFiltros.sort === 'rubrica') {
        const selRubrica = document.getElementById('filtro-rubrica-evaluaciones');
        if (!selRubrica || selectFiltroSinOpciones(selRubrica)) return;
        selRubrica.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }
    if (estadoFiltros.sort !== 'id-desc' && estadoFiltros.sort !== 'id-asc') return;
    if (selOrden.value !== estadoFiltros.sort) selOrden.value = estadoFiltros.sort;
    selOrden.dispatchEvent(new Event('change', { bubbles: true }));
}

function initMobileFilters(container) {
    const toolbar = container.querySelector('.list-toolbar');
    const toggle = toolbar?.querySelector('.list-toolbar__filters-toggle');
    const count = toggle?.querySelector('.list-toolbar__filters-count');
    const dialog = toolbar?.querySelector('#dialogo-filtros-evaluaciones');
    if (!toolbar || !toggle || !count || !dialog || toggle.dataset.initialized === 'true') return;

    const mobileQuery = window.matchMedia('(max-width: 640px)');
    const filterIds = Object.keys(CLAVES_FILTRO_EVALUACIONES);

    const resetFilters = () => {
        const search = container.querySelector('#search-proyectos-evaluados');
        if (search?.value) {
            search.value = '';
            search.dispatchEvent(new Event('input', { bubbles: true }));
        }
        filterIds.forEach((id) => {
            const select = container.querySelector(`#${id}`);
            if (select && select.value) {
                select.value = '';
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
        const sort = container.querySelector('#orden-proyectos-evaluados');
        if (sort && sort.value !== 'id-desc') {
            sort.value = 'id-desc';
            sort.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (sort) {
            sort.dispatchEvent(new Event('change', { bubbles: true }));
        }
    };

    const updateActiveFilterCount = () => {
        const activeCount = filterIds.reduce((total, id) => {
            const select = container.querySelector(`#${id}`);
            return total + (select?.value ? 1 : 0);
        }, 0);
        count.textContent = String(activeCount);
        count.hidden = activeCount === 0;
    };

    toggle.dataset.initialized = 'true';
    toggle.addEventListener('click', () => {
        if (mobileQuery.matches && !dialog.open) {
            dialog.showModal();
            toggle.setAttribute('aria-expanded', 'true');
        }
    });
    dialog.querySelector('.project-filters-close')?.addEventListener('click', () => {
        cerrarDialogoAnimado(dialog);
    });
    dialog.querySelector('.project-filters-done')?.addEventListener('click', () => {
        cerrarDialogoAnimado(dialog);
    });
    dialog.querySelector('.project-filters-reset')?.addEventListener('click', resetFilters);
    dialog.addEventListener('close', () => {
        toggle.setAttribute('aria-expanded', 'false');
    });
    dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        cerrarDialogoAnimado(dialog);
    });
    filterIds.forEach((id) => {
        container.querySelector(`#${id}`)?.addEventListener('change', updateActiveFilterCount);
    });
    mobileQuery.addEventListener('change', () => {
        if (!mobileQuery.matches && dialog.open) dialog.close();
    });
    toggle.setAttribute('aria-expanded', 'false');
    updateActiveFilterCount();
}

function partirDisplayGrade(displayGrade) {
    const texto = (displayGrade || '').trim();
    const idx = texto.lastIndexOf('-');
    if (idx === -1 || idx === texto.length - 1) return { gradoKey: texto, seccion: '' };
    return { gradoKey: texto.slice(0, idx), seccion: texto.slice(idx + 1) };
}

function opcionesFiltroIguales(select, opciones, etiquetaVacia) {
    const actuales = select.options;
    if (actuales.length !== opciones.length + 1) return false;
    const primera = actuales[0];
    if (!primera || primera.value !== '' || primera.textContent !== etiquetaVacia) return false;
    for (let i = 0; i < opciones.length; i++) {
        const opt = actuales[i + 1];
        if (opt.value !== opciones[i].valor || opt.textContent !== opciones[i].label) return false;
    }
    return true;
}

function reconstruirOpcionesFiltro(select, opciones, etiquetaVacia) {
    if (opcionesFiltroIguales(select, opciones, etiquetaVacia)) return false;
    const prevValue = select.value;
    Array.from(select.options).forEach((opt) => opt.remove());
    const vacia = document.createElement('option');
    vacia.value = '';
    vacia.textContent = etiquetaVacia;
    select.appendChild(vacia);
    opciones.forEach(({ valor, label }) => {
        const opt = document.createElement('option');
        opt.value = valor;
        opt.textContent = label;
        select.appendChild(opt);
    });
    if (prevValue && select.querySelector(`option[value="${CSS.escape(prevValue)}"]`)) {
        select.value = prevValue;
    }
    return select.value !== prevValue;
}

function restaurarSelect(sel, valor) {
    if (!sel || !valor || sel.value === valor) return false;
    if (sel.querySelector(`option[value="${CSS.escape(valor)}"]`)) {
        sel.value = valor;
        return true;
    }
    return false;
}

function populateFiltrosEvaluaciones(container, proyectos) {
    const selAnio = container.querySelector('#filtro-anio-evaluaciones');
    const selGrado = container.querySelector('#filtro-grado-evaluaciones');
    const selSeccion = container.querySelector('#filtro-seccion-evaluaciones');
    if (!selAnio || !selGrado || !selSeccion) return;

    const anios = [...new Set(proyectos.map((p) => String(p.anio ?? '')))]
        .filter(Boolean)
        .sort((a, b) => Number(b) - Number(a));
    const cambioAnio = reconstruirOpcionesFiltro(
        selAnio,
        anios.map((v) => ({ valor: v, label: v })),
        'Todos',
    );

    const gradosMap = new Map();
    proyectos.forEach((p) => {
        const { gradoKey } = partirDisplayGrade(p.displayName || p.displayGrade);
        if (gradoKey && !gradosMap.has(gradoKey)) {
            gradosMap.set(gradoKey, { valor: gradoKey, label: gradoKey });
        }
    });
    const grados = [...gradosMap.values()].sort((a, b) => a.label.localeCompare(b.label));
    const cambioGrado = reconstruirOpcionesFiltro(selGrado, grados, 'Todos');

    const secciones = [
        ...new Set(proyectos.map((p) => partirDisplayGrade(p.displayName || p.displayGrade).seccion)),
    ].filter(Boolean).sort();
    const cambioSeccion = reconstruirOpcionesFiltro(
        selSeccion,
        secciones.map((v) => ({ valor: v, label: v })),
        'Todas',
    );

    const restaurarAnio = restaurarSelect(selAnio, estadoFiltros.anio);
    const restaurarGrado = restaurarSelect(selGrado, estadoFiltros.gradoKey);
    const restaurarSeccion = restaurarSelect(selSeccion, estadoFiltros.seccion);
    const selEstado = container.querySelector('#estado-proyectos-evaluados');
    const restaurarEstado = restaurarSelect(selEstado, estadoFiltros.estado);

    const state = container.__insalListState;
    if (state) {
        state.filters = {};
        container.querySelectorAll('select[data-filter]').forEach((sel) => {
            if (sel.value) state.filters[sel.dataset.filterKey] = sel.value;
        });
    }

    if (cambioAnio || restaurarAnio) selAnio.dispatchEvent(new Event('change', { bubbles: true }));
    if (cambioGrado || restaurarGrado) selGrado.dispatchEvent(new Event('change', { bubbles: true }));
    if (cambioSeccion || restaurarSeccion) selSeccion.dispatchEvent(new Event('change', { bubbles: true }));
    if (restaurarEstado) selEstado.dispatchEvent(new Event('change', { bubbles: true }));
}

async function obtenerCatalogo(url, clave) {
    const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data || !Array.isArray(data[clave])) {
        throw new Error(data?.mensaje || `Error al cargar ${clave}`);
    }
    return data[clave];
}

async function cargarOpcionesRubricas() {
    const sel = document.getElementById('filtro-rubrica-evaluaciones');
    if (!sel) return;
    if (!Array.isArray(nivelesCache)) {
        try {
            nivelesCache = await obtenerCatalogo('/admin/niveles-evaluacion', 'niveles');
        } catch {
            return;
        }
    }
    const opciones = nivelesCache.map((nivel) => ({
        valor: String(nivel.nivel_id),
        label: nivel.nombre || 'Sin nombre',
    }));
    const cambioValor = reconstruirOpcionesFiltro(sel, opciones, 'Todas');
    const restauro = restaurarSelect(sel, estadoFiltros.rubrica);
    if (cambioValor || restauro) sel.dispatchEvent(new Event('change', { bubbles: true }));
    restaurarOrdenLista();
}

async function cargarOpcionesMaterias() {
    const sel = document.getElementById('filtro-materia-evaluaciones');
    if (!sel) return;
    if (!Array.isArray(materiasCache)) {
        try {
            materiasCache = await obtenerCatalogo('/admin/materias', 'materias');
        } catch {
            return;
        }
    }
    const opciones = materiasCache.map((m) => ({
        valor: String(m.materia_id),
        label: m.nombre_materia || 'Sin nombre',
    }));
    const cambioValor = reconstruirOpcionesFiltro(sel, opciones, 'Todas');
    const restauro = restaurarSelect(sel, estadoFiltros.materia);
    if (cambioValor || restauro) sel.dispatchEvent(new Event('change', { bubbles: true }));
}

function aplicarDatosFiltro(el, proyecto) {
    const gradoTexto = proyecto.displayName || proyecto.displayGrade || '';
    const categorias = partirDisplayGrade(gradoTexto);
    el.dataset.anio = proyecto.anio != null ? String(proyecto.anio) : '';
    el.dataset.gradoKey = categorias.gradoKey;
    el.dataset.seccion = categorias.seccion;
    el.dataset.rubrica = proyecto.nivel_id != null ? String(proyecto.nivel_id) : '';
    el.dataset.materiaId = proyecto.materia_id != null ? String(proyecto.materia_id) : '';
    el.dataset.estado = proyecto.estado === 'completa' ? 'completa' : 'parcial';
}

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
    container.classList.toggle('has-items', hasItems);
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
            if (typeof window.prepararLista === 'function') window.prepararLista(container);
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
            container.classList.remove('is-lista-preparando');
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
            const busqueda = container.querySelector('#search-proyectos-evaluados');
            if (busqueda) busqueda.value = estadoFiltros.query || '';

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

            items.forEach((el) => container.appendChild(el));
            try {
                await container.__catalogosLista;
            } catch {
                // El catálogo de rúbrica/materia ya avisó su propio error.
            }
            populateFiltrosEvaluaciones(container, data.proyectos);
            restaurarOrdenLista();
            toggleEmptyState(container);
            if (typeof window.revelarLista === 'function') {
                window.revelarLista(container);
            } else {
                container.classList.remove('is-lista-preparando');
                hideLoader(container);
            }
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
            populateFiltrosEvaluaciones(container, data.proyectos);
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
        container.classList.remove('is-lista-preparando');
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

    div.dataset.nombre = (proyecto.nombre || '').trim();
    div.dataset.grado = (proyecto.displayName || '').trim();
    aplicarDatosFiltro(div, proyecto);

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

    el.dataset.itemId = String(proyecto.proyecto_id);
    el.dataset.nombre = (proyecto.nombre || '').trim();
    el.dataset.grado = (proyecto.displayName || '').trim();
    aplicarDatosFiltro(el, proyecto);
}

// ═══════════════════════════════════════════════════════════════
// EXPONER FUNCIONES GLOBALMENTE (para onclick en HTML)
// ═══════════════════════════════════════════════════════════════

window.loadProyectosEvaluados = loadProyectosEvaluados;

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

function initFiltrosEvaluaciones() {
    const container = getContainer();
    if (!container) return;
    initMobileFilters(container);
    vincularGuardadoFiltros();
    restaurarOrdenLista();
    container.__catalogosLista = Promise.all([
        cargarOpcionesRubricas(),
        cargarOpcionesMaterias(),
    ]);
}

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
    initFiltrosEvaluaciones();
    loadProyectosEvaluados();
});
document.addEventListener('contentUpdated', () => {
    initEvaluacionesDialog();
    initFiltrosEvaluaciones();
    loadProyectosEvaluados();
});