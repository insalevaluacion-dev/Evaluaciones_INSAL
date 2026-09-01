// ═══════════════════════════════════════════════════════════════
// MÓDULO: Exportar reporte por grado (vista /menu/evaluaciones)
//  Descarga el reporte final de TODOS los proyectos de un grado
//  (cada uno con sus evaluaciones y el desglose de criterios) en PDF o XLSX.
//  Reutiliza las mismas librerías (ExcelJS / jsPDF + html2canvas) que la
//  descarga por proyecto de evaluacion-detalle.js.
// ═══════════════════════════════════════════════════════════════

import { mostrarNotificacion } from './notificaciones.js';

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

/** Carga un script externo dinámicamente. */
function cargarScript(url) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = resolve;
        script.onerror = () =>
            reject(new Error('No se pudo cargar la librería de exportación'));
        document.head.appendChild(script);
    });
}

/** Carga ExcelJS desde CDN una sola vez, bajo demanda. */
function cargarExcelJS() {
    if (window.ExcelJS) return Promise.resolve(window.ExcelJS);
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src =
            'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';
        script.onload = () => resolve(window.ExcelJS);
        script.onerror = () => reject(new Error('No se pudo cargar ExcelJS'));
        document.head.appendChild(script);
    });
}

/** Carga jsPDF + html2canvas bajo demanda para generar el PDF. */
async function cargarLibreriasPDF() {
    if (!window.jspdf?.jsPDF) {
        await cargarScript(
            'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
        );
    }
    if (!window.html2canvas) {
        await cargarScript(
            'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
        );
    }
}

