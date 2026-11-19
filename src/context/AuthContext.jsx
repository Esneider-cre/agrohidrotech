import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Contexto de autenticación: expone la sesión, el perfil (nombre y rol)
 * y las acciones de login, registro y cierre de sesión.
 */
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null)
  const [sesionLista, setSesionLista] = useState(false)
  // Guarda el usuario al que pertenece el perfil para saber si ya terminó de cargar
  const [perfilCargado, setPerfilCargado] = useState({ userId: null, perfil: null })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session)
      setSesionLista(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => setSesion(nuevaSesion))
    return () => sub.subscription.unsubscribe()
  }, [])

  // Carga el perfil (nombre y rol) cada vez que cambia el usuario autenticado
  const userId = sesion?.user?.id
  useEffect(() => {
    if (!userId) return
    supabase
      .from('perfiles')
      .select('id, nombre, rol')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data }) => setPerfilCargado({ userId, perfil: data }))
  }, [userId])

  const perfil = userId && perfilCargado.userId === userId ? perfilCargado.perfil : null
  const cargando = !sesionLista || (Boolean(userId) && perfilCargado.userId !== userId)

  const iniciarSesion = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const registrarse = (email, password, nombre, rol) =>
    supabase.auth.signUp({ email, password, options: { data: { nombre, rol } } })

  const cerrarSesion = () => supabase.auth.signOut()

  const valor = {
    sesion,
    perfil,
    cargando,
    esProductor: perfil?.rol === 'productor',
    iniciarSesion,
    registrarse,
    cerrarSesion,
  }
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
