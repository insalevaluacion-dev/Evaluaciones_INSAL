// ═══════════════════════════════════════════════════════════════
// MÓDULO: Animaciones de lista (Web Animations API)
//
// Motor centralizado para las transiciones de entrada/salida de los
// .list-item. Reemplaza el sistema anterior basado en clases CSS
// (--entering/--exiting/--filter-*), @keyframes con max-height fijo
// y oyentes animationend dispersos.
//
// - La salida/filtrado mide la altura REAL del elemento y la colapsa
//   de verdad (sin max-height/min-height hardcodeados en CSS).
// - Cada animación se registra por elemento (WeakMap): iniciar una
//   nueva cancela limpiamente la anterior sin dejar estilos inline
//   residuales.
// - prefers-reduced-motion se comprueba aquí: si está activo, todas
//   las funciones resuelven al instante sin depender de animationend.
// ═══════════════════════════════════════════════════════════════

const DURACION_ENTRADA = 300;
const DURACION_SALIDA = 280;

// Curvas Material 3 "emphasized"
const EASING_ENTRADA = 'cubic-bezier(0.05, 0.7, 0.1, 1)';
const EASING_SALIDA = 'cubic-bezier(0.3, 0, 0.8, 0.15)';

/** Animación activa por elemento (para poder cancelarla). */
const animacionesActivas = new WeakMap();

// ── Aceleración de la cascada por scroll ──
// Mientras haya entradas en curso (con o sin delay pendiente), cada evento
// de scroll AVANZA el reloj de esas animaciones proporcionalmente a los
// píxeles recorridos: los items aparecen "arrastrados" por el scroll del
// usuario en vez de esperar su turno. Sin scroll, siguen a velocidad normal.
const entradasEnCurso = new Set();
const MS_AVANCE_POR_PIXEL = 2; // 1px de scroll ≙ 2ms de progreso de animación
let listenerScrollActivo = false;
const ultimaPosicionScroll = new WeakMap(); // objetivo de scroll → scrollTop previo

function alHacerScroll(e) {
    if (!entradasEnCurso.size) return;

    // e.target puede ser el documento (scroll de página) o un contenedor
    // con overflow (.list-container es scrollable en esta app).
    const objetivo =
        e.target === document
            ? (document.scrollingElement || document.documentElement)
            : e.target;
    const actual = objetivo.scrollTop || 0;
    const previa = ultimaPosicionScroll.get(objetivo);
    ultimaPosicionScroll.set(objetivo, actual);
    if (previa == null) return; // primera lectura: sin referencia

    // Solo importa CUÁNTO se desplazó; en ambas direcciones la cascada
    // se acelera (nunca retrocede: currentTime es monótono aquí).
    const delta = Math.abs(actual - previa);
    if (!delta) return;
    const avance = delta * MS_AVANCE_POR_PIXEL;

    entradasEnCurso.forEach((anim) => {
        try {
            const timing = anim.effect.getTiming();
            const limite = (timing.delay || 0) + timing.duration;
            const nuevo = Math.min((anim.currentTime || 0) + avance, limite);
            anim.currentTime = nuevo; // salta delay y adelanta el progreso
        } catch {
            // Animación ya terminada/eliminada: se limpiará sola vía finished
        }
    });
}

function asegurarListenerScroll() {
    if (listenerScrollActivo) return;
    listenerScrollActivo = true;
    // capture:true intercepta los eventos scroll de CUALQUIER elemento
    // (los scroll no burbujean, pero sí pasan por la fase de captura),
    // así cubre tanto la ventana como el .list-container con un solo oyente.
    window.addEventListener('scroll', alHacerScroll, { capture: true, passive: true });
}

/** Propiedades inline que usan las animaciones de colapso/expansión. */
const PROPIEDADES_COLAPSO = [
    'box-sizing',
    'overflow',
    'pointer-events',
    'height',
    'min-height',
    'transform-origin',
];

function movimientoReducido() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function limpiarEstilosColapso(el) {
    PROPIEDADES_COLAPSO.forEach((prop) => el.style.removeProperty(prop));
}

/**
 * Cancela la animación en curso sobre el elemento (si la hay) y
 * restaura sus estilos inline. Toda animación de este módulo llama
 * a esto antes de empezar: nunca conviven dos sobre el mismo nodo.
 */
export function cancelarAnimacionLista(el) {
    const previa = animacionesActivas.get(el);
    if (previa) {
        // Borrar del registro ANTES de cancelar evita que su propio
        // handler de finalización considere que sigue siendo propietario.
        animacionesActivas.delete(el);
        previa.cancel();
    }
    limpiarEstilosColapso(el);
}

/** Finaliza una animación propia: libera registro, fill y estilos inline. */
function finalizar(anim, el) {
    entradasEnCurso.delete(anim);
    if (animacionesActivas.get(el) !== anim) return;
    animacionesActivas.delete(el);
    // cancel() tras finished libera cualquier fill:'forwards'
    anim.cancel();
    limpiarEstilosColapso(el);
}

/** Prepara el elemento para un colapso de altura real (salida/filtrado). */
function prepararColapso(el) {
    const altura = el.offsetHeight;
    const cs = getComputedStyle(el);

    // box-sizing:border-box hace que la altura animada incluya padding.
    Object.assign(el.style, {
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: 'none',
        height: `${altura}px`,
        minHeight: '0px',
        transformOrigin: 'top center',
    });

    return {
        altura,
        paddingTop: cs.paddingTop,
        paddingBottom: cs.paddingBottom,
        marginBottom: cs.marginBottom,
    };
}

