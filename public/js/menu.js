// Cierra sesión y redirige a /login con una carga completa de la página
// (reemplaza todo el DOM, sin pasar por el router SPA).
async function CerrarSesion() {
    try {
        await fetch('/auth/logout', { method: 'POST' });
    } catch (err) {
        console.error('Error al cerrar sesión:', err);
    } finally {
        window.location.href = '/login';
    }
}
window.CerrarSesion = CerrarSesion;

//Funcion que abre el aside
const aside = document.getElementById("aside");

function abrirAside() {
    aside.classList.toggle('close')
}

window.abrirAside = abrirAside;

function posicionarInfoCard(menu, trigger) {
    const triggerRect = trigger.getBoundingClientRect();
    const gap = 10;
    const isMobile = window.innerWidth <= 600;
    const horizontalMargin = 12;
    const preferredLeft = isMobile ? horizontalMargin : triggerRect.left;
    const maxLeft = Math.max(horizontalMargin, window.innerWidth - menu.offsetWidth - horizontalMargin);
    const left = Math.max(horizontalMargin, Math.min(preferredLeft, maxLeft));
    const maxTop = Math.max(horizontalMargin, window.innerHeight - menu.offsetHeight - horizontalMargin);
    const top = Math.max(horizontalMargin, Math.min(triggerRect.bottom + gap, maxTop));

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
}

function cerrarMenuContextual(menu) {
    if (!menu || !menu.classList.contains('show')) return;

    menu.classList.remove('show');
    menu.classList.add('closing');
    menu.addEventListener('animationend', () => {
        menu.classList.remove('closing');
    }, { once: true });
}

// Abrir / cerrar menús contextuales tipo info-card (perfil de usuario, etc.)
window.openMenu = function (event, menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return;
    const isOpen = menu.classList.contains('show');

    // Cerrar cualquier otro menú abierto con su animación de salida.
    document.querySelectorAll('.menu_contextual.show').forEach(el => {
        if (el !== menu) cerrarMenuContextual(el);
    });

    if (isOpen) {
        cerrarMenuContextual(menu);
        return;
    }

    if (event?.currentTarget) {
        posicionarInfoCard(menu, event.currentTarget);
        menu.classList.remove('closing');
    }
    menu.classList.add('show');
};

// Cerrar todos los menús contextuales abiertos (botón X de infoCard, etc.)
window.closeAll = function () {
    document.querySelectorAll('.menu_contextual.show').forEach(el => {
        cerrarMenuContextual(el);
    });
};

document.addEventListener('click', event => {
    const menu = document.getElementById('infoCard');
    if (!menu?.classList.contains('show')) return;

    const trigger = document.getElementById('usuario_perfil');
    if (!menu.contains(event.target) && !trigger?.contains(event.target)) {
        cerrarMenuContextual(menu);
    }
});

document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const menu = document.getElementById('infoCard');
    if (menu?.classList.contains('show')) {
        event.preventDefault();
        cerrarMenuContextual(menu);
    }
});

window.addEventListener('resize', () => {
    const menu = document.getElementById('infoCard');
    const trigger = document.getElementById('usuario_perfil');
    if (menu?.classList.contains('show') && trigger) {
        posicionarInfoCard(menu, trigger);
    }
});

function cerrarAsideAutomaticamente() {
    if (window.innerWidth <= 768) {
        if (!aside.classList.contains("close")) {
            aside.classList.add("close");
        }
    } else {
        aside.classList.remove("close");
    }
}

// Ejecutar inmediatamente para sincronizar el estado sin esperas
cerrarAsideAutomaticamente();

window.addEventListener('resize', cerrarAsideAutomaticamente);

// Al redimensionar a escritorio, restaurar estructura original de menús
// Al redimensionar a móvil, reinicializar bottom sheet al abrir el siguiente menú
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && typeof teardownBottomSheet === 'function') {
        document.querySelectorAll('.menu_contextual').forEach(m => {
            teardownBottomSheet(m);
        });
    }
});

// Cerrar el aside al hacer click fuera del contenedor (solo en móvil)
document.addEventListener('click', (event) => {
    if (window.innerWidth <= 768 && !aside.classList.contains('close')) {
        const isClickInsideAside = aside.contains(event.target);
        const isClickOnToggleButton = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('.item-boton-menu.mobile-only')
            : null;
        // Nueva validación: ¿El clic es dentro de una modal?
        const isClickInsideDialog = event.target && typeof event.target.closest === 'function'
            ? event.target.closest('dialog')
            : null;

        if (!isClickInsideAside && !isClickOnToggleButton && !isClickInsideDialog) {
            aside.classList.add('close');
        }
    }
});

window.toggleDialog = function (dialogId) {
    if (!dialogId) {
        const open = document.querySelector('dialog[open]');
        if (open) cerrarDialogoAnimado(open);
        return;
    }
    const dialog = document.getElementById(dialogId);
    if (!dialog) return;
    if (dialog.hasAttribute('open')) {
        cerrarDialogoAnimado(dialog);
    } else {
        dialog.showModal();
    }
};

function cerrarDialogoAnimado(dialog) {
    dialog.classList.add('closing');
    // Timeout de seguridad: si animationend no se dispara
    // (pestañas ocultas/bloqueadas), forzamos el cierre.
    const fallback = setTimeout(() => {
        if (dialog.open) {
            dialog.classList.remove('closing');
            dialog.close();
        }
    }, 1500);

    dialog.addEventListener('animationend', () => {
        clearTimeout(fallback);
        dialog.classList.remove('closing');
        dialog.close();
    }, { once: true });
}

// Cerrar al hacer clic en backdrop
document.addEventListener('click', (e) => {
    const openDialog = document.querySelector('dialog[open]');
    if (openDialog && e.target === openDialog) {
        // Verificamos si el clic fue realmente en el backdrop (fuera del contenido)
        const rect = openDialog.getBoundingClientRect();
        const isInDialog = (
            e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom
        );

        // Solo cerramos si el clic está fuera de las coordenadas del contenido del dialog
        if (!isInDialog) cerrarDialogoAnimado(openDialog);
    }
});

export { cerrarDialogoAnimado };