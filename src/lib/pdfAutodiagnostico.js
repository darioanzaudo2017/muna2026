import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from './supabase'

const COLOR_PRIMARY = [0, 104, 95]
const COLOR_SECONDARY = [0, 108, 73]

function formatRespuestaSimple(pregunta, respuesta) {
  if (!respuesta) return 'Sin responder'

  if (pregunta.tipo === 'texto') {
    return respuesta.valor_texto?.trim() ? respuesta.valor_texto : 'Sin responder'
  }
  if (pregunta.tipo === 'numero') {
    return respuesta.valor_numerico !== null && respuesta.valor_numerico !== undefined
      ? String(respuesta.valor_numerico)
      : 'Sin responder'
  }
  if (pregunta.tipo === 'boolean') {
    if (respuesta.valor_texto === 'si') return 'Sí'
    if (respuesta.valor_texto === 'no') return 'No'
    return 'Sin responder'
  }
  if (pregunta.tipo === 'opcion') {
    const opt = pregunta.opciones_pregunta?.find(o => o.valor === respuesta.valor_texto)
    return opt?.etiqueta ?? (respuesta.valor_texto?.trim() ? respuesta.valor_texto : 'Sin responder')
  }
  if (pregunta.tipo === 'array') {
    const list = Array.isArray(respuesta.valor_array) ? respuesta.valor_array : []
    if (list.length === 0) return 'Sin responder'
    return list
      .map(v => pregunta.opciones_pregunta?.find(o => o.valor === v)?.etiqueta ?? v)
      .join(', ')
  }
  return 'Sin responder'
}

function formatCeldaTabla(value, col) {
  if (value === undefined || value === null || value === '') return '—'
  if (col.tipo === 'boolean') {
    if (value === 'si') return 'Sí'
    if (value === 'no') return 'No'
    return '—'
  }
  return String(value)
}

function buildTablaRows(pregunta, respuesta) {
  const modo = pregunta.config?.modo
  const valorArray = Array.isArray(respuesta?.valor_array) ? respuesta.valor_array : []

  if (!modo) {
    // Tabla de grupos vulnerables (tiene_dato + cantidad)
    const head = ['Grupo de vulneración', 'Tiene el dato', 'Cantidad']
    const body = valorArray.map(row => [
      row.etiqueta ?? row.grupo ?? '',
      row.tiene_dato === 'si' ? 'Sí' : row.tiene_dato === 'no' ? 'No' : row.tiene_dato === 'ns' ? 'Ns/Nc' : '—',
      row.tiene_dato === 'si' ? (row.cantidad ?? '—') : '—',
    ])
    return { head, body }
  }

  if (modo === 'fijo') {
    const columnas = pregunta.config?.columnas ?? [{ key: 'cantidad', label: 'Cantidad' }]
    const filas = pregunta.opciones_pregunta ?? []
    const head = ['Indicador', ...columnas.map(c => c.label)]
    const body = filas.map(fila => {
      const row = valorArray.find(r => r._fila === fila.valor)
      return [fila.etiqueta, ...columnas.map(c => formatCeldaTabla(row?.[c.key], c))]
    })
    return { head, body }
  }

  // dinámico
  const columnas = pregunta.config?.columnas ?? []
  const head = columnas.map(c => c.label)
  const body = valorArray.map(row => columnas.map(c => formatCeldaTabla(row[c.key], c)))
  return { head, body }
}

async function fetchDatosCompletos(idAutodiagnostico, idMunicipio) {
  const [{ data: muni }, { data: autodiag }, { data: secciones }, { data: preguntas }, { data: respuestasRaw }] =
    await Promise.all([
      supabase.from('municipios').select('nombre').eq('id', idMunicipio).maybeSingle(),
      supabase.from('autodiagnosticos').select('anio, estado').eq('id', idAutodiagnostico).maybeSingle(),
      supabase.from('secciones').select('*').order('orden'),
      supabase.from('preguntas').select('*, opciones_pregunta(*)').eq('activa', true).order('orden'),
      supabase.from('respuestas').select('*').eq('id_autodiagnostico', idAutodiagnostico),
    ])

  const respuestas = {}
  ;(respuestasRaw ?? []).forEach(r => { respuestas[r.id_pregunta] = r })

  return {
    muni: muni ?? { nombre: 'Municipio' },
    autodiag: autodiag ?? {},
    secciones: (secciones ?? []).slice().sort((a, b) => a.orden - b.orden),
    preguntas: preguntas ?? [],
    respuestas,
  }
}

export async function descargarPdfAutodiagnostico({ idAutodiagnostico, idMunicipio }) {
  const { muni, autodiag, secciones, preguntas, respuestas } = await fetchDatosCompletos(idAutodiagnostico, idMunicipio)

  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  let y = margin

  doc.setFontSize(15)
  doc.setFont(undefined, 'bold')
  doc.setTextColor(...COLOR_PRIMARY)
  doc.text('Autodiagnóstico Municipal de Protección de NNyA', margin, y)
  y += 24

  doc.setFontSize(11)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(0, 0, 0)
  doc.text(`Municipio: ${muni.nombre}`, margin, y); y += 16
  doc.text(`Año: ${autodiag.anio ?? '—'}    Estado: ${autodiag.estado ?? '—'}`, margin, y); y += 16
  doc.text(`Generado: ${new Date().toLocaleString('es-AR')}`, margin, y); y += 26

  for (const sec of secciones) {
    const preguntasSec = preguntas
      .filter(p => p.id_seccion === sec.id)
      .sort((a, b) => a.orden - b.orden)
    if (preguntasSec.length === 0) continue

    if (y > pageHeight - 100) { doc.addPage(); y = margin }

    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...COLOR_PRIMARY)
    doc.text(`Sección ${sec.orden}. ${sec.nombre}`, margin, y)
    doc.setTextColor(0, 0, 0)
    y += 12

    const filasSimples = []
    const tablasPendientes = []
    preguntasSec.forEach(p => {
      if (p.tipo === 'tabla') tablasPendientes.push(p)
      else filasSimples.push([p.texto, formatRespuestaSimple(p, respuestas[p.id])])
    })

    if (filasSimples.length > 0) {
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [['Pregunta', 'Respuesta']],
        body: filasSimples,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 5, valign: 'top' },
        headStyles: { fillColor: COLOR_PRIMARY },
        columnStyles: { 0: { cellWidth: 220 } },
      })
      y = doc.lastAutoTable.finalY + 16
    }

    for (const p of tablasPendientes) {
      if (y > pageHeight - 100) { doc.addPage(); y = margin }

      doc.setFontSize(10)
      doc.setFont(undefined, 'bold')
      doc.text(p.texto, margin, y)
      y += 6

      const { head, body } = buildTablaRows(p, respuestas[p.id])
      if (body.length === 0) {
        doc.setFont(undefined, 'italic')
        doc.setFontSize(9)
        doc.text('Sin datos cargados.', margin, y + 12)
        doc.setFont(undefined, 'normal')
        y += 28
      } else {
        autoTable(doc, {
          startY: y + 6,
          margin: { left: margin, right: margin },
          head: [head],
          body,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 4 },
          headStyles: { fillColor: COLOR_SECONDARY },
        })
        y = doc.lastAutoTable.finalY + 16
      }
    }
  }

  const nombreArchivo = `autodiagnostico_${muni.nombre.replace(/\s+/g, '_')}_${autodiag.anio ?? ''}.pdf`
  doc.save(nombreArchivo)
}
