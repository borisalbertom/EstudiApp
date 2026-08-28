import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/cursos', label: 'Cursos' },
  { to: '/pruebas', label: 'Pruebas' },
  { to: '/trivias', label: 'Trivias' },
  { to: '/amigos', label: 'Amigos' },
  { to: '/admin', label: 'Administrar' },
]

export default function NavBar() {
  const { perfil, orgsAdmin, cerrarSesion } = useAuth()
  const location = useLocation()
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0)
  const [duelosPendientes, setDuelosPendientes] = useState(0)
  const [solicitudesPlazoPendientes, setSolicitudesPlazoPendientes] = useState(0)
  const [asignacionesCursosNuevas, setAsignacionesCursosNuevas] = useState(0)
  const [asignacionesPruebasNuevas, setAsignacionesPruebasNuevas] = useState(0)
  const [asignacionesTriviasNuevas, setAsignacionesTriviasNuevas] = useState(0)

  useEffect(() => {
    if (perfil) cargarNotificaciones()
  }, [perfil?.id])

  useEffect(() => {
    setMenuAbierto(false)
  }, [location.pathname])

  async function cargarNotificaciones() {
    const { count } = await supabase
      .from('amistades')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_b', perfil.id)
      .eq('estado', 'pendiente')
    setSolicitudesPendientes(count || 0)

    const { data: duelosEnCurso } = await supabase
      .from('duelos')
      .select('id, cantidad_preguntas')
      .eq('estado', 'en_curso')
      .or(`jugador_1.eq.${perfil.id},jugador_2.eq.${perfil.id}`)

    if (duelosEnCurso && duelosEnCurso.length > 0) {
      const { data: misRespuestas } = await supabase
        .from('respuestas')
        .select('duelo_id')
        .eq('usuario_id', perfil.id)
        .in('duelo_id', duelosEnCurso.map((d) => d.id))

      const respondidasPorDuelo = {}
      for (const r of misRespuestas || []) {
        respondidasPorDuelo[r.duelo_id] = (respondidasPorDuelo[r.duelo_id] || 0) + 1
      }
      const pendientes = duelosEnCurso.filter((d) => (respondidasPorDuelo[d.id] || 0) < d.cantidad_preguntas)
      setDuelosPendientes(pendientes.length)
    } else {
      setDuelosPendientes(0)
    }

    if (perfil.es_admin_plataforma || orgsAdmin?.length > 0) {
      const { count: plazoCount } = await supabase
        .from('solicitudes_plazo')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
      setSolicitudesPlazoPendientes(plazoCount || 0)
    }

    const { data: asignacionesData } = await supabase
      .from('inscripciones_curso')
      .select('id, cursos!inner(permite_individual, permite_practica_individual)')
      .eq('usuario_id', perfil.id)
      .eq('estado', 'asignado')
      .eq('visto', false)
    setAsignacionesCursosNuevas((asignacionesData || []).filter((a) => a.cursos?.permite_individual).length)
    setAsignacionesPruebasNuevas(
      (asignacionesData || []).filter((a) => !a.cursos?.permite_individual && a.cursos?.permite_practica_individual).length
    )
    setAsignacionesTriviasNuevas(
      (asignacionesData || []).filter((a) => !a.cursos?.permite_individual && !a.cursos?.permite_practica_individual).length
    )
  }

  const notificaciones = {
    '/': duelosPendientes,
    '/cursos': asignacionesCursosNuevas,
    '/pruebas': asignacionesPruebasNuevas,
    '/trivias': asignacionesTriviasNuevas,
    '/amigos': solicitudesPendientes,
    '/admin': solicitudesPlazoPendientes,
  }

  const totalNotificaciones = Object.values(notificaciones).reduce((suma, n) => suma + n, 0)

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10 relative">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800 text-sm sm:text-base shrink-0">🎯 EstudiApp</span>

        <nav className="hidden sm:flex items-center gap-1 text-sm overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `relative shrink-0 px-3 py-1.5 rounded-full font-medium ${
                  isActive ? 'bg-brand-blue-50 text-brand-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`
              }
            >
              {l.label}
              {notificaciones[l.to] > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                  {notificaciones[l.to]}
                </span>
              )}
            </NavLink>
          ))}
          <span className="text-slate-200 mx-1">|</span>
          <NavLink
            to="/perfil"
            className={({ isActive }) =>
              `shrink-0 px-3 py-1.5 rounded-full font-medium ${
                isActive ? 'bg-brand-blue-50 text-brand-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
              }`
            }
          >
            {perfil?.nombre}
          </NavLink>
          <button
            onClick={cerrarSesion}
            className="shrink-0 text-slate-400 hover:text-slate-700 hover:border-slate-300 text-xs border border-slate-200 rounded-full px-3 py-1.5 ml-1"
          >
            Salir
          </button>
        </nav>

        <button
          onClick={() => setMenuAbierto((v) => !v)}
          className="sm:hidden relative shrink-0 text-slate-500 hover:text-slate-800 p-1.5 -mr-1.5"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
        >
          <span className="text-lg leading-none">{menuAbierto ? '✕' : '☰'}</span>
          {!menuAbierto && totalNotificaciones > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
              {totalNotificaciones}
            </span>
          )}
        </button>
      </div>

      <div
        className="h-[3px]"
        style={{ background: 'linear-gradient(to right, var(--color-brand-blue-500), var(--color-brand-amber-500))' }}
      />

      {menuAbierto && (
        <nav className="sm:hidden border-t border-slate-100 px-3 py-2 flex flex-col text-sm">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-xl font-medium ${
                  isActive ? 'bg-brand-blue-50 text-brand-blue-700' : 'text-slate-600'
                }`
              }
            >
              {l.label}
              {notificaciones[l.to] > 0 && (
                <span className="bg-red-500 text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                  {notificaciones[l.to]}
                </span>
              )}
            </NavLink>
          ))}
          <div className="border-t border-slate-100 my-1" />
          <NavLink
            to="/perfil"
            className={({ isActive }) =>
              `px-3 py-2.5 rounded-xl font-medium ${isActive ? 'bg-brand-blue-50 text-brand-blue-700' : 'text-slate-600'}`
            }
          >
            {perfil?.nombre}
          </NavLink>
          <button onClick={cerrarSesion} className="text-left px-3 py-2.5 text-slate-400 hover:text-slate-700">
            Salir
          </button>
        </nav>
      )}
    </header>
  )
}
