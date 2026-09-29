// ═══════════════════════════════════════════════════════════════
// MÓDULO: Rúbricas (criterios) — CRUD, renderizado y animaciones
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';
import { createSubmitHandler } from './submitHandler.js';
import { cerrarDialogoAnimado } from './menu.js';
import { confirmarAccion } from './editar-criterios.js';
import { animarEntrada, animarSalida } from './listAnimations.js';
import { puedeEditarRubricas } from './permisos.js';

/**
 * NOTA: La edición de rúbrica (diálogo #dialogo-editar-rubrica) se maneja
 * en editar-criterios.js, que es el módulo responsable de la vista
 * individual /menu/rubrica/:id. Este módulo (criterios-rubrica.js) solo
 * inicializa el diálogo de editar cuando existe dentro de la vista de
 * lista (rubrica.ejs), donde currentRubricaId está disponible.
 */

// ═══════════════════════════════════════════════════════════════
// ESTADO Y REFERENCIAS
// ═══════════════════════════════════════════════════════════════

let currentRubricaId = null;
let menuVisible = false;

function getMenuList() {
    return document.getElementById('menu__list');
}

// ═══════════════════════════════════════════════════════════════
// HELPERS — Animaciones de lista
// ═══════════════════════════════════════════════════════════════

/** Determina si el contenedor está vacío (carga fría). */
function isContainerEmpty(container) {
    return container.querySelectorAll('.list-item').length === 0;
}

/** Oculta el loader lineal y muestra la toolbar (solo cuando ya hay datos). */
function hideLoader(container) {
    const loader = container?.querySelector('.section-loader');
    if (loader) loader.style.display = 'none';
    const toolbar = container?.querySelector('.list-toolbar');
    if (toolbar) toolbar.style.display = '';
}

// ═══════════════════════════════════════════════════════════════
// ESTADO VACÍO
// ═══════════════════════════════════════════════════════════════

/** Muestra/oculta el estado vacío según si hay rúbricas en el contenedor. */
function toggleEmptyState(container) {
    if (!container) container = document.getElementById('rubricas__container');
    const emptyEl = container?.querySelector('.section-empty');
    if (!container || !emptyEl) return;

    const hasItems = container.querySelectorAll('.list-item').length > 0;
    emptyEl.style.display = hasItems ? 'none' : 'flex';
}

// ═══════════════════════════════════════════════════════════════
// CARGA DE RÚBRICAS (niveles de evaluación)
// ═══════════════════════════════════════════════════════════════

/**
 * Carga la lista de rúbricas (evaluaciones.niveles) desde el servidor.
 *
 * Dos modos de operación automáticos:
 * - Carga fría (contenedor vacío): progress bar → renderiza todo con entrada escalonada.
 * - Soft refresh (ya hay rúbricas): shimmer overlay sobre existentes → diff inteligente
 *   (entradas/salidas animadas vía WAAPI desde listAnimations.js, persistentes con pulso).
 */
/**
 * Obtiene el botón de refresh del DOM.
 */
function getRefreshBtn() {
    return document.querySelector('.btn-refresh');
}

