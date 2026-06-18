import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function PlanDeAccionResumen() {
  const { id } = useParams()
  const navigate = useNavigate()

  // States
  const [lines, setLines] = useState([])
  const [municipioNombre, setMunicipioNombre] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedActions, setExpandedActions] = useState(new Set())

  const toggleAction = (actionId) => {
    setExpandedActions(prev => {
      const next = new Set(prev)
      if (next.has(actionId)) {
        next.delete(actionId)
      } else {
        next.add(actionId)
      }
      return next
    })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const cleanDate = dateStr.split('T')[0]
    const parts = cleanDate.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  }

  const getCurrentDate = () => {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: muniData, error: muniErr } = await supabase
        .from('municipios')
        .select('nombre')
        .eq('id', id)
        .maybeSingle()

      if (muniErr) throw muniErr
      setMunicipioNombre(muniData?.nombre || 'Municipio')

      const { data: linesData, error: linesErr } = await supabase
        .from('lineas_municipio')
        .select(`
          id, objetivo_general,
          lista_lineas_tematicas(id, nombre),
          metas_linea(
            id, meta, indicador, indicador_base, indicador_objetivo, indicador_valor,
            estado, fecha_inicio, fecha_final,
            metas_acciones(
              id_accion,
              acciones(
                id, nombre_iniciativa, descripcion, tipo, estado, responsable,
                poblacion_objetivo, resultado_esperado,
                intervenciones(id, fecha, descripcion, adjunto_url)
              )
            )
          )
        `)
        .eq('idmunicipio', id)
        .order('id')

      if (linesErr) throw linesErr
      setLines(linesData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const getLineStats = (line) => {
    let activeMetas = 0
    let totalInterventions = 0
    const seenActionIds = new Set()

    if (line.metas_linea) {
      line.metas_linea.forEach(meta => {
        if (meta.estado?.toLowerCase() === 'activo' || meta.estado?.toLowerCase() === 'activa') {
          activeMetas++
        }
        if (meta.metas_acciones) {
          meta.metas_acciones.forEach(ma => {
            const acc = ma.acciones
            if (acc && !seenActionIds.has(acc.id)) {
              seenActionIds.add(acc.id)
              if (acc.intervenciones) {
                totalInterventions += acc.intervenciones.length
              }
            }
          })
        }
      })
    }
    return { activeMetas, totalInterventions }
  }

  const renderProgressBar = (meta) => {
    const val = Number(meta.indicador_valor)
    const obj = Number(meta.indicador_objetivo)
    const hasObjective = meta.indicador_objetivo !== null && meta.indicador_objetivo !== undefined && meta.indicador_objetivo !== '' && obj > 0

    if (hasObjective && !isNaN(val) && !isNaN(obj)) {
      const pct = Math.min(Math.max(Math.round((val / obj) * 100), 0), 100)
      return (
        <div className="flex items-center gap-3 mt-2">
          <div className="flex-1 bg-surface-container-high h-2 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold text-on-surface-variant whitespace-nowrap">{pct}% ({val} / {obj})</span>
        </div>
      )
    }

    return (
      <div className="mt-2 text-xs font-semibold text-on-surface-variant">
        Valor actual: <span className="text-on-surface font-bold">{meta.indicador_valor ?? '-'}</span>
      </div>
    )
  }

  const colors = [
    {
      border: 'border-primary',
      bg: 'bg-primary/5',
      text: 'text-primary',
    },
    {
      border: 'border-secondary',
      bg: 'bg-secondary-container/20',
      text: 'text-secondary',
    },
    {
      border: 'border-tertiary',
      bg: 'bg-tertiary-container/20',
      text: 'text-tertiary',
    }
  ]

  if (loading) {
    return (
      <div className="bg-surface-container-low min-h-screen flex flex-col justify-center items-center gap-4">
        <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
        <p className="font-headline-md text-headline-md text-on-surface">Cargando Plan de Acción...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-surface-container-low text-on-surface min-h-screen flex flex-col justify-center items-center p-6">
        <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant text-center max-w-md w-full">
          <span className="material-symbols-outlined text-error text-[48px] bg-error-container text-on-error-container p-4 rounded-full mb-4">error</span>
          <h2 className="text-xl font-bold text-on-surface mb-2">Error al cargar datos</h2>
          <p className="text-on-surface-variant mb-6 text-sm">{error}</p>
          <button
            onClick={loadData}
            className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-medium hover:bg-primary/95 transition-all inline-flex items-center gap-2 cursor-pointer border-none"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-low text-on-surface min-h-screen flex flex-col">
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
          body { font-size: 11pt; background: white !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .interventions-list { display: block !important; }
        }
      `}} />

      {/* Fixed Header (No Print) */}
      <header className="fixed top-0 left-0 w-full z-50 h-16 bg-surface border-b border-outline-variant flex justify-between items-center px-6 no-print shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-surface-container transition-colors bg-transparent border-none cursor-pointer text-primary"
            title="Volver"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-bold text-base md:text-lg text-on-surface leading-tight">Resumen: {municipioNombre}</h1>
            <p className="text-xs text-on-surface-variant">Generado el {getCurrentDate()}</p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="bg-primary text-on-primary font-bold px-4 py-2 rounded-xl inline-flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all cursor-pointer border-none"
        >
          <span className="material-symbols-outlined text-sm">print</span>
          <span className="hidden sm:inline">Imprimir PDF</span>
        </button>
      </header>

      {/* Main Print Container */}
      <main className="pt-20 pb-20 px-6 max-w-5xl mx-auto w-full flex-grow">
        
        {/* Print Only Header Info */}
        <div className="hidden print:block border-b border-outline-variant pb-4 mb-6">
          <h1 className="text-2xl font-bold text-on-surface">Plan de Acción Integral</h1>
          <div className="flex justify-between items-center mt-2 text-xs text-on-surface-variant">
            <span className="font-semibold">Municipio: {municipioNombre}</span>
            <span>Fecha de Emisión: {getCurrentDate()}</span>
          </div>
        </div>

        {lines.length === 0 ? (
          <div className="bg-surface-container-lowest p-12 rounded-2xl border border-outline-variant text-center">
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant">assignment_late</span>
            <p className="text-lg font-bold text-on-surface mt-4">Sin líneas temáticas</p>
            <p className="text-sm text-on-surface-variant mt-1">Este municipio aún no tiene cargado un plan de acción.</p>
          </div>
        ) : (
          lines.map((line, index) => {
            const { activeMetas, totalInterventions } = getLineStats(line)
            const accent = colors[index % colors.length]
            return (
              <div 
                key={line.id} 
                className={`bg-surface-container-lowest rounded-2xl border ${accent.border}/20 shadow-sm p-6 mb-6 ${
                  index > 0 ? 'page-break' : ''
                }`}
              >
                {/* Line Header */}
                <div className={`border-b border-outline-variant/30 pb-4 mb-4`}>
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-bold text-on-surface">
                        {line.lista_lineas_tematicas?.nombre || 'Línea Temática'}
                      </h2>
                      {line.objetivo_general && (
                        <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                          {line.objetivo_general}
                        </p>
                      )}
                    </div>
                    {/* Line Stats */}
                    <div className="flex gap-2 whitespace-nowrap mt-2 md:mt-0">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-container text-on-surface-variant">
                        Metas Activas: {activeMetas}
                      </span>
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-surface-container text-on-surface-variant">
                        Intervenciones: {totalInterventions}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Line Metas */}
                <div className="space-y-6">
                  {line.metas_linea && line.metas_linea.length > 0 ? (
                    line.metas_linea.map(meta => {
                      return (
                        <div key={meta.id} className="border-t border-outline-variant/20 pt-4 first:border-none first:pt-0">
                          
                          {/* Meta Badge & Dates */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              meta.estado?.toLowerCase() === 'activo' || meta.estado?.toLowerCase() === 'activa'
                                ? 'bg-primary/10 text-primary'
                                : 'bg-surface-container-high text-on-surface-variant'
                            }`}>
                              {meta.estado || 'Inactivo'}
                            </span>
                            <span className="text-xs text-on-surface-variant font-medium">
                              Plazo: {formatDate(meta.fecha_inicio)} → {formatDate(meta.fecha_final)}
                            </span>
                          </div>

                          {/* Meta Description */}
                          <p className="font-bold text-on-surface text-sm leading-snug">{meta.meta}</p>
                          <p className="text-xs text-on-surface-variant mt-1 leading-normal">
                            Indicador: <span className="font-medium">{meta.indicador}</span>
                          </p>

                          {/* Progress bar */}
                          {renderProgressBar(meta)}

                          {/* Linked Initiatives */}
                          <div className="mt-4 pl-4 border-l-2 border-outline-variant/30 space-y-4">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant/80">Iniciativas Vinculadas</h4>
                            {meta.metas_acciones && meta.metas_acciones.length > 0 ? (
                              meta.metas_acciones.map(ma => {
                                const action = ma.acciones
                                if (!action) return null
                                const isExpanded = expandedActions.has(action.id)
                                return (
                                  <div key={action.id} className="bg-surface-container-low/30 p-4 rounded-xl border border-outline-variant/20">
                                    
                                    {/* Initiative header badges and toggle */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                                          action.type === 'existente'
                                            ? 'bg-secondary-container text-on-secondary-container'
                                            : action.type === 'planificada'
                                            ? 'bg-primary/10 text-primary'
                                            : 'bg-surface-container-high text-on-surface-variant'
                                        }`}>
                                          {action.type || 'sin tipo'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase bg-surface-container-high text-on-surface-variant">
                                          {action.estado || 'sin estado'}
                                        </span>
                                      </div>
                                      
                                      <button 
                                        onClick={() => toggleAction(action.id)} 
                                        className="no-print inline-flex items-center gap-0.5 text-xs text-primary font-bold hover:underline bg-transparent border-none cursor-pointer select-none"
                                      >
                                        <span>{isExpanded ? 'Ocultar' : 'Ver'} Intervenciones</span>
                                        <span className="material-symbols-outlined text-[16px]">
                                          {isExpanded ? 'expand_less' : 'expand_more'}
                                        </span>
                                      </button>
                                    </div>

                                    {/* Initiative details */}
                                    <p className="font-bold text-on-surface text-sm leading-snug">{action.nombre_iniciativa}</p>
                                    {action.descripcion && (
                                      <p className="text-xs text-on-surface-variant mt-1 leading-normal">{action.descripcion}</p>
                                    )}

                                    {action.responsable && (
                                      <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-2 font-medium">
                                        <span className="material-symbols-outlined text-[16px]">person</span>
                                        <span>Responsable: {action.responsable}</span>
                                      </div>
                                    )}

                                    {/* Interventions Sublist */}
                                    <div className={`mt-3 space-y-2 interventions-list ${isExpanded ? 'block' : 'hidden print:block'}`}>
                                      <h5 className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/80">Registros de Intervención</h5>
                                      {action.intervenciones && action.intervenciones.length > 0 ? (
                                        action.intervenciones.map(inter => (
                                          <div 
                                            key={inter.id} 
                                            className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 bg-surface-container-lowest/60 p-2.5 rounded-lg border border-outline-variant/10"
                                          >
                                            <div className="flex-1">
                                              <span className="text-xs font-bold text-on-surface mr-2">
                                                {formatDate(inter.fecha)}
                                              </span>
                                              <span className="text-xs text-on-surface-variant">
                                                {inter.descripcion}
                                              </span>
                                            </div>
                                            {inter.adjunto_url && (
                                              <a 
                                                href={inter.adjunto_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-primary hover:underline inline-flex items-center gap-0.5 font-bold text-xs self-start sm:self-center"
                                              >
                                                <span className="material-symbols-outlined text-[16px]">attach_file</span>
                                                <span>Adjunto</span>
                                              </a>
                                            )}
                                          </div>
                                        ))
                                      ) : (
                                        <p className="text-xs italic text-on-surface-variant/70">Sin registros de intervención</p>
                                      )}
                                    </div>

                                  </div>
                                )
                              })
                            ) : (
                              <span className="inline-block text-xs italic text-on-surface-variant bg-surface-container-high/40 px-3 py-1 rounded-lg">
                                Sin iniciativas vinculadas
                              </span>
                            )}
                          </div>

                        </div>
                      )
                    })
                  ) : (
                    <span className="inline-block text-xs italic text-on-surface-variant bg-surface-container-high/40 px-3 py-2 rounded-lg">
                      Sin metas definidas
                    </span>
                  )}
                </div>

              </div>
            )
          })
        )}

      </main>
    </div>
  )
}
