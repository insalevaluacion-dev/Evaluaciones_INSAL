// ═══════════════════════════════════════════════════════════════
// MÓDULO: Inicio (dashboard) — resumen desde /admin/inicio/resumen
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getLista() {
    return document.getElementById('lista-ultimas-evaluaciones');
}

function getSeccion() {
    return document.querySelector('.inicio-recientes');
}

/** Devuelve el botón refresh de la sección de últimas evaluaciones. */
function getRefreshBtn() {
    return document.querySelector('.inicio-recientes .btn-refresh');
}

/** Formatea una fecha ISO a "dd de mes, hh:mm" en español. */
function formatearFecha(iso) {
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return '';
    return fecha.toLocaleString('es', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/** Color según la nota (0-10): rojo < 6, naranja < 8, verde el resto. */
function claseNota(nota) {
    const n = Number(nota);
    if (Number.isNaN(n)) return '';
    if (n < 6) return 'nota--baja';
    if (n < 8) return 'nota--media';
    return 'nota--alta';
}

/** Anima un contador numérico desde 0 hasta el valor final. */
function animarContador(el, valorFinal, decimales = 0) {
    const duracion = 700;
    const inicio = performance.now();
    const paso = (ahora) => {
        const progreso = Math.min((ahora - inicio) / duracion, 1);
        // easeOutCubic para desacelerar al final
        const eased = 1 - Math.pow(1 - progreso, 3);
        el.textContent = (valorFinal * eased).toFixed(decimales);
        if (progreso < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
}

// ═══════════════════════════════════════════════════════════════
// RENDERIZADO
// ═══════════════════════════════════════════════════════════════

/** Pinta las 4 tarjetas de estadísticas con animación de conteo. */
function renderStats(stats) {
    const mapa = {
        'total-proyectos': { valor: Number(stats?.total_proyectos) || 0, dec: 0 },
        'proyectos-evaluados': { valor: Number(stats?.proyectos_evaluados) || 0, dec: 0 },
        'proyectos-completos': { valor: Number(stats?.proyectos_completos) || 0, dec: 0 },
        'total-evaluaciones': { valor: Number(stats?.total_evaluaciones) || 0, dec: 0 },
    };

    for (const [clave, { valor, dec }] of Object.entries(mapa)) {
        const el = document.querySelector(`[data-stat="${clave}"]`);
        if (!el) continue;
        animarContador(el, valor, dec);
    }
}

/** Construye un <li> de evaluación reciente. */
function crearItemEvaluacion(ev) {
    const li = document.createElement('li');
    li.className = 'list-item inicio-item';
    li.dataset.itemId = ev.evaluacion_id;

    const nota = Number(ev.nota_evaluacion);
    const notaTexto = Number.isNaN(nota) ? '—' : nota.toFixed(1);

    li.innerHTML = `
        <div class="list-item__content">
            <span class="material-symbols-rounded">quiz</span>
            <div class="list-item__text-block">
                <p class="list-item__author">${ev.proyecto_nombre}</p>
                <p class="inicio-item__meta">${ev.grado || 'Sin grado'} · ${ev.evaluador_nombre || 'Evaluador'} · ${formatearFecha(ev.fecha)}</p>
            </div>
        </div>
        <span class="inicio-item__nota ${claseNota(nota)}">${notaTexto}</span>
    `;
    return li;
}

/** Muestra/oculta el estado vacío y el loader de la sección. */
function actualizarEstados(hayItems) {
    const seccion = getSeccion();
    if (!seccion) return;
    const loader = seccion.querySelector('.inicio-recientes__loader');
    const vacio = seccion.querySelector('.inicio-recientes__vacio');
    if (loader) loader.style.display = 'none';
    if (vacio) vacio.style.display = hayItems ? 'none' : 'flex';
}

// ═══════════════════════════════════════════════════════════════
// CARGA DEL RESUMEN
// ═══════════════════════════════════════════════════════════════

/**
 * Carga el resumen del dashboard (stats + últimas evaluaciones).
 * @param {HTMLElement} [btn] - Botón de refresh (opcional).
 */
async function loadInicioResumen(btn) {
    const lista = getLista();
    if (!lista) return;

    const refreshBtn = btn || getRefreshBtn();
    if (refreshBtn) refreshBtn.classList.add('is-loading');

    try {
        const response = await fetch('/admin/inicio/resumen', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });

        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok || !data) {
            console.error('[inicio] Respuesta del endpoint:', response.status, data);
            mostrarNotificacion(
                data?.mensaje || 'Error al cargar el resumen',
                'error',
            );
            return;
        }

        renderStats(data.stats);

        lista.innerHTML = '';
        const ultimas = Array.isArray(data.ultimas) ? data.ultimas : [];
        ultimas.forEach((ev) => lista.appendChild(crearItemEvaluacion(ev)));
        actualizarEstados(ultimas.length > 0);
    } catch (error) {
        console.error('[inicio] Error al cargar el resumen:', error);
        mostrarNotificacion('Error de conexión al cargar el resumen', 'error');
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('is-loading');
    }
}

// ═══════════════════════════════════════════════════════════════
// EXPONER FUNCIONES GLOBALMENTE (para onclick en HTML)
// ═══════════════════════════════════════════════════════════════

window.loadInicioResumen = loadInicioResumen;

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

// Carga inicial y cada vez que el router reemplaza el contenido
document.addEventListener('DOMContentLoaded', () => {
    loadInicioResumen();
});
document.addEventListener('contentUpdated', () => {
    loadInicioResumen();
});
