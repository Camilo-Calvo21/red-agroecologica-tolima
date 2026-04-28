import { Sprout } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="border-t border-tierra-200/40 bg-tierra-50/40 mt-auto">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-musgo-600 to-musgo-800 flex items-center justify-center">
              <Sprout className="w-3.5 h-3.5 text-tierra-50" />
            </div>
            <span className="font-display text-sm font-semibold text-tierra-900">
              Red Agroecológica del Tolima
            </span>
          </div>
          <div className="flex items-center gap-4 text-2xs text-tierra-500">
            <span>© {new Date().getFullYear()}</span>
            <span className="font-mono">v1.0.0</span>
            <span>Programa Paz y Región</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