async function loadRubricas(btn) {
    const container = document.getElementById('rubricas__container');
    if (!container) return;

    // Usar el botón recibido o buscarlo en el DOM
    const refreshBtn = btn || getRefreshBtn();

    // Mostrar spinner siempre que se cargue
    if (refreshBtn) refreshBtn.classList.add('is-loading');

    const coldLoad = isContainerEmpty(container);

    // La toolbar (búsqueda/ordenar/filtrar) solo se muestra cuando hay datos:
    // se oculta durante la carga en frío (donde solo se ve el loader) y
    // hideLoader() la vuelve a mostrar al terminar la carga.
    const toolbar = container.querySelector('.list-toolbar');
    if (coldLoad) {
        if (toolbar) toolbar.style.display = 'none';
    } else {
        if (toolbar) toolbar.style.display = '';
    }

    try {
        // ── PRE-FETCH: preparar UI según modo ──
        let oldIds = new Set();

        if (!coldLoad) {
            // Soft refresh: guardar IDs actuales + shimmer overlay en existentes
            oldIds = new Set(
                [...container.querySelectorAll('.list-item')].map(el => el.dataset.itemId)
            );
            container.querySelectorAll('.list-item').forEach(el => {
                el.classList.add('list-item--refreshing');
            });
        }

        // ── FETCH ──
        const response = await fetch('/admin/niveles-evaluacion', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (!data.niveles) {
            hideLoader(container);
            container.querySelectorAll('.list-item--refreshing').forEach(el => {
                el.classList.remove('list-item--refreshing');
            });
            if (refreshBtn) refreshBtn.classList.remove('is-loading');
            mostrarNotificacion('Error al cargar las rúbricas', 'error');
            return;
        }

        // ── POST-FETCH: aplicar cambios según modo ──
        if (coldLoad) {
            // Carga fría: ocultar loader, renderizar todo con entrada escalonada
            hideLoader(container);
            data.niveles.forEach((nivel, index) => {
                const elementoRubrica = createRubricaElement(nivel);
                container.appendChild(elementoRubrica);
                animarEntrada(elementoRubrica, index * 80);
            });
            toggleEmptyState(container);
            if (refreshBtn) refreshBtn.classList.remove('is-loading');
        } else {
            // Soft refresh: diff inteligente
            const newIds = new Set(data.niveles.map(n => String(n.nivel_id)));

            // Quitar shimmer overlay a todos
            container.querySelectorAll('.list-item--refreshing').forEach(el => {
                el.classList.remove('list-item--refreshing');
            });

            // Salientes: animar salida (WAAPI) y eliminar del DOM al terminar.
            // El atributo data-saliendo marca al nodo moribundo para que los
            // entrantes no se inserten antes de él.
            const toRemove = [...oldIds].filter(id => !newIds.has(id));
            toRemove.forEach(id => {
                const el = container.querySelector(`.list-item[data-item-id="${id}"]`);
                if (el) {
                    el.setAttribute('data-saliendo', '');
                    animarSalida(el).then(() => el.remove());
                }
            });

            // Persistentes: pulso de confirmación
            const keptIds = [...oldIds].filter(id => newIds.has(id));
            keptIds.forEach(id => {
                const el = container.querySelector(`.list-item[data-item-id="${id}"]`);
                if (el) {
                    el.classList.add('list-item--updated');
                    el.addEventListener('animationend', () => {
                        el.classList.remove('list-item--updated');
                    }, { once: true });
                }
            });

            // Entrantes: insertar en posición correcta según orden de la API
            const enteringIds = [...newIds].filter(id => !oldIds.has(id));
            const nivelMap = new Map(data.niveles.map(n => [String(n.nivel_id), n]));

            enteringIds.forEach(id => {
                const nivel = nivelMap.get(id);
                if (!nivel) return;

                const elementoRubrica = createRubricaElement(nivel);

                const apiIndex = data.niveles.findIndex(n => String(n.nivel_id) === id);
                let insertBeforeEl = null;

                for (let i = apiIndex + 1; i < data.niveles.length; i++) {
                    const nextId = String(data.niveles[i].nivel_id);
                    if (oldIds.has(nextId)) {
                        insertBeforeEl = container.querySelector(
                            `.list-item[data-item-id="${nextId}"]:not([data-saliendo])`
                        );
                        if (insertBeforeEl) break;
                    }
                }

                if (insertBeforeEl) {
                    container.insertBefore(elementoRubrica, insertBeforeEl);
                } else {
                    const loader = container.querySelector('.section-loader');
                    if (loader && loader.parentNode === container) {
                        container.insertBefore(elementoRubrica, loader);
                    } else {
                        container.appendChild(elementoRubrica);
                    }
                }
            });
            toggleEmptyState(container);
            if (refreshBtn) refreshBtn.classList.remove('is-loading');
        }

    } catch (error) {
        if (refreshBtn) refreshBtn.classList.remove('is-loading');
        toggleEmptyState(container);
        hideLoader(container);
        container.querySelectorAll('.list-item--refreshing').forEach(el => {
            el.classList.remove('list-item--refreshing');
        });
        mostrarNotificacion('Error al cargar las rúbricas', 'error');
        console.log('Error al cargar rúbricas:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// CREACIÓN DE ELEMENTOS
// ═══════════════════════════════════════════════════════════════

/**
 * Crea un elemento DOM para una rúbrica (nivel de evaluación).
 * La animación de entrada NO se inicia aquí: la dispara el llamador
 * con animarEntrada() tras insertarlo en el DOM (listAnimations.js).
 * @param {Object} nivel - Datos de la rúbrica desde la API ({ nivel_id, nombre, descripcion })
 * @returns {HTMLElement}
 */
function createRubricaElement(nivel) {
    const elementoDiv = document.createElement('div');
    elementoDiv.className = 'list-item';
    elementoDiv.setAttribute('data-item-id', nivel.nivel_id);

    // Solo los roles con permiso de gestión ven las acciones de escritura: el
    // docente-orientador entra a la rúbrica únicamente a consultarla.
    const puedeEditar = puedeEditarRubricas();

    elementoDiv.innerHTML = `
    <div class="list-item__content">
        <span class="material-symbols-rounded">checklist</span>
        <div class="list-item__text-block">
            <p class="list-item__author rubrica-nombre"></p>
            <p class="list-item__desc rubrica-descripcion"></p>
        </div>
    </div>
    <div class="centrar gap-row margin-left-20">
        <a href="/menu/rubrica/${nivel.nivel_id}" data-link class="centrar boton btn-small btn-mas" id="rubrica-${nivel.nivel_id}-open">
            <p>${puedeEditar ? 'Editar' : 'Ver'}</p>
            <span class="material-symbols-rounded">arrow_outward</span>
        </a>
        ${puedeEditar ? `<button class="list-item__actions" id="rubrica-${nivel.nivel_id}-actions">
            <span class="material-symbols-rounded">more_vert</span>
        </button>` : ''}
    </div>
    `;

    elementoDiv.querySelector('.rubrica-nombre').textContent = nivel.nombre || 'Sin nombre';
    elementoDiv.querySelector('.rubrica-descripcion').textContent = nivel.descripcion || 'Sin descripción';

    // Datos en data-* para ordenar/filtrar sin tener que leer el DOM
    elementoDiv.dataset.nombre = (nivel.nombre || '').trim();
    elementoDiv.dataset.descripcion = (nivel.descripcion || '').trim();

    return elementoDiv;
}

// ═══════════════════════════════════════════════════════════════
// HANDLERS DE RÚBRICAS
// ═══════════════════════════════════════════════════════════════

/**
 * Inicializa los handlers de rúbricas. Se llama en la carga inicial
 * y cada vez que el router reemplaza el contenido del main.
 */
function initRubricasHandlers() {
    const container = document.getElementById('rubricas__container');
    if (!container) return;

    // La lista se carga siempre: el docente-orientador también consulta rúbricas,
    // aunque su vista sea de solo lectura.
    loadRubricas();

    // A partir de aquí todo es escritura (menú contextual y diálogos de edición),
    // que solo existe en el DOM de los roles con permiso de gestión.
    if (!puedeEditarRubricas()) return;

    // initDialogoEditarRubrica se conecta a createSubmitHandler y usa
    // currentRubricaId, que solo existe en la vista de lista.
    // En la vista individual, lo maneja editar-criterios.js.
    const menulist = getMenuList();
    if (!menulist) return;

    initDialogoEditarRubrica();



    // Cerrar el menú contextual al hacer scroll en el contenedor
    container.addEventListener('scroll', () => {
        if (menuVisible) {
            menulist.classList.remove('show');
            menuVisible = false;
        }
    });

    // Abrir el menú contextual al hacer clic en los tres puntos
    container.addEventListener('click', function (e) {
        const menuBtn = e.target.closest('.list-item__actions');
        if (menuBtn) {
            e.stopPropagation();

            const itemElement = menuBtn.closest('.list-item');
            currentRubricaId = itemElement.dataset.itemId;

            menuVisible = !menuVisible;

            const rect = menuBtn.getBoundingClientRect();
            menulist.style.top = rect.bottom + 8 + 'px';
            menulist.style.right = (window.innerWidth - rect.right) + 'px';

            if (menuVisible) {
                menulist.classList.add('show');
            } else {
                menulist.classList.remove('show');
            }
            return;
        }
    });

    // Manejar las acciones del menú contextual (Editar / Eliminar)
    if (menulist && !menulist.dataset.handlerInitialized) {
        menulist.dataset.handlerInitialized = 'true';
        menulist.addEventListener('click', async (e) => {
            const item = e.target.closest('[data-menu]');
            if (!item) return;

            const accion = item.dataset.menu;
            menulist.classList.remove('show');
            menuVisible = false;

            if (accion === 'editar') {
                abrirDialogoEditarRubrica();
            } else if (accion === 'eliminar') {
                await eliminarRubrica(currentRubricaId);
            }
        });
    }

    // Cerrar el menú contextual si se hace clic fuera
    document.addEventListener('click', function (event) {
        if (!event.target.closest('.list-item__actions') && menulist && !menulist.contains(event.target)) {
            if (menulist) menulist.classList.remove('show');
            menuVisible = false;
        }
    });
}

/** Elimina una rúbrica mediante la API y refuerza la lista. */
async function eliminarRubrica(nivelId) {
    if (!nivelId) return;

    let ok;
    try {
        ok = await confirmarAccion(
            '¿Eliminar esta rúbrica?',
            'Se eliminará la rúbrica y todos sus criterios. Esta acción no se puede deshacer.',
            async () => {
                const res = await fetch(`/admin/niveles-evaluacion/${nivelId}`, { method: 'DELETE' });
                const data = await res.json();
                if (!res.ok) throw new Error(data?.mensaje || 'Error al eliminar');
            },
            'dialogo-eliminar-rubrica'
        );
    } catch (err) {
        mostrarNotificacion(err.message || 'Error al eliminar rúbrica', 'error');
        return;
    }
    if (!ok) return;

    mostrarNotificacion('Rúbrica eliminada', 'bien');
    // El catálogo de rúbricas cambió: invalidar los cachés de otros módulos
    // (p. ej. el select "Tipo de evaluación" del formulario de proyectos).
    document.dispatchEvent(new CustomEvent('catalogos:actualizados'));
    await loadRubricas();
}

// ═══════════════════════════════════════════════════════════════
// EDICIÓN DE NOMBRE Y DESCRIPCIÓN DE LA RÚBRICA
// ═══════════════════════════════════════════════════════════════

/** Abre la modal de edición con el nombre y descripción del ítem seleccionado. */
function abrirDialogoEditarRubrica() {
    const dialogo = document.getElementById('dialogo-editar-rubrica');
    if (!dialogo) return;

    const nombreInput = document.getElementById('editar-nombre');
    const descInput = document.getElementById('editar-descripcion');
    const item = document.querySelector(`.list-item[data-item-id="${currentRubricaId}"]`);

    if (nombreInput) nombreInput.value = item?.dataset.nombre || '';
    if (descInput) descInput.value = item?.dataset.descripcion || '';

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
    if (!currentRubricaId) return { success: false };

    const nombreInput = document.getElementById('editar-nombre');
    const descInput = document.getElementById('editar-descripcion');
    const nombre = nombreInput ? nombreInput.value.trim() : '';
    const descripcion = descInput ? descInput.value.trim() : '';

    if (!nombre) {
        mostrarNotificacion('El nombre de la rúbrica es requerido', 'error');
        nombreInput?.focus();
        throw new Error('Campo vacío');
    }

    const res = await fetch(`/admin/niveles-evaluacion/${currentRubricaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, descripcion }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.mensaje || 'Error al actualizar la rúbrica');

    const newNombre = data.nivel?.nombre || nombre;
    const newDesc = data.nivel?.descripcion || descripcion || 'Sin descripción';

    // Actualizar el ítem en pantalla sin recargar toda la lista
    const item = document.querySelector(`.list-item[data-item-id="${currentRubricaId}"]`);
    if (item) {
        const nombreEl = item.querySelector('.rubrica-nombre');
        const descEl = item.querySelector('.rubrica-descripcion');
        if (nombreEl) nombreEl.textContent = newNombre;
        if (descEl) descEl.textContent = newDesc;
        item.dataset.nombre = newNombre.trim();
        item.dataset.descripcion = (data.nivel?.descripcion || descripcion || '').trim();
    }

    // El nombre de la rúbrica cambió: invalidar los cachés de otros módulos
    // (select "Tipo de evaluación" del formulario de proyectos).
    document.dispatchEvent(new CustomEvent('catalogos:actualizados'));

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
            // El submit se dispara via createSubmitHandler; simplemente evitamos
            // el comportamiento por defecto del Enter para que no cierre el dialog
        }
    });

    // ── Conectar createSubmitHandler al formulario de edición ──
    // Esto da al botón "Guardar" el mismo feedback visual (normal → enviando → éxito)
    // que tiene el botón "Añadir" del formulario de crear rúbrica.
    const formEditar = document.getElementById('dialogo-editar-rubrica-form');
    if (formEditar && !formEditar.dataset.submitInitialized) {
        formEditar.dataset.submitInitialized = 'true';
        createSubmitHandler(formEditar, {
            onSubmit: guardarEdicionRubrica,
            onSuccess: async () => {
                mostrarNotificacion('Rúbrica actualizada', 'bien');
                await loadRubricas();
                cerrarDialogoEditarRubrica();
            },
            onError: (error) => {
                if (error.message === 'Campo vacío') return; // error ya notificado en guardarEdicionRubrica
                mostrarNotificacion(error.message || 'Error al actualizar la rúbrica', 'error');
            }
        });
    }
}

/**
 * Inicializa el handler de submit del formulario de rúbrica usando createSubmitHandler.
 * Se llama tanto en DOMContentLoaded como en contentUpdated para soportar el router SPA.
 * Usa un data-attribute para evitar listeners duplicados cuando el form se recrea.
 */
function initRubricaFormHandler() {
    const form = document.getElementById('form-rubrica');
    if (!form || form.dataset.handlerInitialized) return;

    form.dataset.handlerInitialized = 'true';

    // Inicializar contadores de caracteres
    form.querySelectorAll('.char-counter').forEach(counter => {
        const inputId = counter.dataset.for;
        const input = document.getElementById(inputId);
        if (!input) return;

        const max = parseInt(input.getAttribute('maxlength'), 10) || 0;

        const update = () => {
            const len = input.value.length;
            counter.textContent = `${len}/${max}`;
            counter.classList.toggle('char-counter--warn', len >= max * 0.8 && len < max);
            counter.classList.toggle('char-counter--limit', len >= max);
        };

        input.addEventListener('input', update);
        update(); // inicial
    });

    // ── Verificación de campos vacíos (patrón login) ──
    const nombreInputForm = document.getElementById('rubrica');
    const descripcionInputForm = document.getElementById('rubrica-descripcion');
    const errorNombreForm = document.getElementById('error-rubrica');
    const errorDescripcionForm = document.getElementById('error-rubrica-descripcion');

    function validarCampoRubrica(input, errorSpan, nombreCampo) {
        if (!input) return true;
        if (!input.value.trim()) {
            input.classList.add('error');
            if (errorSpan) {
                errorSpan.textContent = `Rellena este campo de ${nombreCampo}`;
                errorSpan.classList.add('show');
            }
            return false;
        }
        input.classList.remove('error');
        if (errorSpan) {
            errorSpan.textContent = '';
            errorSpan.classList.remove('show');
        }
        return true;
    }

    function quitarErrorRubrica(input, errorSpan) {
        if (input) input.classList.remove('error');
        if (errorSpan) {
            errorSpan.classList.add('hide');
            setTimeout(() => {
                errorSpan.classList.remove('show', 'hide');
                errorSpan.textContent = '';
            }, 300);
        }
    }

    const validarRubrica = () => {
        const okNombre = validarCampoRubrica(nombreInputForm, errorNombreForm, 'nombre');
        const okDescripcion = validarCampoRubrica(descripcionInputForm, errorDescripcionForm, 'descripción');
        if (!okNombre || !okDescripcion) {
            mostrarNotificacion('Por favor, rellena todos los campos correctamente.', 'error');
        }
        return okNombre && okDescripcion;
    };

    [nombreInputForm, descripcionInputForm].forEach((input, i) => {
        if (!input) return;
        const errorSpan = i === 0 ? errorNombreForm : errorDescripcionForm;
        const nombreCampo = i === 0 ? 'nombre' : 'descripción';
        input.addEventListener('blur', () => validarCampoRubrica(input, errorSpan, nombreCampo));
        input.addEventListener('input', () => {
            if (input.value.trim()) quitarErrorRubrica(input, errorSpan);
        });
    });

    createSubmitHandler(form, {
        validate: validarRubrica,
        onSubmit: async () => {
            const nombreInput = document.getElementById('rubrica');
            const descripcionInput = document.getElementById('rubrica-descripcion');
            const nombre = nombreInput ? nombreInput.value.trim() : '';
            const descripcion = descripcionInput ? descripcionInput.value.trim() : '';

            if (!nombre) {
                mostrarNotificacion('Por favor complete el nombre de la rúbrica', 'error');
                throw new Error('Campo vacío');
            }

            if (!descripcion) {
                mostrarNotificacion('Por favor complete la descripción de la rúbrica', 'error');
                throw new Error('Campo vacío');
            }

            const response = await fetch('/admin/niveles-evaluacion', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre, descripcion })
            });

            const data = await response.json();

            // El backend responde { nivel } sin el campo "success"; normalizar aquí.
            if (!response.ok) {
                const err = new Error(data?.mensaje || 'Error del servidor');
                err.mensaje = data?.mensaje;
                throw err;
            }
            return { success: true, nivel: data.nivel };
        },
        onSuccess: async (data) => {
            form.reset();
            // Transición suave hacia la edición de la rúbrica recién creada:
            // 1. Notificación de éxito
            mostrarNotificacion('Rúbrica creada correctamente', 'bien');
            // El catálogo de rúbricas cambió: invalidar los cachés de otros módulos
            // (select "Tipo de evaluación" del formulario de proyectos).
            document.dispatchEvent(new CustomEvent('catalogos:actualizados'));
            // 2. Cerrar el diálogo con su animación de salida
            toggleDialog();
            // 3. Refrescar la lista para que la rúbrica nueva aparezca
            await loadRubricas();

            // 4. Navegar a la pantalla de edición tras un breve retardo
            //    (permite ver la notificación y el cierre del diálogo antes del salto)
            const nuevaRubricaId = data?.nivel?.nivel_id;
            if (nuevaRubricaId) {
                setTimeout(() => {
                    window.navigateTo(`/menu/rubrica/${nuevaRubricaId}`);
                }, 200);
            }
        },
        onError: (error) => {
            if (error.message === 'Campo vacío') return;
            toggleDialog();
            console.log(error.message);
            mostrarNotificacion('Error al crear rúbrica', 'error');
        }
    });
}

// ═══════════════════════════════════════════════════════════════
// EXPONER FUNCIONES GLOBALMENTE (para onclick en HTML)
// ═══════════════════════════════════════════════════════════════

window.loadRubricas = loadRubricas;
window.eliminarRubrica = eliminarRubrica;

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
    initRubricaFormHandler();
    initRubricasHandlers();
});

// Re-inicializar handlers cuando el router reemplaza el contenido
document.addEventListener('contentUpdated', () => {
    initRubricasHandlers();
    initRubricaFormHandler();
});
