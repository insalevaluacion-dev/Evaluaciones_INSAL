// ═══════════════════════════════════════════════════════════════
// REPORTES PDF (proyecto y grado) — sin binarios externos
//
//  Réplica fiel de las plantillas Word originales (Reporte-proyecto.docx y
//  Reporte-grado.docx), dibujada directamente con pdfkit (solo npm, funciona
//  en Render/Railway sin LibreOffice ni navegador).
//
//  Se respetan de las plantillas: tamaño de página (carta), márgenes, anchos
//  de columna, alturas de fila, bordes, sombreados, tipografía y tamaños,
//  textos fijos, posición de los dos logos
//  y el pie de página. Solo cambian los datos y la cantidad de filas /
//  bloques (estudiantes, criterios, evaluaciones, proyectos).
// ═══════════════════════════════════════════════════════════════

import PDFDocument from 'pdfkit';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Este archivo vive en <proyecto>/public/js
const RAIZ_PROYECTO = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ZONA_HORARIA = 'America/El_Salvador';

// ───────────────────────── Medidas de la plantilla ─────────────────────────
// (twips → puntos: 1 pt = 20 twips; EMU → puntos: 1 pt = 12700 EMU)

const PAGINA = { ancho: 612, alto: 792 }; // 12240 × 15840 twips
const MARGEN = { sup: 29, der: 18, inf: 39, izq: 18 }; // 580 / 360 / 780 / 360 twips
const SANGRIA_TABLA = 12.5; // 250 twips
const COLOR_BORDE = '#D9D9D9';
const COLOR_NEGRO = '#000000';
const COLOR_SOMBRA = '#D9D9D9';
const INTERLINEADO = 1.15; // spacing line=276 (auto)
const ALTO_LINEA_ARIAL = 1.149; // ascenso + descenso de Arial / Helvetica
const GROSOR_BORDE = 0.5; // sz=4 (1/8 pt)

// Columnas (twips) de cada tabla de la plantilla
const COL_DATOS = [1995, 1940, 1080, 4340, 640, 1035];
const COL_RESUMEN = [10273, 755];
const COL_EVALUACION = [3355, 1643, 3105, 2927];

// Logos de la plantilla (posición y tamaño en puntos)
const LOGO_IZQ = { x: 413469 / 12700, y: MARGEN.sup - 5080 / 12700, w: 883527 / 12700, h: 828981 / 12700 };
const LOGO_DER = { x: MARGEN.izq + 6306884 / 12700, y: MARGEN.sup - 302 / 12700, w: 855345 / 12700, h: 883285 / 12700 };

// Encabezado: párrafos con sangría izq 2160 / der 1896 twips, centrados
const ENCABEZADO = {
    x: MARGEN.izq + 2160 / 20,
    ancho: PAGINA.ancho - MARGEN.izq - 2160 / 20 - MARGEN.der - 1896 / 20,
};

const F = { normal: 'Helvetica', negrita: 'Helvetica-Bold' };

// ───────────────────────── Formato de datos ─────────────────────────

