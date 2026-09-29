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

// Datos de la última carga, usados por la descarga (Excel / PDF)
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
 * Calcula la nota a mostrar para el proyecto:
 *  - La nota final (proyecto.nota) si ya está guardada.
 *  - El promedio de las evaluaciones registradas (nota parcial) si no.
 */
function calcularNotaProyecto(proyecto, evaluaciones) {
    const notaRaw = proyecto?.nota;
    // Number(null) === 0, así que hay que descartar null/undefined/'' antes
    const notaFinal = notaRaw != null && notaRaw !== '' ? Number(notaRaw) : null;

    if (Number.isFinite(notaFinal)) {
        return { valor: formatNota(notaFinal), etiqueta: 'Nota completa' };
    }

    if (Array.isArray(evaluaciones) && evaluaciones.length > 0) {
        const suma = evaluaciones.reduce((acc, ev) => acc + Number(ev.nota), 0);
        const prom = suma / evaluaciones.length;
        if (Number.isFinite(prom)) {
            return { valor: formatNota(prom), etiqueta: 'Nota parcial' };
        }
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

        // Guardar en caché para la descarga (Excel / PDF)
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
        const nombreEl = qsDetalle('#detalle-proyecto-nombre');
        if (nombreEl) nombreEl.textContent = 'No se pudo cargar';
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

    subEl.textContent =
        partes.length > 0 ? partes.join(' · ') : 'Proyecto sin información de grado.';
}

/**
 * Pinta el badge de nota del container1. Muestra:
 *  - La nota final (proyecto.nota) si ya está guardada.
 *  - El promedio de las evaluaciones registradas (nota parcial) si no.
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
async function cargarCriteriosEvaluacion(evaluacionId, contenedor) {
    if (!contenedor) return;

    try {
        const data = await fetchJson(`/evaluacion-criterios/${evaluacionId}`);
        const criterios = Array.isArray(data?.criterios) ? data.criterios : [];

        // Guardar en caché para la descarga (Excel / PDF)
        criteriosCache.set(Number(evaluacionId), criterios);

        if (criterios.length === 0) {
            contenedor.innerHTML =
                '<p class="evaluacion-detalle__criterios-vacio">Sin criterios registrados.</p>';
            return;
        }

        const filas = criterios
            .map((c) => {
                const ponderado = (Number(c.puntuacion) * Number(c.porcentaje)) / 100;
                return `
                <div class="evaluacion-detalle__criterio">
                    <span class="evaluacion-detalle__criterio-nombre">${escapeHtml(c.nombre || 'Criterio')}</span>
                    <span class="evaluacion-detalle__criterio-col">${formatNota(c.puntuacion)}</span>
                    <span class="evaluacion-detalle__criterio-col">${Number(c.porcentaje)}%</span>
                    <span class="evaluacion-detalle__criterio-col evaluacion-detalle__criterio-aporte" title="Aporte a la nota final">+${formatNota(ponderado)}</span>
                </div>`;
            })
            .join('');

        contenedor.innerHTML = `
            <div class="evaluacion-detalle__criterios-tabla">
                <div class="evaluacion-detalle__criterios-cabecera" aria-hidden="true">
                    <span>Criterio</span><span>Puntaje</span><span>Peso</span><span>Aporte</span>
                </div>
                ${filas}
            </div>
            <p class="evaluacion-detalle__criterios-leyenda">
                El <strong>aporte</strong> es el puntaje del criterio multiplicado por su peso sobre la nota final.
            </p>`;
    } catch (err) {
        console.error('Error al cargar criterios de la evaluación:', err);
        contenedor.innerHTML =
            '<p class="evaluacion-detalle__criterios-vacio">No se pudieron cargar los criterios.</p>';
        mostrarNotificacion(
            err?.message || 'Error al cargar los criterios de la evaluación',
            'error',
        );
    }
}

/** Activa la carga diferida de criterios solo la primera vez que se abre esa pestaña. */
function cargarCriteriosSiFalta(ev, card) {
    const contenedor = card.querySelector('.evaluacion-detalle__criterios');
    if (!contenedor || contenedor.dataset.cargado) return;
    contenedor.dataset.cargado = 'true';
    contenedor.innerHTML =
        '<div class="progreso-lineal indeterminado"><div class="progreso-indicador"></div></div>';
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

/**
 * Crea la tarjeta de una evaluación con pestañas (Detalles / Criterios).
 * El panel "Detalles" es la ficha legible; "Criterios" se carga perezosamente
 * la primera vez que se abre.
 */
function createEvaluacionCard(ev, index) {
    const card = document.createElement('div');
    card.className = 'evaluacion-detalle__card evaluacion-entrada is-colapsado';
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
                    <div class="evaluacion-detalle__dato">
                        <dt>Evaluador</dt>
                        <dd>${evaluador}</dd>
                    </div>
                    <div class="evaluacion-detalle__dato">
                        <dt>Correo</dt>
                        <dd>${email}</dd>
                    </div>
                    <div class="evaluacion-detalle__dato">
                        <dt>Fecha y hora</dt>
                        <dd>${escapeHtml(fecha)}</dd>
                    </div>
                    <div class="evaluacion-detalle__dato">
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
// DESCARGA (Excel / PDF)
// ═══════════════════════════════════════════════════════════════

const EXCELJS_URL = 'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
let excelPromise = null;
const LOGO_URL = '/assets/img/INSAL.jpg';
let logoPromise = null;

/** Carga ExcelJS desde CDN una sola vez, bajo demanda. */
function cargarExcelJS() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    if (!excelPromise) {
        excelPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = EXCELJS_URL;
            script.onload = () => resolve(window.ExcelJS);
            script.onerror = () => {
                excelPromise = null; // permitir reintento
                reject(new Error('No se pudo cargar la librería de Excel'));
            };
            document.head.appendChild(script);
        });
    }
    return excelPromise;
}

