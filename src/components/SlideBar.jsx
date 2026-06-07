import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SlideBar({ isOpen, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { signOut, isAdmin, profile, user } = useAuth()

  const currentPath = location.pathname

  const menuItems = [
    {
      name: 'Municipios',
      icon: 'location_city',
      path: '/',
      adminOnly: false,
      desc: 'Lista y autodiagnósticos'
    },
    {
      name: 'Usuarios',
      icon: 'group',
      path: '/admin/usuarios',
      adminOnly: true,
      desc: 'Roles y permisos'
    },
    {
      name: 'Preguntas',
      icon: 'quiz',
      path: '/admin/preguntas',
      adminOnly: true,
      desc: 'Configurar cuestionario'
    }
  ]

  const handleNavigate = (path) => {
    navigate(path)
    if (onClose) onClose()
  }

  const handleLogout = async () => {
    if (window.confirm('¿Desea cerrar la sesión actual?')) {
      await signOut()
      navigate('/login')
    }
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface-container-low border-r border-outline-variant/30 text-on-surface py-lg select-none">
      {/* Brand Profile header */}
      <div className="px-6 mb-8 flex flex-col gap-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-on-primary font-bold">
            MG
          </div>
          <div>
            <h2 className="font-headline-md text-[18px] text-primary font-bold leading-tight">Municipal</h2>
            <p className="font-label-sm text-label-sm text-outline">Guardian System</p>
          </div>
        </div>

        {/* User Card */}
        {profile && (
          <div className="bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30 mt-4">
            <div className="font-label-md text-label-md font-bold text-on-surface truncate">{profile.full_name || 'Operador'}</div>
            <div className="font-label-sm text-label-sm text-on-surface-variant/70 truncate mt-0.5">{profile.email}</div>
            <span className={`inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
              isAdmin ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-primary/10 text-primary'
            }`}>
              {profile.role}
            </span>
          </div>
        )}
      </div>

      {/* Navigation List */}
      <div className="flex-1 space-y-2 px-3">
        <div className="text-[11px] font-bold text-outline px-4 mb-2 uppercase tracking-wider">Navegación</div>
        {menuItems.map((item) => {
          if (item.adminOnly && !isAdmin) return null

          const isActive = currentPath === item.path
          return (
            <button
              key={item.path}
              onClick={() => handleNavigate(item.path)}
              className={`w-full flex items-center gap-md px-4 py-3.5 rounded-xl text-left transition-all border-none cursor-pointer group ${
                isActive
                  ? 'bg-primary text-on-primary font-bold shadow-custom-sm'
                  : 'bg-transparent text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] transition-transform duration-200 group-hover:scale-105 ${
                isActive ? 'text-on-primary' : 'text-primary'
              }`} style={{ fontVariationSettings: isActive ? "'FILL' 1" : "" }}>
                {item.icon}
              </span>
              <div className="flex flex-col">
                <span className="font-label-md text-label-md leading-normal">{item.name}</span>
                <span className={`text-[10px] font-medium leading-none mt-0.5 ${isActive ? 'text-on-primary/70' : 'text-outline'}`}>
                  {item.desc}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Bottom Signout area */}
      <div className="px-3 pt-4 border-t border-outline-variant/30">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-md px-4 py-3.5 rounded-xl text-left text-error hover:bg-error-container/20 hover:text-error transition-all border-none bg-transparent cursor-pointer group"
        >
          <span className="material-symbols-outlined text-[22px] text-error group-hover:rotate-6 transition-transform">
            logout
          </span>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md font-bold">Cerrar Sesión</span>
            <span className="text-[10px] text-error/75">Salir de la aplicación</span>
          </div>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 h-screen w-64 z-40">
        {sidebarContent}
      </aside>

      {/* Mobile Slidebar Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-[60] md:hidden animate-fade-in transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Mobile Slidebar Drawer Panel */}
      <div
        className={`fixed left-0 top-0 h-screen w-64 bg-surface z-[70] md:hidden shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  )
}
