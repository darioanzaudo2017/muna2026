import {
  Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Header, Footer,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType, VerticalAlign, HeightRule,
  PageNumber, TextDirection, TableAnchorType, OverlapType, CharacterSet, LineRuleType,
  HorizontalPositionRelativeFrom, VerticalPositionRelativeFrom,
} from 'docx'
import {
  fetchDatosCompletos, formatRespuestaSimple, buildTablaRows,
  esChecklistCuadro, filasChecklist, notasPieTabla, FILAS_VACIAS_CUADRO,
} from './autodiagnosticoData'
import portadaUrl from '../assets/word/portada.jpg?url'
import fondoCianUrl from '../assets/word/fondo-cian.jpg?url'
import cierreUrl from '../assets/word/cierre.jpg?url'
import openSansUrl from '../assets/word/fonts/OpenSans-Regular.ttf?url'
import openSansSemiBoldUrl from '../assets/word/fonts/OpenSans-SemiBold.ttf?url'
import notoSansExtraBoldUrl from '../assets/word/fonts/NotoSans-ExtraBold.ttf?url'

// Réplica del documento base "Autodiagnóstico municipal – Caja de herramientas MUNA".
// Colores y tipografías medidos sobre el PDF original (documento de UNICEF/MUNA):
// celeste UNICEF en portada, divisores y encabezados de cuadro; celeste claro en los campos.
const CYAN = '009FE3'
const CAMPO = 'E0EDFD'
const BLANCO = 'FFFFFF'
const TEXTO = '1D1D1B'
const LETRA_DIVISOR = '80CDF1'
const GRIS = '7A7A7A'

// Un .docx solo referencia las fuentes por nombre; las del original (Open Sans y
// Noto Sans, licencia OFL) no vienen con Office, así que se incrustan en el archivo.
// Solo se incrusta la variante "regular" de cada familia, por eso los pesos van
// como familias aparte (SemiBold, ExtraBold) y no con el atributo "negrita".
const FUENTE_TEXTO = 'Open Sans'
const FUENTE_NEGRITA = 'Open Sans SemiBold'
const FUENTE_TITULO = 'Noto Sans ExtraBold'

// A4 en píxeles a 96 dpi, para las imágenes de página completa
const PAGINA_ANCHO_PX = 794
const PAGINA_ALTO_PX = 1123

const NOMBRES_GRUPO = {
  A: 'Caracterización general',
  B: 'Abordaje de temáticas específicas',
}

const PROVINCIA = 'Córdoba'

const TEXTO_INTRODUCCION = [
  'Este documento contiene el formulario para realizar el Autodiagnóstico MUNA.',
  'Se solicita responder en este documento las preguntas correspondientes a cada tema. Cuando se consignen datos, indicar fuente y año.',
  'En la medida de lo posible, desagregar la información según la situación de los grupos en mayor vulnerabilidad. Considerar, entre otras variables, edad, género, discapacidad, pertenencia a comunidades originarias u otros criterios pertinentes.',
]

const SIN_BORDES = {
  top: { style: BorderStyle.NONE, size: 0, color: BLANCO },
  bottom: { style: BorderStyle.NONE, size: 0, color: BLANCO },
  left: { style: BorderStyle.NONE, size: 0, color: BLANCO },
  right: { style: BorderStyle.NONE, size: 0, color: BLANCO },
}

// Celdas separadas por una línea blanca, como en los cuadros del original
const BORDES_CUADRO = {
  top: { style: BorderStyle.SINGLE, size: 8, color: BLANCO },
  bottom: { style: BorderStyle.SINGLE, size: 8, color: BLANCO },
  left: { style: BorderStyle.SINGLE, size: 8, color: BLANCO },
  right: { style: BorderStyle.SINGLE, size: 8, color: BLANCO },
}

async function cargarRecurso(url) {
  const respuesta = await fetch(url)
  if (!respuesta.ok) throw new Error(`No se pudo cargar el recurso del Word: ${url}`)
  return new Uint8Array(await respuesta.arrayBuffer())
}

// Imagen a página completa, detrás del texto
const fondoDePagina = (data) => new Paragraph({
  children: [new ImageRun({
    type: 'jpg',
    data,
    transformation: { width: PAGINA_ANCHO_PX, height: PAGINA_ALTO_PX },
    floating: {
      horizontalPosition: { relative: HorizontalPositionRelativeFrom.PAGE, offset: 0 },
      verticalPosition: { relative: VerticalPositionRelativeFrom.PAGE, offset: 0 },
      behindDocument: true,
      allowOverlap: true,
      lockAnchor: true,
    },
  })],
})

const encabezadoVacio = () => new Header({ children: [new Paragraph({})] })
const pieVacio = () => new Footer({ children: [new Paragraph({})] })

