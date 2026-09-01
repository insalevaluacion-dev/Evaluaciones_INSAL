// ═══════════════════════════════════════════════════════════════
// MÓDULO: Edición de rúbrica — CRUD de criterios
// ───────────────────────────────────────────────────────────────
// Se ejecuta solo en la vista /menu/rubrica/:id (editor de criterios).
//  - "Añadir" agrega el criterio a la lista en pantalla (borrador local,
//    funciona aunque aún no haya backend para guardar).
//  - "Guardar" persiste todos los borradores en el backend (cuando esté
//    conectado).
//  - Permite editar (inline) y eliminar cada criterio.
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';
import { cerrarDialogoAnimado } from './menu.js';
import { createSubmitHandler } from './submitHandler.js';

// ═══════════════════════════════════════════════════════════════
// ESTADO
// ═══════════════════════════════════════════════════════════════

let rubricaId = null;
let criterios = []; // { uid, criterio_id, nombre, descripcion, porcentaje, pendiente }
let uidCounter = 0;

const nextUid = () => ++uidCounter;

/** Lee el id de la rúbrica desde el data-attribute de la vista (o de la URL). */
function getRubricaId() {
    const root = document.querySelector('.contenedor-criterios');
    if (root?.dataset?.rubricaId) return root.dataset.rubricaId;
    const m = location.pathname.match(/^\/menu\/rubrica\/(\d+)$/);
    return m ? m[1] : null;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getTotal() {
    return criterios
        .filter(c => !c.eliminado)
        .reduce((sum, c) => sum + (Number(c.porcentaje) || 0), 0);
}

/**
 * Abre una modal nativa de confirmación en lugar de window.confirm().
 * Devuelve `true` si el usuario confirma, `false` si cancela o cierra.
 * Si la acción lanza un error, la promesa se rechaza con el error.
 */
export function confirmarAccion(mensaje, subtitulo, accion, dialogId = 'dialogo-confirmar') {
    return new Promise((resolve, reject) => {
        const dialogo = document.getElementById(dialogId);
        const tituloEl = dialogo?.querySelector('.dialog-title, .dialogo-editar-rubrica-title, .dialogo-confirmar-title, .dialogo-eliminar-rubrica-title') || document.getElementById(`${dialogId}-titulo`);
        const mensajeEl = dialogo?.querySelector('.dialog-subtitle, .dialogo-editar-rubrica-subtitle, .dialogo-confirmar-subtitle, .dialogo-eliminar-rubrica-subtitle') || document.getElementById(`${dialogId}-mensaje`);
        if (!dialogo) {
            // Sin modal disponible, usamos confirm como rescate
            resolve(window.confirm(mensaje || '¿Estás seguro?'));
            return;
        }

        if (tituloEl) tituloEl.textContent = mensaje || '¿Estás seguro?';
        if (mensajeEl) mensajeEl.textContent = subtitulo || 'Esta acción no se puede deshacer.';

        // Buscar el botón de confirmación: data-accion="confirmar" (dialogo-confirmar)
        // o data-confirmar-rubrica (dialogo-eliminar-rubrica)
        const btnConfirmar = dialogo.querySelector('[data-accion="confirmar"], [data-confirmar-rubrica]');
        const contentEl = btnConfirmar?.querySelector('[data-submit-content]');
        const loadingEl = btnConfirmar?.querySelector('[data-loading-content]');
        const successEl = btnConfirmar?.querySelector('[data-success-content]');

        /** Elemento del estado actualmente visible. */
        let currentVisibleEl = contentEl;
        let animating = false;
        let pendingState = null;

        /** Máquina de estados con animación para cambiar entre estados del botón. */
        const transitionButtonState = (newEl) => {
            if (!newEl || newEl === currentVisibleEl) return;

            // Si hay una animación en curso, encolar el siguiente estado
            if (animating) {
                pendingState = newEl;
                return;
            }

            const oldEl = currentVisibleEl;
            currentVisibleEl = newEl;
            animating = true;

            // 1. Preparar el nuevo elemento (entrada)
            newEl.classList.remove('quitar', 'btn-exit');
            newEl.classList.add('mostrar', 'btn-enter');

            // 2. Animar la salida del elemento actual
            oldEl.classList.remove('mostrar');
            oldEl.classList.add('btn-exit');

            // 3. Esperar a que ambas animaciones terminen
            let completed = 0;
            let fallbackTimer = null;

            const onAnimEnd = () => {
                completed++;
                if (completed < 2) return; // Esperar a ambas

                oldEl.classList.remove('btn-exit', 'mostrar');
                oldEl.classList.add('quitar');

                newEl.classList.remove('btn-enter');

                animating = false;
                if (fallbackTimer) clearTimeout(fallbackTimer);

                if (pendingState) {
                    const nextState = pendingState;
                    pendingState = null;
                    transitionButtonState(nextState);
                }
            };

            const exitHandler = () => {
                oldEl.removeEventListener('animationend', exitHandler);
                onAnimEnd();
            };
            const enterHandler = () => {
                newEl.removeEventListener('animationend', enterHandler);
                onAnimEnd();
            };

            oldEl.addEventListener('animationend', exitHandler);
            newEl.addEventListener('animationend', enterHandler);

            // Fallback: si animationend no se dispara (pestaña oculta), forzar
            fallbackTimer = setTimeout(() => {
                if (animating) {
                    oldEl.removeEventListener('animationend', exitHandler);
                    newEl.removeEventListener('animationend', enterHandler);
                    oldEl.classList.remove('btn-exit', 'mostrar');
                    oldEl.classList.add('quitar');
                    newEl.classList.remove('btn-enter');
                    animating = false;
                    if (pendingState) {
                        const nextState = pendingState;
                        pendingState = null;
                        transitionButtonState(nextState);
                    }
                }
            }, 500);
        };

        /** Restaura el botón al estado normal (visible) con animación. */
        const resetButton = () => {
            if (!contentEl) return;
            if (animating) {
                pendingState = contentEl;
                return;
            }
            const oldEl = currentVisibleEl;
            if (oldEl === contentEl) return;

            oldEl.classList.remove('mostrar');
            oldEl.classList.add('btn-exit');

            contentEl.classList.remove('quitar', 'btn-exit');
            contentEl.classList.add('mostrar', 'btn-enter');
            currentVisibleEl = contentEl;

            let completed = 0;
            let fallbackTimer = null;

            const onAnimEnd = () => {
                completed++;
                if (completed < 2) return;
                oldEl.classList.remove('btn-exit', 'mostrar');
                oldEl.classList.add('quitar');
                contentEl.classList.remove('btn-enter');
                animating = false;
                if (fallbackTimer) clearTimeout(fallbackTimer);
                if (pendingState) {
                    const nextState = pendingState;
                    pendingState = null;
                    transitionButtonState(nextState);
                }
            };

            const exitHandler = () => {
                oldEl.removeEventListener('animationend', exitHandler);
                onAnimEnd();
            };
            const enterHandler = () => {
                contentEl.removeEventListener('animationend', enterHandler);
                onAnimEnd();
            };

            oldEl.addEventListener('animationend', exitHandler);
            contentEl.addEventListener('animationend', enterHandler);

            fallbackTimer = setTimeout(() => {
                if (animating) {
                    oldEl.removeEventListener('animationend', exitHandler);
                    contentEl.removeEventListener('animationend', enterHandler);
                    oldEl.classList.remove('btn-exit', 'mostrar');
                    oldEl.classList.add('quitar');
                    contentEl.classList.remove('btn-enter');
                    animating = false;
                    if (pendingState) {
                        const nextState = pendingState;
                        pendingState = null;
                        transitionButtonState(nextState);
                    }
                }
            }, 500);
        };

        /** Marca si la promesa ya se resolvió para evitar dobles resoluciones. */
        let resolved = false;

        /** Cierra el diálogo de forma forzada si la animación no termina. */
        const cerrarDialogoForzado = () => {
            if (dialogo.open) {
                dialogo.classList.remove('closing');
                dialogo.close();
            }
        };

        const onClose = () => {
            resetButton();
            dialogo.removeEventListener('cancel', preventDefault);
            dialogo.removeEventListener('click', onBackdropClick);
            dialogo.removeEventListener('close', onCloseFallback);
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
        };

        const preventDefault = (e) => {
            e.preventDefault();
            resetButton();
            cerrarDialogoAnimado(dialogo);
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
            cleanup();
        };

        const onEsc = (e) => {
            if (e.key === 'Escape') {
                resetButton();
                cerrarDialogoAnimado(dialogo);
                if (!resolved) {
                    resolved = true;
                    resolve(false);
                }
                cleanup();
            }
        };

        const cleanup = () => {
            dialogo.removeEventListener('cancel', preventDefault);
            dialogo.removeEventListener('click', onBackdropClick);
        };

        // Fallback: si el diálogo no se cierra en 600ms (animationend atascado),
        // forzar cierre y restaurar estado. Esto ocurre en pestañas ocultas.
        const onCloseFallback = () => {
            resetButton();
            cleanup();
            dialogo.removeEventListener('close', onCloseFallback);
        };

        const onBackdropClick = (e) => {
            if (e.target === dialogo) {
                resetButton();
                if (!resolved) {
                    resolved = true;
                    resolve(false);
                }
            }
        };

        // Cancelar (botón X, Cancelar, backdrop, Escape)
        // Soporta data-accion="cancelar" (dialogo-confirmar) y data-cancelar-rubrica (dialogo-eliminar-rubrica)
        const btnsCancelar = dialogo.querySelectorAll('[data-accion="cancelar"], [data-cancelar-rubrica]');
        const cancelar = () => {
            resetButton();
            if (!resolved) {
                resolved = true;
                resolve(false);
            }
            cerrarDialogoAnimado(dialogo);
            cleanup();
        };
        btnsCancelar.forEach(b => b.addEventListener('click', cancelar, { once: true }));

        // Confirmar
        const confirmar = async () => {
            // Feedback visual: cambiar a "Confirmando…" con animación
            transitionButtonState(loadingEl);

            try {
                // Ejecutar la operación real con el diálogo abierto
                // (ej. el DELETE del criterio) para que el estado "Confirmando…"
                // refleje la duración real de la petición.
                if (typeof accion === 'function') {
                    await accion();
                }

                // Éxito: mostrar "¡Hecho!" con animación antes de cerrar
                transitionButtonState(successEl);

                if (!resolved) {
                    resolved = true;
                    resolve(true);
                }
                // Forzar cierre después de un breve delay por seguridad
                // (animationend puede no dispararse en pestañas ocultas)
                setTimeout(() => {
                    cerrarDialogoForzado();
                    resetButton();
                    cleanup();
                    dialogo.removeEventListener('close', onCloseFallback);
                }, 300);
            } catch (err) {
                // Error: restaurar botón, cerrar y propagar para que el
                // llamador muestre la notificación de error.
                resetButton();
                cerrarDialogoAnimado(dialogo);
                cleanup();
                dialogo.removeEventListener('close', onCloseFallback);
                if (!resolved) {
                    resolved = true;
                    reject(err);
                }
            }
        };
        if (btnConfirmar) {
            btnConfirmar.addEventListener('click', confirmar, { once: true });
        }

        dialogo.addEventListener('cancel', preventDefault);
        dialogo.addEventListener('click', onBackdropClick);
        dialogo.addEventListener('close', onCloseFallback);

        // Restaurar estado del botón antes de abrir (por si se reabre
        // con el estado atascado en "Confirmando…" del uso anterior).
        resetButton();
        dialogo.showModal();
    });
}

function renderEstadoSincronizacion() {
    const estado = document.getElementById('estado-sincronizacion');
    if (!estado) return;

    const texto = estado.querySelector('.estado-sincronizacion__texto');
    const tieneCambios = criterios.some(c => c.pendiente || c.eliminado);

    estado.classList.toggle('estado-sincronizacion--pendiente', tieneCambios);
    estado.classList.toggle('estado-sincronizacion--ok', !tieneCambios);
    estado.classList.remove('estado-sincronizacion--cargando');

    if (texto) texto.textContent = tieneCambios ? 'Cambios sin guardar' : 'Todo sincronizado';
    estado.querySelector('.material-symbols-rounded').textContent = tieneCambios ? 'cloud_upload' : 'cloud_done';
}

function renderTotal() {
    const el = document.getElementById('puntuacion-total');
    if (!el) return;

    const total = getTotal();
    el.textContent = `${total}%`;

    const card = el.closest('.form-puntuacion');
    if (card) {
        card.classList.toggle('es-ok', total === 100);
        card.classList.toggle('no-ok', total !== 100);
    }

    const estado = document.getElementById('puntuacion-estado');
    if (estado) {
        const resto = 110 - total;
        if (total === 100) {
            estado.textContent = 'Listo para guardar';
            card.classList.add('es-ok');
            card.classList.remove('no-ok');
        } else if (total > 100 && total <= 110) {
            estado.textContent = `Total con nota adicional (10% extra)`;
            card.classList.add('es-ok');
            card.classList.remove('no-ok');
        } else if (total > 110) {
            estado.textContent = `Exceso: ${Math.abs(110 - total)}% sobre el 110% máximo`;
            card.classList.remove('es-ok');
            card.classList.add('no-ok');
        } else {
            estado.textContent = `Faltan ${resto}% por asignar`;
            card.classList.remove('es-ok');
            card.classList.add('no-ok');
        }
    }

    // El guardado se deshabilita hasta que la ponderación sume entre 100% y 110%.
    const btn = document.getElementById('btn-guardar-criterios');
    if (btn) btn.disabled = total < 100 || total > 110;
}

function getCriterioPorUid(uid) {
    return criterios.find(c => Number(c.uid) === Number(uid));
}

function limpiarFormularioCriterio() {
    const nombreInput = document.getElementById('criterio-nombre');
    const descripcionInput = document.getElementById('criterio-descripcion');
    const porcentajeInput = document.getElementById('criterio-porcentaje');

    if (nombreInput) nombreInput.value = '';
    if (descripcionInput) descripcionInput.value = '';
    if (porcentajeInput) porcentajeInput.value = '';

    [nombreInput, descripcionInput, porcentajeInput].forEach(input => input?.classList.remove('error'));
    ['error-criterio-nombre', 'error-criterio-descripcion', 'error-criterio-porcentaje'].forEach(id => {
        const span = document.getElementById(id);
        if (span) {
            span.classList.remove('show', 'hide');
            span.textContent = '';
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// CARGA DE DATOS
// ═══════════════════════════════════════════════════════════════

/** Rellena el encabezado con nombre y descripción de la rúbrica. */
async function loadRubrica() {
    if (!rubricaId) return;
    const titulo = document.getElementById('rubrica-titulo');
    const desc = document.getElementById('rubrica-descripcion-vista');
    try {
        const res = await fetch(`/admin/niveles/${rubricaId}`);
        const data = await res.json();
        if (!res.ok || !data.nivel) throw new Error(data?.mensaje || 'Error');
        if (titulo) titulo.textContent = data.nivel.nombre || 'Sin nombre';
        if (desc) desc.textContent = data.nivel.descripcion || 'Sin descripción';
    } catch (err) {
        console.log('Error al cargar rúbrica:', err);
        if (titulo) titulo.textContent = 'Sin nombre';
        if (desc) desc.textContent = 'Sin descripción';
    }
}

/** Carga los criterios ya guardados de la rúbrica desde el backend. */
async function loadCriterios() {
    if (!rubricaId) return;
    const lista = document.getElementById('criterios-lista');
    if (!lista) return;
    try {
        const res = await fetch(`/admin/niveles/${rubricaId}/criterios`);
        const data = await res.json();
        criterios = Array.isArray(data.criterios) ? data.criterios : [];
        criterios.forEach(c => { c.uid = nextUid(); c.pendiente = false; c.eliminado = false; });
    } catch (err) {
        console.log('Error al cargar criterios:', err);
        criterios = [];
    }
    renderCriterios();
}

function hideLoader() {
    const loader = document.getElementById('criterios-loader');
    if (loader) loader.style.display = 'none';
}

function renderCriterios() {
    const lista = document.getElementById('criterios-lista');
    if (!lista) return;

    lista.innerHTML = '';

    // Píldora de deshacer: hay criterios marcados para eliminar
    const eliminados = criterios.filter(c => c.eliminado);
    if (eliminados.length > 0) {
        const pildora = document.createElement('div');
        pildora.className = 'criterios-deshacer';
        pildora.innerHTML = `
            <span class="material-symbols-rounded" aria-hidden="true">restore</span>
            <span class="criterios-deshacer__texto">${eliminados.length} criterio(s) marcado(s) para eliminar</span>
            <button type="button" class="criterios-deshacer__btn" data-ripple>Deshacer</button>
        `;
        pildora.querySelector('.criterios-deshacer__btn').addEventListener('click', deshacerEliminaciones);
        lista.appendChild(pildora);
    }

    const activos = criterios.filter(c => !c.eliminado);

    if (activos.length === 0) {
        const mensaje = document.createElement('p');
        mensaje.className = 'criterios-vacio';
        mensaje.textContent = eliminados.length > 0
            ? 'Los criterios marcados se eliminarán al pulsar «Guardar».'
            : 'Aún no hay criterios en esta rúbrica. Añade uno abajo.';
        lista.appendChild(mensaje);
    } else {
        activos.forEach((c, index) => {
            const card = createCriterioCard(c);
            card.classList.add('criterio-entrada');
            card.style.animationDelay = `${index * 80}ms`;
            card.addEventListener('animationend', () => {
                card.classList.remove('criterio-entrada');
                card.style.animationDelay = '';
            }, { once: true });
            lista.appendChild(card);
        });
    }
    hideLoader();
    const contador = document.getElementById('contador-criterios');
    if (contador) contador.textContent = activos.length;
    renderTotal();
    renderEstadoSincronizacion();
}

// ═══════════════════════════════════════════════════════════════
// RENDER DE CRITERIOS
// ═══════════════════════════════════════════════════════════════

/** Crea la tarjeta de un criterio con sus campos editables y botón eliminar. */
function createCriterioCard(criterio) {
    const card = document.createElement('div');
    card.className = 'criterio criterio-guardado';
    card.dataset.uid = criterio.uid;

    const badge = criterio.pendiente
        ? '<span class="criterio-guardado__estado">Pendiente</span>'
        : '';

    card.innerHTML = `
        <div class="criterio-guardado__campo" data-campo="nombre">
            <div class="criterio-guardado__campo-info">
                <p class="criterio-guardado__campo-label">Nombre</p>
                <p class="criterio-guardado__campo-valor">${escapeHtml(criterio.nombre || '—')}</p>
            </div>
            <button type="button" class="criterio-guardado__editar" data-editar aria-label="Editar nombre" data-ripple>
                <span class="material-symbols-rounded">edit</span>
            </button>
        </div>

        <div class="criterio-guardado__campo" data-campo="descripcion">
            <div class="criterio-guardado__campo-info">
                <p class="criterio-guardado__campo-label">Descripción</p>
                <p class="criterio-guardado__campo-valor">${escapeHtml(criterio.descripcion || 'Sin descripción')}</p>
            </div>
            <button type="button" class="criterio-guardado__editar" data-editar aria-label="Editar descripción" data-ripple>
                <span class="material-symbols-rounded">edit</span>
            </button>
        </div>

        <div class="criterio-guardado__campo" data-campo="porcentaje">
            <div class="criterio-guardado__campo-info">
                <p class="criterio-guardado__campo-label">Ponderación</p>
                <p class="criterio-guardado__campo-valor">${escapeHtml(String(criterio.porcentaje))}%</p>
            </div>
            <button type="button" class="criterio-guardado__editar" data-editar aria-label="Editar ponderación" data-ripple>
                <span class="material-symbols-rounded">edit</span>
            </button>
        </div>

        <div class="criterio-guardado__footer">
            ${badge}
            <button type="button" class="criterio-guardado__eliminar" data-accion="eliminar"
                aria-label="Eliminar criterio" data-ripple>
                <span class="material-symbols-rounded">delete</span>
            </button>
        </div>
    `;

    card.querySelectorAll('[data-editar]').forEach(btn => {
        btn.addEventListener('click', () => {
            startEdit(card, btn.closest('[data-campo]').dataset.campo);
        });
    });

    card.querySelector('[data-accion="eliminar"]').addEventListener('click', () => {
        deleteCriterio(criterio.uid);
    });

    return card;
}

// ═══════════════════════════════════════════════════════════════
// EDICIÓN EN LÍNEA
// ═══════════════════════════════════════════════════════════════

/** Pone un campo de la tarjeta en modo edición con input + guardar/cancelar. */
function startEdit(card, campo) {
    const row = card.querySelector(`[data-campo="${campo}"]`);
    if (!row || row.dataset.editando) return;
    row.dataset.editando = 'true';

    const labels = { nombre: 'Nombre', descripcion: 'Descripción', porcentaje: 'Ponderación' };
    const criterioActual = getCriterioPorUid(card.dataset.uid) || {};
    const valorActual = campo === 'porcentaje'
        ? criterioActual.porcentaje
        : (criterioActual[campo] || '');

    const info = row.querySelector('.criterio-guardado__campo-info');
    info.innerHTML = `<p class="criterio-guardado__campo-label">${labels[campo] || campo}</p>`;

    const input = document.createElement(campo === 'descripcion' ? 'textarea' : 'input');
    if (input.tagName === 'TEXTAREA') {
        input.rows = 3;
    } else {
        input.type = 'text';
        if (campo === 'porcentaje') {
            input.type = 'number';
            input.min = 1;
            input.max = 100;
            input.step = 1;
            input.setAttribute('inputmode', 'numeric');
        }
    }
    input.value = valorActual != null ? valorActual : '';
    input.className = 'campo-nota__input criterio-editar__input';
    info.appendChild(input);

    const acciones = document.createElement('div');
    acciones.className = 'criterio-editar__acciones';

    const btnGuardar = document.createElement('button');
    btnGuardar.type = 'button';
    btnGuardar.className = 'criterio-editar__guardar';
    btnGuardar.setAttribute('aria-label', 'Guardar');
    btnGuardar.innerHTML = '<span class="material-symbols-rounded">check</span>';

    const btnCancelar = document.createElement('button');
    btnCancelar.type = 'button';
    btnCancelar.className = 'criterio-editar__cancelar';
    btnCancelar.setAttribute('aria-label', 'Cancelar');
    btnCancelar.innerHTML = '<span class="material-symbols-rounded">close</span>';

    acciones.appendChild(btnGuardar);
    acciones.appendChild(btnCancelar);
    row.querySelector('.criterio-guardado__editar')?.replaceWith(acciones);

    btnCancelar.addEventListener('click', () => {
        row.dataset.editando = 'false';
        renderCriterios();
    });

    btnGuardar.addEventListener('click', async () => {
        const value = input.value.trim();
        const patch = {};

        if (campo === 'porcentaje') {
            const porc = Number(value);
            if (!value || !Number.isFinite(porc) || porc < 1 || porc > 100) {
                mostrarNotificacion('La ponderación debe estar entre 1 y 100', 'error');
                return;
            }
            patch.porcentaje = porc;
        } else if (campo === 'nombre') {
            if (!value) {
                mostrarNotificacion('El nombre no puede estar vacío', 'error');
                return;
            }
            patch.nombre = value;
        } else {
            patch.descripcion = value;
        }

        await updateCriterio(criterioActual.uid, patch);
    });

    input.focus();
    if (input.select) input.select();
}

// ═══════════════════════════════════════════════════════════════
// OPERACIONES CRUD
// ═══════════════════════════════════════════════════════════════

/** Aplica cambios a un criterio en memoria. No persiste: el guardado real se hace con "Guardar todos". */
async function updateCriterio(uid, patch) {
    const idx = criterios.findIndex(c => Number(c.uid) === Number(uid));
    if (idx === -1) return;

    // Solo se actualiza en memoria; cualquier criterio (nuevo o preexistente)
    // queda marcado como pendiente de guardar hasta pulsar "Guardar".
    Object.assign(criterios[idx], patch);
    criterios[idx].pendiente = true;
    renderCriterios();
    mostrarNotificacion('Criterio modificado (pendiente de guardar)', 'info');
}

/**
 * Marca un criterio para eliminar (SOLO en memoria). Se borra de la vista
 * de inmediato y se elimina en la BD al pulsar «Guardar». Reversible con
 * la píldora de deshacer.
 */
function deleteCriterio(uid) {
    const idx = criterios.findIndex(c => Number(c.uid) === Number(uid));
    if (idx === -1) return;

    criterios[idx].eliminado = true;
    renderCriterios();
    mostrarNotificacion('Criterio marcado para eliminar (se guardará al pulsar Guardar)', 'info');
}

/** Restaura todos los criterios marcados para eliminar. */
function deshacerEliminaciones() {
    criterios.forEach(c => { c.eliminado = false; });
    renderCriterios();
    mostrarNotificacion('Eliminación cancelada', 'info');
}

// ── Verificación de campos vacíos (patrón login) ──

function marcarErrorCriterio(input, errorSpan, mensaje) {
    if (!input || !errorSpan) return true;
    if (!input.value.trim()) {
        input.classList.add('error');
        errorSpan.textContent = mensaje;
        errorSpan.classList.add('show');
        return false;
    }
    input.classList.remove('error');
    errorSpan.classList.remove('show');
    errorSpan.textContent = '';
    return true;
}

function quitarErrorCriterio(input, errorSpan) {
    if (input) input.classList.remove('error');
    if (errorSpan) {
        errorSpan.classList.add('hide');
        setTimeout(() => {
            errorSpan.classList.remove('show', 'hide');
            errorSpan.textContent = '';
        }, 300);
    }
}

function validarPorcentajeCriterio(input, errorSpan, porcentaje) {
    if (!input) return Number.isFinite(porcentaje) && porcentaje >= 1 && porcentaje <= 100;
    if (!input.value.trim()) {
        return marcarErrorCriterio(input, errorSpan, 'Rellena este campo de ponderación');
    }
    if (!Number.isFinite(porcentaje) || porcentaje < 1 || porcentaje > 100) {
        input.classList.add('error');
        if (errorSpan) {
            errorSpan.textContent = 'La ponderación debe estar entre 1 y 100';
            errorSpan.classList.add('show');
        }
        return false;
    }
    input.classList.remove('error');
    if (errorSpan) {
        errorSpan.classList.remove('show');
        errorSpan.textContent = '';
    }
    return true;
}

// ═══════════════════════════════════════════════════════════════
// MODAL AÑADIR CRITERIO
// ═══════════════════════════════════════════════════════════════

/** Abre el modal de añadir criterio con el formulario limpio. */
function abrirDialogoCriterio() {
    const dialogo = document.getElementById('dialogo-criterio');
    if (!dialogo) return;

    limpiarFormularioCriterio();
    setTimeout(() => document.getElementById('criterio-nombre')?.focus(), 30);
    dialogo.showModal();
}

function cerrarDialogoCriterio() {
    const dialogo = document.getElementById('dialogo-criterio');
    if (dialogo) cerrarDialogoAnimado(dialogo);
}

/** Agrega el criterio del formulario a la lista como borrador (sin guardar aún). */
function addCriterioDraft() {
    const nombreInput = document.getElementById('criterio-nombre');
    const descripcionInput = document.getElementById('criterio-descripcion');
    const porcentajeInput = document.getElementById('criterio-porcentaje');

    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const descripcion = descripcionInput ? descripcionInput.value.trim() : '';
    const porcentaje = Number(porcentajeInput ? porcentajeInput.value : NaN);

    const okNombre = marcarErrorCriterio(
        nombreInput,
        document.getElementById('error-criterio-nombre'),
        'Rellena este campo de nombre'
    );
    const okPorcentaje = validarPorcentajeCriterio(
        porcentajeInput,
        document.getElementById('error-criterio-porcentaje'),
        porcentaje
    );

    if (!okNombre || !okPorcentaje) {
        mostrarNotificacion('Por favor, rellena todos los campos correctamente.', 'error');
        if (!okNombre) nombreInput?.focus();
        else porcentajeInput?.focus();
        return;
    }

    criterios.push({
        uid: nextUid(),
        criterio_id: null,
        nombre,
        descripcion,
        porcentaje,
        pendiente: true,
    });

    limpiarFormularioCriterio();
    cerrarDialogoCriterio();

    renderCriterios();
    mostrarNotificacion('Criterio añadido (pendiente de guardar)', 'info');
}

function cancelarCriterioDraft() {
    limpiarFormularioCriterio();
    // Quitar el foco del input activo (no re-enfocar en otro)
    document.activeElement?.blur?.();
    cerrarDialogoCriterio();
}

// ═══════════════════════════════════════════════════════════════
// GUARDAR TODO (persiste los borradores en el backend)
// ═══════════════════════════════════════════════════════════════

/**
 * Guarda (persiste) todos los criterios pendientes en el backend.
 * Devuelve { success: true } para que createSubmitHandler maneje los
 * estados visuales del botón (enviando → éxito/error).
 */
async function guardarCriterios() {
    if (!rubricaId) return { success: false };

    // Solo se permite guardar si la ponderación suma entre 100% y 110%.
    // El 10% extra corresponde al criterio de "punto adicional".
    const total = getTotal();
    if (total < 100 || total > 110) {
        mostrarNotificacion('La ponderación debe sumar entre 100% y 110% antes de guardar', 'error');
        throw new Error('Validación fallida');
    }

    const eliminados = criterios.filter(c => c.eliminado);
    const pendientes = criterios.filter(c => c.pendiente && !c.eliminado);
    if (eliminados.length === 0 && pendientes.length === 0) {
        mostrarNotificacion('No hay criterios por guardar', 'info');
        throw new Error('Sin cambios');
    }

    try {
        // 1) Eliminar primero los criterios marcados (los borradores nuevos
        //    marcados para eliminar simplemente se descartan).
        for (const c of eliminados) {
            if (c.criterio_id == null) continue;
            const res = await fetch(`/admin/criterios/${c.criterio_id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                throw new Error(`No se pudo eliminar "${c.nombre}": ${data?.mensaje || 'error'}`);
            }
        }

        // 2) Persistir los pendientes (nuevos → POST, editados → PUT).
        for (const c of pendientes) {
            let res, data;

            if (c.criterio_id == null) {
                // Criterio nuevo: se crea en el backend.
                res = await fetch(`/admin/niveles/${rubricaId}/criterios`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: c.nombre,
                        descripcion: c.descripcion,
                        porcentaje: c.porcentaje,
                    }),
                });
            } else {
                // Criterio preexistente editado: se actualiza.
                res = await fetch(`/admin/criterios/${c.criterio_id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nombre: c.nombre,
                        descripcion: c.descripcion,
                        porcentaje: c.porcentaje,
                    }),
                });
            }

            data = await res.json();
            if (!res.ok) {
                throw new Error(`No se pudo guardar "${c.nombre}": ${data?.mensaje || 'error'}`);
            }

            if (c.criterio_id == null && data.criterio) {
                c.criterio_id = data.criterio.criterio_id;
            }
            c.pendiente = false;
        }

        // 3) Descartar los eliminados y normalizar el estado local.
        criterios = criterios.filter(c => !c.eliminado);

        // La notificación de éxito y el re-render los hace el onSuccess del
        // handler (mostrarla aquí también la duplicaba).
        return { success: true };
    } catch (err) {
        // Los errores los notifica el onError del handler. Solo se notifican
        // aquí las validaciones previas ('Validación fallida' y 'Sin cambios'),
        // que onError ignora precisamente para no duplicarlas.
        throw err;
    }
}

// ═══════════════════════════════════════════════════════════════
// MENÚ CONTEXTUAL DE LA RÚBRICA (Editar / Eliminar)
// ═══════════════════════════════════════════════════════════════

/** Abre/cierra el menú contextual anclándolo junto al botón de tres puntos. */
function abrirMenuRubrica() {
    const menu = document.getElementById('menu__rubrica');
    const btn = document.getElementById('btn-menu-rubrica');
    if (!menu || !btn) return;

    const visible = menu.classList.contains('show');
    menu.classList.toggle('show', !visible);
    if (!visible) {
        const rect = btn.getBoundingClientRect();
        menu.style.top = (rect.bottom + 8) + 'px';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
    }
}

function cerrarMenuRubrica() {
    const menu = document.getElementById('menu__rubrica');
    if (menu) menu.classList.remove('show');
}

function initMenuRubrica() {
    const btn = document.getElementById('btn-menu-rubrica');
    const menu = document.getElementById('menu__rubrica');
    if (!btn || !menu || menu.dataset.handlerInitialized) return;
    menu.dataset.handlerInitialized = 'true';

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        abrirMenuRubrica();
    });

    menu.addEventListener('click', (e) => {
        const item = e.target.closest('[data-menu]');
        if (!item) return;
        cerrarMenuRubrica();
        if (item.dataset.menu === 'editar') {
            abrirDialogoEditarRubrica();
        } else if (item.dataset.menu === 'eliminar') {
            confirmarEliminarRubrica();
        }
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#menu__rubrica') && !e.target.closest('#btn-menu-rubrica')) {
            cerrarMenuRubrica();
        }
    });
    document.addEventListener('scroll', cerrarMenuRubrica, true);
}

