/**
 * app-loader.js
 * ---------------------------------------------------------------------------
 * Loader de marca reutilizable para el FLUJO DE EVALUADORES (login,
 * registrarse, selección, evaluación y resumen).
 *
 * Cada vista incluye el overlay en su HTML con la clase `is-active`
 * (visible desde el primer pintado) más el `<style>` crítico inline que lo
 * posiciona antes de que llegue app-loader.css. Este módulo SOLO se encarga
 * de OCULTARLO en el momento adecuado, evitando el FOUC de los iconos
 * (Material Symbols) y, en las vistas con datos, sin revelar la página a
 * medio cargar.
 *
 * Reglas de ocultado:
 *   1. Los iconos (Material Symbols Rounded) deben estar PINTADOS. No basta
 *      con document.fonts.load/check: esa API resuelve cuando el archivo
 *      bajó, antes de que el navegador sustituya la ligadura ("school") por
 *      el glifo. Se mide un probe: con la ligadura aplicada el avance
 *      colapsa a ~24px; el texto de fallback es mucho más ancho.
 *   2. Los datos iniciales deben estar listos:
 *      - Vistas SIN carga de datos (login, registrarse, selección): basta con
 *        que ocurra el evento `load` de la ventana.
 *      - Vistas CON carga de datos (evaluación, resumen): la página llama a
 *        `window.__appLoaderHold()` al arrancar para IGNORAR `load` y esperar
 *        una señal explícita `window.__appLoaderDataReady()` cuando haya
 *        pintado sus datos.
 *
 * El TIEMPO nunca autoriza ocultar mientras la fuente de iconos siga
 * descargándose (petición pending): se espera sin límite. Solo si la fuente
 * FALLA de forma definitiva (error de red) se deja de esperar para no
 * congelar la app. Además cada vista trae su propio `<script>` inline de
 * respaldo por si este módulo no llegara a ejecutarse.
 */

const FONT_FACE = '700 24px "Material Symbols Rounded"';
const ICON_PROBE_WORD = 'settings';
const ICON_GLYPH_MAX_PX = 48;

const HARD_TIMEOUT_MS = 8000;
// Tiempo continuo "ni pintada ni pendiente" tras el cual damos la fuente por
// fallida (no por lenta) y dejamos de esperarla.
const FONT_FAILED_GRACE_MS = 2500;

let fontsReady = false;
let dataReady = false;
// true = ignorar `load`, esperar señal explícita __appLoaderDataReady().
// Una vista que carga datos por fetch declara `window.__appLoaderHoldData = true`
// en su HTML (script inline junto al overlay). Lo leemos AQUÍ, al cargar el
// módulo, para que holdData esté activo ANTES de que se resuelva cualquier
// promesa de fuente. Así el loader nunca se oculta por una carrera de timing
// (fuente cacheada + retardo del handler DOMContentLoaded de la vista) antes de
// que ésta haya podido retenerlo.
let holdData = window.__appLoaderHoldData === true;
let done = false;
let fallbackTimer = null;

/**
 * Probe fuera de pantalla con la misma variación que usa la UI (wght 700).
 * Sirve para saber si la ligadura ya sustituyó al nombre del icono.
 */
function iconProbe() {
    let probe = document.getElementById('app-loader-icon-probe');
    if (probe) return probe;
    probe = document.createElement('span');
    probe.id = 'app-loader-icon-probe';
    probe.setAttribute('aria-hidden', 'true');
    probe.textContent = ICON_PROBE_WORD;
    probe.style.cssText = [
        'position:absolute',
        'left:0',
        'top:0',
        'visibility:hidden',
        'pointer-events:none',
        'font-family:"Material Symbols Rounded"',
        'font-weight:700',
        'font-style:normal',
        'font-size:24px',
        'line-height:1',
        'letter-spacing:normal',
        'white-space:nowrap',
        'font-feature-settings:"liga"',
        '-webkit-font-feature-settings:"liga"',
        'font-variation-settings:"FILL" 0, "wght" 700, "GRAD" 0, "opsz" 48'
    ].join(';');
    document.body.appendChild(probe);
    return probe;
}

function iconsArePainted() {
    if (!document.body) return false;
    const width = iconProbe().getBoundingClientRect().width;
    return width > 0 && width <= ICON_GLYPH_MAX_PX;
}

function removeIconProbe() {
    const probe = document.getElementById('app-loader-icon-probe');
    if (probe) probe.remove();
}

/** Deja visibles los iconos de la página (ver app-loader.css). */
function markIconsReady() {
    removeIconProbe();
    document.documentElement.classList.add('icons-ready');
}

/**
 * ¿Sigue la fuente de iconos descargándose? (petición "pending")
 *  - La hoja de estilos de Google Fonts aún no llegó (ni falló).
 *  - Algún FontFace "Material Symbols" está en `loading`, o `unloaded`
 *    mientras la página todavía carga.
 * Mientras esto sea true NUNCA se debe ocultar el loader, sin importar
 * cuánto tarde: el tiempo no autoriza el ocultado, solo el glifo pintado.
 */