// Número de página en celeste y rótulo vertical, arriba a la derecha como en el original
function encabezadoPagina() {
  const ancho = 620
  return new Header({
    children: [
      new Table({
        float: {
          horizontalAnchor: TableAnchorType.PAGE,
          verticalAnchor: TableAnchorType.PAGE,
          absoluteHorizontalPosition: 10900,
          absoluteVerticalPosition: 560,
          overlap: OverlapType.NEVER,
        },
        width: { size: ancho, type: WidthType.DXA },
        columnWidths: [ancho],
        borders: SIN_BORDES,
        rows: [
          new TableRow({
            children: [new TableCell({
              width: { size: ancho, type: WidthType.DXA },
              borders: SIN_BORDES,
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [PageNumber.CURRENT], font: FUENTE_TEXTO, size: 40, color: CYAN })],
              })],
            })],
          }),
          new TableRow({
            height: { value: 3000, rule: HeightRule.ATLEAST },
            children: [new TableCell({
              width: { size: ancho, type: WidthType.DXA },
              borders: SIN_BORDES,
              textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
              verticalAlign: VerticalAlign.TOP,
              children: [new Paragraph({
                children: [
                  new TextRun({ text: 'CAJA DE HERRAMIENTAS', font: FUENTE_NEGRITA, size: 12, color: TEXTO }),
                  new TextRun({ text: '   Autodiagnóstico municipal', font: FUENTE_TEXTO, size: 12, color: GRIS }),
                ],
              })],
            })],
          }),
        ],
      }),
      new Paragraph({}),
    ],
  })
}

function seccionPagina({ children, margen, encabezado = encabezadoVacio() }) {
  return {
    properties: { page: { margin: margen } },
    headers: { default: encabezado },
    footers: { default: pieVacio() },
    children,
  }
}

// Portada: la imagen original a página completa (título, ilustración y logos MUNA y UNICEF)
function seccionPortada(portada) {
  return seccionPagina({
    margen: { top: 720, bottom: 720, left: 720, right: 720 },
    children: [fondoDePagina(portada)],
  })
}

const etiquetaCampo = (texto) => new Paragraph({
  spacing: { before: 120, after: 120 },
  children: [new TextRun({ text: texto, font: FUENTE_NEGRITA, size: 24, color: TEXTO })],
})

// Hoja de datos del municipio + consigna, como la página 2 del original
function seccionIntroduccion({ municipio, fecha }) {
  const fila = (etiqueta, valor) => new TableRow({
    children: [
      new TableCell({
        width: { size: 38, type: WidthType.PERCENTAGE },
        margins: { left: 240, right: 120 },
        verticalAlign: VerticalAlign.CENTER,
        children: [etiquetaCampo(etiqueta)],
      }),
      new TableCell({
        width: { size: 62, type: WidthType.PERCENTAGE },
        margins: { left: 120, right: 240, top: 40, bottom: 40 },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({
          shading: { type: ShadingType.CLEAR, fill: CAMPO, color: 'auto' },
          spacing: { before: 40, after: 40 },
          children: [new TextRun({ text: ` ${valor}`, font: FUENTE_TEXTO, size: 24, color: TEXTO })],
        })],
      }),
    ],
  })

  const borde = { style: BorderStyle.SINGLE, size: 12, color: CYAN }
  const recuadro = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: borde, bottom: borde, left: borde, right: borde, insideHorizontal: SIN_BORDES.top, insideVertical: SIN_BORDES.top },
    rows: [fila('Municipio:', municipio), fila('Provincia:', PROVINCIA), fila('Fecha de entrega:', fecha)],
  })

  return seccionPagina({
    margen: { top: 4600, bottom: 1500, left: 2100, right: 2000 },
    encabezado: encabezadoPagina(),
    children: [
      recuadro,
      ...TEXTO_INTRODUCCION.map((texto, i) => new Paragraph({
        spacing: { before: i === 0 ? 700 : 0, after: 260 },
        children: [new TextRun({ text: texto, font: FUENTE_TEXTO, italics: true, size: 24, color: TEXTO })],
      })),
    ],
  })
}

// Divisor de grupo (A / B): celeste a página completa, letra grande y título
function seccionDivisor(letra, titulo, fondo) {
  return seccionPagina({
    margen: { top: 2500, bottom: 1000, left: 2700, right: 1500 },
    children: [
      fondoDePagina(fondo),
      new Paragraph({
        spacing: { line: 4300, lineRule: LineRuleType.EXACT },
        children: [new TextRun({ text: letra, font: FUENTE_TITULO, size: 358, color: LETRA_DIVISOR })],
      }),
      new Paragraph({
        spacing: { before: 0, line: 820, lineRule: LineRuleType.EXACT },
        children: [new TextRun({ text: titulo, font: FUENTE_TITULO, size: 72, color: BLANCO })],
      }),
    ],
  })
}

