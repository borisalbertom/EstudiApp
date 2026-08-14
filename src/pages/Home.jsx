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
      .select('id, estado, jugador_1, jugador_2, perfil_1:jugador_1(nombre), perfil_2:jugador_2(nombre)')
      .or(`jugador_1.eq.${perfil.id},jugador_2.eq.${perfil.id}`)
      .order('creado_en', { ascending: false })
      .limit(5)

    setDuelos(data || [])
  }

  const cursosFiltrados = cursos
    .filter((c) => !soloGratis || c.visibilidad === 'publico')
    .filter((c) => c.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()))

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <div className="mb-6">
          <p className="text-lg font-medium text-slate-800">Hola, {perfil?.nombre} 👋</p>
          <p className="text-sm text-slate-500">🔥 Racha de {perfil?.racha_actual || 0} días</p>
        </div>

        {duelos.length > 0 && (
          <div className="mb-6">
            <p className="text-sm font-medium text-slate-700 mb-2">Mis duelos</p>
            <div className="flex flex-col gap-2">
              {duelos.map((d) => {
                const soyJugador1 = d.jugador_1 === perfil.id
                const nombreRival = soyJugador1 ? d.perfil_2?.nombre : d.perfil_1?.nombre
                const destino = d.estado === 'finalizado' ? `/duelo/${d.id}/resultado` : `/duelo/${d.id}`
                return (
                  <Link
                    key={d.id}
                    to={destino}
                    className="bg-white border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-indigo-300"
                  >
                    <span className="text-sm text-slate-700">vs {nombreRival}</span>
                    <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md capitalize">
                      {d.estado === 'finalizado' ? 'Ver resultado' : 'Jugar'}
                    </span>
                  </Link>
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
