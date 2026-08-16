import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import NavBar from '../components/NavBar'

export default function AdminCurso() {
  const { id } = useParams()
  const { perfil } = useAuth()

  const [curso, setCurso] = useState(null)
  const [temas, setTemas] = useState([])
  const [temaExpandido, setTemaExpandido] = useState(null)
  const [temaEditando, setTemaEditando] = useState(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [preguntasPorTema, setPreguntasPorTema] = useState({})
  const [cargando, setCargando] = useState(true)
  const [errorTema, setErrorTema] = useState('')

  const [nombreTema, setNombreTema] = useState('')
  const [creandoTema, setCreandoTema] = useState(false)

  useEffect(() => {
    cargarCurso()
  }, [id])

  async function cargarCurso() {
    setCargando(true)
    const [{ data: cursoData }, { data: temasData }] = await Promise.all([
      supabase
        .from('cursos')
        .select('id, nombre, permite_duelos, permite_individual, mostrar_ranking, cantidad_preguntas, porcentaje_certificacion, tiempo_por_pregunta, duelo_todo_curso')
        .eq('id', id)
        .single(),
      supabase.from('temas').select('id, nombre, orden').eq('curso_id', id).order('orden', { ascending: true }),
    ])
    setCurso(cursoData)
    setTemas(temasData || [])
    setCargando(false)
  }

  async function crearTema(e) {
    e.preventDefault()
    if (!nombreTema.trim()) return
    setCreandoTema(true)
    const siguienteOrden = temas.length > 0 ? Math.max(...temas.map((t) => t.orden || 0)) + 1 : 1

    const { error } = await supabase.from('temas').insert({
      curso_id: id,
      nombre: nombreTema.trim(),
      orden: siguienteOrden,
    })

    if (!error) {
      setNombreTema('')
      cargarCurso()
    }
    setCreandoTema(false)
  }

  async function guardarNombreTema(temaId) {
    if (!nombreEditado.trim()) return
    await supabase.from('temas').update({ nombre: nombreEditado.trim() }).eq('id', temaId)
    setTemaEditando(null)
    cargarCurso()
  }

  async function borrarTema(temaId) {
    setErrorTema('')
    const { count } = await supabase
      .from('preguntas')
      .select('id', { count: 'exact', head: true })
      .eq('tema_id', temaId)

    if ((count || 0) > 0) {
      setErrorTema('Este tema tiene preguntas — desactívalas todas antes de poder borrarlo.')
      return
    }

    await supabase.from('temas').delete().eq('id', temaId)
    cargarCurso()
  }

  async function alternarTema(temaId) {
    if (temaExpandido === temaId) {
      setTemaExpandido(null)
      return
    }
    setTemaExpandido(temaId)
    if (!preguntasPorTema[temaId]) await cargarPreguntas(temaId)
  }

  async function cargarPreguntas(temaId) {
    const { data } = await supabase
      .from('preguntas')
      .select('id, enunciado, alternativas, correcta, dificultad, activa')
      .eq('tema_id', temaId)
      .order('creado_en', { ascending: false })
    setPreguntasPorTema((prev) => ({ ...prev, [temaId]: data || [] }))
  }

  async function alternarActiva(pregunta, temaId) {
    await supabase.from('preguntas').update({ activa: !pregunta.activa }).eq('id', pregunta.id)
    cargarPreguntas(temaId)
  }

  async function actualizarConfig(campo, valor) {
    setCurso((prev) => ({ ...prev, [campo]: valor }))
    await supabase.from('cursos').update({ [campo]: valor }).eq('id', id)
  }

  async function actualizarTipo(tipo) {
    const cambios = { permite_duelos: tipo === 'retos', permite_individual: tipo === 'certificacion' }
    setCurso((prev) => ({ ...prev, ...cambios }))
    await supabase.from('cursos').update(cambios).eq('id', id)
  }

  if (!perfil?.es_admin_plataforma) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6">
          <p className="text-sm text-slate-500">No tienes permisos para ver esta página.</p>
        </main>
      </div>
    )
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavBar />
        <main className="max-w-3xl mx-auto px-4 py-6 text-sm text-slate-400">Cargando...</main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-6">
        <Link to="/admin" className="text-xs text-slate-400 hover:text-indigo-600">← Volver a cursos</Link>
        <h1 className="text-xl font-semibold text-slate-800 mt-2 mb-4">{curso?.nombre}</h1>

        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex flex-col gap-2">
          <p className="text-sm font-medium text-slate-700 mb-1">Configuración del curso</p>

          <label className="text-xs text-slate-500 mb-1">
            Preguntas por intento (duelos y modo individual)
            <input
              type="number"
              min={1}
              max={50}
              value={curso?.cantidad_preguntas ?? 5}
              onChange={(e) => actualizarConfig('cantidad_preguntas', Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </label>

          <label className="text-xs text-slate-500 mb-1">
            Tiempo por pregunta en segundos (0 = sin límite)
            <input
              type="number"
              min={0}
              max={600}
              value={curso?.tiempo_por_pregunta ?? 0}
              onChange={(e) => actualizarConfig('tiempo_por_pregunta', Number(e.target.value))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
            />
          </label>

          <div className="flex gap-4 text-sm text-slate-600">
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={!curso?.permite_individual}
                onChange={() => actualizarTipo('retos')}
              />
              Retos (duelos entre amigos)
            </label>
            <label className="flex items-center gap-1.5">
              <input
                type="radio"
                checked={curso?.permite_individual || false}
                onChange={() => actualizarTipo('certificacion')}
              />
              Certificación (evaluación individual)
            </label>
          </div>
          {!curso?.permite_individual && (
            <label className="flex items-center gap-1.5 text-sm text-slate-600 ml-5">
              <input
                type="checkbox"
                checked={curso?.duelo_todo_curso || false}
                onChange={(e) => actualizarConfig('duelo_todo_curso', e.target.checked)}
                className="accent-indigo-600"
              />
              Duelos con preguntas de todo el curso (en vez de elegir un tema)
            </label>
          )}
          {curso?.permite_individual && (
            <label className="text-xs text-slate-500 ml-5">
              % para aprobar en el modo individual
              <input
                type="number"
                min={0}
                max={100}
                value={curso?.porcentaje_certificacion ?? 70}
                onChange={(e) => actualizarConfig('porcentaje_certificacion', Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm mt-1"
              />
            </label>
          )}
          <label className="flex items-center gap-1.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={curso?.mostrar_ranking || false}
              onChange={(e) => actualizarConfig('mostrar_ranking', e.target.checked)}
              className="accent-indigo-600"
            />
            Mostrar ranking
          </label>
        </div>

        <form onSubmit={crearTema} className="bg-white border border-slate-200 rounded-xl p-4 mb-6 flex gap-2">
          <input
            type="text"
            placeholder="Nombre del nuevo tema"
            value={nombreTema}
            onChange={(e) => setNombreTema(e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={creandoTema}
            className="bg-indigo-600 text-white text-sm px-4 rounded-lg disabled:opacity-50"
          >
            {creandoTema ? 'Creando...' : 'Agregar tema'}
          </button>
        </form>

        {errorTema && <p className="text-xs text-red-500 mb-3">{errorTema}</p>}

        <div className="flex flex-col gap-3">
          {temas.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                {temaEditando === t.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      className="flex-1 border border-slate-300 rounded-lg px-2 py-1 text-sm"
                      autoFocus
                    />
                    <button onClick={() => guardarNombreTema(t.id)} className="text-xs text-indigo-600">Guardar</button>
                    <button onClick={() => setTemaEditando(null)} className="text-xs text-slate-400">Cancelar</button>
                  </div>
                ) : (
                  <button
                    onClick={() => alternarTema(t.id)}
                    className="flex-1 flex items-center justify-between text-left"
                  >
                    <p className="font-medium text-slate-800">{t.nombre}</p>
                    <span className="text-xs text-indigo-600">
                      {temaExpandido === t.id ? 'Ocultar preguntas' : 'Ver preguntas'}
                    </span>
                  </button>
                )}

                {temaEditando !== t.id && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setTemaEditando(t.id)
                        setNombreEditado(t.nombre)
                      }}
                      className="text-xs text-slate-400 hover:text-slate-700"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => borrarTema(t.id)}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      Borrar
                    </button>
                  </div>
                )}
              </div>

              {temaExpandido === t.id && (
                <PreguntasTema
                  temaId={t.id}
                  preguntas={preguntasPorTema[t.id] || []}
                  onCambio={() => cargarPreguntas(t.id)}
                  onAlternarActiva={(p) => alternarActiva(p, t.id)}
                />
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}

function PreguntasTema({ temaId, preguntas, onCambio, onAlternarActiva }) {
  const [enunciado, setEnunciado] = useState('')
  const [alternativas, setAlternativas] = useState(['', '', '', ''])
  const [correcta, setCorrecta] = useState(0)
  const [dificultad, setDificultad] = useState('facil')
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState('')
  const [editandoId, setEditandoId] = useState(null)

  function actualizarAlternativa(i, valor) {
    setAlternativas((prev) => prev.map((a, idx) => (idx === i ? valor : a)))
  }

  async function crearPregunta(e) {
    e.preventDefault()
    if (!enunciado.trim() || alternativas.some((a) => !a.trim())) {
      setError('Completa el enunciado y las 4 alternativas.')
      return
    }
    setCreando(true)
    setError('')

    const { error } = await supabase.from('preguntas').insert({
      tema_id: temaId,
      enunciado: enunciado.trim(),
      alternativas: alternativas.map((a) => a.trim()),
      correcta,
      dificultad,
      activa: true,
    })

    if (error) setError('No se pudo crear la pregunta.')
    else {
      setEnunciado('')
      setAlternativas(['', '', '', ''])
      setCorrecta(0)
      setDificultad('facil')
      onCambio()
    }
    setCreando(false)
  }

  return (
    <div className="mt-4 border-t border-slate-100 pt-4">
      <form onSubmit={crearPregunta} className="flex flex-col gap-2 mb-4 bg-slate-50 rounded-lg p-3">
        <input
          type="text"
          placeholder="Enunciado de la pregunta"
          value={enunciado}
          onChange={(e) => setEnunciado(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        />
        {alternativas.map((alt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="radio"
              name={`correcta-${temaId}`}
              checked={correcta === i}
              onChange={() => setCorrecta(i)}
            />
            <input
              type="text"
              placeholder={`Alternativa ${i + 1}`}
              value={alt}
              onChange={(e) => actualizarAlternativa(i, e.target.value)}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
        ))}
        <p className="text-xs text-slate-400">Marca con el círculo cuál alternativa es la correcta.</p>

        <select
          value={dificultad}
          onChange={(e) => setDificultad(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="facil">Fácil</option>
          <option value="media">Media</option>
          <option value="dificil">Difícil</option>
        </select>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={creando}
          className="bg-indigo-600 text-white text-sm rounded-lg py-2 disabled:opacity-50"
        >
          {creando ? 'Creando...' : 'Agregar pregunta'}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {preguntas.length === 0 && <p className="text-xs text-slate-400">Este tema no tiene preguntas todavía.</p>}
        {preguntas.map((p) =>
          editandoId === p.id ? (
            <PreguntaEdicion
              key={p.id}
              pregunta={p}
              onCancelar={() => setEditandoId(null)}
              onGuardado={() => {
                setEditandoId(null)
                onCambio()
              }}
            />
          ) : (
            <div key={p.id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-slate-700">{p.enunciado}</p>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setEditandoId(p.id)} className="text-xs text-slate-400 hover:text-slate-700">
                    Editar
                  </button>
                  <button
                    onClick={() => onAlternarActiva(p)}
                    className={`text-xs px-2 py-1 rounded-md ${
                      p.activa ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {p.activa ? 'Activa' : 'Inactiva'}
                  </button>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Correcta: {p.alternativas?.[p.correcta]} · Dificultad: {p.dificultad}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

function PreguntaEdicion({ pregunta, onCancelar, onGuardado }) {
  const [enunciado, setEnunciado] = useState(pregunta.enunciado)
  const [alternativas, setAlternativas] = useState([...pregunta.alternativas])
  const [correcta, setCorrecta] = useState(pregunta.correcta)
  const [dificultad, setDificultad] = useState(pregunta.dificultad)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function actualizarAlternativa(i, valor) {
    setAlternativas((prev) => prev.map((a, idx) => (idx === i ? valor : a)))
  }

  async function guardar() {
    if (!enunciado.trim() || alternativas.some((a) => !a.trim())) {
      setError('Completa el enunciado y las 4 alternativas.')
      return
    }
    setGuardando(true)
    setError('')

    const { error } = await supabase
      .from('preguntas')
      .update({
        enunciado: enunciado.trim(),
        alternativas: alternativas.map((a) => a.trim()),
        correcta,
        dificultad,
      })
      .eq('id', pregunta.id)

    if (error) {
      setError('No se pudo guardar.')
      setGuardando(false)
    } else {
      onGuardado()
    }
  }

  return (
    <div className="border border-indigo-200 rounded-lg p-3 bg-indigo-50/40 flex flex-col gap-2">
      <input
        type="text"
        value={enunciado}
        onChange={(e) => setEnunciado(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
      />
      {alternativas.map((alt, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="radio"
            name={`editar-correcta-${pregunta.id}`}
            checked={correcta === i}
            onChange={() => setCorrecta(i)}
          />
          <input
            type="text"
            value={alt}
            onChange={(e) => actualizarAlternativa(i, e.target.value)}
            className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      ))}
      <select
        value={dificultad}
        onChange={(e) => setDificultad(e.target.value)}
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
      >
        <option value="facil">Fácil</option>
        <option value="media">Media</option>
        <option value="dificil">Difícil</option>
      </select>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button
          onClick={guardar}
          disabled={guardando}
          className="flex-1 bg-indigo-600 text-white text-sm rounded-lg py-2 disabled:opacity-50"
        >
          {guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
        <button onClick={onCancelar} className="text-sm text-slate-500 px-3">
          Cancelar
        </button>
      </div>
    </div>
  )
}
