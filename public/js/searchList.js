// ═══════════════════════════════════════════════════════════════
// MÓDULO: Controles de lista — búsqueda + ordenar
//   • Click en la píldora enfoca el input (onclick -> focusSearchBar)
//   • Filtro en vivo sobre los .list-item del .list-container
//   • Botón de limpiar (✕) y tecla Escape
//   • Orden con select[data-sort] (reordena los .list-item del contenedor)
//   • Estado "sin resultados" y re-aplicación tras refrescos (router SPA)
//   • Ocultar/mostrar items al filtrar: delegado a listAnimations.js (WAAPI)
// ═══════════════════════════════════════════════════════════════

import { animarMostrar, animarOcultar } from './listAnimations.js';

/** Normaliza texto para comparar (minúsculas, sin tildes).
 *  Admite caracteres especiales como ° (equivalente a º). */
function normalizeText(text) {
    return (text || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[º°]/g, '°') // º y ° se tratan como el mismo carácter
        .trim()
        .toLowerCase();
}

/** Estado por contenedor (búsqueda, orden, filtros y orden original). */
function getListState(container) {
    if (!container.__insalListState) {
        container.__insalListState = {
            query: '',
            sort: 'id-desc',
            filters: {}, // { dataFilterKey: valor } — todos se combinan con AND
            baseline: null,
        };
    }
    return container.__insalListState;
}

/** Crea (una sola vez) el bloque "sin resultados" dentro del contenedor. */
function ensureNoResultsEl(container) {
    let el = container.querySelector(':scope > .search-no-results');
    if (el) return el;

    const icon = document.createElement('span');
    icon.className = 'material-symbols-rounded empty-icon';
    icon.textContent = 'search_off';

    const title = document.createElement('p');
    title.className = 'empty-text';
    title.textContent = 'Sin resultados';

    const term = document.createElement('em');
    term.className = 'search-no-results-term';

    const sub = document.createElement('p');
    sub.className = 'empty-subtext';
    sub.append('No hay coincidencias para ', term, '.');

    el = document.createElement('div');
    el.className = 'search-no-results';
    el.style.display = 'none';
    el.append(icon, title, sub);

    container.appendChild(el);
    return el;
}

/** Comparador según el orden elegido. */
function getSortComparator(state) {
    if (state.sort === 'id-desc') {
        return (a, b) => Number(b.dataset.itemId) - Number(a.dataset.itemId);
    }
    if (state.sort === 'id-asc') {
        return (a, b) => Number(a.dataset.itemId) - Number(b.dataset.itemId);
    }
    // 'relevancia' → restaura el orden original capturado antes de ordenar
    const base = state.baseline || [];
    return (a, b) => {
        const iA = base.findIndex((el) => el.dataset?.itemId === a.dataset?.itemId);
        const iB = base.findIndex((el) => el.dataset?.itemId === b.dataset?.itemId);
        return (iA === -1 ? base.length : iA) - (iB === -1 ? base.length : iB);
    };
}

/** Nodo de referencia para reinsertar los items (loader/empty/no-results). */
function getInsertRef(container) {
    return container.querySelector(
        ':scope > .section-loader, :scope > .search-no-results, :scope > .section-empty'
    );
}

/** Reordena los items en el orden dado solo si hace falta (evita bucles). */
function orderItems(container, items) {
    const ref = getInsertRef(container);
    const lastDesired = ref && ref.parentNode === container ? ref : null;
    let needsReorder = false;

    for (let i = 0; i < items.length; i++) {
        const wanted = i + 1 < items.length ? items[i + 1] : lastDesired;
        if (items[i].nextElementSibling !== wanted) {
            needsReorder = true;
            break;
        }
    }
    if (!needsReorder) return;

    items.forEach((item) => {
        if (ref && ref.parentNode === container) container.insertBefore(item, ref);
        else container.appendChild(item);
    });
}

/** Aplica la visibilidad de un item con animación suave (filtrado por búsqueda).
 *  Toda la gestión de cancelación/estilos vive en listAnimations.js: iniciar
 *  una nueva animación sobre un item cancela automáticamente la anterior,
 *  así que aquí no hace falta llevar estado de "ocultándose/mostrándose". */
function applyItemVisibility(item, visible) {
    const hidden = item.style.display === 'none';

    if (visible) {
        if (hidden) {
            animarMostrar(item);
        }
    } else if (!hidden) {
        animarOcultar(item).then((completo) => {
            // Solo ocultar de verdad si la animación terminó completa;
            // si fue cancelada, el item volvió a mostrarse mientras tanto.
            if (completo && item.style.display !== 'none') {
                item.style.display = 'none';
            }
        });
    }
}

