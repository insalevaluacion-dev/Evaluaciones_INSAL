/**
 * Ripple Effect — Versión con event delegation
 * 
 * El listener se registra una sola vez en `document` (capturando en fase de
 * burbuja). Esto resuelve el problema de los <dialog> modales, donde los
 * listeners en elementos hijos dentro del top-layer no siempre reciben los
 * eventos del mouse. Con delegación, el `mousedown` viaja hasta `document`
 * y allí se busca el ancestro más cercano con [data-ripple].
 */

// Referencia al último elemento que recibió un ripple (para limpiar ondas
// anteriores al hacer click en otro botón).
let lastRippleElement = null;
const createRipple = (element, e) => {
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    const ripple = document.createElement('span');
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    ripple.classList.add('ripple');

    // Limpiar ondas anteriores si el usuario hace click muy rápido
    const prevRipple = element.querySelector('.ripple');
    if (prevRipple) prevRipple.remove();

    element.appendChild(ripple);

    ripple.addEventListener('animationend', () => {
        ripple.remove();
    });
};

// Listener único con delegación: captura todos los mousedown en la página.
// Usamos capture: true porque los <dialog> modales (showModal) crean un
// "top-layer" que puede evitar que los eventos burbujeen hasta document.
// En fase de captura, el evento viaja desde el documento hacia el target,
// por lo que siempre llega a nuestro listener.
document.addEventListener('mousedown', (e) => {
    // Durante capture, e.target puede ser un nodo sin .closest (Text node)
    // o document mismo. Usar composedPath() para obtener el target real.
    const path = e.composedPath();
    let target = null;

    for (const node of path) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        if (node.hasAttribute && node.hasAttribute('data-ripple')) {
            target = node;
            break;
        }
        // Usar closest solo si el nodo es un Element válido
        if (node.closest) {
            const closest = node.closest('[data-ripple]');
            if (closest) {
                target = closest;
                break;
            }
        }
    }

    if (!target) return;

    // Limpiar ripple del elemento anterior que tenía data-ripple activo
    // Esto evita que se acumulen ripples cuando se hace click rápidamente
    // en diferentes botones (p. ej: abrir menú → click en Editar).
    if (lastRippleElement && lastRippleElement !== target) {
        const oldRipple = lastRippleElement.querySelector('.ripple');
        if (oldRipple) oldRipple.remove();
        lastRippleElement.classList.remove('ripple-container');
    }
    lastRippleElement = target;

    // Limpiar ripple previo en el mismo elemento
    const prevRipple = target.querySelector('.ripple');
    if (prevRipple) prevRipple.remove();

    // Idempotente: marcar como ripple-container (para CSS)
    if (!target.classList.contains('ripple-container')) {
        target.classList.add('ripple-container');
    }

    createRipple(target, e);
}, true);

// Función mantenida por compatibilidad con código que llame a addRippleEffect directamente
export function addRippleEffect(element) {
    if (element.classList.contains('ripple-container')) return;
    element.classList.add('ripple-container');
}