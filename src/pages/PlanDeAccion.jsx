import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PlanDeAccion({ 
  isDashboardTab = false, 
  idMunicipio: idMunicipioProp,
  triggerAddLine = 0,
  triggerAddAction = 0
}) {
  const { id: idUrl } = useParams()
  const navigate = useNavigate()
  const idMunicipio = idMunicipioProp || Number(idUrl) || 1

  // Estados de datos
  const [lines, setLines] = useState([])
  const [masterLines, setMasterLines] = useState([])
  const [actions, setActions] = useState([])
  const [goals, setGoals] = useState([])
  const [pivotLinks, setPivotLinks] = useState([])
  const [interventions, setInterventions] = useState([])
  const [loading, setLoading] = useState(true)

  // Estados de UI
  const [activeTab, setActiveTab] = useState('acciones') // 'acciones' | 'metas'
  const [expandedLines, setExpandedLines] = useState({})
  const [expandedActions, setExpandedActions] = useState({})
  const [toast, setToast] = useState(null)

  // Estados de Formularios / Modales
  const [lineModal, setLineModal] = useState({ open: false, data: null })
  const [actionModal, setActionModal] = useState({ open: false, data: null, lineId: null })
  const [metaModal, setMetaModal] = useState({ open: false, data: null })
  const [interventionModal, setInterventionModal] = useState({ open: false, actionId: null })

  // Utilidad para notificaciones
  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  // Carga de todos los datos necesarios
  const fetchAllData = useCallback(async () => {
    setLoading(true)
    try {
      // 1. Líneas temáticas del municipio
      const { data: linesData, error: linesErr } = await supabase
        .from('lineas_municipio')
        .select('id, idlinea, idmunicipio, objetivo_general, lista_lineas_tematicas(nombre)')
        .eq('idmunicipio', idMunicipio)

      if (linesErr) throw linesErr

      // 1b. Catálogo de líneas temáticas master
      const { data: masterLinesData, error: masterLinesErr } = await supabase
        .from('lista_lineas_tematicas')
        .select('*')
        .order('nombre')

      if (masterLinesErr) throw masterLinesErr

      // 2. Acciones del municipio
      const { data: actionsData, error: actionsErr } = await supabase
        .from('acciones')
        .select('*')
        .eq('idmunicipio', idMunicipio)

      if (actionsErr) throw actionsErr

      // 3. Metas del municipio
      const { data: goalsData, error: goalsErr } = await supabase
        .from('metas_linea')
        .select('*')
        .eq('idmunicipio', idMunicipio)

      if (goalsErr) throw goalsErr

      // 4. Pivot metas_acciones
      const { data: pivotData, error: pivotErr } = await supabase
        .from('metas_acciones')
        .select('*')

      if (pivotErr) throw pivotErr

      // 5. Intervenciones
      const { data: interventionsData, error: interventionsErr } = await supabase
        .from('intervenciones')
        .select('*')
        .eq('idmunicipio', idMunicipio)
        .order('fecha', { ascending: false })

      if (interventionsErr) throw interventionsErr

      setLines(linesData || [])
      setMasterLines(masterLinesData || [])
      setActions(actionsData || [])
      setGoals(goalsData || [])
      setPivotLinks(pivotData || [])
      setInterventions(interventionsData || [])
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al cargar los datos de la base de datos', 'error')
    } finally {
      setLoading(false)
    }
  }, [idMunicipio])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  // Triggers externos desde el Dashboard
  useEffect(() => {
    if (triggerAddLine > 0) {
      setLineModal({ open: true, data: null })
    }
  }, [triggerAddLine])

  useEffect(() => {
    if (triggerAddAction > 0) {
      if (lines.length > 0) {
        setActionModal({ open: true, data: null, lineId: lines[0].id })
      } else {
        showToast('Primero debe adoptar al menos una línea temática', 'error')
      }
    }
  }, [triggerAddAction, lines])

  // Manejo de Colapsables/Acordeones
  const toggleLine = (lineId) => {
    setExpandedLines(prev => ({ ...prev, [lineId]: !prev[lineId] }))
  }

  const toggleActionExpanded = (actionId) => {
    setExpandedActions(prev => ({ ...prev, [actionId]: !prev[actionId] }))
  }

  // --- CRUD LÍNEAS TEMÁTICAS ---
  const handleSaveLine = async (formData) => {
    try {
      if (!formData.idlinea) {
        showToast('Debe seleccionar una línea temática', 'error')
        return
      }

      const payload = {
        idmunicipio: Number(idMunicipio),
        idlinea: Number(formData.idlinea),
        objetivo_general: formData.objetivo_general
      }

      if (lineModal.data?.id) {
        // Update
        const { error } = await supabase
          .from('lineas_municipio')
          .update({ objetivo_general: formData.objetivo_general })
          .eq('id', lineModal.data.id)

        if (error) throw error
        showToast('Línea temática actualizada con éxito')
      } else {
        // Insert
        const { error } = await supabase
          .from('lineas_municipio')
          .insert([payload])

        if (error) throw error
        showToast('Línea temática adoptada con éxito')
      }

      setLineModal({ open: false, data: null })
      fetchAllData()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al guardar la línea temática', 'error')
    }
  }

  // --- CRUD ACCIONES ---
  const handleSaveAction = async (formData) => {
    try {
      if (!formData.nombre_iniciativa.trim()) {
        showToast('El nombre de la iniciativa es obligatorio', 'error')
        return
      }

      const payload = {
        idmunicipio: Number(idMunicipio),
        idlinea_municipio: actionModal.lineId,
        nombre_iniciativa: formData.nombre_iniciativa,
        descripcion: formData.descripcion,
        responsable: formData.responsable,
        poblacion_objetivo: formData.poblacion_objetivo,
        resultado_esperado: formData.resultado_esperado,
        estado: formData.estado,
        tipo: formData.tipo
      }

      if (actionModal.data?.id) {
        // Update
        const { error } = await supabase
          .from('acciones')
          .update(payload)
          .eq('id', actionModal.data.id)

        if (error) throw error
        showToast('Acción actualizada con éxito')
      } else {
        // Insert
        const { error } = await supabase
          .from('acciones')
          .insert([payload])

        if (error) throw error
        showToast('Acción creada con éxito')
      }

      setActionModal({ open: false, data: null, lineId: null })
      fetchAllData()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al guardar la acción', 'error')
    }
  }

  // --- CRUD INTERVENCIONES ---
  const handleSaveIntervention = async (formData) => {
    if (formData._uploadError) {
      showToast(`No se pudo subir el archivo: ${formData._uploadError}`, 'error')
      return
    }

    if (!formData.descripcion.trim()) {
      showToast('La descripción es obligatoria', 'error')
      return
    }

    try {
      const { error } = await supabase
        .from('intervenciones')
        .insert([{
          id_accion: interventionModal.actionId,
          idmunicipio: Number(idMunicipio),
          fecha: formData.fecha || new Date().toISOString().split('T')[0],
          descripcion: formData.descripcion,
          adjunto_url: formData.adjunto_url ?? null,
        }])

      if (error) throw error

      showToast('Intervención registrada correctamente')
      setInterventionModal({ open: false, actionId: null })
      fetchAllData()
    } catch (err) {
      showToast(err.message || 'Error al guardar la intervención', 'error')
    }
  }

  // --- CRUD METAS & PIVOT ---
  const handleSaveMeta = async (formData, selectedActionIds) => {
    try {
      if (!formData.meta.trim()) {
        showToast('El texto de la meta es obligatorio', 'error')
        return
      }
      if (!formData.id_linea_municipio) {
        showToast('Debe seleccionar una línea temática', 'error')
        return
      }

      const payload = {
        idmunicipio: Number(idMunicipio),
        id_linea_municipio: Number(formData.id_linea_municipio),
        meta: formData.meta,
        indicador: formData.indicador,
        indicador_base: Number(formData.indicador_base) || 0,
        indicador_objetivo: Number(formData.indicador_objetivo) || 0,
        indicador_valor: Number(formData.indicador_valor) || 0,
        fecha_inicio: formData.fecha_inicio || null,
        fecha_final: formData.fecha_final || null,
        estado: formData.estado
      }

      let metaId = metaModal.data?.id

      if (metaId) {
        // Update
        const { error } = await supabase
          .from('metas_linea')
          .update(payload)
          .eq('id', metaId)

        if (error) throw error

        // Sync pivot: Delete old links
        const { error: delErr } = await supabase
          .from('metas_acciones')
          .delete()
          .eq('id_meta', metaId)

        if (delErr) throw delErr
      } else {
        // Insert
        const { data: newMeta, error } = await supabase
          .from('metas_linea')
          .insert([payload])
          .select()

        if (error) throw error
        metaId = newMeta[0].id
      }

      // Insert new pivot links
      if (selectedActionIds.length > 0 && metaId) {
        const pivotPayload = selectedActionIds.map(actId => ({
          id_meta: metaId,
          id_accion: actId
        }))

        const { error: pivotErr } = await supabase
          .from('metas_acciones')
          .insert(pivotPayload)

        if (pivotErr) throw pivotErr
      }

      showToast(metaModal.data?.id ? 'Meta actualizada con éxito' : 'Meta creada con éxito')
      setMetaModal({ open: false, data: null })
      fetchAllData()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al guardar la meta', 'error')
    }
  }

  // --- ACTUALIZACIÓN RÁPIDA DE INDICADOR ---
  const handleUpdateIndicatorValue = async (metaId, newValue) => {
    try {
      const { error } = await supabase
        .from('metas_linea')
        .update({ indicador_valor: Number(newValue) })
        .eq('id', metaId)

      if (error) throw error
      showToast('Indicador actualizado correctamente')
      fetchAllData()
    } catch (err) {
      console.error(err)
      showToast(err.message || 'Error al actualizar indicador', 'error')
    }
  }

  // Colores para etiquetas de estado
  const getActionStatusBadge = (status) => {
    const states = {
      no_iniciada: { text: 'No Iniciada', css: 'bg-surface-container-high text-on-surface-variant' },
      en_ejecucion: { text: 'En Ejecución', css: 'bg-secondary-container text-on-secondary-container' },
      completada: { text: 'Completada', css: 'bg-[#d1fae5] text-[#065f46]' }
    }
    return states[status] || { text: status, css: 'bg-gray-100 text-gray-800' }
  }

  const getMetaStatusBadge = (status) => {
    const states = {
      no_iniciada: { text: 'No Iniciada', css: 'bg-surface-container-high text-on-surface-variant' },
      en_progreso: { text: 'En Progreso', css: 'bg-amber-100 text-amber-800' },
      alcanzada: { text: 'Alcanzada', css: 'bg-[#d1fae5] text-[#065f46]' },
      desviada: { text: 'Desviada', css: 'bg-error-container text-error' }
    }
    return states[status] || { text: status, css: 'bg-gray-100 text-gray-800' }
  }

  if (loading && lines.length === 0) {
    return (
      <div className={isDashboardTab ? "py-12 flex flex-col items-center justify-center gap-md" : "min-h-screen bg-surface flex flex-col items-center justify-center gap-md"}>
        <span className="material-symbols-outlined text-[48px] text-primary animate-spin">sync</span>
        <p className="font-label-md text-on-surface-variant">Cargando Plan de Acción...</p>
      </div>
    )
  }

  return (
    <div className={isDashboardTab ? "w-full text-on-surface" : "min-h-screen bg-background text-on-surface flex flex-col pb-xl"}>
      {/* Cabecera */}
      {!isDashboardTab && (
        <header className="bg-surface-container-low border-b border-outline-variant px-gutter py-md flex flex-col md:flex-row md:items-center justify-between gap-md">
          <div>
            <button 
              onClick={() => navigate(`/municipio/${idMunicipio}`)}
              className="flex items-center gap-1 text-label-md text-primary font-bold hover:underline mb-1 cursor-pointer bg-transparent border-none"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              Volver al Dashboard
            </button>
            <h1 className="font-headline-lg text-headline-lg font-bold">Plan de Acción Estratégico</h1>
            <p className="font-body-md text-on-surface-variant">Gestión de acciones, metas e intervenciones del municipio</p>
          </div>
        </header>
      )}

      {/* Tabs */}
      <div className={`flex border-b border-outline-variant ${isDashboardTab ? '' : 'bg-surface-container-low px-gutter'}`}>
        <button
          onClick={() => setActiveTab('acciones')}
          className={`px-8 py-4 font-headline-md text-headline-md flex items-center gap-2 border-none bg-transparent cursor-pointer transition-all ${
            activeTab === 'acciones' ? 'border-b-2 border-primary text-primary font-bold' : 'text-on-surface-variant font-medium'
          }`}
        >
          <span className="material-symbols-outlined">assignment</span>
          Acciones y Seguimiento
        </button>
        <button
          onClick={() => setActiveTab('metas')}
          className={`px-8 py-4 font-headline-md text-headline-md flex items-center gap-2 border-none bg-transparent cursor-pointer transition-all ${
            activeTab === 'metas' ? 'border-b-2 border-primary text-primary font-bold' : 'text-on-surface-variant font-medium'
          }`}
        >
          <span className="material-symbols-outlined">insights</span>
          Metas e Indicadores
        </button>
      </div>

      <main className={isDashboardTab ? "pt-md" : "px-gutter pt-lg flex-1 max-w-7xl w-full mx-auto"}>
        
        {/* ==================== TAB ACCIONES ==================== */}
        {activeTab === 'acciones' && (
          <div className="space-y-md">
            {lines.length === 0 ? (
              <div className="bg-surface-container rounded-2xl border border-outline-variant p-xl text-center flex flex-col items-center justify-center gap-md py-16 shadow-custom-sm">
                <span className="material-symbols-outlined text-[64px] text-outline">folder_off</span>
                <div className="space-y-1">
                  <h3 className="font-headline-md text-headline-md font-bold text-on-surface">No hay líneas temáticas adoptadas</h3>
                  <p className="font-body-md text-on-surface-variant max-w-md">
                    Para comenzar a elaborar el Plan de Acción, el municipio debe adoptar al menos una línea temática del catálogo de MUNA.
                  </p>
                </div>
                <button
                  onClick={() => setLineModal({ open: true, data: null })}
                  className="bg-primary text-on-primary font-bold px-6 py-3 rounded-full flex items-center gap-2 border-none cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm"
                >
                  <span className="material-symbols-outlined">add</span>
                  Adoptar Línea Temática
                </button>
              </div>
            ) : (
              lines.map((line) => {
                const lineActions = actions.filter(a => a.idlinea_municipio === line.id)
                const isOpen = !!expandedLines[line.id]
                
                return (
                  <div key={line.id} className="bg-surface-container rounded-2xl border border-outline-variant overflow-hidden shadow-custom-sm">
                    {/* Fila Cabecera de la Línea */}
                    <header 
                      onClick={() => toggleLine(line.id)}
                      className="flex items-center justify-between p-lg cursor-pointer hover:bg-surface-container-high transition-colors"
                    >
                      <div className="space-y-1 flex-1 pr-md">
                        <h2 className="font-headline-md text-headline-md font-bold text-primary flex items-center gap-2">
                          <span className="material-symbols-outlined">folder</span>
                          {line.lista_lineas_tematicas?.nombre || `Línea Temática ${line.idlinea}`}
                        </h2>
                        <p className="font-body-md text-on-surface-variant italic">
                          {line.objetivo_general || 'Sin objetivo general especificado.'}
                        </p>
                      </div>
                      <div className="flex items-center gap-md">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            setLineModal({ open: true, data: line })
                          }}
                          className="p-2 text-primary hover:bg-primary/5 rounded-full cursor-pointer bg-transparent border-none transition-colors"
                          title="Editar Objetivo General"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <span className="bg-surface-container-highest px-3 py-1 rounded-full font-label-md text-label-sm">
                          {lineActions.length} {lineActions.length === 1 ? 'acción' : 'acciones'}
                        </span>
                        <span className="material-symbols-outlined text-outline transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>
                          expand_more
                        </span>
                      </div>
                    </header>

                    {/* Contenido Expandible de la Línea */}
                    {isOpen && (
                      <div className="p-lg bg-surface-container-lowest border-t border-outline-variant space-y-md">
                        
                        {/* Botón de Alta de Acción */}
                        <div className="flex justify-end">
                          <button 
                            onClick={() => setActionModal({ open: true, data: null, lineId: line.id })}
                            className="bg-primary text-on-primary font-bold px-5 py-2.5 rounded-full flex items-center gap-2 border-none cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm"
                          >
                            <span className="material-symbols-outlined">add</span>
                            Agregar Iniciativa
                          </button>
                        </div>

                        {lineActions.length === 0 ? (
                          <p className="text-center py-6 text-on-surface-variant/70 font-body-md">
                            No hay iniciativas registradas en esta línea temática todavía.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 gap-md">
                            {lineActions.map((act) => {
                              const actInterventions = interventions.filter(i => i.id_accion === act.id)
                              const isActOpen = !!expandedActions[act.id]
                              const actBadge = getActionStatusBadge(act.estado)

                              return (
                                <div key={act.id} className="bg-surface-container rounded-xl border border-outline-variant p-md flex flex-col gap-md">
                                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-sm">
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <h3 className="font-headline-sm text-headline-sm font-bold">{act.nombre_iniciativa}</h3>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${act.tipo === 'existente' ? 'bg-indigo-100 text-indigo-800' : 'bg-amber-100 text-amber-800'}`}>
                                          {act.tipo === 'existente' ? 'Existente' : 'Planificada'}
                                        </span>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${actBadge.css}`}>
                                          {actBadge.text}
                                        </span>
                                      </div>
                                      <p className="font-body-md text-on-surface-variant">{act.descripcion || 'Sin descripción.'}</p>
                                    </div>
                                    
                                    <div className="flex items-center gap-xs shrink-0 self-end md:self-auto">
                                      <button 
                                        onClick={() => setActionModal({ open: true, data: act, lineId: line.id })}
                                        className="p-2 text-primary hover:bg-primary/5 rounded-full cursor-pointer bg-transparent border-none transition-colors"
                                        title="Editar Iniciativa"
                                      >
                                        <span className="material-symbols-outlined">edit</span>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-md bg-surface-container-low p-sm rounded-lg border border-outline-variant/30">
                                    <div>
                                      <span className="text-label-sm text-outline block uppercase tracking-wider">Responsable</span>
                                      <span className="font-label-md text-on-surface-variant font-bold">{act.responsable || 'No asignado'}</span>
                                    </div>
                                    <div>
                                      <span className="text-label-sm text-outline block uppercase tracking-wider">Población Objetivo</span>
                                      <span className="font-label-md text-on-surface-variant">{act.poblacion_objetivo || 'No especificada'}</span>
                                    </div>
                                    <div>
                                      <span className="text-label-sm text-outline block uppercase tracking-wider">Resultado Esperado</span>
                                      <span className="font-label-md text-on-surface-variant">{act.resultado_esperado || 'No especificado'}</span>
                                    </div>
                                  </div>

                                  {/* Desplegable de Intervenciones */}
                                  <div className="border-t border-outline-variant/40 pt-sm">
                                    <button
                                      onClick={() => toggleActionExpanded(act.id)}
                                      className="flex items-center gap-1.5 font-label-md text-primary font-bold hover:underline cursor-pointer bg-transparent border-none"
                                    >
                                      <span className="material-symbols-outlined transition-transform" style={{ transform: isActOpen ? 'rotate(90deg)' : 'none' }}>
                                        chevron_right
                                      </span>
                                      Seguimiento e Intervenciones ({actInterventions.length})
                                    </button>

                                    {isActOpen && (
                                      <div className="mt-md pl-md border-l border-outline space-y-md animate-fade-in">
                                        <div className="flex justify-end">
                                          <button 
                                            onClick={() => setInterventionModal({ open: true, actionId: act.id })}
                                            className="text-primary hover:bg-primary/5 border border-primary font-label-sm px-3.5 py-1.5 rounded-full flex items-center gap-1.5 cursor-pointer transition-all bg-transparent font-bold"
                                          >
                                            <span className="material-symbols-outlined text-[16px]">history_edu</span>
                                            Registrar Intervención
                                          </button>
                                        </div>

                                        {actInterventions.length === 0 ? (
                                          <p className="text-label-md text-on-surface-variant/70 italic py-2">
                                            No hay intervenciones registradas para esta acción.
                                          </p>
                                        ) : (
                                          <div className="space-y-sm">
                                            {actInterventions.map((int) => (
                                              <div key={int.id} className="bg-surface-container-low p-md rounded-xl border border-outline-variant/40">
                                                <div className="flex justify-between items-center mb-1">
                                                  <span className="font-label-sm text-outline flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                    {int.fecha}
                                                  </span>
                                                  {int.adjunto_url && (
                                                    <a 
                                                      href={int.adjunto_url} 
                                                      target="_blank" 
                                                      rel="noopener noreferrer"
                                                      className="text-primary hover:underline text-label-sm font-bold flex items-center gap-1"
                                                    >
                                                      <span className="material-symbols-outlined text-[16px]">attachment</span>
                                                      Ver Adjunto
                                                    </a>
                                                  )}
                                                </div>
                                                <p className="font-body-md text-on-surface">{int.descripcion}</p>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* ==================== TAB METAS ==================== */}
        {activeTab === 'metas' && (
          <div className="space-y-md">
            <div className="flex justify-between items-center mb-md">
              <h2 className="font-headline-md text-headline-md font-bold">Metas y KPIs del Municipio</h2>
              <button 
                onClick={() => setMetaModal({ open: true, data: null })}
                className="bg-primary text-on-primary font-bold px-6 py-3 rounded-full flex items-center gap-2 border-none cursor-pointer hover:opacity-90 active:scale-95 transition-all shadow-sm"
              >
                <span className="material-symbols-outlined">add</span>
                Establecer Nueva Meta
              </button>
            </div>

            {lines.map((line) => {
              const lineGoals = goals.filter(g => g.id_linea_municipio === line.id)
              if (lineGoals.length === 0) return null

              return (
                <div key={line.id} className="space-y-sm">
                  <h3 className="font-label-md text-outline uppercase tracking-widest pl-2">
                    {line.lista_lineas_tematicas?.nombre || `Línea Temática ${line.idlinea}`}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    {lineGoals.map((meta) => {
                      const metaBadge = getMetaStatusBadge(meta.estado)
                      const progressPercent = meta.indicador_objetivo && meta.indicador_objetivo !== meta.indicador_base
                        ? Math.min(100, Math.max(0, Math.round(((meta.indicador_valor - meta.indicador_base) / (meta.indicador_objetivo - meta.indicador_base)) * 100)))
                        : 0

                      // Buscar acciones vinculadas
                      const linkedActions = actions.filter(act => 
                        pivotLinks.some(link => link.id_meta === meta.id && link.id_accion === act.id)
                      )

                      return (
                        <div key={meta.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-lg shadow-custom-sm flex flex-col justify-between gap-md">
                          
                          <div className="space-y-sm">
                            <div className="flex justify-between items-start gap-md">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${metaBadge.css}`}>
                                {metaBadge.text}
                              </span>
                              <div className="flex items-center gap-xs">
                                <button 
                                  onClick={() => setMetaModal({ open: true, data: meta })}
                                  className="p-1.5 text-primary hover:bg-primary/5 rounded-full cursor-pointer bg-transparent border-none transition-colors"
                                  title="Editar Meta"
                                >
                                  <span className="material-symbols-outlined text-[20px]">edit</span>
                                </button>
                              </div>
                            </div>

                            <p className="font-headline-sm text-headline-sm font-bold text-on-surface">{meta.meta}</p>
                            
                            <div className="space-y-1.5">
                              <span className="text-label-sm text-outline uppercase tracking-wider block">Indicador</span>
                              <p className="font-body-md text-on-surface-variant font-medium">{meta.indicador || 'No especificado'}</p>
                            </div>
                          </div>

                          {/* Sección del KPI / Valor dinámico */}
                          <div className="bg-surface-container-low p-md rounded-xl space-y-sm border border-outline-variant/30">
                            <div className="flex items-center justify-between text-label-md">
                              <span className="text-on-surface-variant">Progreso</span>
                              <span className="font-bold text-primary">{progressPercent}%</span>
                            </div>

                            {/* Barra de progreso */}
                            <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                              <div className="bg-primary h-2 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                            </div>

                            {/* Inputs rápidos para actualización en línea */}
                            <div className="grid grid-cols-3 gap-sm items-center pt-xs border-t border-outline-variant/30">
                              <div className="text-center">
                                <span className="text-[10px] text-outline uppercase block">Base</span>
                                <span className="font-label-md font-bold">{meta.indicador_base}</span>
                              </div>
                              
                              <div className="text-center">
                                <span className="text-[10px] text-outline uppercase block">Actual</span>
                                <input 
                                  type="number"
                                  value={meta.indicador_valor}
                                  onChange={(e) => handleUpdateIndicatorValue(meta.id, e.target.value)}
                                  className="w-full text-center bg-surface-container-lowest border border-outline-variant rounded-md font-label-md font-bold text-primary py-0.5 max-w-[60px] mx-auto focus:outline-primary"
                                />
                              </div>

                              <div className="text-center">
                                <span className="text-[10px] text-outline uppercase block">Objetivo</span>
                                <span className="font-label-md font-bold">{meta.indicador_objetivo}</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-sm border-t border-outline-variant/40 pt-md">
                            {/* Fechas */}
                            <div className="flex gap-md text-label-md text-outline">
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">event</span>
                                Inicio: {meta.fecha_inicio || '-'}
                              </span>
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[16px]">event_busy</span>
                                Fin: {meta.fecha_final || '-'}
                              </span>
                            </div>

                            {/* Acciones Vinculadas */}
                            <div>
                              <span className="text-label-sm text-outline uppercase tracking-wider block mb-1">Iniciativas Vinculadas</span>
                              {linkedActions.length === 0 ? (
                                <span className="text-label-md text-on-surface-variant/60 italic">Sin iniciativas vinculadas</span>
                              ) : (
                                <div className="flex flex-wrap gap-xs">
                                  {linkedActions.map(act => (
                                    <span key={act.id} className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-medium border border-primary/15">
                                      {act.nombre_iniciativa}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>

      {/* ==================== MODAL LÍNEA TEMÁTICA ==================== */}
      {lineModal.open && (
        <LineFormModal 
          isOpen={lineModal.open}
          data={lineModal.data}
          masterLines={masterLines}
          adoptedLines={lines}
          onClose={() => setLineModal({ open: false, data: null })}
          onSave={handleSaveLine}
        />
      )}

      {/* ==================== MODAL ACCION ==================== */}
      {actionModal.open && (
        <ActionFormModal 
          isOpen={actionModal.open}
          data={actionModal.data}
          onClose={() => setActionModal({ open: false, data: null, lineId: null })}
          onSave={handleSaveAction}
        />
      )}

      {/* ==================== MODAL INTERVENCION ==================== */}
      {interventionModal.open && (
        <InterventionFormModal 
          isOpen={interventionModal.open}
          onClose={() => setInterventionModal({ open: false, actionId: null })}
          onSave={handleSaveIntervention}
        />
      )}

      {/* ==================== MODAL META ==================== */}
      {metaModal.open && (
        <MetaFormModal 
          isOpen={metaModal.open}
          data={metaModal.data}
          lines={lines}
          actions={actions}
          pivotLinks={pivotLinks}
          onClose={() => setMetaModal({ open: false, data: null })}
          onSave={handleSaveMeta}
        />
      )}

      {/* ==================== TOAST NOTIFICATION ==================== */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-6 py-3 rounded-xl shadow-lg border flex items-center gap-2 animate-fade-in ${
          toast.type === 'error' 
            ? 'bg-error-container text-error border-error/20' 
            : 'bg-secondary-container text-on-secondary-container border-secondary/20'
        }`}>
          <span className="material-symbols-outlined">
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="font-label-md">{toast.message}</span>
        </div>
      )}
    </div>
  )
}

// ==================== SUB-COMPONENTES MODAL INLINE (SIN FORM) ====================

function ActionFormModal({ isOpen, data, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nombre_iniciativa: '',
    descripcion: '',
    responsable: '',
    poblacion_objetivo: '',
    resultado_esperado: '',
    estado: 'no_iniciada',
    tipo: 'planificada'
  })

  useEffect(() => {
    if (data) {
      setFormData({
        nombre_iniciativa: data.nombre_iniciativa || '',
        descripcion: data.descripcion || '',
        responsable: data.responsable || '',
        poblacion_objetivo: data.poblacion_objetivo || '',
        resultado_esperado: data.resultado_esperado || '',
        estado: data.estado || 'no_iniciada',
        tipo: data.tipo || 'planificada'
      })
    }
  }, [data])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl p-lg shadow-custom-lg border border-outline-variant space-y-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="font-headline-md text-headline-md font-bold text-primary">
            {data ? 'Editar Iniciativa' : 'Nueva Iniciativa'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full cursor-pointer bg-transparent border-none">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {/* Nombre */}
          <div className="md:col-span-2 space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Nombre de la Iniciativa *</label>
            <input 
              type="text"
              value={formData.nombre_iniciativa}
              onChange={(e) => setFormData({ ...formData, nombre_iniciativa: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
              placeholder="Ej. Jóvenes al Consejo"
            />
          </div>

          {/* Descripción */}
          <div className="md:col-span-2 space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Descripción</label>
            <textarea 
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md min-h-[80px]"
              placeholder="Descripción breve de la acción y su impacto esperado..."
            />
          </div>

          {/* Responsable */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Responsable / Area</label>
            <input 
              type="text"
              value={formData.responsable}
              onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
              placeholder="Ej. Secretaria de Niñez"
            />
          </div>

          {/* Población Objetivo */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Población Objetivo</label>
            <input 
              type="text"
              value={formData.poblacion_objetivo}
              onChange={(e) => setFormData({ ...formData, poblacion_objetivo: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
              placeholder="Ej. Adolescentes 13-17 años"
            />
          </div>

          {/* Resultado Esperado */}
          <div className="md:col-span-2 space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Resultado Esperado</label>
            <input 
              type="text"
              value={formData.resultado_esperado}
              onChange={(e) => setFormData({ ...formData, resultado_esperado: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
              placeholder="Ej. Aprobación de 5 ordenanzas juveniles al año"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Tipo de Acción</label>
            <select
              value={formData.tipo}
              onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
            >
              <option value="existente">Existente</option>
              <option value="planificada">Planificada</option>
            </select>
          </div>

          {/* Estado */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Estado de Avance</label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
            >
              <option value="no_iniciada">No Iniciada</option>
              <option value="en_ejecucion">En Ejecución</option>
              <option value="completada">Completada</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 font-label-md text-outline hover:bg-surface-container rounded-full cursor-pointer bg-transparent border-none"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave(formData)} 
            className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-full cursor-pointer hover:opacity-90 active:scale-95 transition-all border-none"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function InterventionFormModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
  })
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)

  const handleSave = async () => {
    setUploading(true)
    let adjunto_url = null

    if (file) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}.${ext}`
      const { data: uploaded, error: uploadErr } = await supabase.storage
        .from('intervenciones')
        .upload(path, file, { upsert: false })

      if (uploadErr) {
        setUploading(false)
        // propagar el error al handler del padre via onSave con flag de error
        onSave({ ...formData, adjunto_url: null, _uploadError: uploadErr.message })
        return
      }

      const { data: urlData } = supabase.storage
        .from('intervenciones')
        .getPublicUrl(uploaded.path)
      adjunto_url = urlData.publicUrl
    }

    setUploading(false)
    onSave({ ...formData, adjunto_url })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest w-[500px] max-w-full rounded-3xl p-lg shadow-custom-lg border border-outline-variant space-y-lg">
        <div className="flex justify-between items-center">
          <h2 className="font-headline-md text-headline-md font-bold text-primary">Registrar Seguimiento / Intervención</h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full cursor-pointer bg-transparent border-none">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-md">
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Fecha de la Intervención</label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
            />
          </div>

          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Descripción de la actividad o avance *</label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md min-h-[100px]"
              placeholder="¿Qué se realizó? Detallar hitos, reuniones o entregables..."
            />
          </div>

          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Adjunto (Opcional)</label>
            <label className={`flex items-center gap-3 w-full px-md py-sm border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
              file ? 'border-primary bg-primary/5' : 'border-outline-variant hover:border-outline bg-surface'
            }`}>
              <span className="material-symbols-outlined text-outline">upload_file</span>
              <span className="font-body-md text-on-surface-variant truncate">
                {file ? file.name : 'Seleccionar archivo (PDF, imagen, Word)'}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={(e) => setFile(e.target.files[0] ?? null)}
              />
            </label>
            {file && (
              <button
                onClick={() => setFile(null)}
                className="text-xs text-error flex items-center gap-1 bg-transparent border-none cursor-pointer mt-1"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
                Quitar archivo
              </button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-6 py-2.5 font-label-md text-outline hover:bg-surface-container rounded-full cursor-pointer bg-transparent border-none disabled:opacity-40"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={uploading}
            className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-full cursor-pointer hover:opacity-90 active:scale-95 transition-all border-none flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {uploading && <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>}
            {uploading ? 'Subiendo...' : 'Registrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function MetaFormModal({ isOpen, data, lines, actions, pivotLinks, onClose, onSave }) {
  const [formData, setFormData] = useState({
    id_linea_municipio: '',
    meta: '',
    indicador: '',
    indicador_base: 0,
    indicador_objetivo: 100,
    indicador_valor: 0,
    fecha_inicio: '',
    fecha_final: '',
    estado: 'no_iniciada'
  })

  // Acciones asociables correspondientes a la línea seleccionada
  const [availableActions, setAvailableActions] = useState([])
  const [selectedActionIds, setSelectedActionIds] = useState([])

  useEffect(() => {
    if (data) {
      setFormData({
        id_linea_municipio: data.id_linea_municipio || '',
        meta: data.meta || '',
        indicador: data.indicador || '',
        indicador_base: data.indicador_base || 0,
        indicador_objetivo: data.indicador_objetivo || 0,
        indicador_valor: data.indicador_valor || 0,
        fecha_inicio: data.fecha_inicio || '',
        fecha_final: data.fecha_final || '',
        estado: data.estado || 'no_iniciada'
      })

      // Cargar acciones vinculadas en el pivot
      const linked = pivotLinks.filter(p => p.id_meta === data.id).map(p => p.id_accion)
      setSelectedActionIds(linked)
    } else if (lines.length > 0) {
      setFormData(prev => ({ ...prev, id_linea_municipio: lines[0].id.toString() }))
    }
  }, [data, lines, pivotLinks])

  // Filtrar acciones cuando cambia la línea seleccionada
  useEffect(() => {
    const selLineId = Number(formData.id_linea_municipio)
    if (selLineId) {
      const filtered = actions.filter(act => act.idlinea_municipio === selLineId)
      setAvailableActions(filtered)
      
      // Limpiar seleccionadas que ya no aplican a la nueva línea (solo en creación)
      if (!data) {
        setSelectedActionIds([])
      }
    }
  }, [formData.id_linea_municipio, actions, data])

  const handleToggleAction = (actionId) => {
    setSelectedActionIds(prev => 
      prev.includes(actionId) 
        ? prev.filter(id => id !== actionId) 
        : [...prev, actionId]
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest w-full max-w-2xl rounded-3xl p-lg shadow-custom-lg border border-outline-variant space-y-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center">
          <h2 className="font-headline-md text-headline-md font-bold text-primary">
            {data ? 'Editar Meta' : 'Establecer Nueva Meta'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full cursor-pointer bg-transparent border-none">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {/* Línea Temática */}
          <div className="md:col-span-2 space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Línea Temática *</label>
            <select
              value={formData.id_linea_municipio}
              onChange={(e) => setFormData({ ...formData, id_linea_municipio: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
              disabled={!!data} // Bloquear cambio de línea en edición para preservar integridad de datos
            >
              <option value="">Seleccione una línea...</option>
              {lines.map(l => (
                <option key={l.id} value={l.id}>
                  {l.lista_lineas_tematicas?.nombre || `Línea Temática ${l.idlinea}`}
                </option>
              ))}
            </select>
          </div>

          {/* Texto de la Meta */}
          <div className="md:col-span-2 space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Meta / Objetivo Específico *</label>
            <textarea 
              value={formData.meta}
              onChange={(e) => setFormData({ ...formData, meta: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md min-h-[60px]"
              placeholder="Ej. Lograr cobertura de vacunación infantil del 95%"
            />
          </div>

          {/* Indicador */}
          <div className="md:col-span-2 space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Nombre del Indicador (Métrica de Medición)</label>
            <input 
              type="text"
              value={formData.indicador}
              onChange={(e) => setFormData({ ...formData, indicador: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
              placeholder="Ej. Porcentaje de niños con esquema completo de vacunación"
            />
          </div>

          {/* Indicador Base */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Valor Base</label>
            <input 
              type="number"
              value={formData.indicador_base}
              onChange={(e) => setFormData({ ...formData, indicador_base: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
            />
          </div>

          {/* Indicador Objetivo */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Valor Objetivo (Meta)</label>
            <input 
              type="number"
              value={formData.indicador_objetivo}
              onChange={(e) => setFormData({ ...formData, indicador_objetivo: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
            />
          </div>

          {/* Indicador Valor Actual */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Valor Actual</label>
            <input 
              type="number"
              value={formData.indicador_valor}
              onChange={(e) => setFormData({ ...formData, indicador_valor: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
            />
          </div>

          {/* Estado */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Estado de la Meta</label>
            <select
              value={formData.estado}
              onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
            >
              <option value="no_iniciada">No Iniciada</option>
              <option value="en_progreso">En Progreso</option>
              <option value="alcanzada">Alcanzada</option>
              <option value="desviada">Desviada</option>
            </select>
          </div>

          {/* Fecha Inicio */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Fecha de Inicio</label>
            <input 
              type="date"
              value={formData.fecha_inicio}
              onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
            />
          </div>

          {/* Fecha Final */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium">Fecha de Finalización</label>
            <input 
              type="date"
              value={formData.fecha_final}
              onChange={(e) => setFormData({ ...formData, fecha_final: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
            />
          </div>

          {/* Selección Múltiple de Acciones de la misma Línea */}
          <div className="md:col-span-2 space-y-2 pt-sm">
            <label className="font-label-md text-on-surface-variant font-bold block">Vincular Iniciativas Asocidas</label>
            
            {availableActions.length === 0 ? (
              <p className="text-label-md text-on-surface-variant/70 italic bg-surface p-sm rounded-xl border border-outline-variant/30">
                Primero cree iniciativas/acciones dentro de esta línea temática para poder vincularlas.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm max-h-[150px] overflow-y-auto bg-surface p-sm rounded-xl border border-outline-variant">
                {availableActions.map(act => {
                  const isChecked = selectedActionIds.includes(act.id)
                  return (
                    <div 
                      key={act.id} 
                      onClick={() => handleToggleAction(act.id)}
                      className={`flex items-center gap-sm px-md py-sm rounded-lg border cursor-pointer select-none transition-all ${
                        isChecked 
                          ? 'bg-primary/10 border-primary text-primary font-bold' 
                          : 'border-outline-variant text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isChecked ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      <span className="font-label-md truncate">{act.nombre_iniciativa}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 font-label-md text-outline hover:bg-surface-container rounded-full cursor-pointer bg-transparent border-none"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave(formData, selectedActionIds)} 
            className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-full cursor-pointer hover:opacity-90 active:scale-95 transition-all border-none"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function LineFormModal({ isOpen, data, masterLines, adoptedLines, onClose, onSave }) {
  const [formData, setFormData] = useState({
    idlinea: '',
    objetivo_general: ''
  })

  useEffect(() => {
    if (data) {
      setFormData({
        idlinea: data.idlinea?.toString() || '',
        objetivo_general: data.objetivo_general || ''
      })
    } else {
      // Filtrar líneas maestras no adoptadas aún
      const available = masterLines.filter(ml => !adoptedLines.some(al => al.idlinea === ml.id))
      setFormData({
        idlinea: available[0]?.id?.toString() || '',
        objetivo_general: ''
      })
    }
  }, [data, masterLines, adoptedLines, isOpen])

  // Filtrar para el selector las que no han sido adoptadas
  const availableLines = data 
    ? masterLines // En edición mostramos todas (o la seleccionada)
    : masterLines.filter(ml => !adoptedLines.some(al => al.idlinea === ml.id))

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md bg-black/40 backdrop-blur-sm">
      <div className="bg-surface-container-lowest w-[500px] max-w-full rounded-3xl p-lg shadow-custom-lg border border-outline-variant space-y-lg">
        <div className="flex justify-between items-center">
          <h2 className="font-headline-md text-headline-md font-bold text-primary">
            {data ? 'Editar Línea Temática' : 'Adoptar Línea Temática'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-surface-container-high rounded-full cursor-pointer bg-transparent border-none">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="space-y-md">
          {/* Selector de Línea Temática */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium font-bold block mb-1">Línea Temática *</label>
            {data ? (
              <input
                type="text"
                value={data.lista_lineas_tematicas?.nombre || `Línea Temática ${data.idlinea}`}
                disabled
                className="w-full bg-surface-container border border-outline rounded-xl px-md py-sm font-body-md text-on-surface-variant"
              />
            ) : (
              <select
                value={formData.idlinea}
                onChange={(e) => setFormData({ ...formData, idlinea: e.target.value })}
                className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md"
              >
                {availableLines.length === 0 && <option value="">No hay líneas disponibles para adoptar</option>}
                {availableLines.map(ml => (
                  <option key={ml.id} value={ml.id}>{ml.nombre}</option>
                ))}
              </select>
            )}
          </div>

          {/* Objetivo General */}
          <div className="space-y-1">
            <label className="font-label-md text-on-surface-variant font-medium font-bold block mb-1">Objetivo General</label>
            <textarea
              value={formData.objetivo_general}
              onChange={(e) => setFormData({ ...formData, objetivo_general: e.target.value })}
              className="w-full bg-surface border border-outline rounded-xl px-md py-sm focus:outline-primary font-body-md min-h-[120px]"
              placeholder="Ej. Fortalecer el acceso y la calidad de la salud para la primera infancia..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-sm pt-md border-t border-outline-variant">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 font-label-md text-outline hover:bg-surface-container rounded-full cursor-pointer bg-transparent border-none"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave(formData)} 
            className="bg-primary text-on-primary font-bold px-6 py-2.5 rounded-full cursor-pointer hover:opacity-90 active:scale-95 transition-all border-none"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