/** Devuelve el logo institucional como data-URI (para incrustarlo en el Excel). */
function obtenerLogoDataUri() {
    if (!logoPromise) {
        logoPromise = fetch(LOGO_URL)
            .then((res) => {
                if (!res.ok) throw new Error('logo no disponible');
                return res.blob();
            })
            .then(
                (blob) =>
                    new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    }),
            )
            .catch((err) => {
                console.warn('No se pudo cargar el logo institucional:', err);
                logoPromise = null; // permitir reintento
                return null;
            });
    }
    return logoPromise;
}

/**
 * Datos comunes del proyecto para los reportes (Excel / PDF):
 * nombre, grado, año y nota (parcial o completa).
 */
function datosProyecto() {
    const { valor: notaValor, etiqueta: notaEtiqueta } = calcularNotaProyecto(
        proyectoCache,
        evaluacionesCache,
    );
    const p = proyectoCache || {};
    return {
        nombre: p.nombre || 'Proyecto',
        grado: p.displayGrade || p.nivel_nombre || '—',
        bachillerato: p.bachillerato || '',
        anio: p.anio ? String(p.anio) : '—',
        notaValor,
        notaEtiqueta,
        totalEvaluaciones: evaluacionesCache.length,
    };
}

/** Fecha legible de generación del reporte. */
function fechaGeneracion() {
    return formatFecha(new Date().toISOString());
}

/** Carga un script externo dinámicamente (para las librerías de PDF). */
function cargarScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = () => reject(new Error('No se pudo cargar la librería de PDF'));
        document.head.appendChild(script);
    });
}

/** Carga jsPDF + html2canvas bajo demanda para generar el PDF descargable. */
async function cargarLibreriasPDF() {
    if (!window.jspdf?.jsPDF) {
        await cargarScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js');
    }
    if (!window.html2canvas) {
        await cargarScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js');
    }
}

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
 * Devuelve los criterios de una evaluación, usando la caché o
 * descargándolos (GET /evaluacion-criterios/:id) si faltan.
 */
async function obtenerCriterios(evaluacionId) {
    const id = Number(evaluacionId);
    if (criteriosCache.has(id)) return criteriosCache.get(id);
    try {
        const data = await fetchJson(`/evaluacion-criterios/${id}`);
        const criterios = Array.isArray(data?.criterios) ? data.criterios : [];
        criteriosCache.set(id, criterios);
        return criterios;
    } catch (err) {
        console.error('Error al cargar criterios para la descarga:', err);
        return [];
    }
}

