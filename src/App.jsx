import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { supabaseConfigurado } from './lib/supabase'
import { AuthProvider, useAuth } from './context/AuthContext'
import { TelemetriaProvider } from './context/TelemetriaContext'
import Layout from './components/Layout'
import Bienvenida from './pages/Bienvenida'
import Login from './pages/Login'
import Panel from './pages/Panel'
import Cosechas from './pages/Cosechas'
import CosechaForm from './pages/CosechaForm'
import Alertas from './pages/Alertas'
import Reportes from './pages/Reportes'

/** Protege las rutas internas: exige sesión iniciada y, opcionalmente, rol productor. */
function RutaPrivada({ children, soloProductor = false }) {
  const { sesion, perfil, cargando, esProductor } = useAuth()
  if (cargando) return <div className="empty">Cargando…</div>
  if (!sesion) return <Navigate to="/login" replace />
  if (!perfil) return <div className="empty">No se encontró tu perfil. Revisa que el esquema SQL esté instalado.</div>
  if (soloProductor && !esProductor) return <Navigate to="/cosechas" replace />
  return children
}

function SinConfiguracion() {
  return (
    <div style={{ maxWidth: 560, margin: '80px auto', padding: 16 }}>
      <div className="card">
        <h1>Falta configurar Supabase</h1>
        <p className="sub" style={{ margin: '12px 0' }}>
          Copia <code>.env.example</code> como <code>.env</code>, pon la URL y la anon key de tu proyecto
          y reinicia <code>npm run dev</code>. Los pasos completos están en el README.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  if (!supabaseConfigurado) return <SinConfiguracion />
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Bienvenida />} />
          <Route path="/login" element={<Login />} />
          <Route element={<RutaPrivada><TelemetriaProvider><Layout /></TelemetriaProvider></RutaPrivada>}>
            <Route path="/panel" element={<Panel />} />
            <Route path="/cosechas" element={<Cosechas />} />
            <Route path="/cosechas/nueva" element={<RutaPrivada soloProductor><CosechaForm /></RutaPrivada>} />
            <Route path="/cosechas/:id/editar" element={<RutaPrivada soloProductor><CosechaForm /></RutaPrivada>} />
            <Route path="/alertas" element={<Alertas />} />
            <Route path="/reportes" element={<Reportes />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
