import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import SlideBar from '../components/SlideBar'

export default function LineasTematicasConfig() {
  const navigate = useNavigate()
  const { user: authUser, profile: authProfile, loading: authLoading, isAdmin } = useAuth()

  // Layout States
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Data States
  const [lineas, setLineas] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all') // 'all' | 'active' | 'inactive'

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLinea, setEditingLinea] = useState(null) // null for create, object for edit
  const [formData, setFormData] = useState({ nombre: '', activa: true })
  const [saving, setSaving] = useState(false)

  // Notification Toast
  const [notification, setNotification] = useState(null)
  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  // Load lineas tematicas
  const loadLineas = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fetchErr } = await supabase
        .from('lista_lineas_tematicas')
        .select('*')
        .order('id', { ascending: true })

      if (fetchErr) throw fetchErr
      setLineas(data || [])
    } catch (err) {
      console.error('Error cargando líneas temáticas:', err)
      setError(err.message)
      showNotification('Error al cargar líneas temáticas: ' + err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadLineas()
    }
  }, [authLoading, isAdmin])

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingLinea(null)
    setFormData({ nombre: '', activa: true })
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const handleOpenEdit = (linea) => {
    setEditingLinea(linea)
    setFormData({ nombre: linea.nombre, activa: linea.activa ?? true })
    setIsModalOpen(true)
  }

  // Save (Create / Edit)
  const handleSave = async (e) => {
    e.preventDefault()
    if (!formData.nombre.trim()) return
    setSaving(true)

    try {
      if (editingLinea) {
        // Update
        const { error: updErr } = await supabase
          .from('lista_lineas_tematicas')
          .update({
            nombre: formData.nombre.trim(),
            activa: formData.activa
          })
          .eq('id', editingLinea.id)

        if (updErr) throw updErr

        setLineas(prev => prev.map(l => l.id === editingLinea.id ? { ...l, nombre: formData.nombre.trim(), activa: formData.activa } : l))
        showNotification('Línea temática actualizada correctamente')
      } else {
        // Insert
        const { data: newLinea, error: insErr } = await supabase
          .from('lista_lineas_tematicas')
          .insert({
            nombre: formData.nombre.trim(),
            activa: formData.activa
          })
          .select()
          .maybeSingle()

        if (insErr) throw insErr
        if (newLinea) {
          setLineas(prev => [...prev, newLinea])
        }
        showNotification('Línea temática creada exitosamente')
      }
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error guardando línea temática:', err)
      showNotification('Error al guardar: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  // Toggle Activa status (No physical deletion)
  const handleToggleActiva = async (linea) => {
    const nextState = !linea.activa
    if (!nextState) {
      const confirm = window.confirm(
        `¿Está seguro de desactivar la línea "${linea.nombre}"?\nNo aparecerá para ser adoptada por nuevos municipios en el Plan de Acción, pero se mantendrá en el histórico.`
      )
      if (!confirm) return
    }

    try {
      const { error: updErr } = await supabase
        .from('lista_lineas_tematicas')
        .update({ activa: nextState })
        .eq('id', linea.id)

      if (updErr) throw updErr

      setLineas(prev => prev.map(l => l.id === linea.id ? { ...l, activa: nextState } : l))
      showNotification(`Línea temática ${nextState ? 'activada' : 'desactivada'} con éxito`)
    } catch (err) {
      console.error('Error actualizando estado de línea:', err)
      showNotification('Error al cambiar estado: ' + err.message, 'error')
    }
  }

  // Filtered lineas
  const filteredLineas = lineas.filter(linea => {
    const matchesSearch = linea.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || linea.id.toString().includes(searchTerm)
    const matchesStatus =
      statusFilter === 'all' ? true :
      statusFilter === 'active' ? linea.activa !== false :
      linea.activa === false
    return matchesSearch && matchesStatus
  })

  // Role Access Guard
  if (!authLoading && (!authProfile || !isAdmin)) {
    return (
      <div className="flex h-screen bg-surface items-center justify-center p-6">
        <div className="text-center max-w-md bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant shadow-custom-md">
          <span className="material-symbols-outlined text-error text-[48px] mb-4">block</span>
          <h2 className="text-title-lg font-bold text-on-surface mb-2">Acceso Restringido</h2>
          <p className="text-body-md text-on-surface-variant mb-6">
            Esta sección es exclusiva para Administradores de la plataforma MUNA.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold cursor-pointer hover:bg-primary-container transition-all"
          >
            Volver al Inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface text-on-surface">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-custom-md flex items-center gap-3 animate-fade-in border ${
          notification.type === 'error'
            ? 'bg-error-container text-on-error-container border-error/20'
            : 'bg-primary-container text-on-primary-container border-primary/20'
        }`}>
          <span className="material-symbols-outlined text-[20px]">
            {notification.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Sidebar Component */}
      <SlideBar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden md:ml-64">
        
        {/* Top Header */}
        <header className="h-16 border-b border-outline-variant/30 flex items-center justify-between px-4 sm:px-8 bg-surface-container-lowest flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-xl text-on-surface-variant hover:bg-surface-container cursor-pointer border-none bg-transparent"
              title="Alternar menú lateral"
            >
              <span className="material-symbols-outlined text-[24px]">menu</span>
            </button>
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-[26px]">category</span>
              <div>
                <h1 className="text-title-md font-bold text-on-surface leading-none">
                  Catálogo de Líneas Temáticas
                </h1>
                <p className="text-xs text-on-surface-variant mt-0.5 hidden sm:block">
                  Gestión del catálogo maestro de líneas de acción MUNA
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreate}
              className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2 rounded-xl font-label-md text-label-md font-bold flex items-center gap-2 shadow-custom-sm transition-all active:scale-95 cursor-pointer border-none"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              <span className="hidden sm:inline">Nueva Línea Temática</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          </div>
        </header>

        {/* Scrollable Container */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
          
          {/* Metrics / Overview Card */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-custom-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Total de Líneas</span>
                <p className="text-2xl font-bold text-on-surface mt-1">{lineas.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[24px]">format_list_bulleted</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-custom-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Líneas Activas</span>
                <p className="text-2xl font-bold text-primary mt-1">
                  {lineas.filter(l => l.activa !== false).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                <span className="material-symbols-outlined text-[24px]">check_circle</span>
              </div>
            </div>

            <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/30 shadow-custom-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Líneas Inactivas</span>
                <p className="text-2xl font-bold text-outline mt-1">
                  {lineas.filter(l => l.activa === false).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-outline">
                <span className="material-symbols-outlined text-[24px]">pause_circle</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/30 shadow-custom-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full sm:w-auto">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar línea temática por nombre o ID..."
                className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant/30 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs font-semibold text-on-surface-variant whitespace-nowrap">Estado:</span>
              <select
                className="bg-surface-container border border-outline-variant/30 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todas ({lineas.length})</option>
                <option value="active">Solo Activas ({lineas.filter(l => l.activa !== false).length})</option>
                <option value="inactive">Solo Inactivas ({lineas.filter(l => l.activa === false).length})</option>
              </select>
            </div>
          </div>

          {/* Content Listing */}
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 space-y-4">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-on-surface-variant">Cargando catálogo de líneas temáticas...</p>
            </div>
          ) : error ? (
            <div className="bg-error-container/30 border border-error/30 p-6 rounded-2xl text-center space-y-2">
              <span className="material-symbols-outlined text-error text-[36px]">error</span>
              <p className="text-sm font-bold text-on-error-container">{error}</p>
              <button
                onClick={loadLineas}
                className="mt-2 px-4 py-2 bg-primary text-on-primary rounded-xl text-xs font-bold cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : filteredLineas.length === 0 ? (
            <div className="bg-surface-container-lowest p-12 rounded-2xl border border-outline-variant/30 text-center space-y-3">
              <span className="material-symbols-outlined text-outline text-[48px]">search_off</span>
              <h3 className="text-title-sm font-bold text-on-surface">No se encontraron líneas temáticas</h3>
              <p className="text-body-sm text-on-surface-variant max-w-sm mx-auto">
                No hay resultados para los filtros seleccionados o el catálogo está vacío.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLineas.map((linea) => {
                const isActiva = linea.activa !== false
                return (
                  <div
                    key={linea.id}
                    className={`bg-surface-container-lowest p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 shadow-custom-sm hover:shadow-custom-md ${
                      isActiva ? 'border-outline-variant/40' : 'border-outline-variant/20 opacity-70 bg-surface-container/20'
                    }`}
                  >
                    <div>
                      {/* Top Header of Card */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-surface-container-high text-on-surface-variant">
                            #{linea.id}
                          </span>
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            isActiva
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                              : 'bg-surface-container-high text-outline'
                          }`}>
                            {isActiva ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>

                        {/* Toggle switch button */}
                        <button
                          onClick={() => handleToggleActiva(linea)}
                          className={`material-symbols-outlined text-[24px] cursor-pointer transition-colors bg-transparent border-none ${
                            isActiva ? 'text-primary hover:text-primary/70' : 'text-outline hover:text-on-surface-variant'
                          }`}
                          title={isActiva ? "Desactivar línea" : "Activar línea"}
                        >
                          {isActiva ? 'toggle_on' : 'toggle_off'}
                        </button>
                      </div>

                      {/* Line Name */}
                      <h3 className="text-body-lg font-bold text-on-surface leading-snug">
                        {linea.nombre}
                      </h3>
                      
                      {linea.created_at && (
                        <p className="text-[11px] text-outline mt-2 font-mono">
                          Creada: {new Date(linea.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="border-t border-outline-variant/20 pt-3 flex items-center justify-between">
                      <button
                        onClick={() => handleOpenEdit(linea)}
                        className="text-primary hover:bg-primary/5 px-3 py-1.5 rounded-xl font-label-md text-label-md transition-all flex items-center gap-1.5 border-none bg-transparent cursor-pointer font-semibold"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                        Editar / Renombrar
                      </button>

                      <button
                        onClick={() => handleToggleActiva(linea)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border-none bg-transparent cursor-pointer transition-colors ${
                          isActiva ? 'text-error/80 hover:bg-error/10 hover:text-error' : 'text-primary hover:bg-primary/10'
                        }`}
                      >
                        {isActiva ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

        </main>
      </div>

      {/* MODAL: Create / Edit Linea Tematica */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-custom-md border border-outline-variant w-[95%] max-w-[500px] p-6 space-y-4">
            <div>
              <h2 className="text-headline-md font-bold text-primary">
                {editingLinea ? 'Editar Línea Temática' : 'Nueva Línea Temática'}
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
                {editingLinea
                  ? 'Modifique el nombre o estado de la línea temática en el catálogo maestro.'
                  : 'Agregue una nueva temática que los municipios podrán adoptar en su Plan de Acción.'}
              </p>
            </div>

            <form onSubmit={handleSave} className="w-full space-y-4">
              <div className="space-y-2">
                <label className="block text-label-md text-on-surface font-semibold" htmlFor="lineaNombre">
                  Nombre de la Línea Temática
                </label>
                <textarea
                  id="lineaNombre"
                  required
                  rows="3"
                  placeholder="Ej: Primera Infancia y Salud Materna"
                  className="w-full p-3 bg-surface-container rounded-xl border border-outline-variant focus:outline-none focus:ring-1 focus:ring-primary text-sm resize-none"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  autoFocus
                />
              </div>

              <div className="py-1">
                <label className="flex items-center gap-2 select-none cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded text-primary border-outline-variant/50 focus:ring-primary"
                    checked={formData.activa}
                    onChange={(e) => setFormData(prev => ({ ...prev, activa: e.target.checked }))}
                  />
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    Línea Temática Activa (disponible para selección)
                  </span>
                </label>
              </div>

              <div className="flex gap-3 justify-end pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high text-label-md transition-colors border-none bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.nombre.trim()}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-label-md font-bold transition-all active:scale-95 border-none cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : (editingLinea ? 'Guardar Cambios' : 'Crear Línea')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
