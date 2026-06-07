import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import SlideBar from '../components/SlideBar'
import { useAuth } from '../context/AuthContext'
import { supabase, getOrCreateAutodiagnostico } from '../lib/supabase'

// 12 sections template data with default icons and metrics (for Autodiagnóstico tab)
const SECCIONES_TEMPLATE = [
  { order: 1, name: 'Datos generales', icon: 'domain', metrics: ['Población: 45.200', 'Área: 1.600 km²'] },
  { order: 2, name: 'Datos socioeconómicos', icon: 'analytics', metrics: ['NBI: 12.4%', 'Desempleo: 8.2%'] },
  { order: 3, name: 'Primera infancia', icon: 'child_care', metrics: ['Centros: 12', 'Cobertura: 92%'] },
  { order: 4, name: 'Inclusión educativa', icon: 'school', metrics: ['Escuelas: 34', 'Matrícula: 8.500'] },
  { order: 5, name: 'Salud sexual y reproductiva', icon: 'favorite', metrics: ['Hospitales: 2', 'Asesorías: 15'] },
  { order: 6, name: 'Entornos saludables', icon: 'forest', metrics: ['Espacios verdes: 8', 'Residuos: 95%'] },
  { order: 7, name: 'Entornos libres de violencia', icon: 'shield', metrics: ['Denuncias: 12', 'Resueltas: 8'] },
  { order: 8, name: 'Discapacidad', icon: 'accessible', metrics: ['Registrados: 320', 'Centros esp.: 2'] },
  { order: 9, name: 'Medio ambiente', icon: 'public', metrics: ['Planes amb.: 2', 'Mediciones: 12'] },
  { order: 10, name: 'Participación', icon: 'groups', metrics: ['Consejos: 1', 'Miembros NNyA: 15'] },
  { order: 11, name: 'Articulación sector privado', icon: 'handshake', metrics: ['Empresas asoc.: 6', 'Acciones: 12'] },
  { order: 12, name: 'Protección digital', icon: 'security', metrics: ['Zonas Wifi: 5', 'Talleres seg.: 8'] },
]

