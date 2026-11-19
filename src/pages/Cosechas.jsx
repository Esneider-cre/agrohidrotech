import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { eliminarCosecha, listarCosechas } from '../services/cosechasService'
import { ConfirmModal, EstadoChip, Toast } from '../components/ui'
import { CULTIVOS, formatearFecha } from '../utils/formato'
import Icon from '../components/Icon'

/** Pantalla 04 · Gestión de cosechas — consultar, filtrar y eliminar (CRUD) */
export default function Cosechas() {
  const { esProductor } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [cosechas, setCosechas] = useState([])
  const [filtros, setFiltros] = useState({ texto: '', estado: '', cultivo: '' })
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [aEliminar, setAEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [aviso, setAviso] = useState(location.state?.aviso ?? null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      setCosechas(await listarCosechas(filtros))
      setError('')
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }, [filtros])

  // Espera 300 ms tras dejar de escribir antes de consultar (evita una consulta por tecla)
  useEffect(() => {
    const t = setTimeout(cargar, 300)
    return () => clearTimeout(t)
  }, [cargar])

  const confirmarEliminar = async () => {
    setEliminando(true)
    try {
      await eliminarCosecha(aEliminar.id)
      setAviso({ tipo: 'ok', texto: `Lote ${aEliminar.lote} eliminado` })
      setAEliminar(null)
      cargar()
    } catch (e) {
      setAviso({ tipo: 'error', texto: e.message })
    } finally {
      setEliminando(false)
    }
  }

  const cerrarAviso = useCallback(() => setAviso(null), [])
  const cambiarFiltro = (e) => setFiltros({ ...filtros, [e.target.name]: e.target.value })
  const enCrecimiento = cosechas.filter((c) => c.estado === 'crecimiento').length

  return (
    <>
      <div className="top">
        <div>
          <h1>Cosechas de forraje</h1>
          <p className="sub">{cosechas.length} lotes · {enCrecimiento} en crecimiento{!esProductor && ' · vista de consulta (ganadero)'}</p>
        </div>
        {esProductor && <Link to="/cosechas/nueva" className="btn btn-p"><Icon name="plus" />Nueva cosecha</Link>}
      </div>

      <div className="filters">
        <div className="search">
          <Icon name="search" />
          <input className="inp" name="texto" placeholder="Buscar por lote…" value={filtros.texto} onChange={cambiarFiltro} />
        </div>
        <select className="inp" style={{ width: 190 }} name="estado" value={filtros.estado} onChange={cambiarFiltro}>
          <option value="">Estado: Todos</option>
          <option value="crecimiento">En crecimiento</option>
          <option value="cosechado">Cosechado</option>
          <option value="perdido">Perdido</option>
        </select>
        <select className="inp" style={{ width: 190 }} name="cultivo" value={filtros.cultivo} onChange={cambiarFiltro}>
          <option value="">Cultivo: Todos</option>
          <option value="maiz">Maíz</option>
          <option value="sorgo">Sorgo</option>
        </select>
      </div>

      {error && <div className="alert cr">{error}</div>}

      <div className="card table-wrap" style={{ padding: '4px 8px' }}>
        <table>
          <thead>
            <tr><th>Lote</th><th>Cultivo</th><th>Contenedor</th><th>Siembra</th><th>Cosecha</th><th>Bandejas</th><th>Producción</th><th>Estado</th>{esProductor && <th style={{ textAlign: 'right' }}>Acciones</th>}</tr>
          </thead>
          <tbody>
            {cosechas.map((c) => (
              <tr key={c.id}>
                <td><b>{c.lote}</b></td>
                <td>{CULTIVOS[c.cultivo]}</td>
                <td>{c.contenedores?.codigo}</td>
                <td>{formatearFecha(c.fecha_siembra)}</td>
                <td>{formatearFecha(c.fecha_cosecha)}</td>
                <td>{c.bandejas}</td>
                <td>{c.produccion_kg != null ? `${Number(c.produccion_kg)} kg` : '—'}</td>
                <td><EstadoChip estado={c.estado} /></td>
                {esProductor && (
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-o btn-sm btn-icon" title="Editar" onClick={() => navigate(`/cosechas/${c.id}/editar`)}><Icon name="edit" /></button>{' '}
                    <button className="btn btn-d btn-sm btn-icon" title="Eliminar" onClick={() => setAEliminar(c)}><Icon name="trash" /></button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!cargando && cosechas.length === 0 && <div className="empty">No hay cosechas que coincidan con los filtros.</div>}
        {cargando && cosechas.length === 0 && <div className="empty">Cargando…</div>}
      </div>

      {aEliminar && (
        <ConfirmModal
          titulo={`¿Eliminar el lote ${aEliminar.lote}?`}
          mensaje="Esta acción no se puede deshacer."
          ocupado={eliminando}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setAEliminar(null)}
        />
      )}
      <Toast aviso={aviso} onCerrar={cerrarAviso} />
    </>
  )
}
