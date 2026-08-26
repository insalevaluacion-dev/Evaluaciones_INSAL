import { mostrarNotificacion } from './notificaciones.js';

// ============================================================
//  CONFIGURACIÓN RÁPIDA
// ============================================================
// Cambia SOLO_CORREOS_INSTITUCIONALES a false para permitir
// cualquier correo (desactiva la restricción del dominio).
const SOLO_CORREOS_INSTITUCIONALES = true;
const DOMINIO_INSTITUCIONAL = '@clases.edu.sv';
// ============================================================

// Validación personalizada del formulario de login
const form = document.getElementById('form-registrar');
const nombreInput = document.getElementById('nombre');
const correoInput = document.getElementById('correo');
const errorNombre = document.getElementById('error-nombre');
const errorCorreo = document.getElementById('error-correo');
const botonEnviar = document.getElementById('botonEnviar');

/**
 * Valida que un campo no esté vacío
 */
function validarCampo(input, errorSpan, nombreCampo) {
    if (!input.value.trim()) {
        input.classList.add('error');
        errorSpan.textContent = `Rellena este campo de ${nombreCampo}`;
        errorSpan.classList.add('show');
        return false;
    } else {
        input.classList.remove('error');
        errorSpan.textContent = '';
        errorSpan.classList.remove('show');
        return true;
    }
}

/**
 * Valida el formato del email (si es necesario)
 */
function validarEmail(email) {
    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regexEmail.test(email);
}

/**
 * Valida que el correo termine con el dominio institucional.
 * Se omite automáticamente si SOLO_CORREOS_INSTITUCIONALES está desactivado.
 */
function validarDominioInstitucional(email) {
    if (!SOLO_CORREOS_INSTITUCIONALES) return true;
    return email.toLowerCase().endsWith(DOMINIO_INSTITUCIONAL.toLowerCase());
}

// Eventos de validación en tiempo real
nombreInput.addEventListener('blur', () => {
    validarCampo(nombreInput, errorNombre, 'nombre');
});

correoInput.addEventListener('blur', () => {
    validarCampo(correoInput, errorCorreo, 'correo');
});

/**
 * Quita el error con animación de salida
 */
function quitarError(errorSpan) {
    errorSpan.classList.add('hide');
    setTimeout(() => {
        errorSpan.classList.remove('show');
        errorSpan.classList.remove('hide');
        errorSpan.textContent = '';
    }, 300); // Espera a que termine la animación de 0.3s
}

// Limpiar error cuando el usuario empieza a escribir
nombreInput.addEventListener('input', () => {
    if (nombreInput.value.trim()) {
        nombreInput.classList.remove('error');
        if (errorNombre.classList.contains('show')) {
            quitarError(errorNombre);
        }
    }
});

correoInput.addEventListener('input', () => {
    if (correoInput.value.trim()) {
        correoInput.classList.remove('error');
        if (errorCorreo.classList.contains('show')) {
            quitarError(errorCorreo);
        }
    }
});

// Envío del formulario al servidor (registro del evaluador)
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validaciones
    const esNombreValido = validarCampo(nombreInput, errorNombre, 'nombre');
    const esCorreoValido = validarCampo(correoInput, errorCorreo, 'correo');

    let esEmailValido = true;
    if (esCorreoValido && !validarEmail(correoInput.value.trim())) {
        correoInput.classList.add('error');
        errorCorreo.textContent = 'Ingresa un correo electrónico válido';
        errorCorreo.classList.add('show');
        esEmailValido = false;
    }

    // Restricción del dominio institucional (se omite si está desactivada)
    if (esEmailValido && !validarDominioInstitucional(correoInput.value.trim())) {
        correoInput.classList.add('error');
        errorCorreo.textContent = `Debes usar un correo ${DOMINIO_INSTITUCIONAL}`;
        errorCorreo.classList.add('show');
        esEmailValido = false;
    }

    if (!esNombreValido || !esCorreoValido || !esEmailValido) {
        mostrarNotificacion('Por favor, rellena todos los campos correctamente.', 'error');
        return;
    }

    const nombreEvaluador = nombreInput.value.trim();
    const email = correoInput.value.trim();

    // Mostrar spinner y deshabilitar el botón
    botonEnviar.classList.add('cargando');
    botonEnviar.disabled = true;

    try {
        const response = await fetch('/enviarEvaluador', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombreEvaluador, email }),
        });

        const data = await response.json().catch(() => ({}));
        console.log("Respuesta del servidor:", data);

        if (response.ok && data.redirect) {
            window.location.href = data.redirect;
            return;
        }

        if (!response.ok) {
            mostrarNotificacion(data.mensaje || 'Error al registrarte', 'error');
        } else {
            mostrarNotificacion(data.mensaje || 'Registro exitoso', 'bien');
        }
    } catch (err) {
        console.error('Error al registrarse:', err);
        mostrarNotificacion('Error de conexión con el servidor', 'error');
    } finally {
        // Restaurar el botón
        botonEnviar.classList.remove('cargando');
        botonEnviar.disabled = false;
    }
});