/** Aplica query + filtros (visibilidad) y el orden sobre el contenedor. */
function applyListState(container) {
    const state = getListState(container);
    const wrapper = container.querySelector(
        ':scope > .list-toolbar .search-wrapper, :scope > .search-wrapper'
    );
    const input = wrapper ? wrapper.querySelector('.search-input') : null;
    state.query = input ? input.value : state.query;

    const query = normalizeText(state.query);
    const items = Array.from(container.querySelectorAll(':scope > .list-item'));
    let visibleCount = 0;

    items.forEach((item) => {
        // Filtros en cascada (p. ej. Año → Grado → Sección en /proyectos).
        // Cada entrada del estado indica sobre qué dataset.* comparar
        // (atributo data-filter-key del select); '' no filtra.
        const matchesFilters = Object.entries(state.filters).every(
            ([key, val]) => !val || item.dataset[key] === val
        );
        const matchesQuery = !query || normalizeText(item.textContent).includes(query);
        const visible = matchesFilters && matchesQuery;
        applyItemVisibility(item, visible);
        if (visible) visibleCount++;
    });

    if (wrapper) wrapper.classList.toggle('has-value', state.query.trim().length > 0);

    const noResultsEl = ensureNoResultsEl(container);
    const termEl = noResultsEl.querySelector('.search-no-results-term');
    const subEl = noResultsEl.querySelector('.empty-subtext');

    // Mensaje contextual: si hay término de búsqueda, mencionarlo; si solo
    // hay filtros activos (sin texto de búsqueda), usar un mensaje genérico.
    const hasQuery = state.query.trim().length > 0;
    const hasFilters = Object.keys(state.filters).length > 0;
    const showNoResults = items.length > 0 && visibleCount === 0;

    noResultsEl.style.display = showNoResults ? 'flex' : 'none';
    if (showNoResults) {
        if (hasQuery) {
            // Mensaje: "No hay coincidencias para '<término>'."
            subEl.style.display = '';
            subEl.textContent = '';
            subEl.append('No hay coincidencias para ', termEl, '.');
            termEl.style.display = 'inline';
            termEl.textContent = state.query.trim();
        } else {
            // Mensaje genérico: "No se encontraron elementos con los filtros aplicados."
            subEl.style.display = '';
            subEl.textContent = 'No se encontraron elementos con los filtros aplicados.';
            termEl.style.display = 'none';
        }
    } else if (termEl) {
        termEl.style.display = 'inline';
    }

    if (state.sort !== 'relevancia' || state.baseline) {
        const sorted = [...items].sort(getSortComparator(state));
        orderItems(container, sorted);
    }
}

/** Limpia el buscador (botón ✕ o tecla Escape). */
function clearSearch(el) {
    const wrapper = el?.closest ? el.closest('.search-wrapper') : null;
    const input = (wrapper || el)?.querySelector('.search-input');
    if (!input || !input.value) return;

    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.focus();
}

/** Enfoca el input al hacer click en cualquier parte de la píldora. */
function focusSearchBar(el) {
    const wrapper = el?.closest ? el.closest('.search-wrapper') : el;
    wrapper?.querySelector('.search-input')?.focus();
}

/** Vincula búsqueda + orden + filtros de un contenedor de lista. */
function initListContainer(container) {
    if (container.dataset.insalListInit === 'true') return;
    container.dataset.insalListInit = 'true';

    const state = getListState(container);
    const toolbar = container.querySelector(':scope > .list-toolbar');
    const wrapper = container.querySelector(
        ':scope > .list-toolbar .search-wrapper, :scope > .search-wrapper'
    );
    const input = wrapper ? wrapper.querySelector('.search-input') : null;

    // Buscador
    if (input) {
        input.addEventListener('input', () => {
            state.query = input.value;
            applyListState(container);
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && input.value) clearSearch(input);
        });
    }

    // Selector de orden
    const select = toolbar ? toolbar.querySelector('select[data-sort]') : null;
    if (select) {
        state.sort = select.value || 'id-desc';
        select.addEventListener('change', () => {
            state.sort = select.value;
            applyListState(container);
        });
    }

    // Selectores de filtro (uno o varios en cascada, p. ej. Año → Grado →
    // Sección en la vista /proyectos). El atributo data-filter-key de cada
    // select indica sobre qué dataset.* comparar su valor; todos los filtros
    // activos se combinan con AND.
    const filterSelects = toolbar
        ? Array.from(toolbar.querySelectorAll('select[data-filter]'))
        : [];
    const syncFilterState = () => {
        state.filters = {};
        filterSelects.forEach((sel) => {
            if (sel.value) state.filters[sel.dataset.filterKey] = sel.value;
        });
    };
    syncFilterState();
    filterSelects.forEach((sel) => {
        sel.addEventListener('change', () => {
            syncFilterState();
            applyListState(container);
        });
    });

    // Si la lista se actualiza (cargas, refresh, router) se re-aplica el estado
    const observer = new MutationObserver(() => applyListState(container));
    observer.observe(container, { childList: true, subtree: false });
}

/** Inicializa los controles de todos los contenedores de lista. */
function initListControls() {
    document.querySelectorAll('.list-container').forEach(initListContainer);
}

// Exportar funciones usadas por onclick en HTML
window.focusSearchBar = focusSearchBar;
window.clearSearch = clearSearch;

// Expuesto para que los módulos de lista (p. ej. proyectos.js) puedan
// re-aplicar el filtrado/orden tras un soft refresh que actualizó los
// data-* de items existentes (los atributos no disparan el MutationObserver).
window.aplicarEstadoLista = applyListState;

// Inicialización (carga inicial + router SPA)
document.addEventListener('DOMContentLoaded', initListControls);
document.addEventListener('contentUpdated', initListControls);