// ═══════════════════════════════════════════════════════════════
// MÓDULO: Permisos del usuario en la interfaz
// ───────────────────────────────────────────────────────────────
// app.js es la única autoridad: aquí solo se LEE el mapa de permisos que la
// vista (menu.ejs) deja en <body data-permisos="…"> para ocultar las acciones
// que el rol del usuario no puede ejecutar —p. ej. tocar las rúbricas cuando es
// docente-orientador (solo lectura)—. Si un usuario fuerza la interfaz, el
// servidor sigue respondiendo 403.
// ═══════════════════════════════════════════════════════════════

const SIN_PERMISOS = Object.freeze({
    rolId: null,
    gestionarMaestros: false,
    gestionarOrientadores: false,
    consultarOrientadores: false,
    accesoTotalGrados: false,
    gestionarRubricas: false,
    gestionarProyectos: false,
    eliminarProyectos: false,
});

function leerPermisos() {
    const bruto = document.body?.dataset?.permisos;
    if (!bruto) {
        // El mapa llega siempre con la página del panel; si falta, se asume el
        // escenario más restrictivo (no se muestran acciones de escritura).
        console.warn('permisos.js: <body data-permisos> no encontrado; se asume rol sin permisos');
        return { ...SIN_PERMISOS };
    }
    try {
        return { ...SIN_PERMISOS, ...JSON.parse(bruto) };
    } catch (err) {
        console.error('permisos.js: no se pudo leer el mapa de permisos', err);
        return { ...SIN_PERMISOS };
    }
}

const permisos = leerPermisos();

/** Mapa completo de permisos del usuario autenticado. */
export function getPermisos() {
    return permisos;
}

/** true si el usuario puede crear/editar/eliminar rúbricas, criterios y niveles. */
export function puedeEditarRubricas() {
    return permisos.gestionarRubricas === true;
}

/** true si el usuario ve todos los grados (Dirección y Administración). */
export function tieneAccesoTotalGrados() {
    return permisos.accesoTotalGrados === true;
}

/** true si el usuario puede eliminar proyectos (Dirección y Administración). */
export function puedeEliminarProyectos() {
    return permisos.eliminarProyectos === true;
}
