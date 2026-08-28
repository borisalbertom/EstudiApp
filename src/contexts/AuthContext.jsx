import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [orgsAdmin, setOrgsAdmin] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) cargarPerfil(session.user.id)
      else setCargando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        setCargando(true)
        cargarPerfil(session.user.id)
      } else {
        setPerfil(null)
        setOrgsAdmin([])
        setCargando(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function cargarPerfil(userId) {
    const [{ data }, { data: membresias }] = await Promise.all([
      supabase.from('perfiles').select('*').eq('id', userId).single(),
      supabase.from('miembros_organizacion').select('organizacion_id').eq('usuario_id', userId).eq('rol', 'admin_curso'),
    ])
    setPerfil(data)
    setOrgsAdmin((membresias || []).map((m) => m.organizacion_id))
    setCargando(false)
  }

  async function registrarse(email, password, nombre) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nombre } },
    })
    if (error) return { error }

    return { data, confirmacionPendiente: !data.session }
  }

  async function iniciarSesion(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        perfil,
        orgsAdmin,
        cargando,
        registrarse,
        iniciarSesion,
        cerrarSesion,
        recargarPerfil: () => session && cargarPerfil(session.user.id),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
