import { motion } from 'framer-motion'
import { Droplets, Info } from 'lucide-react'
import { useState } from 'react'
import { estadoHumedad, colorPorHumedad, RANGOS, validarHumedad } from '../lib/dominio'

/**
 * Control de humedad con slider, input numérico y vista previa
 * del color azul que tomará el anillo.
 */
export default function ControlHumedad({ valor, onCambio, deshabilitado }) {
  const [mostrarAyuda, setMostrarAyuda] = useState(false)
  const estado = estadoHumedad(valor)
  const colorVista = colorPorHumedad(valor)
  const error = validarHumedad(valor)

  return (
    <div className="space-y-3">

      {/* ── Etiqueta + ayuda ────────────────────── */}
      <div className="flex items-center justify-between">
        <label className="label-field flex items-center gap-2 mb-0">
          <Droplets className="w-4 h-4 text-tierra-500" />
          Humedad del suelo
        </label>
        <button
          type="button"
          onClick={() => setMostrarAyuda(!mostrarAyuda)}
          className="text-tierra-400 hover:text-tierra-700 transition-colors"
          aria-label="Ayuda sobre humedad"
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
          La <strong>humedad</strong> indica el porcentaje del suelo ocupado por
          agua. El rango óptimo varía por cultivo, pero generalmente está entre
          el <strong>50% y el 70%</strong>. Demasiada humedad ahoga las raíces;
          demasiado poca, las estresa.
        </motion.div>
      )}

      {/* ── Valor numérico grande ───────────────── */}
      <div className="flex items-end gap-3">
        <div className="font-display text-5xl text-tierra-900 leading-none font-medium tabular-nums">
          {valor.toFixed(0)}
          <span className="text-2xl text-tierra-500 ml-1">%</span>
        </div>
        <div className={`text-sm font-medium pb-1 text-${estado.color}`}>
          {estado.etiqueta}
        </div>
      </div>

      {/* ── Slider ──────────────────────────────── */}
      <div className="relative pt-2">
        {/* Track con gradiente azul (rampa real del anillo) */}
        <div
          className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-full"
          style={{
            background: 'linear-gradient(90deg, rgb(214,238,255) 0%, rgb(135,206,235) 25%, rgb(42,130,200) 50%, rgb(26,95,160) 75%, rgb(10,30,90) 100%)',
          }}
        />

        <input
          type="range"
          min={RANGOS.humedad.min}
          max={RANGOS.humedad.max}
          step={RANGOS.humedad.paso}
          value={valor}
          disabled={deshabilitado}
          onChange={(e) => onCambio(Number(e.target.value))}
          className="relative w-full h-6 appearance-none bg-transparent cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-agua-700
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-webkit-slider-thumb]:transition-all
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
                     [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-agua-700
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />

        <div className="flex justify-between mt-2 text-2xs text-tierra-500 font-mono">
          <span>0% seco</span>
          <span>50%</span>
          <span>100% saturado</span>
        </div>
      </div>

      {/* ── Vista previa del color del anillo ───── */}
      <div className="bg-tierra-50/60 border border-tierra-200/50 rounded-xl p-3 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full border-2 border-white shadow-md flex-shrink-0"
          style={{ backgroundColor: colorVista }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-2xs uppercase tracking-wider text-tierra-500 font-semibold mb-0.5">
            Color del anillo
          </div>
          <div className="text-sm text-tierra-800 font-mono truncate">
            {colorVista}
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-ambar-600 font-medium">{error}</p>}
    </div>
  )
}
