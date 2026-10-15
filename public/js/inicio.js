// ═══════════════════════════════════════════════════════════════
// MÓDULO: Inicio (dashboard) — resumen desde /admin/inicio/resumen
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';

const sectionHeights = new WeakMap();
const sectionAnimations = new WeakMap();
let sectionResizeObserver = null;
let observedSection = null;

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

/** Anima cambios de altura del panel cuando su contenido se actualiza. */
function observarResizeSeccion() {
    const seccion = getSeccion();
    if (typeof ResizeObserver === 'undefined') return;

    if (!sectionResizeObserver) {
        sectionResizeObserver = new ResizeObserver((entries) => {
            entries.forEach(({ target }) => {
                const height = target.getBoundingClientRect().height;
                const previousHeight = sectionHeights.get(target);
                const currentAnimation = sectionAnimations.get(target);

                if (previousHeight === undefined || currentAnimation) {
                    if (!currentAnimation) sectionHeights.set(target, height);
                    return;
                }
                if (Math.abs(height - previousHeight) < 1) return;

                sectionHeights.set(target, height);
                if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

                const originalHeight = target.style.height;
                const originalOverflow = target.style.overflow;
                target.style.height = `${previousHeight}px`;
                target.style.overflow = 'hidden';
                void target.offsetHeight;

                const animation = target.animate(
                    [{ height: `${previousHeight}px` }, { height: `${height}px` }],
                    { duration: 350, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
                );
                const state = {
                    animation,
                    cleanup: () => {
                        if (sectionAnimations.get(target) !== state) return;
                        sectionAnimations.delete(target);
                        target.style.height = originalHeight;
                        target.style.overflow = originalOverflow;
                        sectionHeights.set(target, target.getBoundingClientRect().height);
                    },
                };

                animation.onfinish = state.cleanup;
                animation.oncancel = state.cleanup;
                sectionAnimations.set(target, state);
            });
        });
    }

    if (!seccion) {
        if (observedSection) {
            sectionResizeObserver.unobserve(observedSection);
            const animation = sectionAnimations.get(observedSection);
            if (animation) animation.animation.cancel();
            sectionHeights.delete(observedSection);
            observedSection = null;
        }
        return;
    }

    if (observedSection !== seccion) {
        if (observedSection) {
            sectionResizeObserver.unobserve(observedSection);
            const animation = sectionAnimations.get(observedSection);
            if (animation) animation.animation.cancel();
        }
        observedSection = seccion;
        sectionHeights.set(seccion, seccion.getBoundingClientRect().height);
        sectionResizeObserver.observe(seccion);
    }
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
    if (vacio) {
        const mostrarVacio = !hayItems;
        const estabaVisible = vacio.style.display === 'flex';
        vacio.style.display = mostrarVacio ? 'flex' : 'none';
        if (mostrarVacio && !estabaVisible) {
            vacio.getAnimations().forEach((animation) => animation.cancel());
            vacio.animate(
                [
                    { opacity: 0, transform: 'translateY(12px)' },
                    { opacity: 1, transform: 'translateY(0)' },
                ],
                { duration: 300, easing: 'ease-out' },
            );
        }
    }
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

        const ultimas = Array.isArray(data.ultimas) ? data.ultimas : [];
        lista.innerHTML = '';
        ultimas.forEach((ev, index) => {
            const item = crearItemEvaluacion(ev);
            item.style.animationDelay = `${Math.min(index * 60, 240)}ms`;
            lista.appendChild(item);
        });
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

function iniciarGuiaInicio() {
    const crearDriver = window.driver?.js?.driver;
    if (typeof crearDriver !== 'function') {
        console.error('[inicio] Driver.js no está disponible.');
        mostrarNotificacion('No se pudo cargar la guía. Comprueba tu conexión e inténtalo de nuevo.', 'error');
        return;
    }

    const pasos = [
        {
            ruta: '/menu/inicio',
            element: '.inicio-bienvenida',
            popover: {
                title: 'Bienvenido a Inicio',
                description: 'Aquí encontrarás una bienvenida y el acceso al panel de evaluaciones.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            ruta: '/menu/inicio',
            element: '.inicio-stats',
            popover: {
                title: 'Resumen de actividad',
                description: 'Consulta de un vistazo el total de proyectos, los evaluados, los completos y las evaluaciones registradas.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            ruta: '/menu/inicio',
            element: '.inicio-acciones',
            popover: {
                title: 'Accesos rápidos',
                description: 'Usa estas tarjetas para ir directamente a proyectos, evaluaciones o rúbricas.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            ruta: '/menu/inicio',
            element: '.inicio-recientes',
            popover: {
                title: 'Últimas evaluaciones',
                description: 'Revisa la actividad reciente y actualiza la lista cuando lo necesites.',
                side: 'top',
                align: 'start',
            },
        },
        {
            ruta: '/menu/proyectos',
            element: '#proyectos__container .list-toolbar:not([style*="display: none"]), #proyectos__container .section-empty:not([style*="display: none"])',
            readySelector: '#proyectos__container .list-toolbar:not([style*="display: none"]), #proyectos__container .section-empty:not([style*="display: none"])',
            popover: {
                title: 'Proyectos',
                description: 'Busca proyectos y filtra la lista para encontrar rápidamente los que necesitas gestionar.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            ruta: '/menu/evaluaciones',
            element: '#proyectos-evaluados__container .list-toolbar:not([style*="display: none"]), #proyectos-evaluados__container .section-empty:not([style*="display: none"])',
            readySelector: '#proyectos-evaluados__container .list-toolbar:not([style*="display: none"]), #proyectos-evaluados__container .section-empty:not([style*="display: none"])',
            popover: {
                title: 'Evaluaciones',
                description: 'Consulta proyectos evaluados, filtra por estado y descarga reportes por grado.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            ruta: '/menu/rubrica',
            element: '#rubricas__container .list-toolbar:not([style*="display: none"]), #rubricas__container .section-empty:not([style*="display: none"])',
            readySelector: '#rubricas__container .list-toolbar:not([style*="display: none"]), #rubricas__container .section-empty:not([style*="display: none"])',
            popover: {
                title: 'Rúbricas',
                description: 'Busca y ordena las rúbricas que se usan para evaluar los proyectos.',
                side: 'bottom',
                align: 'start',
            },
        },
    ];

    let transicionEnCurso = false;
    let guiaCerrada = false;
    let esperaDestinoController;

    const esperarElementoVisible = (selector, signal) => new Promise((resolve, reject) => {
        const estaVisible = () => {
            const elemento = document.querySelector(selector);
            if (!elemento?.isConnected) return false;
            const estilos = window.getComputedStyle(elemento);
            return estilos.display !== 'none'
                && estilos.visibility !== 'hidden'
                && elemento.getClientRects().length > 0;
        };

        if (estaVisible()) {
            resolve(document.querySelector(selector));
            return;
        }

        const observer = new MutationObserver(() => {
            if (!estaVisible()) return;
            limpiar();
            resolve(document.querySelector(selector));
        });

        const timeout = window.setTimeout(() => {
            limpiar();
            reject(new Error(`Se agotó el tiempo esperando que aparezca ${selector}.`));
        }, 30000);

        const alAbortar = () => {
            limpiar();
            reject(new DOMException('Espera cancelada', 'AbortError'));
        };

        function limpiar() {
            window.clearTimeout(timeout);
            observer.disconnect();
            signal.removeEventListener('abort', alAbortar);
        }

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class', 'hidden', 'style'],
            childList: true,
            subtree: true,
        });
        signal.addEventListener('abort', alAbortar, { once: true });
    });

    const cambiarPaso = async (driver, indice, direccion) => {
        if (transicionEnCurso || guiaCerrada) return;

        const siguienteIndice = indice + direccion;
        const pasoActual = pasos[indice];
        const pasoSiguiente = pasos[siguienteIndice];
        if (!pasoActual) return;
        if (!pasoSiguiente) {
            if (direccion > 0) driver.destroy();
            return;
        }

        transicionEnCurso = true;
        esperaDestinoController = new AbortController();
        document.querySelectorAll('.driver-popover-navigation-btns button')
            .forEach((button) => { button.disabled = true; });

        try {
            if (pasoActual.ruta !== pasoSiguiente.ruta) {
                if (typeof window.navigateTo !== 'function') {
                    throw new Error('El enrutador de la aplicación no está disponible.');
                }

                const navegacionCompletada = await window.navigateTo(pasoSiguiente.ruta);
                if (!navegacionCompletada || window.location.pathname !== pasoSiguiente.ruta) {
                    throw new Error(`No se pudo cargar la vista ${pasoSiguiente.ruta} para continuar la guía.`);
                }
            }

            if (pasoSiguiente.readySelector) {
                await esperarElementoVisible(pasoSiguiente.readySelector, esperaDestinoController.signal);
            }

            const elementoDestino = document.querySelector(pasoSiguiente.element);
            if (!elementoDestino?.isConnected) {
                throw new Error(`No se encontró el destino del paso: ${pasoSiguiente.element}`);
            }

            if (guiaCerrada) return;
            if (direccion > 0) {
                driver.moveNext();
            } else {
                driver.movePrevious();
            }
        } catch (error) {
            console.error('[inicio] Error al cambiar de paso:', error);
            if (!guiaCerrada) {
                guiaCerrada = true;
                driver.destroy();
                mostrarNotificacion(
                    'No se pudo continuar la guía porque los datos de esta pantalla todavía no están disponibles.',
                    'error',
                );
            }
        } finally {
            esperaDestinoController = null;
            transicionEnCurso = false;
            requestAnimationFrame(() => {
                if (guiaCerrada) return;
                document.querySelectorAll('.driver-popover-navigation-btns button')
                    .forEach((button) => { button.disabled = false; });
            });
        }
    };

    const guia = crearDriver({
        popoverClass: 'insal-tour-popover',
        overlayColor: 'rgba(13, 30, 53, 0.58)',
        stagePadding: 8,
        stageRadius: 14,
        smoothScroll: true,
        allowScroll: true,
        allowKeyboardControl: false,
        disableActiveInteraction: true,
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: 'Finalizar',
        closeBtnLabel: 'Cerrar guía',
        onDestroyed: () => {
            guiaCerrada = true;
            esperaDestinoController?.abort();
        },
        onNextClick: (_element, _step, { driver, index }) => {
            cambiarPaso(driver, index ?? driver.getActiveIndex(), 1);
        },
        onPrevClick: (_element, _step, { driver, index }) => {
            cambiarPaso(driver, index ?? driver.getActiveIndex(), -1);
        },
        onDoneClick: (_element, _step, { driver }) => {
            driver.destroy();
        },
        steps: pasos.map(({ element, popover }) => ({
            element,
            popover,
            skipMissingElement: true,
        })),
    });

    guia.drive();
}

document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest('[data-inicio-guia]')) return;
    iniciarGuiaInicio();
});

// Carga inicial y cada vez que el router reemplaza el contenido
document.addEventListener('DOMContentLoaded', () => {
    observarResizeSeccion();
    loadInicioResumen();
});
document.addEventListener('contentUpdated', () => {
    observarResizeSeccion();
    loadInicioResumen();
});
