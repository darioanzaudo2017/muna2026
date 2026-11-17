import { useState } from 'react'
import { supabase } from '../lib/supabase'

// tiene_area_local / tiene_ordenanza son booleanos nullables: null = todavía sin relevar.
// Los colores son un semáforo fijo, independiente de la paleta de marca (igual que el estado de avance).
const ESTADOS = {
  true: { label: 'Sí', icon: 'check_circle', clases: 'bg-[#dcfce7] text-[#15803d]', borde: 'border-[#22c55e]' },
  false: { label: 'No', icon: 'cancel', clases: 'bg-[#fee2e2] text-[#b91c1c]', borde: 'border-[#ef4444]' },
  null: { label: 'Sin dato', icon: 'help', clases: 'bg-surface-container text-outline', borde: 'border-outline-variant' },
}

const estadoDe = (valor) => ESTADOS[valor === true ? 'true' : valor === false ? 'false' : 'null']

// Chips compactos para la card de la lista de municipios
export function AreaOrdenanzaChips({ tieneAreaLocal, tieneOrdenanza }) {
  const items = [
    { titulo: 'Área local', valor: tieneAreaLocal },
    { titulo: 'Ordenanza', valor: tieneOrdenanza },
  ]
  return (
    <div className="flex flex-wrap gap-2 mb-md">
      {items.map(({ titulo, valor }) => {
        const e = estadoDe(valor)
        return (
          <span
            key={titulo}
            className={`${e.clases} inline-flex items-center gap-1 px-sm py-xs rounded-full text-label-sm font-semibold`}
            title={`${titulo}: ${e.label}`}
          >
            <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{e.icon}</span>
            {titulo}: {e.label}
          </span>
        )
      })}
    </div>
  )
}

const OPCIONES = [
  { valor: true, label: 'Sí' },
  { valor: false, label: 'No' },
  { valor: null, label: 'Sin dato' },
]

function SelectorTriestado({ valor, onChange, nombre }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={nombre}>
      {OPCIONES.map(op => (
        <button
          key={op.label}
          type="button"
          role="radio"
          aria-checked={valor === op.valor}
          onClick={() => onChange(op.valor)}
          className={`px-4 h-10 rounded-full text-label-md font-bold border-none cursor-pointer transition-colors ${
            valor === op.valor ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}

function TarjetaEstado({ titulo, icono, valor }) {
  const e = estadoDe(valor)
  return (
    <div className={`flex-1 bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 ${e.borde} p-md flex items-center gap-md`}>
      <span className={`material-symbols-outlined text-[32px] rounded-full p-2 ${e.clases}`} style={{ fontVariationSettings: "'FILL' 1" }}>
        {icono}
      </span>
      <div>
        <span className="text-label-sm text-outline uppercase tracking-wider block">{titulo}</span>
        <span className={`inline-flex items-center gap-1 mt-1 px-3 py-1 rounded-full text-headline-md font-bold ${e.clases}`}>
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{e.icon}</span>
          {e.label}
        </span>
      </div>
    </div>
  )
}

// Panel destacado del detalle del municipio: muestra y permite editar área local / ordenanza.
export default function AreaOrdenanzaPanel({ idMunicipio, datos, puedeEditar, onGuardado }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(datos)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const abrirEdicion = () => {
    setForm(datos)
    setError(null)
    setEditando(true)
  }

  const guardar = async () => {
    setGuardando(true)
    setError(null)
    const payload = {
      tiene_area_local: form.tiene_area_local,
      tiene_ordenanza: form.tiene_ordenanza,
      area_ordenanza_observacion: form.area_ordenanza_observacion?.trim() || null,
    }
    // .select() permite detectar un UPDATE que la RLS dejó pasar sin tocar filas
    const { data, error: err } = await supabase
      .from('municipios')
      .update(payload)
      .eq('id', idMunicipio)
      .select('id')
      .maybeSingle()
    setGuardando(false)
    if (err || !data) {
      setError(err?.message || 'No se pudo guardar: no tenés permiso sobre este municipio')
      return
    }
    onGuardado(payload)
    setEditando(false)
  }

  return (
    <section className="mb-xl" aria-label="Área local y ordenanza">
      <div className="flex items-center justify-between mb-sm">
        <h2 className="font-headline-md text-headline-md text-on-surface">Área local y ordenanza</h2>
        {puedeEditar && !editando && (
          <button
            type="button"
            onClick={abrirEdicion}
            className="flex items-center gap-1 px-4 h-10 rounded-full bg-surface-container-high text-primary font-bold text-label-md border-none cursor-pointer hover:bg-primary hover:text-on-primary transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
            Editar
          </button>
        )}
      </div>

      {!editando ? (
        <>
          <div className="flex flex-col md:flex-row gap-md">
            <TarjetaEstado titulo="¿Tiene área local?" icono="domain" valor={datos.tiene_area_local} />
            <TarjetaEstado titulo="¿Tiene ordenanza?" icono="gavel" valor={datos.tiene_ordenanza} />
          </div>
          {datos.area_ordenanza_observacion && (
            <div className="mt-md bg-surface-container-lowest rounded-2xl shadow-sm p-md">
              <span className="text-label-sm text-outline uppercase tracking-wider block mb-1">Observación</span>
              <p className="font-body-md text-on-surface whitespace-pre-line">{datos.area_ordenanza_observacion}</p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-md space-y-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm">
            <span className="font-label-md text-label-md text-on-surface font-semibold">¿Tiene área local?</span>
            <SelectorTriestado nombre="Tiene área local" valor={form.tiene_area_local} onChange={v => setForm(f => ({ ...f, tiene_area_local: v }))} />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-sm">
            <span className="font-label-md text-label-md text-on-surface font-semibold">¿Tiene ordenanza?</span>
            <SelectorTriestado nombre="Tiene ordenanza" valor={form.tiene_ordenanza} onChange={v => setForm(f => ({ ...f, tiene_ordenanza: v }))} />
          </div>
          <div>
            <label className="font-label-md text-label-md text-on-surface font-semibold block mb-1" htmlFor="obs-area-ordenanza">
              Observación (opcional)
            </label>
            <textarea
              id="obs-area-ordenanza"
              rows={3}
              value={form.area_ordenanza_observacion ?? ''}
              onChange={e => setForm(f => ({ ...f, area_ordenanza_observacion: e.target.value }))}
              placeholder="Nombre del área, número o nombre de la ordenanza, aclaraciones…"
              className="w-full p-3 bg-surface-container rounded-xl border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-on-surface resize-none"
            />
          </div>
          {error && <p className="text-error text-label-md">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditando(false)}
              disabled={guardando}
              className="px-5 h-10 rounded-full bg-surface-container text-on-surface-variant font-bold text-label-md border-none cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={guardar}
              disabled={guardando}
              className="px-5 h-10 rounded-full bg-primary text-on-primary font-bold text-label-md border-none cursor-pointer disabled:opacity-60"
            >
              {guardando ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
