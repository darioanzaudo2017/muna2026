import { supabase } from './supabase'

// Cohortes con numeracion_global (ej. Cohorte 2026) numeran las preguntas seguidas en
// todo el documento, como el original MUNA. Las filas marcadas es_continuacion son
// subpreguntas de la anterior y no llevan número propio.
// Devuelve { [idPregunta]: número | null }.
export function calcularNumeracion(secciones, preguntas) {
  const numeros = {}
  let n = 0
  secciones
    .slice()
    .sort((a, b) => a.orden - b.orden)
    .forEach(sec => {
      preguntas
        .filter(p => p.id_seccion === sec.id)
        .sort((a, b) => a.orden - b.orden)
        .forEach(p => {
          numeros[p.id] = p.es_continuacion ? null : ++n
        })
    })
  return numeros
}

// null si la cohorte no usa numeración global (o si la columna todavía no existe).
export async function fetchNumeracionGlobal(idCohorte, secciones, preguntas) {
  if (!idCohorte) return null
  const { data } = await supabase
    .from('cohortes')
    .select('numeracion_global')
    .eq('id', idCohorte)
    .maybeSingle()
  return data?.numeracion_global ? calcularNumeracion(secciones, preguntas) : null
}
