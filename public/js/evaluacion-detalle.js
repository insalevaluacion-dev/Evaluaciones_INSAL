// ═══════════════════════════════════════════════════════════════
// MÓDULO: Detalle de evaluación (vista /menu/evaluaciones/:id)
//  Muestra los datos reales del proyecto y sus evaluaciones:
//   - GET /admin/proyectos/:id                              → encabezado
//   - GET /admin/evaluaciones/proyectos/:id/evaluaciones    → lista
//   - GET /evaluacion-criterios/:evaluacionId               → desglose (lazy)
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';
import { aplicarTextoShimmer } from './texto.js';
import { animarEntrada, animarSalida } from './listAnimations.js';

// ═══════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════

let proyectoId = null;
let ultimaCargaId = null;

// Datos de la última carga, usados por la descarga (PDF)
let proyectoCache = null;
let evaluacionesCache = [];
const criteriosCache = new Map();

/** Lee el id del proyecto desde el data-attribute de la vista (o de la URL). */
function getProyectoId() {
    const root = document.querySelector('.contenedor-criterios[data-proyecto-id]');
    if (root?.dataset?.proyectoId) return root.dataset.proyectoId;
    const m = location.pathname.match(/^\/menu\/evaluaciones\/(\d+)$/);
    return m ? m[1] : null;
}

/**
 * Devuelve el container1 de ESTA vista (detalle de evaluación). Se usa para
 * escopar las consultas del DOM: hay containers1 idénticos en otras vistas
 * (p. ej. editar proyecto) que no deben ser modificados por este módulo.
 */
function getContainerDetalle() {
    return document.querySelector('.container1--detalle-evaluacion');
}

