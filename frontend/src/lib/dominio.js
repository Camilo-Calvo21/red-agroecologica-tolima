/**
 * Lógica de validación y diccionario semántico de pH/humedad.
 * Espejo de la lógica de la celda 4 — útil para mostrar al usuario
 * lo que va a producir el sistema antes de enviar la petición.
 */

/* ── Estado por pH ──────────────────────────────────────── */
export function estadoPh(ph) {
  if (ph < 5.0)  return { etiqueta: 'Muy ácido',           color: 'tierra-700' }
  if (ph < 5.8)  return { etiqueta: 'Ácido',               color: 'tierra-600' }
  if (ph < 6.5)  return { etiqueta: 'Lig. ácido',          color: 'ambar-500'  }
  if (ph < 7.2)  return { etiqueta: 'Neutro (óptimo)',     color: 'musgo-600'  }
  if (ph < 8.0)  return { etiqueta: 'Lig. alcalino',       color: 'agua-400'   }
  if (ph < 9.0)  return { etiqueta: 'Alcalino',            color: 'agua-500'   }
  return { etiqueta: 'Muy alcalino',  color: 'agua-700' }
}

/* ── Estado por humedad ─────────────────────────────────── */
export function estadoHumedad(h) {
  if (h < 20)  return { etiqueta: 'Extremadamente seco',  color: 'dorado-600' }
  if (h < 35)  return { etiqueta: 'Seco',                 color: 'dorado-500' }
  if (h < 50)  return { etiqueta: 'Moderado',             color: 'musgo-400'  }
  if (h < 70)  return { etiqueta: 'Óptimo',               color: 'musgo-500'  }
  if (h < 85)  return { etiqueta: 'Húmedo',               color: 'cielo-500'  }
  return { etiqueta: 'Saturado',  color: 'cielo-700' }
}

/* ── Dirección de las crestas según pH ──────────────────── */
export function direccionCrestas(ph) {
  if (ph === 7.0) return { texto: 'Anillo liso',           descripcion: 'El suelo está en equilibrio perfecto. Sin relieve.' }
  if (ph < 7.0)   return { texto: 'Relieve hacia adentro', descripcion: 'Las ondulaciones empujan hacia el centro del cromatograma.' }
  return { texto: 'Relieve hacia afuera', descripcion: 'Las ondulaciones se extienden hacia el exterior.' }
}

/* ── Color base por humedad (vista previa visual) ───────── */
export function colorPorHumedad(h) {
  // Interpolación lineal: amarillo(seco) -> verde(óptimo) -> ciano(saturado)
  // Rampa: amarillo (seco) -> verde (optimo) -> ciano (saturado)
  const puntos = [
    { t: 0.00, c: [230, 210,  30] },
    { t: 0.25, c: [160, 210,  30] },
    { t: 0.50, c: [ 30, 200,  60] },
    { t: 0.75, c: [ 20, 200, 160] },
    { t: 1.00, c: [  0, 210, 220] },
  ]
  const tn = Math.max(0, Math.min(1, h / 100))
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i], b = puntos[i + 1]
    if (tn >= a.t && tn <= b.t) {
      const f = (tn - a.t) / (b.t - a.t)
      const r = Math.round(a.c[0] + f * (b.c[0] - a.c[0]))
      const g = Math.round(a.c[1] + f * (b.c[1] - a.c[1]))
      const bl = Math.round(a.c[2] + f * (b.c[2] - a.c[2]))
      return `rgb(${r}, ${g}, ${bl})`
    }
  }
  return `rgb(${puntos[puntos.length - 1].c.join(',')})`
}

/* ── Validaciones ───────────────────────────────────────── */
export const RANGOS = {
  ph:      { min: 0,  max: 14,  paso: 0.1 },
  humedad: { min: 0,  max: 100, paso: 1   },
}

export function validarPh(valor) {
  const n = Number(valor)
  if (isNaN(n))                    return 'pH debe ser un número'
  if (n < RANGOS.ph.min)           return `pH no puede ser menor que ${RANGOS.ph.min}`
  if (n > RANGOS.ph.max)           return `pH no puede ser mayor que ${RANGOS.ph.max}`
  return null
}

export function validarHumedad(valor) {
  const n = Number(valor)
  if (isNaN(n))                         return 'Humedad debe ser un número'
  if (n < RANGOS.humedad.min)           return `Humedad no puede ser menor que ${RANGOS.humedad.min}%`
  if (n > RANGOS.humedad.max)           return `Humedad no puede ser mayor que ${RANGOS.humedad.max}%`
  return null
}

export function validarImagen(archivo) {
  if (!archivo)                                 return 'Selecciona una imagen del cromatograma'
  if (!archivo.type.startsWith('image/'))       return 'El archivo debe ser una imagen (JPG, PNG)'
  if (archivo.size > 10 * 1024 * 1024)          return 'La imagen no puede pesar más de 10 MB'
  return null
}
