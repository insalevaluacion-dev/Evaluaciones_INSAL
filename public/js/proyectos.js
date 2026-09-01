// ═══════════════════════════════════════════════════════════════
// MÓDULO: Proyectos — CRUD, renderizado y animaciones de lista
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';
import { createSubmitHandler } from './submitHandler.js';
import { cerrarDialogoAnimado } from './menu.js';
import { confirmarAccion } from './editar-criterios.js';
import { animarEntrada, animarSalida } from './listAnimations.js';

// ═══════════════════════════════════════════════════════════════
// ESTADO Y REFERENCIAS
// ═══════════════════════════════════════════════════════════════

let currentProyectoId = null;
let menuVisible = false;

function getMenuList() {
    return document.getElementById('menu__list');
}

function getContainer() {
    return document.getElementById('proyectos__container');
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

/**
 * Reconstruye las opciones de un select de filtro preservando la selección
 * si todavía es válida. Devuelve true si el valor seleccionado cambió.
 */
function reconstruirOpcionesFiltro(select, opciones, etiquetaVacia) {
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

    container.__cascadeSync = true;
    try {
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

        // Sincronizar el estado de filtrado del contenedor
        const state = container.__insalListState;
        if (state) {
            state.filters = {};
            [selAnio, selGrado, selSeccion].forEach((sel) => {
                if (sel.value) state.filters[sel.dataset.filterKey] = sel.value;
            });
        }

        // Refrescar el trigger del custom-select solo de los selects cuyo valor cambió
        if (cambioAnio) selAnio.dispatchEvent(new Event('change', { bubbles: true }));
        if (cambioGrado) selGrado.dispatchEvent(new Event('change', { bubbles: true }));
        if (cambioSeccion) selSeccion.dispatchEvent(new Event('change', { bubbles: true }));
    } finally {
        container.__cascadeSync = false;
    }
}

/**
 * Re-popula los filtros cuando el usuario cambia cualquiera de ellos:
 * tras una carga/refresh se reconstruyen las opciones y se re-sincroniza el
 * estado de filtrado (los cambios programáticos se ignoran vía __cascadeSync).
 */
function initFiltroCascadaProyectos(container) {
    if (!container || container.dataset.filtroCascadeInit === 'true') return;
    const selects = [
        document.getElementById('filtro-anio-proyectos'),
        document.getElementById('filtro-grado-proyectos'),
        document.getElementById('filtro-seccion-proyectos'),
    ].filter(Boolean);
    if (!selects.length) return;
    container.dataset.filtroCascadeInit = 'true';

    selects.forEach((sel) => {
        sel.addEventListener('change', () => {
            if (container.__cascadeSync) return;
            populateFiltrosProyectos(container, container.__datosProyectos || []);
        });
    });
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
    elementoDiv.dataset.nivelId = proyecto.nivel_id || '';
    elementoDiv.dataset.gradoId = proyecto.grado_id || '';

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
    el.dataset.nivelId = proyecto.nivel_id || '';
    el.dataset.gradoId = proyecto.grado_id || '';
    el.dataset.anio = proyecto.anio != null ? String(proyecto.anio) : '';
    el.dataset.gradoKey = categoriasGrado.gradoKey;
    el.dataset.seccion = categoriasGrado.seccion;
}
// ═══════════════════════════════════════════════════════════════
// SELECTS DEL FORMULARIO — niveles (rúbricas) y grados
// ═══════════════════════════════════════════════════════════════

let nivelesCache = null;
let gradosCache = null;

/** Obtiene las rúbricas (niveles de evaluación) para el select. */
async function obtenerNiveles() {
    if (nivelesCache) return nivelesCache;
    const res = await fetch('/admin/niveles-evaluacion', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    nivelesCache = (data && data.niveles) || [];
    return nivelesCache;
}

/** Obtiene los grados habilitados para el maestro. */
async function obtenerGrados() {
    if (gradosCache) return gradosCache;
    const res = await fetch('/admin/grados', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    gradosCache = (data && data.grados) || [];
    return gradosCache;
}

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
    const selGrado = document.getElementById(`${prefijo}-grado-nivel`);
    const selEsp = document.getElementById(`${prefijo}-grado-esp`);
    const selSeccion = document.getElementById(`${prefijo}-grado`);
    const hiddenGrado = document.getElementById(`${prefijo}-grado-id`);

    if (hiddenNivel) hiddenNivel.value = resolverNivelId(selNivel?.value || '');
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

/** Carga niveles y grados desde la DB y configura los selects (crear y editar). */
async function poblarSelectsProyecto() {
    try {
        const [niveles, grados] = await Promise.all([obtenerNiveles(), obtenerGrados()]);

        // Rúbricas (niveles) para crear y editar
        poblarOpcionesSelect('proyecto-nivel', niveles.map((n) => n.nombre), 'Selecciona un tipo de evaluación');
        poblarOpcionesSelect('editar-nivel', niveles.map((n) => n.nombre), 'Selecciona un tipo de evaluación');

        // Cascadas Grado → Especialidad → Sección (crear y editar)
        configurarCascadeGrado('proyecto', grados);
        configurarCascadeGrado('editar', grados);

        // Resolver el nivel_id cuando cambia la rúbrica
        ['proyecto-nivel', 'editar-nivel'].forEach((id) => {
            const sel = document.getElementById(id);
            const hidden = document.getElementById(`${id}-id`);
            if (!sel || !hidden) return;
            const listener = () => { hidden.value = resolverNivelId(sel.value); };
            sel.addEventListener('change', listener);
        });
    } catch (error) {
        console.error('Error al cargar las opciones del formulario de proyectos:', error);
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
            const grado_id = Number(resolverGradoId(
                document.getElementById('proyecto-grado-nivel')?.value || '',
                document.getElementById('proyecto-grado-esp')?.value || '',
                document.getElementById('proyecto-grado')?.value || ''
            ));

            if (!nombre) {
                mostrarNotificacion('Por favor complete el nombre del proyecto', 'error');
                throw new Error('Campo vacío');
            }

            if (!nivel_id || !grado_id) {
                mostrarNotificacion('Selecciona el tipo de evaluación y el grado del proyecto', 'error');
                throw new Error('Campos vacíos');
            }

            const response = await fetch('/admin/proyectos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, grado_id, nivel_id })
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
            ['proyecto-nivel', 'proyecto-grado-nivel', 'proyecto-grado-esp',
                'proyecto-grado'].forEach((id) => {
                    const sel = document.getElementById(id);
                    if (sel) sel.value = '';
                });
            ['proyecto-nivel-id', 'proyecto-grado-id'].forEach((id) => {
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

/** Valida que la rúbrica y el grado del formulario tengan un valor válido (de la DB). */
function validarSelectsProyecto() {
    // Re-sincronizar por si el usuario escribió sin salir del campo
    sincronizarIdsFormulario('proyecto');
    const nivelId = document.getElementById('proyecto-nivel-id');
    const gradoId = document.getElementById('proyecto-grado-id');
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

    if (nombreInput) nombreInput.value = item.dataset.nombre || '';

    // Pre-seleccionar nivel (rúbrica) y grado vía la cascada
    // Grado → Especialidad → Sección del diálogo de edición
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

    if (!nivel_id || !grado_id) {
        mostrarNotificacion('Selecciona la rúbrica (nivel) y el grado del proyecto', 'error');
        throw new Error('Campos vacíos');
    }

    const res = await fetch(`/admin/proyectos/${currentProyectoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, nivel_id, grado_id }),
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

    initDialogoEditarProyecto();
    poblarSelectsProyecto();
    loadProyectos();
    initFiltroCascadaProyectos(container);

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

            menuVisible = !menuVisible;

            const rect = menuBtn.getBoundingClientRect();
            menulist.style.top = rect.bottom + 8 + 'px';
            menulist.style.right = (window.innerWidth - rect.right) + 'px';

            if (menuVisible) {
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