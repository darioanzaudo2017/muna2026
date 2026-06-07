import React from 'react'

export default function SaveIndicator({ status = 'idle' }) {
  // status: 'idle' | 'saving' | 'saved' | 'error'
  
  if (status === 'saving') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-primary font-semibold animate-pulse">
        <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
        <span>Guardando...</span>
      </div>
    )
  }

  if (status === 'saved') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 font-bold bg-green-50 px-2.5 py-1 rounded-full border border-green-200/40">
        <span className="material-symbols-outlined text-[16px]">cloud_done</span>
        <span>Cambios guardados</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex items-center gap-1.5 text-xs text-error font-bold bg-error-container/20 px-2.5 py-1 rounded-full border border-error/20">
        <span className="material-symbols-outlined text-[16px]">cloud_off</span>
        <span>Error al guardar</span>
      </div>
    )
  }

  // Idle state - default subtle indicator
  return (
    <div className="flex items-center gap-1.5 text-xs text-outline font-semibold">
      <span className="material-symbols-outlined text-[16px]">cloud_queue</span>
      <span>Todo guardado</span>
    </div>
  )
}