/** 10.00 → "10"; 8.5 → "8.50"; sin dato → "—". */
export function formatNota(valor) {
    if (valor === null || valor === undefined || valor === '') return '—';
    const n = Number(valor);
    if (!Number.isFinite(n)) return '—';
    return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

function partesFecha(fecha) {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (Number.isNaN(d.getTime())) return null;
    const p = Object.fromEntries(
        new Intl.DateTimeFormat('en-GB', {
            timeZone: ZONA_HORARIA,
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hourCycle: 'h23',
        })
            .formatToParts(d)
            .map((x) => [x.type, x.value]),
    );
    const h24 = Number(p.hour);
    return {
        fecha: `${p.day}/${p.month}/${p.year}`,
        hora12: String(h24 % 12 === 0 ? 12 : h24 % 12),
        minutos: p.minute,
        pm: h24 >= 12,
    };
}

/** "14/10/2026 – 5:10 p.m." (mismo formato que la plantilla). */
function formatFechaHora(fecha) {
    const f = partesFecha(fecha);
    if (!f) return '—';
    return `${f.fecha} – ${f.hora12}:${f.minutos} ${f.pm ? 'p.m.' : 'a.m.'}`;
}

const ORDINALES = ['Primer', 'Segundo', 'Tercer', 'Cuarto', 'Quinto', 'Sexto'];

/** "1 Año" → "Primer Año". */
export function textoGrado(nivelNombre) {
    const m = String(nivelNombre ?? '').match(/\d+/);
    const n = m ? Number(m[0]) : 0;
    return ORDINALES[n - 1] ? `${ORDINALES[n - 1]} Año` : String(nivelNombre ?? '—');
}

/** "Bachillerato GENERAL" → "GENERAL". */
export function textoPlan(bachilleratoNombre) {
    const t = String(bachilleratoNombre ?? '')
        .replace(/^\s*Bachillerato\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    return (t || '—').toUpperCase();
}

/**
 * Las fuentes estándar de PDF solo cubren Latin-1 + algunos signos de
 * Windows-1252. Lo demás se degrada (sin acento) para no corromper el texto.
 */
const EXTRA_WINANSI = new Set([
    ...'–—‘’‚“”„•…€™‰‹›ŒœŠšŽžŸƒˆ˜†‡',
].map((c) => c.codePointAt(0)));

function limpiarTexto(valor) {
    let s = String(valor ?? '').replace(/[\r\n\t]+/g, ' ');
    let out = '';
    for (const ch of s) {
        const cp = ch.codePointAt(0);
        if ((cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || EXTRA_WINANSI.has(cp)) {
            out += ch;
            continue;
        }
        const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        out += /^[\x20-\x7e]$/.test(base) ? base : '?';
    }
    return out;
}

// ───────────────────────── Logos ─────────────────────────

let cacheLogos = null;

async function cargarLogos() {
    if (cacheLogos) return cacheLogos;
    cacheLogos = {
        izq: await readFile(path.join(RAIZ_PROYECTO, 'public', 'assets', 'img', 'Escudo.jpeg')),
        der: await readFile(path.join(RAIZ_PROYECTO, 'public', 'assets', 'img', 'INSAL.jpg')),
    };
    return cacheLogos;
}

// ───────────────────────── Motor de texto y tablas ─────────────────────────

class Lienzo {
    constructor(doc, { pie }) {
        this.doc = doc;
        this.pie = pie;
        this.y = MARGEN.sup;
        this.limiteInferior = PAGINA.alto - MARGEN.inf;
    }

    /** Alto de una línea con interlineado de plantilla (spacing 276 auto). */
    static altoLinea(tamano) {
        return tamano * ALTO_LINEA_ARIAL * INTERLINEADO;
    }

    medir(texto, fuente, tamano) {
        return this.doc.font(fuente).fontSize(tamano).widthOfString(texto);
    }

    /** Divide el texto en líneas que caben en `ancho` (corta palabras largas). */
    envolver(texto, fuente, tamano, ancho) {
        const limpio = limpiarTexto(texto);
        if (!limpio) return [''];
        const palabras = limpio.split(' ');
        const lineas = [];
        let actual = '';
        const empujar = () => {
            lineas.push(actual);
            actual = '';
        };
        for (const palabra of palabras) {
            const candidata = actual ? `${actual} ${palabra}` : palabra;
            if (this.medir(candidata, fuente, tamano) <= ancho) {
                actual = candidata;
                continue;
            }
            if (actual) empujar();
            if (this.medir(palabra, fuente, tamano) <= ancho) {
                actual = palabra;
                continue;
            }
            // palabra más ancha que la celda: se parte por caracteres
            let trozo = '';
            for (const ch of palabra) {
                if (this.medir(trozo + ch, fuente, tamano) > ancho && trozo) {
                    lineas.push(trozo);
                    trozo = '';
                }
                trozo += ch;
            }
            actual = trozo;
        }
        empujar();
        return lineas;
    }

    nuevaPagina() {
        this.doc.addPage({ size: [PAGINA.ancho, PAGINA.alto], margin: 0 });
        this.y = MARGEN.sup;
    }

    asegurarEspacio(alto) {
        if (this.y + alto > this.limiteInferior && this.y > MARGEN.sup + 0.5) this.nuevaPagina();
    }

    /** Dibuja una línea de texto con su caja de alto `altoLinea` (Word reparte el interlineado extra por encima). */
    linea(texto, x, yTop, ancho, { fuente, tamano, align = 'left', subrayado = false, color = '#000000' }) {
        const alto = Lienzo.altoLinea(tamano);
        const yTexto = yTop + (alto - tamano * 0.925) * 0.8;
        this.doc
            .font(fuente)
            .fontSize(tamano)
            .fillColor(color)
            .text(texto, x, yTexto, { width: ancho, align, lineBreak: false, underline: subrayado });
    }

    /** Párrafo suelto centrado en el cuerpo (títulos). Devuelve el alto usado. */
    parrafo(texto, { fuente, tamano, x = MARGEN.izq, ancho = PAGINA.ancho - MARGEN.izq - MARGEN.der, align = 'center', subrayado = false }) {
        const alto = Lienzo.altoLinea(tamano);
        this.asegurarEspacio(alto);
        if (texto) this.linea(limpiarTexto(texto), x, this.y, ancho, { fuente, tamano, align, subrayado });
        this.y += alto;
    }

    /** Párrafo vacío (solo ocupa el alto de una línea con el tamaño dado). */
    vacio(tamano = 9, interlineado = true) {
        const alto = interlineado ? Lienzo.altoLinea(tamano) : tamano * ALTO_LINEA_ARIAL;
        this.asegurarEspacio(alto);
        this.y += alto;
    }

    /**
     * Dibuja una tabla.
     * @param {number[]} columnas anchos en twips
     * @param {Array} filas { minAlto (twips), celdas: [{ span, texto, negrita, align, sombra, bordeSup, bordeInf }] }
     * @param {{ juntas?: boolean }} opciones juntas: la tabla no se parte entre páginas
     */
    tabla(columnas, filas, { juntas = true } = {}) {
        const anchos = columnas.map((c) => c / 20);
        const x0 = MARGEN.izq + SANGRIA_TABLA;
        const tamano = 9;
        const alto = Lienzo.altoLinea(tamano);

        // 1) medir cada fila
        const medidas = filas.map((fila) => {
            let col = 0;
            const celdas = fila.celdas.map((celda) => {
                const span = celda.span || 1;
                const ancho = anchos.slice(col, col + span).reduce((a, b) => a + b, 0);
                const xCelda = x0 + anchos.slice(0, col).reduce((a, b) => a + b, 0);
                col += span;
                const fuente = celda.negrita ? F.negrita : F.normal;
                const lineas = this.envolver(celda.texto, fuente, tamano, ancho);
                return { ...celda, fuente, lineas, ancho, x: xCelda };
            });
            const altoTexto = Math.max(...celdas.map((c) => c.lineas.length)) * alto;
            return { celdas, alto: Math.max((fila.minAlto || 0) / 20, altoTexto) };
        });

        if (juntas) {
            const total = medidas.reduce((a, f) => a + f.alto, 0);
            if (total <= this.limiteInferior - MARGEN.sup) this.asegurarEspacio(total);
        }

        // 2) dibujar
        medidas.forEach((fila, idx) => {
            this.asegurarEspacio(fila.alto);
            const yFila = this.y;

            for (const c of fila.celdas) {
                if (c.sombra) this.doc.rect(c.x, yFila, c.ancho, fila.alto).fill(COLOR_SOMBRA);
            }
            for (const c of fila.celdas) {
                const trazo = (x1, y1, x2, y2, color) =>
                    this.doc.lineWidth(GROSOR_BORDE).strokeColor(color).moveTo(x1, y1).lineTo(x2, y2).stroke();
                trazo(c.x, yFila, c.x + c.ancho, yFila, c.bordeSup || COLOR_BORDE);
                trazo(c.x, yFila + fila.alto, c.x + c.ancho, yFila + fila.alto, c.bordeInf || COLOR_BORDE);
                trazo(c.x, yFila, c.x, yFila + fila.alto, COLOR_BORDE);
                trazo(c.x + c.ancho, yFila, c.x + c.ancho, yFila + fila.alto, COLOR_BORDE);

                // texto centrado verticalmente en la celda
                const altoBloque = c.lineas.length * alto;
                let yLinea = yFila + (fila.alto - altoBloque) / 2;
                for (const linea of c.lineas) {
                    this.linea(linea, c.x, yLinea, c.ancho, { fuente: c.fuente, tamano, align: c.align || 'left' });
                    yLinea += alto;
                }
            }
            this.y += fila.alto;
            // una tabla partida entre páginas continúa arriba sin reabrir el borde superior
            void idx;
        });
    }
}

// ───────────────────────── Bloques de las plantillas ─────────────────────────

/** Celdas rápidas */
const etiqueta = (texto, extra = {}) => ({ texto, negrita: true, align: 'center', ...extra });
const valor = (texto, extra = {}) => ({ texto, align: 'left', ...extra });

/** Logos + títulos de cabecera. `titulo` es la 2.ª línea (negrita 16). */
function dibujarEncabezado(L, logos, titulo, { lineaVaciaFinal }) {
    const { doc } = L;
    // Cada logo se ajusta (sin deformarse) dentro del recuadro que ocupa en la plantilla
    doc.image(logos.izq, LOGO_IZQ.x, LOGO_IZQ.y, { fit: [LOGO_IZQ.w, LOGO_IZQ.h], align: 'center', valign: 'center' });
    doc.image(logos.der, LOGO_DER.x, LOGO_DER.y, { fit: [LOGO_DER.w, LOGO_DER.h], align: 'center', valign: 'center' });

    const opc = { x: ENCABEZADO.x, ancho: ENCABEZADO.ancho, align: 'center' };
    L.parrafo('INSTITUTO NACIONAL SAN LUIS', { ...opc, fuente: F.normal, tamano: 18 });
    L.parrafo(titulo, { ...opc, fuente: F.negrita, tamano: 16 });
    L.y += 4.5; // el alto real de la fuente Aptos Narrow de los títulos es algo mayor que Helvetica
    L.vacio(16); // párrafo vacío de 16 pt
    if (lineaVaciaFinal) L.vacio(9, false); // párrafo vacío sin interlineado (solo en la plantilla de proyecto)
}

/** Tabla con los datos del proyecto (sede, plan, grado, sección, año, proyecto, estudiantes). */
function tablaDatosProyecto(L, p) {
    const estudiantes = (p.estudiantes || []).length ? p.estudiantes : ['—'];
    L.tabla(COL_DATOS, [
        { minAlto: 320, celdas: [etiqueta('Sede Educativa'), { span: 5, ...valor('11708 - INSTITUTO NACIONAL "SAN LUIS"', { align: 'center' }) }] },
        { minAlto: 320, celdas: [etiqueta('Plan de Estudio'), { span: 5, ...valor(p.plan, { align: 'center' }) }] },
        {
            minAlto: 340,
            celdas: [
                etiqueta('Grado'),
                valor(p.grado, { align: 'center' }),
                etiqueta('Sección'),
                valor(p.seccion, { align: 'center' }),
                etiqueta('Año'),
                valor(p.anio, { align: 'center' }),
            ],
        },
        { minAlto: 320, celdas: [etiqueta('Proyecto'), { span: 5, ...valor(p.nombre, { align: 'center' }) }] },
        { minAlto: 320, celdas: [{ span: 6, ...etiqueta('Estudiantes presentes', { sombra: true }) }] },
        ...estudiantes.map((e) => ({ minAlto: 320, celdas: [{ span: 6, ...valor(e) }] })),
    ]);
}

/** Tabla "Cantidad de evaluaciones / Calificación / Nota final del proyecto". */
function tablaResumen(L, p) {
    L.tabla(COL_RESUMEN, [
        {
            minAlto: 380,
            celdas: [
                { ...etiqueta('Cantidad de evaluaciones', { align: 'left', bordeSup: COLOR_NEGRO }), },
                etiqueta(String(p.evaluaciones.length), { bordeSup: COLOR_NEGRO }),
            ],
        },
        { minAlto: 380, celdas: [{ span: 2, ...etiqueta('Calificación', { sombra: true }) }] },
        {
            minAlto: 380,
            celdas: [
                etiqueta('Nota final del proyecto', { align: 'left', bordeInf: COLOR_NEGRO }),
                etiqueta(formatNota(p.nota), { bordeInf: COLOR_NEGRO }),
            ],
        },
    ]);
}

/** Tabla de una evaluación con sus criterios (no se parte entre páginas). */
function tablaEvaluacion(L, ev, numero) {
    const criterios = (ev.criterios || []).map((c) => {
        const pct = Number(c.porcentaje) || 0;
        const aporte = ((Number(c.puntuacion) || 0) * pct) / 100;
        return {
            minAlto: 280,
            celdas: [
                valor(c.nombre || 'Criterio', { align: 'center' }),
                valor(formatNota(c.puntuacion), { align: 'center' }),
                valor(`${Number.isInteger(pct) ? pct : Number(pct.toFixed(2))}%`, { align: 'center' }),
                valor(formatNota(aporte), { align: 'center' }),
            ],
        };
    });

    L.tabla(
        COL_EVALUACION,
        [
            { minAlto: 280, celdas: [etiqueta(`Evaluación ${numero}`, { sombra: true }), { span: 3, ...etiqueta('Resultado', { sombra: true }) }] },
            { minAlto: 280, celdas: [etiqueta('Nombre del evaluador'), { span: 3, ...valor(ev.evaluador_nombre || '—') }] },
            { minAlto: 280, celdas: [etiqueta('Correo'), { span: 3, ...valor(ev.evaluador_email || '—') }] },
            { minAlto: 280, celdas: [etiqueta('Fecha y hora de evaluación'), { span: 3, ...valor(formatFechaHora(ev.fecha_evaluacion)) }] },
            {
                minAlto: 280,
                celdas: [
                    etiqueta('Criterios', { sombra: true }),
                    etiqueta('Puntaje', { sombra: true }),
                    etiqueta('Ponderación', { sombra: true }),
                    etiqueta('Aporte', { sombra: true }),
                ],
            },
            ...criterios,
            { minAlto: 280, celdas: [{ span: 3, ...etiqueta('Nota total del evaluador') }, valor(formatNota(ev.nota), { align: 'center' })] },
        ],
        { juntas: true },
    );
}

/** Subtítulo "Desglose de nota por evaluación y criterio" + evaluaciones. */
function dibujarEvaluaciones(L, p, { espaciosEntreEvaluaciones = 1 } = {}) {
    // El subtítulo siempre va junto a la primera evaluación (nunca queda solo al pie de la página)
    const primera = p.evaluaciones[0];
    const filasPrimera = 6 + (primera?.criterios?.length || 0);
    L.asegurarEspacio(Lienzo.altoLinea(10) + Lienzo.altoLinea(9) + filasPrimera * 14.5);
    L.parrafo('Desglose de nota por evaluación y criterio', { fuente: F.negrita, tamano: 10, subrayado: true });
    L.vacio(9);
    p.evaluaciones.forEach((ev, i) => {
        tablaEvaluacion(L, ev, i + 1);
        for (let k = 0; k < espaciosEntreEvaluaciones; k++) L.vacio(9);
    });
}

// ───────────────────────── Pie de página ─────────────────────────

function textoPie(ahora, { puntos }) {
    const f = partesFecha(ahora);
    const ampm = puntos ? (f.pm ? 'p.m.' : 'a.m.') : f.pm ? 'pm' : 'am';
    return `Obtenido del sistema Evaluaciones INSAL - ${f.fecha} ${f.hora12}:${f.minutos} ${ampm}`;
}

/** Pie de la plantilla de proyecto: texto Arial 7 pt (ancho 110 %) a 36.2 pt / 750.9 pt. */
function pieProyecto(doc, ahora) {
    doc.font(F.normal).fontSize(7).fillColor('#000000').text(textoPie(ahora, { puntos: false }), 459594 / 12700, 9536570 / 12700, {
        lineBreak: false,
        characterSpacing: 0.35,
    });
}

/** Pie de la plantilla de grado: texto Arial 9 pt con sangría 36 pt + nº de página a la derecha. */
function pieGrado(doc, ahora, numero) {
    doc.font(F.normal).fontSize(9).fillColor('#000000').text(textoPie(ahora, { puntos: true }), 54, 741, {
        lineBreak: false,
        characterSpacing: 0.45,
    });
    doc.font(F.normal).fontSize(11).text(String(numero), MARGEN.izq, 752, {
        width: PAGINA.ancho - MARGEN.izq - MARGEN.der,
        align: 'right',
        lineBreak: false,
    });
}

// ───────────────────────── Generación ─────────────────────────

function crearDocumento(titulo) {
    return new PDFDocument({
        size: [PAGINA.ancho, PAGINA.alto],
        margin: 0,
        bufferPages: true,
        autoFirstPage: true,
        info: { Title: titulo, Author: 'Instituto Nacional San Luis' },
    });
}

function terminar(doc, dibujarPie) {
    const rango = doc.bufferedPageRange();
    for (let i = 0; i < rango.count; i++) {
        doc.switchToPage(rango.start + i);
        dibujarPie(i + 1);
    }
    return new Promise((resolve, reject) => {
        const trozos = [];
        doc.on('data', (t) => trozos.push(t));
        doc.on('end', () => resolve(Buffer.concat(trozos)));
        doc.on('error', reject);
        doc.end();
    });
}

/**
 * Datos de un proyecto para el reporte:
 * { nombre, plan, grado, seccion, anio, estudiantes: string[], nota,
 *   evaluaciones: [{ evaluador_nombre, evaluador_email, fecha_evaluacion, nota,
 *                    criterios: [{ nombre, puntuacion, porcentaje }] }] }
 */
export async function generarPdfProyecto(proyecto, ahora = new Date()) {
    const logos = await cargarLogos();
    const doc = crearDocumento(`Reporte de proyecto - ${limpiarTexto(proyecto.nombre)}`);
    const L = new Lienzo(doc, {});

    dibujarEncabezado(L, logos, 'REPORTE DE EVALUCION DE PROYECTO', { lineaVaciaFinal: true });
    tablaDatosProyecto(L, proyecto);
    L.vacio(9);
    tablaResumen(L, proyecto);
    L.vacio(9);
    // La plantilla de proyecto deja dos párrafos vacíos entre evaluaciones
    dibujarEvaluaciones(L, proyecto, { espaciosEntreEvaluaciones: 2 });

    return terminar(doc, () => pieProyecto(doc, ahora));
}

/**
 * Datos de un grado para el reporte:
 * { plan, grado, seccion, anio, proyectos: [<proyecto>] }
 */
export async function generarPdfGrado(gradoData, ahora = new Date()) {
    const logos = await cargarLogos();
    const doc = crearDocumento(`Reporte de evaluación por grado - ${limpiarTexto(gradoData.grado)}`);
    const L = new Lienzo(doc, {});
    const proyectos = gradoData.proyectos;

    dibujarEncabezado(L, logos, 'REPORTE DE EVALUCION POR GRADO', { lineaVaciaFinal: false });

    // Datos del grado + lista de proyectos
    const nombres = proyectos.length ? proyectos.map((p) => p.nombre) : ['—'];
    L.tabla(COL_DATOS, [
        { minAlto: 320, celdas: [etiqueta('Sede Educativa'), { span: 5, ...valor('11708 - INSTITUTO NACIONAL "SAN LUIS"', { align: 'center' }) }] },
        { minAlto: 320, celdas: [etiqueta('Plan de Estudio'), { span: 5, ...valor(gradoData.plan, { align: 'center' }) }] },
        {
            minAlto: 340,
            celdas: [
                etiqueta('Grado'),
                valor(gradoData.grado, { align: 'center' }),
                etiqueta('Sección'),
                valor(gradoData.seccion, { align: 'center' }),
                etiqueta('Año'),
                valor(gradoData.anio, { align: 'center' }),
            ],
        },
        { minAlto: 320, celdas: [{ span: 6, ...etiqueta('Proyectos', { sombra: true }) }] },
        ...nombres.map((n) => ({ minAlto: 320, celdas: [{ span: 6, ...valor(n) }] })),
    ]);
    L.vacio(9);

    // Calificaciones
    L.tabla(COL_RESUMEN, [
        { minAlto: 380, celdas: [{ span: 2, ...etiqueta('Calificaciones', { sombra: true }) }] },
        ...(proyectos.length
            ? proyectos.map((p) => ({
                  minAlto: 380,
                  celdas: [etiqueta(`Nota final del proyecto ${p.nombre}`, { align: 'left' }), etiqueta(formatNota(p.nota))],
              }))
            : [{ minAlto: 380, celdas: [etiqueta('Nota final del proyecto —', { align: 'left' }), etiqueta('—')] }]),
    ]);
    L.vacio(16);

    const opcTitulo = { x: ENCABEZADO.x, ancho: ENCABEZADO.ancho, align: 'center', fuente: F.negrita, tamano: 16 };
    proyectos.forEach((p, idx) => {
        const datos = { ...p, plan: gradoData.plan, grado: gradoData.grado, seccion: gradoData.seccion, anio: gradoData.anio };
        // El título no queda huérfano al final de una página
        L.asegurarEspacio(Lienzo.altoLinea(16) + 9 * ALTO_LINEA_ARIAL + 320 / 20 * 3);
        L.parrafo(`REPORTE DE PROYECTO ${idx + 1}`, opcTitulo);
        L.vacio(9, false);
        tablaDatosProyecto(L, datos);
        L.vacio(9);
        tablaResumen(L, datos);
        L.vacio(9);
        dibujarEvaluaciones(L, datos);
        L.vacio(9, false);
    });

    return terminar(doc, (n) => pieGrado(doc, ahora, n));
}
