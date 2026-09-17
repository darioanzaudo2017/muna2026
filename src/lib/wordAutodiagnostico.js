import {
  Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
  PageBreak, VerticalAlign, HeightRule,
} from 'docx'
import { supabase } from './supabase'
import { fetchDatosCompletos, formatRespuestaSimple, buildTablaRows } from './autodiagnosticoData'

// Colores oficiales de la paleta DDNA (Manual de Identidad Visual 2026)
const NAVY = '0B196D'
const BLUE = '3777FF'
const ORANGE = 'FF7F11'
const WHITE = 'FFFFFF'
const DARK = '171D1C'
const GRAY_TEXT = '3D4947'

// Forma DJR Banner Bold / Fieldwork Geo Regular son tipografías comerciales
// pedidas por el manual de marca. Un .docx solo referencia la fuente por
// nombre — si quien lo abre no la tiene instalada (Baloo 2/Inter son fuentes
// web, no vienen con Windows/Office), Word la reemplaza en silencio por una
// genérica. Por eso acá se usan fuentes que sí vienen de fábrica con
// Office y se acercan al estilo original: Century Gothic (geométrica,
// redondeada, bold) para títulos y Calibri para el cuerpo.
const FONT_HEADING = 'Century Gothic'
const FONT_BODY = 'Calibri'

const NO_BORDERS = {
  top: { style: BorderStyle.NONE, size: 0, color: WHITE },
  bottom: { style: BorderStyle.NONE, size: 0, color: WHITE },
  left: { style: BorderStyle.NONE, size: 0, color: WHITE },
  right: { style: BorderStyle.NONE, size: 0, color: WHITE },
}

const CELL_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 4, color: 'BCC9C6' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'BCC9C6' },
  left: { style: BorderStyle.SINGLE, size: 4, color: 'BCC9C6' },
  right: { style: BorderStyle.SINGLE, size: 4, color: 'BCC9C6' },
}

async function fetchLogoBlanco() {
  try {
    const { data: recurso } = await supabase
      .from('recursos_identidad_visual')
      .select('storage_path')
      .eq('tipo', 'logo')
      .ilike('nombre', '%blanco%')
      .maybeSingle()

    if (!recurso) return null

    const { data: blob, error } = await supabase.storage
      .from('identidad-visual')
      .download(recurso.storage_path)

    if (error || !blob) return null

    const buffer = await blob.arrayBuffer()
    const bitmap = await createImageBitmap(blob)
    const targetHeight = 90
    const targetWidth = Math.round((bitmap.width / bitmap.height) * targetHeight)

    return { data: buffer, width: targetWidth, height: targetHeight }
  } catch (err) {
    console.warn('No se pudo cargar el logo para el Word:', err)
    return null
  }
}

function coloredBlock({ children, fill = NAVY, heightTwips = 12000 }) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        height: { value: heightTwips, rule: HeightRule.ATLEAST },
        children: [
          new TableCell({
            borders: NO_BORDERS,
            shading: { fill, type: ShadingType.CLEAR, color: 'auto' },
            verticalAlign: VerticalAlign.CENTER,
            margins: { top: 400, bottom: 400, left: 400, right: 400 },
            children,
          }),
        ],
      }),
    ],
  })
}

function centeredRun(text, { size = 24, bold = false, color = WHITE, font = FONT_BODY, spacingBefore = 0, spacingAfter = 120 } = {}) {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: spacingBefore, after: spacingAfter },
    children: [new TextRun({ text, size, bold, color, font })],
  })
}

