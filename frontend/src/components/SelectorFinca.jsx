import { Map, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function SelectorFinca({ fincas, fincaId, onCambio, deshabilitado }) {
  if (fincas.length === 0) {
    return (
      <div className="space-y-2">
        <label className="label-field flex items-center gap-2">
          <Map className="w-4 h-4 text-tierra-500" />
          Finca
        </label>
        <div className="card p-5 text-center bg-ambar-400/5 border-ambar-400/30">
          <p className="text-sm text-tierra-700 mb-3">
            Necesitas crear al menos una finca antes de analizar muestras.
          </p>
          <Link to="/fincas" className="btn-primary inline-flex text-sm py-2.5">
            <Plus className="w-4 h-4" />
            Crear finca
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="label-field flex items-center gap-2">
        <Map className="w-4 h-4 text-tierra-500" />
        Finca de origen
      </label>
      <select
        value={fincaId || ''}
        onChange={(e) => onCambio(e.target.value)}
        disabled={deshabilitado}
        required
        className="input-field cursor-pointer"
      >
        <option value="" disabled>
          Selecciona una finca
        </option>
        {fincas.map(f => (
          <option key={f.id} value={f.id}>
            {f.nombre} — {f.municipio}{f.vereda ? `, ${f.vereda}` : ''}
          </option>
        ))}
      </select>
      <p className="text-xs text-tierra-500">
        ¿No aparece tu finca?{' '}
        <Link to="/fincas" className="text-musgo-700 hover:underline">
          Regístrala primero
        </Link>
      </p>
    </div>
  )
}
