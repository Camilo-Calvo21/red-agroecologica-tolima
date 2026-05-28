import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Microscope, Map, BarChart3, Sparkles } from 'lucide-react'

export default function Landing() {
  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }} className="max-w-4xl">
          <span className="badge bg-morado-50 text-morado-600 border border-morado-200/60 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-dorado-400 animate-pulse-soft" />
            Tecnología situada — MASATO: orientaciones metodológicas para diseños cosmotécnicos
          </span>

          <h1 className="font-display text-5xl md:text-6xl font-medium text-tierra-900 leading-[1.08] mb-6 text-balance">
            <span className="font-display-italic text-musgo-700">Cromatografías ampliadas.</span><br />
            Una técnica de la Red Agroecológica del Tolima que dialoga con la IA.
          </h1>

          <p className="text-lg text-tierra-700 leading-relaxed max-w-3xl text-balance mb-10">
            En la Red sabemos que el suelo está vivo y una técnica que hemos aprendido a aplicar para leerlo e interpretarlo es la cromatografía de Pfeiffer. Sin embargo, la cromatografía aborda tres indicadores principales. En nuestros cacharreos con la IA hemos creado esta tecnología situada que integra nuevos indicadores, como el pH y la humedad (por el momento), para generar cromatografías ampliadas con IA. Toda la interpretación sigue sucediendo en diálogo entre el campesino, el asesor técnico y el apoyo, como bio retrato del suelo, de la IA.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link to="/registrarse" className="btn-primary text-base py-4 px-8"><Sparkles className="w-5 h-5" /> Empezar ahora</Link>
            <Link to="/iniciar-sesion" className="btn-secondary text-base py-3 px-7">Ya tengo cuenta <ArrowRight className="w-4 h-4" /></Link>
          </div>
        </motion.div>
      </section>

      <section className="max-w-7xl mx-auto px-6 pb-24">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }} className="grid md:grid-cols-3 gap-5">
          <Tarjeta icono={Map} titulo="Tus cultivos" texto="Registra cada cultivo: ubicación, altitud, cultivo principal. Cada muestra se asocia a su cultivo para estudiar cómo evoluciona el suelo en el tiempo." color="musgo" />
          <Tarjeta icono={Microscope} titulo="Bio retrato" texto="Sube la fotografía de un cromatograma Pfeiffer y los valores de pH y humedad. El sistema genera el bio retrato para tu interpretación." color="cielo" />
          <Tarjeta icono={BarChart3} titulo="Histórico por cultivo" texto="Consulta todas las muestras realizadas. Compara la evolución del suelo a lo largo del tiempo, por temporada o por cultivo." color="dorado" />
        </motion.div>
      </section>

      <section className="bg-tierra-100/30 border-y border-tierra-200/40 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <span className="badge bg-dorado-50 text-dorado-700 mb-3">¿Cómo funciona?</span>
            <h2 className="font-display text-4xl text-tierra-900 mb-3 text-balance">Tres pasos para <span className="font-display-italic text-musgo-700">generar tu bio retrato</span></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <Paso n="1" titulo="Crea tu cultivo" texto="Registra los datos básicos: nombre, municipio, vereda y cultivo principal." />
            <Paso n="2" titulo="Sube el cromatograma" texto="Toma una fotografía clara del cromatograma Pfeiffer y súbela al sistema." />
            <Paso n="3" titulo="Obtén el bio retrato" texto="Interpreta esta imagen junto con tu colectivo y asistente técnico." />
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="font-display text-4xl text-tierra-900 mb-4 text-balance">Una herramienta hecha por la Red,<br /><span className="font-display-italic text-musgo-700">para la Red</span>.</h2>
        <p className="text-tierra-600 mb-8 max-w-xl mx-auto text-balance">Crea tu cuenta gratuita y empieza a registrar las muestras de tus cultivos. Sin instalaciones, sin complicaciones.</p>
        <Link to="/registrarse" className="btn-primary text-base py-4 px-8 inline-flex"><Sparkles className="w-5 h-5" /> Crear cuenta gratis</Link>
      </section>
    </>
  )
}

function Tarjeta({ icono: Icono, titulo, texto, color }) {
  const colores = { musgo: 'from-musgo-600 to-musgo-800', agua: 'from-agua-500 to-agua-800', tierra: 'from-tierra-500 to-tierra-700', cielo: 'from-cielo-500 to-cielo-700', dorado: 'from-dorado-500 to-dorado-700' }
  return (
    <div className="card p-6">
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colores[color]} flex items-center justify-center mb-4 shadow-md`}><Icono className="w-5 h-5 text-white" strokeWidth={2} /></div>
      <h3 className="font-display text-xl text-tierra-900 mb-2">{titulo}</h3>
      <p className="text-sm text-tierra-700 leading-relaxed">{texto}</p>
    </div>
  )
}

function Paso({ n, titulo, texto }) {
  return (
    <div className="text-center">
      <div className="font-display text-6xl text-morado-400/25 leading-none mb-2">{n}</div>
      <h3 className="font-display text-xl text-tierra-900 mb-2">{titulo}</h3>
      <p className="text-sm text-tierra-700 leading-relaxed">{texto}</p>
    </div>
  )
}
