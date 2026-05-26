import { motion } from 'framer-motion'
import { BookOpen, Mountain, Droplets, Zap } from 'lucide-react'

/**
 * Sección educativa al final de la página — ayuda al usuario no técnico
 * a entender qué representan las formas y colores que ve.
 */
export default function SeccionEducativa() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6 }}
      >
        <div className="text-center mb-10">
          <span className="badge bg-tierra-100 text-tierra-700 mb-3">
            <BookOpen className="w-3 h-3" />
            Cómo leer el resultado
          </span>
          <h2 className="font-display text-4xl text-tierra-900 mb-3 text-balance">
            Tres claves para entender <span className="font-display-italic text-musgo-700">tu bio retrato</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-5">

          <Tarjeta
            icono={Mountain}
            titulo="La forma del borde"
            destaca="pH del suelo"
            texto="Si las ondulaciones empujan hacia adentro, tu suelo está ácido. Si empujan hacia afuera, está alcalino. Un anillo completamente liso significa equilibrio perfecto."
            colorAcento="musgo"
          />

          <Tarjeta
            icono={Droplets}
            titulo="La intensidad del azul"
            destaca="Humedad"
            texto="Un azul casi blanco indica suelo muy seco. A medida que sube la humedad, el azul se oscurece progresivamente hasta llegar a un azul intenso cuando el suelo está saturado."
            colorAcento="agua"
          />

          <Tarjeta
            icono={Zap}
            titulo="Cambio"
            destaca="Cambio"
            texto="Próximamente podrás vincular un nuevo indicador: conductividad eléctrica."
            colorAcento="ambar"
          />

        </div>
      </motion.div>
    </section>
  )
}

function Tarjeta({ icono: Icono, titulo, destaca, texto, colorAcento }) {
  const acento = {
    musgo: { bg: 'bg-musgo-50',  text: 'text-musgo-700',  border: 'border-musgo-200/60', iconBg: 'from-musgo-600 to-musgo-800' },
    agua:  { bg: 'bg-agua-50',   text: 'text-agua-700',   border: 'border-agua-200/60',  iconBg: 'from-agua-500 to-agua-800' },
    ambar: { bg: 'bg-ambar-400/10', text: 'text-ambar-600', border: 'border-ambar-400/30', iconBg: 'from-ambar-500 to-ambar-600' },
  }[colorAcento]

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`card p-6 hover:shadow-md hover:shadow-tierra-900/5 transition-all`}
    >
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${acento.iconBg} flex items-center justify-center mb-4 shadow-md`}>
        <Icono className="w-5 h-5 text-white" strokeWidth={2} />
      </div>

      <span className={`badge ${acento.bg} ${acento.text} ${acento.border} border mb-2`}>
        {destaca}
      </span>

      <h3 className="font-display text-xl text-tierra-900 mb-2 leading-tight">
        {titulo}
      </h3>

      <p className="text-sm text-tierra-700 leading-relaxed">
        {texto}
      </p>
    </motion.div>
  )
}
