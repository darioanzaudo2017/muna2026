import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import SlideBar from '../components/SlideBar'

export default function UserManagement() {
  const navigate = useNavigate()
  const { user: authUser, profile: authProfile, loading: authLoading, isAdmin } = useAuth()

  // Sidebar Mobile State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // States specified in prompt
  const [users, setUsers] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [muniToAssign, setMuniToAssign] = useState('')
  const [notification, setNotification] = useState(null)

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: muniData, error: muniErr } = await supabase
        .from('municipios')
        .select('id, nombre')
        .order('nombre')

      if (muniErr) throw muniErr

      const { data: userData, error: userErr } = await supabase
        .from('profiles')
        .select('*, user_municipios(idmunicipio, municipios(id, nombre))')
        .order('created_at', { ascending: false })

      if (userErr) throw userErr

      setMunicipios(muniData || [])
      setUsers(userData || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAdmin) {
      loadData()
    }
  }, [authLoading, isAdmin])

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'tecnico_municipal' : 'admin'
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId)

      if (updateErr) throw updateErr

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      showNotification(`Rol actualizado a ${newRole === 'admin' ? 'Administrador' : 'Técnico Municipal'}`, 'success')
    } catch (err) {
      showNotification(err.message, 'error')
    }
  }

  const handleToggleActivo = async (userId, currentActivo, isCurrentUser) => {
    if (isCurrentUser) {
      showNotification('No puedes desactivar tu propio usuario', 'error')
      return
    }
    const newActivo = !currentActivo
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ activo: newActivo })
        .eq('id', userId)

      if (updateErr) throw updateErr

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, activo: newActivo } : u))
      showNotification(newActivo ? 'Usuario activado' : 'Usuario desactivado', 'success')
    } catch (err) {
      showNotification(err.message, 'error')
    }
  }

  const handleRemoveAssignment = async (userId, municipioId) => {
    try {
      const { error: deleteErr } = await supabase
        .from('user_municipios')
        .delete()
        .eq('user_id', userId)
        .eq('idmunicipio', municipioId)

      if (deleteErr) throw deleteErr

      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            user_municipios: u.user_municipios.filter(um => um.idmunicipio !== municipioId)
          }
        }
        return u
      }))
      showNotification('Asignación eliminada correctamente', 'success')
    } catch (err) {
      showNotification(err.message, 'error')
    }
  }

  const handleConfirmAssign = async (e) => {
    e.preventDefault()
    if (!muniToAssign || !selectedUserForAssign) return

    const municipioId = parseInt(muniToAssign)
    const selectedMuniDetails = municipios.find(m => m.id === municipioId)

    try {
      const { error: insertErr } = await supabase
        .from('user_municipios')
        .insert({ user_id: selectedUserForAssign.id, idmunicipio: municipioId })

      if (insertErr) throw insertErr

      setUsers(prev => prev.map(u => {
        if (u.id === selectedUserForAssign.id) {
          if (u.user_municipios.some(um => um.idmunicipio === municipioId)) return u
          return {
            ...u,
            user_municipios: [
              ...u.user_municipios,
              {
                idmunicipio: municipioId,
                municipios: { id: municipioId, nombre: selectedMuniDetails?.nombre || 'Municipio' }
              }
            ]
          }
        }
        return u
      }))

      setIsAssignModalOpen(false)
      setMuniToAssign('')
      showNotification('Municipio asignado correctamente', 'success')
    } catch (err) {
      showNotification(err.message, 'error')
    }
  }

  const filteredUsers = users.filter(u => {
    const matchesSearch = 
      (u.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
      (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    
    const matchesRole = 
      roleFilter === 'all' || 
      u.role === roleFilter

    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && u.activo) || 
      (statusFilter === 'inactive' && !u.activo)

    return matchesSearch && matchesRole && matchesStatus
  })

  // Stats calculation
  const totalUsers = users.length
  const adminUsersCount = users.filter(u => u.role === 'admin').length
  const tecnicoUsersCount = users.filter(u => u.role === 'tecnico_municipal').length
  const inactiveUsersCount = users.filter(u => !u.activo).length

  if (authLoading) {
    return (
      <div className="bg-surface-container-low min-h-screen flex flex-col justify-center items-center gap-4">
        <span className="material-symbols-outlined text-[48px] animate-spin text-primary">sync</span>
        <p className="font-headline-md text-headline-md text-on-surface">Cargando perfil...</p>
      </div>
    )
  }

  // Auth Guard: Not Admin
  if (!authProfile || !isAdmin) {
    return (
      <div className="bg-surface-container-low text-on-surface min-h-screen flex flex-col">
        <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-6 h-16 bg-surface shadow-sm border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl text-primary">Municipal Guardian</span>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="bg-primary text-on-primary px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
          >
            Iniciar Sesión
          </button>
        </header>

        <main className="flex-grow flex items-center justify-center p-6 pt-24">
          <div className="w-full max-w-[500px] bg-surface-container-lowest rounded-2xl shadow-md border border-outline-variant p-8 text-center space-y-6">
            <div className="w-20 h-20 bg-error-container text-on-error-container rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-[40px]">gpp_bad</span>
            </div>
            <h1 className="text-3xl font-bold text-on-surface">Acceso Denegado</h1>
            <p className="text-on-surface-variant leading-relaxed">
              Esta sección está reservada exclusivamente para administradores del sistema. Comuníquese con la mesa de ayuda si considera que esto es un error.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => navigate('/')} 
                className="bg-primary text-on-primary px-6 h-12 rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[20px]">home</span>
                Volver al Inicio
              </button>
              <button 
                onClick={() => navigate(-1)} 
                className="bg-surface-container-high text-on-surface-variant px-6 h-12 rounded-xl font-semibold hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2"
              >
                Regresar
              </button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Load Data Error Screen
  if (error) {
    return (
      <div className="bg-surface-container-low text-on-surface min-h-screen flex flex-col">
        <SlideBar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <header className="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-6 h-16 bg-surface shadow-sm border-b border-outline-variant md:pl-72">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors"
            >
              menu
            </button>
            <span className="font-bold text-xl text-primary">Gestión de Usuarios</span>
          </div>
        </header>
        <main className="md:ml-64 pt-24 pb-12 px-6 flex-grow flex flex-col justify-center items-center">
          <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant text-center max-w-[448px] w-full">
            <span className="material-symbols-outlined text-error-container text-[48px] bg-error-container text-on-error-container p-4 rounded-full mb-4">error</span>
            <h2 className="text-xl font-bold text-on-surface mb-2">Error al cargar datos</h2>
            <p className="text-on-surface-variant mb-6 text-sm">{error}</p>
            <button
              onClick={loadData}
              className="bg-primary text-on-primary px-6 py-2.5 rounded-xl font-medium hover:bg-primary/95 transition-all inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Reintentar
            </button>
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
        <div className={`fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-md border transition-all ${
          notification.type === 'error' 
            ? 'bg-error-container text-on-error-container border-outline-variant/30' 
            : 'bg-primary text-on-primary border-outline-variant/30'
        }`}>
          <span className="material-symbols-outlined">
            {notification.type === 'error' ? 'error' : 'check_circle'}
          </span>
          <span className="text-sm font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-6 h-16 bg-surface shadow-sm border-b border-outline-variant md:pl-72">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors bg-transparent border-none cursor-pointer"
            title="Abrir menú"
          >
            menu
          </button>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-surface-container transition-colors bg-transparent border-none cursor-pointer text-primary"
            title="Volver a Municipios"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xl text-primary">Gestión de Usuarios</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={loadData}
            className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors bg-transparent border-none cursor-pointer"
            title="Recargar datos"
          >
            refresh
          </button>
          <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-full">
            <span className="material-symbols-outlined text-primary">account_circle</span>
            <span className="text-sm font-semibold hidden sm:inline-block">
              {authProfile?.full_name || authUser?.email}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 pt-24 pb-32 px-6 max-w-7xl mx-auto w-full flex-grow">
        
        {/* Title and Intro */}
        <section className="mb-8">
          <h1 className="text-3xl font-bold text-on-surface">
            Control de Acceso y Operadores
          </h1>
          <p className="text-on-surface-variant mt-2 max-w-3xl">
            Gestione los permisos del sistema. Asigne a cada operador los municipios específicos cuya información está autorizado a registrar y auditar.
          </p>
        </section>

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[28px]">group</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Usuarios Totales</p>
              <h2 className="text-2xl font-bold text-on-surface">{totalUsers}</h2>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[28px]">shield_person</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Administradores</p>
              <h2 className="text-2xl font-bold text-on-surface">{adminUsersCount}</h2>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[28px]">badge</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Técnicos Municipales</p>
              <h2 className="text-2xl font-bold text-on-surface">{tecnicoUsersCount}</h2>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-5 border border-outline-variant/30 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-error-container text-on-error-container rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">block</span>
            </div>
            <div>
              <p className="text-xs text-on-surface-variant font-medium">Inactivos</p>
              <h2 className="text-2xl font-bold text-on-surface">{inactiveUsersCount}</h2>
            </div>
          </div>
        </section>

        {/* Filter Controls */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm p-4 mb-6 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="relative w-full lg:w-96">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-low rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-on-surface-variant whitespace-nowrap">Rol:</span>
              <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
                <button 
                  onClick={() => setRoleFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    roleFilter === 'all'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setRoleFilter('admin')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    roleFilter === 'admin'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Admin
                </button>
                <button 
                  onClick={() => setRoleFilter('tecnico_municipal')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    roleFilter === 'tecnico_municipal'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Técnico
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-on-surface-variant whitespace-nowrap">Estado:</span>
              <div className="flex bg-surface-container-low p-1 rounded-xl border border-outline-variant/30">
                <button 
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'all'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Todos
                </button>
                <button 
                  onClick={() => setStatusFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'active'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Activos
                </button>
                <button 
                  onClick={() => setStatusFilter('inactive')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    statusFilter === 'inactive'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  Inactivos
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Users List Container */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center space-y-4">
              <span className="material-symbols-outlined text-[40px] animate-spin text-primary">sync</span>
              <p className="text-sm text-on-surface-variant">Cargando operadores del sistema...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-[48px] text-on-surface-variant">group_off</span>
              <p className="text-lg font-bold text-on-surface mt-4">Sin resultados</p>
              <p className="text-sm text-on-surface-variant mt-1">
                No se encontraron usuarios que coincidan con la búsqueda o filtro seleccionado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant/50">
                    <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nombre / Email</th>
                    <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Rol</th>
                    <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Municipios Asignados</th>
                    <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider">Estado</th>
                    <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-wider text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredUsers.map((item) => {
                    const isCurrentUser = item.id === authUser?.id || item.id === authProfile?.id
                    return (
                      <tr 
                        key={item.id} 
                        className={`transition-colors hover:bg-surface-container-low/40 ${
                          !item.activo ? 'opacity-60' : ''
                        }`}
                      >
                        {/* Name & Email */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                              {(item.full_name || item.email || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-semibold text-on-surface text-sm">
                                {item.full_name || 'Sin Nombre'}
                              </div>
                              <div className="text-xs text-on-surface-variant mt-0.5">
                                {item.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Role Badge */}
                        <td className="p-4">
                          {item.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-tertiary-container text-on-tertiary-container">
                              <span className="material-symbols-outlined text-[16px]">shield_person</span>
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-secondary-container text-on-secondary-container">
                              <span className="material-symbols-outlined text-[16px]">badge</span>
                              Técnico Municipal
                            </span>
                          )}
                        </td>

                        {/* Municipality Assignments */}
                        <td className="p-4">
                          {item.role === 'admin' ? (
                            <span className="text-on-surface-variant/80 italic text-xs font-medium bg-surface-container px-2.5 py-1 rounded-lg">
                              Acceso global
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {item.user_municipios && item.user_municipios.length > 0 ? (
                                item.user_municipios.map((um) => (
                                  <div 
                                    key={um.idmunicipio} 
                                    className="inline-flex items-center gap-1 bg-surface-container text-on-surface px-2 py-0.5 rounded-lg text-xs border border-outline-variant/30"
                                  >
                                    <span>{um.municipios?.nombre || 'Municipio'}</span>
                                    <button
                                      onClick={() => handleRemoveAssignment(item.id, um.idmunicipio)}
                                      className="material-symbols-outlined text-[14px] text-on-surface-variant hover:text-error transition-colors bg-transparent border-none cursor-pointer leading-none"
                                      title="Quitar asignación"
                                    >
                                      close
                                    </button>
                                  </div>
                                ))
                              ) : (
                                <span className="text-xs text-on-surface-variant italic">
                                  Sin asignaciones
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  setSelectedUserForAssign(item)
                                  setIsAssignModalOpen(true)
                                  setMuniToAssign('')
                                }}
                                className="inline-flex items-center gap-0.5 text-primary hover:bg-primary/5 px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer border-none bg-transparent"
                              >
                                <span className="material-symbols-outlined text-[14px]">add</span>
                                Asignar
                              </button>
                            </div>
                          )}
                        </td>

                        {/* Status Toggle / Badge */}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {!item.activo && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-error-container text-on-error-container">
                                <span className="material-symbols-outlined text-[12px]">block</span>
                                Inactivo
                              </span>
                            )}
                            <button
                              onClick={() => handleToggleActivo(item.id, item.activo, isCurrentUser)}
                              className={`material-symbols-outlined text-[32px] transition-colors bg-transparent border-none cursor-pointer leading-none select-none ${
                                item.activo ? 'text-primary' : 'text-on-surface-variant/50'
                              }`}
                              title={item.activo ? 'Desactivar usuario' : 'Activar usuario'}
                            >
                              {item.activo ? 'toggle_on' : 'toggle_off'}
                            </button>
                          </div>
                        </td>

                        {/* Actions Toggle Role */}
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleRole(item.id, item.role)}
                            className="inline-flex items-center gap-1.5 bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface-variant font-semibold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer border-none"
                          >
                            <span className="material-symbols-outlined text-sm">swap_horiz</span>
                            Cambiar a {item.role === 'admin' ? 'Técnico' : 'Admin'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Assign Municipality Modal */}
      {isAssignModalOpen && selectedUserForAssign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-lg border border-outline-variant w-full max-w-[450px] p-6 space-y-4">
            <div>
              <h2 className="text-xl font-bold text-primary">Asignar Jurisdicción</h2>
              <p className="text-sm text-on-surface-variant mt-1">
                Seleccione el municipio a asignar a <span className="font-semibold text-on-surface">{selectedUserForAssign.full_name || selectedUserForAssign.email}</span>.
              </p>
            </div>

            <form onSubmit={handleConfirmAssign} className="w-full space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-wider" htmlFor="muniSelect">
                  Municipio disponible
                </label>
                <div className="relative">
                  <select
                    id="muniSelect"
                    required
                    className="w-full h-12 pl-4 pr-10 bg-surface-container rounded-xl border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm appearance-none cursor-pointer text-on-surface"
                    value={muniToAssign}
                    onChange={(e) => setMuniToAssign(e.target.value)}
                  >
                    <option value="" disabled>Seleccione un municipio...</option>
                    {municipios
                      .filter(m => !selectedUserForAssign.user_municipios?.some(um => um.idmunicipio === m.id))
                      .map(m => (
                        <option key={m.id} value={m.id}>{m.nombre}</option>
                      ))
                    }
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAssignModalOpen(false)
                    setSelectedUserForAssign(null)
                    setMuniToAssign('')
                  }}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!muniToAssign}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:opacity-95 text-sm font-bold transition-all disabled:opacity-50"
                >
                  Asignar Municipio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
