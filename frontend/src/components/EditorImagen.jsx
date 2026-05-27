import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move } from 'lucide-react'

/**
 * Editor de imagen con:
 * - Guía circular para centrar el cromatograma
 * - Zoom con slider + botones
 * - Arrastre para mover la imagen
 * - Recorte automático 1024x1024
 * - Vista previa antes de confirmar
 */
export default function EditorImagen({ imagenSrc, onConfirmar, onCancelar }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)

  // Estado de transformación
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 })
  const [containerSize, setContainerSize] = useState(400)

  // Drag state
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  // Imagen cargada
  const imgRef = useRef(null)

  // Cargar imagen
  useEffect(() => {
    if (!imagenSrc) return
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImgNatural({ w: img.naturalWidth, h: img.naturalHeight })
      // Auto-zoom para que la imagen llene el canvas
      const minDim = Math.min(img.naturalWidth, img.naturalHeight)
      const initialZoom = containerSize / minDim
      setZoom(Math.max(initialZoom, 0.5))
      setOffset({ x: 0, y: 0 })
      setRotation(0)
    }
    img.src = imagenSrc
  }, [imagenSrc, containerSize])

  // Medir contenedor
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const size = Math.min(rect.width, rect.height, 600)
        setContainerSize(size)
      }
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // Dibujar canvas
  const dibujar = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return

    const ctx = canvas.getContext('2d')
    const size = containerSize
    canvas.width = size
    canvas.height = size

    ctx.clearRect(0, 0, size, size)

    // Fondo
    ctx.fillStyle = '#F0E9DD'
    ctx.fillRect(0, 0, size, size)

    // Dibujar imagen con transformaciones
    ctx.save()
    ctx.translate(size / 2 + offset.x, size / 2 + offset.y)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(zoom, zoom)
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
    ctx.restore()

    // Oscurecer fuera del círculo
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, size, size)
    ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2, true)
    ctx.fillStyle = 'rgba(34, 24, 16, 0.55)'
    ctx.fill()
    ctx.restore()

    // Guía circular
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2)
    ctx.strokeStyle = 'rgba(123, 70, 176, 0.6)'
    ctx.lineWidth = 2
    ctx.setLineDash([8, 6])
    ctx.stroke()
    ctx.restore()

    // Cruz central sutil
    ctx.save()
    ctx.strokeStyle = 'rgba(123, 70, 176, 0.3)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 8])
    ctx.beginPath()
    ctx.moveTo(size / 2, size / 2 - 30)
    ctx.lineTo(size / 2, size / 2 + 30)
    ctx.moveTo(size / 2 - 30, size / 2)
    ctx.lineTo(size / 2 + 30, size / 2)
    ctx.stroke()
    ctx.restore()

    // Punto central
    ctx.save()
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(123, 70, 176, 0.5)'
    ctx.fill()
    ctx.restore()

  }, [zoom, offset, rotation, containerSize])

  useEffect(() => {
    dibujar()
  }, [dibujar])

  // ── Drag handlers ──
  const onPointerDown = (e) => {
    if (e.button !== 0) return
    setDragging(true)
    dragStart.current = {
      x: e.clientX, y: e.clientY,
      ox: offset.x, oy: offset.y
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e) => {
    if (!dragging) return
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    })
  }

  const onPointerUp = () => setDragging(false)

  // ── Zoom handlers ──
  const zoomIn = () => setZoom(z => Math.min(z + 0.15, 5))
  const zoomOut = () => setZoom(z => Math.max(z - 0.15, 0.2))

  const onWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    setZoom(z => Math.max(0.2, Math.min(5, z + delta)))
  }

  // ── Rotation ──
  const rotar = () => setRotation(r => (r + 90) % 360)

  // ── Reset ──
  const resetear = () => {
    setOffset({ x: 0, y: 0 })
    setRotation(0)
    if (imgRef.current) {
      const minDim = Math.min(imgRef.current.naturalWidth, imgRef.current.naturalHeight)
      setZoom(containerSize / minDim)
    }
  }

  // ── Confirmar: renderizar a 1024x1024 y devolver File ──
  const confirmar = () => {
    const img = imgRef.current
    if (!img) return

    const outputSize = 1024
    const offscreen = document.createElement('canvas')
    offscreen.width = outputSize
    offscreen.height = outputSize
    const ctx = offscreen.getContext('2d')

    // Fondo blanco
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, outputSize, outputSize)

    // Escalar proporcionalmente
    const scaleFactor = outputSize / containerSize

    ctx.save()
    ctx.translate(outputSize / 2 + offset.x * scaleFactor, outputSize / 2 + offset.y * scaleFactor)
    ctx.rotate((rotation * Math.PI) / 180)
    ctx.scale(zoom * scaleFactor, zoom * scaleFactor)
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)
    ctx.restore()

    offscreen.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], 'cromatograma_editado.png', { type: 'image/png' })
      onConfirmar(file)
    }, 'image/png', 0.95)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-tierra-900/60 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onCancelar() }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
          className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-tierra-900/20 w-full max-w-[640px] overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-tierra-200/50 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl text-tierra-900">Ajustar cromatograma</h3>
              <p className="text-xs text-tierra-500 mt-0.5">Centra el cromatograma dentro de la guía circular</p>
            </div>
            <button onClick={onCancelar} className="w-9 h-9 rounded-full bg-tierra-100 hover:bg-tierra-200 flex items-center justify-center text-tierra-600 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Canvas */}
          <div ref={containerRef} className="relative mx-6 mt-4 mb-3 flex items-center justify-center" style={{ aspectRatio: '1/1', maxHeight: '480px' }}>
            <canvas
              ref={canvasRef}
              className="rounded-2xl cursor-grab active:cursor-grabbing touch-none"
              style={{ width: containerSize, height: containerSize }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onWheel={onWheel}
            />

            {/* Hint de arrastre */}
            {!dragging && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-tierra-900/70 text-tierra-50 text-2xs px-3 py-1.5 rounded-full backdrop-blur-sm pointer-events-none">
                <Move className="w-3 h-3" />
                Arrastra para mover
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="px-6 pb-4">
            {/* Zoom slider */}
            <div className="flex items-center gap-3 mb-4">
              <button onClick={zoomOut} className="w-8 h-8 rounded-full bg-tierra-100 hover:bg-tierra-200 flex items-center justify-center text-tierra-700 transition-all">
                <ZoomOut className="w-4 h-4" />
              </button>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="range"
                  min={20}
                  max={500}
                  value={Math.round(zoom * 100)}
                  onChange={(e) => setZoom(Number(e.target.value) / 100)}
                  className="flex-1 h-2 appearance-none bg-tierra-200 rounded-full cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-morado-600
                             [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <span className="font-mono text-xs text-tierra-500 w-12 text-right">{Math.round(zoom * 100)}%</span>
              </div>
              <button onClick={zoomIn} className="w-8 h-8 rounded-full bg-tierra-100 hover:bg-tierra-200 flex items-center justify-center text-tierra-700 transition-all">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-3">
              <button onClick={rotar} className="btn-secondary flex-shrink-0" title="Rotar 90°">
                <RotateCcw className="w-4 h-4" />
                Rotar
              </button>
              <button onClick={resetear} className="btn-secondary flex-shrink-0">
                Resetear
              </button>
              <div className="flex-1" />
              <button onClick={onCancelar} className="btn-secondary">
                Cancelar
              </button>
              <button onClick={confirmar} className="btn-primary">
                <Check className="w-4 h-4" />
                Confirmar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
