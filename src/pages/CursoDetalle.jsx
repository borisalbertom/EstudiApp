import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { crearDuelo } from '../lib/duelos'
import NavBar from '../components/NavBar'

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
  const [dificultadPorTema, setDificultadPorTema] = useState({})
  const [dificultadCurso, setDificultadCurso] = useState('todas')
  const [solicitudPlazo, setSolicitudPlazo] = useState(null)
  const [enviandoSolicitud, setEnviandoSolicitud] = useState(false)

  function dificultadDe(temaId) {
    return dificultadPorTema[temaId] || 'todas'
  }

  useEffect(() => {
    cargarCurso()
    cargarAmigos()
  }, [id])

  async function cargarCurso() {
    setCargando(true)
    const [{ data: cursoData }, { data: temasData }] = await Promise.all([
      supabase
        .from('cursos')
        .select('id, nombre, descripcion, permite_duelos, permite_individual, mostrar_ranking, cantidad_preguntas, duelo_todo_curso, fecha_fin')
        .eq('id', id)
        .single(),
      supabase.from('temas').select('id, nombre, orden').eq('curso_id', id).order('orden', { ascending: true }),
    ])
    setCurso(cursoData)
    setTemas(temasData || [])
    setCargando(false)

    const hoy = new Date().toISOString().slice(0, 10)
    if (cursoData?.fecha_fin && cursoData.fecha_fin < hoy && cursoData.permite_individual) {
      const { data: solicitudData } = await supabase
        .from('solicitudes_plazo')
        .select('id, estado')
        .eq('curso_id', id)
        .eq('usuario_id', perfil.id)
        .eq('estado', 'pendiente')
        .maybeSingle()
      setSolicitudPlazo(solicitudData)
    }
  }

  async function solicitarPlazo() {
    setEnviandoSolicitud(true)
    const { data, error: errorSolicitud } = await supabase
      .from('solicitudes_plazo')
      .insert({ curso_id: id, usuario_id: perfil.id })
      .select('id, estado')
      .single()

    if (!errorSolicitud) setSolicitudPlazo(data)
    setEnviandoSolicitud(false)
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

  async function retarAmigo(temaId, amigoId, dificultadOverride) {
    setCreandoDuelo(true)
    setError('')

    const { dueloId, error: errorCreacion } = await crearDuelo({
      cursoId: id,
      temaId,
      cantidadPreguntas: curso.cantidad_preguntas || 5,
      dificultad: dificultadOverride || dificultadDe(temaId),
      jugador1Id: perfil.id,
      jugador2Id: amigoId,
    })

    if (errorCreacion) {
      setError(errorCreacion)
      setCreandoDuelo(false)
      return
    }

    navigate(`/duelo/${dueloId}`)
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

  const hoy = new Date().toISOString().slice(0, 10)
  const vencido = curso.fecha_fin && curso.fecha_fin < hoy

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

        {vencido && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            <p>⏳ Este curso ya no está disponible — venció el {curso.fecha_fin}.</p>
            {curso.permite_individual && (
              solicitudPlazo ? (
                <p className="text-xs text-red-500 mt-2">
                  Ya enviaste una solicitud de más plazo — el administrador la está revisando.
                </p>
              ) : (
                <button
                  onClick={solicitarPlazo}
                  disabled={enviandoSolicitud}
                  className="mt-2 text-xs bg-red-600 text-white px-3 py-1.5 rounded-md disabled:opacity-50"
                >
                  {enviandoSolicitud ? 'Enviando...' : 'Solicitar más plazo'}
                </button>
              )
            )}
          </div>
        )}

        {!vencido && curso.permite_individual && temas.length > 1 && (
          <Link
            to={`/curso/${id}/examen`}
            className="mt-4 flex items-center justify-between bg-indigo-600 text-white rounded-xl px-4 py-3 hover:bg-indigo-700"
          >
            <span className="text-sm font-medium">📝 Simular examen completo</span>
            <span className="text-xs">Todos los temas →</span>
          </Link>
        )}

        {!vencido && curso.permite_duelos && curso.duelo_todo_curso && (
          <div className="mt-4 bg-white border border-indigo-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-800">🎯 Retar a un amigo (todo el curso)</p>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <select
                  value={dificultadCurso}
                  onChange={(e) => setDificultadCurso(e.target.value)}
                  className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-600"
                >
                  <option value="todas">Todas</option>
                  <option value="facil">Fácil</option>
                  <option value="media">Media</option>
                  <option value="dificil">Difícil</option>
                </select>
                <button
                  onClick={() => setTemaRetando(temaRetando === 'curso' ? null : 'curso')}
                  className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-md"
                >
                  Retar a un amigo
                </button>
              </div>
            </div>

            {temaRetando === 'curso' && (
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
                        onClick={() => retarAmigo(null, a.id, dificultadCurso)}
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
        )}

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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="font-medium text-slate-800">{t.nombre}</p>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <select
                    value={dificultadDe(t.id)}
                    onChange={(e) => setDificultadPorTema((prev) => ({ ...prev, [t.id]: e.target.value }))}
                    className="text-xs border border-slate-200 rounded-md px-1.5 py-1 text-slate-600"
                  >
                    <option value="todas">Todas</option>
                    <option value="facil">Fácil</option>
                    <option value="media">Media</option>
                    <option value="dificil">Difícil</option>
                  </select>
                  {!vencido && curso.permite_individual && (
                    <Link
                      to={`/curso/${id}/tema/${t.id}/individual?dificultad=${dificultadDe(t.id)}`}
                      className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-md"
                    >
                      Practicar solo
                    </Link>
                  )}
                  {!vencido && curso.permite_duelos && !curso.duelo_todo_curso && (
                    <button
                      onClick={() => setTemaRetando(temaRetando === t.id ? null : t.id)}
                      className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-md"
                    >
                      Retar a un amigo
                    </button>
                  )}
                </div>
              </div>

              {temaRetando === t.id && curso.permite_duelos && !curso.duelo_todo_curso && (
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
