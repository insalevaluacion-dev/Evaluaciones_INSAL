// ═══════════════════════════════════════════════════════════════
// MÓDULO: Utilidades de texto
// ───────────────────────────────────────────────────────────────
// Helpers para redactar mensajes al usuario con la cantidad y el
// plural correctamente concordados, evitando el feo "proyecto(s)".
// ═══════════════════════════════════════════════════════════════

/**
 * Elige la forma correcta de una palabra según la cantidad.
 * @param {number} cantidad
 * @param {string} singular  Forma para 1 (ej. 'proyecto')
 * @param {string} pluralForma  Forma para 0 o 2+ (ej. 'proyectos')
 * @returns {string}
 */
export function plural(cantidad, singular, pluralForma) {
    return Number(cantidad) === 1 ? singular : pluralForma;
}

/**
 * Sustantivo ya concordado con su número: "1 proyecto" / "3 proyectos".
 * @param {number} cantidad
 * @param {string} singular
 * @param {string} pluralForma
 * @returns {string}
 */
export function contar(cantidad, singular, pluralForma) {
    return `${cantidad} ${plural(cantidad, singular, pluralForma)}`;
}
