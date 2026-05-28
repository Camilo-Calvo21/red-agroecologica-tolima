export default function Footer() {
  return (
    <footer className="border-t border-tierra-200/40 bg-tierra-50/40 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-4">
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-morado-800">
              Proyecto de investigación: MASATO, orientaciones metodológicas para diseños cosmotécnicos
            </p>
            <p className="text-xs text-tierra-600">
              Investigador: Daniel Lopera Molano
            </p>
            <p className="text-xs text-tierra-600">
              Apoyo técnico: Programa de Paz y Región, Juan Camilo Triana
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-3 border-t border-tierra-200/30">
            <div className="flex items-center gap-2.5">
              <img src="/logo-red.png" alt="Logo Red Agroecológica" className="w-7 h-7 rounded-full object-cover" />
              <span className="font-display text-sm font-semibold text-tierra-900">Red agroecologica del tolima</span>
            </div>
            <div className="flex items-center gap-4 text-2xs text-tierra-500">
              <span>© {new Date().getFullYear()}</span>
              <span className="font-mono">v1.0.0</span>
              
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
