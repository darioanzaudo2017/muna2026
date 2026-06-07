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

  const { data: created, error } = await supabase
    .from('autodiagnosticos')
    .insert({ idmunicipio: idMunicipio, anio, estado: 'borrador' })
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
