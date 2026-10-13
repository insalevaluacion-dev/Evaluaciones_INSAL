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
    return router();
};

// Exponer globalmente para que otros módulos (como materias.js) puedan usarlo
window.navigateTo = navigateTo;
let navigationRequestId = 0;
let initialViewLoaded = false;
let pageResourcesLoaded = document.readyState === 'complete';

const hideLoaderWhenReady = () => {
    if (initialViewLoaded && pageResourcesLoaded) {
        document.getElementById('app-loader')?.classList.remove('is-active');
    }
};

window.addEventListener('load', () => {
    pageResourcesLoaded = true;
    hideLoaderWhenReady();
}, { once: true });

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
    const currentNavigation = ++navigationRequestId;
    const mainContainer = document.querySelector('#main__container');
    const isInitialView = !initialViewLoaded;

    if (!isInitialView && mainContainer) {
        mainContainer.innerHTML = `
            <div class="spa-route-loader" role="status" aria-label="Cargando vista">
                <img class="spa-route-loader__logo" src="/assets/svg/Logo_SV_loader.svg" alt="">
            </div>
        `;
    }

    try {
        const response = await fetch(fetchUrl, {
            // Identifica la petición como AJAX para que el server devuelva 401
            // en lugar de un redirect a /login cuando la sesión expiró.
            headers: { 'X-Requested-With': 'fetch' },
        });

        if (currentNavigation !== navigationRequestId) return false;

        // Sesión expirada: el server respondió 401 o el fetch terminó en otra
        // ruta (p. ej. siguió un redirect a /login). Salir del SPA con una
        // carga completa que reemplace TODO el DOM; nunca inyectar esa
        // respuesta dentro del dashboard.
        const finalPath = new URL(response.url, window.location.origin).pathname;
        const rutaEsperada = new URL(fetchUrl, window.location.origin).pathname;
        if (response.status === 401 || response.redirected || finalPath !== rutaEsperada) {
            window.location.href = finalPath.startsWith('/login') ? finalPath : '/login';
            return false;
        }

        const html = await response.text();
        if (currentNavigation !== navigationRequestId) return false;

        // Defensa extra: si por cualquier otra vía se recibiera una página
        // completa (p. ej. la vista login), tampoco inyectarla aquí.
        if (/<html[\s>]/i.test(html)) {
            window.location.href = '/login';
            return false;
        }

        mainContainer.innerHTML = html;

        // Marcar la pestaña activa según la ruta
        setActiveLink();

        // Notificar a otros scripts que el contenido se actualizó
        document.dispatchEvent(new CustomEvent('contentUpdated', {
            detail: { route: location.pathname }
        }));
        return true;
    } catch (error) {
        console.error('Error al cargar la vista:', error);
        if (currentNavigation === navigationRequestId && !isInitialView && mainContainer) {
            mainContainer.innerHTML = `
                <div class="spa-route-error" role="alert">
                    <p>No se pudo cargar esta vista. Comprueba tu conexión e inténtalo de nuevo.</p>
                    <button class="spa-route-error__retry" type="button">Reintentar</button>
                </div>
            `;
            mainContainer.querySelector('.spa-route-error__retry')
                .addEventListener('click', () => router());
        }
        return false;
    } finally {
        if (currentNavigation === navigationRequestId) {
            if (!initialViewLoaded) {
                initialViewLoaded = true;
                hideLoaderWhenReady();
            } else if (pageResourcesLoaded) {
                document.getElementById('app-loader')?.classList.remove('is-active');
            }
        }
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