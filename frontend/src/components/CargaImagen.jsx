import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImagePlus, X, Image as ImageIcon, Pencil } from 'lucide-react'
import { validarImagen } from '../lib/dominio'
import EditorImagen from './EditorImagen'

/**
 * Componente de carga de imagen con drag & drop, preview y editor.
 * Al subir imagen, abre el editor para centrar/recortar.
 * Devuelve al padre el File ya recortado a 1024x1024.
 */
export default function CargaImagen({ imagen, onImagenSeleccionada, deshabilitado }) {
  const [arrastrando, setArrastrando] = useState(false)
  const [error, setError]             = useState(null)
  const [previewUrl, setPreviewUrl]   = useState(null)
  const [editorAbierto, setEditorAbierto] = useState(false)
  const [imagenOriginalUrl, setImagenOriginalUrl] = useState(null)
  const inputRef = useRef(null)

  /** Procesa el archivo: valida y abre el editor */
  const procesarArchivo = useCallback((archivo) => {
    const errMsg = validarImagen(archivo)
    if (errMsg) {
      setError(errMsg)
      return
    }
    setError(null)

    // Generar URL para el editor
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagenOriginalUrl(e.target.result)
      setEditorAbierto(true)
    }
    reader.readAsDataURL(archivo)
  }, [])

  /** Cuando el editor confirma, recibimos el File recortado */
  const onEditorConfirmar = useCallback((archivoEditado) => {
    setEditorAbierto(false)

    // Generar preview del archivo editado
    const reader = new FileReader()
    reader.onload = (e) => setPreviewUrl(e.target.result)
    reader.readAsDataURL(archivoEditado)

    onImagenSeleccionada(archivoEditado)
  }, [onImagenSeleccionada])

  const onEditorCancelar = useCallback(() => {
    setEditorAbierto(false)
    setImagenOriginalUrl(null)
  }, [])

  /** Reabrir editor con la imagen original */
  const reabrirEditor = (e) => {
    e.stopPropagation()
    if (imagenOriginalUrl) {
      setEditorAbierto(true)
    }
  }

  /* ── Eventos drag & drop ──────────────────────── */
  const onDragOver = (e) => { e.preventDefault(); setArrastrando(true) }
  const onDragLeave = ()  => setArrastrando(false)
  const onDrop = (e) => {
    e.preventDefault()
    setArrastrando(false)
    const archivo = e.dataTransfer.files[0]
    if (archivo) procesarArchivo(archivo)
  }

  const onClick = () => {
    if (!deshabilitado) inputRef.current?.click()
  }

  const onInputChange = (e) => {
    const archivo = e.target.files?.[0]
    if (archivo) procesarArchivo(archivo)
  }

  const limpiar = (e) => {
    e.stopPropagation()
    setPreviewUrl(null)
    setImagenOriginalUrl(null)
    onImagenSeleccionada(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const tienePreview = previewUrl && imagen

  return (
    <div className="space-y-2">
      <label className="label-field flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-tierra-500" />
        Fotografía del cromatograma
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        onChange={onInputChange}
        className="hidden"
      />

      <motion.div
        onClick={onClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        whileHover={!deshabilitado && !tienePreview ? { scale: 1.005 } : {}}
        className={`
          relative cursor-pointer rounded-2xl overflow-hidden
          border-2 border-dashed transition-all duration-300
          ${arrastrando
            ? 'border-musgo-500 bg-musgo-50/50'
            : tienePreview
              ? 'border-musgo-300 bg-tierra-50/30'
              : 'border-tierra-300 bg-white/40 hover:border-musgo-400 hover:bg-musgo-50/20'}
          ${deshabilitado ? 'opacity-60 cursor-not-allowed' : ''}
        `}
      >
        <AnimatePresence mode="wait">
          {tienePreview ? (
            /* ── Preview de la imagen editada ────── */
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative aspect-square"
            >
              <img
                src={previewUrl}
                alt="Cromatograma editado"
                className="w-full h-full object-cover"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-tierra-900/80 via-transparent to-transparent" />

              {/* Botón quitar */}
              <button
                onClick={limpiar}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-tierra-700 hover:text-tierra-900 flex items-center justify-center shadow-md transition-all"
                title="Quitar imagen"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Botón re-editar */}
              <button
                onClick={reabrirEditor}
                className="absolute top-3 right-14 w-9 h-9 rounded-full bg-morado-500/90 hover:bg-morado-600 text-white flex items-center justify-center shadow-md transition-all"
                title="Editar recorte"
              >
                <Pencil className="w-4 h-4" />
              </button>

              <div className="absolute bottom-3 left-4 right-4 text-tierra-50">
                <p className="text-xs font-medium tracking-wide opacity-80 mb-1">
                  Imagen lista · 1024×1024
                </p>
                <p className="font-mono text-sm truncate">
                  {imagen.name}
                </p>
                <p className="text-2xs opacity-70 mt-1">
                  {(imagen.size / 1024).toFixed(0)} KB · PNG
                </p>
              </div>
            </motion.div>
          ) : (
            /* ── Estado vacío ──────────────────── */
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="aspect-square flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-musgo-200/50 rounded-full blur-xl" />
                <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-tierra-100 to-tierra-200 flex items-center justify-center">
                  <ImagePlus className="w-7 h-7 text-musgo-700" strokeWidth={1.8} />
                </div>
              </div>

              <p className="text-tierra-800 font-medium mb-1.5">
                {arrastrando ? 'Suelta tu cromatograma aquí' : 'Arrastra tu cromatograma'}
              </p>
              <p className="text-sm text-tierra-500 mb-3">
                o haz clic para seleccionarlo
              </p>
              <p className="text-2xs text-tierra-400 uppercase tracking-wider">
                JPG · PNG · máx. 10 MB
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Mensaje de error ────────────────────── */}
      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-sm text-ambar-600 font-medium"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* ── Modal del editor ────────────────────── */}
      {editorAbierto && imagenOriginalUrl && (
        <EditorImagen
          imagenSrc={imagenOriginalUrl}
          onConfirmar={onEditorConfirmar}
          onCancelar={onEditorCancelar}
        />
      )}
    </div>
  )
}
