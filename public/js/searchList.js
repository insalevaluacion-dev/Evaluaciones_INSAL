// ═══════════════════════════════════════════════════════════════
// MÓDULO: Controles de lista — búsqueda + ordenar
//   • Click en la píldora enfoca el input
//   • Filtro en vivo sobre los .list-item del .list-container
//   • Botón de limpiar (✕) y tecla Escape
//   • Orden con select[data-sort] (reordena los .list-item del contenedor)
//   • Estado "sin resultados" y re-aplicación tras refrescos (router SPA)
//   • Ocultar/mostrar items al filtrar: delegado a listAnimations.js (WAAPI)
// ═══════════════════════════════════════════════════════════════

import { animarMostrar, animarOcultar, cancelarAnimacionLista } from './listAnimations.js';

// Por debajo de este umbral el filtrado anima cada ítem. Por encima, mostrar
// u ocultar es instantáneo: medir la altura de cientos de filas (offsetHeight)
// en el mismo turno bloquea el hilo principal y la página se congela.
const UMBRAL_ANIMACION_FILTRO = 12;

/** Texto visible del ítem, sin nodos marcados data-search-ignore
 *  (p. ej. el % de ponderación de una rúbrica). */
function textoBuscable(root) {
    if (!root.querySelector('[data-search-ignore]')) return root.textContent || '';
    let text = '';
    const walk = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            text += node.nodeValue || '';
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.hasAttribute('data-search-ignore')) return;
        for (const child of node.childNodes) walk(child);
    };
    walk(root);
    return text;
}

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
    if (el) {
        const sub = el.querySelector('.empty-subtext');
        if (sub && !sub.querySelector('.search-no-results-term')) {
            const term = document.createElement('em');
            term.className = 'search-no-results-term';
            sub.textContent = '';
            sub.append('No hay coincidencias para ', term, '.');
        }
        return el;
    }

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
    if (state.sort === 'rubrica') {
        return (a, b) => {
            const ra = String(a.dataset.rubrica || '').toLowerCase();
            const rb = String(b.dataset.rubrica || '').toLowerCase();
            if (ra < rb) return -1;
            if (ra > rb) return 1;
            // Mismo grupo de rúbrica: más recientes primero (coincide con el
            // orden por defecto id-desc dentro de un grupo)
            return Number(b.dataset.itemId) - Number(a.dataset.itemId);
        };
    }
    // 'relevancia' → restaura el orden original capturado antes de ordenar.
    // El índice se arma una vez: findIndex dentro del comparador era O(n) por
    // comparación y congelaba listas largas.
    const indice = new Map();
    (state.baseline || []).forEach((el, i) => indice.set(el, i));
    const fallback = indice.size;
    return (a, b) => (indice.get(a) ?? fallback) - (indice.get(b) ?? fallback);
}

/** Texto normalizado del ítem, cacheado mientras su texto no cambie. */
function claveBusqueda(item) {
    const sello = item.textContent || '';
    if (item.__selloBusqueda === sello) return item.__claveBusqueda;
    item.__selloBusqueda = sello;
    item.__claveBusqueda = normalizeText(textoBuscable(item));
    return item.__claveBusqueda;
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

    // Un solo insert evita un reflow por ítem (antes cada insertBefore
    // recolocaba la lista entera y el MutationObserver volvía a filtrar).
    const frag = document.createDocumentFragment();
    items.forEach((item) => frag.appendChild(item));
    if (ref && ref.parentNode === container) container.insertBefore(frag, ref);
    else container.appendChild(frag);
}

/** true si el ítem ya está (o está quedando) fuera del filtro. */
function itemEstaOculto(item) {
    return item.classList.contains('is-filter-hidden') || item.style.display === 'none';
}

/** Muestra u oculta sin medir layout: para muchos ítems a la vez. */
function fijarVisibilidadInmediata(item, visible) {
    cancelarAnimacionLista(item);
    item.classList.toggle('is-filter-hidden', !visible);
    item.style.display = visible ? '' : 'none';
}

/** Aplica la visibilidad de un item con animación suave (filtrado por búsqueda).
 *  La clase is-filter-hidden se pone al instante para que un segundo filtrado
 *  (otra tecla, otro select) no vuelva a medir y animar el mismo ítem. */
function applyItemVisibility(item, visible) {
    const hidden = itemEstaOculto(item);

    if (visible) {
        if (!hidden) return;
        item.classList.remove('is-filter-hidden');
        animarMostrar(item);
        return;
    }
    if (hidden) return;
    item.classList.add('is-filter-hidden');
    animarOcultar(item).then((completo) => {
        // Solo ocultar de verdad si la animación terminó completa;
        // si fue cancelada, el item volvió a mostrarse mientras tanto.
        if (completo && item.classList.contains('is-filter-hidden')) {
            item.style.display = 'none';
        }
    });
}

