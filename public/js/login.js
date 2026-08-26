import { mostrarNotificacion } from './notificaciones.js';

// Validación personalizada del formulario de login (maestro)
const form = document.getElementById('form-registrar');
const nombreInput = document.getElementById('nombre');
const contraseñaInput = document.getElementById('contraseña');
const errorNombre = document.getElementById('error-nombre');
const errorContraseña = document.getElementById('error-contraseña');
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

// Eventos de validación en tiempo real
nombreInput.addEventListener('blur', () => {
    validarCampo(nombreInput, errorNombre, 'nombre');
});

contraseñaInput.addEventListener('blur', () => {
    validarCampo(contraseñaInput, errorContraseña, 'contraseña');
});

// Toggle de revelar contraseña
const toggleContraseña = document.getElementById('toggle-contraseña');
if (toggleContraseña) {
    toggleContraseña.addEventListener('click', () => {
        if (contraseñaInput.type === 'password') {
            contraseñaInput.type = 'text';
            toggleContraseña.innerHTML = '<span class="material-symbols-rounded">visibility</span>';
        } else {
            contraseñaInput.type = 'password';
            toggleContraseña.innerHTML = '<span class="material-symbols-rounded">visibility_off</span>';
        }
    });
}

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

contraseñaInput.addEventListener('input', () => {
    if (contraseñaInput.value.trim()) {
        contraseñaInput.classList.remove('error');
        if (errorContraseña.classList.contains('show')) {
            quitarError(errorContraseña);
        }
    }
});

// Envío del formulario al servidor (login del maestro)
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validaciones
    const esNombreValido = validarCampo(nombreInput, errorNombre, 'nombre');
    const esContraseñaValida = validarCampo(contraseñaInput, errorContraseña, 'contraseña');

    if (!esNombreValido || !esContraseñaValida) {
        mostrarNotificacion('Por favor, rellena todos los campos correctamente.', 'error');
        return;
    }

    const nombre = nombreInput.value.trim();
    const contrasena = contraseñaInput.value.trim();

    // Mostrar spinner y deshabilitar el botón
    botonEnviar.classList.add('cargando');
    botonEnviar.disabled = true;

    try {
        const response = await fetch('/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, contrasena }),
        });

        const data = await response.json().catch(() => ({}));
        console.log("Respuesta del servidor:", data);

        if (response.ok) {
            window.location.href = '/menu';
            return;
        }

        mostrarNotificacion(data.mensaje || 'Credenciales incorrectas', 'error');
    } catch (err) {
        console.error('Error al iniciar sesión:', err);
        mostrarNotificacion('Error de conexión con el servidor', 'error');
    } finally {
        // Restaurar el botón
        botonEnviar.classList.remove('cargando');
        botonEnviar.disabled = false;
    }
});
