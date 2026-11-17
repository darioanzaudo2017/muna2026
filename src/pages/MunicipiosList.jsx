import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ProgressBar from '../components/ProgressBar'
import SlideBar from '../components/SlideBar'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { AreaOrdenanzaChips } from '../components/AreaOrdenanza'
import { ContactosResumen } from '../components/ContactosMunicipio'
import { CAMPOS_CONTACTOS } from '../lib/contactosMunicipio'
import { descargarContactosCsv, descargarContactosPdf } from '../lib/exportarMunicipios'

// Select Sí/No/Sin dato del alta -> boolean nullable de la base
const triestadoABool = (v) => (v === 'si' ? true : v === 'no' ? false : null)

// Colores de estado tipo semáforo — independientes de la paleta de marca
// (primary/secondary/tertiary), para que no se pisen si la marca cambia.
function calcEstado(progreso) {
  if (progreso === 100) return { label: 'Completado', badgeClass: 'bg-[#dcfce7] text-[#15803d]', borderClass: 'border-l-4 border-[#22c55e]', btnText: 'Consultar Resultados' }
  if (progreso > 0)    return { label: 'En Proceso',  badgeClass: 'bg-[#ffedd5] text-[#c2410c]', borderClass: 'border-l-4 border-[#f97316]', btnText: 'Ver Dashboard' }
  return                      { label: 'Pendiente',   badgeClass: 'bg-[#fee2e2] text-[#b91c1c]', borderClass: 'border-l-4 border-[#ef4444]', btnText: 'Comenzar Carga' }
}

