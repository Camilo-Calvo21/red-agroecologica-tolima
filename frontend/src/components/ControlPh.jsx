import { motion } from 'framer-motion'
import { FlaskConical, Info } from 'lucide-react'
import { useState } from 'react'
import { estadoPh, direccionCrestas, RANGOS, validarPh } from '../lib/dominio'

/**
 * Control de pH con slider, input numérico y vista previa semántica.
 */
export default function ControlPh({ valor, onCambio, deshabilitado }) {
  const [mostrarAyuda, setMostrarAyuda] = useState(false)
  const estado = estadoPh(valor)
  const direccion = direccionCrestas(valor)
  const error = validarPh(valor)

  /**
   * Posición del marcador sobre la escala (0–100%).
   * pH 0 → 0%, pH 7 → 50%, pH 14 → 100%
   */
  const posicion = (valor / 14) * 100

  return (
    <div className="space-y-3">

      {/* ── Etiqueta + ayuda ────────────────────── */}
      <div className="flex items-center justify-between">
        <label className="label-field flex items-center gap-2 mb-0">
          <FlaskConical className="w-4 h-4 text-tierra-500" />
          pH del suelo
        </label>
        <button
          type="button"
          onClick={() => setMostrarAyuda(!mostrarAyuda)}
          className="text-tierra-400 hover:text-tierra-700 transition-colors"
          aria-label="Ayuda sobre pH"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {/* ── Tooltip de ayuda ────────────────────── */}
      {mostrarAyuda && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="text-xs text-tierra-600 leading-relaxed bg-tierra-50/80 border border-tierra-200/60 rounded-xl p-3"
        >
          El <strong>pH</strong> mide qué tan ácido o alcalino está el suelo, en una
          escala de 0 a 14. <strong>Por debajo de 7 es ácido</strong>; por encima,
          alcalino. La mayoría de cultivos prefieren un pH cercano a 7.
        </motion.div>
      )}

      {/* ── Valor numérico grande ───────────────── */}
      <div className="flex items-end gap-3">
        <div className="font-display text-5xl text-tierra-900 leading-none font-medium tabular-nums">
          {valor.toFixed(1)}
        </div>
        <div className={`text-sm font-medium pb-1 text-${estado.color}`}>
          {estado.etiqueta}
        </div>
      </div>

      {/* ── Slider ──────────────────────────────── */}
      <div className="relative pt-2">
        {/* Track con gradiente cromático */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full"
          style={{
            background: 'linear-gradient(90deg, #C0392B 0%, #E67E22 20%, #F1C40F 40%, #52793D 50%, #1A82B5 70%, #5D3A9B 100%)',
            opacity: 0.85,
          }}
        />
        {/* Marca de neutralidad */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-5 bg-white/80 rounded-full pointer-events-none" />

        <input
          type="range"
          min={RANGOS.ph.min}
          max={RANGOS.ph.max}
          step={RANGOS.ph.paso}
          value={valor}
          disabled={deshabilitado}
          onChange={(e) => onCambio(Number(e.target.value))}
          className="relative w-full h-6 appearance-none bg-transparent cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-tierra-700
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-webkit-slider-thumb]:transition-all
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                     [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-tierra-700
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {/* Escala referencia */}
        <div className="flex justify-between mt-2 text-2xs text-tierra-500 font-mono">
          <span>0 ácido</span>
          <span className="text-musgo-600 font-semibold">7</span>
          <span>14 alcalino</span>
        </div>
      </div>

      {/* ── Vista previa semántica ──────────────── */}
      <div className="bg-tierra-50/60 border border-tierra-200/50 rounded-xl p-3">
        <div className="text-2xs uppercase tracking-wider text-tierra-500 font-semibold mb-1">
          En el anillo se verá:
        </div>
        <div className="text-sm text-tierra-800 font-medium">
          {direccion.texto}
        </div>
        <div className="text-xs text-tierra-600 mt-0.5">
          {direccion.descripcion}
        </div>
      </div>

      {error && <p className="text-xs text-ambar-600 font-medium">{error}</p>}
    </div>
  )
}
