import { createSubmitHandler } from './submitHandler.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Si venimos de /resumen tras confirmar la nota, mostramos el toast de
    // confirmación aquí (la navegación recarga la página, por eso no se puede
    // mostrar desde resumen.js). Se limpia el query param de la URL.
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('nota') === 'confirmada') {
            if (typeof window.mostrarNotificacion === 'function') {
                window.mostrarNotificacion('Nota registrada y confirmada correctamente', 'bien');
            }
            params.delete('nota');
            const nuevaUrl = window.location.pathname +
                (params.toString() ? '?' + params.toString() : '') +
                window.location.hash;
            window.history.replaceState(null, '', nuevaUrl);
        }
    } catch (err) {
        console.error('Error al mostrar la notificación de nota confirmada:', err);
    }

    const selectTipo = document.getElementById('tipo-evaluacion');
    const selectAño = document.getElementById('año');
    const labelAño = document.getElementById('label-año');
    const selectNombre = document.getElementById('nombre');
    const selectSeccion = document.getElementById('seccion');
    const botonBuscar = document.getElementById('buscar-proyectos');
    const modalProyectos = document.getElementById('modal-proyectos');
    const contenedorProyectos = document.getElementById('contenedor-proyectos');
    contenedorProyectos.addEventListener('click', (event) => {
        const button = event.target instanceof Element
            ? event.target.closest('[data-proyecto-id]')
            : null;
        if (!button || !contenedorProyectos.contains(button)) return;
        guardarProyecto(button.dataset.proyectoId, button.dataset.proyectoNombre, button);
    });

    // El value del tipo de evaluación es el nivel_id de evaluaciones.niveles
    // (cada nivel es a la vez evento y su rúbrica, relación 1:1).
    const nivelSeleccionado = () => selectTipo.value;

    /**
     * Si el select tiene una sola opción real, la elige y avisa con change.
     * El custom-select solo refresca el botón al oír change; asignar .value
     * deja el texto en el placeholder.
     */
    function seleccionarSiUnica(select) {
        const reales = [...select.options].filter((o) => o.value !== '' && !o.hidden);
        if (reales.length !== 1) return;
        select.disabled = false;
        if (select.value !== reales[0].value) select.value = reales[0].value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        const texto = reales[0].textContent.trim();
        const avisos = {
            año: `Solo hay un año disponible: ${texto}. Se seleccionó automáticamente.`,
            nombre: `Solo hay un grado disponible: ${texto}. Se seleccionó automáticamente.`,
            seccion: `Solo hay una sección disponible: ${texto}. Se seleccionó automáticamente.`,
        };
        mostrarNotificacion(
            avisos[select.id] || `Solo hay una opción disponible: ${texto}. Se seleccionó automáticamente.`,
            'info',
        );
    }

    selectTipo.addEventListener('change', async () => {
        const numNivel = nivelSeleccionado();
        selectAño.disabled = true;
        selectNombre.disabled = true;
        selectSeccion.disabled = true;
        selectAño.innerHTML = '<option value="" hidden>Seleccione un año</option>';
        selectNombre.innerHTML = '<option value="" hidden>Seleccione un grado</option>';
        selectSeccion.innerHTML = '<option value="" hidden>Seleccione una sección</option>';
        botonBuscar.disabled = true;

        if (!numNivel) return;

        const respuestaNivel = await fetch('/guardar-nivel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numNivel })
        });
        const nivelData = await respuestaNivel.json();
        console.log('Respuesta /guardar-nivel:', nivelData);

        // El selector de año (año de estudio: 1er/2do/3er año) es siempre
        // visible e independiente: se llena con los años que tienen
        // proyectos para el nivel elegido. Con un solo año se auto-selecciona
        // (pero sigue visible) para ahorrar un clic.
        customSelectSetLoading('año', true);
        try {
            const respuestaAños = await fetch(`/grados/anos/${numNivel}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const añosData = await respuestaAños.json();
            console.log('Respuesta /grados/anos:', añosData);
            const años = añosData.años || [];

            if (años.length > 0) {
                // años: [{ id, nombre }] con id = niveles_estudios_id
                años.forEach(({ id, nombre }) => {
                    const option = document.createElement('option');
                    option.value = id;
                    option.textContent = nombre;
                    selectAño.appendChild(option);
                });
                selectAño.disabled = false;
                seleccionarSiUnica(selectAño);
            } else {
                // Sin proyectos para este nivel: avisar y no avanzar
                mostrarNotificacion('No hay proyectos disponibles para este tipo de evaluación.', 'info');
            }
        } catch (err) {
            console.error('Error al cargar años:', err);
            mostrarNotificacion('Ocurrió un error al cargar los años. Por favor, inténtelo de nuevo.', 'error');
        } finally {
            customSelectSetLoading('año', false);
        }
    });

    selectAño.addEventListener('change', async () => {
        const numNivel = nivelSeleccionado();
        const año = selectAño.value;
        selectNombre.disabled = true;
        selectSeccion.disabled = true;
        selectNombre.innerHTML = '<option value="" hidden>Seleccione un grado</option>';
        selectSeccion.innerHTML = '<option value="" hidden>Seleccione una sección</option>';
        botonBuscar.disabled = true;

        if (!numNivel || !año) return;

        cargarNombres(numNivel, año);
    });

    async function cargarNombres(numNivel, año) {
        // Mostrar linear progress mientras se cargan los grados
        customSelectSetLoading('nombre', true);
        try {
            const respuestaNombres = await fetch(`/grados/nombres/${numNivel}/${encodeURIComponent(año)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const nombresData = await respuestaNombres.json();
            console.log('Respuesta /grados/nombres:', nombresData);
            if (nombresData.nombres?.length > 0) {
                nombresData.nombres.forEach(nombres => {
                    const option = document.createElement('option');
                    option.value = nombres.id;
                    option.textContent = nombres.label;
                    selectNombre.appendChild(option);
                });
                selectNombre.disabled = false;
                seleccionarSiUnica(selectNombre);
            }
        } finally {
            customSelectSetLoading('nombre', false);
        }
    }

    selectNombre.addEventListener('change', async () => {
        const numNivel = nivelSeleccionado();
        const año = selectAño.value;
        const nombre = selectNombre.value;
        selectSeccion.disabled = true;
        selectSeccion.innerHTML = '<option value="" hidden>Seleccione una sección</option>';
        botonBuscar.disabled = true;

        if (!numNivel || !año || !nombre) return;

        // Mostrar linear progress mientras se cargan las secciones
        customSelectSetLoading('seccion', true);
        try {
            const respuestaSecciones = await fetch(`/grados/secciones/${numNivel}/${encodeURIComponent(año)}/${encodeURIComponent(nombre)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const seccionesData = await respuestaSecciones.json();
            console.log('Respuesta /grados/secciones:', seccionesData);
            if (seccionesData.secciones?.length > 0) {
                seccionesData.secciones.forEach(seccion => {
                    const option = document.createElement('option');
                    option.value = seccion;
                    option.textContent = seccion;
                    selectSeccion.appendChild(option);
                });
                selectSeccion.disabled = false;
                seleccionarSiUnica(selectSeccion);
            }
        } finally {
            customSelectSetLoading('seccion', false);
        }
    });

    selectSeccion.addEventListener('change', () => {
        if (nivelSeleccionado() && selectAño.value && selectNombre.value && selectSeccion.value) {
            botonBuscar.disabled = false;
        }
    });

    createSubmitHandler(document.getElementById('formulario-filtros'), {
        onSubmit: async () => {
            const numNivel = nivelSeleccionado();
            const año = selectAño.value;
            const nombre = selectNombre.value;
            const seccion = selectSeccion.value;
            const respuestaProyectos = await fetch(`/proyectos/${numNivel}/${encodeURIComponent(año)}/${encodeURIComponent(nombre)}/${encodeURIComponent(seccion)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const proyectosData = await respuestaProyectos.json();
            console.log('Respuesta /proyectos:', proyectosData);
            if (!respuestaProyectos.ok) {
                throw new Error(proyectosData.message || 'No se pudieron buscar los proyectos.');
            }
            return { success: true, proyectos: proyectosData.proyectos || [] };
        },
        onSuccess: ({ proyectos }) => {
            contenedorProyectos.innerHTML = '';

            if (proyectos.length > 0) {
                const proyectosHTML = proyectos.map(proyecto => `
                <div class="grupo__element">
                    <p>${escapeHtml(proyecto.nombre)}</p>
                    <div class="principal__element--button">
                        <button type="button" class="btn centrar" data-ripple data-submit data-proyecto-id="${escapeHtml(proyecto.proyecto_id)}" data-proyecto-nombre="${escapeHtml(proyecto.nombre)}">
                            <div class="submit-states">
                                <div class="centrar gap-btn mostrar" data-normal-content>
                                    Evaluar
                                    <span class="material-symbols-rounded" aria-hidden="true">arrow_right_alt</span>
                                </div>
                                <div class="centrar gap-btn quitar" data-loading-content>
                                    Abriendo...
                                    <div class="boton-spinner" style="background: var(--font-color-important);">
                                        <svg class="svg-spinner girando" width="36" height="36" viewBox="0 0 36 36">
                                            <circle class="arco-pista" cx="18" cy="18" r="13" stroke="var(--spinner-pista)" />
                                            <circle class="arco-indicador indeterminado" cx="18" cy="18" r="13" stroke="var(--spinner-arco)" />
                                        </svg>
                                    </div>
                                </div>
                                <div class="centrar gap-btn quitar" data-success-content>
                                    <span class="material-symbols-rounded" aria-hidden="true">check_circle</span>
                                    <span>Listo</span>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            `).join('');

                contenedorProyectos.innerHTML = proyectosHTML;
                modalProyectos.style.display = 'block';
                void modalProyectos.offsetWidth;
                modalProyectos.classList.add('active');
            } else {
                contenedorProyectos.innerHTML = 'No hay proyectos disponibles para estos filtros.';
                modalProyectos.style.display = 'block';
                void modalProyectos.offsetWidth;
                modalProyectos.classList.add('active');
            }
        },
        onError: (error) => {
            console.error('Error al buscar proyectos:', error);
            mostrarNotificacion(error.message || 'No se pudieron buscar los proyectos.', 'error');
        },
    });
});

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character]);
}

async function guardarProyecto(idProyecto, nombreProyecto, button) {
    window.setButtonFeedbackState(button, 'loading');
    try {
        const response = await fetch('/guardar-proyecto', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idProyecto, nombreProyecto })
        });
        const result = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error(result?.mensaje || result?.message || 'Ocurrió un error al guardar el proyecto.');
        }
        window.setButtonFeedbackState(button, 'success', { resetAfter: false });
        setTimeout(() => {
            window.location.href = '/evaluacion';
        }, 300);
    } catch (error) {
        console.error('Error al guardar el proyecto:', error);
        mostrarNotificacion(error.message || 'Ocurrió un error al guardar el proyecto. Por favor, inténtelo de nuevo.', 'error');
        window.setButtonFeedbackState(button, 'normal');
    }
}

function cerrarModalProyectos() {
    const modal = document.getElementById('modal-proyectos');

    // Evitar cierres repetidos mientras la animación está en curso
    if (modal.classList.contains('cerrando')) return;
    modal.classList.add('cerrando');

    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('cerrando');
    }, 300);
}

window.guardarProyecto = guardarProyecto;
window.cerrarModalProyectos = cerrarModalProyectos;
