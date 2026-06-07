import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import SlideBar from '../components/SlideBar'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

const SECCIONES_LIST = [
  { order: 1, name: 'Datos generales' },
  { order: 2, name: 'Datos socioeconómicos' },
  { order: 3, name: 'Primera infancia' },
  { order: 4, name: 'Inclusión educativa' },
  { order: 5, name: 'Salud sexual y reproductiva' },
  { order: 6, name: 'Entornos saludables' },
  { order: 7, name: 'Entornos libres de violencia' },
  { order: 8, name: 'Discapacidad' },
  { order: 9, name: 'Medio ambiente' },
  { order: 10, name: 'Participación' },
  { order: 11, name: 'Articulación sector privado' },
  { order: 12, name: 'Protección digital' },
]

function calcEstado(progreso) {
  if (progreso === 100) return { label: 'Completado', badgeClass: 'bg-[#d1fae5] text-[#065f46]', borderClass: 'border-l-4 border-[#10b981]', btnText: 'Consultar Resultados' }
  if (progreso > 0)    return { label: 'En Proceso',  badgeClass: 'bg-secondary-container text-on-secondary-container', borderClass: 'border-l-4 border-primary', btnText: 'Ver Dashboard' }
  return                      { label: 'Pendiente',   badgeClass: 'bg-tertiary-fixed text-on-tertiary-fixed', borderClass: 'border-l-4 border-tertiary', btnText: 'Comenzar Carga' }
}