/** Busca un elemento SOLO dentro del container de esta vista. */
function qsDetalle(selector) {
    return getContainerDetalle()?.querySelector(selector) || null;
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

/** Formatea un número quitando los decimales cuando es un entero (10.00 → 10). */
function formatNota(valor) {
    const n = Number(valor);
    if (Number.isNaN(n)) return '—';
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Formatea un timestamp ISO → "día mes año · hh:mm". */
function formatFecha(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return String(fecha);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    // Hora en formato 12h con a.m./p.m.
    const horas24 = d.getHours();
    const periodo = horas24 >= 12 ? 'p.m.' : 'a.m.';
    const horas12 = horas24 % 12 === 0 ? 12 : horas24 % 12;
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} · ${horas12}:${mi} ${periodo}`;
}

/**
 * Calcula la nota a mostrar para el proyecto.
 * La nota es completa cuando las evaluaciones confirmadas alcanzan la
 * cantidad de evaluadores de la rúbrica (niveles.cantidad_evaluadores).
 * No basta con que proyectos.nota esté vacía: esa columna solo se escribe
 * al confirmar la evaluación que cruza el umbral, y queda desactualizada
 * si después se baja la cantidad de evaluadores.
 *  - Completa: la nota guardada, o el promedio de las confirmadas si aún no se persistió.
 *  - Parcial: el promedio de las confirmadas, mientras falten evaluadores.
 */
function calcularNotaProyecto(proyecto, evaluaciones) {
    const evals = Array.isArray(evaluaciones) ? evaluaciones : [];
    const requeridosRaw = proyecto?.cantidad_evaluadores;
    const requeridosNum = Number(requeridosRaw);
    const requeridos = Number.isInteger(requeridosNum) && requeridosNum >= 1 ? requeridosNum : 3;

    const notaRaw = proyecto?.nota;
    // Number(null) === 0, así que hay que descartar null/undefined/'' antes
    const notaFinal = notaRaw != null && notaRaw !== '' ? Number(notaRaw) : null;

    let promedio = null;
    if (evals.length > 0) {
        const suma = evals.reduce((acc, ev) => acc + Number(ev.nota), 0);
        const prom = suma / evals.length;
        if (Number.isFinite(prom)) promedio = prom;
    }

    // Misma regla que GET /admin/evaluaciones/proyectos: completa si
    // las evaluaciones confirmadas cubren lo que pide la rúbrica.
    const completa = evals.length >= requeridos;

    if (completa) {
        const valor = Number.isFinite(notaFinal) ? notaFinal : promedio;
        if (valor != null && Number.isFinite(valor)) {
            return { valor: formatNota(valor), etiqueta: 'Nota completa' };
        }
    }

    if (promedio != null) {
        return { valor: formatNota(promedio), etiqueta: 'Nota parcial' };
    }

    return { valor: null, etiqueta: '' };
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

        const evaluaciones = Array.isArray(evaluacionesData?.evaluaciones)
            ? evaluacionesData.evaluaciones
            : [];

        // Guardar en caché para la descarga (PDF)
        proyectoCache = proyectoData?.proyecto || null;
        evaluacionesCache = evaluaciones;

        renderEncabezado(proyectoData?.proyecto || null);
        renderNota(proyectoData?.proyecto || null, evaluaciones);

        const contador = document.getElementById('contador-evaluaciones');
        if (contador) contador.textContent = evaluaciones.length;

        renderEvaluaciones(evaluaciones);
    } catch (err) {
        console.error('Error al cargar detalle de evaluación:', err);
        hideLoader();
        aplicarTextoShimmer(qsDetalle('#detalle-proyecto-nombre'), 'No se pudo cargar');
        const subEl = qsDetalle('#detalle-proyecto-sub');
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
 * Solo modifica el container de esta vista (.container1--detalle-evaluacion).
 */
function renderEncabezado(proyecto) {
    const nombreEl = qsDetalle('#detalle-proyecto-nombre');
    const subEl = qsDetalle('#detalle-proyecto-sub');

    aplicarTextoShimmer(nombreEl, proyecto?.nombre || 'Proyecto');

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

    subEl.textContent =
        partes.length > 0 ? partes.join(' · ') : 'Proyecto sin información de grado.';
}

/**
 * Pinta el badge de nota del container1. Muestra:
 *  - Nota completa si las evaluaciones confirmadas alcanzan
 *    cantidad_evaluadores de la rúbrica.
 *  - El promedio de las confirmadas (nota parcial) si aún faltan.
 *  - Se oculta si no hay nota ni evaluaciones.
 * Solo modifica el container de esta vista.
 */
function renderNota(proyecto, evaluaciones) {
    const badge = qsDetalle('#detalle-proyecto-nota');
    if (!badge) return;

    const { valor, etiqueta } = calcularNotaProyecto(proyecto, evaluaciones);

    if (valor !== null) {
        badge.hidden = false;
        badge.classList.toggle('is-completa', etiqueta === 'Nota completa');
        badge.classList.toggle('is-parcial', etiqueta === 'Nota parcial');
        const valorEl = badge.querySelector('.detalle-proyecto__nota-valor');
        if (valorEl) valorEl.textContent = valor;
    } else {
        badge.hidden = true;
    }
}
// ═══════════════════════════════════════════════════════════════
// RENDER DE EVALUACIONES
// ═══════════════════════════════════════════════════════════════

/**
 * Carga y pinta el desglose de criterios de una evaluación usando
 * GET /evaluacion-criterios/:evaluacionId (carga diferida).
 * Escribe dentro del contenedor `.evaluacion-detalle__criterios`.
 */
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

function marcarSalida(el) {
    if (!el) return Promise.resolve(false);
    el.classList.remove('list-item--refreshing');
    el.setAttribute('data-saliendo', '');
    return animarSalida(el).then((completo) => {
        if (completo !== false) el.remove();
        return completo;
    });
}

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

function aporteCriterio(c) {
    return (Number(c.puntuacion) * Number(c.porcentaje)) / 100;
}

function crearFilaCriterio(c) {
    const fila = document.createElement('div');
    fila.className = 'evaluacion-detalle__criterio';
    fila.dataset.itemId = String(c.criterio_id);
    const ponderado = aporteCriterio(c);
    fila.innerHTML = `
        <span class="evaluacion-detalle__criterio-nombre">${escapeHtml(c.nombre || 'Criterio')}</span>
        <span class="evaluacion-detalle__criterio-col">${formatNota(c.puntuacion)}</span>
        <span class="evaluacion-detalle__criterio-col">${Number(c.porcentaje)}%</span>
        <span class="evaluacion-detalle__criterio-col evaluacion-detalle__criterio-aporte" title="Aporte a la nota final">+${formatNota(ponderado)}</span>`;
    return fila;
}

function actualizarFilaCriterio(fila, c) {
    const ponderado = aporteCriterio(c);
    const nombre = fila.querySelector('.evaluacion-detalle__criterio-nombre');
    if (nombre) nombre.textContent = c.nombre || 'Criterio';
    const cols = fila.querySelectorAll('.evaluacion-detalle__criterio-col');
    if (cols[0]) cols[0].textContent = formatNota(c.puntuacion);
    if (cols[1]) cols[1].textContent = `${Number(c.porcentaje)}%`;
    if (cols[2]) cols[2].textContent = `+${formatNota(ponderado)}`;
}

function asegurarLeyendaCriterios(contenedor) {
    if (contenedor.querySelector('.evaluacion-detalle__criterios-leyenda')) return;
    const leyenda = document.createElement('p');
    leyenda.className = 'evaluacion-detalle__criterios-leyenda';
    const fuerte = document.createElement('strong');
    fuerte.textContent = 'aporte';
    leyenda.append(
        'El ',
        fuerte,
        ' es el puntaje del criterio multiplicado por su peso sobre la nota final.',
    );
    contenedor.appendChild(leyenda);
}

function pintarCriteriosInicial(contenedor, criterios) {
    const tabla = document.createElement('div');
    tabla.className = 'evaluacion-detalle__criterios-tabla';
    const cabecera = document.createElement('div');
    cabecera.className = 'evaluacion-detalle__criterios-cabecera';
    cabecera.setAttribute('aria-hidden', 'true');
    cabecera.innerHTML = '<span>Criterio</span><span>Puntaje</span><span>Peso</span><span>Aporte</span>';
    tabla.appendChild(cabecera);
    criterios.forEach((c) => tabla.appendChild(crearFilaCriterio(c)));
    contenedor.replaceChildren(tabla);
    asegurarLeyendaCriterios(contenedor);
    tabla.querySelectorAll('.evaluacion-detalle__criterio').forEach((el, index) => animarEntrada(el, index * 60));
}

function pintarCriteriosVacio(contenedor) {
    if (contenedor.querySelector('.evaluacion-detalle__criterios-vacio')) {
        contenedor.querySelector('.evaluacion-detalle__criterios-tabla')?.remove();
        contenedor.querySelector('.evaluacion-detalle__criterios-leyenda')?.remove();
        return;
    }
    const vacio = document.createElement('p');
    vacio.className = 'evaluacion-detalle__criterios-vacio';
    vacio.textContent = 'Sin criterios registrados.';
    contenedor.replaceChildren(vacio);
}

async function cargarCriteriosEvaluacion(evaluacionId, contenedor) {
    if (!contenedor) return;

    if (contenedor.dataset.cargando === 'true') return;
    contenedor.dataset.cargando = 'true';
    contenedor.setAttribute('aria-busy', 'true');
    const filasAnteriores = [...contenedor.querySelectorAll('.evaluacion-detalle__criterio:not([data-saliendo])')];
    const vacio = contenedor.querySelector('.evaluacion-detalle__criterios-vacio');
    const coldLoad = filasAnteriores.length === 0 && !vacio;
    if (!coldLoad && filasAnteriores.length) {
        filasAnteriores.forEach((el) => el.classList.add('list-item--refreshing'));
    }
    if (coldLoad) {
        contenedor.innerHTML =
            '<div class="progreso-lineal indeterminado"><div class="progreso-indicador"></div></div>';
    }

    try {
        const data = await fetchJson(`/evaluacion-criterios/${evaluacionId}`);
        const criterios = (Array.isArray(data?.criterios) ? data.criterios : [])
            .filter((c) => c?.criterio_id != null);

        criteriosCache.set(Number(evaluacionId), criterios);
        contenedor.dataset.cargado = 'true';

        if (coldLoad || !contenedor.querySelector('.evaluacion-detalle__criterios-tabla')) {
            if (criterios.length === 0) pintarCriteriosVacio(contenedor);
            else pintarCriteriosInicial(contenedor, criterios);
            return;
        }

        const idsNuevos = criterios.map((c) => String(c.criterio_id));
        const setNuevos = new Set(idsNuevos);
        const promesasSalida = filasAnteriores
            .filter((el) => !setNuevos.has(el.dataset.itemId))
            .map(marcarSalida);

        if (criterios.length === 0) {
            await Promise.all(promesasSalida);
            pintarCriteriosVacio(contenedor);
            return;
        }

        const tabla = contenedor.querySelector('.evaluacion-detalle__criterios-tabla');
        contenedor.querySelector('.evaluacion-detalle__criterios-vacio')?.remove();
        asegurarLeyendaCriterios(contenedor);
        const existentes = new Map(filasAnteriores.map((el) => [el.dataset.itemId, el]));
        criterios.forEach((c, index) => {
            const id = String(c.criterio_id);
            const existente = existentes.get(id);
            if (existente) {
                actualizarFilaCriterio(existente, c);
                pulsarActualizado(existente);
            } else {
                const fila = crearFilaCriterio(c);
                insertarPorOrden(tabla, fila, idsNuevos, index, 'data-item-id', '.evaluacion-detalle__criterio');
                animarEntrada(fila, index * 60);
            }
        });
    } catch (err) {
        console.error('Error al cargar criterios de la evaluación:', err);
        if (coldLoad) {
            contenedor.innerHTML =
                '<p class="evaluacion-detalle__criterios-vacio">No se pudieron cargar los criterios.</p>';
        } else {
            contenedor.querySelectorAll('.list-item--refreshing').forEach((el) => el.classList.remove('list-item--refreshing'));
        }
        mostrarNotificacion(
            err?.message || 'Error al cargar los criterios de la evaluación',
            'error',
        );
    } finally {
        contenedor.querySelectorAll('.list-item--refreshing').forEach((el) => el.classList.remove('list-item--refreshing'));
        delete contenedor.dataset.cargando;
        contenedor.removeAttribute('aria-busy');
    }
}

/** Actualiza criterios al abrir la pestaña, conservando lo visible durante el fetch. */
function cargarCriteriosSiFalta(ev, card) {
    const contenedor = card.querySelector('.evaluacion-detalle__criterios');
    if (!contenedor) return;
    cargarCriteriosEvaluacion(Number(ev.evaluacion_id), contenedor);
}

/**
 * Coloca la burbuja del tablist bajo la pestaña activa de una tarjeta.
 * La transición se habilita después del primer posicionamiento para que
 * la burbuja no se vea deslizarse al cargar la vista.
 */
function posicionarIndicador(card) {
    // Con el cuerpo colapsado las medidas son 0; no reposicionar
    if (card.classList.contains('is-colapsado')) return;

    const wrap = card.querySelector('.evaluacion-detalle__tabs');
    const indicador = wrap?.querySelector('.evaluacion-detalle__tab-indicador');
    const activo = wrap?.querySelector('.evaluacion-detalle__tab.is-activo');
    if (!wrap || !indicador || !activo) return;

    indicador.style.width = `${activo.offsetWidth}px`;
    indicador.style.transform = `translateX(${activo.offsetLeft}px)`;

    if (!indicador.classList.contains('is-animado')) {
        requestAnimationFrame(() => indicador.classList.add('is-animado'));
    }
}

function escribirDatoEvaluacion(card, campo, valor, esNota = false) {
    const dd = card.querySelector(`.evaluacion-detalle__dato[data-campo="${campo}"] dd`);
    if (!dd) return;
    if (!esNota) {
        dd.textContent = valor;
        return;
    }
    let strong = dd.querySelector('.evaluacion-detalle__nota-fuerte');
    if (!strong) {
        dd.replaceChildren();
        strong = document.createElement('strong');
        strong.className = 'evaluacion-detalle__nota-fuerte';
        dd.append(strong, document.createTextNode(' / 10'));
    }
    strong.textContent = valor;
}

/** Cada fila de la ficha. El efecto va en .evaluacion-detalle__dato, no en el dl ni en el dd. */
function superficiesDetalle(card) {
    return [...card.querySelectorAll('.evaluacion-detalle__panel[data-panel="detalles"] .evaluacion-detalle__dato')];
}

/** Refresca la ficha de la evaluación conservando su tarjeta y pestaña activa. */
async function refrescarFichaEvaluacion(ev, card) {
    if (!proyectoId || card.dataset.refrescando === 'true') return ev;
    card.dataset.refrescando = 'true';
    card.setAttribute('aria-busy', 'true');
    const valores = superficiesDetalle(card);
    valores.forEach((el) => el.classList.add('list-item--refreshing'));
    try {
        const data = await fetchJson(`/admin/evaluaciones/proyectos/${proyectoId}/evaluaciones`);
        const lista = Array.isArray(data?.evaluaciones) ? data.evaluaciones : [];
        const id = String(ev.evaluacion_id);
        const actualizado = lista.find((item) => String(item.evaluacion_id) === id);
        if (!actualizado) return ev;
        evaluacionesCache = lista;
        const nota = formatNota(actualizado.nota);
        escribirDatoEvaluacion(card, 'evaluador', actualizado.evaluador_nombre || 'Evaluador');
        escribirDatoEvaluacion(card, 'correo', actualizado.evaluador_email || '—');
        escribirDatoEvaluacion(card, 'fecha', formatFecha(actualizado.fecha_evaluacion));
        escribirDatoEvaluacion(card, 'nota', nota, true);
        const nombre = card.querySelector('.evaluacion-detalle__nombre');
        if (nombre) nombre.textContent = actualizado.evaluador_nombre || 'Evaluador';
        const notaCabecera = card.querySelector('.evaluacion-detalle__nota-valor');
        if (notaCabecera) notaCabecera.textContent = nota;
        valores.forEach((el) => pulsarActualizado(el));
        return actualizado;
    } catch (err) {
        console.error('Error al refrescar la ficha de evaluación:', err);
        mostrarNotificacion(err.message || 'Error al actualizar la evaluación', 'error');
        return ev;
    } finally {
        delete card.dataset.refrescando;
        card.removeAttribute('aria-busy');
        card.querySelectorAll('.list-item--refreshing').forEach((el) => el.classList.remove('list-item--refreshing'));
    }
}

/**
 * Crea la tarjeta de una evaluación con pestañas (Detalles / Criterios).
 * El panel "Detalles" es la ficha legible; "Criterios" se carga perezosamente
 * la primera vez que se abre.
 */
function createEvaluacionCard(ev, index) {
    let evaluacionActual = ev;
    const card = document.createElement('div');
    card.className = 'evaluacion-detalle__card evaluacion-entrada is-colapsado';
    card.dataset.evaluacionId = String(ev.evaluacion_id);
    card.style.animationDelay = `${index * 80}ms`;

    const nota = formatNota(ev.nota);
    const fecha = formatFecha(ev.fecha_evaluacion);
    const evaluador = escapeHtml(ev.evaluador_nombre || 'Evaluador');
    const email = escapeHtml(ev.evaluador_email || '—');

    // Ids únicos para el patrón de pestañas
    const idTabDetalles = `ed-tab-detalles-${index}`;
    const idTabCriterios = `ed-tab-criterios-${index}`;
    const idPanelDetalles = `ed-panel-detalles-${index}`;
    const idPanelCriterios = `ed-panel-criterios-${index}`;

    card.innerHTML = `
        <button type="button" class="evaluacion-detalle__head"
            aria-expanded="false" aria-controls="ed-cuerpo-${index}">
            <div class="evaluacion-detalle__num">
                <span class="material-symbols-rounded" aria-hidden="true">how_to_reg</span>
            </div>
            <div class="evaluacion-detalle__identidad">
                <p class="evaluacion-detalle__etiqueta">Evaluación ${index + 1}</p>
                <p class="evaluacion-detalle__nombre">${evaluador}</p>
            </div>
            <div class="evaluacion-detalle__nota">
                <span class="evaluacion-detalle__nota-valor">${nota}</span>
                <span class="evaluacion-detalle__nota-escala">/ 10</span>
            </div>
            <span class="material-symbols-rounded evaluacion-detalle__chevron" aria-hidden="true">expand_more</span>
        </button>

        <div class="evaluacion-detalle__cuerpo" id="ed-cuerpo-${index}">
            <div class="evaluacion-detalle__cuerpo-inner">
        <div class="evaluacion-detalle__tabs" role="tablist" aria-label="Contenido de la evaluación">
            <button type="button" class="evaluacion-detalle__tab is-activo"
                id="${idTabDetalles}" role="tab" aria-selected="true"
                aria-controls="${idPanelDetalles}" data-tab="detalles">Detalles</button>
            <button type="button" class="evaluacion-detalle__tab"
                id="${idTabCriterios}" role="tab" aria-selected="false" tabindex="-1"
                aria-controls="${idPanelCriterios}" data-tab="criterios">Criterios</button>
        </div>

        <div class="evaluacion-detalle__panel is-activo"
            id="${idPanelDetalles}" role="tabpanel"
            aria-labelledby="${idTabDetalles}" data-panel="detalles">
            <div class="evaluacion-detalle__panel-scroll">
                <dl class="evaluacion-detalle__datos">
                    <div class="evaluacion-detalle__dato" data-campo="evaluador">
                        <dt>Evaluador</dt>
                        <dd>${evaluador}</dd>
                    </div>
                    <div class="evaluacion-detalle__dato" data-campo="correo">
                        <dt>Correo</dt>
                        <dd>${email}</dd>
                    </div>
                    <div class="evaluacion-detalle__dato" data-campo="fecha">
                        <dt>Fecha y hora</dt>
                        <dd>${escapeHtml(fecha)}</dd>
                    </div>
                    <div class="evaluacion-detalle__dato" data-campo="nota">
                        <dt>Nota</dt>
                        <dd><strong class="evaluacion-detalle__nota-fuerte">${nota}</strong> / 10</dd>
                    </div>
                </dl>
            </div>
        </div>

        <div class="evaluacion-detalle__panel"
            id="${idPanelCriterios}" role="tabpanel"
            aria-labelledby="${idTabCriterios}" data-panel="criterios" hidden>
            <div class="evaluacion-detalle__panel-scroll">
                <div class="evaluacion-detalle__criterios"></div>
            </div>
        </div>
            </div>
        </div>
    `;

    // Burbuja que se desliza bajo la pestaña activa
    const tabsWrap = card.querySelector('.evaluacion-detalle__tabs');
    const indicador = document.createElement('span');
    indicador.className = 'evaluacion-detalle__tab-indicador';
    indicador.setAttribute('aria-hidden', 'true');
    tabsWrap.prepend(indicador);

    const tabs = Array.from(card.querySelectorAll('.evaluacion-detalle__tab'));
    const panels = Array.from(card.querySelectorAll('.evaluacion-detalle__panel'));
    const headBtn = card.querySelector('.evaluacion-detalle__head');

    // Colapsar / expandir todo el cuerpo (pestañas + paneles)
    headBtn.addEventListener('click', () => {
        const colapsado = card.classList.toggle('is-colapsado');
        headBtn.setAttribute('aria-expanded', String(!colapsado));

        // Al expandir, la burbuja necesita medirse con el cuerpo ya visible
        if (!colapsado) {
            requestAnimationFrame(() => posicionarIndicador(card));
        }
    });

    /** Activa una pestaña y su panel, y dispara la carga diferida de criterios. */
    function activarTab(tab) {
        tabs.forEach((t) => {
            const activo = t === tab;
            t.classList.toggle('is-activo', activo);
            t.setAttribute('aria-selected', String(activo));
            t.tabIndex = activo ? 0 : -1;
        });

        panels.forEach((p) => {
            const activo = p.dataset.panel === tab.dataset.tab;
            p.classList.toggle('is-activo', activo);
            p.hidden = !activo;
        });

        if (tab.dataset.tab === 'criterios') {
            cargarCriteriosSiFalta(ev, card);
        } else {
            refrescarFichaEvaluacion(evaluacionActual, card).then((actualizado) => {
                evaluacionActual = actualizado;
            });
        }

        posicionarIndicador(card);
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => activarTab(tab));

        // Navegación con teclado: ← → para moverse entre pestañas
        tab.addEventListener('keydown', (e) => {
            const paso = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : null;
            if (paso === null) return;
            e.preventDefault();
            const siguiente =
                (tabs.indexOf(tab) + paso + tabs.length) % tabs.length;
            tabs[siguiente].focus();
            activarTab(tabs[siguiente]);
        });
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

    const subEl = qsDetalle('#detalle-proyecto-sub');

    if (evaluaciones.length === 0) {
        lista.innerHTML =
            '<p class="criterios-vacio">Aún no hay evaluaciones para este proyecto.</p>';
        if (subEl) subEl.textContent = 'Este proyecto no tiene evaluaciones registradas.';
    } else {
        evaluaciones.forEach((ev, index) => {
            const card = createEvaluacionCard(ev, index);
            lista.appendChild(card);
            // Coloca la burbuja cuando la tarjeta ya está en el DOM
            requestAnimationFrame(() => posicionarIndicador(card));
        });
    }

    hideLoader();
}

function initDetalle() {
    // Solo en la vista de detalle de evaluación (/menu/evaluaciones/:id):
    // evita interferir con otras vistas que usan ids similares (p. ej. editar proyecto).
    if (!/^\/menu\/evaluaciones\/\d+$/.test(location.pathname)) return;
    proyectoId = getProyectoId();
    cargarDetalle();
    initDescarga();
}

// Mantener la burbuja alineada si cambia el ancho o terminan de cargar las fuentes
window.addEventListener('resize', () => {
    document
        .querySelectorAll('.evaluacion-detalle__card')
        .forEach(posicionarIndicador);
});

document.fonts?.ready?.then(() => {
    document
        .querySelectorAll('.evaluacion-detalle__card')
        .forEach(posicionarIndicador);
});

// Carga inicial y cada vez que el router reemplaza el contenido
document.addEventListener('DOMContentLoaded', initDetalle);
document.addEventListener('contentUpdated', initDetalle);

// ═══════════════════════════════════════════════════════════════
// DESCARGA (PDF)
// ═══════════════════════════════════════════════════════════════

/** Abre/cierra el diálogo de opciones de descarga con animación. */
function toggleDialogoDescarga() {
    const dialogo = document.getElementById('dialogo-descargar-evaluacion');
    if (!dialogo) return;
    if (dialogo.hasAttribute('open')) {
        cerrarDialogoAnimado(dialogo);
    } else {
        dialogo.showModal();
    }
}

function cerrarDialogoAnimado(dialogo) {
    dialogo.classList.add('closing');
    // Timeout de seguridad: si animationend no se dispara
    // (pestañas ocultas/bloqueadas), forzamos el cierre.
    const fallback = setTimeout(() => {
        if (dialogo.open) {
            dialogo.classList.remove('closing');
            dialogo.close();
        }
    }, 1500);

    dialogo.addEventListener('animationend', () => {
        clearTimeout(fallback);
        dialogo.classList.remove('closing');
        dialogo.close();
    }, { once: true });
}

/** Nombre de archivo seguro a partir del nombre del proyecto. */
function nombreArchivo() {
    const base = (proyectoCache?.nombre || 'evaluaciones')
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .trim()
        .replace(/\s+/g, '-');
    const fecha = new Date().toISOString().slice(0, 10);
    return `${base || 'evaluaciones'}-${fecha}`;
}

/**
 * Descarga el PDF del reporte del proyecto. El PDF lo genera el servidor
 * con el diseño de la plantilla oficial de reporte de proyecto.
 */
async function exportarPDF() {
    if (!evaluacionesCache.length) {
        mostrarNotificacion('No hay evaluaciones para descargar', 'info');
        return;
    }

    mostrarNotificacion('Generando PDF…', 'info');

    const res = await fetch(`/admin/evaluaciones/proyectos/${proyectoId}/reporte.pdf`);
    if (!res.ok) {
        let mensaje = 'No se pudo generar el PDF';
        try {
            mensaje = (await res.json())?.mensaje || mensaje;
        } catch {
            /* respuesta sin JSON */
        }
        throw new Error(mensaje);
    }

    const url = URL.createObjectURL(await res.blob());
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${nombreArchivo()}.pdf`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    mostrarNotificacion('PDF descargado', 'bien');
}


/** Registra los listeners del botón y del diálogo de descarga (una sola vez). */
function initDescarga() {
    const btn = document.getElementById('btn-descargar-evaluacion');
    const dialogo = document.getElementById('dialogo-descargar-evaluacion');
    if (!btn || !dialogo || btn.dataset.descargaInit) return;
    btn.dataset.descargaInit = 'true';

    btn.addEventListener('click', toggleDialogoDescarga);
    dialogo.querySelector('#btn-cerrar-descargar')?.addEventListener('click', () => cerrarDialogoAnimado(dialogo));

    const btnPdf = dialogo.querySelector('#btn-descargar-pdf');

    btnPdf?.addEventListener('click', async () => {
        btnPdf.disabled = true;
        try {
            await exportarPDF();
            cerrarDialogoAnimado(dialogo);
        } catch (err) {
            console.error('Error al generar el PDF:', err);
            mostrarNotificacion(err?.message || 'Error al generar el PDF', 'error');
        } finally {
            btnPdf.disabled = false;
        }
    });
}
