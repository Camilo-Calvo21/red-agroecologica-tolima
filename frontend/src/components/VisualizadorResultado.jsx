import { motion, AnimatePresence } from 'framer-motion'
import { Download, RotateCcw, ImageOff, GitCompare, Eye, Loader2 } from 'lucide-react'
import { useState } from 'react'

/**
 * Visualizador de resultados de análisis con tres modos.
 *
 * Versión mejorada con:
 * - Descarga directa por blob (no abre nueva pestaña)
 * - Validación de URLs antes de mostrar
 * - Indicador de descarga
 * - Manejo de imágenes que no cargan
 */
export default function VisualizadorResultado({ muestra, procesando, onReiniciar }) {
  const [modo, setModo] = useState('lado-a-lado')
  const [posicion, setPosicion] = useState(50)
  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState(null)

  // ─── Estado: procesando ───────────────────────────────
  if (procesando) {
    return (
      <div className="card-elevated p-8 min-h-[600px] flex flex-col items-center justify-center text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-musgo-300/40 rounded-full blur-2xl animate-pulse-soft" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="relative w-24 h-24 rounded-full border-4 border-tierra-200 border-t-musgo-600"
          />
        </div>
        <h3 className="font-display text-2xl text-tierra-900 mb-2">
          Procesando tu muestra
        </h3>
        <p className="text-tierra-600 text-sm max-w-sm">
          El sistema está muestreando los colores de tu cromatograma, generando
          el anillo orgánico y guardándolo en tu Red. Esto puede tardar entre
          30 y 60 segundos.
        </p>
        <div className="mt-6 flex items-center gap-2 text-2xs uppercase tracking-widest text-tierra-500 font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-musgo-500 animate-pulse" />
          Procesamiento en servidor
        </div>
      </div>
    )
  }

  // ─── Estado: sin muestra ─────────────────────────────
  if (!muestra) {
    return (
      <div className="card-elevated p-8 min-h-[600px] flex flex-col items-center justify-center text-center">
        <div className="relative mb-5">
          <div className="absolute inset-0 bg-tierra-200/50 rounded-full blur-xl" />
          <div className="relative w-20 h-20 rounded-full bg-tierra-100 flex items-center justify-center">
            <ImageOff className="w-8 h-8 text-tierra-400" strokeWidth={1.5} />
          </div>
        </div>
        <h3 className="font-display text-2xl text-tierra-700 mb-2">
          Aquí aparecerá tu cromatograma
        </h3>
        <p className="text-tierra-500 text-sm max-w-sm">
          Una vez generes el anillo, podrás compararlo con la imagen original,
          descargarlo y consultarlo después en tu histórico.
        </p>
      </div>
    )
  }

  // ─── Validación de URLs ──────────────────────────────
  const tieneOriginal = !!muestra.imagen_original_url
  const tieneProcesada = !!muestra.imagen_procesada_url

  // ─── Función de descarga mejorada ────────────────────
  const descargar = async () => {
    if (!tieneProcesada) {
      setErrorDescarga('No hay imagen procesada para descargar')
      return
    }

    setDescargando(true)
    setErrorDescarga(null)

    try {
      // Descargar la imagen como blob (no abre nueva pestaña)
      const response = await fetch(muestra.imagen_procesada_url)

      if (!response.ok) {
        throw new Error(`Error ${response.status} al descargar la imagen`)
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)

      // Crear link de descarga
      const a = document.createElement('a')
      a.href = url
      a.download = `cromatograma_pH${muestra.ph.toFixed(1)}_H${muestra.humedad.toFixed(0)}.png`
      document.body.appendChild(a)
      a.click()

      // Limpiar
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

    } catch (error) {
      console.error('Error descargando:', error)
      setErrorDescarga(
        'No se pudo descargar la imagen. Intenta abriéndola directamente: ' +
        muestra.imagen_procesada_url
      )
    } finally {
      setDescargando(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card-elevated p-7 space-y-5"
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <span className="badge bg-musgo-50 text-musgo-700 border border-musgo-200/60 mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-musgo-500" />
            Análisis completo
          </span>
          <h3 className="font-display text-2xl text-tierra-900">
            Tu suelo, traducido
          </h3>
          <p className="text-sm text-tierra-600 mt-1">
            Guardado en tu histórico
          </p>
        </div>

        <div className="flex bg-tierra-100/60 rounded-full p-1 text-xs font-medium">
          <button
            onClick={() => setModo('lado-a-lado')}
            className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              modo === 'lado-a-lado' ? 'bg-white text-tierra-900 shadow-sm' : 'text-tierra-600'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5" />
            Lado a lado
          </button>
          <button
            onClick={() => setModo('comparar')}
            className={`px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
              modo === 'comparar' ? 'bg-white text-tierra-900 shadow-sm' : 'text-tierra-600'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Slider
          </button>
          <button
            onClick={() => setModo('solo')}
            className={`px-3.5 py-1.5 rounded-full transition-all ${
              modo === 'solo' ? 'bg-white text-tierra-900 shadow-sm' : 'text-tierra-600'
            }`}
          >
            Solo final
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {modo === 'lado-a-lado' && (
          <motion.div
            key="lado"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid sm:grid-cols-2 gap-4"
          >
            <ImagenEtiqueta
              src={muestra.imagen_original_url}
              etiqueta="Original"
              sub="Sin procesar"
            />
            <ImagenEtiqueta
              src={muestra.imagen_procesada_url}
              etiqueta="Con anillo"
              sub="Procesada"
              destacado
            />
          </motion.div>
        )}

        {modo === 'comparar' && tieneOriginal && tieneProcesada && (
          <motion.div
            key="slider"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="relative aspect-square rounded-xl overflow-hidden border border-tierra-200">
              <img
                src={muestra.imagen_original_url}
                alt="Original"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${posicion}%` }}>
                <img
                  src={muestra.imagen_procesada_url}
                  alt="Con anillo"
                  className="absolute inset-0 h-full object-cover"
                  style={{ width: `${100 / (posicion / 100)}%` }}
                />
              </div>
              <div
                className="absolute inset-y-0 w-0.5 bg-white shadow-lg pointer-events-none"
                style={{ left: `${posicion}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <GitCompare className="w-4 h-4 text-tierra-700" />
                </div>
              </div>
              <div className="absolute top-3 left-3 badge bg-white/90 text-tierra-700 backdrop-blur-sm">Original</div>
              <div className="absolute top-3 right-3 badge bg-musgo-700/90 text-white backdrop-blur-sm">Con anillo</div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={posicion}
              onChange={(e) => setPosicion(Number(e.target.value))}
              className="w-full h-2 appearance-none bg-tierra-200 rounded-full cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                         [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-musgo-700
                         [&::-webkit-slider-thumb]:shadow-md"
            />
          </motion.div>
        )}

        {modo === 'solo' && (
          <motion.div key="solo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ImagenEtiqueta
              src={muestra.imagen_procesada_url}
              etiqueta="Resultado final"
              sub="Imagen lista para usar"
              destacado
              grande
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="bg-tierra-50/60 border border-tierra-200/50 rounded-xl p-3">
          <div className="text-2xs uppercase tracking-wider text-tierra-500 font-semibold">pH medido</div>
          <div className="font-display text-2xl text-tierra-900 leading-tight mt-0.5">{muestra.ph.toFixed(1)}</div>
          <div className="text-xs text-tierra-600 mt-0.5">{muestra.estado_ph}</div>
        </div>
        <div className="bg-agua-50/60 border border-agua-200/50 rounded-xl p-3">
          <div className="text-2xs uppercase tracking-wider text-agua-700 font-semibold">Humedad</div>
          <div className="font-display text-2xl text-agua-900 leading-tight mt-0.5">{muestra.humedad.toFixed(0)}%</div>
          <div className="text-xs text-agua-700 mt-0.5">{muestra.estado_humedad}</div>
        </div>
      </div>

      {/* Botones */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={descargar}
          disabled={descargando || !tieneProcesada}
          className="btn-primary flex-1"
        >
          {descargando ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Descargando...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Descargar
            </>
          )}
        </button>
        <button onClick={onReiniciar} className="btn-secondary">
          <RotateCcw className="w-4 h-4" />
          Nueva muestra
        </button>
      </div>

      {/* Error de descarga */}
      {errorDescarga && (
        <p className="text-xs text-ambar-600 text-center font-medium mt-2">
          ⚠ {errorDescarga}
        </p>
      )}
    </motion.div>
  )
}


/* ─── Componente auxiliar de imagen con etiqueta ─── */
function ImagenEtiqueta({ src, etiqueta, sub, destacado, grande }) {
  const [errorCarga, setErrorCarga] = useState(false)

  return (
    <div>
      <div className={`relative rounded-xl overflow-hidden border ${
        destacado ? 'border-musgo-300 shadow-lg shadow-musgo-900/5' : 'border-tierra-200'
      }`}>
        {src && !errorCarga ? (
          <img
            src={src}
            alt={etiqueta}
            onError={() => setErrorCarga(true)}
            className={`w-full object-cover ${grande ? 'aspect-square max-h-[600px]' : 'aspect-square'}`}
          />
        ) : (
          <div className="aspect-square bg-tierra-100 flex flex-col items-center justify-center p-4 text-center">
            <ImageOff className="w-10 h-10 text-tierra-400 mb-2" />
            <p className="text-xs text-tierra-500">
              {errorCarga ? 'No se pudo cargar la imagen' : 'Sin imagen'}
            </p>
          </div>
        )}
      </div>
      <div className="mt-2.5 px-1">
        <div className={`text-2xs uppercase tracking-wider font-semibold ${
          destacado ? 'text-musgo-700' : 'text-tierra-500'
        }`}>
          {etiqueta}
        </div>
        <div className="text-xs text-tierra-600 mt-0.5">{sub}</div>
      </div>
    </div>
  )
}
