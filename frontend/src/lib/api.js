/**
 * Cliente HTTP del backend FastAPI.
 * Inyecta automáticamente el token de Supabase en cada petición.
 */
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Obtiene el token JWT del usuario actual de Supabase.
 */
async function getToken() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token || null
}

/**
 * Wrapper de fetch que añade el token y maneja errores uniformemente.
 */
async function apiCall(path, options = {}) {
  const token = await getToken()

  const headers = {
    ...options.headers,
  }

  // No agregar Content-Type para FormData — lo pone fetch automáticamente
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let mensaje = `Error HTTP ${res.status}`
    try {
      const datos = await res.json()
      mensaje = datos.detail || datos.error || mensaje
    } catch {}
    throw new Error(mensaje)
  }

  // Si es 204 (No Content), no hay body
  if (res.status === 204) return null

  return res.json()
}

// ─────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────
export async function verificarSalud() {
  return apiCall('/health')
}

// ─────────────────────────────────────────────────────────────
// FINCAS
// ─────────────────────────────────────────────────────────────
export const fincasAPI = {
  listar:    ()       => apiCall('/api/fincas'),
  obtener:   (id)     => apiCall(`/api/fincas/${id}`),
  crear:     (datos)  => apiCall('/api/fincas', {
                          method: 'POST',
                          body: JSON.stringify(datos),
                        }),
  eliminar:  (id)     => apiCall(`/api/fincas/${id}`, { method: 'DELETE' }),
}

// ─────────────────────────────────────────────────────────────
// MUESTRAS
// ─────────────────────────────────────────────────────────────
export const muestrasAPI = {
  listar: (fincaId = null) => {
    const q = fincaId ? `?finca_id=${fincaId}` : ''
    return apiCall(`/api/muestras${q}`)
  },

  obtener: (id) => apiCall(`/api/muestras/${id}`),

  /**
   * Crea una nueva muestra subiendo imagen + parámetros.
   * @param {object} params
   * @param {string} params.fincaId
   * @param {File}   params.imagen
   * @param {number} params.ph
   * @param {number} params.humedad
   * @param {string} [params.notas]
   */
  crear: async ({ fincaId, imagen, ph, humedad, notas }) => {
    const formData = new FormData()
    formData.append('finca_id', fincaId)
    formData.append('imagen', imagen)
    formData.append('ph', String(ph))
    formData.append('humedad', String(humedad))
    if (notas) formData.append('notas', notas)

    return apiCall('/api/muestras', {
      method: 'POST',
      body: formData,
    })
  },

  eliminar: (id) => apiCall(`/api/muestras/${id}`, { method: 'DELETE' }),
}

export function getApiUrl() {
  return API_URL
}
