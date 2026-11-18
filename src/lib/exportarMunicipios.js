// Exportaciones del listado de municipios con intendente/a y contactos (solo para admin):
// CSV para Excel y PDF. Reciben los municipios ya armados por MunicipiosList.
//
// El CSV usa separador ";" y BOM UTF-8: así Excel en español lo abre en columnas y con
// los acentos bien.

const SEPARADOR = ';'
const COLOR_PRIMARIO = [255, 127, 17] // naranja DDNA

const triestado = (v) => (v === true ? 'Sí' : v === false ? 'No' : 'Sin dato')

const COLUMNAS = [
  ['Municipio', m => m.nombre],
  ['Cohorte', m => m.cohorteNombre],
  ['Intendente/a', m => m.contactos.intendente_nombre],
  ['Partido político', m => m.contactos.intendente_partido],
  ['Contacto 1 - Nombre', m => m.contactos.contacto1_nombre],
  ['Contacto 1 - Cargo', m => m.contactos.contacto1_cargo],
  ['Contacto 1 - Teléfono', m => m.contactos.contacto1_telefono],
  ['Contacto 1 - Mail', m => m.contactos.contacto1_email],
  ['Contacto 2 - Nombre', m => m.contactos.contacto2_nombre],
  ['Contacto 2 - Cargo', m => m.contactos.contacto2_cargo],
  ['Contacto 2 - Teléfono', m => m.contactos.contacto2_telefono],
  ['Contacto 2 - Mail', m => m.contactos.contacto2_email],
  ['Tiene área local', m => triestado(m.tieneAreaLocal)],
  ['Tiene ordenanza', m => triestado(m.tieneOrdenanza)],
  ['Ordenanza adjunta', m => (m.ordenanzaAdjunta ? 'Sí' : 'No')],
  ['Observación (área local y ordenanza)', m => m.areaOrdenanzaObservacion],
]

const celda = (valor) => {
  const texto = String(valor ?? '')
  return /[;"\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto
}

const fechaArchivo = () => new Date().toISOString().slice(0, 10)

export function descargarContactosCsv(municipios) {
  const filas = [
    COLUMNAS.map(([titulo]) => titulo),
    ...municipios.map(m => COLUMNAS.map(([, valor]) => valor(m))),
  ]
  const csv = '﻿' + filas.map(fila => fila.map(celda).join(SEPARADOR)).join('\r\n')

  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `municipios_intendentes_contactos_${fechaArchivo()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const sinDato = '—'

const textoContacto = (c, n) => {
  const lineas = [c[`contacto${n}_nombre`], c[`contacto${n}_cargo`], c[`contacto${n}_telefono`], c[`contacto${n}_email`]].filter(Boolean)
  return lineas.length ? lineas.join('\n') : sinDato
}

const textoAreaOrdenanza = (m) => [
  `Área local: ${triestado(m.tieneAreaLocal)}`,
  `Ordenanza: ${triestado(m.tieneOrdenanza)}${m.ordenanzaAdjunta ? ' (archivo adjunto)' : ''}`,
  m.areaOrdenanzaObservacion,
].filter(Boolean).join('\n')

export async function descargarContactosPdf(municipios) {
  // Se cargan recién al descargar para no sumar peso a la pantalla de municipios
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'landscape' })
  const margen = 36

  doc.setFont(undefined, 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...COLOR_PRIMARIO)
  doc.text('Municipios: intendentes, contactos, área local y ordenanza', margen, margen)
  doc.setFont(undefined, 'normal')
  doc.setFontSize(9)
  doc.setTextColor(90, 90, 90)
  doc.text(`${municipios.length} municipios · generado el ${new Date().toLocaleDateString('es-AR')}`, margen, margen + 16)

  autoTable(doc, {
    startY: margen + 30,
    margin: { left: margen, right: margen },
    head: [['Municipio', 'Cohorte', 'Intendente/a', 'Contacto 1', 'Contacto 2', 'Área local y ordenanza']],
    body: municipios.map(m => [
      m.nombre,
      m.cohorteNombre || sinDato,
      [m.contactos.intendente_nombre, m.contactos.intendente_partido].filter(Boolean).join('\n') || sinDato,
      textoContacto(m.contactos, 1),
      textoContacto(m.contactos, 2),
      textoAreaOrdenanza(m),
    ]),
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 5, valign: 'top' },
    headStyles: { fillColor: COLOR_PRIMARIO },
    columnStyles: { 0: { cellWidth: 105, fontStyle: 'bold' }, 1: { cellWidth: 65 }, 5: { cellWidth: 150 } },
  })

  doc.save(`municipios_intendentes_contactos_${fechaArchivo()}.pdf`)
}