/** Keyframes de colapso compartidos por salida y filtrado (ocultar). */
function keyframesColapso(medidas) {
    return [
        {
            height: `${medidas.altura}px`,
            paddingTop: medidas.paddingTop,
            paddingBottom: medidas.paddingBottom,
            marginBottom: medidas.marginBottom,
            opacity: 1,
        },
        // El fade domina al inicio para que no se sienta "trabado".
        { opacity: 0, offset: 0.4 },
        {
            height: '0px',
            paddingTop: '0px',
            paddingBottom: '0px',
            marginBottom: '0px',
            opacity: 0,
        },
    ];
}

// ═══════════════════════════════════════════════════════════════
// API PÚBLICA
// ═══════════════════════════════════════════════════════════════

/**
 * Anima la ENTRADA de un item recién insertado (fade + escala + descenso).
 * @param {HTMLElement} el - Item YA insertado en el DOM.
 * @param {number} [delay=0] - Retardo en ms (efecto cascada). Durante el
 *   retardo el item se mantiene invisible (fill:'backwards').
 * @returns {Promise<void>} Se resuelve al terminar (o al instante si hay
 *   movimiento reducido). Nunca rechaza.
 */
export function animarEntrada(el, delay = 0) {
    if (!el) return Promise.resolve();
    cancelarAnimacionLista(el);
    if (!el.isConnected || movimientoReducido() || typeof el.animate !== 'function') {
        return Promise.resolve();
    }

    const anim = el.animate(
        [
            { opacity: 0, transform: 'translateY(-14px) scale(0.97)', filter: 'blur(2px)' },
            { opacity: 1, transform: 'none', filter: 'blur(0px)' },
        ],
        {
            duration: DURACION_ENTRADA,
            delay: Math.max(0, Math.floor(delay)),
            easing: EASING_ENTRADA,
            fill: 'backwards',
        },
    );

    animacionesActivas.set(el, anim);
    // Registrar en la cascada: el scroll del usuario podrá acelerarla
    entradasEnCurso.add(anim);
    asegurarListenerScroll();
    return anim.finished.catch(() => {}).finally(() => finalizar(anim, el));
}
/**
 * Anima la SALIDA de un item: colapso real de su altura medida + fade.
 * El llamador DEBE eliminar el nodo cuando la promesa se resuelva.
 * @param {HTMLElement} el
 * @returns {Promise<boolean>} true si completó (o no hizo falta animar),
 *   false si fue cancelada por otra animación. Nunca rechaza.
 */
export function animarSalida(el) {
    if (!el) return Promise.resolve(true);
    cancelarAnimacionLista(el);
    if (!el.isConnected || movimientoReducido() || typeof el.animate !== 'function') {
        return Promise.resolve(true);
    }

    const medidas = prepararColapso(el);
    const anim = el.animate(keyframesColapso(medidas), {
        duration: DURACION_SALIDA,
        easing: EASING_SALIDA,
        fill: 'forwards', // conserva el estado colapsado hasta eliminar el nodo
    });

    animacionesActivas.set(el, anim);
    return anim.finished
        .then(() => {
            finalizar(anim, el);
            return true;
        })
        .catch(() => false);
}

/**
 * Filtrado: OCULTA un item con colapso de altura real.
 * El llamador debe poner display:none cuando resuelva con true.
 * @param {HTMLElement} el
 * @returns {Promise<boolean>} true si completó, false si fue cancelada
 *   (p. ej. porque el item volvió a coincidir con la búsqueda).
 */
export function animarOcultar(el) {
    if (!el) return Promise.resolve(true);
    cancelarAnimacionLista(el);
    if (!el.isConnected || movimientoReducido() || typeof el.animate !== 'function') {
        return Promise.resolve(true);
    }

    const medidas = prepararColapso(el);
    const anim = el.animate(keyframesColapso(medidas), {
        duration: DURACION_SALIDA,
        easing: EASING_SALIDA,
    });

    animacionesActivas.set(el, anim);
    return anim.finished
        .then(() => {
            finalizar(anim, el);
            return true;
        })
        .catch(() => false);
}

/**
 * Filtrado: MUESTRA un item que estaba display:none, expandiendo su
 * altura desde 0 hasta su tamaño natural (inverso de animarOcultar).
 * Pone display:'' de forma síncrona.
 * @param {HTMLElement} el
 * @returns {Promise<boolean>} true si completó, false si fue cancelada.
 */
export function animarMostrar(el) {
    if (!el) return Promise.resolve(true);
    cancelarAnimacionLista(el);
    el.style.display = '';
    if (!el.isConnected || movimientoReducido() || typeof el.animate !== 'function') {
        return Promise.resolve(true);
    }

    const cs = getComputedStyle(el);
    const altura = el.offsetHeight;
    if (altura === 0) return Promise.resolve(true);

    // Restricciones mientras dura la expansión (finalizar() las limpia).
    Object.assign(el.style, {
        boxSizing: 'border-box',
        overflow: 'hidden',
        minHeight: '0px',
    });

    const anim = el.animate(
        [
            {
                height: '0px',
                paddingTop: '0px',
                paddingBottom: '0px',
                marginBottom: '0px',
                opacity: 0,
            },
            { opacity: 1, offset: 0.5 },
            {
                height: `${altura}px`,
                paddingTop: cs.paddingTop,
                paddingBottom: cs.paddingBottom,
                marginBottom: cs.marginBottom,
                opacity: 1,
            },
        ],
        { duration: DURACION_SALIDA, easing: EASING_ENTRADA },
    );

    animacionesActivas.set(el, anim);
    return anim.finished
        .then(() => {
            finalizar(anim, el);
            return true;
        })
        .catch(() => false);
}