export default function MunicipiosList() {
  const navigate = useNavigate()
  const { signOut, isAdmin } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newMuniName, setNewMuniName] = useState('')
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMunicipios()
  }, [])

  async function fetchMunicipios() {
    setLoading(true)
    const { data: munis } = await supabase
      .from('municipios')
      .select('id, nombre, ultima_actualizacion')
      .order('nombre')

    if (!munis) { setLoading(false); return }

    const enriched = await Promise.all(munis.map(async (m) => {
      const { data: autodiags } = await supabase
        .from('autodiagnosticos')
        .select('id')
        .eq('idmunicipio', m.id)

      const autodiagIds = (autodiags ?? []).map(a => a.id)

      const { data: seccionesConRespuestas } = autodiagIds.length > 0
        ? await supabase
            .from('respuestas')
            .select('preguntas!inner(id_seccion)')
            .in('id_autodiagnostico', autodiagIds)
        : { data: [] }

      const seccionesIds = [...new Set((seccionesConRespuestas ?? []).map(r => r.preguntas?.id_seccion).filter(Boolean))]
      const totalSecciones = 12
      const completadas = seccionesIds.length
      const progreso = Math.round((completadas / totalSecciones) * 100)

      const secciones = SECCIONES_LIST.map((_, i) => {
        const secId = i + 1
        return seccionesIds.includes(secId) ? 'completa' : 'sin_empezar'
      })

      const lastUpdate = m.ultima_actualizacion
        ? new Date(m.ultima_actualizacion).toLocaleDateString('es-AR')
        : 'Sin actividad'

      return { id: m.id, nombre: m.nombre, lastUpdate, progreso, secciones, ...calcEstado(progreso) }
    }))

    setMunicipios(enriched)

    // Municipios del catálogo que todavía no están activos
    const nombresActivos = munis.map(m => m.nombre)
    const { data: lista } = await supabase.from('lista_municipios').select('nombre').order('nombre')
    setMunicipiosDisponibles((lista ?? []).map(l => l.nombre).filter(n => !nombresActivos.includes(n)))

    setLoading(false)
  }

  const filteredMunicipios = municipios.filter(m =>
    m.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddMunicipio = async (e) => {
    e.preventDefault()
    if (!newMuniName.trim()) return
    const nombre = newMuniName.trim()
    // Si no está en el catálogo, agregarlo primero para respetar la FK
    const enCatalogo = municipiosDisponibles.includes(nombre)
    if (!enCatalogo) {
      const { error: errorLista } = await supabase.from('lista_municipios').insert({ nombre })
      if (errorLista) return
    }
    const { error } = await supabase.from('municipios').insert({ nombre })
    if (!error) {
      setNewMuniName('')
      setShowAddModal(false)
      fetchMunicipios()
    }
  }

  return (
    <div className="bg-background text-on-surface min-h-screen">
      <SlideBar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

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
          <div className="flex items-center gap-sm">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-container text-on-primary-container">
              <span className="material-symbols-outlined">location_city</span>
            </div>
            <span className="font-headline-md text-headline-md font-bold text-primary">Municipal Care</span>
          </div>
        </div>
        
        <div className="flex items-center gap-md">
          <button className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors bg-transparent border-none cursor-pointer">
            cloud_done
          </button>
          <button 
            onClick={async () => {
              if (window.confirm('¿Desea cerrar sesión?')) {
                await signOut()
                navigate('/login')
              }
            }}
            className="material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors bg-transparent border-none cursor-pointer"
            title="Cerrar sesión"
          >
            account_circle
          </button>
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="md:ml-64 pt-24 pb-32 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        {/* Header Section */}
        <section className="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Gestión de Municipios
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-sm">
              Visualice el estado de los autodiagnósticos de protección de Niñez y Adolescencia en cada jurisdicción municipal.
            </p>
          </div>
          
          <div className="flex items-center gap-sm">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">
                search
              </span>
              <input
                type="text"
                className="pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary w-full md:w-64 text-sm outline-none"
                placeholder="Buscar municipio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-on-primary px-lg py-sm rounded-xl font-label-md text-label-md flex items-center gap-xs hover:bg-primary-container transition-all active:scale-95 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Nuevo
            </button>
          </div>
        </section>

        {/* Bento Grid of Municipalities */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {loading && (
            <div className="col-span-full flex justify-center items-center py-24">
              <span className="material-symbols-outlined animate-spin text-primary text-[40px]">sync</span>
            </div>
          )}
          {!loading && filteredMunicipios.map((muni) => (
            <div
              key={muni.id}
              className={`bg-surface-container-lowest rounded-2xl shadow-custom-sm ${muni.borderClass} p-md hover:shadow-custom-md transition-shadow flex flex-col justify-between group`}
            >
              <div>
                <div className="flex justify-between items-start mb-md">
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface group-hover:text-primary transition-colors">
                      {muni.nombre}
                    </h3>
                    <p className="font-label-sm text-label-sm text-on-surface-variant mt-1">
                      Última actualización: {muni.lastUpdate}
                    </p>
                  </div>
                  <span className={`${muni.badgeClass} px-sm py-xs rounded-full font-label-sm text-label-sm font-semibold`}>
                    {muni.estado}
                  </span>
                </div>

                {/* Progress Section */}
                <div className="mb-lg">
                  <div className="flex justify-between items-center mb-xs">
                    <span className="font-label-md text-label-md text-on-surface">Progreso General</span>
                    <span className={`font-label-md text-label-md font-bold ${
                      muni.progreso === 100 ? 'text-[#059669]' : muni.progreso > 20 ? 'text-primary' : 'text-tertiary'
                    }`}>
                      {muni.progreso}%
                    </span>
                  </div>
                  <ProgressBar pct={muni.progreso} color={muni.progreso === 100 ? 'bg-[#10b981]' : muni.progreso === 15 ? 'bg-tertiary' : 'bg-primary'} />
                </div>

                {/* 12 Sections Grid */}
                <div className="mb-lg">
                  <p className="font-label-sm text-label-sm text-outline mb-sm uppercase tracking-wider">
                    Módulos de Diagnóstico (12)
                  </p>
                  <div className="grid grid-cols-6 gap-xs bg-surface-container-low p-2 rounded-xl">
                    {muni.secciones.map((status, index) => {
                      const sec = SECCIONES_LIST[index]
                      let iconName = 'circle'
                      let iconColor = 'text-outline-variant'
                      let isFilled = false

                      if (status === 'completa') {
                        iconName = 'check_circle'
                        iconColor = 'text-[#10b981]'
                        isFilled = true
                      } else if (status === 'iniciada') {
                        iconName = 'pending'
                        iconColor = 'text-amber-500'
                        isFilled = true
                      }

                      return (
                        <div
                          key={index}
                          className="flex flex-col items-center justify-center p-1 relative group/tooltip"
                          title={`${index + 1}. ${sec.name}: ${
                            status === 'completa' ? 'Completa' : status === 'iniciada' ? 'En proceso' : 'Sin empezar'
                          }`}
                        >
                          <span 
                            className={`material-symbols-outlined text-[20px] ${iconColor} transition-transform duration-200 group-hover/tooltip:scale-125`}
                            style={isFilled ? { fontVariationSettings: "'FILL' 1" } : {}}
                          >
                            {iconName}
                          </span>
                          
                          {/* Custom Tooltip */}
                          <div className="absolute bottom-full mb-2 hidden group-hover/tooltip:block bg-inverse-surface text-inverse-on-surface text-[10px] rounded px-2 py-1 whitespace-nowrap z-50 pointer-events-none shadow-md">
                            {index + 1}. {sec.name}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate(`/municipio/${muni.id}`)}
                className="w-full py-md rounded-xl bg-surface-container-high text-primary font-bold font-label-md text-label-md flex items-center justify-center gap-xs group-hover:bg-primary group-hover:text-on-primary transition-all active:scale-95 cursor-pointer mt-4"
              >
                {muni.btnText}
                <span className="material-symbols-outlined text-[18px] transition-transform duration-300 group-hover:translate-x-1">
                  chevron_right
                </span>
              </button>
            </div>
          ))}

          {/* Add New Card */}
          <button
            onClick={() => setShowAddModal(true)}
            className="border-2 border-dashed border-outline-variant rounded-2xl flex flex-col items-center justify-center gap-md p-md bg-transparent hover:bg-surface-container-low transition-all duration-300 group h-full min-h-[300px] cursor-pointer"
          >
            <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center group-hover:bg-primary-container transition-colors duration-300">
              <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors duration-300" style={{ fontSize: '32px' }}>
                add_location_alt
              </span>
            </div>
            <div className="text-center">
              <p className="font-headline-md text-headline-md text-on-surface">Nuevo Municipio</p>
              <p className="font-label-md text-label-md text-on-surface-variant">Configurar nueva área local</p>
            </div>
          </button>
        </div>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-2 bg-surface shadow-lg md:hidden rounded-t-xl border-t border-outline-variant">
        <button onClick={() => navigate('/')} className="flex flex-col items-center justify-center bg-primary-container text-on-primary-container rounded-full px-4 py-1 border-none cursor-pointer">
          <span className="material-symbols-outlined">home</span>
          <span className="font-label-sm text-label-sm">Home</span>
        </button>
        <a className="flex flex-col items-center justify-center text-on-surface-variant" href="#">
          <span className="material-symbols-outlined">assignment_turned_in</span>
          <span className="font-label-sm text-label-sm">Diagnosis</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant" href="#">
          <span className="material-symbols-outlined">map</span>
          <span className="font-label-sm text-label-sm">Map</span>
        </a>
        <a className="flex flex-col items-center justify-center text-on-surface-variant" href="#">
          <span className="material-symbols-outlined">person</span>
          <span className="font-label-sm text-label-sm">Profile</span>
        </a>
      </nav>

      {/* Floating Action Button */}
      <button 
        onClick={() => setShowAddModal(true)}
        className="fixed right-md bottom-24 md:bottom-md md:right-md w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40 cursor-pointer"
      >
        <span className="material-symbols-outlined text-[24px]">add</span>
      </button>

      {/* Add Municipality Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-custom-md border border-outline-variant w-[95%] max-w-[450px] p-6 space-y-4">
            <h2 className="text-headline-md font-bold text-primary">Agregar Municipio</h2>
            <form onSubmit={handleAddMunicipio} className="w-full space-y-4">
              <div className="space-y-2">
                <label className="block text-label-md text-on-surface font-semibold">
                  Seleccionar Municipio
                </label>
                <input
                  list="municipios-disponibles"
                  required
                  placeholder="Escribí o elegí un municipio..."
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  value={newMuniName}
                  onChange={(e) => setNewMuniName(e.target.value)}
                  autoFocus
                />
                <datalist id="municipios-disponibles">
                  {municipiosDisponibles.map(nombre => (
                    <option key={nombre} value={nombre} />
                  ))}
                </datalist>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-on-surface-variant hover:bg-surface-container-high text-label-md transition-colors border-none bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-container text-label-md font-bold transition-all active:scale-95 border-none cursor-pointer"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