async function buildPortada(muni, autodiag) {
  const logo = await fetchLogoBlanco()
  const logoParagraphs = logo
    ? [new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
        children: [new ImageRun({ data: logo.data, transformation: { width: logo.width, height: logo.height }, type: 'jpg' })],
      })]
    : [centeredRun('MUNA', { size: 56, bold: true, spacingAfter: 40 })]

  return coloredBlock({
    fill: BLUE,
    heightTwips: 13500,
    children: [
      ...logoParagraphs,
      centeredRun('Municipio Unido por la Niñez y la Adolescencia', { size: 18, spacingAfter: 500 }),
      centeredRun('Autodiagnóstico', { size: 64, bold: true, font: FONT_HEADING, spacingAfter: 0 }),
      centeredRun('municipal', { size: 64, bold: true, font: FONT_HEADING, spacingAfter: 200 }),
      centeredRun('CAJA DE HERRAMIENTAS', { size: 20, spacingAfter: 700 }),
      centeredRun(`Municipio: ${muni.nombre}`, { size: 24, bold: true, spacingAfter: 80 }),
      centeredRun(`Cohorte: ${autodiag.cohorteNombre ?? '—'}`, { size: 22, spacingAfter: 80 }),
      centeredRun(`Año: ${autodiag.anio ?? '—'}    Estado: ${autodiag.estado ?? '—'}`, { size: 22, spacingAfter: 80 }),
      centeredRun(`Generado el ${new Date().toLocaleDateString('es-AR')}`, { size: 18, spacingAfter: 0 }),
    ],
  })
}

function buildDivisorGrupo(letra, titulo) {
  return coloredBlock({
    fill: NAVY,
    heightTwips: 13500,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: letra, size: 216, bold: true, color: 'AFC8FF', font: FONT_HEADING })],
      }),
      centeredRun(titulo, { size: 48, bold: true, font: FONT_HEADING, spacingAfter: 0 }),
    ],
  })
}

function seccionHeading(numero, nombre) {
  return new Paragraph({
    heading: undefined,
    spacing: { before: 400, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BLUE, space: 6 } },
    children: [
      new TextRun({ text: `${numero}. `, bold: true, size: 30, color: BLUE, font: FONT_HEADING }),
      new TextRun({ text: nombre, bold: true, size: 30, color: BLUE, font: FONT_HEADING }),
    ],
  })
}

function preguntaTexto(numero, pregunta, respuesta) {
  const valor = formatRespuestaSimple(pregunta, respuesta)
  const sinResponder = valor === 'Sin responder'
  return [
    new Paragraph({
      spacing: { before: 240, after: 60 },
      children: [
        new TextRun({ text: `${numero}. `, bold: true, size: 22, color: DARK, font: FONT_BODY }),
        new TextRun({ text: pregunta.texto, bold: true, size: 22, color: DARK, font: FONT_BODY }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      indent: { left: 300 },
      children: [
        new TextRun({
          text: valor,
          italics: sinResponder,
          color: sinResponder ? '6D7A77' : GRAY_TEXT,
          size: 21,
          font: FONT_BODY,
        }),
      ],
    }),
  ]
}

function tablaADocx(head, body) {
  const colWidth = Math.floor(100 / head.length)
  const headerRow = new TableRow({
    tableHeader: true,
    children: head.map(label => new TableCell({
      width: { size: colWidth, type: WidthType.PERCENTAGE },
      borders: CELL_BORDERS,
      shading: { fill: BLUE, type: ShadingType.CLEAR, color: 'auto' },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, color: WHITE, size: 18, font: FONT_BODY })] })],
    })),
  })

  const bodyRows = body.map((row, i) => new TableRow({
    children: row.map(cell => new TableCell({
      borders: CELL_BORDERS,
      shading: { fill: i % 2 === 0 ? 'FFFFFF' : 'F0F5F2', type: ShadingType.CLEAR, color: 'auto' },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [new TextRun({ text: String(cell ?? '—'), size: 18, color: DARK, font: FONT_BODY })] })],
    })),
  }))

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  })
}

function preguntaTabla(numero, pregunta, respuesta) {
  const { head, body } = buildTablaRows(pregunta, respuesta)
  const elementos = [
    new Paragraph({
      spacing: { before: 240, after: 100 },
      children: [
        new TextRun({ text: `${numero}. `, bold: true, size: 22, color: DARK, font: FONT_BODY }),
        new TextRun({ text: pregunta.texto, bold: true, size: 22, color: DARK, font: FONT_BODY }),
      ],
    }),
  ]

  if (body.length === 0) {
    elementos.push(new Paragraph({
      spacing: { after: 160 },
      indent: { left: 300 },
      children: [new TextRun({ text: 'Sin datos cargados.', italics: true, color: '6D7A77', size: 21, font: FONT_BODY })],
    }))
  } else {
    elementos.push(tablaADocx(head, body))
    elementos.push(new Paragraph({ spacing: { after: 160 }, children: [] }))
  }

  return elementos
}

