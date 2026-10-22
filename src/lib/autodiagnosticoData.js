import { supabase } from './supabase'
import { fetchNumeracionGlobal } from './numeracionPreguntas'

// Lógica compartida de datos y formato entre los exportadores de
// autodiagnóstico (PDF y Word), para no duplicarla entre módulos.

export function formatRespuestaSimple(pregunta, respuesta) {
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

export function formatCeldaTabla(value, col) {
  if (value === undefined || value === null || value === '') return '—'
  if (col.tipo === 'boolean') {
    if (value === 'si') return 'Sí'
    if (value === 'no') return 'No'
    return '—'
  }
  return String(value)
}

export function buildTablaRows(pregunta, respuesta) {
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

export async function fetchDatosCompletos(idAutodiagnostico, idMunicipio) {
  const [{ data: muni }, { data: autodiag }] = await Promise.all([
    supabase.from('municipios').select('nombre').eq('id', idMunicipio).maybeSingle(),
    supabase.from('autodiagnosticos').select('anio, estado, id_cohorte').eq('id', idAutodiagnostico).maybeSingle(),
  ])

  let secQuery = supabase.from('secciones').select('*').order('orden')
  let pregQuery = supabase.from('preguntas').select('*, opciones_pregunta(*)').eq('activa', true).order('orden')

  if (autodiag?.id_cohorte) {
    secQuery = secQuery.eq('id_cohorte', autodiag.id_cohorte)
    pregQuery = pregQuery.eq('id_cohorte', autodiag.id_cohorte)
  }

  const [{ data: secciones }, { data: preguntas }, { data: respuestasRaw }] = await Promise.all([
    secQuery,
    pregQuery,
    supabase.from('respuestas').select('*').eq('id_autodiagnostico', idAutodiagnostico),
  ])

  const respuestas = {}
  ;(respuestasRaw ?? []).forEach(r => { respuestas[r.id_pregunta] = r })

  const seccionesOrdenadas = (secciones ?? []).slice().sort((a, b) => a.orden - b.orden)

  return {
    muni: muni ?? { nombre: 'Municipio' },
    autodiag: autodiag ?? {},
    secciones: seccionesOrdenadas,
    preguntas: preguntas ?? [],
    respuestas,
    numeracion: await fetchNumeracionGlobal(autodiag?.id_cohorte, seccionesOrdenadas, preguntas ?? []),
  }
}