/** Formatea un número quitando decimales cuando es entero (10.00 → 10). */
function formatNota(valor) {
    const n = Number(valor);
    if (Number.isNaN(n)) return '—';
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Formatea un timestamp ISO → "día mes año · hh:mm". */
function formatFecha(fecha) {
    if (!fecha) return '—';
    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return String(fecha);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yy = d.getFullYear();
    const horas24 = d.getHours();
    const periodo = horas24 >= 12 ? 'p.m.' : 'a.m.';
    const horas12 = horas24 % 12 === 0 ? 12 : horas24 % 12;
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yy} · ${horas12}:${mi} ${periodo}`;
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function fechaGeneracion() {
    return formatFecha(new Date().toISOString());
}

// Misma imagen institucional que usa la descarga por proyecto
// (evaluacion-detalle.js). El SVG del escudo está en /assets/svg/ y no es
// fiable con html2canvas; esta JPG sí funciona bien en el PDF.
const LOGO_URL = '/assets/img/INSAL.jpg';

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

/**
 * Obtiene el reporte completo de un grado desde el backend.
 * @param {number|string} gradoId
 * @returns {Promise<{grado:Object, proyectos:Array}>}
 */
async function obtenerReporteGrado(gradoId) {
    const res = await fetch(`/admin/evaluaciones/grado/${gradoId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    let data = null;
    try {
        data = await res.json();
    } catch {
        data = null;
    }
    if (!res.ok) {
        throw new Error(data?.mensaje || `Error ${res.status} al consultar el grado`);
    }
    return data;
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
// EXPORTACIÓN EXCEL (XLSX)
// ═══════════════════════════════════════════════════════════════

async function exportarExcelGrado(gradoNombre, proyectos) {
    if (!proyectos.length) {
        mostrarNotificacion('No hay proyectos en este grado', 'info');
        return;
    }

    mostrarNotificacion('Preparando archivo de Excel…', 'info');
    const ExcelJS = await cargarExcelJS();

    // Paleta institucional
    const AZUL = 'FF0F5AAB';
    const AZUL_OSCURO = 'FF0B3A66';
    const AZUL_CLARO = 'FFE8F0FB';
    const GRIS = 'FF4A607E';
    const TEXTO = 'FF0D1E35';
    const BORDE = 'FFC5D5EA';
    const ZEBRA = 'FFF6FAFD';
    const BLANCO = 'FFFFFFFF';
    const VERDE = 'FF1A7A45';
    const NARANJA = 'FFB45309';
    const fuente = 'Segoe UI';

    const borde = {
        top: { style: 'thin', color: { argb: BORDE } },
        left: { style: 'thin', color: { argb: BORDE } },
        bottom: { style: 'thin', color: { argb: BORDE } },
        right: { style: 'thin', color: { argb: BORDE } },
    };
    const sinBorde = { top: { style: 'thin', color: { argb: 'FFFFFFFF' } }, left: { style: 'thin', color: { argb: 'FFFFFFFF' } }, bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } }, right: { style: 'thin', color: { argb: 'FFFFFFFF' } } };

    const bordeRegion = (hoja, filaIni, filaFin, colIni, colFin, estilo) => {
        for (let f = filaIni; f <= filaFin; f++) {
            for (let c = colIni; c <= colFin; c++) hoja.getCell(f, c).border = estilo;
        }
    };
    const fondoRegion = (hoja, filaIni, filaFin, colIni, colFin, color) => {
        for (let f = filaIni; f <= filaFin; f++) {
            for (let c = colIni; c <= colFin; c++) {
                hoja.getCell(f, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
            }
        }
    };

    const libro = new ExcelJS.Workbook();
    libro.creator = 'Sistema de Evaluaciones INSAL';
    libro.created = new Date();

    // ── Datos agregados del grado ──
    const totalProyectos = proyectos.length;
    let totalEvaluaciones = 0;
    for (const p of proyectos) {
        totalEvaluaciones += p.evaluaciones.length;
    }
    const completos = proyectos.filter((p) => p.estado === 'completa').length;

    // ═══════════════════════════════════════════════════════════════
    // HOJA 1 — RESUMEN DEL GRADO (tabla maestra, un proyecto por fila)
    // ═══════════════════════════════════════════════════════════════
    const hoja = libro.addWorksheet('Resumen del Grado');
    hoja.columns = [
        { width: 16 },
        { width: 34 },
        { width: 30 },
        { width: 15 },
        { width: 15 },
    ];
    hoja.views = [{ state: 'frozen', ySplit: 4 }];

    // Cabecera institucional
    hoja.mergeCells('A1:E1');
    const titulo = hoja.getCell('A1');
    titulo.value = 'INSTITUTO NACIONAL SAN LUIS';
    titulo.font = { name: fuente, size: 16, bold: true, color: { argb: BLANCO } };
    titulo.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    titulo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_OSCURO } };
    hoja.getRow(1).height = 30;
    bordeRegion(hoja, 1, 1, 1, 5, sinBorde);

    hoja.mergeCells('A2:E2');
    const subtitulo = hoja.getCell('A2');
    subtitulo.value = 'Reporte final de evaluaciones por grado';
    subtitulo.font = { name: fuente, size: 12, bold: true, color: { argb: AZUL } };
    subtitulo.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    hoja.getRow(2).height = 22;

    hoja.mergeCells('A3:E3');
    const genCell = hoja.getCell('A3');
    genCell.value = `Generado el ${fechaGeneracion()}`;
    genCell.font = { name: fuente, size: 9, italic: true, color: { argb: GRIS } };
    genCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    hoja.getRow(3).height = 16;

    // ── Ficha de información del grado ──
    const datosIni = 5;
    hoja.getCell(`A${datosIni}`).value = 'INFORMACIÓN DEL GRADO';
    hoja.getCell(`A${datosIni}`).font = { name: fuente, size: 10, bold: true, color: { argb: BLANCO } };
    hoja.getCell(`A${datosIni}`).alignment = { vertical: 'middle' };
    fondoRegion(hoja, datosIni, datosIni, 1, 5, AZUL);
    bordeRegion(hoja, datosIni, datosIni, 1, 5, sinBorde);
    hoja.getRow(datosIni).height = 20;

    const filasInfo = [
        ['Grado', gradoNombre],
        ['Proyectos', `${totalProyectos} proyecto${totalProyectos === 1 ? '' : 's'}`],
        ['Evaluaciones', `${totalEvaluaciones} evaluación${totalEvaluaciones === 1 ? '' : 'es'}`],
        ['Proyectos completos', `${completos} de ${totalProyectos}`],
    ];
    filasInfo.forEach(([etiqueta, valor], i) => {
        const fila = datosIni + 1 + i;
        hoja.getCell(`A${fila}`).value = etiqueta;
        hoja.getCell(`A${fila}`).font = { name: fuente, size: 10, bold: true, color: { argb: GRIS } };
        hoja.getCell(`A${fila}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        hoja.getCell(`A${fila}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_CLARO } };
        hoja.mergeCells(`B${fila}:E${fila}`);
        hoja.getCell(`B${fila}`).value = valor;
        hoja.getCell(`B${fila}`).font = { name: fuente, size: 10, color: { argb: TEXTO } };
        hoja.getCell(`B${fila}`).alignment = { vertical: 'middle', horizontal: 'left' };
        hoja.getRow(fila).height = 18;
        bordeRegion(hoja, fila, fila, 1, 5, borde);
    });

    // ── Tabla maestra de proyectos ──
    const tablaIni = datosIni + filasInfo.length + 2;
    hoja.getCell(`A${tablaIni}`).value = 'PROYECTOS EVALUADOS';
    hoja.getCell(`A${tablaIni}`).font = { name: fuente, size: 10, bold: true, color: { argb: BLANCO } };
    hoja.getCell(`A${tablaIni}`).alignment = { vertical: 'middle' };
    fondoRegion(hoja, tablaIni, tablaIni, 1, 5, AZUL);
    bordeRegion(hoja, tablaIni, tablaIni, 1, 5, sinBorde);
    hoja.getRow(tablaIni).height = 20;

    const headerRow = hoja.getRow(tablaIni + 1);
    headerRow.values = ['N°', 'Proyecto', 'Estado', 'Evaluaciones', 'Nota'];
    headerRow.height = 20;
    headerRow.eachCell((cell) => {
        cell.font = { name: fuente, size: 10, bold: true, color: { argb: BLANCO } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = borde;
    });

    proyectos.forEach((proyecto, i) => {
        const fila = hoja.getRow(tablaIni + 2 + i);
        const estado = proyecto.estado === 'completa' ? 'Completa' : 'Parcial';
        const nota = proyecto.nota != null && proyecto.nota !== '' ? Number(proyecto.nota) : '—';
        fila.values = [i + 1, proyecto.nombre || 'Sin nombre', estado, proyecto.evaluaciones.length, nota];
        fila.eachCell((cell, colNum) => {
            cell.font = { name: fuente, size: 10, color: { argb: TEXTO } };
            cell.border = borde;
            if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
            if (colNum === 1 || colNum === 3 || colNum === 4) cell.alignment = { horizontal: 'center' };
            if (colNum === 5) {
                cell.numFmt = '0.00';
                cell.font = { name: fuente, size: 10, bold: true, color: { argb: proyecto.estado === 'completa' ? VERDE : NARANJA } };
                cell.alignment = { horizontal: 'center' };
            }
            if (colNum === 3 && proyecto.estado === 'completa') {
                cell.font = { name: fuente, size: 10, bold: true, color: { argb: VERDE } };
            } else if (colNum === 3) {
                cell.font = { name: fuente, size: 10, bold: true, color: { argb: NARANJA } };
            }
        });
        hoja.getRow(fila.number).height = 18;
    });

    // ═══════════════════════════════════════════════════════════════
    // HOJA 2 — DETALLE POR PROYECTO
    // ═══════════════════════════════════════════════════════════════
    const hojaD = libro.addWorksheet('Detalle por Proyecto');
    hojaD.columns = [
        { width: 16 },
        { width: 34 },
        { width: 34 },
        { width: 26 },
        { width: 14 },
    ];

    hojaD.mergeCells('A1:E1');
    const tD = hojaD.getCell('A1');
    tD.value = 'Detalle de evaluaciones por proyecto';
    tD.font = { name: fuente, size: 14, bold: true, color: { argb: AZUL_OSCURO } };
    hojaD.mergeCells('A2:E2');
    const tD2 = hojaD.getCell('A2');
    tD2.value = `Grado ${gradoNombre} · Generado el ${fechaGeneracion()}`;
    tD2.font = { name: fuente, size: 10, color: { argb: GRIS } };
    hojaD.getRow(1).height = 24;
    hojaD.getRow(2).height = 16;

    let filaD = 4;
    for (let idx = 0; idx < proyectos.length; idx++) {
        const proyecto = proyectos[idx];
        const evs = proyecto.evaluaciones || [];
        const nota = proyecto.nota != null && proyecto.nota !== '' ? Number(proyecto.nota) : '—';

        // Título del proyecto
        hojaD.mergeCells(`A${filaD}:E${filaD}`);
        hojaD.getCell(`A${filaD}`).value = `${idx + 1}. ${proyecto.nombre || 'Proyecto sin nombre'}`;
        hojaD.getCell(`A${filaD}`).font = { name: fuente, size: 12, bold: true, color: { argb: BLANCO } };
        hojaD.getCell(`A${filaD}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        fondoRegion(hojaD, filaD, filaD, 1, 5, AZUL_OSCURO);
        bordeRegion(hojaD, filaD, filaD, 1, 5, sinBorde);
        hojaD.getRow(filaD).height = 24;
        filaD++;

        // Sub-línea con nota + cantidad
        hojaD.mergeCells(`A${filaD}:E${filaD}`);
        hojaD.getCell(`A${filaD}`).value = `Nota: ${formatNota(proyecto.nota)} / 10 · ${evs.length} evaluación${evs.length === 1 ? '' : 'es'} · Estado: ${proyecto.estado === 'completa' ? 'Completa' : 'Parcial'}`;
        hojaD.getCell(`A${filaD}`).font = { name: fuente, size: 10, italic: true, color: { argb: GRIS } };
        hojaD.getCell(`A${filaD}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        hojaD.getRow(filaD).height = 16;
        filaD++;

        // Cabecera de evaluaciones
        const he = hojaD.getRow(filaD);
        he.values = ['N°', 'Evaluador', 'Correo', 'Fecha', 'Nota'];
        he.height = 20;
        he.eachCell((cell) => {
            cell.font = { name: fuente, size: 10, bold: true, color: { argb: BLANCO } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = borde;
        });
        filaD++;

        if (evs.length === 0) {
            hojaD.mergeCells(`A${filaD}:E${filaD}`);
            hojaD.getCell(`A${filaD}`).value = 'Sin evaluaciones registradas.';
            hojaD.getCell(`A${filaD}`).font = { name: fuente, size: 10, italic: true, color: { argb: GRIS } };
            filaD++;
        } else {
            evs.forEach((ev, i) => {
                const fila = hojaD.getRow(filaD);
                fila.values = [i + 1, ev.evaluador_nombre || '—', ev.evaluador_email || '—', formatFecha(ev.fecha_evaluacion), Number(ev.nota)];
                fila.eachCell((cell, colNum) => {
                    cell.font = { name: fuente, size: 10, color: { argb: TEXTO } };
                    cell.border = borde;
                    if (i % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
                    if (colNum === 1 || colNum === 5) cell.alignment = { horizontal: 'center' };
                    if (colNum === 5) { cell.numFmt = '0.00'; cell.font = { name: fuente, size: 10, bold: true, color: { argb: AZUL } }; }
                });
                hojaD.getRow(filaD).height = 18;
                filaD++;
            });
        }

        // Criterios de cada evaluación (si hay)
        const hayCriterios = evs.some((ev) => (ev.criterios || []).length > 0);
        if (hayCriterios) {
            for (let j = 0; j < evs.length; j++) {
                const ev = evs[j];
                const criterios = ev.criterios || [];
                if (criterios.length === 0) continue;

                // Sub-título de evaluación
                hojaD.mergeCells(`A${filaD}:E${filaD}`);
                hojaD.getCell(`A${filaD}`).value = `Desglose — Evaluación ${j + 1} · ${ev.evaluador_nombre || 'Evaluador'}`;
                hojaD.getCell(`A${filaD}`).font = { name: fuente, size: 10, bold: true, color: { argb: AZUL } };
                hojaD.getCell(`A${filaD}`).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
                hojaD.getRow(filaD).height = 20;
                filaD++;

                // Cabecera de criterios
                const hc = hojaD.getRow(filaD);
                hc.values = ['#', 'Criterio', '', 'Puntaje', 'Aporte'];
                // Limpio: solo Criterio / Puntaje / Peso / Aporte
                hc.values = ['Criterio', 'Puntaje', 'Peso (%)', 'Aporte', ''];
                hc.height = 18;
                hc.eachCell((cell, colNum) => {
                    if (colNum === 5) { cell.value = undefined; }
                    else {
                        cell.font = { name: fuente, size: 9, bold: true, color: { argb: BLANCO } };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL } };
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        cell.border = borde;
                    }
                });
                filaD++;

                criterios.forEach((c, k) => {
                    const fila = hojaD.getRow(filaD);
                    fila.values = [c.nombre || 'Criterio', Number(c.puntuacion), Number(c.porcentaje), (Number(c.puntuacion) * Number(c.porcentaje)) / 100, ''];
                    fila.eachCell((cell, colNum) => {
                        if (colNum === 5) { cell.value = undefined; }
                        else {
                            cell.font = { name: fuente, size: 9, color: { argb: TEXTO } };
                            cell.border = borde;
                            if (k % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
                            if (colNum >= 2) cell.alignment = { horizontal: 'center' };
                            if (colNum === 2) cell.numFmt = '0.00';
                            if (colNum === 3) cell.numFmt = '0';
                            if (colNum === 4) { cell.numFmt = '0.00'; cell.font = { name: fuente, size: 9, bold: true, color: { argb: AZUL } }; }
                        }
                    });
                    hojaD.getRow(filaD).height = 18;
                    filaD++;
                });

                // Total de la evaluación
                const total = criterios.reduce((acc, c) => acc + (Number(c.puntuacion) * Number(c.porcentaje)) / 100, 0);
                hojaD.mergeCells(`A${filaD}:C${filaD}`);
                hojaD.getCell(`A${filaD}`).value = 'PUNTUACIÓN TOTAL';
                hojaD.getCell(`A${filaD}`).font = { name: fuente, size: 9, bold: true, color: { argb: GRIS } };
                hojaD.getCell(`A${filaD}`).alignment = { vertical: 'middle', horizontal: 'right' };
                hojaD.getCell(`D${filaD}`).value = Number(total.toFixed(2));
                hojaD.getCell(`D${filaD}`).numFmt = '0.00';
                hojaD.getCell(`D${filaD}`).font = { name: fuente, size: 10, bold: true, color: { argb: VERDE } };
                hojaD.getCell(`D${filaD}`).alignment = { vertical: 'middle', horizontal: 'center' };
                fondoRegion(hojaD, filaD, filaD, 1, 4, AZUL_CLARO);
                bordeRegion(hojaD, filaD, filaD, 1, 4, borde);
                hojaD.getRow(filaD).height = 20;
                filaD++;
            }
        }

        // Separador entre proyectos
        filaD++;
    }

    // Descarga
    const buffer = await libro.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreArchivoGrado(gradoNombre)}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    mostrarNotificacion('Archivo de Excel descargado', 'bien');
}

// ═══════════════════════════════════════════════════════════════
// EXPORTACIÓN PDF
// ═══════════════════════════════════════════════════════════════

async function exportarPDFGrado(gradoNombre, proyectos) {
    if (!proyectos.length) {
        mostrarNotificacion('No hay proyectos en este grado', 'info');
        return;
    }

    mostrarNotificacion('Generando PDF…', 'info');
    await cargarLibreriasPDF();

    const contenedor = document.createElement('div');
    contenedor.style.cssText =
        'position:fixed;left:-10000px;top:0;width:794px;background:#ffffff;';

    const tarjetas = proyectos
        .map((proyecto, idx) => {
            const notaProyecto = formatNota(proyecto.nota);
            const evs = proyecto.evaluaciones || [];

            const bloquesEval = evs
                .map((ev, i) => {
                    const filasCriterios = (ev.criterios || [])
                        .map(
                            (c) => `
                            <tr>
                                <td>${escapeHtml(c.nombre || 'Criterio')}</td>
                                <td class="num">${formatNota(c.puntuacion)}</td>
                                <td class="num">${Number(c.porcentaje)}%</td>
                                <td class="num">+${formatNota((Number(c.puntuacion) * Number(c.porcentaje)) / 100)}</td>
                            </tr>`,
                        )
                        .join('');

                    const tablaCriterios = (ev.criterios || []).length
                        ? `<table>
                            <thead>
                                <tr><th>Criterio</th><th class="num">Puntaje</th><th class="num">Peso</th><th class="num">Aporte</th></tr>
                            </thead>
                            <tbody>${filasCriterios}</tbody>
                        </table>`
                        : '<p class="sin-datos">Sin criterios registrados.</p>';

                    return `
                        <section class="eval-card">
                            <h2>
                                <span class="eval-num">${i + 1}</span>
                                ${escapeHtml(ev.evaluador_nombre || 'Evaluador')}
                                <span class="eval-nota">${formatNota(ev.nota)} / 10</span>
                            </h2>
                            <dl>
                                <div><dt>Correo</dt><dd>${escapeHtml(ev.evaluador_email || '—')}</dd></div>
                                <div><dt>Fecha y hora</dt><dd>${escapeHtml(formatFecha(ev.fecha_evaluacion))}</dd></div>
                            </dl>
                            ${tablaCriterios}
                        </section>`;
                })
                .join('');

            const bodyEval = evs.length
                ? bloquesEval
                : '<p class="sin-datos">Sin evaluaciones registradas.</p>';

            return `
                <section class="proyecto-seccion">
                    <header class="proyecto-header">
                        <span class="proyecto-badge">Proyecto ${idx + 1}</span>
                        <h2 class="proyecto-titulo">${escapeHtml(proyecto.nombre || 'Proyecto sin nombre')}</h2>
                        <span class="proyecto-nota">${notaProyecto} / 10</span>
                    </header>
                    <div class="proyecto-body">
                        <p class="proyecto-meta">Estado: ${proyecto.estado === 'completa' ? 'Completa' : 'Parcial'} · ${evs.length} ${evs.length === 1 ? 'evaluación' : 'evaluaciones'}</p>
                        ${bodyEval}
                    </div>
                </section>`;
        })
        .join('');

    contenedor.innerHTML = `
    <style>
        .reporte-grado { box-sizing: border-box; font-family: 'Segoe UI', Arial, sans-serif; color: #0d1e35; padding: 40px 48px; background: #ffffff; }
        .reporte-grado * { box-sizing: border-box; margin: 0; padding: 0; }
        .reporte-grado header { border-bottom: 3px solid #0f5aab; padding-bottom: 16px; margin-bottom: 22px; }
        .reporte-grado .marca { display: flex; align-items: center; gap: 14px; }
        .reporte-grado .logo { width: 64px; height: 64px; object-fit: cover; border-radius: 12px; border: 1px solid #c5d5ea; }
        .reporte-grado .marca-texto h1 { font-size: 20px; color: #0f5aab; }
        .reporte-grado .marca-texto p { font-size: 11px; color: #4a607e; margin-top: 3px; }
        .reporte-grado .marca-texto .grado { font-size: 13px; font-weight: 700; color: #0f5aab; margin-top: 6px; }

        /* ── Bloque de proyecto: caja con encabezado azul destacado ── */
        .reporte-grado .proyecto-seccion { border: 1.5px solid #b9d2ec; border-radius: 12px; overflow: hidden; margin-top: 22px; background: #ffffff; }
        .reporte-grado .proyecto-header { display: flex; align-items: center; gap: 10px; background: #0f5aab; color: #ffffff; padding: 12px 16px; }
        .reporte-grado .proyecto-badge { background: rgba(255, 255, 255, 0.22); border-radius: 999px; padding: 3px 12px; font-size: 11px; font-weight: 700; white-space: nowrap; flex: 0 0 auto; }
        .reporte-grado .proyecto-titulo { font-size: 15px; font-weight: 700; color: #ffffff; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .reporte-grado .proyecto-nota { margin-left: auto; font-size: 14px; font-weight: 800; color: #ffffff; white-space: nowrap; flex: 0 0 auto; }
        .reporte-grado .proyecto-body { padding: 14px 16px 16px; }
        .reporte-grado .proyecto-meta { font-size: 12px; color: #4a607e; margin-bottom: 12px; }

        .reporte-grado .eval-card { border: 1px solid #c5d5ea; border-radius: 10px; padding: 16px 18px; background: #ffffff; }
        .reporte-grado .eval-card + .eval-card { margin-top: 14px; }
        .reporte-grado .eval-card h2 { font-size: 14px; display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .reporte-grado .eval-num { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 26px; border-radius: 50%; background: #0f5aab; color: #fff; font-size: 13px; }
        .reporte-grado .eval-nota { margin-left: auto; font-size: 14px; color: #0f5aab; }
        .reporte-grado dl div { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #eef3fa; font-size: 12px; }
        .reporte-grado dt { color: #4a607e; }
        .reporte-grado dd { color: #0d1e35; }
        .reporte-grado table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
        .reporte-grado th, .reporte-grado td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #eef3fa; }
        .reporte-grado th { background: #e8f0fb; color: #0f5aab; }
        .reporte-grado .num { text-align: right; }
        .reporte-grado .sin-datos { font-size: 12px; color: #4a607e; margin-top: 8px; }
    </style>
    <div class="reporte-grado">
        <header>
            <div class="marca">
                <img class="logo" src="${LOGO_URL}" alt="Logo INSAL">
                <div class="marca-texto">
                    <h1>Instituto Nacional San Luis</h1>
                    <p>Reporte final de evaluaciones · Generado el ${escapeHtml(fechaGeneracion())}</p>
                    <p class="grado">Grado ${escapeHtml(gradoNombre)}</p>
                </div>
            </div>
        </header>
        ${tarjetas}
    </div>`;

    document.body.appendChild(contenedor);

    try {
        await new Promise((r) => requestAnimationFrame(r));
        await Promise.all(
            Array.from(contenedor.querySelectorAll('img')).map((img) =>
                img.complete
                    ? Promise.resolve()
                    : new Promise((res) => {
                        img.onload = res;
                        img.onerror = res;
                    }),
            ),
        );

        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const margen = 28;
        const imgW = pageW - margen * 2;
        let yCursor = margen;

        const agregarBloque = async (el) => {
            const canvas = await window.html2canvas(el, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
            });
            const altoPt = canvas.height * (imgW / canvas.width);
            if (yCursor > margen && yCursor + altoPt > pageH - margen) {
                pdf.addPage();
                yCursor = margen;
            }
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', margen, yCursor, imgW, altoPt);
            yCursor += altoPt + 14;
        };

        await agregarBloque(contenedor.querySelector('.reporte-grado header'));
        // Cada proyecto se renderiza en su propia página: así la separación
        // entre proyectos es inconfundible (nunca se mezclan en la misma
        // hoja ni se confunden entre sí).
        const secciones = Array.from(contenedor.querySelectorAll('.proyecto-seccion'));
        for (let idx = 0; idx < secciones.length; idx++) {
            if (idx > 0) {
                pdf.addPage();
                yCursor = margen;
            }
            await agregarBloque(secciones[idx]);
        }

        const totalPaginas = pdf.getNumberOfPages();
        for (let i = 1; i <= totalPaginas; i++) {
            pdf.setPage(i);
            pdf.setDrawColor(197, 213, 234);
            pdf.line(margen, pageH - 24, pageW - margen, pageH - 24);
            pdf.setFontSize(8);
            pdf.setTextColor(74, 96, 126);
            pdf.text('Instituto Nacional San Luis — Sistema de Evaluaciones', margen, pageH - 12);
            pdf.text(`Página ${i} de ${totalPaginas}`, pageW - margen, pageH - 12, { align: 'right' });
        }

        pdf.save(`${nombreArchivoGrado(gradoNombre)}.pdf`);
        mostrarNotificacion('PDF descargado', 'bien');
    } finally {
        contenedor.remove();
    }
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

/** Exporta según la opción elegida en el diálogo. */
async function exportarDesdeDialogo(formato) {
    const dialogo = document.getElementById('dialogo-descargar-grado');
    const select = dialogo?.querySelector('#grado-select-descargar');
    const gradoId = select?.value;
    if (!gradoId) {
        mostrarNotificacion('Selecciona un grado', 'info');
        return;
    }

    const btn =
        formato === 'pdf'
            ? dialogo?.querySelector('#btn-descargar-grado-pdf')
            : dialogo?.querySelector('#btn-descargar-grado-excel');
    if (btn) btn.disabled = true;

    try {
        const data = await obtenerReporteGrado(gradoId);
        if (formato === 'pdf') {
            await exportarPDFGrado(data.grado.nombre, data.proyectos);
        } else {
            await exportarExcelGrado(data.grado.nombre, data.proyectos);
        }
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
        .querySelector('#btn-descargar-grado-excel')
        ?.addEventListener('click', () => exportarDesdeDialogo('excel'));
    dialogo
        .querySelector('#btn-descargar-grado-pdf')
        ?.addEventListener('click', () => exportarDesdeDialogo('pdf'));
}

// Carga inicial y cada vez que el router reemplaza el contenido
document.addEventListener('DOMContentLoaded', initExportarGrado);
document.addEventListener('contentUpdated', initExportarGrado);

export { abrirDialogoGrado, initExportarGrado, exportarDesdeDialogo };
