import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sprout, Loader2, Mail, Lock, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function IniciarSesion() {
  const { iniciarSesion } = useAuth()
  const navegar = useNavigate()
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState(null)
  const [cargando, setCargando]   = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      await iniciarSesion({ email, password })
      navegar('/dashboard')
    } catch (err) {
      setError(traducirError(err.message))
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="card-elevated p-8"
      >
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-musgo-600 to-musgo-800 flex items-center justify-center shadow-md">
            <Sprout className="w-5 h-5 text-tierra-50" />
          </div>
          <h1 className="font-display text-3xl text-tierra-900 mb-2">
            Bienvenido de vuelta
          </h1>
          <p className="text-sm text-tierra-600">
            Inicia sesión para continuar con tu Red
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label-field flex items-center gap-2">
              <Mail className="w-4 h-4 text-tierra-500" />
              Correo electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field"
              placeholder="tu@correo.com"
            />
          </div>

          <div>
            <label className="label-field flex items-center gap-2">
              <Lock className="w-4 h-4 text-tierra-500" />
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="input-field"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2 text-sm text-ambar-600 bg-ambar-400/10 border border-ambar-400/30 rounded-xl p-3"
            >
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={cargando}
            className="btn-primary w-full py-3.5 mt-2"
          >
            {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Iniciar sesión'}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-tierra-200/40">
          <p className="text-sm text-tierra-600">
            ¿Aún no tienes cuenta?{' '}
            <Link to="/registrarse" className="text-musgo-700 font-medium hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

function traducirError(msg) {
  const map = {
    'Invalid login credentials': 'Correo o contraseña incorrectos',
    'Email not confirmed':       'Confirma tu correo antes de iniciar sesión',
    'User not found':            'Usuario no encontrado',
  }
  return map[msg] || msg
}
