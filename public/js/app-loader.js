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
 * Redes de seguridad para que NUNCA quede colgado: deadline de fuente (3 s) y
 * un timeout duro global (8 s). Además cada vista trae su propio `<script>`
 * inline de respaldo por si este módulo no llegara a ejecutarse.
 */

const FONT_FACE = '700 24px "Material Symbols Rounded"';
const ICON_PROBE_WORD = 'settings';
const ICON_GLYPH_MAX_PX = 48;

const HARD_TIMEOUT_MS = 8000;

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

function waitUntilIconsPainted(deadline) {
    return new Promise(function (resolve) {
        (function poll() {
            if (iconsArePainted() || Date.now() > deadline) {
                requestAnimationFrame(function () { resolve(); });
                return;
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
    // `fonts.load()` descarga el glifo concreto; `fonts.ready` confirma que la
    // fuente está lista. Ninguna de las dos es, por sí sola, la señal visual:
    // el glifo debe PINTARSE. Esperamos el probe con un deadline amplio y SOLO
    // entonces autorizamos `fontsReady`, de forma que el loader no se oculta
    // mientras la fuente (o el glifo) aún no se ha aplicado.
    const hasFontApi = !!(fonts && fonts.load);
    const fontDone = new Promise(function (resolve) {
        if (!hasFontApi) { resolve(); return; }
        let load;
        try {
            load = fonts.load(FONT_FACE, text);
        } catch (e) { resolve(); return; }
        if (load && typeof load.then === 'function') {
            load.then(function () {
                try {
                    if (typeof fonts.ready === 'undefined') { resolve(); }
                    else { fonts.ready.then(resolve, resolve); }
                } catch (e) { resolve(); }
            }).catch(function () { resolve(); });
        } else { resolve(); }
    });
    const DEADLINE = Date.now() + 8000;
    Promise.all([fontDone, waitUntilIconsPainted(DEADLINE)]).then(function () {
        // El probe es la señal autorizativa VISUAL: solo si el glifo ya se
        // pintó marco fontsReady. Si no pintó al vencer el deadline, NO
        // seguimos aquí: fontsReady sigue false y el loader no se oculta.
        if (iconsArePainted()) {
            fontsReady = true;
            tryFinish();
        }
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
    // Última garantía: si se pasan ~28 s y el overlay sigue activo, quitamos la
    // clase 'is-active' y revelamos los iconos para no dejar la aplicación
    // congelada. Esto solo se aplica tras un tiempo muy largo.
    setTimeout(function () {
        const loader = document.getElementById('app-loader');
        if (loader && loader.classList.contains('is-active')) {
            loader.classList.remove('is-active');
            markIconsReady();
        }
    }, HARD_TIMEOUT_MS + 20000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
} else {
    boot();
}