/**
 * Exporta las evaluaciones (y su desglose) a un archivo .xlsx con ExcelJS.
 * Diseño profesional y ordenado:
 *  - Hoja "Resumen": cabecera institucional con logo, ficha de datos del
 *    proyecto en tarjeta (etiqueta/valor con bordes) y tabla de evaluaciones
 *    con fila de promedio final destacada.
 *  - Hoja "Criterios": por cada evaluación un bloque con su tabla de
 *    criterios y fila de total.
 */
async function exportarExcel() {
    if (!evaluacionesCache.length) {
        mostrarNotificacion('No hay evaluaciones para descargar', 'info');
        return;
    }

    mostrarNotificacion('Preparando archivo de Excel…', 'info');
    const ExcelJS = await cargarExcelJS();
    const datos = datosProyecto();
    const logo = await obtenerLogoDataUri();

    // Paleta institucional
    const AZUL = 'FF0f5aab';
    const AZUL_OSCURO = 'FF0b3a66';
    const AZUL_CLARO = 'FFe8f0fb';
    const GRIS = 'FF4a607e';
    const TEXTO = 'FF0D1E35';
    const BORDE = 'FFc5d5ea';
    const ZEBRA = 'FFf6fafe';
    const BLANCO = 'FFFFFFFF';
    const VERDE = 'FF1A7A45';
    const fuente = 'Segoe UI';

    const borde = {
        top: { style: 'thin', color: { argb: BORDE } },
        left: { style: 'thin', color: { argb: BORDE } },
        bottom: { style: 'thin', color: { argb: BORDE } },
        right: { style: 'thin', color: { argb: BORDE } },
    };
    const sinBorde = { top: { style: 'thin', color: { argb: 'FFFFFFFF' } }, left: { style: 'thin', color: { argb: 'FFFFFFFF' } }, bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } }, right: { style: 'thin', color: { argb: 'FFFFFFFF' } } };

    // Aplica borde a una región rectangular (para "tarjetas").
    const bordeRegion = (hoja, filaIni, filaFin, colIni, colFin, estilo) => {
        for (let f = filaIni; f <= filaFin; f++) {
            for (let c = colIni; c <= colFin; c++) {
                hoja.getCell(f, c).border = estilo;
            }
        }
    };
    const fondoRegion = (hoja, filaIni, filaFin, colIni, colFin, color) => {
        for (let f = filaIni; f <= filaFin; f++) {
            for (let c = colIni; c <= colFin; c++) {
                hoja.getCell(f, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
            }
        }
    };

    const libro = new ExcelJS.Workbook();
    libro.creator = 'Sistema de Evaluaciones INSAL';
    libro.created = new Date();

    // ═══════════════════════════════════════════════════════════════
    // HOJA 1 — RESumen
    // ═══════════════════════════════════════════════════════════════
    const hoja = libro.addWorksheet('Resumen');
    hoja.columns = [
        { width: 16 },
        { width: 34 },
        { width: 34 },
        { width: 26 },
        { width: 14 },
    ];
    hoja.views = [{ state: 'frozen', ySplit: 4 }];

    // Banda de título institucional
    hoja.mergeCells('A1:E1');
    const titulo = hoja.getCell('A1');
    titulo.value = 'INSTITUTO NACIONAL SAN LUIS';
    titulo.font = { name: fuente, size: 16, bold: true, color: { argb: BLANCO } };
    titulo.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_OSCURO } };
    hoja.getRow(1).height = 30;
    bordeRegion(hoja, 1, 1, 1, 5, sinBorde);

    hoja.mergeCells('A2:E2');
    const subtitulo = hoja.getCell('A2');
    subtitulo.value = `Reporte de evaluación de proyecto`;
    subtitulo.font = { name: fuente, size: 12, bold: true, color: { argb: AZUL } };
    subtitulo.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    hoja.getRow(2).height = 22;

    hoja.mergeCells('A3:E3');
    const genCell = hoja.getCell('A3');
    genCell.value = `Generado el ${fechaGeneracion()}`;
    genCell.font = { name: fuente, size: 9, italic: true, color: { argb: GRIS } };
    genCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    hoja.getRow(3).height = 16;

    // ── Ficha de datos del proyecto ──
    const datosIni = 5;
    hoja.getCell(`A${datosIni}`).value = 'DATOS DEL PROYECTO';
    hoja.getCell(`A${datosIni}`).font = { name: fuente, size: 10, bold: true, color: { argb: BLANCO } };
    hoja.getCell(`A${datosIni}`).alignment = { vertical: 'middle' };
    fondoRegion(hoja, datosIni, datosIni, 1, 5, AZUL);
    bordeRegion(hoja, datosIni, datosIni, 1, 5, sinBorde);
    hoja.getRow(datosIni).height = 20;

    const filasDatos = [
        ['Proyecto', datos.nombre],
        ['Grado', datos.bachillerato ? `${datos.grado} · ${datos.bachillerato}` : datos.grado],
        ['Año', datos.anio],
        ['Nota', datos.notaValor ? `${datos.notaValor} / 10` : 'Sin nota registrada'],
        ['Evaluaciones', String(datos.totalEvaluaciones)],
    ];
    filasDatos.forEach(([etiqueta, valor], i) => {
        const fila = datosIni + 1 + i;
        hoja.getCell(`A${fila}`).value = etiqueta;
        hoja.getCell(`A${fila}`).font = { name: fuente, size: 10, bold: true, color: { argb: GRIS } };
        hoja.getCell(`A${fila}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        hoja.getCell(`A${fila}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_CLARO } };
        hoja.mergeCells(`B${fila}:E${fila}`);
        hoja.getCell(`B${fila}`).value = valor;
        hoja.getCell(`B${fila}`).font = { name: fuente, size: 10, color: { argb: TEXTO } };
        hoja.getCell(`B${fila}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 0 };
        hoja.getRow(fila).height = 18;
        bordeRegion(hoja, fila, fila, 1, 5, borde);
        // Suavizar el borde inferior de la última fila de la tarjeta
        if (i === filasDatos.length - 1) bordeRegion(hoja, fila, fila, 1, 5, sinBorde);
        if (i === 0) bordeRegion(hoja, fila, fila, 1, 5, borde);
    });
    // Re-dibujar borde del contorno de la tarjeta (filas 6..10)
    bordeRegion(hoja, datosIni, datosIni + filasDatos.length, 1, 5, borde);

    // ── Tabla de evaluaciones ──
    const cabeceraFila = datosIni + filasDatos.length + 2; // 12
    hoja.getCell(`A${cabeceraFila}`).value = 'EVALUACIONES REGISTRADAS';
    hoja.getCell(`A${cabeceraFila}`).font = { name: fuente, size: 10, bold: true, color: { argb: BLANCO } };
    hoja.getCell(`A${cabeceraFila}`).alignment = { vertical: 'middle' };
    fondoRegion(hoja, cabeceraFila, cabeceraFila, 1, 5, AZUL);
    bordeRegion(hoja, cabeceraFila, cabeceraFila, 1, 5, sinBorde);
    hoja.getRow(cabeceraFila).height = 20;

    const headerRow = hoja.getRow(cabeceraFila + 1);
    headerRow.values = ['N°', 'Evaluador', 'Correo', 'Fecha', 'Nota'];
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
        cell.font = { name: fuente, size: 10, bold: true, color: { argb: BLANCO } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = borde;
    });

    evaluacionesCache.forEach((ev, i) => {
        const fila = hoja.getRow(cabeceraFila + 2 + i);
        fila.values = [
            i + 1,
            ev.evaluador_nombre || '—',
            ev.evaluador_email || '—',
            formatFecha(ev.fecha_evaluacion),
            Number(ev.nota),
        ];
        fila.eachCell((cell, colNum) => {
            cell.font = { name: fuente, size: 10, color: { argb: TEXTO } };
            cell.border = borde;
            if (i % 2 === 1) {
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
            }
            if (colNum === 1 || colNum === 5) cell.alignment = { horizontal: 'center' };
            if (colNum === 5) { cell.numFmt = '0.00'; cell.font = { name: fuente, size: 10, bold: true, color: { argb: AZUL } }; }
        });
        hoja.getRow(fila.number).height = 18;
    });

    // Fila de promedio
    const promFila = cabeceraFila + 2 + evaluacionesCache.length + 1;
    const prom = evaluacionesCache.reduce((acc, ev) => acc + Number(ev.nota), 0) / evaluacionesCache.length;
    hoja.getCell(`A${promFila}`).value = '';
    hoja.mergeCells(`A${promFila}:D${promFila}`);
    hoja.getCell(`A${promFila}`).value = 'Nota promedio';
    hoja.getCell(`A${promFila}`).font = { name: fuente, size: 10, bold: true, color: { argb: GRIS } };
    hoja.getCell(`A${promFila}`).alignment = { vertical: 'middle', horizontal: 'right' };
    hoja.getCell(`E${promFila}`).value = Number(prom.toFixed(2));
    hoja.getCell(`E${promFila}`).numFmt = '0.00';
    hoja.getCell(`E${promFila}`).font = { name: fuente, size: 11, bold: true, color: { argb: VERDE } };
    hoja.getCell(`E${promFila}`).alignment = { vertical: 'middle', horizontal: 'center' };
    fondoRegion(hoja, promFila, promFila, 1, 5, AZUL_CLARO);
    bordeRegion(hoja, promFila, promFila, 1, 5, borde);
    hoja.getRow(promFila).height = 22;

    // ═══════════════════════════════════════════════════════════════
    // HOJA 2 — Criterios (por evaluación)
    // ═══════════════════════════════════════════════════════════════
    const hojaC = libro.addWorksheet('Criterios');
    hojaC.columns = [
        { width: 24 },
        { width: 44 },
        { width: 12 },
        { width: 12 },
        { width: 14 },
    ];

    hojaC.mergeCells('A1:E1');
    const t1 = hojaC.getCell('A1');
    t1.value = 'Desglose de criterios';
    t1.font = { name: fuente, size: 14, bold: true, color: { argb: AZUL_OSCURO } };
    hojaC.mergeCells('A2:E2');
    const t2 = hojaC.getCell('A2');
    t2.value = `${datos.nombre} · ${datos.bachillerato ? `${datos.grado} · ${datos.bachillerato}` : datos.grado} · Año ${datos.anio}`;
    t2.font = { name: fuente, size: 10, color: { argb: GRIS } };
    hojaC.getRow(1).height = 24;
    hojaC.getRow(2).height = 16;

    let filaC = 4;
    for (let idx = 0; idx < evaluacionesCache.length; idx++) {
        const ev = evaluacionesCache[idx];
        const criterios = await obtenerCriterios(ev.evaluacion_id);

        // Título del bloque de evaluación
        hojaC.mergeCells(`A${filaC}:E${filaC}`);
        hojaC.getCell(`A${filaC}`).value = `Evaluación ${idx + 1} — ${ev.evaluador_nombre || 'Evaluador'}`;
        hojaC.getCell(`A${filaC}`).font = { name: fuente, size: 11, bold: true, color: { argb: BLANCO } };
        hojaC.getCell(`A${filaC}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        fondoRegion(hojaC, filaC, filaC, 1, 5, AZUL);
        bordeRegion(hojaC, filaC, filaC, 1, 5, sinBorde);
        hojaC.getRow(filaC).height = 22;
        filaC++;

        // Sub-línea con fecha + nota
        hojaC.mergeCells(`A${filaC}:E${filaC}`);
        hojaC.getCell(`A${filaC}`).value = `${formatFecha(ev.fecha_evaluacion)} · Nota: ${formatNota(ev.nota)} / 10`;
        hojaC.getCell(`A${filaC}`).font = { name: fuente, size: 9, italic: true, color: { argb: GRIS } };
        hojaC.getCell(`A${filaC}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        hojaC.getRow(filaC).height = 16;
        filaC++;

        if (criterios.length === 0) {
            hojaC.mergeCells(`A${filaC}:E${filaC}`);
            hojaC.getCell(`A${filaC}`).value = 'Sin criterios registrados.';
            hojaC.getCell(`A${filaC}`).font = { name: fuente, size: 10, italic: true, color: { argb: GRIS } };
            filaC++;
        } else {
            // Cabecera de criterios
            const hc = hojaC.getRow(filaC);
            hc.values = ['Criterio', 'Descripción', 'Puntaje', 'Peso (%)', 'Aporte'];
            hc.height = 20;
            hc.eachCell((cell) => {
                cell.font = { name: fuente, size: 9, bold: true, color: { argb: BLANCO } };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
                cell.alignment = { vertical: 'middle', horizontal: 'center' };
                cell.border = borde;
            });
            filaC++;

            criterios.forEach((c, i) => {
                const fila = hojaC.getRow(filaC);
                const aporte = (Number(c.puntuacion) * Number(c.porcentaje)) / 100;
                fila.values = [
                    c.nombre || 'Criterio',
                    c.descripcion || '',
                    Number(c.puntuacion),
                    Number(c.porcentaje),
                    aporte,
                ];
                fila.eachCell((cell, colNum) => {
                    cell.font = { name: fuente, size: 9, color: { argb: TEXTO } };
                    cell.border = borde;
                    if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
                    if (colNum >= 3) cell.alignment = { horizontal: 'center' };
                    if (colNum === 3) cell.numFmt = '0.00';
                    if (colNum === 4) cell.numFmt = '0';
                    if (colNum === 5) { cell.numFmt = '0.00'; cell.font = { name: fuente, size: 9, bold: true, color: { argb: AZUL } }; }
                });
                hojaC.getRow(filaC).height = 18;
                filaC++;
            });

            // Total de la evaluación
            const total = criterios.reduce((acc, c) => acc + (Number(c.puntuacion) * Number(c.porcentaje)) / 100, 0);
            hojaC.mergeCells(`A${filaC}:D${filaC}`);
            hojaC.getCell(`A${filaC}`).value = 'PUNTUACIÓN TOTAL';
            hojaC.getCell(`A${filaC}`).font = { name: fuente, size: 9, bold: true, color: { argb: GRIS } };
            hojaC.getCell(`A${filaC}`).alignment = { vertical: 'middle', horizontal: 'right' };
            hojaC.getCell(`E${filaC}`).value = Number(total.toFixed(2));
            hojaC.getCell(`E${filaC}`).numFmt = '0.00';
            hojaC.getCell(`E${filaC}`).font = { name: fuente, size: 10, bold: true, color: { argb: VERDE } };
            hojaC.getCell(`E${filaC}`).alignment = { vertical: 'middle', horizontal: 'center' };
            fondoRegion(hojaC, filaC, filaC, 1, 5, AZUL_CLARO);
            bordeRegion(hojaC, filaC, filaC, 1, 5, borde);
            hojaC.getRow(filaC).height = 22;
            filaC++;
        }

        // Separador entre bloques de evaluación
        filaC++;
    }

    // Descarga del archivo generado
    const buffer = await libro.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreArchivo()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    mostrarNotificacion('Archivo de Excel descargado', 'bien');
}

/**
 * Genera y DESCARGA un archivo .pdf con el reporte del proyecto:
 * construye el reporte en un contenedor oculto, lo renderiza con
 * html2canvas y lo pagina en un A4 con jsPDF (una tarjeta por bloque,
 * sin cortar el contenido a la mitad).
 */
async function exportarPDF() {
    if (!evaluacionesCache.length) {
        mostrarNotificacion('No hay evaluaciones para descargar', 'info');
        return;
    }

    mostrarNotificacion('Generando PDF…', 'info');
    await cargarLibreriasPDF();

    const datos = datosProyecto();

    // Desglose de criterios de todas las evaluaciones (en paralelo)
    const criteriosPorEval = await Promise.all(
        evaluacionesCache.map((ev) => obtenerCriterios(ev.evaluacion_id)),
    );

    const tarjetas = evaluacionesCache
        .map((ev, i) => {
            const criterios = criteriosPorEval[i] || [];
            const filasCriterios = criterios
                .map(
                    (c) => `
                    <tr>
                        <td>${escapeHtml(c.nombre || 'Criterio')}</td>
                        <td class="num">${formatNota(c.puntuacion)}</td>
                        <td class="num">${Number(c.porcentaje)}%</td>
                        <td class="num">+${formatNota((Number(c.puntuacion) * Number(c.porcentaje)) / 100)}</td>
                    </tr>`,
                )
                .join('');

            const tablaCriterios = criterios.length
                ? `
                <table>
                    <thead>
                        <tr><th>Criterio</th><th class="num">Puntaje</th><th class="num">Peso</th><th class="num">Aporte</th></tr>
                    </thead>
                    <tbody>${filasCriterios}</tbody>
                </table>`
                : '<p class="sin-datos">Sin criterios registrados.</p>';

            return `
            <section class="eval-card">
                <h2>
                    <span class="eval-num">${i + 1}</span>
                    ${escapeHtml(ev.evaluador_nombre || 'Evaluador')}
                    <span class="eval-nota">${formatNota(ev.nota)} / 10</span>
                </h2>
                <dl>
                    <div><dt>Correo</dt><dd>${escapeHtml(ev.evaluador_email || '—')}</dd></div>
                    <div><dt>Fecha y hora</dt><dd>${escapeHtml(formatFecha(ev.fecha_evaluacion))}</dd></div>
                </dl>
                ${tablaCriterios}
            </section>`;
        })
        .join('');

    // Contenedor oculto con el reporte (ancho A4 a 96dpi ≈ 794px).
    // Estilos scoped bajo .reporte-pdf para no afectar al dashboard.
    const contenedor = document.createElement('div');
    contenedor.style.cssText =
        'position:fixed;left:-10000px;top:0;width:794px;background:#ffffff;';
    contenedor.innerHTML = `
    <style>
        .reporte-pdf { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; color: #0d1e35; padding: 40px 48px; background: #ffffff; }
        .reporte-pdf * { box-sizing: border-box; margin: 0; padding: 0; }
        .reporte-pdf header { border-bottom: 3px solid #0f5aab; padding-bottom: 16px; margin-bottom: 22px; }
        .reporte-pdf .marca { display: flex; align-items: center; gap: 14px; }
        .reporte-pdf .logo { width: 64px; height: 64px; object-fit: cover; border-radius: 12px; border: 1px solid #c5d5ea; flex: 0 0 auto; }
        .reporte-pdf .marca-texto h1 { font-size: 20px; color: #0f5aab; }
        .reporte-pdf .marca-texto p { font-size: 11px; color: #4a607e; margin-top: 3px; }
        .reporte-pdf .datos { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
        .reporte-pdf .dato { display: flex; align-items: center; justify-content: space-between; gap: 16px; border: 1px solid #c5d5ea; border-radius: 10px; padding: 10px 16px; background: #f6fafe; min-width: 0; }
        .reporte-pdf .dato-etiqueta { font-size: 11px; font-weight: 600; color: #4a607e; flex: 0 0 auto; }
        .reporte-pdf .dato-valor { font-size: 13px; font-weight: 700; color: #0d1e35; text-align: right; overflow-wrap: anywhere; }
        .reporte-pdf .dato--nota { background: #e8f0fb; border-color: #0f5aab; }
        .reporte-pdf .dato--nota .dato-valor { color: #0f5aab; }
        .reporte-pdf .eval-card { border: 1px solid #c5d5ea; border-radius: 10px; padding: 16px 18px; background: #ffffff; }
        .reporte-pdf .eval-card + .eval-card { margin-top: 16px; }
        .reporte-pdf .eval-card h2 { font-size: 15px; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .reporte-pdf .eval-num { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #0f5aab; color: #fff; font-size: 13px; flex: 0 0 auto; }
        .reporte-pdf .eval-nota { margin-left: auto; font-size: 14px; color: #0f5aab; }
        .reporte-pdf dl div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eef3fa; font-size: 12px; }
        .reporte-pdf dt { color: #4a607e; }
        .reporte-pdf table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
        .reporte-pdf th, .reporte-pdf td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eef3fa; }
        .reporte-pdf th { background: #e8f0fb; color: #0f5aab; }
        .reporte-pdf .num { text-align: right; }
        .reporte-pdf .sin-datos { font-size: 12px; color: #4a607e; margin-top: 10px; }
    </style>
    <div class="reporte-pdf">
        <header>
            <div class="marca">
                <img class="logo" src="${LOGO_URL}" alt="Logo INSAL">
                <div class="marca-texto">
                    <h1>Instituto Nacional San Luis</h1>
                    <p>Reporte de evaluaciones de proyecto · Generado el ${escapeHtml(fechaGeneracion())}</p>
                </div>
            </div>
            <div class="datos">
                <div class="dato">
                    <span class="dato-etiqueta">Proyecto</span>
                    <span class="dato-valor" title="${escapeHtml(datos.nombre)}">${escapeHtml(datos.nombre)}</span>
                </div>
                <div class="dato">
                    <span class="dato-etiqueta">Grado</span>
                    <span class="dato-valor">${escapeHtml(datos.bachillerato ? `${datos.grado} · ${datos.bachillerato}` : datos.grado)}</span>
                </div>
                <div class="dato">
                    <span class="dato-etiqueta">Año</span>
                    <span class="dato-valor">${escapeHtml(datos.anio)}</span>
                </div>
                <div class="dato dato--nota">
                    <span class="dato-etiqueta">${escapeHtml(datos.notaEtiqueta || 'Nota')}</span>
                    <span class="dato-valor">${escapeHtml(datos.notaValor ?? '—')} / 10</span>
                </div>
            </div>
        </header>
        ${tarjetas}
    </div>`;
    document.body.appendChild(contenedor);

    try {
        // Esperar layout + carga del logo antes de renderizar
        await new Promise((r) => requestAnimationFrame(r));
        await Promise.all(
            Array.from(contenedor.querySelectorAll('img')).map((img) =>
                img.complete
                    ? Promise.resolve()
                    : new Promise((res) => {
                        img.onload = res;
                        img.onerror = res;
                    }),
            ),
        );

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margen = 28;
        const imgW = pageW - margen * 2;
        let yCursor = margen;

        /** Renderiza un bloque y lo coloca en la página actual (o en una nueva si no cabe completo). */
        const agregarBloque = async (el) => {
            const canvas = await window.html2canvas(el, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
            });
            const altoPt = canvas.height * (imgW / canvas.width);
            // Si el bloque no cabe en el espacio restante, pasa a página nueva
            // (así ninguna tarjeta queda cortada a la mitad)
            if (yCursor > margen && yCursor + altoPt > pageH - margen) {
                pdf.addPage();
                yCursor = margen;
            }
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margen, yCursor, imgW, altoPt);
            yCursor += altoPt + 14;
        };

        await agregarBloque(contenedor.querySelector('.reporte-pdf header'));
        for (const card of contenedor.querySelectorAll('.eval-card')) {
            await agregarBloque(card);
        }

        // Pie de página en todas las páginas: institución + numeración
        const totalPaginas = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPaginas; i++) {
            pdf.setPage(i);
            pdf.setDrawColor(197, 213, 234);
            pdf.line(margen, pageH - 24, pageW - margen, pageH - 24);
            pdf.setFontSize(8);
            pdf.setTextColor(74, 96, 126);
            pdf.text('Instituto Nacional San Luis — Sistema de Evaluaciones', margen, pageH - 12);
            pdf.text(`Página ${i} de ${totalPaginas}`, pageW - margen, pageH - 12, { align: 'right' });
        }

        pdf.save(`${nombreArchivo()}.pdf`);
        mostrarNotificacion('PDF descargado', 'bien');
    } finally {
        contenedor.remove();
    }
}

/** Registra los listeners del botón y del diálogo de descarga (una sola vez). */
function initDescarga() {
    const btn = document.getElementById('btn-descargar-evaluacion');
    const dialogo = document.getElementById('dialogo-descargar-evaluacion');
    if (!btn || !dialogo || btn.dataset.descargaInit) return;
    btn.dataset.descargaInit = 'true';

    btn.addEventListener('click', toggleDialogoDescarga);
    dialogo.querySelector('#btn-cerrar-descargar')?.addEventListener('click', () => cerrarDialogoAnimado(dialogo));

    const btnExcel = dialogo.querySelector('#btn-descargar-excel');
    const btnPdf = dialogo.querySelector('#btn-descargar-pdf');

    btnExcel?.addEventListener('click', async () => {
        btnExcel.disabled = true;
        try {
            await exportarExcel();
            cerrarDialogoAnimado(dialogo);
        } catch (err) {
            console.error('Error al exportar a Excel:', err);
            mostrarNotificacion(err?.message || 'Error al generar el archivo de Excel', 'error');
        } finally {
            btnExcel.disabled = false;
        }
    });

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