document.addEventListener('DOMContentLoaded', async () => {
    const listaCriterios = document.getElementById('lista-criterios');
    const modalNotaFinal = document.getElementById('modal-nota-final');
    const notaFinalElement = document.getElementById('nota-final');

    const respuestaNivel = await fetch('/obtener-nivel', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const nivelData = await respuestaNivel.json();
    console.log('Respuesta /obtener-nivel:', nivelData);
    if (!nivelData.evaluacionId) {
        window.location.href = '/seleccion';
        return;
    }

    const evaluacionId = nivelData.evaluacionId;

    const respuestaCriterios = await fetch(`/evaluacion-criterios/${evaluacionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const criteriosData = await respuestaCriterios.json();
    console.log('Respuesta /evaluacion-criterios:', criteriosData);

    // Eliminar el spinner de carga una vez recibidos los datos
    const mensajeCarga = document.getElementById('mensaje-cargando');
    if (mensajeCarga) {
        mensajeCarga.remove();
    }

    if (criteriosData.criterios?.length > 0) {
        criteriosData.criterios.forEach(criterio => {
            const li = document.createElement('li');
            li.innerHTML = `
            <div class="titulo__criterio" onclick="AbrirDescripcion(this)">
                ${criterio.nombre}
                <span class="material-symbols-rounded flecha">
                    stat_minus_1
                </span>
                <div><p>(${criterio.porcentaje}%)</p></div>
            </div>
            <p for="criterio-${criterio.criterio_id}" class="descripcion">
                ${criterio.descripcion}
            </p>
            <div class="puntuacion"><p>Puntuación: ${criterio.puntuacion} p</p></div>
            `
            listaCriterios.appendChild(li);
        });
    } else {
        listaCriterios.innerHTML = '<p>No hay criterios evaluados.</p>';
    }
});

function mostrarNotaFinal() {
    const botonCalificar = document.getElementById('boton-calificar');
    const restaurarBoton = () => {
        window.setButtonFeedbackState(botonCalificar, 'normal');
    };

    window.setButtonFeedbackState(botonCalificar, 'loading');

    const modal = document.getElementById('modal-nota-final');
    modal.style.display = 'block';
    // Forzar un reflow para que la animación funcione
    void modal.offsetWidth;
    modal.classList.add('active');

    fetch('/obtener-nivel', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(nivelData => {
            if (!nivelData.evaluacionId) {
                restaurarBoton();
                return;
            }

            fetch(`/evaluacion-criterios/${nivelData.evaluacionId}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })
                .then(response => response.json())
                .then(criteriosData => {
                    if (criteriosData.criterios?.length > 0) {
                        let notaFinal = criteriosData.criterios.reduce((total, criterio) => {
                            return total + (criterio.puntuacion * criterio.porcentaje / 100);
                        }, 0);
                        notaFinal = notaFinal > 10 ? 10 : notaFinal;
                        document.getElementById('nota-final').textContent = `${notaFinal.toFixed(2)}`;
                        document.getElementById('modal-nota-final').style.display = 'block';
                        window.setButtonFeedbackState(botonCalificar, 'success');
                    } else {
                        restaurarBoton();
                    }
                })
                .catch(err => {
                    console.error('Error al calcular la nota final:', err);
                    mostrarNotificacion('Error al calcular la nota final', 'error');
                    restaurarBoton();
                });
        })
        .catch(err => {
            console.error('Error al obtener el nivel:', err);
            mostrarNotificacion('Error al obtener la evaluación', 'error');
            restaurarBoton();
        });
}

function cerrarModalNotaFinal() {
    const modal = document.getElementById('modal-nota-final');
    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

function confirmarEvaluacion() {
    const botonConfirmar = document.getElementById('boton-confirmar');
    if (botonConfirmar) {
        botonConfirmar.classList.add('cargando');
        botonConfirmar.disabled = true;
    }

    fetch('/confirmar-evaluacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json().then(data => ({ ok: response.ok, data })))
        .then(({ ok, data }) => {
            if (!ok) {
                throw new Error(data.mensaje || 'Error al confirmar la evaluación');
            }
            // La notificación de éxito se muestra al cargar /seleccion
            // (vía query param) porque esta navegación recarga la página
            // entera y cualquier toast creado aquí desaparecería al instante.
            window.location.href = data.redirect || '/seleccion';
        })
        .catch(err => {
            console.error('Error al confirmar la evaluación:', err);
            mostrarNotificacion(err.message || 'Error al confirmar la evaluación', 'error');
            if (botonConfirmar) {
                botonConfirmar.classList.remove('cargando');
                botonConfirmar.disabled = false;
            }
        });
}

function volverEvaluacion() {
    const botonRegresar = document.getElementById('boton-regresar');
    window.setButtonFeedbackState(botonRegresar, 'loading');
    setTimeout(() => {
        window.setButtonFeedbackState(botonRegresar, 'success', { resetAfter: false });
        setTimeout(() => {
            window.location.href = '/evaluacion';
        }, 300);
    }, 200);
}
