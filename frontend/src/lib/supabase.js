/**
 * Cliente Supabase para el frontend.
 * Maneja autenticación (signup, login, logout, sesión).
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    '⚠ Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env\n' +
    '  La autenticación no funcionará hasta configurarlas.'
  )
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
