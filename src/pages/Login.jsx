import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Icon from '../components/Icon'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Pantalla 02 · Inicio de sesión y registro (con selección de rol) */
export default function Login() {
  const { sesion, iniciarSesion, registrarse } = useAuth()
  const [params] = useSearchParams()
  const [modo, setModo] = useState(params.get('modo') === 'registro' ? 'registro' : 'login')
  const [form, setForm] = useState({ nombre: '', email: '', password: '', rol: 'productor' })
  const [errores, setErrores] = useState({})
  const [mensaje, setMensaje] = useState(null)
  const [enviando, setEnviando] = useState(false)

  if (sesion) return <Navigate to="/panel" replace />

  const cambiar = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const validar = () => {
    const e = {}
    if (modo === 'registro' && form.nombre.trim().length < 2) e.nombre = 'Escribe tu nombre (mínimo 2 letras)'
    if (!EMAIL_RE.test(form.email)) e.email = 'Correo electrónico no válido'
    if (form.password.length < 6) e.password = 'Mínimo 6 caracteres'
    return e
  }

  const enviar = async (ev) => {
    ev.preventDefault()
    const e = validar()
    setErrores(e)
    setMensaje(null)
    if (Object.keys(e).length) return
    setEnviando(true)
    const { data, error } = modo === 'login'
      ? await iniciarSesion(form.email, form.password)
      : await registrarse(form.email, form.password, form.nombre.trim(), form.rol)
    setEnviando(false)
    if (error) {
      setMensaje({ tipo: 'cr', texto: error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error.message })
    } else if (modo === 'registro' && !data.session) {
      setMensaje({ tipo: 'ok', texto: 'Cuenta creada. Revisa tu correo para confirmarla y luego inicia sesión.' })
      setModo('login')
    }
  }

  const Campo = ({ nombre, etiqueta, tipo = 'text', ayuda }) => (
    <label className="field">{etiqueta}
      <input className={`inp ${errores[nombre] ? 'err' : ''}`} type={tipo} name={nombre} value={form[nombre]} onChange={cambiar} />
      {errores[nombre] ? <span className="hint e">{errores[nombre]}</span> : ayuda && <span className="hint">{ayuda}</span>}
    </label>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexWrap: 'wrap' }}>
      <div style={{ flex: '1 1 380px', background: 'var(--pri)', color: '#fff', padding: 'clamp(28px,5vw,56px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 32 }}>
        <div className="logo" style={{ color: '#fff' }}><span className="mk" style={{ background: '#fff', color: 'var(--pri)' }}><Icon name="leaf" /></span>AgroHidroTech</div>
        <div>
          <h1 style={{ fontSize: 'clamp(26px,3vw,36px)', lineHeight: 1.2 }}>Tu producción de forraje, bajo control desde cualquier lugar.</h1>
          <p style={{ opacity: 0.85, marginTop: 14, fontSize: 16, lineHeight: 1.5 }}>Productores y ganaderos de Córdoba conectados con datos reales del cultivo.</p>
        </div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>Universidad del Sinú · Ingeniería de Sistemas · 2026</div>
      </div>

      <div style={{ flex: '1 1 380px', display: 'grid', placeItems: 'center', background: '#fff', padding: '40px 16px' }}>
        <form onSubmit={enviar} noValidate style={{ width: 400, maxWidth: '100%' }}>
          <div style={{ display: 'flex', background: 'var(--bg)', borderRadius: 10, padding: 4, marginBottom: 28 }}>
            {[['login', 'Iniciar sesión'], ['registro', 'Registrarse']].map(([m, t]) => (
              <button type="button" key={m} onClick={() => { setModo(m); setErrores({}); setMensaje(null) }}
                style={{ flex: 1, padding: 10, borderRadius: 8, border: 0, cursor: 'pointer', fontWeight: modo === m ? 600 : 500,
                  background: modo === m ? '#fff' : 'transparent', color: modo === m ? 'var(--tx)' : 'var(--tx2)',
                  boxShadow: modo === m ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>{t}</button>
            ))}
          </div>
          <h1>{modo === 'login' ? 'Bienvenido de nuevo' : 'Crea tu cuenta'}</h1>
          <p className="sub" style={{ marginBottom: 24 }}>{modo === 'login' ? 'Ingresa con tu correo y contraseña' : 'Elige tu rol en la plataforma'}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mensaje && <div className={`alert ${mensaje.tipo}`}>{mensaje.texto}</div>}
            {modo === 'registro' && Campo({ nombre: 'nombre', etiqueta: 'Nombre completo' })}
            {Campo({ nombre: 'email', etiqueta: 'Correo electrónico', tipo: 'email' })}
            {Campo({ nombre: 'password', etiqueta: 'Contraseña', tipo: 'password', ayuda: 'Mínimo 6 caracteres' })}
            {modo === 'registro' && (
              <label className="field">Rol
                <select className="inp" name="rol" value={form.rol} onChange={cambiar}>
                  <option value="productor">Productor (gestiona contenedores y cosechas)</option>
                  <option value="ganadero">Ganadero (consulta disponibilidad)</option>
                </select>
              </label>
            )}
            <button className="btn btn-p" style={{ marginTop: 8 }} disabled={enviando}>
              {enviando ? 'Procesando…' : modo === 'login' ? 'Ingresar' : 'Crear cuenta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
