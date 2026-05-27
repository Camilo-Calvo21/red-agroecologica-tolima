import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Loader2 } from 'lucide-react'

import CargaImagen           from '../components/CargaImagen'
import ControlPh             from '../components/ControlPh'
import ControlHumedad        from '../components/ControlHumedad'
import SelectorFinca         from '../components/SelectorFinca'
import VisualizadorResultado from '../components/VisualizadorResultado'
import SeccionEducativa      from '../components/SeccionEducativa'

import { fincasAPI, muestrasAPI } from '../lib/api'

export default function Analizar() {
  const [searchParams] = useSearchParams()
  const fincaIdInicial = searchParams.get('finca') || ''

  const [fincas, setFincas]         = useState([])
  const [fincaId, setFincaId]       = useState(fincaIdInicial)
  const [imagen, setImagen]         = useState(null)
  const [ph, setPh]                 = useState(6.5)
  const [humedad, setHumedad]       = useState(60)
  const [notas, setNotas]           = useState('')
  const [resultado, setResultado]   = useState(null)
  const [procesando, setProcesando] = useState(false)
  const [error, setError]           = useState(null)
  const [cargando, setCargando]     = useState(true)

  useEffect(() => { cargarCultivos() }, [])

  const cargarCultivos = async () => {
    try {
      const data = await fincasAPI.listar()
      setFincas(data)
      if (!fincaId && data.length === 1) setFincaId(data[0].id)
    } catch (e) {
      setError('No se pudieron cargar tus cultivos: ' + e.message)
    } finally {
      setCargando(false)
    }
  }

  const puedeGenerar = imagen && fincaId && !procesando

  const onGenerar = async () => {
    if (!puedeGenerar) return
    setProcesando(true)
    setError(null)
    setResultado(null)
    try {
      const muestra = await muestrasAPI.crear({ fincaId, imagen, ph, humedad, notas: notas.trim() || undefined })
      setResultado(muestra)
      setTimeout(() => { document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 100)
    } catch (e) {
      setError(e.message)
    } finally {
      setProcesando(false)
    }
  }

  const onReiniciar = () => {
    setResultado(null); setError(null); setImagen(null); setNotas('')
    document.getElementById('formulario')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (cargando) {
    return (<div className="max-w-7xl mx-auto px-6 py-16 flex items-center justify-center"><Loader2 className="w-8 h-8 text-musgo-600 animate-spin" /></div>)
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <span className="badge bg-morado-50 text-morado-600 border border-morado-200/60 mb-3"><Sparkles className="w-3 h-3" /> Nuevo bio retrato</span>
          <h1 className="font-display text-4xl text-tierra-900 mb-2">Generar <span className="font-display-italic text-morado-600">cromatografía ampliada</span></h1>
          <p className="text-tierra-600 max-w-2xl">Sube la fotografía del cromatograma de Pfeiffer, ajusta los valores de pH y humedad medidos, y obtén el bio retrato ampliado.</p>
        </motion.div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-6 pb-12">
        <div className="grid lg:grid-cols-2 gap-7" id="formulario">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="card-elevated p-7 space-y-7">
            <div>
              <span className="badge bg-tierra-100 text-tierra-700 mb-3">Paso 1 — Datos</span>
              <h3 className="font-display text-2xl text-tierra-900 leading-tight">Cuéntale al sistema sobre tu suelo</h3>
            </div>

            <SelectorFinca fincas={fincas} fincaId={fincaId} onCambio={setFincaId} deshabilitado={procesando} />
            <CargaImagen imagen={imagen} onImagenSeleccionada={setImagen} deshabilitado={procesando} />

            <div className="divider-deco"><span className="text-2xs uppercase tracking-widest font-semibold">Variables del suelo</span></div>

            <ControlPh valor={ph} onCambio={setPh} deshabilitado={procesando} />
            <ControlHumedad valor={humedad} onCambio={setHumedad} deshabilitado={procesando} />

            <div>
              <label className="label-field">Notas (opcional)</label>
              <textarea rows={2} maxLength={500} value={notas} onChange={(e) => setNotas(e.target.value)} disabled={procesando} className="input-field resize-none" placeholder="Observaciones de campo, condiciones del muestreo..." />
            </div>

            <div className="pt-2">
              <button onClick={onGenerar} disabled={!puedeGenerar} className="btn-primary w-full text-base py-4">
                {procesando ? (<><Loader2 className="w-5 h-5 animate-spin" /> Procesando...</>) : (<><Sparkles className="w-5 h-5" /> Generar y guardar</>)}
              </button>
              {error && (<p className="text-xs text-ambar-600 text-center mt-3 font-medium">⚠ {error}</p>)}
              {!puedeGenerar && !procesando && !error && (
                <p className="text-xs text-tierra-500 text-center mt-3">
                  {!fincaId && 'Selecciona un cultivo · '}{!imagen && 'Sube una imagen · '}{fincaId && imagen && 'Listo para generar'}
                </p>
              )}
            </div>
          </motion.div>

          <div id="resultado">
            <VisualizadorResultado muestra={resultado} procesando={procesando} onReiniciar={onReiniciar} />
          </div>
        </div>
      </main>

      <SeccionEducativa />
    </>
  )
}
