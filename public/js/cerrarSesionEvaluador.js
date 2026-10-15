/**
 * cerrarSesionEvaluador.js
 * -----------------------------------------------------------------------------
 * Cierre de sesiÃ³n del evaluador. Solo se carga en /seleccion, donde el perfil
 * (nombre y correo) ya incluye el botÃ³n Salir. EvaluaciÃ³n y resumen no lo usan.
 *
 * window.cerrarSesionEvaluador() llama a /auth/logout (destruye la sesiÃ³n en el
 * servidor, incluida la de connect-pg-simple) y lleva a /login.
 */
(() => {
    window.cerrarSesionEvaluador = async function () {
        try {
            await fetch('/auth/logout', { method: 'POST' });
        } catch (err) {
            console.error('Error al cerrar sesiÃ³n del evaluador:', err);
        } finally {
            window.location.href = '/registrarse';
        }
    };

    function enlazarBoton() {
        const boton = document.getElementById('btn-cerrar-sesion-evaluador');
        const dialogo = document.getElementById('dialogo-cerrar-sesion');
        const cancelar = dialogo?.querySelector('[data-cerrar-sesion-cancelar]');
        const confirmar = dialogo?.querySelector('[data-cerrar-sesion-confirmar]');
        if (!boton || !dialogo || !cancelar || !confirmar) return;

        boton.addEventListener('click', () => dialogo.showModal());
        cancelar.addEventListener('click', () => dialogo.close());
        confirmar.addEventListener('click', () => {
            dialogo.close();
            window.cerrarSesionEvaluador();
        });

        dialogo.addEventListener('click', (event) => {
            if (event.target === dialogo) dialogo.close();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enlazarBoton);
    } else {
        enlazarBoton();
    }
})();
