import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

export default function Home() {
  const { perfil } = useAuth()
  const [cursos, setCursos] = useState([])
  const [duelos, setDuelos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [soloGratis, setSoloGratis] = useState(false)

  useEffect(() => {
    cargarCursos()
    cargarDuelos()
  }, [])

  async function cargarCursos() {
    const { data, error } = await supabase
      .from('cursos')
      .select('id, nombre, descripcion, visibilidad, organizaciones(nombre_empresa)')
      .order('creado_en', { ascending: false })

    if (!error) setCursos(data || [])
    setCargando(false)
  }

  async function cargarDuelos() {
    const { data } = await supabase
      .from('duelos')
      .select(
        'id, estado, cantidad_preguntas, jugador_1, jugador_2, perfil_1:jugador_1(nombre), perfil_2:jugador_2(nombre), cursos(nombre)'
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

  async function abandonarDuelo(dueloId) {
    const confirmado = window.confirm('¿Seguro que quieres abandonar este duelo? Tu rival gana automáticamente.')
    if (!confirmado) return

    await supabase
      .from('duelos')
      .update({ estado: 'finalizado', finalizado_en: new Date().toISOString(), abandonado_por: perfil.id })
      .eq('id', dueloId)

    cargarDuelos()
  }

  const cursosFiltrados = cursos
    .filter((c) => !soloGratis || c.visibilidad === 'publico')
    .filter((c) => c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))

  const hoy = new Date().toISOString().slice(0, 10)
  const rachaEnRiesgo = perfil?.racha_actual > 0 && perfil?.ultima_actividad !== hoy

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <p className="text-lg font-medium text-slate-800">Hola, {perfil?.nombre} 👋</p>
          <p className="text-sm text-slate-500">🔥 Racha de {perfil?.racha_actual || 0} días</p>
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
                    <Link to={`/duelo/${d.id}`} className="p-3 flex items-center justify-between">
                      <div>
                        <span className={`text-sm ${d.meToca ? 'text-indigo-900 font-medium' : 'text-slate-700'}`}>
                          vs {nombreRival}
                        </span>
                        <p className="text-xs text-slate-400">{d.cursos?.nombre}</p>
                      </div>
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
                      className="text-xs text-slate-400 hover:text-red-500 px-3 pb-2"
                    >
                      Abandonar duelo
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-slate-700">Cursos disponibles</p>
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={soloGratis}
              onChange={(e) => setSoloGratis(e.target.checked)}
              className="accent-indigo-600"
            />
            Solo gratis
          </label>
        </div>

        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar curso por nombre"
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mb-3"
        />

        {cargando && <p className="text-sm text-slate-400">Cargando cursos...</p>}

        {!cargando && cursos.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
            Todavía no hay cursos creados.
          </div>
        )}

        {!cargando && cursos.length > 0 && cursosFiltrados.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
            No hay cursos que calcen con tu búsqueda.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {cursosFiltrados.map((c) => (
            <Link
              key={c.id}
              to={`/curso/${c.id}`}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-indigo-300"
            >
              <div>
                <p className="font-medium text-slate-800">{c.nombre}</p>
                <p className="text-xs text-slate-500">
                  {c.visibilidad === 'publico' ? 'Público' : `Privado · ${c.organizaciones?.nombre_empresa || 'Empresa'}`}
                </p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">Ver</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
