import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Map, Microscope, TrendingUp, Loader2,
  ArrowRight, Sprout
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { fincasAPI, muestrasAPI } from '../lib/api'

export default function Dashboard() {
  const { usuario } = useAuth()
  const [fincas, setFincas]         = useState([])
  const [muestras, setMuestras]     = useState([])
  const [cargando, setCargando]     = useState(true)
  const [error, setError]           = useState(null)

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setCargando(true)
    setError(null)
    try {
      const [fincasData, muestrasData] = await Promise.all([
        fincasAPI.listar(),
        muestrasAPI.listar(),
      ])
      setFincas(fincasData)
      setMuestras(muestrasData)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  const nombreUsuario = usuario?.user_metadata?.nombre || usuario?.email?.split('@')[0]

  if (cargando) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-musgo-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">

      {/* ── Saludo ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <span className="badge bg-musgo-50 text-musgo-700 border border-musgo-200/60 mb-3">
          <Sprout className="w-3 h-3" />
          Tu Red Agroecológica
        </span>
        <h1 className="font-display text-4xl text-tierra-900 mb-2">
          Hola, <span className="font-display-italic text-musgo-700">{nombreUsuario}</span>
        </h1>
        <p className="text-tierra-600">
          Aquí está el resumen de tus cultivos y muestras.
        </p>
      </motion.div>

      {error && (
        <div className="card border-ambar-400/30 bg-ambar-400/5 p-4 mb-6">
          <p className="text-sm text-ambar-600">
            ⚠ {error}
          </p>
          <p className="text-xs text-tierra-500 mt-1">
            Si el backend acaba de despertar puede tardar 30-50 segundos. Recarga la página.
          </p>
        </div>
      )}

      {/* ── Estadísticas ──────────────────────────────── */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <Estadistica
          icono={Map}
          etiqueta="Cultivos registrados"
          valor={fincas.length}
          color="musgo"
        />
        <Estadistica
          icono={Microscope}
          etiqueta="Muestras generadas"
          valor={muestras.length}
          color="agua"
        />
        <Estadistica
          icono={TrendingUp}
          etiqueta="Última muestra"
          valor={muestras[0]
            ? new Date(muestras[0].fecha_muestra).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short',
              })
            : '—'}
          color="tierra"
        />
      </div>

      {/* ── Acciones rápidas ──────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-5 mb-12">
        <Link to="/analizar" className="card-elevated p-6 hover:shadow-lg transition-all group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-musgo-600 to-musgo-800 flex items-center justify-center shadow-md flex-shrink-0">
              <Microscope className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl text-tierra-900 mb-1 group-hover:text-musgo-700 transition-colors">
                Generar nueva muestra
              </h3>
              <p className="text-sm text-tierra-600 mb-3">
                Sube un cromatograma con sus valores de pH y humedad para generar el bio retrato.
              </p>
              <span className="text-sm font-medium text-musgo-700 inline-flex items-center gap-1">
                Empezar <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </Link>

        <Link to="/fincas" className="card-elevated p-6 hover:shadow-lg transition-all group">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-agua-500 to-agua-800 flex items-center justify-center shadow-md flex-shrink-0">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-xl text-tierra-900 mb-1 group-hover:text-agua-700 transition-colors">
                Gestionar cultivos
              </h3>
              <p className="text-sm text-tierra-600 mb-3">
                Registra nuevos cultivos o consulta los que ya tienes en tu Red.
              </p>
              <span className="text-sm font-medium text-agua-700 inline-flex items-center gap-1">
                Ver cultivos <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Muestras recientes ────────────────────────── */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 className="font-display text-2xl text-tierra-900">
            Muestras recientes
          </h2>
          <p className="text-sm text-tierra-600 mt-1">
            Las últimas muestras generadas
          </p>
        </div>
        {muestras.length > 0 && (
          <Link to="/muestras" className="text-sm text-musgo-700 hover:underline">
            Ver todas →
          </Link>
        )}
      </div>

      {muestras.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-tierra-100 flex items-center justify-center mx-auto mb-4">
            <Microscope className="w-6 h-6 text-tierra-400" />
          </div>
          <h3 className="font-display text-lg text-tierra-700 mb-2">
            Aún no has generado ninguna muestra
          </h3>
          <p className="text-sm text-tierra-500 mb-5 max-w-sm mx-auto">
            {fincas.length === 0
              ? 'Para empezar, primero registra tu primer cultivo.'
              : 'Sube tu primer cromatograma y obtén el resultado en segundos.'}
          </p>
          <Link
            to={fincas.length === 0 ? '/fincas' : '/analizar'}
            className="btn-primary inline-flex"
          >
            <Plus className="w-4 h-4" />
            {fincas.length === 0 ? 'Crear primer cultivo' : 'Generar muestra'}
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {muestras.slice(0, 6).map((m) => (
            <TarjetaMuestra key={m.id} muestra={m} />
          ))}
        </div>
      )}
    </div>
  )
}

function Estadistica({ icono: Icono, etiqueta, valor, color }) {
  const colores = {
    musgo:  'bg-musgo-50/60 border-musgo-200/40 text-musgo-700',
    agua:   'bg-agua-50/60 border-agua-200/40 text-agua-700',
    tierra: 'bg-tierra-100/60 border-tierra-200/40 text-tierra-700',
  }
  return (
    <div className={`card p-5 ${colores[color]}`}>
      <Icono className="w-5 h-5 mb-3 opacity-70" />
      <div className="font-display text-3xl text-tierra-900 leading-none mb-1">
        {valor}
      </div>
      <div className="text-2xs uppercase tracking-wider font-semibold mt-2">
        {etiqueta}
      </div>
    </div>
  )
}

function TarjetaMuestra({ muestra }) {
  return (
    <Link
      to={`/muestras/${muestra.id}`}
      className="card hover:shadow-md transition-all group overflow-hidden"
    >
      {muestra.imagen_procesada_url ? (
        <img
          src={muestra.imagen_procesada_url}
          alt={`Muestra ${muestra.id}`}
          className="w-full aspect-square object-cover"
        />
      ) : (
        <div className="w-full aspect-square bg-tierra-100 flex items-center justify-center">
          <Microscope className="w-10 h-10 text-tierra-400" />
        </div>
      )}
      <div className="p-4">
        <div className="text-2xs uppercase tracking-wider text-tierra-500 font-semibold mb-1">
          {muestra.finca_nombre}
        </div>
        <div className="flex items-end justify-between mb-1">
          <div className="font-display text-xl text-tierra-900 leading-none">
            pH {muestra.ph.toFixed(1)}
          </div>
          <div className="text-sm text-agua-700 font-medium">
            {muestra.humedad.toFixed(0)}% H
          </div>
        </div>
        <div className="text-xs text-tierra-600 mt-1">
          {muestra.estado_ph}
        </div>
        <div className="text-2xs text-tierra-400 mt-2">
          {new Date(muestra.fecha_muestra).toLocaleDateString('es-CO', {
            day: '2-digit', month: 'long', year: 'numeric',
          })}
        </div>
      </div>
    </Link>
  )
}