// Deriva el grupo (A/B) y el número de subsección a partir del código de la
// primera pregunta de cada sección (ej. "A1_01" -> grupo "A", subsección 1).
function grupoDeSeccion(preguntasSec) {
  const codigo = preguntasSec[0]?.codigo || ''
  const match = codigo.match(/^([A-Z])(\d+)_/)
  if (!match) return { letra: 'A', numero: 1 }
  return { letra: match[1], numero: Number(match[2]) }
}

const NOMBRES_GRUPO = {
  A: 'Caracterización general',
  B: 'Abordaje de temáticas específicas',
}

export async function descargarWordAutodiagnostico({ idAutodiagnostico, idMunicipio }) {
  const { muni, autodiag, secciones, preguntas, respuestas } = await fetchDatosCompletos(idAutodiagnostico, idMunicipio)

  let cohorteNombre = null
  if (autodiag.id_cohorte) {
    const { data: cohorte } = await supabase.from('cohortes').select('nombre').eq('id', autodiag.id_cohorte).maybeSingle()
    cohorteNombre = cohorte?.nombre
  }

  const children = []
  children.push(await buildPortada(muni, { ...autodiag, cohorteNombre }))
  children.push(new Paragraph({ children: [new PageBreak()] }))

  const seccionesConPreguntas = secciones
    .map(sec => ({ sec, preguntasSec: preguntas.filter(p => p.id_seccion === sec.id).sort((a, b) => a.orden - b.orden) }))
    .filter(({ preguntasSec }) => preguntasSec.length > 0)

  let grupoActual = null
  let numeroGlobal = 0

  seccionesConPreguntas.forEach(({ sec, preguntasSec }, idx) => {
    const { letra, numero } = grupoDeSeccion(preguntasSec)

    if (letra !== grupoActual) {
      grupoActual = letra
      children.push(buildDivisorGrupo(letra, NOMBRES_GRUPO[letra] || 'Sección'))
      children.push(new Paragraph({ children: [new PageBreak()] }))
    }

    children.push(seccionHeading(`${letra}.${numero}`, sec.nombre))

    preguntasSec.forEach(p => {
      numeroGlobal += 1
      if (p.tipo === 'tabla') {
        children.push(...preguntaTabla(numeroGlobal, p, respuestas[p.id]))
      } else {
        children.push(...preguntaTexto(numeroGlobal, p, respuestas[p.id]))
      }
    })

    if (idx < seccionesConPreguntas.length - 1) {
      children.push(new Paragraph({ spacing: { after: 0 }, children: [] }))
    }
  })

  // Página de cierre
  children.push(new Paragraph({ children: [new PageBreak()] }))
  children.push(coloredBlock({
    fill: BLUE,
    heightTwips: 13500,
    children: [
      centeredRun('¡Muchas gracias!', { size: 48, bold: true, font: FONT_HEADING, spacingAfter: 300 }),
      centeredRun('MUNA — Municipio Unido por la Niñez y la Adolescencia', { size: 20, spacingAfter: 80 }),
      centeredRun('En convenio con UNICEF · para cada infancia', { size: 18, spacingAfter: 0 }),
    ],
  }))

  const doc = new Document({
    sections: [{
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 900, right: 900 } },
      },
      children,
    }],
    styles: {
      default: {
        document: { run: { font: FONT_BODY, size: 21 } },
      },
    },
  })

  const blob = await Packer.toBlob(doc)
  const nombreArchivo = `autodiagnostico_${muni.nombre.replace(/\s+/g, '_')}_${autodiag.anio ?? ''}.docx`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombreArchivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
