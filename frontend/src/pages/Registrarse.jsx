import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sprout, Loader2, Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Registrarse() {
  const { registrar } = useAuth()
  const navegar = useNavigate()
  const [datos, setDatos] = useState({ nombre: '', email: '', password: '' })
  const [error, setError]         = useState(null)
  const [exito, setExito]         = useState(false)
  const [cargando, setCargando]   = useState(false)

  const cambiar = (campo) => (e) =>
    setDatos({ ...datos, [campo]: e.target.value })

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setCargando(true)
    try {
      const res = await registrar(datos)
      // Si Supabase requiere confirmación de email, la sesión es null
      if (res.session) {
        navegar('/dashboard')
      } else {
        setExito(true)
      }
    } catch (err) {
      setError(traducirError(err.message))
    } finally {
      setCargando(false)
    }
  }

  if (exito) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-elevated p-8 text-center"
        >
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-musgo-100 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-musgo-700" strokeWidth={2.2} />
          </div>
          <h1 className="font-display text-2xl text-tierra-900 mb-3">
            ¡Cuenta creada!
          </h1>
          <p className="text-sm text-tierra-600 mb-6">
            Te enviamos un correo a <strong>{datos.email}</strong> para
            confirmar tu cuenta. Revisa tu bandeja de entrada.
          </p>
          <Link to="/iniciar-sesion" className="btn-primary inline-flex">
            Ir a iniciar sesión
          </Link>
        </motion.div>
      </div>
    )
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
            Únete a la Red
          </h1>
          <p className="text-sm text-tierra-600">
            Crea tu cuenta gratuita y empieza a registrar tus muestras
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="label-field flex items-center gap-2">
              <User className="w-4 h-4 text-tierra-500" />
              Tu nombre
            </label>
            <input
              type="text"
              value={datos.nombre}
              onChange={cambiar('nombre')}
              required
              minLength={2}
              className="input-field"
              placeholder="Camilo Triana"
            />
          </div>

          <div>
            <label className="label-field flex items-center gap-2">
              <Mail className="w-4 h-4 text-tierra-500" />
              Correo electrónico
            </label>
            <input
              type="email"
              value={datos.email}
              onChange={cambiar('email')}
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
              value={datos.password}
              onChange={cambiar('password')}
              required
              minLength={6}
              className="input-field"
              placeholder="Mínimo 6 caracteres"
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
            {cargando ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Crear cuenta'}
          </button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-tierra-200/40">
          <p className="text-sm text-tierra-600">
            ¿Ya tienes cuenta?{' '}
            <Link to="/iniciar-sesion" className="text-musgo-700 font-medium hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

function traducirError(msg) {
  const map = {
    'User already registered':                   'Ya existe una cuenta con ese correo',
    'Password should be at least 6 characters':  'La contraseña debe tener al menos 6 caracteres',
    'Unable to validate email address':          'Correo electrónico inválido',
  }
  return map[msg] || msg
}
