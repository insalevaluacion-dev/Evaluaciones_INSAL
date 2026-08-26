document.addEventListener('DOMContentLoaded', async () => {
    const nombreProyectoElement = document.getElementById('nombre-proyecto');
    const modalAsistencia = document.getElementById('modal-asistencia');
    const listaEstudiantes = document.getElementById('lista-estudiantes');
    const formularioEvaluacion = document.getElementById('formulario-evaluacion');
    const contenedorCriterios = document.createElement('div');
    contenedorCriterios.classList.add('contenedor-criterios');
    formularioEvaluacion.appendChild(contenedorCriterios);

    const respuestaNivel = await fetch('/obtener-nivel', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const nivelData = await respuestaNivel.json();
    console.log('Respuesta /obtener-nivel:', nivelData);
    if (!nivelData.idProyecto || !nivelData.numNivel) {
        window.location.href = '/seleccion';
        return;
    }

    const proyectoId = nivelData.idProyecto;
    const numNivel = nivelData.numNivel;

    // Obtener y mostrar el nombre del proyecto
    const respuestaProyecto = await fetch(`/proyecto/${proyectoId}`);
    const proyectoData = await respuestaProyecto.json();
    nombreProyectoElement.textContent = proyectoData.nombre
        ? proyectoData.nombre
        : 'No disponible';

    const respuestaCriterios = await fetch('/criterios', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const criteriosData = await respuestaCriterios.json();
    console.log('Respuesta /criterios:', criteriosData);
    if (criteriosData.criterios?.length > 0) {
        contenedorCriterios.innerHTML = '<h4>Criterios de Evaluación</h4>';
        criteriosData.criterios.forEach(criterio => {
            const div = document.createElement('div');
            div.classList.add('criterio');
            div.innerHTML = `
            <div class="titulo__criterio" onclick="AbrirDescripcion(this)">
                ${criterio.nombre}
                <span class="material-symbols-rounded flecha">
                    stat_minus_1
                </span>
                <div><p>(${criterio.porcentaje}%)</p></div>
            </div>
            <p for="criterio-${criterio.criterio_id}" class="descripcion">
                ${criterio.descripcion} (${criterio.porcentaje}%):
            </p>
            <div class="campo-nota">
                <label for="criterio-${criterio.criterio_id}" class="campo-nota__label">
                    Nota asignada <span class="requerido">*</span>
                </label>
                <div class="campo-nota__input-wrap">
                    <input
                        type="number"
                        id="criterio-${criterio.criterio_id}"
                        name="criterio-${criterio.criterio_id}"
                        min="1.0"
                        max="10.0"
                        step="0.1"
                        required
                        inputmode="decimal"
                        placeholder="0.0"
                        class="campo-nota__input"
                    >
                </div>
                <p class="campo-nota__supporting">La calificación debe ser entre 1.0 y 10.0 puntos (un decimal)</p>
            </div>
            `;
            contenedorCriterios.appendChild(div);
        });
        const submitButton = document.createElement('button');
        submitButton.classList.add('btn');
        submitButton.classList.add('centrar');
        submitButton.type = 'button';
        submitButton.id = 'boton-enviar';
        submitButton.innerHTML = `
            <div class="centrar gap-btn" id="mensaje1-enviar">
                <p>Enviando...</p>
                <div class="boton-spinner" style="background: var(--font-color-important);">
                    <svg class="svg-spinner girando" width="36" height="36" viewBox="0 0 36 36">
                        <circle class="arco-pista" cx="18" cy="18" r="13" stroke="var(--spinner-pista)" />
                        <circle class="arco-indicador indeterminado" cx="18" cy="18" r="13" stroke="var(--spinner-arco)" />
                    </svg>
                </div>
            </div>
            <div class="centrar gap-btn" id="mensaje2-enviar">
                Enviar evaluación
                <span class="material-symbols-rounded">send</span>
            </div>
        `;
        submitButton.onclick = () => guardarEvaluacion();
        contenedorCriterios.appendChild(submitButton);
    } else {
        contenedorCriterios.innerHTML = '<p>No hay criterios disponibles para este nivel.</p>';
    }

    // ------------------------------------------------------------------
    // AUTOLLENADO DE NOTAS PREVIAS
    // ------------------------------------------------------------------
    // `nivelData.evaluacionId` = req.session.evaluacionId, es decir, la
    // evaluación que guardó EL MISMO evaluador actual para este proyecto.
    //
    // Esto NO rompe el sistema de "3 evaluaciones para la nota final":
    //   - La nota final = promedio de 3 evaluaciones de 3 evaluadores DISTINTOS.
    //   - En /guardar-evaluacion, antes de insertar, se BORRA la evaluación
    //     previa del mismo evaluador (mismo evaluador_id + proyecto_id) y se
    //     reemplaza por la nueva.
    //   - Por eso el COUNT(*) del proyecto NO aumenta al re-guardar la propia
    //     evaluación: la fila del evaluador se sobrescribe, no se duplica.
    //
    // Este bloque solo es una comodidad para que el evaluador no vuelva a
    // teclear sus notas si regresa a la vista; el promedio final se calcula
    // con evaluaciones de evaluadores distintos.
    // ------------------------------------------------------------------
    if (nivelData.evaluacionId) {
        try {
            const respuestaPrev = await fetch(`/evaluacion-criterios/${nivelData.evaluacionId}`);
            const prevData = await respuestaPrev.json();
            console.log('Evaluación previa /evaluacion-criterios:', prevData);
            prevData.criterios?.forEach(c => {
                const input = document.getElementById(`criterio-${c.criterio_id}`);
                if (input && c.puntuacion != null) {
                    input.value = c.puntuacion;
                }
            });
        } catch (err) {
            console.error('Error al recuperar la evaluación previa:', err);
        }
    }

    const respuestaEstudiantes = await fetch(`/estudiantes/${proyectoId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const estudiantesData = await respuestaEstudiantes.json();
    console.log('Respuesta /estudiantes:', estudiantesData);

    const estudiantes = Array.isArray(estudiantesData.estudiantes)
        ? estudiantesData.estudiantes
        : [];

    if (estudiantes.length > 0) {
        estudiantes.forEach(estudiante => {
            const li = document.createElement('li');
            li.innerHTML = `
                <label class="estudiante-checkbox">
                    <md-checkbox 
                        name="estudiante" 
                        value="${estudiante.estudiante_id}"
                        touch-target="wrapper">
                    </md-checkbox>
                    <span class="estudiante-checkbox__nombre">${estudiante.nombre}</span>
                </label>
            `;
            listaEstudiantes.appendChild(li);
        });
        modalAsistencia.style.display = 'flex';
        void modalAsistencia.offsetWidth;
        modalAsistencia.classList.add('active');
    } else {
        modalAsistencia.style.display = 'none';
        console.log('No hay estudiantes disponibles o las asistencias ya están completas.');
    }
});

// Evitar que la rueda del mouse cambie el valor de los campos numéricos
document.addEventListener('wheel', (e) => {
    if (e.target.matches('.campo-nota__input')) {
        e.preventDefault();
    }
}, { passive: false });

function setGuardarAsistenciaFeedback(loading) {
    const btn = document.getElementById('boton-guardar-asistencia');
    if (!btn) return;
    btn.classList.toggle('cargando', loading);
    btn.disabled = loading;
}

function guardarAsistencia() {
    const checkboxes = document.querySelectorAll('#formulario-asistencia md-checkbox[name="estudiante"]');
    const estudianteIds = Array.from(checkboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => Number(checkbox.value));

    if (estudianteIds.length === 0) {
        mostrarNotificacion('Selecciona al menos un estudiante presente', 'error');
        return;
    }

    setGuardarAsistenciaFeedback(true);

    fetch('/guardar-asistencia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estudianteIds })
    })
        .then(async response => {
            const data = await response.json();
            console.log('Respuesta /guardar-asistencia:', data);
            if (!response.ok) {
                console.error('Error al guardar asistencia:', data.mensaje);
                mostrarNotificacion(data.mensaje || 'Error al guardar la asistencia', 'error');
                setGuardarAsistenciaFeedback(false);
                return;
            }
            mostrarNotificacion('Asistencia guardada correctamente', 'bien');
            cerrarModalAsistencia();
        })
        .catch(err => {
            console.error('Error al guardar asistencia:', err);
            mostrarNotificacion('Error al guardar la asistencia', 'error');
            setGuardarAsistenciaFeedback(false);
        });
}

function cerrarModalAsistencia() {
    const modal = document.getElementById('modal-asistencia');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function setBotonEnviarFeedback(loading) {
    const btn = document.getElementById('boton-enviar');
    if (!btn) return;
    btn.classList.toggle('cargando', loading);
    btn.disabled = loading;
}

function guardarEvaluacion() {
    const criteriosInputs = document.querySelectorAll('#formulario-evaluacion input[name^="criterio-"]');
    const evaluaciones = [];

    setBotonEnviarFeedback(true);

    fetch('/criterios', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(criteriosData => {
            if (!criteriosData.criterios?.length) {
                setBotonEnviarFeedback(false);
                return;
            }

            let totalPuntuacion = 0;
            let valid = true;

            let firstInvalidField = null;
            criteriosInputs.forEach(input => {
                const criterioId = Number(input.id.replace('criterio-', ''));
                const puntuacion = Number(input.value);
                const isEmpty = !input.value || input.value.trim() === '';
                const isOutOfRange = !isEmpty && (puntuacion < 1 || puntuacion > 10);
                const hasValidDecimals = /^\d+(\.\d{0,1})?$/.test(input.value);
                const isInvalid = isEmpty || isOutOfRange || isNaN(puntuacion) || !hasValidDecimals;

                const campo = input.closest('.campo-nota');
                const supporting = campo.querySelector('.campo-nota__supporting');

                if (isInvalid) {
                    valid = false;
                    campo.classList.add('error');

                    // Guardar la primera ocurrencia de cualquier error
                    if (!firstInvalidField) {
                        firstInvalidField = input;
                        // Establecer el mensaje de error apropiado
                        let msg = "Por favor, revise este campo";
                        if (isEmpty) {
                            msg = "Este campo es requerido";
                        } else if (isOutOfRange) {
                            msg = "La calificación debe estar entre 1.0 y 10.0";
                        } else if (!hasValidDecimals) {
                            msg = "Solo se permite un decimal";
                        }
                        supporting.textContent = msg;
                    }
                    return;
                }
                campo.classList.remove('error');
                supporting.textContent = "La calificación debe ser entre 1.0 y 10.0 puntos (un decimal)";

                evaluaciones.push({ criterio_id: criterioId, puntuacion });
                const criterio = criteriosData.criterios.find(c => c.criterio_id === criterioId);
                if (criterio) {
                    totalPuntuacion += (puntuacion * criterio.porcentaje / 100);
                }
            });

            if (!valid || evaluaciones.length === 0) {
                setBotonEnviarFeedback(false);
                if (firstInvalidField) {
                    firstInvalidField.focus();
                    firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
                return;
            }

            totalPuntuacion = totalPuntuacion > 10 ? 10 : totalPuntuacion;

            fetch('/guardar-evaluacion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ evaluaciones, totalPuntuacion })
            })
                .then(async response => {
                    const data = await response.json();
                    console.log('Respuesta /guardar-evaluacion:', data);
                    if (!response.ok) {
                        console.error('Error al guardar evaluación:', data.mensaje);
                        mostrarNotificacion(data.mensaje || 'Error al guardar la evaluación', 'error');
                        setBotonEnviarFeedback(false);
                        return;
                    }
                    mostrarNotificacion('Evaluación guardada correctamente', 'bien');
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    }
                });
        });
}

function limpiarSeleccion() {
    const botonRegresar = document.getElementById('boton-regresar');
    if (botonRegresar) {
        botonRegresar.classList.add('cargando');
        botonRegresar.disabled = true;
    }

    fetch('/limpiar-sesion', {
        method: 'POST'
    })
        .then(async response => {
            const data = await response.json();
            console.log('Sesión limpiada:', data);
            if (!response.ok) {
                console.error('Error al limpiar la sesión:', data.mensaje);
                mostrarNotificacion(data.mensaje || 'Error al limpiar la sesión', 'error');
                if (botonRegresar) {
                    botonRegresar.classList.remove('cargando');
                    botonRegresar.disabled = false;
                }
                return;
            }
            window.location.href = 'seleccion';
        });
}
