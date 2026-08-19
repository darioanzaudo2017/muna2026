import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SlideBar from '../components/SlideBar'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function formatBytes(bytes) {
  if (!bytes || isNaN(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function IdentidadVisual() {
  const navigate = useNavigate()
  const { signOut, isAdmin, user } = useAuth()

  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [recursos, setRecursos] = useState([])
  const [signedUrls, setSignedUrls] = useState({})
  const [loading, setLoading] = useState(true)

  // Toast notification state
  const [notification, setNotification] = useState(null)

  // Upload modal & form states (Admin only)
  const [showAddModal, setShowAddModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [formNombre, setFormNombre] = useState('')
  const [formDescripcion, setFormDescripcion] = useState('')
  const [formTipo, setFormTipo] = useState('logo')
  const [formOrden, setFormOrden] = useState(0)
  const [selectedFile, setSelectedFile] = useState(null)

  const showToast = (message, type = 'success') => {
    setNotification({ message, type })
    setTimeout(() => setNotification(null), 4000)
  }

  useEffect(() => {
    fetchRecursos()
  }, [])

  async function fetchRecursos() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('recursos_identidad_visual')
        .select('*')
        .order('orden', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) throw error

      const items = data ?? []
      setRecursos(items)

      // Generar signed URLs para previsualización e interacciones
      const urls = {}
      await Promise.all(
        items.map(async (item) => {
          try {
            const { data: signedData } = await supabase.storage
              .from('identidad-visual')
              .createSignedUrl(item.storage_path, 3600)
            if (signedData?.signedUrl) {
              urls[item.id] = signedData.signedUrl
            }
          } catch (err) {
            console.error('Error generando Signed URL para:', item.id, err)
          }
        })
      )
      setSignedUrls(urls)
    } catch (err) {
      console.error('Error al cargar recursos:', err)
      showToast('No se pudieron cargar los recursos de identidad visual.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenResource = async (recurso) => {
    try {
      let url = signedUrls[recurso.id]
      if (!url) {
        const { data, error } = await supabase.storage
          .from('identidad-visual')
          .createSignedUrl(recurso.storage_path, 3600)
        if (error) throw error
        url = data?.signedUrl
      }
      if (url) {
        window.open(url, '_blank')
      } else {
        showToast('No se pudo resolver el enlace de descarga.', 'error')
      }
    } catch (err) {
      console.error('Error al abrir recurso:', err)
      showToast('Error al intentar abrir o descargar el archivo.', 'error')
    }
  }

  const handleUploadSubmit = async (e) => {
    e.preventDefault()
    if (!isAdmin) return

    if (!selectedFile) {
      showToast('Por favor seleccione un archivo.', 'error')
      return
    }
    if (!formNombre.trim()) {
      showToast('Por favor ingrese un nombre para el recurso.', 'error')
      return
    }

    // Validar tamaño (máximo 10MB)
    const MAX_SIZE = 10 * 1024 * 1024
    if (selectedFile.size > MAX_SIZE) {
      showToast('El archivo no puede superar los 10MB.', 'error')
      return
    }

    // Validar tipo Mime
    const allowedTypes = [
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/webp',
      'image/svg+xml',
      'application/pdf'
    ]
    if (!allowedTypes.includes(selectedFile.type)) {
      showToast('Formato no permitido. Use imágenes (PNG, JPG, WEBP, SVG) o PDF.', 'error')
      return
    }

    setUploading(true)

    try {
      // Clean path
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')
      const storagePath = `${Date.now()}_${sanitizedName}`

      // 1. Upload file to Storage
      const { error: uploadError } = await supabase.storage
        .from('identidad-visual')
        .upload(storagePath, selectedFile, {
          contentType: selectedFile.type,
          upsert: false
        })

      if (uploadError) throw uploadError

      // 2. Insert record into database
      const { error: dbError } = await supabase
        .from('recursos_identidad_visual')
        .insert({
          tipo: formTipo,
          nombre: formNombre.trim(),
          descripcion: formDescripcion.trim() || null,
          storage_path: storagePath,
          mime_type: selectedFile.type,
          tamano_bytes: selectedFile.size,
          orden: Number(formOrden) || 0,
          created_by: user?.id || null
        })

      if (dbError) {
        // Cleanup storage on DB insert failure
        await supabase.storage.from('identidad-visual').remove([storagePath])
        throw dbError
      }

      showToast('Recurso publicado con éxito', 'success')
      setShowAddModal(false)
      setFormNombre('')
      setFormDescripcion('')
      setFormTipo('logo')
      setFormOrden(0)
      setSelectedFile(null)
      fetchRecursos()
    } catch (err) {
      console.error('Error al subir recurso:', err)
      showToast(err.message || 'Ocurrió un error al subir el recurso.', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteResource = async (recurso) => {
    if (!isAdmin) return

    if (!window.confirm(`¿Está seguro de que desea eliminar "${recurso.nombre}"?`)) {
      return
    }

    try {
      // Delete from storage first
      const { error: storageError } = await supabase.storage
        .from('identidad-visual')
        .remove([recurso.storage_path])

      if (storageError) {
        console.warn('Error borrando de storage:', storageError)
      }

      // Delete from DB table
      const { error: dbError } = await supabase
        .from('recursos_identidad_visual')
        .delete()
        .eq('id', recurso.id)

      if (dbError) throw dbError

      showToast('Recurso eliminado correctamente', 'success')
      fetchRecursos()
    } catch (err) {
      console.error('Error al eliminar recurso:', err)
      showToast('No se pudo eliminar el recurso.', 'error')
    }
  }

  // Group items by category
  const logos = recursos.filter(r => r.tipo === 'logo')
  const manuales = recursos.filter(r => r.tipo === 'manual')
  const otros = recursos.filter(r => r.tipo === 'otro')

  const isImageMime = (mime) => mime && mime.startsWith('image/')

  const renderResourceCard = (item) => {
    const signedUrl = signedUrls[item.id]
    const isImage = isImageMime(item.mime_type) || item.tipo === 'logo'

    return (
      <div
        key={item.id}
        className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-5 shadow-custom-sm hover:shadow-custom-md transition-all flex flex-col justify-between group"
      >
        <div>
          {/* Card Header Media / Icon Preview */}
          <div className="w-full h-44 rounded-xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-center overflow-hidden mb-4 relative">
            {isImage && signedUrl ? (
              <img
                src={signedUrl}
                alt={item.nombre}
                className="max-h-full max-w-full object-contain p-3 group-hover:scale-105 transition-transform duration-300"
              />
            ) : item.mime_type === 'application/pdf' || item.tipo === 'manual' ? (
              <div className="flex flex-col items-center gap-2 text-primary">
                <span className="material-symbols-outlined text-[56px]">picture_as_pdf</span>
                <span className="text-xs font-bold uppercase tracking-wider bg-error-container text-on-error-container px-2.5 py-0.5 rounded-full">
                  PDF
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-outline">
                <span className="material-symbols-outlined text-[56px]">folder_zip</span>
                <span className="text-xs font-bold uppercase tracking-wider bg-surface-container-high px-2.5 py-0.5 rounded-full">
                  Archivo
                </span>
              </div>
            )}

            {/* Type badge */}
            <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-surface-container-lowest/90 border border-outline-variant/40 text-on-surface shadow-xs backdrop-blur-xs">
              {item.tipo === 'logo' ? 'Logo' : item.tipo === 'manual' ? 'Manual' : 'Otro'}
            </span>
          </div>

          {/* Title & Description */}
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-1">
            {item.nombre}
          </h3>
          {item.descripcion ? (
            <p className="font-body-md text-sm text-on-surface-variant mt-1.5 line-clamp-2 leading-relaxed">
              {item.descripcion}
            </p>
          ) : (
            <p className="text-xs text-outline italic mt-1.5">Sin descripción corta</p>
          )}
        </div>

        {/* Card Footer Actions */}
        <div className="mt-5 pt-4 border-t border-outline-variant/30 flex items-center justify-between gap-2">
          <span className="text-xs font-mono text-outline font-medium">
            {formatBytes(item.tamano_bytes)}
          </span>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => handleDeleteResource(item)}
                className="p-2 rounded-xl text-error hover:bg-error-container/20 transition-colors border-none bg-transparent cursor-pointer"
                title="Eliminar recurso"
              >
                <span className="material-symbols-outlined text-[20px]">delete</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenResource(item)}
              className="bg-primary text-on-primary px-4 py-2 rounded-xl font-label-md text-xs font-semibold flex items-center gap-1.5 hover:bg-primary-container transition-all active:scale-95 border-none cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Descargar / Ver
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden min-h-screen selection:bg-primary-fixed">
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

      {/* Top Header */}
      <header className="fixed top-0 w-full z-45 bg-surface shadow-sm flex justify-between items-center px-gutter h-16 border-b border-outline-variant md:pl-64">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden material-symbols-outlined text-primary p-2 rounded-full hover:bg-surface-variant transition-colors bg-transparent border-none cursor-pointer"
            title="Abrir menú"
          >
            menu
          </button>
          <span className="font-headline-md text-headline-md font-bold text-primary">Identidad Visual</span>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Main Content Area */}
      <main className="md:ml-64 pt-24 pb-32 px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
        {/* Title Header Section */}
        <section className="mb-xl flex flex-col md:flex-row md:items-end justify-between gap-md">
          <div>
            <h1 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-on-surface">
              Identidad Visual y Marca
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-sm">
              Logotipos oficiales, isotipos y manuales de marca institucional para uso de los municipios participantes.
            </p>
          </div>

          {isAdmin && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-primary text-on-primary px-lg py-sm rounded-xl font-label-md text-label-md flex items-center gap-xs hover:bg-primary-container transition-all active:scale-95 cursor-pointer border-none shadow-sm shrink-0"
            >
              <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
              Subir Recurso
            </button>
          )}
        </section>

        {/* Loading Spinner */}
        {loading ? (
          <div className="flex justify-center items-center py-32">
            <span className="material-symbols-outlined animate-spin text-primary text-[48px]">sync</span>
          </div>
        ) : recursos.length === 0 ? (
          /* Empty State */
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-12 text-center max-w-[576px] mx-auto my-12 shadow-custom-sm">
            <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mx-auto mb-4 text-primary">
              <span className="material-symbols-outlined text-[36px]">palette</span>
            </div>
            <h3 className="font-headline-md text-lg font-bold text-on-surface">
              Todavía no se cargaron logos ni manuales
            </h3>
            <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">
              {isAdmin
                ? 'Comenzá subiendo el logotipo oficial o la guía de marca para compartir con todos los municipios.'
                : 'Los recursos de comunicación estarán disponibles cuando el administrador los publique.'}
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-label-md text-sm font-bold inline-flex items-center gap-2 hover:bg-primary-container transition-all border-none cursor-pointer shadow-xs"
              >
                <span className="material-symbols-outlined text-[18px]">add</span>
                Subir primer recurso
              </button>
            )}
          </div>
        ) : (
          /* Resource Sections */
          <div className="space-y-12">
            {/* 🎨 Logos Section */}
            {logos.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
                  <span className="material-symbols-outlined text-primary text-[24px]">palette</span>
                  <h2 className="font-headline-md text-xl font-bold text-on-surface">Logotipos Oficiales</h2>
                  <span className="text-xs font-bold text-outline bg-surface-container-high px-2.5 py-0.5 rounded-full ml-2">
                    {logos.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                  {logos.map(renderResourceCard)}
                </div>
              </section>
            )}

            {/* 📖 Manuales Section */}
            {manuales.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
                  <span className="material-symbols-outlined text-primary text-[24px]">menu_book</span>
                  <h2 className="font-headline-md text-xl font-bold text-on-surface">Manuales de Marca y Guías</h2>
                  <span className="text-xs font-bold text-outline bg-surface-container-high px-2.5 py-0.5 rounded-full ml-2">
                    {manuales.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                  {manuales.map(renderResourceCard)}
                </div>
              </section>
            )}

            {/* 📁 Otros Recursos Section */}
            {otros.length > 0 && (
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-3">
                  <span className="material-symbols-outlined text-primary text-[24px]">folder</span>
                  <h2 className="font-headline-md text-xl font-bold text-on-surface">Otros Recursos</h2>
                  <span className="text-xs font-bold text-outline bg-surface-container-high px-2.5 py-0.5 rounded-full ml-2">
                    {otros.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                  {otros.map(renderResourceCard)}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Admin Upload Modal */}
      {showAddModal && isAdmin && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-[80] flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-[512px] w-full p-6 shadow-2xl border border-outline-variant/40 space-y-6 animate-scale-in">
            <div className="flex justify-between items-center border-b border-outline-variant/30 pb-4">
              <div className="flex items-center gap-2 text-primary font-bold text-lg">
                <span className="material-symbols-outlined text-[24px]">cloud_upload</span>
                <span>Subir Recurso de Identidad Visual</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="material-symbols-outlined text-outline hover:text-on-surface border-none bg-transparent cursor-pointer p-1 rounded-full"
              >
                close
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Tipo de recurso *
                </label>
                <select
                  value={formTipo}
                  onChange={(e) => setFormTipo(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary text-on-surface"
                >
                  <option value="logo">Logo / Isotipo</option>
                  <option value="manual">Manual de Marca (PDF)</option>
                  <option value="otro">Otro Recurso</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Nombre del recurso *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Logo Oficial PNG Transparente"
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Descripción corta (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Breve especificación de uso..."
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary text-on-surface resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Orden de visualización
                </label>
                <input
                  type="number"
                  value={formOrden}
                  onChange={(e) => setFormOrden(e.target.value)}
                  className="w-full px-4 py-2.5 bg-surface-container-low border border-outline-variant/50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary text-on-surface"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">
                  Archivo * (Máx 10MB)
                </label>
                <input
                  type="file"
                  required
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                  onChange={(e) => setSelectedFile(e.target.files[0] || null)}
                  className="w-full text-xs text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/30">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-surface-container transition-colors border-none bg-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="bg-primary text-on-primary px-5 py-2 rounded-xl text-sm font-semibold hover:bg-primary-container transition-all border-none cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">cloud_upload</span>
                      Publicar Recurso
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
