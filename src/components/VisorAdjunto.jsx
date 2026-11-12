import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const BUCKET = 'intervenciones'

// adjunto_url guarda, en registros viejos, una URL "pública" de un bucket que es privado
// (no abre); las subidas nuevas guardan solo el path dentro del bucket. Se normaliza a path.
function pathDeAdjunto(adjunto) {
  const marca = `/${BUCKET}/`
  const i = adjunto.indexOf(marca)
  return i === -1 ? adjunto : decodeURIComponent(adjunto.slice(i + marca.length).split('?')[0])
}

function tipoDePath(path) {
  const ext = path.split('.').pop().toLowerCase()
  if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return 'imagen'
  if (ext === 'pdf') return 'pdf'
  return 'otro'
}

// Modal que descarga el adjunto con la sesión del usuario (el bucket es privado) y lo
// previsualiza si es imagen o PDF. Los Word no se previsualizan: solo descarga.
export default function VisorAdjunto({ adjunto, onClose }) {
  const path = pathDeAdjunto(adjunto)
  const tipo = tipoDePath(path)
  const nombre = path.split('/').pop()
  const [estado, setEstado] = useState({ cargando: true, url: null, error: null })

  useEffect(() => {
    let cancelado = false
    let objectUrl = null
    supabase.storage.from(BUCKET).download(path).then(({ data, error }) => {
      if (cancelado) return
      if (error || !data) {
        setEstado({ cargando: false, url: null, error: error?.message || 'No se pudo abrir el archivo' })
        return
      }
      objectUrl = URL.createObjectURL(data)
      setEstado({ cargando: false, url: objectUrl, error: null })
    })
    return () => {
      cancelado = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-[960px] h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-outline-variant/40">
          <div className="flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-primary text-[20px]">attachment</span>
            <span className="font-label-md text-on-surface font-semibold truncate">{nombre}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {estado.url && (
              <a
                href={estado.url}
                download={nombre}
                className="flex items-center gap-1 px-3 h-9 rounded-full bg-primary text-on-primary text-label-sm font-bold no-underline hover:opacity-90"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
                Descargar
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="w-9 h-9 rounded-full bg-surface-container hover:bg-surface-container-high border-none cursor-pointer flex items-center justify-center"
            >
              <span className="material-symbols-outlined text-[20px] text-on-surface-variant">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-surface-container flex items-center justify-center">
          {estado.cargando && (
            <span className="material-symbols-outlined text-[40px] animate-spin text-primary">sync</span>
          )}
          {estado.error && (
            <div className="text-center p-8 space-y-2">
              <span className="material-symbols-outlined text-[40px] text-error">error</span>
              <p className="font-body-md text-on-surface">No se pudo abrir el adjunto</p>
              <p className="text-xs text-on-surface-variant">{estado.error}</p>
            </div>
          )}
          {estado.url && tipo === 'imagen' && (
            <img src={estado.url} alt={nombre} className="max-w-full max-h-full object-contain" />
          )}
          {estado.url && tipo === 'pdf' && (
            <iframe src={estado.url} title={nombre} className="w-full h-full border-none" />
          )}
          {estado.url && tipo === 'otro' && (
            <div className="text-center p-8 space-y-2">
              <span className="material-symbols-outlined text-[48px] text-outline">description</span>
              <p className="font-body-md text-on-surface">Este tipo de archivo no tiene vista previa</p>
              <p className="text-xs text-on-surface-variant">Usá el botón Descargar para abrirlo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
