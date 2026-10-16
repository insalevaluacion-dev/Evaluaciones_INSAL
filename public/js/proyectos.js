// ═══════════════════════════════════════════════════════════════
// MÓDULO: Proyectos — CRUD, renderizado y animaciones de lista
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';
import { createSubmitHandler } from './submitHandler.js';
import { cerrarDialogoAnimado, posicionarMenuFlotante } from './menu.js';
import { confirmarAccion } from './editar-criterios.js';
import { animarEntrada, animarSalida } from './listAnimations.js';
import { puedeEliminarProyectos } from './permisos.js';

// ═══════════════════════════════════════════════════════════════
// ESTADO Y REFERENCIAS
// ═══════════════════════════════════════════════════════════════

let currentProyectoId = null;
let menuVisible = false;

// ═══════════════════════════════════════════════════════════════
// ESTADO DE LOS FILTROS DE LA LISTA (se recuerda al salir/entrar)
// ═══════════════════════════════════════════════════════════════
// Al pulsar "Modificar" el router navega a /menu/proyectos/:id y destruye
// el DOM de la lista; al volver, la vista se reconstruye desde cero con los
// selects vacíos. Este objeto conserva los valores de la toolbar (Año,
// Grado, Sección, Rúbrica y Orden) mientras viva la sesión de la pestaña,
// para restaurarlos en la vista recreada. `sort` guarda el ORDEN EFECTIVO
// de la lista: 'id-desc'/'id-asc' (del select de orden) o 'rubrica' (lo
// fija searchList al tocar el filtro de rúbrica, aunque ese valor no exista
// como opción del select de orden).
const CLAVE_FILTROS_PROYECTOS = 'insal.filtrosProyectos';
let estadoFiltros = {
    anio: '',
    gradoKey: '',
    seccion: '',
    rubrica: '',
    materia: '',
    sort: 'id-desc',
};

/** Hidrata estadoFiltros desde sessionStorage (sobrevive a recargas de F5). */
function hidratarEstadoFiltros() {
    try {
        const crudo = sessionStorage.getItem(CLAVE_FILTROS_PROYECTOS);
        if (!crudo) return;
        const datos = JSON.parse(crudo);
        if (datos && typeof datos === 'object') {
            estadoFiltros = { ...estadoFiltros, ...datos };
        }
    } catch {
        // Sin sessionStorage (modo privado) o dato corrupto: se ignora.
    }
}

/** Persiste estadoFiltros en sessionStorage. */
function persistirEstadoFiltros() {
    try {
        sessionStorage.setItem(CLAVE_FILTROS_PROYECTOS, JSON.stringify(estadoFiltros));
    } catch {
        // Sin sessionStorage: el estado sigue vigente en memoria.
    }
}

hidratarEstadoFiltros();

/**
 * Vincula a cada select de la toolbar un listener que mantiene estadoFiltros
 * al día (y lo persiste) cada vez que el usuario cambia un filtro u el orden.
 * Se llama en cada initProyectosHandlers; el guard por dataset evita
 * listeners duplicados sobre los selects de la vista vigente.
 */
function vincularGuardadoFiltros() {
    const ids = [
        'filtro-anio-proyectos',
        'filtro-grado-proyectos',
        'filtro-seccion-proyectos',
        'filtro-rubrica-proyectos',
        'filtro-materia-proyectos',
        'orden-proyectos',
    ];
    ids.forEach((id) => {
        const sel = document.getElementById(id);
        if (!sel || sel.dataset.guardadoFiltrosInit === 'true') return;
        sel.dataset.guardadoFiltrosInit = 'true';
        sel.addEventListener('change', () => {
            if (id === 'orden-proyectos') {
                // El orden efectivo pasa a ser el del select...
                estadoFiltros.sort = sel.value || 'id-desc';
            } else if (id === 'filtro-rubrica-proyectos') {
                // ...salvo al tocar rúbrica: searchList agrupa la lista por
                // rúbrica (state.sort = 'rubrica') aunque el valor quede ''.
                estadoFiltros.sort = 'rubrica';
            }
            const clave = id === 'filtro-anio-proyectos' ? 'anio'
                : id === 'filtro-grado-proyectos' ? 'gradoKey'
                : id === 'filtro-seccion-proyectos' ? 'seccion'
                : id === 'filtro-materia-proyectos' ? 'materia'
                : 'rubrica';
            estadoFiltros[clave] = sel.value;
            persistirEstadoFiltros();
        });
    });
}

/**
 * Restaura el orden efectivo de la lista (estadoFiltros.sort) en la toolbar.
 * Si el orden guardado es 'rubrica' no hay opción que marcar en el select
 * de orden (solo tiene id-desc/id-asc): se re-aplica re-disparando el change
 * del filtro de rúbrica, que es como searchList activa ese agrupamiento.
 * Idempotente: se llama en la init y de nuevo tras repoblar la rúbrica,
 * porque el change de esta última fija state.sort = 'rubrica' y podría pisar
 * el orden elegido por el usuario.
 */
function restaurarOrdenLista() {
    const selOrden = document.getElementById('orden-proyectos');
    if (!selOrden) return;
    if (estadoFiltros.sort === 'rubrica') {
        document.getElementById('filtro-rubrica-proyectos')
            ?.dispatchEvent(new Event('change', { bubbles: true }));
        return;
    }
    if (estadoFiltros.sort && selOrden.value !== estadoFiltros.sort) {
        selOrden.value = estadoFiltros.sort;
    }
    selOrden.dispatchEvent(new Event('change', { bubbles: true }));
}

function initMobileProjectActions() {
    const dialog = document.getElementById('dialogo-acciones-proyecto');
    if (!dialog) return null;

    const mobileQuery = window.matchMedia('(max-width: 640px)');
    const closeButton = dialog.querySelector('[data-cerrar-acciones-proyecto]');
    const projectName = dialog.querySelector('[data-proyecto-nombre]');
    const openLink = dialog.querySelector('[data-accion-movil="abrir"]');

    if (dialog.dataset.handlerInitialized !== 'true') {
        dialog.dataset.handlerInitialized = 'true';

        closeButton?.addEventListener('click', () => cerrarDialogoAnimado(dialog));
        dialog.addEventListener('close', () => dialog.classList.remove('closing'));
        dialog.addEventListener('cancel', (event) => {
            event.preventDefault();
            cerrarDialogoAnimado(dialog);
        });

        dialog.addEventListener('click', async (event) => {
            const action = event.target.closest('[data-accion-movil]');
            if (!action || action.dataset.accionMovil === 'abrir') return;

            const actionName = action.dataset.accionMovil;
            dialog.close();
            if (actionName === 'editar') {
                abrirDialogoEditarProyecto();
            } else if (actionName === 'eliminar') {
                await eliminarProyecto(currentProyectoId);
            }
        });

        mobileQuery.addEventListener('change', () => {
            if (!mobileQuery.matches && dialog.open) dialog.close();
        });
    }

    return (itemElement) => {
        const id = itemElement.dataset.itemId;
        projectName.textContent = itemElement.dataset.nombre || 'Sin nombre';
        openLink.href = `/menu/proyectos/${encodeURIComponent(id)}`;
    };
}

function getMenuList() {
    return document.getElementById('menu__list');
}

function getContainer() {
    return document.getElementById('proyectos__container');
}