export default function MunicipiosList() {
  const navigate = useNavigate()
  const { signOut, isAdmin } = useAuth()
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [menuDescarga, setMenuDescarga] = useState(false)
  const [newMuniName, setNewMuniName] = useState('')
  const [newMuniCohorteId, setNewMuniCohorteId] = useState('')
  const [newMuniAreaLocal, setNewMuniAreaLocal] = useState('')
  const [newMuniOrdenanza, setNewMuniOrdenanza] = useState('')
  const [cohortes, setCohortes] = useState([])
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMunicipios()
  }, [])

  async function fetchMunicipios() {
    setLoading(true)
    const [{ data: munis }, { data: cohortesData }, { data: seccionesData }] = await Promise.all([
      supabase.from('municipios').select(`id, nombre, ultima_actualizacion, id_cohorte, tiene_area_local, tiene_ordenanza, ${CAMPOS_CONTACTOS.join(', ')}`).order('nombre'),
      supabase.from('cohortes').select('id, nombre, activa, orden').order('orden'),
      supabase.from('secciones').select('id, nombre, orden, id_cohorte').order('orden'),
    ])

    if (cohortesData && cohortesData.length > 0) {
      setCohortes(cohortesData)
      const defaultCohorte = cohortesData.find(c => c.activa) || cohortesData[0]
      setNewMuniCohorteId(prev => prev || defaultCohorte?.id?.toString() || '')
    }

    if (!munis) { setLoading(false); return }

    const allSecciones = seccionesData ?? []

    const enriched = await Promise.all(munis.map(async (m) => {
      const { data: autodiags } = await supabase
        .from('autodiagnosticos')
        .select('id, id_cohorte')
        .eq('idmunicipio', m.id)

      const autodiagIds = (autodiags ?? []).map(a => a.id)
      const cohorteId = autodiags?.[0]?.id_cohorte ?? m.id_cohorte ?? cohortesData?.[0]?.id

      const muniSecciones = allSecciones.filter(s => s.id_cohorte === cohorteId)

      const { data: seccionesConRespuestas } = autodiagIds.length > 0
        ? await supabase
            .from('respuestas')
            .select('preguntas!inner(id_seccion)')
            .in('id_autodiagnostico', autodiagIds)
        : { data: [] }

      const seccionesIds = [...new Set((seccionesConRespuestas ?? []).map(r => r.preguntas?.id_seccion).filter(Boolean))]
      const totalSecciones = muniSecciones.length
      const completadas = seccionesIds.filter(sid => muniSecciones.some(s => s.id === sid)).length
      const progreso = totalSecciones > 0 ? Math.round((completadas / totalSecciones) * 100) : 0

      const secciones = muniSecciones.map((sec) => ({
        id: sec.id,
        orden: sec.orden,
        name: sec.nombre,
        icon: sec.icon,
        status: seccionesIds.includes(sec.id) ? 'completa' : 'sin_empezar'
      }))

      const lastUpdate = m.ultima_actualizacion
        ? new Date(m.ultima_actualizacion).toLocaleDateString('es-AR')
        : 'Sin actividad'

      return {
        id: m.id, nombre: m.nombre, lastUpdate, progreso, secciones, totalSecciones,
        tieneAreaLocal: m.tiene_area_local, tieneOrdenanza: m.tiene_ordenanza,
        contactos: Object.fromEntries(CAMPOS_CONTACTOS.map(c => [c, m[c]])),
        cohorteNombre: cohortesData?.find(c => c.id === m.id_cohorte)?.nombre ?? '',
        ...calcEstado(progreso)
      }
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
    if (!newMuniName.trim() || !newMuniCohorteId) return
    const nombre = newMuniName.trim()
    // Si no está en el catálogo, agregarlo primero para respetar la FK
    const enCatalogo = municipiosDisponibles.includes(nombre)
    if (!enCatalogo) {
      const { error: errorLista } = await supabase.from('lista_municipios').insert({ nombre })
      if (errorLista) return
    }
    const { error } = await supabase.from('municipios').insert({
      nombre,
      id_cohorte: Number(newMuniCohorteId),
      tiene_area_local: triestadoABool(newMuniAreaLocal),
      tiene_ordenanza: triestadoABool(newMuniOrdenanza)
    })
    if (!error) {
      setNewMuniName('')
      setNewMuniAreaLocal('')
      setNewMuniOrdenanza('')
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
            {isAdmin && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuDescarga(abierto => !abierto)}
                  disabled={loading || municipios.length === 0}
                  aria-haspopup="menu"
                  aria-expanded={menuDescarga}
                  title="Descargar intendente y contactos de todos los municipios"
                  className="bg-surface-container-high text-primary px-lg py-sm rounded-xl font-label-md text-label-md flex items-center gap-xs border-none hover:bg-primary hover:text-on-primary transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">download</span>
                  Descargar contactos
                </button>
                {menuDescarga && (
                  <div role="menu" className="absolute right-0 mt-1 w-56 bg-surface-container-lowest rounded-xl shadow-custom-md border border-outline-variant z-40 overflow-hidden">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setMenuDescarga(false); descargarContactosCsv(municipios) }}
                      className="w-full text-left px-4 py-3 bg-transparent border-none cursor-pointer hover:bg-surface-container flex items-center gap-2 text-label-md text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[20px] text-primary">table_chart</span>
                      Excel (.csv)
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => { setMenuDescarga(false); descargarContactosPdf(municipios) }}
                      className="w-full text-left px-4 py-3 bg-transparent border-none cursor-pointer hover:bg-surface-container flex items-center gap-2 text-label-md text-on-surface"
                    >
                      <span className="material-symbols-outlined text-[20px] text-primary">picture_as_pdf</span>
                      PDF
                    </button>
                  </div>
                )}
              </div>
            )}
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-primary text-on-primary px-lg py-sm rounded-xl font-label-md text-label-md flex items-center gap-xs hover:bg-primary-container transition-all active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Nuevo
              </button>
            )}
          </div>
        </section>

        {/* Barra Resumen por Estado */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-md mb-lg">
            <div className="bg-[#fee2e2] border border-[#ef4444]/30 rounded-2xl p-4 flex items-center justify-between shadow-custom-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-[#b91c1c]">
                  <span className="material-symbols-outlined text-[24px]">pending</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-[#b91c1c] uppercase tracking-wider block">Pendientes</span>
                  <span className="text-xs text-[#b91c1c]/80 font-medium">0% de avance</span>
                </div>
              </div>
              <span className="text-2xl font-extrabold text-[#b91c1c]">
                {municipios.filter(m => m.progreso === 0).length}
              </span>
            </div>

            <div className="bg-[#ffedd5] border border-[#f97316]/30 rounded-2xl p-4 flex items-center justify-between shadow-custom-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-[#c2410c]">
                  <span className="material-symbols-outlined text-[24px]">timelapse</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-[#c2410c] uppercase tracking-wider block">En Proceso</span>
                  <span className="text-xs text-[#c2410c]/80 font-medium">1% - 99% de avance</span>
                </div>
              </div>
              <span className="text-2xl font-extrabold text-[#c2410c]">
                {municipios.filter(m => m.progreso > 0 && m.progreso < 100).length}
              </span>
            </div>

            <div className="bg-[#dcfce7] border border-[#22c55e]/30 rounded-2xl p-4 flex items-center justify-between shadow-custom-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/80 flex items-center justify-center text-[#15803d]">
                  <span className="material-symbols-outlined text-[24px]">check_circle</span>
                </div>
                <div>
                  <span className="text-xs font-bold text-[#15803d] uppercase tracking-wider block">Completados</span>
                  <span className="text-xs text-[#15803d]/80 font-medium">100% de avance</span>
                </div>
              </div>
              <span className="text-2xl font-extrabold text-[#15803d]">
                {municipios.filter(m => m.progreso === 100).length}
              </span>
            </div>
          </div>
        )}

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

                <AreaOrdenanzaChips tieneAreaLocal={muni.tieneAreaLocal} tieneOrdenanza={muni.tieneOrdenanza} />
                <ContactosResumen datos={muni.contactos} />

                {/* Progress Section */}
                <div className="mb-lg">
                  <div className="flex justify-between items-center mb-xs">
                    <span className="font-label-md text-label-md text-on-surface">Progreso General</span>
                    <span className={`font-label-md text-label-md font-bold ${
                      muni.progreso === 100 ? 'text-[#15803d]' : muni.progreso > 0 ? 'text-[#c2410c]' : 'text-[#b91c1c]'
                    }`}>
                      {muni.progreso}%
                    </span>
                  </div>
                  <ProgressBar pct={muni.progreso} color={muni.progreso === 100 ? 'bg-[#22c55e]' : muni.progreso > 0 ? 'bg-[#f97316]' : 'bg-[#ef4444]'} />
                </div>

                {/* Real Sections Grid */}
                <div className="mb-lg">
                  <p className="font-label-sm text-label-sm text-outline mb-sm uppercase tracking-wider">
                    Módulos de Diagnóstico ({muni.secciones.length})
                  </p>
                  <div className="grid grid-cols-6 gap-xs bg-surface-container-low p-2 rounded-xl">
                    {muni.secciones.map((sec, index) => {
                      let iconName = sec.icon || 'circle'
                      let iconColor = 'text-outline-variant'
                      let isFilled = false

                      if (sec.status === 'completa') {
                        iconName = 'check_circle'
                        iconColor = 'text-[#10b981]'
                        isFilled = true
                      } else if (sec.status === 'iniciada') {
                        iconName = 'pending'
                        iconColor = 'text-amber-500'
                        isFilled = true
                      }

                      return (
                        <div
                          key={sec.id || index}
                          className="flex flex-col items-center justify-center p-1 relative group/tooltip"
                          title={`${sec.orden}. ${sec.name}: ${
                            sec.status === 'completa' ? 'Completa' : sec.status === 'iniciada' ? 'En proceso' : 'Sin empezar'
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
                            {sec.orden}. {sec.name}
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
          {isAdmin && (
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
          )}
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
      {isAdmin && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed right-md bottom-24 md:bottom-md md:right-md w-14 h-14 bg-primary text-on-primary rounded-full shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-40 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[24px]">add</span>
        </button>
      )}

      {/* Add Municipality Modal */}
      {isAdmin && showAddModal && (
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
              <div className="space-y-2">
                <label className="block text-label-md text-on-surface font-semibold">
                  Cohorte
                </label>
                <select
                  required
                  value={newMuniCohorteId}
                  onChange={(e) => setNewMuniCohorteId(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm cursor-pointer"
                >
                  <option value="" disabled>Seleccionar cohorte...</option>
                  {cohortes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} {!c.activa ? '(Inactiva)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['¿Tiene área local?', newMuniAreaLocal, setNewMuniAreaLocal],
                  ['¿Tiene ordenanza?', newMuniOrdenanza, setNewMuniOrdenanza],
                ].map(([titulo, valor, setValor]) => (
                  <div className="space-y-2" key={titulo}>
                    <label className="block text-label-md text-on-surface font-semibold">{titulo}</label>
                    <select
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-sm cursor-pointer"
                    >
                      <option value="">Sin dato</option>
                      <option value="si">Sí</option>
                      <option value="no">No</option>
                    </select>
                  </div>
                ))}
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