// ═══════════════════════════════════════════════════════════════
// EDICIÓN DE NOMBRE Y DESCRIPCIÓN DE LA RÚBRICA
// ═══════════════════════════════════════════════════════════════

function abrirDialogoEditarRubrica() {
    const dialogo = document.getElementById('dialogo-editar-rubrica');
    if (!dialogo) return;

    const nombreInput = document.getElementById('editar-nombre');
    const descInput = document.getElementById('editar-descripcion');
    const tituloEl = document.getElementById('rubrica-titulo');
    const descVista = document.getElementById('rubrica-descripcion-vista');

    if (nombreInput) nombreInput.value = tituloEl ? tituloEl.textContent.trim() : '';
    if (descInput) descInput.value = descVista ? descVista.textContent.trim() : '';

    setTimeout(() => nombreInput?.focus(), 30);
    dialogo.showModal();
}

function cerrarDialogoEditarRubrica() {
    const dialogo = document.getElementById('dialogo-editar-rubrica');
    if (dialogo) cerrarDialogoAnimado(dialogo);
}

/**
 * Guarda (PUT) el nuevo nombre y descripción de la rúbrica.
 * Devuelve un objeto { success, ... } para que createSubmitHandler
 * maneje los estados visuales del botón (enviando → éxito/error).
 */
