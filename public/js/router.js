const navigateTo = url => {
    // link.href devuelve la URL absoluta (ej. http://localhost:3000/menu/inicio),
    // así que extraemos solo el pathname para comparar con las rutas del SPA.
    const pathname = new URL(url, window.location.origin).pathname;

    // Si la ruta no pertenece al SPA (no es /menu), redirigir con una carga
    // completa que reemplace todo el DOM (p. ej. /login).
    if (!pathname.startsWith('/menu')) {
        window.location.href = url;
        return;
    }
    history.pushState(null, null, url);
    router();
};

// Exponer globalmente para que otros módulos (como materias.js) puedan usarlo
window.navigateTo = navigateTo;

function matchRoute(pathname) {
    const patterns = [
        { pattern: new RegExp(`^/menu/inicio$`), fetchUrl: () => `/menu/inicio/html` },
        { pattern: new RegExp(`^/menu/proyectos$`), fetchUrl: () => `/menu/proyectos/html` },
        { pattern: new RegExp(`^/menu/evaluaciones$`), fetchUrl: () => `/menu/evaluaciones/html` },
        { pattern: new RegExp(`^/menu/evaluaciones/(\\d+)$`), fetchUrl: (match) => `/menu/evaluaciones/${match[1]}/html` },
        { pattern: new RegExp(`^/menu/papelera$`), fetchUrl: () => `/menu/papelera/html` },
        { pattern: new RegExp(`^/menu/rubrica$`), fetchUrl: () => `/menu/rubrica/html` },
        { pattern: new RegExp(`^/menu/rubrica/(\\d+)$`), fetchUrl: (match) => `/menu/rubrica/${match[1]}/html` },
        { pattern: new RegExp(`^/menu/proyectos/(\\d+)$`), fetchUrl: (match) => `/menu/proyectos/${match[1]}/html` },
    ];

    for (const { pattern, fetchUrl } of patterns) {
        const match = pathname.match(pattern);
        if (match) {
            return fetchUrl(match);
        }
    }
    // Fallback a inicio
    return `/menu/inicio/html`;
}

// Marca la pestaña del menú correspondiente a la ruta actual
function setActiveLink() {
    // Resuelve el href de la vista activa con la misma lógica de rutas (incluye el fallback /menu -> inicio)
    const activeHref = matchRoute(location.pathname).replace(/\/html$/, '');

    const links = document.querySelectorAll('#aside a.opcion');
    links.forEach(link => {
        link.classList.toggle('active', link.getAttribute('href') === activeHref);
    });
}

const router = async () => {
    const fetchUrl = matchRoute(location.pathname);

    try {
        const response = await fetch(fetchUrl);
        const html = await response.text();
        document.querySelector('#main__container').innerHTML = html;

        // Marcar la pestaña activa según la ruta
        setActiveLink();

        // Notificar a otros scripts que el contenido se actualizó
        document.dispatchEvent(new CustomEvent('contentUpdated', {
            detail: { route: location.pathname }
        }));
    } catch (error) {
        console.error('Error al cargar la vista:', error);
    }
};

window.addEventListener('popstate', router);

document.addEventListener('DOMContentLoaded', () => {
    document.addEventListener('click', e => {
        const link = e.target.closest('[data-link]');

        if (!link) return;

        e.preventDefault();
        navigateTo(link.href);
    });

    router();
});