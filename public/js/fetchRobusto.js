/**
 * fetchRobusto.js
 * -----------------------------------------------------------------------------
 * Capa de red resistente a los "cold starts" y reinicios repentinos de
 * contenedor propios de la capa GRATUITA de Render/Railway.
 *
 * Problema que resuelve:
 *   Cuando el contenedor "se duerme" y luego recibe una petición, tarda muchos
 *   segundos en despertar (cold start). Durante ese tiempo los `fetch` normales
 *   del frontend se quedan colgados SIN feedback: el usuario ve la app
 *   "congelada" sin saber si se rompió. Y si el contenedor se reinicia a mitad
 *   de petición, ésta fallaba y no se recuperaba sola.
 *
 * Qué hace este módulo (se activa solo, envolviendo window.fetch):
 *   1. TIMEOUT con AbortController: ninguna petición queda colgada para siempre.
 *   2. REINTENTOS automáticos con backoff para métodos idempotentes (GET/HEAD/
 *      OPTIONS) cuando el fallo es de red o timeout — justo el caso del cold
 *      start, donde la petición todavía no había llegado al servidor.
 *   3. AVISO con mostrarNotificacion ("Reconectando con el servidor…" / reintento)
 *      en cuanto una petición tarda más de un umbral corto, para que el usuario
 *      vea que se está reconectando en lugar de una app congelada.
 *   4. KEEP-ALIVE: mientras haya una pestaña abierta, hace ping a /health cada
 *      pocos minutos para impedir que la plataforma "duerma" el contenedor
 *      (Render free lo apaga tras ~15 min sin tráfico).
 *
 * Es transparente: devuelve exactamente lo mismo que `fetch` (una Response en
 * éxito; rechaza con el mismo tipo de error en fallo), así que NO hay que
 * modificar las llamadas existentes. No reintenta escrituras (POST/PUT/DELETE)
 * para no duplicar acciones: a esas solo se les aplica el timeout + aviso.
 */
