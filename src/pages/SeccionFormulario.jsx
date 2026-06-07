import { useState } from 'react'

// ─── Celda individual según tipo de columna ──────────────────────────────────
function CeldaInput({ col, value, onChange }) {
  if (col.tipo === 'boolean') {
    return (
      <div className="flex gap-1">
        {[['si', 'Sí'], ['no', 'No']].map(([val, label]) => (
          <button key={val} type="button"
            onClick={() => onChange(value === val ? '' : val)}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-colors ${
              value === val ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >{label}</button>
        ))}
      </div>
    )
  }
  if (col.tipo === 'numero') {
    return (
      <input type="number" min="0" placeholder="—" value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="w-full h-9 px-3 bg-surface rounded-lg border border-outline-variant text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
      />
    )
  }
  if (col.tipo === 'opcion' && col.opciones) {
    return (
      <select value={value ?? ''} onChange={e => onChange(e.target.value)}
        className="w-full h-9 px-2 bg-surface rounded-lg border border-outline-variant text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">—</option>
        {col.opciones.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  return (
    <input type="text" placeholder={col.label} value={value ?? ''}
      onChange={e => onChange(e.target.value)}
      className="w-full h-9 px-3 bg-surface rounded-lg border border-outline-variant text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
    />
  )
}

// ─── Tabla FIJA: filas predefinidas por opciones_pregunta ─────────────────────
function TablaFija({ pregunta, currentAnswer, onChange }) {
  const columnas = pregunta.config?.columnas ?? [{ key: 'cantidad', label: 'Cantidad', tipo: 'numero' }]
  const filas = pregunta.opciones_pregunta ?? []
  const rows = Array.isArray(currentAnswer.valor_array) ? currentAnswer.valor_array : []

  const getVal = (filaValor, colKey) => {
    const row = rows.find(r => r._fila === filaValor)
    return row ? row[colKey] : ''
  }

  const setVal = (fila, colKey, value) => {
    const existing = rows.find(r => r._fila === fila.valor)
    const newRows = existing
      ? rows.map(r => r._fila === fila.valor ? { ...r, [colKey]: value } : r)
      : [...rows, { _fila: fila.valor, _etiqueta: fila.etiqueta, [colKey]: value }]
    onChange(pregunta.id, 'valor_array', newRows)
  }

  const colsStyle = { gridTemplateColumns: `1fr ${columnas.map(() => '140px').join(' ')}` }

  return (
    <div className="border border-outline-variant/40 rounded-xl overflow-hidden">
      <div className="grid gap-3 px-4 py-2 bg-surface-container text-[10px] font-bold text-outline uppercase tracking-wider" style={colsStyle}>
        <span>Indicador</span>
        {columnas.map(col => <span key={col.key} className="text-center">{col.label}</span>)}
      </div>
      {filas.map((fila, i) => (
        <div key={fila.valor} className={`grid gap-3 px-4 py-3 items-center ${i % 2 === 0 ? 'bg-surface-container-lowest' : 'bg-surface'}`} style={colsStyle}>
          <span className="text-sm font-medium text-on-surface">{fila.etiqueta}</span>
          {columnas.map(col => (
            <CeldaInput key={col.key} col={col} value={getVal(fila.valor, col.key)} onChange={val => setVal(fila, col.key, val)} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ─── Tabla DINÁMICA: el usuario agrega/elimina filas ─────────────────────────
function TabladinamicaComp({ pregunta, currentAnswer, onChange }) {
  const columnas = pregunta.config?.columnas ?? []
  const rows = Array.isArray(currentAnswer.valor_array) ? currentAnswer.valor_array : []
  const emptyRow = () => Object.fromEntries(columnas.map(c => [c.key, '']))
  const [newRow, setNewRow] = useState(emptyRow)

  const handleAdd = () => {
    const firstKey = columnas[0]?.key
    if (!firstKey || !newRow[firstKey]) return
    onChange(pregunta.id, 'valor_array', [...rows, { ...newRow }])
    setNewRow(emptyRow())
  }

  const handleUpdate = (index, colKey, value) => {
    onChange(pregunta.id, 'valor_array', rows.map((r, i) => i === index ? { ...r, [colKey]: value } : r))
  }

  const handleDelete = (index) => {
    onChange(pregunta.id, 'valor_array', rows.filter((_, i) => i !== index))
  }

  const colsStyle = { gridTemplateColumns: `${columnas.map(() => '1fr').join(' ')} 36px` }

  return (
    <div className="space-y-3">
      {columnas.length > 0 && (
        <div className="hidden sm:grid gap-3 px-3 text-[10px] font-bold text-outline uppercase tracking-wider" style={colsStyle}>
          {columnas.map(col => <span key={col.key}>{col.label}</span>)}
          <span></span>
        </div>
      )}

      {/* Fila nueva */}
      <div className="grid gap-2 items-center bg-surface-container p-3 rounded-xl border border-outline-variant/30" style={colsStyle}>
        {columnas.map(col => (
          <CeldaInput key={col.key} col={col} value={newRow[col.key]}
            onChange={val => setNewRow(prev => ({ ...prev, [col.key]: val }))} />
        ))}
        <button type="button" onClick={handleAdd}
          className="w-9 h-9 flex items-center justify-center bg-primary text-on-primary rounded-lg border-none cursor-pointer hover:opacity-90"
          title="Agregar fila"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
        </button>
      </div>

      {/* Filas existentes */}
      {rows.map((row, index) => (
        <div key={index} className="grid gap-2 items-center bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30" style={colsStyle}>
          {columnas.map(col => (
            <CeldaInput key={col.key} col={col} value={row[col.key]} onChange={val => handleUpdate(index, col.key, val)} />
          ))}
          <button type="button" onClick={() => handleDelete(index)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-error hover:bg-error-container border-none bg-transparent cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      ))}

      {rows.length === 0 && (
        <p className="text-sm text-outline italic text-center py-1">
          Completá los campos y presioná <span className="material-symbols-outlined text-[14px] align-middle">add</span> para agregar una fila.
        </p>
      )}
    </div>
  )
}

// ─── Tabla GRUPOS VULNERABLES (tiene_dato + cantidad) ────────────────────────
function TablaGrupos({ pregunta, currentAnswer, onChange }) {
  const [selectedGrupo, setSelectedGrupo] = useState('')
  const rows = Array.isArray(currentAnswer.valor_array) ? currentAnswer.valor_array : []
  const usedGrupos = rows.map(r => r.grupo)
  const available = (pregunta.opciones_pregunta ?? []).filter(o => !usedGrupos.includes(o.valor))

  const handleAdd = () => {
    if (!selectedGrupo) return
    const opt = pregunta.opciones_pregunta.find(o => o.valor === selectedGrupo)
    onChange(pregunta.id, 'valor_array', [...rows, { grupo: opt.valor, etiqueta: opt.etiqueta, tiene_dato: null, cantidad: '' }])
    setSelectedGrupo('')
  }

  const handleUpdate = (index, field, value) => {
    onChange(pregunta.id, 'valor_array', rows.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  return (
    <div className="space-y-3">
      <div className="hidden sm:grid grid-cols-[1fr_180px_110px_36px] gap-3 px-2 text-[10px] font-bold text-outline uppercase tracking-wider">
        <span>Grupo de vulneración</span>
        <span className="text-center">Tiene el dato</span>
        <span className="text-center">Cantidad</span>
        <span></span>
      </div>

      <div className="flex flex-wrap gap-2 items-center bg-surface-container p-3 rounded-xl border border-outline-variant/30">
        <select value={selectedGrupo} onChange={e => setSelectedGrupo(e.target.value)}
          className="flex-1 min-w-[180px] h-10 px-3 bg-surface rounded-lg border border-outline-variant text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Seleccionar grupo...</option>
          {available.map(o => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}
        </select>
        <button type="button" onClick={handleAdd} disabled={!selectedGrupo}
          className="h-10 px-4 bg-primary text-on-primary rounded-lg text-sm font-bold flex items-center gap-1 border-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Agregar grupo
        </button>
      </div>

      {rows.map((row, index) => (
        <div key={row.grupo} className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1fr_180px_110px_36px] gap-3 items-center bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/30">
          <p className="font-semibold text-sm text-on-surface">{row.etiqueta}</p>
          <div className="flex gap-1 justify-center">
            {[['si','Sí'],['no','No'],['ns','Ns/Nc']].map(([val, label]) => (
              <button key={val} type="button"
                onClick={() => handleUpdate(index, 'tiene_dato', row.tiene_dato === val ? null : val)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold border-none cursor-pointer transition-colors ${
                  row.tiene_dato === val ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >{label}</button>
            ))}
          </div>
          <input type="number" min="0" placeholder="—" value={row.cantidad ?? ''}
            onChange={e => handleUpdate(index, 'cantidad', e.target.value)}
            disabled={row.tiene_dato !== 'si'}
            className="w-full h-9 px-3 text-center bg-surface rounded-lg border border-outline-variant text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <button type="button" onClick={() => onChange(pregunta.id, 'valor_array', rows.filter((_, i) => i !== index))}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-error hover:bg-error-container border-none bg-transparent cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      ))}

      {rows.length === 0 && (
        <p className="text-sm text-outline italic text-center py-2">
          Seleccioná un grupo y hacé click en "Agregar grupo" para comenzar.
        </p>
      )}
    </div>
  )
}

// ─── Dispatcher de tabla ──────────────────────────────────────────────────────
function TablaInput({ pregunta, currentAnswer, onChange }) {
  const modo = pregunta.config?.modo
  if (!modo) return <TablaGrupos pregunta={pregunta} currentAnswer={currentAnswer} onChange={onChange} />
  if (modo === 'fijo') return <TablaFija pregunta={pregunta} currentAnswer={currentAnswer} onChange={onChange} />
  return <TabladinamicaComp pregunta={pregunta} currentAnswer={currentAnswer} onChange={onChange} />
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SeccionFormulario({
  idAutodiagnostico,
  idSeccion,
  preguntas = [],
  respuestasExistentes = {},
  onChange,
  attemptedNavigation = false
}) {

  const isRequiredAndUnanswered = (q) => {
    if (!q.requerida) return false
    const ans = respuestasExistentes[q.id]
    if (!ans) return true
    if (q.tipo === 'texto') return !ans.valor_texto || ans.valor_texto.trim() === ''
    if (q.tipo === 'numero') return ans.valor_numerico === undefined || ans.valor_numerico === null || ans.valor_numerico === ''
    if (q.tipo === 'boolean') return !ans.valor_texto || ans.valor_texto.trim() === ''
    if (q.tipo === 'opcion') return !ans.valor_texto || ans.valor_texto.trim() === ''
    if (q.tipo === 'array') return !Array.isArray(ans.valor_array) || ans.valor_array.length === 0
    return true
  }

  const isQuestionAnswered = (q) => {
    const ans = respuestasExistentes[q.id]
    if (!ans) return false
    if (q.tipo === 'texto') return typeof ans.valor_texto === 'string' && ans.valor_texto.trim() !== ''
    if (q.tipo === 'numero') return ans.valor_numerico !== undefined && ans.valor_numerico !== null && ans.valor_numerico !== ''
    if (q.tipo === 'boolean') return typeof ans.valor_texto === 'string' && ans.valor_texto.trim() !== ''
    if (q.tipo === 'opcion') return typeof ans.valor_texto === 'string' && ans.valor_texto.trim() !== ''
    if (q.tipo === 'array') return Array.isArray(ans.valor_array) && ans.valor_array.length > 0
    if (q.tipo === 'tabla') return Array.isArray(ans.valor_array) && ans.valor_array.length > 0
    return false
  }

  if (preguntas.length === 0) {
    return (
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 p-12 text-center space-y-4">
        <span className="material-symbols-outlined text-[48px] text-outline opacity-60">lock</span>
        <h3 className="font-headline-md text-headline-md text-on-surface-variant">Sección no disponible</h3>
        <p className="font-body-md text-body-md text-on-surface-variant/80 max-w-md mx-auto">
          Esta sección no cuenta con preguntas activas en el cuestionario actual.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {preguntas.map((q, index) => {
        const hasError = attemptedNavigation && isRequiredAndUnanswered(q)
        const isAnswered = isQuestionAnswered(q)
        let borderClass = 'border-l-4 border-transparent'
        if (hasError) borderClass = 'border-l-4 border-l-error bg-error-container/5'
        else if (isAnswered) borderClass = 'border-l-4 border-l-green-500'
        const currentAnswer = respuestasExistentes[q.id] || {}

        return (
          <div key={q.id} id={`preg-card-${q.id}`}
            className={`bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-outline-variant/40 transition-all ${borderClass} ${hasError ? 'ring-1 ring-error/30' : ''}`}
          >
            {/* Header */}
            <div className="flex flex-wrap justify-between items-start gap-2 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-surface-container-high px-2 py-0.5 rounded text-outline font-bold">{q.codigo}</span>
                {q.requerida && (
                  <span className="bg-error/10 text-error text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-xs">
                    <span className="w-1 h-1 bg-error rounded-full"></span>Requerida
                  </span>
                )}
              </div>
              <span className="text-xs font-bold text-outline">Pregunta {index + 1} de {preguntas.length}</span>
            </div>

            {/* Enunciado */}
            <h4 className="font-body-md text-on-surface font-semibold leading-relaxed mb-6">{index + 1}. {q.texto}</h4>

            {/* Input */}
            <div className="w-full">
              {q.tipo === 'texto' && (
                <textarea rows="3" placeholder="Escriba su respuesta aquí..."
                  className="w-full p-4 bg-surface-container rounded-xl border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary font-body-md transition-all text-on-surface resize-none"
                  value={currentAnswer.valor_texto || ''}
                  onChange={e => onChange(q.id, 'valor_texto', e.target.value)}
                />
              )}

              {q.tipo === 'numero' && (
                <input type="number" placeholder="Ingrese un valor numérico..."
                  className="w-full sm:w-64 h-12 px-4 bg-surface-container rounded-xl border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary font-body-md transition-all text-on-surface"
                  value={currentAnswer.valor_numerico !== undefined && currentAnswer.valor_numerico !== null ? currentAnswer.valor_numerico : ''}
                  onChange={e => onChange(q.id, 'valor_numerico', e.target.value)}
                />
              )}

              {q.tipo === 'boolean' && (
                <div className="flex gap-4">
                  {[['si','check','Sí'],['no','close','No']].map(([val, icon, label]) => (
                    <button key={val} type="button" onClick={() => onChange(q.id, 'valor_texto', val)}
                      className={`px-8 py-3 rounded-full font-label-md transition-all border-none cursor-pointer flex items-center gap-xs font-semibold ${
                        currentAnswer.valor_texto === val ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>{label}
                    </button>
                  ))}
                </div>
              )}

              {q.tipo === 'opcion' && (
                <div className="flex flex-wrap gap-3">
                  {q.opciones_pregunta?.map(opt => (
                    <button key={opt.id} type="button" onClick={() => onChange(q.id, 'valor_texto', opt.valor)}
                      className={`px-6 py-3 rounded-full font-label-md transition-all border-none cursor-pointer font-semibold ${
                        currentAnswer.valor_texto === opt.valor ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant'
                      }`}
                    >{opt.etiqueta}</button>
                  ))}
                </div>
              )}

              {q.tipo === 'array' && (
                <div className="flex flex-wrap gap-3">
                  {q.opciones_pregunta?.map(opt => {
                    const list = Array.isArray(currentAnswer.valor_array) ? currentAnswer.valor_array : []
                    const isChecked = list.includes(opt.valor)
                    return (
                      <button key={opt.id} type="button"
                        onClick={() => onChange(q.id, 'valor_array', isChecked ? list.filter(v => v !== opt.valor) : [...list, opt.valor])}
                        className={`px-5 py-3 rounded-xl font-label-md border transition-all cursor-pointer flex items-center gap-2 font-semibold ${
                          isChecked ? 'bg-primary-container text-on-primary-container border-primary/45 shadow-sm' : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant border-outline-variant/30'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">{isChecked ? 'check_box' : 'check_box_outline_blank'}</span>
                        {opt.etiqueta}
                      </button>
                    )
                  })}
                </div>
              )}

              {q.tipo === 'tabla' && (
                <TablaInput pregunta={q} currentAnswer={currentAnswer} onChange={onChange} />
              )}
            </div>

            {hasError && (
              <p className="text-xs text-error font-medium mt-3 flex items-center gap-1 animate-pulse">
                <span className="material-symbols-outlined text-[16px]">error</span>
                Esta pregunta es obligatoria para poder completar el diagnóstico.
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
