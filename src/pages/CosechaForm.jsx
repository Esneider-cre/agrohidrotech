import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { actualizarCosecha, crearCosecha, listarContenedores, obtenerCosecha } from '../services/cosechasService'
import { aRegistroCosecha, validarCosecha } from '../utils/validarCosecha'
import Icon from '../components/Icon'

const hoy = () => new Date().toLocaleDateString('en-CA') // AAAA-MM-DD en hora local

const VACIO = {
  lote: '', contenedor_id: '', cultivo: 'maiz', estado: 'crecimiento',
  fecha_siembra: hoy(), fecha_cosecha: '', bandejas: '48', produccion_kg: '', observaciones: '',
}

/** Pantalla 05 · Formulario de cosecha — crear y editar con validaciones (CRUD) */
export default function CosechaForm() {
  const { id } = useParams()
  const esEdicion = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState(VACIO)
  const [contenedores, setContenedores] = useState([])
  const [errores, setErrores] = useState({})
  const [errorGeneral, setErrorGeneral] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [tocado, setTocado] = useState(false)

  useEffect(() => {
    listarContenedores().then((lista) => {
      setContenedores(lista)
      if (!esEdicion) setForm((f) => ({ ...f, contenedor_id: f.contenedor_id || String(lista[0]?.id ?? '') }))
    })
    if (esEdicion) {
      obtenerCosecha(id)
        .then((c) => setForm({
          lote: c.lote, contenedor_id: String(c.contenedor_id), cultivo: c.cultivo, estado: c.estado,
          fecha_siembra: c.fecha_siembra, fecha_cosecha: c.fecha_cosecha ?? '', bandejas: String(c.bandejas),
          produccion_kg: c.produccion_kg != null ? String(c.produccion_kg) : '', observaciones: c.observaciones ?? '',
        }))
        .catch((e) => setErrorGeneral(e.message))
    }
  }, [id, esEdicion])

  const cambiar = (e) => {
    const nuevo = { ...form, [e.target.name]: e.target.value }
    setForm(nuevo)
    if (tocado) setErrores(validarCosecha(nuevo)) // validación en vivo tras el primer intento
  }

  const guardar = async (e) => {
    e.preventDefault()
    setTocado(true)
    const encontrados = validarCosecha(form)
    setErrores(encontrados)
    if (Object.keys(encontrados).length) return
    setGuardando(true)
    setErrorGeneral('')
    try {
      const registro = aRegistroCosecha(form)
      if (esEdicion) await actualizarCosecha(id, registro)
      else await crearCosecha(registro)
      navigate('/cosechas', { state: { aviso: { tipo: 'ok', texto: `Lote ${registro.lote} ${esEdicion ? 'actualizado' : 'creado'}` } } })
    } catch (err) {
      setErrorGeneral(err.message)
      setGuardando(false)
    }
  }

  // Campo genérico con etiqueta, control y mensaje de error/ayuda
  const campo = (nombre, etiqueta, control, ayuda, clase = '') => (
    <label className={`field ${clase}`}>
      {etiqueta}
      {control}
      {errores[nombre] ? <span className="hint e">{errores[nombre]}</span> : ayuda && <span className="hint">{ayuda}</span>}
    </label>
  )
  const props = (nombre) => ({ name: nombre, value: form[nombre], onChange: cambiar, className: `inp ${errores[nombre] ? 'err' : ''}` })

  return (
    <>
      <div>
        <Link to="/cosechas" className="sub" style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><Icon name="back" />Volver a cosechas</Link>
        <h1 style={{ marginTop: 8 }}>{esEdicion ? `Editar lote ${form.lote}` : 'Nueva cosecha'}</h1>
      </div>

      <form className="card" style={{ maxWidth: 820, padding: 28 }} onSubmit={guardar} noValidate>
        {errorGeneral && <div className="alert cr" style={{ marginBottom: 20 }}>{errorGeneral}</div>}
        <div className="form-grid">
          {campo('lote', 'Código de lote *', <input {...props('lote')} placeholder="L-2612" />, 'Formato L-0000')}
          {campo('contenedor_id', 'Contenedor *', (
            <select {...props('contenedor_id')}>{contenedores.map((c) => <option key={c.id} value={c.id}>{c.codigo} · {c.nombre}</option>)}</select>
          ))}
          {campo('cultivo', 'Cultivo *', <select {...props('cultivo')}><option value="maiz">Maíz</option><option value="sorgo">Sorgo</option></select>)}
          {campo('estado', 'Estado *', (
            <select {...props('estado')}><option value="crecimiento">En crecimiento</option><option value="cosechado">Cosechado</option><option value="perdido">Perdido</option></select>
          ))}
          {campo('fecha_siembra', 'Fecha de siembra *', <input type="date" {...props('fecha_siembra')} />)}
          {campo('fecha_cosecha', 'Fecha de cosecha', <input type="date" {...props('fecha_cosecha')} />, 'Obligatoria si el estado es Cosechado')}
          {campo('bandejas', 'Número de bandejas *', <input type="number" min="1" max="200" {...props('bandejas')} />, 'Entre 1 y 200')}
          {campo('produccion_kg', 'Producción (kg)', <input type="number" min="0" step="0.1" {...props('produccion_kg')} placeholder="Se registra al cosechar" />)}
          {campo('observaciones', 'Observaciones', <textarea {...props('observaciones')} placeholder="Semilla certificada, remojo 24 h…" />, `${form.observaciones.length}/500`, 'full')}
        </div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 26, paddingTop: 20, borderTop: '1px solid var(--bd)' }}>
          <Link to="/cosechas" className="btn btn-o">Cancelar</Link>
          <button className="btn btn-p" disabled={guardando}><Icon name="check" />{guardando ? 'Guardando…' : 'Guardar cosecha'}</button>
        </div>
      </form>
    </>
  )
}
