import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const links = [
  { to: '/', label: 'Inicio' },
  { to: '/cursos', label: 'Cursos' },
  { to: '/pruebas', label: 'Pruebas' },
  { to: '/trivias', label: 'Trivias' },
  { to: '/amigos', label: 'Amigos' },
]

export default function NavBar() {
  const { perfil, orgsAdmin, cerrarSesion } = useAuth()
  const [solicitudesPendientes, setSolicitudesPendientes] = useState(0)
  const [duelosPendientes, setDuelosPendientes] = useState(0)
  const [solicitudesPlazoPendientes, setSolicitudesPlazoPendientes] = useState(0)
  const [asignacionesCursosNuevas, setAsignacionesCursosNuevas] = useState(0)
  const [asignacionesPruebasNuevas, setAsignacionesPruebasNuevas] = useState(0)
  const [asignacionesTriviasNuevas, setAsignacionesTriviasNuevas] = useState(0)

  useEffect(() => {
    if (perfil) cargarNotificaciones()
  }, [perfil?.id])

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

  const todosLosLinks = perfil?.es_admin_plataforma || orgsAdmin?.length > 0
    ? [...links, { to: '/admin', label: 'Administrar', labelCorto: 'Admin' }]
    : links

  const notificaciones = {
    '/': duelosPendientes,
    '/cursos': asignacionesCursosNuevas,
    '/pruebas': asignacionesPruebasNuevas,
    '/trivias': asignacionesTriviasNuevas,
    '/amigos': solicitudesPendientes,
    '/admin': solicitudesPlazoPendientes,
  }

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
      <div className="max-w-3xl mx-auto px-3 sm:px-4 py-3 flex items-center justify-between gap-2">
        <span className="font-semibold text-slate-800 text-sm sm:text-base shrink-0">🎯 EstudiApp</span>
        <nav className="flex items-center gap-2 sm:gap-4 text-sm overflow-x-auto">
          {todosLosLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `relative shrink-0 ${isActive ? 'text-indigo-600 font-medium' : 'text-slate-500 hover:text-slate-800'}`
              }
            >
              {l.labelCorto ? (
                <>
                  <span className="sm:hidden">{l.labelCorto}</span>
                  <span className="hidden sm:inline">{l.label}</span>
                </>
              ) : (
                l.label
              )}
              {notificaciones[l.to] > 0 && (
                <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center">
                  {notificaciones[l.to]}
                </span>
              )}
            </NavLink>
          ))}
          <span className="text-slate-300 hidden sm:inline">|</span>
          <NavLink
            to="/perfil"
            className={({ isActive }) =>
              `shrink-0 ${isActive ? 'text-indigo-600 font-medium' : 'text-slate-500 hover:text-slate-800'}`
            }
          >
            <span className="sm:hidden">{perfil?.nombre?.split(' ')[0]}</span>
            <span className="hidden sm:inline">{perfil?.nombre}</span>
          </NavLink>
          <button onClick={cerrarSesion} className="shrink-0 text-slate-400 hover:text-slate-700 text-xs border border-slate-200 rounded-md px-2 py-1">
            Salir
          </button>
        </nav>
      </div>
    </header>
  )
}