function iconFontPending() {
    const link = document.querySelector(
        'link[href*="fonts.googleapis.com/css2"][href*="Material"]'
    );
    if (link && !link.sheet && document.readyState !== 'complete') return true;
    const fonts = document.fonts;
    if (!fonts || typeof fonts.forEach !== 'function') return false;
    let pending = false;
    fonts.forEach(function (face) {
        if (!/Material Symbols/i.test(face.family)) return;
        if (face.status === 'loading') pending = true;
        else if (face.status === 'unloaded' && document.readyState !== 'complete') pending = true;
    });
    return pending;
}

/**
 * Espera a que el glifo se pinte. Sin deadline por tiempo: sigue esperando
 * mientras la fuente esté pendiente. Resuelve `false` solo si la fuente
 * FALLÓ de forma definitiva (error de red, hoja sin la fuente...), para no
 * dejar la app congelada; resuelve `true` cuando el probe colapsa.
 */
function waitUntilIconsPainted() {
    return new Promise(function (resolve) {
        let settledSince = 0;
        (function poll() {
            if (iconsArePainted()) {
                requestAnimationFrame(function () { resolve(true); });
                return;
            }
            if (iconFontPending()) {
                settledSince = 0;
            } else {
                settledSince = settledSince || Date.now();
                if (Date.now() - settledSince > FONT_FAILED_GRACE_MS) {
                    resolve(false);
                    return;
                }
            }
            setTimeout(poll, 50);
        })();
    });
}

/** Oculta el overlay con transición y lo retira del flujo del layout. */
function finish() {
    if (done) return;
    done = true;
    if (fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
    }
    markIconsReady();
    const loader = document.getElementById('app-loader');
    if (!loader) return;
    loader.classList.remove('is-active');
    const cleanup = function () {
        loader.removeEventListener('transitionend', cleanup);
        loader.style.display = 'none';
    };
    loader.addEventListener('transitionend', cleanup);
    // Red de seguridad por si la transición no dispara transitionend.
    setTimeout(cleanup, 400);
}

function tryFinish() {
    if (!fontsReady) return;
    if (!dataReady) return;
    finish();
}

/**
 * Fuerza la carga de los glifos de iconos visibles y espera a que estén
 * listos (Material Symbols usa ligaduras y sirve subsets por unicode-range,
 * por eso hay que pedir el texto concreto antes de comprobar).
 */
function waitForIconFonts() {
    const fonts = document.fonts;
    const text = collectIconText() + ICON_PROBE_WORD;
    // `fonts.load()` solo ADELANTA la descarga del glifo concreto; no es la
    // condición. La señal autorizativa es el probe pintado y se espera SIN
    // límite de tiempo mientras la fuente siga pendiente (iconFontPending).
    // Solo si la fuente FALLÓ de forma definitiva se deja de esperar.
    try {
        if (fonts && fonts.load) {
            const load = fonts.load(FONT_FACE, text);
            if (load && typeof load.catch === 'function') {
                load.catch(function () { /* el probe decide */ });
            }
        }
    } catch (e) { /* el probe decide */ }
    waitUntilIconsPainted().then(function () {
        fontsReady = true;
        tryFinish();
    });
}

function collectIconText() {
    const spans = document.querySelectorAll('.material-symbols-rounded');
    let text = '';
    for (let i = 0; i < spans.length; i++) {
        const t = (spans[i].textContent || '').trim();
        if (t) text += t;
    }
    return text || 'school';
}

// ── API pública para las vistas ────────────────────────────────────────────
// Retener el loader: la vista cargará datos por fetch y avisará cuando estén.
window.__appLoaderHold = function () {
    holdData = true;
};
// Liberar el loader: los datos ya se pintaron (junto a la fuente lista).
window.__appLoaderDataReady = function () {
    dataReady = true;
    tryFinish();
};
// Ocultar el loader de inmediato (uso manual / tests).
window.__appLoaderHide = finish;

// Precarga de la fuente base en paralelo con el arranque de la página.
if (document.fonts && document.fonts.load) {
    document.fonts.load(FONT_FACE).catch(function () { /* silencioso */ });
}

// Señal de "datos listos" para las vistas SIN carga de datos por fetch.
// Si la vista pidió hold (carga datos por fetch), ignoramos `load` y esperamos
// su señal explícita __appLoaderDataReady(); así no revelamos la página con el
// contenido a medio pintar.
window.addEventListener('load', function () {
    if (holdData) return;
    dataReady = true;
    tryFinish();
});

function boot() {
    waitForIconFonts();
    // Timeout duro global: nunca dejar la página colgada tras el overlay, pero
    // solo revela el loader una vez que la fuente de iconos y los datos ya
    // están listos (lo mismo que `tryFinish`). Si se acaba el límite rápido y
    // aún no lo están (fuente lenta), seguimos esperando.
    fallbackTimer = setTimeout(function () {
        if (fontsReady && dataReady) {
            finish();
        }
    }, HARD_TIMEOUT_MS);
    // Última garantía (p. ej. los datos nunca avisan): tras ~28 s se libera el
    // overlay, PERO nunca mientras la fuente de iconos siga pendiente: en ese
    // caso se reintenta cada segundo. El tiempo no autoriza ocultar con la
    // fuente descargándose.
    setTimeout(function lastResort() {
        const loader = document.getElementById('app-loader');
        if (!loader || !loader.classList.contains('is-active')) return;
        if (iconFontPending() && !iconsArePainted()) {
            setTimeout(lastResort, 1000);
            return;
        }
        finish();
    }, HARD_TIMEOUT_MS + 20000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
