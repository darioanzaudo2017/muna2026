import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import SeccionFormulario from './SeccionFormulario'
import SaveIndicator from '../components/SaveIndicator'
import ProgressBar from '../components/ProgressBar'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function AutodiagnosticoLayout() {
  const { id, idAutodiagnostico } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  useAuth()

  const [muni, setMuni] = useState({ nombre: '' })
  const [secciones, setSecciones] = useState([])
  const [preguntas, setPreguntas] = useState([])
  const [activeSectionId, setActiveSectionId] = useState(null)
  const [respuestas, setRespuestas] = useState({})
  const [estado, setEstado] = useState('borrador')
  const [saveStatus, setSaveStatus] = useState('idle')
  const [attemptedNavigation, setAttemptedNavigation] = useState(false)
  const [notification, setNotification] = useState(null)
  const [loadingSection, setLoadingSection] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  const saveTimeoutRef = useRef(null)

  const showToast = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // Carga inicial: municipio, secciones, preguntas, autodiagnostico y respuestas
  useEffect(() => {
    async function init() {
      setInitialLoading(true)

      // Municipio
      const { data: muniData } = await supabase
        .from('municipios')
        .select('id, nombre')
        .eq('id', id)
        .single()
      if (muniData) setMuni(muniData)

      // Secciones y preguntas
      const [{ data: secsData }, { data: pregsData }] = await Promise.all([
        supabase.from('secciones').select('*').order('orden'),
        supabase.from('preguntas').select('*, opciones_pregunta(*)').eq('activa', true).order('orden'),
      ])
      const secsArr = secsData ?? []
      const pregsArr = pregsData ?? []
      setSecciones(secsArr)
      setPreguntas(pregsArr)

      // Sección inicial
      const initialSec = location.state?.initialSectionId
        ? Number(location.state.initialSectionId)
        : secsArr.find(s => pregsArr.some(p => p.id_seccion === s.id))?.id ?? null
      setActiveSectionId(initialSec)

      // Autodiagnóstico y respuestas
      const { data: autodiag } = await supabase
        .from('autodiagnosticos')
        .select('id, estado')
        .eq('id', idAutodiagnostico)
        .single()
      if (autodiag) setEstado(autodiag.estado)

      // Respuestas existentes
      const { data: respsData } = await supabase
        .from('respuestas')
        .select('*')
        .eq('id_autodiagnostico', idAutodiagnostico)

      const respsMap = {}
      ;(respsData ?? []).forEach(r => {
        respsMap[r.id_pregunta] = r
      })
      setRespuestas(respsMap)

      setInitialLoading(false)
    }
    init()
  }, [id, idAutodiagnostico, location.state])

  // Helper to check if a specific question is answered
  const isQuestionAnswered = (q, ans) => {
    if (!ans) return false
    
    if (q.tipo === 'texto') {
      return typeof ans.valor_texto === 'string' && ans.valor_texto.trim() !== ''
    }
    if (q.tipo === 'numero') {
      return ans.valor_numerico !== undefined && ans.valor_numerico !== null && ans.valor_numerico !== ''
    }
    if (q.tipo === 'boolean') {
      return typeof ans.valor_texto === 'string' && ans.valor_texto.trim() !== ''
    }
    if (q.tipo === 'opcion') {
      return typeof ans.valor_texto === 'string' && ans.valor_texto.trim() !== ''
    }
    if (q.tipo === 'array') {
      return Array.isArray(ans.valor_array) && ans.valor_array.length > 0
    }
    return false
  }

  // Helper to validate single question requirement
  const isQuestionValid = (q, ans) => {
    if (!q.requerida) return true
    return isQuestionAnswered(q, ans)
  }

  const getSectionState = (sectionId) => {
    const secQuestions = preguntas.filter(p => p.id_seccion === sectionId)
    if (secQuestions.length === 0) return 'no_disponible'
    const hasAnswers = secQuestions.some(q => isQuestionAnswered(q, respuestas[q.id]))
    if (hasAnswers) return 'completa'
    return 'sin_empezar'
  }

  // Guarda una respuesta individual en Supabase (upsert por id_autodiagnostico + id_pregunta)
  const saveRespuesta = async (idPregunta, respuesta) => {
    const payload = {
      id_autodiagnostico: Number(idAutodiagnostico),
      id_pregunta: idPregunta,
      valor_texto: respuesta.valor_texto ?? null,
      valor_numerico: respuesta.valor_numerico ?? null,
      valor_array: respuesta.valor_array ?? null,
    }
    // Si ya tiene id, actualizamos; si no, insertamos
    if (respuesta.id) {
      await supabase.from('respuestas').update(payload).eq('id', respuesta.id)
    } else {
      const { data } = await supabase.from('respuestas').insert(payload).select().single()
      return data // devuelve la fila con id para actualizar el estado local
    }
    return null
  }

  const triggerAutoSave = (currentAnswers, idPregunta, respuesta) => {
    setSaveStatus('saving')
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const newRow = await saveRespuesta(idPregunta, respuesta)
        // Si era insert nuevo, guardamos el id para futuros updates
        if (newRow?.id) {
          setRespuestas(prev => ({
            ...prev,
            [idPregunta]: { ...prev[idPregunta], id: newRow.id }
          }))
        }
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 1500)
      } catch {
        setSaveStatus('error')
      }
    }, 1500)
  }

  const handleAnswerChange = (idPregunta, campo, valor) => {
    setRespuestas(prev => {
      const existing = prev[idPregunta] || { id_pregunta: idPregunta }
      const updated = { ...existing, [campo]: valor }
      triggerAutoSave({ ...prev, [idPregunta]: updated }, idPregunta, updated)
      return { ...prev, [idPregunta]: updated }
    })
  }

  const getNextAvailableSection = (currentId, direction) => {
    const sorted = secciones.map(s => s.id).sort((a, b) => a - b)
    const idx = sorted.indexOf(currentId)
    let i = idx + direction
    while (i >= 0 && i < sorted.length) {
      const sid = sorted[i]
      if (preguntas.some(p => p.id_seccion === sid)) return sid
      i += direction
    }
    return null
  }

  const handleSectionChange = async (targetSectionId) => {
    if (targetSectionId === activeSectionId) return

    const currentQuestions = preguntas.filter(p => p.id_seccion === activeSectionId)
    const hasMissing = currentQuestions.some(q => !isQuestionValid(q, respuestas[q.id]))

    if (hasMissing) {
      setAttemptedNavigation(true)
      showToast("Por favor complete todas las preguntas requeridas de la sección actual.", "error")
      const firstInvalid = currentQuestions.find(q => !isQuestionValid(q, respuestas[q.id]))
      if (firstInvalid) {
        const el = document.getElementById(`preg-card-${firstInvalid.id}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return
    }

    // Cancelar debounce pendiente y guardar todo ahora
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    setSaveStatus('saving')
    try {
      const updates = await Promise.all(
        currentQuestions.map(async (q) => {
          const respuesta = respuestas[q.id]
          if (!respuesta) return null
          const newRow = await saveRespuesta(q.id, respuesta)
          return newRow ? { idPregunta: q.id, id: newRow.id } : null
        })
      )
      // Actualizar ids de filas nuevas insertadas
      const newIds = updates.filter(Boolean)
      if (newIds.length > 0) {
        setRespuestas(prev => {
          const next = { ...prev }
          newIds.forEach(({ idPregunta, id }) => {
            next[idPregunta] = { ...next[idPregunta], id }
          })
          return next
        })
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(prev => prev === 'saved' ? 'idle' : prev), 1500)
    } catch {
      setSaveStatus('error')
    }

    setAttemptedNavigation(false)
    setLoadingSection(true)
    setTimeout(() => {
      setActiveSectionId(targetSectionId)
      setLoadingSection(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }, 250)
  }

  const handleMarkComplete = async () => {
    const sectionsWithErrors = []
    secciones.forEach(sec => {
      const secQuestions = preguntas.filter(p => p.id_seccion === sec.id)
      if (secQuestions.length === 0) return
      if (secQuestions.some(q => !isQuestionValid(q, respuestas[q.id]))) {
        sectionsWithErrors.push(sec.id)
      }
    })

    if (sectionsWithErrors.length > 0) {
      setAttemptedNavigation(true)
      setActiveSectionId(sectionsWithErrors[0])
      showToast("Hay preguntas requeridas pendientes.", "error")
      return
    }

    await supabase
      .from('autodiagnosticos')
      .update({ estado: 'completo' })
      .eq('id', idAutodiagnostico)

    setEstado('completo')
    showToast("¡Autodiagnóstico marcado como COMPLETADO con éxito!", "success")
    setTimeout(() => navigate(`/municipio/${id}`), 2000)
  }

  // Back button prompt
  const handleBackToDashboard = () => {
    if (saveStatus === 'saving') {
      if (!window.confirm("Hay cambios guardándose en segundo plano. ¿Está seguro que desea salir?")) {
        return
      }
    }
    navigate(`/municipio/${id}`)
  }

  const answeredCount = preguntas.filter(q => isQuestionAnswered(q, respuestas[q.id])).length
  const progressPercent = preguntas.length > 0 ? (answeredCount / preguntas.length) * 100 : 0

  const prevActiveSecId = activeSectionId ? getNextAvailableSection(activeSectionId, -1) : null
  const nextActiveSecId = activeSectionId ? getNextAvailableSection(activeSectionId, 1) : null

  const activeSectionInfo = secciones.find(s => s.id === activeSectionId) || {}
  const currentSectionQuestions = preguntas.filter(p => p.id_seccion === activeSectionId)

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-primary text-[48px]">sync</span>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-low text-on-surface min-h-screen flex flex-col font-body-md selection:bg-primary-fixed">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-sm px-lg py-md rounded-xl shadow-custom-md border transition-all animate-bounce ${
          notification.type === 'error' 
            ? 'bg-error-container text-on-error-container border-error/20' 
            : 'bg-secondary-container text-on-secondary-container border-secondary/20'
        }`}>
          <span className="material-symbols-outlined">
            {notification.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="font-label-md text-label-md font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header Anchor */}
      <header className="fixed top-0 left-0 w-full z-45 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface shadow-custom-sm border-b border-outline-variant">
        <div className="flex items-center gap-sm">
          <button 
            onClick={handleBackToDashboard}
            className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors bg-transparent border-none cursor-pointer"
            title="Volver al dashboard"
          >
            arrow_back
          </button>
          <div className="flex flex-col">
            <span className="font-headline-md text-[16px] md:text-headline-md font-bold text-primary truncate max-w-[180px] md:max-w-xs">
              {muni.nombre}
            </span>
            <span className="text-[10px] text-outline font-semibold leading-none mt-0.5">
              Autodiagnóstico Técnico 2026
            </span>
          </div>
        </div>

        {/* Save status & Finish action */}
        <div className="flex items-center gap-md">
          <div className="hidden sm:block">
            <SaveIndicator status={saveStatus} />
          </div>

          {estado === 'completo' ? (
            <span className="bg-[#d1fae5] text-[#065f46] text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full flex items-center gap-xs border border-[#a7f3d0]">
              <span className="material-symbols-outlined text-[16px]">verified</span>
              Completo
            </span>
          ) : (
            <button
              onClick={handleMarkComplete}
              className="bg-primary text-on-primary font-bold px-4 md:px-5 h-10 rounded-xl flex items-center gap-2 hover:bg-primary-container hover:text-primary transition-all active:scale-95 border-none cursor-pointer shadow-sm text-xs md:text-label-md"
            >
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span className="hidden md:inline">Marcar como completo</span>
              <span className="md:hidden">Completar</span>
            </button>
          )}
        </div>
      </header>

      {/* Mobile Stepper Header (Horizontal Scroller) */}
      <div className="md:hidden flex overflow-x-auto whitespace-nowrap bg-surface border-b border-outline-variant/30 py-3 px-4 gap-4 scrollbar-none sticky top-16 z-30 shadow-sm">
        {secciones.map((sec) => {
          const secState = getSectionState(sec.id)
          const isSelected = activeSectionId === sec.id
          
          let btnClass = ""
          let dotClass = ""
          let labelClass = ""
          
          if (secState === 'no_disponible') {
            btnClass = "opacity-40 cursor-not-allowed"
            dotClass = "bg-surface-container text-on-surface-variant/40 border border-outline-variant/30"
            labelClass = "text-on-surface-variant/40 font-medium"
          } else if (isSelected) {
            btnClass = "scale-102 font-bold"
            dotClass = "bg-primary text-on-primary ring-4 ring-primary/20"
            labelClass = "text-primary font-bold"
          } else if (secState === 'completa') {
            btnClass = ""
            dotClass = "bg-green-100 text-green-800 border border-green-200"
            labelClass = "text-on-surface font-semibold"
          } else {
            btnClass = ""
            dotClass = "bg-surface-container text-on-surface-variant border border-outline-variant/30"
            labelClass = "text-on-surface-variant font-medium"
          }

          return (
            <button
              key={sec.id}
              type="button"
              disabled={secState === 'no_disponible'}
              onClick={() => handleSectionChange(sec.id)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border-none bg-transparent select-none cursor-pointer shrink-0 transition-all ${btnClass}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs ${dotClass}`}>
                {secState === 'completa' ? (
                  <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                ) : (
                  sec.orden
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className={`text-xs ${labelClass}`}>{sec.nombre}</span>
                {secState === 'no_disponible' && (
                  <span className="text-[9px] text-error font-medium uppercase leading-none">Inactivo</span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Main Wrapper split screen */}
      <div className="flex flex-grow pt-16 md:pt-16">
        
        {/* Left Sidebar Wizard for Desktop */}
        <aside className="hidden md:flex flex-col w-72 bg-surface-container-low border-r border-outline-variant/30 shrink-0 sticky top-16 h-[calc(100vh-64px)] overflow-y-auto py-6 px-4 select-none">
          <div className="mb-4 px-4">
            <div className="flex justify-between text-xs font-bold text-outline mb-1 uppercase tracking-wider">
              <span>Progreso Global</span>
              <span>{Math.round(progressPercent)}%</span>
            </div>
            <ProgressBar pct={progressPercent} color="bg-primary" />
          </div>

          <div className="text-[11px] font-bold text-outline px-4 mb-4 uppercase tracking-wider">Secciones</div>
          
          <div className="flex flex-col gap-1.5 flex-grow">
            {secciones.map((sec) => {
              const secState = getSectionState(sec.id)
              const isSelected = activeSectionId === sec.id
              
              let btnClass = ""
              let iconElement = null
              
              if (secState === 'no_disponible') {
                btnClass = "opacity-45 cursor-not-allowed bg-transparent text-outline"
                iconElement = <span className="material-symbols-outlined text-[20px]">lock</span>
              } else if (isSelected) {
                btnClass = "bg-primary text-on-primary font-bold shadow-sm scale-101"
                iconElement = <span className="material-symbols-outlined text-[20px] text-on-primary" style={{ fontVariationSettings: "'FILL' 1" }}>{sec.icon || 'circle'}</span>
              } else if (secState === 'completa') {
                btnClass = "bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold"
                iconElement = <span className="material-symbols-outlined text-[20px] text-green-600 font-bold">check_circle</span>
              } else {
                btnClass = "bg-transparent text-on-surface-variant hover:bg-surface-container-high"
                iconElement = <span className="material-symbols-outlined text-[20px] text-outline">{sec.icon || 'circle'}</span>
              }

              return (
                <button
                  key={sec.id}
                  type="button"
                  disabled={secState === 'no_disponible'}
                  onClick={() => handleSectionChange(sec.id)}
                  className={`w-full flex items-center justify-between gap-md px-4 py-3.5 rounded-xl text-left border-none cursor-pointer transition-all ${btnClass}`}
                >
                  <div className="flex items-center gap-3 truncate">
                    {iconElement}
                    <div className="flex flex-col truncate">
                      <span className="font-label-md text-label-md truncate leading-normal">{sec.nombre}</span>
                      <span className="text-[9px] opacity-75 font-mono uppercase tracking-wide">
                        {secState === 'no_disponible' ? 'No disponible' : `Sección ${sec.orden}`}
                      </span>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="w-1.5 h-1.5 bg-on-primary rounded-full"></div>
                  )}
                </button>
              )
            })}
          </div>
        </aside>

        {/* Center Panel Container */}
        <div className="flex-grow flex flex-col min-h-full">
          
          {/* Main content frame */}
          <main className="flex-grow max-w-4xl mx-auto w-full p-4 md:p-8 space-y-6">
            
            {/* Save status header for mobile */}
            <div className="sm:hidden flex justify-between items-center bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/30 mb-2">
              <span className="text-xs font-bold text-outline uppercase tracking-wider">Auto-Guardado</span>
              <SaveIndicator status={saveStatus} />
            </div>

            {/* Section description */}
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/40 shadow-sm space-y-2">
              <div className="flex items-center gap-xs text-xs font-bold text-primary uppercase tracking-wider">
                <span className="material-symbols-outlined text-[16px]">{activeSectionInfo.icon}</span>
                <span>Sección {activeSectionInfo.orden} de 12</span>
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                {activeSectionInfo.nombre}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                Por favor complete los campos técnicos solicitados a continuación. Las preguntas marcadas con etiqueta roja son de carácter obligatorio.
              </p>
            </div>

            {/* Questions Container */}
            {loadingSection ? (
              <div className="py-20 flex flex-col items-center justify-center gap-md bg-surface-container-lowest rounded-2xl border border-outline-variant/30">
                <span className="material-symbols-outlined text-[48px] text-primary animate-spin">sync</span>
                <p className="font-label-md text-label-md text-on-surface-variant">Cargando sección...</p>
              </div>
            ) : (
              <SeccionFormulario
                idAutodiagnostico={Number(idAutodiagnostico)}
                idSeccion={activeSectionId}
                preguntas={currentSectionQuestions}
                respuestasExistentes={respuestas}
                onChange={handleAnswerChange}
                attemptedNavigation={attemptedNavigation}
              />
            )}
          </main>

          {/* Spacer footer to prevent cutoffs */}
          <div className="h-28"></div>

          {/* Footer Controls Navigation Bar */}
          <footer className="fixed bottom-0 right-0 w-full md:w-[calc(100%-288px)] bg-surface shadow-custom-lg border-t border-outline-variant p-4 flex items-center justify-between z-40">
            <button
              type="button"
              disabled={!prevActiveSecId}
              onClick={() => handleSectionChange(prevActiveSecId)}
              className="bg-surface-container-high text-on-surface-variant px-5 h-12 rounded-xl font-label-md text-label-md hover:bg-surface-container-highest transition-all flex items-center gap-2 cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Anterior
            </button>

            <span className="font-label-md text-label-md font-semibold text-outline">
              Sección {activeSectionInfo.orden} de 12
            </span>

            {nextActiveSecId ? (
              <button
                type="button"
                onClick={() => handleSectionChange(nextActiveSecId)}
                className="bg-primary text-on-primary px-5 h-12 rounded-xl font-label-md text-label-md hover:bg-primary-container transition-all flex items-center gap-2 cursor-pointer border-none shadow-sm active:scale-95"
              >
                Siguiente
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            ) : (
              estado === 'completo' ? (
                <button
                  type="button"
                  onClick={handleBackToDashboard}
                  className="bg-secondary text-on-secondary px-5 h-12 rounded-xl font-label-md text-label-md hover:opacity-90 transition-all flex items-center gap-2 cursor-pointer border-none shadow-sm active:scale-95"
                >
                  Regresar al Dashboard
                  <span className="material-symbols-outlined">dashboard</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleMarkComplete}
                  className="bg-primary text-on-primary px-5 h-12 rounded-xl font-label-md text-label-md hover:bg-primary-container transition-all flex items-center gap-2 cursor-pointer border-none shadow-sm active:scale-95 font-bold"
                >
                  Finalizar diagnóstico
                  <span className="material-symbols-outlined">check_circle</span>
                </button>
              )
            )}
          </footer>

        </div>
      </div>

    </div>
  )
}
