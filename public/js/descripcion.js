function AbrirDescripcion(elemento) {
    const descripcion = elemento.nextElementSibling;
    const flecha = elemento.querySelector('.flecha');
    
    // Verificar si el elemento actual ya está abierto
    const yaAbierto = descripcion.classList.contains('expandir');
    
    // Primero cerrar todos los acordeones
    cerrarTodosSubmenus();
    
    // Si no estaba abierto, abrirlo
    if (!yaAbierto) {
        descripcion.classList.add('expandir');
        flecha.classList.add('rotar');
    }
}

function cerrarTodosSubmenus() {
    // Cerrar todas las descripciones expandidas
    Array.from(document.getElementsByClassName('expandir')).forEach(submenu => {
        submenu.classList.remove('expandir');
        // Buscar la flecha correspondiente y resetearla
        const flechaCorrespondiente = submenu.previousElementSibling.querySelector('.flecha');
        if (flechaCorrespondiente) {
            flechaCorrespondiente.classList.remove('rotar');
        }
    });
}