import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { crearDuelo } from '../lib/duelos'
import { iconoMaterial } from '../lib/materiales'
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
  const [materialesPorTema, setMaterialesPorTema] = useState({})
  const [materialesVistos, setMaterialesVistos] = useState(new Set())
  const [totalMateriales, setTotalMateriales] = useState(0)

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
        .select('id, nombre, descripcion, permite_duelos, permite_individual, permite_practica_individual, mostrar_ranking, cantidad_preguntas, tiempo_por_pregunta, fecha_fin, fecha_fin_duelos')
        .eq('id', id)
        .single(),
      supabase.from('temas').select('id, nombre, orden').eq('curso_id', id).order('orden', { ascending: true }),
    ])
    setCurso(cursoData)
    setTemas(temasData || [])
    setCargando(false)

    const temaIds = (temasData || []).map((t) => t.id)
    if (temaIds.length > 0 && cursoData?.permite_individual) {
      const { data: materialesData } = await supabase
        .from('materiales_tema')
        .select('id, tema_id, nombre_archivo, url')
        .in('tema_id', temaIds)
        .order('creado_en', { ascending: true })

      const agrupados = {}
      for (const m of materialesData || []) {
        if (!agrupados[m.tema_id]) agrupados[m.tema_id] = []
        agrupados[m.tema_id].push(m)
      }
      setMaterialesPorTema(agrupados)
      setTotalMateriales((materialesData || []).length)

      if ((materialesData || []).length > 0) {
        const { data: vistosData } = await supabase
          .from('materiales_vistos')
          .select('material_id')
          .eq('usuario_id', perfil.id)
          .in('material_id', materialesData.map((m) => m.id))
        setMaterialesVistos(new Set((vistosData || []).map((v) => v.material_id)))
      }
    }

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

  async function marcarVisto(materialId) {
    if (materialesVistos.has(materialId)) return
    setMaterialesVistos((prev) => new Set(prev).add(materialId))
    await supabase
      .from('materiales_vistos')
      .upsert({ material_id: materialId, usuario_id: perfil.id }, { onConflict: 'material_id,usuario_id' })
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
  const duelosDisponibles = curso.permite_duelos && !(curso.fecha_fin_duelos && curso.fecha_fin_duelos < hoy)
  const materialCompleto = totalMateriales === 0 || materialesVistos.size >= totalMateriales

  const materialesFlat = temas.flatMap((t) => materialesPorTema[t.id] || [])
  function numeroGlobal(materialId) {
    return materialesFlat.findIndex((m) => m.id === materialId) + 1
  }
  function materialDesbloqueado(materialId) {
    const idx = materialesFlat.findIndex((m) => m.id === materialId)
    if (idx <= 0) return true
    return materialesFlat.slice(0, idx).every((m) => materialesVistos.has(m.id))
  }
  function tipoArchivo(nombre) {
    return (nombre.split('.').pop() || '').toUpperCase()
  }

  const rutaListado = curso.permite_individual ? '/cursos' : curso.permite_practica_individual ? '/pruebas' : '/trivias'
  const nombreListado = curso.permite_individual ? 'cursos' : curso.permite_practica_individual ? 'pruebas' : 'trivias'

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link to={rutaListado} className="text-xs text-slate-400 hover:text-indigo-600">← Volver a {nombreListado}</Link>
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

        <div className="mt-4 bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-medium text-slate-700 mb-2">Detalles del curso</p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-slate-400">Tipo</p>
              <p className="text-slate-700 font-medium mt-0.5">
                {curso.permite_individual
                  ? '📝 Certificación'
                  : curso.permite_practica_individual
                    ? '🎯 Prueba'
                    : '🎉 Trivia'}
              </p>
            </div>
            <div>
              <p className="text-slate-400">Preguntas por intento</p>
              <p className="text-slate-700 font-medium mt-0.5">{curso.cantidad_preguntas}</p>
            </div>
            {curso.tiempo_por_pregunta > 0 && (
              <div>
                <p className="text-slate-400">Tiempo por pregunta</p>
                <p className="text-slate-700 font-medium mt-0.5">{curso.tiempo_por_pregunta}s</p>
              </div>
            )}
            <div>
              <p className="text-slate-400">Fecha límite</p>
              <p className="text-slate-700 font-medium mt-0.5">{curso.fecha_fin || 'Sin límite'}</p>
            </div>
          </div>
        </div>

        {!vencido && temas.length > 1 && (curso.permite_practica_individual || duelosDisponibles) && (
          <div className="mt-4 bg-white border border-indigo-200 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-800">🎯 Todos los contenidos</p>
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
                {curso.permite_practica_individual && (
                  <Link
                    to={`/curso/${id}/individual?dificultad=${dificultadCurso}`}
                    className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-md"
                  >
                    Practicar solo
                  </Link>
                )}
                {duelosDisponibles && (
                  <button
                    onClick={() => setTemaRetando(temaRetando === 'curso' ? null : 'curso')}
                    className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-md"
                  >
                    Retar a un amigo
                  </button>
                )}
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

        {!vencido && curso.permite_duelos && curso.fecha_fin_duelos && curso.fecha_fin_duelos < hoy && (
          <p className="mt-4 text-xs text-slate-400">
            🎯 El periodo de desafíos de este curso terminó el {curso.fecha_fin_duelos}.
          </p>
        )}

        {error && <p className="text-xs text-red-500 mt-4">{error}</p>}

        <p className="text-sm font-medium text-slate-700 mt-6 mb-1">
          {curso.permite_individual ? 'Temario del curso' : 'Contenidos'}
        </p>
        <p className="text-xs text-slate-500 mb-2">
          {temas.length} contenido{temas.length !== 1 ? 's' : ''}
          {totalMateriales > 0 &&
            ` · ${totalMateriales} material${totalMateriales !== 1 ? 'es' : ''} de estudio · ${materialesVistos.size}/${totalMateriales} revisados`}
        </p>

        {temas.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 text-sm text-slate-500">
            Este curso todavía no tiene contenido cargado.
          </div>
        )}

        <div className="flex flex-col gap-2">
          {temas.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <p className="font-medium text-slate-800">{t.nombre}</p>
                {!vencido && (curso.permite_practica_individual || duelosDisponibles) && (
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
                    {curso.permite_practica_individual && (
                      <Link
                        to={`/curso/${id}/tema/${t.id}/individual?dificultad=${dificultadDe(t.id)}`}
                        className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-md"
                      >
                        Practicar solo
                      </Link>
                    )}
                    {duelosDisponibles && (
                      <button
                        onClick={() => setTemaRetando(temaRetando === t.id ? null : t.id)}
                        className="text-xs bg-indigo-50 text-indigo-600 px-3 py-1 rounded-md"
                      >
                        Retar a un amigo
                      </button>
                    )}
                  </div>
                )}
              </div>

              {materialesPorTema[t.id]?.length > 0 && (
                <div className="mt-3 border-t border-slate-100 pt-3 flex flex-col gap-1">
                  <p className="text-xs font-medium text-slate-500 mb-1">Material de estudio</p>
                  {materialesPorTema[t.id].map((m) => {
                    const numero = numeroGlobal(m.id)
                    const visto = materialesVistos.has(m.id)
                    const desbloqueado = materialDesbloqueado(m.id)

                    if (!desbloqueado) {
                      return (
                        <div key={m.id} className="flex items-center gap-2 text-xs text-slate-300 py-1">
                          <span>🔒</span>
                          <span>{numero}. {m.nombre_archivo}</span>
                        </div>
                      )
                    }

                    return (
                      <div key={m.id} className="flex items-center gap-2 text-xs py-1">
                        <a
                          href={m.url}
                          target="_blank"
                          rel="noreferrer"
                          className={`flex items-center gap-2 flex-1 min-w-0 rounded-md px-1 -mx-1 ${
                            visto ? 'text-slate-400' : 'text-indigo-600 hover:bg-indigo-50'
                          }`}
                        >
                          <span className="shrink-0">{visto ? '✅' : iconoMaterial(m.nombre_archivo)}</span>
                          <span className={`truncate ${visto ? 'line-through' : ''}`}>{numero}. {m.nombre_archivo}</span>
                        </a>
                        <span className="shrink-0 text-[10px] uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {tipoArchivo(m.nombre_archivo)}
                        </span>
                        {!visto && (
                          <button
                            onClick={() => marcarVisto(m.id)}
                            className="shrink-0 text-[10px] bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-2 py-1 rounded-md"
                          >
                            Marcar leído
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {temaRetando === t.id && duelosDisponibles && (
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

        {!vencido && curso.permite_individual && temas.length > 1 && (
          materialCompleto ? (
            <Link
              to={`/curso/${id}/examen`}
              className="mt-2 flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-3 hover:bg-indigo-700"
            >
              <span className="text-lg">📝</span>
              <span className="flex-1 text-sm font-medium">{materialesFlat.length + 1}. Examen final</span>
              <span className="text-xs">→</span>
            </Link>
          ) : (
            <div className="mt-2 flex items-center gap-2 bg-slate-100 text-slate-400 rounded-xl px-4 py-3">
              <span className="text-lg">🔒</span>
              <span className="flex-1">
                <span className="block text-sm font-medium">{materialesFlat.length + 1}. Examen final</span>
                <span className="block text-xs">Revisa todo el material de estudio para desbloquearlo</span>
              </span>
            </div>
          )
        )}
      </main>
    </div>
  )
}
