import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useTelemetria } from '../context/TelemetriaContext'
import { listarAlertas, obtenerUmbrales, suscribirTelemetria, ultimasLecturas } from '../services/telemetriaService'
import { listarCosechas } from '../services/cosechasService'
import { ESTILO_ESTADO, SENSORES, evaluarValor } from '../utils/telemetria'
import { CULTIVOS, diasDesde, formatearHora } from '../utils/formato'
import Icon from '../components/Icon'

const DURACION_CICLO = 9 // días de siembra a cosecha (7–10)

/** Pantalla 03 · Panel de monitoreo IoT en tiempo real (módulo dinámico) */
export default function Panel() {
  const { esProductor } = useAuth()
  const { contenedores, contenedorId, setContenedorId, contenedorActual, simulando, setSimulando, inyectarFalla, errorSimulador } = useTelemetria()
  const [lecturas, setLecturas] = useState([])
  const [umbrales, setUmbrales] = useState(null)
  const [alertas, setAlertas] = useState([])
  const [loteActivo, setLoteActivo] = useState(null)
  const [diasLote, setDiasLote] = useState(0)

  useEffect(() => {
    if (!contenedorId) return
    Promise.all([ultimasLecturas(contenedorId), obtenerUmbrales(contenedorId), listarAlertas(contenedorId, { limite: 4 }), listarCosechas({ estado: 'crecimiento' })])
      .then(([l, u, a, c]) => {
        setLecturas(l)
        setUmbrales(u)
        setAlertas(a)
        const lote = c.find((x) => x.contenedor_id === contenedorId) ?? null
        setLoteActivo(lote)
        setDiasLote(lote ? diasDesde(lote.fecha_siembra) : 0)
      })
    // Tiempo real: cada lectura o alerta nueva llega sin recargar la página
    return suscribirTelemetria(contenedorId, {
      alLeer: (l) => setLecturas((prev) => [...prev.slice(-59), l]),
      alAlertar: (a) => setAlertas((prev) => [a, ...prev].slice(0, 4)),
    })
  }, [contenedorId])

  const actual = lecturas.at(-1)
  const datosGrafica = lecturas.map((l) => ({
    hora: new Date(l.registrado_en).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    temperatura: Number(l.temperatura),
    humedad: Number(l.humedad),
  }))

  return (
    <>
      <div className="top">
        <div>
          <h1>Panel de monitoreo</h1>
          <p className="sub">
            {contenedorActual ? `${contenedorActual.codigo} · ${contenedorActual.nombre}` : '—'} ·{' '}
            {actual ? `última lectura ${formatearHora(actual.registrado_en)}` : 'sin lecturas todavía'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select className="inp" style={{ height: 40, width: 'auto' }} value={contenedorId ?? ''} onChange={(e) => setContenedorId(Number(e.target.value))}>
            {contenedores.map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}
          </select>
          <Link to="/alertas" className="btn btn-o btn-sm"><Icon name="bell" />Alertas</Link>
        </div>
      </div>

      {esProductor && (
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '14px 20px' }}>
          <span className={`chip ${simulando ? 'ok' : 'neutral'}`}>{simulando ? '● Transmitiendo' : '○ Detenido'}</span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <b>Simulador de sensores ESP32</b>
            <div className="sub" style={{ margin: 0 }}>Envía una lectura cada 3 s a la base de datos, como lo haría el microcontrolador del contenedor.</div>
          </div>
          <button className="btn btn-o btn-sm" onClick={inyectarFalla} disabled={!simulando}><Icon name="alert" />Simular falla de ventilación</button>
          <button className={`btn btn-sm ${simulando ? 'btn-o' : 'btn-p'}`} onClick={() => setSimulando(!simulando)}>
            <Icon name={simulando ? 'pause' : 'play'} />{simulando ? 'Detener' : 'Iniciar simulación'}
          </button>
          {errorSimulador && <div className="alert cr" style={{ width: '100%' }}>{errorSimulador}</div>}
        </div>
      )}

      <div className="grid4">
        {SENSORES.map((s) => {
          const valor = actual ? Number(actual[s.clave]) : null
          const estado = valor != null && umbrales ? evaluarValor(valor, Number(umbrales[s.min]), Number(umbrales[s.max])) : null
          const estilo = estado ? ESTILO_ESTADO[estado] : null
          return (
            <div className="card kpi" key={s.clave}>
              <div className="h">{s.nombre}<span className={`ico ${estilo?.clase ?? 'ok'}`}><Icon name={s.icono} /></span></div>
              <div className="v">{valor ?? '—'} <small>{s.unidad}</small></div>
              {umbrales && (
                <span className={`chip ${estilo?.clase ?? 'neutral'}`}>
                  {estilo ? `${estilo.texto} · ` : ''}{Number(umbrales[s.min])}–{Number(umbrales[s.max])}
                </span>
              )}
            </div>
          )
        })}
      </div>

      <div className="grid-2-1">
        <div className="card">
          <h2>Temperatura y humedad · últimas {lecturas.length} lecturas</h2>
          {lecturas.length === 0 ? (
            <div className="empty">{esProductor ? 'Inicia la simulación para ver datos en tiempo real.' : 'Aún no hay lecturas de este contenedor.'}</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={datosGrafica} margin={{ top: 16, right: 12, left: -12, bottom: 0 }}>
                <CartesianGrid stroke="#EDF2EF" vertical={false} />
                <XAxis dataKey="hora" tick={{ fontSize: 11, fill: '#5B6B63' }} minTickGap={40} />
                <YAxis yAxisId="t" domain={[15, 35]} tick={{ fontSize: 11, fill: '#5B6B63' }} />
                <YAxis yAxisId="h" orientation="right" domain={[50, 100]} tick={{ fontSize: 11, fill: '#5B6B63' }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 13 }} />
                {umbrales && <ReferenceLine yAxisId="t" y={Number(umbrales.temp_max)} stroke="#DC2626" strokeDasharray="5 5" label={{ value: `máx ${Number(umbrales.temp_max)}°`, fontSize: 11, fill: '#DC2626', position: 'insideTopRight' }} />}
                <Line yAxisId="t" type="monotone" dataKey="temperatura" name="Temp °C" stroke="#D97706" strokeWidth={2.5} dot={false} isAnimationActive={false} />
                <Line yAxisId="h" type="monotone" dataKey="humedad" name="Humedad %" stroke="#1E7FCB" strokeWidth={2.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2>Alertas recientes</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {alertas.length === 0 && <div className="alert ok"><Icon name="check" />Sin alertas registradas</div>}
            {alertas.map((a) => (
              <div key={a.id} className={`alert ${a.nivel === 'critica' ? 'cr' : 'wr'}`}>
                <Icon name="alert" />
                <div><b>{a.mensaje.split(':')[0]}</b><div style={{ fontSize: 12, opacity: 0.85 }}>{Number(a.valor)} · {formatearHora(a.creado_en)}</div></div>
              </div>
            ))}
          </div>
          <Link to="/alertas" className="btn btn-o btn-sm" style={{ width: '100%', marginTop: 14 }}>Ver todas</Link>
        </div>
      </div>

      {loteActivo && (
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h2>Lote {loteActivo.lote} · {CULTIVOS[loteActivo.cultivo]}</h2>
            <p className="sub">Día {Math.min(diasLote, DURACION_CICLO)} de {DURACION_CICLO} · {loteActivo.bandejas} bandejas</p>
          </div>
          <div style={{ flex: '1 1 200px', maxWidth: 340 }}><div className="bar"><i style={{ width: `${Math.min(100, (diasLote / DURACION_CICLO) * 100)}%` }} /></div></div>
          <Link to="/cosechas" className="btn btn-p btn-sm">Ver cosechas</Link>
        </div>
      )}
    </>
  )
}
