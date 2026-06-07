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

  // Data States
  const [users, setUsers] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [usingMockData, setUsingMockData] = useState(false)

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  // Modal State
  const [selectedUserForAssign, setSelectedUserForAssign] = useState(null)
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [muniToAssign, setMuniToAssign] = useState('')

  // Toast / Alert Notification State
  const [notification, setNotification] = useState(null)

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => {
      setNotification(null)
    }, 4000)
  }

  // Fallback Mock Data
  const MOCK_MUNICIPIOS = [
    { id: 1, nombre: 'General San Martín' },
    { id: 2, nombre: 'Luján de Cuyo' },
    { id: 3, nombre: 'Godoy Cruz' },
    { id: 4, nombre: 'Guaymallén' },
    { id: 5, nombre: 'Las Heras' },
    { id: 6, nombre: 'Maipú' }
  ]

  const MOCK_USERS = [
    {
      id: 'usr-001',
      email: 'juan.perez@municipio.gob',
      full_name: 'Juan Pérez',
      role: 'user',
      created_at: '2024-01-15T10:30:00Z',
      user_municipios: [
        { idmunicipio: 1, municipios: { id: 1, nombre: 'General San Martín' } }
      ]
    },
    {
      id: 'usr-002',
      email: 'sofia.rodriguez@lujan.gob',
      full_name: 'Sofía Rodríguez',
      role: 'user',
      created_at: '2024-02-10T14:45:00Z',
      user_municipios: [
        { idmunicipio: 2, municipios: { id: 2, nombre: 'Luján de Cuyo' } },
        { idmunicipio: 3, municipios: { id: 3, nombre: 'Godoy Cruz' } }
      ]
    },
    {
      id: 'usr-003',
      email: 'carlos.gomez@gob.ar',
      full_name: 'Carlos Gómez (Admin)',
      role: 'admin',
      created_at: '2023-11-01T09:00:00Z',
      user_municipios: []
    },
    {
      id: 'usr-004',
      email: 'maria.dell@guaymallen.gob',
      full_name: 'María Laura Dell',
      role: 'user',
      created_at: '2024-03-22T11:15:00Z',
      user_municipios: [
        { idmunicipio: 4, municipios: { id: 4, nombre: 'Guaymallén' } }
      ]
    }
  ]

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch available municipalities
      const { data: muniData, error: muniErr } = await supabase
        .from('municipios')
        .select('id, nombre')
        .order('nombre')

      if (muniErr) throw muniErr

      // 2. Fetch profiles with nested user_municipios & municipios
      const { data: userData, error: userErr } = await supabase
        .from('profiles')
        .select(`*, user_municipios(idmunicipio, municipios(id, nombre))`)
        .order('created_at', { ascending: false })

      if (userErr) throw userErr

      setMunicipios(muniData || [])
      setUsers(userData || [])
      setUsingMockData(false)
    } catch (err) {
      console.warn("Supabase fetch failed, falling back to mock data:", err.message)
      setMunicipios(MOCK_MUNICIPIOS)
      setUsers(MOCK_USERS)
      setUsingMockData(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only load if the user is authenticated and is admin
    if (!authLoading && isAdmin) {
      loadData()
    }
  }, [authLoading, isAdmin])

  // Change Role Action
  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    try {
      if (!usingMockData) {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', userId)

        if (updateErr) throw updateErr
      }

      // Update local state
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      showNotification(`Rol de usuario actualizado a '${newRole}' con éxito`, 'success')
    } catch (err) {
      console.error("Error updating role:", err)
      showNotification("Error al actualizar el rol: " + err.message, 'error')
    }
  }

  // Remove Municipality Assignment Action
  const handleRemoveAssignment = async (userId, municipioId) => {
    try {
      if (!usingMockData) {
        const { error: deleteErr } = await supabase
          .from('user_municipios')
          .delete()
          .eq('user_id', userId)
          .eq('idmunicipio', municipioId)

        if (deleteErr) throw deleteErr
      }

      // Update local state
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            user_municipios: u.user_municipios.filter(um => um.idmunicipio !== municipioId)
          }
        }
        return u
      }))
      showNotification("Asignación de municipio removida", 'success')
    } catch (err) {
      console.error("Error removing assignment:", err)
      showNotification("Error al remover asignación: " + err.message, 'error')
    }
  }

  // Open Assign Modal
  const openAssignModal = (user) => {
    setSelectedUserForAssign(user)
    setIsAssignModalOpen(true)
    setMuniToAssign('')
  }

  // Assign Municipality Action
  const handleConfirmAssign = async (e) => {
    e.preventDefault()
    if (!muniToAssign || !selectedUserForAssign) return

    const municipioId = parseInt(muniToAssign)
    const selectedMuniDetails = municipios.find(m => m.id === municipioId)

    try {
      if (!usingMockData) {
        const { error: insertErr } = await supabase
          .from('user_municipios')
          .insert({ user_id: selectedUserForAssign.id, idmunicipio: municipioId })

        if (insertErr) throw insertErr
      }

      // Update local state
      setUsers(prev => prev.map(u => {
        if (u.id === selectedUserForAssign.id) {
          // Prevent duplicates
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
      showNotification(`Municipio '${selectedMuniDetails?.nombre}' asignado correctamente`, 'success')
    } catch (err) {
      console.error("Error assigning municipality:", err)
      showNotification("Error al asignar municipio: " + err.message, 'error')
    }
  }

  // Filters search results
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    return matchesSearch && matchesRole
  })

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
        {/* Header */}
        <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface shadow-custom-sm border-b border-outline-variant">
          <div className="flex items-center gap-sm">
            <span className="font-headline-md text-headline-md font-bold text-primary">Municipal Guardian</span>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="bg-primary text-on-primary px-lg py-sm rounded-xl font-label-md text-label-md hover:bg-primary-container transition-all"
          >
            Iniciar Sesión
          </button>
        </header>

        {/* Content */}
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

      {/* TopNavBar */}
      <header className="fixed top-0 left-0 w-full z-45 flex justify-between items-center px-margin-mobile md:px-margin-desktop h-16 bg-surface shadow-custom-sm border-b border-outline-variant md:pl-72">
        <div className="flex items-center gap-md">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors bg-transparent border-none cursor-pointer"
            title="Abrir menú"
          >
            menu
          </button>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center justify-center w-10 h-10 rounded-lg hover:bg-surface-container transition-colors bg-transparent border-none cursor-pointer text-primary"
            title="Volver a Municipios"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex items-center gap-sm">
            <span className="font-headline-md text-headline-md font-bold text-primary">Panel de Administración</span>
            <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider hidden sm:inline-block">
              Usuarios
            </span>
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
            onClick={loadData}
            className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors bg-transparent border-none cursor-pointer"
            title="Recargar datos"
          >
            refresh
          </button>
          <div className="flex items-center gap-sm bg-surface-container px-3 py-1.5 rounded-full">
            <span className="material-symbols-outlined text-primary">account_circle</span>
            <span className="font-label-sm text-label-sm font-semibold hidden sm:inline-block">{authProfile?.full_name || authUser?.email}</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="md:ml-64 pt-24 pb-32 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto w-full flex-grow">
        {/* Page Header */}
        <section className="mb-xl">
          <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
            Control de Acceso y Operadores
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-sm max-w-3xl">
            Gestione los permisos del sistema. Asigne a cada operador los municipios específicos cuya información está autorizado a registrar y auditar.
          </p>
        </section>

        {/* Bento Grid Stats */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-gutter mb-xl">
          <div className="bg-surface-container-lowest rounded-2xl p-md border border-outline-variant/30 shadow-custom-sm flex items-center gap-md">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[28px]">group</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Usuarios Totales</p>
              <h2 className="text-headline-lg font-bold text-on-surface">{users.length}</h2>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-md border border-outline-variant/30 shadow-custom-sm flex items-center gap-md">
            <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary">
              <span className="material-symbols-outlined text-[28px]">shield_person</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Administradores</p>
              <h2 className="text-headline-lg font-bold text-on-surface">
                {users.filter(u => u.role === 'admin').length}
              </h2>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl p-md border border-outline-variant/30 shadow-custom-sm flex items-center gap-md">
            <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center text-tertiary">
              <span className="material-symbols-outlined text-[28px]">location_city</span>
            </div>
            <div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">Municipios Totales</p>
              <h2 className="text-headline-lg font-bold text-on-surface">{municipios.length}</h2>
            </div>
          </div>
        </section>

        {/* Controls: Search and Filters */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-custom-sm p-md mb-lg flex flex-col md:flex-row items-center justify-between gap-md">
          <div className="relative w-full md:w-96">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">
              search
            </span>
            <input
              type="text"
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-xl border border-outline-variant/30 focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm transition-all"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-sm w-full md:w-auto overflow-x-auto">
            <span className="font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Filtrar por:</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setRoleFilter('all')}
                className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm font-semibold transition-all border cursor-pointer ${
                  roleFilter === 'all'
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                }`}
              >
                Todos
              </button>
              <button 
                onClick={() => setRoleFilter('admin')}
                className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm font-semibold transition-all border cursor-pointer ${
                  roleFilter === 'admin'
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                }`}
              >
                Administradores
              </button>
              <button 
                onClick={() => setRoleFilter('user')}
                className={`px-4 py-1.5 rounded-full font-label-sm text-label-sm font-semibold transition-all border cursor-pointer ${
                  roleFilter === 'user'
                    ? 'bg-primary text-on-primary border-primary'
                    : 'bg-surface-container text-on-surface-variant border-outline-variant/30 hover:bg-surface-container-high'
                }`}
              >
                Usuarios comunes
              </button>
            </div>
          </div>
        </section>

        {/* Users Table / Grid Layout */}
        <section className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-custom-sm overflow-hidden">
          {loading ? (
            <div className="p-xl text-center space-y-md">
              <span className="material-symbols-outlined text-[40px] animate-spin text-primary">sync</span>
              <p className="font-body-md text-body-md text-on-surface-variant">Cargando operadores del sistema...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-xl text-center">
              <span className="material-symbols-outlined text-[48px] text-outline">group_off</span>
              <p className="font-headline-md text-headline-md text-on-surface mt-md">Sin resultados</p>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
                No se encontraron usuarios que coincidan con la búsqueda o filtro seleccionado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant/50">
                    <th className="p-md font-label-md text-label-md text-on-surface font-bold">Operador / Correo</th>
                    <th className="p-md font-label-md text-label-md text-on-surface font-bold">Rol</th>
                    <th className="p-md font-label-md text-label-md text-on-surface font-bold">Municipios Asignados</th>
                    <th className="p-md font-label-md text-label-md text-on-surface font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredUsers.map((item) => (
                    <tr key={item.id} className="hover:bg-surface-container-low/50 transition-colors">
                      {/* Name / Email */}
                      <td className="p-md">
                        <div className="flex items-center gap-md">
                          <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                            {(item.full_name || item.email).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-headline-md text-[16px] text-on-surface font-semibold">{item.full_name || 'Sin Nombre'}</div>
                            <div className="font-body-md text-[13px] text-on-surface-variant mt-0.5">{item.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="p-md">
                        <span className={`px-3 py-1 rounded-full font-label-sm text-label-sm font-bold uppercase tracking-wider ${
                          item.role === 'admin' 
                            ? 'bg-tertiary-container text-on-tertiary-container' 
                            : 'bg-surface-container text-on-surface-variant'
                        }`}>
                          {item.role}
                        </span>
                      </td>

                      {/* Municipios chips */}
                      <td className="p-md">
                        {item.role === 'admin' ? (
                          <span className="text-on-surface-variant/70 italic text-sm">
                            Acceso global (Admin)
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-xs items-center">
                            {item.user_municipios && item.user_municipios.length > 0 ? (
                              item.user_municipios.map((um) => (
                                <div 
                                  key={um.idmunicipio} 
                                  className="flex items-center gap-1 bg-surface-container-high text-on-surface px-2.5 py-1 rounded-lg text-sm border border-outline-variant/20 group/chip"
                                >
                                  <span>{um.municipios?.nombre || 'Municipio'}</span>
                                  <button
                                    onClick={() => handleRemoveAssignment(item.id, um.idmunicipio)}
                                    className="material-symbols-outlined text-[14px] text-outline hover:text-error transition-colors bg-transparent border-none cursor-pointer"
                                    title="Quitar asignación"
                                  >
                                    close
                                  </button>
                                </div>
                              ))
                            ) : (
                              <span className="text-error font-semibold text-xs bg-error-container/40 px-2 py-1 rounded">
                                Ninguno asignado
                              </span>
                            )}
                            <button
                              onClick={() => openAssignModal(item)}
                              className="text-primary hover:bg-primary/10 px-2 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-xs cursor-pointer border-none bg-transparent"
                            >
                              <span className="material-symbols-outlined text-[14px]">add</span>
                              Asignar
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="p-md text-center">
                        <button
                          onClick={() => handleToggleRole(item.id, item.role)}
                          className="bg-surface-container-high hover:bg-primary-container hover:text-on-primary text-on-surface-variant font-label-sm text-label-sm px-4 py-2 rounded-xl transition-all font-semibold cursor-pointer border-none"
                        >
                          Cambiar a {item.role === 'admin' ? 'Usuario' : 'Admin'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Assign Municipality Modal */}
      {isAssignModalOpen && selectedUserForAssign && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-custom-md border border-outline-variant w-[95%] max-w-[450px] p-6 space-y-4">
            <div>
              <h2 className="text-headline-md font-bold text-primary">Asignar Jurisdicción</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-sm">
                Seleccione el municipio a asignar a <span className="font-semibold text-on-surface">{selectedUserForAssign.full_name}</span>.
              </p>
            </div>

            <form onSubmit={handleConfirmAssign} className="w-full space-y-4">
              <div className="space-y-sm">
                <label className="block text-label-md text-on-surface font-semibold" htmlFor="muniSelect">
                  Municipio disponible
                </label>
                <div className="relative">
                  <select
                    id="muniSelect"
                    required
                    className="w-full h-12 pl-4 pr-10 bg-surface-container rounded-xl border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-body-md text-body-md appearance-none cursor-pointer"
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
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                    expand_more
                  </span>
                </div>
              </div>

              <div className="flex gap-sm justify-end">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-lg py-sm rounded-xl text-on-surface-variant hover:bg-surface-container-high text-label-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!muniToAssign}
                  className="px-lg py-sm rounded-xl bg-primary text-on-primary hover:bg-primary-container text-label-md font-bold transition-all disabled:opacity-50"
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
