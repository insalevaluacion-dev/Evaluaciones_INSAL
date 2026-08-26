/*tipos de NOTIFICACIONES DISPONIBLES
- error
- bien
- info
- download

en minusculas, puedes usarlo con 
mostrarNotificacion("mensaje", "tipo")

EJEMPLO:
mostrarNotificacion("Contraseña incorrecta", "error")

por Cesar Sanchez
*/
export const mostrarNotificacion = (mensaje, tipo = 'bien') => {
    let coso = document.getElementById('noti-coso');

    if (!coso) {
        coso = crearNoti();
    } else {
        // Si ya existe y hay un modal abierto, reiniciamos el popover para que 
        // se mueva al final de la pila del Top Layer y aparezca encima de todo.
        if (coso.showPopover && document.querySelector('dialog[open]')) {
            coso.hidePopover();
            coso.showPopover();
        }
    }

    const noti = document.createElement('div');
    noti.className = `noti ${tipo}`;

    const obtenerIcono = (tipo) => {
        switch (tipo) {
            case 'bien':
                return 'check_circle';
            case 'error':
                return 'cancel';
            case 'info':
                return 'info';
            case 'download':
                return `
                    <button class="boton-spinner" style="background: var(--color-primario);">
                        <svg class="svg-spinner girando" width="36" height="36" viewBox="0 0 36 36">
                            <circle class="arco-pista" cx="18" cy="18" r="13" stroke="var(--spinner-pista)"/>
                            <circle class="arco-indicador indeterminado" cx="18" cy="18" r="13" stroke="var(--spinner-arco)"/>
                        </svg>
                    </button>`;
            default:
                return 'notifications';
        }
    };

    const icono = document.createElement('span');
    icono.className = 'material-symbols-rounded noti-icon animate-click';

    const contenidoIcono = obtenerIcono(tipo);
    if (tipo === 'download') {
        icono.innerHTML = contenidoIcono;
    } else {
        icono.textContent = contenidoIcono;
    }

    const texto = document.createElement('span');
    texto.textContent = mensaje;

    noti.appendChild(icono);
    noti.appendChild(texto);
    coso.appendChild(noti);

    setTimeout(() => {
        noti.remove();
    }, 3000);
};

const crearNoti = () => {
    const container = document.createElement('div');
    container.id = 'noti-coso';

    // Usar popover para asegurar que las notificaciones estén en el Top Layer
    // y así aparezcan por encima de los elementos <dialog> abiertos con showModal()
    if (HTMLElement.prototype.hasOwnProperty('popover')) {
        container.popover = 'manual';
    }

    document.body.appendChild(container);

    if (container.showPopover) {
        container.showPopover();
    }
    return container;
};

window.mostrarNotificacion = mostrarNotificacion;