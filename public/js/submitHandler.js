/**
 * submitHandler.js — Módulo reutilizable para manejar el envío de formularios
 * con feedback visual de estados: normal → enviando → éxito/error.
 *
 * Uso básico:
 *
 * ```html
 * <form id="mi-form">
 *   <button type="submit" class="boton" data-submit>
 *     <div data-submit-content class="mostrar">
 *       <span class="material-symbols-rounded">send</span>
 *       <p>Enviar</p>
 *     </div>
 *     <div data-loading-content class="quitar">
 *       <span class="material-symbols-rounded">hourglass_top</span>
 *       <p>Enviando…</p>
 *     </div>
 *     <div data-success-content class="quitar">
 *       <span class="material-symbols-rounded">check_circle</span>
 *       <p>¡Hecho!</p>
 *     </div>
 *   </button>
 * </form>
 * ```
 *
 * ```js
 * import { createSubmitHandler } from './submitHandler.js';
 *
 * const form = document.getElementById('mi-form');
 * createSubmitHandler(form, {
 *   onSubmit: async () => {
 *     const res = await fetch('/api/...', { method: 'POST', body: new FormData(form) });
 *     return res.json();
 *   },
 *   onSuccess: (data) => {
 *     mostrarNotificacion('Creado correctamente', 'bien');
 *     form.reset();
 *   },
 *   onError: (error) => {
 *     mostrarNotificacion('Ocurrió un error', 'error');
 *   },
 * });
 * ```
 *
 * Lógica interna (v2): máquina de estados "latest-wins". El último estado
 * solicitado SIEMPRE gana: si llega un estado nuevo mientras hay una
 * transición en curso, la anterior se cancela limpiamente (mediante un token
 * de generación) y los elementos se normalizan antes de empezar la nueva.
 * Esto garantiza que el botón nunca quede atascado en "Enviando…", sin
 * importar cuán rápido se haga clic o cuántos estados se solapen.
 *
 * @param {HTMLFormElement} form - El formulario a manejar.
 * @param {Object} options
 * @param {() => Promise<any>} options.onSubmit - Función asíncrona que ejecuta la petición.
 * @param {(data: any) => void} [options.onSuccess] - Callback en caso de éxito.
 * @param {(error: any) => void} [options.onError] - Callback en caso de error.
 * @param {number} [options.successDuration=1500] - ms que se muestra el estado "hecho".
 * @param {() => boolean} [options.validate] - Validación previa opcional. Debe retornar true para continuar.
 */

