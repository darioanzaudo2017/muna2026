import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { fetchDatosCompletos, formatRespuestaSimple, buildTablaRows } from './autodiagnosticoData'

const COLOR_PRIMARY = [0, 104, 95]
const COLOR_SECONDARY = [0, 108, 73]

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
