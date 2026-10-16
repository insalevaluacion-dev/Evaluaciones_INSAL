// ═══════════════════════════════════════════════════════════════
// MÓDULO: Exportar reporte por grado (vista /menu/evaluaciones)
//  Descarga el reporte final de TODOS los proyectos de un grado
//  (cada uno con sus evaluaciones y el desglose de criterios) en PDF.
//  El PDF lo genera el servidor a partir de la plantilla Word del grado.
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';

// ═══════════════════════════════════════════════════════════════
// LECTURA DE LA LISTA (para poblar el selector de grados)
// ═══════════════════════════════════════════════════════════════

/**
 * Obtiene la lista de proyectos evaluados y la agrupa por grado.
 * Cada grado guarda su `grado_id` y cuántos proyectos tiene, para poblar
 * el selector y saber qué pedir al endpoint de reporte.
 * @returns {Promise<Array<{nombre:string, gradoId:number, cantidad:number}>>}
 */
async function obtenerGradosDeLaLista() {
    const res = await fetch('/admin/evaluaciones/proyectos', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    let data = null;
    try {
        data = await res.json();
    } catch {
        data = null;
    }
    if (!res.ok || !data || !Array.isArray(data.proyectos)) {
        throw new Error(data?.mensaje || 'No se pudieron cargar los grados');
    }

    const mapa = new Map();
    for (const p of data.proyectos) {
        const nombre = (p.displayName || '').trim();
        const gradoId = Number(p.grado_id);
        if (!nombre || !Number.isFinite(gradoId)) continue;
        if (!mapa.has(nombre)) {
            mapa.set(nombre, { nombre, gradoId, cantidad: 0 });
        }
        mapa.get(nombre).cantidad++;
    }
    return [...mapa.values()].sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es'),
    );
}

/** Nombre de archivo seguro a partir del nombre del grado. */
function nombreArchivoGrado(gradoNombre) {
    const base = (gradoNombre || 'grado')
        .replace(/[\\/:*?"<>|]+/g, ' ')
        .trim()
        .replace(/\s+/g, '-');
    const fecha = new Date().toISOString().slice(0, 10);
    return `evaluaciones-${base || 'grado'}-${fecha}`;
}

// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN PDF (generado por el servidor con el diseño de la plantilla oficial de reporte de grado)
// ═══════════════════════════════════════════════════════════════

async function descargarPDFGrado(gradoId, gradoNombre) {
    mostrarNotificacion('Generando PDF…', 'info');

    const res = await fetch(`/admin/evaluaciones/grado/${gradoId}/reporte.pdf`);
    if (!res.ok) {
        let mensaje = `Error ${res.status} al generar el PDF del grado`;
        try {
            mensaje = (await res.json())?.mensaje || mensaje;
        } catch {
            /* respuesta sin JSON */
        }
        throw new Error(mensaje);
    }

    const url = URL.createObjectURL(await res.blob());
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `${nombreArchivoGrado(gradoNombre)}.pdf`;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    mostrarNotificacion('PDF descargado', 'bien');
}


// ═══════════════════════════════════════════════════════════════
// DIÁLOGO DE SELECCIÓN DE GRADO
// ═══════════════════════════════════════════════════════════════

/** Cierra el diálogo con animación. */
function cerrarDialogo(dialogo) {
    dialogo.classList.add('closing');
    const fallback = setTimeout(() => {
        if (dialogo.open) {
            dialogo.classList.remove('closing');
            dialogo.close();
        }
    }, 1500);
    dialogo.addEventListener('animationend', () => {
        clearTimeout(fallback);
        dialogo.classList.remove('closing');
        dialogo.close();
    }, { once: true });
}

/** Abre el diálogo y lo rellena con los grados disponibles. */
async function abrirDialogoGrado() {
    const dialogo = document.getElementById('dialogo-descargar-grado');
    const select = dialogo?.querySelector('#grado-select-descargar');
    if (!dialogo || !select) return;

    try {
        const grados = await obtenerGradosDeLaLista();

        // Conservar la opción placeholder (value="" + hidden) que el
        // custom-select usa como label inicial. Sin esto, al limpiar con
        // innerHTML='' la primera opción quedaba seleccionada por defecto y
        // el trigger mostraba "1G-A (1 proyecto)" en vez de "Selecciona…".
        select.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Selecciona un grado…';
        placeholder.hidden = true;
        select.appendChild(placeholder);

        if (grados.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = 'No hay grados disponibles';
            opt.disabled = true;
            select.appendChild(opt);
        } else {
            for (const g of grados) {
                const opt = document.createElement('option');
                opt.value = String(g.gradoId);
                opt.textContent = `${g.nombre} (${g.cantidad} ${g.cantidad === 1 ? 'proyecto' : 'proyectos'})`;
                select.appendChild(opt);
            }
        }

        // Resetear la selección para que se muestre el placeholder.
        select.value = '';
    } catch (err) {
        console.error('Error al cargar los grados:', err);
        mostrarNotificacion(err?.message || 'No se pudieron cargar los grados', 'error');
    }

    if (dialogo.hasAttribute('open')) {
        cerrarDialogo(dialogo);
    } else {
        dialogo.showModal();
    }
}

/** Exporta el reporte del grado elegido en el diálogo (PDF). */
async function exportarDesdeDialogo() {
    const dialogo = document.getElementById('dialogo-descargar-grado');
    const select = dialogo?.querySelector('#grado-select-descargar');
    const gradoId = select?.value;
    if (!gradoId) {
        mostrarNotificacion('Selecciona un grado', 'info');
        return;
    }

    const btn = dialogo?.querySelector('#btn-descargar-grado-pdf');
    if (btn) btn.disabled = true;

    try {
        const gradoNombre = (select.selectedOptions?.[0]?.textContent || '').replace(/\s*\(\d+ proyectos?\)\s*$/, '');
        await descargarPDFGrado(gradoId, gradoNombre);
        cerrarDialogo(dialogo);
    } catch (err) {
        console.error('Error al exportar grado:', err);
        mostrarNotificacion(err?.message || 'Error al generar la descarga', 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// ═══════════════════════════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════════════════════════

/** Registra los listeners del botón y del diálogo de descarga por grado. */
function initExportarGrado() {
    const btn = document.getElementById('btn-descargar-grado');
    const dialogo = document.getElementById('dialogo-descargar-grado');
    if (!btn || !dialogo || btn.dataset.gradoInit) return;
    btn.dataset.gradoInit = 'true';

    btn.addEventListener('click', abrirDialogoGrado);
    dialogo
        .querySelector('#btn-cancelar-grado')
        ?.addEventListener('click', () => cerrarDialogo(dialogo));
    dialogo
        .querySelector('#btn-cancelar-grado-inferior')
        ?.addEventListener('click', () => cerrarDialogo(dialogo));
    dialogo
        .querySelector('#btn-descargar-grado-pdf')
        ?.addEventListener('click', () => exportarDesdeDialogo());
}

// Carga inicial y cada vez que el router reemplaza el contenido
document.addEventListener('DOMContentLoaded', initExportarGrado);
document.addEventListener('contentUpdated', initExportarGrado);

export { abrirDialogoGrado, initExportarGrado, exportarDesdeDialogo };
