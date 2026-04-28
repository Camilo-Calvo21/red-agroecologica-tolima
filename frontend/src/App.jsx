import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { LayoutProtegido, LayoutPublico } from './components/Layout'

import Landing         from './pages/Landing'
import IniciarSesion   from './pages/IniciarSesion'
import Registrarse     from './pages/Registrarse'
import Dashboard       from './pages/Dashboard'
import Fincas          from './pages/Fincas'
import Analizar        from './pages/Analizar'
import MuestraDetalle  from './pages/MuestraDetalle'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Rutas públicas ──────────────────────── */}
          <Route element={<LayoutPublico />}>
            <Route path="/" element={<Landing />} />
          </Route>

          <Route element={<LayoutPublico redirigirSiAuth />}>
            <Route path="/iniciar-sesion" element={<IniciarSesion />} />
            <Route path="/registrarse"    element={<Registrarse />} />
          </Route>

          {/* ── Rutas autenticadas ──────────────────── */}
          <Route element={<LayoutProtegido />}>
            <Route path="/dashboard"        element={<Dashboard />} />
            <Route path="/fincas"           element={<Fincas />} />
            <Route path="/analizar"         element={<Analizar />} />
            <Route path="/muestras/:id"     element={<MuestraDetalle />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