function initMobileProjectFilters(container) {
    const toolbar = container.querySelector('.list-toolbar');
    const toggle = toolbar?.querySelector('.list-toolbar__filters-toggle');
    const count = toggle?.querySelector('.list-toolbar__filters-count');
    const dialog = toolbar?.querySelector('#dialogo-filtros-proyectos');
    if (!toolbar || !toggle || !count || !dialog || toggle.dataset.initialized === 'true') return;

    const mobileQuery = window.matchMedia('(max-width: 640px)');
    const filterIds = [
        'filtro-anio-proyectos',
        'filtro-grado-proyectos',
        'filtro-seccion-proyectos',
        'filtro-rubrica-proyectos',
        'filtro-materia-proyectos',
    ];

    const resetFilters = () => {
        const search = container.querySelector('#search-proyectos');
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

        const sort = container.querySelector('#orden-proyectos');
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

// ═══════════════════════════════════════════════════════════════
// HELPERS — Animaciones de lista
// ═══════════════════════════════════════════════════════════════

/** Determina si el contenedor está vacío (carga fría). */
function isContainerEmpty(container) {
    return container.querySelectorAll('.list-item').length === 0;
}

/** Oculta el loader lineal. */
function hideLoader(container) {
    const loader = container?.querySelector('.section-loader');
    if (loader) loader.style.display = 'none';
}

// ═══════════════════════════════════════════════════════════════
// ESTADO VACÍO
// ═══════════════════════════════════════════════════════════════

/** Muestra/oculta el estado vacío según si hay proyectos en el contenedor. */
function toggleEmptyState(container) {
    const emptyEl = container?.querySelector('.section-empty');
    if (!container || !emptyEl) return;
    const hasItems = container.querySelectorAll('.list-item').length > 0;
    emptyEl.style.display = hasItems ? 'none' : 'flex';
}

/**
 * Divide un nombre de grado compuesto ("1G-A") en sus categorías:
 * { gradoKey: "1G", seccion: "A" }. Si no tiene sección, la clave es el texto completo.
 */
function partirDisplayGrade(displayGrade) {
    const texto = (displayGrade || '').trim();
    const idx = texto.lastIndexOf('-');
    if (idx === -1 || idx === texto.length - 1) return { gradoKey: texto, seccion: '' };
    return { gradoKey: texto.slice(0, idx), seccion: texto.slice(idx + 1) };
}

/** true si el select ya muestra exactamente estas opciones (incluido el placeholder). */
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

/**
 * Reconstruye las opciones de un select de filtro preservando la selección
 * si todavía es válida. Devuelve true si el valor seleccionado cambió.
 */
function reconstruirOpcionesFiltro(select, opciones, etiquetaVacia) {
    // Mismas opciones: no tocar el DOM. Rehacerlas dispara el observer del
    // custom-select, que reconstruye el menú entero en cada clic de filtro.
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

/**
 * Popular los tres filtros de la lista de proyectos (Año, Grado, Sección)
 * con los valores únicos de la lista cargada. Los tres funcionan de forma
 * independiente (igual que Año): siempre habilitados y combinados con AND
 * al filtrar (ver searchList.js), ofreciendo todas sus opciones disponibles.
 */
function populateFiltrosProyectos(container, proyectos) {
    const selAnio = container.querySelector('#filtro-anio-proyectos');
    const selGrado = container.querySelector('#filtro-grado-proyectos');
    const selSeccion = container.querySelector('#filtro-seccion-proyectos');
    if (!selAnio || !selGrado || !selSeccion) return;

    // ── Año escolar: valores únicos de toda la lista ──
    const anios = [...new Set(proyectos.map((p) => String(p.anio ?? '')))]
        .filter(Boolean)
        .sort((a, b) => Number(b) - Number(a));
    const cambioAnio = reconstruirOpcionesFiltro(
        selAnio,
        anios.map((v) => ({ valor: v, label: v })),
        'Todos'
    );

    // ── Grado (nivel + especialidad, p. ej. "1G"): valores únicos de toda la lista ──
    const gradosMap = new Map();
    proyectos.forEach((p) => {
        const { gradoKey } = partirDisplayGrade(p.displayGrade);
        if (gradoKey && !gradosMap.has(gradoKey)) {
            gradosMap.set(gradoKey, { valor: gradoKey, label: gradoKey });
        }
    });
    const grados = [...gradosMap.values()].sort((a, b) => a.label.localeCompare(b.label));
    const cambioGrado = reconstruirOpcionesFiltro(selGrado, grados, 'Todos');

    // ── Sección: valores únicos de toda la lista ──
    const secciones = [
        ...new Set(proyectos.map((p) => partirDisplayGrade(p.displayGrade).seccion)),
    ]
        .filter(Boolean)
        .sort();
    const cambioSeccion = reconstruirOpcionesFiltro(
        selSeccion,
        secciones.map((v) => ({ valor: v, label: v })),
        'Todas'
    );

    // Los tres filtros quedan siempre habilitados (independientes, igual que Año).
    selAnio.disabled = false;
    selGrado.disabled = false;
    selSeccion.disabled = false;

    // ── Restaurar los filtros recordados ──
    // Al volver de la vista de edición el DOM se recrea y estos selects
    // arrancan vacíos: se re-aplica el valor guardado si su opción ya
    // existe en la lista cargada.
    const restaurar = (sel, valor) => {
        if (!valor || sel.value === valor) return false;
        if (sel.querySelector(`option[value="${CSS.escape(valor)}"]`)) {
            sel.value = valor;
            return true;
        }
        return false;
    };
    const restaurarAnio = restaurar(selAnio, estadoFiltros.anio);
    const restaurarGrado = restaurar(selGrado, estadoFiltros.gradoKey);
    const restaurarSeccion = restaurar(selSeccion, estadoFiltros.seccion);

    // Sincronizar el estado de filtrado del contenedor con TODOS los
    // filtros, incluida la rúbrica (sin ella, cada recarga borraba la
    // clave 'rubrica' de state.filters y el filtro dejaba de aplicarse
    // aunque el select siguiera mostrando un valor).
    const state = container.__insalListState;
    if (state) {
        state.filters = {};
        [selAnio, selGrado, selSeccion,
            container.querySelector('#filtro-rubrica-proyectos'),
            container.querySelector('#filtro-materia-proyectos')]
            .filter(Boolean)
            .forEach((sel) => {
                if (sel.value) state.filters[sel.dataset.filterKey] = sel.value;
            });
    }

    // Refrescar el trigger del custom-select solo de los selects cuyo
    // valor cambió (reconstrucción o restauración del filtro guardado)
    if (cambioAnio || restaurarAnio) selAnio.dispatchEvent(new Event('change', { bubbles: true }));
    if (cambioGrado || restaurarGrado) selGrado.dispatchEvent(new Event('change', { bubbles: true }));
    if (cambioSeccion || restaurarSeccion) selSeccion.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Obtiene el botón de refresh del DOM. */
function getRefreshBtn() {
    return document.querySelector('.btn-refresh');
}

// ═══════════════════════════════════════════════════════════════
// CARGA DE PROYECTOS
// ═══════════════════════════════════════════════════════════════

/**
 * Carga la lista de proyectos desde el servidor.
 *
 * Dos modos de operación automáticos:
 * - Carga fría (contenedor vacío): progress bar → renderiza todo con entrada escalonada.
 * - Soft refresh (ya hay proyectos): shimmer overlay sobre existentes → diff inteligente
 *   (entradas/salidas animadas vía WAAPI desde listAnimations.js, persistentes con pulso).
 */
async function loadProyectos(btn) {
    const container = getContainer();
    if (!container) return;

    // Usar el botón recibido o buscarlo en el DOM
    const refreshBtn = btn || getRefreshBtn();

    // Mostrar spinner siempre que se cargue
    if (refreshBtn) refreshBtn.classList.add('is-loading');

    const coldLoad = isContainerEmpty(container);

    // La toolbar solo se muestra cuando hay datos: se oculta durante la
    // carga en frío y hideLoader() la vuelve a mostrar.
    const toolbar = container.querySelector('.list-toolbar');
    toolbar.style.display = coldLoad ? 'none' : '';

    try {
        // ── PRE-FETCH: preparar UI según modo ──
        let oldIds = new Set();

        if (!coldLoad) {
            // Soft refresh: guardar IDs actuales + shimmer overlay en existentes
            oldIds = new Set(
                [...container.querySelectorAll('.list-item')].map(el => el.dataset.itemId)
            );
            container.querySelectorAll('.list-item').forEach(el => {
                el.classList.add('list-item--refreshing');
            });
        }

        // ── FETCH ──
        const response = await fetch('/admin/proyectos', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!response.ok || !Array.isArray(data.proyectos)) {
            hideLoader(container);
            container.querySelectorAll('.list-item--refreshing').forEach(el => {
                el.classList.remove('list-item--refreshing');
            });
            if (refreshBtn) refreshBtn.classList.remove('is-loading');
            mostrarNotificacion(data?.mensaje || 'Error al cargar los proyectos', 'error');
            return;
        }

        // ── POST-FETCH: aplicar cambios según modo ──
        if (coldLoad) {
            // Carga fría: ocultar loader, renderizar todo con entrada escalonada
            hideLoader(container);
            data.proyectos.forEach((proyecto, index) => {
                const elemento = createProyectoElement(proyecto);
                container.appendChild(elemento);
                animarEntrada(elemento, index * 80);
            });
            toggleEmptyState(container);
            // Mostrar la toolbar (búsqueda/orden/filtro) solo si hay proyectos
            const anyItems = container.querySelectorAll('.list-item').length > 0;
            toolbar.style.display = anyItems ? '' : 'none';
            container.__datosProyectos = data.proyectos;
            populateFiltrosProyectos(container, data.proyectos);
            if (refreshBtn) refreshBtn.classList.remove('is-loading');
        } else {
            // Soft refresh: diff inteligente
            const newIds = new Set(data.proyectos.map(p => String(p.proyecto_id)));

            // Quitar shimmer overlay a todos
            container.querySelectorAll('.list-item--refreshing').forEach(el => {
                el.classList.remove('list-item--refreshing');
            });

            // Salientes: animar salida (WAAPI) y eliminar del DOM al terminar.
            // El atributo data-saliendo marca al nodo moribundo para que los
            // entrantes no se inserten antes de él.
            const toRemove = [...oldIds].filter(id => !newIds.has(id));
            toRemove.forEach(id => {
                const el = container.querySelector(`.list-item[data-item-id="${id}"]`);
                if (el) {
                    el.setAttribute('data-saliendo', '');
                    animarSalida(el).then(() => el.remove());
                }
            });

            const proyectoMap = new Map(data.proyectos.map(p => [String(p.proyecto_id), p]));

            // Persistentes: refrescar su contenido con los datos frescos del
            // servidor (el ID no cambia pero nombre/grado sí pueden haber
            // cambiado en la BD) y aplicar el pulso de confirmación.
            const keptIds = [...oldIds].filter(id => newIds.has(id));
            keptIds.forEach(id => {
                const el = container.querySelector(`.list-item[data-item-id="${id}"]`);
                if (el) {
                    updateProyectoElement(el, proyectoMap.get(id));
                    el.classList.add('list-item--updated');
                    el.addEventListener('animationend', () => {
                        el.classList.remove('list-item--updated');
                    }, { once: true });
                }
            });

            // Entrantes: insertar en posición correcta según orden de la API
            const enteringIds = [...newIds].filter(id => !oldIds.has(id));

            enteringIds.forEach(id => {
                const proyecto = proyectoMap.get(id);
                if (!proyecto) return;

                const elemento = createProyectoElement(proyecto);

                const apiIndex = data.proyectos.findIndex(p => String(p.proyecto_id) === id);
                let insertBeforeEl = null;

                for (let i = apiIndex + 1; i < data.proyectos.length; i++) {
                    const nextId = String(data.proyectos[i].proyecto_id);
                    if (oldIds.has(nextId)) {
                        insertBeforeEl = container.querySelector(
                            `.list-item[data-item-id="${nextId}"]:not([data-saliendo])`
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
            });
            toggleEmptyState(container);
            container.__datosProyectos = data.proyectos;
            populateFiltrosProyectos(container, data.proyectos);
            // Re-aplicar búsqueda/filtros/orden: el soft refresh puede haber
            // cambiado data-* de items persistentes (p. ej. nuevo grado) y el
            // MutationObserver de searchList no se dispara por cambios de atributos.
            if (typeof window.aplicarEstadoLista === 'function') {
                window.aplicarEstadoLista(container);
            }
            if (refreshBtn) refreshBtn.classList.remove('is-loading');
        }

    } catch (error) {
        if (refreshBtn) refreshBtn.classList.remove('is-loading');
        toggleEmptyState(container);
        hideLoader(container);
        container.querySelectorAll('.list-item--refreshing').forEach(el => {
            el.classList.remove('list-item--refreshing');
        });
        mostrarNotificacion('Error al cargar los proyectos', 'error');
        console.log('Error al cargar proyectos:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// CREACIÓN DE ELEMENTOS
// ═══════════════════════════════════════════════════════════════

/**
 * Crea un elemento DOM para un proyecto.
 * La animación de entrada NO se inicia aquí: la dispara el llamador
 * con animarEntrada() tras insertarlo en el DOM (listAnimations.js).
 * @param {Object} proyecto - Datos del proyecto desde la API
 * @returns {HTMLElement}
 */
function createProyectoElement(proyecto) {
    const elementoDiv = document.createElement('div');
    elementoDiv.className = 'list-item';
    elementoDiv.setAttribute('data-item-id', proyecto.proyecto_id);

    const gradoTexto = proyecto.displayGrade || proyecto.bachillerato || '';

    elementoDiv.innerHTML = `
    <div class="list-item__content">
        <span class="material-symbols-rounded">school</span>
        <div class="list-item__text-block">
            <p class="list-item__author proyecto-nombre"></p>
            <p class="list-item__desc proyecto-grado"></p>
        </div>
    </div>
    <div class="centrar gap-row margin-left-20">
        <a href="/menu/proyectos/${proyecto.proyecto_id}" data-link class="centrar boton btn-small btn-mas" id="proyecto-${proyecto.proyecto_id}-open">
            <p>Modificar</p>
            <span class="material-symbols-rounded">arrow_outward</span>
        </a>
        <button class="list-item__actions" id="proyecto-${proyecto.proyecto_id}-actions">
            <span class="material-symbols-rounded">more_vert</span>
        </button>
    </div>
    `;

    elementoDiv.querySelector('.proyecto-nombre').textContent = proyecto.nombre || 'Sin nombre';
    elementoDiv.querySelector('.proyecto-grado').textContent = gradoTexto || 'Sin grado';

    // Datos en data-* para ordenar/filtrar y para pre-cargar el diálogo de edición
    elementoDiv.dataset.nombre = (proyecto.nombre || '').trim();
    elementoDiv.dataset.grado = gradoTexto.trim();
    elementoDiv.dataset.materiaId = proyecto.materia_id || '';
    elementoDiv.dataset.nivelId = proyecto.nivel_id || '';
    elementoDiv.dataset.gradoId = proyecto.grado_id || '';
    elementoDiv.dataset.rubrica = String(proyecto.nivel_id || '');

    // Categorías del grado para los filtros en cascada (Año → Grado → Sección)
    const categoriasGrado = partirDisplayGrade(proyecto.displayGrade);
    elementoDiv.dataset.anio = proyecto.anio != null ? String(proyecto.anio) : '';
    elementoDiv.dataset.gradoKey = categoriasGrado.gradoKey;
    elementoDiv.dataset.seccion = categoriasGrado.seccion;

    return elementoDiv;
}

/**
 * Actualiza el contenido y los data-* de un .list-item existente con datos
 * frescos del servidor, SIN reemplazar el nodo raíz (preserva la referencia
 * y las animaciones en curso). Es lo que permite que el soft refresh refleje
 * cambios de nombre/grado/año aunque el proyecto_id no cambie.
 * @param {HTMLElement} el - Nodo .list-item existente.
 * @param {Object} proyecto - Datos del proyecto desde la API.
 */
function updateProyectoElement(el, proyecto) {
    if (!el || !proyecto) return;

    const gradoTexto = proyecto.displayGrade || proyecto.bachillerato || '';

    // Textos
    const nombreEl = el.querySelector('.proyecto-nombre');
    if (nombreEl) nombreEl.textContent = proyecto.nombre || 'Sin nombre';
    const gradoEl = el.querySelector('.proyecto-grado');
    if (gradoEl) gradoEl.textContent = gradoTexto || 'Sin grado';

    // Enlace "Modificar" (href e id por si cambió algo)
    const link = el.querySelector('a.btn-mas');
    if (link) {
        link.href = `/menu/proyectos/${proyecto.proyecto_id}`;
        link.id = `proyecto-${proyecto.proyecto_id}-open`;
    }

    // data-* para ordenar/filtrar y para pre-cargar el diálogo de edición
    const categoriasGrado = partirDisplayGrade(proyecto.displayGrade);
    el.dataset.itemId = String(proyecto.proyecto_id);
    el.dataset.nombre = (proyecto.nombre || '').trim();
    el.dataset.grado = gradoTexto.trim();
    el.dataset.materiaId = proyecto.materia_id || '';
    el.dataset.nivelId = proyecto.nivel_id || '';
    el.dataset.gradoId = proyecto.grado_id || '';
    el.dataset.rubrica = String(proyecto.nivel_id || '');
    el.dataset.anio = proyecto.anio != null ? String(proyecto.anio) : '';
    el.dataset.gradoKey = categoriasGrado.gradoKey;
    el.dataset.seccion = categoriasGrado.seccion;
}
// ═══════════════════════════════════════════════════════════════
// SELECTS DEL FORMULARIO — niveles (rúbricas) y grados
// ═══════════════════════════════════════════════════════════════

let nivelesCache = null;
let gradosCache = null;
let materiasCache = null;
// Petición en curso por catálogo: evita lanzar dos fetch idénticos cuando la
// vista se inicializa en DOMContentLoaded y en contentUpdated casi a la vez.
let nivelesPendiente = null;
let gradosPendiente = null;
let materiasPendiente = null;

/** Catálogos que alimentan el formulario de proyectos (URL y clave del JSON). */
const CATALOGOS_PROYECTO = {
    niveles: { url: '/admin/niveles-evaluacion', clave: 'niveles' },
    grados: { url: '/admin/grados', clave: 'grados' },
    materias: { url: '/admin/materias', clave: 'materias' },
};

/**
 * Obtiene un catálogo del servidor cacheándolo en memoria.
 * Las respuestas fallidas NO se cachean (antes un error del servidor guardaba
 * una lista vacía y el select se quedaba sin opciones el resto de la sesión).
 * @param {'niveles'|'grados'|'materias'} tipo Catálogo a cargar.
 * @param {boolean} forzar true para ignorar el caché y pedir datos frescos.
 */
async function obtenerCatalogo(tipo, forzar = false) {
    const { url, clave } = CATALOGOS_PROYECTO[tipo];
    const cache = tipo === 'niveles' ? nivelesCache : (tipo === 'materias' ? materiasCache : gradosCache);
    const pendiente = tipo === 'niveles' ? nivelesPendiente : (tipo === 'materias' ? materiasPendiente : gradosPendiente);

    if (!forzar && cache) return cache;
    // Ya hay una petición en curso con datos frescos: se reutiliza.
    if (pendiente) return pendiente;

    const peticion = (async () => {
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
            throw new Error(data?.mensaje || `Error ${res.status} al cargar ${clave}`);
        }
        if (!data || !Array.isArray(data[clave])) {
            throw new Error(`Respuesta inesperada del servidor al cargar ${clave}`);
        }
        if (tipo === 'niveles') nivelesCache = data[clave];
        else if (tipo === 'materias') materiasCache = data[clave];
        else gradosCache = data[clave];
        return data[clave];
    })();

    if (tipo === 'niveles') nivelesPendiente = peticion;
    else if (tipo === 'materias') materiasPendiente = peticion;
    else gradosPendiente = peticion;

    try {
        return await peticion;
    } finally {
        if (tipo === 'niveles') {
            if (nivelesPendiente === peticion) nivelesPendiente = null;
        } else if (tipo === 'materias') {
            if (materiasPendiente === peticion) materiasPendiente = null;
        } else if (gradosPendiente === peticion) {
            gradosPendiente = null;
        }
    }
}

/** Obtiene las rúbricas (niveles de evaluación) para el select. */
async function obtenerNiveles(forzar = false) {
    return obtenerCatalogo('niveles', forzar);
}

/** Obtiene el catálogo de materias para el select. */
async function obtenerMaterias(forzar = false) {
    return obtenerCatalogo('materias', forzar);
}

/**
 * Rellena el select de filtro por rúbrica con los niveles (rubricas) de la BD.
 * Usa el catálogo ya cacheado por el formulario de proyectos; en caso
 * contrario lo pide fresco. Conserva la selección actual si el valor sigue
 * existiendo.
 */
async function cargarOpcionesRubricas() {
    const sel = document.getElementById('filtro-rubrica-proyectos');
    if (!sel) return;

    let niveles = nivelesCache;
    if (!Array.isArray(niveles)) {
        try {
            niveles = await obtenerNiveles();
        } catch {
            return;
        }
    }

    const opciones = niveles.map((nivel) => ({
        valor: String(nivel.nivel_id),
        label: nivel.nombre || 'Sin nombre',
    }));
    const cambioValor = reconstruirOpcionesFiltro(sel, opciones, 'Todas');

    // ── Restaurar la rúbrica recordada ──
    // Al volver de la vista de edición el select llega vacío ('Todas'):
    // se re-aplica el valor guardado si su opción ya existe en el catálogo.
    let restauroRubrica = false;
    if (estadoFiltros.rubrica && sel.value !== estadoFiltros.rubrica &&
        sel.querySelector(`option[value="${CSS.escape(estadoFiltros.rubrica)}"]`)) {
        sel.value = estadoFiltros.rubrica;
        restauroRubrica = true;
    }

    // Refrescar el trigger del custom-select y el estado de filtrado solo si
    // el valor seleccionado cambió (rúbrica eliminada o restauración tras
    // volver de la edición). Así se evita un change espuro en la carga
    // inicial ("" → "" no cambia).
    if (cambioValor || restauroRubrica) sel.dispatchEvent(new Event('change', { bubbles: true }));

    // Tras repoblar/restaurar la rúbrica hay que re-aplicar el orden: el
    // change anterior (si lo hubo) fija state.sort = 'rubrica' en searchList
    // y podría pisar un orden 'id-desc'/'id-asc' que el usuario había elegido.
    restaurarOrdenLista();
}

/**
 * Rellena el filtro por materia con el catálogo de la BD. Conserva la
 * selección actual si el valor sigue existiendo y restaura la materia
 * recordada al volver de la vista de edición.
 */
async function cargarOpcionesMaterias() {
    const sel = document.getElementById('filtro-materia-proyectos');
    if (!sel) return;

    let materias = materiasCache;
    if (!Array.isArray(materias)) {
        try {
            materias = await obtenerMaterias();
        } catch {
            return;
        }
    }

    const opciones = materias.map((m) => ({
        valor: String(m.materia_id),
        label: m.nombre_materia || 'Sin nombre',
    }));
    const cambioValor = reconstruirOpcionesFiltro(sel, opciones, 'Todas');

    // ── Restaurar la materia recordada ──
    // Al volver de la vista de edición el select llega vacío ('Todas'):
    // se re-aplica el valor guardado si su opción ya existe en el catálogo.
    let restauroMateria = false;
    if (estadoFiltros.materia && sel.value !== estadoFiltros.materia &&
        sel.querySelector(`option[value="${CSS.escape(estadoFiltros.materia)}"]`)) {
        sel.value = estadoFiltros.materia;
        restauroMateria = true;
    }

    // Refrescar el trigger del custom-select y el estado de filtrado solo si
    // el valor cambió (reconstrucción o restauración). Así se evita un change
    // espuro en la carga inicial ("" → "" no cambia).
    if (cambioValor || restauroMateria) sel.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Obtiene los grados habilitados para el maestro. */
async function obtenerGrados(forzar = false) {
    return obtenerCatalogo('grados', forzar);
}

/**
 * Descarta los catálogos cacheados para que la próxima carga pida datos frescos.
 * Lo usan los módulos que crean/editan/eliminan rúbricas.
 */
function invalidarCatalogosProyecto() {
    nivelesCache = null;
    gradosCache = null;
    materiasCache = null;
}

// criterios-rubrica.js y editar-criterios.js avisan cuando cambia el catálogo de
// rúbricas; el select "Tipo de evaluación" debe repintarse con los datos nuevos.
document.addEventListener('catalogos:actualizados', invalidarCatalogosProyecto);

// Filtro de rúbrica: se repuebla DESPUÉS de invalidar (el orden importa: primero
// se descarta el caché para que cargarOpcionesRubricas pida datos frescos).
// Cubre creación/edición en /menu/rubrica o vía el módulo de rúbricas.
document.addEventListener('catalogos:actualizados', () => {
    cargarOpcionesRubricas();
});

/**
 * Rellena un <select data-custom> con una lista de valores (deduplicados y sin
 * vacíos), manteniendo una opción placeholder (value="" + hidden) como primera.
 * Conserva la selección previa si el valor sigue existiendo.
 */
function poblarOpcionesSelect(id, valores, placeholder) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = '';
    if (placeholder) {
        const ph = document.createElement('option');
        ph.value = '';
        ph.textContent = placeholder;
        ph.disabled = true;
        ph.hidden = true;
        sel.appendChild(ph);
    }
    [...new Set(valores)].forEach((v) => {
        if (v === undefined || v === null || String(v).trim() === '') return;
        const opt = document.createElement('option');
        opt.value = String(v);
        opt.textContent = String(v);
        sel.appendChild(opt);
    });
    // Restaurar la selección previa si sigue existiendo; si no, volver al placeholder.
    const sigueExistiendo = prev && Array.from(sel.options).some((o) => o.value === prev && o.value !== '');
    sel.value = sigueExistiendo ? prev : '';
}

/** Establece el valor de un <select> y dispara 'change' (sincroniza el custom-select). */
function establecerValorSelect(id, valor) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const nuevo = valor == null ? '' : String(valor);
    if (sel.value !== nuevo) {
        sel.value = nuevo;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

/**
 * Etiqueta legible de una sección. Si hay varias secciones con la misma letra
 * (distinto turno/año) para el mismo grado + especialidad, se distinguen con
 * el turno entre paréntesis.
 */
function etiquetaSeccion(grado, lista = gradosCache || []) {
    const base = `Sección ${grado.seccion}`;
    const coincidencias = lista.filter(
        (g) => g.nivel_nombre === grado.nivel_nombre &&
            String(g.bachillerato_id) === String(grado.bachillerato_id) &&
            g.seccion === grado.seccion
    );
    return coincidencias.length > 1 && grado.turno ? `${base} (${grado.turno})` : base;
}

/** Devuelve el nivel_id de una rúbrica a partir de su nombre (o '' si no existe). */
function resolverNivelId(nombre) {
    const n = (nivelesCache || []).find((x) => x.nombre === (nombre || '').trim());
    return n ? String(n.nivel_id) : '';
}

/** Devuelve el materia_id a partir del nombre de la materia (o '' si no existe). */
function resolverMateriaId(nombre) {
    const m = (materiasCache || []).find((x) => x.nombre_materia === (nombre || '').trim());
    return m ? String(m.materia_id) : '';
}

/** Devuelve el grado_id a partir de grado + especialidad + sección (o '' si no existe). */
function resolverGradoId(gradoTexto, espTexto, seccionTexto) {
    if (!gradoTexto || !espTexto || !seccionTexto) return '';
    const g = (gradosCache || []).find(
        (x) => x.nivel_nombre === gradoTexto &&
            x.bachillerato_nombre === espTexto &&
            etiquetaSeccion(x, gradosCache) === seccionTexto
    );
    return g ? String(g.grado_id) : '';
}

/**
 * Sincroniza los campos ocultos (nivel_id y grado_id) de un formulario de
 * proyecto a partir de los textos elegidos en los selects.
 */
function sincronizarIdsFormulario(prefijo) {
    const selNivel = document.getElementById(`${prefijo}-nivel`);
    const hiddenNivel = document.getElementById(`${prefijo}-nivel-id`);
    const selMateria = document.getElementById(`${prefijo}-materia`);
    const hiddenMateria = document.getElementById(`${prefijo}-materia-id`);
    const selGrado = document.getElementById(`${prefijo}-grado-nivel`);
    const selEsp = document.getElementById(`${prefijo}-grado-esp`);
    const selSeccion = document.getElementById(`${prefijo}-grado`);
    const hiddenGrado = document.getElementById(`${prefijo}-grado-id`);

    if (hiddenNivel) hiddenNivel.value = resolverNivelId(selNivel?.value || '');
    if (hiddenMateria) hiddenMateria.value = resolverMateriaId(selMateria?.value || '');
    if (hiddenGrado) hiddenGrado.value = resolverGradoId(
        selGrado?.value || '',
        selEsp?.value || '',
        selSeccion?.value || ''
    );
}

/**
 * Configura la cascada Grado → Especialidad → Sección de un formulario de
 * proyecto (prefijos 'proyecto' y 'editar') usando selects.
 * Los datos provienen de la DB (vía obtenerGrados); el campo oculto
 * ${prefijo}-grado-id guarda el grado_id real que espera el backend.
 */
function configurarCascadeGrado(prefijo, grados) {
    const selGrado = document.getElementById(`${prefijo}-grado-nivel`);
    const selEsp = document.getElementById(`${prefijo}-grado-esp`);
    const selSeccion = document.getElementById(`${prefijo}-grado`);
    if (!selGrado || !selEsp || !selSeccion) return;
    if (selGrado.dataset.cascadeInit === 'true') return;
    selGrado.dataset.cascadeInit = 'true';

    // Nivel 1: grados disponibles (niveles de estudio, p. ej. Primer Año)
    poblarOpcionesSelect(
        `${prefijo}-grado-nivel`,
        [...new Set(grados.map((g) => g.nivel_nombre).filter(Boolean))],
        'Selecciona un grado'
    );

    // Nivel 2: especialidades disponibles para el grado elegido.
    // La especialidad solo se habilita cuando hay un grado seleccionado.
    const repoblarEspecialidades = () => {
        const nivel = selGrado.value;
        const nombres = [...new Set(grados
            .filter((g) => g.nivel_nombre === nivel)
            .map((g) => g.bachillerato_nombre)
            .filter(Boolean))];
        poblarOpcionesSelect(`${prefijo}-grado-esp`, nombres, 'Selecciona una especialidad');
        // Habilitar la especialidad solo si el grado tiene un valor
        selEsp.disabled = !nivel;
        // Si la especialidad actual ya no aplica, se limpia junto con la sección
        if (!nombres.includes(selEsp.value)) {
            selEsp.value = '';
            poblarOpcionesSelect(`${prefijo}-grado`, [], 'Selecciona una sección');
            // Sin especialidad, la sección tampoco puede elegirse
            selSeccion.disabled = true;
        }
        sincronizarIdsFormulario(prefijo);
    };

    // Nivel 3: secciones (el grado real) del grado + especialidad elegidos.
    // La sección solo se habilita cuando hay una especialidad seleccionada.
    const repoblarSecciones = () => {
        const nivel = selGrado.value;
        const esp = selEsp.value;
        const etiquetas = nivel && esp
            ? [...new Set(grados
                .filter((g) => g.nivel_nombre === nivel && g.bachillerato_nombre === esp)
                .map((g) => etiquetaSeccion(g, grados)))]
            : [];
        poblarOpcionesSelect(`${prefijo}-grado`, etiquetas, 'Selecciona una sección');
        // Habilitar la sección solo si la especialidad tiene un valor
        selSeccion.disabled = !esp;
        if (!etiquetas.includes(selSeccion.value)) {
            selSeccion.value = '';
        }
        sincronizarIdsFormulario(prefijo);
    };

    selGrado.addEventListener('change', repoblarEspecialidades);
    selEsp.addEventListener('change', repoblarSecciones);
    selSeccion.addEventListener('change', () => sincronizarIdsFormulario(prefijo));

    // Ganchos para precargar la cascada al editar un proyecto
    selGrado.__cascadeRepoblar = repoblarEspecialidades;
    selEsp.__cascadeRepoblar = repoblarSecciones;

    repoblarEspecialidades();
}

/** Preselecciona una rúbrica (nivel) en un formulario a partir de su nivel_id. */
function preseleccionarNivel(prefijo, nivelId) {
    const sel = document.getElementById(`${prefijo}-nivel`);
    const hidden = document.getElementById(`${prefijo}-nivel-id`);
    if (!sel) return;
    const nivel = (nivelesCache || []).find((n) => String(n.nivel_id) === String(nivelId));
    if (!nivel) return;
    establecerValorSelect(`${prefijo}-nivel`, nivel.nombre);
    if (hidden) hidden.value = String(nivel.nivel_id);
}

/** Preselecciona una materia en un formulario a partir de su materia_id. */
function preseleccionarMateria(prefijo, materiaId) {
    const sel = document.getElementById(`${prefijo}-materia`);
    const hidden = document.getElementById(`${prefijo}-materia-id`);
    if (!sel || materiaId == null || materiaId === '') return;
    const materia = (materiasCache || []).find((m) => String(m.materia_id) === String(materiaId));
    if (!materia) return;
    establecerValorSelect(`${prefijo}-materia`, materia.nombre_materia);
    if (hidden) hidden.value = String(materia.materia_id);
}

/**
 * Preselecciona un grado concreto en la cascada de un diálogo (crear/editar),
 * reconstruyendo cada nivel con el grado correspondiente.
 */
function preseleccionarGradoEnCascade(prefijo, gradoId) {
    const grado = (gradosCache || []).find((g) => String(g.grado_id) === String(gradoId));
    if (!grado) return;

    const selGrado = document.getElementById(`${prefijo}-grado-nivel`);
    const selEsp = document.getElementById(`${prefijo}-grado-esp`);
    const selSeccion = document.getElementById(`${prefijo}-grado`);
    if (!selGrado || !selEsp || !selSeccion) return;

    // Seleccionar grado → repuebla especialidades (listener change)
    establecerValorSelect(`${prefijo}-grado-nivel`, grado.nivel_nombre);
    // Seleccionar especialidad → repuebla secciones (listener change)
    establecerValorSelect(`${prefijo}-grado-esp`, grado.bachillerato_nombre);
    establecerValorSelect(`${prefijo}-grado`, etiquetaSeccion(grado, gradosCache));
    sincronizarIdsFormulario(prefijo);
}

/**
 * Carga niveles y grados desde la DB y configura los selects (crear y editar).
 * @param {boolean} forzar true para pedir datos frescos al servidor: se usa al
 * entrar a la vista, así las rúbricas recién creadas aparecen en el select
 * "Tipo de evaluación" sin recargar la página.
 */
async function poblarSelectsProyecto(forzar = false) {
    // Cada catálogo se carga por separado: si uno falla, el otro todavía puede
    // poblar sus selects y el usuario recibe un aviso claro del problema.
    const [niveles, grados, materias] = await Promise.all([
        obtenerNiveles(forzar).catch((error) => {
            console.error('Error al cargar los tipos de evaluación:', error);
            mostrarNotificacion('No se pudieron cargar los tipos de evaluación', 'error');
            return null;
        }),
        obtenerGrados(forzar).catch((error) => {
            console.error('Error al cargar los grados:', error);
            mostrarNotificacion('No se pudieron cargar los grados', 'error');
            return null;
        }),
        obtenerMaterias(forzar).catch((error) => {
            console.error('Error al cargar las materias:', error);
            mostrarNotificacion('No se pudieron cargar las materias', 'error');
            return null;
        }),
    ]);

    if (niveles) {
        // Rúbricas para crear y editar: SOLO las completas (100% de ponderación).
        // Las incompletas se pueden guardar como borrador, pero no asignar a proyectos.
        const completas = niveles.filter((n) => Number(n.ponderacion_total) === 100);
        const incompletas = niveles.length - completas.length;
        poblarOpcionesSelect('proyecto-nivel', completas.map((n) => n.nombre), 'Selecciona un tipo de evaluación');
        poblarOpcionesSelect('editar-nivel', completas.map((n) => n.nombre), 'Selecciona un tipo de evaluación');

        // Resolver el nivel_id cuando cambia la rúbrica (un listener por select)
        ['proyecto-nivel', 'editar-nivel'].forEach((id) => {
            const sel = document.getElementById(id);
            const hidden = document.getElementById(`${id}-id`);
            if (!sel || !hidden) return;
            // Tras repoblar, re-sincronizar el id oculto con la selección vigente
            hidden.value = resolverNivelId(sel.value);
            if (sel.dataset.nivelListenerInit === 'true') return;
            sel.dataset.nivelListenerInit = 'true';
            sel.addEventListener('change', () => {
                hidden.value = resolverNivelId(sel.value);
            });
        });
    }

    if (materias) {
        // Materias para crear y editar
        poblarOpcionesSelect('proyecto-materia', materias.map((m) => m.nombre_materia), 'Selecciona una materia');
        poblarOpcionesSelect('editar-materia', materias.map((m) => m.nombre_materia), 'Selecciona una materia');

        // Resolver el materia_id cuando cambia la materia (un listener por select)
        ['proyecto-materia', 'editar-materia'].forEach((id) => {
            const sel = document.getElementById(id);
            const hidden = document.getElementById(`${id}-id`);
            if (!sel || !hidden) return;
            // Tras repoblar, re-sincronizar el id oculto con la selección vigente
            hidden.value = resolverMateriaId(sel.value);
            if (sel.dataset.materiaListenerInit === 'true') return;
            sel.dataset.materiaListenerInit = 'true';
            sel.addEventListener('change', () => {
                hidden.value = resolverMateriaId(sel.value);
            });
        });
    }

    if (grados) {
        // Cascadas Grado → Especialidad → Sección (crear y editar)
        configurarCascadeGrado('proyecto', grados);
        configurarCascadeGrado('editar', grados);
    }
}
// ═══════════════════════════════════════════════════════════════
// FORMULARIO DE CREACIÓN
// ═══════════════════════════════════════════════════════════════

/**
 * Inicializa el handler de submit del formulario de nuevo proyecto.
 * Se llama tanto en DOMContentLoaded como en contentUpdated para soportar el router SPA.
 * Usa un data-attribute para evitar listeners duplicados cuando el form se recrea.
 */
function initProyectoFormHandler() {
    const form = document.getElementById('form-proyecto');
    if (!form || form.dataset.handlerInitialized) return;

    form.dataset.handlerInitialized = 'true';

    // Inicializar contadores de caracteres
    form.querySelectorAll('.char-counter').forEach(counter => {
        const inputId = counter.dataset.for;
        const input = document.getElementById(inputId);
        if (!input) return;

        const max = parseInt(input.getAttribute('maxlength'), 10) || 0;

        const update = () => {
            const len = input.value.length;
            counter.textContent = `${len}/${max}`;
            counter.classList.toggle('char-counter--warn', len >= max * 0.8 && len < max);
            counter.classList.toggle('char-counter--limit', len >= max);
        };

        input.addEventListener('input', update);
        update(); // inicial
    });

    // ── Validación de campos obligatorios ──
    const nombreInput = document.getElementById('proyecto-nombre');
    const errorNombre = document.getElementById('error-proyecto-nombre');

    function validarNombre() {
        if (!nombreInput) return true;
        if (!nombreInput.value.trim()) {
            nombreInput.classList.add('error');
            if (errorNombre) {
                errorNombre.textContent = 'Rellena este campo de nombre';
                errorNombre.classList.add('show');
            }
            return false;
        }
        nombreInput.classList.remove('error');
        if (errorNombre) {
            errorNombre.textContent = '';
            errorNombre.classList.remove('show');
        }
        return true;
    }

    function quitarErrorNombre() {
        if (nombreInput) nombreInput.classList.remove('error');
        if (errorNombre) {
            errorNombre.classList.add('hide');
            setTimeout(() => {
                errorNombre.classList.remove('show', 'hide');
                errorNombre.textContent = '';
            }, 300);
        }
    }

    nombreInput?.addEventListener('blur', validarNombre);
    nombreInput?.addEventListener('input', () => {
        if (nombreInput.value.trim()) quitarErrorNombre();
    });

    createSubmitHandler(form, {
        validate: () => validarNombre() && validarSelectsProyecto(),
        onSubmit: async () => {
            const nombre = nombreInput ? nombreInput.value.trim() : '';
            const nivel_id = Number(resolverNivelId(document.getElementById('proyecto-nivel')?.value || ''));
            const materia_id = Number(resolverMateriaId(document.getElementById('proyecto-materia')?.value || ''));
            const grado_id = Number(resolverGradoId(
                document.getElementById('proyecto-grado-nivel')?.value || '',
                document.getElementById('proyecto-grado-esp')?.value || '',
                document.getElementById('proyecto-grado')?.value || ''
            ));

            if (!nombre) {
                mostrarNotificacion('Por favor complete el nombre del proyecto', 'error');
                throw new Error('Campo vacío');
            }

            if (!nivel_id || !grado_id || !materia_id) {
                mostrarNotificacion('Selecciona la materia, el tipo de evaluación y el grado del proyecto', 'error');
                throw new Error('Campos vacíos');
            }

            // Doble verificación en cliente: la rúbrica debe estar al 100%.
            // El select ya filtra, pero si el dato es viejo se valida aquí también.
            const rubricaElegida = (nivelesCache || []).find((n) => Number(n.nivel_id) === nivel_id);
            if (rubricaElegida && Number(rubricaElegida.ponderacion_total) !== 100) {
                mostrarNotificacion(
                    `La rúbrica "${rubricaElegida.nombre}" está incompleta (${rubricaElegida.ponderacion_total}%): debe sumar 100% para asignarla`,
                    'error',
                );
                throw new Error('Rúbrica incompleta');
            }

            const response = await fetch('/admin/proyectos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, grado_id, nivel_id, materia_id })
            });

            const data = await response.json();

            if (!response.ok) {
                const err = new Error(data?.mensaje || 'Error del servidor');
                err.mensaje = data?.mensaje;
                throw err;
            }

            return { success: true, proyecto: data.proyecto };
        },
        onSuccess: async () => {
            form.reset();
            // Limpiar selects y campos ocultos, reponiendo los placeholders de la
            // cascada Grado → Especialidad → Sección y resincronizando los triggers.
            ['proyecto-nivel', 'proyecto-materia', 'proyecto-grado-nivel', 'proyecto-grado-esp',
                'proyecto-grado'].forEach((id) => {
                    const sel = document.getElementById(id);
                    if (sel) sel.value = '';
                });
            ['proyecto-nivel-id', 'proyecto-materia-id', 'proyecto-grado-id'].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.value = '';
            });
            // Reponer la cascada dependiente a placeholders
            poblarOpcionesSelect('proyecto-grado-esp', [], 'Selecciona una especialidad');
            poblarOpcionesSelect('proyecto-grado', [], 'Selecciona una sección');
            // Resincronizar triggers de los selects ya poblados
            ['proyecto-nivel', 'proyecto-grado-nivel'].forEach((id) => {
                const sel = document.getElementById(id);
                if (sel) sel.dispatchEvent(new Event('change', { bubbles: true }));
            });
            toggleDialog('dialog-add-proyecto');
            mostrarNotificacion('Proyecto creado correctamente', 'bien');
            await loadProyectos();
        },
        onError: (error) => {
            if (error.message === 'Campo vacío' || error.message === 'Campos vacíos') return;
            toggleDialog('dialog-add-proyecto');
            mostrarNotificacion(error?.mensaje || error?.message || 'Error al crear proyecto', 'error');
        }
    });
}

/** Valida que la rúbrica, la materia y el grado del formulario tengan un valor válido (de la DB). */
function validarSelectsProyecto() {
    // Re-sincronizar por si el usuario escribió sin salir del campo
    sincronizarIdsFormulario('proyecto');
    const nivelId = document.getElementById('proyecto-nivel-id');
    const materiaId = document.getElementById('proyecto-materia-id');
    const gradoId = document.getElementById('proyecto-grado-id');
    if (materiaId && !materiaId.value) {
        mostrarNotificacion('Selecciona una materia válida para el proyecto', 'error');
        return false;
    }
    if (nivelId && !nivelId.value) {
        mostrarNotificacion('Selecciona un tipo de evaluación válido para el proyecto', 'error');
        return false;
    }
    if (gradoId && !gradoId.value) {
        mostrarNotificacion('Selecciona un grado válido para el proyecto', 'error');
        return false;
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════
// EDICIÓN DE PROYECTO
// ═══════════════════════════════════════════════════════════════

/** Abre la modal de edición con los datos del proyecto seleccionado. */
function abrirDialogoEditarProyecto() {
    const dialogo = document.getElementById('dialogo-editar-proyecto');
    if (!dialogo) return;

    const item = document.querySelector(`.list-item[data-item-id="${currentProyectoId}"]`);
    if (!item) return;

    const nombreInput = document.getElementById('editar-nombre');

    if (nombreInput) {
        nombreInput.value = item.dataset.nombre || '';
        nombreInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // Pre-seleccionar materia (catálogo), nivel (rúbrica) y grado vía la cascada
    // Grado → Especialidad → Sección del diálogo de edición
    preseleccionarMateria('editar', item.dataset.materiaId);
    preseleccionarNivel('editar', item.dataset.nivelId);
    preseleccionarGradoEnCascade('editar', item.dataset.gradoId);

    setTimeout(() => nombreInput?.focus(), 30);
    dialogo.showModal();
}

function cerrarDialogoEditarProyecto() {
    const dialogo = document.getElementById('dialogo-editar-proyecto');
    if (dialogo) cerrarDialogoAnimado(dialogo);
}

/**
 * Guarda (PUT) el nombre, la rúbrica (nivel) y el grado del proyecto.
 * Devuelve un objeto { success, ... } para que createSubmitHandler
 * maneje los estados visuales del botón (enviando → éxito/error).
 */
async function guardarEdicionProyecto() {
    if (!currentProyectoId) return { success: false };

    const nombreInput = document.getElementById('editar-nombre');
    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const nivel_id = Number(resolverNivelId(document.getElementById('editar-nivel')?.value || ''));
    const materia_id = Number(resolverMateriaId(document.getElementById('editar-materia')?.value || ''));
    const grado_id = Number(resolverGradoId(
        document.getElementById('editar-grado-nivel')?.value || '',
        document.getElementById('editar-grado-esp')?.value || '',
        document.getElementById('editar-grado')?.value || ''
    ));

    if (!nombre) {
        mostrarNotificacion('El nombre del proyecto es requerido', 'error');
        nombreInput?.focus();
        throw new Error('Campo vacío');
    }

    if (!nivel_id || !grado_id || !materia_id) {
        mostrarNotificacion('Selecciona la materia, la rúbrica (nivel) y el grado del proyecto', 'error');
        throw new Error('Campos vacíos');
    }

    const res = await fetch(`/admin/proyectos/${currentProyectoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, nivel_id, grado_id, materia_id }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.mensaje || 'Error al actualizar el proyecto');

    // Actualizar el ítem en pantalla sin recargar toda la lista
    const item = document.querySelector(`.list-item[data-item-id="${currentProyectoId}"]`);
    if (item) {
        // data.proyecto del PUT solo trae las columnas del proyecto (sin
        // displayGrade ni anio), así que se actualizan los campos disponibles
        // y el loadProyectos() posterior (onSuccess) completa el resto con
        // updateProyectoElement usando la respuesta fresca del GET.
        const nombreEl = item.querySelector('.proyecto-nombre');
        if (nombreEl) nombreEl.textContent = data.proyecto?.nombre || nombre;
        item.dataset.nombre = (data.proyecto?.nombre || nombre).trim();
        item.dataset.nivelId = data.proyecto?.nivel_id ?? nivel_id;
        item.dataset.gradoId = data.proyecto?.grado_id ?? grado_id;
    }

    return { success: true, proyecto: data.proyecto };
}

function initDialogoEditarProyecto() {
    const dialogo = document.getElementById('dialogo-editar-proyecto');
    if (!dialogo || dialogo.dataset.handlerInitialized) return;
    dialogo.dataset.handlerInitialized = 'true';

    const cerrar = document.getElementById('btn-cerrar-editar-proyecto');
    const cancelar = document.getElementById('btn-cancelar-editar-proyecto');

    if (cerrar) cerrar.addEventListener('click', cerrarDialogoEditarProyecto);
    if (cancelar) cancelar.addEventListener('click', cerrarDialogoEditarProyecto);

    dialogo.addEventListener('cancel', (e) => {
        e.preventDefault();
        cerrarDialogoEditarProyecto();
    });

    document.getElementById('editar-nombre')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });

    const formEditarContadores = document.getElementById('dialogo-editar-proyecto-form');
    formEditarContadores?.querySelectorAll('.char-counter').forEach(counter => {
        const input = document.getElementById(counter.dataset.for);
        if (!input) return;

        const max = parseInt(input.getAttribute('maxlength'), 10) || 0;
        const update = () => {
            const len = input.value.length;
            counter.textContent = `${len}/${max}`;
            counter.classList.toggle('char-counter--warn', len >= max * 0.8 && len < max);
            counter.classList.toggle('char-counter--limit', len >= max);
        };

        input.addEventListener('input', update);
        update();
    });

    // Conectar createSubmitHandler al formulario de edición
    const formEditar = document.getElementById('dialogo-editar-proyecto-form');
    if (formEditar && !formEditar.dataset.submitInitialized) {
        formEditar.dataset.submitInitialized = 'true';
        createSubmitHandler(formEditar, {
            onSubmit: guardarEdicionProyecto,
            onSuccess: async () => {
                mostrarNotificacion('Proyecto actualizado', 'bien');
                await loadProyectos();
                cerrarDialogoEditarProyecto();
            },
            onError: (error) => {
                if (error.message === 'Campo vacío' || error.message === 'Campos vacíos') return;
                mostrarNotificacion(error.message || 'Error al actualizar el proyecto', 'error');
            }
        });
    }
}
// ═══════════════════════════════════════════════════════════════
// ELIMINACIÓN
// ═══════════════════════════════════════════════════════════════

/** Elimina un proyecto mediante la API y refresca la lista. */
async function eliminarProyecto(proyectoId) {
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
            'Se eliminarán el proyecto y todo lo relacionado (evaluaciones y estudiantes). Esta acción no se puede deshacer.',
            async () => {
                const res = await fetch(`/admin/proyectos/${proyectoId}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.mensaje || 'Error al eliminar');
            },
            'dialogo-eliminar-proyecto'
        );
    } catch (err) {
        mostrarNotificacion(err.message || 'Error al eliminar proyecto', 'error');
        return;
    }
    if (!ok) return;

    mostrarNotificacion('Proyecto eliminado', 'bien');
    await loadProyectos();
}

// ═══════════════════════════════════════════════════════════════
// HANDLERS DE PROYECTOS
// ═══════════════════════════════════════════════════════════════

/**
 * Inicializa los handlers de proyectos. Se llama en la carga inicial
 * y cada vez que el router reemplaza el contenido del main.
 */
function initProyectosHandlers() {
    const container = getContainer();
    if (!container) return;
    const menulist = getMenuList();
    if (!menulist) return;

    initMobileProjectFilters(container);
    const setMobileProjectActions = initMobileProjectActions();

    // Mantener estadoFiltros al día con los cambios de la toolbar (se
    // recuerdan al salir/entrar de la vista de edición) y restaurar en la
    // toolbar recreada el orden guardado.
    vincularGuardadoFiltros();
    restaurarOrdenLista();

    initDialogoEditarProyecto();
    // forzar = true: la vista se reabre al navegar (SPA) y puede haber rúbricas
    // nuevas, así que se piden los catálogos frescos en cada entrada.
    poblarSelectsProyecto(true);
    // Rellenar el filtro por rúbrica. Reutiliza la petición de niveles en curso
    // que acabó de lanzar poblarSelectsProyecto, así que no duplica el fetch.
    cargarOpcionesRubricas();
    // Rellenar el filtro por materia (reutiliza la petición de materias en curso).
    cargarOpcionesMaterias();
    loadProyectos();

    // Cerrar el menú contextual al hacer scroll en el contenedor
    container.addEventListener('scroll', () => {
        if (menuVisible) {
            menulist.classList.remove('show');
            menuVisible = false;
        }
    });

    // Abrir el menú contextual al hacer clic en los tres puntos
    container.addEventListener('click', function (e) {
        const menuBtn = e.target.closest('.list-item__actions');
        if (menuBtn) {
            e.stopPropagation();

            const itemElement = menuBtn.closest('.list-item');
            currentProyectoId = itemElement.dataset.itemId;

            if (window.matchMedia('(max-width: 640px)').matches) {
                menulist.classList.remove('show');
                menuVisible = false;
                setMobileProjectActions?.(itemElement);
                document.getElementById('dialogo-acciones-proyecto')?.showModal();
                return;
            }

            menuVisible = !menuVisible;

            if (menuVisible) {
                posicionarMenuFlotante(menulist, menuBtn);
                menulist.classList.add('show');
            } else {
                menulist.classList.remove('show');
            }
            return;
        }
    });

    // Manejar las acciones del menú contextual (Editar / Eliminar)
    if (menulist && !menulist.dataset.handlerInitialized) {
        menulist.dataset.handlerInitialized = 'true';
        menulist.addEventListener('click', async (e) => {
            const item = e.target.closest('[data-menu]');
            if (!item) return;

            const accion = item.dataset.menu;
            menulist.classList.remove('show');
            menuVisible = false;

            if (accion === 'editar') {
                abrirDialogoEditarProyecto();
            } else if (accion === 'eliminar') {
                await eliminarProyecto(currentProyectoId);
            }
        });
    }

    // Cerrar el menú contextual si se hace clic fuera
    document.addEventListener('click', function (event) {
        if (!event.target.closest('.list-item__actions') && menulist && !menulist.contains(event.target)) {
            if (menulist) menulist.classList.remove('show');
            menuVisible = false;
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// EXPONER FUNCIONES GLOBALMENTE (para onclick en HTML)
// ═══════════════════════════════════════════════════════════════

window.loadProyectos = loadProyectos;
window.eliminarProyecto = eliminarProyecto;

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initProyectoFormHandler();
    initProyectosHandlers();
});

// Re-inicializar handlers cuando el router reemplaza el contenido
document.addEventListener('contentUpdated', () => {
    initProyectosHandlers();
    initProyectoFormHandler();
});