// El atrás del celular (y el del navegador) dispara popstate. Se deja una
// marca en el historial para interceptarlo y mostrar el aviso antes de salir
// sin confirmar la nota.
let salidaPermitida = false;
let avisoAtrasListo = false;

function instalarAvisoAtras() {
    if (avisoAtrasListo) return;
    avisoAtrasListo = true;
    if (history.state?.avisoNota !== true) {
        history.pushState({ avisoNota: true }, '', location.href);
    }
    window.addEventListener('popstate', alPulsarAtras);
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted || salidaPermitida) return;
        if (history.state?.avisoNota !== true) {
            history.pushState({ avisoNota: true }, '', location.href);
        }
    });
}

function alPulsarAtras() {
    if (salidaPermitida) return;
    // El atrás ya consumió la marca. Se vuelve a poner para que el
    // siguiente también pase por el aviso.
    history.pushState({ avisoNota: true }, '', location.href);
    const dialogo = document.getElementById('dialogo-nota-sin-confirmar');
    if (!dialogo || dialogo.classList.contains('closing')) return;
    if (dialogo.open) {
        cerrarAdvertenciaNota();
        return;
    }
    dialogo.showModal();
}

instalarAvisoAtras();

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

document.addEventListener('DOMContentLoaded', async () => {
    // Retiene el loader de marca hasta que los datos estén pintados (ver
    // app-loader.js). Evita revelar la vista con el contenido a medio cargar.
    if (typeof window.__appLoaderHold === 'function') window.__appLoaderHold();
    const listaCriterios = document.getElementById('lista-criterios');
    const modalNotaFinal = document.getElementById('modal-nota-final');
    const notaFinalElement = document.getElementById('nota-final');
    const botonConfirmar = document.getElementById('boton-confirmar');

    if (botonConfirmar) botonConfirmar.disabled = true;

    const respuestaNivel = await fetch('/obtener-nivel', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const nivelData = await respuestaNivel.json();
    console.log('Respuesta /obtener-nivel:', nivelData);
    if (!nivelData.evaluacionId) {
        salidaPermitida = true;
        window.location.replace('/seleccion');
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
            const idCriterio = escapeHtml(criterio.criterio_id);
            li.innerHTML = `
            <div class="titulo__criterio" onclick="AbrirDescripcion(this)">
                <span class="titulo__nombre">${escapeHtml(criterio.nombre)}</span>
                <span class="material-symbols-rounded flecha">
                    stat_minus_1
                </span>
                <div><p>(${escapeHtml(criterio.porcentaje)}%)</p></div>
            </div>
            <p for="criterio-${idCriterio}" class="descripcion">
                ${escapeHtml(criterio.descripcion)}
            </p>
            <div class="puntuacion"><p>Puntuación: ${escapeHtml(criterio.puntuacion)} p</p></div>
            `
            listaCriterios.appendChild(li);
        });
    } else {
        listaCriterios.innerHTML = '<p>No hay criterios evaluados.</p>';
    }

    // Datos pintados: libera el loader de marca (junto a la fuente lista).
    if (typeof window.__appLoaderDataReady === 'function') window.__appLoaderDataReady();
});

function mostrarNotaFinal() {
    const botonCalificar = document.getElementById('boton-calificar');
    const botonConfirmar = document.getElementById('boton-confirmar');
    const notaFinalElement = document.getElementById('nota-final');
    const restaurarBoton = () => {
        window.setButtonFeedbackState(botonCalificar, 'normal');
    };

    if (botonConfirmar) botonConfirmar.disabled = true;
    if (notaFinalElement) notaFinalElement.textContent = 'Calculando...';

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
                        notaFinalElement.textContent = `${notaFinal.toFixed(2)}`;
                        if (botonConfirmar) botonConfirmar.disabled = false;
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

let confirmacionEnCurso = false;

function confirmarEvaluacion() {
    if (confirmacionEnCurso) return;

    const botonConfirmar = document.getElementById('boton-confirmar');
    const notaFinalElement = document.getElementById('nota-final');
    if (!notaFinalElement?.textContent.trim() || botonConfirmar?.disabled) return;

    confirmacionEnCurso = true;
    if (botonConfirmar) {
        botonConfirmar.classList.add('cargando');
        botonConfirmar.disabled = true;
        botonConfirmar.setAttribute('aria-busy', 'true');
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
            salidaPermitida = true;
            window.location.href = data.redirect || '/seleccion';
        })
        .catch(err => {
            console.error('Error al confirmar la evaluación:', err);
            mostrarNotificacion(err.message || 'Error al confirmar la evaluación', 'error');
            if (botonConfirmar) {
                botonConfirmar.classList.remove('cargando');
                botonConfirmar.disabled = false;
                botonConfirmar.setAttribute('aria-busy', 'false');
            }
            confirmacionEnCurso = false;
        });
}

function volverEvaluacion() {
    const dialogo = document.getElementById('dialogo-nota-sin-confirmar');
    if (!dialogo) {
        irAEvaluacion();
        return;
    }
    if (dialogo.open) return;
    dialogo.showModal();
}

function cerrarAdvertenciaNota() {
    const dialogo = document.getElementById('dialogo-nota-sin-confirmar');
    if (!dialogo?.open || dialogo.classList.contains('closing')) return;

    dialogo.classList.add('closing');
    let cerrado = false;
    const terminar = () => {
        if (cerrado) return;
        cerrado = true;
        clearTimeout(fallback);
        dialogo.removeEventListener('animationend', alTerminarAnimacion);
        dialogo.classList.remove('closing');
        if (dialogo.open) dialogo.close();
    };
    const alTerminarAnimacion = (event) => {
        if (event.target !== dialogo || event.animationName !== 'shrinkOut') return;
        terminar();
    };
    const fallback = setTimeout(terminar, 400);
    dialogo.addEventListener('animationend', alTerminarAnimacion);
}

function confirmarSalidaSinNota() {
    cerrarAdvertenciaNota();
    irAEvaluacion();
}

function irAEvaluacion() {
    salidaPermitida = true;
    const botonRegresar = document.getElementById('boton-regresar');
    window.setButtonFeedbackState(botonRegresar, 'loading');
    setTimeout(() => {
        window.setButtonFeedbackState(botonRegresar, 'success', { resetAfter: false });
        setTimeout(() => {
            window.location.href = '/evaluacion';
        }, 300);
    }, 200);
}

document.addEventListener('click', (event) => {
    const dialogo = document.getElementById('dialogo-nota-sin-confirmar');
    if (dialogo?.open && event.target === dialogo) cerrarAdvertenciaNota();
});
