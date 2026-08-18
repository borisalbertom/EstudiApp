import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

export default function Home() {
  const { perfil } = useAuth()
  const [duelos, setDuelos] = useState([])
  const [examenesPendientes, setExamenesPendientes] = useState([])
  const [cargandoExamenes, setCargandoExamenes] = useState(true)
  const [logros, setLogros] = useState({ obtenidos: 0, total: 0 })

  useEffect(() => {
    cargarDuelos()
    cargarExamenes()
    cargarLogros()
  }, [])

  async function cargarLogros() {
    const [{ count: total }, { count: obtenidos }] = await Promise.all([
      supabase.from('logros').select('id', { count: 'exact', head: true }),
      supabase.from('logros_usuario').select('id', { count: 'exact', head: true }).eq('usuario_id', perfil.id),
    ])
    setLogros({ obtenidos: obtenidos || 0, total: total || 0 })
  }

  async function cargarDuelos() {
    const { data } = await supabase
      .from('duelos')
      .select(
        'id, estado, cantidad_preguntas, jugador_1, jugador_2, tema_id, perfil_1:jugador_1(nombre), perfil_2:jugador_2(nombre), cursos(nombre), temas(nombre)'
      )
      .or(`jugador_1.eq.${perfil.id},jugador_2.eq.${perfil.id}`)
      .neq('estado', 'finalizado')
      .order('creado_en', { ascending: false })
      .limit(5)

    const lista = data || []

    let respondidasPorDuelo = {}
    if (lista.length > 0) {
      const { data: misRespuestas } = await supabase
        .from('respuestas')
        .select('duelo_id')
        .eq('usuario_id', perfil.id)
        .in('duelo_id', lista.map((d) => d.id))

      for (const r of misRespuestas || []) {
        respondidasPorDuelo[r.duelo_id] = (respondidasPorDuelo[r.duelo_id] || 0) + 1
      }
    }

    setDuelos(
      lista.map((d) => ({
        ...d,
        meToca: (respondidasPorDuelo[d.id] || 0) < d.cantidad_preguntas,
      }))
    )
  }

  async function cargarExamenes() {
    setCargandoExamenes(true)
    const hoy = new Date().toISOString().slice(0, 10)
    const { data: inscripciones } = await supabase
      .from('inscripciones_curso')
      .select('cursos(id, nombre, permite_individual, fecha_fin)')
      .eq('usuario_id', perfil.id)

    const cursosExamen = (inscripciones || [])
      .map((i) => i.cursos)
      .filter((c) => c && c.permite_individual && (!c.fecha_fin || c.fecha_fin >= hoy))

    if (cursosExamen.length === 0) {
      setExamenesPendientes([])
      setCargandoExamenes(false)
      return
    }

    const { data: intentos } = await supabase
      .from('intentos_individuales')
      .select('curso_id')
      .eq('usuario_id', perfil.id)
      .is('tema_id', null)
      .in('curso_id', cursosExamen.map((c) => c.id))

    const idsRendidos = new Set((intentos || []).map((i) => i.curso_id))
    setExamenesPendientes(cursosExamen.filter((c) => !idsRendidos.has(c.id)))
    setCargandoExamenes(false)
  }

  async function abandonarDuelo(dueloId) {
    const confirmado = window.confirm('¿Seguro que quieres abandonar este duelo? Tu rival gana automáticamente.')
    if (!confirmado) return

    await supabase
      .from('duelos')
      .update({ estado: 'finalizado', finalizado_en: new Date().toISOString(), abandonado_por: perfil.id })
      .eq('id', dueloId)

    cargarDuelos()
  }

  const hoy = new Date().toISOString().slice(0, 10)
  const rachaEnRiesgo = perfil?.racha_actual > 0 && perfil?.ultima_actividad !== hoy

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <p className="text-lg font-medium text-slate-800 mb-4">Hola, {perfil?.nombre} 👋</p>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-slate-800">🔥 {perfil?.racha_actual || 0}</p>
            <p className="text-xs text-slate-500">Racha</p>
          </div>
          <Link
            to="/logros"
            className="bg-white border border-slate-200 rounded-xl p-3 text-center hover:border-indigo-300"
          >
            <p className="text-lg font-semibold text-slate-800">🏆 {logros.obtenidos}/{logros.total}</p>
            <p className="text-xs text-slate-500">Logros</p>
          </Link>
          <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-slate-800">📝 {examenesPendientes.length}</p>
            <p className="text-xs text-slate-500">Exámenes pendientes</p>
          </div>
        </div>

        {rachaEnRiesgo && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-6 text-sm text-amber-700">
            ⚠️ Tu racha de {perfil.racha_actual} días está en riesgo — juega hoy para no perderla.
          </div>
        )}

        {duelos.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700 mb-2">Mis duelos</p>
            <div className="flex flex-col gap-2">
              {duelos.map((d) => {
                const soyJugador1 = d.jugador_1 === perfil.id
                const nombreRival = soyJugador1 ? d.perfil_2?.nombre : d.perfil_1?.nombre
                const etiqueta = d.meToca ? 'Te toca jugar' : 'Esperando rival'

                return (
                  <div
                    key={d.id}
                    className={`rounded-xl border ${
                      d.meToca ? 'bg-indigo-50 border-indigo-300' : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="p-3 flex items-center justify-between">
                      <Link to={`/duelo/${d.id}`} className="flex-1 min-w-0">
                        <span className={`text-sm ${d.meToca ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>
                          vs {nombreRival}
                        </span>
                        <p className="text-xs text-slate-400">
                          {d.cursos?.nombre} - {d.tema_id ? d.temas?.nombre : 'Todos los contenidos'}
                        </p>
                      </Link>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <Link to={`/duelo/${d.id}`}>
                          <span
                            className={`text-xs px-2 py-1 rounded-md whitespace-nowrap ${
                              d.meToca ? 'bg-indigo-600 text-white font-medium' : 'bg-indigo-50 text-indigo-600'
                            }`}
                          >
                            {etiqueta}
                          </span>
                        </Link>
                        <button
                          onClick={() => abandonarDuelo(d.id)}
                          className="text-xs text-slate-400 hover:text-red-500"
                        >
                          Abandonar duelo
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm font-medium text-slate-700 mb-2">Mis exámenes pendientes</p>
          {cargandoExamenes ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : examenesPendientes.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
              Sin exámenes pendientes.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {examenesPendientes.map((c) => (
                <Link
                  key={c.id}
                  to={`/curso/${c.id}/examen`}
                  className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between hover:border-amber-400"
                >
                  <div>
                    <span className="text-sm text-amber-900 font-medium">{c.nombre}</span>
                    {c.fecha_fin && <p className="text-xs text-amber-600">Vence {c.fecha_fin}</p>}
                  </div>
                  <span className="text-xs bg-amber-600 text-white px-2 py-1 rounded-md whitespace-nowrap">
                    Rendir examen
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Link
            to="/cursos"
            className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-300"
          >
            <span className="text-sm font-medium text-slate-800">📚 Cursos</span>
          </Link>
          <Link
            to="/pruebas"
            className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-300"
          >
            <span className="text-sm font-medium text-slate-800">🎯 Pruebas</span>
          </Link>
          <Link
            to="/trivias"
            className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 hover:border-indigo-300"
          >
            <span className="text-sm font-medium text-slate-800">🎉 Trivias</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
