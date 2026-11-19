import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

const VARIABLES = [
  ['Temperatura', '24.6 °C', null],
  ['Humedad', '82 %', 'var(--agua)'],
  ['pH solución', '5.8', null],
  ['Conductividad', '1.6 mS/cm', null],
]

/** Pantalla 01 · Landing pública */
export default function Bienvenida() {
  const { sesion } = useAuth()
  const destino = sesion ? '/panel' : '/login'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px clamp(16px,4vw,56px)', background: '#fff', borderBottom: '1px solid var(--bd)' }}>
        <div className="logo"><span className="mk"><Icon name="leaf" /></span>AgroHidroTech</div>
        <Link to={destino} className="btn btn-p btn-sm">{sesion ? 'Ir al panel' : 'Iniciar sesión'}</Link>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 48, padding: 'clamp(32px,6vw,64px) clamp(16px,4vw,56px)', alignItems: 'center', flex: 1, maxWidth: 1280, margin: '0 auto', width: '100%' }}>
        <div>
          <span className="chip ok" style={{ marginBottom: 18 }}><Icon name="pin" size={14} />Valencia, Córdoba</span>
          <h1 style={{ fontSize: 'clamp(32px,4.5vw,46px)', lineHeight: 1.1, fontWeight: 800, letterSpacing: '-.02em' }}>
            Forraje verde hidropónico monitoreado en tiempo real
          </h1>
          <p style={{ fontSize: 18, color: 'var(--tx2)', margin: '20px 0 32px', lineHeight: 1.55 }}>
            Contenedores con sensores IoT que producen pasto de maíz o sorgo en 7 a 10 días, con 90% menos agua.
            Controla temperatura, humedad, pH y conductividad desde un solo panel.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link to={destino} className="btn btn-p">Entrar a la plataforma <Icon name="arrow" /></Link>
            <Link to="/login?modo=registro" className="btn btn-o">Crear cuenta</Link>
          </div>
          <div style={{ display: 'flex', gap: 36, marginTop: 44, flexWrap: 'wrap' }}>
            {[['90%', 'menos agua'], ['7–10', 'días por cosecha'], ['-40%', 'costo vs. concentrado']].map(([v, t]) => (
              <div key={t}><div style={{ fontSize: 28, fontWeight: 800, color: 'var(--pri)' }}>{v}</div><div className="sub">{t}</div></div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 28, background: 'linear-gradient(160deg,#fff,var(--pri-l))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h2>Contenedor C-01</h2><span className="chip ok">● En línea</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {VARIABLES.map(([t, v, c]) => (
              <div className="card" key={t}><div className="sub" style={{ margin: 0 }}>{t}</div><div style={{ fontSize: 24, fontWeight: 700, marginTop: 6, color: c ?? 'inherit' }}>{v}</div></div>
            ))}
          </div>
          <div className="alert ok" style={{ marginTop: 14 }}><Icon name="check" />Todas las variables dentro del rango óptimo</div>
        </div>
      </section>
    </div>
  )
}
