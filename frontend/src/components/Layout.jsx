import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Header from './Header'
import Footer from './Footer'
import { Loader2 } from 'lucide-react'

/**
 * Layout para rutas autenticadas. Redirige a /iniciar-sesion si no hay sesión.
 */
export function LayoutProtegido() {
  const { autenticado, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-musgo-600 animate-spin" />
      </div>
    )
  }

  if (!autenticado) {
    return <Navigate to="/iniciar-sesion" replace />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

/**
 * Layout para rutas públicas (login, signup, landing).
 * Si el usuario ya está autenticado, lo manda al dashboard.
 */
export function LayoutPublico({ redirigirSiAuth = false }) {
  const { autenticado, cargando } = useAuth()

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-musgo-600 animate-spin" />
      </div>
    )
  }

  if (redirigirSiAuth && autenticado) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
