import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus, Map, Loader2, Trash2, ChevronRight, MapPin,
  Mountain, Sprout as SproutIcon, X
} from 'lucide-react'
import { fincasAPI } from '../lib/api'

export default function Fincas() {
  const [fincas, setFincas]                 = useState([])
  const [cargando, setCargando]             = useState(true)
  const [mostrandoFormulario, setForm]      = useState(false)
  const [error, setError]                   = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await fincasAPI.listar()
      setFincas(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  const onCreada = (nueva) => {
    setFincas([nueva, ...fincas])
    setForm(false)
  }

  const onEliminar = async (id) => {
    if (!confirm('¿Eliminar este cultivo? Se borrarán también todas sus muestras.')) return
    try {
      await fincasAPI.eliminar(id)
      setFincas(fincas.filter(f => f.id !== id))
    } catch (e) {
      alert('Error al eliminar: ' + e.message)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <span className="badge bg-musgo-50 text-musgo-700 border border-musgo-200/60 mb-3">
            <Map className="w-3 h-3" />
            Tus cultivos
          </span>
          <h1 className="font-display text-4xl text-tierra-900">
            Cultivos <span className="font-display-italic text-musgo-700">de la Red</span>
          </h1>
          <p className="text-tierra-600 mt-2">
            Cada cultivo agrupa las muestras de cromatografía que realizas en él.
          </p>
        </div>
        {!mostrandoFormulario && (
          <button onClick={() => setForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            Nuevo cultivo
          </button>
        )}
      </div>

      {/* ── Formulario inline para nuevo cultivo ──────── */}
      <AnimatePresence>
        {mostrandoFormulario && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <FormularioCultivo
              onCancelar={() => setForm(false)}
              onCreada={onCreada}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="card border-ambar-400/30 bg-ambar-400/5 p-4 mb-6">
          <p className="text-sm text-ambar-600">⚠ {error}</p>
        </div>
      )}

      {/* ── Lista de cultivos ─────────────────────────── */}
      {cargando ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-musgo-600 animate-spin" />
        </div>
      ) : fincas.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-tierra-100 flex items-center justify-center mx-auto mb-4">
            <Map className="w-7 h-7 text-tierra-400" />
          </div>
          <h3 className="font-display text-xl text-tierra-700 mb-2">
            Aún no tienes cultivos registrados
          </h3>
          <p className="text-sm text-tierra-500 mb-6 max-w-sm mx-auto">
            Crea tu primer cultivo para empezar a registrar muestras de suelo.
          </p>
          {!mostrandoFormulario && (
            <button onClick={() => setForm(true)} className="btn-primary inline-flex">
              <Plus className="w-4 h-4" />
              Crear primer cultivo
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fincas.map(f => (
            <TarjetaCultivo key={f.id} finca={f} onEliminar={onEliminar} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// FORMULARIO INLINE
// ─────────────────────────────────────────────────────────────

function FormularioCultivo({ onCancelar, onCreada }) {
  const [datos, setDatos] = useState({
    nombre: '',
    municipio: '',
    vereda: '',
    altitud_msnm: '',
    cultivo_principal: '',
    notas: '',
  })
  const [error, setError]       = useState(null)
  const [cargando, setCargando] = useState(false)

  const cambiar = (campo) => (e) =>
    setDatos({ ...datos, [campo]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      const payload = {
        nombre: datos.nombre.trim(),
        municipio: datos.municipio.trim(),
        vereda: datos.vereda.trim() || null,
        altitud_msnm: datos.altitud_msnm ? Number(datos.altitud_msnm) : null,
        cultivo_principal: datos.cultivo_principal.trim() || null,
        notas: datos.notas.trim() || null,
      }
      const nueva = await fincasAPI.crear(payload)
      onCreada(nueva)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="card-elevated p-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-xl text-tierra-900">
          Registrar nuevo cultivo
        </h3>
        <button
          onClick={onCancelar}
          className="text-tierra-400 hover:text-tierra-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="label-field">Nombre del cultivo *</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={120}
              value={datos.nombre}
              onChange={cambiar('nombre')}
              className="input-field"
              placeholder="Ej: Villa del Río"
            />
          </div>
          <div>
            <label className="label-field">Municipio *</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={80}
              value={datos.municipio}
              onChange={cambiar('municipio')}
              className="input-field"
              placeholder="Ej: Ibagué"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label-field">Vereda</label>
            <input
              type="text"
              maxLength={120}
              value={datos.vereda}
              onChange={cambiar('vereda')}
              className="input-field"
              placeholder="Opcional"
            />
          </div>
          <div>
            <label className="label-field">Altitud (msnm)</label>
            <input
              type="number"
              min={0}
              max={6000}
              value={datos.altitud_msnm}
              onChange={cambiar('altitud_msnm')}
              className="input-field"
              placeholder="Ej: 1400"
            />
          </div>
          <div>
            <label className="label-field">Cultivo principal</label>
            <input
              type="text"
              maxLength={80}
              value={datos.cultivo_principal}
              onChange={cambiar('cultivo_principal')}
              className="input-field"
              placeholder="Ej: Café"
            />
          </div>
        </div>

        <div>
          <label className="label-field">Notas</label>
          <textarea
            rows={2}
            maxLength={500}
            value={datos.notas}
            onChange={cambiar('notas')}
            className="input-field resize-none"
            placeholder="Información adicional opcional"
          />
        </div>

        {error && (
          <p className="text-sm text-ambar-600">⚠ {error}</p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={cargando} className="btn-primary">
            {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar cultivo'}
          </button>
          <button type="button" onClick={onCancelar} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// TARJETA DE CULTIVO
// ─────────────────────────────────────────────────────────────

function TarjetaCultivo({ finca, onEliminar }) {
  return (
    <div className="card p-5 hover:shadow-md transition-all group flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-musgo-600 to-musgo-800 flex items-center justify-center shadow-md">
          <Map className="w-5 h-5 text-white" />
        </div>
        <button
          onClick={() => onEliminar(finca.id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-tierra-400 hover:text-ambar-600"
          title="Eliminar cultivo"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <h3 className="font-display text-xl text-tierra-900 mb-1">
        {finca.nombre}
      </h3>

      <div className="space-y-1 text-sm text-tierra-600 mb-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-tierra-400" />
          <span>{finca.municipio}{finca.vereda ? ` · ${finca.vereda}` : ''}</span>
        </div>
        {finca.altitud_msnm && (
          <div className="flex items-center gap-2">
            <Mountain className="w-3.5 h-3.5 text-tierra-400" />
            <span>{finca.altitud_msnm.toLocaleString()} msnm</span>
          </div>
        )}
        {finca.cultivo_principal && (
          <div className="flex items-center gap-2">
            <SproutIcon className="w-3.5 h-3.5 text-tierra-400" />
            <span>{finca.cultivo_principal}</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-tierra-200/40 flex items-center justify-between">
        <div className="text-2xs uppercase tracking-wider text-tierra-500 font-semibold">
          {finca.total_muestras} {finca.total_muestras === 1 ? 'muestra' : 'muestras'}
        </div>
        <Link
          to={`/analizar?finca=${finca.id}`}
          className="text-sm text-musgo-700 hover:underline inline-flex items-center gap-1"
        >
          Generar
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