export default function MunicipioDashboard() {
  const { id } = useParams()
  const navigate = useNavigate()
  useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('plan') // 'auto' | 'plan' ('plan' active by default as requested)
  
  // Accordion Open States (Participación expanded by default)
  const [openAccordions, setOpenAccordions] = useState({
    line1: true,
    line2: false,
    line3: false
  })

  // Drawer States
  const [selectedAction, setSelectedAction] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerStatus, setDrawerStatus] = useState('En ejecución')

  const munId = Number(id) || 1

  const [muniNombre, setMuniNombre] = useState('')
  const [idAutodiagnostico, setIdAutodiagnostico] = useState(null)
  const [currentProgress, setCurrentProgress] = useState(0)
  const [currentStatus, setCurrentStatus] = useState('Pendiente')
  const [dynamicSectionProgress, setDynamicSectionProgress] = useState({})
  const [seccionesConPreguntas, setSeccionesConPreguntas] = useState(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      setDashboardLoading(true)
      try {
        // Municipio name
        const { data: muniData } = await supabase
          .from('municipios')
          .select('nombre')
          .eq('id', munId)
          .single()
        if (muniData) setMuniNombre(muniData.nombre)

        // Get or create autodiagnóstico for this municipio
        const autodiagId = await getOrCreateAutodiagnostico(munId, 2025)
        setIdAutodiagnostico(autodiagId)
        if (!autodiagId) return

        // Load autodiagnóstico estado
        const { data: autodiag } = await supabase
          .from('autodiagnosticos')
          .select('estado')
          .eq('id', autodiagId)
          .single()
        if (autodiag) {
          setCurrentStatus(autodiag.estado === 'completo' ? 'Completado' : autodiag.estado === 'borrador' ? 'Pendiente' : 'En Proceso')
        }

        // Load secciones and preguntas to compute per-section progress
        const [{ data: secsData }, { data: pregsData }, { data: respsData }] = await Promise.all([
          supabase.from('secciones').select('id, orden').order('orden'),
          supabase.from('preguntas').select('id, id_seccion, tipo').eq('activa', true),
          supabase.from('respuestas').select('id_pregunta, valor_texto, valor_numerico, valor_array').eq('id_autodiagnostico', autodiagId),
        ])

        const pregs = pregsData ?? []
        const resps = respsData ?? []
        const secs = secsData ?? []

        const respsMap = {}
        resps.forEach(r => { respsMap[r.id_pregunta] = r })

        const isAnswered = (q, ans) => {
          if (!ans) return false
          if (q.tipo === 'texto') return typeof ans.valor_texto === 'string' && ans.valor_texto.trim() !== ''
          if (q.tipo === 'numero') return ans.valor_numerico !== undefined && ans.valor_numerico !== null && ans.valor_numerico !== ''
          if (q.tipo === 'boolean' || q.tipo === 'opcion') return typeof ans.valor_texto === 'string' && ans.valor_texto.trim() !== ''
          if (q.tipo === 'array' || q.tipo === 'tabla') return Array.isArray(ans.valor_array) && ans.valor_array.length > 0
          return false
        }

        const secProg = {}
        let totalAnswered = 0
        secs.forEach(sec => {
          const secQs = pregs.filter(p => p.id_seccion === sec.id)
          if (secQs.length === 0) { secProg[sec.id] = 0; return }
          const answered = secQs.filter(q => isAnswered(q, respsMap[q.id])).length
          totalAnswered += answered
          secProg[sec.id] = Math.round((answered / secQs.length) * 100)
        })
        setDynamicSectionProgress(secProg)
        // IDs de secciones que tienen al menos una pregunta activa
        const conPregs = new Set(pregs.map(p => p.id_seccion))
        setSeccionesConPreguntas(conPregs)
        const totalPregs = pregs.length
        setCurrentProgress(totalPregs > 0 ? Math.round((totalAnswered / totalPregs) * 100) : 0)
      } catch (err) {
        console.error('Error loading dashboard:', err)
      } finally {
        setDashboardLoading(false)
      }
    }
    loadDashboard()
  }, [munId])

  const muni = { nombre: muniNombre || '...' }

  const handleMarkCompleteInline = async () => {
    if (!idAutodiagnostico) return
    await supabase.from('autodiagnosticos').update({ estado: 'completo' }).eq('id', idAutodiagnostico)
    setCurrentStatus('Completado')
    setCurrentProgress(100)
  }

  // Mock strategic lines & actions data
  const [actionsList, setActionsList] = useState({
    'GSM-2025-ACT-004': {
      id: 'GSM-2025-ACT-004',
      name: 'Jóvenes al Consejo',
      resp: 'Cravero Paloma',
      target: 'Adolescentes 13-17 años',
      status: 'En ejecución',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCJyNtdvlIe1qrO3UrIJzPj2veRdDie-IX__ZIK-Xeoa7EFpk_ojQmCHPIlW2OqNDJuOSeQ5h2za8xSbxSJuoqrKwcYq_6K1-Oi9LaqBWOyJGNQKQJ3B628wL6XRtJhBCioVHGJFBaZR9Ixmq_Mduq3GHLYJVK_OIwoOLYIEhp6xLajX4u1GerDHRtnGrq0ySBhjMeBqy6HkcxodhMQGtBFCUQQe8mKSd4KTixSHqkFNGkM0WF2x801w586flSa9y6UPhdrB1GfhdKz',
      desc: 'Implementación de sesiones mensuales donde representantes de diferentes barrios presentan proyectos de mejora local ante el Consejo Municipal de Niñez.',
      timeline: [
        { title: 'Primera reunión de coordinación', date: '15 Oct 2024', desc: 'Se definieron las temáticas anuales y se asignaron coordinadores barriales.', status: 'Realizada' },
        { title: 'Lanzamiento Convocatoria', date: '20 Ene 2025', desc: 'Apertura de inscripciones para representantes juveniles.', status: 'Planificada' }
      ]
    },
    'GSM-2025-ACT-005': {
      id: 'GSM-2025-ACT-005',
      name: 'EduTurismo',
      resp: 'Smut Luciano',
      target: 'Niños y Niñas 8-12 años',
      status: 'En ejecución',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRn1mvT1lECdld6vAS83zbOLbC-Z6EVIz0b1diXk0Kn16r1Ekl_vlihuF9hQaayxIOKhxyAhaHHD-ZZ3nM3EsONsnAy2SjkhHzyvDXYiDn_AiYaAtxp8zSPOT7eE5kip_2I3wsSi6vVicIM5sVpoDtegl_Gt6Zwzs-6I-c06A56YaZGXsL8m2reN0i5QjNCUbYbBZS9AciK4W5OQzkcNJSCCEujFe0SdsZi88M4hLX09xGjyyZW_n0eoydiuPmbWVaRJMywBbopCnR',
      desc: 'Programa de turismo educativo e histórico para escuelas de sectores vulnerables.',
      timeline: [
        { title: 'Definición de circuitos', date: '10 Nov 2024', desc: 'Se coordinaron las rutas turísticas con la dirección de patrimonio.', status: 'Realizada' }
      ]
    }
  })

  // Map progress value, status text and status class based on index (for Autodiagnóstico tab)
  const categories = SECCIONES_TEMPLATE.map((cat) => {
    // Una sección es inactiva si no tiene preguntas activas en la BD
    // Mientras carga (null) usamos false para no bloquear nada
    const isInactive = seccionesConPreguntas !== null ? !seccionesConPreguntas.has(cat.order) : false
    const prog = isInactive ? 0 : (dynamicSectionProgress[cat.order] ?? 0)
    
    let statusText = isInactive ? 'No disponible' : 'Pendiente'
    let statusClass = isInactive ? 'bg-surface-container-high text-outline/60 border border-outline-variant/30' : 'bg-gray-100 text-gray-600'

    if (!isInactive) {
      if (prog === 100) {
        statusText = 'Completo'
        statusClass = 'bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0]'
      } else if (prog > 0) {
        statusText = 'En Proceso'
        statusClass = 'bg-amber-100 text-amber-800'
      }
    }

    return {
      ...cat,
      progress: prog,
      status: statusText,
      statusClass: statusClass,
      isInactive: isInactive
    }
  })

  const toggleAccordion = (lineKey) => {
    setOpenAccordions(prev => ({
      ...prev,
      [lineKey]: !prev[lineKey]
    }))
  }

  const openDrawer = (actionId) => {
    const action = actionsList[actionId] || {
      id: actionId,
      name: actionId === 'GSM-2025-ACT-005' ? 'EduTurismo' : 'Acción Estratégica',
      resp: actionId === 'GSM-2025-ACT-005' ? 'Smut Luciano' : 'Agente Municipal',
      target: 'Niñez general',
      status: 'En ejecución',
      img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRn1mvT1lECdld6vAS83zbOLbC-Z6EVIz0b1diXk0Kn16r1Ekl_vlihuF9hQaayxIOKhxyAhaHHD-ZZ3nM3EsONsnAy2SjkhHzyvDXYiDn_AiYaAtxp8zSPOT7eE5kip_2I3wsSi6vVicIM5sVpoDtegl_Gt6Zwzs-6I-c06A56YaZGXsL8m2reN0i5QjNCUbYbBZS9AciK4W5OQzkcNJSCCEujFe0SdsZi88M4hLX09xGjyyZW_n0eoydiuPmbWVaRJMywBbopCnR',
      desc: 'Descripción detallada de la acción asociada.',
      timeline: []
    }
    setSelectedAction(action)
    setDrawerStatus(action.status)
    setIsDrawerOpen(true)
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
  }

  const saveDrawerChanges = () => {
    if (selectedAction) {
      setActionsList(prev => ({
        ...prev,
        [selectedAction.id]: {
          ...selectedAction,
          status: drawerStatus
        }
      }))
    }
    setIsDrawerOpen(false)
  }

  if (dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined animate-spin text-primary text-[48px]">sync</span>
      </div>
    )
  }

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden min-h-screen selection:bg-primary-fixed">
      <SlideBar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      {/* Top Navigation Anchor */}
      <header className="fixed top-0 w-full z-45 bg-surface shadow-sm flex justify-between items-center px-gutter h-16 border-b border-outline-variant md:pl-72">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors bg-transparent border-none cursor-pointer"
            title="Abrir menú"
          >
            menu
          </button>
          <span className="font-headline-md text-headline-md font-bold text-primary">NNyA Protección Municipal</span>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-on-surface-variant hover:bg-surface-container transition-colors px-2 py-1 rounded-xl border-none bg-transparent cursor-pointer font-label-md text-label-md"
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Tablero Principal</span>
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-1 text-primary font-bold border-b-2 border-primary py-1 bg-transparent border-none cursor-pointer font-label-md text-label-md"
          >
            <span className="material-symbols-outlined">account_tree</span>
            <span>Líneas Estratégicas</span>
          </button>
          
          <button className="flex items-center gap-1 text-on-surface-variant hover:bg-surface-container transition-colors px-2 py-1 rounded-xl border-none bg-transparent cursor-pointer font-label-md text-label-md">
            <span className="material-symbols-outlined">supervised_user_circle</span>
            <span>Gestión de Casos</span>
          </button>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container p-2 rounded-full transition-colors border-none bg-transparent cursor-pointer">
            notifications
          </button>
          <button className="material-symbols-outlined text-on-surface-variant hover:bg-surface-container p-2 rounded-full transition-colors border-none bg-transparent cursor-pointer">
            help
          </button>
          <div className="w-8 h-8 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container font-bold text-sm">
            GA
          </div>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="md:ml-64 pt-24 px-gutter pb-xl min-h-screen">
        
        {/* Header Section */}
        <section className="mb-lg flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <nav className="flex gap-2 text-label-sm text-outline mb-1">
              <span>Proyectos</span>
              <span>/</span>
              <span className="text-primary font-bold">{muni.nombre}</span>
            </nav>
            <h1 className="font-display text-display text-on-surface">Plan de Acción — {muni.nombre}</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant">Ciclo Operativo Año 2025</p>
          </div>
          
          <button className="bg-primary text-on-primary font-bold px-lg h-12 rounded-full flex items-center gap-2 shadow-sm active:scale-95 transition-all border-none cursor-pointer">
            <span className="material-symbols-outlined">add</span>
            Nueva línea temática
          </button>
        </section>

        {/* Metrics Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-md mb-xl">
          <div className="bg-surface-container-lowest p-md rounded-2xl shadow-sm border-l-4 border-primary">
            <span className="text-label-sm text-outline uppercase tracking-wider block">Líneas activas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-headline-lg font-bold">5</span>
              <span className="text-secondary font-bold text-label-sm">+1 este mes</span>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest p-md rounded-2xl shadow-sm border-l-4 border-secondary">
            <span className="text-label-sm text-outline uppercase tracking-wider block">Metas</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-headline-lg font-bold">12</span>
              <span className="text-label-sm text-on-surface-variant font-medium">Estratégicas</span>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest p-md rounded-2xl shadow-sm border-l-4 border-tertiary">
            <span className="text-label-sm text-outline uppercase tracking-wider block">Estado autodiag.</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className={`text-label-md font-bold px-2 py-1 rounded-full ${
                currentStatus === 'Completado' ? 'bg-[#d1fae5] text-[#065f46]' :
                currentStatus === 'En Proceso' ? 'bg-amber-100 text-amber-800' :
                'bg-surface-container text-outline'
              }`}>{currentStatus}</span>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest p-md rounded-2xl shadow-sm border-l-4 border-primary-container">
            <span className="text-label-sm text-outline uppercase tracking-wider block">Avance general</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-headline-lg font-bold text-primary">{currentProgress}%</span>
              <div className="w-24 h-2 bg-surface-container rounded-full overflow-hidden self-center ml-2">
                <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${currentProgress}%` }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="flex border-b border-outline-variant mb-lg">
          <button 
            onClick={() => setActiveTab('auto')}
            className={`px-8 py-4 font-headline-md text-headline-md flex items-center gap-2 transition-all cursor-pointer border-none bg-transparent ${
              activeTab === 'auto' ? 'active-tab' : 'text-on-surface-variant font-medium'
            }`}
          >
            <span className="material-symbols-outlined">fact_check</span>
            Autodiagnóstico
          </button>
          
          <button 
            onClick={() => setActiveTab('plan')}
            className={`px-8 py-4 font-headline-md text-headline-md flex items-center gap-2 transition-all cursor-pointer border-none bg-transparent ${
              activeTab === 'plan' ? 'active-tab' : 'text-on-surface-variant font-medium'
            }`}
          >
            <span className="material-symbols-outlined">assignment</span>
            Plan de Acción
          </button>
        </div>

        {/* Tab Content: Autodiagnóstico */}
        {activeTab === 'auto' && (
          <div className="space-y-lg animate-fade-in">
            {/* Autodiagnóstico Banner Card */}
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6 shadow-sm">
              <div className="space-y-2 text-center md:text-left">
                <div className="flex justify-center md:justify-start items-center gap-2 text-primary font-bold text-label-md uppercase tracking-wider">
                  <span className="material-symbols-outlined">fact_check</span>
                  Autodiagnóstico Municipal 2026
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold">
                  Relevamiento Técnico de Gestión
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl leading-relaxed">
                  Complete las 12 secciones temáticas para evaluar el nivel de cumplimiento de las políticas de protección infantil en su municipio. Los cambios se guardan automáticamente.
                </p>
              </div>

              <button
                disabled={!idAutodiagnostico}
                onClick={() => navigate(`/municipio/${id}/autodiagnostico/${idAutodiagnostico}`)}
                className="bg-primary text-on-primary font-bold px-8 py-3.5 rounded-full flex items-center gap-2 hover:bg-primary-container hover:text-primary transition-all active:scale-95 border-none cursor-pointer shadow-md shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">edit_note</span>
                {currentProgress === 100 ? 'Revisar Respuestas' : (currentProgress > 0 ? 'Continuar Autodiagnóstico' : 'Iniciar Autodiagnóstico')}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-gutter">
              {categories.map((cat) => (
                <div 
                  key={cat.order} 
                  className={`bg-surface-container-lowest p-6 rounded-2xl shadow-sm border-l-4 transition-shadow flex flex-col h-full justify-between border border-outline-variant ${
                    cat.isInactive 
                      ? 'border-l-outline-variant/30 opacity-60' 
                      : 'border-l-primary hover:shadow-custom-md'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        cat.isInactive ? 'bg-surface-container text-outline/50' : 'bg-primary/10 text-primary'
                      }`}>
                        <span className="material-symbols-outlined">{cat.icon}</span>
                      </div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full ${cat.statusClass}`}>
                        {cat.status}
                      </span>
                    </div>
                    
                    <h3 className={`font-headline-md text-headline-md mb-2 leading-snug ${
                      cat.isInactive ? 'text-on-surface-variant/50' : 'text-on-surface'
                    }`}>
                      {cat.name}
                    </h3>
                    
                    <div className="space-y-1 mb-6">
                      {cat.metrics.map((m, idx) => (
                        <p key={idx} className={`text-label-md flex items-center gap-1.5 ${
                          cat.isInactive ? 'text-outline/40' : 'text-on-surface-variant'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full inline-block ${
                            cat.isInactive ? 'bg-outline-variant/40' : 'bg-outline'
                          }`}></span>
                          {m}
                        </p>
                      ))}
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between text-label-sm mb-1.5">
                      <span className="text-on-surface-variant">Progreso</span>
                      <span className="text-primary font-bold">{cat.progress}%</span>
                    </div>
                    <div className="w-full bg-surface-container h-1.5 rounded-full mb-4 overflow-hidden">
                      <div className="bg-primary h-1.5 rounded-full transition-all duration-500" style={{ width: `${cat.progress}%` }}></div>
                    </div>
                    
                    <button 
                      disabled={cat.isInactive}
                      onClick={() => idAutodiagnostico && navigate(`/municipio/${id}/autodiagnostico/${idAutodiagnostico}`, { state: { initialSectionId: cat.order } })}
                      className={`w-full py-2.5 border font-label-md rounded-lg flex items-center justify-center gap-2 cursor-pointer bg-transparent transition-colors ${
                        cat.isInactive
                          ? 'border-outline-variant/30 text-outline/40 cursor-not-allowed'
                          : 'border-primary text-primary hover:bg-primary hover:text-on-primary'
                      }`}
                    >
                      {cat.isInactive ? 'No disponible' : 'Ver formulario'}
                      {!cat.isInactive && <span className="material-symbols-outlined text-[18px]">open_in_new</span>}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-center pt-8">
              <button 
                onClick={handleMarkCompleteInline}
                className={`px-12 py-4 rounded-full font-headline-md shadow-custom-sm flex items-center gap-3 border-none transition-all ${
                  currentProgress === 100 
                    ? 'bg-primary text-on-primary hover:opacity-90 cursor-pointer active:scale-95' 
                    : 'bg-surface-dim text-on-surface-variant cursor-not-allowed opacity-60'
                }`}
                disabled={currentProgress < 100}
              >
                <span className="material-symbols-outlined">check_circle</span>
                Marcar autodiagnóstico como completo
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: Plan de Acción */}
        {activeTab === 'plan' && (
          <div className="space-y-md animate-fade-in">
            {/* Strategic Lines Accordions */}
            
            {/* Line 1: Participación */}
            <article className={`bg-white rounded-2xl shadow-sm border border-outline-variant overflow-hidden transition-all ${openAccordions.line1 ? 'ring-1 ring-primary/20' : ''}`}>
              <header 
                className="flex items-center justify-between p-lg cursor-pointer hover:bg-surface-container-low transition-colors"
                onClick={() => toggleAccordion('line1')}
              >
                <div className="flex items-center gap-lg">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline-md text-headline-md text-on-surface">🗣️ Participación</h3>
                      <span className="bg-secondary-container text-on-secondary-container text-label-sm px-2.5 py-0.5 rounded-full font-bold">80%</span>
                    </div>
                    <p className="text-label-md text-outline mt-0.5">Objetivo: Fomentar la participación activa de adolescentes en la agenda pública municipal.</p>
                  </div>
                </div>
                <span 
                  className="material-symbols-outlined transition-transform duration-300"
                  style={{ transform: openAccordions.line1 ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  expand_more
                </span>
              </header>

              {openAccordions.line1 && (
                <div className="bg-surface-container-lowest p-lg pt-0 border-t border-outline-variant/30 animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg mt-lg">
                    {/* Meta Card */}
                    <div className="lg:col-span-8 bg-surface border border-outline-variant/40 rounded-2xl p-lg flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-md">
                          <div>
                            <span className="bg-secondary text-white text-[10px] uppercase font-bold px-2 py-1 rounded-md mb-2 inline-block">Meta Principal</span>
                            <h4 className="font-headline-md text-headline-md text-on-surface">Impulsar espacios participativos para NNyA</h4>
                          </div>
                          <div className="text-right">
                            <span className="bg-green-100 text-green-800 text-label-sm px-3 py-1 rounded-full font-bold border border-green-200">Activo</span>
                            <p className="text-label-sm text-outline mt-1 font-medium">Dic 2025 → Nov 2026</p>
                          </div>
                        </div>

                        {/* Progress Indicator */}
                        <div className="bg-white p-lg rounded-xl border border-outline-variant/30 mb-lg">
                          <div className="flex justify-between items-center mb-base">
                            <span className="text-label-md font-bold text-on-surface">Progreso de la Meta</span>
                            <span className="text-primary font-bold">60% alcanzado</span>
                          </div>
                          
                          <div className="relative pt-6 pb-2">
                            {/* Track */}
                            <div className="h-3 bg-surface-container-high rounded-full w-full relative">
                              {/* Fill */}
                              <div className="absolute h-full bg-primary rounded-full transition-all duration-1000" style={{ width: '60%' }}></div>
                              
                              {/* Markers */}
                              <div className="absolute -top-6 left-0 flex flex-col items-center">
                                <span className="text-[10px] font-bold text-outline">Base: 0</span>
                                <div className="w-0.5 h-2 bg-outline mt-1"></div>
                              </div>
                              <div className="absolute -top-6 left-[60%] flex flex-col items-center -translate-x-1/2">
                                <span className="text-[10px] font-bold text-primary">Actual: 6</span>
                                <div className="w-0.5 h-2 bg-primary mt-1"></div>
                              </div>
                              <div className="absolute -top-6 right-0 flex flex-col items-center">
                                <span className="text-[10px] font-bold text-outline">Meta: 10</span>
                                <div className="w-0.5 h-2 bg-outline mt-1"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Linked Actions */}
                      <div>
                        <h5 className="font-label-md text-label-md font-bold mb-sm flex items-center gap-2 text-on-surface">
                          <span className="material-symbols-outlined text-[18px]">list_alt</span>
                          Acciones Vinculadas (2)
                        </h5>
                        
                        <div className="space-y-sm">
                          {/* Action 1 */}
                          <div 
                            onClick={() => openDrawer('GSM-2025-ACT-004')}
                            className="flex items-center justify-between p-md bg-white border border-outline-variant/20 rounded-xl hover:border-primary hover:shadow-custom-sm cursor-pointer transition-all active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-md">
                              <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden">
                                <img 
                                  alt="Responsable" 
                                  className="w-full h-full object-cover" 
                                  src={actionsList['GSM-2025-ACT-004'].img}
                                />
                              </div>
                              <div>
                                <p className="font-label-md text-on-surface font-bold">{actionsList['GSM-2025-ACT-004'].name}</p>
                                <p className="text-label-sm text-outline mt-0.5">{actionsList['GSM-2025-ACT-004'].resp}</p>
                              </div>
                            </div>
                            <span className={`text-label-sm px-3 py-1 rounded-full font-bold ${
                              actionsList['GSM-2025-ACT-004'].status === 'Completado' 
                                ? 'bg-green-100 text-green-800' 
                                : actionsList['GSM-2025-ACT-004'].status === 'Atrasado'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {actionsList['GSM-2025-ACT-004'].status}
                            </span>
                          </div>

                          {/* Action 2 */}
                          <div 
                            onClick={() => openDrawer('GSM-2025-ACT-005')}
                            className="flex items-center justify-between p-md bg-white border border-outline-variant/20 rounded-xl hover:border-primary hover:shadow-custom-sm cursor-pointer transition-all active:scale-[0.99]"
                          >
                            <div className="flex items-center gap-md">
                              <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden">
                                <img 
                                  alt="Responsable" 
                                  className="w-full h-full object-cover" 
                                  src={actionsList['GSM-2025-ACT-005'].img}
                                />
                              </div>
                              <div>
                                <p className="font-label-md text-on-surface font-bold">{actionsList['GSM-2025-ACT-005'].name}</p>
                                <p className="text-label-sm text-outline mt-0.5">{actionsList['GSM-2025-ACT-005'].resp}</p>
                              </div>
                            </div>
                            <span className={`text-label-sm px-3 py-1 rounded-full font-bold ${
                              actionsList['GSM-2025-ACT-005'].status === 'Completado' 
                                ? 'bg-green-100 text-green-800' 
                                : actionsList['GSM-2025-ACT-005'].status === 'Atrasado'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {actionsList['GSM-2025-ACT-005'].status}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Context Panel */}
                    <div className="lg:col-span-4 space-y-md">
                      <div className="bg-white rounded-2xl p-md border border-outline-variant/30">
                        <h5 className="font-label-md font-bold mb-md text-on-surface">Distribución de Recursos</h5>
                        <div className="space-y-sm">
                          <div className="flex justify-between text-label-sm">
                            <span className="text-outline">Presupuesto</span>
                            <span className="font-bold text-on-surface">$1.2M / $2M</span>
                          </div>
                          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                            <div className="bg-secondary h-full rounded-full" style={{ width: '60%' }}></div>
                          </div>
                          
                          <div className="flex justify-between text-label-sm mt-3">
                            <span className="text-outline">Recurso Humano</span>
                            <span className="font-bold text-on-surface">8 Agentes</span>
                          </div>
                          <div className="h-2 bg-surface-container rounded-full overflow-hidden">
                            <div className="bg-tertiary h-full rounded-full" style={{ width: '80%' }}></div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-primary/5 rounded-2xl p-md border border-primary/20">
                        <p className="text-label-sm text-primary font-bold mb-base italic">Insight del mes</p>
                        <p className="text-label-md leading-relaxed text-on-primary-fixed-variant">
                          "La participación aumentó un 15% tras la descentralización de los talleres en barrios periféricos."
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </article>

            {/* Line 2: Salud Integral */}
            <article className="bg-white rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
              <header 
                className="flex items-center justify-between p-lg cursor-pointer hover:bg-surface-container-low transition-colors"
                onClick={() => toggleAccordion('line2')}
              >
                <div className="flex items-center gap-lg">
                  <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>health_and_safety</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline-md text-headline-md text-on-surface">🩺 Salud Integral</h3>
                      <span className="bg-surface-container text-outline text-label-sm px-2.5 py-0.5 rounded-full font-bold">45%</span>
                    </div>
                    <p className="text-label-md text-outline mt-0.5">Objetivo: Garantizar el acceso a controles médicos preventivos y salud mental.</p>
                  </div>
                </div>
                <span 
                  className="material-symbols-outlined transition-transform duration-300"
                  style={{ transform: openAccordions.line2 ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  expand_more
                </span>
              </header>
              
              {openAccordions.line2 && (
                <div className="bg-surface-container-lowest p-lg pt-0 border-t border-outline-variant/30 animate-fade-in">
                  <p className="text-on-surface-variant p-8 text-center italic font-body-md">
                    Cargando detalles de la línea de salud...
                  </p>
                </div>
              )}
            </article>

            {/* Line 3: Educación */}
            <article className="bg-white rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
              <header 
                className="flex items-center justify-between p-lg cursor-pointer hover:bg-surface-container-low transition-colors"
                onClick={() => toggleAccordion('line3')}
              >
                <div className="flex items-center gap-lg">
                  <div className="w-12 h-12 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>school</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-headline-md text-headline-md text-on-surface">📚 Educación</h3>
                      <span className="bg-surface-container text-outline text-label-sm px-2.5 py-0.5 rounded-full font-bold">12%</span>
                    </div>
                    <p className="text-label-md text-outline mt-0.5">Objetivo: Reducir la deserción escolar en el nivel secundario mediante mentorías.</p>
                  </div>
                </div>
                <span 
                  className="material-symbols-outlined transition-transform duration-300"
                  style={{ transform: openAccordions.line3 ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  expand_more
                </span>
              </header>

              {openAccordions.line3 && (
                <div className="bg-surface-container-lowest p-lg pt-0 border-t border-outline-variant/30 animate-fade-in">
                  <p className="text-on-surface-variant p-8 text-center italic font-body-md">
                    Cargando detalles de la línea de educación...
                  </p>
                </div>
              )}
            </article>
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button className="fixed bottom-margin-desktop right-margin-desktop w-16 h-16 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-50 group border-none cursor-pointer">
        <span className="material-symbols-outlined text-[28px]">add</span>
        <span className="absolute right-full mr-4 bg-inverse-surface text-inverse-on-surface px-3 py-1.5 rounded text-label-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-md pointer-events-none">
          Crear Nueva Acción
        </span>
      </button>

      {/* Mobile Bottom Navigation Anchor */}
      <nav className="md:hidden fixed bottom-0 w-full bg-surface shadow-[0_-2px_10px_rgba(0,0,0,0.05)] flex justify-around items-center h-16 px-gutter z-50 border-t border-outline-variant">
        <button 
          onClick={() => navigate('/')}
          className="flex flex-col items-center gap-1 text-primary border-none bg-transparent cursor-pointer"
        >
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
          <span className="text-[10px] font-bold">Panel</span>
        </button>
        <button 
          onClick={() => setActiveTab('plan')}
          className={`flex flex-col items-center gap-1 border-none bg-transparent cursor-pointer ${
            activeTab === 'plan' ? 'text-primary' : 'text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined">account_tree</span>
          <span className="text-[10px]">Líneas</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-on-surface-variant border-none bg-transparent cursor-pointer">
          <span className="material-symbols-outlined">supervised_user_circle</span>
          <span className="text-[10px]">Casos</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-on-surface-variant border-none bg-transparent cursor-pointer">
          <span className="material-symbols-outlined">settings</span>
          <span className="text-[10px]">Ajustes</span>
        </button>
      </nav>

      {/* Side Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 animate-fade-in" 
          onClick={closeDrawer}
        />
      )}

      {/* Side Drawer (Action Detail) */}
      <div 
        className={`fixed right-0 top-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl transition-transform duration-300 flex flex-col ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {selectedAction && (
          <>
            <header className="p-lg border-b border-outline-variant flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md text-on-surface">Detalle de Acción</h2>
              <button 
                className="material-symbols-outlined p-2 hover:bg-surface-container rounded-full border-none bg-transparent cursor-pointer"
                onClick={closeDrawer}
              >
                close
              </button>
            </header>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-lg">
              <div className="flex items-center gap-md mb-lg">
                <div className="w-14 h-14 rounded-2xl bg-primary-fixed flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-[32px]">campaign</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-surface">{selectedAction.name}</h3>
                  <p className="text-label-sm text-outline font-semibold mt-0.5">ID: {selectedAction.id}</p>
                </div>
              </div>

              <div className="space-y-lg">
                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-md">
                  <div className="bg-surface-container-low p-md rounded-xl">
                    <label className="text-[10px] uppercase text-outline font-bold mb-1 block">Responsable</label>
                    <p className="text-label-md font-bold text-on-surface">{selectedAction.resp}</p>
                  </div>
                  
                  <div className="bg-surface-container-low p-md rounded-xl">
                    <label className="text-[10px] uppercase text-outline font-bold mb-1 block">Estado</label>
                    <select 
                      className="bg-transparent border-none p-0 text-label-md font-bold text-amber-600 focus:ring-0 w-full cursor-pointer outline-none"
                      value={drawerStatus}
                      onChange={(e) => setDrawerStatus(e.target.value)}
                    >
                      <option value="En ejecución">En ejecución</option>
                      <option value="Planificado">Planificado</option>
                      <option value="Completado">Completado</option>
                      <option value="Atrasado">Atrasado</option>
                    </select>
                  </div>

                  <div className="bg-surface-container-low p-md rounded-xl col-span-2">
                    <label className="text-[10px] uppercase text-outline font-bold mb-1 block">Población Objetivo</label>
                    <p className="text-label-md font-bold text-on-surface">{selectedAction.target}</p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-label-sm font-bold text-on-surface mb-2 block">Descripción de la acción</label>
                  <p className="text-body-md text-on-surface-variant leading-relaxed">
                    {selectedAction.desc}
                  </p>
                </div>

                {/* Intervention Timeline */}
                <div>
                  <div className="flex justify-between items-center mb-md">
                    <label className="text-label-sm font-bold text-on-surface">Línea de Tiempo de Intervenciones</label>
                    <button className="text-primary font-bold text-label-sm flex items-center gap-1 hover:underline bg-transparent border-none cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      Registrar avance
                    </button>
                  </div>

                  <div className="relative pl-6 space-y-lg border-l-2 border-outline-variant ml-2">
                    {selectedAction.timeline.map((item, index) => (
                      <div key={index} className="relative">
                        <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-4 border-white ${
                          item.status === 'Realizada' ? 'bg-green-500' : 'bg-outline'
                        }`}></div>
                        <div className="bg-surface p-md rounded-xl border border-outline-variant/30">
                          <div className="flex justify-between mb-1 items-start">
                            <span className="text-label-sm font-bold text-on-surface">{item.title}</span>
                            <span className="text-[10px] text-outline font-medium">{item.date}</span>
                          </div>
                          <p className="text-label-sm text-on-surface-variant">{item.desc}</p>
                          <span className={`inline-block mt-2 text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            item.status === 'Realizada' ? 'bg-green-100 text-green-700' : 'bg-surface-container text-outline'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    ))}
                    {selectedAction.timeline.length === 0 && (
                      <p className="text-label-sm text-outline italic text-center py-4">No hay intervenciones registradas.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <footer className="p-lg border-t border-outline-variant bg-surface-container-low flex gap-md">
              <button 
                onClick={saveDrawerChanges}
                className="flex-1 bg-primary text-on-primary py-3 rounded-xl font-bold active:scale-95 transition-all border-none cursor-pointer hover:opacity-90"
              >
                Guardar Cambios
              </button>
              <button 
                onClick={closeDrawer}
                className="px-lg border border-outline text-on-surface-variant rounded-xl font-bold hover:bg-surface-container-high transition-all bg-transparent cursor-pointer"
              >
                Cancelar
              </button>
            </footer>
          </>
        )}
      </div>

    </div>
  )
}
