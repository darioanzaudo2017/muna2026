import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import SlideBar from '../components/SlideBar'

export default function QuestionConfig() {
  const navigate = useNavigate()
  const { user: authUser, profile: authProfile, loading: authLoading, isAdmin } = useAuth()

  // Layout States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [usingMockData, setUsingMockData] = useState(false)

  // DB Data States
  const [secciones, setSecciones] = useState([])
  const [preguntas, setPreguntas] = useState([])
  const [selectedSeccionId, setSelectedSeccionId] = useState(null)

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showInactive, setShowInactive] = useState(true)

  // Modal control
  const [isSeccionModalOpen, setIsSeccionModalOpen] = useState(false)
  const [seccionForm, setSeccionForm] = useState({ id: null, nombre: '', orden: '' })

  const [isPreguntaModalOpen, setIsPreguntaModalOpen] = useState(false)
  const [preguntaForm, setPreguntaForm] = useState({
    id: null,
    id_seccion: '',
    orden: '',
    codigo: '',
    texto: '',
    tipo: 'texto',
    requerida: false,
    activa: true
  })
  
  // Dynamic options when creating/editing question
  const [tempOptions, setTempOptions] = useState([]) // array of { id, etiqueta, valor, orden }

  // Expanded questions inline options state
  const [expandedPreguntas, setExpandedPreguntas] = useState({}) // { [preguntaId]: boolean }

  // New inline option inputs per question
  const [newInlineOption, setNewInlineOption] = useState({}) // { [preguntaId]: { etiqueta, valor, orden } }

  // Toast notifications
  const [notification, setNotification] = useState(null)
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // Mock Data
  const MOCK_SECCIONES = [
    { id: 1, nombre: 'Datos generales', orden: 1 },
    { id: 2, nombre: 'Datos socioeconómicos', orden: 2 },
    { id: 3, nombre: 'Primera infancia', orden: 3 },
    { id: 4, nombre: 'Inclusión educativa', orden: 4 }
  ]

  const MOCK_PREGUNTAS = [
    {
      id: 101,
      id_seccion: 1,
      orden: 1,
      codigo: "DG1",
      texto: "¿Tiene el municipio un plan de protección de infancia?",
      tipo: "boolean",
      requerida: true,
      activa: true,
      opciones_pregunta: []
    },
    {
      id: 102,
      id_seccion: 1,
      orden: 2,
      codigo: "DG2",
      texto: "Cantidad de presupuesto anual asignado a niñez",
      tipo: "numero",
      requerida: false,
      activa: true,
      opciones_pregunta: []
    },
    {
      id: 103,
      id_seccion: 2,
      orden: 1,
      codigo: "DS1",
      texto: "Nivel general de Necesidades Básicas Insatisfechas (NBI)",
      tipo: "opcion",
      requerida: true,
      activa: true,
      opciones_pregunta: [
        { id: 201, id_pregunta: 103, etiqueta: "Alto (mayor a 20%)", valor: "alto", orden: 1 },
        { id: 202, id_pregunta: 103, etiqueta: "Medio (10% a 20%)", valor: "medio", orden: 2 },
        { id: 203, id_pregunta: 103, etiqueta: "Bajo (menor a 10%)", valor: "bajo", orden: 3 }
      ]
    },
    {
      id: 104,
      id_seccion: 3,
      orden: 1,
      codigo: "PI1",
      texto: "Seleccione los programas de primera infancia municipales activos",
      tipo: "array",
      requerida: false,
      activa: true,
      opciones_pregunta: [
        { id: 301, id_pregunta: 104, etiqueta: "Centros de Cuidado Infantil", valor: "centros_cuidado", orden: 1 },
        { id: 302, id_pregunta: 104, etiqueta: "Salas de Maternidad", valor: "salas_maternidad", orden: 2 },
        { id: 303, id_pregunta: 104, etiqueta: "Estimulación Temprana", valor: "estimulacion", orden: 3 }
      ]
    },
    {
      id: 105,
      id_seccion: 1,
      orden: 3,
      codigo: "DG3",
      texto: "Nombre del responsable del área de niñez",
      tipo: "texto",
      requerida: true,
      activa: false,
      opciones_pregunta: []
    }
  ]

  // Type label & color configuration helper
  const TYPE_CONFIG = {
    texto: { label: 'Texto', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
    numero: { label: 'Número', class: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
    boolean: { label: 'Sí/No', class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
    opcion: { label: 'Opción Única', class: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
    array: { label: 'Opción Múltiple', class: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300' }
  }

  // Load everything
  const loadData = async (targetSeccionId = null) => {
    setLoading(true)
    setError(null)
    try {
      // Fetch secciones ordered by orden
      const { data: secData, error: secErr } = await supabase
        .from('secciones')
        .select('*')
        .order('orden')

      if (secErr) throw secErr

      // Fetch preguntas ordered by orden with their options
      const { data: pregData, error: pregErr } = await supabase
        .from('preguntas')
        .select('*, opciones_pregunta(*)')
        .order('orden')

      if (pregErr) throw pregErr

      setSecciones(secData || [])
      setPreguntas(pregData || [])

      // Set default selected section if none selected
      if (secData && secData.length > 0) {
        setSelectedSeccionId(prev => targetSeccionId || prev || secData[0].id)
      }
      setUsingMockData(false)
    } catch (err) {
      console.warn("Supabase fetch failed, loading fallback local config:", err.message)
      setSecciones(MOCK_SECCIONES)
      setPreguntas(MOCK_PREGUNTAS)
      setSelectedSeccionId(prev => targetSeccionId || prev || MOCK_SECCIONES[0].id)
      setUsingMockData(true)
    } finally {
      setLoading(false)
    }
  }

  // Reload specific section only
  const reloadSection = async (seccionId) => {
    if (usingMockData) return
    try {
      const { data: pregData, error: pregErr } = await supabase
        .from('preguntas')
        .select('*, opciones_pregunta(*)')
        .order('orden')
      
      if (pregErr) throw pregErr
      setPreguntas(pregData || [])
      setSelectedSeccionId(seccionId)
    } catch (err) {
      console.error("Failed to reload specific section:", err)
      showNotification("Error al refrescar sección", "error")
    }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadData()
    }
  }, [authLoading, isAdmin])

  // --- SECTION CRUD ---
  const handleSaveSeccion = async (e) => {
    e.preventDefault()
    const { nombre, orden } = seccionForm
    const ordenNum = parseInt(orden) || 1

    try {
      if (usingMockData) {
        const newSec = {
          id: Date.now(),
          nombre,
          orden: ordenNum
        }
        setSecciones(prev => [...prev, newSec].sort((a, b) => a.orden - b.orden))
        setSelectedSeccionId(newSec.id)
      } else {
        const { data, error: insErr } = await supabase
          .from('secciones')
          .insert({ nombre, orden: ordenNum })
          .select()

        if (insErr) throw insErr
        const inserted = data?.[0]
        await loadData(inserted?.id)
      }
      setIsSeccionModalOpen(false)
      setSeccionForm({ id: null, nombre: '', orden: '' })
      showNotification("Sección creada correctamente")
    } catch (err) {
      console.error("Error creating section:", err)
      showNotification("Error al crear sección: " + err.message, "error")
    }
  }

  // --- QUESTION CRUD ---
  const handleOpenNewPregunta = () => {
    setPreguntaForm({
      id: null,
      id_seccion: selectedSeccionId || '',
      orden: (preguntas.filter(p => p.id_seccion === selectedSeccionId).length + 1).toString(),
      codigo: '',
      texto: '',
      tipo: 'texto',
      requerida: false,
      activa: true
    })
    setTempOptions([])
    setIsPreguntaModalOpen(true)
  }

  const handleOpenEditPregunta = (preg) => {
    setPreguntaForm({
      id: preg.id,
      id_seccion: preg.id_seccion,
      orden: preg.orden.toString(),
      codigo: preg.codigo,
      texto: preg.texto,
      tipo: preg.tipo,
      requerida: preg.requerida,
      activa: preg.activa
    })
    setTempOptions(preg.opciones_pregunta || [])
    setIsPreguntaModalOpen(true)
  }

  const handleToggleActiva = async (preg) => {
    const isDeactivating = preg.activa
    if (isDeactivating) {
      const confirm = window.confirm(`¿Está seguro de desactivar la pregunta "${preg.codigo}"?\nSe mantendrá en el sistema pero no se mostrará a los municipios.`)
      if (!confirm) return
    }

    const nextActiveState = !preg.activa

    try {
      if (usingMockData) {
        setPreguntas(prev => prev.map(p => p.id === preg.id ? { ...p, activa: nextActiveState } : p))
      } else {
        const { error: updErr } = await supabase
          .from('preguntas')
          .update({ activa: nextActiveState })
          .eq('id', preg.id)

        if (updErr) throw updErr
        await reloadSection(preg.id_seccion)
      }
      showNotification(`Pregunta ${nextActiveState ? 'activada' : 'desactivada'} con éxito`)
    } catch (err) {
      console.error("Error toggling active state:", err)
      showNotification("Error al cambiar estado: " + err.message, "error")
    }
  }

  // Save/Update question handler
  const handleSavePregunta = async (e) => {
    e.preventDefault()
    const { id, id_seccion, orden, codigo, texto, tipo, requerida, activa } = preguntaForm
    const seccionIdNum = parseInt(id_seccion)
    const ordenNum = parseInt(orden) || 1

    try {
      if (usingMockData) {
        if (id) {
          // Edit
          setPreguntas(prev => prev.map(p => p.id === id ? {
            ...p,
            id_seccion: seccionIdNum,
            orden: ordenNum,
            codigo,
            texto,
            tipo,
            requerida,
            activa,
            opciones_pregunta: (tipo === 'opcion' || tipo === 'array') ? tempOptions : []
          } : p))
        } else {
          // Create
          const newPreg = {
            id: Date.now(),
            id_seccion: seccionIdNum,
            orden: ordenNum,
            codigo,
            texto,
            tipo,
            requerida,
            activa,
            opciones_pregunta: (tipo === 'opcion' || tipo === 'array') ? tempOptions : []
          }
          setPreguntas(prev => [...prev, newPreg])
        }
      } else {
        const payload = { id_seccion: seccionIdNum, orden: ordenNum, codigo, texto, tipo, requerida, activa }
        if (id) {
          // Edit in Supabase
          const { error: updErr } = await supabase
            .from('preguntas')
            .update(payload)
            .eq('id', id)

          if (updErr) throw updErr

          // Handle choice options if dynamic type
          if (tipo === 'opcion' || tipo === 'array') {
            // Delete old options and insert tempOptions
            await supabase.from('opciones_pregunta').delete().eq('id_pregunta', id)
            if (tempOptions.length > 0) {
              const optionsPayload = tempOptions.map((opt, i) => ({
                id_pregunta: id,
                etiqueta: opt.etiqueta,
                valor: opt.valor,
                orden: opt.orden || (i + 1)
              }))
              const { error: optErr } = await supabase.from('opciones_pregunta').insert(optionsPayload)
              if (optErr) throw optErr
            }
          }
        } else {
          // Insert Pregunta
          const { data: newPregData, error: insErr } = await supabase
            .from('preguntas')
            .insert(payload)
            .select()

          if (insErr) throw insErr
          const newPregId = newPregData?.[0]?.id

          // Insert options if exists
          if (newPregId && (tipo === 'opcion' || tipo === 'array') && tempOptions.length > 0) {
            const optionsPayload = tempOptions.map((opt, i) => ({
              id_pregunta: newPregId,
              etiqueta: opt.etiqueta,
              valor: opt.valor,
              orden: opt.orden || (i + 1)
            }))
            const { error: optErr } = await supabase.from('opciones_pregunta').insert(optionsPayload)
            if (optErr) throw optErr
          }
        }

        await reloadSection(seccionIdNum)
      }

      setIsPreguntaModalOpen(false)
      showNotification(id ? "Pregunta editada con éxito" : "Pregunta agregada con éxito")
    } catch (err) {
      console.error("Error saving question:", err)
      showNotification("Error al guardar la pregunta: " + err.message, "error")
    }
  }

  // --- DYNAMIC MODAL OPTIONS FOR OPTIONS/ARRAY ---
  const handleAddTempOption = () => {
    setTempOptions(prev => [
      ...prev,
      { id: Date.now(), etiqueta: '', valor: '', orden: prev.length + 1 }
    ])
  }

  const handleUpdateTempOption = (tempId, field, value) => {
    setTempOptions(prev => prev.map(o => {
      if (o.id === tempId) {
        const updated = { ...o, [field]: value }
        // Auto convert etiqueta to alphanumeric value
        if (field === 'etiqueta' && !o.valor) {
          updated.valor = value.toLowerCase().replace(/[^a-z0-9]/g, '_')
        }
        return updated
      }
      return o
    }))
  }

  const handleRemoveTempOption = (tempId) => {
    setTempOptions(prev => prev.filter(o => o.id !== tempId))
  }

  // --- INLINE OPTIONS CRUD FOR CARDS ---
  const handleToggleOptionsExpand = (pregId) => {
    setExpandedPreguntas(prev => ({
      ...prev,
      [pregId]: !prev[pregId]
    }))
    // Initialize temporary inputs for inline choices
    if (!newInlineOption[pregId]) {
      setNewInlineOption(prev => ({
        ...prev,
        [pregId]: { etiqueta: '', valor: '', orden: '' }
      }))
    }
  }

  const handleAddInlineOption = async (pregId) => {
    const input = newInlineOption[pregId]
    if (!input || !input.etiqueta) return

    const label = input.etiqueta
    const val = input.valor || label.toLowerCase().replace(/[^a-z0-9]/g, '_')
    const ord = parseInt(input.orden) || 1

    try {
      if (usingMockData) {
        setPreguntas(prev => prev.map(p => {
          if (p.id === pregId) {
            return {
              ...p,
              opciones_pregunta: [
                ...(p.opciones_pregunta || []),
                { id: Date.now(), id_pregunta: pregId, etiqueta: label, valor: val, orden: ord }
              ].sort((a, b) => a.orden - b.orden)
            }
          }
          return p
        }))
      } else {
        const { error: insErr } = await supabase
          .from('opciones_pregunta')
          .insert({ id_pregunta: pregId, etiqueta: label, valor: val, orden: ord })

        if (insErr) throw insErr
        
        // Find corresponding question section and reload it
        const currentPreg = preguntas.find(p => p.id === pregId)
        if (currentPreg) await reloadSection(currentPreg.id_seccion)
      }

      // Reset inline inputs
      setNewInlineOption(prev => ({
        ...prev,
        [pregId]: { etiqueta: '', valor: '', orden: '' }
      }))
      showNotification("Opción agregada con éxito")
    } catch (err) {
      console.error("Error adding inline option:", err)
      showNotification("Error al guardar opción: " + err.message, "error")
    }
  }

  const handleRemoveInlineOption = async (pregId, optionId) => {
    try {
      if (usingMockData) {
        setPreguntas(prev => prev.map(p => {
          if (p.id === pregId) {
            return {
              ...p,
              opciones_pregunta: p.opciones_pregunta.filter(opt => opt.id !== optionId)
            }
          }
          return p
        }))
      } else {
        const { error: delErr } = await supabase
          .from('opciones_pregunta')
          .delete()
          .eq('id', optionId)

        if (delErr) throw delErr

        const currentPreg = preguntas.find(p => p.id === pregId)
        if (currentPreg) await reloadSection(currentPreg.id_seccion)
      }
      showNotification("Opción eliminada con éxito")
    } catch (err) {
      console.error("Error deleting option:", err)
      showNotification("Error al eliminar opción: " + err.message, "error")
    }
  }

  // --- FILTERS LOGIC ---
  const activeQuestionsPerSeccion = (secId) => {
    return preguntas.filter(p => p.id_seccion === secId && p.activa).length
  }

  const filteredPreguntas = preguntas.filter(p => {
    if (p.id_seccion !== selectedSeccionId) return false
    
    // search text / code
    const matchesSearch = p.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.texto.toLowerCase().includes(searchTerm.toLowerCase())
    if (!matchesSearch) return false

    // type filter
    if (typeFilter !== 'all' && p.tipo !== typeFilter) return false

    // inactive filter
    if (!showInactive && !p.activa) return false

    return true
  }).sort((a, b) => a.orden - b.orden)

  // Auth Guard / Access Denied States
  if (authLoading) {
    return (
      <div className="bg-surface-container-low min-h-screen flex flex-col justify-center items-center gap-md">
        <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
        <p className="font-headline-md text-headline-md text-on-surface">Cargando perfil...</p>
      </div>
    )
  }

  if (!authProfile || !isAdmin) {
    return (
      <div className="bg-background text-on-surface min-h-screen flex flex-col selection:bg-error-container">
        <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface shadow-custom-sm border-b border-outline-variant">
          <span className="font-headline-md text-headline-md font-bold text-primary">Municipal Guardian</span>
          <button 
            onClick={() => navigate('/login')}
            className="bg-primary text-on-primary px-lg py-sm rounded-xl font-label-md text-label-md hover:bg-primary-container transition-all"
          >
            Iniciar Sesión
          </button>
        </header>

        <main className="flex-grow flex items-center justify-center px-margin-mobile pt-24 pb-12">
          <div className="w-full max-w-[500px] bg-surface-container-lowest rounded-2xl shadow-custom-md border border-outline-variant p-8 md:p-12 text-center space-y-6">
            <div className="w-20 h-20 bg-error-container text-error rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[40px]">gpp_bad</span>
            </div>
            <h1 className="font-display text-display text-error">Acceso Denegado</h1>
            <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
              Esta sección está reservada exclusivamente para administradores del sistema. Comuníquese con la mesa de ayuda si considera que esto es un error.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/')} 
                className="bg-primary text-on-primary px-xl h-12 rounded-lg font-label-md text-label-md hover:bg-primary-container transition-all flex items-center justify-center gap-sm cursor-pointer border-none"
              >
                <span className="material-symbols-outlined text-[20px]">home</span>
                Volver al Inicio
              </button>
              <button 
                onClick={() => navigate(-1)} 
                className="bg-surface-container-high text-on-surface-variant px-xl h-12 rounded-lg font-label-md text-label-md hover:bg-surface-container-highest transition-all flex items-center justify-center gap-sm cursor-pointer border-none"
              >
                Regresar
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-low text-on-surface min-h-screen flex flex-col">
      <SlideBar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

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

      {/* Header */}
      <header className="fixed top-0 left-0 w-full z-45 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface shadow-custom-sm border-b border-outline-variant md:pl-72">
        <div className="flex items-center gap-md">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors bg-transparent border-none cursor-pointer"
            title="Abrir menú"
          >
            menu
          </button>
          <div className="flex items-center gap-sm">
            <span className="font-headline-md text-headline-md font-bold text-primary">Configuración de Preguntas</span>
          </div>
        </div>

        <div className="flex items-center gap-md">
          {usingMockData && (
            <div className="bg-tertiary-container text-on-tertiary-container text-[12px] font-semibold px-3 py-1.5 rounded-full flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px] animate-pulse">cloud_off</span>
              <span>Modo Demostración</span>
            </div>
          )}
          <button 
            onClick={() => loadData(selectedSeccionId)}
            className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors bg-transparent border-none cursor-pointer"
            title="Recargar"
          >
            refresh
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="md:ml-64 pt-24 pb-32 px-margin-mobile md:px-margin-desktop flex flex-col gap-lg max-w-7xl mx-auto w-full flex-grow">
        
        {/* Filters Top Bar */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-custom-sm p-md flex flex-col md:flex-row items-center justify-between gap-md">
          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">
              search
            </span>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
              placeholder="Buscar por código o texto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-md w-full md:w-auto">
            {/* Type dropdown filter */}
            <div className="flex items-center gap-xs">
              <span className="font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Tipo:</span>
              <select
                className="bg-surface-container rounded-xl border border-outline-variant/30 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">Todos los tipos</option>
                <option value="texto">Texto</option>
                <option value="numero">Número</option>
                <option value="boolean">Sí / No</option>
                <option value="opcion">Opción Única</option>
                <option value="array">Opción Múltiple</option>
              </select>
            </div>

            {/* Inactive toggle */}
            <label className="flex items-center gap-xs select-none cursor-pointer">
              <input 
                type="checkbox" 
                className="rounded text-primary border-outline-variant/50 focus:ring-primary" 
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              <span className="font-label-md text-label-md text-on-surface-variant">Mostrar inactivas</span>
            </label>
          </div>
        </section>

        {/* Double Column Layout */}
        <div className="flex flex-col md:flex-row gap-lg items-start">
          
          {/* Left Panel: Sections Sidebar */}
          <aside className="w-full md:w-80 flex flex-col gap-md">
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-custom-sm p-md space-y-md">
              <div className="flex items-center justify-between">
                <span className="font-label-md text-label-md font-bold text-outline uppercase tracking-wider">Secciones</span>
                <button
                  onClick={() => {
                    setSeccionForm({ id: null, nombre: '', orden: (secciones.length + 1).toString() })
                    setIsSeccionModalOpen(true)
                  }}
                  className="text-primary hover:bg-primary/10 p-1.5 rounded-lg text-xs font-bold transition-all border-none bg-transparent cursor-pointer flex items-center gap-xs"
                  title="Nueva Sección"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Nueva
                </button>
              </div>

              {loading ? (
                <div className="py-lg text-center">
                  <span className="material-symbols-outlined text-[32px] animate-spin text-primary">sync</span>
                </div>
              ) : (
                <div className="flex flex-col gap-sm">
                  {secciones.map(sec => {
                    const isSelected = selectedSeccionId === sec.id
                    const count = activeQuestionsPerSeccion(sec.id)
                    return (
                      <button
                        key={sec.id}
                        onClick={() => setSelectedSeccionId(sec.id)}
                        className={`w-full flex items-center justify-between px-md py-3 rounded-xl text-left border-none cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary text-on-primary font-bold shadow-custom-sm'
                            : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        <div className="flex items-center gap-xs truncate">
                          <span className="text-[12px] font-bold opacity-60">#{sec.orden}</span>
                          <span className="font-label-md text-label-md truncate">{sec.nombre}</span>
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                          isSelected ? 'bg-on-primary text-primary' : 'bg-surface-container-highest text-on-surface-variant'
                        }`}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* Right Panel: Preguntas List */}
          <section className="flex-grow w-full flex flex-col gap-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md font-bold text-primary">
                {secciones.find(s => s.id === selectedSeccionId)?.nombre || 'Preguntas de la sección'}
              </h2>
              <button 
                onClick={handleOpenNewPregunta}
                className="bg-primary text-on-primary px-lg py-sm rounded-xl font-label-md text-label-md flex items-center gap-xs hover:bg-primary-container transition-all active:scale-95 cursor-pointer border-none shadow-custom-sm"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Nueva Pregunta
              </button>
            </div>

            {loading ? (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-xl text-center space-y-md">
                <span className="material-symbols-outlined text-[40px] animate-spin text-primary">sync</span>
                <p className="font-body-md text-body-md text-on-surface-variant">Cargando preguntas...</p>
              </div>
            ) : filteredPreguntas.length === 0 ? (
              <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-xl text-center space-y-sm">
                <span className="material-symbols-outlined text-[48px] text-outline">quiz</span>
                <p className="font-headline-md text-headline-md text-on-surface mt-sm">Sin preguntas</p>
                <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
                  No hay preguntas configuradas en esta sección o no coinciden con los filtros aplicados.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-md">
                {filteredPreguntas.map(preg => {
                  const isExpanded = !!expandedPreguntas[preg.id]
                  const typeInfo = TYPE_CONFIG[preg.tipo] || { label: 'Texto', class: 'bg-gray-100 text-gray-800' }
                  const optionsList = preg.opciones_pregunta || []

                  return (
                    <div 
                      key={preg.id} 
                      className={`bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-md shadow-custom-sm transition-all flex flex-col gap-md ${
                        !preg.activa ? 'opacity-55' : ''
                      }`}
                    >
                      {/* Top row: Code + Type badge + active toggle */}
                      <div className="flex items-start justify-between gap-sm">
                        <div className="flex items-center gap-sm flex-wrap">
                          <span className="bg-primary-container text-on-primary-container font-mono text-[12px] font-bold px-2 py-0.5 rounded-lg">
                            {preg.codigo}
                          </span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${typeInfo.class}`}>
                            {typeInfo.label}
                          </span>
                          {preg.requerida && (
                            <span className="bg-error/10 text-error text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                              Requerida
                            </span>
                          )}
                          <span className="text-[12px] text-outline font-semibold">
                            Orden: {preg.orden}
                          </span>
                        </div>

                        {/* Active toggle */}
                        <button 
                          onClick={() => handleToggleActiva(preg)}
                          className={`material-symbols-outlined text-[24px] cursor-pointer transition-colors bg-transparent border-none ${
                            preg.activa ? 'text-primary hover:text-primary/70' : 'text-outline hover:text-on-surface-variant'
                          }`}
                          title={preg.activa ? "Desactivar pregunta" : "Activar pregunta"}
                        >
                          {preg.activa ? 'toggle_on' : 'toggle_off'}
                        </button>
                      </div>

                      {/* Middle: text */}
                      <p className="font-body-md text-body-md text-on-surface font-medium leading-relaxed">
                        {preg.texto}
                      </p>

                      {/* Bottom actions */}
                      <div className="flex flex-wrap items-center justify-between border-t border-outline-variant/30 pt-sm gap-sm">
                        <div className="flex items-center gap-xs">
                          <button
                            onClick={() => handleOpenEditPregunta(preg)}
                            className="text-primary hover:bg-primary/5 px-3 py-1.5 rounded-xl font-label-md text-label-md transition-all flex items-center gap-xs border-none bg-transparent cursor-pointer font-semibold"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            Editar
                          </button>

                          {(preg.tipo === 'opcion' || preg.tipo === 'array') && (
                            <button
                              onClick={() => handleToggleOptionsExpand(preg.id)}
                              className="text-primary hover:bg-primary/5 px-3 py-1.5 rounded-xl font-label-md text-label-md transition-all flex items-center gap-xs border-none bg-transparent cursor-pointer font-semibold"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                {isExpanded ? 'expand_less' : 'expand_more'}
                              </span>
                              Opciones ({optionsList.length})
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Options Inline section */}
                      {isExpanded && (preg.tipo === 'opcion' || preg.tipo === 'array') && (
                        <div className="bg-surface-container/40 rounded-xl p-sm border border-outline-variant/35 space-y-sm mt-xs">
                          <span className="block font-label-sm text-label-sm font-bold text-outline uppercase tracking-wider px-2">
                            Opciones de respuesta
                          </span>

                          {optionsList.length === 0 ? (
                            <p className="text-xs text-on-surface-variant/70 italic px-2">
                              No hay opciones agregadas aún. Use el formulario debajo para agregar una.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-xs p-1">
                              {optionsList.map(opt => (
                                <div 
                                  key={opt.id}
                                  className="flex items-center gap-1.5 bg-surface-container-lowest border border-outline-variant/30 px-2.5 py-1 rounded-lg text-xs font-semibold text-on-surface shadow-custom-sm"
                                >
                                  <span className="text-outline text-[10px] font-bold">#{opt.orden}</span>
                                  <span>{opt.etiqueta}</span>
                                  <span className="opacity-50 text-[10px] font-mono">({opt.valor})</span>
                                  <button
                                    onClick={() => handleRemoveInlineOption(preg.id, opt.id)}
                                    className="material-symbols-outlined text-[14px] text-outline hover:text-error transition-colors bg-transparent border-none cursor-pointer"
                                    title="Quitar opción"
                                  >
                                    close
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Quick inline add option form */}
                          <div className="border-t border-outline-variant/20 pt-sm flex flex-col sm:flex-row gap-xs items-center px-1">
                            <input 
                              type="text"
                              required
                              placeholder="Etiqueta (Ej: Alto)"
                              className="w-full sm:w-auto flex-1 h-9 px-3 bg-surface-container rounded-lg border border-outline-variant/20 text-xs outline-none"
                              value={newInlineOption[preg.id]?.etiqueta || ''}
                              onChange={(e) => setNewInlineOption(prev => ({
                                ...prev,
                                [preg.id]: { ...prev[preg.id], etiqueta: e.target.value }
                              }))}
                            />
                            <input 
                              type="text"
                              placeholder="Valor (Opcional)"
                              className="w-full sm:w-32 h-9 px-3 bg-surface-container rounded-lg border border-outline-variant/20 text-xs outline-none font-mono"
                              value={newInlineOption[preg.id]?.valor || ''}
                              onChange={(e) => setNewInlineOption(prev => ({
                                ...prev,
                                [preg.id]: { ...prev[preg.id], valor: e.target.value }
                              }))}
                            />
                            <input 
                              type="number"
                              placeholder="Orden"
                              className="w-full sm:w-16 h-9 px-3 bg-surface-container rounded-lg border border-outline-variant/20 text-xs outline-none"
                              value={newInlineOption[preg.id]?.orden || ''}
                              onChange={(e) => setNewInlineOption(prev => ({
                                ...prev,
                                [preg.id]: { ...prev[preg.id], orden: e.target.value }
                              }))}
                            />
                            <button
                              onClick={() => handleAddInlineOption(preg.id)}
                              disabled={!newInlineOption[preg.id]?.etiqueta}
                              className="w-full sm:w-auto bg-primary text-on-primary px-3 h-9 rounded-lg text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-xs cursor-pointer border-none"
                            >
                              <span className="material-symbols-outlined text-[16px]">add</span>
                              Agregar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </div>
      </main>

      {/* MODAL: FormSeccion */}
      {isSeccionModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-custom-md border border-outline-variant w-[95%] max-w-[450px] p-6 space-y-4">
            <div>
              <h2 className="text-headline-md font-bold text-primary">Agregar Nueva Sección</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
                Cree una nueva sección en el autodiagnóstico. Las preguntas se agruparán en este módulo.
              </p>
            </div>

            <form onSubmit={handleSaveSeccion} className="w-full space-y-4">
              <div className="space-y-2">
                <label className="block text-label-md text-on-surface font-semibold" htmlFor="secNombre">
                  Nombre de la Sección
                </label>
                <input
                  id="secNombre"
                  type="text"
                  required
                  placeholder="Ej: Participación Ciudadana"
                  className="w-full h-12 px-4 bg-surface-container rounded-xl border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  value={seccionForm.nombre}
                  onChange={(e) => setSeccionForm(prev => ({ ...prev, nombre: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="block text-label-md text-on-surface font-semibold" htmlFor="secOrden">
                  Orden de Visualización
                </label>
                <input
                  id="secOrden"
                  type="number"
                  required
                  placeholder="Ej: 5"
                  className="w-full h-12 px-4 bg-surface-container rounded-xl border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary text-sm"
                  value={seccionForm.orden}
                  onChange={(e) => setSeccionForm(prev => ({ ...prev, orden: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsSeccionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high text-label-md transition-colors border-none bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-label-md font-bold transition-all active:scale-95 border-none cursor-pointer"
                >
                  Crear Sección
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FormPregunta */}
      {isPreguntaModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl shadow-custom-md border border-outline-variant w-[95%] max-w-[650px] p-6 space-y-4 my-8">
            <div>
              <h2 className="text-headline-md font-bold text-primary">
                {preguntaForm.id ? 'Editar Pregunta' : 'Nueva Pregunta'}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
                Configure las propiedades de la pregunta técnica para los municipios.
              </p>
            </div>

            <form onSubmit={handleSavePregunta} className="w-full space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                
                {/* Seccion */}
                <div className="space-y-sm">
                  <label className="block text-label-md text-on-surface font-semibold" htmlFor="pregSec">
                    Sección Asignada
                  </label>
                  <select
                    id="pregSec"
                    required
                    className="w-full h-12 px-4 bg-surface-container rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    value={preguntaForm.id_seccion}
                    onChange={(e) => setPreguntaForm(prev => ({ ...prev, id_seccion: e.target.value }))}
                  >
                    <option value="" disabled>Seleccione sección...</option>
                    {secciones.map(sec => (
                      <option key={sec.id} value={sec.id}>{sec.nombre}</option>
                    ))}
                  </select>
                </div>

                {/* Código */}
                <div className="space-y-sm">
                  <label className="block text-label-md text-on-surface font-semibold" htmlFor="pregCod">
                    Código Único (Alfanumérico)
                  </label>
                  <input
                    id="pregCod"
                    type="text"
                    required
                    placeholder="Ej: P1_S5"
                    className="w-full h-12 px-4 bg-surface-container rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-primary font-mono uppercase"
                    value={preguntaForm.codigo}
                    onChange={(e) => setPreguntaForm(prev => ({ ...prev, codigo: e.target.value.toUpperCase() }))}
                  />
                </div>

                {/* Tipo de pregunta */}
                <div className="space-y-sm">
                  <label className="block text-label-md text-on-surface font-semibold" htmlFor="pregTipo">
                    Tipo de Pregunta
                  </label>
                  <select
                    id="pregTipo"
                    required
                    className="w-full h-12 px-4 bg-surface-container rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                    value={preguntaForm.tipo}
                    onChange={(e) => setPreguntaForm(prev => ({ ...prev, tipo: e.target.value }))}
                  >
                    <option value="texto">Texto</option>
                    <option value="numero">Número</option>
                    <option value="boolean">Sí / No (Booleano)</option>
                    <option value="opcion">Opción Única</option>
                    <option value="array">Opción Múltiple (Lista)</option>
                  </select>
                </div>

                {/* Orden */}
                <div className="space-y-sm">
                  <label className="block text-label-md text-on-surface font-semibold" htmlFor="pregOrden">
                    Orden de Visualización
                  </label>
                  <input
                    id="pregOrden"
                    type="number"
                    required
                    placeholder="Ej: 1"
                    className="w-full h-12 px-4 bg-surface-container rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    value={preguntaForm.orden}
                    onChange={(e) => setPreguntaForm(prev => ({ ...prev, orden: e.target.value }))}
                  />
                </div>

              </div>

              {/* Texto de la pregunta */}
              <div className="space-y-sm">
                <label className="block text-label-md text-on-surface font-semibold" htmlFor="pregTexto">
                  Texto o Enunciado de la Pregunta
                </label>
                <textarea
                  id="pregTexto"
                  required
                  rows="3"
                  placeholder="Escriba la pregunta completa..."
                  className="w-full p-4 bg-surface-container rounded-xl border border-outline-variant text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  value={preguntaForm.texto}
                  onChange={(e) => setPreguntaForm(prev => ({ ...prev, texto: e.target.value }))}
                />
              </div>

              {/* Checkboxes: Requerida & Activa */}
              <div className="flex gap-lg items-center py-2">
                <label className="flex items-center gap-xs select-none cursor-pointer">
                  <input 
                    type="checkbox"
                    className="rounded text-primary border-outline-variant/50 focus:ring-primary"
                    checked={preguntaForm.requerida}
                    onChange={(e) => setPreguntaForm(prev => ({ ...prev, requerida: e.target.checked }))}
                  />
                  <span className="font-label-md text-label-md text-on-surface font-semibold">Respuesta Obligatoria</span>
                </label>

                <label className="flex items-center gap-xs select-none cursor-pointer">
                  <input 
                    type="checkbox"
                    className="rounded text-primary border-outline-variant/50 focus:ring-primary"
                    checked={preguntaForm.activa}
                    onChange={(e) => setPreguntaForm(prev => ({ ...prev, activa: e.target.checked }))}
                  />
                  <span className="font-label-md text-label-md text-on-surface font-semibold">Pregunta Activa</span>
                </label>
              </div>

              {/* Dynamic options when type is 'opcion' or 'array' */}
              {(preguntaForm.tipo === 'opcion' || preguntaForm.tipo === 'array') && (
                <div className="bg-surface-container/50 border border-outline-variant/30 rounded-xl p-md space-y-md">
                  <div className="flex justify-between items-center">
                    <span className="font-label-md text-label-md font-bold text-primary uppercase tracking-wider">
                      Opciones Dinámicas de Respuesta
                    </span>
                    <button
                      type="button"
                      onClick={handleAddTempOption}
                      className="text-primary hover:bg-primary/10 px-3 py-1 rounded-xl text-xs font-bold transition-all border-none bg-transparent cursor-pointer flex items-center gap-xs"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      Agregar Opción
                    </button>
                  </div>

                  {tempOptions.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/75 italic">
                      No hay opciones añadidas. Las preguntas de opción/múltiple requieren al menos una opción para ser respondidas correctamente.
                    </p>
                  ) : (
                    <div className="space-y-sm max-h-48 overflow-y-auto pr-1">
                      {tempOptions.map((opt, i) => (
                        <div key={opt.id} className="flex gap-sm items-center">
                          <input 
                            type="text"
                            required
                            placeholder="Etiqueta visible"
                            className="flex-1 h-10 px-3 bg-surface-container rounded-lg border border-outline-variant/20 text-xs"
                            value={opt.etiqueta}
                            onChange={(e) => handleUpdateTempOption(opt.id, 'etiqueta', e.target.value)}
                          />
                          <input 
                            type="text"
                            placeholder="Valor BD"
                            className="w-32 h-10 px-3 bg-surface-container rounded-lg border border-outline-variant/20 text-xs font-mono"
                            value={opt.valor}
                            onChange={(e) => handleUpdateTempOption(opt.id, 'valor', e.target.value)}
                          />
                          <input 
                            type="number"
                            placeholder="Orden"
                            className="w-16 h-10 px-3 bg-surface-container rounded-lg border border-outline-variant/20 text-xs"
                            value={opt.orden || ''}
                            onChange={(e) => handleUpdateTempOption(opt.id, 'orden', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveTempOption(opt.id)}
                            className="material-symbols-outlined text-outline hover:text-error transition-colors p-2 bg-transparent border-none cursor-pointer"
                          >
                            delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-sm justify-end border-t border-outline-variant/30 pt-md">
                <button
                  type="button"
                  onClick={() => setIsPreguntaModalOpen(false)}
                  className="px-lg py-sm rounded-xl text-on-surface-variant hover:bg-surface-container-high text-label-md transition-colors border-none bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-lg py-sm rounded-xl bg-primary text-on-primary hover:bg-primary-container text-label-md font-bold transition-all active:scale-95 border-none cursor-pointer"
                >
                  Guardar Pregunta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