async function guardarEdicionRubrica() {
    if (!rubricaId) return { success: false };

    const nombreInput = document.getElementById('editar-nombre');
    const descInput = document.getElementById('editar-descripcion');
    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const descripcion = descInput ? descInput.value.trim() : '';

    if (!nombre) {
        mostrarNotificacion('El nombre de la rúbrica es requerido', 'error');
        nombreInput?.focus();
        throw new Error('Campo vacío');
    }

    const res = await fetch(`/admin/niveles-evaluacion/${rubricaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, descripcion }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.mensaje || 'Error al actualizar la rúbrica');

    const titulo = document.getElementById('rubrica-titulo');
    const desc = document.getElementById('rubrica-descripcion-vista');
    if (titulo) titulo.textContent = data.nivel?.nombre || nombre;
    if (desc) desc.textContent = data.nivel?.descripcion || descripcion || 'Sin descripción';

    return { success: true, nivel: data.nivel };
}

function initDialogoEditarRubrica() {
    const dialogo = document.getElementById('dialogo-editar-rubrica');
    if (!dialogo || dialogo.dataset.handlerInitialized) return;
    dialogo.dataset.handlerInitialized = 'true';

    const cerrar = document.getElementById('btn-cerrar-editar-rubrica');
    const cancelar = document.getElementById('btn-cancelar-editar-rubrica');

    if (cerrar) cerrar.addEventListener('click', cerrarDialogoEditarRubrica);
    if (cancelar) cancelar.addEventListener('click', cerrarDialogoEditarRubrica);

    dialogo.addEventListener('cancel', (e) => {
        e.preventDefault();
        cerrarDialogoEditarRubrica();
    });

    document.getElementById('editar-nombre')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // El submit se dispara via createSubmitHandler; evitamos el
            // comportamiento por defecto del Enter para que no cierre el dialog
        }
    });

    // ── Conectar createSubmitHandler al formulario de edición ──
    // Da al botón "Guardar" el mismo feedback visual (normal → enviando → éxito)
    // que tiene el botón "Añadir" del formulario de crear rúbrica.
    const formEditar = document.getElementById('dialogo-editar-rubrica-form');
    if (formEditar && !formEditar.dataset.submitInitialized) {
        formEditar.dataset.submitInitialized = 'true';
        createSubmitHandler(formEditar, {
            onSubmit: guardarEdicionRubrica,
            onSuccess: () => {
                mostrarNotificacion('Rúbrica actualizada', 'bien');
                // Retrasa unos ms el cierre para que se alcance a ver la notificación.
                setTimeout(() => cerrarDialogoEditarRubrica(), 300);
            },
            onError: (error) => {
                if (error.message === 'Campo vacío') return;
                mostrarNotificacion(error.message || 'Error al actualizar la rúbrica', 'error');
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════════
// ELIMINACIÓN DE LA RÚBRICA
// ═══════════════════════════════════════════════════════════════

/** Pide confirmación y elimina la rúbrica completa, regresando a la lista. */
async function confirmarEliminarRubrica() {
    if (!rubricaId) return;

    let ok;
    try {
        ok = await confirmarAccion(
            '¿Eliminar esta rúbrica?',
            'Se eliminará la rúbrica y todos sus criterios. Esta acción no se puede deshacer.',
            async () => {
                const res = await fetch(`/admin/niveles-evaluacion/${rubricaId}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.mensaje || 'Error al eliminar la rúbrica');
            }
        );
    } catch (err) {
        mostrarNotificacion(err.message || 'Error al eliminar la rúbrica', 'error');
        return;
    }
    if (!ok) return;

    mostrarNotificacion('Rúbrica eliminada', 'bien');
    setTimeout(() => window.navigateTo('/menu/rubrica'), 200);
}
// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

