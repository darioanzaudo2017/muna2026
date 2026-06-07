import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useSecciones() {
  const [secciones, setSecciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    async function fetchSecciones() {
      try {
        setLoading(true)
        const { data, error: dbError } = await supabase
          .from('secciones')
          .select(`
            id,
            nombre,
            orden,
            preguntas (
              id,
              id_seccion,
              codigo,
              texto,
              tipo,
              orden,
              requerida,
              activa,
              opciones_pregunta (
                id,
                id_pregunta,
                etiqueta,
                valor,
                orden
              )
            )
          `)
          .order('orden')

        if (dbError) throw dbError

        if (active) {
          // Process and sort the nested arrays to ensure correct order
          const processed = (data || []).map(seccion => {
            const preguntasActivas = (seccion.preguntas || [])
              .filter(p => p.activa !== false) // Only active questions
              .sort((a, b) => (a.orden || 0) - (b.orden || 0))
              .map(pregunta => {
                const opcionesSorted = (pregunta.opciones_pregunta || [])
                  .sort((a, b) => (a.orden || 0) - (b.orden || 0))
                return { ...pregunta, opciones_pregunta: opcionesSorted }
              })
            return { ...seccion, preguntas: preguntasActivas }
          })
          
          setSecciones(processed)
        }
      } catch (err) {
        console.error('Error fetching sections and questions:', err)
        if (active) {
          setError(err)
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    fetchSecciones()

    return () => {
      active = false
    }
  }, [])

  return { secciones, loading, error }
}
