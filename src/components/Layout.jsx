import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from './Icon'

const ENLACES = [
  { to: '/panel', icono: 'gauge', texto: 'Panel IoT' },
  { to: '/cosechas', icono: 'sprout', texto: 'Cosechas' },
  { to: '/alertas', icono: 'bell', texto: 'Alertas' },
  { to: '/reportes', icono: 'chart', texto: 'Reportes' },
]

const iniciales = (nombre = '') =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('')

/** Estructura de las pantallas internas: barra lateral (escritorio) o barra inferior (móvil). */
export default function Layout() {
  const { perfil, cerrarSesion } = useAuth()

  return (
    <div className="app">
      <aside className="side">
        <div className="logo"><span className="mk"><Icon name="leaf" /></span>AgroHidroTech</div>
        {ENLACES.map((e) => (
          <NavLink key={e.to} to={e.to} className="nav"><Icon name={e.icono} />{e.texto}</NavLink>
        ))}
        <div className="usr">
          <span className="av">{iniciales(perfil?.nombre)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis' }}>{perfil?.nombre}</div>
            <div className="sub" style={{ margin: 0, fontSize: 12, textTransform: 'capitalize' }}>{perfil?.rol}</div>
          </div>
          <button className="btn btn-icon btn-sm" title="Cerrar sesión" onClick={cerrarSesion}><Icon name="logout" /></button>
        </div>
      </aside>

      <header className="mobile-bar">
        <div className="logo" style={{ fontSize: 16 }}><span className="mk" style={{ width: 30, height: 30 }}><Icon name="leaf" size={16} /></span>AgroHidroTech</div>
        <button className="btn btn-icon btn-sm" title="Cerrar sesión" onClick={cerrarSesion}><Icon name="logout" /></button>
      </header>

      <main className="main"><Outlet /></main>

      <nav className="bottom-nav">
        {ENLACES.map((e) => (
          <NavLink key={e.to} to={e.to}><Icon name={e.icono} />{e.texto.replace(' IoT', '')}</NavLink>
        ))}
      </nav>
    </div>
  )
}