// Cierre: celeste con los logos de MUNA y UNICEF
function seccionCierre(cierre) {
  return seccionPagina({
    margen: { top: 720, bottom: 720, left: 720, right: 720 },
    children: [fondoDePagina(cierre)],
  })
}

function tituloSubseccion(codigo, nombre) {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 520, after: 260 },
    children: [new TextRun({ text: `${codigo}. ${nombre}`, font: FUENTE_TITULO, size: 50, color: CYAN })],
  })
}

function encabezadoPregunta(numero, pregunta, despues) {
  return new Paragraph({
    keepNext: true,
    spacing: { before: numero == null ? 160 : 300, after: despues },
    children: [
      ...(numero == null ? [] : [new TextRun({ text: `${numero}. `, font: FUENTE_NEGRITA, size: 24, color: TEXTO })]),
      new TextRun({ text: pregunta.texto, font: FUENTE_TEXTO, size: 24, color: TEXTO }),
    ],
  })
}

const espacio = (despues = 160) => new Paragraph({ spacing: { after: despues }, children: [] })

// Campo de respuesta: recuadro celeste claro, con la respuesta si la hay
function campoRespuesta(texto) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: SIN_BORDES,
    rows: [new TableRow({
      height: { value: 720, rule: HeightRule.ATLEAST },
      children: [new TableCell({
        borders: SIN_BORDES,
        shading: { fill: CAMPO, type: ShadingType.CLEAR, color: 'auto' },
        margins: { top: 100, bottom: 100, left: 160, right: 160 },
        children: String(texto ?? '')
          .split('\n')
          .map(linea => new Paragraph({ children: [new TextRun({ text: linea, font: FUENTE_TEXTO, size: 22, color: TEXTO })] })),
      })],
    })],
  })
}

function preguntaTexto(numero, pregunta, respuesta) {
  const valor = formatRespuestaSimple(pregunta, respuesta)
  // Sin respuesta, el campo queda en blanco como en el formulario original
  return [encabezadoPregunta(numero, pregunta, 120), campoRespuesta(valor === 'Sin responder' ? '' : valor), espacio()]
}

// Cuadro de temáticas con columna "X" (sin fila de encabezado, como el documento base)
function preguntaChecklist(numero, pregunta, respuesta) {
  const filas = filasChecklist(pregunta, respuesta)
  const celda = (texto, { ancho, centrado, destacado }) => new TableCell({
    width: { size: ancho, type: WidthType.PERCENTAGE },
    borders: BORDES_CUADRO,
    shading: { fill: CAMPO, type: ShadingType.CLEAR, color: 'auto' },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 140, right: 140 },
    children: [new Paragraph({
      alignment: centrado ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: texto, font: destacado ? FUENTE_NEGRITA : FUENTE_TEXTO, size: 21, color: TEXTO })],
    })],
  })
  const tabla = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: filas.map(f => new TableRow({
      children: [
        celda(f.etiqueta, { ancho: 88 }),
        celda(f.marcada ? 'X' : '', { ancho: 12, centrado: true, destacado: true }),
      ],
    })),
  })
  return [encabezadoPregunta(numero, pregunta, 120), tabla, espacio()]
}

function tablaADocx(head, body, { filasVacias = false } = {}) {
  // La primera columna (rótulos de fila) más ancha que las de datos
  const anchoPrimera = head.length > 2 ? 34 : Math.floor(100 / head.length)
  const anchoDe = (col) => (col === 0 ? anchoPrimera : Math.floor((100 - anchoPrimera) / (head.length - 1)))
  const encabezado = new TableRow({
    tableHeader: true,
    children: head.map((label, col) => new TableCell({
      width: { size: anchoDe(col), type: WidthType.PERCENTAGE },
      borders: BORDES_CUADRO,
      shading: { fill: CYAN, type: ShadingType.CLEAR, color: 'auto' },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 90, bottom: 90, left: 100, right: 100 },
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: label, font: FUENTE_NEGRITA, size: 20, color: BLANCO })],
      })],
    })),
  })

  const filas = body.map(row => new TableRow({
    // Cuadro en blanco para completar a mano: filas con altura mínima para escribir
    ...(filasVacias ? { height: { value: 480, rule: HeightRule.ATLEAST } } : {}),
    children: row.map((cell, col) => new TableCell({
      width: { size: anchoDe(col), type: WidthType.PERCENTAGE },
      borders: BORDES_CUADRO,
      shading: { fill: CAMPO, type: ShadingType.CLEAR, color: 'auto' },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
      children: [new Paragraph({
        alignment: col === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
        children: [new TextRun({ text: cell === '—' ? '' : String(cell ?? ''), font: FUENTE_TEXTO, size: 21, color: TEXTO })],
      })],
    })),
  }))

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [encabezado, ...filas] })
}

