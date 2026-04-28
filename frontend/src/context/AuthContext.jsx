/**
 * Context global de autenticación.
 * Expone el usuario actual, sesión, y métodos de login/signup/logout.
 */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario]     = useState(null)
  const [cargando, setCargando]   = useState(true)

  useEffect(() => {
    // Recuperar sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUsuario(session?.user ?? null)
      setCargando(false)
    })

    // Suscripción a cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUsuario(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const registrar = async ({ email, password, nombre }) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre },  // metadata opcional
      },
    })
    if (error) throw error
    return data
  }

  const iniciarSesion = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const cerrarSesion = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const valor = {
    usuario,
    cargando,
    autenticado: !!usuario,
    registrar,
    iniciarSesion,
    cerrarSesion,
  }

  return (
    <AuthContext.Provider value={valor}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  }
  return ctx
}
