import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sprout, LogOut, LayoutDashboard, FlaskConical, Map } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Header() {
  const { usuario, cerrarSesion } = useAuth()
  const ubicacion = useLocation()
  const navegar = useNavigate()

  const onCerrarSesion = async () => {
    try {
      await cerrarSesion()
      navegar('/')
    } catch (e) {
      console.error('Error al cerrar sesión:', e)
    }
  }

  const enlaces = [
    { to: '/dashboard', label: 'Inicio',  icon: LayoutDashboard },
    { to: '/fincas',    label: 'Fincas',  icon: Map },
    { to: '/analizar',  label: 'Analizar',icon: FlaskConical },
  ]

  return (
    <header className="border-b border-tierra-200/40 bg-tierra-50/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to={usuario ? '/dashboard' : '/'} className="flex items-center gap-3 group">
          <div className="relative">
            <div className="absolute inset-0 bg-musgo-500/20 rounded-full blur-lg group-hover:bg-musgo-500/30 transition-all" />
            <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-musgo-600 to-musgo-800 flex items-center justify-center shadow-md">
              <Sprout className="w-4 h-4 text-tierra-50" strokeWidth={2.2} />
            </div>
          </div>
          <div className="hidden sm:block">
            <h1 className="font-display text-base font-semibold text-tierra-900 leading-none">
              Red Agroecológica
            </h1>
            <p className="text-2xs uppercase tracking-[0.18em] text-tierra-500 font-medium mt-0.5">
              Tolima
            </p>
          </div>
        </Link>

        {/* Nav */}
        {usuario && (
          <nav className="flex items-center gap-1">
            {enlaces.map(({ to, label, icon: Icon }) => {
              const activo = ubicacion.pathname.startsWith(to)
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activo
                      ? 'text-musgo-700'
                      : 'text-tierra-600 hover:text-tierra-900 hover:bg-tierra-100/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{label}</span>
                  {activo && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 bg-musgo-100/80 rounded-full -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                </Link>
              )
            })}
          </nav>
        )}

        {/* User */}
        {usuario ? (
          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-xs text-tierra-500">Conectado</div>
              <div className="text-sm font-medium text-tierra-800 truncate max-w-[160px]">
                {usuario.email}
              </div>
            </div>
            <button
              onClick={onCerrarSesion}
              className="w-9 h-9 rounded-full bg-tierra-100 hover:bg-tierra-200 flex items-center justify-center transition-all text-tierra-700"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/iniciar-sesion" className="btn-secondary">
              Iniciar sesión
            </Link>
            <Link to="/registrarse" className="btn-primary">
              Registrarse
            </Link>
          </div>
        )}

      </div>
    </header>
  )
}
