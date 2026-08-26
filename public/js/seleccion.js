document.addEventListener('DOMContentLoaded', async () => {
    const selectEvento = document.getElementById('evento');
    const selectAño = document.getElementById('año');
    const labelAño = document.getElementById('label-año');
    const selectNombre = document.getElementById('nombre');
    const selectSeccion = document.getElementById('seccion');
    const botonBuscar = document.getElementById('buscar-proyectos');
    const modalProyectos = document.getElementById('modal-proyectos');
    const contenedorProyectos = document.getElementById('contenedor-proyectos');
    const nombresMap = {
        'General': 'G',
        'Desarrollo de Software': 'DS',
        'Diseño Gráfico': 'DG',
        'Atención Primaria en Salud': 'APS',
        'Sistemas Eléctricos': 'SE',
        'Logística y Aduanas': 'LyA',
        'Administrativo Contable': 'AC'
    };

    selectEvento.addEventListener('change', async () => {
        const [numNivel, año, nombreEvento] = selectEvento.value.split('|') || [];
        selectAño.disabled = true;
        selectNombre.disabled = true;
        selectSeccion.disabled = true;
        selectAño.innerHTML = '<option value="" hidden>Seleccione un año</option>';
        selectNombre.innerHTML = '<option value="" hidden>Seleccione un grado</option>';
        selectSeccion.innerHTML = '<option value="" hidden>Seleccione una sección</option>';
        botonBuscar.disabled = true;
        labelAño.style.display = 'none';
        selectAño.style.display = 'none';

        if (!numNivel) return;

        const respuestaNivel = await fetch('/guardar-nivel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numNivel })
        });
        const nivelData = await respuestaNivel.json();
        console.log('Respuesta /guardar-nivel:', nivelData);

        if (numNivel === '1') {
            labelAño.style.display = 'block';
            selectAño.style.display = 'block';
            // Mostrar linear progress mientras se cargan los años
            customSelectSetLoading('año', true);
            try {
                const respuestaAños = await fetch(`/grados/anos/${numNivel}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                const añosData = await respuestaAños.json();
                console.log('Respuesta /grados/anos:', añosData);
                if (añosData.años?.length > 0) {
                    añosData.años.forEach(año => {
                        const option = document.createElement('option');
                        option.value = año;
                        option.textContent = año;
                        selectAño.appendChild(option);
                    });
                    selectAño.disabled = false;
                }
            } finally {
                customSelectSetLoading('año', false);
            }
        } else {
            // Para niveles de Expotecnia, obtener el año escolar real disponible
            // (el segmento "año" de la opción puede no coincidir con el de la BD)
            try {
                const respuestaAños2 = await fetch(`/grados/anos/${numNivel}`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                const añosData2 = await respuestaAños2.json();
                const añoReal = añosData2.años?.[0] || año;
                // Asegurar que el select de año tenga el valor real como opción
                selectAño.innerHTML = `<option value="${añoReal}">${añoReal}</option>`;
                selectAño.value = añoReal;
                cargarNombres(numNivel, añoReal);
            } catch (err) {
                console.error('Error al cargar años:', err);
                selectAño.innerHTML = `<option value="${año}">${año}</option>`;
                selectAño.value = año;
                cargarNombres(numNivel, año);
            }
        }
    });

    selectAño.addEventListener('change', async () => {
        const numNivel = selectEvento.value.split('|')[0];
        const año = selectAño.value;
        selectNombre.disabled = true;
        selectSeccion.disabled = true;
        selectNombre.innerHTML = '<option value="" hidden>Seleccione un grado</option>';
        selectSeccion.innerHTML = '<option value="" hidden>Seleccione una sección</option>';
        botonBuscar.disabled = true;

        if (!numNivel || !año) return;

        cargarNombres(numNivel, año);
    });

    async function cargarNombres(numNivel, año) {
        // Mostrar linear progress mientras se cargan los grados
        customSelectSetLoading('nombre', true);
        try {
            const respuestaNombres = await fetch(`/grados/nombres/${numNivel}/${encodeURIComponent(año)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const nombresData = await respuestaNombres.json();
            console.log('Respuesta /grados/nombres:', nombresData);
            if (nombresData.nombres?.length > 0) {
                nombresData.nombres.forEach(nombres => {
                    const option = document.createElement('option');
                    option.value = nombres.id;
                    option.textContent = nombres.abrev;
                    selectNombre.appendChild(option);
                });
                selectNombre.disabled = false;
            }
        } finally {
            customSelectSetLoading('nombre', false);
        }
    }

    selectNombre.addEventListener('change', async () => {
        const [numNivel] = selectEvento.value.split('|');
        const año = selectAño.value || selectEvento.value.split('|')[1];
        const nombre = nombresMap[selectNombre.value] || selectNombre.value;
        selectSeccion.disabled = true;
        selectSeccion.innerHTML = '<option value="" hidden>Seleccione una sección</option>';
        botonBuscar.disabled = true;

        if (!numNivel || !año || !nombre) return;

        // Mostrar linear progress mientras se cargan las secciones
        customSelectSetLoading('seccion', true);
        try {
            const respuestaSecciones = await fetch(`/grados/secciones/${numNivel}/${encodeURIComponent(año)}/${encodeURIComponent(nombre)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const seccionesData = await respuestaSecciones.json();
            console.log('Respuesta /grados/secciones:', seccionesData);
            if (seccionesData.secciones?.length > 0) {
                seccionesData.secciones.forEach(seccion => {
                    const option = document.createElement('option');
                    option.value = seccion;
                    option.textContent = seccion;
                    selectSeccion.appendChild(option);
                });
                selectSeccion.disabled = false;
            }
        } finally {
            customSelectSetLoading('seccion', false);
        }
    });

    selectSeccion.addEventListener('change', () => {
        const [numNivel] = selectEvento.value.split('|');
        const año = selectAño.value || selectEvento.value.split('|')[1];
        if (numNivel && año && selectNombre.value && selectSeccion.value) {
            botonBuscar.disabled = false;
        }
    });

    botonBuscar.addEventListener('click', async () => {
        const [numNivel] = selectEvento.value.split('|');
        const año = selectAño.value || selectEvento.value.split('|')[1];
        const nombre = nombresMap[selectNombre.value] || selectNombre.value;
        const seccion = selectSeccion.value;

        // Mostrar feedback de carga en el botón
        botonBuscar.classList.add('cargando');
        botonBuscar.disabled = true;

        try {
            const respuestaProyectos = await fetch(`/proyectos/${numNivel}/${encodeURIComponent(año)}/${encodeURIComponent(nombre)}/${encodeURIComponent(seccion)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const proyectosData = await respuestaProyectos.json();
            console.log('Respuesta /proyectos:', proyectosData);
            contenedorProyectos.innerHTML = '';

            if (proyectosData.proyectos?.length > 0) {
                const proyectosHTML = proyectosData.proyectos.map(proyecto => `
                <div class="grupo__element">
                    <p>${proyecto.nombre}</p>
                    <div class="principal__element--button">
                        <button class="btn centrar" onclick="guardarProyecto(${proyecto.proyecto_id}, '${proyecto.nombre}')">
                            Evaluar
                            <span class="material-symbols-rounded">
                                arrow_right_alt
                            </span>
                        </button>
                    </div>
                </div>
            `).join('');

                contenedorProyectos.innerHTML = proyectosHTML;
                modalProyectos.style.display = 'block';
                void modalProyectos.offsetWidth;
                modalProyectos.classList.add('active');
            } else {
                contenedorProyectos.innerHTML = 'No hay proyectos disponibles para estos filtros.';
                modalProyectos.style.display = 'block';
                void modalProyectos.offsetWidth;
                modalProyectos.classList.add('active');
            }
        } finally {
            // Restaurar el botón
            botonBuscar.classList.remove('cargando');
            botonBuscar.disabled = false;
        }
    });
});

async function guardarProyecto(idProyecto, nombreProyecto) {
    const response = await fetch('/guardar-proyecto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idProyecto, nombreProyecto })
    });
    const result = await response.json();
    if (response.ok) {
        window.location.href = '/evaluacion';
    } else {
        console.error('Error al guardar el proyecto:', result.message);
        mostrarNotificacion('Ocurrió un error al guardar el proyecto. Por favor, inténtelo de nuevo.', 'error');
    }
}

function cerrarModalProyectos() {
    const modal = document.getElementById('modal-proyectos');

    // Evitar cierres repetidos mientras la animación está en curso
    if (modal.classList.contains('cerrando')) return;
    modal.classList.add('cerrando');

    modal.classList.remove('active');
    setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('cerrando');
    }, 300);
}
