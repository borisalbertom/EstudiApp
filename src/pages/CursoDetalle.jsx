import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

const CANTIDAD_PREGUNTAS = 5
const DIAS_SIN_REPETIR = 14

export default function CursoDetalle() {
  const { id } = useParams()
  const { perfil } = useAuth()
  const navigate = useNavigate()

  const [curso, setCurso] = useState(null)
  const [temas, setTemas] = useState([])
  const [amigos, setAmigos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [temaRetando, setTemaRetando] = useState(null)
  const [creandoDuelo, setCreandoDuelo] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarCurso()
    cargarAmigos()
  }, [id])

  async function cargarCurso() {
    setCargando(true)
    const [{ data: cursoData }, { data: temasData }] = await Promise.all([
      supabase
        .from('cursos')
        .select('id, nombre, descripcion, permite_duelos, permite_individual, mostrar_ranking')
        .eq('id', id)
        .single(),
      supabase.from('temas').select('id, nombre, orden').eq('curso_id', id).order('orden', { ascending: true }),
    ])
    setCurso(cursoData)
    setTemas(temasData || [])
    setCargando(false)
  }

  async function cargarAmigos() {
    const { data } = await supabase
      .from('amistades')
      .select('id, estado, usuario_a, usuario_b, perfil_a:usuario_a(id, nombre), perfil_b:usuario_b(id, nombre)')
      .eq('estado', 'aceptada')
      .or(`usuario_a.eq.${perfil.id},usuario_b.eq.${perfil.id}`)

    const lista = (data || []).map((a) => (a.usuario_a === perfil.id ? a.perfil_b : a.perfil_a)).filter(Boolean)
    setAmigos(lista)
  }

  async function retarAmigo(temaId, amigoId) {
    setCreandoDuelo(true)
    setError('')

    try {
      const { data: preguntasTema } = await supabase
        .from('preguntas')
        .select('id')
        .eq('tema_id', temaId)
        .eq('activa', true)

      const idsDisponibles = (preguntasTema || []).map((p) => p.id)
      if (idsDisponibles.length === 0) {
        setError('Este tema todavía no tiene preguntas activas.')
        setCreandoDuelo(false)
        return
      }

      const desde = new Date()
      desde.setDate(desde.getDate() - DIAS_SIN_REPETIR)

      const { data: historial } = await supabase
        .from('historial_preguntas')
        .select('pregunta_id')
        .eq('usuario_id', perfil.id)
        .eq('respondido_bien', true)
        .gte('respondido_en', desde.toISOString())

      const idsRecientes = new Set((historial || []).map((h) => h.pregunta_id))
      let pool = idsDisponibles.filter((pid) => !idsRecientes.has(pid))
      if (pool.length < CANTIDAD_PREGUNTAS) pool = idsDisponibles

      const elegidas = mezclar(pool).slice(0, Math.min(CANTIDAD_PREGUNTAS, pool.length))

      const { data: duelo, error: errorDuelo } = await supabase
        .from('duelos')
        .insert({
          curso_id: id,
          tema_id: temaId,
          tipo: 'async',
          jugador_1: perfil.id,
          jugador_2: amigoId,
          estado: 'en_curso',
          cantidad_preguntas: elegidas.length,
        })
        .select('id')
        .single()

      if (errorDuelo) throw errorDuelo

      const filas = elegidas.map((pid, i) => ({ duelo_id: duelo.id, pregunta_id: pid, orden: i + 1 }))
      const { error: errorPreguntas } = await supabase.from('duelo_preguntas').insert(filas)
      if (errorPreguntas) throw errorPreguntas

      navigate(`/duelo/${duelo.id}`)
    } catch (e) {
      setError('No se pudo crear el duelo. Intenta de nuevo.')
      setCreandoDuelo(false)
    }
  }

  function mezclar(arr) {
    const copia = [...arr]
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
    }
    return copia
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando curso...</main>
      </div>
    )
  }

  if (!curso) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-sm text-slate-500">No se encontró el curso.</p>
          <Link to="/" className="text-sm text-indigo-600">Volver al inicio</Link>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link to="/" className="text-xs text-slate-400 hover:text-indigo-600">← Volver a cursos</Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-xl font-semibold text-slate-800">{curso.nombre}</h1>
          {curso.mostrar_ranking && (
            <Link to={`/curso/${id}/ranking`} className="text-xs text-indigo-600 hover:underline">
              Ver ranking
            </Link>
          )}
        </div>
        {curso.descripcion && <p className="text-sm text-slate-500 mt-1">{curso.descripcion}</p>}

        {error && <p className="text-xs text-red-500 mt-4">{error}</p>}

        <p className="text-sm font-medium text-slate-700 mt-6 mb-2">Temas</p>

        {temas.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
            Este curso todavía no tiene temas cargados.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {temas.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-slate-800">{t.nombre}</p>
                <div className="flex gap-2 shrink-0">
                  {curso.permite_individual && (
                    <Link
                      to={`/curso/${id}/tema/${t.id}/individual`}
                      className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-md"
                    >
                      Practicar solo
                    </Link>
                  )}
                  {curso.permite_duelos && (
                    <button
                      onClick={() => setTemaRetando(temaRetando === t.id ? null : t.id)}
                      className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-md"
                    >
                      Retar a un amigo
                    </button>
                  )}
                </div>
              </div>

              {temaRetando === t.id && curso.permite_duelos && (
                <div className="mt-3 border-t border-slate-100 pt-3">
                  {amigos.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Todavía no tienes amigos agregados. Ve a{' '}
                      <Link to="/amigos" className="text-indigo-600">Amigos</Link>.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {amigos.map((a) => (
                        <button
                          key={a.id}
                          disabled={creandoDuelo}
                          onClick={() => retarAmigo(t.id, a.id)}
                          className="flex items-center justify-between bg-slate-50 hover:bg-indigo-50 rounded-lg px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                        >
                          <span>{a.nombre}</span>
                          <span className="text-xs text-indigo-600">{creandoDuelo ? 'Creando...' : 'Retar'}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
