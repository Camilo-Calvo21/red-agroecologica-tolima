/**
 * Cliente de API para conectar con el backend FastAPI.
 *
 * Versión mejorada con:
 * - Timeout extendido (90 segundos) para soportar procesamiento + Cloudinary
 * - Manejo de errores más claro
 * - Mensajes específicos por tipo de error
 */
import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Timeout largo porque el backend procesa imagen + sube a Cloudinary
const TIMEOUT_MS = 90_000  // 90 segundos


/**
 * Función base para todas las llamadas a la API.
 * Inyecta automáticamente el token JWT de Supabase.
 */
async function apiCall(endpoint, options = {}) {
  // Obtener token de la sesión actual
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const headers = {
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  // Si el body NO es FormData, agregar Content-Type JSON
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  // Controlador para timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    // Si la respuesta no tiene contenido (204 No Content)
    if (response.status === 204) {
      return null
    }

    // Intentar parsear como JSON
    let data
    try {
      data = await response.json()
    } catch {
      data = { detail: 'Respuesta inesperada del servidor' }
    }

    // Si la respuesta no fue exitosa
    if (!response.ok) {
      const mensaje = data.detail || data.message || `Error ${response.status}`
      throw new Error(mensaje)
    }

    return data

  } catch (error) {
    clearTimeout(timeoutId)

    // Errores específicos según el tipo
    if (error.name === 'AbortError') {
      throw new Error(
        'La petición tardó demasiado (más de 90 segundos). ' +
        'El servidor puede estar despertando o saturado. Intenta de nuevo.'
      )
    }

    if (error.message === 'Failed to fetch') {
      throw new Error(
        'No se pudo conectar al servidor. ' +
        'Si acaba de despertar, espera 30-60 segundos y recarga la página.'
      )
    }

    throw error
  }
}


// ─── FINCAS ───────────────────────────────────────────────────

export const fincasAPI = {
  listar: () => apiCall('/api/fincas'),

  obtener: (id) => apiCall(`/api/fincas/${id}`),

  crear: (datos) => apiCall('/api/fincas', {
    method: 'POST',
    body: JSON.stringify(datos),
  }),

  eliminar: (id) => apiCall(`/api/fincas/${id}`, {
    method: 'DELETE',
  }),
}


// ─── MUESTRAS ──────────────────────────────────────────────────

export const muestrasAPI = {
  listar: (fincaId = null) => {
    const params = fincaId ? `?finca_id=${fincaId}` : ''
    return apiCall(`/api/muestras${params}`)
  },

  obtener: (id) => apiCall(`/api/muestras/${id}`),

  crear: async ({ fincaId, imagen, ph, humedad, notas }) => {
    const formData = new FormData()
    formData.append('finca_id', fincaId)
    formData.append('ph', ph.toString())
    formData.append('humedad', humedad.toString())
    formData.append('imagen', imagen)
    if (notas) formData.append('notas', notas)

    return apiCall('/api/muestras', {
      method: 'POST',
      body: formData,
    })
  },

  eliminar: (id) => apiCall(`/api/muestras/${id}`, {
    method: 'DELETE',
  }),
}


export default { fincasAPI, muestrasAPI }
