/**
 * Diálogo de Configuración (dialog-1 · views/menu.ejs)
 *
 * - Pestañas: Cuenta / Información.
 * - Cuenta: carga el perfil (GET /admin/mi-perfil), permite editar el nombre
 *   y guardar (PUT /admin/mi-perfil), y cerrar sesión.
 * - Información: datos estáticos del sistema.
 *
 * El botón "Configuración" del infoCard usa data-config-abrir (NO onclick
 * toggleDialog) para poder ejecutar cargarPerfil() cada vez que se abre.
 */
import { mostrarNotificacion } from './notificaciones.js';

const dialogo = document.getElementById('dialog-1');

let editandoNombre = false;

/* ── Utilidades ──────────────────────────────────────────────────────────── */

const $ = (sel) => dialogo?.querySelector(sel) ?? null;

/* ── Pestañas ────────────────────────────────────────────────────────────── */

function activarPestana(nombre) {
    dialogo.querySelectorAll('.dialog-configuracion__tab').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.tab === nombre);
    });
    dialogo.querySelectorAll('.dialog-configuracion__panel').forEach((panel) => {
        panel.classList.toggle('active', panel.dataset.panel === nombre);
    });
}

function initPestanas() {
    dialogo.querySelectorAll('.dialog-configuracion__tab').forEach((tab) => {
        tab.addEventListener('click', () => activarPestana(tab.dataset.tab));
    });
}

/* ── Cuenta: perfil ──────────────────────────────────────────────────────── */

function pintarPerfil(maestro) {
    const nombre = maestro?.nombre || '';
    const email = maestro?.email || '';
    const rol = maestro?.rolNombre || maestro?.rol || '';

    const elNombre = $('#config-nombre-display');
    const elEmail = $('#config-email');
    const elRol = $('#config-rol');
    const inputNombre = $('#config-input-nombre');

    if (elNombre) elNombre.textContent = nombre || 'Sin nombre de usuario';
    if (elEmail) {
        elEmail.textContent = email || 'Sin correo registrado';
        elEmail.classList.toggle('vacio', !email);
    }
    if (elRol) elRol.textContent = rol || 'Sin rol';
    if (inputNombre) {
        inputNombre.value = nombre;
        inputNombre.disabled = true;
    }
    setEditando(false);
}

async function cargarPerfil() {
    try {
        const res = await fetch('/admin/mi-perfil');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        pintarPerfil(data.maestro || {});
    } catch (err) {
        console.error('Error al cargar perfil:', err);
        // Fallback: al menos mostrar el nombre que llegó renderizado al EJS
        const fallback = document.querySelector('.info-card .title')?.textContent || '';
        pintarPerfil({ nombre: fallback.trim() });
    }
}

/* ── Cuenta: editar nombre ───────────────────────────────────────────────── */

function setEditando(valor) {
    editandoNombre = valor;
    const input = $('#config-input-nombre');
    const btn = $('#config-btn-editar-nombre');
    if (!input || !btn) return;

    input.disabled = !valor;
    if (valor) {
        input.focus();
        input.select();
        btn.querySelector('span').textContent = 'check';
        btn.querySelector('p').textContent = 'Guardar';
    } else {
        btn.querySelector('span').textContent = 'edit';
        btn.querySelector('p').textContent = 'Editar';
    }
}

async function guardarNombre() {
    const input = $('#config-input-nombre');
    const btn = $('#config-btn-editar-nombre');
    const nombre = (input?.value || '').trim();

    if (!nombre) {
        mostrarNotificacion('El nombre no puede estar vacío', 'error');
        return;
    }

    btn.disabled = true;
    const original = btn.querySelector('p').textContent;
    btn.querySelector('p').textContent = 'Guardando…';

    try {
        const res = await fetch('/admin/mi-perfil', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.mensaje || `HTTP ${res.status}`);

        mostrarNotificacion('Perfil actualizado', 'bien');
        // Refrescar perfil (y de paso el nombre en la info-card / aside)
        await cargarPerfil();
        refrescarNombresEnPagina(nombre);
    } catch (err) {
        console.error('Error al guardar perfil:', err);
        mostrarNotificacion(err.message || 'No se pudo actualizar el perfil', 'error');
        btn.querySelector('p').textContent = original;
    } finally {
        btn.disabled = false;
    }
}

/** Actualiza el nombre mostrado en la info-card y el aside sin recargar. */
function refrescarNombresEnPagina(nombre) {
    document.querySelectorAll('.info-card .title').forEach((el) => {
        el.textContent = nombre;
    });
    const asideTexto = document.querySelector('#usuario_perfil .perfil-info .texto');
    if (asideTexto) asideTexto.textContent = nombre;
}

function initEditarNombre() {
    $('#config-btn-editar-nombre')?.addEventListener('click', () => {
        if (editandoNombre) {
            guardarNombre();
        } else {
            setEditando(true);
        }
    });
    // Enter dentro del input = guardar
    $('#config-input-nombre')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') guardarNombre();
        if (e.key === 'Escape') {
            const actual = document.querySelector('.info-card .title')?.textContent || '';
            $('#config-input-nombre').value = actual.trim();
            setEditando(false);
        }
    });
}

/* ── Cuenta: cerrar sesión ───────────────────────────────────────────────── */

function initCerrarSesion() {
    $('#config-btn-cerrar-sesion')?.addEventListener('click', () => {
        if (typeof window.CerrarSesion === 'function') {
            window.CerrarSesion();
        } else {
            window.location.href = '/login';
        }
    });
}

/* ── Apertura / cierre ───────────────────────────────────────────────────── */

function abrirDialogo() {
    if (!dialogo) return;
    activarPestana('cuenta');
    cargarPerfil();
    if (typeof window.toggleDialog === 'function') {
        window.toggleDialog('dialog-1');
    } else if (!dialogo.hasAttribute('open')) {
        dialogo.showModal();
    }
}

function initApertura() {
    // Botón "Configuración" del infoCard
    document.querySelectorAll('[data-config-abrir]').forEach((btn) => {
        btn.addEventListener('click', abrirDialogo);
    });
    // Botón X del diálogo
    $('#config-btn-cerrar')?.addEventListener('click', () => {
        if (typeof window.toggleDialog === 'function') {
            window.toggleDialog('dialog-1');
        } else if (dialogo.hasAttribute('open')) {
            dialogo.close();
        }
    });
}

/* ── Init ────────────────────────────────────────────────────────────────── */

function initConfiguracion() {
    if (!dialogo) return;
    if (dialogo.dataset.initialized) return;
    dialogo.dataset.initialized = '1';

    initPestanas();
    initEditarNombre();
    initCerrarSesion();
    initApertura();
}

// El diálogo vive en menu.ejs (estático), así que basta con DOMContentLoaded.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfiguracion);
} else {
    initConfiguracion();
}