(() => {
    // Idempotente: si ya se envolvió fetch, no volver a hacerlo.
    if (window.__fetchRobustoInstalado) return;
    window.__fetchRobustoInstalado = true;

    // Configuración (ajustable desde window antes de cargar este archivo).
    const TIMEOUT_MS = Number(window.__FETCH_TIMEOUT_MS) || 45000; // cubre cold start
    const MAX_REINTENTOS = Number(window.__FETCH_MAX_REINTENTOS) || 2;
    const BACKOFF_BASE_MS = Number(window.__FETCH_BACKOFF_MS) || 1200;
    const UMBRAL_AVISO_MS = Number(window.__FETCH_AVISO_MS) || 2500; // feedback rápido
    const KEEPALIVE_MS = Number(window.__FETCH_KEEPALIVE_MS) || 10 * 60 * 1000; // < 15 min
    const RUTA_KEEPALIVE = window.__FETCH_KEEPALIVE_URL || '/health';

    const METODOS_IDEMPOTENTES = new Set(['GET', 'HEAD', 'OPTIONS']);

    // ── Mensaje amable para el usuario (igual tono que router.js) ──────────
    // `fetch` rechaza con TypeError: "Failed to fetch" (en inglés) cuando se
    // pierde la conexión. Ese texto técnico nunca debe llegar a la UI: aquí
    // se traduce a un mensaje en español, cercano al de cambio de vista
    // ("No se pudo cargar esta vista. Comprueba tu conexión…").
    const MENSAJE_SIN_CONEXION = 'Sin conexión. Comprueba tu conexión e inténtalo de nuevo.';

    // ── Aviso de reconexión (misma notificación que el resto de la app) ─────
    // Evita apilar el mismo texto si varias peticiones fallan a la vez: la
    // notificación ya dura 3 s y se quita sola.
    let ultimoAviso = { texto: '', en: 0 };

    function avisarReconexion(mensaje) {
        if (typeof window.mostrarNotificacion !== 'function') return;
        const ahora = Date.now();
        if (ultimoAviso.texto === mensaje && ahora - ultimoAviso.en < 3000) return;
        ultimoAviso = { texto: mensaje, en: ahora };
        window.mostrarNotificacion(mensaje, 'info');
    }

    // ── Envoltura de fetch ───────────────────────────────────────────────────
    const fetchOriginal = window.fetch.bind(window);

    function esReintentable(metodo) {
        return METODOS_IDEMPOTENTES.has(metodo);
    }

    function esErrorDeRed(err) {
        // TypeError: fallo de red. AbortError (DOMException): nuestro timeout.
        // Ambos indican que la petición no completó normalmente en el servidor.
        return err && (err.name === 'AbortError' || err instanceof TypeError);
    }

    function errorAmable(err) {
        if (!esErrorDeRed(err)) return err;
        // Conservar la causa original para depurar en consola, pero exponer
        // un message amable para los `mostrarNotificacion(err.message)` que
        // ya existen en los módulos.
        const amable = new Error(MENSAJE_SIN_CONEXION);
        amable.name = err?.name || 'ErrorDeRed';
        amable.cause = err;
        // Marca para que cualquier módulo pueda detectarlo sin comparar textos.
        amable.esErrorDeRed = true;
        return amable;
    }

    async function fetchRobusto(input, init) {
        const opciones = init ? { ...init } : {};
        const metodo = (
            opciones.method ||
            (typeof input !== 'string' && input && input.method) ||
            'GET'
        ).toUpperCase();

        let ultimoError = null;

        // Nº de intentos: los idempotentes se reintentan; el resto, uno solo.
        const totalIntentos = esReintentable(metodo) ? MAX_REINTENTOS + 1 : 1;

        for (let intento = 1; intento <= totalIntentos; intento++) {
            const controller = new AbortController();
            const temporizador = setTimeout(() => controller.abort(), TIMEOUT_MS);

            // Respetar una señal externa si el llamador ya pasó una.
            const senalExterna = opciones.signal;
            if (senalExterna) {
                if (senalExterna.aborted) controller.abort();
                else senalExterna.addEventListener('abort', () => controller.abort(), { once: true });
            }

            // Feedback: si esta petición tarda, avisar de que se reconecta.
            const avisoTimer = setTimeout(() => {
                avisarReconexion('Reconectando con el servidor…');
            }, UMBRAL_AVISO_MS);

            try {
                const respuesta = await fetchOriginal(input, { ...opciones, signal: controller.signal });
                clearTimeout(avisoTimer);
                return respuesta;
            } catch (err) {
                clearTimeout(avisoTimer);

                ultimoError = err;

                // Si fue un abort pedido por el llamador, propagar tal cual.
                if (senalExterna && senalExterna.aborted) throw err;

                // Reintentar solo en fallos de red/timeout y si quedan intentos.
                const puedeReintentar = intento < totalIntentos && esErrorDeRed(err);
                if (puedeReintentar) {
                    const espera = BACKOFF_BASE_MS * intento;
                    avisarReconexion(
                        'Sin respuesta del servidor. Reintentando (' + intento + '/' + MAX_REINTENTOS + ')…',
                    );
                    await new Promise((r) => setTimeout(r, espera));
                    continue;
                }

                // Sin más reintentos: propagar un error amable para que el código
                // existente (p. ej. router.js) muestre su UI de error/reintento
                // sin exponer el "Failed to fetch" técnico.
                throw errorAmable(err);
            } finally {
                clearTimeout(temporizador);
            }
        }

        // No se alcanza en la práctica, pero satisface al linter.
        throw errorAmable(ultimoError);
    }

    window.fetch = fetchRobusto;


    // ── Keep-alive: evita que la plataforma duerma el contenedor ─────────────
    // Ping silencioso a /health. Usa el fetch ORIGINAL para no disparar
    // reintentos ni el indicador visual. Mientras haya una pestaña abierta,
    // Render/Railway no consideran el servicio inactivo.
    function pingKeepAlive() {
        fetchOriginal(RUTA_KEEPALIVE, { method: 'GET', cache: 'no-store' }).catch(() => {
            /* silencioso: si falla, el wrapper lo recuperará en la próxima acción */
        });
    }
    setInterval(pingKeepAlive, KEEPALIVE_MS);
    // Un primer ping suave tras cargar, por si la pestaña llevaba rato en background.
    setTimeout(pingKeepAlive, 3000);

    // ── Aviso de recuperación de conexión del navegador ──────────────────────
    // Cuando el navegador vuelve a estar online, notificamos por si algún
    // módulo quiere refrescar datos. No forzamos recarga para no perder datos.
    window.addEventListener('online', () => {
        window.dispatchEvent(new CustomEvent('conexionRestaurada'));
    });
})();