function initEditarCriterios() {
    // Solo actúa sobre la vista del editor de rúbrica
    const root = document.querySelector('.contenedor-criterios');
    if (!root) return;

    // Guarda en el contenedor raíz para evitar doble inicialización en SPA.
    // El contenedor se recrea con cada navegación (innerHTML del router),
    // así que el dataset se reinicia automáticamente.
    if (root.dataset.initialized) return;
    root.dataset.initialized = 'true';

    rubricaId = getRubricaId();
    if (!rubricaId) return;

    loadRubrica();
    loadCriterios();

    initMenuRubrica();
    initDialogoEditarRubrica();

    // Verificación de campos vacíos en el formulario de criterio (patrón login)
    const camposCriterio = [
        { inputId: 'criterio-nombre', errorId: 'error-criterio-nombre', mensaje: 'Rellena este campo de nombre' },
        { inputId: 'criterio-porcentaje', errorId: 'error-criterio-porcentaje', mensaje: 'Rellena este campo de ponderación' },
        { inputId: 'criterio-descripcion', errorId: 'error-criterio-descripcion', mensaje: '' }, // opcional
    ];
    camposCriterio.forEach(({ inputId, errorId, mensaje }) => {
        const input = document.getElementById(inputId);
        const errorSpan = document.getElementById(errorId);
        if (!input) return;
        input.addEventListener('blur', () => {
            if (!mensaje) {
                quitarErrorCriterio(input, errorSpan);
                return;
            }
            if (inputId === 'criterio-porcentaje') {
                validarPorcentajeCriterio(input, errorSpan, Number(input.value));
            } else {
                marcarErrorCriterio(input, errorSpan, mensaje);
            }
        });
        input.addEventListener('input', () => {
            if (input.value.trim()) quitarErrorCriterio(input, errorSpan);
        });
    });

    const btnConfirmar = document.getElementById('btn-confirmar-criterio');
    if (btnConfirmar && !btnConfirmar.dataset.handlerInitialized) {
        btnConfirmar.dataset.handlerInitialized = 'true';
        btnConfirmar.addEventListener('click', addCriterioDraft);
    }

    const btnCancelar = document.getElementById('btn-cancelar-criterio');
    if (btnCancelar && !btnCancelar.dataset.handlerInitialized) {
        btnCancelar.dataset.handlerInitialized = 'true';
        btnCancelar.addEventListener('click', cancelarCriterioDraft);
    }

    // Abrir el modal de añadir criterio
    const btnAbrir = document.getElementById('btn-abrir-criterio');
    if (btnAbrir && !btnAbrir.dataset.handlerInitialized) {
        btnAbrir.dataset.handlerInitialized = 'true';
        btnAbrir.addEventListener('click', abrirDialogoCriterio);
    }

    // Cerrar el modal con el botón X
    const btnCerrar = document.getElementById('btn-cerrar-criterio');
    if (btnCerrar && !btnCerrar.dataset.handlerInitialized) {
        btnCerrar.dataset.handlerInitialized = 'true';
        btnCerrar.addEventListener('click', cerrarDialogoCriterio);
    }

    // Cerrar el modal con Escape o click en el backdrop
    const dialogoCriterio = document.getElementById('dialogo-criterio');
    if (dialogoCriterio && !dialogoCriterio.dataset.handlerInitialized) {
        dialogoCriterio.dataset.handlerInitialized = 'true';
        dialogoCriterio.addEventListener('click', (e) => {
            if (e.target === dialogoCriterio) cerrarDialogoCriterio();
        });
        dialogoCriterio.addEventListener('cancel', (e) => {
            e.preventDefault();
            cerrarDialogoCriterio();
        });
    }

    const formGuardar = document.getElementById('form-guardar-criterios');
    if (formGuardar && !formGuardar.dataset.submitInitialized) {
        formGuardar.dataset.submitInitialized = 'true';
        createSubmitHandler(formGuardar, {
            onSubmit: guardarCriterios,
            onSuccess: () => {
                renderCriterios();
                mostrarNotificacion('Criterios guardados correctamente', 'bien');
            },
            onError: (error) => {
                if (error.message === 'Validación fallida' || error.message === 'Sin cambios') return;
                mostrarNotificacion(error.message || 'Error al guardar criterios', 'error');
            }
        });
    }
}

window.initEditarCriterios = initEditarCriterios;

document.addEventListener('DOMContentLoaded', initEditarCriterios);
document.addEventListener('contentUpdated', initEditarCriterios);