function preguntaTabla(numero, pregunta, respuesta) {
  const { head, body } = buildTablaRows(pregunta, respuesta)
  const elementos = [encabezadoPregunta(numero, pregunta, 120)]
  const notasPie = notasPieTabla(pregunta).map(nota => new Paragraph({
    spacing: { before: 60, after: 20 },
    children: [new TextRun({ text: nota, font: FUENTE_TEXTO, size: 16, color: TEXTO })],
  }))

  if (body.length === 0 && pregunta.config?.modo === 'dinamico') {
    // Sin datos, el cuadro se dibuja igual (en blanco) como en el documento base
    const vacias = Array.from({ length: FILAS_VACIAS_CUADRO }, () => head.map(() => ''))
    elementos.push(tablaADocx(head, vacias, { filasVacias: true }), ...notasPie, espacio())
  } else if (body.length === 0) {
    elementos.push(campoRespuesta(''), espacio())
  } else {
    elementos.push(tablaADocx(head, body), ...notasPie, espacio())
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

export async function descargarWordAutodiagnostico({ idAutodiagnostico, idMunicipio }) {
  const [datos, portada, fondoCian, cierre, openSans, openSansSemiBold, notoSansExtraBold] = await Promise.all([
    fetchDatosCompletos(idAutodiagnostico, idMunicipio),
    cargarRecurso(portadaUrl),
    cargarRecurso(fondoCianUrl),
    cargarRecurso(cierreUrl),
    cargarRecurso(openSansUrl),
    cargarRecurso(openSansSemiBoldUrl),
    cargarRecurso(notoSansExtraBoldUrl),
  ])
  const { muni, autodiag, secciones, preguntas, respuestas, numeracion } = datos

  const seccionesConPreguntas = secciones
    .map(sec => ({ sec, preguntasSec: preguntas.filter(p => p.id_seccion === sec.id).sort((a, b) => a.orden - b.orden) }))
    .filter(({ preguntasSec }) => preguntasSec.length > 0)

  // Las subsecciones se agrupan por letra (A, B): cada grupo lleva su divisor y sus páginas
  const grupos = []
  let numeroGlobal = 0

  seccionesConPreguntas.forEach(({ sec, preguntasSec }) => {
    const { letra, numero } = grupoDeSeccion(preguntasSec)
    if (grupos.at(-1)?.letra !== letra) grupos.push({ letra, children: [] })
    const children = grupos.at(-1).children

    children.push(tituloSubseccion(`${letra}.${numero}`, sec.nombre))

    preguntasSec.forEach(p => {
      // Con numeración global (Cohorte 2026) el número sale de calcularNumeracion;
      // en el resto de las cohortes se mantiene el contador corrido de siempre.
      const n = numeracion ? numeracion[p.id] : ++numeroGlobal
      if (p.tipo === 'tabla') children.push(...preguntaTabla(n, p, respuestas[p.id]))
      else if (esChecklistCuadro(p)) children.push(...preguntaChecklist(n, p, respuestas[p.id]))
      else children.push(...preguntaTexto(n, p, respuestas[p.id]))
    })
  })

  const fecha = new Date().toLocaleDateString('es-AR')

  const doc = new Document({
    creator: 'MUNA — Autodiagnóstico municipal',
    title: `Autodiagnóstico municipal — ${muni.nombre}`,
    fonts: [
      { name: FUENTE_TEXTO, data: openSans, characterSet: CharacterSet.ANSI },
      { name: FUENTE_NEGRITA, data: openSansSemiBold, characterSet: CharacterSet.ANSI },
      { name: FUENTE_TITULO, data: notoSansExtraBold, characterSet: CharacterSet.ANSI },
    ],
    styles: {
      default: {
        document: { run: { font: FUENTE_TEXTO, size: 24, color: TEXTO } },
      },
    },
    sections: [
      seccionPortada(portada),
      seccionIntroduccion({ municipio: muni.nombre, fecha }),
      ...grupos.flatMap(({ letra, children }) => [
        seccionDivisor(letra, NOMBRES_GRUPO[letra] || 'Sección', fondoCian),
        seccionPagina({
          margen: { top: 2000, bottom: 1500, left: 2100, right: 2000 },
          encabezado: encabezadoPagina(),
          children,
        }),
      ]),
      seccionCierre(cierre),
    ],
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
