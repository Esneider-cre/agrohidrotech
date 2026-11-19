import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTelemetria } from '../context/TelemetriaContext'
import { guardarUmbrales, listarAlertas, obtenerUmbrales, suscribirTelemetria } from '../services/telemetriaService'
import { SENSORES } from '../utils/telemetria'
import { Toast } from '../components/ui'
import { formatearHora } from '../utils/formato'

const NOMBRE_SENSOR = Object.fromEntries(SENSORES.map((s) => [s.clave, s.nombre]))
const FILTROS = [['', 'Todas'], ['critica', 'Críticas'], ['advertencia', 'Advertencias']]

/** Pantalla 06 · Alertas en tiempo real y configuración de umbrales */
export default function Alertas() {
  const { esProductor } = useAuth()
  const { contenedores, contenedorId, setContenedorId } = useTelemetria()
  const [umbrales, setUmbrales] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [nivel, setNivel] = useState('')
  const [errores, setErrores] = useState({})
  const [aviso, setAviso] = useState(null)

  useEffect(() => {
    if (!contenedorId) return
    obtenerUmbrales(contenedorId).then((u) => {
      // Se guardan como texto para editarlos en los inputs
      setUmbrales(Object.fromEntries(Object.entries(u).map(([k, v]) => [k, String(Number(v))])))
    })
  }, [contenedorId])

  useEffect(() => {
    if (!contenedorId) return
    listarAlertas(contenedorId, { nivel }).then(setAlertas)
    return suscribirTelemetria(contenedorId, {
      alAlertar: (a) => { if (!nivel || a.nivel === nivel) setAlertas((prev) => [a, ...prev].slice(0, 50)) },
    })
  }, [contenedorId, nivel])

  const guardar = async (e) => {
    e.preventDefault()
    const nuevosErrores = {}
    const valores = {}
    for (const s of SENSORES) {
      const min = Number(umbrales[s.min])
      const max = Number(umbrales[s.max])
      if (umbrales[s.min] === '' || umbrales[s.max] === '' || Number.isNaN(min) || Number.isNaN(max)) nuevosErrores[s.clave] = 'Ingresa valores numéricos'
      else if (min >= max) nuevosErrores[s.clave] = 'El mínimo debe ser menor que el máximo'
      valores[s.min] = min
      valores[s.max] = max
    }
    setErrores(nuevosErrores)
    if (Object.keys(nuevosErrores).length) return
    try {
      await guardarUmbrales(contenedorId, valores)
      setAviso({ tipo: 'ok', texto: 'Umbrales guardados. Las nuevas lecturas se evaluarán con estos rangos.' })
    } catch (err) {
      setAviso({ tipo: 'error', texto: err.message })
    }
  }

  const cerrarAviso = useCallback(() => setAviso(null), [])

  return (
    <>
      <div className="top">
        <div>
          <h1>Alertas y umbrales</h1>
          <p className="sub">Define los rangos óptimos; la base de datos genera una alerta cuando un sensor sale de ellos.</p>
        </div>
        <select className="inp" style={{ height: 40, width: 'auto' }} value={contenedorId ?? ''} onChange={(e) => setContenedorId(Number(e.target.value))}>
          {contenedores.map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
        </select>
      </div>

      <div className="grid-1-13">
        <form className="card" onSubmit={guardar} noValidate>
          <h2>Umbrales óptimos</h2>
          {umbrales && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 18 }}>
              {SENSORES.map((s) => (
                <div key={s.clave} className="field">
                  <span>{s.nombre} {s.unidad && `(${s.unidad})`}</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input className={`inp ${errores[s.clave] ? 'err' : ''}`} type="number" step="0.1" disabled={!esProductor} aria-label={`${s.nombre} mínimo`}
                      value={umbrales[s.min]} onChange={(e) => setUmbrales({ ...umbrales, [s.min]: e.target.value })} />
                    <span className="sub" style={{ margin: 0 }}>a</span>
                    <input className={`inp ${errores[s.clave] ? 'err' : ''}`} type="number" step="0.1" disabled={!esProductor} aria-label={`${s.nombre} máximo`}
                      value={umbrales[s.max]} onChange={(e) => setUmbrales({ ...umbrales, [s.max]: e.target.value })} />
                  </div>
                  {errores[s.clave] && <span className="hint e">{errores[s.clave]}</span>}
                </div>
              ))}
              {esProductor
                ? <button className="btn btn-p btn-sm" style={{ alignSelf: 'flex-start' }}>Guardar umbrales</button>
                : <p className="hint">Sólo el rol productor puede modificar los umbrales.</p>}
            </div>
          )}
        </form>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2>Historial de alertas</h2>
            <div style={{ display: 'flex', gap: 6 }}>
              {FILTROS.map(([v, t]) => (
                <button key={v} className={`chip ${nivel === v ? 'ok' : 'neutral'}`} style={{ border: nivel === v ? 0 : undefined, cursor: 'pointer' }} onClick={() => setNivel(v)}>{t}</button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table style={{ marginTop: 10 }}>
              <thead><tr><th>Hora</th><th>Sensor</th><th>Valor</th><th>Nivel</th></tr></thead>
              <tbody>
                {alertas.map((a) => (
                  <tr key={a.id}>
                    <td>{formatearHora(a.creado_en)}</td>
                    <td>{NOMBRE_SENSOR[a.sensor]}</td>
                    <td>{Number(a.valor)}</td>
                    <td><span className={`chip ${a.nivel === 'critica' ? 'cr' : 'wr'}`}>{a.nivel === 'critica' ? 'Crítica' : 'Advertencia'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {alertas.length === 0 && <div className="empty">Sin alertas. Usa “Simular falla de ventilación” en el panel para generar una.</div>}
          </div>
        </div>
      </div>
      <Toast aviso={aviso} onCerrar={cerrarAviso} />
    </>
  )
}