/** Aplica query + filtros (visibilidad) y el orden sobre el contenedor.
 *  Como mucho una vez por frame: varios selects o teclas en el mismo turno
 *  se fusionan en una sola pasada. */
const aplicarProgramado = new WeakMap();

function programarAplicar(container) {
    if (aplicarProgramado.has(container)) return;
    const id = requestAnimationFrame(() => {
        aplicarProgramado.delete(container);
        applyListState(container);
    });
    aplicarProgramado.set(container, id);
}

/** Aplica query + filtros (visibilidad) y el orden sobre el contenedor. */
function applyListState(container) {
    if (container.__aplicandoLista) {
        container.__listaPendiente = true;
        return;
    }
    container.__aplicandoLista = true;
    // El reorden mueve nodos y el MutationObserver volvería a entrar aquí.
    container.__ignorarMutacionesLista = true;

    try {
        aplicarListaAhora(container);
    } finally {
        container.__aplicandoLista = false;
        queueMicrotask(() => {
            container.__ignorarMutacionesLista = false;
            if (container.__listaPendiente) {
                container.__listaPendiente = false;
                programarAplicar(container);
            }
        });
    }
}

function aplicarListaAhora(container) {
    const state = getListState(container);
    const wrapper = container.querySelector(
        ':scope > .list-toolbar .search-wrapper, :scope > .search-wrapper'
    );
    const input = wrapper ? wrapper.querySelector('.search-input') : null;
    state.query = input ? input.value : state.query;

    const query = normalizeText(state.query);
    const hayQuery = query.length > 0;
    const entradasFiltro = Object.entries(state.filters);
    const items = Array.from(container.querySelectorAll(':scope > .list-item'));
    const cambios = [];
    let visibleCount = 0;

    items.forEach((item) => {
        // Filtros combinados con AND (Año, Grado, Sección, Rúbrica, Materia).
        // Cada entrada indica sobre qué dataset.* comparar (data-filter-key);
        // '' no filtra. Sin texto de búsqueda no se recorre el DOM del ítem.
        const matchesFilters = entradasFiltro.every(
            ([key, val]) => !val || item.dataset[key] === val
        );
        const matchesQuery = !hayQuery || claveBusqueda(item).includes(query);
        const visible = matchesFilters && matchesQuery;
        if (visible !== !itemEstaOculto(item)) cambios.push({ item, visible });
        if (visible) visibleCount++;
    });

    if (cambios.length > UMBRAL_ANIMACION_FILTRO) {
        cambios.forEach(({ item, visible }) => fijarVisibilidadInmediata(item, visible));
    } else {
        cambios.forEach(({ item, visible }) => applyItemVisibility(item, visible));
    }

    if (wrapper) wrapper.classList.toggle('has-value', state.query.trim().length > 0);

    const noResultsEl = ensureNoResultsEl(container);
    const termEl = noResultsEl.querySelector('.search-no-results-term');
    const subEl = noResultsEl.querySelector('.empty-subtext');

    // Mensaje contextual: si hay término de búsqueda, mencionarlo; si solo
    // hay filtros activos (sin texto de búsqueda), usar un mensaje genérico.
    const hasQuery = state.query.trim().length > 0;
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
        wrapper.addEventListener('click', (event) => {
            if (event.target instanceof Element && event.target.closest('button, input')) return;
            input.focus({ preventScroll: true });
        });
        input.addEventListener('input', () => {
            state.query = input.value;
            programarAplicar(container);
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
            programarAplicar(container);
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
            // El filtro de rúbrica define el orden/agrupamiento de la lista:
            // con "Todas" queda agrupada por rúbrica; al escoger una rúbrica se
            // filtra y agrupa a ese grupo.
            if (sel.dataset.filterKey === 'rubrica') {
                state.sort = 'rubrica';
            }
            programarAplicar(container);
        });
    });

    // Si la lista se actualiza (cargas, refresh, router) se re-aplica el estado.
    // Las mutaciones hechas por el propio filtrado (reordenar ítems) se ignoran
    // para no volver a entrar y congelar la página.
    const observer = new MutationObserver(() => {
        if (container.__ignorarMutacionesLista) return;
        programarAplicar(container);
    });
    observer.observe(container, { childList: true, subtree: false });
}

/** Inicializa los controles de todos los contenedores de lista. */
function initListControls() {
    document.querySelectorAll('.list-container').forEach(initListContainer);
}

// Exportar funciones usadas por onclick en HTML
window.clearSearch = clearSearch;

// Expuesto para que los módulos de lista (p. ej. proyectos.js) puedan
// re-aplicar el filtrado/orden tras un soft refresh que actualizó los
// data-* de items existentes (los atributos no disparan el MutationObserver).
window.aplicarEstadoLista = applyListState;

// Inicialización (carga inicial + router SPA)
document.addEventListener('DOMContentLoaded', initListControls);
document.addEventListener('contentUpdated', initListControls);