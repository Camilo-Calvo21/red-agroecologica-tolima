import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Loader2, Trash2, Download, Calendar,
  FileText, Map
} from 'lucide-react'
import VisualizadorResultado from '../components/VisualizadorResultado'
import { muestrasAPI } from '../lib/api'

export default function MuestraDetalle() {
  const { id } = useParams()
  const navegar = useNavigate()
  const [muestra, setMuestra]   = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError]       = useState(null)

  useEffect(() => {
    cargar()
  }, [id])

  const cargar = async () => {
    setCargando(true)
    setError(null)
    try {
      const data = await muestrasAPI.obtener(id)
      setMuestra(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }

  const onEliminar = async () => {
    if (!confirm('¿Eliminar esta muestra? Esta acción no se puede deshacer.')) return
    try {
      await muestrasAPI.eliminar(id)
      navegar('/dashboard')
    } catch (e) {
      alert('Error al eliminar: ' + e.message)
    }
  }

  if (cargando) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-musgo-600 animate-spin" />
      </div>
    )
  }

  if (error || !muestra) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-16 text-center">
        <h2 className="font-display text-2xl text-tierra-900 mb-3">
          Muestra no encontrada
        </h2>
        <p className="text-sm text-tierra-600 mb-6">
          {error || 'No se pudo cargar esta muestra.'}
        </p>
        <Link to="/dashboard" className="btn-primary inline-flex">
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    )
  }

  const fecha = new Date(muestra.fecha_muestra).toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-tierra-600 hover:text-musgo-700 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </Link>

        <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
          <div>
            <span className="badge bg-musgo-50 text-musgo-700 border border-musgo-200/60 mb-3">
              Muestra
            </span>
            <h1 className="font-display text-4xl text-tierra-900">
              pH {muestra.ph.toFixed(1)} · {muestra.humedad.toFixed(0)}% Humedad
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-tierra-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {fecha}
              </span>
            </div>
          </div>
          <button
            onClick={onEliminar}
            className="btn-secondary text-ambar-600 hover:bg-ambar-400/10"
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </button>
        </div>
      </motion.div>

      <VisualizadorResultado
        muestra={muestra}
        procesando={false}
        onReiniciar={() => navegar('/analizar')}
      />

      {/* ── Notas ───────────────────────────────────── */}
      {muestra.notas && (
        <div className="card-elevated p-6 mt-6">
          <h3 className="flex items-center gap-2 font-display text-lg text-tierra-900 mb-3">
            <FileText className="w-5 h-5 text-tierra-500" />
            Notas
          </h3>
          <p className="text-sm text-tierra-700 leading-relaxed whitespace-pre-wrap">
            {muestra.notas}
          </p>
        </div>
      )}
    </div>
  )
}
