import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { CAMPOS_CONTACTOS } from '../lib/contactosMunicipio'

const CONTACTOS = [
  { n: 1, titulo: 'Contacto 1' },
  { n: 2, titulo: 'Contacto 2' },
]

const hayDatos = (datos, n) => ['nombre', 'cargo', 'telefono', 'email'].some(c => datos[`contacto${n}_${c}`])

// Versión compacta para la card de la lista de municipios
export function ContactosResumen({ datos }) {
  const contactos = CONTACTOS.filter(c => hayDatos(datos, c.n))
  if (!datos.intendente_nombre && contactos.length === 0) {
    return <p className="text-label-sm text-on-surface-variant italic mb-md">Sin datos de intendencia ni contactos</p>
  }
  return (
    <div className="mb-md space-y-2 text-label-md text-on-surface">
      {datos.intendente_nombre && (
        <p className="flex items-start gap-2 m-0">
          <span className="material-symbols-outlined text-[18px] text-outline">account_balance</span>
          <span>
            <span className="text-on-surface-variant">Intendente/a: </span>
            <strong>{datos.intendente_nombre}</strong>
            {datos.intendente_partido && <span className="text-on-surface-variant"> · {datos.intendente_partido}</span>}
          </span>
        </p>
      )}
      {contactos.map(({ n, titulo }) => {
        const nombre = datos[`contacto${n}_nombre`]
        const cargo = datos[`contacto${n}_cargo`]
        const telefono = datos[`contacto${n}_telefono`]
        const email = datos[`contacto${n}_email`]
        return (
          <div key={n} className="flex items-start gap-2">
            <span className="material-symbols-outlined text-[18px] text-outline">person</span>
            <div className="min-w-0">
              <p className="m-0">
                <strong>{nombre || titulo}</strong>
                {cargo && <span className="text-on-surface-variant"> · {cargo}</span>}
              </p>
              <div className="flex flex-wrap gap-x-3 text-label-sm">
                {telefono && (
                  <a href={`tel:${telefono.replace(/\s+/g, '')}`} className="text-primary no-underline hover:underline">{telefono}</a>
                )}
                {email && <a href={`mailto:${email}`} className="text-primary no-underline hover:underline break-all">{email}</a>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function Dato({ icono, valor, href }) {
  if (!valor) return null
  const contenido = (
    <span className="flex items-center gap-2 text-on-surface">
      <span className="material-symbols-outlined text-[18px] text-outline">{icono}</span>
      <span className="break-all">{valor}</span>
    </span>
  )
  return href
    ? <a href={href} className="no-underline hover:underline text-on-surface">{contenido}</a>
    : contenido
}

function TarjetaContacto({ titulo, n, datos }) {
  const vacio = !hayDatos(datos, n)
  return (
    <div className="flex-1 bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 border-secondary p-md">
      <span className="text-label-sm text-outline uppercase tracking-wider block mb-2">{titulo}</span>
      {vacio ? (
        <p className="text-on-surface-variant italic text-label-md">Sin cargar</p>
      ) : (
        <div className="space-y-2 font-body-md">
          {datos[`contacto${n}_nombre`] && (
            <p className="font-bold text-on-surface text-body-lg">{datos[`contacto${n}_nombre`]}</p>
          )}
          <Dato icono="badge" valor={datos[`contacto${n}_cargo`]} />
          <Dato icono="call" valor={datos[`contacto${n}_telefono`]} href={`tel:${(datos[`contacto${n}_telefono`] ?? '').replace(/\s+/g, '')}`} />
          <Dato icono="mail" valor={datos[`contacto${n}_email`]} href={`mailto:${datos[`contacto${n}_email`]}`} />
        </div>
      )}
    </div>
  )
}

function Campo({ id, etiqueta, valor, onChange, type = 'text', placeholder }) {
  return (
    <div>
      <label htmlFor={id} className="font-label-md text-label-md text-on-surface-variant block mb-1">{etiqueta}</label>
      <input
        id={id}
        type={type}
        value={valor ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-11 px-3 bg-surface-container rounded-xl border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary font-body-md text-on-surface"
      />
    </div>
  )
}

// Panel del detalle del municipio: intendente/a y dos contactos. Muestra y permite editar.
export default function ContactosMunicipio({ idMunicipio, datos, puedeEditar, onGuardado }) {
  const [editando, setEditando] = useState(false)
  const [form, setForm] = useState(datos)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState(null)

  const set = (campo) => (valor) => setForm(f => ({ ...f, [campo]: valor }))

  const abrirEdicion = () => {
    setForm(datos)
    setError(null)
    setEditando(true)
  }

  const guardar = async () => {
    const payload = Object.fromEntries(CAMPOS_CONTACTOS.map(c => [c, form[c]?.trim() || null]))
    const emailInvalido = ['contacto1_email', 'contacto2_email'].find(c => payload[c] && !/^\S+@\S+\.\S+$/.test(payload[c]))
    if (emailInvalido) {
      setError('El mail ingresado no es válido')
      return
    }

    setGuardando(true)
    setError(null)
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
    <section className="mb-xl" aria-label="Intendencia y contactos">
      <div className="flex items-center justify-between mb-sm">
        <h2 className="font-headline-md text-headline-md text-on-surface">Intendencia y contactos</h2>
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
        <div className="space-y-md">
          <div className="bg-surface-container-lowest rounded-2xl shadow-sm border-l-4 border-primary p-md flex flex-col md:flex-row md:items-center md:justify-between gap-sm">
            <div className="flex items-center gap-md">
              <span className="material-symbols-outlined text-[32px] rounded-full p-2 bg-primary-container text-on-primary-container">account_balance</span>
              <div>
                <span className="text-label-sm text-outline uppercase tracking-wider block">Intendente/a</span>
                <span className={`text-headline-md font-bold ${datos.intendente_nombre ? 'text-on-surface' : 'text-on-surface-variant italic font-normal'}`}>
                  {datos.intendente_nombre || 'Sin cargar'}
                </span>
              </div>
            </div>
            {datos.intendente_partido && (
              <span className="self-start md:self-center inline-flex items-center gap-1 px-4 py-1 rounded-full bg-secondary-container text-on-secondary-container font-bold text-label-md">
                <span className="material-symbols-outlined text-[18px]">flag</span>
                {datos.intendente_partido}
              </span>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-md">
            {CONTACTOS.map(c => <TarjetaContacto key={c.n} titulo={c.titulo} n={c.n} datos={datos} />)}
          </div>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-md space-y-md">
          <div>
            <h3 className="font-label-md text-label-md text-on-surface font-semibold mb-2">Intendente/a</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
              <Campo id="intendente_nombre" etiqueta="Nombre" valor={form.intendente_nombre} onChange={set('intendente_nombre')} />
              <Campo id="intendente_partido" etiqueta="Partido político" valor={form.intendente_partido} onChange={set('intendente_partido')} />
            </div>
          </div>
          {CONTACTOS.map(({ n, titulo }) => (
            <div key={n}>
              <h3 className="font-label-md text-label-md text-on-surface font-semibold mb-2">{titulo}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                <Campo id={`contacto${n}_nombre`} etiqueta="Nombre" valor={form[`contacto${n}_nombre`]} onChange={set(`contacto${n}_nombre`)} />
                <Campo id={`contacto${n}_cargo`} etiqueta="Cargo" valor={form[`contacto${n}_cargo`]} onChange={set(`contacto${n}_cargo`)} />
                <Campo id={`contacto${n}_telefono`} etiqueta="Teléfono" type="tel" valor={form[`contacto${n}_telefono`]} onChange={set(`contacto${n}_telefono`)} />
                <Campo id={`contacto${n}_email`} etiqueta="Mail" type="email" valor={form[`contacto${n}_email`]} onChange={set(`contacto${n}_email`)} />
              </div>
            </div>
          ))}
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
