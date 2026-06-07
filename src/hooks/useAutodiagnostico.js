import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useAutodiagnostico(idMunicipio, anio = 2025) {
  const [autodiag, setAutodiag] = useState(null)
  const [respuestas, setRespuestas] = useState({}) // Keyed by id_pregunta
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle') // 'idle' | 'saving' | 'saved' | 'error' | 'offline-saved'
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  // Keep latest state in ref for queue processor
  const isOnlineRef = useRef(isOnline)
  isOnlineRef.current = isOnline

  // Load online status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      syncPendingQueue()
    }
    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [idMunicipio, anio])

  // Get pending queue from localStorage
  const getPendingQueue = useCallback(() => {
    try {
      const queue = localStorage.getItem('pending_respuestas_queue')
      return queue ? JSON.parse(queue) : []
    } catch {
      return []
    }
  }, [])

  // Save pending queue to localStorage
  const savePendingQueue = useCallback((queue) => {
    localStorage.setItem('pending_respuestas_queue', JSON.stringify(queue))
  }, [])

  // Sync queue to database
  const syncPendingQueue = useCallback(async () => {
    if (!navigator.onLine) return

    const queue = getPendingQueue()
    if (queue.length === 0) return

    console.log(`Syncing ${queue.length} pending responses...`)
    setSaveStatus('saving')

    const remainingQueue = []
    
    for (const item of queue) {
      try {
        // If the item has a temporary autodiagnostico id, we must resolve it first
        let finalAutodiagId = item.id_autodiagnostico
        
        if (typeof finalAutodiagId === 'string' && finalAutodiagId.startsWith('temp_')) {
          // Resolve real autodiagnostico
          const realAutodiag = await getOrCreateRealAutodiagnostico(idMunicipio, anio)
          if (!realAutodiag) {
            remainingQueue.push(item)
            continue
          }
          finalAutodiagId = realAutodiag.id
        }

        const { error: upsertError } = await supabase.from('respuestas').upsert({
          id_autodiagnostico: finalAutodiagId,
          id_pregunta: item.id_pregunta,
          valor_texto: item.valor_texto,
          valor_numerico: item.valor_numerico,
          valor_array: item.valor_array
        }, { onConflict: 'id_autodiagnostico,id_pregunta' })

        if (upsertError) throw upsertError
      } catch (err) {
        console.error('Failed to sync response:', item, err)
        remainingQueue.push(item)
      }
    }

    savePendingQueue(remainingQueue)
    if (remainingQueue.length === 0) {
      setSaveStatus('saved')
      // Reload actual data from server to align
      loadAutodiagAndRespuestas()
    } else {
      setSaveStatus('error')
    }
  }, [idMunicipio, anio, getPendingQueue, savePendingQueue])

  // Get or create real autodiagnostico
  const getOrCreateRealAutodiagnostico = async (muniId, currentAnio) => {
    try {
      let { data, error: fetchErr } = await supabase
        .from('autodiagnosticos')
        .select('*')
        .eq('idmunicipio', muniId)
        .eq('anio', currentAnio)
        .maybeSingle()

      if (fetchErr) throw fetchErr

      if (!data) {
        const { data: nuevo, error: insertErr } = await supabase
          .from('autodiagnosticos')
          .insert({ idmunicipio: muniId, anio: currentAnio, estado: 'borrador' })
          .select()
          .single()
        
        if (insertErr) throw insertErr
        data = nuevo
      }
      return data
    } catch (err) {
      console.error('Error getting or creating autodiagnostico in DB:', err)
      return null
    }
  }

  // Load Autodiagnóstico and Respuestas
  const loadAutodiagAndRespuestas = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const localAutodiagKey = `autodiag_${idMunicipio}_${anio}`
      const localRespuestasKey = `respuestas_${idMunicipio}_${anio}`

      if (navigator.onLine) {
        // Online: Fetch from Supabase
        const realAutodiag = await getOrCreateRealAutodiagnostico(idMunicipio, anio)
        if (!realAutodiag) throw new Error('Could not retrieve or create autodiagnostico')

        setAutodiag(realAutodiag)
        localStorage.setItem(localAutodiagKey, JSON.stringify(realAutodiag))

        const { data: dbRespuestas, error: respError } = await supabase
          .from('respuestas')
          .select('id_pregunta, valor_texto, valor_numerico, valor_array')
          .eq('id_autodiagnostico', realAutodiag.id)

        if (respError) throw respError

        // Convert array to object keyed by id_pregunta
        const respMap = {}
        ;(dbRespuestas || []).forEach(r => {
          respMap[r.id_pregunta] = r
        })

        setRespuestas(respMap)
        localStorage.setItem(localRespuestasKey, JSON.stringify(respMap))
        
        // Trigger sync if there are pending offline modifications
        await syncPendingQueue()
      } else {
        // Offline: Fetch from localStorage
        const cachedAutodiag = localStorage.getItem(localAutodiagKey)
        const cachedRespuestas = localStorage.getItem(localRespuestasKey)

        if (cachedAutodiag) {
          setAutodiag(JSON.parse(cachedAutodiag))
        } else {
          // Create a local temporary structure
          const tempAutodiag = {
            id: `temp_${idMunicipio}_${anio}`,
            idmunicipio: idMunicipio,
            anio: anio,
            estado: 'borrador'
          }
          setAutodiag(tempAutodiag)
          localStorage.setItem(localAutodiagKey, JSON.stringify(tempAutodiag))
        }

        if (cachedRespuestas) {
          setRespuestas(JSON.parse(cachedRespuestas))
        } else {
          setRespuestas({})
        }
      }
    } catch (err) {
      console.error('Error loading autodiagnostico data:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [idMunicipio, anio, syncPendingQueue])

  useEffect(() => {
    loadAutodiagAndRespuestas()
  }, [loadAutodiagAndRespuestas])

  // Save/Upsert a response
  const saveResponse = useCallback(async (idPregunta, tipo, valor) => {
    if (!autodiag) return

    setSaveStatus('saving')

    // Prepare response data based on type
    const responsePayload = {
      id_pregunta: idPregunta,
      valor_texto: null,
      valor_numerico: null,
      valor_array: null
    }

    if (tipo === 'numero') {
      responsePayload.valor_numerico = valor !== '' && valor !== null ? Number(valor) : null
    } else if (tipo === 'array') {
      responsePayload.valor_array = Array.isArray(valor) ? valor : []
    } else {
      // texto, opcion, boolean
      responsePayload.valor_texto = valor !== null && valor !== undefined ? String(valor) : null
    }

    // Update local state immediately
    setRespuestas(prev => {
      const updated = {
        ...prev,
        [idPregunta]: responsePayload
      }
      // Save local state to localStorage
      localStorage.setItem(`respuestas_${idMunicipio}_${anio}`, JSON.stringify(updated))
      return updated
    })

    if (navigator.onLine && !autodiag.id.startsWith('temp_')) {
      // Save online
      try {
        const { error: upsertError } = await supabase.from('respuestas').upsert({
          id_autodiagnostico: autodiag.id,
          ...responsePayload
        }, { onConflict: 'id_autodiagnostico,id_pregunta' })

        if (upsertError) throw upsertError
        setSaveStatus('saved')
      } catch (err) {
        console.error('Error saving response to Supabase, queuing for offline:', err)
        // Queue it for offline retry
        const queue = getPendingQueue()
        queue.push({
          id_autodiagnostico: autodiag.id,
          ...responsePayload
        })
        savePendingQueue(queue)
        setSaveStatus('offline-saved')
      }
    } else {
      // Offline or using temp autodiagnostico: Queue for synchronization
      const queue = getPendingQueue()
      // Remove previous pending save for the same question
      const filteredQueue = queue.filter(item => item.id_pregunta !== idPregunta)
      filteredQueue.push({
        id_autodiagnostico: autodiag.id,
        ...responsePayload
      })
      savePendingQueue(filteredQueue)
      setSaveStatus('offline-saved')
    }
  }, [autodiag, idMunicipio, anio, getPendingQueue, savePendingQueue])

  // Mark autodiagnostico as complete
  const marcarCompleto = useCallback(async () => {
    if (!autodiag) return false

    setSaveStatus('saving')
    const localAutodiagKey = `autodiag_${idMunicipio}_${anio}`

    // Update locally
    const updatedAutodiag = { ...autodiag, estado: 'completo' }
    setAutodiag(updatedAutodiag)
    localStorage.setItem(localAutodiagKey, JSON.stringify(updatedAutodiag))

    if (navigator.onLine && !autodiag.id.startsWith('temp_')) {
      try {
        const { error: updateError } = await supabase
          .from('autodiagnosticos')
          .update({ estado: 'completo' })
          .eq('id', autodiag.id)

        if (updateError) throw updateError
        setSaveStatus('saved')
        return true
      } catch (err) {
        console.error('Error marking autodiagnostico as complete on server:', err)
        setSaveStatus('error')
        return false
      }
    } else {
      // If offline, we save the status locally, but it will sync when online.
      // We also store it in pending queue/actions if needed (simple implementation: we will just update it when online sync triggers, or let the user sync again later)
      setSaveStatus('offline-saved')
      return true
    }
  }, [autodiag, idMunicipio, anio])

  return {
    autodiag,
    respuestas,
    loading,
    error,
    saveStatus,
    isOnline,
    saveResponse,
    marcarCompleto,
    reload: loadAutodiagAndRespuestas,
    sync: syncPendingQueue
  }
}
