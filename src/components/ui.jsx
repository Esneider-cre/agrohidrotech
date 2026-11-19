import { useEffect } from 'react'

/** Diálogo de confirmación (usado antes de eliminar registros). */
export function ConfirmModal({ titulo, mensaje, textoConfirmar = 'Eliminar', onConfirmar, onCancelar, ocupado }) {
  return (
    <div className="overlay" onClick={onCancelar}>
      <div className="card modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2>{titulo}</h2>
        <p className="sub" style={{ margin: '8px 0 18px' }}>{mensaje}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn btn-o btn-sm" onClick={onCancelar} disabled={ocupado}>Cancelar</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirmar} disabled={ocupado}>
            {ocupado ? 'Eliminando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Aviso flotante que desaparece solo a los 3,5 s. */
export function Toast({ aviso, onCerrar }) {
  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(onCerrar, 3500)
    return () => clearTimeout(t)
  }, [aviso, onCerrar])
  if (!aviso) return null
  return <div className={`alert toast ${aviso.tipo === 'error' ? 'cr' : 'ok'}`}>{aviso.texto}</div>
}

const ESTADOS = {
  crecimiento: ['bl', 'En crecimiento'],
  cosechado: ['ok', 'Cosechado'],
  perdido: ['cr', 'Perdido'],
}
export function EstadoChip({ estado }) {
  const [clase, texto] = ESTADOS[estado] ?? ['neutral', estado]
  return <span className={`chip ${clase}`}>{texto}</span>
}
