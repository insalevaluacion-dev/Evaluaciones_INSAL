// Guía del flujo evaluador. Cada vista (selección, evaluación, resumen)
// tiene su propio recorrido. No cambia de página ni envía notas.

const DRIVER_CSS = 'https://cdn.jsdelivr.net/npm/driver.js@1.4.0/dist/driver.css';
const DRIVER_JS = 'https://cdn.jsdelivr.net/npm/driver.js@1.4.0/dist/driver.js.iife.js';
const CLAVE_ANTIGUA = 'insal-guia-evaluador';

const GUIAS = {
    '/seleccion': [
        {
            element: '.evaluador-perfil',
            popover: {
                title: 'Tu sesión',
                description: 'Aquí ves tu nombre y correo. Salir cierra la sesión y vuelve al registro.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '#formulario-filtros',
            popover: {
                title: 'Filtros',
                description: 'El tipo de evaluación, el año, el grado y la sección se eligen en ese orden. Cada lista se habilita al completar la anterior.',
                side: 'top',
                align: 'start',
            },
        },
        {
            element: '#buscar-proyectos',
            popover: {
                title: 'Buscar proyectos',
                description: 'Con los cuatro filtros listos, este botón abre los proyectos de ese grupo.',
                side: 'top',
                align: 'center',
            },
        },
    ],
    '/evaluacion': [
        {
            element: '#modal-asistencia.active .modal-content',
            soloSiVisible: true,
            popover: {
                title: 'Asistencia',
                description: 'Marca a los alumnos presentes y usa Guardar asistencia para cerrar el cuadro. La guía no guarda nada. Con el cuadro cerrado, Guía explica el formulario.',
                side: 'bottom',
                align: 'center',
            },
        },
        {
            element: '.proyecto-header',
            popover: {
                title: 'Proyecto',
                description: 'El nombre confirma qué proyecto está abierto en esta pantalla.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '.instrucciones',
            popover: {
                title: 'Objetivo',
                description: 'Resume para qué sirve esta evaluación antes de asignar las notas.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '.contenedor-criterios',
            listo: '.contenedor-criterios .criterio, .contenedor-criterios > p',
            popover: {
                title: 'Criterios',
                description: 'Cada criterio muestra su ponderación. El título abre la descripción. La nota va de 1.0 a 10.0; los criterios al 0% son opcionales.',
                side: 'top',
                align: 'start',
            },
        },
        {
            element: '#boton-enviar',
            soloSiVisible: true,
            popover: {
                title: 'Enviar evaluación',
                description: 'Guarda las notas de esta pantalla y abre el resumen. La guía no lo pulsa.',
                side: 'top',
                align: 'center',
            },
        },
        {
            element: '#boton-regresar',
            popover: {
                title: 'Volver a la búsqueda',
                description: 'Regresa a la selección sin enviar las notas de esta pantalla.',
                side: 'bottom',
                align: 'center',
            },
        },
    ],
    '/resumen': [
        {
            element: '.resumen-header',
            popover: {
                title: 'Resumen',
                description: 'Esta pantalla muestra las notas guardadas antes de confirmarlas.',
                side: 'bottom',
                align: 'start',
            },
        },
        {
            element: '#resumen-criterios',
            listo: '#lista-criterios li, #lista-criterios > p',
            popover: {
                title: 'Detalle por criterio',
                description: 'Cada fila muestra el criterio, su descripción y la puntuación registrada.',
                side: 'top',
                align: 'start',
            },
        },
        {
            element: '#boton-calificar',
            popover: {
                title: 'Calificar',
                description: 'Calcula la nota final y abre la confirmación. La guía no lo pulsa.',
                side: 'top',
                align: 'center',
            },
        },
        {
            element: '#boton-regresar',
            popover: {
                title: 'Corregir notas',
                description: 'Vuelve al formulario si hay que cambiar una puntuación antes de confirmar.',
                side: 'bottom',
                align: 'center',
            },
        },
    ],
};

let guiaActiva = null;
let generacion = 0;

function notificar(mensaje, tipo) {
    if (typeof window.mostrarNotificacion === 'function') {
        window.mostrarNotificacion(mensaje, tipo);
    }
}

function elementoVisible(selector) {
    const elemento = document.querySelector(selector);
    if (!elemento?.isConnected) return false;
    const estilos = window.getComputedStyle(elemento);
    return estilos.display !== 'none'
        && estilos.visibility !== 'hidden'
        && elemento.getClientRects().length > 0;
}

/** El foco solo puede señalar lo que cabe en el recorte visible de cada scroll. */
function ancestrosConScroll(elemento) {
    const lista = [];
    let nodo = elemento.parentElement;
    while (nodo) {
        const estilo = window.getComputedStyle(nodo);
        const overflow = `${estilo.overflow} ${estilo.overflowY}`;
        if (/(auto|scroll)/.test(overflow) && nodo.scrollHeight > nodo.clientHeight + 1) {
            lista.push(nodo);
        }
        nodo = nodo.parentElement;
    }
    return lista;
}

function cabeEnRecorte(elemento) {
    const margen = 16;
    const rect = elemento.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return false;

    const limiteVentana = window.innerHeight - margen * 2;
    const enVentana = rect.height > limiteVentana
        ? rect.top >= margen && rect.top <= margen + 40 && rect.left >= 0 && rect.right <= window.innerWidth
        : rect.top >= margen
            && rect.bottom <= window.innerHeight - margen
            && rect.left >= 0
            && rect.right <= window.innerWidth;
    if (!enVentana) return false;

    for (const nodo of ancestrosConScroll(elemento)) {
        const caja = nodo.getBoundingClientRect();
        const altoVisible = Math.min(rect.bottom, caja.bottom) - Math.max(rect.top, caja.top);
        const necesario = Math.min(rect.height, Math.max(caja.height - margen * 2, 0));
        if (altoVisible < necesario - 2) return false;
    }
    return true;
}

function llevarALaPantalla(elemento) {
    const margen = 16;
    for (const nodo of ancestrosConScroll(elemento)) {
        const caja = nodo.getBoundingClientRect();
        const rect = elemento.getBoundingClientRect();
        const espacio = nodo.clientHeight - margen * 2;
        let delta = 0;
        if (rect.height >= espacio) {
            delta = rect.top - caja.top - margen;
        } else if (rect.top < caja.top + margen) {
            delta = rect.top - (caja.top + margen);
        } else if (rect.bottom > caja.bottom - margen) {
            delta = rect.bottom - (caja.bottom - margen);
        }
        if (delta) nodo.scrollTop += delta;
    }

    const rect = elemento.getBoundingClientRect();
    const fueraDeVentana = rect.top < margen
        || rect.left < 0
        || rect.bottom > window.innerHeight - margen
        || rect.right > window.innerWidth;
    if (fueraDeVentana) {
        elemento.scrollIntoView({
            block: rect.height > window.innerHeight - margen * 2 ? 'start' : 'nearest',
            inline: 'nearest',
            behavior: 'auto',
        });
    }
}

function destinoDelPaso(selector) {
    if (selector === '.contenedor-criterios') {
        return document.querySelector('.contenedor-criterios .criterio')
            || document.querySelector('.contenedor-criterios > p')
            || document.querySelector('.contenedor-criterios');
    }
    if (selector === '#resumen-criterios') {
        return document.querySelector('#lista-criterios li')
            || document.querySelector('#resumen-criterios');
    }
    return document.querySelector(selector);
}

function pasosDeEstaVista() {
    const pasos = GUIAS[window.location.pathname] || [];
    const modalAbierto = elementoVisible('#modal-asistencia.active .modal-content');
    if (window.location.pathname === '/evaluacion' && modalAbierto) {
        return pasos.filter((paso) => paso.element.includes('modal-asistencia'));
    }
    return pasos.filter((paso) => !paso.soloSiVisible || elementoVisible(paso.element));
}

function cargarHoja(href, marca) {
    if (document.querySelector(`link[data-${marca}]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.dataset[marca] = '';
        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`No se pudo cargar ${href}`));
        document.head.appendChild(link);
    });
}

function cargarScript(src) {
    if (typeof window.driver?.js?.driver === 'function') {
        return Promise.resolve(window.driver.js.driver);
    }
    return new Promise((resolve, reject) => {
        const previo = document.querySelector('script[data-driver-js]');
        if (previo) {
            previo.addEventListener('load', () => {
                const crear = window.driver?.js?.driver;
                if (typeof crear === 'function') resolve(crear);
                else reject(new Error('Driver.js no está disponible.'));
            }, { once: true });
            previo.addEventListener('error', () => reject(new Error('No se pudo cargar Driver.js.')), { once: true });
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.dataset.driverJs = '';
        script.onload = () => {
            const crear = window.driver?.js?.driver;
            if (typeof crear === 'function') resolve(crear);
            else reject(new Error('Driver.js no está disponible.'));
        };
        script.onerror = () => reject(new Error('No se pudo cargar Driver.js.'));
        document.head.appendChild(script);
    });
}

async function asegurarDriver() {
    await Promise.all([
        cargarHoja(DRIVER_CSS, 'driverCss'),
        cargarScript(DRIVER_JS),
    ]);
    return window.driver.js.driver;
}

function esperarElementoVisible(selector, signal) {
    return new Promise((resolve, reject) => {
        if (elementoVisible(selector)) {
            resolve(document.querySelector(selector));
            return;
        }

        const observer = new MutationObserver(() => {
            if (!elementoVisible(selector)) return;
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
}

async function iniciarGuia() {
    const miGeneracion = ++generacion;
    if (guiaActiva) {
        const anterior = guiaActiva;
        guiaActiva = null;
        anterior.destroy();
    }

    const pasos = pasosDeEstaVista();
    if (pasos.length === 0) return;

    let crearDriver;
    try {
        crearDriver = await asegurarDriver();
    } catch (error) {
        console.error('[guia-evaluador] No se pudo cargar Driver.js:', error);
        notificar('No se pudo cargar la guía. Comprueba tu conexión e inténtalo de nuevo.', 'error');
        return;
    }
    if (miGeneracion !== generacion) return;

    const espera = new AbortController();
    try {
        for (const paso of pasos) {
            if (paso.listo && !elementoVisible(paso.listo)) {
                await esperarElementoVisible(paso.listo, espera.signal);
            }
        }
    } catch (error) {
        if (error?.name === 'AbortError' || miGeneracion !== generacion) return;
        console.error('[guia-evaluador] La guía no pudo abrirse:', error);
        notificar('No se pudo abrir la guía porque los datos de esta pantalla todavía no están disponibles.', 'error');
        return;
    }
    if (miGeneracion !== generacion) return;

    let guiaCerrada = false;
    let pasoAjustado = -1;
    const guia = crearDriver({
        popoverClass: 'insal-tour-popover',
        overlayColor: 'rgba(13, 30, 53, 0.58)',
        stagePadding: 8,
        stageRadius: 14,
        smoothScroll: false,
        allowScroll: true,
        allowKeyboardControl: false,
        disableActiveInteraction: true,
        showProgress: true,
        progressText: '{{current}} de {{total}}',
        nextBtnText: 'Siguiente',
        prevBtnText: 'Anterior',
        doneBtnText: 'Finalizar',
        closeBtnLabel: 'Cerrar guía',
        onHighlighted: (element, _step, { driver }) => {
            const indice = driver.getActiveIndex();
            if (pasoAjustado === indice || !(element instanceof Element) || guiaCerrada) return;
            const popover = document.querySelector('.driver-popover');
            if (!popover) return;
            const caja = popover.getBoundingClientRect();
            const sobraAbajo = caja.bottom - (window.innerHeight - 12);
            const sobraArriba = 12 - caja.top;
            const focoFuera = !cabeEnRecorte(element);
            if (sobraAbajo <= 0 && sobraArriba <= 0 && !focoFuera) return;
            const scroller = ancestrosConScroll(element)[0];
            if (!scroller) return;
            pasoAjustado = indice;
            if (focoFuera) llevarALaPantalla(element);
            else scroller.scrollTop += sobraAbajo > 0 ? sobraAbajo + 8 : -(sobraArriba + 8);
            requestAnimationFrame(() => {
                if (!guiaCerrada && guiaActiva === driver) driver.refresh();
            });
        },
        onDestroyed: () => {
            guiaCerrada = true;
            espera.abort();
            if (guiaActiva === guia) guiaActiva = null;
        },
        steps: pasos.map(({ element, popover }) => ({
            element: () => {
                const nodo = destinoDelPaso(element);
                if (nodo instanceof Element) llevarALaPantalla(nodo);
                return nodo;
            },
            popover,
        })),
    });

    guiaActiva = guia;
    if (guiaCerrada || miGeneracion !== generacion) return;
    guia.drive();
}

try {
    sessionStorage.removeItem(CLAVE_ANTIGUA);
} catch {
    /* la guía ya no guarda el paso entre pantallas */
}

document.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest('[data-guia-evaluador]')) return;
    iniciarGuia();
});
