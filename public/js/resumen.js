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
        if (botonCalificar) {
            botonCalificar.classList.remove('cargando');
            botonCalificar.disabled = false;
        }
    };

    if (botonCalificar) {
        botonCalificar.classList.add('cargando');
        botonCalificar.disabled = true;
    }

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
                    }
                    restaurarBoton();
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
    window.location.href = '/seleccion';
}

function volverEvaluacion() {
    const botonRegresar = document.getElementById('boton-regresar');
    if (botonRegresar) {
        botonRegresar.classList.add('cargando');
        botonRegresar.disabled = true;
    }

    window.location.href = '/evaluacion';
}
