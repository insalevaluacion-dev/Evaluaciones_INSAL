/**
 * native-app.js — Comportamientos que CSS no resuelve por sí solo.
 *
 * Companion de native-app.css. CSS quita el resaltado azul, pero en
 * móvil quedan comportamientos que solo se controlan desde JS:
 *
 *   1. Menú de pulsación larga (callout) de iOS, que reaparece
 *      aunque se ponga -webkit-touch-callout: none.
 *   2. Zoom por pellizco (pinch-zoom) en iOS.
 *
 * El zoom por doble toque NO se intercepta aquí: ya queda cubierto
 * por `touch-action: manipulation` (CSS) y `user-scalable=no`
 * (meta viewport). Bloquearlo desde JS anularía también los dobles
 * toques legítimos, que en esta app son muy frecuentes (marcar dos
 * notas seguidas, por ejemplo).
 *
 * Criterios de diseño:
 *   • NO se hace preventDefault() sobre touchstart/touchmove: rompería
 *     el scroll de los paneles internos (evaluación, listas, select).
 *     El rebote de la página ya se corta con overscroll-behavior: none
 *     en native-app.css, por lo que no hace falta interceptarlo aquí.
 *   • Los listeners de scroll van en passive: true.
 *   • Se excluyen campos editables de las reglas de pulsación larga
 *     para no impedir seleccionar y copiar texto en un input.
 */

/** ¿El evento se originó dentro de un campo de texto editable? */
function esCampoEditable(target) {
    if (!target || !target.closest) return false;
    return !!target.closest(
        'input, textarea, [contenteditable="true"], [contenteditable=""], .texto-selectable, .seleccionable',
    );
}

/** ¿El dispositivo es táctil? Equivale a (hover: none). */
const esTactil = window.matchMedia?.('(hover: none)').matches ?? false;

if (esTactil) {
    /* ───────────────────────────────────────────────────────────────
       1. PULSACIÓN LARGA
       Un press largo sin mover el dedo dispara en iOS el menú
       contextual del sistema (Copiar/Pegar/Compartir) y, en algunos
       navegadores, la selección flotante de texto. Se suprime el
       contextmenu salvo en campos de texto, donde copiar/pegar sí
       es una acción útil y esperada.
       ─────────────────────────────────────────────────────────────── */
    document.addEventListener('contextmenu', (e) => {
        if (!esCampoEditable(e.target)) e.preventDefault();
    });

    /* ───────────────────────────────────────────────────────────────
       2. ZOOM POR PELLIZCO (iOS)
       Safari dispara gesturestart/change/end. Se cancela cuando el
       zoom de página está habilitado (escala mínima = 1). Si el
       usuario ya ha ampliado la página con las opciones de
       accesibilidad (escala mínima > 1), el gesto se respeta.
       ─────────────────────────────────────────────────────────────── */
    let bloquearZoom = false;

    document.addEventListener(
        'gesturestart',
        (e) => {
            const escalaMinima =
                parseFloat(
                    window
                        .getComputedStyle(document.documentElement)
                        .getPropertyValue('minimum-scale') || '1',
                ) || 1;
            bloquearZoom = escalaMinima <= 1;
            if (bloquearZoom) e.preventDefault();
        },
        { passive: false },
    );

    document.addEventListener(
        'gesturechange',
        (e) => {
            if (bloquearZoom) e.preventDefault();
        },
        { passive: false },
    );

    document.addEventListener(
        'gestureend',
        () => {
            bloquearZoom = false;
        },
        { passive: true },
    );
}