export function createSubmitHandler(form, options = {}) {
    if (!form || !(form instanceof HTMLFormElement)) {
        console.error('submitHandler: Se requiere un elemento <form> válido.');
        return;
    }

    const {
        onSubmit,
        onSuccess,
        onError,
        successDuration = 1500,
        validate,
    } = options;

    if (typeof onSubmit !== 'function') {
        console.error('submitHandler: La opción "onSubmit" es requerida y debe ser una función.');
        return;
    }

    // ── Buscar el botón submit dentro del form ──
    const submitBtn = form.querySelector('button[type="submit"]');
    if (!submitBtn) {
        console.error('submitHandler: No se encontró un button[type="submit"] dentro del formulario.');
        return;
    }

    // ── Referencias a los contenedores de estado ──
    const contentEl = submitBtn.querySelector('[data-submit-content]');
    const loadingEl = submitBtn.querySelector('[data-loading-content]');
    const successEl = submitBtn.querySelector('[data-success-content]');
    const stateEls = { normal: contentEl, loading: loadingEl, success: successEl };

    // ── Estado interno de la máquina ──
    let currentVisible = contentEl; // Empieza con el estado normal
    let transitionToken = 0;        // Token de generación: invalida transiciones viejas
    let fallbackTimer = null;       // Fallback si animationend nunca llega
    let revertTimer = null;         // Temporizador success → normal
    let isSubmitting = false;       // Bloqueo anti doble-envío

    // ── Ocultar un elemento inmediatamente (sin animación) ──
    function hideImmediate(el) {
        el.classList.remove('btn-exit', 'btn-enter', 'mostrar');
        el.classList.add('quitar');
    }

    // ── Mostrar un elemento inmediatamente (sin animación), ocultando el resto ──
    function showImmediate(el) {
        Object.values(stateEls).forEach(e => {
            if (!e || e === el) return;
            hideImmediate(e);
        });
        el.classList.remove('btn-exit', 'btn-enter', 'quitar');
        el.classList.add('mostrar');
        currentVisible = el;
    }

    // ── Cancelar cualquier transición en curso ──
    // Al incrementar el token, los listeners y timeouts de la transición
    // anterior se vuelven inertes (comprueban el token antes de actuar).
    function cancelTransition() {
        transitionToken++;
        if (fallbackTimer) {
            clearTimeout(fallbackTimer);
            fallbackTimer = null;
        }
    }

    // ── Normalizar TODOS los estados excepto los indicados ──
    // Evita que queden elementos "fantasma" visibles (apilados en el mismo
    // grid-area) cuando una transición es interrumpida a medias.
    function normalizeStates(exceptA, exceptB) {
        Object.values(stateEls).forEach(el => {
            if (!el || el === exceptA || el === exceptB) return;
            hideImmediate(el);
        });
    }

    // ══════════════════════════════════════════════════════════════
    // Núcleo: cambiar el estado visible del botón con animación.
    // "Latest-wins": siempre converge al ÚLTIMO estado solicitado.
    // ══════════════════════════════════════════════════════════════
    function setButtonState(state) {
        const newEl = stateEls[state];
        if (!newEl) return;

        // Sincronizar SIEMPRE el disabled con el estado más reciente, sin
        // importar si hay una transición en curso o si el estado ya era el
        // actual. (Antes esto se saltaba en algunos caminos y el botón
        // quedaba habilitado/deshabilitado de forma inconsistente.)
        submitBtn.disabled = state === 'loading';

        // Si se sale del estado "success", cancelar su temporizador de reversión
        if (state !== 'success' && revertTimer) {
            clearTimeout(revertTimer);
            revertTimer = null;
        }

        // Ya estamos ahí: nada más que hacer
        if (newEl === currentVisible) return;

        // Cancelar la transición previa (si la hay): gana el último estado
        cancelTransition();
        const token = transitionToken;
        const oldEl = currentVisible;
        currentVisible = newEl;

        // Limpiar restos de transiciones anteriores interrumpidas
        normalizeStates(oldEl, newEl);

        // ── Completa la transición: deja un estado final limpio y determinista ──
        let done = false;
        const complete = () => {
            if (done || token !== transitionToken) return; // Transición obsoleta
            done = true;

            if (fallbackTimer) {
                clearTimeout(fallbackTimer);
                fallbackTimer = null;
            }

            newEl.removeEventListener('animationend', onAnimEnd);
            oldEl.removeEventListener('animationend', onAnimEnd);

            // Solo newEl visible, sin clases de animación residual
            hideImmediate(oldEl);
            newEl.classList.remove('btn-exit', 'btn-enter');
            newEl.classList.add('mostrar');
        };

        // Un único listener compartido filtrado por target: así los
        // animationend que burbujean desde elementos hijos NO cuentan como
        // finalización prematura (bug de la versión anterior).
        const onAnimEnd = (e) => {
            if (e.target === newEl || e.target === oldEl) complete();
        };

        // 1. El elemento entrante aparece deslizándose desde abajo
        newEl.classList.remove('quitar');
        newEl.classList.add('mostrar', 'btn-enter');

        // 2. El elemento saliente se desliza hacia arriba
        oldEl.classList.remove('btn-enter');
        oldEl.classList.add('btn-exit');

        newEl.addEventListener('animationend', onAnimEnd);
        oldEl.addEventListener('animationend', onAnimEnd);

        // 3. Red de seguridad: las animaciones CSS duran ~200ms; si por
        // cualquier motivo animationend no llega (pestaña en segundo plano,
        // animación no aplicada, etc.), forzamos el estado final.
        fallbackTimer = setTimeout(complete, 350);
    }

    // ── Handler principal del submit ──
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Ignorar submits duplicados (clics muy rápidos / Enter repetido)
        // mientras ya hay una petición en curso.
        if (isSubmitting) return;

        // Validación opcional
        if (typeof validate === 'function' && !validate()) {
            return;
        }

        isSubmitting = true;

        // Un nuevo envío cancela cualquier reversión pendiente de "success"
        if (revertTimer) {
            clearTimeout(revertTimer);
            revertTimer = null;
        }

        // Estado: enviando
        setButtonState('loading');

        try {
            const data = await onSubmit();

            if (data && data.success) {
                // Estado: éxito
                setButtonState('success');

                if (typeof onSuccess === 'function') {
                    onSuccess(data);
                }

                // Volver a estado normal después de un tiempo.
                // Se guarda la referencia para poder cancelarlo si llega
                // otro submit antes de que venza (antes era un setTimeout
                // suelto que competía con los estados nuevos y los pisaba).
                revertTimer = setTimeout(() => {
                    revertTimer = null;
                    setButtonState('normal');
                }, successDuration);
            } else {
                // Error controlado del servidor (data.success === false)
                setButtonState('normal');
                if (typeof onError === 'function') {
                    onError(data?.error || new Error('Error del servidor'));
                }
            }
        } catch (error) {
            // Error de red o inesperado: garantizar retorno al estado normal
            setButtonState('normal');
            if (typeof onError === 'function') {
                onError(error);
            }
        } finally {
            // Siempre liberar el bloqueo, incluso si onSubmit u
            // onSuccess/onError lanzan una excepción.
            isSubmitting = false;
        }
    });
}