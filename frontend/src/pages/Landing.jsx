import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, FlaskConical, Map, BarChart3, Sparkles } from 'lucide-react'

export default function Landing() {
  return (
    <>
      {/* ── HERO ──────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="max-w-4xl"
        >
          <span className="badge bg-musgo-50 text-musgo-700 border border-musgo-200/60 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-musgo-500 animate-pulse-soft" />
            Tecnología situada · Programa Paz y Región
          </span>

          <h1 className="font-display text-6xl md:text-7xl font-medium text-tierra-900 leading-[1.02] mb-6 text-balance">
            La tierra <span className="font-display-italic text-musgo-700">habla</span>.
            <br />
            Aprendamos a <span className="font-display-italic text-agua-700">leerla</span>.
          </h1>

          <p className="text-xl text-tierra-700 leading-relaxed max-w-2xl text-balance mb-10">
            Sistema de cromatografía visual que traduce las imágenes del suelo
            en un lenguaje que cualquier agricultor puede entender. Sube tu
            cromatograma, ingresa los valores de pH y humedad, y obtén una
            visualización orgánica al instante.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link to="/registrarse" className="btn-primary text-base py-4 px-8">
              <Sparkles className="w-5 h-5" />
              Empezar ahora
            </Link>
            <Link to="/iniciar-sesion" className="btn-secondary text-base py-3 px-7">
              Ya tengo cuenta
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ── FEATURES ─────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="grid md:grid-cols-3 gap-5"
        >
          <Tarjeta
            icono={Map}
            titulo="Tus fincas, organizadas"
            texto="Registra cada finca que monitoreas: ubicación, altitud, cultivo principal. Cada muestra se asocia a su finca para rastrear cómo evoluciona el suelo en el tiempo."
            color="musgo"
          />
          <Tarjeta
            icono={FlaskConical}
            titulo="Análisis al instante"
            texto="Sube la fotografía de un cromatograma Pfeiffer y los valores de pH y humedad. El sistema genera el anillo orgánico en segundos."
            color="agua"
          />
          <Tarjeta
            icono={BarChart3}
            titulo="Histórico por finca"
            texto="Consulta todas las muestras realizadas. Compara la evolución del suelo a lo largo del tiempo, por temporada o por cultivo."
            color="tierra"
          />
        </motion.div>
      </section>

      {/* ── COMO FUNCIONA ────────────────────────────── */}
      <section className="bg-tierra-100/30 border-y border-tierra-200/40 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="badge bg-tierra-100 text-tierra-700 mb-3">
              ¿Cómo funciona?
            </span>
            <h2 className="font-display text-4xl text-tierra-900 mb-3 text-balance">
              Tres pasos para <span className="font-display-italic text-musgo-700">leer tu suelo</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Paso n="1" titulo="Crea tu finca" texto="Registra los datos básicos: nombre, municipio, vereda y cultivo principal." />
            <Paso n="2" titulo="Sube el cromatograma" texto="Toma una fotografía clara del cromatograma Pfeiffer y subela al sistema." />
            <Paso n="3" titulo="Obtén el resultado" texto="Recibes la imagen con el anillo orgánico que comunica el pH y la humedad." />
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="font-display text-4xl text-tierra-900 mb-4 text-balance">
          Una herramienta hecha por la Red,<br />
          <span className="font-display-italic text-musgo-700">para la Red</span>.
        </h2>
        <p className="text-tierra-600 mb-8 max-w-xl mx-auto text-balance">
          Crea tu cuenta gratuita y empieza a registrar las muestras de tus fincas.
          Sin instalaciones, sin complicaciones.
        </p>
        <Link to="/registrarse" className="btn-primary text-base py-4 px-8 inline-flex">
          <Sparkles className="w-5 h-5" />
          Crear cuenta gratis
        </Link>
      </section>
    </>
  )
}

function Tarjeta({ icono: Icono, titulo, texto, color }) {
  const colores = {
    musgo:  'from-musgo-600 to-musgo-800',
    agua:   'from-agua-500 to-agua-800',
    tierra: 'from-tierra-500 to-tierra-700',
  }
  return (
    <div className="card p-6">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colores[color]} flex items-center justify-center mb-4 shadow-md`}>
        <Icono className="w-5 h-5 text-white" strokeWidth={2} />
      </div>
      <h3 className="font-display text-xl text-tierra-900 mb-2">{titulo}</h3>
      <p className="text-sm text-tierra-700 leading-relaxed">{texto}</p>
    </div>
  )
}

function Paso({ n, titulo, texto }) {
  return (
    <div className="text-center">
      <div className="font-display text-6xl text-musgo-600/30 leading-none mb-2">{n}</div>
      <h3 className="font-display text-xl text-tierra-900 mb-2">{titulo}</h3>
      <p className="text-sm text-tierra-700 leading-relaxed">{texto}</p>
    </div>
  )
}
