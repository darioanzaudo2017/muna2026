import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing in environment variables.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function getOrCreateAutodiagnostico(idMunicipio, anio = 2025) {
  const { data: existing } = await supabase
    .from('autodiagnosticos')
    .select('id')
    .eq('idmunicipio', idMunicipio)
    .eq('anio', anio)
    .maybeSingle()

  if (existing) return existing.id

  // El autodiagnóstico queda fijo a la cohorte del municipio al momento de
  // crearse — determina qué versión de secciones/preguntas usa, y no se
  // mueve aunque el municipio cambie de cohorte más adelante.
  const { data: muni } = await supabase
    .from('municipios')
    .select('id_cohorte')
    .eq('id', idMunicipio)
    .maybeSingle()

  const { data: created, error } = await supabase
    .from('autodiagnosticos')
    .insert({ idmunicipio: idMunicipio, anio, estado: 'borrador', id_cohorte: muni?.id_cohorte ?? null })
    .select('id')
    .maybeSingle()

  if (error) {
    // Si hubo conflicto (ya existe), intentar buscar de nuevo
    const { data: retry } = await supabase
      .from('autodiagnosticos')
      .select('id')
      .eq('idmunicipio', idMunicipio)
      .eq('anio', anio)
      .maybeSingle()
    return retry?.id ?? null
  }

  return created?.id ?? null
}
