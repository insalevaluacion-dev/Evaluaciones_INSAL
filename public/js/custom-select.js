/* ==========================================================================
   Select personalizado con menú desplegable animado.
   Convierte los <select data-custom> de la página en un componente visual
   con animaciones, manteniendo el <select> nativo oculto para que toda la
   lógica existente (valores, opciones dinámicas, disabled, display) siga
   funcionando sin cambios.
   ========================================================================== */
(function () {
    'use strict';

    // Registro global de componentes para controlar su estado de carga
    window.__customSelectRegistry = window.__customSelectRegistry || {};

    // Helper: activa/desactiva el linear progress de un select por su id
    window.customSelectSetLoading = function (id, loading) {
        const entry = window.__customSelectRegistry && window.__customSelectRegistry[id];
        if (entry) entry.setLoading(loading);
    };

    // Bloqueo del scroll del body mientras hay un menú desplegable abierto
    let openDropdowns = 0;
    function lockBodyScroll() {
        openDropdowns++;
        document.body.classList.add('custom-select-locked');
    }
    function unlockBodyScroll() {
        openDropdowns = Math.max(0, openDropdowns - 1);
        if (openDropdowns === 0) {
            document.body.classList.remove('custom-select-locked');
        }
    }

    function buildCustomSelect(select) {
        if (select.dataset.customSelect === 'true') return;
        select.dataset.customSelect = 'true';

        // Contenedor
        const container = document.createElement('div');
        container.className = 'custom-select';

        // Botón disparador
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'custom-select__trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');

        const label = document.createElement('span');
        label.className = 'custom-select__trigger-label';

        const arrow = document.createElement('span');
        arrow.className = 'custom-select__arrow';
        arrow.setAttribute('aria-hidden', 'true');

        trigger.appendChild(label);
        trigger.appendChild(arrow);

        // Panel desplegable
        const dropdown = document.createElement('ul');
        dropdown.className = 'custom-select__dropdown';
        dropdown.setAttribute('role', 'listbox');

        container.appendChild(trigger);

        // Si el <select> está dentro de un <dialog>, se monta el menú como hijo del
        // propio <dialog>. Así queda dentro del top-layer del modal (se pinta por
        // encima del resto) y, con position: fixed respecto al viewport, no se recorta
        // dentro del contenido del diálogo.
        const insideDialog = !!select.closest('dialog');
        if (insideDialog) {
            select.closest('dialog').appendChild(dropdown);
            dropdown.myContainer = container;
        } else {
            container.appendChild(dropdown);
        }

        // Insertar después del <select> nativo y ocultarlo
        select.parentNode.insertBefore(container, select.nextSibling);
        select.classList.add('custom-select__native');

        // Linear progress de carga (se muestra mientras el select obtiene sus opciones).
        // IMPORTANTE: NO usar la clase genérica 'section-loader' porque la app la usa
        // en hideLoader() vía querySelector('.section-loader') para ocultar el loader de
        // la sección; si este loader interno llevara esa clase, robaría el primer match
        // y el loader principal quedaría visible para siempre.
        const loader = document.createElement('div');
        loader.className = 'custom-select__loader';
        loader.innerHTML = '<div class="progreso-lineal indeterminado"><div class="progreso-indicador"></div></div>';
        container.appendChild(loader);

        // Control del estado de carga
        function setLoading(loading) {
            container.classList.toggle('is-loading', !!loading);
        }
        window.__customSelectRegistry[select.id] = { setLoading };

        function getSelectedText() {
            return select.options[select.selectedIndex]
                ? select.options[select.selectedIndex].textContent
                : '';
        }

        // Búsqueda opcional (solo si el select lleva data-searchable): un input
        // fijo en la parte superior del panel que filtra las opciones en vivo.
        let searchInput = null;
        if (select.hasAttribute('data-searchable')) {
            searchInput = document.createElement('input');
            searchInput.type = 'text';
            searchInput.className = 'custom-select__search';
            searchInput.placeholder = select.dataset.searchPlaceholder || 'Buscar…';
            searchInput.setAttribute('role', 'searchbox');
            searchInput.setAttribute('aria-label', 'Buscar opciones');
            searchInput.setAttribute('autocomplete', 'off');
            searchInput.addEventListener('input', applyFilter);
            dropdown.appendChild(searchInput);
        }

        // Filtra las opciones visibles según el texto del buscador.
        // Busca en el texto visible Y en data-search (p. ej. un ID/NIE oculto).
        function applyFilter() {
            if (!searchInput) return;
            const q = (searchInput.value || '').trim().toLowerCase();
            Array.from(dropdown.children).forEach((c) => {
                if (!c.classList.contains('custom-select__option')) return;
                const t = c.textContent.trim().toLowerCase();
                const extra = (c.dataset.search || '').trim().toLowerCase();
                const show = !q || t.includes(q) || extra.includes(q);
                c.style.display = show ? '' : 'none';
            });
            dropdown.scrollTop = 0;
        }

        function buildOptions() {
            // Limpiar solo las <li> (opciones), conservando el buscador si existe.
            Array.from(dropdown.children).forEach((c) => {
                if (c.classList.contains('custom-select__option')) c.remove();
            });
            let index = 0;
            Array.from(select.options).forEach((opt) => {
                // Omitir la opción placeholder (value="" y oculta)
                if (opt.value === '' && opt.hasAttribute('hidden')) return;

                const li = document.createElement('li');
                li.className = 'custom-select__option';
                li.setAttribute('role', 'option');
                li.dataset.value = opt.value;
                li.textContent = opt.textContent;
                if (opt.dataset.search) li.dataset.search = opt.dataset.search;
                li.style.setProperty('--i', index);
                if (opt.value === select.value) {
                    li.classList.add('is-selected');
                }
                li.addEventListener('click', (e) => {
                    e.stopPropagation();
                    select.value = li.dataset.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    closeDropdown();
                    syncTrigger();
                });
                dropdown.appendChild(li);
                index++;
            });
            applyFilter();
            syncTrigger();
        }

        function syncTrigger() {
            label.textContent = getSelectedText();
            // Marca si el select tiene un valor elegido: sin valor (placeholder
            // "Selecciona …") el CSS atenúa el label en gris.
            container.classList.toggle('has-value', select.value !== '');
            Array.from(dropdown.children).forEach((li) => {
                li.classList.toggle('is-selected', li.dataset.value === select.value);
            });
        }

        function openDropdown() {
            if (select.disabled) return;
            buildOptions();
            if (searchInput) {
                searchInput.value = '';
                applyFilter();
            }
            positionDropdown();
            container.classList.add('is-open');
            dropdown.classList.add('is-open');
            lockBodyScroll();
            // Enfocar el buscador para escribir de inmediato (si existe).
            if (searchInput) {
                requestAnimationFrame(() => searchInput.focus());
            }
        }

        function closeDropdown() {
            if (container.classList.contains('is-open')) {
                unlockBodyScroll();
            }
            container.classList.remove('is-open');
            dropdown.classList.remove('is-open');
        }

        // Suma los offsets (offsetTop/offsetLeft) de un elemento y todos sus
        // ancestros hasta llegar a `ancestor`, devolviendo la posición del
        // elemento respecto al padding box de `ancestor`.
        function offsetWithin(element, ancestor) {
            let top = 0;
            let left = 0;
            let node = element;
            while (node && node !== ancestor && node !== document.body) {
                top += node.offsetTop || 0;
                left += node.offsetLeft || 0;
                node = node.offsetParent;
            }
            return { top, left };
        }

        // Ajusta la dirección (hacia abajo o hacia arriba) y la altura del menú
        // para que nunca salga de la pantalla ni active el scroll del body.
        function positionDropdown() {
            const gap = 8;
            const maxH = 280;
            // Por defecto el menú se ancla al trigger (solo el texto del select).
            // Con data-dropdown-anchor se ancla a otro elemento (p. ej. todo el
            // .toolbar-control--sort) para que el desplegable tenga el mismo ancho
            // y quede alineado justo debajo del control completo.
            const anchorSel = select.dataset.dropdownAnchor;
            const anchor = anchorSel ? select.closest(anchorSel) : trigger;
            const rect = (anchor || trigger).getBoundingClientRect();
            const vh = window.innerHeight;

            const spaceBelow = vh - rect.bottom - gap;
            const spaceAbove = rect.top - gap;

            // Elegir la dirección con más espacio disponible:
            //  1. Si cabe el máximo hacia abajo, abrir hacia abajo.
            //  2. Si no, y cabe hacia arriba, abrir hacia arriba.
            //  3. Si en ambos lados hay poco espacio, abrir hacia el lado con más hueco.
            let openUp;
            if (spaceBelow >= maxH) {
                openUp = false;
            } else if (spaceAbove >= maxH) {
                openUp = true;
            } else {
                openUp = spaceAbove > spaceBelow;
            }
            container.classList.toggle('is-open-up', openUp);
            dropdown.classList.toggle('is-open-up', openUp);

            // Altura máxima = espacio real disponible en la dirección elegida.
            // NO se fuerza un mínimo que pueda desbordar el viewport.
            const available = openUp ? spaceAbove : spaceBelow;
            dropdown.style.maxHeight = Math.max(0, Math.min(maxH, available)) + 'px';

            dropdown.style.width = rect.width + 'px';
            dropdown.style.right = 'auto';

            if (insideDialog) {
                // El <dialog> se centra con transform: translate(-50%,-50%), lo que
                // crea un "containing block" para sus descendientes con position:fixed
                // (pasan a ser relativos al diálogo transformado, no al viewport).
                // Por eso, dentro de un diálogo el menú se ancla con position:absolute
                // respecto al padding box del diálogo (sin transform).
                const ownerDialog = select.closest('dialog');
                const scrollContainer =
                    ownerDialog.querySelector('.dialogo-add__contenido') ||
                    ownerDialog.querySelector('.dialog-inner') ||
                    ownerDialog;
                const hasScroll = scrollContainer && scrollContainer !== ownerDialog;
                // offsetWithin suma los offsets de todos los ancestros (incluyendo
                // .custom-select que es position:relative) hasta el diálogo.
                const { top: offTop, left: offLeft } = offsetWithin(trigger, ownerDialog);
                // Compensar el scroll interno del contenedor (p. ej. .dialogo-add__contenido)
                const scrollTop = hasScroll ? scrollContainer.scrollTop : 0;
                const scrollLeft = hasScroll ? scrollContainer.scrollLeft : 0;
                const top = offTop - scrollTop;
                const left = offLeft - scrollLeft;
                dropdown.style.position = 'absolute';
                dropdown.style.zIndex = '1000';
                dropdown.style.left = left + 'px';
                dropdown.style.width = trigger.offsetWidth + 'px';
                if (openUp) {
                    dropdown.style.top = 'auto';
                    dropdown.style.bottom = (ownerDialog.offsetHeight - top + gap) + 'px';
                } else {
                    dropdown.style.top = (top + trigger.offsetHeight + gap) + 'px';
                    dropdown.style.bottom = 'auto';
                }
            } else {
                // Posicionar en "fixed" respecto al viewport.
                // Esto escapa del recorte (overflow) de los ancestros (p. ej. section.content
                // con overflow:hidden auto) y permite ajustar la posición exacta sin que el
                // menú se corte ni se salga de la pantalla.
                dropdown.style.position = 'fixed';
                dropdown.style.left = rect.left + 'px';
                if (openUp) {
                    dropdown.style.top = 'auto';
                    dropdown.style.bottom = (vh - rect.top + gap) + 'px';
                } else {
                    dropdown.style.top = (rect.bottom + gap) + 'px';
                    dropdown.style.bottom = 'auto';
                }
            }
        }

        function syncDisabled() {
            container.classList.toggle('is-disabled', select.disabled);
            trigger.disabled = select.disabled;
        }

        function syncVisibility() {
            // seleccion.js alterna style.display ('none'/'block') en el nativo
            container.style.display = select.style.display === 'none' ? 'none' : '';
        }

        // Abrir/cerrar al hacer clic en el disparador
        trigger.addEventListener('click', () => {
            if (container.classList.contains('is-open')) {
                closeDropdown();
            } else {
                openDropdown();
            }
        });

        // Si el select usa un ancla custom (data-dropdown-anchor), permitir que
        // toda el control (label.toolbar-control) abra el dropdown al hacer click.
        const anchorSel = select.dataset.dropdownAnchor;
        const anchorEl = anchorSel ? select.closest(anchorSel) : null;
        if (anchorEl) {
            anchorEl.addEventListener('click', (e) => {
                // El label envuelve el control: al hacer clic en el icono o en el
                // texto, el navegador reenvía el clic al <select> asociado (que está
                // oculto) generando un segundo toggle. Lo prevenimos para que solo
                // haya un único toggle por clic.
                e.preventDefault();
                // Evitar abrir dos veces si el click ya fue en el trigger
                if (container.contains(e.target)) return;
                if (container.classList.contains('is-open')) {
                    closeDropdown();
                } else {
                    openDropdown();
                }
            });
        }

        // Reposicionar mientras esté abierto si cambia el tamaño de la ventana
        window.addEventListener('resize', () => {
            if (container.classList.contains('is-open')) positionDropdown();
        });

        // Cerrar al hacer clic fuera
        document.addEventListener('click', (e) => {
            // Si el clic ocurrió dentro del ancla (p. ej. el icono o el texto
            // "Ordenar por:" del label), no cerrar: ese listener abre/cierra.
            if (anchorEl && anchorEl.contains(e.target)) return;
            // No cerrar si el clic es en el contenedor ni en el dropdown (en el
            // caso de selects dentro de un <dialog>, el menú se monta como hijo
            // del diálogo y NO dentro del contenedor).
            if (container.contains(e.target)) return;
            if (dropdown.contains(e.target)) return;
            closeDropdown();
        });

        // Cerrar con Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDropdown();
        });

        // Reaccionar a cambios en el <select> nativo (opciones, disabled, display)
        const observer = new MutationObserver(() => {
            buildOptions();
            syncDisabled();
            syncVisibility();
        });
        observer.observe(select, {
            attributes: true,
            childList: true,
            subtree: true,
        });

        select.addEventListener('change', syncTrigger);

        // Cerrar el dropdown si su <dialog> contenedor se cierra (para selects que
        // montan el menú como hijo del dialog), evitando que quede abierto de forma
        // residual sobre la página una vez cerrado el modal.
        if (insideDialog) {
            const ownerDialog = select.closest('dialog');
            ownerDialog?.addEventListener('close', closeDropdown);

            // Si el contenido del diálogo hace scroll (p. ej. .dialogo-add__contenido
            // con overflow-y:auto), cerrar el menú: el trigger se mueve y el panel,
            // que se posiciona respecto al diálogo, quedaría descolocado.
            const scrollContainer =
                ownerDialog?.querySelector('.dialogo-add__contenido') ||
                ownerDialog?.querySelector('.dialog-inner') ||
                ownerDialog;
            if (scrollContainer) {
                scrollContainer.addEventListener('scroll', () => {
                    if (container.classList.contains('is-open')) closeDropdown();
                }, { passive: true });
            }
        }

        // Inicialización
        buildOptions();
        syncDisabled();
        syncVisibility();
    }

    function initAll() {
        // Limpiar dropdowns montados en <dialog> que quedaron huérfanos tras
        // navegar por el SPA: si su contenedor ya no está en el DOM se eliminan
        // para evitar fugas de nodos.
        document.querySelectorAll('.custom-select__dropdown').forEach((d) => {
            const owner = d.myContainer;
            if (owner && !document.body.contains(owner)) d.remove();
        });
        document.querySelectorAll('select[data-custom]').forEach(buildCustomSelect);
    }

    // Re-inicializar al navegar en el SPA (router.js dispara 'contentUpdated')
    document.addEventListener('contentUpdated', initAll);

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAll);
    } else {
        initAll();
    }
})();
